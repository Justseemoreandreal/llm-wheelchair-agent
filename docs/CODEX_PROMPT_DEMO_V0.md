# Codex Task Prompt — Demo V0 execution only

You are the implementation executor for repository `Justseemoreandreal/llm-wheelchair-agent`.

## Model / reasoning

Use **GPT-5.6 Sol** with **High reasoning**.
Only if a hard runtime/concurrency/cross-browser bug blocks progress, temporarily use **Extra High**, solve that issue, then continue.

## Branch

Work only on:

`demo/mobile-voice-v0`

Do not work on main and do not redesign the project from scratch.

## Your role

The architecture, safety policy, interfaces and product decisions have already been made by the project controller. Your task is to **execute, run, test, debug and complete the prepared scaffold**.

Do not spend time proposing alternative architectures unless the current scaffold is technically impossible. If you must change a frozen decision, document the exact blocker first.

## Read in this order

1. `README.md`
2. `docs/DEMO_V0_SPEC.md`
3. `docs/INTERFACE_CONTRACT_V0.md`
4. `docs/CODEX_EXECUTION_BRIEF.md`
5. `config/lexicon_emergency.json`
6. `config/lexicon_normal.json`
7. existing code under `frontend/` and `backend/`
8. GitHub Issue #1

Some source materials originally existed outside the repository. The project controller has already reconstructed the necessary lexicons, interface contract and scaffold in this branch. **Do not stop because the original PPT/DOCX files are absent. Treat the repository versions as the authoritative implementation input for Demo V0.**

## Frozen product decisions

1. This is a mobile-first web demo for the intelligent wheelchair LLM integration unit.
2. The key demonstration is:
   `speech/text -> local safety match -> standard control event -> controller adapter -> ACK`.
3. **P0 emergency commands must execute locally before any LLM/network planning call.**
4. P0 must remain functional when the LLM API/backend is unavailable.
5. The LLM is for complex language understanding and task planning, never raw PWM/joint-angle/motor duty-cycle output.
6. Default execution mode is SIMULATION.
7. Do not claim simulated ACK means a physical wheelchair moved.
8. Do not invent serial/CAN byte protocols. Real protocol integration waits for the chassis/controller team.
9. The canonical JSON interface must remain stable so a future hardware adapter can replace the simulator without changing the UI or language layer.
10. Keep an independent physical emergency stop in all future real-hardware testing.

## Commands that must work

At minimum:

### P0 safety
- 停
- 停止
- 停下
- 停车
- 站住
- 别动
- 刹住
- 刹车
- 急停
- 快停
- 立马停
- 马上停
- 立刻停下
- 现在就停
- 救命

Expected result for stop-like commands:
- priority = P0
- immediate local route
- canonical control JSON emitted
- controller state becomes MOTOR=LOCKED and BRAKE=ENGAGED
- ACK returned
- local match latency displayed

### Other
- 危险
- 前进
- 后退
- 拿水杯
- 把水杯拿过来
- 我刚才让你去的地方
- 还有多少电
- 现在什么情况

## Existing scaffold

A partial implementation is already present. Do not recreate it blindly.

Frontend already has:
- Vite + React + TypeScript
- mobile UI
- speech recognition wrapper
- local SafetyRouter
- lexicon copies
- MockHardwareAdapter
- WebSocketHardwareAdapter skeleton
- command/ACK types
- initial tests

Backend already has:
- FastAPI
- /health
- /api/intent
- MockPlanner

Your first action is to install dependencies and run the existing scaffold so you discover real errors before editing.

## Execution sequence

### Phase A — make the scaffold compile and run

1. Inspect repository state.
2. Install frontend dependencies.
3. Run:
   - `npm test`
   - `npm run build`
4. Fix every compile/test error.
5. Create/activate a Python venv for backend.
6. Install `backend/requirements.txt`.
7. Run FastAPI.
8. Verify:
   - `GET /health`
   - `POST /api/intent`
9. Start frontend and verify manual text buttons.

Do not proceed while basic build/test/runtime is broken.

### Phase B — complete the safety fast path

Verify and improve `SafetyRouter` so that:
- it consumes interim speech recognition text;
- P0 is recognized without waiting for final transcription;
- duplicate interim fragments do not repeatedly hammer the controller;
- P0 sets a short latch preventing immediate motion commands;
- P0 path does not call `/api/intent` before controller ACK;
- local match latency is measured with `performance.now()`;
- event JSON follows `docs/INTERFACE_CONTRACT_V0.md`.

Add automated tests proving this behavior.

### Phase C — make controller path more realistic

Keep `MockHardwareAdapter`, but also implement a working backend control-gateway simulator:

- FastAPI WebSocket endpoint: `/ws/control`
- accepts the canonical `control_command` JSON
- for P0 stop-like events updates simulated state to:
  - MOTOR=LOCKED
  - BRAKE=ENGAGED
- returns canonical `control_ack`
- keeps a small in-memory state/event log

Complete `WebSocketHardwareAdapter` so the frontend can select:
- SIMULATION / LOCAL MOCK
- NETWORK GATEWAY

The network gateway is still simulated hardware, but it demonstrates the actual cross-device control interface that later can be bridged to ESP32/STM32/ROS2.

Never describe it as physical actuation.

### Phase D — complex-command fallback

The phone demo must remain usable even if the FastAPI planner is unavailable.

Implement:
- backend planner path when reachable;
- a small frontend `FallbackPlanner` for demo-only complex commands when backend is unreachable.

The fallback must be clearly marked `mock/fallback`.

Do not add a real paid LLM API yet unless an API key is already safely available in the environment. No secrets in Git.

### Phase E — mobile usability

Make the page comfortable on a phone:
- portrait first;
- large microphone/start button;
- clear transcript;
- red P0 indicator;
- controller state;
- local match latency;
- adapter ACK latency;
- control JSON;
- recent event timeline;
- clear SIMULATION / NETWORK GATEWAY badge.

Browser speech support:
- use Web Speech API when available;
- keep text input and quick-command buttons when unavailable;
- gracefully handle permission denial and recognition restart.

### Phase F — HTTPS/mobile deployment preparation

Important: microphone access on a phone may require a secure origin.

Prepare the app so it can be deployed as a static HTTPS frontend without architecture changes.

Requirements:
- use `VITE_API_BASE_URL` for backend configuration;
- no hard-coded localhost that breaks on phone;
- provide a frontend-only fallback mode;
- add a minimal deployment section for a static HTTPS host such as Vercel/Netlify/Cloudflare Pages, without requiring the user to deploy yet;
- keep same-LAN development instructions as a secondary option.

Do not require a deployment account to finish the code.

### Phase G — tests

At minimum add tests for:
- P0 routing;
- P0 duplicate suppression;
- P0 latch;
- P0 never uses planner before local adapter;
- MockHardwareAdapter state transition;
- WebSocket gateway schema/ACK;
- complex command planner fallback;
- backend /health;
- backend /api/intent.

Run all tests. Fix failures.

## Required final state

Before stopping:
1. frontend builds successfully;
2. frontend tests pass;
3. backend starts successfully;
4. backend tests pass;
5. manual quick-command demo works;
6. P0 path works with backend planner offline;
7. network gateway simulator works;
8. README contains exact Windows-friendly commands;
9. README contains phone-access instructions;
10. no API keys/secrets are committed;
11. all changes are committed to `demo/mobile-voice-v0`.

## README commands

Because the primary user is a Windows beginner, make the README copy/paste friendly. Prefer PowerShell commands and add Bash only as secondary.

The user should not need to understand React, FastAPI or ROS to run the demo.

## Report back only after execution

When finished, report concisely:
- files/components implemented;
- actual test commands and pass/fail counts;
- exact commands the user must run;
- exact URL to open on the phone in LAN mode;
- whether voice recognition needs HTTPS in the tested browser;
- what remains simulated;
- what external resource is genuinely required next.

If you encounter a resource that only the user can provide, continue everything else first and stop only at the unavoidable blocker.

## Priority

Working Demo > tests > safety correctness > phone usability > visual polish > extra features.

Start execution now. Do not respond with a new project plan first.
