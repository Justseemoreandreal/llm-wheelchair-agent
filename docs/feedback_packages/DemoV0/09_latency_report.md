# 延迟报告

## 采样范围

浏览器端以 **SIMULATION / MockHardwareAdapter** 模式，通过真实页面文字输入连续完成“停下”20 次。每次等待 ACK，再等待去重窗口外重发。运行环境为 Windows 11 + Headless Chrome；采样值是 UI 所显示的 `ControlCommand.latency_ms` 和 `ControlAck.ack_latency_ms`。

| 指标 | min | max | mean | median | P95 | 样本数 |
|---|---:|---:|---:|---:|---:|---:|
| local_match_latency_ms | 0.0 ms | 0.1 ms | 0.015 ms | 0.0 ms | 0.1 ms | 20 |
| mock_adapter_ack_latency_ms | 0.4 ms | 1.4 ms | 0.81 ms | 0.85 ms | 1.3 ms | 20 |

Local samples：`0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0, 0.1, 0, 0, 0, 0, 0.1, 0, 0, 0, 0`。

ACK samples：`0.9, 1.2, 1.0, 0.9, 0.8, 0.7, 0.9, 0.4, 0.6, 0.9, 0.7, 0.5, 0.8, 0.9, 0.5, 0.5, 1.4, 0.9, 1.3, 0.4`。

## 必须避免的误读

这些数字从浏览器已经拥有文本开始，不包括：麦克风采集、浏览器/云端 ASR 识别、interim transcript 何时产生、网络抖动（SIMULATION 采样没有网络）、WebSocket 网关排队、真实硬件通信、驱动器反应、电机/制动器机械动作。因此它们只能说明**本地规则匹配和 mock ACK 段**的开销很小，不能宣传为“语音急停端到端毫秒级”。真实硬件阶段必须单独进行端到端、失效模式和最坏情况延迟测试。
