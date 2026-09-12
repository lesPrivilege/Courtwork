# 自足架构节点 · 2026-09-13

Astra裁决与集成；Luna登记实际实现、复核既往论断，并独立审计UI。接单 `273ad12a9796aa0547d65e4811a6c56baa5c6a49`。用户授权本节点合流、push及沿既有GitHub Pages部署；部署范围是公开静态站，产品Host仍为本地运行。论文继续由[PAPER](../../../PAPER.md)固定SE 9.6，用户讨论与网页材料是设计输入，不是公理、实现证据或自动授权来源。

## 阅读入口与证据分工

- [正式架构](architecture.md)：五层语义、公式、产品闭环和后续施工顺序，由Astra负责。
- [工作区治理地图](workspace-governance.md)：文档/数据/组织治理、渐进披露、接管及多agent分工，由Astra裁决。
- [实际实现与缺口](explore/implementation.md)：Luna固定基线代码核查。
- [既往裁决清账](explore/decisions.md)：Luna核对来源、采用及过时范围；最终采用以正式架构为准。
- [验证与裁决记录](verification.md)：作者检查、非作者复核、原始失败和通过范围。
- [UI修复与后续裁决](ui/fixes.md)：滚动退出、页面语义和待Review可发现性。
- [Runtime替换验收](runtime-replacement.md)：Codex公开接缝作为能力参照，逐项证明，不按品牌宣称可替换。

当前状态统一见[engineering/current](../../current.md)。本目录中的公式定义合同与可证伪条件，不代表新API、scheduler、Expert市场或第二runtime已实现。

## PR与方案消费

2026-09-13重新fetch并查询GitHub，远端main为 `1ac2898`；接单本地main为上述273ad12，无开放PR。PR #1（BM-01）已合并，merge `e2114a1c3746cfd52c403df6fadede387f4f7784`；PR #2（public narrative）关闭且mergeCommit为空，不能称为已合并。后续公开文案与发布由独立提交/回执承接，是否等价逐项见既往裁决清账。本节点不重开已关闭PR，也不把计划卡名当GitHub PR状态。

[Harness双包](../../release/harness-implementation-2026-09-12/README.md)、[逐卡处置](../../release/harness-implementation-2026-09-12/disposition.md)、[dogfooding修订](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)、[Chat材料索引](../chat-memory-broker-2026-09-12/README.md)、[数据纵切](../data-surfaces-2026-09-13/README.md)继续保留原件与具体证据。新架构消费其适用责任及已证事实；不要求先实现所有历史候选。Astra采用Luna清账的四项处置：保留五层责任而修正实现成熟度、退役Spark性能优胜前置与过时刚性排序、保留四职责而拒绝已完成通用闭环的推论、保留PR精确状态及后续部分消费链。

## 历史归档

旧Runtime canon原字节归档为[273ad12快照](archive/runtime-canon-273ad12.txt)，SHA-256 `2e1f150ed7be0c99bd97c9739bdd6d011204c23bd6a3af3e71835c434817c0f8`；原坐标为 `273ad12a9796aa0547d65e4811a6c56baa5c6a49:engineering/architecture-runtime-canon.md`。归档内相对链接按该原坐标解释，历史时点声明不恢复为当前指令。活动canon现为本节点导读。其它历史证据和inputs原件不重写；当前方向、实现和验收分别由本节点、current及具体交付记录承担。

旧options同样按原字节归档为[选型快照](archive/options-273ad12.txt)，原坐标 `273ad12a9796aa0547d65e4811a6c56baa5c6a49:engineering/options.md`，SHA-256 `3fb9026b4913c4bb354a5279ce03039cae2990f89ae8dc23f75ef4664f9277f3`。活动[options](../../options.md)现区分真实采用与待验证候选，不再由早期OpenCode/TypeScript/React矩阵暗示当前基线。仅扩展名改为txt以保留原字节和原相对坐标，不重写历史链接。
