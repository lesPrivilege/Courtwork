# Markdown Review Surface · 架构与评测起点

2026-09-10；Astra 从实际 main `1f437a98e57cffb17cdde5c3fd864fe38ce8efd5` 隔离开工。用户指定本单前后端架构、关键实现与异步节奏由 Astra 持有；Luna explore，成熟且验收明确的部分可由 Terra 实施。本轮完成 A0 架构、上游/接缝核验、隔离 parser probe 与现有 renderer 的浏览器基线，不宣称新增评注产品已交付。

## 来源与消费

[Markdown评审方案](chatgpt-conversation://6aa181a2-6754-83ec-bf91-9721bb63b53e)已完整读取：1轮、2条文本、无附件、无截断、hasMore=false。转录为 [inputs/conversation.txt](inputs/conversation.txt)，9,637 bytes，SHA-256 `9470a797488ddc0ba55f5e49b640a64f9a91071b01dec878c009c20a12d95ae6`。10个显式 URL 见 [manifest](source-manifest.json) / [sources](sources.md)。原回答的 Exa 数量自述与未给 URL 的 Motto 不作为已验证事实。

本包承接 [CodeRabbit Review 研究](../review-surface-2026-09-09/README.md)、[Chat Space](../chat-space-2026-09-09/README.md)、[Work Core](../../../docs/work-core/contract.md)、[UI 边界](../../design/work-surface-boundaries.md)，不另造成果或执行 owner。

## Astra 的关键裁定

1. **字节和既有身份是真源，AST 是派生视图。** 原文/BOM/换行与 hash 保留；source code points、parser UTF-16、显示文本分开映射。源码片段与可见文字并非一一对应。
2. **首个正式评注挂 Core 文件候选/成果。** 普通 Markdown 可独立只读阅读，不自动创建 Matter；不让 sidecar、DOM 或 agent 私有文件成为正式评注真源。Source/ArtifactHistory 与 Core 成果身份继续分列。
3. **处置和定位是两个维度。** open/resolved 不与 exact/candidate/ambiguous/orphan/unavailable 混为一个 enum；跨版本命中只给候选，保留原 anchor，显式确认新绑定。
4. **先块级，再精确 inline。** 第一条纵切为固定版本阅读、明确的段落/块评注、同源回执恢复；任意选区、跨块映射、语义 diff、模型建议逐项验收，不靠模糊定位假装可用。
5. **沿现有 native UI 与 Core 事务。** 现有 Marked + DOMPurify 继续使用；unified/remark 只进入隔离 source-map 实验，生产准入待 parity/资源/许可验证。无 React 迁栈或新的 Run loop。
6. **按接缝安排异步工作。** Terra 已实施可执行基线；后续 reader/rail 等 A1/A2 合同成熟后派。Astra 亲写来源映射、服务端评注事务/迁移、重定位和模型建议后果，负责宿主集成。具体见 [architecture](architecture.md) 和 [work-orders](work-orders.md)。

Luna 探索稿里的可选 sidecar/早期函数名不是本单采纳协议；以上裁定与 architecture 优先。Luna 提供精确接缝与反例，不承担其建议的最终架构权。

## 验证与事实分层

- [Parser spike](../../../evidence/markdown-review-20260910/parser-spike/README.md)：Astra 作者10/10行为探针，固定 npm lock。包括 BOM 偏移、UTF-16/code-point/byte 差异、entity/code/table 映射、重复块和后置 reference definition。证明直接套用 offset 不安全，不证明产品 anchor 已实现。
- [Renderer baseline](../../../evidence/markdown-review-20260910/baseline/README.md)：Terra 作者实际调用生产 markdown()，synthetic DOM/安全与未来 revision oracle 严格分列。最终复核记录在下方。
- [Luna 接缝](luna-seams.md) / [上游核验](luna-sources.md)：只读证据与建议，固定代码/来源边界；不以自述、热门程度或 README 推出产品接受。

生产 app、Core/schema、vendor 和现有 FE 队列未改。新依赖只在 evidence/parser-spike；不读取个人数据、不调用真实模型、不发布、不修 Paper，G1–G5保持。下一产品入口是 MR-A1 的身份/源投影合同；MR-A2 再冻结评注 mutation 与迁移，Terra 不先猜接口。

## A0 回执

Luna 两项探索均已返回，七个仓库固定 SHA/许可证/关键实现已核验。mdProbe 的重复引用可经后续 fuzzy 返回 confident，因此只取算法索引；不采纳其定位成功语义。Luna 交叉复核指出的评注版本/回执冲突与 A2/A3 次序问题已修入架构与工单。

Terra 基线经 Astra 读码修订要求后交付；Astra 在独立端口/新 profile 重跑 **8/8 browser cases、0 exceptions**。7组 revision pair 只过结构/hash检查。Astra parser probe **10/10**，Luna 非作者重跑并审查10个ID。完整归因、源码hash、作者与非作者结果见 [证据回执](../../../evidence/markdown-review-20260910/README.md)。A0 接受；本轮 agents 已交付，后续产品单未启动。
