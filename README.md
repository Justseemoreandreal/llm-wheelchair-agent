# llm-wheelchair-agent

LLM-based natural language task planning and safety-control interface for an intelligent assistive wheelchair.

## Current development branch

`demo/mobile-voice-v0`

This branch contains a **partially implemented mobile web demo scaffold** prepared by the project controller. It is intentionally left for Codex to install, run, debug, test and complete.

### Frozen architecture

- P0/P1 emergency/safety commands use a local SafetyRouter.
- P0 must not wait for an LLM or cloud network.
- Complex P2/P3 commands go to a FastAPI planner.
- MockHardwareAdapter is the default controller for Demo V0.
- Real hardware integration is deferred until the chassis/control team provides an actual protocol.
- Mock execution must never be described as physical wheel execution.

### Read before coding

1. `docs/DEMO_V0_SPEC.md`
2. `docs/INTERFACE_CONTRACT_V0.md`
3. `docs/CODEX_EXECUTION_BRIEF.md`
4. `config/lexicon_emergency.json`
5. `config/lexicon_normal.json`

### Scaffold already present

- React + TypeScript + Vite frontend
- browser speech recognition wrapper
- local SafetyRouter
- command schemas
- MockHardwareAdapter
- WebSocketHardwareAdapter skeleton
- FastAPI MockPlanner
- initial routing tests
- mobile-first UI
- shared command lexicons

The next executor should **run and repair this scaffold rather than redesign it**.

## Target Demo V0

On a phone or browser:

```
voice/text "停下"
   -> local SafetyRouter
   -> P0 emergency_stop
   -> canonical control JSON
   -> MockHardwareAdapter
   -> MOTOR=LOCKED, BRAKE=ENGAGED
   -> ACK + measured local latency
```

Complex phrases such as `把水杯拿过来` should go to the backend planner.

## Safety

This project is a student prototype. A software voice stop is not a replacement for a physical emergency-stop circuit. Physical testing must keep an independent hardware E-stop and follow the larger wheelchair project's safety procedures.
