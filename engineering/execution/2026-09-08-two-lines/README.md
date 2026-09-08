# 两条线：合流复验与发布面（Fable 架构与节奏，2026-09-08）

基线 `main` `e0d214d`；产品代码等价 `0a3b9b2`。承接 [主轮派单](../2026-09-08-main-round/README.md) 与 [G1–G5 完工条件](../2026-09-08-main-round/public-readiness.md)，不改其门，不另立状态账本；状态仍只在 [current](../../current.md)。

用户本轮指定：Fable 掌架构与节奏；Sonnet explore 溯源外部库与本地 diff；Astra 实施 harness Core 自研部分；Opus 绘制 GitHub Pages 前端并接前端必要入口；发布面文案以 Paper 叙事为权威，CourtWork 为实践与验证项目；每个局部优先成熟实践。

## 本轮产出

| 文件 | 内容 | 消费者 |
|---|---|---|
| [merge-recheck](merge-recheck.md) | `main` 在隔离树独立安装、146/146、8871 启动、静态准入、Home 目视 | Astra、Opus 的共同基线 |
| [harness-core](harness-core.md) | 复用与自研逐层清单、替换轴泄漏、必要自研边界、Astra 实施单 | Astra |
| [frontend-entries](frontend-entries.md) | G1–G3 所需前端入口、现有元素与契约依赖、Opus 编排指引 | Opus、Astra |
| [public-copy](../../release/2026-09-08/public-copy.md) | 双语文案、状态三档、声称→证据、局部成熟实践 | Opus，Astra 核对 |
| explore/[ex-a](explore/ex-a-upstream-surface.md)、[ex-b](explore/ex-b-frontend-entries-diff.md) | Sonnet 只读溯源：上游符号表面；本地 diff 与入口清单 | 上两份文档的来源 |

## 裁定

- **TL-1 基线唯一。** 两条线都从 `main` `e0d214d` 建隔离工作树；旧 `Courtwork-fresh`、`bcbca1b` 与其他历史树不再作为起点。Fable 文档在 `claude/fable-two-lines` 交付，由 Astra 合流。
- **TL-2 自研只落在四处。** 提交边界（Candidate → Decision → Committed）、证据与版本绑定、可信 Decision 与幂等、投影/合法动作契约。Run loop、provider 协议、MCP 传输、存储引擎、Markdown/净化/浮层继续复用；论证见 harness-core。
- **TL-3 前端入口按门裁定。** G1 只需现有 Connection / Model 设置面；G2 需要候选逐规则视图与三种合法动作（accept / return / request evidence）；G3 需要"在新 Session 里继续同一事项"与 producer 缺席时的只读历史。后两者的 UI 等 H1 / H3 契约，先画只读形态，不放假按钮。
- **TL-4 文案三档。** verified with synthetic data / runs locally / not yet；每条声称绑定证据路径；Paper 术语只在命题段，产品术语只在操作段。
- **TL-5 局部成熟实践先于自绘。** 每个页面局部与每个前端入口先指明成熟来源（reference-index 条目、现有组件或上游 SDK），再决定是否自绘；无来源者写明原因。
- **TL-6 顺序。** Opus 可立即开工 Pages P1–P3（取证、内容冻结、本地页面）与 WK10b 第一段；Astra 开 H0 契约与 H1 后端；H1 契约固定后 Opus 接 G2 / G3 入口；P4 发布接线待 G1–G3 证据。真实 provider 由用户在 GUI 配置，未发生前保持 not_run。

## 派单

| 单 | 执行者 | 开工条件 | 交付 |
|---|---|---|---|
| Pages P1–P3 + 根 README | Opus | 现在；消费 public-copy 与 Opus 交接 | 双语页面、媒体 manifest、本地预览、子路径检查 |
| WK10b 第一段 | Opus | 现在；沿既有工单 | 固定 SHA、消融表、未检项 |
| H0 契约与 fixture | Astra | 现在 | 固定输入、gold、hash、反例 |
| H1 后端（同 Matter 重绑定、逐规则 packet、历史归属） | Astra | H0 固定输入后 | 契约、反例测试、fixture |
| G2 / G3 前端入口 | Opus | H1 契约固定后；按 frontend-entries | 只读形态先行，合法动作随契约 |
| BE-5 服务接缝 | Astra | 与 H1 的 service 写入串行 | inspect 服务 |

## 用户裁定（2026-09-08，DEC-012）

1. 首屏：命题句 "Work that exists beyond the model." 作第一句论断，品牌句作字标副句。
2. 许可证：MIT，根目录 LICENSE 已加。
3. Paper：SE 9.6 已发布（`d78fd31`）并由 CourtWork 采用，PAPER.md 已更新；roadmap / current 的 9.3 表述由 Astra 同步。
