# Decisions

## 2026-02-10

1. **Scope decision**: Implement the highest-impact workflow blockers with minimal blast radius (no broad refactor).
   - Rationale: aligns with existing architecture and hard rule favoring safe/reversible deltas.

2. **Verification decision**: Treat `cargo test` failure as an environment limitation and continue with frontend-verifiable deltas while preserving Rust contract compatibility.
   - Rationale: blocker is missing native library, not code-level compilation/type issue in edited TS/React paths.

3. **Device loading location**: implemented device discovery in `Controls` mount effect instead of `App`.
   - Rationale: keeps data-fetch close to consumer and minimizes global boot coupling.

4. **Recorder callback design**: added optional auto-stop callback instead of moving all download behavior into hook.
   - Rationale: preserves separation of concerns and backward-compatible hook API extension.

5. **Pause/resume semantics**: use existing backend command `toggle_pause` for file playback path and preserve stop/start semantics for live capture.
   - Rationale: aligns behavior with README workflow expectations while avoiding backend contract changes.
