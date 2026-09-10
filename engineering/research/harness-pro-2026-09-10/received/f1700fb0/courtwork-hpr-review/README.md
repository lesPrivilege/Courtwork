# Courtwork · HPR 架构审查返回包

日期：2026-09-10。**这是审查建议与候选施工合同，不是合入、部署或产品验收回执。**

送审文档：`d22eb66ef1b335b95202c8c0a34c425acb59a2f9`；产品代码：`a2b084da09ba14a92f4e94bae49c9540d2e6dced`。本包未改 GitHub 仓库、远端 main 或部署，也未启动另一个模型/执行者。最终接受、修改、拒绝、延后或补查由本地裁决者登记。

**建议：保留 Pi 0.85.1 执行链；先补齐通用能力和可检查的运行合同，再把 Work Core 从普通 Chat 启动路径中拆成可选组合。暂不换 runtime、不迁移 Matter、不重写 Rust。**

完整正文在 [FULL_REVIEW.md](FULL_REVIEW.md)，不是摘要。分件为 [HPR-01 基线与对标](HPR-01-baseline.md)、[架构与最小合同](architecture-contracts.md)、[HPR-02 小 PR 工单](HPR-02-work-orders.md)、[HPR-03 自足节点](HPR-03-gates.md)。每条工单还保存在 `work-orders/`，便于逐个领单。

## 本次实际完成的验证

| 项目 | 本次结果 | 结论上限 |
|---|---|---|
| 固定源码静态审查 | 覆盖见 `source-manifest.json` | 有界架构/调用链审查，不是全仓审计 |
| MCP 原文件字节核验 | 6836 bytes，Git blob `055e66223a91eec4a4aade665f8d96af488e9573` 一致 | 核验的是这一份源文件，不是 12 份输入或整个 checkout |
| 固定源码隔离诊断 | 4/4，含两个缺口复现和两个对照 | SDK 被桩替换；没有真实网络、真实远端副作用或产品全量运行 |
| 分页参考函数 | 10/10 | 只验证本包新函数；未接入 Courtwork |
| npm test / smoke / GUI / 真模型 | **未运行** | 不关闭任何产品或独立验收门 |
| 753 文档／3531 链接／12 哈希 | 用户提供的上游检查结果 | 未由本次重复核验 |

`tests/baseline-mcp.test.mjs` 的 PASS 表示**成功复现了所命名的基线行为**，不表示该行为正确。原始 TAP 与字节核验记录在 `evidence/`。

## 入账顺序

先保存本包及当前回复原文，不用本 README 代替完整正文；核对 `SHA256SUMS` 与 `output-manifest.json`。再按 `decision-register.json` 的 HPRO 编号逐项裁决，最后把采纳项投影至既有 roadmap/工单和交付证据。`localDisposition` 全部为 null，不能从“有工单”推断已经接受或实现。

`implementation-map.json` 同时给出「输出编号 → 工单」和「工单 → 输出编号」；原始来源、参考实现、负例及开放问题也有去向。源文件的 Git blob、已读范围与未核验项见 `source-manifest.json`。网页为本次读取的官方页面，不冒充历史快照。

当前平台消息 ID、会话 URL、平台可验证的原始模型标签未由本环境提供。本包不编造；由本地回收过程补记。附件哈希不覆盖尚未归档的聊天正文。历史对话原文、研究工具原始返回和本次工具日志若可访问，仍应另行原样回收。
