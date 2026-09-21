import { describe, expect, it, vi } from "vitest";
import { MockHardwareAdapter } from "./adapters";
import { CommandProcessor } from "./processor";
import { SafetyRouter } from "./router";
import type { LexiconEntry } from "./types";

const entries: LexiconEntry[] = [
  { word: "停下", type: "emergency_stop", priority: "P0", action: "immediate_stop", owner: "both" },
  { word: "把水杯拿过来", type: "grasp_task", priority: "P2", action: "grasp_move_cup", owner: "llm" }
];

describe("CommandProcessor", () => {
  it("ACKs P0 locally without invoking the planner", async () => {
    const planner = { plan: vi.fn() };
    const processor = new CommandProcessor(new SafetyRouter(entries), new MockHardwareAdapter(), planner);
    const result = await processor.process("停下", "session", "voice_local_rule");
    expect(result.kind).toBe("control");
    if (result.kind === "control") {
      expect(result.ack.controller_state).toBe("MOTOR=LOCKED;BRAKE=ENGAGED");
    }
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it("does not send a duplicate P0 interim fragment to the planner", async () => {
    const planner = { plan: vi.fn() };
    const processor = new CommandProcessor(new SafetyRouter(entries), new MockHardwareAdapter(), planner);
    await processor.process("停下", "session", "voice_local_rule");
    const duplicate = await processor.process("停下", "session", "voice_local_rule");
    expect(duplicate.kind).toBe("ignored");
    expect(planner.plan).not.toHaveBeenCalled();
  });

  it("sends complex language to the planner", async () => {
    const plan = { mode: "mock/fallback" as const, intent: "fetch_object", steps: [], requires_confirmation: false, message: "fallback" };
    const planner = { plan: vi.fn().mockResolvedValue(plan) };
    const processor = new CommandProcessor(new SafetyRouter(entries), new MockHardwareAdapter(), planner);
    const result = await processor.process("把水杯拿过来", "session", "ui_test");
    expect(result).toEqual({ kind: "plan", plan });
    expect(planner.plan).toHaveBeenCalledOnce();
  });
});
