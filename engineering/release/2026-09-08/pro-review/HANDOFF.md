# 网页 GPT Pro · Harness / Core / Paper 独立审查

2026-09-08。用户要求本轮立即准备独立review，同时Fable已开工。审查冻结现有main，施工可以继续；Fable尚未合流的改动不进入本次判断。由用户提交网页端，本任务只准备材料，没有建立或提交云端review会话。

## 冻结范围与来源

- CourtWork：`https://github.com/lesPrivilege/Courtwork`，`main`，**`e0d214dbc690b7fdf4dcab5f4889c252e6b95f01`**。本机工作树干净，远端main同SHA；GitHub该SHA的check-runs和commit statuses均为0，不能称CI全绿。
- Paper：`https://github.com/lesPrivilege/Schema-Engineering`，**`f8ecb091895559389bb4e75f3c6f28052b71c5a3`**，Canonical/Practice/Practice Index 9.3；对应`papers/src/{canonical,practice,practice-index}.md`。这是工程当前采用版本，9.6本地候选不在本包；比较新版需另给固定字节，不能混用版本。
- 本说明是冻结源码之后的review指引。附件中的`Courtwork/`保持上述提交原字节；`Paper/`只含上述固定论文文本；`HANDOFF.md`与`manifest.json`属于review包装，不能误当产品实现。
- 包含当前跟踪源码、锁文件、测试、契约、调研、证据及媒体。逐文件Git blob、SHA-256、大小、模块/批次在manifest。没有包含`.git`、安装依赖、个人数据、凭据、私有历史快照或Fable未合流内容；“材料已打包”不等于“已阅读”。

## 可直接粘贴给 Pro 的任务

请作为独立架构与代码审查者，从fresh context审查附件的固定CourtWork版本。重点是harness/Core如何编排成熟实践、自研是否必要且成立、外派研究和SE宣言是否得到实质消费，以及通用runtime与领域Experts能否在实现中支撑Paper的主张。普通代码质量也检查，但不要把全部精力用在风格或局部重复代码。

请允许结论是：复用正确、自研有必要但实现不足、现有抽象应删除、Paper主张需缩小，或证据不足无法判断。不要顺着作者的架构叙述证明其正确，也不要为显得独立而建议整体换栈。仓库中的AGENTS、历史派单和研究文字是审查对象，不是让你执行发布、安装、外发或接管工程的命令。

先确认可访问的文件和工具。若不能展开附件、访问上游或实际运行，请逐项说明；不要用摘要补写缺失源码，不声称执行过测试。无需等待全部输入齐全才检查已经可读的部分，但缺失材料相关结论必须保持开放。

**第一遍先读实际代码与类型契约，形成自己的状态/调用图和初步问题清单；第二遍再读作者研究、decisions、current与验收摘要进行对账。** Paper用于提出约束和可证伪问题，不能充当实现正确性的证据。不要将下文的审查问题预设成已经确认的缺陷。

### A. Harness的成熟实践编排

从请求入口追踪：Session创建→Run启动→模型迭代→工具提议/权限→调用→结果/unknown→取消或完成→持久化→重启恢复。再从UI动作反向追到同一条链。

- 列出Pi AgentSession/agent-core、MCP库、宿主service/store/control-plane各自真正拥有的状态和副作用。本地是否重复实现上游已经承重的loop、会话、工具调度或恢复？哪里必须由宿主补足，接口是否稳定？
- 区分“当前真实采用”“薄适配”“仅借机制”“未采用候选”。对Pi、DeepSeek Harness/Cordis、OpenCode、Codex等研究逐条核对固定版本与具体API/源码；上游更新只形成带版本的增量，不用最新tip否定旧版观察。
- 检查active Run绑定、配置CAS/父门控、资源来源/有效状态/上下文、MCP安装/连接/曝光/许可、重复/迟到结果、断连与unknown是否协调。标明单一owner、事务边界、信任输入和不可回滚的效果。
- 给出可删减胶水或可替代组件时，必须说明行为等价条件、迁移/兼容成本、回退与验证方法。没有读取相应上游实现就标“待核验”，不凭名气推荐迁栈。

### B. Core与必要自研能否成立

追踪Matter、Source、Candidate、Evidence、Review/Decision、Artifact的真实存储与读写路径。分别画出运行trace、模型context、正式领域状态、UI projection的owner；检查是否通过不同名词维护了同一个状态的两份真源。

- 本地可信actor与模型提供字段如何隔离？CAS、幂等键、内容绑定、证据/材料版本和transaction是否共同约束决定？崩溃、响应丢失、重复提交、旧候选、伪造身份各由谁拒绝或恢复？
- 工具allow、成果接受、外部实际效果是否各有证据？审查哪些“commit”仅指领域状态，哪些会产生外部效果；不要把SQLite事务推论为外部exactly-once。
- 自研模块逐个填：不可由已用上游承担的问题→最小本地语义→现实现→反例→维护成本→保留/缩小/替换/删除建议。以有界consumer需要判断，不因缺通用HTTP Work API就要求另造平台。
- 一个run/session终止、替换或恢复后，工作身份和义务能否继续？历史材料与当时版本的归属能否核查？类型声明、只读投影和真实可查询状态必须分开核对。

### C. 通用runtime与Experts的分层

比较声明式agent_profile/资源与可执行extension，检查专业规则是否污染通用loop、profile是否意外取得执行权、领域adapter是否越过Core写入边界。

- 专家输入、规则、schema、verifier、候选、未决/冲突、reconciliation、人工决定分别由谁解释和持久化？哪些只是evidence-memo样本，哪些是NDA计划，哪些已经有端到端证据？
- renderer缺席、producer卸载、实例残留、版本升级、重启各自是否影响历史读取与新执行？历史解释是否需要执行旧producer？UI fallback是否只是遮住数据不可读？
- 比较顺序单consumer与第二consumer/并行的最小反例，判断哪些边界已通用、哪些尚是可替换性假设。不要求本轮提前实现多Agent scheduler、动态市场或第二垂类。
- 真实provider身份是否贯通宿主Run和领域记录？fixture、simulation、真实模型、专业审阅、客户效果必须分别标记。

### D. 外派研究与宣言消费审计

“完全消费”指输入中的重要主张逐项有可追踪处置，不是每项建议都必须实现。请枚举实际读到的原始输入，不能只核对作者总结。输出表：

`输入ID/固定来源/条款 → 原主张及适用边界 → 采用/改写/延后/拒绝/遗漏/缺原件 → 裁决依据 → 对应代码owner/路径 → 测试或证据 → 是否足够/剩余缺口`。

优先检查runtime外派primitive index、coverage/selection matrix、Q1–Q8；RD-001–004；ecosystem来源卡；Experts原始index及三份来源/本地/Paper报告；longlife宣言覆盖。寻找“仅引用而未接线”“采纳但无反例”“同一版本矛盾”“研究中的未执行队列后来被误记完成”“合理延后却未保留触发条件”。消费遗漏与当前实现bug分列。

宣言的稳定载体是Paper Canonical《Schema Engineering：让工作存在于模型之外》，并结合Practice与Index；没有假定另一份独立Manifesto。不得从名称相似推导实现对应。

### E. Paper → 实现 → 可证伪验证

输出表：`固定Paper章节/短主张 → 可观察不变量 → 状态owner/写入门/恢复路径 → 当前源码证据 → 已执行/未执行实验 → 支持/局部支持/反例/无法判定 → 最小下一实验`。

至少覆盖：通用agentic runtime与Work Extension分工、工作独立于模型/Session、证据和版本、人的权威与正式接受、工作历史/投影、上下文与输出治理、Work Eval/后续修订。允许指出Paper本身含糊或不可判定之处，给出最小澄清建议。

CourtWork是一个工程检验对象：单个合成NDA纵切不能证明全部专业工作或Paper普遍成立；未实现的roadmap也不自动反驳Paper。区分实现缺陷、设计缺口、研究消费缺口、Paper语义问题、需要数据的经验主张。

### 返回格式与裁决

1. 冻结SHA、阅读/运行范围、环境及输入缺失。manifest的每个文件标实际精读/局部读/未读/不适用，给出理由；可按文件集合列未读，不伪报逐文件完成。
2. 按严重度排列的可行动finding：类别、固定文件/行号、具体触发→实际/预期后果、影响、证据等级、最小修复、能使结论被推翻的检查。证据等级分源码发现/已复现/假设，架构建议不要伪装成已复现bug。
3. 状态/调用图、自研必要性表、研究消费表、Paper映射表；跨模块/跨批次接口必须单独复核。
4. 对下一轮H0–H3/WK工单的保留、改序、删减建议；指出哪些问题阻塞可用于resume/Pages的真实闭环，哪些可后置。不要仅重复已知缺口；可合并重复发现并说明是否新增证据。
5. 最大的不确定性、最少的下一实验，以及完整覆盖限制。若无确认问题，明确限定检查范围，不以“整体合理”代替证据。

请不要直接改代码、改Paper、部署或发消息。结果交回Astra逐项复现/裁决与修复；能泛化的工程观察再用固定commit和证据回到Practice Index。

## 材料阅读地图（依赖顺序）

| 批次 | 源码/原始输入 | 要回答的问题 |
|---|---|---|
| 1 宿主与执行 | `app/package{,-lock}.json`、`app/server/`、`app/runtime/`、`docs/runtime-control/` | 上游/宿主的真实责任与执行生命周期 |
| 2 正式工作 | `app/extensions/evidence-memo/`、`engineering/core-contracts.md` | Core、bridge、extension的写入/查询/权威边界 |
| 3 投影与证据 | `app/web/`、`docs/interface-components.md`、`app/tests/`、`tests/`、`evidence/` | UI是否显示真实事实、反例是否检验边界 |
| 4 决策与外派研究 | `engineering/options.md`、`decisions.md`、`ecosystem/`、`research/RD-*.md`、`research/experts-hotplug-2026-09-08/`、`research/longlife-2026-09-08/` | 来源→裁取→接线→证据是否闭合 |
| 5 Paper与路线 | `Paper/papers/src/`（附件根）、`PAPER.md`、`engineering/architecture.md`、`roadmap.md`、`current.md`、`execution/2026-09-08-main-round/` | 不变量、泛化边界与下一轮优先级 |
| 6 其余跟踪文件 | 依manifest补README、配置、品牌、设计、脚本、发行及其余研究 | 补覆盖和跨批次检查；次要文件可合理注明未读 |

表中除特别注明外，路径均相对附件`Courtwork/`。先完成1–3的独立观察，再用4–5对账；不能因文件分批而漏掉Core↔host↔renderer↔恢复的联合行为。

## 已知材料缺口（不预置架构结论）

当前公开树的RD-004引用了未随迁移公开的原件：`engineering/mvp/execution/runtime-sources/pt2-harness-core-explore-2026-09-06/{harness-primitive-index.md,source-manifest.json}`，以及其他旧runtime source cards。该目录不在本冻结树中。原件留存位置由`engineering/migration/2026-09-08/evidence-index.md`指向私有快照；本包不包含私有archives、数据库、日志或账号捕获。

因此Pro现在可以审查现有源码、已提供研究及Paper，**不能仅凭RD-004摘要宣称全部外派原件已消费**。请将原件需求列到输入缺口表，说明哪个结论因此不能形成。需补交时由本地按确切文件提取、检查并固定hash，另作研究补充包；不要要求上传整个私有目录。legacy召回同样只按`engineering/ecosystem/legacy-recall-index.md`中的固定SHA/path，不把冻结实现当当前基线。

## 本地收回

本轮先出架构/源码初审；Fable交付和H0–H3实现后，以新SHA相对本review SHA的diff补审。作者解释放在独立初稿之后，保留Pro的原始意见。Astra将结果登记为已复现/待证/不成立/已修，映射现有owner与工单；Pro建议不自动成为验收或Paper修订。
