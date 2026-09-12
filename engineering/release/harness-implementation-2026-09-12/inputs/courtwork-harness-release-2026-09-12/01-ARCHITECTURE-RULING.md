# 01 · 从工作不变量到架构选型

## 1. 先定义要保住什么

CourtWork 要交付的不是“一个永远不停的 Agent”，而是：一次工作在参与者、模型、执行器与会话更换之后，来源、有效决定、待办义务和权限边界仍能被重新理解并继续执行。实现手段可以更换，正式事实不能随 runtime 一起迁移或消失。这是本轮选择的评价目标，而不是市场能力或模型质量的经验断言。

从这个目标推出五个不变量：

| 不变量 | 对实现的约束 |
|---|---|
| 判断有效性由明确 owner 决定 | Runtime 输出是 observation/candidate；模型不得直接写 accepted state |
| 外部行动可能已发生，但回执可能丢失 | result/error、效果确定性和取消必须分轴；不能凭 failed 自动重试 |
| 下一次需要的是适用的工作状态，不是所有历史 | context 是有来源版本和授权的编译产物；不是把摘要升格为正式真源 |
| 不同执行器可以有不同原生协议 | 保留 runtime 私有协议状态；只承诺共同工作契约，不伪造原生 session 的任意互转 |
| 能力变化快，工作依据应长期可读 | 把最稳定的边界放在 Core/来源/决定，把 runtime、模型与 profile 放在可替换侧 |

因此，“更换模型”“更换执行内核”“恢复旧执行进程”“新会话接手同一 Matter”是四个不同问题。它们不得共用一个 resume 成功标签。[R04](SOURCES.md#r04)[R13](SOURCES.md#r13)

## 2. 对当前实现的裁定

| 项目 | 本轮核见 | 证据上限与结论 |
|---|---|---|
| 工作状态 owner | DEC-013 指向现 Work Core/事务边界 | 保留其权威，不以重构改变领域模型 [R04](SOURCES.md#r04) |
| Pi 依赖 | 三个 Pi 包固定 0.85.1；MCP client 固定 2.0.0 | 此轮不把升级和提取接缝混在同一 PR [R09](SOURCES.md#r09) |
| Pi 能力收敛 | 现适配使用空 ResourceLoader，关闭默认发现并由 Host 提供工具/上下文 | “使用 coding-agent 包就必然是厚 coding 产品”不成立；现代码已做部分收敛 [R07](SOURCES.md#r07) |
| Runtime 解耦 | service 仍直接 import/open/create SessionManager，并管理原生会话 locator | 接口名称存在不等于依赖已切断 [R05](SOURCES.md#r05) |
| Work 解耦 | createRuntime 无条件构造 WorkCoreOwner | Core-free 普通执行尚不能从此组合根得到证明 [R06](SOURCES.md#r06) |
| MCP 结果 | structuredContent 只在 content 为空时转成文本；isError 直接抛 reported error | 同时含正文和结构化输出会失真；错误分支没有进入现 externalUnknown 路径，须优先修 [R05](SOURCES.md#r05)[R08](SOURCES.md#r08) |
| MCP 目录 | manager 每类 list 仅调用一次，未显式消费 cursor | 实际 2.0.0 SDK 是否自动归并必须用锁定 SDK fixture 证明，不能只由 grep 宣判全路径缺陷 [R03](SOURCES.md#r03)[R08](SOURCES.md#r08) |
| 重启 | service 把中断的活动 Run 结算为 unknown，并过期化待回答问题 | 当前安全恢复理解不是透明恢复执行进程 [R05](SOURCES.md#r05) |
| 发布 | Pages 已发布；真实 provider 与其他产品门仍开放；当前 open PR/Release 查询为空 | 本包不把网站发布、测试数量或无 open PR 解释为产品完成 [R02](SOURCES.md#r02)[R19](SOURCES.md#r19)[R20](SOURCES.md#r20) |

这些判断是固定源码与文档的有界审阅，不是全仓安全审计，也没有覆盖未提交工作。

## 3. 选型矩阵

评价顺序是：治理正确性 → 现有行为保留 → 可证明替换 → 最小新增 owner/协议负担 → 可测的性能与维护收益。没有实测数据时不编制数值打分。

| 方案 | 本轮裁定 | 理由与生效条件 |
|---|---|---|
| 现 Pi AgentSession + CW 控制与工作组合 | **发布前主方案** | 已有实现可用作参照；关闭隐式发现并通过 Runtime Port 隔离，把迁移风险限制在接缝 |
| CW 自研 Run orchestration、Work contribution/Compiler、能力与权限适配 | **现在建设，薄实现** | 这些职责承接自己的产品不变量；优先从已存在代码抽取，不建设全能中台 |
| pi-agent-core/模型 SDK 上的 Spark 薄执行器 | **稳定节点后的实验方案** | 可以保留自研执行能力，但须证明比同 Pi 受限 profile 带来真实收益；不能只比较目录体积 |
| Codex App Server adapter | **真实第二 runtime 的第一 probe** | 官方有双向请求/事件/审批与 thread/turn 生命周期；要核对具体版本并做能力拒绝/事件/恢复映射，不声称今天已兼容 [E02](SOURCES.md#e02) |
| 其他 Harness、Claude 等替代执行后端 | **留在同一扩展位，不在本轮并列施工** | 由真实消费者和受支持接口触发；不把每个名字画成一个已实现 adapter |
| 自研完整通用 Agent loop、完整 session 系统或替换 Pi fork | **本轮不启动** | 会把协议保真、取消、compaction、事件落盘和迁移同时变成新实现，不能解决已经发现的接缝错误 |
| Rust 重构、微服务、通用 MAS/工作流框架迁移 | **本轮不启动** | 当前需证明的是边界，不是语言或部署拓扑；有测量收益与明确消费者后再评审 |

Pi 官方 SDK 的可嵌入和显式资源/工具配置与此路线一致，但当前实现的判断仍以仓库固定 0.85.1 为准，不能把最新文档里的新方法直接写入现运行合同。[E01](SOURCES.md#e01)[R07](SOURCES.md#r07)[R09](SOURCES.md#r09)

## 4. 自研范围不是“写多少行 loop”

### 本轮自研并保有

工作状态与证据规则；Work 应用组合；源版本与授权读者；Run admission/权限交集；输入编译和披露回执；专业候选到正式决定的接口；Attention 的义务/升级边界；用户能够检查真实状态的表面。

Work Compiler 首版是一段有输入、有输出、有版本的 prepare 责任。它收集获准读者的投影，形成 Run Plan；不会接管所有查询、所有 UI 命令，更不会代替 Core 审批。复用现有 context/activation/work adapter，不先造独立 compiler 服务。[R04](SOURCES.md#r04)

### 上游复用并隔离

当前 LLM turn/tool loop、Pi 原生 journal 和 compaction；模型协议编码和传输；MCP 协议实现；未来 Codex 自己的原生执行状态。这里的 adapter 不得私自创建第二份权威 transcript。

### 自研薄执行器的触发条件

只有在受限 Pi profile 与薄执行器的同任务对照中，出现可重现的必要性才扩大：例如锁定 Pi 无法保真所需协议状态、无法实现某项必要的取消/权限不变量，或在同等正确性下持续存在可归因的开销；还要同时提供生命周期、持久化、迁移与回滚成本账。单次更快、模型更聪明、依赖包名称带 coding 都不是触发条件。

## 5. 四职责的落位

Chat 是讨论、引用和形成候选的交互职责；薄检索/connector 不能悄悄成为无界执行环境。Spark 是有界准备、扫描和核查，不因低成本而拥有常驻全库读取权。Expert 是专业契约，runtime 是执行方式。Attention 的状态与关闭权仍在现 owner，推理工作可以换执行器。[R13](SOURCES.md#r13)

首个 Spark 任务建议选“对获准的两个版本生成变化清单与引用”，而非完整研究助理：预算固定，输入 refs 固定，无外发/正式接受，只产候选和 coverage。一次性提交由用户触发；周期调度、自动派工、跨 Matter 扫描另单。此为本轮设计，尚未实施。

不能把四个名字各建一个数据库、各跑一条永续 loop；也不能让它们彼此的摘要成为唯一 memory。Expert 必须能反查原文并质疑 Spark 的遗漏。

## 6. 不可混淆的独立边界

- Core-free 只是不因普通运行而构造/调用 Work Core；不自动产生 projectless Chat，不改变现 Session 身份与 projectId 合同。
- 延迟工作区绑定是外部目录能力的显式绑定，不是把 cwd 设 null，也不是隐式继承最近目录。继续使用托管成果目录；它不是 OS sandbox。[R16](SOURCES.md#r16)
- RD-007 的 content Resource 不等于 Runtime 的 skill/MCP/profile Resource。Library 关联不授予目录访问，更不产生 accepted Artifact。[R17](SOURCES.md#r17)
- Skill proposal、人工导入 Skill 和可执行插件安装是不同消费链。声明式提案可以被人审查，但不能因此执行脚本或放宽工具权限。[R18](SOURCES.md#r18)

## 7. 本轮架构状态

路线采用；边界契约进入施工。真实 SDK/运行时替换/模型质量/产品 release 分别保持待验证。建议把本裁定作为 DEC-013 的 release 前实施附录消费，不改写旧裁决原件，不抢占未分配的 DEC/RD 编号。
