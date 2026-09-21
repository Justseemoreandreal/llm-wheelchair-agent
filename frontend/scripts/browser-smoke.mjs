const phase = process.argv[2] ?? "online";
const cdpBase = process.env.CDP_BASE_URL ?? "http://127.0.0.1:9223";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const targets = await fetch(`${cdpBase}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page" && item.url.includes("127.0.0.1:5173"));
if (!target) throw new Error("Demo page not found in Chrome DevTools targets");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

function command(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitForReady() {
  for (let i = 0; i < 50; i += 1) {
    if (await evaluate("Boolean(document.querySelector('.chips button'))")) return;
    await sleep(100);
  }
  throw new Error("Demo UI did not become ready");
}

async function clickButton(text) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`Button not found: ${text}`);
}

async function selectMode(value) {
  await evaluate(`(() => {
    const select = document.querySelector('#control-mode');
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(100);
}

function requireIncludes(body, expected, label) {
  if (!body.includes(expected)) throw new Error(`${label}: missing ${expected}`);
}

await command("Page.reload", { ignoreCache: true });
await waitForReady();

if (phase === "online") {
  await clickButton("停下");
  await sleep(150);
  let body = await evaluate("document.body.innerText");
  requireIncludes(body, "P0 紧急停止", "stop");
  requireIncludes(body, "immediate_stop", "stop");
  requireIncludes(body, "MOTOR=LOCKED;BRAKE=ENGAGED", "stop");
  requireIncludes(body, "SUCCESS", "stop");

  await clickButton("刹车");
  await sleep(150);
  body = await evaluate("document.body.innerText");
  requireIncludes(body, "brake_now", "brake");

  await sleep(1900);
  await clickButton("前进");
  await sleep(150);
  body = await evaluate("document.body.innerText");
  requireIncludes(body, "move_forward", "forward");
  requireIncludes(body, "MOTOR=FORWARD;BRAKE=RELEASED", "forward");

  await clickButton("把水杯拿过来");
  await sleep(250);
  body = await evaluate("document.body.innerText");
  requireIncludes(body, '"mode": "mock"', "backend planner");
  requireIncludes(body, '"intent": "fetch_object"', "backend planner");

  await selectMode("NETWORK_GATEWAY");
  await clickButton("停下");
  await sleep(250);
  body = await evaluate("document.body.innerText");
  requireIncludes(body, "NETWORK GATEWAY", "gateway mode");
  requireIncludes(body, "WebSocketHardwareAdapter", "gateway mode");
  requireIncludes(body, "MOTOR=LOCKED;BRAKE=ENGAGED", "gateway ACK");
  console.log(JSON.stringify({ phase, passed: true, checks: ["停下", "刹车", "前进", "backend planner", "network gateway"] }));
} else if (phase === "offline") {
  await selectMode("SIMULATION");
  await clickButton("停下");
  await sleep(150);
  let body = await evaluate("document.body.innerText");
  requireIncludes(body, "MOTOR=LOCKED;BRAKE=ENGAGED", "offline P0");
  requireIncludes(body, "SUCCESS", "offline P0");

  await sleep(1900);
  await clickButton("把水杯拿过来");
  await sleep(2300);
  body = await evaluate("document.body.innerText");
  requireIncludes(body, '"mode": "mock/fallback"', "offline fallback");
  requireIncludes(body, '"intent": "fetch_object"', "offline fallback");
  console.log(JSON.stringify({ phase, passed: true, checks: ["offline P0", "fallback planner"] }));
} else {
  throw new Error(`Unknown phase: ${phase}`);
}

socket.close();
