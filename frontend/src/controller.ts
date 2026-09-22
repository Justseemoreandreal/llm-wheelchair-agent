import { appendAccessToken } from "./runtime";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ResetResult {
  accepted: boolean;
  safety_latched: boolean;
  controller_state: string;
  message: string;
}

export async function resetSimulatedController(
  apiBase: string,
  accessToken = "",
  fetcher: FetchLike = globalThis.fetch.bind(globalThis)
): Promise<ResetResult> {
  const response = await fetcher(
    appendAccessToken(`${apiBase}/api/control/reset`, accessToken),
    {
      method: "POST",
      headers: accessToken ? { "X-Demo-Token": accessToken } : {}
    }
  );
  if (!response.ok) throw new Error(`controller reset HTTP ${response.status}`);
  return await response.json() as ResetResult;
}

