use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub last_mode: String,
    pub last_theme_index: usize,
    pub last_device_name: Option<String>,
    pub sensitivity: f32,
    pub fft_size: usize,
    pub target_fps: u32,
    #[serde(default)]
    pub has_seen_welcome: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            last_mode: "waveform".to_string(),
            last_theme_index: 0,
            last_device_name: None,
            sensitivity: 1.0,
            fft_size: 2048,
            target_fps: 60,
            has_seen_welcome: false,
        }
    }
}

fn config_path() -> Result<PathBuf, AppError> {
    let home = dirs::home_dir().ok_or_else(|| AppError::Config("No home directory".into()))?;
    let dir = home.join(".synthwave");
    if !dir.exists() {
        std::fs::create_dir_all(&dir)?;
    }
    Ok(dir.join("config.json"))
}

pub fn load_settings() -> Result<AppSettings, AppError> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let data = std::fs::read_to_string(&path)?;
    let settings: AppSettings = serde_json::from_str(&data)?;
    Ok(settings)
}

pub fn save_settings(settings: &AppSettings) -> Result<(), AppError> {
    let path = config_path()?;
    let data = serde_json::to_string_pretty(settings)?;
    std::fs::write(&path, data)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_round_trip() {
        let settings = AppSettings {
            last_mode: "particles".to_string(),
            last_theme_index: 3,
            last_device_name: Some("Test Mic".to_string()),
            sensitivity: 1.5,
            fft_size: 4096,
            target_fps: 30,
            has_seen_welcome: true,
        };

        let json = serde_json::to_string(&settings).unwrap();
        let loaded: AppSettings = serde_json::from_str(&json).unwrap();

        assert_eq!(settings.last_mode, loaded.last_mode);
        assert_eq!(settings.last_theme_index, loaded.last_theme_index);
        assert_eq!(settings.last_device_name, loaded.last_device_name);
        assert!((settings.sensitivity - loaded.sensitivity).abs() < 0.01);
        assert_eq!(settings.fft_size, loaded.fft_size);
        assert_eq!(settings.target_fps, loaded.target_fps);
        assert_eq!(settings.has_seen_welcome, loaded.has_seen_welcome);
    }

    #[test]
    fn test_settings_backward_compat() {
        // Simulate loading old config without has_seen_welcome
        let json = r#"{"lastMode":"waveform","lastThemeIndex":0,"lastDeviceName":null,"sensitivity":1.0,"fftSize":2048,"targetFps":60}"#;
        let loaded: AppSettings = serde_json::from_str(json).unwrap();
        assert!(!loaded.has_seen_welcome);
    }
}
