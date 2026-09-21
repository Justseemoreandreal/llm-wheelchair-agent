# 当前实际架构

## P0 / 本地控制路径

```text
语音 interim/final transcript 或文字/快速按钮
  ↓  （真实浏览器输入/UI；真实设备 ASR 未验收）
SafetyRouter（真实本地 TypeScript 逻辑）
  ↓  ControlCommand JSON
CommandProcessor（真实本地逻辑；P0 不调用 Planner）
  ├─ SIMULATION → MockHardwareAdapter（模拟） → ControlAck（模拟）
  └─ NETWORK GATEWAY → WebSocketHardwareAdapter（真实 WS 客户端）
                         ↓
                       FastAPI /ws/control（模拟网关）
                         ↓
                       SimulatedController（内存模拟） → ControlAck（模拟）
```

P0 在浏览器本地匹配并经 Adapter 发送；它不在 LLM 或 `/api/intent` 的关键路径中。路由器在相同 priority/action 的 interim 增长片段上 900 ms 去重，并在 P0 后锁存 1.8 s，抑制非 P0 指令。

## 复杂语言路径

```text
复杂文本
  ↓
CommandProcessor
  ↓
PlannerClient（HTTP，2 s abort timeout）
  ├─ FastAPI POST /api/intent → MockPlanner（模拟任务计划）
  └─ 失败/超时 → FallbackPlanner（浏览器本地关键词模拟）
```

MockPlanner / FallbackPlanner 只输出 Demo 级高层 plan；没有输出 PWM、CAN、串口字节、关节角或刹车电流。

## 节点状态

| 节点 | 状态 |
|---|---|
| React 页面、文本控制、JSON/时间线 | 真实软件实现 |
| Web Speech API 调用 | 真实浏览器 API 集成；真实麦克风未验收 |
| SafetyRouter / CommandProcessor | 真实本地软件逻辑 |
| MockHardwareAdapter | 模拟 |
| WebSocketHardwareAdapter | 真实客户端实现，目标是模拟网关 |
| FastAPI /health、/api/intent、/ws/control | 真实服务实现，Planner/Controller 为模拟 |
| SimulatedController | 内存模拟，不连接任何物理设备 |
| 真实底盘、急停、CAN/UART/ROS2 | 未实现 |
