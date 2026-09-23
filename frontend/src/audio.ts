export const TARGET_SAMPLE_RATE = 16_000;

export function float32ToPcm16(samples: Float32Array): Int16Array {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = clipped < 0 ? Math.round(clipped * 32768) : Math.round(clipped * 32767);
  }
  return pcm;
}

export function resampleMono(samples: Float32Array, sourceRate: number, targetRate = TARGET_SAMPLE_RATE): Float32Array {
  if (sourceRate === targetRate) return samples.slice();
  if (sourceRate <= 0 || targetRate <= 0 || samples.length === 0) return new Float32Array();
  const targetLength = Math.max(1, Math.round(samples.length * targetRate / sourceRate));
  const output = new Float32Array(targetLength);
  for (let index = 0; index < targetLength; index += 1) {
    const position = index * sourceRate / targetRate;
    const low = Math.min(Math.floor(position), samples.length - 1);
    const high = Math.min(low + 1, samples.length - 1);
    const fraction = position - low;
    output[index] = samples[low] * (1 - fraction) + samples[high] * fraction;
  }
  return output;
}

/** Linear streaming resampler; retains phase and boundary sample between callbacks. */
export class StreamingResampler {
  private received = 0;
  private nextPosition = 0;
  private previous = 0;

  constructor(private sourceRate: number, private targetRate = TARGET_SAMPLE_RATE) {
    if (sourceRate <= 0 || targetRate <= 0) throw new Error("Invalid audio sample rate");
  }

  process(samples: Float32Array): Float32Array {
    if (!samples.length) return new Float32Array();
    const first = this.received;
    const last = first + samples.length - 1;
    const output: number[] = [];
    while (this.nextPosition <= last) {
      const lowIndex = Math.floor(this.nextPosition);
      const fraction = this.nextPosition - lowIndex;
      if (fraction > 0 && lowIndex + 1 > last) break;
      const low = lowIndex < first ? this.previous : samples[lowIndex - first];
      const high = fraction > 0 ? samples[lowIndex + 1 - first] : low;
      output.push(low * (1 - fraction) + high * fraction);
      this.nextPosition += this.sourceRate / this.targetRate;
    }
    this.previous = samples[samples.length - 1];
    this.received += samples.length;
    return Float32Array.from(output);
  }
}

export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}
