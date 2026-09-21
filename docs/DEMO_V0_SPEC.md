# Demo V0 — 手机端语音安全控制原型

## 目标

快速做出一个可在手机浏览器体验的真实可运行 Demo，用于验证“大语言模型对接单元”与离线安全控制的协同方案。

核心原则：

1. **P0/P1 安全指令不等待大模型。**
2. 语音流中一旦识别到紧急词，立即在本地规则层生成标准控制事件。
3. 大模型只负责复杂自然语言、参数提取、多轮对话和任务编排，不直接控制电机/刹车。
4. Demo 允许使用模拟控制器，但对外输出的控制事件必须是真实、稳定、可接硬件适配器的统一接口。
5. 后续只需替换 Hardware Adapter，即可把同一控制事件映射到 ESP32/STM32/CAN/串口协议。

## Demo 使用体验

手机打开网页 → 允许麦克风 → 点击“开始监听”。

示例：

- “停下” → 页面立即显示 **P0 / emergency_stop / 立即急停，锁止电机**
- “刹车” → **P0 / brake_now**
- “危险” → **P1 / slow_stop_alert**
- “前进” → **P2 / move_forward**
- “拿水杯” → **P2 / grasp_cup**
- “把水杯拿过来” → 进入复杂指令通道，由 LLM 或 mock planner 输出结构化任务
- “我刚才让你去的地方” → 进入多轮上下文通道

页面必须展示：
- 实时转写文本
- 命中的词条
- priority
- action
- owner
- 标准 JSON 控制事件
- 本地触发耗时（ms）
- 控制器状态（模拟/真实）
- 最近事件时间线

## 双通道架构

```
Microphone
   |
   v
Streaming ASR / Browser Speech
   |
   +--> Local Safety Router ----> Hardware Adapter ----> Controller
   |        P0/P1                    WebSocket/Serial/CAN
   |
   +--> LLM Gateway -----------> Task Plan -----------> ROS2/BehaviorTree
            P2/P3 & complex
```

### Safety Router

优先级最高；不得依赖云端网络。

第一版直接加载：

- `config/lexicon_emergency.json`
- `config/lexicon_normal.json`

匹配策略：
- 对 interim transcript 进行增量匹配；
- 一旦 P0 命中立即发出事件；
- 对相同语音片段做去重，避免连续触发；
- P0 事件触发后进入短暂锁存状态；
- P0/P1 同时可异步镜像给后端日志/LLM，但不能阻塞本地控制。

## 标准控制事件

```json
{
  "schema_version": "0.1",
  "event_type": "control_command",
  "command_id": "uuid",
  "session_id": "uuid",
  "source": "voice_local_rule",
  "raw_text": "停下",
  "matched_word": "停下",
  "priority": "P0",
  "action": "emergency_stop",
  "owner": "both",
  "timestamp_ms": 0,
  "latency_ms": 0,
  "requires_ack": true
}
```

## Hardware Adapter V0

第一版必须实现两个 adapter：

1. `MockHardwareAdapter`
   - 默认启用；
   - 接到 emergency_stop 后，把 UI 中电机状态设为 LOCKED、刹车状态设为 ENGAGED；
   - 返回 ACK；
   - 用于手机端演示。

2. `WebSocketHardwareAdapter`
   - 向配置的 WSS/WS 控制网关发送同一 JSON；
   - 等待 ACK；
   - 为以后接电脑/树莓派/ESP32 网关预留。

**不要在 V0 猜测任何底层电机或刹车二进制协议。** 等底盘组提供真实串口/CAN 协议后，再新增 `SerialGatewayAdapter` / `CANGatewayAdapter`。

## 技术栈

优先选择能最快交付、最少依赖的方案：

- Frontend: Vite + React + TypeScript
- Styling: 简洁响应式 CSS（手机优先）
- PWA: manifest + service worker，可添加到手机桌面
- Local command matcher: TypeScript
- Voice:
  - V0 首选浏览器 Web Speech API（支持 interim results）
  - 必须提供文本输入和“模拟说话”按钮作为兼容回退
- Backend: FastAPI（先只提供复杂指令 / health / event log API）
- LLM Provider: 可插拔；无 API Key 时使用 MockPlanner，保证 Demo 永远可运行
- Transport: WebSocket 优先，HTTP 作为回退

## 关于“毫秒级”

V0 测量的是：**从浏览器产生 interim transcript 到本地规则层发出控制事件** 的耗时，不把 ASR 本身耗时伪装成毫秒级。

页面分别显示：
- `speech_to_text_delay`（若浏览器可测）
- `local_match_latency_ms`
- `adapter_ack_latency_ms`

目标：
- 本地词库匹配和事件生成通常 < 20 ms；
- Demo 不承诺浏览器 ASR 的端到端硬实时。
- 真机阶段，P0 将迁移到本地 ASR/KWS + 边缘控制节点。

## API/接口

### POST /api/intent
输入固定文本 JSON：

```json
{
  "session_id": "demo",
  "raw_text": "把水杯拿过来",
  "timestamp": 0,
  "turn_id": 1,
  "abnormal_flag": false
}
```

输出结构化计划。

### WS /ws/events

用于网页与后端事件同步。

### GET /health

健康检查。

## 安全规则

- P0 不得调用 LLM 后才执行。
- P0 不得因为网络断开而失效。
- LLM 输出不得直接形成 PWM、关节角、电机占空比等底层控制。
- 真实硬件联调前必须保留物理急停。
- V0 中真实硬件 adapter 默认关闭。
- UI 必须明确显示当前是 SIMULATION 还是 HARDWARE。

## 验收标准

1. 手机浏览器可打开并适配竖屏。
2. 可以用语音或文本输入体验。
3. “停 / 停下 / 停车 / 别动 / 刹车 / 急停”等命令命中 P0。
4. P0 在本地路由，不请求 LLM。
5. 页面显示标准控制 JSON 和毫秒级本地匹配耗时。
6. MockHardwareAdapter 能展示“电机锁止 + 刹车执行 + ACK”。
7. 复杂指令通过 FastAPI 返回结构化任务；无 API Key 也可使用 MockPlanner。
8. 所有主要规则有自动化测试。
9. README 给出本地运行、手机访问和部署说明。
10. 不把模拟执行描述为真实硬件已执行。

## 后续升级

V1：
- sherpa-onnx / Vosk 本地流式 ASR 或关键词检测；
- 云端 LLM Function Calling；
- LiteLLM 多模型网关；
- session/turn_id 多轮对话；
- WSS 本地硬件网关。

V2：
- ROS 2 node；
- BehaviorTree；
- Nav2 / MoveIt 接口；
- 真机控制协议；
- 延迟与安全评测。
