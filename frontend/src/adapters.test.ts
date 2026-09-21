import { describe, expect, it } from "vitest";
import { MockHardwareAdapter, WebSocketHardwareAdapter } from "./adapters";
import type { ControlCommand } from "./types";

const stopCommand: ControlCommand = {
  schema_version: "0.1",
  event_type: "control_command",
  command_id: "stop-1",
  session_id: "test",
  source: "ui_test",
  raw_text: "停下",
  matched_word: "停下",
  priority: "P0",
  action: "immediate_stop",
  owner: "both",
  timestamp_ms: 1,
  latency_ms: 0.1,
  requires_ack: true
};

describe("MockHardwareAdapter", () => {
  it("locks the motor and engages the brake for P0", async () => {
    const adapter = new MockHardwareAdapter();
    const ack = await adapter.send(stopCommand);
    expect(adapter.motorState).toBe("LOCKED");
    expect(adapter.brakeState).toBe("ENGAGED");
    expect(ack.accepted).toBe(true);
    expect(ack.controller_state).toBe("MOTOR=LOCKED;BRAKE=ENGAGED");
  });
});

describe("WebSocketHardwareAdapter", () => {
  it("sends canonical JSON and returns the gateway ACK", async () => {
    let sent = "";
    class FakeSocket {
      onopen: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      constructor() { queueMicrotask(() => this.onopen?.()); }
      send(data: string) {
        sent = data;
        queueMicrotask(() => this.onmessage?.({ data: JSON.stringify({
          event_type: "control_ack",
          command_id: stopCommand.command_id,
          accepted: true,
          controller_state: "MOTOR=LOCKED;BRAKE=ENGAGED",
          timestamp_ms: 2,
          message: "simulated gateway acknowledged command"
        }) }));
      }
      close() {}
    }

    const adapter = new WebSocketHardwareAdapter("ws://example/ws/control", () => new FakeSocket());
    const ack = await adapter.send(stopCommand);
    expect(JSON.parse(sent)).toEqual(stopCommand);
    expect(ack.controller_state).toBe("MOTOR=LOCKED;BRAKE=ENGAGED");
    expect(adapter.mode).toBe("NETWORK_GATEWAY");
  });
});
