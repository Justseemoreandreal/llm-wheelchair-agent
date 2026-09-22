import type { PlannerResult } from "./types";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface Planner {
  plan(text: string, sessionId?: string): Promise<PlannerResult>;
}

export class FallbackPlanner implements Planner {
  async plan(text: string): Promise<PlannerResult> {
    if (text.includes("水杯") && ["拿", "取", "给我"].some((token) => text.includes(token))) {
      return {
        mode: "mock/fallback",
        intent: "fetch_object",
        steps: [
          { action: "locate_object", parameters: { object: "水杯" } },
          { action: "grasp_object", parameters: { object: "水杯" } },
          { action: "deliver_object", parameters: { target: "user" } }
        ],
        requires_confirmation: false,
        message: "FallbackPlanner: mock cup task plan; backend is unavailable."
      };
    }

    if (text.includes("电")) {
      return {
        mode: "mock/fallback",
        intent: "query_battery",
        steps: [{ action: "query_battery" }],
        requires_confirmation: false,
        message: "FallbackPlanner: mock battery query; backend is unavailable."
      };
    }

    if (text.includes("情况") || text.includes("状态")) {
      return {
        mode: "mock/fallback",
        intent: "query_system_status",
        steps: [{ action: "query_system_status" }],
        requires_confirmation: false,
        message: "FallbackPlanner: mock system status query; backend is unavailable."
      };
    }

    if (text.includes("刚才") || text.includes("再")) {
      return {
        mode: "mock/fallback",
        intent: "contextual_followup",
        steps: [{ action: "resolve_context" }],
        requires_confirmation: true,
        message: "FallbackPlanner: mock context placeholder; backend is unavailable."
      };
    }

    return {
      mode: "mock/fallback",
      intent: "unknown",
      steps: [],
      requires_confirmation: true,
      message: "FallbackPlanner could not safely determine the intent."
    };
  }
}

export class PlannerClient implements Planner {
  constructor(
    private apiBase: string,
    private fetcher: FetchLike = globalThis.fetch.bind(globalThis),
    private fallback: Planner = new FallbackPlanner(),
    private accessToken = ""
  ) {}

  async plan(text: string, sessionId = "demo"): Promise<PlannerResult> {
    const abortController = new AbortController();
    const timeout = globalThis.setTimeout(() => abortController.abort(), 2000);
    try {
      const tokenQuery = this.accessToken
        ? `?access_token=${encodeURIComponent(this.accessToken)}`
        : "";
      const response = await this.fetcher(`${this.apiBase}/api/intent${tokenQuery}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.accessToken ? { "X-Demo-Token": this.accessToken } : {})
        },
        body: JSON.stringify({
          session_id: sessionId,
          raw_text: text,
          timestamp: Date.now(),
          turn_id: Date.now(),
          abnormal_flag: false
        }),
        signal: abortController.signal
      });
      if (!response.ok) throw new Error(`planner HTTP ${response.status}`);
      return await response.json() as PlannerResult;
    } catch {
      return this.fallback.plan(text, sessionId);
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}
