# SynthWave Private Beta Known Issues

## Current Known Issues

1. System-audio capture depends on BlackHole being installed and routed correctly in macOS.
2. AI labels depend on local Ollama availability. When Ollama is not running, the app shows an unavailable AI state instead of live labels.
3. Recording is intentionally capped at 60 seconds for this beta.
4. Device disconnect recovery is implemented, but behavior may still vary across hardware and drivers.
5. The heaviest visual modes may behave differently between Apple Silicon and Intel machines.

## Report Immediately

1. App crashes or hard freezes.
2. No recovery after a device disconnect.
3. Recording failures that lose a captured file.
4. Permission loops or unrecoverable mic-access failures.
5. AI getting stuck in a degraded state while Ollama is running normally.
