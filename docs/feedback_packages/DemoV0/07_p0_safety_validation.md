# P0 安全链路验证

## 结论

**PASS（模拟软件范围）**。P0 通过本地 `SafetyRouter → Adapter → ACK` 路径执行；后端/Planner 关闭时仍可工作。它不是物理急停实现。

## 10 条实际浏览器复测（SIMULATION）

| 指令 | 命中词 | Priority | Action | 本地匹配 ms | ACK | 模拟状态 |
|---|---|---|---|---:|---|---|
| 停 | 停 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 停止 | 停止 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 停下 | 停下 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 停车 | 停车 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 别动 | 别动 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 刹车 | 刹车 | P0 | brake_now | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 急停 | 急停 | P0 | hardware_estop | 0.1 | SUCCESS | LOCKED / ENGAGED |
| 马上停 | 马上停 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 立刻停下 | 立刻停下 | P0 | immediate_stop | 0.0 | SUCCESS | LOCKED / ENGAGED |
| 救命 | 救命 | P0 | stop_and_help_call | 0.0 | SUCCESS | LOCKED / ENGAGED |

每条都由 `source=ui_test` 进入相同本地路由；表中的 adapter 为 `MockHardwareAdapter`。`/ws/control` Network Gateway 模式另行实际通过，返回 `MOTOR=LOCKED;BRAKE=ENGAGED` simulated ACK。

## 防抖、锁存、Planner bypass

| 检查 | 实际结果 |
|---|---|
| `停下` × 3（短间隔） | 新增 P0 事件 1，新 ACK 1；没有连续重复发命令 |
| `停下` 后立即 `前进` | forward 事件 0；最终仍为 `MOTOR=LOCKED;BRAKE=ENGAGED` |
| P0 bypass Planner | 前端单测使用 Planner spy，断言未调用；后端关闭后浏览器离线 P0 smoke PASS |
| 后端关闭 | SIMULATION 模式 `停下` 仍得到 SUCCESS / LOCKED / ENGAGED |

## 安全问题回答

1. P0 是否依赖网络？**SIMULATION 模式不依赖**；Network Gateway 模式会依赖网络，但那是用户显式选择的模拟模式。
2. P0 是否依赖 LLM？**不依赖。**
3. P0 是否依赖 FastAPI Planner？**不依赖。**
4. 后端完全关闭后仍能工作？**是，实际 offline smoke PASS。**
5. LLM 能直接生成 PWM/CAN/占空比/关节角吗？**当前没有此路径。**
6. Mock 会伪装成真实物理执行吗？**UI 与 ACK 都明确说明 simulated/no physical hardware；仍需保持此提示。**
7. 是否显示 SIMULATION？**是。**
8. 真硬件阶段还需要物理急停吗？**必须需要；当前未实现。**
9. 明显失效路径？浏览器 ASR 未产生文本、网页/浏览器崩溃、或选择网络模式且网关不可达都不会被本 Demo 的软件 P0 覆盖；这正是必须保留独立物理急停的原因。
