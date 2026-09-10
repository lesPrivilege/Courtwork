# EX-SKIN-01 · Skin 注入与稀疏 Review 色

2026-09-10 · Astra 裁决与整合，Luna 有界源码探索。基线 `main@2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`，隔离分支 `codex/skin-injection-20260910`。本单交付 Design / Explore 合同与施工切片；不改变默认产品或已发布 Pages。

## 裁决

**用户本轮最新纠正：Review 稳定且不涉及 skin；skin 是独立外观面，skin 变动不影响 Review。** 灰阶先承担层级、文字与交互；scheme 管浅深与材质策略。旧 whole-skin 仍存在反向耦合，需要兼容整改。Dystopia 登记为独立候选外观 preset，保留默认 slate；不得携带专用 review 色。此次裁决覆盖原讨论与本单初稿“skin只注入review”的早期方案。

本次不是从零加红：当前 Home featured item 与 Attention detail 已消费 `--attention-review`；Pages 已有 `--campaign-attention-review` 短标签与5px标记。原讨论“尚无 attention 红”已落后于实际代码。当前缺口是 Skin/Review 解耦、严格作用域、迁移及 specimen，而非大面积换色。

## 交付导航

- [全部7轮输入](input-conversation.md)：保留原文与时点，助手建议不直接成为规范。
- [Luna 源码清点](repo-inventory.md)：现有实现、消费者、旧接口与验证边界。
- [影响矩阵与 token 合同](skin-constitution.md)：Astra 当前裁决；新增槽位明确区分已实现、首片与保留。
- [一手资料索引](external-index.md)：核验范围与不采纳项。
- [Dystopia 与 Pages 对照提案](specimen-proposals.md)：具体比较方式，未假称已完成视觉稿。
- [兼容迁移与施工顺序](migration-notes.md)：下一位作者可以直接按片接单。

## 输入处置

| 轮 | 消费 | 边界 |
|---|---|---|
| T1 灰阶与稀疏红 | 灰阶骨架、颜色不得唯一编码 | 原图像素说法不当作测量依据 |
| T2 早期 skin 只管关键 review | 已被本轮用户纠正覆盖：review 独立稳定 | 作为历史输入保留，不是现行规则 |
| T3 玻璃与克制 tint | 沿既有 material grammar；不扩生产 blur 名额 | 5% / 10% 是待测变量，不是对比保证 |
| T4 成熟 SaaS / provider pages | 外部索引取语义/材质/发布分界 | 原称135条不是本次搜索数量 |
| T5 热图与 model usage | 回连既有 Usage / data-viz owner | 当前 Usage 已实现，本单不重复施工或染红数据图 |
| T6 repo 内外调研、Dystopia | 清点、迁移与 preset 施工切片 | Dystopia 不替换默认、不复用 danger |
| T7 部署页点睛红提案 | 以已有 A 标签为基线，B/C 做增量对照 | 不把 main 源码当线上部署证据 |

## 验证与接受边界

本次只有文档；验证相对链接、diff 空白与显式改动范围。Luna 的源码探索不是新 UI 独立接受。产品检验与视觉矩阵列为后续切片条件，不重跑无关 runtime 测试；G1–G5 不变。

Paper 保持 [9.6 固定来源](../../../PAPER.md)。视觉仅投影既有事实，不以皮肤、颜色、动画或 Pages 氛围生成 Attention 状态、权限或接受回执。

后续 UI 施工同时遵循[前端连续性规范](../agent-interface-2026-09-10/frontend-contract.md)，已消费用户新转交的《补充控制语法》。
