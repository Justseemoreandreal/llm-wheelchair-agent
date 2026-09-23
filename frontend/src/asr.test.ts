import { describe, expect, it } from "vitest";
import { ASRWebSocketClient } from "./asr";

class FakeSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  sent: Array<string | ArrayBuffer> = [];
  binaryType = "";
  send(data: string | ArrayBuffer) { this.sent.push(data); }
  close() { this.onclose?.(); }
}

describe("ASR WebSocket client", () => {
  it("sends a PCM start frame and forwards partial events immediately", () => {
    const socket = new FakeSocket();
    const partials: string[] = [];
    const client = new ASRWebSocketClient("ws://example/ws/asr", {
      onEvent: (event) => { if (event.event_type === "asr_partial") partials.push(event.text ?? ""); },
      onState: () => undefined
    }, () => socket);

    client.connect();
    socket.onopen?.();
    socket.onmessage?.({ data: JSON.stringify({ event_type: "asr_status", status: "ready" }) });
    client.sendPcm(new Int16Array([0, 1]));
    socket.onmessage?.({ data: JSON.stringify({ event_type: "asr_partial", text: "停下", sequence: 1 }) });

    expect(JSON.parse(String(socket.sent[0]))).toMatchObject({ type: "start", sample_rate: 16000, channels: 1 });
    expect(socket.sent[1]).toBeInstanceOf(ArrayBuffer);
    expect(partials).toEqual(["停下"]);
  });

  it("reports a disconnected ASR socket without throwing", () => {
    const socket = new FakeSocket();
    const states: string[] = [];
    const client = new ASRWebSocketClient("ws://example/ws/asr", { onEvent: () => undefined, onState: (state) => states.push(state) }, () => socket);

    client.connect();
    socket.onclose?.();

    expect(states).toContain("DISCONNECTED");
  });

  it("does not send PCM before server readiness or after disconnect", () => {
    const socket = new FakeSocket();
    const client = new ASRWebSocketClient("ws://example/ws/asr", { onEvent: () => undefined, onState: () => undefined }, () => socket);
    client.connect();
    client.sendPcm(new Int16Array([1]));
    expect(socket.sent).toHaveLength(0);
    socket.onopen?.();
    client.sendPcm(new Int16Array([1]));
    expect(socket.sent).toHaveLength(1);
    socket.onmessage?.({ data: JSON.stringify({ event_type: "asr_status", status: "ready" }) });
    client.sendPcm(new Int16Array([1]));
    expect(socket.sent).toHaveLength(2);
    socket.onclose?.();
    client.sendPcm(new Int16Array([1]));
    expect(socket.sent).toHaveLength(2);
  });
});
