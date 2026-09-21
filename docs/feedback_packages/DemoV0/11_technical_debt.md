# 技术债务

| 类别 | 当前 Demo 选择 | 后续必须处理 |
|---|---|---|
| Planner | 后端 MockPlanner + 前端关键词 FallbackPlanner | 引入受控 NLU/LLM、上下文、安全确认与可观测性；保持 P0 脱离该路径 |
| 硬件 | Mock adapter / in-memory simulated controller | 只在获得正式协议后实现 Serial/CAN/ROS2 adapter，并完成 HIL 测试 |
| 安全状态 | 前端 1.8 s P0 latch | 在可信网关/硬件实现持久、可审计、不可被浏览器绕过的状态机 |
| 传输 | 每 command 新建 WebSocket，1.5 s timeout | 设计身份、加密、长连、顺序、重连、watchdog、重放防护 |
| ASR | Web Speech API | 真机兼容矩阵、错误遥测、离线/本地 ASR 候选与 ASR 延迟测试 |
| 状态 | 后端内存 deque，重启丢失 | 安全默认态、审计日志、重启恢复与状态所有权 |
| 离线 | service worker 基础 fetch/cache | 缓存版本、更新、离线资源与 PWA 安全测试 |
| 配置 | 词库有根目录与前端副本 | 建立单一源或受测试约束的生成同步流程 |
| 质量门禁 | test/build 存在，无 lint | 加入 lint/format/type/test CI 与跨浏览器测试 |

其中第一至四项是接触真实硬件前必须清偿的安全债务。P0 不能因以后引入 LLM、网络、云端或任务规划而退回到等待路径。
