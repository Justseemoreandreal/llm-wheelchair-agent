import { useMemo, useRef, useState } from "react";
import emergencyData from "./config/lexicon_emergency.json";
import normalData from "./config/lexicon_normal.json";
import { SafetyRouter } from "./router";
import { MockHardwareAdapter, WebSocketHardwareAdapter } from "./adapters";
import { CommandProcessor } from "./processor";
import { FallbackPlanner, PlannerClient } from "./planner";
import { createSpeechRecognition, type SpeechRecognitionController } from "./speech";
import { resetSimulatedController } from "./controller";
import { buildPhoneTestSummary } from "./phoneTest";
import { resolveRuntimeConfig, type ControlMode } from "./runtime";
import type { ControlAck, ControlCommand, LexiconEntry } from "./types";
import "./styles.css";

const entries = [
  ...(emergencyData.lexicon as LexiconEntry[]),
  ...(normalData.lexicon as LexiconEntry[])
];

const sessionId = crypto.randomUUID?.() ?? "demo-session";
const runtimeConfig = resolveRuntimeConfig(new URL(window.location.href), {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_CONTROL_WS_URL: import.meta.env.VITE_CONTROL_WS_URL
});
const speechApiSupported = Boolean(
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
);

export default function App() {
  const router = useMemo(() => new SafetyRouter(entries), []);
  const mockAdapterRef = useRef(new MockHardwareAdapter());
  const gatewayAdapter = useMemo(
    () => new WebSocketHardwareAdapter(runtimeConfig.gatewayUrl),
    []
  );
  const planner = useMemo(
    () => new PlannerClient(
      runtimeConfig.apiBase,
      globalThis.fetch.bind(globalThis),
      new FallbackPlanner(),
      runtimeConfig.accessToken
    ),
    []
  );
  const recognitionRef = useRef<SpeechRecognitionController | null | undefined>(undefined);

  const [speechStatus, setSpeechStatus] = useState("STOPPED");
  const [transcript, setTranscript] = useState("");
  const [manual, setManual] = useState("");
  const [command, setCommand] = useState<ControlCommand | null>(null);
  const [ack, setAck] = useState<ControlAck | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [backend, setBackend] = useState("NOT_CALLED");
  const [controlMode, setControlMode] = useState<ControlMode>(runtimeConfig.initialControlMode);
  const [adapterError, setAdapterError] = useState("");
  const [summaryNotice, setSummaryNotice] = useState("");
  const [phoneChecks, setPhoneChecks] = useState({
    stop: false,
    latch: false,
    reset: false,
    forwardAfterReset: false,
    fallback: false
  });

  const addEvent = (message: string) =>
    setEvents((old) => [`${new Date().toLocaleTimeString()}  ${message}`, ...old].slice(0, 10));

  const handleText = async (text: string, source: ControlCommand["source"] = "voice_local_rule") => {
    setTranscript(text);
    setAdapterError("");
    const adapter = controlMode === "SIMULATION" ? mockAdapterRef.current : gatewayAdapter;
    const processor = new CommandProcessor(router, adapter, planner);
    try {
      const result = await processor.process(text, sessionId, source, (nextCommand) => {
        setCommand(nextCommand);
        setAck(null);
        addEvent(`${nextCommand.priority} → ${nextCommand.action} (${controlMode})`);
      });
      if (result.kind === "control") {
        setAck(result.ack);
        addEvent(`${result.ack.accepted ? "ACK SUCCESS" : "ACK REJECTED"} · ${result.ack.controller_state}`);
        setPhoneChecks((old) => ({
          ...old,
          stop: old.stop || (result.command.priority === "P0" && result.ack.accepted),
          latch: old.latch || (result.command.priority === "P2" && !result.ack.accepted),
          forwardAfterReset: old.forwardAfterReset || (
            old.reset && result.command.action === "move_forward" && result.ack.accepted
          )
        }));
      } else if (result.kind === "plan") {
        setBackend(JSON.stringify(result.plan, null, 2));
        if (result.plan.mode === "mock/fallback") {
          setPhoneChecks((old) => ({ ...old, fallback: true }));
        }
        addEvent(result.plan.mode === "mock/fallback"
          ? "复杂指令 → MOCK / FALLBACK"
          : "复杂指令 → FastAPI MockPlanner");
      } else if (["前进", "后退"].some((word) => text.includes(word)) && command?.priority === "P0") {
        setPhoneChecks((old) => ({ ...old, latch: true }));
        addEvent("运动命令被浏览器 P0 安全锁存抑制");
      }
    } catch (error) {
      const message = String(error);
      setAdapterError(message);
      addEvent(`Adapter error: ${message}`);
    }
  };

  const startListening = () => {
    if (recognitionRef.current === undefined) {
      recognitionRef.current = createSpeechRecognition({
        onInterim: (text) => handleText(text),
        onFinal: (text) => handleText(text),
        onStatus: setSpeechStatus
      });
    }
    if (recognitionRef.current === null) {
      setSpeechStatus("ERROR: UNSUPPORTED — 请使用文字或测试按钮");
      return;
    }
    recognitionRef.current.start();
  };

  const stopListening = () => recognitionRef.current?.stop?.();

  const resetController = async () => {
    setAdapterError("");
    try {
      if (controlMode === "SIMULATION") {
        const resetAck = await mockAdapterRef.current.reset();
        setAck(resetAck);
      } else {
        const reset = await resetSimulatedController(
          runtimeConfig.apiBase,
          runtimeConfig.accessToken
        );
        setAck({
          event_type: "control_ack",
          command_id: "demo-reset",
          accepted: reset.accepted,
          controller_state: reset.controller_state,
          timestamp_ms: Date.now(),
          message: reset.message
        });
      }
      router.resetSafetyLatch();
      setPhoneChecks((old) => ({ ...old, reset: true }));
      addEvent("显式复位模拟控制器 → IDLE / RELEASED");
    } catch (error) {
      const message = String(error);
      setAdapterError(message);
      addEvent(`Reset error: ${message}`);
    }
  };

  const runFallbackCheck = async () => {
    const plan = await new FallbackPlanner().plan("把水杯拿过来");
    setBackend(JSON.stringify(plan, null, 2));
    setPhoneChecks((old) => ({ ...old, fallback: true }));
    addEvent("验收测试 → MOCK / FALLBACK");
  };

  const phoneSummary = useMemo(() => buildPhoneTestSummary({
    speechSupported: speechApiSupported,
    speechStatus,
    transcript,
    ...phoneChecks
  }), [speechStatus, transcript, phoneChecks]);

  const copySummary = async () => {
    const text = JSON.stringify(phoneSummary, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setSummaryNotice("验收摘要已复制");
    } catch {
      setSummaryNotice("浏览器未允许复制，请直接复制下方 JSON");
    }
  };

  const downloadSummary = () => {
    const blob = new Blob([JSON.stringify(phoneSummary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "DemoV0_1_phone_test_summary.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setSummaryNotice("验收摘要已导出");
  };

  return (
    <main className="shell">
      <header>
        <div>
          <div className="eyebrow">LLM WHEELCHAIR AGENT · DEMO V0.1</div>
          <h1>智能轮椅语音安全控制</h1>
        </div>
        <span className={`mode ${controlMode === "NETWORK_GATEWAY" ? "network" : ""}`}>
          {controlMode === "SIMULATION" ? "SIMULATION / LOCAL MOCK" : "NETWORK GATEWAY"}
        </span>
      </header>

      <section className="mode-panel card">
        <label htmlFor="control-mode">当前控制模式</label>
        <select
          id="control-mode"
          value={controlMode}
          disabled={runtimeConfig.phoneTest}
          onChange={(event) => {
            setControlMode(event.target.value as ControlMode);
            setAck(null);
            setAdapterError("");
          }}
        >
          <option value="SIMULATION">SIMULATION / LOCAL MOCK</option>
          <option value="NETWORK_GATEWAY">NETWORK GATEWAY（FastAPI 模拟网关）</option>
        </select>
        {runtimeConfig.phoneTest && <p className="muted">手机验收启动器已强制使用 FastAPI 模拟网关。</p>}
        <p className="note">当前均为模拟控制器，不代表物理轮椅已执行。真实硬件接入前必须保留独立物理急停。</p>
      </section>

      <section className="hero card">
        <button className="mic" aria-label="开始语音识别" onClick={startListening}>🎙️</button>
        <div className="status">{speechStatus}</div>
        <div className={`support ${speechApiSupported ? "ok" : "warn"}`}>
          语音识别 API：{speechApiSupported ? "SUPPORTED" : "UNSUPPORTED"}
        </div>
        <div className="transcript">“{transcript || "等待语音或文本输入"}”</div>
        <div className="row">
          <button className="primary" onClick={startListening}>开始监听</button>
          <button onClick={stopListening}>停止监听</button>
        </div>
      </section>

      <section className="card phone-test">
        <div className="section-title-row">
          <div>
            <div className="eyebrow">PHONE ACCEPTANCE ASSISTANT</div>
            <h2>手机验收模式 / Phone Test</h2>
          </div>
          <span className="simulation-pill">SIMULATION ONLY</span>
        </div>
        <ol className="checklist">
          <li className={speechApiSupported ? "done" : ""}>允许麦克风并确认 LISTENING</li>
          <li className={phoneChecks.stop ? "done" : ""}>说或点击“停下”，确认 P0 与 LOCKED / ENGAGED</li>
          <li className={phoneChecks.latch ? "done" : ""}>立即尝试“前进”，确认安全锁存阻止运动</li>
          <li className={phoneChecks.reset ? "done" : ""}>点击“复位模拟控制器”</li>
          <li className={phoneChecks.forwardAfterReset ? "done" : ""}>复位后再次“前进”，确认模拟运动恢复</li>
          <li className={phoneChecks.fallback ? "done" : ""}>运行“把水杯拿过来”的 MOCK / FALLBACK 验收</li>
        </ol>
        <div className="row">
          <button className="reset" onClick={resetController}>复位模拟控制器</button>
          <button onClick={runFallbackCheck}>测试复杂指令 Fallback</button>
          <button onClick={copySummary}>复制验收摘要</button>
          <button onClick={downloadSummary}>导出 JSON</button>
        </div>
        {summaryNotice && <p className="muted">{summaryNotice}</p>}
        <details>
          <summary>查看验收摘要 JSON</summary>
          <pre>{JSON.stringify(phoneSummary, null, 2)}</pre>
        </details>
      </section>

      <section className="card">
        <h2>快速体验</h2>
        <div className="chips">
          {["停下", "刹车", "危险", "前进", "后退", "拿水杯", "把水杯拿过来", "我刚才让你去的地方", "还有多少电", "现在什么情况"].map((text) => (
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
          <h2>{command?.priority === "P0" ? "P0 紧急停止" : "本地安全路由"}</h2>
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
            <dt>模式</dt><dd>{controlMode === "SIMULATION" ? "MockHardwareAdapter" : "WebSocketHardwareAdapter"}</dd>
            <dt>状态</dt><dd>{ack?.controller_state ?? "IDLE"}</dd>
            <dt>ACK</dt><dd>{adapterError ? "ERROR" : ack ? (ack.accepted ? "SUCCESS" : "REJECTED / LATCHED") : "—"}</dd>
            <dt>ACK耗时</dt><dd>{ack?.ack_latency_ms != null ? `${ack.ack_latency_ms} ms` : "—"}</dd>
          </dl>
          {adapterError && <p className="error">{adapterError}</p>}
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
        <p className="muted">FastAPI 不可用时会明确切换为 MOCK / FALLBACK，不使用付费 LLM。</p>
      </section>

      <section className="card">
        <h2>事件时间线</h2>
        <ul>{events.map((event, index) => <li key={index}>{event}</li>)}</ul>
      </section>
    </main>
  );
}
