# Codex Execution Brief — Demo V0

The architecture and safety decisions are already frozen. Codex is the execution agent, not the product architect.

## What already exists

- Demo spec
- Interface contract
- command lexicons
- React/Vite mobile UI scaffold
- local SafetyRouter
- mock hardware adapter
- browser speech wrapper
- FastAPI MockPlanner
- first unit tests

## Codex must do

1. Pull and work only on branch `demo/mobile-voice-v0`.
2. Install dependencies.
3. Fix all TypeScript/build/runtime issues in the scaffold.
4. Copy/synchronize the root lexicons into `frontend/src/config/` or implement a single-source build step.
5. Run `npm test`, `npm run build`.
6. Run FastAPI and verify `GET /health` and `POST /api/intent`.
7. Run the frontend and manually verify all quick demo buttons.
8. Verify P0 never calls the backend before MockHardwareAdapter ACK.
9. Improve speech recognition lifecycle on Chrome/Android where necessary.
10. Add PWA metadata/service worker only after core functionality works.
11. Add a configurable backend base URL instead of hard-coded localhost.
12. Add a clear mobile LAN testing workflow.
13. Add tests for MockHardwareAdapter and P0 bypass.
14. Update README with exact commands.
15. Commit all working changes to this branch.

## Do not redesign

Do not replace the dual-channel architecture.
Do not put the LLM in the emergency path.
Do not invent CAN/serial byte protocols.
Do not claim mock execution is physical execution.
Do not spend time on visual polish until the core acceptance tests pass.

## Definition of done

The repository can be cloned on a normal developer machine, started by following README, opened from a phone on the same LAN, and used to demonstrate voice/text input → immediate local P0 routing → canonical JSON → simulated motor lock/brake ACK, plus backend MockPlanner for complex commands.
