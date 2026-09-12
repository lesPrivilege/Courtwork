# 04 · 研发实验：保留可替换路线，而不预支实现

所有实验现为 not-run。研究编号复用 DRT 和 RD；本文小标题不是新正式队列。模型名字/档位以实验时实际 catalog 和授权连接为准，不把模型命名相近当能力相同。

## 1. DRT-01：双向边界证明

**问题：** 同一工作契约能否不依赖 Pi 原生对象；普通执行能否不依赖 Core 的启动？

**消费：** P03、P04、P05。输入是固定当前接口/fixtures，不重写 loop。成功证据为 import/构造 guard、相同 fixture wire、原生 locator 只在 adapter 内被解释，以及 Core 缺席/Work fail-closed 的实际行为。

**否证：** service 仍能直接操纵原生日志；换 façade 后历史丢失；纯 Chat 转递构造 Core；准备阶段提前外发。发生时修边界，不以新增一个 interface 名称结案。

## 2. DRT-02：模型协议与持久化 probe

**问题：** 通过已锁定 Model Adapter/Runtime owner，能否保真当前专业任务所需的多轮 tool/reasoning 协议，并明确恢复支持上限？

**先做 synthetic：** 多轮含工具结果、必要协议 metadata、流中断、取消、明确失败、进程重启与 metadata 缺席。向真实安装 SDK 的 loopback 送入受控响应，再观察下一次请求和 journal，不能仅测试自己写的 serializer。

区分两种成功：已完成历史能合法开启下一 Run；原 in-flight Run 能否恢复。后者无证据则保持 restart_unknown，而非把前者包装成透明续跑。[R05](SOURCES.md#r05)

**必须固定：** provider 身份与 API 格式、模型/SDK/codec revision、native journal 格式、实际请求/响应 fixture、compaction 设置。不得把 provider 私有协议字段放进 Core/Expert schema，不把私有思考文本做成公开评测素材。

**反例：** 原字段被通用 JSON 投影丢弃；缺字段仍继续；cancel 后工具结果配错 callId；旧 codec 打开新数据；只换 model.api 却未换真实 encoder。

**真实验证：** synthetic 通过后使用用户指定连接、合成非敏感输入和明确调用/费用上限。没有预算不执行。结果进入现模型连接与运行证据，不新建第二 Session 库。

## 3. DRT-03：真实第二 runtime 证明

**选型：** Codex App Server 为本轮选定的下一 probe。依据是官方描述提供长期运行进程、双向请求/通知、审批和 thread/turn 生命周期；具体协议版本、能力和认证必须在开工时再 pin。选它证明独立执行器接入，不是判定它在所有 Work 任务优于 Pi。[E02](SOURCES.md#e02)

**前置：** 自足稳定节点按实际声明范围被非作者接受；Runtime Port/输入和错误合同稳定；禁止把仅第一列 P12-A 自动解释为完整通用 P12。

**最小实验：** 同一合成 NDA Expert 包/输入 source revisions/Work Core 提交合同，由 Pi reference 与 Codex adapter 分别产生候选。比较候选合法性、来源对应、人的接受/退回、停止/审批/缺能力/重启后的解释性，而不是逐字比较生成内容。

**尤其要避免：** 现 fake-openai-loopback 仍运行在 Pi 上。它证明确定性 fixture 和协议路径，不证明换了 execution runtime。一个 deterministic executor 也只能先证明接口的领域契约，真实第二 runtime 还要独立跑完整生命周期。

**映射内容：** CW Run 与 native thread/turn/item 的关系；原生 approval request 到 Host 决策；interrupt 与 settle；事件去重/顺序/断线恢复；native refs；usage/缺失覆盖；所需工具能力如何通过受支持方式接入。

Runtime 做不到的能力必须在 admission 拒绝。无法逐操作施加 CW 授权上限时，减少 profile 范围或保持该 adapter 不可用，不能因为原生 sandbox 开着就推导等价授权。单独 adapter 不复制 Core、Matter lifecycle 或 credential store。

**不做：** 将旧 Pi native messages 直接翻译为“同一进程”；自动迁全量用户会话；扩展成统一网页订阅桥；为一个试验部署 MAS。

## 4. DRT-04：profile 与 Spark 厚度实验

**假设 A：** 同一 Pi runtime 下，面向工作任务的受限 profile 能减少不相关工具/指令负担，且不损伤正确性。

**假设 B：** 在 A 仍有可归因开销时，有界 Spark 执行器比 Pi 受限 profile 更适合某类重复准备工作。

必须先比 A，再决定是否投入 B。B 初版可从同模型 SDK 的固定输入→有限调用→结构/来源校验→候选回执开始；不默认实现通用 subagent、shell、auto-compaction 或跨 session memory。只有任务需要多轮时才引入有界 loop；journal/receipt 继续在原 owner 登记，不另立永久 store。

### 候选实验矩阵

| 组 | 内核/profile | 任务 |
|---|---|---|
| 参照 | Pi 现完整工作 profile | 来源抽取、两个版本 diff、证据核查 |
| A | 同 Pi 的 scoped profile | 同一批字节、同 model、同预算 |
| B（A 后才启动） | 薄 Spark executor | 同一批任务；能力不足明确拒绝，不靠隐藏人工补答 |

真实试验前先冻结任务与 gold、模型/修订、tool/context/profile hash、温度与努力档、失败重试规则、重复次数、预算与停止线。可先用 6 个小型合成任务、每组 3 次重复做探索性对照；这只是建议采样，不是已执行 18 次，也不足以宣称总体统计优越。

**报告：** 任务有效完成、证据覆盖/漏项、错误引用、权限拒绝、人工介入、总延迟、首个可用产物时间、input/output/cache usage 和缺失程度。Host 收到 token 的时间不是 provider decode TPS。若换模型、工具、上下文同时发生，不能把改善归因给 harness 厚度。

**采用规则：** 任何权威/越权/未知效果重放失败先否决，不用平均分抵消。正确性相当后再报告速度/成本及维护负担。未见优势时保留 Pi profile，薄 executor 不升级为默认；不能为证实“Minimal 更好”修改任务集合。

## 5. 后续消费者接入顺序

### RD-007 / LG / DS / BG：优先已有内容资源

先选一个现上传文本和一个已记录 Run 产物：exact revision 保留 → 源/目标双授权下的引用 → 人可查看版本/来源 → Matter 候选与决定保持原合同。复用 LG Intake、ArtifactHistory、Core 各自 owner；索引为投影。首片不等待 DWB，不迁全量文件、不自动 GC、不建全局 Resource Fabric。[R17](SOURCES.md#r17)

成功标准是源改版后旧结论仍可解释，权限撤销后新检索不越权，ACK 丢失先核对，不重复 promotion。未知引用阻断删除；保留、可见、接受分轴。

### RD-006 / DWB / BE-23：目录能力与产品身份分别推进

managed workspace 不变，首版外部目录默认零个，按合同至多一个只读绑定；新 Run 固定 binding revision，访问时重验撤权与路径身份。普通 projectless Chat 要独立冻结 Session 身份/配置/导航恢复，不把 Attention global 身份偷换进 Chat。[R16](SOURCES.md#r16)

此项为独立能力片，不作为 P04 Core-free 的隐性前置。连接目录不自动发现旧 Skill/MCP/AGENTS，不自动 import 到 Library。

### BE-6/7：Agent 声明式 Skill 提案

沿现已裁链：propose 不可执行草稿 → 完整差异/权限后果 → 人批准精确 revision 与批准摘要 → 原 owner CAS apply → 下一 Run 绑定 → runtime_load 精确正文。先冻结 proposal/config/receipt 的 crash-safe 提交与 fail-back，再施工。[R18](SOURCES.md#r18)

它不是新的任意插件管理器；不执行脚本、不改变 provider、不放宽 policy。已有 P10 文件导入的 parser/hash 可复用，提案与配置的 revisions 不能混用。

### Chat Broker / Spark 义务闭环

沿已采用的 governed-loop 边界，先手动触发一次获准集合的只读 prepare/check，留下版本、coverage、unknown 与 candidate；Expert 可反查原文。Attention 只将未闭合与 stale 事项显露出来，仍由原 owner 关闭。[R13](SOURCES.md#r13)

第二步才研究重复任务键、频率、预算、公平调度、撤权和僵尸任务恢复。scheduler 不负责创造义务/决定，Spark 核查 supported 也不等于义务完成。这些状态有现 owner，不能新建“后台 Agent memory”绕过去。

## 6. 研究的统一退出条件

每项交付反例、固定版本、输入覆盖、raw evidence 与采用/不采用结论。没有优势也是有效结果。真实消费者消失、需要新增不相称的平台、开始修改 Core 来迎合外部 runtime，或无法维持原数据恢复边界时，停止扩张并回到更小接缝。
