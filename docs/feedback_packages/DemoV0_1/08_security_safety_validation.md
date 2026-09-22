# Security and Safety Validation

- P0 depends on LLM: No.
- P0 waits for Planner: No.
- Server gateway latch after P0: Yes.
- Direct gateway motion bypass while latched: rejected with `accepted=false`.
- Explicit reset required: Yes, `POST /api/control/reset` and visibly separate UI button.
- Public HTTP without Token: 401 (except health probe).
- Public WebSocket without Token: close 4401.
- Loopback access without Token: allowed by specification.
- Token source: cryptographically random per run; removed on stop; never committed.
- UI distinguishes simulation from physical execution: Yes, repeatedly.
- LLM can emit PWM/CAN/raw actuator values: No such path exists.
- Physical E-stop requirement retained: Yes.

This is a demo access gate and simulated safety state machine, not production authentication or certified wheelchair safety.
