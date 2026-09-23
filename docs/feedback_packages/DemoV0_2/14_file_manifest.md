# 反馈包文件清单

| 文件 | 作用 | 生成 |
| --- | --- | --- |
| `00_CONTROLLER_FEEDBACK.md` | 给总控的完整阶段反馈 | 成功 |
| `01_stage_summary.md` | 阶段状态和完成项 | 成功 |
| `02_git_state.md` | 分支、基线与提交边界 | 成功 |
| `03_environment.md` | OS、运行时、依赖版本 | 成功 |
| `04_architecture_current.md` | 当前真实 ASR/模拟控制链路 | 成功 |
| `05_feature_matrix.md` | 真实/模拟/未完成边界 | 成功 |
| `06_test_report.md` | 自动与手动验收记录 | 成功 |
| `07_asr_validation.md` | 模型、下载、预期/实际转写 | 成功 |
| `08_mobile_voice_validation.md` | Edge、Tunnel、手机验收状态 | 成功 |
| `09_latency_report.md` | 解码时间与测量边界 | 成功 |
| `10_problem_list.md` | 风险和复现/处理建议 | 成功 |
| `11_technical_debt.md` | 临时方案和长期安全边界 | 成功 |
| `12_next_options.md` | 可选路线，交总控决策 | 成功 |
| `13_required_external_resources.md` | 真机及未来硬件所需资源 | 成功 |
| `14_file_manifest.md` | 本清单 | 成功 |
| `feedback_summary.json` | 机器可读摘要 | 成功 |

另有 `artifacts/feedback_packages/DemoV0_2_Feedback_Package.zip`，内容仅为上述 `docs/feedback_packages/DemoV0_2/` 目录，不含 `.runtime`、`node_modules`、`.venv`、源码或私人录音。
