# Interface Contract V0

## Voice/ASR -> Router

```json
{
  "session_id": "string",
  "raw_text": "string",
  "timestamp": 0,
  "turn_id": 1,
  "abnormal_flag": false,
  "is_final": false
}
```

## Router -> Control Gateway

```json
{
  "schema_version": "0.1",
  "event_type": "control_command",
  "command_id": "uuid",
  "session_id": "string",
  "source": "voice_local_rule | llm_planner | ui_test",
  "raw_text": "string",
  "matched_word": "string | null",
  "priority": "P0 | P1 | P2 | P3",
  "action": "string",
  "owner": "offline | llm | both",
  "timestamp_ms": 0,
  "latency_ms": 0,
  "requires_ack": true
}
```

## Gateway ACK

```json
{
  "event_type": "control_ack",
  "command_id": "uuid",
  "accepted": true,
  "controller_state": "LOCKED",
  "timestamp_ms": 0,
  "message": "mock emergency stop acknowledged"
}
```

## Non-negotiable

P0 is locally executable and may only be mirrored to the LLM asynchronously after the local control event has been emitted.
