# ASR 模型与识别验收

- 固定模型：`sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01`，Python 包 `sherpa-onnx==1.13.8`。
- 下载：启动器执行 `python -m app.asr prepare-model`，从 [官方文档指定的 GitHub Release](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-ctc/zipformer-ctc-models.html) 下载并解压到被 Git 忽略的 `.runtime/models/`；首次下载显示进度，缓存时直接复用。归档 87,170,593 bytes；`model.onnx` 91,497,053 bytes。
- 官方 `test_wavs/0.wav`：单声道、16 kHz、PCM16、时长约 5.612 s。官方文档预期：“对我做了介绍那么我想说的是呢大家如果对我的研究感兴趣呢”。实际最终输出完全一致；真实模型自动集成测试断言全句相等。
- 官方 `test_wavs/1.wav`：实际最终输出“重点呢想谈三个问题首先呢就是这一轮全球金融动荡的表现”；WebSocket 集成测试检查 partial 与 final 中关键中文词。
- 语音端点检测启用；正常采集中可因静音端点产生 `asr_final` 并重置识别流，继续下一语段。点击停止/文件结束会先 `input_finished`，再产生 `is_session_end=true` 的 final。
- ASR partial 一旦包含 P0/P1 安全词就进入 SafetyRouter；复杂意图等待 final。相同语段内浏览器仅派发一次 P0 partial；旧去重与锁存继续生效。
- 模型真正运行的测试音频均为官方公开素材。没有读取、复制或提交用户私人录音；这些录音需由用户在网页本地选择。
