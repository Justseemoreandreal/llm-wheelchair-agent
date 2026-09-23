# 环境与依赖

| 项目 | 实测值 |
| --- | --- |
| OS | Windows 11 家庭版中文版，10.0.26200 |
| Node / npm | 24.15.0 / 11.12.1 |
| Python | 3.13.0，`backend/.venv` |
| Edge | 153.0.4234.48（无头、虚拟麦克风） |
| React / Vite / TypeScript / Vitest | 18.3.1 / 6.4.3 / 5.7.3 / 4.1.11 |
| FastAPI / Uvicorn / pytest | 0.141.1 / 0.53.0 / 9.1.1 |
| sherpa-onnx / numpy | 1.13.8 / 2.5.3 |

依赖安装：`npm install`，`python -m venv .venv`，`pip install -r backend/requirements.txt`。模型通过 `cd backend; .\.venv\Scripts\python.exe -m app.asr prepare-model` 自动下载/复用缓存。启动器会自动执行这些步骤。`playwright-core` 仅为本地 Edge 验收工具，安装于被忽略的 `.runtime/edge-test/`，不是 Demo 运行依赖。
