export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onStatus: (status: string) => void;
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: any) => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionFactory = () => RecognitionLike;

export interface SpeechRecognitionController {
  start(): void;
  stop(): void;
}

function browserFactory(): RecognitionFactory | null {
  if (typeof window === "undefined") return null;
  const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return Ctor ? () => new Ctor() as RecognitionLike : null;
}

export function createSpeechRecognition(
  callbacks: SpeechCallbacks,
  factory: RecognitionFactory | null = browserFactory()
): SpeechRecognitionController | null {
  if (!factory) return null;

  const recognition = factory();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;

  let desired = false;
  let active = false;
  let starting = false;
  let fatalError = false;

  const startUnderlying = () => {
    if (!desired || active || starting) return;
    starting = true;
    try {
      recognition.start();
    } catch (error) {
      starting = false;
      desired = false;
      fatalError = true;
      callbacks.onStatus(`ERROR: start failed (${String(error)})`);
    }
  };

  recognition.onstart = () => {
    active = true;
    starting = false;
    callbacks.onStatus("LISTENING");
  };

  recognition.onend = () => {
    active = false;
    starting = false;
    if (desired) {
      callbacks.onStatus("RESTARTING");
      queueMicrotask(startUnderlying);
    } else if (!fatalError) {
      callbacks.onStatus("STOPPED");
    }
  };

  recognition.onerror = (event) => {
    const error = event.error || "unknown";
    if (error === "aborted" && !desired) return;
    if (["not-allowed", "service-not-allowed", "audio-capture"].includes(error)) {
      desired = false;
      fatalError = true;
    }
    callbacks.onStatus(`ERROR: ${error}`);
  };

  recognition.onresult = (event) => {
    let interim = "";
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const piece = event.results[i][0]?.transcript ?? "";
      if (event.results[i].isFinal) finalText += piece;
      else interim += piece;
    }
    if (interim) callbacks.onInterim(interim);
    if (finalText) callbacks.onFinal(finalText);
  };

  return {
    start() {
      fatalError = false;
      desired = true;
      startUnderlying();
    },
    stop() {
      desired = false;
      fatalError = false;
      if (active || starting) recognition.stop();
      else callbacks.onStatus("STOPPED");
    }
  };
}
