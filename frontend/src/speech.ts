export interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onStatus: (status: string) => void;
}

type RecognitionCtor = new () => any;

export function createSpeechRecognition(callbacks: SpeechCallbacks) {
  const Ctor = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as RecognitionCtor | undefined;
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => callbacks.onStatus("LISTENING");
  recognition.onend = () => callbacks.onStatus("STOPPED");
  recognition.onerror = (event: any) => callbacks.onStatus(`ERROR: ${event.error ?? "unknown"}`);
  recognition.onresult = (event: any) => {
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

  return recognition;
}
