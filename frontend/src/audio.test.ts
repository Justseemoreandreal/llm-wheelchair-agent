import { describe, expect, it } from "vitest";
import { StreamingResampler, float32ToPcm16, resampleMono } from "./audio";

describe("browser audio PCM helpers", () => {
  it("converts clipped float samples to signed PCM16 little endian", () => {
    const pcm = float32ToPcm16(new Float32Array([-2, -1, 0, 1, 2]));

    expect([...new Int16Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 2)]).toEqual([
      -32768, -32768, 0, 32767, 32767
    ]);
  });

  it("resamples mono frames to the configured 16 kHz target", () => {
    const source = new Float32Array([0, 1, 0, -1]);
    const result = resampleMono(source, 8000, 16000);

    expect(result.length).toBe(8);
    expect(result[0]).toBeCloseTo(0);
    expect(result[2]).toBeCloseTo(1);
    expect(result[6]).toBeCloseTo(-1);
  });

  it("keeps fractional resampling position across input buffers", () => {
    const source = Float32Array.from({ length: 1001 }, (_, index) => Math.sin(index / 13));
    const stream = new StreamingResampler(44100, 16000);
    const chunks = [source.slice(0, 137), source.slice(137, 523), source.slice(523)];
    const streamed = chunks.flatMap((chunk) => Array.from(stream.process(chunk)));
    const whole = Array.from(new StreamingResampler(44100, 16000).process(source));
    expect(streamed.length).toBe(whole.length);
    streamed.forEach((sample, index) => expect(sample).toBeCloseTo(whole[index], 5));
  });
});
