# Demo V0 阶段总控反馈

## A. 当前阶段状态

Demo V0 已通过**模拟软件 Demo**验收：本地安全路由、网页控制、Mock adapter、规划和 WebSocket 模拟网关均可运行。它不具备真实轮椅上车条件，也不构成安全认证。本包在冻结提交 `8fd8f0f` 上复测；本阶段没有增加产品功能或重构。

## B. Git 状态

冻结分支为 `demo/mobile-voice-v0`，HEAD 为 `8fd8f0fdd9a735980abddbf49abc4f71e58681bc`（`feat: complete mobile voice safety demo`）。冻结前工作区 clean，与 `origin/demo/mobile-voice-v0` ahead/behind 均为 0；未修改或合并 `main`。反馈包会以独立 docs commit 提交到同一分支。

## C. 已完成内容

React/Vite/TypeScript 页面提供手机优先界面、文字输入、快速按钮、JSON、时间线，并标明模拟模式。Web Speech 设置 `zh-CN`、interim/continuous，并处理权限、重复 start 和结束重启。SafetyRouter 支持 P0、去重和短时锁存；复杂语言经 MockPlanner 或 FallbackPlanner。`/ws/control` 返回 simulated ACK。

## D. 未完成内容

没有真实底盘、物理刹车/急停、CAN/串口、真实 LLM、离线 ASR 或机械臂。`hardware_estop` 只生成软件事件；所有控制和规划均为模拟。未做真机、真麦克风验收。

## E. 测试结果

2026-09-21 重新运行：`frontend/npm test` 6 文件、**39/39 passed**；`frontend/npm run build` 成功（含 `tsc -b`）；`backend/.venv/Scripts/python.exe -m pytest -q` **4/4 passed**。实际启动 FastAPI 后，`GET /health`、`POST /api/intent` 和 `/ws/control` 均通过；浏览器 online smoke 和停止 FastAPI 后的 offline smoke 也通过。没有 lint script，故无 lint 结果。

## F. P0 安全链路验证

实际链路是 `文字/Browser ASR transcript → 本地 SafetyRouter → ControlCommand → MockHardwareAdapter 或 WebSocketHardwareAdapter → simulated ACK`。停、停止、停下、停车、别动、刹车、急停、马上停、立刻停下、救命十条实测均为 P0，均得到 `MOTOR=LOCKED;BRAKE=ENGAGED`。连续“停下”三次仅生成 1 个 P0 和 1 个 ACK；“停下”后立即“前进”不生成 forward。停止 FastAPI 后 P0 浏览器 smoke 仍 PASS，且 Planner spy 单测证明未调用。因此 P0 不依赖网络、FastAPI 或 LLM；但它依赖浏览器已生成 transcript，绝不能替代物理急停。

## G. 手机 / 语音验证

电脑地址为 `http://localhost:5173/`；本次局域网候选为 `http://10.83.168.235:5173/` 与 `http://172.21.240.1:5173/`（IP 非固定）。Headless Chrome 验证了页面和两种模式。**未进行真实手机或真实麦克风测试。**标准/webkit Web Speech 的生命周期有单测，但不能称 Chrome、Edge、Android 或 iOS 已通过。局域网 HTTP 可演示按钮；手机麦克风通常需要 HTTPS。

## H. 性能数据

Headless Chrome、SIMULATION / Mock adapter 下，对“停下”20 次 UI 实测：本地匹配 min 0.0、max 0.1、mean 0.015、median 0.0、P95 0.1 ms；Mock ACK min 0.4、max 1.4、mean 0.81、median 0.85、P95 1.3 ms。这些从 ASR 已给出文本开始，不包含 ASR、Wi-Fi、真实网关、驱动或机械制动时间，不能宣传为语音急停端到端延迟。

## I. 当前 Mock 与真实实现边界

页面、本地路由、规范 JSON、HTTP/WS 客户端和浏览器 API 集成是真实软件；Mock adapter、Mock/FallbackPlanner 和 SimulatedController 是模拟。没有 LLM 到 PWM、CAN、关节角或底层驱动的路径，也没有猜测任何硬件协议。

## J. Critical / High 问题

Critical 为 0。High 为 2：H-01 缺少独立物理急停和真实执行链；H-02 `/ws/control` 没有认证、TLS/信任边界和服务端 P0 latch，直接网络客户端可绕开浏览器 latch 发送 P2。二者不阻塞模拟演示，均阻塞真实硬件接入。

## K. Medium / Low 问题

Medium：无真机/ASR 验证，控制器与 Planner 均为 Mock，WebSocket 无重连/排序/心跳，内存状态重启即丢失。Low：无 lint、词库双副本、基础 service worker、fallback 诊断不足。见 `10_problem_list.md`。

## L. 技术债务

Demo 为快速可演示采用关键词规划、内存状态、单命令 WebSocket 和浏览器时间。真实阶段须在可信网关/硬件强化安全状态机、认证、监控、审计、状态恢复和 HIL 测试；P0 永远不能回到 LLM/网络等待路径。详见 `11_technical_debt.md`。

## M. 下一阶段可选路线

可选 HTTPS 真机部署、云端 LLM、本地 ASR、受保护硬件网关、ROS2 或真机兼容验收；目的、依赖、风险与增量价值见 `12_next_options.md`。本包不替总控选择。

## N. 当前需要用户提供的外部资源

真实阶段须由底盘组提供正式协议、独立物理急停/安全状态机、测试台架与验收人；手机路线需真实设备和 HTTPS 托管资源；云端或本地 ASR/ROS2 路线各需其账户、模型/算力或接口定义。不得以缺少 PPT/DOCX 改写当前冻结 Demo。

## O. 总控需要做出的决策

请决定先做 HTTPS 手机、ASR/LLM 还是受保护硬件网关；确认硬件安全责任边界和验收人；决定是否允许云服务，并提供底盘接口和测试条件。未获得这些决策和资源前，模拟 ACK 绝不能被解释为物理动作。
