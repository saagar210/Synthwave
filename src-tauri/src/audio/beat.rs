use std::collections::VecDeque;

const HISTORY_SIZE: usize = 60; // ~1 second at 60fps
const COOLDOWN_FRAMES: usize = 6; // ~100ms at 60fps
const BPM_HISTORY: usize = 20;

pub struct BeatDetector {
    energy_history: VecDeque<f32>,
    cooldown_counter: usize,
    beat_timestamps: VecDeque<f64>,
    sensitivity: f32,
    current_bpm: f32,
}

impl BeatDetector {
    pub fn new(sensitivity: f32) -> Self {
        Self {
            energy_history: VecDeque::with_capacity(HISTORY_SIZE + 1),
            cooldown_counter: 0,
            beat_timestamps: VecDeque::with_capacity(BPM_HISTORY + 1),
            sensitivity,
            current_bpm: 0.0,
        }
    }

    #[allow(dead_code)]
    pub fn set_sensitivity(&mut self, sensitivity: f32) {
        self.sensitivity = sensitivity.clamp(0.5, 2.0);
    }

    pub fn detect(&mut self, spectrum: &[f32], timestamp: f64) -> (bool, f32) {
        if spectrum.is_empty() {
            return (false, self.current_bpm);
        }

        // Compute bass-weighted energy (lower 1/8 of spectrum)
        let bass_end = (spectrum.len() / 8).max(1);
        let bass_energy: f32 = spectrum[..bass_end]
            .iter()
            .map(|&s| s * s)
            .sum::<f32>()
            / bass_end as f32;

        // Add to history (O(1) with VecDeque)
        if self.energy_history.len() >= HISTORY_SIZE {
            self.energy_history.pop_front();
        }
        self.energy_history.push_back(bass_energy);

        // Need enough history for meaningful detection
        if self.energy_history.len() < 10 {
            return (false, self.current_bpm);
        }

        // Compute mean and standard deviation
        let mean: f32 =
            self.energy_history.iter().sum::<f32>() / self.energy_history.len() as f32;
        let variance: f32 = self
            .energy_history
            .iter()
            .map(|&e| (e - mean) * (e - mean))
            .sum::<f32>()
            / self.energy_history.len() as f32;
        let stddev = variance.sqrt();

        // Adaptive threshold
        let threshold = mean + self.sensitivity * stddev;

        // Decrease cooldown
        if self.cooldown_counter > 0 {
            self.cooldown_counter -= 1;
        }

        let is_beat = bass_energy > threshold && self.cooldown_counter == 0 && threshold > 0.001;

        if is_beat {
            self.cooldown_counter = COOLDOWN_FRAMES;
            self.beat_timestamps.push_back(timestamp);
            if self.beat_timestamps.len() > BPM_HISTORY {
                self.beat_timestamps.pop_front();
            }
            self.update_bpm();
        }

        (is_beat, self.current_bpm)
    }

    fn update_bpm(&mut self) {
        if self.beat_timestamps.len() < 3 {
            self.current_bpm = 0.0;
            return;
        }

        // Compute intervals
        let mut intervals: Vec<f64> = self
            .beat_timestamps
            .iter()
            .collect::<Vec<_>>()
            .windows(2)
            .map(|w| w[1] - w[0])
            .collect();

        // Sort with NaN-safe comparison
        intervals.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

        // Median interval
        let median = intervals[intervals.len() / 2];

        if median < 0.001 {
            return;
        }

        let new_bpm = (60.0 / median) as f32;

        // Clamp to reasonable range
        if !(60.0..=200.0).contains(&new_bpm) {
            return;
        }

        // Smooth
        if self.current_bpm > 0.0 {
            self.current_bpm = 0.9 * self.current_bpm + 0.1 * new_bpm;
        } else {
            self.current_bpm = new_bpm;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_120_bpm_detection() {
        let mut detector = BeatDetector::new(1.0);
        let interval = 0.5; // 120 BPM = 0.5s per beat
        let mut beats_detected = 0;

        // Simulate 10 seconds of 120 BPM
        for frame in 0..600 {
            let time = frame as f64 / 60.0;
            let is_beat_frame = (time % interval) < (1.0 / 60.0);

            let mut spectrum = vec![0.01f32; 256];
            if is_beat_frame {
                // Strong bass energy on beat
                for s in spectrum[..32].iter_mut() {
                    *s = 1.0;
                }
            }

            let (beat, _bpm) = detector.detect(&spectrum, time);
            if beat {
                beats_detected += 1;
            }
        }

        // Should detect a reasonable number of beats (not zero, not too many)
        assert!(
            beats_detected >= 10,
            "Too few beats detected: {}",
            beats_detected
        );

        // Check final BPM is close to 120
        let final_bpm = detector.current_bpm;
        assert!(
            (final_bpm - 120.0).abs() < 10.0,
            "BPM {} not close to 120",
            final_bpm
        );
    }

    #[test]
    fn test_silence_no_beats() {
        let mut detector = BeatDetector::new(1.0);
        let spectrum = vec![0.0f32; 256];

        for i in 0..600 {
            let (beat, _) = detector.detect(&spectrum, i as f64 / 60.0);
            assert!(!beat, "Should not detect beats in silence");
        }
    }
}
