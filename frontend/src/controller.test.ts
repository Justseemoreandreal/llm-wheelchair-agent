import { describe, expect, it, vi } from "vitest";
import { resetSimulatedController } from "./controller";

describe("resetSimulatedController", () => {
  it("calls the explicit reset endpoint with the temporary token", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      accepted: true,
      safety_latched: false,
      controller_state: "MOTOR=IDLE;BRAKE=RELEASED",
      message: "reset"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = await resetSimulatedController(
      "https://demo.example",
      "run-token",
      fetcher
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://demo.example/api/control/reset?access_token=run-token",
      expect.objectContaining({
        method: "POST",
        headers: { "X-Demo-Token": "run-token" }
      })
    );
    expect(result.controller_state).toBe("MOTOR=IDLE;BRAKE=RELEASED");
  });
});
