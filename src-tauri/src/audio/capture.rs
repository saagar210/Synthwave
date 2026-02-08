use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleRate, Stream, StreamConfig};
use ringbuf::traits::Producer;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use super::types::{AudioConfig, AudioDevice};
use crate::error::AppError;

pub fn list_devices() -> Result<Vec<AudioDevice>, AppError> {
    let host = cpal::default_host();
    let default_input = host.default_input_device();
    let default_name = default_input
        .as_ref()
        .and_then(|d| d.name().ok())
        .unwrap_or_default();

    let mut devices = Vec::new();

    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                devices.push(AudioDevice {
                    is_default: name == default_name,
                    name,
                    is_input: true,
                });
            }
        }
    }

    Ok(devices)
}

pub fn find_device(name: Option<&str>) -> Result<Device, AppError> {
    let host = cpal::default_host();

    if let Some(name) = name {
        let devices = host
            .input_devices()
            .map_err(|e| AppError::Audio(format!("Failed to enumerate devices: {e}")))?;

        for device in devices {
            if let Ok(n) = device.name() {
                if n == name {
                    return Ok(device);
                }
            }
        }
        return Err(AppError::Audio(format!("Device '{name}' not found")));
    }

    host.default_input_device()
        .ok_or_else(|| AppError::Audio("No default input device found".into()))
}

pub fn start_capture(
    config: &AudioConfig,
    mut producer: ringbuf::HeapProd<f32>,
    running: Arc<AtomicBool>,
) -> Result<(Stream, u32), AppError> {
    let device = find_device(config.device_name.as_deref())?;

    let supported_config = device
        .default_input_config()
        .map_err(|e| AppError::Audio(format!("Failed to get input config: {e}")))?;

    let sample_rate = supported_config.sample_rate().0;
    let channels = supported_config.channels() as usize;
    if channels == 0 {
        return Err(AppError::Audio("Device reports 0 channels".into()));
    }

    let stream_config = StreamConfig {
        channels: supported_config.channels(),
        sample_rate: SampleRate(sample_rate),
        buffer_size: cpal::BufferSize::Default,
    };

    let running_clone = running.clone();

    let stream = device
        .build_input_stream(
            &stream_config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                if !running_clone.load(Ordering::Relaxed) {
                    return;
                }
                // Downmix to mono if stereo
                if channels == 1 {
                    let _ = producer.push_slice(data);
                } else {
                    for chunk in data.chunks(channels) {
                        let mono: f32 = chunk.iter().sum::<f32>() / channels as f32;
                        let _ = producer.push_slice(&[mono]);
                    }
                }
            },
            |err| {
                eprintln!("Audio stream error: {err}");
            },
            None,
        )
        .map_err(|e| AppError::Audio(format!("Failed to build input stream: {e}")))?;

    stream
        .play()
        .map_err(|e| AppError::Audio(format!("Failed to start stream: {e}")))?;

    Ok((stream, sample_rate))
}
