# 成熟实践 → 资源治理 · 消费账

2026-09-12；状态：Astra裁决、前后端PR文稿与roadmap已登记，产品未实施。用户本轮要求消费《调研成熟实践》，由Luna fast explore、Astra裁决；不是执行源会话中的Exa调用指令或立即安装全部外部系统。

产品基线为Courtwork main `647bc2167efe5437d0ca73a60a406549d9a1e268`。本分支从前轮纯文档提交 `ebd3e52` 叠加，以保留[RD-006](../RD-006-deferred-workspace-binding.md)的关联；这不是主线已合入RD-006。共享main的current及其他writer修改保留。

## 输入完整性

源会话ID `6aa41ab2-1280-83ec-a7f5-9b84139eae6f`，2 turn / 4消息，hasMore=false，各消息无truncated标记；1张附件已查看并按原字节保存。[原始返回](source-conversation.json)、[消息映射](input-manifest.json)、[22条原始外链](source-links.json)、[SHA-256](source-sha256.txt)。

| 输入 | 内容与处置 |
|---|---|
| [T01用户](inputs/01-user.md) / [assistant](inputs/01-assistant.md) | 传统文献、数据治理/工程、组织工程成熟机制；映射对象/变更/版本/协议/UX，不嵌入完整DMS |
| [T02用户](inputs/02-user.md) / [assistant](inputs/02-assistant.md) | 运行中间文件、消息、上传附件应受治理，在项目/Matter中可查、共享引用、标注索引；拆为持久来源、明确关联、只读资源面、可重建检索及后续标注 |
| [附件](inputs/reference-library.jpeg) | 一则用户只要题录保存/分类/导出、不想被完整工作台绑住的帖子截图，附小型reference-library列表。仅为需求语境，不当Zotero普遍评价或可交互UX证据；首版允许metadata-only来源，阅读/解析是可选能力 |

原assistant自述90与181个候选结果、9与10条研究线是源研究自述，不是本轮检索数量，不简单相加为独立样本。两轮不是一轮被覆盖：第一轮传统系统谱系与第二轮资源治理均逐项去向见[选型矩阵](selection-matrix.md)。

## 裁决与交付入口

- [RD-007](../RD-007-resource-governance.md)：资源身份/bytes/版本/关系与接受权分离；Library是有权限的查询面，promotion不自动accept。
- [Luna fast explore](luna-explore.md)：源码、既有合同、欠账与可落地接缝。只读探索不算本次独立产品接受。
- [前后端PR文稿](pr-plan.md)：RG-BE-01…06、RG-FE-01…03为既有LG/DS/BG/Runtime路线的消费切片；明确新增与复用范围。
- [roadmap](roadmap.md)：依赖、首个完整场景、触发条件与后置项；不重排当前在途writer。
- [一手来源有限核验](sources-review.md)：只核验六个机制来源，不声称整套协议兼容；其他候选明确未核验。
- [本轮验证](verification.md)：来源完整性、hash、文档链接与Git范围。

本轮不建第二份全能Resource Fabric总账，不把一般资源都改名为Core Artifact，不新增工作流引擎、向量库、RDF或运行循环。Paper继续以[根入口](../../../PAPER.md)固定9.6；工程结果未产生新论文结论。
