# 转 Astra 的后端契约请求（Fable，2026-09-09）

| 编号 | 请求 | 依据 |
|---|---|---|
| BE-1 | `GET /work-activity?days=N`：按日（UTC 日界）返回 recorded run 计数，供 Heatmap（G-1） | WK-37 / WK-46 |
| BE-2 | 多文档 tab 的 surface 状态（当前为单值 kind / runId / fileRef）（G-2） | WK-46 |
| BE-3 | "今日"口径的 work-summary 过滤字段与时区声明（G-3） | WK-46 |
| BE-4 | RC gap：B-1 `provenance[]` 含 MCP 服务器闸门；B-2 `catalog-only` characters 语义；B-4 `prompt_template` 不入 `context[]`；B-10 `mcp_effect_unknown` fixture 入口 | WK-50 |
| BE-5 | R2 Source Resolver：`runtime.resolve(source)` → ResolvedRuntimeArtifact（identity、provenance、portable、native[]、capabilities、requirements、trust、adapters） | WK-64 / 65 |
| BE-6 | R4 Runtime Proposal：`runtime.propose` → { source, target, operations[], effectiveDiff, permissions delta, contextImpact, trustImpact, persistence, rollback }；`runtime.apply(proposalId)` 走 CAS revision | WK-64 |
| BE-7 | R5 事务化 apply：fail-back 到 current 指针；proposal / apply / rollback 记录持久化并可 inspect；批准按包版本逐次留 DecisionReceipt，无"未来版本"批准 | WK-68 |
| BE-8 | R6 Expert 快照：composition generation（session-mount-once + version / hash + 重发现事件）；overlay（preference / requirement / policy 三类字段）；Save runtime… → Expert | WK-68 / 讨论转录 §8 |
| BE-9 | R3 兼容矩阵：adapter 按固定 commit 登记（DSH `c389f96`、Pi、OpenCode …），Native / Semantic / Lossy / Unsupported 四档，无静默降级 | WK-68 |
| BE-10 | `operation: 'profile'` 与 `'policy'` 的前端可用契约说明（RC B-8 / B-9） | WK-50 |
| BE-11 | Hooks / memory providers / registries / secrets / sandboxes 的资源 kind（现 Planned） | WK-63 |
| BE-12 | `provider-models` / `provider-config` 暴露模型的推理强度（effort / thinking）字段与可选值，供 composer 模型 chip 显示与设置 | WK-73 |
| BE-13 | MCP lifecycle：disconnect 后快照状态不回翻（RC verify `mcp-lifecycle` 反例；WK10a 复现 put 200 → connect 翻转、disconnect 不翻转），wire 侧待查 | WK-74 |

## WK10b 第二段回执（2026-09-08，Fable 转 Astra）

| 编号 | 请求 | 阻塞的前端 | 来源 |
|---|---|---|---|
| BE-14 | Decision 记录带 `decidedAt`（或独立 decision 事件），供回执行显示时间 | Chat Flow 决定回执行的时间列 | delivery-wk10b-2 §3.5 / 消融 R-8 |
| BE-15 | `GET /projects/:id/work` 返回 Matter `title` 与最近决定时间 | Continue existing 列表只显 id 短形 | delivery-wk10b-2 §3.6 / 消融 R-13 |
| BE-16 | `GET /runtime-info` 返回数据目录路径或稳定工作区标识（不含凭据） | Settings › General › Data 行；本设备偏好键 `cw:prefs:<id>` | delivery-wk12 §9 / §13 |

## 第四轮（2026-09-09，Fable 转 Astra）

| 编号 | 请求 | 阻塞的前端 | 来源 |
|---|---|---|---|
| BE-17 | 对未保存的连接表单执行 Fetch models（Base URL + credential → 模型列表），不持久化 | FE-02 Add provider 的 compatible / local 路径 | WK-91 |
| BE-18 | Test connection（不创建 Run 的最小握手），返回可显示的失败原因 | FE-02 | WK-91 |
| BE-19 | Memory adapter（Matter memory / Global memory，来源可披露、可关闭） | FE-03 Memory scope 与 Settings › Memory | WK-92 |
| BE-20 | Temporary chat（不读写持久 memory 的会话标记） | FE-03 | WK-92 |
