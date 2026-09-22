# V0.1 Hotfix — Windows WinError 10013 on port 8765

Observed on a real user machine on 2026-09-22.

## Symptom

The one-click launcher completed dependency installation and frontend build, then FastAPI failed to bind:

```
[Errno 13] error while attempting to bind on address ('127.0.0.1', 8765)
[WinError 10013]
```

This means Windows/security/network configuration refused binding to that fixed local port. The frontend/backend code itself had already built successfully.

## Fix

`tools/run_demo.ps1` now:

1. prefers port 8765;
2. checks whether it is actually bindable before starting Uvicorn;
3. if not, asks Windows for a safe free loopback port automatically;
4. uses that selected port consistently for:
   - Uvicorn,
   - health checks,
   - desktop browser URL,
   - Cloudflare Quick Tunnel;
5. records the temporary port/URL under ignored `.runtime/` metadata;
6. cleanup removes the metadata.

The beginner experience remains double-click only. No manual port selection is required.

## User action

Users who downloaded the earlier ZIP must download/pull the updated `demo/mobile-voice-v0.1` branch before retrying.
