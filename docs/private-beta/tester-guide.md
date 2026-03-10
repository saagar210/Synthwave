# SynthWave Private Beta Tester Guide

## Who This Is For

This guide is for private beta testers running SynthWave on macOS. The current beta target is macOS-first, and both Apple Silicon and Intel remain in scope.

## Recommended Setup

1. Install the SynthWave beta app and move it to `Applications`.
2. Allow microphone access the first time macOS prompts you.
3. Install [BlackHole](https://existential.audio/blackhole/) if you want system-audio capture.
4. Install [Ollama](https://ollama.ai/) and pull a model such as `mistral:7b-instruct` if you want live AI genre, mood, and energy labels.

## First-Run Checklist

1. Start live capture and confirm the overlay shows BPM, mode, FPS, and AI status.
2. Open Settings and confirm beat sensitivity, FFT size, and target FPS can be changed.
3. Test a drag-and-drop audio file.
4. Start and stop a recording, then confirm the file saves locally.
5. Capture a screenshot with `Cmd+Shift+S`.

## What We Need You To Test

1. Live capture start, stop, and audio-device switching.
2. File playback, pause, resume, and return to live capture.
3. Theme and mode changes during playback.
4. Recording start and auto-stop at the 60-second limit.
5. Recovery after a device disconnect or permission issue.
6. AI behavior when Ollama is running and when it is unavailable.

## Manual Coverage Matrix

Use the dedicated [manual validation matrix](manual-validation-matrix.md) for the full pre-release checklist.

## What To Include In Bug Reports

1. Whether you were using live capture or file playback.
2. Your Mac model and macOS version.
3. Whether BlackHole or Ollama was involved.
4. The exact steps that led to the issue.
5. What you expected and what happened instead.
