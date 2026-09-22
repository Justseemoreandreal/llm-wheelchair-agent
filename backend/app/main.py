from __future__ import annotations

import ipaddress
import os
import secrets
import time
from collections import deque
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

app = FastAPI(title="LLM Wheelchair Demo API", version="0.0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _configured_token() -> str:
    return os.getenv("DEMO_ACCESS_TOKEN", "").strip()


def _is_loopback(host: str | None) -> bool:
    if not host:
        return False
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host.lower() == "localhost"


def _request_host(request: Request) -> str | None:
    return request.headers.get("cf-connecting-ip") or (
        request.client.host if request.client else None
    )


def _valid_token(supplied: str | None) -> bool:
    expected = _configured_token()
    if not expected:
        return True
    return bool(supplied) and secrets.compare_digest(supplied, expected)


@app.middleware("http")
async def demo_access_gate(request: Request, call_next):
    expected = _configured_token()
    if not expected or _is_loopback(_request_host(request)) or request.url.path == "/health":
        return await call_next(request)

    supplied = (
        request.query_params.get("access_token")
        or request.headers.get("x-demo-token")
        or request.cookies.get("demo_access_token")
    )
    if not _valid_token(supplied):
        return JSONResponse(
            {"detail": "A valid temporary demo access token is required."},
            status_code=401,
        )

    response = await call_next(request)
    if request.query_params.get("access_token"):
        forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        response.set_cookie(
            "demo_access_token",
            supplied,
            httponly=True,
            secure=forwarded_proto == "https",
            samesite="lax",
        )
    return response


class IntentRequest(BaseModel):
    session_id: str
    raw_text: str = Field(min_length=1)
    timestamp: int
    turn_id: int
    abnormal_flag: bool = False


class PlanStep(BaseModel):
    action: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class IntentResponse(BaseModel):
    mode: str = "mock"
    intent: str
    steps: list[PlanStep]
    requires_confirmation: bool = False
    message: str


class ControlCommand(BaseModel):
    schema_version: Literal["0.1"]
    event_type: Literal["control_command"]
    command_id: str = Field(min_length=1)
    session_id: str = Field(min_length=1)
    source: Literal["voice_local_rule", "llm_planner", "ui_test"]
    raw_text: str
    matched_word: str | None
    priority: Literal["P0", "P1", "P2", "P3"]
    action: str = Field(min_length=1)
    owner: Literal["offline", "llm", "both"]
    timestamp_ms: int
    latency_ms: float = Field(ge=0)
    requires_ack: bool


class ControlAck(BaseModel):
    event_type: Literal["control_ack"] = "control_ack"
    command_id: str
    accepted: bool
    controller_state: str
    timestamp_ms: int
    message: str


class SimulatedController:
    def __init__(self) -> None:
        self.motor = "IDLE"
        self.brake = "RELEASED"
        self.safety_latched = False
        self.events: deque[dict[str, Any]] = deque(maxlen=50)

    @property
    def state(self) -> str:
        return f"MOTOR={self.motor};BRAKE={self.brake}"

    def execute(self, command: ControlCommand) -> ControlAck:
        if command.priority == "P0":
            self.motor = "LOCKED"
            self.brake = "ENGAGED"
            self.safety_latched = True
        elif self.safety_latched and command.priority == "P2" and self._is_motion(command.action):
            ack = ControlAck(
                command_id=command.command_id,
                accepted=False,
                controller_state=self.state,
                timestamp_ms=int(time.time() * 1000),
                message="Rejected by simulated server P0 safety latch; explicit reset required.",
            )
            self.events.append({"command": command.model_dump(), "ack": ack.model_dump()})
            return ack
        elif command.action == "move_forward":
            self.motor = "FORWARD"
            self.brake = "RELEASED"
        elif command.action == "move_backward":
            self.motor = "BACKWARD"
            self.brake = "RELEASED"
        elif "stop" in command.action or "brake" in command.action:
            self.motor = "LOCKED"
            self.brake = "ENGAGED"

        ack = ControlAck(
            command_id=command.command_id,
            accepted=True,
            controller_state=self.state,
            timestamp_ms=int(time.time() * 1000),
            message="Simulated control gateway acknowledged command; no physical hardware was controlled.",
        )
        self.events.append(
            {"command": command.model_dump(), "ack": ack.model_dump()}
        )
        return ack

    @staticmethod
    def _is_motion(action: str) -> bool:
        return action.startswith(("move_", "turn_", "navigate_", "speed_", "go_"))

    def reset(self) -> dict[str, Any]:
        self.motor = "IDLE"
        self.brake = "RELEASED"
        self.safety_latched = False
        return {
            "accepted": True,
            "safety_latched": False,
            "controller_state": self.state,
            "message": "Simulated controller reset; no physical hardware was controlled.",
        }


controller = SimulatedController()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "planner": "mock", "control_gateway": "simulated"}


@app.post("/api/intent", response_model=IntentResponse)
def intent(req: IntentRequest) -> IntentResponse:
    """
    Deliberately simple planner for Demo V0.
    Codex should keep this fallback even after adding a real LLM provider.
    P0 emergency commands must never depend on this endpoint.
    """
    text = req.raw_text

    if "水杯" in text and any(token in text for token in ("拿", "取", "给我")):
        return IntentResponse(
            intent="fetch_object",
            steps=[
                PlanStep(action="locate_object", parameters={"object": "水杯"}),
                PlanStep(action="grasp_object", parameters={"object": "水杯"}),
                PlanStep(action="deliver_object", parameters={"target": "user"}),
            ],
            message="MockPlanner: fetch cup task planned.",
        )

    if "电" in text:
        return IntentResponse(
            intent="query_battery",
            steps=[PlanStep(action="query_battery")],
            message="MockPlanner: battery query planned.",
        )

    if "刚才" in text or "再" in text:
        return IntentResponse(
            intent="contextual_followup",
            steps=[PlanStep(action="resolve_context")],
            message="MockPlanner: context resolution placeholder.",
        )

    if "情况" in text or "状态" in text:
        return IntentResponse(
            intent="query_system_status",
            steps=[PlanStep(action="query_system_status")],
            message="MockPlanner: system status query planned.",
        )

    return IntentResponse(
        intent="unknown",
        steps=[],
        requires_confirmation=True,
        message="MockPlanner could not safely determine the intent.",
    )


@app.get("/api/control/state")
def control_state() -> dict[str, Any]:
    return {
        "mode": "simulation",
        "motor": controller.motor,
        "brake": controller.brake,
        "controller_state": controller.state,
        "safety_latched": controller.safety_latched,
        "events": list(controller.events),
        "warning": "Simulated controller only; no physical wheelchair was controlled.",
    }


@app.post("/api/control/reset")
def reset_control() -> dict[str, Any]:
    return controller.reset()


@app.websocket("/ws/control")
async def control_gateway(websocket: WebSocket) -> None:
    client_host = websocket.headers.get("cf-connecting-ip") or (
        websocket.client.host if websocket.client else None
    )
    if _configured_token() and not _is_loopback(client_host):
        supplied = websocket.query_params.get("access_token") or websocket.headers.get("x-demo-token")
        if not _valid_token(supplied):
            await websocket.close(code=4401, reason="Temporary demo access token required")
            return
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            try:
                command = ControlCommand.model_validate(payload)
                await websocket.send_json(controller.execute(command).model_dump())
            except ValidationError as error:
                command_id = payload.get("command_id", "") if isinstance(payload, dict) else ""
                ack = ControlAck(
                    command_id=command_id,
                    accepted=False,
                    controller_state=controller.state,
                    timestamp_ms=int(time.time() * 1000),
                    message=f"Invalid control_command schema: {error.error_count()} validation error(s).",
                )
                await websocket.send_json(ack.model_dump())
    except WebSocketDisconnect:
        return


@app.get("/{full_path:path}", include_in_schema=False)
def unified_frontend(full_path: str) -> FileResponse:
    index = FRONTEND_DIST / "index.html"
    candidate = (FRONTEND_DIST / full_path).resolve()
    dist_root = FRONTEND_DIST.resolve()
    if full_path and candidate.is_relative_to(dist_root) and candidate.is_file():
        return FileResponse(candidate)
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(
        status_code=404,
        detail="Frontend build not found. Run npm run build in frontend/.",
    )
