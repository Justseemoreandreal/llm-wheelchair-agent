from __future__ import annotations

import time
from collections import deque
from typing import Any, Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

app = FastAPI(title="LLM Wheelchair Demo API", version="0.0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        self.events: deque[dict[str, Any]] = deque(maxlen=50)

    @property
    def state(self) -> str:
        return f"MOTOR={self.motor};BRAKE={self.brake}"

    def execute(self, command: ControlCommand) -> ControlAck:
        if command.priority == "P0":
            self.motor = "LOCKED"
            self.brake = "ENGAGED"
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
        "events": list(controller.events),
        "warning": "Simulated controller only; no physical wheelchair was controlled.",
    }


@app.websocket("/ws/control")
async def control_gateway(websocket: WebSocket) -> None:
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
