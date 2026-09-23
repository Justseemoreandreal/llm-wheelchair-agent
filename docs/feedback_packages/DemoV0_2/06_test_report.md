# 测试报告（本阶段重新执行）

| 验证 | 实际结果 |
| --- | --- |
| V0.1 baseline（开发前） | Frontend 46/46、Backend 12/12、build 成功 |
| `cd frontend; npm test` | 57 passed / 0 failed，13 test files |
| `cd frontend; npm run build` | TypeScript + Vite build 成功 |
| `cd backend; .\.venv\Scripts\python.exe -m pytest -q` | 22 passed / 0 failed，含真实模型与 WebSocket |
| `backend -m app.asr prepare-model` | 官方模型本地存在，准备成功 |
| `START_DEMO.bat` | 实际启动 FastAPI+React，自动端口 59512/56980，浏览器打开请求已发出；Enter 清理成功 |
| `GET /health`、`POST /api/intent` | HTTP 200；MockPlanner 水杯计划返回 |
| `/ws/asr` | TestClient 真实模型官方 WAV：partial/final 成功 |
| Edge 153 官方 WAV | 禁用两个 Web Speech 接口仍得到中文 partial/final；57 PCM 帧 |
| Edge 虚拟麦克风 | getUserMedia GRANTED、AudioWorklet、PCM 帧、WS ready；不等同真实人声 |
| `START_PHONE_DEMO.bat` | 实际生成 HTTPS URL、Token、二维码 |
| 临时 Tunnel | 公网 HTTPS `/health` PASS、WSS `/ws/asr` 57 partial + 中文 final PASS |
| `STOP_DEMO.bat` | 实际停止本项目 Server/Tunnel PID；临时 URL/Token 删除 |

覆盖新增：PCM 转换/帧、连续重采样、浏览器文件解码、WebSocket readiness/断线、ASR schema/生命周期/endpoint、partial→P0 且 Planner 离线、旧文字按钮回归。真实手机、物理麦克风和私人三段音频未由执行端操作。
