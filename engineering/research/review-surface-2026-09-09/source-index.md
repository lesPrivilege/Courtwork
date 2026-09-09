# 来源核验与机制索引

核验日期2026-09-09。下列6个显式URL全部读取官方页面；这些是可变网页的当日描述，不是固定上游实现、效果实测或本仓验收。官方changelog仅用于发现文档入口；path-instructions页面用于补看排除范围，不计入原文6个URL。没有恢复原始Exa结果集。

| 官方来源 | 本轮支持的观察 | 消费限制 |
|---|---|---|
| [Change Stack](https://docs.coderabbit.ai/change-stack) | 跨文件layers与文件入口共存，围绕保存的review材料阅读 | 分组不是领域事实或依赖证明；排除内容不因计数消失就算已审 |
| [Read changes](https://docs.coderabbit.ai/change-stack/reading-diffs) | semantic无结果回落line diff；source/rendered、图片比较；局部context与summary折叠 | Code Peek是启发式查找，空结果不证明没有引用；不推导PDF/OCR锚点保证 |
| [Findings](https://docs.coderabbit.ai/change-stack/findings) | 标签四轴独立；注意事项按行动分层；readiness与mergeability分开；跨轮显示skipped；刷新分summary/graph/re-review | driver的open/addressed/superseded/not relevant与跨轮finding比较不是一套枚举。非成功run不证明旧风险清除；标签不都可过滤 |
| [Snapshots](https://docs.coderabbit.ai/change-stack/snapshots) | 阅读固定review-run/head；动作目标是live PR；merge拒绝stale；chat固定起始快照 | 未带snapshot参数的链接跟随latest；列表/commit解析最多查25份；部分provider无live freshness。不可宣称所有链接天然永久精确或所有旧快照动作同一禁令 |
| [Introducing Overview](https://www.coderabbit.ai/blog/introducing-overview) | 2026-06-29文章以变化概要与需要处理之事组织入口；PR讨论与line评论分区 | 信息架构参照，不证明Courtwork Home布局已验收 |
| [Understanding is the bottleneck](https://www.coderabbit.ai/blog/code-is-no-longer-the-bottleneck-understanding-is) | 2026-07-21文章把模型分组作为可质疑判断，提供回到具体变化的路线 | 设计主张，不是摘要准确性、审查效率或治理理论的实证结论 |

## 原文15项全覆盖

| 原文机制 | 入账去向 |
|---|---|
| Change Stack/Layers；双重阅读顺序 | PR-RS-B，分组投影与Sources保底 |
| Range锚点；精确deep link | PR-RS-A，复用source身份/版本/范围与权限校验 |
| Overview；Needs your attention | PR-RS-B与D，沿现有工作面及ATT |
| Snapshot vs Live | PR-RS-A，历史读取与逐动作基线 |
| 跨snapshot finding lifecycle | PR-RS-C，领域比较/覆盖证据 |
| Readiness ≠ Mergeability；Finding四轴 | PR-RS-C与D，保留判断/动作区别，不直接复制枚举 |
| Semantic Diff；Rendered Diff | PR-RS-B，有限文本实现，其他格式后续选型 |
| Context/Comments/Chat右栏 | PR-RS-D，明确对象与版本范围 |
| 低复杂度折叠；Diagram only when earned | PR-RS-B，显示偏好与证据回链 |

原文“P0”“冻结”“应进入SE”作为建议保留；Astra裁为产品实现参考，无Paper修改需要。更多文档：[官方changelog](https://docs.coderabbit.ai/changelog)、[路径指令与排除范围](https://docs.coderabbit.ai/configuration/path-instructions)。
