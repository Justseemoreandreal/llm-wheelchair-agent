# Problem List

## V01-001 — Real phone and microphone not physically validated

- Severity: High
- Reproduction: run `START_PHONE_DEMO.bat`, scan on a real Android/iOS device, grant microphone, speak `停下`.
- Impact: cross-device ASR and permission behavior cannot be declared passed.
- Cause: execution environment cannot operate the user's physical phone.
- Recommendation: user performs guided checklist and exports JSON.
- Blocks next stage: blocks final real-phone acceptance, not code delivery.

## V01-002 — Web Speech implementation varies by browser/platform

- Severity: Medium
- Reproduction: compare Android Chrome, Edge, and iOS Safari.
- Impact: interim/continuous recognition may differ or be unavailable.
- Cause: vendor/browser API behavior.
- Recommendation: collect real-device matrix; consider local ASR in a later approved stage.
- Blocks next stage: No.

## V01-003 — Token appears in initial phone URL

- Severity: Medium
- Reproduction: inspect the generated URL/history while a run is active.
- Impact: anyone who obtains the temporary URL during that run can access the demo.
- Cause: QR/bootstrap design; token becomes an HttpOnly cookie after first request.
- Recommendation: keep runs short; later use one-time exchange if stronger security is required.
- Blocks next stage: No for temporary demo.

## V01-004 — cloudflared latest binary is not version-pinned

- Severity: Low
- Reproduction: delete `.runtime/tools/cloudflared.exe` and restart phone demo at a later date.
- Impact: future upstream changes may alter behavior; first download depends on GitHub/network.
- Cause: automatic latest official binary acquisition.
- Recommendation: pin a reviewed version and SHA256 in a maintenance stage.
- Blocks next stage: No.

## V01-005 — Simulated controller state is process-global and volatile

- Severity: Low
- Reproduction: multiple clients share one running FastAPI process; restart clears state.
- Impact: concurrent demos share latch/reset state; there is no persistence.
- Cause: intentionally minimal simulated controller.
- Recommendation: scope by controller/session only if multi-user demos become a requirement.
- Blocks next stage: No.
