# SynthWave Private Beta Manual Validation Matrix

Use this matrix before external beta distribution and again before promoting any replacement artifact.

## Hardware Coverage

1. Apple Silicon macOS 13+ machine.
2. Intel macOS 13+ machine.
3. Built-in microphone only.
4. External input device connected.

## Permission And Setup Coverage

1. First launch with microphone permission granted.
2. First launch with microphone permission denied.
3. Permission revoked after the app was previously allowed.
4. BlackHole installed and selected.
5. BlackHole missing or misconfigured.
6. Ollama available and reachable.
7. Ollama unavailable or stopped.

## Core Flow Coverage

1. Start live capture on the default input.
2. Refresh devices and switch to a named input.
3. Disconnect the active device and confirm the app recovers with a clear error.
4. Drag and drop a supported audio file, then pause and resume playback.
5. Let file playback finish and confirm the UI returns to idle cleanly.
6. Start a recording, stop it manually, and confirm the saved file opens.
7. Start a recording and let it auto-stop at the 60-second limit.
8. Capture a screenshot.
9. Toggle fullscreen repeatedly.

## Visual Coverage

1. Waveform and Bars on live capture.
2. Particles, Terrain, Nebula, and Starfield on live capture.
3. Theme changes during active playback.
4. Overlay visibility and settings drawer behavior during active playback.

## AI And Diagnostics Coverage

1. Confirm the overlay shows AI offline when Ollama is unavailable.
2. Confirm the overlay shows AI analyzing during classification.
3. Confirm the overlay shows genre, mood, and energy when classification succeeds.
4. Confirm the settings drawer diagnostics reflect the active source, device, AI state, and latest issue.

## Exit Criteria

1. No crash, freeze, or broken stuck state during any item above.
2. Any remaining issue is documented in `known-issues.md`.
3. The release notes mention any meaningful limitation testers need to know.
