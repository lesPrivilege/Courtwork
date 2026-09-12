# Harness 完整实施包 · 本地采用与执行入口

2026-09-12，接单 main `d1b992110debdd2ad5d8a61124f52710535c9a23`。用户授权完整登记后串行开工，Luna explore，Astra负责架构、裁决和模型能力瓶颈实现。隔离分支 `codex/harness-release-20260912`；共享 main 的现有修改不纳入本单。

## 来源与覆盖

[接收回执](receipt.json)保留两份 ZIP 的 SHA-256。v2 内嵌上一版 ZIP 与用户第一附件字节相同；外层两个 ZIP 和全部解包文件完整保留，未执行包内派工命令。两份校验脚本经源码检查，仅校验文件/链接/依赖图，已通过；这些结果不代表产品测试。

- [v1 完整包](inputs/courtwork-harness-release-2026-09-12/README.md)：架构、边界、20卡 PR/RD计划、发布门、文档映射及来源。
- [v2 完整修订](inputs/courtwork-runtime-composition-v2-2026-09-12/README.md)：六专题、覆盖表、三节点、维护与模型适配。
- [逐卡采用表](disposition.md)：每张原卡的处置及唯一 writer。

关联讨论“撰写Harness架构方案”两轮已读取；讨论及附件是输入证据，其自带 HANDOFF 不是本地指令权威。Astra采用 v2 三节点顺序，保留 v1 未覆盖的权限、来源、故障和门禁合同。冻结原件保留历史措辞，活动工程文档以本地裁决为准。

## 架构裁决

可替换单元是 Harness Core 与 runtime 私有扩展及其 adapter；Host共享能力和 Work/Expert 领域语义保留现 owner。CW 组合 Pi 与完整原生 runtime 两种接法并存；原生执行器不被强制重写为 Pi，也不要求额外套一层 Model Adapter。Spark、Attention、Expert 是产品运行封装；Spark 自研确定，优先复用 Pi core，性能实验决定实现厚度。局部选择经验证自足版本，按安全/协议/正确性需要维护，不要求全量 live swap。

首节点 DeepSeek＋Pi GUI 跑通不等待完整 Core-free 或 Work Compiler；第二节点证明普通受限任务的真实 runtime 替换；第三节点才证明同 Expert/Core 与 Work 小闭环。GUI Agent 在此指通过产品 GUI 操作的 agent。具体实现以源码、Run 与独立核查为证；原件描述不算实现。

## 基线与证据

Pi 三包均锁定 0.85.1，MCP client 2.0.0。既有 MCP discovery/exposure/permission 与 SessionManager 泄漏须按当前源码验证；当前 RuntimeStore schema 12，沿现 store，不采用历史 schema4 为当前版本。真实 provider 调用、第二 runtime 与完整产品门未验证；不读取个人凭据。固定支持集合、原始测试与后续 SHA 写入本目录 evidence。

## 当前实施状态

P01目录完整性、P02效果未知与崩溃结算、P02b结果保真已实现并完成Luna固定提交46/46有界复核；[固定版本验证](evidence/verification.md)保留全量838/839及单测复跑13/13事实。[DRT-02](evidence/DRT02.md)4/4合成协议与实际GUI Deny/Approve/文件阅读完成。真实DeepSeek门仍开放，节点二、三未抢跑；未push或部署。

具体合同/证据：[P01](evidence/P01.md)、[P02](evidence/P02.md)、[P02b](evidence/P02b.md)、[结果保留合同](P02b-contract.md)。
