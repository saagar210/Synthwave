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
- **7 visualization modes** — From classic waveforms to raymarched nebulas, each mode is a hand-written GLSL 300 es shader
- **9 color themes** — Synthwave, Monochrome, Fire, Ocean, Neon, Sunset, Matrix, Aurora, and Custom — with smooth 500ms transitions
- **Beat detection** — Adaptive energy-based onset detection with BPM estimation, cooldown, and configurable sensitivity
- **Bloom post-processing** — 4-pass framebuffer ping-pong for that neon glow
- **50K particle GPU sim** — Transform feedback keeps all 50,000 particles on the GPU
- **AI genre/mood detection** — Optional Ollama integration classifies your music's genre, mood, and energy level using local LLMs
- **Video recording** — Capture up to 60 seconds of WebM at 60fps directly from the canvas
- **Screenshots** — One keypress to save a high-res PNG
- **Keyboard-driven** — Full keyboard shortcut support for modes, themes, fullscreen, recording, and more
- **Persistent settings** — Your preferences survive app restarts

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
| `Space` | Pause/resume |
| `+` / `-` | Adjust beat sensitivity |
| `Cmd+Shift+S` | Save screenshot |
| `Cmd+R` | Start/stop recording |
| `Esc` | Exit fullscreen |

---

## Architecture

```
cpal (audio capture)
  |
  v
ringbuf (lock-free ring buffer)
  |
  v
Analysis thread (FFT + features + beat detection) ──> Tauri Channel (60Hz)
  |                                                         |
  v                                                         v
Ollama AI (optional)                                 zustand audioStore
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
                                                    (7 viz modes + bloom)
```

**Tech stack:** Tauri 2, React 19, TypeScript (strict), WebGL 2, Tailwind 4, zustand, rustfft, cpal, ringbuf

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
  gl/          — WebGL renderer, shaders, audio textures, particles, bloom
  shaders/     — 16 GLSL 300 es shaders (7 modes + bloom pipeline)
  stores/      — zustand stores (audio, visual, settings)
  hooks/       — audio stream, WebGL, render loop, keyboard, recorder
  components/  — Controls, Settings, Visualizer, InfoOverlay
  themes/      — 9 color theme definitions
```

---

## Tests

```bash
# Rust tests (11 tests)
cd src-tauri && cargo test

# TypeScript type checking
pnpm tsc --noEmit
```

Rust test coverage includes FFT accuracy, beat detection, ring buffer correctness, Ollama response parsing, and settings persistence.

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
