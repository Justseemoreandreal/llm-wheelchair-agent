import { describe, expect, it } from "vitest";
import { resolveRuntimeConfig } from "./runtime";

describe("resolveRuntimeConfig", () => {
  it("uses the unified HTTPS origin and propagates the phone launch token", () => {
    const config = resolveRuntimeConfig(
      new URL("https://demo.trycloudflare.com/?access_token=run-token&phone_test=1"),
      {}
    );

    expect(config.apiBase).toBe("https://demo.trycloudflare.com");
    expect(config.gatewayUrl).toBe(
      "wss://demo.trycloudflare.com/ws/control?access_token=run-token"
    );
    expect(config.asrUrl).toBe("wss://demo.trycloudflare.com/ws/asr?access_token=run-token");
    expect(config.accessToken).toBe("run-token");
    expect(config.phoneTest).toBe(true);
    expect(config.initialControlMode).toBe("NETWORK_GATEWAY");
  });

  it("keeps the split-port developer workflow", () => {
    const config = resolveRuntimeConfig(new URL("http://192.0.2.10:5173/"), {});
    expect(config.apiBase).toBe("http://192.0.2.10:8000");
    expect(config.gatewayUrl).toBe("ws://192.0.2.10:8000/ws/control");
    expect(config.asrUrl).toBe("ws://192.0.2.10:8000/ws/asr");
    expect(config.initialControlMode).toBe("SIMULATION");
  });
});
