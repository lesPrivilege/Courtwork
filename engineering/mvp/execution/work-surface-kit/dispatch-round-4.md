# 第四轮派单（Fable，2026-09-09）

基线：Astra 合流后的清洁 `main` `1688a7b`（WK11 + `claude/fable-round4` 已入，208/208，见 [合流证据](../../../../evidence/wk11-main-integration-20260909/README.md)）。本 Fable 会话文档支 `claude/fable-round4b`（worktree `/private/tmp/se-fable-r4b`，只有文档），Astra 合流。

| 单 | 执行者 | 树 / 分支 / 端口 | 输入 | 交付 | 状态 |
|---|---|---|---|---|---|
| EX-WK9 材质来源 | Sonnet | 只读，无服务 | [EX-WK9](work-orders/EX-WK9-material-sources.md) | `explore/ex-wk9-material-sources.md` | 已派 |
| FE-01 词表 + IA + chrome + composition | Opus | `/private/tmp/se-agent-fe01` · `claude/fe01-vocab-ia` · 8885 · 数据 `/private/tmp/se-agent-fe01-data` | [WO-FE-round4 §FE-01](work-orders/WO-FE-round4.md)（含 WK-100 / WK-102 追加项） | `delivery-fe01.md` | 已派 |
| FE-02 → FE-03 → FE-04 | Opus | 各自从 FE-01 合流后的清洁 main 建树 | 同工单 | `delivery-fe0n.md` | 排队 |
| FE-05 材质与光效 | Opus | FE-04 合流后 | WO-FE-round4 §FE-05 + EX-WK9 | `delivery-fe05.md` | 待 EX-WK9 回执后由 Fable 填值 |

规则：Opus 单一 writer 串行；每单固定 SHA、消融表、text-sweep 增量、分配反例、五轮收敛表（WK-100）；作者验证与 Astra 独验分列；视觉四轴留用户。后端前置 BE-1/3、12、14…20 仍由 [backend-requests](backend-requests.md) 维护；FE-02 / FE-03 未交付能力不画可用按钮。
