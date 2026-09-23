# 当前实现链路

```text
真实浏览器 getUserMedia / 文件 decodeAudioData
  → AudioWorklet（不支持/加载失败时 ScriptProcessor）
  → StreamingResampler + PCMFrameEncoder（mono、PCM16、16 kHz）
  → WebSocket /ws/asr（HTTPS 页面为 WSS）
  → FastAPI ASRSession + 本机 sherpa-onnx 官方中文流式模型
  → asr_partial / 语音端点 asr_final / stop final
  → 浏览器 SafetyRouter → P0/P1 control_command
  → MockHardwareAdapter 或 /ws/control 模拟网关 → control_ack
```

复杂文本走 `POST /api/intent → MockPlanner`，后端不可用时 `FallbackPlanner`。Web Speech API 只在折叠诊断按钮下，主链路完全不引用它。手机模式使用一次性 Token、Cloudflare 临时 HTTPS/WSS Tunnel，ASR 仍在电脑运行。控制命令与模型输出严格分流，模型不产生 PWM/CAN/UART/原始关节角。
