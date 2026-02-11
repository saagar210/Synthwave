# Changelog Draft

## Unreleased

### Theme: Workflow completeness
- Mounted the settings drawer into the app shell, wiring existing visual-store state so settings toggle controls now open/close a visible drawer.
- Implemented audio device enumeration on controls mount and connected selector persistence via existing settings store (`lastDeviceName`).

### Theme: Recording reliability
- Added auto-stop callback support to the recorder hook and unified save handling so hitting the 60s cap still saves a file and notifies the user.

### Theme: Classification signal quality
- Replaced hardcoded beat regularity placeholder with computed regularity from beat timestamp intervals.

### Theme: Session auditability
- Added `codex/*` planning, decisions, verification, checkpoints, and session logs for interruption-safe resume.
- Added explicit `source` (`live`/`file`) and `isPaused` state tracking in `audioStore` and integrated pause/resume flow for file playback via existing `toggle_pause` backend command.
- Updated keyboard spacebar and controls primary audio button behavior so file playback can pause/resume without forcibly stopping the stream.
