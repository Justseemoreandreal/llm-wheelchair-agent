# Codex Execution Prompt — Demo V0.1

Use **GPT-5.6 Sol, High reasoning** for normal execution. Use **Extra High** only for a difficult launcher/process-lifecycle, tunnel, HTTPS, WebSocket, or browser compatibility blocker.

Repository:
`Justseemoreandreal/llm-wheelchair-agent`

Branch:
`demo/mobile-voice-v0.1`

Your role is implementation executor. Architecture and product decisions are already frozen by the project controller.

## Read first

1. `docs/V0_1_CONTROLLER_PLAN.md`
2. current `README.md`
3. `docs/feedback_packages/DemoV0/00_CONTROLLER_FEEDBACK.md`
4. `docs/feedback_packages/DemoV0/10_problem_list.md`
5. existing frontend/backend code

Do not redesign the stage.

## Mission

Turn Demo V0 into a beginner-friendly, one-click desktop demo and a real-phone HTTPS demo.

The user should not need to know React, FastAPI, npm, uvicorn, ports, Cloudflare Tunnel, or command-line process management.

### Required user experience

Desktop:
- double click `START_DEMO.bat`
- wait
- browser opens automatically
- use demo
- press Enter in launcher when finished
- everything stops

Phone:
- double click `START_PHONE_DEMO.bat`
- wait
- launcher shows temporary HTTPS URL and QR code
- scan/open it on phone
- test microphone/demo
- press Enter when finished
- server and tunnel stop

Recovery:
- double click `STOP_DEMO.bat`

## Frozen implementation decisions

- keep React + FastAPI;
- build React production assets;
- FastAPI serves the built frontend so normal use needs one server/one URL;
- normal unified port: 8765;
- phone mode uses Cloudflare Quick Tunnel;
- no Cloudflare account should be required;
- phone mode remains simulation only;
- use an ephemeral per-run access token for public tunnel access;
- add server-side simulated P0 latch/reset;
- no cloud LLM in this stage;
- no CAN/UART/ROS2 guessing.

## Work sequence

### A. Baseline
Run existing frontend and backend tests first. Record baseline. Do not continue with a broken baseline unless you fix it.

### B. Unified serving
Modify FastAPI so a production frontend build can be served from the same app:
- API routes remain functional;
- WebSocket remains functional;
- SPA route fallback works;
- static assets have correct paths.

Keep dev workflow available, but user-facing launchers use unified production mode.

### C. Launcher implementation
Implement root-level:
- `START_DEMO.bat`
- `START_PHONE_DEMO.bat`
- `STOP_DEMO.bat`

Prefer an underlying PowerShell controller so cleanup is reliable.

Requirements:
- beginner-readable Chinese status messages;
- check Python and Node;
- create backend venv if missing;
- install Python requirements if needed;
- install npm deps if needed;
- build frontend if needed;
- start only project-owned child processes;
- health-check before opening browser;
- save PIDs/state under `.runtime/`;
- logging under `.runtime/logs/`;
- Enter/Ctrl+C cleanup;
- stale PID recovery;
- never kill unrelated processes by broad process name.

### D. Phone tunnel
Implement phone mode:
- acquire official `cloudflared.exe` automatically if absent;
- store it under a gitignored cache;
- start quick tunnel to local unified app;
- parse public HTTPS URL robustly from output;
- generate random access token;
- make token part of phone entry URL;
- copy URL to clipboard if possible;
- create/display local QR code without external QR service;
- clearly show “temporary URL / simulation only”;
- cleanly stop tunnel on exit.

If cloudflared download or tunnel creation fails, show an actionable error and leave local demo usable.

### E. Access token
Implement a simple demo access gate:
- loopback local access can work without token;
- non-loopback/public protected HTTP and WebSocket operations require the launch token;
- frontend reads token from initial URL and forwards it;
- do not store token in Git;
- token expires when launcher stops/restarts.

Do not overengineer production auth.

### F. Server-side P0 latch
In simulated gateway:
- P0 sets LOCKED/ENGAGED and latches;
- later P2 motion commands are rejected while latched;
- explicit demo reset endpoint/command is required to leave safety state;
- UI exposes a clear “复位模拟控制器” control;
- reset is visibly different from a normal command;
- tests prove direct gateway clients cannot bypass latch.

### G. Phone test UI
Add a small guided section:
- speech API supported? yes/no;
- mic status;
- interim transcript;
- test step list;
- “停下” expected result;
- latch validation;
- reset;
- “前进” after reset;
- complex command fallback;
- export/copy test summary JSON.

This is a user-facing acceptance helper, not developer tooling.

### H. Tests
Retain all existing tests.

Add tests for at least:
- unified static frontend serving;
- protected public HTTP request/token behavior;
- protected WebSocket token behavior;
- server-side P0 latch;
- reset behavior;
- motion rejection while latched;
- config propagation;
- launcher helper functions if separated into testable code.

Run frontend build/tests and backend tests after implementation.

### I. Manual local validation
Actually execute local launcher.
Verify:
- browser opens;
- demo usable;
- P0 works;
- stop action tears down server;
- old URL stops responding.

### J. Prepare real phone validation
Actually execute phone launcher up to obtaining a valid HTTPS URL and QR.

If the Codex environment cannot physically operate the user's phone, do not claim phone test passed.

Instead:
- confirm tunnel is reachable from an external HTTPS request if possible;
- leave launcher running only as long as needed for validation;
- write exact user action: scan QR and test;
- record phone status as USER TEST REQUIRED.

Do not block all other work waiting for the user.

### K. README
Rewrite the beginning of README for a beginner.

The first screen should effectively say:

**最简单运行方式**
1. 双击 START_DEMO.bat
2. 自动打开网页
3. 用完后回到启动窗口按 Enter

**手机体验**
1. 双击 START_PHONE_DEMO.bat
2. 扫描二维码
3. 允许麦克风
4. 用完后回到电脑按 Enter

Put developer commands later.

### L. Feedback package
After implementation, re-run tests and create:
`docs/feedback_packages/DemoV0_1/`

Minimum:
- 00_CONTROLLER_FEEDBACK.md
- 01_stage_summary.md
- 02_git_state.md
- 03_environment.md
- 04_launcher_validation.md
- 05_phone_tunnel_validation.md
- 06_mobile_voice_validation.md
- 07_test_report.md
- 08_security_safety_validation.md
- 09_problem_list.md
- 10_technical_debt.md
- 11_next_options.md
- 12_required_external_resources.md
- 13_file_manifest.md
- feedback_summary.json

Also create:
`artifacts/feedback_packages/DemoV0_1_Feedback_Package.zip`

Commit and PUSH all changes to `demo/mobile-voice-v0.1`.

Do not say “feedback package completed” until push succeeds and remote HEAD includes it.

## Important reporting rule

If actual phone hardware has not been tested, say:
`REAL PHONE: USER TEST REQUIRED`

Do not convert code compatibility into a claimed real-device pass.

## Stop condition

Do not start cloud LLM integration after V0.1.
Stop after feedback package delivery and wait for project controller review.
