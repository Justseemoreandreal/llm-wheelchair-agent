# Launcher Validation

| Entry point | Actual execution | Result |
|---|---:|---|
| `START_DEMO.bat` | Yes | PASS: prepared build, started 8765, health OK, browser open request sent |
| Enter cleanup | Yes | PASS: server stopped and URL became unavailable |
| `START_PHONE_DEMO.bat` | Yes | PASS: official binary downloaded/cached, server+tunnel started, URL+QR produced |
| Phone Enter cleanup | Yes | PASS: server, tunnel, PID and Token files removed |
| `STOP_DEMO.bat` | Yes | PASS: terminated recorded project server; unrelated processes are not killed by name |

Logs are written under ignored `.runtime/logs/`. Stale PID files are handled and ownership is checked against the checkout path before termination.
