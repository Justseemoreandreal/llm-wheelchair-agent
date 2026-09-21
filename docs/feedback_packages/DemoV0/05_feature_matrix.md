# 功能矩阵：真实与模拟边界

| 功能 | 状态 | 实现类型 | 验收证据 |
|---|---|---|---|
| 文字输入/快速按钮 | 已实现 | 真实前端 UI | Headless Chrome 实测 |
| 手机优先 CSS | 已实现 | 真实前端代码 | 桌面 Headless 页面检查；无真机验证 |
| 语音 API 包装 | 已实现 | 真实浏览器 API 集成 | 单测；无真实麦克风验证 |
| interim transcript 路由 | 已实现 | 真实本地代码 | speech/router 单测 |
| SafetyRouter P0 | 已实现 | 真实本地代码 | 10 条命令浏览器实测 |
| 去重与 P0 latch | 已实现 | 真实本地代码 | 浏览器实测 + 单测 |
| P0 JSON | 已实现 | 真实软件逻辑 | 规范 JSON 与 WS 验证 |
| MockHardwareAdapter | 已实现 | 模拟硬件 | 前端单测/浏览器实测 |
| WebSocket Gateway | 已实现 | 模拟控制网关 | backend 单测/浏览器 Network 模式 |
| `MOTOR=LOCKED;BRAKE=ENGAGED` | 已实现 | 模拟控制器状态 | P0 ACK 实测 |
| FastAPI `/health` | 已实现 | 真实 HTTP 服务 | 实际 GET 200 |
| FastAPI `/api/intent` | 已实现 | MockPlanner | 实际 POST/浏览器实测 |
| Frontend FallbackPlanner | 已实现 | 本地模拟规划 | 后端关闭后浏览器 smoke |
| 云端 LLM | 未实现 | 不使用 API key | 无 |
| 物理电机锁止 / 物理刹车 | 未实现 | 需硬件 | 无 |
| 独立物理急停 | 未实现 | 需硬件安全设计 | 无 |
| Serial/CAN/ROS2 Adapter | 未实现 | 等真实协议 | 无 |
| ROS2/Nav2/机械臂 | 未实现 | 下一阶段候选 | 无 |
