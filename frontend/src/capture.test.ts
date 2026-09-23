import { describe, expect, it, vi } from "vitest";
import { PCMFrameEncoder, decodeAudioFile, mixToMono } from "./capture";

describe("shared microphone/file PCM pipeline", () => {
  it("mixes decoded channels and emits bounded 16 kHz PCM frames", () => {
    const mono = mixToMono([new Float32Array([1, 0, -1, 0]), new Float32Array([0, 0, 0, 0])]);
    expect([...mono]).toEqual([0.5, 0, -0.5, 0]);
    const frames: Int16Array[] = [];
    const encoder = new PCMFrameEncoder(16000, (pcm) => frames.push(pcm), 2);
    encoder.push(mono.slice(0, 1));
    encoder.push(mono.slice(1));
    encoder.flush();
    expect(frames.map((frame) => [...frame])).toEqual([[16384, 0], [-16384, 0]]);
  });

  it("flushes the last short file frame on EOF", () => {
    const frames: Int16Array[] = [];
    const encoder = new PCMFrameEncoder(48000, (pcm) => frames.push(pcm), 1600);
    encoder.push(new Float32Array(480));
    expect(frames).toHaveLength(0);
    encoder.flush();
    expect(frames).toHaveLength(1);
    expect(frames[0].length).toBe(160);
  });

  it("decodes a selected browser file through the shared PCM pipeline", async () => {
    const originalContext = globalThis.AudioContext;
    const close = vi.fn(async () => undefined);
    class FakeAudioContext {
      close = close;
      async decodeAudioData() {
        return {
          sampleRate: 16000,
          numberOfChannels: 1,
          length: 4,
          getChannelData: () => new Float32Array([1, 0, -1, 0])
        };
      }
    }
    globalThis.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    try {
      const frames: Int16Array[] = [];
      const selectedFile = { arrayBuffer: async () => new ArrayBuffer(8) } as File;
      await decodeAudioFile(selectedFile, (frame) => frames.push(frame));
      expect([...frames[0]]).toEqual([32767, 0, -32768, 0]);
      expect(close).toHaveBeenCalledOnce();
    } finally {
      globalThis.AudioContext = originalContext;
    }
  });
});
