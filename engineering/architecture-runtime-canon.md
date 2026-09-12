# Runtime与Work语义 · 当前裁决入口

2026-09-13，Astra。当前采用[五层架构与工作闭环](research/architecture-node-2026-09-13/architecture.md)：Adapter、Harness Core、Harness Extension、Work Core、Work Extension按变化责任划分；Host共享治理与UI投影保留原owner。Pi本地优先、DeepSeek首适配，原生Runtime通过独立Runtime Adapter接入；第二runtime以[Codex公开能力和替换矩阵](research/architecture-node-2026-09-13/runtime-replacement.md)验证，尚未实施。

Work Core同时是文档、数据与组织治理的稳定语义方向，不能由当前Matter表结构限定长期范围；也不意味着把所有原文、索引、凭据和运行日志搬进同一Core数据库。具体owner、渐进披露与工作接管见[治理地图](research/architecture-node-2026-09-13/workspace-governance.md)，实际实现见[Luna核查](research/architecture-node-2026-09-13/explore/implementation.md)，工程状态见[current](current.md)。

本次distill替代本页原先混排的9月11日DRT排序与9月12日增量。历史原字节、SHA及具体处置见[节点入口](research/architecture-node-2026-09-13/README.md)与[旧canon快照](research/architecture-node-2026-09-13/archive/runtime-canon-273ad12.txt)。旧原件仍可回溯；术语不再要求读者串读历史修订才能知道当前方向。论文采用仍固定[PAPER](../PAPER.md)，本裁决不发布新论文或宣称完整架构实现。
