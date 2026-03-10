# SynthWave Private Beta Release Validation

## Signed Beta Default

The default beta target is a signed and notarized macOS package.

Required GitHub secrets:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## When Unsigned Is Allowed

Unsigned packaging is only acceptable for internal smoke validation launched through `workflow_dispatch` with `allow_unsigned_smoke=true`.

Unsigned smoke builds are not the intended external private-beta artifact.

## What The Workflow Validates

1. macOS beta packaging for `aarch64-apple-darwin`
2. macOS beta packaging for `x86_64-apple-darwin`
3. Frontend tests, Rust tests, and production build before packaging
4. Artifact upload for both targets
5. Explicit signed-versus-internal-smoke preflight behavior before packaging starts

## Required Manual Validation Before External Distribution

1. Complete the [manual validation matrix](manual-validation-matrix.md).
2. Confirm the latest `known-issues.md` is accurate.
3. Confirm release notes match the signed artifact being distributed.
4. Use unsigned smoke artifacts only for internal validation.
5. Private-beta docs upload for tester and support handoff

## Local Validation Before Tagging

1. Run `pnpm verify` from a clean checkout.
2. Confirm `pnpm tauri:smoke` still builds locally if you changed runtime, packaging, or Tauri config.
3. Review `docs/private-beta/known-issues.md`, `support.md`, and release notes for beta-truth alignment.
4. Confirm target FPS, AI status, and device diagnostics still behave correctly in the app UI.

## GitHub Validation After Tagging

1. Confirm both Apple Silicon and Intel packaging jobs finish.
2. Confirm artifacts exist for both `.app` and `.dmg` outputs.
3. Confirm the private-beta docs artifact was uploaded.
4. Confirm the workflow summary clearly says whether the build was signed or an internal unsigned smoke build.
5. If the workflow ran unsigned, do not distribute it to external testers.

## Rollback Posture

1. Keep the last known-good beta artifact for both targets.
2. If a new beta package fails launch or core flows, revert to the previous artifact immediately.
3. Update `known-issues.md` and release notes before re-attempting distribution.
