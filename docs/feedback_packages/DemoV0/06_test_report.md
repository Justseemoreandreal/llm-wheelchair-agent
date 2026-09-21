# 重新执行测试报告

验收日期：2026-09-21。以下为本阶段重新执行，而不是引用历史结果。

| 类别 | 命令 / 方法 | 结果 |
|---|---|---|
| 前端单元/集成 | `frontend: npm test` | **6 文件，39 passed，0 failed** |
| 前端类型/生产构建 | `frontend: npm run build` | **PASS**；`tsc -b` + Vite 6.4.3 成功 |
| 后端 pytest | `backend: .\.venv\Scripts\python.exe -m pytest -q` | **4 passed，0 failed** |
| 后端健康检查 | `GET http://127.0.0.1:8000/health` | **PASS**；`status=ok, planner=mock, control_gateway=simulated` |
| 后端 Planner | `POST /api/intent` | **PASS**；水杯、上下文、电量、状态均返回 mock intent |
| WebSocket 网关 | 浏览器 Network Gateway + `/ws/control` | **PASS**；P0 ACK 返回锁止状态 |
| 在线浏览器 smoke | `node frontend/scripts/browser-smoke.mjs online` | **PASS**；停下、刹车、前进、后端 Planner、Network Gateway |
| 离线浏览器 smoke | 停止 FastAPI 后执行 `... offline` | **PASS**；offline P0、fallback planner |
| lint | 无对应 npm script | **未执行（不存在）** |

前端 39 项覆盖路由、P0/去重/latch、P0 bypass Planner、Mock/WebSocket adapter、FallbackPlanner、speech 生命周期和 Demo acceptance。后端 4 项覆盖 health、intent、P0 WebSocket 及非法 schema 拒绝。

`npm run` 在仓库根目录不可运行，因为根目录没有 `package.json`；这不是前端测试失败，实际命令在 `frontend/` 目录中执行。
