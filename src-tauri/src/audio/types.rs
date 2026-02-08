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
}

impl Default for AudioConfig {
    fn default() -> Self {
        Self {
            device_name: None,
            fft_size: 2048,
            target_fps: 60,
        }
    }
}
