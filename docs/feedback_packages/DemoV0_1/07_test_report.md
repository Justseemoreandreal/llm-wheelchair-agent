# Test Report

Final commands and results:

```text
frontend> npm test -- --run
Test Files  9 passed (9)
Tests       46 passed (46)

frontend> npm run build
tsc -b && vite build: PASS

backend> .venv/Scripts/python.exe -m pytest -q
12 passed in 2.00s

git diff --check: PASS (only Windows line-ending notices)
```

Coverage includes original V0 behavior plus unified static/SPA serving, public HTTP and WebSocket Token gates, server P0 latch/rejection/reset, runtime URL propagation, planner Token forwarding, local reset, phone summary, launcher token/URL parser, and QR generation.

Manual browser flow: P0 `停下` -> accepted/locked; `前进` before reset -> rejected/latched; explicit reset -> idle/released; `前进` after reset -> accepted/forward; Fallback -> `mock/fallback`.
