# 技术债务与安全边界

- `ScriptProcessorNode` 为浏览器兼容回退，API 已过时；HarmonyOS 是否采用/稳定尚未知，后续按实测选择更可靠兼容层。
- 前端文件解码依赖浏览器本地编解码器。WAV 已在 Edge 验证，M4A/MP3 和私人录音尚需现场回归。
- 文件上传目前快速发送 PCM，长录音可能造成浏览器 WebSocket 缓冲与后端排队；下一轮根据实际录音长度考虑背压、取消与分块节流。
- 模型包固定名称与 sherpa Python 版本，但未配置官方 SHA256 校验；HTTPS 与 tar `filter=data` 提供基本防护，若进入长期部署，应建立可验证的模型制品哈希与供应链记录。
- V0.1 的 MockHardwareAdapter、模拟网关、MockPlanner、FallbackPlanner 仍为演示实现，不得称真实轮椅执行或真实云端 LLM。
- ASR 与控制是两个 WebSocket；手机语音 P0 在 Backend/网络完全断开时无法由新 ASR 触发。文字/按钮的本地模拟 P0 与此不同；真实硬件必须另设物理急停及离线安全机制。
- 模型首帧推理有抖动；短口令、复杂语句、不同麦克风/噪音条件尚无真机准确率与延迟统计。没有对三段私人录音形成自动回归，因为它们不应入 Git。
