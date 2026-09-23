/** Optional manual browser integration check. Install playwright-core into .runtime/edge-test first. */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const repository = resolve(import.meta.dirname, "..");
const playwrightPath = resolve(repository, ".runtime/edge-test/node_modules/playwright-core/index.mjs");
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
});

try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
  });
  await page.goto(process.argv[2], { waitUntil: "networkidle" });
  const fixture = resolve(repository, ".runtime/models/sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01/test_wavs/0.wav");
  await page.locator("#audio-file").setInputFiles(fixture);
  await page.locator(".hero .status").getByText("FINAL RECEIVED · LOCAL ASR").waitFor({ timeout: 120_000 });
  const diagnostics = await page.locator(".diagnostics").innerText();
  assert.match(diagnostics, /Speech API\s+UNSUPPORTED \(OK\)/);
  assert.match(diagnostics, /Latest final\s+.*大家.*研究/s);
  assert.match(diagnostics, /[1-9]\d* frames/);
  assert.match(diagnostics, /ASR error\s+—/);
  const microphone = await browser.newPage({ permissions: ["microphone"] });
  await microphone.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
  });
  await microphone.goto(process.argv[2], { waitUntil: "networkidle" });
  await microphone.getByRole("button", { name: "开始本地识别" }).click();
  await microphone.getByText("LISTENING · LOCAL ASR", { exact: true }).waitFor({ timeout: 30_000 });
  await microphone.waitForFunction(() => /[1-9]\d* frames/.test(document.querySelector(".diagnostics")?.textContent ?? ""), undefined, { timeout: 15_000 });
  const captureDiagnostics = await microphone.locator(".diagnostics").innerText();
  assert.match(captureDiagnostics, /getUserMedia\s+ACTIVE/);
  assert.match(captureDiagnostics, /AUDIO_WORKLET|SCRIPT_PROCESSOR_FALLBACK/);
  await microphone.getByRole("button", { name: "停止并获取 final" }).click();
  console.log(JSON.stringify({ browser: await browser.version(), webSpeechDisabled: true, fileDiagnostics: diagnostics, fakeMicrophoneDiagnostics: captureDiagnostics }));
} finally {
  await browser.close();
}
