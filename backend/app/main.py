from __future__ import annotations

from typing import Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    parameters: dict[str, Any] = {}


class IntentResponse(BaseModel):
    mode: str = "mock"
    intent: str
    steps: list[PlanStep]
    requires_confirmation: bool = False
    message: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "planner": "mock"}


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

    return IntentResponse(
        intent="unknown",
        steps=[],
        requires_confirmation=True,
        message="MockPlanner could not safely determine the intent.",
    )
