# Spark 施工 · subagent 扩展召回与接缝裁决

2026-09-13，Astra。施工基线 `2d1ab6816e3dedcd613fee80a35bc61b2067d106`；独立分支 `codex/spark-agent-20260913`。用户确认本轮在 subagent extensions 基础上完成前后端施工，包含 Chat space 右侧预设 Explore Agent 卡片。以下是施工约束，不是实现完成或独立接受回执。

## 召回记录与处置

| 已登记来源 | 本轮裁决 |
|---|---|
| [RD-005](../RD-005-multi-agent-selection.md)、[Luna explore](../multi-agent-selection-2026-09-10/explore.md)、[局部选型](../multi-agent-selection-2026-09-10/selection-index.md) | 采用 fresh child context、有界执行、主 Agent 综合、精确引用回传；不共享可变 transcript，不默认 fanout。 |
| [数据组织选型](../data-organization-2026-09-10/selection-index.md) | 消费 owner、contract、definition/Run 分离和 lineage；组织成员关系不授予权限，不引入第二组织 registry、RDF 或 policy runtime。 |
| [七 seam](../multi-agent-2026-09-10/selection-index.md)、[通信合同](../../../app/docs/coordination.md) | 复用 Host coordination 单 writer、真实调用归因、幂等及持久回执。本地通信不采用 A2A/broker；message/result 不改变正式接受。 |
| [RD-009](../RD-009-trusted-harness-extensions.md) | subagent 作为受信 Harness 扩展贡献，Pi 保持执行 loop；Host 持准入、调度与持久绑定，前端消费投影。无需先建立第三方任意安装或跨 runtime ABI。 |
| [pi-subagents 登记](../local-governance-2026-09-09/source-index.md) | X17 仅 indexed_unverified，不是 Luna 已接受依赖；本轮不把登记状态改写为已安装或兼容。若消费其源码，须另固定 SHA、许可和执行反例。 |

## 实际接缝

`app/harness/child-execution.mjs` 已有权限求交、取消/超时、迟到结算隔离与 finding reducer，但只是 conformance entry。现有生产 `Coordination` 持 Thread/mailbox，明确没有生产 child scheduler。两者是扩展基础，不能把其 synthetic 测试当作 Spark 可运行的证明。

本轮在既有 Host/Pi 组合上补独立 Agent 身份与版本定义、Assignment/attempt、生产受限执行绑定、结果及消费回执。执行贡献放 Harness/subagent 模块；不把 Spark 塞进专业 Work extension 的 Matter binding，也不让前端卡片成为状态 owner。RuntimeStore 原子发布与现有迁移/备份合同继续负责持久性。

Spark 预设 Explore 为只读有界能力；Agent 身份与所选模型分离。父任务持原责任，子任务使用独立上下文。父 Run 先在安全边界释放唯一执行槽，子任务才调度；结果到达不自动重放父 Run。旧 attempt、撤权、取消未确认和重启未知均阻断盲重放。详细约束以[已裁决 Design](design.md)为准。

Chat 右侧 subagent 卡片与独立 Spark 入口必须读取同一 Assignment，展示真实执行、结果和消费状态。沿现有 Spark 详情、coordination 投影、Files 精确版本 reader 与 Run 停止语法验证；文案和卡片存在本身不构成生产能力或 Release 接受。

## 本地数据与机器消费补充

用户确认中间索引/笔记主要本地保存，主Agent知晓存在并按需披露；历史资料可显式挂载项目及溯源复用。采用[Workspace Substrate合同](../architecture-node-2026-09-13/workspace-substrate.md)：本地内容寻址字节、immutable manifest/结果版本、按需目录与片段、源/目标双端验权和Host真实读取回执。机器消费不以人工Review为默认中转；右侧卡片提供投影/检查/控制，原Core正式接受保持独立。

## 实现回执

本片约束已进入[生产合同](../../../app/docs/spark-agent.md)与[源码/故障/浏览器证据](../../../evidence/spark-agent-20260913/README.md)。初始施工说明保留其时点；实现包括RuntimeStore schema15、受限Pi子执行、本地派生索引、渐进披露和双入口UI。当前合流与开放产品门沿engineering/current，不将本片作者验证写为完整独立接受。
