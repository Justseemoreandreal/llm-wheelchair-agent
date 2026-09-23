import { describe, expect, it } from "vitest";
import { isImmediateSafetyPartial } from "./partial";
import type { LexiconEntry } from "./types";
import { SafetyRouter } from "./router";
import { CommandProcessor } from "./processor";
import { MockHardwareAdapter } from "./adapters";
import { vi } from "vitest";

const entries: LexiconEntry[] = [
  { word: "停下", type: "emergency_stop", priority: "P0", action: "immediate_stop", owner: "both" },
  { word: "水杯", type: "grasp_task", priority: "P2", action: "grasp_move_cup", owner: "llm" }
];

describe("ASR partial safety bridge", () => {
  it("routes an emergency partial without waiting for final or planner", () => {
    expect(isImmediateSafetyPartial("停下", entries)).toBe(true);
    expect(isImmediateSafetyPartial("把水杯拿过来", entries)).toBe(false);
  });

  it("ASR partial reaches P0 ACK with planner offline", async () => {
    const planner = { plan: vi.fn(() => { throw new Error("offline"); }) };
    const processor = new CommandProcessor(new SafetyRouter(entries), new MockHardwareAdapter(), planner);
    const event = { event_type: "asr_partial", text: "停下" };
    expect(isImmediateSafetyPartial(event.text, entries)).toBe(true);
    const result = await processor.process(event.text, "asr-test", "voice_local_rule");
    expect(result.kind).toBe("control");
    if (result.kind === "control") {
      expect(result.command.priority).toBe("P0");
      expect(result.ack.controller_state).toBe("MOTOR=LOCKED;BRAKE=ENGAGED");
    }
    expect(planner.plan).not.toHaveBeenCalled();
  });
});
