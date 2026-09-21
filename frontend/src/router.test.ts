import { describe, expect, it } from "vitest";
import { SafetyRouter } from "./router";
import type { LexiconEntry } from "./types";
import emergencyData from "./config/lexicon_emergency.json";

const entries: LexiconEntry[] = [
  { word: "停下", type: "emergency_stop", priority: "P0", action: "immediate_stop", owner: "both" },
  { word: "前进", type: "move_control", priority: "P2", action: "move_forward", owner: "offline" }
];

describe("SafetyRouter", () => {
  it("routes emergency stop locally as P0", () => {
    const router = new SafetyRouter(entries);
    const result = router.route("请停下", "test");
    expect(result?.local).toBe(true);
    expect(result?.command.priority).toBe("P0");
    expect(result?.command.action).toBe("immediate_stop");
  });

  it("suppresses duplicate interim fragments", () => {
    const router = new SafetyRouter(entries);
    expect(router.route("停下", "test")).not.toBeNull();
    expect(router.route("停下", "test")).toBeNull();
  });

  it("suppresses an incremental interim variant of the same action", () => {
    const router = new SafetyRouter(emergencyData.lexicon as LexiconEntry[]);
    expect(router.route("停", "test")).not.toBeNull();
    expect(router.route("停下", "test")).toBeNull();
  });

  it("latches P0 briefly and blocks following motion", () => {
    const router = new SafetyRouter(entries);
    router.route("停下", "test");
    expect(router.route("前进", "test")).toBeNull();
  });

  it.each([
    "停", "停止", "停下", "停车", "站住", "别动", "刹住", "刹车", "急停",
    "快停", "立马停", "马上停", "立刻停下", "现在就停", "救命"
  ])("routes required P0 phrase %s locally", (phrase) => {
    const router = new SafetyRouter(emergencyData.lexicon as LexiconEntry[]);
    const result = router.route(phrase, "test");
    expect(result?.local).toBe(true);
    expect(result?.command.priority).toBe("P0");
    expect(result?.command.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
