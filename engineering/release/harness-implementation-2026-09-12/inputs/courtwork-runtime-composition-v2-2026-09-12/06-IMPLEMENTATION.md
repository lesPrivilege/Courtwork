# 06 · 三节点实施、PR 重排与验证

## 0. 排序裁定

本轮主线是 **Harness GUI 跑通 → 真实 Runtime 替换 → Work 产品闭环**。节点名只是本包阶段描述，不抢占仓库现有 R/PT/DRT/G 编号。原 G1–G5 继续拥有 Work 产品发布要求；新节点一、二不是将其降低或自动签署通过。

P00 仍先做：读实际 HEAD、工作树、AGENTS/current 与现合同；读取 v1 原件和本包覆盖表；核对哪些旧问题已被修复/变更，锁定支持集合和唯一 writer。不是重新全面探索，也不让清账自身成为长期工程。

## 节点一：DeepSeek + 当前 Pi 的真实 GUI Agent

### 目标

人在 CW GUI 内选择实际模型连接，进行多轮交谈和受限工具任务；前端控件、后端运行、真实工具/文件与回执一致。这里的 GUI Agent 指通过 GUI 操作的 Agent，不代表已经具有 computer-use 或浏览器视觉控制。

### 最小实现

保留当前 Pi 组合；固定模型/协议/SDK 与 capability 集合。先处理路径上真实 bug，完成 DeepSeek 所需协议适配和流式/tool/permission/取消的 GUI 接线。利用已有 8 项验证 prompts，将不可用能力和未跑项明确记录，不重建整套前端。

P03 接缝清账可以同期进行；只有阻碍本节点正确运行的提取进入关键路径。**不要求 P04 的完整 Core-free、全量 input snapshot、完整 Work Compiler 或全部 memory/web/skill 能力先完工。** 当前 Work 功能保留并回归，不为简化 demo 删除已有专业状态。

### 必须验证

| 路径 | 必须有的证据 |
|---|---|
| 连接与选择 | GUI 保存的 requested/effective model、endpoint/API、runtime/profile 与实际运行对应；错误不静默 fallback |
| 连续对话 | 至少两轮真实回复与历史可读，refresh 不重复提交 |
| 工具与成果 | 一次精确获准写入及读回；先 Deny 无写，后 Approve 有实际 bytes/版本 |
| 权限与控制 | 开放集合变化只影响合法运行；Ask 绑定参数；Stop 有真实终态、草稿不误发 |
| 失败与重启 | 受控 provider 错误、取消、历史重开/新 Run；在途失联按 unknown，不自动重发 |
| GUI 合流 | 关键按钮和状态来自后端，窄屏/键盘/错误可操作；样例 UI 不算真实接线 |

确定性故障使用实际安装 SDK + loopback；主用户路径使用获准真实 DeepSeek 连接。两类证据分列。只记录必要的版本、请求/事件与结果，不用完整 Compiler 才能开始；实际无法观察的字段明确 unknown。

### MCP 的条件性门

如果本节点开放 MCP，则 P01/P02/P02b 的目录、结构化结果和效果结算是放行条件。如果决定首节点不支持 MCP，必须由后端能力与工具广告真实关闭、UI 反映不可用、公开范围不宣称可用；只藏按钮或口头说“不测”不成立。后续开启前补齐原测试。

### 产出与退出

固定 SHA/lock、支持集合、真实 Run refs、最小 GUI 证据、故障和未跑项、非作者核查。称为 GUI/Harness 可运行节点，不称 Spark/Attention/Work 里程碑已完成。真实配置/费用仍由用户授权流程控制。

## 节点二：同一 GUI 下替换整套 Runtime

### 目标

一个普通合成任务合同，从 Pi 参考 Runtime 切到真实第二 Runtime，CW 用户入口、权限含义、结果/事件合同和回执保持。无需先开发完整 Expert；避免前后循环依赖。

### 实施

P03/DRT-01：隔离 Pi 原生对象；RuntimeAdapter 持 native locator，Host 不再直接操作 SessionManager。保持当前 Pi 路径 parity。

P04a/b：将 Work contribution 留在组合侧，建立 Core-free 的通用执行路径；这属于 runtime 与应用解耦，不自动实现 projectless Chat。

DRT-03 分片：先固定 Codex App Server 的 binary/protocol、隔离 home、支持能力和许可；建立新的 RuntimeAdapter。先证明独立生命周期和 GUI 映射，再检验任务语义。其 public API 已有官方入口，但未知/experimental 能力逐项登记，不因可连接就宣传全部兼容。[S05/S06](SOURCES.md#s05)

P05/P06 按需要补绑定、实际输入可见性和 profile/权限。对不暴露内部 wire 的原生 Runtime，标明 prepared/control 已知、native wire opaque；不声称 CW 观测到全部模型 context。

### 通用测试任务

读取一份合成材料 → 在受限范围生成变化/摘要文件 → 读取并确认结果。分别测试 Deny、Approve、Stop、断连/重启、非法文件范围、重复命令和不支持能力。两实现需满足相同任务后果，不要求相同文字或相同原生 tool 名。

如完整 native Runtime 无法落实所需权限/审批，先完成只读有界 probe，但**只读 probe 不能签署需要写入的完整任务等价**。要么补齐隔离/适配，要么保持节点二未完全通过并明示覆盖，不靠降低断言冒绿。

### 通过证据

两套不同运行实现、可回退的 Pi 路径、同一 CW 外层任务/权限/GUI 合同、原生状态各自归属、切换后旧 late event/approval 不污染新 generation、未知效果不重发。普通任务替换证明在这里完成；同 Expert/同 Core 的工作连续性放节点三。

## 节点三：Spark / Attention / Expert 的自研工作闭环

### 目标与实现

按 [04](04-ROLE-COMPOSITIONS.md)完成“资料版本更新核查”小场景。自研 Spark 与 Attention 的运行组合，优先使用 Pi core 提供的基础能力；复用可用的会话/工具设施，不把重写通用 loop 当里程碑。

将来源 refs、授权、候选、verifier 和 Attention 提示接到现 owner；Expert 按工作合同工作。Work Compiler 只提取该场景需要的确定性 prepare，不先建全平台。资源引用/保留沿 RD-007；Skill 提案需要时沿 BE-6/7，而不是顺带交付全插件市场。

### 通过证据

Spark 准备准确版本与 coverage；Expert 反查原文/修正遗漏；Attention 只升级需要处理之处；人作正式决定；源更新使相应判断进入重新核查而不是偷偷沿用；新 Session/已验证 Runtime 接手同一 Matter。

同 Expert 包字节、同 Core 提交合同跨 Runtime 的证明在此完成。DRT-04 比较模型/profile/执行厚度与人工介入，不作为 Spark 自研的预先准入。周期调度、并发扩展、自动治理后置到一次闭环已被证明之后。

## PR / DRT 重归位

| 旧卡或责任 | 本轮落位 | 依赖解释 |
|---|---|---|
| P00 + 文档拆分 | 节点前 | 采用新排序，固定支持范围和来源，不实施全仓重命名 |
| P01/P02/P02b | 节点一开放 MCP 时必须；否则关闭能力后登记后续 | 正确性取决于暴露路径，不作为全部无关任务的机械前置 |
| DRT-02 + DS 最小适配 | 节点一 | 当前 SDK 的协议与 GUI 实链先跑通；涉及解耦才抽 P03 最小片 |
| P03 / DRT-01 | 节点一清账；节点二正式替换前完成 | 不是一切 GUI 测试的前提；却是真替换的接口门 |
| P04a/P04b | 节点二 | 应用组合与通用运行分开，不迁 Core schema |
| P05/P06 | 节点一最小绑定/输入与权限证据；节点二/三补必要通用部分 | 避免先造完整 Compiler 再运行 |
| P11 | 每个节点的真实前端增量 | 不等所有后台积压全部完工才消费，也不造假后端 |
| P12 有界接受 | 每节点分别记录范围 | 原完整 P12 和 G1–G5 不自动关闭 |
| DRT-03 | 节点二通用任务；节点三同 Expert/同 Core | 两层证明分开，无循环依赖 |
| DRT-04 | 节点三功能正确后的 profile/成本评估 | 不决定 Spark 是否自研 |
| P07–P10 / RD-006/007 / BE-6/7 | 由各节点实际消费者触发 | 保留原权威/迁移/权限合同，不一揽子开工 |

## 文档落位

`engineering/architecture-runtime-canon.md` 保持概念总入口，只保留定义、owner 与六份专题链接。可拟设 `engineering/architecture/runtime-composition/` 收纳前五份专题；本包第六份作为执行消费稿，回填现 `roadmap.md` 与下一 Harness 节点。所有路径为拟落位，先由接单者查重与确认既有先例，不声称已存在。

`engineering/architecture.md` 只描述实际模块；`current.md` 只记录已发生事项；`app/docs/runtime-foundation.md` 与 turn ownership 文档只写已接通行为；`docs/runtime-control/` 和现 `.d.ts` 维护实际 API。选型 registry/依赖账复用已有位置。不要六份文档各复制一遍任务状态，也不要把本包 plan.json 和仓库 current 双写。

## 派工与回退

后端唯一 writer 串行修改 service/store/control-plane；前端在冻结必要 DTO 后消费；只读资料、fixture 设计与独立检查可以并行。新 adapter、旧实现提取、依赖升级和数据迁移分别提交，避免无法归因。

每片产出 base/implementation SHA、允许路径、支持范围、原始测试、未跑/失败、回退与非作者关系。任何越权、数据损坏、重复外部效果或未知记录丢失阻止相应能力放行；功能不足则缩小真实支持集合或保持节点未完成，不靠漂亮截图掩盖。
