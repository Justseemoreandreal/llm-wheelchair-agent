import { describe, expect, it } from "vitest";
import { SafetyRouter } from "./router";
import type { LexiconEntry } from "./types";

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

  it("latches P0 briefly and blocks following motion", () => {
    const router = new SafetyRouter(entries);
    router.route("停下", "test");
    expect(router.route("前进", "test")).toBeNull();
  });
});
