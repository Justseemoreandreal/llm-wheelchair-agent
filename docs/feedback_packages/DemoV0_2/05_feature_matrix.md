# 功能与真伪边界

| 功能 | 状态 | 类型 |
| --- | --- | --- |
| 浏览器 getUserMedia / AudioWorklet | 已实现；Edge 虚拟设备实测 | 真实浏览器 API |
| ScriptProcessor 兼容回退 | 已实现；HarmonyOS 未实测 | 真实浏览器 API |
| WAV 文件选择、浏览器解码、16 kHz PCM/WSS | 已实现；Edge 官方 WAV 实测 | 真实软件链路 |
| M4A/MP3 文件选择 | 已实现；目标设备解码未实测 | 浏览器能力依赖 |
| 本机中文 ASR / partial / final | 已实现，官方 WAV 实测 | 真实 sherpa-onnx 推理 |
| partial→P0 / SafetyRouter | 自动测试通过 | 真实本地安全逻辑 |
| Web Speech API | 可选诊断 | 非默认、不保证服务可用 |
| `/ws/control` / P0 latch / ACK | V0.1 保留 | 模拟控制网关 |
| MockPlanner / FallbackPlanner | V0.1 保留 | 模拟复杂规划 |
| HTTPS Tunnel、Token、二维码 | 已实际运行、HTTPS/WSS 验证 | 临时网络入口 |
| 实际轮椅电机/刹车 | 未实现 | 需硬件协议与物理急停 |
| 云端 LLM、ROS2、CAN/UART、机械臂 | 未实现 | 不属于 V0.2 |
