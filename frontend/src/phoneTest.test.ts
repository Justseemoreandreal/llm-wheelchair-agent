import { describe, expect, it } from "vitest";
import { buildPhoneTestSummary } from "./phoneTest";

describe("buildPhoneTestSummary", () => {
  it("exports a simulation-only checklist without exposing the launch token", () => {
    const summary = buildPhoneTestSummary({
      speechSupported: true,
      speechStatus: "LISTENING",
      transcript: "停下",
      stop: true,
      latch: true,
      reset: true,
      forwardAfterReset: true,
      fallback: true
    });

    expect(summary.stage).toBe("DemoV0.1");
    expect(summary.simulation_only).toBe(true);
    expect(summary.checks.p0_stop).toBe(true);
    expect(summary.checks.fallback_planner).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("access_token");
  });
});
