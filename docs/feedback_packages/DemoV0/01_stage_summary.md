# Demo V0 阶段摘要

状态：**模拟 Demo 验收通过，禁止作为真实轮椅控制系统使用。**

本阶段复测了已有 Demo V0，而未增加功能或重构。可运行范围如下：

- React/Vite 手机优先 UI；文字输入、快速按钮、模拟控制模式和网络模拟网关模式。
- 浏览器本地 SafetyRouter：P0 紧急词命中、去重、P0 短时锁存、规范 `control_command` JSON。
- MockHardwareAdapter 与 FastAPI `/ws/control` simulated controller 的 ACK。
- FastAPI `/health`、`/api/intent` MockPlanner 与浏览器 FallbackPlanner。
- Web Speech 包装逻辑和离线快速按钮演示。

验收边界：真实 ASR/麦克风、真实手机、真实硬件、真实 LLM、物理急停和底盘协议均未验证或未实现。详情以 `00_CONTROLLER_FEEDBACK.md` 为准。
