# 手机与语音验证

## 访问地址

本次 Vite 实际输出：

- 电脑：`http://localhost:5173/`
- 局域网候选：`http://10.83.168.235:5173/`、`http://172.21.240.1:5173/`

地址受本机网卡/防火墙/路由影响，不能把本次 IP 当作固定部署地址。前端默认从当前页面 hostname 推导 API 和 WS 目标；也可用 `VITE_API_BASE_URL`、`VITE_CONTROL_WS_URL` 指定 HTTPS/WSS 服务。

## 实际验收状态

| 项目 | 状态 | 说明 |
|---|---|---|
| 页面、按钮、模式、JSON、时间线 | 已验证 | Headless Chrome 的在线/离线 smoke |
| 窄屏响应式外观 | 代码检查/桌面页面检查 | **未在真实手机竖屏设备验证** |
| 按钮触控尺寸 | 代码存在；未实机 | **未验证** |
| JSON 溢出 | 页面/样式存在；未实机 | **未验证** |
| Android Chrome Web Speech | 理论兼容/未测试 | 不能称已验证 |
| Chrome Desktop 实际麦克风 | 未测试 | Headless 验收未使用麦克风 |
| Edge 实际麦克风 | 未测试 | Chromium 兼容不能代替实测 |
| iOS Safari 实际麦克风 | 未测试 | 不能基于 webkit 前缀作通过结论 |

## 语音实现与行为

实现优先使用 `window.SpeechRecognition`，其次 `window.webkitSpeechRecognition`；设置 `lang=zh-CN`、`interimResults=true`、`continuous=true`。在测试覆盖范围内：不支持时 UI 显示 `ERROR: UNSUPPORTED`；`not-allowed`、`service-not-allowed`、`audio-capture` 显示错误并停止期望重启；重复 start 由 `active/starting` 守卫；非预期 `onend` 时显示 `RESTARTING` 并在 microtask 重启。

上述是代码和单元测试结论，不代表浏览器厂商、权限策略、蓝牙麦克风、网络 ASR 或真机行为已经验收。局域网 HTTP 可用文字/按钮；手机浏览器常要求 HTTPS secure context 才授予麦克风。
