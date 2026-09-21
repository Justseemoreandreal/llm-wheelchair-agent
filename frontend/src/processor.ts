import type { HardwareAdapter } from "./adapters";
import type { Planner } from "./planner";
import type { ControlAck, ControlCommand, PlannerResult } from "./types";
import { SafetyRouter } from "./router";

export type ProcessResult =
  | { kind: "control"; command: ControlCommand; ack: ControlAck }
  | { kind: "plan"; plan: PlannerResult }
  | { kind: "ignored" };

export class CommandProcessor {
  constructor(
    private router: SafetyRouter,
    private adapter: HardwareAdapter,
    private planner: Planner
  ) {}

  async process(
    text: string,
    sessionId: string,
    source: ControlCommand["source"] = "voice_local_rule",
    onControlCommand?: (command: ControlCommand) => void
  ): Promise<ProcessResult> {
    const routed = this.router.route(text, sessionId, source);
    if (routed?.local) {
      onControlCommand?.(routed.command);
      const ack = await this.adapter.send(routed.command);
      return { kind: "control", command: routed.command, ack };
    }
    if (routed) {
      return { kind: "plan", plan: await this.planner.plan(text, sessionId) };
    }
    if (this.router.recognizes(text)) {
      return { kind: "ignored" };
    }
    return { kind: "plan", plan: await this.planner.plan(text, sessionId) };
  }
}
