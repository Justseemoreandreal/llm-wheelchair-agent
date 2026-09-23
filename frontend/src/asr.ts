import { TARGET_SAMPLE_RATE } from "./audio";

export type ASREvent = {
  event_type: "asr_partial" | "asr_final" | "asr_status" | "asr_error";
  text?: string;
  sequence?: number;
  status?: string;
  code?: string;
  message?: string;
  audio_ms_received?: number;
  server_decode_ms?: number;
  timestamp_ms?: number;
  model?: string;
  is_session_end?: boolean;
};

interface SocketLike {
  binaryType: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  send(data: string | ArrayBuffer): void;
  close(): void;
}

type SocketFactory = (url: string) => SocketLike;

export interface ASRCallbacks {
  onEvent(event: ASREvent): void;
  onState(state: "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "ERROR"): void;
}

export class ASRWebSocketClient {
  private socket: SocketLike | null = null;
  private ready = false;
  private pendingReady: Array<{ resolve: () => void; reject: (error: Error) => void }> = [];

  constructor(
    private url: string,
    private callbacks: ASRCallbacks,
    private createSocket: SocketFactory = (socketUrl) => new WebSocket(socketUrl) as unknown as SocketLike
  ) {}

  connect(): void {
    if (this.socket) return;
    this.callbacks.onState("CONNECTING");
    const socket = this.createSocket(this.url);
    this.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      this.callbacks.onState("CONNECTED");
      socket.send(JSON.stringify({ type: "start", sample_rate: TARGET_SAMPLE_RATE, channels: 1, format: "pcm_s16le" }));
    };
    socket.onmessage = (event) => {
      let message: ASREvent;
      try { message = JSON.parse(event.data) as ASREvent; }
      catch {
        this.callbacks.onEvent({ event_type: "asr_error", code: "invalid_server_event", message: "ASR server sent invalid JSON." });
        return;
      }
      if (message.event_type === "asr_status" && message.status === "ready") {
        this.ready = true;
        this.pendingReady.splice(0).forEach(({ resolve }) => resolve());
      }
      if (message.event_type === "asr_error") {
        this.pendingReady.splice(0).forEach(({ reject }) => reject(new Error(message.message ?? message.code ?? "ASR error")));
      }
      this.callbacks.onEvent(message);
    };
    socket.onerror = () => {
      this.pendingReady.splice(0).forEach(({ reject }) => reject(new Error("ASR WebSocket connection error")));
      this.callbacks.onState("ERROR");
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.ready = false;
      this.pendingReady.splice(0).forEach(({ reject }) => reject(new Error("ASR WebSocket disconnected")));
      this.callbacks.onState("DISCONNECTED");
    };
  }

  async waitUntilReady(timeoutMs = 120_000): Promise<void> {
    if (this.ready) return;
    if (!this.socket) throw new Error("ASR WebSocket is not connected");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingReady = this.pendingReady.filter((item) => item !== pending);
        reject(new Error("ASR model readiness timed out"));
      }, timeoutMs);
      const pending = {
        resolve: () => { clearTimeout(timer); resolve(); },
        reject: (error: Error) => { clearTimeout(timer); reject(error); }
      };
      this.pendingReady.push(pending);
    });
  }

  sendPcm(pcm: Int16Array): boolean {
    if (!this.socket || !this.ready) return false;
    const bytes = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
    this.socket.send(bytes);
    return true;
  }

  stop(): void {
    if (this.socket && this.ready) this.socket.send(JSON.stringify({ type: "stop" }));
  }

  disconnect(): void {
    this.socket?.close();
  }
}
