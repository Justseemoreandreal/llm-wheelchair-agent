# 环境与运行命令

## 实测环境

| 项目 | 值 |
|---|---|
| OS | Microsoft Windows 11 家庭版中文版 10.0.26200，64 位 |
| 时间 | 2026-09-21T16:11:34+08:00 |
| Node.js | v24.15.0 |
| npm | 11.12.1 |
| 系统 Python | 3.13.0 |
| 后端虚拟环境 | Python 3.13.0 |
| FastAPI | 0.141.1 |
| Uvicorn | 0.53.0 |
| Pydantic | 2.13.5 |
| pytest | 9.1.1 |
| httpx | 0.28.1 |

前端实际安装版本：React/React DOM 18.3.1、TypeScript 5.7.3、Vite 6.4.3、Vitest 4.1.11、`@vitejs/plugin-react` 4.7.0。

## 实际执行的命令

```powershell
# frontend
cd frontend
npm test
npm run build
npm run dev -- --host 0.0.0.0

# backend
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

后端启动后已实际请求 `GET /health`、`POST /api/intent`，并以浏览器 Network Gateway 与 PowerShell WebSocket 客户端验证 `/ws/control`。为验证离线路径，FastAPI 随后被主动停止；因此它在报告完成时不应被理解为持续运行中的服务。

前端未配置 `lint` 独立 script；`npm run build` 的 `tsc -b && vite build` 已作为类型与构建检查执行。
