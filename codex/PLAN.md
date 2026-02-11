# Delta Plan

## A) Executive Summary

### Current state (repo-grounded)
- Frontend app shell mounts `Visualizer`, `InfoOverlay`, `Controls`, `ToastContainer`, `WelcomeModal` but not `SettingsDrawer` (`src/App.tsx`).
- Visual state includes `showSettings` and `toggleSettings` and keyboard shortcut `S` triggers it (`src/stores/visualStore.ts`, `src/hooks/useKeyboardShortcuts.ts`).
- Backend exposes `list_audio_devices` and frontend has a devices dropdown UI, but there is no invocation/wiring to populate `audioStore.devices` (`src-tauri/src/commands.rs`, `src/components/Controls.tsx`, `src/stores/audioStore.ts`).
- Recorder enforces `MAX_DURATION=60`, but auto-stop currently does not route through the save flow used by manual stop (`src/hooks/useRecorder.ts`, `src/components/Controls.tsx`).
- Classification loop runs every 15s with feature accumulation, but `beatRegularity` is hardcoded placeholder (`src/hooks/useClassification.ts`).
- Settings persistence is already debounced and wired (`src/stores/settingsStore.ts`, `src-tauri/src/config/settings.rs`).

### Key risks
- Dead UI controls reduce trust/adoption (settings toggles without visible drawer).
- Device routing gaps block non-default audio workflows.
- Recorder edge case can silently lose expected output UX at 60s.
- AI output quality limited by placeholder feature input.
- Rust full verification blocked by platform-native dependency in this environment.

### Improvement themes (priority)
1. **Workflow completeness fixes** (settings drawer, devices wiring).
2. **Recording reliability hardening** (auto-stop save callback).
3. **Classification signal quality** (compute beat regularity from observed beats).
4. **Auditability + verification discipline** (session artifacts and incremental checks).

## B) Constraints & Invariants (Repo-derived)

### Explicit invariants
- Keep existing Tauri command names/contracts unchanged where possible.
- Preserve `useSettingsStore` debounced persistence behavior.
- Preserve keyboard shortcut behavior documented in README.

### Implicit inferred invariants
- Audio sentinel (`rms < 0`) remains disconnect/end-of-stream signal.
- `useAudioStore` is the single source of current audio frame/classification state.
- Visual mode/theme updates should stay in zustand stores (avoid component-local forks).

### Non-goals
- No renderer shader rewrites.
- No Rust architecture refactor.
- No broad design-system/UI overhaul.

## C) Proposed Changes by Theme (Prioritized)

### Theme 1: Settings drawer and device workflow completeness
- **Current approach:** Toggle state exists, component exists, not mounted; devices UI exists but not populated.
- **Proposed change:** Mount `SettingsDrawer` in `App.tsx`; load audio devices on controls mount; persist selected device name in settings.
- **Why:** Converts partially implemented controls into usable workflow features.
- **Tradeoffs/alternatives:** Could fetch devices in `App.tsx`, but colocating with `Controls` keeps ownership near consumer.
- **Scope boundary:** frontend-only wiring; no backend contract change.
- **Migration approach:** additive, guarded async call + toast on failure.

### Theme 2: Recorder max-duration reliability
- **Current approach:** recorder self-stops at max duration without a completion callback used by UI save path.
- **Proposed change:** add optional `onAutoStop(blob)` callback in recorder hook and wire in controls to save file + toast.
- **Why:** maintain deterministic save behavior for manual and auto stop.
- **Tradeoffs/alternatives:** Could move all download logic into hook; rejected to keep hook reusable and side-effect-light.
- **Scope boundary:** TS hook + controls logic only.
- **Migration approach:** backward compatible function signature via optional callback.

### Theme 3: Beat regularity implementation
- **Current approach:** hardcoded `beatRegularity=0.5`.
- **Proposed change:** track beat timestamps in classification hook and compute regularity from interval variance.
- **Why:** improve classification input fidelity without changing backend API.
- **Tradeoffs/alternatives:** backend-side computation considered, rejected for minimal change scope.
- **Scope boundary:** frontend hook only.
- **Migration approach:** fallback to conservative default when insufficient beat samples.

## D) File/Module Delta (Exact)

### ADD
- `codex/SESSION_LOG.md` — step log.
- `codex/PLAN.md` — this plan.
- `codex/DECISIONS.md` — key judgment calls.
- `codex/CHECKPOINTS.md` — interruption-safe checkpoints.
- `codex/VERIFICATION.md` — command evidence.
- `codex/CHANGELOG_DRAFT.md` — delivery draft.

### MODIFY
- `src/App.tsx` — mount settings drawer.
- `src/components/Controls.tsx` — load devices, selection persistence, auto-stop save handling.
- `src/hooks/useRecorder.ts` — optional auto-stop callback pathway.
- `src/hooks/useClassification.ts` — beat regularity computation.

### REMOVE/DEPRECATE
- None.

### Boundary rules
- Allowed: components ↔ hooks ↔ stores.
- Forbidden in this pass: new cross-layer Rust command schema changes.

## E) Data Models & API Contracts (Delta)

- **Current contract locations:**
  - Tauri commands: `src-tauri/src/commands.rs`
  - Frontend audio config/types: `src/types/audio.ts`
- **Proposed contract changes:** none across Tauri boundary.
- **Compatibility plan:** strict backward compatibility (frontend-only functional additions).
- **Persisted data migration:** none (reuse existing settings fields).
- **Versioning strategy:** not required for this patch.

## F) Implementation Sequence (Dependency-Explicit)

1. **Step S1 — Mount SettingsDrawer**
   - Objective: make settings toggles visible/usable.
   - Files: `src/App.tsx`.
   - Preconditions: visual store already exposes `showSettings` and toggle.
   - Dependencies: none.
   - Verification: `pnpm tsc --noEmit`.
   - Rollback: remove drawer mount and related imports.

2. **Step S2 — Device list loading + persistence**
   - Objective: populate device dropdown and persist selection.
   - Files: `src/components/Controls.tsx`.
   - Preconditions: `list_audio_devices` command exists.
   - Dependencies: S1 independent.
   - Verification: `pnpm tsc --noEmit`.
   - Rollback: remove effect + fallback to prior empty list behavior.

3. **Step S3 — Recorder auto-stop callback**
   - Objective: ensure 60s auto-stop triggers save path.
   - Files: `src/hooks/useRecorder.ts`, `src/components/Controls.tsx`.
   - Preconditions: existing manual save flow works.
   - Dependencies: none.
   - Verification: `pnpm tsc --noEmit` and `pnpm build`.
   - Rollback: restore previous hook signature and controls usage.

4. **Step S4 — Beat regularity computation**
   - Objective: replace placeholder beat regularity.
   - Files: `src/hooks/useClassification.ts`.
   - Preconditions: beat flag available in audio frames.
   - Dependencies: none.
   - Verification: `pnpm tsc --noEmit`.
   - Rollback: reinstate constant `0.5`.

5. **Step S5 — Final hardening checks + docs updates**
   - Objective: full verification + update logs/changelog/checkpoint.
   - Files: `codex/*`, optionally README if behavior text needed.
   - Verification: `pnpm tsc --noEmit`, `pnpm build`, `cd src-tauri && cargo test` (document expected env blocker).
   - Rollback: revert any failing step-level changes not resolvable.

## G) Error Handling & Edge Cases

- **Current pattern:** toast-driven user feedback in frontend hooks/components.
- **Improvements:**
  - device-load failure -> warning toast.
  - recorder auto-stop save errors should still surface toast and not crash.
  - beat regularity handles insufficient data (default neutral value).
- **Edge cases:**
  - no audio devices enumerated;
  - selected device removed between sessions;
  - auto-stop occurs during hidden controls state;
  - classification when no beats detected.

## H) Integration & Testing Strategy

- **Integration points:**
  - Tauri invoke in controls for `list_audio_devices`.
  - Recorder hook callback integration with controls download path.
  - Classification loop + store frame subscription.
- **Unit/integration tests:** none presently in frontend harness; rely on strict TS + build checks in this repo.
- **Definition of done per theme:**
  - Theme 1: drawer visibly mountable and devices list appears when available.
  - Theme 2: auto-stop path saves file and posts toast.
  - Theme 3: no hardcoded regularity placeholder remains.

## I) Assumptions & Judgment Calls

### Assumptions
- Tauri window context is available where controls execute.
- Existing UX expects immediate browser download for recordings.
- No hidden AGENTS constraints beyond prompt-provided instructions.

### Judgment calls
- Keep changes frontend-only to reduce risk while Rust verification is environment-constrained.
- Prefer additive optional callback design in recorder hook over broad refactor.
