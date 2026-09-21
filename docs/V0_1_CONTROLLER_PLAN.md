# Demo V0.1 Controller Plan — One-click + Real Phone Experience

## Stage objective

Demo V0 passed simulated software validation. V0.1 does **not** add a cloud LLM. Its purpose is to turn the current engineering demo into something the user can actually open, close, and test on a real phone with minimal technical knowledge.

This stage is complete only when:
1. a beginner can double-click one file on Windows and see the demo open automatically;
2. the same beginner can double-click a second entry, scan a QR code, and open the demo on a real phone over HTTPS;
3. microphone/voice behavior is actually tested on at least one real phone by the user;
4. stopping the launcher tears down all child processes/tunnels cleanly;
5. P0 still works with planner/backend-planning logic unavailable;
6. no cloud LLM is required.

## Frozen product decisions

### 1. Single-process application surface

Keep React + FastAPI internally, but for normal use the user should see **one app URL**.

Build the React frontend and let FastAPI serve the production frontend assets.

Target local URL:

`http://127.0.0.1:8765/`

The user should not need to understand ports 5173 and 8000 or run two terminals.

Development mode may still keep separate frontend/backend commands.

### 2. Root-level beginner entry points

Provide these Windows entry points in repository root:

- `START_DEMO.bat`
- `START_PHONE_DEMO.bat`
- `STOP_DEMO.bat`

Optional underlying PowerShell implementation:

- `tools/run_demo.ps1`
- `tools/stop_demo.ps1`

#### START_DEMO.bat

Double-click behavior:

1. perform preflight checks;
2. create/install backend venv if needed;
3. install frontend dependencies if needed;
4. build frontend if missing/stale;
5. start unified FastAPI app on port 8765;
6. wait for `/health`;
7. automatically open the default desktop browser;
8. keep one small launcher window open showing:
   - status;
   - URL;
   - simulation warning;
   - “press Enter to stop”;
9. pressing Enter or Ctrl+C stops child processes and exits.

First launch may take longer because dependencies are prepared. Subsequent launches should be fast.

#### START_PHONE_DEMO.bat

Same as local mode, plus:

1. force Demo V0.1 to SIMULATION-safe mode;
2. start a Cloudflare Quick Tunnel with official `cloudflared`;
3. if `cloudflared.exe` is absent, automatically download the official Windows amd64 binary to a gitignored tools cache;
4. parse the generated `https://*.trycloudflare.com` URL;
5. generate an ephemeral access token for this run;
6. expose the public link only with the ephemeral token;
7. display and/or open a QR code containing the HTTPS URL;
8. copy the URL to clipboard if possible;
9. print the URL clearly in the launcher;
10. when the user presses Enter, stop both FastAPI and cloudflared.

The tunnel URL is temporary and changes each run.

No account should be required for V0.1 phone testing.

### 3. Temporary access control for public phone mode

Because Quick Tunnel creates a public HTTPS endpoint, do not expose the demo completely unauthenticated.

At launch:
- generate a cryptographically random per-run token;
- pass it to backend by environment variable;
- the phone URL includes the token;
- frontend keeps and forwards the token to HTTP and WebSocket requests;
- backend rejects protected requests without the valid token.

Local loopback mode may allow access without token.

This is a demo access gate, not a production security system.

### 4. Server-side P0 latch

Current P0 latch exists in the browser. V0.1 must also add a simple server-side simulated-controller safety latch.

When the simulated control gateway receives P0:
- controller enters locked safety state;
- subsequent P2 motion commands are rejected until an explicit demo reset action is performed;
- reset must be visibly separate from normal motion commands;
- this is still simulation and must be labeled as such.

This prevents bypassing the browser latch through a direct gateway request.

### 5. Phone voice scope

V0.1 uses browser Web Speech where available.

Required UI behavior:
- HTTPS page clearly indicates whether speech recognition API exists;
- microphone permission/status visible;
- interim transcript visible;
- text/buttons remain available if voice is unsupported;
- no claim of cross-platform support until real devices are tested.

Primary real-device validation target:
- Android Chrome first.

Secondary:
- iOS Safari if available.

### 6. Real-device test assistant

Add a visible “手机验收模式 / Phone Test” area that guides the user through:
1. microphone permission;
2. say “停下”;
3. observe P0 event;
4. verify simulated LOCKED / ENGAGED;
5. say or type “前进” immediately after P0 and verify latch;
6. reset simulation;
7. test “前进” again;
8. test “把水杯拿过来” using fallback planner;
9. export a small test result JSON or copyable summary.

The user should not need developer tools.

### 7. QR code

Prefer local generation, not a third-party QR API.

Acceptable:
- Python `qrcode` package;
- bundled small JS QR renderer;
- another local open-source method.

Do not send the temporary URL to an external QR service.

### 8. No LLM work in V0.1

Do not add:
- paid LLM APIs;
- prompt engineering;
- LiteLLM;
- multi-model routing.

Complex commands continue using MockPlanner/FallbackPlanner.

### 9. One-click stop / cleanup

Launcher must keep PIDs/state under a gitignored `.runtime/` directory.

On normal stop:
- terminate app server;
- terminate tunnel;
- remove stale PID files;
- do not kill unrelated Python/Node/cloudflared processes globally.

On abnormal prior exit, next launcher should detect stale PID files safely.

`STOP_DEMO.bat` provides a manual recovery path.

### 10. Logging

Write launcher/runtime logs to:

`.runtime/logs/`

At least:
- launcher log;
- server log;
- tunnel log in phone mode.

Do not commit runtime logs.

### 11. Acceptance tests

Automated:
- existing 39 frontend tests remain passing;
- existing backend tests remain passing;
- new unified-server static route test;
- access-token tests;
- server-side P0 latch/reset tests;
- URL/config propagation tests where practical;
- launcher helper unit tests where practical.

Manual/local:
- double click START_DEMO;
- browser opens;
- “停下” works;
- Enter stops server;
- URL becomes unavailable after stop.

Manual/phone:
- double click START_PHONE_DEMO;
- HTTPS URL obtained;
- QR/URL shown;
- real phone opens page;
- microphone permission attempted;
- “停下” voice test;
- fallback text/button test;
- stop launcher;
- public URL stops working.

## Safety statements

- Demo V0.1 remains simulation only.
- Browser voice stop is not a certified safety function.
- Cloudflare Quick Tunnel is for temporary demo access only.
- Any future physical wheelchair control still requires an independent physical E-stop and trusted hardware-side safety state machine.

## Stage boundary

When implementation and validation artifacts are complete, stop and create:

`docs/feedback_packages/DemoV0_1/`

plus downloadable:

`artifacts/feedback_packages/DemoV0_1_Feedback_Package.zip`

Push both code and feedback package to branch `demo/mobile-voice-v0.1`.

Do not proceed to LLM integration without controller approval.
