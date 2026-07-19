# research-2026-07-19-agent-pedagogy

批次入口。会话代号 `AGENT-PEDAGOGY-SURVEY`，只读调研，未提交，留架构角色复核。

## 任务

摸底两个公开 repo，判断对 Courtwork 有无可消费内容：

1. `https://github.com/microsoft/ai-agents-for-beginners`
2. `https://github.com/bojieli/ai-agent-book`（李博杰《AI Agent 开发实战》类教材）

对照排队的七个消费去向：bash 受控 ADR、统一填格协议 ADR、容器化 ADR（chat-as-dossier）、`TOOL-READ-1`、法律垂类评测集、memory 演进（ADR-013）、多 agent 编排（明确拒项，只作反面佐证）。

## 产出

- `survey.md`：正文，两 repo 各一节（定位/成熟度/目录结构/七靶逐一对照）+ 三桶汇总（可借形 / 反面教材 / 中性）。

## 结论摘要

- `microsoft/ai-agents-for-beginners`：微软官方 Azure Agent Framework 生态入门课程，通识水平为主，主要价值是多 Agent 编排的反面教材；`18-securing-ai-agents` 一课含可疑的第三方包推广内容，低可信度，未采信。
- `bojieli/ai-agent-book`：个人作者的中文技术书籍配实验仓库，在 bash 受控、`TOOL-READ-1`、法律垂类评测集三个方向提供了具体工程设计增量（提议者-审核者/Sidecar 机制、幂等性与预检-确认两段式、执行环境隔离分级、只读工具缓存并行论证、司法判例因子发现聚类流水线）；多 Agent 协作章节是比 MS 课程更贴近实现层面的反面教材。
- 两 repo 均非"零增量"，不适用"存档备查"式结论。
