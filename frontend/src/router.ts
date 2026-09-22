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

  resetSafetyLatch(): void {
    this.p0LatchedUntil = 0;
    this.lastFingerprint = "";
    this.lastAt = 0;
  }

  recognizes(text: string): boolean {
    const normalized = text.replace(/\s+/g, "");
    return normalized.length > 0 && this.entries.some((entry) => normalized.includes(entry.word));
  }

  route(text: string, sessionId: string, source: ControlCommand["source"] = "voice_local_rule"): RouteResult | null {
    const started = performance.now();
    const normalized = text.replace(/\s+/g, "");
    if (!normalized) return null;

    const match = this.entries.find((entry) => normalized.includes(entry.word));
    if (!match) return null;

    const now = Date.now();
    // ASR often grows one interim phrase ("停" -> "停下"). Treat the same
    // priority/action as one command even when the matched word becomes longer.
    const fingerprint = `${match.priority}:${match.action}`;

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
