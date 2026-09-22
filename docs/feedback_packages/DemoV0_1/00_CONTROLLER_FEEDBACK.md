# Demo V0.1 Controller Feedback

## A. 当前阶段状态

Demo V0.1 的开发、自动测试与本机验收已完成，状态为 **PASS WITH USER PHONE TEST REQUIRED**。统一服务、Windows 一键启动、临时 HTTPS Tunnel、访问 Token、二维码、服务端 P0 锁存/复位和手机验收 UI 均已实现。未进入云端 LLM 或真实硬件阶段。

## B. Git 状态

- 分支：`demo/mobile-voice-v0.1`
- 实现提交：`b86ffbc`（完整 SHA 见 `02_git_state.md`）
- 未合并 `main`
- 反馈包与 ZIP 将以独立文档提交推送；远程 HEAD 以最终交付结果为准。

## C. 已完成内容

- `START_DEMO.bat`：准备依赖、构建 React、启动 8765 统一服务、健康检查、打开浏览器、Enter 清理。
- `START_PHONE_DEMO.bat`：在上述流程上下载/缓存官方 cloudflared、生成每次运行 Token、建立 Quick Tunnel、生成本地二维码、复制 HTTPS URL、退出清理。
- `STOP_DEMO.bat`：只按 `.runtime` 记录且经命令行路径校验的 PID 清理本项目进程。
- FastAPI 托管 React production build 和 SPA fallback；普通用户只需 `http://127.0.0.1:8765/`。
- HTTP/WebSocket 公网 Token 门禁，loopback 可免 Token。
- 模拟网关收到 P0 后进入 `MOTOR=LOCKED;BRAKE=ENGAGED`；P2 运动在显式复位前返回拒绝 ACK。
- 手机验收 UI 显示 Speech API 支持、状态、步骤、锁存/复位、Fallback，并可复制/导出 JSON。

## D. 自动与手工验收

- Frontend：9 个测试文件，46 passed / 0 failed；TypeScript + Vite production build 成功。
- Backend：12 passed / 0 failed。
- 本机 `.bat` 验收：三个入口均实际运行。
- Tunnel：实际获得 `https://*.trycloudflare.com`，带 Token 页面 200、缺 Token 401；退出后公网与本地 URL 均不可达。
- 公网 WSS 实测：P0 接受并锁止；随后前进拒绝；reset 后前进接受。
- 浏览器 UI 实测：P0、锁存拒绝、显式复位、复位后前进、Fallback 全部符合预期。

## E. 手机与语音边界

没有物理操作用户手机，也没有在真实 Android/iOS 设备上授予麦克风权限。因此结论严格为 **REAL PHONE: USER TEST REQUIRED**。Web Speech API 仍依赖浏览器实现与在线识别服务，代码兼容不等于真实设备通过。

## F. 安全结论

P0 本地路由不等待 Planner/LLM；服务端模拟网关另有独立锁存，直接 WebSocket 客户端也不能绕过。所有 UI 和 ACK 均声明模拟，不代表物理执行。没有 PWM、CAN、UART、ROS2 或真实底盘协议。未来硬件仍必须具备独立物理急停和可信硬件侧安全状态机。

## G. 当前 Mock / 真实边界

真实软件：Web Speech API wrapper、SafetyRouter、标准 JSON、FastAPI、WebSocket、Token gate、launcher 生命周期。模拟：MockPlanner、FallbackPlanner、MockHardwareAdapter、服务端控制器状态。未实现：物理电机/刹车、云端 LLM、真实底盘 Gateway、ROS2/Nav2、机械臂。

## H. 已知问题与技术债务

无 Critical。High：真实手机与真实移动浏览器麦克风尚待用户验收。Medium：Quick Tunnel 是临时公网能力且 Token 位于首个 URL；Web Speech 跨浏览器差异仍需实机矩阵；模拟控制器状态为进程内全局状态。Low：官方 latest cloudflared 通过 HTTPS 下载但未固定版本/校验哈希；首次下载较大且取决于网络。

## I. 总控后续可选路线

候选项仅供决策：先完成真实 Android/iOS 手机验收；固定/校验 cloudflared 版本；部署长期 HTTPS 静态/反向代理环境；接真实云端 LLM；接本地 ASR；取得真实底盘协议后实现硬件 Gateway。V0.1 不替总控选择路线。

## J. 当前外部依赖

本阶段仅需用户用真实手机扫描二维码并执行页面步骤。未来阶段才需要云端 LLM API Key、真实轮椅/ESP32/STM32、CAN/UART 定义、ROS2 Topic/Service，以及硬件安全评审。

## K. 总控需要决策

1. 是否先安排真实手机验收并回传导出的 JSON。
2. 是否要求固定 cloudflared 版本与发布校验。
3. 下一阶段选择部署、ASR、LLM 或真实硬件 Gateway；未获批准前项目停止在 V0.1。
