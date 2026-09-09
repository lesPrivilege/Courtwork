# 前端 roadmap（Fable，2026-09-09 收敛节点）

本页是本轮（WK-105…129）的收敛点，供 fresh Fable 续接。裁定原文在 [intake-round-3](intake-round-3.md) §4k–§4ah；台账 [dispatch-round-4](dispatch-round-4.md)；工单 [WO-CC-round5](work-orders/WO-CC-round5.md)；misfit [misfit-ledger](misfit-ledger.md)；索引 [atlas](../../../design/atlas/README.md)。

## 1. 已合流（main）与待合流

| 单 | 状态 | 头 |
|---|---|---|
| FE-01 词表 / IA / chrome / composition | 合流（2b6c221） | — |
| FE-02 Models & Connections | 合流（4d9714e；display name 移除） | — |
| FE-03 Chat / Work / Memory + BE-17/18 消费 | 合流（af95bcb；Astra 补丁 4b6aef4） | — |
| FE-04 Primitive reconciliation（canon + 状态矩阵） | 合流（683b6d1） | — |
| CC-S Settings 替换全局导航（改约 WK-116） | 合流（414b196） | — |
| CC-W 工作面分档 + tab strip（改约 WK-113/116） | 合流（0b5ccd2；Astra 补丁 48693ad 双影子占位，WK-131 复核通过） | — |

## 2. 队列（WK-120 / 用户 2026-09-09）

**CC-D0-a 已备好未派**：树 `/private/tmp/se-agent-ccd0a`（基线 `fa90763`，分支 `claude/cc-d0a-home-modules`，端口 8905 / 8906），提示词 [WO-CCD0A-dispatch-prompt](work-orders/WO-CCD0A-dispatch-prompt.md)——**已于 2026-09-09 由 fresh Fable 以 `opus-wo-low` 派出**。CC-D0-a（`opus-wo-low`）→ FE-05a（字阶与密度 V1 + 第 0 项 M-15 + 第 0b 项 Shape 落地 WK-128，`opus-wo-low`）→ FE-05（材质与光：Material grammar 五节，progressive blur 配方 WK-127，`opus-wo-low`）→ CC-I（共享 Inspector + contextual toolbar 可操作 payload，`opus-wo-medium`）。ATT-FE-01 在 ATT-BE-01 交付后默认排 FE-05 之后。CC-D0-b（Activity / Usage）待 BE-1/3/25、BE-29；CC-P（policy editor）待 PolicyRule canonical 文本；GI（生成式身份）在品牌线。

## 3. 成单前置与未闭合

- FE-05a：第 0 项含 M-15（B 态顶带对齐）与 M-16（composer icon / label 槽位）；EX-CC5 已回执并入库（WK-132：四项前置闭合；M-16 / M-17 为现状缺陷入第 0 项；对照基线 [v1](../../../design/type-density-ablation/v1/README.md)）；约束表 [type-density-constraints](../../../design/type-density-constraints.md)；消融页 [type-density-ablation](../../../design/type-density-ablation/index.html)。
- Specimen board（Shape / Material / Identity / Control / Iconography）：Shape 项来自 EX-CS1 §7；Material 项来自 WK-127（header 带有 / 无 progressive、round vs squircle 只在此并排）；Identity 来自 EX-GI1（已回执，WK-130：三方向 specimen [identity-specimen](../../../design/identity-specimen/index.html)，选向归用户 / 品牌线，Fable 建议 A）；Control 只放今日有 schema 的控件（WK-129 (g)）；Iconography 来自 WK-133 (f)（EX-IC1 在 FE-05a 合流后派：Lucide 现状 vs MingCute Regular vs Phosphor Regular，一次一变量，真实槽位，Fill 只在 boolean toggle 候选位并排）。载体：Claude Design 画布或静态页（画布曾加载失败，静态页为回退）。
- GI（生成式身份）：用户 2026-09-09 定为非排期重点，只作必要实现（公共站 hero、Home 空态静态 canonical mark，A 为基线，可读性优先），不开 generator 单。
- 后端（Astra 已接）：BE-2、BE-1/3/25、BE-30…33、BE-28/29、BE-19/20、BE-21/22、ATT-BE-01；候选 BE-34（可逆窗口）、BE-35（Auto 模式）、BE-26/27（Mail / Calendar）。
- 仍开：public-copy 同步、G1–G5、错误文案抻平（M-3）、M-12/13/14 状态模型簇。

## 4. 方法与边界（不重裁）

WK-112 constraint-driven loop（§VI 契约头、变体、消融、状态矩阵、misfit 台账、anti-slop 门）；WK-120 成熟感 = 密度 + 留白对齐 + 层级；WK-123 Auto；WK-122 四层来源 + 六级 atlas 格式 + ui-state-vocabulary（无契约状态不画）；WK-125 Visual Grammar；WK-129 Control Grammar；WK-133 Iconography（一时一族、donor 逐枚归一、Lucide 设计指南为验收规则、glyph 不承担状态）；WK-134 Scout 层（capture 不是规则、concept 不成 canonical、pull 不 push）。硬边界：前端单 writer；不引 React / 依赖（donor 只取行为）；Always allow 不采纳；侧栏实色、内容不 blur；field / 氛围层只作 specimen；不复制 OpenCode 风格；Schema constraint ≠ UI affordance。

## 5. fresh Fable 续接清单

1. 读记忆 `round4-material-dispatch` 与本页；核对 main 头与 r4d 是否已合流。
2. CC-W 已合流（0b5ccd2）：直接以 `opus-wo-low` 原样派出 [WO-CCD0A-dispatch-prompt](work-orders/WO-CCD0A-dispatch-prompt.md)（树与数据目录已建）。
3. EX-CC5 / EX-GI1 均已收（WK-132 / WK-130）；FE-05a 派单提示词须含第 0 项（M-15 / M-16 / M-17）、第 0b 项（WK-128）、V1 目标值与 v1 对照基线。
4. 出 specimen board（一次一变量，真实控件）交用户裁定；裁定输出 tokens + invariants + forbidden rules。
5. 每单复核沿 §13/§14/§16 体例：写权、读码、独立重跑、待裁逐项、anti-slop 门、合流次序。
