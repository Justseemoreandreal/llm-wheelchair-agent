import { describe, expect, it, vi } from "vitest";
import { createSpeechRecognition } from "./speech";

class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
}

describe("speech recognition lifecycle", () => {
  it("guards repeated start calls", () => {
    const recognition = new FakeRecognition();
    const controller = createSpeechRecognition(
      { onInterim: vi.fn(), onFinal: vi.fn(), onStatus: vi.fn() },
      () => recognition
    );
    controller?.start();
    controller?.start();
    expect(recognition.start).toHaveBeenCalledOnce();
  });

  it("restarts after an unexpected automatic end", async () => {
    const statuses: string[] = [];
    const recognition = new FakeRecognition();
    const controller = createSpeechRecognition(
      { onInterim: vi.fn(), onFinal: vi.fn(), onStatus: (status) => statuses.push(status) },
      () => recognition
    );
    controller?.start();
    recognition.onend?.();
    await Promise.resolve();
    expect(recognition.start).toHaveBeenCalledTimes(2);
    expect(statuses).toContain("RESTARTING");
  });

  it("stops retrying after microphone permission is denied", async () => {
    const statuses: string[] = [];
    const recognition = new FakeRecognition();
    const controller = createSpeechRecognition(
      { onInterim: vi.fn(), onFinal: vi.fn(), onStatus: (status) => statuses.push(status) },
      () => recognition
    );
    controller?.start();
    recognition.onerror?.({ error: "not-allowed" });
    recognition.onend?.();
    await Promise.resolve();
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(statuses[statuses.length - 1]).toBe("ERROR: not-allowed");
  });
});
