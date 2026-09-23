from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app import main


client = TestClient(main.app)


def control_command(
    *,
    command_id: str,
    priority: str,
    action: str,
    raw_text: str,
) -> dict[str, object]:
    return {
        "schema_version": "0.1",
        "event_type": "control_command",
        "command_id": command_id,
        "session_id": "demo",
        "source": "voice_local_rule",
        "raw_text": raw_text,
        "matched_word": raw_text,
        "priority": priority,
        "action": action,
        "owner": "both",
        "timestamp_ms": 1,
        "latency_ms": 0.1,
        "requires_ack": priority in {"P0", "P1"},
    }


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
    command = control_command(
        command_id="command-1",
        priority="P0",
        action="immediate_stop",
        raw_text="停下",
    )
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


def test_unified_server_serves_frontend_and_spa_fallback(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>Demo V0.1</html>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('demo')", encoding="utf-8")
    monkeypatch.setattr(main, "FRONTEND_DIST", dist)

    root = client.get("/")
    spa = client.get("/phone-test")
    asset = client.get("/assets/app.js")

    assert root.status_code == 200
    assert "Demo V0.1" in root.text
    assert spa.status_code == 200
    assert "Demo V0.1" in spa.text
    assert asset.status_code == 200
    assert asset.text == "console.log('demo')"


def test_public_http_requires_launch_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "run-secret")
    public_headers = {"cf-connecting-ip": "203.0.113.9"}

    denied = client.get("/api/control/state", headers=public_headers)
    allowed = client.get(
        "/api/control/state?access_token=run-secret",
        headers=public_headers,
    )

    assert denied.status_code == 401
    assert allowed.status_code == 200


def test_loopback_http_does_not_require_launch_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "run-secret")
    loopback_client = TestClient(main.app, client=("127.0.0.1", 50000))
    assert loopback_client.get("/api/control/state").status_code == 200


def test_public_websocket_requires_launch_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEMO_ACCESS_TOKEN", "run-secret")
    headers = {"cf-connecting-ip": "203.0.113.9"}
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/control", headers=headers):
            pass

    with client.websocket_connect(
        "/ws/control?access_token=run-secret",
        headers=headers,
    ) as websocket:
        websocket.send_json(
            control_command(
                command_id="token-command",
                priority="P0",
                action="immediate_stop",
                raw_text="停下",
            )
        )
        assert websocket.receive_json()["accepted"] is True


def test_server_latch_rejects_motion_until_explicit_reset() -> None:
    client.post("/api/control/reset")
    with client.websocket_connect("/ws/control") as websocket:
        websocket.send_json(
            control_command(
                command_id="latch-stop",
                priority="P0",
                action="immediate_stop",
                raw_text="停下",
            )
        )
        stop_ack = websocket.receive_json()
        websocket.send_json(
            control_command(
                command_id="latch-forward",
                priority="P2",
                action="move_forward",
                raw_text="前进",
            )
        )
        rejected_ack = websocket.receive_json()

    assert stop_ack["accepted"] is True
    assert rejected_ack["accepted"] is False
    assert rejected_ack["controller_state"] == "MOTOR=LOCKED;BRAKE=ENGAGED"
    assert client.get("/api/control/state").json()["safety_latched"] is True

    reset = client.post("/api/control/reset")
    assert reset.status_code == 200
    assert reset.json()["safety_latched"] is False
    assert reset.json()["controller_state"] == "MOTOR=IDLE;BRAKE=RELEASED"

    with client.websocket_connect("/ws/control") as websocket:
        websocket.send_json(
            control_command(
                command_id="after-reset-forward",
                priority="P2",
                action="move_forward",
                raw_text="前进",
            )
        )
        accepted_ack = websocket.receive_json()
    assert accepted_ack["accepted"] is True
    assert accepted_ack["controller_state"] == "MOTOR=FORWARD;BRAKE=RELEASED"


def test_asr_gateway_emits_status_partial_and_final_without_loading_real_model(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeRecognizer:
        def __init__(self) -> None:
            self.texts = iter(["停下", "停下"])

        def accept_pcm(self, pcm: bytes) -> None:
            assert pcm == b"\x00\x00" * 160

        def decode(self) -> str:
            return next(self.texts, "")

        def reset(self) -> None:
            return None

        def finish(self) -> None:
            return None

    class FakeASRService:
        def create_recognizer(self) -> FakeRecognizer:
            return FakeRecognizer()

        def status(self) -> dict[str, str]:
            return {"status": "ready", "model": "fake-test-model"}

    monkeypatch.setattr(main, "asr_service", FakeASRService())
    with client.websocket_connect("/ws/asr") as websocket:
        websocket.send_json({"type": "start", "sample_rate": 16000, "channels": 1, "format": "pcm_s16le"})
        ready = websocket.receive_json()
        websocket.send_bytes(b"\x00\x00" * 160)
        partial = websocket.receive_json()
        websocket.send_json({"type": "stop"})
        final = websocket.receive_json()

    assert ready["event_type"] == "asr_status"
    assert ready["status"] == "ready"
    assert partial["event_type"] == "asr_partial"
    assert partial["text"] == "停下"
    assert final["event_type"] == "asr_final"
    assert final["text"] == "停下"
    assert final["is_session_end"] is True


def test_asr_gateway_returns_error_for_bad_control_schema() -> None:
    with client.websocket_connect("/ws/asr") as websocket:
        websocket.send_json({"type": "start", "sample_rate": 8000, "channels": 1, "format": "pcm_s16le"})
        error = websocket.receive_json()

    assert error["event_type"] == "asr_error"
    assert error["code"] == "invalid_control"
