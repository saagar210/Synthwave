# SynthWave Implementation Audit and Improvement Plan

_Last updated: 2026-02-10_

## Executive summary

The project is already beyond a prototype in rendering and signal-processing depth (multi-mode WebGL renderer, Rust FFT pipeline, beat detection, file decoding, settings persistence, onboarding, recording/screenshot UX). It builds successfully on the frontend and has unit tests in key Rust modules.

However, it is not yet "workflow-grade" because several user-facing features are only partially wired or have brittle behavior (e.g., settings drawer state exists but drawer is never rendered, device list is never loaded into UI, classification beat regularity is hardcoded, and recording auto-stop likely drops the final file save path).

## What is clearly implemented (code-verified)

### Audio ingestion and analysis
- Real-time capture + file playback exist with a shared analysis thread and ring buffer path.
- FFT, RMS, centroid, flux, and ZCR are computed per analysis frame.
- Beat detection includes adaptive thresholding, cooldown, and smoothed BPM estimate.

### Rendering and visuals
- Seven visualization modes are implemented in renderer mode switching.
- Theme interpolation and crossfade mode transitions are implemented.
- Bloom post-processing and particle system integration are present.

### UX and controls
- Keyboard shortcuts for mode/theme/fullscreen/overlay/control visibility/sensitivity/screenshot/record are implemented.
- Welcome modal and info overlay exist.
- Drag/drop file playback flow exists with extension validation and toast feedback.

### Persistence and backend commands
- Tauri commands exist for start/stop audio, file playback, pause toggle, Ollama health check, classification, and settings load/save.
- Settings persistence is debounced on the frontend and serialized on Rust side.

## Verified gaps and risks

### 1) Settings drawer feature is incomplete in UI composition (high impact)
- `showSettings` state and `toggleSettings()` exist, and keyboard `S` calls toggle.
- But `SettingsDrawer` is not mounted in `App.tsx`, so the feature is effectively inaccessible.

**Impact:** Users cannot adjust FFT size/sensitivity from the intended drawer workflow.

### 2) Audio device selector is effectively dead (high impact)
- `list_audio_devices` exists in Rust and `devices` UI rendering exists in `Controls`.
- But there is no frontend invocation that loads devices into `audioStore.setDevices`.

**Impact:** Device dropdown often never appears, limiting real workflow audio routing.

### 3) Classification signal quality is incomplete (medium impact)
- Classifier loop is implemented every 15s.
- `beatRegularity` is currently hardcoded to `0.5` with TODO.

**Impact:** AI labels are likely noisy/inconsistent and may reduce trust.

### 4) Recording UX has an edge-case bug at max duration (medium impact)
- Recorder auto-stops at 60s by calling `recorder.stop(); cleanup();` internally.
- This bypasses the explicit save flow in `Controls` that is tied to manual stop handling.

**Impact:** A user can hit max duration and not receive a clean/saved output flow.

### 5) Rust integration tests are blocked in this Linux environment (environment risk)
- Frontend typecheck/build pass.
- `cargo test` fails here due to missing `glib-2.0` system dependency required by transitive desktop crates.

**Impact:** CI portability and local contributor onboarding are weaker than they should be.

## Completeness scorecard (current)

- Core audio analysis engine: **8/10**
- Visual rendering fidelity/performance architecture: **8/10**
- End-user UX polish and workflow reliability: **5/10**
- AI classification usefulness: **4/10**
- Cross-platform/CI robustness: **4/10**
- Overall workflow readiness: **5.5/10**

## Multi-phase plan (improvements, bug fixes, features)

## Phase 0 (1–2 weeks): Finish existing product promises

1. Wire `SettingsDrawer` into `App.tsx` with `showSettings` state and close handler.
2. Load audio devices on startup and on-demand refresh; persist last chosen device and auto-select when available.
3. Fix recorder max-duration path so auto-stop emits a saved file and user toast.
4. Add a clear UI state for paused file playback vs stopped capture.
5. Add failure toasts for shader compile/link failures and fallback mode behavior.

**Exit criteria:** No "dead" controls; all advertised controls are reachable and reliable.

## Phase 1 (2–4 weeks): Reliability and observability hardening

1. Introduce a diagnostics panel (audio buffer fill %, analysis frame time, render frame time, dropped frames).
2. Add runtime guards for WebGL context loss/recovery and audio device hot-swap.
3. Add frontend unit tests for keyboard shortcuts/store transitions.
4. Add Rust tests for file playback pacing and sentinel semantics.
5. Stand up CI matrix with at least lint/typecheck/build on Linux/macOS and Rust unit tests where dependencies exist.

**Exit criteria:** Reproducible quality gate, fewer silent failures, debuggable runtime behavior.

## Phase 2 (3–6 weeks): Make it genuinely workflow-useful

1. Build scene/preset system (save/recall mode+theme+sensitivity+camera/effects).
2. Add timeline/automation hooks (e.g., transition schedule over N bars/seconds).
3. Export improvements: bitrate/fps presets, 1080p/4K capture options, metadata naming templates.
4. Source flexibility: explicit mode for mic/system/file and clearer route guidance.
5. Add lightweight plugin hooks for custom shaders/themes without forking core code.

**Exit criteria:** Users can integrate SynthWave into streaming/performance pipelines repeatedly.

## Phase 3 (ongoing): Differentiation and growth

1. Improve classifier robustness: better prompting, structured schema validation, confidence score, and beat-regularity implementation.
2. Add optional reactive control via OSC/MIDI for live performers.
3. Curate shareable theme/mode packs and publish sample workflows.
4. Add telemetry (opt-in) focused on crashes/performance bottlenecks only.

**Exit criteria:** Strong retention levers and community-driven extensibility.

## Recommended immediate priorities (top 5)

1. **Wire SettingsDrawer now** (high value, low effort).
2. **Load/populate audio devices** (core workflow blocker).
3. **Fix recorder auto-stop save path** (trust/reliability).
4. **Implement beatRegularity properly** (AI feature credibility).
5. **Add CI checks + platform notes for Rust deps** (contributor velocity).
