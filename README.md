# 智能轮椅语音安全控制 Demo V0

这是一个手机优先的可运行演示：语音、文字或测试按钮进入本地安全路由；P0 急停不等待 Backend 或 LLM，直接生成标准控制 JSON 并交给模拟控制器。复杂自然语言进入 FastAPI `MockPlanner`，Backend 离线时自动使用前端 `FallbackPlanner`。

> **安全声明：** 当前两个控制模式都是模拟控制器，不代表物理轮椅已经执行。软件语音停止不能替代独立物理急停。项目尚未包含 ESP32、STM32、CAN、UART 或 ROS 2 的真实底层协议。

## Windows PowerShell：直接运行

需要先安装 Git、Node.js 20 或更高版本、Python 3.11 或更高版本。

### Terminal 1：启动 Backend

在仓库根目录打开 PowerShell：

```powershell
git checkout demo/mobile-voice-v0
git pull
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

看到 `Uvicorn running on http://0.0.0.0:8000` 即成功。

### Terminal 2：启动 Frontend

再打开一个 PowerShell，回到仓库根目录：

```powershell
cd frontend
npm install
npm run dev
```

电脑访问：<http://localhost:5173/>

### 快速检查 Backend

另开 PowerShell：

```powershell
Invoke-RestMethod http://localhost:8000/health

$body = @{
  session_id = "demo"
  raw_text = "把水杯拿过来"
  timestamp = 0
  turn_id = 1
  abnormal_flag = $false
} | ConvertTo-Json

Invoke-RestMethod http://localhost:8000/api/intent `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

## Bash：直接运行

Terminal 1：

```bash
git checkout demo/mobile-voice-v0
git pull
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Terminal 2：

```bash
cd frontend
npm install
npm run dev
```

## 手机访问

1. 确保电脑和手机连接同一个局域网。
2. Backend 与 Frontend 都使用上面的 `0.0.0.0` 方式启动。
3. Windows PowerShell 运行 `ipconfig`，找到 WLAN 的 IPv4 地址，例如 `192.168.1.25`。
4. 手机打开 `http://192.168.1.25:5173/`。
5. Windows 防火墙提示时，只允许可信的“专用网络”。

Frontend 默认自动使用当前网页 hostname 连接 `http://<电脑IP>:8000` 和 `ws://<电脑IP>:8000/ws/control`，没有写死 `localhost`。

手机浏览器通常只允许在 HTTPS 安全上下文中使用麦克风。普通局域网 HTTP 页面仍可使用文字输入和所有快速测试按钮；语音体验请使用下面的 HTTPS 静态部署。电脑上的 `localhost` 通常可以直接使用麦克风。

## 页面上的两种控制模式

- `SIMULATION / LOCAL MOCK`：默认模式，使用浏览器内 `MockHardwareAdapter`。
- `NETWORK GATEWAY`：使用 WebSocket 连接 FastAPI `/ws/control`。它仍是模拟网关，P0 ACK 会返回 `MOTOR=LOCKED;BRAKE=ENGAGED`。

无论哪种模式，P0 都先经过本地 `SafetyRouter`，不会等待 `/api/intent`。

## Backend 离线演示

关闭 Terminal 1 后：

- “停下”“刹车”等 P0 仍在 `SIMULATION / LOCAL MOCK` 模式正常执行；
- “把水杯拿过来”“还有多少电”“现在什么情况”会显示 `mock/fallback`；
- UI 不会把 fallback 伪装成真实云端 LLM。

## 环境变量

默认配置适合 localhost 和同局域网访问。需要指定远程 Backend 时，在 `frontend` 下复制示例：

```powershell
Copy-Item .env.example .env.local
```

然后编辑：

```dotenv
VITE_API_BASE_URL=https://api.example.com
VITE_CONTROL_WS_URL=wss://api.example.com/ws/control
```

修改后需要重启 `npm run dev` 或重新构建。

## HTTPS 静态部署（Netlify）

仓库根目录已包含 `netlify.toml`。在 Netlify 导入该 GitHub 仓库和 `demo/mobile-voice-v0` 分支后，它会使用：

- Base directory：`frontend`
- Build command：`npm run build`
- Publish directory：`dist`

即使没有部署 Backend，静态 HTTPS 页面也能用本地 P0 和明确标记的 `FallbackPlanner` 完整演示。若要启用 `NETWORK GATEWAY`，Backend 也必须提供 HTTPS/WSS 地址，并配置上面的两个环境变量；HTTPS 页面不能连接不安全的 HTTP/WS Backend。

## 自动测试与构建

Frontend：

```powershell
cd frontend
npm test
npm run build
```

Backend：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

测试覆盖 P0 路由、全部必需 P0 词、interim 去重、P0 锁存、P0 绕过 Planner、Mock Adapter、WebSocket Adapter、语音生命周期、Backend/Fallback Planner、`/health`、`/api/intent` 和 `/ws/control`。

## 核心数据流

```text
interim transcript
  -> Local SafetyRouter
  -> canonical control_command
  -> MockHardwareAdapter 或 WebSocketHardwareAdapter
  -> control_ack
```

复杂命令才进入：

```text
text
  -> FastAPI MockPlanner
  -> Backend 不可用时 FallbackPlanner (mock/fallback)
```

本页面的 `local_match_latency_ms` 只表示 ASR 已产生 interim transcript 后，到本地词库匹配并生成控制事件的耗时；它不包含浏览器 ASR 本身的延迟。

## 下一阶段接真实轮椅前需要

- 底盘控制组提供正式、版本化的 ESP32/STM32 接口；
- CAN ID、数据帧、字节序、频率、超时和故障码定义，或 UART 帧协议；
- ROS 2 Topic/Service/Action 定义（如果采用 ROS 2）；
- 真实 ACK、心跳、断线、安全锁存与恢复条件；
- 独立物理急停与受控场地安全测试流程。

拿到真实协议后，在控制网关后新增 `SerialGatewayAdapter`、`CANGatewayAdapter` 或 `ROS2Adapter`；不要让 LLM 输出 PWM、电机占空比、原始 CAN 帧或关节角。
