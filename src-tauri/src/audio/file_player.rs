use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::JoinHandle;

use ringbuf::traits::Producer;
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

use crate::error::AppError;

pub struct FileInfo {
    pub sample_rate: u32,
    pub duration_secs: f64,
}

pub struct FilePlayer;

impl FilePlayer {
    pub fn play_file(
        path: &str,
        mut producer: impl Producer<Item = f32> + Send + 'static,
        running: Arc<AtomicBool>,
        paused: Arc<AtomicBool>,
        target_fps: u32,
    ) -> Result<(JoinHandle<()>, FileInfo), AppError> {
        let file = std::fs::File::open(path)
            .map_err(|e| AppError::Audio(format!("Failed to open file: {e}")))?;

        let mss = MediaSourceStream::new(Box::new(file), Default::default());

        let mut hint = Hint::new();
        if let Some(ext) = std::path::Path::new(path).extension().and_then(|e| e.to_str()) {
            hint.with_extension(ext);
        }

        let probed = symphonia::default::get_probe()
            .format(
                &hint,
                mss,
                &FormatOptions::default(),
                &MetadataOptions::default(),
            )
            .map_err(|e| AppError::Audio(format!("Failed to probe file: {e}")))?;

        let mut format = probed.format;

        let track = format
            .default_track()
            .ok_or_else(|| AppError::Audio("No audio track found".into()))?;

        let sample_rate = track
            .codec_params
            .sample_rate
            .unwrap_or(44100);

        let channels = track
            .codec_params
            .channels
            .map(|c| c.count())
            .unwrap_or(2);

        let duration_secs = track
            .codec_params
            .n_frames
            .map(|n| n as f64 / sample_rate as f64)
            .unwrap_or(0.0);

        let track_id = track.id;
        let codec_params = track.codec_params.clone();

        let file_info = FileInfo {
            sample_rate,
            duration_secs,
        };

        let handle = std::thread::spawn(move || {
            let mut decoder = match symphonia::default::get_codecs()
                .make(&codec_params, &DecoderOptions::default())
            {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Failed to create decoder: {e}");
                    return;
                }
            };

            // Calculate pacing: how many samples to produce per frame
            let samples_per_frame = sample_rate as usize / target_fps.max(1) as usize;
            let pace_interval = std::time::Duration::from_micros(1_000_000 / target_fps.max(1) as u64);

            let mut pending_mono: Vec<f32> = Vec::with_capacity(samples_per_frame * 2);

            loop {
                if !running.load(Ordering::Relaxed) {
                    break;
                }

                // Handle pause
                while paused.load(Ordering::Relaxed) && running.load(Ordering::Relaxed) {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                if !running.load(Ordering::Relaxed) {
                    break;
                }

                let packet = match format.next_packet() {
                    Ok(p) => p,
                    Err(symphonia::core::errors::Error::IoError(ref e))
                        if e.kind() == std::io::ErrorKind::UnexpectedEof =>
                    {
                        // EOF — playback finished
                        break;
                    }
                    Err(_) => break,
                };

                if packet.track_id() != track_id {
                    continue;
                }

                let decoded = match decoder.decode(&packet) {
                    Ok(d) => d,
                    Err(_) => continue,
                };

                let spec = *decoded.spec();
                let num_frames = decoded.frames();
                let ch = spec.channels.count().max(1);

                let mut sample_buf = SampleBuffer::<f32>::new(num_frames as u64, spec);
                sample_buf.copy_interleaved_ref(decoded);
                let samples = sample_buf.samples();

                // Downmix to mono
                for frame_idx in 0..num_frames {
                    let mut sum = 0.0f32;
                    for c in 0..ch {
                        let idx = frame_idx * ch + c;
                        if idx < samples.len() {
                            sum += samples[idx];
                        }
                    }
                    pending_mono.push(sum / ch as f32);
                }

                // Pace output: push samples_per_frame at a time
                while pending_mono.len() >= samples_per_frame {
                    let frame_start = std::time::Instant::now();

                    // Check running before pushing
                    if !running.load(Ordering::Relaxed) {
                        return;
                    }

                    // Wait if buffer is > 75% full
                    let vacant = producer.vacant_len();
                    if vacant < samples_per_frame {
                        std::thread::sleep(std::time::Duration::from_millis(5));
                        continue;
                    }

                    let chunk: Vec<f32> = pending_mono.drain(..samples_per_frame).collect();
                    producer.push_slice(&chunk);

                    let elapsed = frame_start.elapsed();
                    if elapsed < pace_interval {
                        std::thread::sleep(pace_interval - elapsed);
                    }
                }
            }

            // Push remaining samples
            if !pending_mono.is_empty() && running.load(Ordering::Relaxed) {
                producer.push_slice(&pending_mono);
            }
        });

        Ok((handle, file_info))
    }
}
