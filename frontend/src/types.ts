export type Priority = "P0" | "P1" | "P2" | "P3";
export type Owner = "offline" | "llm" | "both";

export interface LexiconEntry {
  word: string;
  type: string;
  priority: Priority;
  action: string;
  owner: Owner;
}

export interface ControlCommand {
  schema_version: "0.1";
  event_type: "control_command";
  command_id: string;
  session_id: string;
  source: "voice_local_rule" | "llm_planner" | "ui_test";
  raw_text: string;
  matched_word: string | null;
  priority: Priority;
  action: string;
  owner: Owner;
  timestamp_ms: number;
  latency_ms: number;
  requires_ack: boolean;
}

export interface ControlAck {
  event_type: "control_ack";
  command_id: string;
  accepted: boolean;
  controller_state: string;
  timestamp_ms: number;
  message: string;
  ack_latency_ms?: number;
}

export interface RouteResult {
  command: ControlCommand;
  local: boolean;
}
