from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_reports_mock_planner() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "planner": "mock", "control_gateway": "simulated"}


def test_intent_plans_fetch_cup() -> None:
    response = client.post(
        "/api/intent",
        json={
            "session_id": "demo",
            "raw_text": "把水杯拿过来",
            "timestamp": 0,
            "turn_id": 1,
            "abnormal_flag": False,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "mock"
    assert payload["intent"] == "fetch_object"
    assert [step["action"] for step in payload["steps"]] == [
        "locate_object",
        "grasp_object",
        "deliver_object",
    ]


def test_websocket_p0_locks_simulated_controller_and_returns_ack() -> None:
    command = {
        "schema_version": "0.1",
        "event_type": "control_command",
        "command_id": "command-1",
        "session_id": "demo",
        "source": "voice_local_rule",
        "raw_text": "停下",
        "matched_word": "停下",
        "priority": "P0",
        "action": "immediate_stop",
        "owner": "both",
        "timestamp_ms": 1,
        "latency_ms": 0.1,
        "requires_ack": True,
    }
    with client.websocket_connect("/ws/control") as websocket:
        websocket.send_json(command)
        ack = websocket.receive_json()

    assert ack["event_type"] == "control_ack"
    assert ack["command_id"] == "command-1"
    assert ack["accepted"] is True
    assert ack["controller_state"] == "MOTOR=LOCKED;BRAKE=ENGAGED"
    assert "simulated" in ack["message"].lower()


def test_control_gateway_rejects_invalid_schema() -> None:
    with client.websocket_connect("/ws/control") as websocket:
        websocket.send_json({"event_type": "not-a-command"})
        ack = websocket.receive_json()
    assert ack["event_type"] == "control_ack"
    assert ack["accepted"] is False
