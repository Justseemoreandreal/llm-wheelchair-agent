import { useMemo, useRef, useState } from "react";
import emergencyData from "./config/lexicon_emergency.json";
import normalData from "./config/lexicon_normal.json";
import { SafetyRouter } from "./router";
import { MockHardwareAdapter } from "./adapters";
import { createSpeechRecognition } from "./speech";
import type { ControlAck, ControlCommand, LexiconEntry } from "./types";
import "./styles.css";

const entries = [
  ...(emergencyData.lexicon as LexiconEntry[]),
  ...(normalData.lexicon as LexiconEntry[])
];

const sessionId = crypto.randomUUID?.() ?? "demo-session";

export default function App() {
  const router = useMemo(() => new SafetyRouter(entries), []);
  const adapterRef = useRef(new MockHardwareAdapter());
  const recognitionRef = useRef<any>(null);

  const [speechStatus, setSpeechStatus] = useState("IDLE");
  const [transcript, setTranscript] = useState("");
  const [manual, setManual] = useState("");
  const [command, setCommand] = useState<ControlCommand | null>(null);
  const [ack, setAck] = useState<ControlAck | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [backend, setBackend] = useState("NOT_CALLED");

  const addEvent = (message: string) =>
    setEvents((old) => [`${new Date().toLocaleTimeString()}  ${message}`, ...old].slice(0, 10));

  const handleText = async (text: string, source: ControlCommand["source"] = "voice_local_rule") => {
    setTranscript(text);
    const routed = router.route(text, sessionId, source);

    if (routed?.local) {
      setCommand(routed.command);
      addEvent(`${routed.command.priority} → ${routed.command.action}`);
      try {
        const nextAck = await adapterRef.current.send(routed.command);
        setAck(nextAck);
      } catch (error) {
        addEvent(`Adapter error: ${String(error)}`);
      }
      // Safety/local command path returns immediately. Any LLM mirroring must be async and non-blocking.
      return;
    }

    // Complex/unknown instructions go to the backend planner.
    try {
      setBackend("PLANNING");
      const response = await fetch("http://localhost:8000/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          raw_text: text,
          timestamp: Date.now(),
          turn_id: Date.now(),
          abnormal_flag: false
        })
      });
      const data = await response.json();
      setBackend(JSON.stringify(data));
      addEvent("Complex instruction → backend planner");
    } catch (error) {
      setBackend(`BACKEND_UNAVAILABLE: ${String(error)}`);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      recognitionRef.current = createSpeechRecognition({
        onInterim: (text) => handleText(text),
        onFinal: (text) => handleText(text),
        onStatus: setSpeechStatus
      });
    }
    if (!recognitionRef.current) {
      setSpeechStatus("UNSUPPORTED — use text fallback");
      return;
    }
    try {
      recognitionRef.current.start();
    } catch {
      // Browser may throw if start() is called twice.
    }
  };

  const stopListening = () => recognitionRef.current?.stop?.();

  return (
    <main className="shell">
      <header>
        <div>
          <div className="eyebrow">LLM WHEELCHAIR AGENT · DEMO V0</div>
          <h1>智能轮椅语音安全控制</h1>
        </div>
        <span className="mode">SIMULATION</span>
      </header>

      <section className="hero card">
        <div className="mic">🎙️</div>
        <div className="status">{speechStatus}</div>
        <div className="transcript">“{transcript || "等待语音或文本输入"}”</div>
        <div className="row">
          <button className="primary" onClick={startListening}>开始监听</button>
          <button onClick={stopListening}>停止监听</button>
        </div>
      </section>

      <section className="card">
        <h2>快速体验</h2>
        <div className="chips">
          {["停下", "刹车", "危险", "前进", "拿水杯", "把水杯拿过来", "还有多少电"].map((text) => (
            <button key={text} onClick={() => handleText(text, "ui_test")}>{text}</button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) handleText(manual.trim(), "ui_test");
          }}
        >
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="输入一句话，例如：停下" />
          <button className="primary" type="submit">发送</button>
        </form>
      </section>

      <section className="grid">
        <div className="card">
          <h2>本地安全路由</h2>
          <dl>
            <dt>命中</dt><dd>{command?.matched_word ?? "—"}</dd>
            <dt>优先级</dt><dd className={command?.priority === "P0" ? "danger" : ""}>{command?.priority ?? "—"}</dd>
            <dt>动作</dt><dd>{command?.action ?? "—"}</dd>
            <dt>匹配耗时</dt><dd>{command ? `${command.latency_ms} ms` : "—"}</dd>
          </dl>
        </div>

        <div className="card">
          <h2>控制器</h2>
          <dl>
            <dt>模式</dt><dd>MockHardwareAdapter</dd>
            <dt>状态</dt><dd>{ack?.controller_state ?? "IDLE"}</dd>
            <dt>ACK</dt><dd>{ack?.accepted ? "SUCCESS" : "—"}</dd>
            <dt>ACK耗时</dt><dd>{ack?.ack_latency_ms != null ? `${ack.ack_latency_ms} ms` : "—"}</dd>
          </dl>
          <p className="note">当前为模拟控制器，不代表物理轮椅已执行。</p>
        </div>
      </section>

      <section className="card">
        <h2>标准控制事件 JSON</h2>
        <pre>{command ? JSON.stringify(command, null, 2) : "{}"}</pre>
      </section>

      <section className="card">
        <h2>复杂指令通道</h2>
        <pre>{backend}</pre>
      </section>

      <section className="card">
        <h2>事件时间线</h2>
        <ul>{events.map((event, index) => <li key={index}>{event}</li>)}</ul>
      </section>
    </main>
  );
}
