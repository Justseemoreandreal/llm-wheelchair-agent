import type { ControlCommand, LexiconEntry, RouteResult } from "./types";

const priorityRank = { P0: 0, P1: 1, P2: 2, P3: 3 } as const;

function id() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export class SafetyRouter {
  private entries: LexiconEntry[];
  private lastFingerprint = "";
  private lastAt = 0;
  private p0LatchedUntil = 0;

  constructor(entries: LexiconEntry[]) {
    this.entries = [...entries].sort((a, b) => {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      return b.word.length - a.word.length;
    });
  }

  route(text: string, sessionId: string, source: ControlCommand["source"] = "voice_local_rule"): RouteResult | null {
    const started = performance.now();
    const normalized = text.replace(/\s+/g, "");
    if (!normalized) return null;

    const match = this.entries.find((entry) => normalized.includes(entry.word));
    if (!match) return null;

    const now = Date.now();
    const fingerprint = `${match.priority}:${match.action}:${match.word}`;

    // Prevent repeated interim transcript fragments from hammering the controller.
    if (fingerprint === this.lastFingerprint && now - this.lastAt < 900) {
      return null;
    }

    // P0 latch suppresses subsequent non-P0 motion commands briefly after an emergency stop.
    if (now < this.p0LatchedUntil && match.priority !== "P0") {
      return null;
    }

    if (match.priority === "P0") {
      this.p0LatchedUntil = now + 1800;
    }

    this.lastFingerprint = fingerprint;
    this.lastAt = now;

    const latency = performance.now() - started;
    const command: ControlCommand = {
      schema_version: "0.1",
      event_type: "control_command",
      command_id: id(),
      session_id: sessionId,
      source,
      raw_text: text,
      matched_word: match.word,
      priority: match.priority,
      action: match.action,
      owner: match.owner,
      timestamp_ms: now,
      latency_ms: Number(latency.toFixed(3)),
      requires_ack: match.priority === "P0" || match.priority === "P1"
    };

    const local = match.priority === "P0" || match.priority === "P1" || match.owner === "offline" || match.owner === "both";
    return { command, local };
  }
}
