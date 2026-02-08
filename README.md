# SynthWave

**Turn your music into a living, breathing light show.**

SynthWave is a real-time audio visualizer that captures sound from your mic or system audio, runs FFT analysis at 60fps in Rust, and renders stunning GPU-accelerated visuals through WebGL 2 — all inside a native macOS desktop app.

Seven visualization modes. Nine color themes. Beat-synced animations. AI-powered genre detection. Zero latency you can feel.

---

## What It Looks Like

| Mode | Description |
|------|------------|
| **Waveform** | Glowing oscilloscope with thickness that pulses to the beat |
| **Bars** | Classic spectrum analyzer with gravity-driven peak decay |
| **Circular** | Mirrored spectrum wrapped around a pulsing ring |
| **Particles** | 50,000 GPU-simulated particles that explode on every kick drum |
| **Terrain** | A scrolling 3D landscape carved by your frequency history |
| **Nebula** | Raymarched volumetric clouds that breathe with the bass |
| **Starfield** | Procedural stars that warp to lightspeed on every beat |

All seven modes react to bass energy, spectral centroid, zero-crossing rate, and beat detection in real time.

---

## Features

- **Real-time FFT analysis** — Rust-powered audio pipeline: cpal capture, lock-free ring buffer, rustfft analysis, streamed to the frontend at 60Hz via Tauri Channels
- **Audio file playback** — Drag-and-drop MP3, WAV, FLAC, OGG, or AAC files directly onto the window. Symphonia decodes in Rust and feeds the same analysis pipeline as live audio
- **7 visualization modes** — From classic waveforms to raymarched nebulas, each mode is a hand-written GLSL 300 es shader
- **Smooth mode transitions** — Crossfade between modes with a 500ms FBO snapshot overlay instead of harsh cuts
- **9 color themes** — Synthwave, Monochrome, Fire, Ocean, Neon, Sunset, Matrix, Aurora, and Custom — with smooth 500ms transitions
- **Beat detection** — Adaptive energy-based onset detection with BPM estimation, cooldown, and configurable sensitivity
- **Bloom post-processing** — 4-pass framebuffer ping-pong with Reinhard tonemapping to prevent highlight blowout
- **50K particle GPU sim** — Transform feedback keeps all 50,000 particles on the GPU
- **AI genre/mood detection** — Optional Ollama integration classifies your music's genre, mood, and energy level every 15 seconds using local LLMs. Displayed live in the info overlay
- **Video recording** — Record up to 60 seconds of WebM at 60fps directly from the canvas with a one-click UI or keyboard shortcut
- **Screenshots** — `Cmd+Shift+S` saves a high-res PNG instantly
- **Keyboard-driven** — Full keyboard shortcut support for modes, themes, fullscreen, recording, sensitivity, and more
- **Persistent settings** — FFT size, sensitivity, last mode/theme, and preferences survive app restarts via debounced JSON persistence
- **Error resilience** — Classified error toasts for mic permission issues, device disconnects, WebGL context loss, and audio stalls
- **First-run onboarding** — Welcome modal guides new users through the basics on first launch

---

## Quick Start

### Requirements

- **macOS 13+** (Apple Silicon or Intel)
- **Rust** (latest stable) — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js 18+** and **pnpm** — `npm install -g pnpm`

### Optional

- **[BlackHole](https://existential.audio/blackhole/)** — For system audio capture (without it, mic input works great)
- **[Ollama](https://ollama.ai/)** — For AI genre/mood classification. Pull a model: `ollama pull mistral:7b-instruct`

### Run It

```bash
git clone https://github.com/saagar210/Synthwave.git
cd Synthwave
pnpm install
pnpm tauri dev
```

Hit **Start**, play some music, and watch your sound come alive.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` – `7` | Switch visualization mode |
| `T` | Cycle color theme |
| `F` | Toggle fullscreen |
| `I` | Toggle info overlay (BPM, FPS, genre) |
| `H` | Hide/show controls |
| `Space` | Start/stop audio capture (or pause/resume file playback) |
| `+` / `-` | Adjust beat sensitivity |
| `S` | Toggle settings drawer |
| `Cmd+Shift+S` | Save screenshot (PNG) |
| `Cmd+R` | Start/stop recording (WebM) |
| `Esc` | Exit fullscreen |

---

## Architecture

```
cpal (mic capture)  ───or───  symphonia (file decode)
         |                            |
         v                            v
       ringbuf (lock-free ring buffer, shared)
                      |
                      v
       Analysis thread (FFT + features + beat detection) ──> Tauri Channel (60Hz)
         |                                                         |
         v                                                         v
       Ollama AI (optional, every 15s)                      zustand audioStore
                                                     (temporal spectrum smoothing)
                                                                   |
                                                            WebGL 2 render loop
                                                                   |
                                                     ┌─────────────┼─────────────┐
                                                     v             v             v
                                               Float32 tex    Theme UBO    Uniforms
                                                     |             |             |
                                                     └─────────────┴─────────────┘
                                                                   |
                                                             Active shader
                                                     (7 viz modes + bloom + transitions)
```

**Tech stack:** Tauri 2, React 19, TypeScript (strict), WebGL 2, Tailwind 4, zustand, rustfft, cpal, ringbuf, symphonia

---

## Project Structure

```
src-tauri/src/
  audio/       — capture, FFT analysis, beat detection, ring buffer
  ai/          — Ollama client, genre/mood classifier
  config/      — JSON settings persistence
  commands.rs  — Tauri command handlers
  error.rs     — Error types

src/
  gl/          — WebGL renderer, shaders, audio textures, particles, bloom, transitions
  shaders/     — 17 GLSL 300 es shaders (7 modes + bloom pipeline + transitions)
  stores/      — zustand stores (audio, visual, settings, toast, canvas ref)
  hooks/       — audio stream, WebGL, render loop, keyboard, recorder, classification, file drop
  components/  — Controls, Settings, Visualizer, InfoOverlay, Toast, Welcome
  utils/       — Screenshot capture
  themes/      — 9 color theme definitions
```

---

## Tests

```bash
# Rust tests (12 tests)
cd src-tauri && cargo test

# TypeScript type checking
pnpm tsc --noEmit
```

Rust test coverage includes FFT accuracy, beat detection, ring buffer correctness, Ollama response parsing, settings persistence, and backward-compatible config loading.

---

## Build for Release

```bash
pnpm tauri build
```

Outputs a `.dmg` and `.app` bundle in `src-tauri/target/release/bundle/`.

---

## License

MIT

---

Built with Rust, WebGL, and an unreasonable love for visualizers.
