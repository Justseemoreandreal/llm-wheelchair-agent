# 浏览器、手机与语音验收边界

| 环境 | 证据 | 状态 |
| --- | --- | --- |
| Edge 153 桌面，官方 WAV | Playwright 驱动实际 Edge 二进制，禁用 Web Speech，文件解码→WSS/WS→中文 partial/final | PASS（文件模式） |
| Edge 153 桌面，虚拟麦克风 | `getUserMedia` 授权、48 kHz AudioContext、AudioWorklet、PCM16 帧送至 ASR | PASS（虚拟设备；非真人语音） |
| Edge 真实麦克风说“停下” | 执行端未获取真人语音样本 | USER TEST REQUIRED |
| Android Chrome / 华为 HarmonyOS | 无用户真机可操作 | USER TEST REQUIRED |
| 手机 HTTPS/WSS 网络 | Tunnel URL、二维码、一次性 Token、远端 HTTPS health 与 WSS 官方 WAV | PASS（网络通路；非真机） |
| 用户三段私人 WAV/M4A/MP3 | 网页文件选择已准备，未读取私人录音 | USER TEST REQUIRED |

建议用户扫码后观察：权限是否 GRANTED、getUserMedia 是否 ACTIVE、音量 RMS 是否随说话变化、帧/字节数是否增长、ASR WS/model 是否 ready、partial/final 与 P0/ACK 是否出现；若失败导出页面摘要并截诊断面板。手机与电脑不必同一局域网，但 Tunnel 运行期间电脑需保持联网。真实手机状态必须写为 **REAL PHONE LIVE ASR: USER TEST REQUIRED**。
