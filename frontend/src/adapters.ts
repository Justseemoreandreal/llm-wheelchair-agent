import type { ControlAck, ControlCommand } from "./types";

export interface HardwareAdapter {
  readonly mode: "SIMULATION" | "HARDWARE";
  send(command: ControlCommand): Promise<ControlAck>;
}

export class MockHardwareAdapter implements HardwareAdapter {
  readonly mode = "SIMULATION" as const;
  motorState = "IDLE";
  brakeState = "RELEASED";

  async send(command: ControlCommand): Promise<ControlAck> {
    const started = performance.now();

    if (command.priority === "P0") {
      this.motorState = "LOCKED";
      this.brakeState = "ENGAGED";
    } else if (command.action === "move_forward") {
      this.motorState = "FORWARD";
      this.brakeState = "RELEASED";
    } else if (command.action === "move_backward") {
      this.motorState = "BACKWARD";
      this.brakeState = "RELEASED";
    } else if (command.action.includes("stop") || command.action.includes("brake")) {
      this.motorState = "LOCKED";
      this.brakeState = "ENGAGED";
    }

    await Promise.resolve();
    return {
      event_type: "control_ack",
      command_id: command.command_id,
      accepted: true,
      controller_state: `MOTOR=${this.motorState};BRAKE=${this.brakeState}`,
      timestamp_ms: Date.now(),
      message: "Mock controller acknowledged command. No physical hardware was controlled.",
      ack_latency_ms: Number((performance.now() - started).toFixed(3))
    };
  }
}

export class WebSocketHardwareAdapter implements HardwareAdapter {
  readonly mode = "HARDWARE" as const;
  constructor(private url: string) {}

  send(command: ControlCommand): Promise<ControlAck> {
    const started = performance.now();
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      const timeout = window.setTimeout(() => {
        ws.close();
        reject(new Error("hardware gateway ACK timeout"));
      }, 1500);

      ws.onopen = () => ws.send(JSON.stringify(command));
      ws.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("hardware gateway connection failed"));
      };
      ws.onmessage = (event) => {
        window.clearTimeout(timeout);
        try {
          const ack = JSON.parse(String(event.data)) as ControlAck;
          ack.ack_latency_ms = Number((performance.now() - started).toFixed(3));
          resolve(ack);
        } catch (error) {
          reject(error);
        } finally {
          ws.close();
        }
      };
    });
  }
}
