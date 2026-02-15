# Contributing to Synthwave

Thank you for your interest in contributing to Synthwave! This guide will help you get started.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Rust** 1.70+ (install via [rustup.rs](https://rustup.rs/))
- **System audio libraries** (installed automatically on most systems)

### Setup

```bash
# Clone the repository
git clone https://github.com/saagar210/Synthwave.git
cd Synthwave

# Install frontend dependencies
npm install

# Run development mode (hot reload enabled)
npm run dev
```

This launches the Tauri app with Vite hot module replacement. Changes to React components update instantly.

## 📦 Project Structure

```
Synthwave/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state management
│   ├── gl/                 # WebGL renderer
│   ├── shaders/            # GLSL shaders (17 files)
│   └── test/               # Test utilities
├── src-tauri/              # Rust backend
│   └── src/
│       ├── audio/          # Audio capture & analysis
│       ├── ai/             # Ollama integration
│       └── config/         # Settings persistence
└── .github/workflows/      # CI/CD pipelines
```

## 🧪 Development Workflow

### Running Tests

```bash
# Frontend tests (Vitest)
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report

# Backend tests (Rust)
cd src-tauri
cargo test                  # All tests
cargo test -- --nocapture   # Verbose output
```

### Code Quality

```bash
# Lint TypeScript
npm run lint

# Type check
npm run type-check

# Format Rust code
cd src-tauri
cargo fmt --all

# Lint Rust code
cargo clippy
```

### Building for Production

```bash
# Build optimized bundle
npm run build && npm run tauri build

# Output locations:
# - Frontend: dist/
# - Desktop app: src-tauri/target/release/bundle/
```

## 🎯 How to Contribute

### 1. Pick an Issue

Browse [open issues](https://github.com/saagar210/Synthwave/issues) or create a new one for bugs/features.

### 2. Create a Branch

```bash
git checkout -b feat/your-feature-name develop
```

**Branch naming conventions:**
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `docs/` - Documentation updates

### 3. Make Changes

- Write clear, focused commits
- Add tests for new functionality
- Update documentation if needed
- Follow existing code style

### 4. Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Examples:**
```
feat(audio): add beat regularity calculation
fix(renderer): resolve shader compilation on Intel GPUs
test(stores): add coverage for audioStore
docs: update setup instructions in README
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request on GitHub targeting the `develop` branch.

## ✅ PR Checklist

Before submitting your PR, ensure:

- [ ] All tests pass (`npm test` + `cargo test`)
- [ ] Code is linted (`npm run lint`, `cargo clippy`)
- [ ] TypeScript type checks pass (`npm run type-check`)
- [ ] No console errors or warnings
- [ ] Coverage maintained or improved (≥70%)
- [ ] Commit messages follow conventional commits
- [ ] Related GitHub issues are linked in PR description
- [ ] Documentation updated if public API changed

## 🏗️ Architecture Overview

### Audio Pipeline

```
cpal (mic) or Symphonia (file)
    ↓
Lock-free ring buffer
    ↓
Rust FFT analysis (60 FPS)
    ↓
Tauri IPC channel
    ↓
React audioStore (Zustand)
    ↓
WebGL renderer
```

### Rendering Pipeline

```
AudioFrame (spectrum + waveform)
    ↓
WebGL texture (R32F)
    ↓
Visualization shader (1 of 7 modes)
    ↓
Bloom post-processing (HDR)
    ↓
Canvas @ 60 FPS
```

## 🎨 Adding a New Visualization Mode

1. **Create shader files:**
   ```bash
   touch src/shaders/mymode.vert
   touch src/shaders/mymode.frag
   ```

2. **Import shaders** in `src/gl/renderer.ts`

3. **Add mode** to `MODES` array in `src/stores/visualStore.ts`

4. **Add keyboard shortcut** in `src/hooks/useKeyboardShortcuts.ts`

5. **Test mode switching:**
   ```bash
   npm run dev
   # Press 1-7 to cycle modes, then your new mode number
   ```

6. **Write tests** in `src/gl/__tests__/renderer.test.ts`

## 🧩 Adding a New Tauri Command

1. **Define handler** in `src-tauri/src/commands.rs`:
   ```rust
   #[tauri::command]
   pub async fn my_command(arg: String) -> Result<Response, AppError> {
       // Implementation
       Ok(response)
   }
   ```

2. **Register command** in `src-tauri/src/lib.rs`:
   ```rust
   .invoke_handler(tauri::generate_handler![
       my_command,
       // ... other commands
   ])
   ```

3. **Call from React**:
   ```typescript
   import { invoke } from '@tauri-apps/api/core';

   const result = await invoke('my_command', { arg: 'value' });
   ```

4. **Add error handling + toast**:
   ```typescript
   try {
       await invoke('my_command', { arg });
   } catch (error) {
       useToastStore.getState().addToast('error', `Failed: ${error}`);
   }
   ```

5. **Write tests** in `src-tauri/src/commands.rs`

## 🐛 Debugging

### Enable verbose logging
```bash
RUST_LOG=debug npm run dev
```

### WebGL debugging
- Chrome DevTools → Performance → Record
- Check FPS counter (press `I` key in app)
- Use `gl.getError()` in console

### Common Issues

**Blank screen after launch:**
- Check browser console for shader errors
- Verify WebGL 2 support: visit [webglreport.com](https://webglreport.com)
- Update GPU drivers

**Audio not playing:**
- Grant microphone permissions (macOS: System Preferences → Privacy)
- Check device dropdown in app controls
- Verify file format supported (MP3, WAV, FLAC, OGG, AAC)

**Build failures:**
- Clear caches: `rm -rf node_modules dist src-tauri/target`
- Reinstall: `npm install && cd src-tauri && cargo clean`

## 📝 Code Style

### TypeScript
- Use functional components with hooks
- Prefer `const` over `let`
- No `any` types (use `unknown` + type guards)
- Extract complex logic into custom hooks
- Name event handlers `handleX` (e.g., `handleModeChange`)

### Rust
- Follow `rustfmt` defaults (`cargo fmt`)
- Use `?` for error propagation
- Prefer `match` over nested `if let`
- Document public APIs with `///` doc comments
- Keep functions under 50 lines when possible

### GLSL
- Use GLSL 300 ES (`#version 300 es`)
- Prefix uniforms with `u` (e.g., `uTime`)
- Prefix attributes with `a` (e.g., `aPosition`)
- Prefix varyings with `v` (e.g., `vColor`)
- Add comments explaining complex math

## 📊 Performance Guidelines

- **Target:** 60 FPS (16.67ms frame budget)
- **Audio thread:** Never block (use lock-free data structures)
- **FFT:** Keep under 5ms (2048-8192 samples)
- **GPU particles:** Cap at 50K
- **Shader complexity:** Avoid nested loops in fragment shaders

## 🤝 Community

- **Questions?** Open a [GitHub Discussion](https://github.com/saagar210/Synthwave/discussions)
- **Found a bug?** File an [issue](https://github.com/saagar210/Synthwave/issues)
- **Want to chat?** Join our Discord (link TBD)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy hacking! 🎨✨**
