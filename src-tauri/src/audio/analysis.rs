use rustfft::{num_complex::Complex, FftPlanner};

pub struct AudioAnalyzer {
    fft_size: usize,
    planner: FftPlanner<f32>,
    window: Vec<f32>,
    prev_spectrum: Vec<f32>,
}

impl AudioAnalyzer {
    pub fn new(fft_size: usize) -> Self {
        let window = apodize::hanning_iter(fft_size)
            .map(|v| v as f32)
            .collect();
        let spectrum_len = fft_size / 2;
        Self {
            fft_size,
            planner: FftPlanner::new(),
            window,
            prev_spectrum: vec![0.0; spectrum_len],
        }
    }

    pub fn analyze(&mut self, samples: &[f32]) -> Option<AnalysisResult> {
        let n = self.fft_size;
        if samples.len() < n {
            return None;
        }

        // Apply window and convert to complex
        let mut buffer: Vec<Complex<f32>> = samples[..n]
            .iter()
            .zip(self.window.iter())
            .map(|(&s, &w)| Complex::new(s * w, 0.0))
            .collect();

        // Run FFT
        let fft = self.planner.plan_fft_forward(n);
        fft.process(&mut buffer);

        // Compute magnitude spectrum (only positive frequencies)
        let spectrum_len = n / 2;
        let norm = 2.0 / n as f32;
        let mut spectrum: Vec<f32> = buffer[..spectrum_len]
            .iter()
            .map(|c| c.norm() * norm)
            .collect();

        // Normalize spectrum to 0..1 range
        let max_val = spectrum.iter().cloned().fold(0.0f32, f32::max);
        if max_val > 0.0 {
            for s in &mut spectrum {
                *s /= max_val;
            }
        }

        // Waveform: downsample to 1024 points
        let waveform = Self::downsample(samples, 1024);

        // RMS
        let rms = Self::compute_rms(samples);

        // Spectral centroid
        let centroid = Self::compute_centroid(&spectrum);

        // Spectral flux
        let flux = Self::compute_flux(&spectrum, &self.prev_spectrum);

        // Zero-crossing rate
        let zcr = Self::compute_zcr(samples);

        self.prev_spectrum.copy_from_slice(&spectrum);

        Some(AnalysisResult {
            spectrum,
            waveform,
            rms,
            centroid,
            flux,
            zcr,
        })
    }

    fn downsample(samples: &[f32], target_len: usize) -> Vec<f32> {
        if samples.len() <= target_len {
            return samples.to_vec();
        }
        let step = samples.len() as f32 / target_len as f32;
        (0..target_len)
            .map(|i| {
                let idx = (i as f32 * step) as usize;
                samples[idx.min(samples.len() - 1)]
            })
            .collect()
    }

    fn compute_rms(samples: &[f32]) -> f32 {
        let sum: f32 = samples.iter().map(|s| s * s).sum();
        (sum / samples.len() as f32).sqrt()
    }

    fn compute_centroid(spectrum: &[f32]) -> f32 {
        let total_energy: f32 = spectrum.iter().sum();
        if total_energy < 1e-10 {
            return 0.0;
        }
        let weighted: f32 = spectrum
            .iter()
            .enumerate()
            .map(|(i, &s)| i as f32 * s)
            .sum();
        weighted / total_energy / spectrum.len() as f32
    }

    fn compute_flux(current: &[f32], previous: &[f32]) -> f32 {
        current
            .iter()
            .zip(previous.iter())
            .map(|(&c, &p)| {
                let diff = c - p;
                if diff > 0.0 { diff * diff } else { 0.0 }
            })
            .sum::<f32>()
            .sqrt()
    }

    fn compute_zcr(samples: &[f32]) -> f32 {
        if samples.len() < 2 {
            return 0.0;
        }
        let crossings = samples
            .windows(2)
            .filter(|w| (w[0] >= 0.0) != (w[1] >= 0.0))
            .count();
        crossings as f32 / (samples.len() - 1) as f32
    }
}

pub struct AnalysisResult {
    pub spectrum: Vec<f32>,
    pub waveform: Vec<f32>,
    pub rms: f32,
    pub centroid: f32,
    pub flux: f32,
    pub zcr: f32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    #[test]
    fn test_fft_sine_wave_peak() {
        let sample_rate = 44100.0;
        let fft_size = 2048;
        let freq = 440.0;

        let samples: Vec<f32> = (0..fft_size)
            .map(|i| (2.0 * PI * freq * i as f32 / sample_rate).sin())
            .collect();

        let mut analyzer = AudioAnalyzer::new(fft_size);
        let result = analyzer.analyze(&samples).expect("analyze should return result for valid input");

        // Find peak bin
        let peak_bin = result
            .spectrum
            .iter()
            .enumerate()
            .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
            .map(|(i, _)| i)
            .unwrap();

        // Expected bin: freq * fft_size / sample_rate = 440 * 2048 / 44100 ≈ 20.4
        let expected_bin = (freq * fft_size as f32 / sample_rate).round() as usize;
        assert!(
            (peak_bin as i32 - expected_bin as i32).unsigned_abs() <= 1,
            "Peak at bin {}, expected ~{}",
            peak_bin,
            expected_bin
        );
    }

    #[test]
    fn test_fft_silence() {
        let fft_size = 2048;
        let samples = vec![0.0f32; fft_size];
        let mut analyzer = AudioAnalyzer::new(fft_size);
        let result = analyzer.analyze(&samples).expect("analyze should return result for valid input");

        let max_val = result.spectrum.iter().cloned().fold(0.0f32, f32::max);
        assert!(max_val < 0.01, "Silence should produce near-zero spectrum");
    }

    #[test]
    fn test_rms_known_signal() {
        // RMS of constant signal k is k
        let samples = vec![0.5f32; 1024];
        let rms = AudioAnalyzer::compute_rms(&samples);
        assert!((rms - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_centroid_single_freq() {
        let mut spectrum = vec![0.0f32; 512];
        spectrum[100] = 1.0;
        let centroid = AudioAnalyzer::compute_centroid(&spectrum);
        let expected = 100.0 / 512.0;
        assert!(
            (centroid - expected).abs() < 0.01,
            "Centroid {}, expected {}",
            centroid,
            expected
        );
    }
}
