export type ControlMode = "SIMULATION" | "NETWORK_GATEWAY";

interface RuntimeEnvironment {
  VITE_API_BASE_URL?: string;
  VITE_CONTROL_WS_URL?: string;
  VITE_ASR_WS_URL?: string;
}

export interface RuntimeConfig {
  apiBase: string;
  gatewayUrl: string;
  asrUrl: string;
  accessToken: string;
  phoneTest: boolean;
  initialControlMode: ControlMode;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function appendAccessToken(url: string, accessToken: string): string {
  if (!accessToken) return url;
  const target = new URL(url);
  target.searchParams.set("access_token", accessToken);
  return target.toString();
}

export function resolveRuntimeConfig(
  pageUrl: URL,
  environment: RuntimeEnvironment
): RuntimeConfig {
  const accessToken = pageUrl.searchParams.get("access_token")?.trim() ?? "";
  const phoneTest = pageUrl.searchParams.get("phone_test") === "1";
  const splitDevServer = pageUrl.port === "5173";
  const defaultApiBase = splitDevServer
    ? `${pageUrl.protocol}//${pageUrl.hostname}:8000`
    : pageUrl.origin;
  const apiBase = trimTrailingSlash(
    environment.VITE_API_BASE_URL?.trim() || defaultApiBase
  );
  const defaultGateway = splitDevServer
    ? `${pageUrl.protocol === "https:" ? "wss:" : "ws:"}//${pageUrl.hostname}:8000/ws/control`
    : `${pageUrl.protocol === "https:" ? "wss:" : "ws:"}//${pageUrl.host}/ws/control`;
  const gatewayUrl = appendAccessToken(
    environment.VITE_CONTROL_WS_URL?.trim() || defaultGateway,
    accessToken
  );
  const asrUrl = appendAccessToken(
    environment.VITE_ASR_WS_URL?.trim() || defaultGateway.replace(/\/ws\/control$/, "/ws/asr"),
    accessToken
  );

  return {
    apiBase,
    gatewayUrl,
    asrUrl,
    accessToken,
    phoneTest,
    initialControlMode: phoneTest ? "NETWORK_GATEWAY" : "SIMULATION"
  };
}
