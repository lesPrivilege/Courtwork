# 下一节点索引 · 真实 Runtime 与通用 Harness

## 2026-09-12 · 已授权实施接续

用户已授权[完整包入账及串行执行](../harness-implementation-2026-09-12/README.md)。本段更新下方“仅候选/待排单”状态，原索引与证据上限保留；当前排序以roadmap及v2采用表为准。

2026-09-12；索引基线为本次公开页面候选 `78008ce`，产品 App 与此前前端接受节点一致。用户要求 Luna 整理索引，供自行独立审阅后决定排单顺序；本文件不派工、不新增运行时或付费验证。公开页面发布独立进行。

## 先读什么

| 入口 | 当前事实 / 阅读目的 |
|---|---|
| [前端接受节点](../frontend-node-2026-09-12/README.md)与[8项真实模型验证](../frontend-node-2026-09-12/RUNTIME-VALIDATION.md) | 用户下一轮从本机8804配置自己的连接；检查流式、连续性、写入批准、版本、资源、停止和候选。现有合成验证不能代替真实provider结果 |
| [Runtime架构裁决 DEC-013](../../architecture-runtime-canon.md) | 区分Harness Core、Model Adapter、Runtime Adapter、Environment与Work Core；当前Pi组合已存在，完整Work Compiler与替换证明尚未实现 |
| [Pro原返件总入口](../../research/harness-pro-2026-09-10/README.md)、[版本覆盖](../../research/harness-pro-2026-09-10/return-coverage.md)、[附件接收](../../research/harness-pro-2026-09-10/received/f1700fb0/receipt.md) | 已有f1700fb0为24 HPRO / 13卡P00–P12；后版14卡/316项附件缺失，不能混用编号或宣称全量接受 |
| [Pro施工稿](../../research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/HPR-02-work-orders.md)、[机器映射](../../research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/implementation-map.json) | 候选PR依赖和负例；全部proposed-not-created，localDisposition尚未逐项裁决；不是已建远端PR或既定施工顺序 |
| [Runtime基础](../../../app/docs/runtime-foundation.md)、[Turn ownership](../../../app/docs/turn-ownership-review.md)、[运行指标](../../../app/docs/work-metrics.md) | 读取当前实现owner、turn终态及测量口径；延迟/usage证据不能自行推导provider decode TPS |
| [GUI Agent控制面首片](../../research/gui-agent-control-plane-2026-09-12/skill-proposal-slice.md) | 声明式Skill提案、精确版本审批、Host CAS与下一Run绑定是后续合同；无新提案API或自动加载实现 |

## 实现事实与证据上限

Luna本次只读源码与固定返件，未改文件、未运行测试或真实SDK/provider。已有Pi AgentSession/native session、provider connection/config/verify、ask_user与workspace工具、Runtime Control Plane、显式MCP lifecycle、手动Skill catalog/load、compileControlContext和Work Core。主要接缝为：

- [Host runtime](../../../app/server/runtime.mjs)、[service](../../../app/server/service.mjs)：当前组合和控制流程；service仍直接使用Pi SessionManager，不能仅凭接口名称声称完全解耦。
- [Pi runtime adapter](../../../app/runtime/pi-session-runtime.mjs)、[control contract](../../../app/runtime/control-contract.d.ts)：Run控制、绑定与能力事实。
- [MCP manager](../../../app/runtime/mcp-manager.mjs)：manager未显式消费分页cursor；隔离桩显示首页截短，真实SDK是否自动归并仍待fixture验证；isError未触发onUnknown；content非空时structuredContent没有保真保留。先以锁定SDK fixture重现和约定正确语义，再改真实接缝，不把参考函数结果冒充SDK全路径证据。

原Pro包仅提供固定源码诊断4/4和参考分页函数10/10；未跑产品全量、smoke、GUI、真实SDK或provider。当前app/tests没有hpr_pNN测试或structuredContent测试。此处是有界源码索引，不是新的产品缺陷全量审计或独立接受。

## 供用户决定顺序的候选组

| 候选组 | 必须先澄清 / 验证 | 后续边界 |
|---|---|---|
| P00 现状与版本清账 | Astra逐项处置已收到的24项，与当前main重做差异；冻结effect语义、SDK版本和已有owner | 不混缺失后版；不为模块名先重写loop |
| 首个Harness正确性片 | MCP结果保真、分页和实际SDK接缝；structuredContent为当前源码派生候选，不冒称旧版P01/P02返件；保留text与结构化结果、错误和分页终止负例 | 消费现manager与control/service；后端唯一writer串行 |
| DRT-01 接缝清账 | requested/effective/bound、cancel/resume/event顺序和拒绝语义；找出service的Pi泄漏 | 先定可证伪Runtime Port/Run Plan，不以新接口掩盖旧调用 |
| DRT-02 协议probe | synthetic多轮tool/reasoning、重启、取消/失败和缺metadata；使用独立数据 | Model Adapter持私有协议，Runtime持久化owner落实恢复；不新增第二Session库 |
| DRT-03/04 替换与profile实验 | 同Expert字节、同Core提交合同；再固定模型/profile/tool/context版本、次数、预算和指标 | 第二runtime和真实provider实验须另有具体合同；不预判小profile优胜 |
| 控制面 / 资源治理 | [RD-006](../../research/RD-006-deferred-workspace-binding.md)、[RD-007](../../research/RD-007-resource-governance.md)、GUI提案合同分别沿原owner | 后续可与Harness接缝衔接，但本轮不启动目录迁移、Library或新提案API |

原P卡依赖仅作候选索引：P00→P01→P02→P03→P04→P05→P06；P07→P08；P09依赖P05/P06；P10依赖P06；P11依赖P06/P08/P09/P10；P12依赖P11。P07–P10共享control/service，默认串行；P11由既有前端writer执行，P12由非作者验收。这里不将P号强行映射为DRT号，也不决定两个候选组谁先实施。

## 历史状态校正

旧2026-09-11段落的“BE-41后置”和Summary合流NOT_READY只代表当时状态。后续[自足节点限定范围接收](../../../evidence/convergence-20260911/README.md)已接收Summary D1/D2、WORK-3、SD-ENTRY、BE41-A/B，不能重复当作全未实现；G1–G5、原生宿主和真实provider等开放项保持。

相反，CS-01/CI-BF仍是独立未接受候选，固定为 `archive/cs01-cibf-unaccepted-20260912` / `c2067ea3339095db946db4826bf2cf98e07e6651`。其合同、context/compaction与恢复讨论不能继承为main实现；要消费时按固定SHA和明确路径读取。[前端节点归档说明](../frontend-node-2026-09-12/README.md)持有该边界。新增上下文/压缩实现须重新核现产品并独立排单。

RV26-Q03依既有store/service串行接收边界核账；第二runtime、Rust和新增MAS没有因本索引或静态站发布而开工。作者实现与非作者接受继续分开，用户独立审阅与排单决定保持待定。

Luna已对本索引作有界非作者文字核对；Astra收紧SDK分页证据上限、限定接受范围及structuredContent候选来源。此核对不代替运行验证。

后续输入：[Chat Memory Broker](../../research/chat-memory-broker-2026-09-12/README.md)只登记为现context/披露与BE-19/LG/RG的未来消费者；不把provider侧connector与当前MCP客户端等同，不重排本索引候选。

后续输入：[工作义务闭环](../../research/obligation-closure-2026-09-12/README.md)只登记ATT/ME-06与Spark准备/核查的消费场景；不以heartbeat/模型核查代替完成或owner关闭，不启动周期任务或重排本索引。

整体review入口：[governed work loop](../governed-work-loop-2026-09-12/README.md)。本索引仍是候选顺序输入，不因四角色职责裁决自动开工。
