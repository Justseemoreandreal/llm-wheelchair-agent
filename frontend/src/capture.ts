import { StreamingResampler, float32ToPcm16, rms } from "./audio";

export function mixToMono(channels: Float32Array[]): Float32Array {
  if (!channels.length) return new Float32Array();
  const mono = new Float32Array(channels[0].length);
  for (const channel of channels) {
    for (let index = 0; index < mono.length; index += 1) mono[index] += channel[index] / channels.length;
  }
  return mono;
}

export class PCMFrameEncoder {
  private resampler: StreamingResampler;
  private pending: number[] = [];
  constructor(sourceRate: number, private emit: (pcm: Int16Array) => void, private frameSamples = 1600) {
    this.resampler = new StreamingResampler(sourceRate);
  }
  push(samples: Float32Array): void {
    this.pending.push(...this.resampler.process(samples));
    while (this.pending.length >= this.frameSamples) {
      this.emit(float32ToPcm16(Float32Array.from(this.pending.splice(0, this.frameSamples))));
    }
  }
  flush(): void {
    if (this.pending.length) this.emit(float32ToPcm16(Float32Array.from(this.pending.splice(0))));
  }
}

export interface CaptureDiagnostics {
  sampleRate: number;
  level: number;
  captureMode: "AUDIO_WORKLET" | "SCRIPT_PROCESSOR_FALLBACK";
}

export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: AudioNode | null = null;
  private sink: GainNode | null = null;
  private encoder: PCMFrameEncoder | null = null;

  constructor(private emit: (pcm: Int16Array) => void, private diagnostics: (data: CaptureDiagnostics) => void) {}

  async start(): Promise<void> {
    if (this.context) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("此浏览器没有 getUserMedia，或当前页面不是 HTTPS/localhost。");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }, video: false });
      this.context = new AudioContext();
      await this.context.resume();
      this.encoder = new PCMFrameEncoder(this.context.sampleRate, this.emit);
      this.source = this.context.createMediaStreamSource(this.stream);
      this.sink = this.context.createGain();
      this.sink.gain.value = 0;
      if (this.context.audioWorklet && typeof AudioWorkletNode !== "undefined") {
        try {
          await this.context.audioWorklet.addModule("/pcm-worklet.js");
          const node = new AudioWorkletNode(this.context, "pcm-capture");
          node.port.onmessage = (event: MessageEvent<Float32Array>) => this.acceptSamples(event.data, "AUDIO_WORKLET");
          this.processor = node;
        } catch {
          // Older browser builds may expose audioWorklet but reject addModule.
        }
      }
      if (!this.processor) {
        const node = this.context.createScriptProcessor(2048, 1, 1);
        node.onaudioprocess = (event) => this.acceptSamples(event.inputBuffer.getChannelData(0), "SCRIPT_PROCESSOR_FALLBACK");
        this.processor = node;
      }
      this.source.connect(this.processor);
      this.processor.connect(this.sink);
      this.sink.connect(this.context.destination);
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  private acceptSamples(samples: Float32Array, captureMode: CaptureDiagnostics["captureMode"]): void {
    this.diagnostics({ sampleRate: this.context?.sampleRate ?? 0, level: rms(samples), captureMode });
    this.encoder?.push(samples);
  }

  async stop(): Promise<void> {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.sink?.disconnect();
    this.encoder?.flush();
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.context?.close();
    this.stream = null;
    this.context = null;
    this.source = null;
    this.processor = null;
    this.sink = null;
    this.encoder = null;
  }
}

/** Uses the same PCMFrameEncoder as microphone capture; only input decoding differs. */
export async function decodeAudioFile(
  file: File,
  emit: (pcm: Int16Array) => void,
  progress?: (sampleRate: number, level: number) => void
): Promise<void> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const encoder = new PCMFrameEncoder(audio.sampleRate, emit);
    for (let offset = 0; offset < audio.length; offset += 2048) {
      const channels = Array.from({ length: audio.numberOfChannels }, (_, index) =>
        audio.getChannelData(index).slice(offset, offset + 2048));
      const mono = mixToMono(channels);
      progress?.(audio.sampleRate, rms(mono));
      encoder.push(mono);
      if (offset % 32768 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    encoder.flush();
  } finally {
    await context.close();
  }
}
