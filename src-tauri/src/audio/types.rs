use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioFrame {
    pub spectrum: Vec<f32>,
    pub waveform: Vec<f32>,
    pub rms: f32,
    pub centroid: f32,
    pub flux: f32,
    pub zcr: f32,
    pub beat: bool,
    pub bpm: f32,
    pub timestamp: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
    pub is_input: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioConfig {
    pub device_name: Option<String>,
    pub fft_size: usize,
    pub target_fps: u32,
    #[serde(default = "default_sensitivity")]
    pub sensitivity: f32,
}

fn default_sensitivity() -> f32 {
    1.0
}

impl AudioConfig {
    /// Validates config values, clamping to safe ranges.
    pub fn validated(mut self) -> Self {
        // FFT size must be a power of 2 in [256, 16384]
        if !self.fft_size.is_power_of_two() || self.fft_size < 256 || self.fft_size > 16384 {
            self.fft_size = 2048;
        }
        // FPS must be in [1, 120]
        self.target_fps = self.target_fps.clamp(1, 120);
        // Sensitivity must be in [0.5, 2.0]
        self.sensitivity = self.sensitivity.clamp(0.5, 2.0);
        self
    }
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            device_name: None,
            fft_size: 2048,
            target_fps: 60,
            sensitivity: 1.0,
        }
    }
}
