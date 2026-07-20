# PI-FIRST-SOURCE（2026-07-20，只读，不进权威链）

`HARNESS-CORE-1` Stage A 立项的一手源核实批次。

**为何立批**：`research-2026-07-15-round-3/pi-harness-comparison.md` 全文 17 行、未展开任何工具接口，而就绪图 Round 5 方向②以「reading/edits/writing/bash 采 pi 成熟范式」为论断基础——归档层缺证据，故回一手源核实。

| 文件 | 主题 | 时效三态 | 消费状态 |
|---|---|---|---|
| `pi-tools-first-source.md` | pi v0.75.4（MIT）四类基础工具接口、bash 权限模型、toolResult 形态、agent loop 控制结构 | **有效**（2026-07-20 一手核实） | 已消费（ADR-017 决定零/决定八、ADR-018、TOOL-READ-1 票面） |

**核实边界**：被调研仓库为本机快照，无 `.git`——提交日期与 issue/PR 响应时延**无法从本地判定**，活跃度只有 CHANGELOG 自述可依。

**最重要一条**：pi 的 bash 范式**就是不做权限模型**，安全性整体外包给容器（README 自述「Run in a container, or build your own confirmation flow」）。故「采 pi 范式」与就绪图「沙盒后期」互相排斥——详见 ADR-017 决定零。
