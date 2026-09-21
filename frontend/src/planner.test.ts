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
});
