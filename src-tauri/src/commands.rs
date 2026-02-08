use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use ringbuf::traits::Consumer;
use tauri::{ipc::Channel, State};

use crate::audio::{
    analysis::AudioAnalyzer,
    beat::BeatDetector,
    capture,
    ring_buffer::AudioRingBuffer,
    types::{AudioConfig, AudioDevice, AudioFrame},
};
use crate::ai::{classifier::Classification, ollama::OllamaClient};
use crate::config::settings::{self, AppSettings};
use crate::error::AppError;

/// Wrapper to make cpal::Stream usable in Tauri managed state.
/// Safety: Stream is only accessed behind a Mutex and only from the main thread context.
struct StreamWrapper(cpal::Stream);
unsafe impl Send for StreamWrapper {}
unsafe impl Sync for StreamWrapper {}

pub struct AudioState {
    pub running: Arc<AtomicBool>,
    stream: Mutex<Option<StreamWrapper>>,
    analysis_handle: Mutex<Option<std::thread::JoinHandle<()>>>,
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            stream: Mutex::new(None),
            analysis_handle: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub fn get_app_info() -> Result<String, AppError> {
    Ok("SynthWave v0.1.0".to_string())
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, AppError> {
    capture::list_devices()
}

#[tauri::command]
pub fn start_audio(
    config: AudioConfig,
    channel: Channel<AudioFrame>,
    state: State<'_, AudioState>,
) -> Result<(), AppError> {
    // Stop any existing capture
    state.running.store(false, Ordering::SeqCst);

    // Wait for previous analysis thread
    if let Ok(mut handle) = state.analysis_handle.lock() {
        if let Some(h) = handle.take() {
            let _ = h.join();
        }
    }

    let fft_size = config.fft_size;
    let target_fps = config.target_fps;

    // Ring buffer: 4x FFT size for headroom
    let ring = AudioRingBuffer::new(fft_size * 4);
    let (producer, mut consumer) = ring.split();

    let running = state.running.clone();
    running.store(true, Ordering::SeqCst);

    // Start audio capture
    let (stream, _sample_rate) = capture::start_capture(&config, producer, running.clone())?;

    // Store stream to keep it alive
    if let Ok(mut s) = state.stream.lock() {
        *s = Some(StreamWrapper(stream));
    }

    // Spawn analysis thread
    let running_clone = running.clone();
    let frame_interval = std::time::Duration::from_micros(1_000_000 / target_fps as u64);

    let handle = std::thread::spawn(move || {
        let mut analyzer = AudioAnalyzer::new(fft_size);
        let mut beat_detector = BeatDetector::new(1.0);
        let mut sample_buffer = vec![0.0f32; fft_size];
        let start = Instant::now();

        while running_clone.load(Ordering::Relaxed) {
            let frame_start = Instant::now();

            // Try to read enough samples
            let available = consumer.pop_slice(&mut sample_buffer);

            if available >= fft_size {
                let result = analyzer.analyze(&sample_buffer);
                let timestamp = start.elapsed().as_secs_f64();
                let (beat, bpm) = beat_detector.detect(&result.spectrum, timestamp);

                let frame = AudioFrame {
                    spectrum: result.spectrum,
                    waveform: result.waveform,
                    rms: result.rms,
                    centroid: result.centroid,
                    flux: result.flux,
                    zcr: result.zcr,
                    beat,
                    bpm,
                    timestamp,
                };

                let _ = channel.send(frame);
            }

            // Sleep to target frame rate
            let elapsed = frame_start.elapsed();
            if elapsed < frame_interval {
                std::thread::sleep(frame_interval - elapsed);
            }
        }
    });

    if let Ok(mut h) = state.analysis_handle.lock() {
        *h = Some(handle);
    }

    Ok(())
}

#[tauri::command]
pub fn stop_audio(state: State<'_, AudioState>) -> Result<(), AppError> {
    state.running.store(false, Ordering::SeqCst);

    if let Ok(mut s) = state.stream.lock() {
        *s = None;
    }

    if let Ok(mut h) = state.analysis_handle.lock() {
        if let Some(handle) = h.take() {
            let _ = handle.join();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn check_ollama() -> Result<bool, AppError> {
    let client = OllamaClient::new();
    client.health_check().await
}

#[tauri::command]
pub async fn classify_audio(
    avg_rms: f32,
    avg_centroid: f32,
    avg_flux: f32,
    avg_zcr: f32,
    bpm: f32,
    beat_regularity: f32,
) -> Result<Classification, AppError> {
    let classifier = crate::ai::classifier::AudioClassifier::new();
    classifier
        .classify(avg_rms, avg_centroid, avg_flux, avg_zcr, bpm, beat_regularity)
        .await
}

#[tauri::command]
pub fn load_settings() -> Result<AppSettings, AppError> {
    settings::load_settings()
}

#[tauri::command]
pub fn save_settings(config: AppSettings) -> Result<(), AppError> {
    settings::save_settings(&config)
}
