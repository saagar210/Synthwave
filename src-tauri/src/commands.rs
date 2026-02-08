use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use ringbuf::traits::Consumer;
use tauri::{ipc::Channel, State};

use crate::audio::{
    analysis::AudioAnalyzer,
    beat::BeatDetector,
    capture,
    file_player::FilePlayer,
    ring_buffer::AudioRingBuffer,
    types::{AudioConfig, AudioDevice, AudioFrame},
};
use crate::ai::{classifier::Classification, ollama::OllamaClient};
use crate::config::settings::{self, AppSettings};
use crate::error::AppError;

/// Wrapper to make cpal::Stream usable in Tauri managed state.
/// Safety: Stream is only accessed behind a Mutex and only from the main thread context.
struct StreamWrapper(#[allow(dead_code)] cpal::Stream);
unsafe impl Send for StreamWrapper {}
unsafe impl Sync for StreamWrapper {}

pub struct AudioState {
    pub running: Arc<AtomicBool>,
    pub paused: Arc<AtomicBool>,
    stream: Mutex<Option<StreamWrapper>>,
    analysis_handle: Mutex<Option<std::thread::JoinHandle<()>>>,
    file_handle: Mutex<Option<std::thread::JoinHandle<()>>>,
}

impl Default for AudioState {
    fn default() -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            stream: Mutex::new(None),
            analysis_handle: Mutex::new(None),
            file_handle: Mutex::new(None),
        }
    }
}

/// Shared analysis thread logic used by both mic capture and file playback.
fn spawn_analysis_thread(
    mut consumer: impl Consumer<Item = f32> + Send + 'static,
    channel: Channel<AudioFrame>,
    fft_size: usize,
    target_fps: u32,
    sensitivity: f32,
    running: Arc<AtomicBool>,
) -> std::thread::JoinHandle<()> {
    let frame_interval = std::time::Duration::from_micros(1_000_000 / target_fps as u64);

    std::thread::spawn(move || {
        let mut analyzer = AudioAnalyzer::new(fft_size);
        let mut beat_detector = BeatDetector::new(sensitivity);
        let mut sample_buffer = vec![0.0f32; fft_size];
        let mut stall_count: u32 = 0;
        let start = Instant::now();

        while running.load(Ordering::Relaxed) {
            let frame_start = Instant::now();

            let available = consumer.pop_slice(&mut sample_buffer);

            if available >= fft_size {
                stall_count = 0;
                if let Some(result) = analyzer.analyze(&sample_buffer) {
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

                    if channel.send(frame).is_err() {
                        break;
                    }
                }
            } else {
                stall_count += 1;
                // 180 stalls at 60fps ≈ 3 seconds of no data → device likely disconnected
                if stall_count >= 180 {
                    let sentinel = AudioFrame {
                        spectrum: vec![],
                        waveform: vec![],
                        rms: -1.0,
                        centroid: 0.0,
                        flux: 0.0,
                        zcr: 0.0,
                        beat: false,
                        bpm: 0.0,
                        timestamp: start.elapsed().as_secs_f64(),
                    };
                    let _ = channel.send(sentinel);
                    break;
                }
            }

            let elapsed = frame_start.elapsed();
            if elapsed < frame_interval {
                std::thread::sleep(frame_interval - elapsed);
            }
        }
    })
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
    let config = config.validated();
    let fft_size = config.fft_size;
    let target_fps = config.target_fps;
    let sensitivity = config.sensitivity;

    // Stop any existing capture
    stop_existing(&state)?;

    // Ring buffer: 4x FFT size for headroom
    let ring = AudioRingBuffer::new(fft_size * 4);
    let (producer, consumer) = ring.split();

    let running = state.running.clone();
    running.store(true, Ordering::SeqCst);
    state.paused.store(false, Ordering::SeqCst);

    // Start audio capture
    let (stream, _sample_rate) = capture::start_capture(&config, producer, running.clone())?;

    {
        let mut s = state.stream.lock()
            .map_err(|_| AppError::Audio("Failed to lock stream state".into()))?;
        *s = Some(StreamWrapper(stream));
    }

    let handle = spawn_analysis_thread(consumer, channel, fft_size, target_fps, sensitivity, running);

    {
        let mut h = state.analysis_handle.lock()
            .map_err(|_| AppError::Audio("Failed to lock analysis handle".into()))?;
        *h = Some(handle);
    }

    Ok(())
}

#[tauri::command]
pub fn start_file_audio(
    path: String,
    config: AudioConfig,
    channel: Channel<AudioFrame>,
    state: State<'_, AudioState>,
) -> Result<f64, AppError> {
    let config = config.validated();
    let fft_size = config.fft_size;
    let target_fps = config.target_fps;
    let sensitivity = config.sensitivity;

    // Stop any existing capture
    stop_existing(&state)?;

    // Ring buffer: 4x FFT size for headroom
    let ring = AudioRingBuffer::new(fft_size * 4);
    let (producer, consumer) = ring.split();

    let running = state.running.clone();
    running.store(true, Ordering::SeqCst);
    let paused = state.paused.clone();
    paused.store(false, Ordering::SeqCst);

    // Start file decode + paced playback
    let (file_handle, file_info) =
        FilePlayer::play_file(&path, producer, running.clone(), paused, target_fps)?;

    {
        let mut fh = state.file_handle.lock()
            .map_err(|_| AppError::Audio("Failed to lock file handle".into()))?;
        *fh = Some(file_handle);
    }

    let analysis_handle = spawn_analysis_thread(
        consumer, channel, fft_size, target_fps, sensitivity, running,
    );

    {
        let mut h = state.analysis_handle.lock()
            .map_err(|_| AppError::Audio("Failed to lock analysis handle".into()))?;
        *h = Some(analysis_handle);
    }

    Ok(file_info.duration_secs)
}

#[tauri::command]
pub fn toggle_pause(state: State<'_, AudioState>) -> Result<bool, AppError> {
    let was_paused = state.paused.load(Ordering::SeqCst);
    state.paused.store(!was_paused, Ordering::SeqCst);
    Ok(!was_paused)
}

fn stop_existing(state: &State<'_, AudioState>) -> Result<(), AppError> {
    state.running.store(false, Ordering::SeqCst);

    // Drop stream first so audio callback stops
    {
        let mut s = state.stream.lock()
            .map_err(|_| AppError::Audio("Failed to lock stream state".into()))?;
        *s = None;
    }

    // Join file thread if any
    {
        let mut fh = state.file_handle.lock()
            .map_err(|_| AppError::Audio("Failed to lock file handle".into()))?;
        if let Some(handle) = fh.take() {
            let _ = handle.join();
        }
    }

    // Join analysis thread
    {
        let mut h = state.analysis_handle.lock()
            .map_err(|_| AppError::Audio("Failed to lock analysis handle".into()))?;
        if let Some(handle) = h.take() {
            let _ = handle.join();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn stop_audio(state: State<'_, AudioState>) -> Result<(), AppError> {
    stop_existing(&state)?;
    state.paused.store(false, Ordering::SeqCst);
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
