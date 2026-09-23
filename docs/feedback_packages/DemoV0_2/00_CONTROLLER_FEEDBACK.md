# Demo V0.2 总控反馈

## A. 阶段状态

V0.2 本地中文流式 ASR 软件链路已实现并通过自动与桌面/网络实测；尚不能声明真实手机语音验收通过。当前分支 `demo/mobile-voice-v0.2-local-asr`，基线 commit `717914bd22676412f457e76632e4a4044797aa48`。本包与代码同批提交、推送；不合并 main。

## B. 实际完成

默认语音路径现为 `getUserMedia → AudioWorklet（不可用时 ScriptProcessor）→ 连续重采样 → PCM16/mono/16 kHz → /ws/asr → sherpa-onnx → partial/final → SafetyRouter`。Web Speech API 仅留在折叠的诊断对比区。可选择本地 WAV/MP3/M4A 文件，浏览器 `decodeAudioData` 后进入与麦克风相同的 PCM 帧编码器和 WebSocket 协议。页面新增权限、采集状态、采样率、RMS、帧/字节、WebSocket、模型、partial/final、错误与时间诊断。`START_DEMO.bat` 和 `START_PHONE_DEMO.bat` 先准备固定模型，再分别启动本地服务或临时 HTTPS/WSS Tunnel；`STOP_DEMO.bat` 仍仅清理本项目进程。

模型为官方 `sherpa-onnx-streaming-zipformer-small-ctc-zh-2025-04-01`，`sherpa-onnx==1.13.8`。从 [sherpa 官方模型文档](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/online-ctc/zipformer-ctc-models.html) 所列 GitHub Release 自动下载至 Git 忽略的 `.runtime/models/`。实际下载包 87,170,593 bytes，`model.onnx` 91,497,053 bytes。官方 `test_wavs/0.wav` 的文档预期与本机实际最终识别均为“对我做了介绍那么我想说的是呢大家如果对我的研究感兴趣呢”；非用户录音。

## C. 验证结果

前端 `npm test`：57 passed / 0 failed（13 文件）；`npm run build` 成功。后端 `pytest -q`：22 passed / 0 failed，包含官方模型真实解码与真实 `/ws/asr` 集成。桌面 `START_DEMO.bat` 实际启动，`GET /health`、`POST /api/intent`、模型状态成功；按 Enter 退出。Edge 153.0.4234.48 无头浏览器中，明确禁用 `SpeechRecognition` 和 `webkitSpeechRecognition`，官方 WAV 仍经页面产生中文 partial/final；虚拟麦克风经 `getUserMedia + AudioWorklet` 发送 16 kHz PCM，诊断显示 ACTIVE 与帧计数。此为真实 Edge 软件栈，但不是人对物理麦克风说话。

`START_PHONE_DEMO.bat` 实际生成临时 HTTPS URL、Token、二维码；经公网 HTTPS `/health` 和 WSS `/ws/asr` 发送官方 WAV，收到 57 个 partial 事件与中文 final。`STOP_DEMO.bat` 实际停止记录的 Tunnel/Server PID 并删除临时 URL/Token。没有操作用户手机，故 **REAL PHONE LIVE ASR: USER TEST REQUIRED**；HarmonyOS 也未实测。没有把私人三段录音加入仓库。

## D. 安全链路与 Mock 边界

`asr_partial` 命中 P0 会立刻进入浏览器 SafetyRouter，再由现有模拟 Adapter 获得 ACK；不等待 final、Planner 或 LLM。自动测试以 Planner 抛错模拟离线，`停下` 仍得到 `P0` 和 `MOTOR=LOCKED;BRAKE=ENGAGED`。浏览器对一个识别语段仅派发一次 P0 partial，旧版 SafetyRouter 重复抑制与锁存、服务端 P0 latch 及显式 reset 均保留。若整个 Backend 关闭，**新的本地 ASR 无法运行**；文字/按钮在 `SIMULATION` 模式的 P0 仍能运行。手机 `NETWORK GATEWAY` 模式的 ACK 与闩锁依赖 Backend，不能宣传为后端离线仍可实际控制。

模型解码是真实本机推理；控制器、锁止/刹车状态和 ACK 仍是模拟。复杂指令仍为 FastAPI `MockPlanner` 或浏览器 `FallbackPlanner`。没有云端 LLM、真实电机/刹车、CAN/UART/ROS2 或机械臂控制；真实硬件阶段必须保留独立物理急停。

## E. 延迟及解释

官方 0.wav 长 5,612 ms，预加载模型后通过测试网关连续高速送入 57 个 100 ms 帧：每帧服务端接收+解码耗时 min 0.446、mean 20.750、median 0.903、P95 71.730、max 572.409 ms；首个非空 partial 在已送达 800 ms 音频时出现，对应此加速回放的墙钟 791.888 ms。Edge 文件回放曾显示首帧至首个非空 partial 664 ms。以上**不是**真实说话至急停的端到端延迟；录音文件是尽快送入，不按真实时间播放。SafetyRouter 的匹配毫秒数另显示，未混同 ASR/网络耗时。

## F. 未完成与风险

最重要的验收空白：真实 Edge 物理麦克风说“停下”、真实华为/HarmonyOS 手机、三段私人录音的 WAV/M4A/MP3 结果均需用户现场测试。合成 ASR partial→P0 有自动证明，但没有公开“停下”录音用于模型到 P0 的完整语音回归。M4A/MP3 能否由具体手机浏览器解码尚未验证。某些浏览器仅能走已实现但未在 HarmonyOS 实测的 ScriptProcessor fallback。冷模型加载可能耗时数秒；模型首帧处理与文件上传峰值需在目标电脑上观察。临时 Cloudflare Tunnel 转发音频到电脑，虽不使用云端 ASR/LLM，仍是第三方网络路径，需告知参与演示者。

## G. 下一阶段候选与总控决策

候选而非代替总控决定：A. 用户真实手机/三段录音验收并反馈截图和导出 JSON；B. 针对实测误识别选择词库/模型或音频前处理修正；C. 完成长期 HTTPS 部署与访问控制；D. 另阶段再评估云端 LLM；E. 收到真实底盘协议与硬件安全方案后才做硬件 Gateway。当前最先需要的是用户的真机验收结果、浏览器/系统版本、三段本地录音在页面的 partial/final 和诊断；无需将录音提交 Git。是否开启下一阶段由总控决定。
