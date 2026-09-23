# 延迟数据与测量边界

本机 Windows 11 / Python 3.13 / sherpa-onnx CPU，对官方 0.wav（5,612 ms 音频）按 100 ms PCM 帧**高速**推送，模型预加载后经 FastAPI TestClient `/ws/asr` 测得：

| 量 | 数值 |
| --- | --- |
| 帧数 | 57 |
| 单帧 `server_decode_ms` min / mean / median / P95 / max | 0.446 / 20.750 / 0.903 / 71.730 / 572.409 ms |
| 首个非空 partial 出现时累计音频 | 800 ms |
| 首个非空 partial 对应的本机高速回放墙钟 | 791.888 ms |
| 全部音频高速解码墙钟（含本机 TestClient/WS 调度，不含模型预加载） | 1,405.281 ms |
| Edge 官方 WAV 页面示例：首 PCM 帧到首个非空 partial | 664 ms（另一次 107 ms；受模型热身/调度影响） |

这些数字**不是**真人发声到轮椅停止延迟。真实 ASR 延迟包含采集分帧、讲话内容长度、WebSocket 网络、模型推理、partial 出词时点；然后才有 SafetyRouter 本地匹配与模拟 Adapter ACK。手机经 Tunnel 的真实延迟和 P0 口令出词时间仍待真机实测。页面明确分开显示服务端解码、首帧至 partial、路由匹配和 ACK。
