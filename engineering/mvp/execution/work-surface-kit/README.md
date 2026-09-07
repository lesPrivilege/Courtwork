# Work Surface Kit · 准备轮（2026-09-08）

状态：**准备，不开工。** Codex（Astra）正把 `codex/fresh-integration`（`05c6947`，代码合流 `d44fb28`）迁入持久候选 `codex/fresh-courtwork`；`~/Projects/Courtwork-fresh` 工作树已清空待导入。本目录暂存于 SE 主树（不入 SE git），Codex 完成搬迁并给出基线 SHA 后整体迁至 `Courtwork-fresh/engineering/mvp/execution/work-surface-kit/`，路径引用保持相对。

## 阅读顺序

1. [handoff-convention.md](handoff-convention.md)：统一体例。任何 Sonnet / Opus / Fable 产出都按此格式，局部不自造词表。
2. [intake.md](intake.md)：Fable 对全量讨论（索引 + 品牌图标 + Astra 分工 + 解耦 presentation primitives）的架构消费、现状事实与裁定 WK-1…WK-10、依赖图、留用户未决项。
3. [work-orders/](work-orders/)：六张工单骨架，开工前只补基线 SHA 与端口。

## 开工前置

- Codex 报告搬迁完成、独立 clone / 恢复检查通过、基线 SHA。
- 用户对 intake §5 三项未决给出裁定。
- 本目录迁入 fresh 仓；`inputs/` 内索引（sha256 `814ab9b0…`）随迁。

## 输入

- `inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md`：定本索引，检索层，不作 prompt payload。
- 讨论四段（品牌图标 SVG 重绘与推理动画；索引 handoff；Opus / Astra 分工；日历 / 热力图 / 邮件卡片解耦）：要点已转录进 intake §1，不另存原文。
