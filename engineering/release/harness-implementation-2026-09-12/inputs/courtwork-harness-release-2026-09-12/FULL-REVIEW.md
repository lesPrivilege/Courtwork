# CourtWork · Release 前 Harness 架构裁定与下一轮实施方案

2026-09-12 / 固定基线 `1ac28980c4877f4a86adf586aeb1b66980e23504`。

这是可完整消费的本轮正文，代码实现和产品接受仍分别待执行。具体证据上限见末章来源。

---

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

因此，“更换模型”“更换执行内核”“恢复旧执行进程”“新会话接手同一 Matter”是四个不同问题。它们不得共用一个 resume 成功标签。[R04](#r04)[R13](#r13)

## 2. 对当前实现的裁定

| 项目 | 本轮核见 | 证据上限与结论 |
|---|---|---|
| 工作状态 owner | DEC-013 指向现 Work Core/事务边界 | 保留其权威，不以重构改变领域模型 [R04](#r04) |
| Pi 依赖 | 三个 Pi 包固定 0.85.1；MCP client 固定 2.0.0 | 此轮不把升级和提取接缝混在同一 PR [R09](#r09) |
| Pi 能力收敛 | 现适配使用空 ResourceLoader，关闭默认发现并由 Host 提供工具/上下文 | “使用 coding-agent 包就必然是厚 coding 产品”不成立；现代码已做部分收敛 [R07](#r07) |
| Runtime 解耦 | service 仍直接 import/open/create SessionManager，并管理原生会话 locator | 接口名称存在不等于依赖已切断 [R05](#r05) |
| Work 解耦 | createRuntime 无条件构造 WorkCoreOwner | Core-free 普通执行尚不能从此组合根得到证明 [R06](#r06) |
| MCP 结果 | structuredContent 只在 content 为空时转成文本；isError 直接抛 reported error | 同时含正文和结构化输出会失真；错误分支没有进入现 externalUnknown 路径，须优先修 [R05](#r05)[R08](#r08) |
| MCP 目录 | manager 每类 list 仅调用一次，未显式消费 cursor | 实际 2.0.0 SDK 是否自动归并必须用锁定 SDK fixture 证明，不能只由 grep 宣判全路径缺陷 [R03](#r03)[R08](#r08) |
| 重启 | service 把中断的活动 Run 结算为 unknown，并过期化待回答问题 | 当前安全恢复理解不是透明恢复执行进程 [R05](#r05) |
| 发布 | Pages 已发布；真实 provider 与其他产品门仍开放；当前 open PR/Release 查询为空 | 本包不把网站发布、测试数量或无 open PR 解释为产品完成 [R02](#r02)[R19](#r19)[R20](#r20) |

这些判断是固定源码与文档的有界审阅，不是全仓安全审计，也没有覆盖未提交工作。

## 3. 选型矩阵

评价顺序是：治理正确性 → 现有行为保留 → 可证明替换 → 最小新增 owner/协议负担 → 可测的性能与维护收益。没有实测数据时不编制数值打分。

| 方案 | 本轮裁定 | 理由与生效条件 |
|---|---|---|
| 现 Pi AgentSession + CW 控制与工作组合 | **发布前主方案** | 已有实现可用作参照；关闭隐式发现并通过 Runtime Port 隔离，把迁移风险限制在接缝 |
| CW 自研 Run orchestration、Work contribution/Compiler、能力与权限适配 | **现在建设，薄实现** | 这些职责承接自己的产品不变量；优先从已存在代码抽取，不建设全能中台 |
| pi-agent-core/模型 SDK 上的 Spark 薄执行器 | **稳定节点后的实验方案** | 可以保留自研执行能力，但须证明比同 Pi 受限 profile 带来真实收益；不能只比较目录体积 |
| Codex App Server adapter | **真实第二 runtime 的第一 probe** | 官方有双向请求/事件/审批与 thread/turn 生命周期；要核对具体版本并做能力拒绝/事件/恢复映射，不声称今天已兼容 [E02](#e02) |
| 其他 Harness、Claude 等替代执行后端 | **留在同一扩展位，不在本轮并列施工** | 由真实消费者和受支持接口触发；不把每个名字画成一个已实现 adapter |
| 自研完整通用 Agent loop、完整 session 系统或替换 Pi fork | **本轮不启动** | 会把协议保真、取消、compaction、事件落盘和迁移同时变成新实现，不能解决已经发现的接缝错误 |
| Rust 重构、微服务、通用 MAS/工作流框架迁移 | **本轮不启动** | 当前需证明的是边界，不是语言或部署拓扑；有测量收益与明确消费者后再评审 |

Pi 官方 SDK 的可嵌入和显式资源/工具配置与此路线一致，但当前实现的判断仍以仓库固定 0.85.1 为准，不能把最新文档里的新方法直接写入现运行合同。[E01](#e01)[R07](#r07)[R09](#r09)

## 4. 自研范围不是“写多少行 loop”

### 本轮自研并保有

工作状态与证据规则；Work 应用组合；源版本与授权读者；Run admission/权限交集；输入编译和披露回执；专业候选到正式决定的接口；Attention 的义务/升级边界；用户能够检查真实状态的表面。

Work Compiler 首版是一段有输入、有输出、有版本的 prepare 责任。它收集获准读者的投影，形成 Run Plan；不会接管所有查询、所有 UI 命令，更不会代替 Core 审批。复用现有 context/activation/work adapter，不先造独立 compiler 服务。[R04](#r04)

### 上游复用并隔离

当前 LLM turn/tool loop、Pi 原生 journal 和 compaction；模型协议编码和传输；MCP 协议实现；未来 Codex 自己的原生执行状态。这里的 adapter 不得私自创建第二份权威 transcript。

### 自研薄执行器的触发条件

只有在受限 Pi profile 与薄执行器的同任务对照中，出现可重现的必要性才扩大：例如锁定 Pi 无法保真所需协议状态、无法实现某项必要的取消/权限不变量，或在同等正确性下持续存在可归因的开销；还要同时提供生命周期、持久化、迁移与回滚成本账。单次更快、模型更聪明、依赖包名称带 coding 都不是触发条件。

## 5. 四职责的落位

Chat 是讨论、引用和形成候选的交互职责；薄检索/connector 不能悄悄成为无界执行环境。Spark 是有界准备、扫描和核查，不因低成本而拥有常驻全库读取权。Expert 是专业契约，runtime 是执行方式。Attention 的状态与关闭权仍在现 owner，推理工作可以换执行器。[R13](#r13)

首个 Spark 任务建议选“对获准的两个版本生成变化清单与引用”，而非完整研究助理：预算固定，输入 refs 固定，无外发/正式接受，只产候选和 coverage。一次性提交由用户触发；周期调度、自动派工、跨 Matter 扫描另单。此为本轮设计，尚未实施。

不能把四个名字各建一个数据库、各跑一条永续 loop；也不能让它们彼此的摘要成为唯一 memory。Expert 必须能反查原文并质疑 Spark 的遗漏。

## 6. 不可混淆的独立边界

- Core-free 只是不因普通运行而构造/调用 Work Core；不自动产生 projectless Chat，不改变现 Session 身份与 projectId 合同。
- 延迟工作区绑定是外部目录能力的显式绑定，不是把 cwd 设 null，也不是隐式继承最近目录。继续使用托管成果目录；它不是 OS sandbox。[R16](#r16)
- RD-007 的 content Resource 不等于 Runtime 的 skill/MCP/profile Resource。Library 关联不授予目录访问，更不产生 accepted Artifact。[R17](#r17)
- Skill proposal、人工导入 Skill 和可执行插件安装是不同消费链。声明式提案可以被人审查，但不能因此执行脚本或放宽工具权限。[R18](#r18)

## 7. 本轮架构状态

路线采用；边界契约进入施工。真实 SDK/运行时替换/模型质量/产品 release 分别保持待验证。建议把本裁定作为 DEC-013 的 release 前实施附录消费，不改写旧裁决原件，不抢占未分配的 DEC/RD 编号。


---

# 02 · 两条解耦线、运行契约与故障语义

本文件是目标合同草案，不是新增 API 已存在的声明。字段必须先与当前 DTO 对账，再由唯一 owner 冻结；优先兼容提取，不先迁数据。[R03](#r03)[R04](#r04)

## 1. 依赖图

```text
Work Surface / Chat Surface
        │ 意图与检查；不拥有正式权威
        ▼
Host application / Run admission ─────── Human decision ──► Work API / Core
        │                      ▲
        │ ApplicationContribution（可缺席）
        ▼                      │
Work prepare / Compiler ◄── 获准来源、Matter 投影、Expert / policy
        │ frozen Run Plan
        ▼
Runtime Port ──► Pi adapter（现参照） / 独立 runtime adapter（未来）
        │                     │
        │ scoped capability   └── Native protocol journal / codec
        ▼
Tool / Model / Environment boundary
        │ observations / candidates / effect receipts
        └──────────────────► 对应原 owner
```

这是模块化单体的责任图，不要求新建这些目录，更不要求服务拆分。控制、查询和正式决定不必绕行 Compiler。

## 2. 解耦线 A：Host 与 Pi 原生 session

当前 seam 是 service 的 `#ensureHostSession`、SessionManager import/open/create 和后续 native handle 生命周期。[R05](#r05)

目标是 adapter 持有 Pi 对象，Host 只持 opaque locator 与能力事实。`ModelDriver` 的身份、catalog、凭据来源、协议选择是独立 facet，不塞入 Expert。模型参数不能指定 actor、Session 或绕开绑定身份。

最小设计伪接口如下；它不是对所有 runtime 的完整公分母，也不预设所有能力都为 true：

```ts
// PROPOSED contract sketch, not implemented SDK code.
interface RuntimePort {
  capabilities(): CapabilityFacts;
  openConversation(locator: OpaqueNativeLocator | null): Promise<ConversationRef>;
  prepareRun(plan: FrozenRunPlan, conversation: ConversationRef): Promise<PreparedRun>;
  inspectRecovery(locator: OpaqueNativeLocator): Promise<RecoveryFacts>;
}
interface PreparedRun {
  // prepare 不外发模型请求，不执行工具。
  start(): Promise<void>;
  interrupt(reason: string): Promise<InterruptReceipt>;
  settled: Promise<RuntimeOutcome>;
}
// steer / native resume / fork / context reset 是按 adapter 公开的可选 facet。
// unsupported 必须在相应动作发生前被明确拒绝，不伪造实现。
```

保留既有顺序：受串行保护的 `commandId`/single-active-run admission → 取得唯一 Run ownership → 准备并绑定 native handle/输入证据 → 确认撤销状态 → start。不能为接口整齐，把 native 创建或 provider 请求提前到幂等仲裁之前。[R05](#r05)[R10](#r10)

作者需证明旧 façade 与新 adapter 的 fixture wire、工具顺序、事件与结算等价。允许随机 ID/时间戳规范化，但不能把影响含义的 prompt 或 tool schema 差异从比较中抹掉。端口完成不需要升级 Pi、改 journal 路径或重写历史 adapterId。

## 3. 解耦线 B：普通 Harness 与 Work application

现 `createRuntime` 的 Core 构造是应用组合决策，不应成为所有运行的必需依赖。[R06](#r06)

提取 `WorkApplication`，把现 Work/Attention 工具、角色贡献与专业 finish/reconcile 留在该侧；新增纯 Harness 构造路径。旧完整应用入口和 HTTP shape 保留。第一片只提 façade，第二片切组合，分别通过行为测试。

ApplicationContribution 提供 scoped context/tools、关闭 admission、finish/reconcile 等窄操作；不能拿到裸 Core store 全量写权。正式 human decision 继续走现认证和 Core 命令，不暴露成模型工具。缺席时纯运行可用；已有 workRef 的运行必须显式 `work_unavailable`，不偷偷退成无绑定聊天并假装完成。

**必须测转递依赖**：纯入口 import、构造、启动和普通运行都不能读取/启动 Core。这个门可用阻断 Core constructor/bridge 的 fixture 证明；但它不要求卸载 Python 或重构全仓。现 project 身份、managed workspace、配置/导航不在此片顺带改变。

## 4. Run Plan：冻结的是证据与要求，不是永远有效的权限

首版只冻结已经有消费者的最小字段族：

| 字段族 | 要证明什么 |
|---|---|
| identity | runId、commandId、Session、工作绑定；由可信 Host 建立 |
| selection | requested/effective/bound 的 runtime、model、profile 身份与 revision |
| input sources | source ref/version/hash、获准读取范围、必要的 coverage/unknown |
| compiler | compiler revision、稳定指令贡献和生成输入的版本 |
| capabilities | 实际广告工具及 schema hash；要求、支持事实与缺失原因 |
| grants | 当前授权引用、作用域、动作限制；执行时重新检查撤权 |
| budget | 最大轮次/调用、deadline、读取/输出预算；token 与 chars 分开 |
| output contract | 候选/观察类型、证据与 verifier 要求；不赋予 accepted 权 |
| native recovery | opaque locator、runtime/codec revision、恢复支持与缺席原因 |

必要的作用域信息保留，不把 JSON Schema 当作安全策略。许可集合取交集：用户当前授权 ∩ 宿主政策 ∩ 工作范围 ∩ profile ∩ runtime 实际支持；文本中的 allowed-tools 或“忽略规则”不能改变这个集合。

## 5. 输入证据的三个层次

`prepared` 证明 Host 编译/准备了什么；`submitted` 证明 adapter 在哪次请求边界实际发送了什么；模型是否真正利用某条信息需另行评测，不能由前两者推导。

原生 journal 是唯一原生历史 owner。Run 输入证据可引用其稳定位置，并保存必要的系统/工具/贡献 blob 和摘要 hash，避免每次复制全部 transcript。对隐私敏感原文按现数据域保留，不写公开日志；不采集或展示私有 chain-of-thought。重放必需的 provider 私有协议字段只在受限 codec/native owner 内保真，不转成通用记忆。

快照数据准备失败不得继续启动付费请求。已外发而 submitted 回执写入失败的窗口不能被伪记为 never-sent；需留下 unknown-disclosure 状态或可查恢复线索，停止后续动作并复核。一次 Run 内动态加载的正文、tool 结果及 compaction 的后续请求也要有有界来源增量，不能拿首个 system 字符数代表整轮所有模型输入。

历史无字段返回 partial/unavailable，不能用当前配置伪造旧输入。字符长度不是 token；provider 报告的 usage、Host 观测时间、估算值分别标记。[R10](#r10)

## 6. MCP：结果与效果分轴

下列是判别语义，不强制立即加三张新表。沿现 onUnknown、notice、Run status 与 adapter 结果扩展最少字段。[R05](#r05)[R08](#r08)

| 可见情形 | 工具结果 | 外部效果 | 默认恢复动作 |
|---|---|---|---|
| 参数/权限在本地派发前拒绝 | rejected | 有证明的 none | 修正请求后可新建合法动作 |
| 已派发且工具返回成功 | success | 由具体回执证明的效果；成功本身不等于 Core 接受 | 正常进入下一校验/候选步骤 |
| 已派发返回 isError，效果无证据 | error | unknown | 记录精确 callId，关闭后续相应工具 admission，先核对，不自动重发 |
| Host 可证明只读的调用返回 error | error | 无状态变更；读取/网络披露仍可能已发生 | 不把“无写效果”说成未披露；按错误与权限策略处理 |
| 已派发但超时、断连、取消或回执丢失 | unknown/cancelled | unknown | 保留不确定，禁止当作已回滚 |

实现要区分 not_dispatched/dispatched/result_received，以及结果状态与 effect certainty。`isError` 不天然证明无副作用；远端自报 readOnlyHint 不授予可信只读证明。未知效果的清理需要原 owner 的明确核对结果，context reset、UI 已读或新模型会话不能清掉它。

目录发现使用**实际安装 SDK + 本地 loopback server**验证：legacy 与宣称支持的 modern 分别测。若 SDK 本已合并，则不要重复叠分页循环；修补 Host 仍缺的上限、coverage 和失效竞态。需要完整或明确失败的目录快照；第二页失败、重复/循环 cursor、跨页重名、超量、旧连接晚到均不能发布 healthy 截短集合。

保留 `content` 与 `structuredContent` 的共存结果、工具错误正文及所需来源/版本信息。结构化结果按所用协议/schema 校验，不能一律假定为 object 或用自由 JSON 文本代替有类型数据。UI/model 投影可以裁切，但原始有界证据与 unsupported content 状态应保留；不把不支持的媒体假装渲染成功。

## 7. 取消、重启与替换

取消先关闭后续 admission，再向实际 executor 请求中断，等待主事件链/写者 drain 与真实 settle；取消回执不等于工具回滚。保存失败、late event、extension finish/reconcile 失败和无法确认停止都必须有明确状态，不能提前释放仍有 writer 的锁。

当前重启安全路径是 active Run → unknown，不是恢复到继续执行同一调用。[R05](#r05) 本轮先保持该语义。可分别添加：①原进程/原协议可支持的恢复；②同一工作的新 Run 接手。二者 UI 和合同分开。

第二 runtime 的接手读取获准 Matter/source/obligation refs，编译新输入并生成新 native conversation；不把 Pi 的协议私有 messages 或 compaction summary 强行交给 Codex。换执行器不要求模型输出逐字相同，但要求相同 Expert 字节与 Core 提交合同不变，权威边界和故障语义仍成立。

## 8. 反例优先的验收矩阵

Runtime：准备中取消、问题待答中取消、tool 已发未回、compaction 中取消、主事件落盘失败、terminal 前崩溃、native journal 缺失、old approval 晚到、重复 commandId。

Work：Core 不可用时纯 Chat 正常；已绑定 Work 明确拒绝；候选不被自动接受；版本变更使旧审批失效；重复决定不重复生效；恢复不能制造已接受成果。

权限：scope 切换、撤权、旧 source/index、跨 Session 引用、profile 中有名但实际 runtime 不支持、模型伪造 actor。所有测试使用独立合成数据；禁止为验负例触碰真实副作用服务。


---

# 03 · 下一轮 PR 编排与可施工边界

## 1. 唯一主线与发布范围

沿既有 roadmap：基础 GUI/通用执行正确性 → 有明确支持范围的稳定节点 → 自研编排合流与独立 runtime 替换。不把所有新研究变成当前 release 的前置。[R12](#r12)

以下编号沿原 HPR 卡，后缀仅拆分施工，不是 GitHub PR 号。全部尚未创建、未派发。P00 把本表回填既有下一节点/roadmap；没有第二份总路线。

**第一实施列：** P00 → P01 → P02 → P02b → P03 → P04a → P04b → P05 → P06 → P11-A → P12-A。

**第二能力列：** P07→P08，P09，P10，随后 P11-B 与完整 P12。它们复用第一列的接缝。完整通用能力节点不能用 P12-A 代替；本次既有 G1–G5 产品门也不能被 P12-A 自动关闭。

首个 release 仍按现有“合成专业材料 → 真实执行 → 人的正式决定 → 新 Session 接续”范围验收。memory CRUD、web_fetch、目录导入等只有在该 release 声称可用时，才必须将对应能力列连同 UI/负例一起完成；否则明确保持 unavailable/planned，不借“通用”二字暗示完备。[R14](#r14)

每个 PR 至少分清：contract、实现、自测、非作者核验、集成；源码重构与状态迁移不混提交。所有新增文件下文标为“拟新增”，不能当作已存在的测试命令。

## 2. 第一实施列

### P00 · 固定本轮基线与处置账

**Owner：** Astra 集成者。**依赖：** 无。

**产出：** 固定当前 main/工作区/lock/运行 schema；核对本包与实际 HEAD 差异；把旧 24 HPRO 按 accept/amend/defer/reject/obsolete/blocked 逐项处置到现路径和卡片。原收到包是 f1700fb0 的 13 卡，后版缺附件不进入本轮完成分母。[R03](#r03)[R10](#r10)[R11](#r11)

**路径：** 既有 `engineering/release/harness-next-node-2026-09-12/README.md`、`engineering/architecture-runtime-canon.md`、`engineering/roadmap.md`、`engineering/current.md`；本次 intake 与 evidence 的新目录。旧 received 原件只读。分配 schema 的权力留在唯一 RuntimeStore owner，不预占 schema5/6。

**验收：** 固定代码与依赖；每一条公开能力有 owner/实现/证据/缺口；每张采用卡有唯一 writer。先跑现基线，记录已有失败。不能只新增一份清单就宣称基线已绿。

**停点：** 产品接缝已变化但未 diff，归档候选误作 main，来源/hash 不一致，仍无法确定当前 schema/writer。文档回退仅撤销采用标记，保留来源原件。

### P01 · 锁定 SDK 的 MCP 目录完整性

**Owner：** 后端唯一 writer。**依赖：** P00。

**路径：** `app/runtime/mcp-manager.mjs`、必要的 `control-plane.mjs`/`control-contract.d.ts`、`docs/runtime-control/api.md`；拟新增 `app/tests/hpr_p01.test.mjs` 和 loopback fixture。

先提交能区分“SDK 自动归并”和“Host 需翻页”的真实安装 SDK 测试，再提交产品修正。测试现代与 legacy 实际支持路径，固定依赖 lock 和协议。完整列表原子发布；连接身份/epoch 与 config hash 不一致的晚到响应不能覆盖新连接。

**必须负例：** 两页、空中间页、第二页失败、重复/循环 cursor、重复名字、总量/字节超限、断连/重连竞态。任何不完整不能 healthy/exposed。

**回退：** 不迁 Core；失败目录不可调用，显式重连。**停点：** 只有 stub/reference 函数、没有实际 SDK；上限只在巨大对象分配后检查却声称流式内存安全。

### P02 · MCP 错误与效果结算

**Owner：** 后端唯一 writer。**依赖：** P01。

**路径：** `app/runtime/mcp-manager.mjs`、`app/server/service.mjs`、运行控制契约；拟新增 `app/tests/hpr_p02.test.mjs`。

保留“已收到业务错误”和“外部效果未知”两条事实。复用现 externalUnknown/notice/Run unknown 和 admission fence；带精确 callId、server/tool、绑定版本与 failureKind，不保存敏感参数原文。只有可信 Host 证据能证明 no effect；远端 hint 不够。

**必须负例：** 先执行副作用再返回 isError；断连；本地派发前拒绝；收到错误后模型尝试重发；取消后晚到；unknown 回执落盘失败；重启不重发。成功标准是整条 Run 的结算与拒绝行为，不是报错字符串。

**回退：** 新 unknown 记录仍保留，不改写为 safe-to-retry。**停点：** 取消/reset 清掉未知效果；onUnknown 失败后仍开放工具；同 callId 的关系丢失。

### P02b · MCP 结果保真与错误正文

**来源：** 当前代码确认的补充，不伪称原 P02 已覆盖全部 structuredContent 问题。[R08](#r08)

**Owner / 依赖：** 同一后端 writer；P02。

**路径：** `mcp-manager.mjs`、必要的 adapter/tool-result 类型与测试；拟新增 `app/tests/hpr_p02b.test.mjs`。若原 UI 无法表达 unsupported/partial，由 P11-A 消费，不在此越界改前端。

同时保留 content 与 structuredContent；保存必要且有界的原结果证据，单独生成 model/UI 投影；错误也保留受控的错误正文/结构，不把内容一律扔成通用 Error。结果/结构校验使用实际 SDK 协议，不硬编码旧版本 JSON 形状。

**必须负例：** 正文与结构共存、结构单独存在、合法协议中的不同 JSON 类型、未知内容块、错误含结构、输出校验失败、超限、裁切后仍可回源、私密字段不入公共日志。

**回退 / 停点：** 历史无数据不伪补；投影失败明确 partial/unavailable。出现无限 raw dump、隐私泄漏或需要第二 transcript 才能保真时停线拆单。

### P03 · Pi native seam 提取 / DRT-01 实现消费

**Owner / 依赖：** 后端唯一 writer；P02b。

**路径：** `app/runtime/pi-session-runtime.mjs`、`app/server/service.mjs`；拟新增 `app/runtime/pi-runtime-adapter.mjs`、`app/runtime/runtime-port.d.ts`、`app/tests/hpr_p03.test.mjs`。

Host 不再直接 open/create Pi SessionManager；native locator 由 adapter 解释。保持现 provider identity、credential lane、adapterId 历史解释、native journal 路径和工具发现限制。prepare 不触发网络；获唯一 ownership 后才 start。

**必须验收：** 旧/新 fixture wire 与事件/结果等价；取消 sticky；event drain；unknown 保留；历史打开失败不能偷偷新开空 session。import guard 必须能发现 service 重新引入 Pi native 类型/操作。

**回退：** 纯代码 façade 回退，不迁 journal。**停点：** 必须升级 Pi、变更 model routing、迁移数据或无法解释 prompt/tool 差异。共享 `service.mjs` 不并行派第二 writer。

### P04a · 提取 Work application façade

**Owner / 依赖：** 后端唯一 writer；P03。

**路径：** `app/server/service.mjs`、`app/runtime/extension-registry.mjs`、现 Work/Attention 工具接缝；拟新增 `app/server/work-application.mjs` 和 P04a 测试。

只移动明确属于 Work 的 context/tool/finish/reconcile 贡献，普通 Run 流程保留。旧 API 和认证/权限决策不变。ApplicationContribution 不得持有任意写 store 的接口，正式人类决定不能变成模型方法。

**验收：** 现 Work fixture 的候选、版本、finish/close/reconcile、late event 完全保持。**回退：** 无 schema 变化，退 façade 提取。**停点：** 为提取改 Core 领域逻辑、合并 Attention 状态机、让应用 hook 直接批量写正式状态。

### P04b · Core-free Harness 组合根

**Owner / 依赖：** 后端唯一 writer；P04a。

**路径：** `app/server/runtime.mjs`、必要 service/registry 构造；拟新增 `app/server/harness-runtime.mjs` 与 P04b 测试。保留旧 createRuntime 完整应用 façade。

普通 Harness 的 import、构造、启动与运行均不启动/读 Core。Work 通过明确 composition 接入。已有 workRef 但 Core 不可用的运行明确拒绝，不降级成假专业成功。

**验收：** Core constructor/bridge 失败时纯 Chat 能运行；Work admission 硬拒；关闭顺序与锁不回退；纯入口不发生转递 Core import/构造。**非目标：** projectless Chat、无 cwd、目录迁移和卸载全部 Python。

**回退：** 恢复旧组合入口；数据不变。**停点：** 双 session store、取消时释放活跃 writer、纯入口仍启动 Core、需要 Core schema 迁移。

### P05 · 真实输入证据与历史解释

**Owner / 依赖：** RuntimeStore 唯一 owner；P04b。

**路径：** `app/server/store.mjs`/`service.mjs`、Pi adapter、运行控制合同；拟新增 `app/runtime/run-inputs.mjs`、`app/tests/hpr_p05.test.mjs`。

最小 Run Plan/输入快照采用现字段可表达的部分；prepared 与 submitted 分离，后续 runtime_load/compaction 的输入增量可追踪。必要 blob 先持久，再发布引用。保存 native ref 而非完整 transcript 镜像；无证据的历史明确 partial。

**必须负例：** blob 有/metadata 无、metadata 有但尚未 start、外发后回执落盘失败、wrong Session、撤权、缺 journal、动态加载新内容、稳定配置前缀不漂移。

**迁移：** 优先 additive；确需 schema 时由 owner 统一分配、strict reader、完整备份、旧 host 拒新。**停点：** 当前配置冒充历史、字符数冒充 token、快照失败继续请求、私密内容进入 Git。

### P06 · 指令层次、能力拒绝与 compaction 回归

**Owner / 依赖：** 后端唯一 writer；P05。

**路径：** 现 control-plane/control-contract、adapter/service/Work façade、运行控制 docs；拟新增 `app/tests/hpr_p06.test.mjs`。

固定可信系统/项目/Session/任务贡献与外部资料的地位；自然语言冲突不假装已自动裁决。权限不采用 last-wins。active Run 不热换 profile；requested/effective/bound 不混显示。当前实现若已满足某条只补证据，不为术语重造 prompt 平台。

**验收：** fresh/continued/compacted 三条真实 fixture 请求；旧 summary 不吞新授权；scope 不串；steer/fork/resume 不支持则明确拒绝。**回退：** 编译策略变更记版本，仅影响新 Run。**停点：** 删除 native 必要消息、模糊禁止规则或用模型自述代替实际 wire。

### P11-A · 第一列的最小前端消费

**Owner / 依赖：** 既有前端 writer；P06 及本列 DTO 已冻结。

**路径：** 优先现 `app/web/runtime-view.mjs` 与已有 Inspector/状态组件；拟新增对应测试和有界 browser gates。要新增静态路径时由后端 owner 单独准入，不由前端越权改 server。

仅展示：实际 runtime/profile、当前与历史 input、prepared/submitted/partial、MCP incomplete/error/effect unknown、unsupported 解释。复用现 Settings/Context/Run detail；不新增全局导航、巨型关系图或假开关。

**验收：** scope 快切晚到响应、active 修改拒绝、错误恢复、键盘/焦点、窄屏与 200% 主路径。**回退：** 老后端明确 unavailable，不能用样例冒真状态。

### P12-A · 第一列有界独立接受

**Owner / 依赖：** 非作者核验者；P11-A。

**产出：** 固定 SHA/lock/环境的基线回归、所有第一列负例、备份恢复与 GUI 证据。它接受的是第一列，不是原 P00–P12 全包，也不把 G1–G5 标为自动 pass。

真正 release 放行还须 05-RELEASE-GATES 的 G1–G5 证据和当前公开能力清单成立。真实 provider 仅走用户已授权的 GUI 配置/预算，不从环境或个人凭据库取 key。

**停点：** 权威、越权、重复外部效果、未记录外发、丢失历史接受字节任一失败；作者冒独验；skip/零用例冒绿；旧数据与新 host 共用。

## 3. 第二能力列：明确保留，不假装随基础完成

| 原卡 | 本轮处置 | 必须连同验证的边界 |
|---|---|---|
| P07 memory_text | 保留，第一列之后按能力声明消费 | 人维护、scope/CAS、exact input；关闭只停止后续注入 |
| P08 clean context | 与 P07 成对设计和发布；不可把 prompt“忽略”当隔离 | 新 native generation、old summary sentinel 不进实际请求；历史仍可读，未知效果/义务不被清掉 |
| P09 web_fetch | 保留独立网络能力片，默认不可用 | 授权/目标/实际 socket、DNS/重定向/限流/解码上限；版本化结果，no cookies/JS/POST；源数据不是指令 |
| P10 workspace Skill intake | 保留显式检查→导入现 registry | hash/TOCTOU/symlink、无 HOME 扫描/安装/脚本执行；不因 allowed-tools 扩权 |
| P11-B | 消费上述实际后端与既有前端 grammar | memory off/reset、web scope、Skill inspected/imported/exposed/loaded 分开 |
| 完整 P12 | 在其实际依赖全部满足后独立接受 | 若要声称原工单定义的自足通用节点，不能只通过 P12-A |

新 BE-6/7 Skill proposal 不是 P10 的改名：一个是 Agent 提案和人工应用事务，一个是获准目录里的精确文件导入。复用 resolver/registry/审批差异部件，不混淆 proposal ledger revision 与 runtime config revision。[R18](#r18)

## 4. 并行边界

允许并行：不改共享产品文件的 source/SDK 探索、负例设计、独立证据核验、固定 DTO 后的前端工作。禁止同时修改 `service.mjs`、`store.mjs`、`control-plane.mjs` 或同一迁移版本；每个可变 owner 一名 writer，main 合流串行。

研究者可以先准备 DRT-02 synthetic fixture，但对主线 adapter 的改动排在 P03/P05 合入后。DRT-03 的真实第二 runtime、Spark 薄执行器与广泛 MAS 不趁本轮重构搭车。

每张 PR 的回执固定：base/implementation SHA、允许路径、输入版本、实现事实、原始测试结果、未跑/失败、迁移/回退、作者与非作者关系、关掉哪个门、仍未关哪个门。模型身份、次数和预算另记，不用“已派单”作为完成证据。


---

# 04 · 研发实验：保留可替换路线，而不预支实现

所有实验现为 not-run。研究编号复用 DRT 和 RD；本文小标题不是新正式队列。模型名字/档位以实验时实际 catalog 和授权连接为准，不把模型命名相近当能力相同。

## 1. DRT-01：双向边界证明

**问题：** 同一工作契约能否不依赖 Pi 原生对象；普通执行能否不依赖 Core 的启动？

**消费：** P03、P04、P05。输入是固定当前接口/fixtures，不重写 loop。成功证据为 import/构造 guard、相同 fixture wire、原生 locator 只在 adapter 内被解释，以及 Core 缺席/Work fail-closed 的实际行为。

**否证：** service 仍能直接操纵原生日志；换 façade 后历史丢失；纯 Chat 转递构造 Core；准备阶段提前外发。发生时修边界，不以新增一个 interface 名称结案。

## 2. DRT-02：模型协议与持久化 probe

**问题：** 通过已锁定 Model Adapter/Runtime owner，能否保真当前专业任务所需的多轮 tool/reasoning 协议，并明确恢复支持上限？

**先做 synthetic：** 多轮含工具结果、必要协议 metadata、流中断、取消、明确失败、进程重启与 metadata 缺席。向真实安装 SDK 的 loopback 送入受控响应，再观察下一次请求和 journal，不能仅测试自己写的 serializer。

区分两种成功：已完成历史能合法开启下一 Run；原 in-flight Run 能否恢复。后者无证据则保持 restart_unknown，而非把前者包装成透明续跑。[R05](#r05)

**必须固定：** provider 身份与 API 格式、模型/SDK/codec revision、native journal 格式、实际请求/响应 fixture、compaction 设置。不得把 provider 私有协议字段放进 Core/Expert schema，不把私有思考文本做成公开评测素材。

**反例：** 原字段被通用 JSON 投影丢弃；缺字段仍继续；cancel 后工具结果配错 callId；旧 codec 打开新数据；只换 model.api 却未换真实 encoder。

**真实验证：** synthetic 通过后使用用户指定连接、合成非敏感输入和明确调用/费用上限。没有预算不执行。结果进入现模型连接与运行证据，不新建第二 Session 库。

## 3. DRT-03：真实第二 runtime 证明

**选型：** Codex App Server 为本轮选定的下一 probe。依据是官方描述提供长期运行进程、双向请求/通知、审批和 thread/turn 生命周期；具体协议版本、能力和认证必须在开工时再 pin。选它证明独立执行器接入，不是判定它在所有 Work 任务优于 Pi。[E02](#e02)

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

先选一个现上传文本和一个已记录 Run 产物：exact revision 保留 → 源/目标双授权下的引用 → 人可查看版本/来源 → Matter 候选与决定保持原合同。复用 LG Intake、ArtifactHistory、Core 各自 owner；索引为投影。首片不等待 DWB，不迁全量文件、不自动 GC、不建全局 Resource Fabric。[R17](#r17)

成功标准是源改版后旧结论仍可解释，权限撤销后新检索不越权，ACK 丢失先核对，不重复 promotion。未知引用阻断删除；保留、可见、接受分轴。

### RD-006 / DWB / BE-23：目录能力与产品身份分别推进

managed workspace 不变，首版外部目录默认零个，按合同至多一个只读绑定；新 Run 固定 binding revision，访问时重验撤权与路径身份。普通 projectless Chat 要独立冻结 Session 身份/配置/导航恢复，不把 Attention global 身份偷换进 Chat。[R16](#r16)

此项为独立能力片，不作为 P04 Core-free 的隐性前置。连接目录不自动发现旧 Skill/MCP/AGENTS，不自动 import 到 Library。

### BE-6/7：Agent 声明式 Skill 提案

沿现已裁链：propose 不可执行草稿 → 完整差异/权限后果 → 人批准精确 revision 与批准摘要 → 原 owner CAS apply → 下一 Run 绑定 → runtime_load 精确正文。先冻结 proposal/config/receipt 的 crash-safe 提交与 fail-back，再施工。[R18](#r18)

它不是新的任意插件管理器；不执行脚本、不改变 provider、不放宽 policy。已有 P10 文件导入的 parser/hash 可复用，提案与配置的 revisions 不能混用。

### Chat Broker / Spark 义务闭环

沿已采用的 governed-loop 边界，先手动触发一次获准集合的只读 prepare/check，留下版本、coverage、unknown 与 candidate；Expert 可反查原文。Attention 只将未闭合与 stale 事项显露出来，仍由原 owner 关闭。[R13](#r13)

第二步才研究重复任务键、频率、预算、公平调度、撤权和僵尸任务恢复。scheduler 不负责创造义务/决定，Spark 核查 supported 也不等于义务完成。这些状态有现 owner，不能新建“后台 Agent memory”绕过去。

## 6. 研究的统一退出条件

每项交付反例、固定版本、输入覆盖、raw evidence 与采用/不采用结论。没有优势也是有效结果。真实消费者消失、需要新增不相称的平台、开始修改 Core 来迎合外部 runtime，或无法维持原数据恢复边界时，停止扩张并回到更小接缝。


---

# 05 · Release 门、证据等级与放行矩阵

## 1. 当前结论

**本轮不签署产品 release 通过。** 这不是否定当前产品，而是本轮只有文档/源码有界审阅，没有真实 provider、GUI 或故障恢复的独立执行证据。仓库也仍把这些门列为开放。[R02](#r02)[R03](#r03)

审阅容器 Node 为 22.16.0，低于仓库要求的 22.19.0；git clone 还因 DNS 失败未取得运行 checkout。代码阅读通过 GitHub connector 完成。本轮未安装依赖、未执行 npm test/smoke、未启动用户 8804、未访问个人 key、未创建远端 PR/Release。历史“793/793”等只能指向原仓库回执，不能填进本轮 testResults。

包内脚本只验证交付文档与计划的完整性，不测试 CourtWork 产品。

## 2. 沿用 G1–G5，不另立低门槛

| 原门 | 最小通过证据 | 本轮新增的核对点 |
|---|---|---|
| G1 独立启动与真实运行 | 固定 clone/README/环境；用户 GUI 配置已授权 provider；至少一条真实模型/工具路径；失败/取消/重启可检查 | 配置“验证成功”不能替代工具任务；prepared/submitted 与实际调用分开；正确标示 runtime 与 model |
| G2 正式工作闭环 | 合成 Inbound NDA 输入/gold；绑定 source revision 的候选；人接受/退回/补证；Decision/Artifact 回执 | 模型不能接受自己；MCP/工具失败不隐藏未知效果；伪 actor、旧版本与重复请求必须拒绝 |
| G3 连续性与界面 | 新 Session 接手同一 Matter 的正式结果/依据/未决；主路径键盘和错误可理解 | 换 session 不等于同一 native 进程恢复；断线或 restart_unknown 不显示透明续跑；不因新 context 丢开放义务 |
| G4 可复现演示 | 原合同要求的 2–4 分钟闭环，合成/可公开来源，真实 UI 与成果可对照 | 不将 fixture、specimen 与真实 provider 画成同一证据；未决与失败不剪成成功 |
| G5 对外事实 | README/Pages/简历每项声称映射到同版本实现与证据，或明确源码等价 | 不声称完整四 Agent 调度、跨 Provider memory、任意 runtime 替换或原生桌面宿主已可用 |

以上来自现产品接受合同。[R14](#r14) 所有门应对应同一产品基线，或记录产品路径 byte/commit 等价；网页 copy-only 更新不自动使所有先前测试失效，也不能覆盖实际产品变更。

## 3. 阶段接受与产品放行分开

P12-A = 本次第一列的独立工程接受。  
完整 P12 = 原通用能力范围在按本轮修订的实际卡片/测试矩阵下被独立接受。  
G1–G5 = 对外产品证据门。

三个结论需要明确对象，不互相代签。完整通用节点尚未接受时，可以继续准确的 experimental 发布面，但不能由 P12-A 得出“所有通用能力完备”。是否发布某项功能，按下面 capability-to-evidence 表判断，不按研究文档是否存在判断。

## 4. 声称触发的附加门

| 对外声称 | 必须额外具备 | 不满足时 |
|---|---|---|
| MCP 可用 | 锁定 SDK 目录完整/失效、结果保真、权限与 unknown settlement | 对应动作不可用或收窄到已验协议/能力，不 healthy 冒绿 |
| 可查看真实 Run 输入 | prepared/submitted/partial 证据及历史版本读取 | 只能显示当前配置，不命名为历史实际输入 |
| 普通偏好可关闭/遗忘 | P07 exact future injection；“隔离旧上下文”另需 P08 sentinel 证明 | 仅说关闭后续注入，不能声称 provider 已忘记 |
| web fetch | P09 网络授权/SSRF/限额/内容处理与版本回执 | 不显示可用按钮，不用偷偷发网代替 |
| Skill 可导入/Agent 可创建 | 文件导入 P10 或 BE-6/7 对应真实链；两者各自验收 | 只保留已有手动能力，不把 draft 当生效 |
| Runtime 可替换 | 同 Expert/同 Core 合同的真实第二 executor 证据 | 只说架构设计为可替换，不把 fake provider 算第二 runtime |
| 项目/目录可不预选 | BE-23 身份合同与 DWB 的实际实现各自成立 | 不能由 Core-free 推导普通 projectless Chat |
| 历史卸载/升级仍可读 | 固定版本数据和 renderer 缺席/升级失败/历史回读证据 | 沿原合同增加对应测试；不把 roadmap 当保证 |

## 5. 硬失败不能被平均分抵消

越权读取/外发/执行；模型获得正式接受权；同 request/command 重放造成重复效果；未知外部效果被清除或误重试；未持久准备就启动模型请求且无恢复依据；丢失已接受成果的确切版本；缺历史却伪造成功；旧 host 打开新 schema 数据；active writer 未停就释放 ownership。任一硬失败使相关能力保持禁用，不能以整体测试成功率补偿。

对输入与输出证据的权限也要测试：来源正文、附件、key 形文本与远端异常不能未经审查写入公开 evidence。合法数据保留和 UI 脱敏是不同动作。

## 6. 真实验证怎样消费现 8 项 prompts

直接沿现 `RUNTIME-VALIDATION.md`，不另造替代脚本。[R15](#r15)

1/2 验普通消息与同 Chat 连续性；3/4 验精确文件写入批准、拒绝和 recorded version；5 检查实际 advertised/exposed 工具而非模型自报；6 必须在确有活动 Run 时停止；7 绑定合成 Work 来源产生候选，人的决定由实际 Review 操作完成；8 用实际产物做 UI 检查，不增加模型调用。

追加一条 G3 场景：在保留同一 Matter 的有效决定/来源/未决后，新建合法 Session 继续；不能只把同一个 Chat 的滚动历史当跨 Session 工作连续性证据。重启场景应检查 unknown 与待核对项，未经证明不自动重发外部工具。

输入失败就保存原 Run：连接/鉴权、模型未调用、宿主拒绝、工具错误与 UI 问题分开；不要用反复提示把失败覆盖成成功。调用上限与真实 provider 权限由用户已有授权或具体实验合同决定，本包没有发生付费消费。

## 7. 备份、迁移与回滚

迁移前确认全部 writers 停止，保存匹配版本的完整数据备份：RuntimeStore、原生 journal、control 配置、source/recorded artifact、Core 及必要的绑定引用。凭据只在用户本机安全备份流程中处理，不进入本包/Git。不能只备 SQLite 就声称完整恢复。

代码回退与数据回退必须成对：pure extraction 可回 façade；数据格式升级后旧 host 必须拒读，不能让新旧进程共用同一数据目录。故障恢复测试使用独立合成目录，保留原始坏现场，不修复 evidence 后再声称没有故障。

## 8. 统一回执结构

```json
{
  "codeCommit": "<actual full SHA>",
  "dependencyLockSha256": "<computed locally>",
  "platform": "<actual OS / Node / Python>",
  "scope": "<exact features and protocols>",
  "fixtureManifest": "<actual refs and hashes>",
  "author": "<implementation author>",
  "reviewer": "<different verifier or explicit missing>",
  "tests": [{"caseId": "<real case>", "status": "pass|fail|not-run|blocked", "rawEvidence": "<path>"}],
  "providerRuns": [],
  "knownFailures": [],
  "productGates": {"G1": "not-run", "G2": "not-run", "G3": "not-run", "G4": "not-run", "G5": "not-run"}
}
```

这是回执模板，不是已生成的产品证据。允许的“无发现”必须附覆盖范围，不能变成全仓无缺陷。


---

# 06 · 文档、PR、RD 与证据的单一消费链

## 1. 不再追加一套平行平台文档

本包是本轮 review/intake 工件。进入仓库后，完整原件保留在一个新的 intake 目录；本地有效结论应回填已存在的 owner 文档。不要把全文复制到多个入口，也不要改写 received 原文。

| 现入口 | 只更新什么 | 不承担什么 |
|---|---|---|
| `engineering/architecture-runtime-canon.md` | DEC-013 的实施附录：选定 Pi、双解耦线、Runtime Port/Run Plan、native state 边界 | 不写全部任务状态、不替 Paper 改版本 |
| `engineering/roadmap.md` | 本轮第一/第二实施列与后续 DRT 的唯一依赖顺序 | 不复制所有 PR 验收细节 |
| `engineering/release/harness-next-node-2026-09-12/README.md` | 从“用户待排候选”更新为本轮已采用卡片和来源；旧缺件边界保留 | 不继续维持另一套总顺序 |
| `engineering/current.md` | 仅在真实发生后登记合同采用、代码合流、测试/发布事实，链接回执 | 不把方案写成已实现、不以 author self-test 冒独验 |
| HPR received 原件与原 mapping | 保持不可变；新 disposition/crosswalk 回指原包与本包 | 不把后版缺件计为已消费、不改旧作者原文 |
| `docs/runtime-control/api.md` 与当前 `.d.ts` | 新增字段/错误/权限/历史语义的唯一有效合同；先 proposed，接线后标 implemented | 不把多个研究稿各自 DTO 都当正式接口 |
| 运行时基础与 turn ownership 文档（P00 从现索引定位） | 已采用代码的 owner/恢复/测试命令差异 | 未复核内容只登记待修，不凭题名重写 |
| RD-006/007 与 BE-6/7 现稿 | 消费依赖、关键接缝、最新实现/未实现边界 | 不扩展成全部资源/插件治理大平台 |
| `evidence/<本轮命名>/` | 精确源码、命令、原始结果、覆盖与非作者关系 | 不写个人 key、不覆盖旧失败日志 |
| README/Pages | 仅在对应 G1–G5/能力证据成立后更新可用范围 | 不从架构图推导自动编排/模型能力收益 |

首次施工不要新占 DEC-014 或 RD-008；需正式编号时先由当前 owner 在全仓查重并分配。

## 2. 文档状态至少分两轴

`decision = adopted / amended / deferred / rejected / blocked`。  
`delivery = proposed / implemented / author-tested / independently-verified / integrated / released`。

采纳一个研究结论不等于它 implemented；代码 integrated 不等于 feature independently-verified；网站 released 不等于 G1–G5 全部通过。只在证据支持的轴上推进，不用一个“accepted”覆盖所有含义。

原 24 HPRO 的逐项清账在 P00 做；本包按 P00–P12 卡片层面提供处置。未全文重验的 HPRO 不能被包级采用自动打成已修复。本包内容完整，不依赖丢失的后版 14 卡/316 项返件。[R03](#r03)[R11](#r11)

## 3. 双向映射

```text
原用户输入 / 固定原包
          ↓ source ref + version/hash（实际取得字节后计算）
本轮裁定条目 / 原 P 卡处置
          ↓ chosen owner + allowed paths + contract
施工 PR（实际编号与 SHA，在创建后补）
          ↓ case IDs + raw evidence
非作者验证 / 集成回执
          ↓ 当前状态 / 发布能力声明
```

每个 output 有去处；每个实施项能回源。无需逐行重复长文，但必须保留原件和稳定引用。本包 `plan.json` 只是这一映射的便携投影，入库后实际状态仍以现 current/专项合同为准，禁止两边手写相互冲突的 done。

## 4. 为 Agent 接手准备的最小阅读集

默认读取 working agreement、current、实际领单、相关 contract、精确来源和测试证据。不要让每个 worker 默认读 Paper 全文、所有研究摘要与所有历史 current 段落。只在争议出现时沿稳定引用下钻。

开始一个 PR 时给出固定基线、允许路径、非目标、输入版本、硬负例与退出条件；代码作者只消费它负责的一片。集成者持有跨卡映射，不把跨 owner 的临时建议变成实现者可自行扩张的授权。

## 5. 文档自身的完结条件

所有链接可解析到固定源或标明 planned；未产生的 PR 不用伪 URL；新增文件明确 proposed；不得把 current 旧段当今天状态。迁移、恢复与 API 合同只有一个 owner。原件、摘要、裁决和最终代码不能混为同一种 artifact。


---

# 给本地集成会话的接单指令

以 Courtwork 唯一 main 为产品线，先读取 AGENTS.md、engineering/current.md、下一 Harness 节点和本包。核对实际 cwd/branch/HEAD/worktree 与其他 writer。审阅基线为 `1ac28980c4877f4a86adf586aeb1b66980e23504`；已经前进则只对相关产品/合同路径做 diff，再判断本轮裁定仍适用的部分。不要 reset/stash 共享工作区，也不恢复 Fresh 为第二开发线。

## 本轮架构结论

采用锁定 Pi 0.85.1 的 reference runtime，先修 MCP 正确性，再抽 Runtime Port 和 WorkApplication/Core-free 组合。Work Core 保留正式权威。当前不启动完整自研 loop、Rust、第二 Session 数据库、全局资源平台或多 Agent scheduler。

## 第一张单

完成 P00：保存本包完整原件和实际 hashes，登记旧 24 HPRO 的当前处置与本包 P 卡调整，冻结 owner/允许路径/schema/基线。把 adopted 的内容回填 DEC-013/roadmap/下一节点，不改旧 received 原文。文档接受与产品实现分开。

随后按授权的实际施工范围，先做 P01 的真实安装 SDK loopback fixture，得到分页事实，再修产品；P02 处理 isError 的效果未知结算，P02b 补 content/structuredContent/error 保真。不要为了方便先做全仓搬目录，也不因探针失败立即换 runtime。

## 分工

Astra 或当前架构集成者：冻结契约、决定 schema/迁移、处理跨 owner 接缝、串行接收。一个后端 writer：实现当前有界卡片，禁止并行改 service/store/control。Luna 或其他非作者：先准备负例/来源核验，再在固定代码 SHA 上独立执行。既有前端 writer：只消费已冻结/已接通的局部 DTO，不重画全局布局。

作者可以修复自己的失败，但不能给自己的实现盖独立接受章。独立核验发现需改产品时，修订到新 SHA 后再验受影响范围。

## 运行前检查（示例命令，需在本地执行）

```sh
git rev-parse --show-toplevel
git status --short --branch
git rev-parse HEAD
git worktree list
node --version
python3 --version
```

在独立、合格 Node 环境按仓库指引安装和建立回归基线：

```sh
npm --prefix app ci --ignore-scripts
npm --prefix app test
npm --prefix app run smoke
```

本包没有执行这些命令。新增 hpr 测试只在文件真实存在后运行，接受矩阵须记录 P04a/P04b、P02b 和分期 UI 的新 case IDs，不能盲套旧 P12 文件列表。browser runner 必须有实际用例并拒绝零用例/skip 冒绿。不要仅凭 lint、文件存在或 build 成功交付行为改变。

## 单卡交付

实际 SHA、允许路径与 git diff、原始 test 输出、失败/未跑项、正反例、input/lock/fixture hashes、迁移/回退、作者与非作者关系、关闭与未关闭的门。未知效果和未决问题必须保留，不可通过创建新 Chat 或重试掩盖。

只 stage 明确路径，检查 staged 清单；不使用 git add . / -A，不改其他 writer 文件。一次接收一个共享 owner 的更改。部署、外部消息和真实 provider 消费依各自实际授权，不因收到本包自动执行。

## 这轮的停止边界

先收口正确性与两条解耦，再做第一列的输入/指令/前端/独立验证。P12-A 是有界工程节点，不自动关闭 G1–G5，更不冒称原 P12 全包完成。后续完整通用能力、DRT-03 第二 runtime、Spark 薄执行器按 03/04 文稿逐项消费。


---

# 来源、版本与审阅上限

固定产品基线：`1ac28980c4877f4a86adf586aeb1b66980e23504`。审阅日期：2026-09-12（Asia/Singapore）。

## 已核见与未执行

通过 GitHub connector 读取固定源码与合同；通过 Exa/Pi/OpenAI 官方文档核对少量外部机制。外部 latest 文档不是现依赖版本的实现证明。初次与结束前的 main 核对见 audit.json。

未取得可运行的本地 clone（容器 DNS 失败），容器 Node 22.16.0 低于 repo engines；未安装依赖、未执行产品测试、未访问本机 8804、未调用真实模型或远端工具副作用。没有读取用户凭据或修改远端 repo。

全部代码结论仅覆盖下表列出的读取范围。没有声称逐行全仓审计、全量 PR review、独立产品接受，或完成旧 24 HPRO 的每条源码重验。

GitHub combined commit statuses 查询为空并不代表没有 Actions/check-runs；本文不据此判断 CI 配置缺失。open PR 查询为空不代表没有本地分支。GitHub Release 对象为空不代表 Pages 未发布。

下列源文通过 connector 阅读，并未作为原始字节包下载保存；本包 SHA256SUMS 只校验本包文件，**不冒充远端源文件 hash**。源复核用固定 SHA + path，实际 intake 字节 hash 由本地 P00 计算。

<a id="r01"></a>
## R01 · 固定 main 元数据
来源：[固定 main 元数据](https://api.github.com/repos/lesPrivilege/Courtwork/branches/main)
类型：pin。范围：分支读取返回本文固定 SHA；最终复查另见审计范围。

<a id="r02"></a>
## R02 · 当前工程状态
来源：[当前工程状态](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/current.md)
类型：repo。范围：读取最新状态段；历史测试、发布回执为仓库所记，不是本轮重跑。

<a id="r03"></a>
## R03 · 下一 Harness 节点
来源：[下一 Harness 节点](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/harness-next-node-2026-09-12/README.md)
类型：repo。范围：已收包版本、现 Pi/MCP 接缝、开放门与归档边界。

<a id="r04"></a>
## R04 · DEC-013 Runtime canon
来源：[DEC-013 Runtime canon](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/architecture-runtime-canon.md)
类型：repo。范围：责任边界与 DRT-01～04 原路线。

<a id="r05"></a>
## R05 · RuntimeService
来源：[RuntimeService](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/server/service.mjs)
类型：code。范围：有界读取：构造/初始化、SessionManager 接缝、Run admission、MCP unknown 与终态结算；未逐方法全文件审计。

<a id="r06"></a>
## R06 · 现 Runtime 组合根
来源：[现 Runtime 组合根](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/server/runtime.mjs)
类型：code。范围：完整读取；无条件构造 WorkCoreOwner。

<a id="r07"></a>
## R07 · 现 Pi 适配
来源：[现 Pi 适配](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/runtime/pi-session-runtime.mjs)
类型：code。范围：有界读取：资源发现关闭、模型身份/凭据隔离、createSessionRun 接口和连续性说明；未全路径运行。

<a id="r08"></a>
## R08 · MCP Manager
来源：[MCP Manager](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/runtime/mcp-manager.mjs)
类型：code。范围：完整读取；分页、结果保真、reported-error/unknown 分支。

<a id="r09"></a>
## R09 · 应用依赖与命令
来源：[应用依赖与命令](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/package.json)
类型：repo。范围：Pi 0.85.1、MCP client 2.0.0、Node >=22.19.0；未验证安装后的包字节。

<a id="r10"></a>
## R10 · 旧 Pro P00–P12 工单
来源：[旧 Pro P00–P12 工单](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/HPR-02-work-orders.md)
类型：repo。范围：读取全部 13 张卡；本文处置的是工单层，不冒称已完成原 24 HPRO 的逐项源码重验。

<a id="r11"></a>
## R11 · 旧 Pro 双向实施映射
来源：[旧 Pro 双向实施映射](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/harness-pro-2026-09-10/received/f1700fb0/courtwork-hpr-review/implementation-map.json)
类型：repo。范围：24 HPRO 到 13 卡的原映射；不混后版缺件。

<a id="r12"></a>
## R12 · 唯一总 roadmap
来源：[唯一总 roadmap](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/roadmap.md)
类型：repo。范围：读取当前排序和相关增量；旧时点状态由 current 覆盖。

<a id="r13"></a>
## R13 · Governed work loop
来源：[Governed work loop](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/governed-work-loop-2026-09-12/README.md)
类型：repo。范围：四职责、状态与权限边界、只读首片。

<a id="r14"></a>
## R14 · G1–G5 产品门
来源：[G1–G5 产品门](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/execution/2026-09-08-main-round/public-readiness.md)
类型：repo。范围：完整读取；既有发布验收标准不由本包降格。

<a id="r15"></a>
## R15 · 8 项真实 Runtime 验证入口
来源：[8 项真实 Runtime 验证入口](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/release/frontend-node-2026-09-12/RUNTIME-VALIDATION.md)
类型：repo。范围：完整读取；本轮未执行其中的 provider 调用。

<a id="r16"></a>
## R16 · RD-006 延迟工作区绑定
来源：[RD-006 延迟工作区绑定](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-006-deferred-workspace-binding.md)
类型：repo。范围：完整读取；managed cwd、目录能力与 projectless 身份分开。

<a id="r17"></a>
## R17 · RD-007 内容资源治理
来源：[RD-007 内容资源治理](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/RD-007-resource-governance.md)
类型：repo。范围：完整读取；LG/DS/BG/Runtime 各自 owner，首片无需等目录绑定。

<a id="r18"></a>
## R18 · BE-6/7 声明式 Skill 提案
来源：[BE-6/7 声明式 Skill 提案](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/research/gui-agent-control-plane-2026-09-12/skill-proposal-slice.md)
类型：repo。范围：完整读取；proposal 不等于 effective registry；精确版本批准与 crash-safe apply。

<a id="r19"></a>
## R19 · 当前 open PR 查询
来源：[当前 open PR 查询](https://api.github.com/repos/lesPrivilege/Courtwork/pulls?state=open&per_page=100)
类型：live-api。范围：本次返回空数组，不代表没有本地分支或其他 writer 的未提交工作。

<a id="r20"></a>
## R20 · GitHub releases 查询
来源：[GitHub releases 查询](https://api.github.com/repos/lesPrivilege/Courtwork/releases?per_page=5)
类型：live-api。范围：本次返回空数组；GitHub Release 对象与已发布 Pages 分开。

<a id="e01"></a>
## E01 · Pi 官方 SDK 文档
来源：[Pi 官方 SDK 文档](https://pi.dev/docs/latest/sdk)
类型：external-primary。范围：只作可嵌入/ResourceLoader/工具/session 能力的外部校验；latest 页面不代替 0.85.1 锁定源码。

<a id="e02"></a>
## E02 · OpenAI App Server 官方说明
来源：[OpenAI App Server 官方说明](https://openai.com/index/unlocking-the-codex-harness/)
类型：external-primary。范围：支持将 Codex App Server 列为后续独立 runtime probe；不证明 CW 已适配。
