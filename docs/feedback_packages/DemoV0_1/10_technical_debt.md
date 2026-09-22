# Technical Debt

- MockHardwareAdapter and server SimulatedController must be replaced/adapted only after real hardware protocol is supplied.
- MockPlanner/FallbackPlanner are deterministic demo logic, not an LLM.
- Browser Web Speech has no controlled cross-browser conformance layer.
- Quick Tunnel and query bootstrap Token are temporary-demo infrastructure, not production auth.
- cloudflared cache is not version-pinned or hash-verified beyond HTTPS transport.
- Controller state is in memory and global to one process.
- Launcher tests cover separated helpers; full `.bat` lifecycle remains manual/integration-tested rather than hermetic CI.
- Physical safety certification, watchdog, independent E-stop, fault injection and hardware state reconciliation are outside V0.1.
