import { describe, expect, it, vi } from "vitest";
import emergencyData from "./config/lexicon_emergency.json";
import normalData from "./config/lexicon_normal.json";
import { MockHardwareAdapter } from "./adapters";
import { FallbackPlanner } from "./planner";
import { CommandProcessor } from "./processor";
import { SafetyRouter } from "./router";
import type { LexiconEntry } from "./types";

const entries = [
  ...(emergencyData.lexicon as LexiconEntry[]),
  ...(normalData.lexicon as LexiconEntry[])
];

function setup() {
  const adapter = new MockHardwareAdapter();
  const planner = new FallbackPlanner();
  return {
    adapter,
    processor: new CommandProcessor(new SafetyRouter(entries), adapter, planner)
  };
}

describe("Demo V0 acceptance commands", () => {
  it.each(["停下", "刹车"])("executes %s as P0 with a locked motor and engaged brake", async (text) => {
    const { processor } = setup();
    const result = await processor.process(text, "acceptance", "ui_test");
    expect(result.kind).toBe("control");
    if (result.kind === "control") {
      expect(result.command.priority).toBe("P0");
      expect(result.ack.controller_state).toBe("MOTOR=LOCKED;BRAKE=ENGAGED");
    }
  });

  it.each([
    ["前进", "MOTOR=FORWARD;BRAKE=RELEASED"],
    ["后退", "MOTOR=BACKWARD;BRAKE=RELEASED"]
  ])("executes %s through the local mock adapter", async (text, expectedState) => {
    const { processor } = setup();
    const result = await processor.process(text, "acceptance", "ui_test");
    expect(result.kind).toBe("control");
    if (result.kind === "control") expect(result.ack.controller_state).toBe(expectedState);
  });

  it.each([
    ["把水杯拿过来", "fetch_object"],
    ["我刚才让你去的地方", "contextual_followup"],
    ["还有多少电", "query_battery"],
    ["现在什么情况", "query_system_status"]
  ])("keeps %s demonstrable with the offline fallback", async (text, intent) => {
    const { processor } = setup();
    const result = await processor.process(text, "acceptance", "ui_test");
    expect(result.kind).toBe("plan");
    if (result.kind === "plan") {
      expect(result.plan.mode).toBe("mock/fallback");
      expect(result.plan.intent).toBe(intent);
    }
  });

  it("keeps P0 operational when the backend planner is offline", async () => {
    const planner = { plan: vi.fn().mockRejectedValue(new Error("backend offline")) };
    const adapter = new MockHardwareAdapter();
    const processor = new CommandProcessor(new SafetyRouter(entries), adapter, planner);
    const result = await processor.process("停下", "offline", "voice_local_rule");
    expect(result.kind).toBe("control");
    expect(planner.plan).not.toHaveBeenCalled();
  });
});
