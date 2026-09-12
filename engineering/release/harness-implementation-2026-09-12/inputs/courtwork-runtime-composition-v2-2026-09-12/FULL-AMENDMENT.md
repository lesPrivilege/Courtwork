# CourtWork · Runtime 组合架构修订 v2

2026-09-12 · 基线 `1ac28980c4877f4a86adf586aeb1b66980e23504`

**采用本轮用户修订：Pi 只作为当前可组合的执行底座；Harness Core 与 runtime 私有扩展组成可整体替换的 Runtime。Spark、Attention、Expert 的产品运行封装由 CourtWork 定义，具体执行后端可更换。模型适配靠近上游，维护选择经验证的自足基线，不追求全量实时热插拔。**

实施顺序改为：**先跑通 DeepSeek + 当前 Pi 的 GUI Agent → 提取必要接缝并证明真实 Runtime 替换 → 落实 Spark / Attention / Expert 的小场景工作闭环。**

本包是对上一版的局部覆盖与拆分稿，不是另一套仓库总 roadmap。新指令优先；上一版未被本包明确覆盖的安全、权限、来源和故障契约仍保留。`inputs/previous-release-plan.zip` 是上一版原字节，只读存档，不能把其旧顺序再次当作当前排单。

## 阅读入口

| 文档 | 只负责回答 |
|---|---|
| [01 架构边界](01-ARCHITECTURE.md) | 哪些属于 CW，哪些可以随 Runtime 整体更换？ |
| [02 Runtime 与扩展](02-RUNTIME-CONTRACT.md) | 两种执行接法、能力声明、状态归属及安全替换条件是什么？ |
| [03 模型与上游适配](03-MODEL-ADAPTATION.md) | Provider 的协议与模型使用方式如何被保真消费？ |
| [04 产品运行封装](04-ROLE-COMPOSITIONS.md) | Spark、Attention、Expert 如何自研而不绑定内核？ |
| [05 稳定基线与维护](05-MAINTENANCE.md) | 哪些更新必须跟，哪些可以收敛；Agent 怎样有界维护？ |
| [06 三节点实施与验收](06-IMPLEMENTATION.md) | 下一步具体做什么，旧 P/DRT 卡怎样重新归位？ |

[CHANGELOG](CHANGELOG.md)明确覆盖上一版哪些条款；[HANDOFF](HANDOFF.md)可交本地集成者；[SOURCES](SOURCES.md)分清代码依据、公开文档和设计选择。`plan.json` 仅为本包映射，不持有实际任务状态。

## 证据与动作范围

本轮通过 GitHub connector 复查远端 main，仍为上述 SHA；重读 DEC-013 与 package.json，并读取当前对话中上一版正文/工单及原 ZIP。外部参考含官方 Pi SDK、DeepSeek API、Codex App Server、固定 DSH 架构和候选生态入口。没有验证未提交本地变更，没有运行产品、真实 Provider、Runtime 替换或 GUI 测试，没有创建远端 PR、提交、部署或新依赖。

本包完成只表示**文档修订交付**。实施项全为 proposed-not-created，实验为 not-run。不要继承上一轮容器环境结论为本轮环境事实；此轮未尝试运行应用。

---

# 覆盖关系 · v1 → v2

本轮用户提出更明确的组合与维护路线。本表覆盖的是上一版交接包中的设计条款，不宣称仓库文件已修改。

| 上一版位置 / 结论 | 本轮处置 | v2 有效结论 |
|---|---|---|
| 01 §3/§4：Spark 薄执行器须先证明比受限 Pi 更有收益，才扩大自研 | **拆分** | Spark 产品运行封装现在确认自研；优先复用 Pi core。性能实验决定实现厚度/默认选型，不决定 Spark 是否有自研资格。重写通用 loop 仍需实际必要性。 |
| 03 §1：P00→P01→P02→P02b→P03→P04a/b→P05→P06→P11-A→P12-A 为首条刚性链 | **替换排序** | 按 GUI、真实 Runtime 替换、Work 闭环三节点推进。节点一只做实路径所需的正确性、协议与 GUI 合流，不等待全部解耦或完整 Compiler。 |
| 04 DRT-03：完整通用自足节点及同 NDA Expert 为真实第二 Runtime 的前置 | **拆为两层证明** | 节点二先用独立于 Work 的合成任务合同证明 Runtime 真替换；同 Expert、同 Core 的正式工作替换验收放节点三。不能形成“先有完整 Work 才能替换，先替换才能开发 Work”的循环依赖。 |
| Work Core 主导模块化单体 | **保持并澄清** | Work Core 是正式工作语义 owner，不是通用运行的必经依赖；可整体替换的 core 指 Harness Core，绝非 Work Core。 |
| Runtime Adapter + Model Adapter | **细化** | RuntimeAdapter 管整套执行器；ModelAdapter 管模型协议；provider-specific execution profile 管已证实的上游使用方式。后两者不重复串在封闭 Runtime 后面。 |
| extensions 泛称 | **拆分** | runtime 私有扩展、CW 共享能力服务、Work/Expert 专业扩展分别定义；只有第一类随原生 runtime 一起替换。 |
| 热插拔长期愿景 | **降为分级能力** | 构建可替换、重启可配置、运行边界可切换优先；运行中 live swap 逐项验证，不作为共同前提。 |
| 所有局部跟进最新版 | **不采用** | 支持固定自足版本组合；安全、协议断裂、数据正确性等触发必要维护。外部 API 和模型语义不能被本地 lockfile 冻住。 |
| 等 Codex 官方开放 Runtime 接口 | **按事实校正** | 官方已于 2026-02-04 介绍 App Server，当前公开文档可供研究。节点二需核具体版本/所需能力，不泛称全部云端/桌面 Runtime 已开放。 |
| 原 P01/P02/P02b MCP 负例 | **保留** | 暴露的 MCP 必须完成相应正确性；真未支持/已关闭的能力可从首节点支持集合排除，不能只把按钮藏起来。 |
| P05/P06 完整快照/Compiler 为首 GUI 前置 | **拆片** | 首节点保留必要 runtime/model/profile、tool/permission、请求和事件证据；完备通用快照服务按真实消费者递进。未观测不能冒 sent。 |
| G1–G5 与历史状态 | **保留归属** | 三节点是本轮排序，不是重命名或自动关闭 G1–G5。前两个工程里程碑不冒称完整 Work 产品 release。 |

原件 SHA-256 见 `input-receipt.json`。新文件只构成补充/覆盖包；不改写原 received 返件，不给旧包整包盖“已修复”。

---

# 01 · 架构边界：自有产品，替换执行

## 1. 总裁定

CourtWork 拥有持续工作的组织、正式状态与用户判断表面。执行系统提供某次任务所需的模型调用、工具循环、原生会话和可选能力。二者通过可测试的接口组合，而不是通过共享内部对象捆绑。

**可整包替换：Harness Core + runtime 私有 extensions + native session/context policy + 该 Runtime 所用模型驱动与环境配置。**

**不随 Runtime 替换：CW 的身份、授权与命令回执、正式工作状态/来源/决定、产品职责合同、共享内容引用和可恢复的历史解释。**

这里的边界是目标责任，不表示每项已经完成独立模块。现 DEC-013 明确 service 仍泄漏 Pi SessionManager；当前实现仍是 Pi AgentSession 与 Host/Work Core 的组合。[S02](SOURCES.md#s02)

## 2. 三组词必须明确区分

| 名称 | 定义 | 不应解释为 |
|---|---|---|
| Harness Core | 单个执行器的基础 turn/tool/event/取消职责 | CW 正式成果与接受规则 |
| Work Core | 正式工作对象、版本、依据和决定的领域 owner | 所有聊天都要先启动的完整执行环境 |
| Runtime Provider | 提供一套可执行 runtime 的实现，例如 CW-Pi、Codex、候选 Hermes/OpenClaw | LLM API 的 endpoint |
| Model Provider | 提供模型推理接口与能力的厂商/连接 | 一定包含工具循环和工作状态 |
| Role / Expert Contract | Spark/Attention/专业 Expert 的职责、输入输出、权限需求与检查要求 | 绑定某个 runtime 目录的永久 persona |
| Role Runtime Composition | 将职责合同、profile、能力、模型路由、预算与执行器组合成可运行单元 | 必须单独一个进程、数据库或永不结束的 agent |

## 3. 目标依赖结构

```text
CW GUI / Work Surface
        |
CW Host：身份、Run admission、权限、回执、控制 API
        |
        +-- 人的工作决定 --------------------------> Work API / Work Core
        |
        +-- Role composition / Work prepare <------- 获准工作投影与来源
        |          |
        |          +-- 普通 Harness 任务可不依赖 Work Core
        |
Runtime Port（共同生命周期 + 可选能力，不压平全部差异）
        |
        +-- CW-owned runtime bundle
        |     Harness Core（优先 Pi）
        |     + 选定 runtime extensions
        |     + provider-specific profile
        |     + ModelAdapter -> DeepSeek / 其他模型连接
        |
        +-- Native runtime bundle
              RuntimeAdapter -> Codex / 候选 Hermes、OpenClaw
              原生 loop、session、model driver、tools 由其内部管理

Run 观察/候选/外部效果回执 --> 相应 owner
正式接受/关闭 ------------> 原工作 owner 的命令与事务
```

这不是新增服务部署图。先保持模块化单体，进程/容器由执行环境需求决定；不因为画了一个框就创建一层转发服务。

## 4. extensions 拆为三类

**Runtime extension。** 对该执行器增加 tool dispatch、MCP 接入、compaction hook、原生 skill loading 等。它可以和 Harness Core 一起更换，私有实现无需字节级跨 Runtime 通用。

**CW shared capability。** 例如获准来源读取、版本化产物提交、权限问询、能力目录查询。它们通过受限 port 服务不同 runtime；具体 Pi/Codex 工具胶水可替换，共享 owner 不搬家。并非所有上游 runtime 都能暴露相同工具；不能映射则拒绝该角色/profile。

**Work / Expert extension。** 专业 Schema、输入输出合同、verifier、review 声明及领域适配。专业语义不能被降格成某个 Pi extension 脚本。可执行 renderer 或适配代码的可移植性另验，不承诺任意脚本搬到其他 runtime 自动运行。

仓库当前 `app/extensions/` 的领域适配不应因目录名而被归入“可连同 Pi 丢弃的扩展”。这是术语和依赖归属的清账，不是先把全仓移动目录。[S02](SOURCES.md#s02)

## 5. 对外稳定与对内自由

稳定边界要求：任务身份、来源与版本、能力要求/拒绝、权限、事件/终态、结果引用、恢复解释。内部允许：不同工具组织、不同轮次策略、不同 compaction、不同执行语言与不同原生 storage。

不要设计只剩 `prompt -> text` 的最低公分母；那会丢失需要检查的工具、权限与执行状态。也不要把所有上游功能硬塞进统一接口。共同生命周期必须实现；其余能力通过可选 facet 和支持证据公开。

任何 Role 的 required capabilities 都须满足 runtime、model、环境和当前授权的交集；能力名字相同不证明语义相同。native sandbox 或本地进程身份也不自动证明满足 CW 的权限范围。

## 6. 当前 Pi 的消费姿态

保留已锁定 `@earendil-works/pi-agent-core`、`pi-ai`、`pi-coding-agent` 的 0.85.1 作为节点一基线，不因概念收敛就立即从 AgentSession 降到低级 API。[S03](SOURCES.md#s03)

目标 CW Spark / Attention runtime 优先复用 Pi 提供的 core；是否保留 AgentSession 的会话、compaction、重试设施，按实际需要选取。采用 core 不意味着自己重写已有机制，也不意味凭空继承高层包全部生命周期保证。详见 [04](04-ROLE-COMPOSITIONS.md)。

---

# 02 · Runtime 接口、能力与替换条件

以下是设计责任和候选字段，不是已实现 DTO。接单时先查现 `control-contract.d.ts`、service 与持久化 owner，再冻结必要增量。

## 1. 两种 Runtime 接法

| 接法 | CW 控制什么 | 不重复实现什么 |
|---|---|---|
| Embedded / CW-owned | Pi core 的组合、允许的扩展、provider profile、模型 adapter、执行预算 | 上游已足够的基础循环/协议功能 |
| External / native-owned | 启动/连接、隔离实例、能力协商、task/run 映射、授权和回执适配 | Codex/Hermes/OpenClaw 自己的 loop、私有会话、模型 codec |

外部 runtime 不必实现 Pi extension API。CW 映射其原生可用能力；原生能力无法安全收敛时减少支持范围，不能用旁路获得所有文件/凭据/外发权。

禁止同一项 runtime-native 请求经过 CW ModelAdapter 编码后，再交给原生 runtime 重新编码。原生路径沿其官方 model/provider 接入面；CW 只提出可支持的选择与要求。否则会引入两份实际 model/config owner。

## 2. 接口责任

Runtime Port 至少能说明：身份与版本；支持哪些任务和控制；如何创建/打开原生会话；何时可以开始执行；如何请求取消；如何取得事件与唯一结算；旧执行与新执行如何关联；哪些历史不可恢复。

prepare 不应被模糊定义为永远无副作用：对 CW-Pi 可要求在 admission 后准备且不发模型请求；外部 Runtime 的启动/握手可能有本地 I/O 或网络行为，必须单列在 provider lifecycle 中披露、授权和隔离。真正模型执行不得早于 CW 幂等 admission 与运行绑定；无法分开的原生接口不列为兼容。

建议最小绑定记录：`runtimeProviderId`、runtime/adapter revision、role/profile ref、requested/effective model identity、能力支持快照、原生 session locator、context generation、来源/权限引用和预算。复用既有字段，不预占新数据库 schema。

## 3. 不能只用一个 supported 布尔值

每项能力至少应表达支持/不支持/未验证、语义限制、对应版本及证据。关键能力包括执行、流式事件、取消、逐次审批、历史读取、原生 resume、普通接手续行、tool 注入、文件范围、context reset、compaction、子任务与后台调度。

`interrupt` 接受请求 ≠ 执行已经静止；执行静止 ≠ 已发生外部效果可撤销。`resume` 一词必须区分原生 session 续接、CW 历史阅读和按工作状态重新开始。

UI 由实际快照驱动：当前/下一 Run/历史配置分开；不支持能力保持不可用并有说明。事件标识带 Run 与 runtime generation，旧 adapter 的晚到消息不得污染新运行。

## 4. 状态 owner

| 状态 | 归属 | 替换处理 |
|---|---|---|
| CW Run/命令/用户审批与回执 | 现 Host owner | 保留身份及版本，不随原生进程销毁 |
| 原生对话与协议 metadata | 对应 Runtime owner | 保真保留或按授权导出，不承诺任意互转 |
| 工作来源、候选、正式决定与义务 | 对应内容/Core/外部系统 owner | 保持真源，按当前授权供新运行引用 |
| 编译上下文 | 本次执行投影 | 可重编；不等于能删掉原生恢复所需状态 |
| UI 状态/索引 | 投影 owner | 可重建；不得替代正式/原生事实 |

单一 owner 不表示只有一个物理存储：关键是每类事实只由一条正式写入路径解释。不同 Runtime 各自的原生 journal 不是“重复真源”；额外维护一份试图冒充全部原生协议的统一 transcript 才是应避免的情况。

## 5. 安全切换流程

先停止旧 lane 的新任务准入；等待静止或请求取消并取得实际结算。固定旧 runtime binding、开放审批、未知效果和未完事项。准备隔离的新 native session，按获准的来源/任务/工作状态构造输入，记录新 generation 与接手关系，再开放新任务。

不自动重发不确定的外部行动；不把旧审批答复送到新 generation；同一专业工作冲突写入仍通过 Core 的当前版本/权限检查。

旧 runtime 可以保留为历史 reader 或隔离的在途结算者。发生 unknown 时，不允许替代运行自动重演该行动；对有明确隔离证据的无关只读任务可另行允许，不必把整个应用锁死。

替换默认在 Run/新 session 或重启边界发生。原生中途恢复、in-flight fork 和热换模型都不是基础兼容要求。

## 6. 原生 runtime 自带功能的采用纪律

Hermes/OpenClaw 之类候选不只拥有模型 loop。接入评估必须清点其可能自行运行的 scheduler、memory、skill discovery、外发 channel、模型 fallback、自动更新和 HOME discovery。默认 profile 明确启用所需部分，其余隔离或关闭；不能关闭则标成不适用。

上游生成的 memory 或 skill 是其执行资料/候选；要成为 CW 的持久配置或正式工作对象，仍通过对应 owner。不得以“原生自动学习”绕过 CW 的权限和提案版本。

候选生态入口见 [S09/S10](SOURCES.md#s09)。本包未实现或验证它们的 CW adapter。

## 7. 验证标准

换 provider endpoint 只证明 ModelAdapter；同 Pi 上的 fake provider 只证明确定性路径；独立 synthetic executor 证明端口可模拟。**节点二需真实第二执行器，且 Pi 参考 runtime 仍能回退运行。**

比较 task 合法性、来源与作用域、工具/批准/取消/断连/历史解释，不要求两模型给出相同文本、相同工具数量或相同内部轮次。

---

# 03 · 上游模型适配：保真协议，不抹平能力

## 1. 适配不是仅改 baseUrl

本轮采纳 provider-specific 适配路线。目标是使当前模型公开支持的使用机制实际进入执行，而不是所有模型套用同一套被削平的消息/工具语法。

但“激活后训练能力”是需要测量的产品假设，不是已知的训练内部事实。协议符合性可以测试；模型是否因某种工具组织表现更好，需要同模型的有界对照。不得依据品牌名写一套无法证伪的“专属 prompt”。

## 2. 三个不同责任

| 责任 | 持有内容 | 不取得的权力 |
|---|---|---|
| RuntimeAdapter | 整套执行器的生命周期、事件、控制和原生恢复 | 解释/改写 Core 正式接受标准 |
| ModelAdapter | API 格式、流解析、tool call/result 对齐、必要 metadata、usage、错误与能力参数 | 修改业务 Schema、用户身份和授权 |
| Provider execution profile | 有源依据的工具组合、指令放置、effort/default、结果呈现、上下文/重试使用约束 | 静默增大权限、凭空创造上游不支持的功能 |

第二、三项可以由同一版本化实现共同交付，不强制三个目录或三个层层转发的对象。外部完整 Runtime 路径由其内部 ModelAdapter 持有协议；CW 不另行接管 codec。

## 3. 保持模型的语义，却统一可观察后果

共同接口统一的是 task/run 身份、权限决定、工具结果与结算解释；不要求统一 system prompt 全文、reasoning 参数、tool schema 的原生编码或 compaction 算法。

语义模型应支持逐项扩展：公开能力、必需参数、可选优化、未知/拒绝行为分开。输入被模型静默忽略时不能显示为 effective；无法核实则用 unverified/unknown，不用 UI 选择值冒充实际使用值。

Provider 私有 reasoning/协议数据留在原生状态域；不能为便于跨 Runtime 搬运就裁掉必要字段，也不应默认进入用户长期 memory、公开 trace 或 Core。

## 4. DeepSeek 首次接入的验证范围

节点一先将 DeepSeek 作为 **Model Provider** 接入现 CW-Pi Runtime，不把 DeepSeek API、DSH 完整 Runtime 和一个模型别名混为一物。

先固定 GUI 选择的 endpoint、API 格式、实际模型身份、SDK/adapter/profile 版本和预算。官方模型文档及其行为会演进；不依据旧记忆硬编码名称或 effort。当前官方思考模式文档说明参数生效和工具请求中 reasoning metadata 的回传存在具体要求，这正是需用 actual SDK fixture 检验的接缝。[S07](SOURCES.md#s07)

依次验证：普通流式回答；两轮历史；真实工具 call/result；必要 metadata 保真；Ask/Deny/Approve 后实际行为；工具后续模型请求；停止后没有非法后续请求；完成历史重启可读与下一 Run 可继续。in-flight 进程恢复单列，未支持就不宣传。

先用合成响应经过锁定 SDK 观察下一实际请求，再由用户在 GUI 配置的获准真实连接完成主路径。真实请求采用合成材料、明确费用/次数上限；不用个人全局 key、浏览器 cookie 或隐式账户。

只成功发出一次文本不是 GUI Agent 接入成功；模型说“已经写入”也不证明工具路径成功。

## 5. 维护与实验分离

协议基线测试负责当前能力“不被适配丢失”；任务 eval 负责不同 profile 的实际效果。顺序是正确性优先、功能充分，其后才成本与延迟；不是先证明新 wrapper 比 Pi 快，才允许做自己的产品。

Provider-specific revision 可以比通用 Harness Core 更新得更频繁。变化只改 provider 对应接缝；升级需报告请求形状、事件/取消、工具/来源和真实任务的影响。

若版本相同但 endpoint 行为变化，记 server/model observed identity 与本次证据，不让 lockfile 的相同数字掩盖外部变化。对无法固定的服务语义，使用每轮必要兼容 smoke，而非承诺永久冻结。

## 6. Codex 的当前事实与采用范围

OpenAI 于 **2026-02-04** 公开介绍 Codex App Server，当前官方文档提供 app-server 接入方式和 thread/turn/item、流式通知与控制。[S05/S06](SOURCES.md#s05)

因此节点二的条件写成“选择实际版本并验证所需接口”，不是笼统“等未来才公开 Runtime”。文档中同时存在 experimental/under-development 能力及运输方式限制，不能把公开等同于全部生产支持；优先评估本地、固定版本、最小接口范围。

这不证明后续新增的桌面/云端 Work 能力、所有工具注入或跨产品订阅桥已向 CW 开放。具体未公开能力仍按缺口登记，不逆向私有端点。

---

# 04 · Spark、Attention、Expert：由 CW 定义的 Runtime 封装

## 1. 自研对象正式确定

**Spark 是 CW 核心自研产品单元，不只是将某个便宜模型写进配置。** 自研内容包括任务分解、来源集合、准备/核查策略、预算与并发、输出合同、验证、暂存/保留、交接与注意力控制。其默认执行底座推荐 Pi core；换内核不应重写 Spark 的职责和评价标准。

Attention 同理：CW 定义巡视范围、何时安静/升级、如何提出动作与消费回执；推理与执行可封装 Pi，也可接入满足权限和能力要求的其他 Runtime。Attention 的义务状态和关闭权继续归现 owner，不变成 agent 自己的 memory。

Expert 在专业定义层仍是可版本化合同与能力包；**可运行的 Expert 实例**则是该合同与 Runtime、profile、工具及执行环境的组合。用户所说不同 runtime 封装在这一层成立，不需要把 Expert 契约改成某个执行引擎的别名。

## 2. 同一结构，不同职责

| 单元 | CW 自研重心 | 推荐初始底座 | 结果与约束 |
|---|---|---|---|
| Spark | read/index/diff/classify/extract/pre-review；有界并发与来源 coverage | CW-Pi；优先 Pi core，按需要保留高层会话设施 | 带 source/version、coverage、conflict/unknown 的准备结果；不自动获正式接受权 |
| Attention | 获准集合巡检、义务/变化核查、安静或升级、动作提议与回执关联 | CW-Pi；可替换 | 面向人的可采取行动，不由 heartbeat/已阅/模型自述自动关闭 |
| Expert | 工作要求、专业验证、证据与 review 维度 | 根据任务选择 CW-Pi 或已验证 Runtime | 专业候选和依据；保留原文反查与人的/授权 owner 的正式决定 |

三者可以共用一个 Runtime 实现，也可使用不同实例/进程；同一 Role 可有多个 profile。起步不造三个 scheduler、三个长期会话库或三套权限配置。

## 3. 从现 AgentSession 到 Pi core 的责任清账

当前 Pi 官方 SDK 分别说明 core LLM 交互与高层 AgentSession 的生命周期/历史/compaction；它们不是一句“只用 core”就能等价互换的层级。[S04](SOURCES.md#s04)

先登记当前由谁持有：消息历史、tool dispatch、retry、取消、事件 drain、预算、compaction、持久化与恢复。每项分别选择继续复用、委托 CW owner、暂不支持；只有角色需要时才补能力。

对一次性 Spark：可以不提供持久多轮对话与 auto-compaction，而保留任务输入/输出和回执。对 Attention 长任务：需要的状态、取消与恢复必须有实际 owner 和测试。不能因低级 core 存在就宣称高层保证也存在；也不能为了齐全，把不需要的功能全重写。

性能比较保留为实现择优与优化实验，不再是 Spark 产品定义/自研路线的准入门。

## 4. 首个工作闭环：来源更新核查

使用两份合成的工作资料版本 A/B；任务 gold 包含变更、未变更、冲突和必须补查之处。人先明确来源范围与处理授权。

Spark 读取精确版本，输出变化、证据定位、覆盖与 unknown；Expert 可按需读取原文，检查和补正，不被限制只能相信摘要；Attention 将需要人判断的变化与现义务关联或提出登记候选；人通过原 Work API 作出接受/退回/补证据等决定。新的 Session 或已验证的另一 Runtime 按当前有效工作状态继续。

闭环重点是“工作更新后，系统怎样帮助人继续”，不是展示四个 Agent 一起说话。先手动触发一次完整闭环，之后再加有 budget、幂等与撤权语义的定时触发；不因首次手动成功就宣传无人值守。

## 5. 文件与消息不要成为无人管的副产物

Spark scratch/intermediate 文件属于运行资料；源文件属于内容/来源 owner；准备结果是候选；正式接受产生的 Artifact 由 Work Core 持有。中间文件退出运行后的保留、引用、清理应按 RD-007/现存 owner 登记，不新建一个 Spark 私有永久知识库。

对象通过稳定 ref 与获准 reader 复用；新的任务读取仍检查授权和版本。摘要可作线索，不能成为其他 agent 唯一可用的 memory。

## 6. 节点三的验收

可复现：输入版本；Spark coverage 与遗漏；Expert 原文纠错；Attention 不误关闭；人类决定及准确版本；来源更新后的失效/重核；重启/新 Session/另一 Runtime 的接续。

还要单独检查角色隔离：换执行器不改变正式接受含义，工具审批不替代专业接受，native 自动 memory 不成为 CW 真源。只在以上证据成立后，把 Spark/Attention 的相应产品宣言转成已可用能力。

---

# 05 · 稳定基线、按需替换与 Agent 可维护性

## 1. 目标不是追平所有上游

采用“已验证且自足的一组版本”，不采用“每次都全量升级到最新”。评价的是当前消费者的功能完整、边界正确、证据可重现、可退出和可修复，不是仓库更新时间。

稳定可分两种：本地包/工具/adapter 可锁定具体字节；外部模型服务/认证/协议行为只能记录观察与兼容范围，不能靠本地版本号冻结。即使本地不升级，也应在每轮实际发布或相关行为变化时做必要兼容验证。

## 2. 替换能力分级

| 等级 | 可以承诺什么 | 本轮姿态 |
|---|---|---|
| 构建级 | 换局部实现/依赖，重构建后满足相同合同 | 基本要求 |
| 启动级 | 关闭/重启后加载不同配置或 Runtime，旧数据有读取/恢复策略 | 优先支持 |
| Run / session 边界级 | 在旧执行安全静止后，为新运行绑定新组合 | 目标主路径，逐项验收 |
| 运行中 live swap | 活跃 turn 内改变服务/能力，仍证明在途生命周期与效果正确 | 非默认，不作全局承诺 |

权限撤销与功能热插拔不是一件事：撤销必须在真实行动边界有效，不能等下一次配置热更新才约束；新授权也不自动回溯放行旧任务。

DSH 的固定架构参考中，profile/bundle 分层和可替换注册是一等结构；同时 shipped SDK/headless 等 profile 在启动时应用配置，而不是全部 live reload。这支持“组合边界清楚，运行中变更按需收敛”的消费方式。[S08](SOURCES.md#s08)

## 3. 每个局部选型留下最小维护记录

不另建重量级生态数据库，先用现依赖账和一份组件记录即可。最小字段：

- 组件职责、接口消费者与唯一维护 owner；来源/许可、精确版本或 commit、完整性 hash。
- 使用和明确未使用的能力；必要配置、native 状态格式与凭据/工作目录边界。
- 契约测试、故障 fixture、可执行验证命令、已知限制与真实/合成证据。
- 局部修改或补丁；升级/替换路径；回退包与数据 reader；必须维护的触发条件。

“extension 注册成功”不是维护完成：要知道消费者是谁、unload/close 会留下什么、在途任务如何结算。未使用的能力也应明说，避免 Agent 误把上游全部特性当成 CW 责任。

## 4. 必要维护与可选维护

必须处理：影响实际支持路径的安全问题、数据损坏/丢失、权限失效、上游认证/协议废弃、已承诺功能破坏、所用平台兼容性断裂。必要修复可选择局部 patch、升级、替换或暂时关闭能力；稳定版本不是永久不修。

可评估但不自动跟：新增工具、外观升级、实验功能、与当前消费者无关的重构、尚无有效证据的性能优化。每轮选择一个最小变更集合，不把 feature adoption、包升级、接口重构和数据迁移塞进同一 PR。

不将 package version 相同当成模型服务行为未变化；provider profile 和协议测试可以独立更新。

## 5. 让 coding agent 真正能维护

最小接单包为：实际 base/lock + 组件合同 + 现消费者 + 一个能重现的问题/负例 + 允许改动路径 + 验证命令 + 回退说明。

执行顺序：在隔离工作区重现 → 做最小修复 → 运行该合同和受影响消费者回归 → 输出依赖/配置/数据格式差异 → 非作者核查 → 集成者串行接收。作者负责修复，不能自称独立接受。

Dogfooding 可以产生真实问题和有界回执，但不能成为唯一验收器。保留独立 CLI/fixture 驱动的合同测试和一种不依赖故障 Runtime 的 coding agent/维护入口，避免“被修的系统坏了就无人能修”。日志与合成 fixtures 必须可导出并脱敏，不把个人凭据写入维护包。

## 6. 回退必须区分代码与数据

无数据变更的纯接口提取可切回旧实现；产生新格式/新 native generation 的发布，需保留旧数据只读 reader、迁移证明或停止写入后的完整备份恢复。不能把旧可执行文件直接指向新数据就称 rollback。

替换包卸载不等于删除历史。资源清理要求引用盘点；存在未结算效果/未消费产物/历史决定引用时保持可追溯，不以“插件已经删了”清空证据。

---

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

---

# 本地接单指令 · Runtime composition v2

先读当前仓库 AGENTS.md/current.md 和实际 branch/HEAD/工作区，再消费本包 CHANGELOG。远端审阅基线为 `1ac28980c4877f4a86adf586aeb1b66980e23504`；不得假设本地没有其他 writer 或未提交改动。

采用以下架构：可整体替换的是 Harness Core + runtime 私有扩展与原生执行状态；Work Core、共享内容/权限/回执 owner 和产品职责合同留在 CW。Spark 与 Attention 是确定自研的产品运行组合，优先消费 Pi core，Runtime 可替换。Expert 定义与其可运行封装分开。Provider 的协议/模型使用 profile 可以独立维护，原生 Runtime 已拥有模型驱动时不再二次编码。

把文档清楚分为架构边界、Runtime 接口、模型适配、产品组合、维护基线与三节点执行。canon 只做总入口，roadmap 持唯一顺序，current 只登记真实发生事实；旧 received/v1 字节保存，不重写，不沿用旧刚性首列。

第一张产品单是“固定支持集合，用当前 Pi 接入真实 DeepSeek，证明 GUI 控件—运行—工具—文件—权限—取消—历史的真实合流”。先做当前 SDK 合成协议测试和必要故障修复，再按用户 GUI 配置/预算跑真实模型。不以完整 Core-free、Compiler、memory/web/skill 全栈为它的前置；MCP 开放则必须修正原正确性问题，未支持必须真实关闭。

第二节点完成两条必要解耦并验证真实第二 Runtime，优先评估公开 Codex App Server。先用无 Work 前置的合成任务合同；不要先要求完整 NDA Expert 才验证替换。所有原生能力、权限/取消/历史及 experimental 边界由实际 binary/protocol 测试证明。

第三节点自研 Spark/Attention 运行组合，连同 Expert 和现 Work Core，完成“版本更新核查”小场景；再做同 Expert/同 Core 跨 Runtime 接手。性能实验决定选型厚度，不决定 Spark 产品是否成立。

每片保持单 writer、可解释的差异、独立 fixture 和回退。此包没有产品测试/模型调用/代码交付，不为本地会话自动补验收章；没有请求推送、创建远端 PR 或部署。

---

# 来源与证据范围

检索/复核日期：2026-09-12。文件路径和版本明确；研究建议与事实分列。外部动态文档只支持所述 API/设计存在，不等于当前锁定实现已支持。

<a id="s01"></a>
## S01 · 用户本轮指令与上一版原件

本轮用户明确提出：Pi core + extensions 整体可替换；Spark/Attention/Expert 是产品运行封装；provider 单独适配；按需维护自足状态；GUI 跑通、Runtime 替换、Work 小场景三阶段。设计选择以此为直接来源。

已读取当前对话正文文件 `CourtWork-harness-release-ruling-2026-09-12.md` 与 `03-PR-PLAN.md` 的相关内容，并程序读取上一版 ZIP 的 README、RD 计划和文档落位。上一版 ZIP 原字节随本包保存，hash 见 `input-receipt.json`。未把旧包自述的产品验证当本次测试。

<a id="s02"></a>
## S02 · CourtWork 固定架构及 main

[固定 DEC-013](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/architecture-runtime-canon.md)

[远端 main 查询](https://api.github.com/repos/lesPrivilege/Courtwork/branches/main)

connector 本轮返回 main=1ac28980c4877f4a86adf586aeb1b66980e23504。当前 canon 明确概念/实现边界、Pi 耦合、DRT 计划及各类状态 owner；未逐行重审整个仓库，未查本地未提交内容。

<a id="s03"></a>
## S03 · 当前 Pi 依赖

[固定 package.json](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/package.json)

三个 Pi 包固定 0.85.1，MCP client 2.0.0，Node engines >=22.19.0。本轮只复核声明，未安装或测试依赖，不从 package.json 推断实际二进制已运行。

<a id="s04"></a>
## S04 · Pi 官方 SDK

[SDK 文档](https://pi.dev/docs/latest/sdk)

公开描述嵌入、资源加载、AgentSession 与 Agent core 责任。latest 页面只作责任划分参考；具体 0.85.1 API 需从锁定包重核，不能由最新文档反推本仓已实现。

<a id="s05"></a>
## S05 · Codex App Server 官方介绍

[Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)，2026-02-04。

只用于确认官方公开接入方案及其总体目的，不声称所有产品内部接口都已开放。

<a id="s06"></a>
## S06 · Codex App Server 官方接口文档

[官方入口](https://developers.openai.com/codex/app-server) 本轮重定向 [ChatGPT Learn](https://learn.chatgpt.com/docs/app-server)。

公开 thread/turn/item、流式事件、interrupt、能力与 experimental 限制。页面同时存在稳定 API 子集与实验性功能/传输说明；实现时须 pin binary 和生成 schema，逐项确认支持。不由文档存在推导 CW 兼容或完整生产支持。

<a id="s07"></a>
## S07 · DeepSeek 官方思考模式文档

[思考模式](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/)

本轮搜索返回官方页面正文摘录，说明 effort/参数是否生效及工具请求的 reasoning metadata 回传条件；直接 open 重试返回内部错误，未取得完整页面。本文只采用这些摘录支持“需验证具体模型协议”，不基于摘录冻结完整 codec 或模型默认值。

<a id="s08"></a>
## S08 · DSH 固定架构参考

[Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/architecture.md)

本轮经 connector 读取 profiles/bundles、按启动或 live 的应用策略、service/provider/consumer 等相关内容。长响应后段截断，不声称全文独立审计。固定 SHA 来自上一轮公开取证；此处不声称是当前最新 commit。用作可替换组合的思想来源，不建议本轮迁入 Cordis。

<a id="s09"></a>
## S09 · Hermes 候选生态

[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)

检索核见官方仓库的会话/记忆/技能/调度等产品描述。只作候选包边界清点依据，未验证协议或独立生命周期，不为其创建已兼容状态，不采用宣传性比较结论。

<a id="s10"></a>
## S10 · OpenClaw 候选控制接口

[官方 Gateway 协议](https://docs.openclaw.ai/zh-CN/gateway/protocol)

官方搜索返回 WebSocket 控制、身份/scope 与协议/客户端包说明，并提示某些包可能尚未随版本发布。只证明有可研究的公开入口，不保证 npm 可安装或 CW 能消费；需版本/能力实测。

## 本包不是以下证据

不是产品运行、真实 provider、GUI、SDK protocol fixture、性能、安全审计、Runtime 替换或非作者验收。包内校验只证明交付文件完整、内部引用和阶段映射一致。实际采用和实现继续回到仓库唯一状态 owner。
