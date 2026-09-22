import { describe, expect, it, vi } from "vitest";
import { FallbackPlanner, PlannerClient } from "./planner";

describe("FallbackPlanner", () => {
  it("creates a clearly labelled mock fallback cup plan", async () => {
    const plan = await new FallbackPlanner().plan("把水杯拿过来");
    expect(plan.mode).toBe("mock/fallback");
    expect(plan.intent).toBe("fetch_object");
    expect(plan.steps.map((step) => step.action)).toEqual([
      "locate_object", "grasp_object", "deliver_object"
    ]);
  });

  it("supports battery queries offline", async () => {
    const plan = await new FallbackPlanner().plan("还有多少电");
    expect(plan.mode).toBe("mock/fallback");
    expect(plan.intent).toBe("query_battery");
  });
});

describe("PlannerClient", () => {
  it("falls back when FastAPI is unavailable", async () => {
    const unavailable = vi.fn().mockRejectedValue(new Error("offline"));
    const client = new PlannerClient("http://backend", unavailable);
    const plan = await client.plan("现在什么情况", "session");
    expect(unavailable).toHaveBeenCalledOnce();
    expect(plan.mode).toBe("mock/fallback");
    expect(plan.intent).toBe("query_system_status");
  });

  it("forwards the temporary demo token to FastAPI", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      mode: "mock",
      intent: "query_battery",
      steps: [{ action: "query_battery" }],
      requires_confirmation: false,
      message: "mock"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const client = new PlannerClient(
      "https://demo.example",
      fetcher,
      new FallbackPlanner(),
      "run-token"
    );

    await client.plan("还有多少电", "session");

    expect(fetcher).toHaveBeenCalledWith(
      "https://demo.example/api/intent?access_token=run-token",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Demo-Token": "run-token" })
      })
    );
  });
});
