# Courtwork / Schema Engineering continuity — 独立 Pro 审查

日期：2026-09-08。审查类型：冻结源码的有界架构与评测方法审查，附独立观察级反例和纯函数执行证据。不是完整产品验收、渗透测试或全仓回归。

## 1. 总判定

**保留薄 Work Core；修复评分盲区与续行投影，再决定扩大 benchmark。当前 B0 是开发阶段的机制符合性测试及 benchmark seed，不是 SE 增量价值的实证验证。**

自研的合理边界是：规定哪个工作对象由谁拥有、候选在什么条件下取得正式效力、来源和义务如何随版本继续存在，以及下一次执行应披露什么。Pi 的执行循环、SQLite 的事务恢复，以及现成工作流系统已具备的持久化、审批和去重，不应被重新包装为独有贡献。当前实现已有复用基础，不建议因审查而整体改写为另一套 agent framework。

最需要立即消费的发现不是“缺少更多样本”，而是以下四项：

| 编号 | 优先级 | 判断 | 本轮证据 |
|---|---|---|---|
| R1 | P1，评测可信度 | 实際 cases 的部分检查点没有覆盖成果、义务或审计不变量，五种坏观察获通过 | 哈希核验原文件后，独立 grader mutation 执行 |
| R2 | P1，续行可用性 | 允许较长成果，但下一次 Context 必须全量携带它，默认预算不兼容 | 原始投影函数隔离执行；完整业务路径可达性仍需本地复验 |
| R3 | P2，模型状态披露 | 当前与来源过期候选可以得到完全相同的模型 Context，尽管可执行 review 动作不同 | 原始两个纯函数的对照执行 |
| R4 | P2，通用 Core 边界 | 正文中出现 URL 也会被当作外部路径拒绝 | 静态源码确认；未运行完整提交路径 |

P1/P2 是本次工程与证据优先级，不是公开漏洞严重性评级。没有据此发现或证明越权写入；R2、R3 也不能被误写成真实模型已经犯错。

### 1.1 冻结范围

| 对象 | 固定版本 | 用途 |
|---|---|---|
| Courtwork 技术审查 | `d879e2ff94d234120f902e15101c103943719e33` | 本报告全部生产/benchmark 源码判断 |
| Pro handoff | `61df606889b060a5d91451ca2d476835b6bdbbe3` | 审查任务说明；比较确认相对 d879e2f 只新增 handoff.md |
| B0 独立回执 | `ab500c7ed77289d3de376ee55b5c78c2c3f24410` | Luna 原始报告记录的实际运行 HEAD |
| Paper 9.6 | `d78fd312955c1f594e59cbdcbb0d3074ac355940` | Canonical、Practice 与 Index 的解释边界 |
| 历史 Core 交付 | `133269184468f1adf3b38acfc59091818daeb8e8` | 历史证据坐标，不冒充本轮重跑 |

没有修改仓库、推送提交、执行付费模型或访问个人凭据。用户所述远端 main 未变未在本轮另行核查；本轮只核查 handoff 相对技术基线的差异。

### 1.2 实际执行与未执行

容器直连 GitHub 克隆失败（DNS 无法解析）。因此通过 GitHub connector 读取冻结源码，再将四个完整文件复制到隔离目录，并逐一核对 Git blob SHA-1 和 SHA-256。它们是 `grade.mjs`、`cases.json`、`grade.test.mjs` 与 `app/core/owner.mjs`。前两者 SHA-256 也与已读取的 Luna 原始回执一致。不是完整 checkout，也没有核对历史报告中的全部生产依赖哈希。

本轮环境为 Node `v22.16.0`、Python `3.13.5`；Node 低于 handoff 的完整工程要求。仅执行无第三方依赖的 grader 与原始纯函数，没有将此环境当成受支持的应用复现环境。

实际结果：原始 grader 单元测试的一个 subtest 通过；五个不应通过的观察变体全部获得 `grade.pass=true`；两个检测控制均被 grader 拒绝；两个 Context 探针均复现预期现象。各组不能加总为一个“产品通过率”。

**未执行**：完整 B0/Core 回归、HTTP host、Pi loop、SIGKILL、真实模型、真实法律评价、GUI 或真实人的接管。Luna/作者的 5/5 是仓库已有运行证据，不是本次独立复跑。完整源码安全面、所有模块和完整 Paper/Index 条目也未逐一穷尽；本报告依赖已读取的关键区段与下列定位。

## 2. 按严重度列出的发现

### R1 — P1：当前 oracle 对真实 cases 存在可执行的误通过

**位置（均为 d879e2f）**：[`grade.mjs:5–11`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/benchmarks/continuity/grade.mjs#L5-L11)、[`cases.json:10–14`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/benchmarks/continuity/cases.json#L10-L14)、[`courtwork.mjs`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/benchmarks/continuity/courtwork.mjs)、[`grade.test.mjs`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/benchmarks/continuity/grade.test.mjs)。

Grader 逐项比较 `expected` 声明的字段，并核对 checkpoint 数量；未声明字段不进入评分。这本身不是代码算法错误，局部期望也不必复制整个数据库。但若用这些 cases 支持“重放/恢复后成果和义务仍然正确”，缺少跨检查点不变量就会构成实质测量缺口。

| 探针 | 被改变的观察 | 当前评分 | 漏掉的性质 |
|---|---|---|---|
| M1 | receipt-replay 最终 artifact 变为错误内容 | pass | 重放后的正式成果保真 |
| M2 | receipt-replay 最终 openObligations 变为 `[]` | pass | 未完义务未消失 |
| M3 | restart 中间状态正确，但最终 retry 后 artifact=null、义务清空 | pass | 恢复之后继续操作仍安全 |
| M4 | normal 合法完成后的 audits=0 | pass | 提交和审计的共同存在 |
| M5 | actor-spoof 拒绝后，合法 accept 的最终 artifact=null | pass | 正常路径实际形成成果，而非只增加计数 |

控制 C1：修改 normal 已声明的成果字段，会失败。控制 C2：真正的“全拒绝、无正式效应”会失败。因此，**不能指控现有 B0 完全不能识别 reject-all**；正确判断是，它能识别这一粗粒度退化，但尚未覆盖多条轨迹上的持续有效性。

探针对完整、独立构造的规范化观察进行变异，并未令生产 Core 实际损坏数据。五个变体是测量反例，不是五个独立工作样本，也不是五个已观测产品故障。原始 grader 测试通过并不矛盾：该测试主要变异一组自造期望里已经声明的字段，没有对真实 case 的未评分字段做变异。

另一个静态问题在 adapter：义务投影只保留 open 的 ID，decision/audit 只保留数量。即使扩充 expected，仍不能仅靠这些值发现义务文本、blocking 属性、关闭依据、决定 actor 或 scope 被改错。Raw trace 保存了更多信息，但 `run.mjs` 的 grader 调用没有利用它。这不是“没有证据”，而是“已有证据没有进入自动裁判”。

**最小修复**：增加独立的全局不变量与关系检查，而非仅给每个 case 补几个常量。至少检查正式成果身份/字节或内容摘要、来源版本、未完义务的关键语义、决定的主体与范围、receipt 对应的唯一效应、被拒绝操作不改变原有合法状态。对全套真实 cases 做 mutation coverage；额外字段可忽略，关键可观察后果不能忽略。

**独立验证**：非实现作者提交至少上述五种坏观察；它们应失败，正常等价观察应通过。更换实现的物理 ID、表结构和合法内部版本号不应改变评分。修复之前不宜把 5/5 用作超出这些已声明检查项的完整连续性指标。

### R2 — P1：成果容量与下一次 Context 容量不兼容

**位置**：[`owner.mjs:13–18,72–78`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/owner.mjs#L72-L78)、[`work-adapter.mjs:1–7`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/extensions/work-adapter.mjs#L1-L7)、[`work-adapter.mjs:252–273`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/extensions/work-adapter.mjs#L252-L273)。

候选输入/修订 schema 允许至多 100,000 字符的 artifact_text。`compileWorkContext` 将整个 active artifact 放进 required Context，并在默认 24,000 的字符串长度预算处直接抛错。`WorkExtension.begin` 在创建新 Run 之前调用它。

本轮对原函数传入包含 **25,000 个 ASCII 字符**的 artifact，得到 `CONTEXT_BUDGET`。这里预算单位是 JavaScript 字符串 `.length`，不是模型 token。此探针证明默认投影会拒绝这一状态；完整“提交合法长成果→关闭 Session→新 Session 续行”的可达业务路径尚未执行。因此应标记为高可信静态链路加隔离函数证据，而非已复现端到端故障。

**后果**：工作成果可持久化的尺寸和系统能继续处理它的尺寸分离，可能出现“已经有正式成果，却无法启动下一次工作”的状态。扩大模型 window 或简单调高常量只能推迟同一问题，不能兑现工作存量与单次 attention 分离。

**最小修复**：Context 只强制携带成果身份、版本/摘要、适用状态、当前必要约束与受控读取入口；正文通过有范围和权限的 artifact read 按需披露。关键约束必须有完整性/遗漏测试，不能只截断正文或用未经治理的摘要替代正式成果。若暂不提供按需读取，应在成果进入正式状态前明确并统一可支持上限，同时保留对已有过大状态的恢复方案。

**正反控制**：短成果、超过投影预算但仍在公开输入上限内的成果、接近输入上限的成果，均测试新 Session 的合法续行；另测必要约束确实超过预算时的可解释 refusal。不要让“所有长成果拒收”在未声明范围时冒充连续性成功。

### R3 — P2：模型投影丢失候选是否仍可被裁决的依据

**位置**：[`owner.mjs:29–31,72–78`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/owner.mjs#L29-L31)。

`workProjection` 检查候选的 base/source/contract 是否匹配，才暴露 decide。但 `compileWorkContext` 的 pending 项只投影 `id/baseVersion/domain`，不保留候选 source_version、contract_version 或适用性结论。

构造两个状态：Matter 的 source_version 都为 2，候选均为 pending、base_version 都为 0；唯一差异是候选来源版本分别为 2 和 1。原始函数执行得到：

```
current humanActions: [decide, revise_candidate]
stale   humanActions: [revise_candidate]
compiled Context.text: byte-identical
```

这证明模型可见状态丢失了一项能改变后续合法动作的区别；不证明模型必然因此失败，也不证明 Core 会接受旧候选。事实上 Core 的 stale check 仍是独立防线。修复优先级取决于模型是否承担候选续行/修订判断，但 B2 若要测试 governed Context 的优势，这一歧义必须先明确。

**最小修复**：加入来源/契约基准与显式 applicability/stale reason，或者将当前可用候选和只能修订的历史候选区分投影。不要因为过期就不可检索，也不要把历史接受自动解释为当前来源仍有效。用“同 base，不同 source/contract”的对照测试验证模型与人的投影保持语义一致，而非逐字一致。

### R4 — P2：把成果正文当路径进行全局黑名单校验

**位置**：[`work-adapter.mjs:160–164`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/extensions/work-adapter.mjs#L160-L164)、[`core.py:validate_candidate_payload`](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/core.py)。

任意正文包含 `://`、`../` 等模式就会被拒绝。例如包含 `https://example.org/reference` 的普通 memo 会触发路径拒绝。此结论来自源码条件，未通过完整提交路径执行。

**后果**：通用文本成果不能正常引用 URL。这也说明实验数据约束已经进入共享语义层：文本作为正文被保存，与工具解引用外部路径是两种不同能力。

**最小修复**：分别定义纯内容字段与路径/URL 资源字段；对后者的实际读取施加权限、路径规范化和网络策略，不要通过禁止正文写下 URL 代替执行边界。增加“带链接但不执行任何读取”的合法控制与真正越界路径请求的拒绝控制。

### 2.5 不作为本轮新发现的已知限制

B0 的 restart 是优雅关闭/重开；actor case 是可信 Core 的 payload 检查，不是 HTTP 身份安全；拒绝类别尚未区分；没有新的独立 NDA 语料、真实模型或人的实验。这些已经在协议、Luna review 与 next-capability 中明示，不应伪装成此次首次发现。它们仍是下一层结论的准入条件。[协议](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/research/se-continuity-2026-09-08/README.md)／[回执](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908/README.md)／[Luna review](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908/luna-review.md)。

## 3. Claim — Mechanism — Evidence — Gap — Falsifier

| 主张 | 可定位机制 | 现有证据能支持什么 | 缺口 | 可反驳结果 |
|---|---|---|---|---|
| 候选不自动生效 | save_candidate 与 decide 分离；可信工具只暴露读来源和提交候选 | 源码与 B0 已声明字段支持局部 proposal/commit 分离 | HTTP、工具执行身份及旁路需分别验证 | 未经相应 Authority 产生正式效应 |
| 正式对象有唯一 owner | SQLite Core 的 matter/candidate/artifact/decision；WorkCoreOwner 注入共享 client | 关键源码与契约符合单一正式 owner 的设计 | 未穷尽全仓所有写路径；GUI/部署不是本次范围 | 出现另一份独立可写的“已接受成果” |
| 接受、状态、审计、回执共同提交 | Core.decide 内同一事务；内容读回摘要；request hash 绑定 actor/scope | 已读取代码显示原子提交意图；历史回归另有证据 | B0 对内容/义务覆盖有 R1；本轮没跑 SIGKILL | 指定断点后部分提交、重复效应或回执错配 |
| 过期来源不能批准旧候选 | source revision 与 contract/CAS 检查；历史 membership | B0 的 stale-source 轨迹与静态机制 | 对相关/不相关更新的误阻塞与修复成功率未知 | 旧候选生效，或无关变更使合法工作长期无法完成 |
| 义务不能被静默抹去 | Core._check_obligations：既有 ID/文本/blocking、关闭引用校验 | 局部形式约束，不是语义上“这份证据真的履行义务” | Adapter 只计 open ID；真实 completion oracle 缺失 | ID 保留但义务被改义，或无关证据被当作关闭依据 |
| 跨 Session/producer 保留工作 | durable project scope、historical read、只读 fallback | 契约与历史交付记录；B0 不测这些路径 | 需要新的 HTTP 与重新加载后的有效续行 | 删除 Session 后丢成果，或缺 producer 时还能变更正式状态 |
| governed Context 改善续行 | compileWorkContext + frozen Run provenance | 纯函数可定位；R2/R3 暴露当前边界 | 尚无 T/S/E 对照；没有模型效果证据 | 普通状态/历史同等可靠更便宜，或投影增加关键遗漏 |
| SE 提高成果可采用性 | 专业 Contract、外部 Reviewer 与接受后的后续结果 | Paper 定义了责任；当前 synthetic NDA 仅实验规则 | 未有独立法律样本和真实接受结果 | 持续增加误阻塞/专家劳动而无收益 |
| 人类更容易接管 | 人类 Work Surface + 历史、证据、状态 | 目前只是设计与假说 | 真正参与者、任务随机化、时间与错误指标未运行 | 接管理解/错误/时间不改善，或长期技能下降 |

源头定位：[Core 提交路径](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/core.py#L781-L960)、[义务/证据检查](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/core.py#L576-L780)、[Work Core 契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/contract.md)、[NDA 范围](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/nda.md)、[Paper §8.5](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md#L822-L884)、[Paper §14–15](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md#L1377-L1490)。表中“有机制”不等于“已完成效果验证”。

### 3.1 循环论证究竟在哪里

从公开 Work Contract 派生符合性测试，并不是循环论证。类似协议实现当然需要测试是否遵守协议。Paper §8.5 同时要求真实 Review/downstream adoption 校验外部效度，本身没有把两者混为一谈。

循环发生在：先以 SE 的字段/规则定义成功，再证明自己的实现符合这些字段/规则，最后据此宣称“SE 比普通工作系统更有价值”。目前只能证明局部实现符合局部声明。要增加因果解释力，需要另一种实现也能参加、外部工作要求决定成功、S 具备正常工程能力，并在不利结果出现时允许删掉 E 的额外结构。

`grade.mjs` 没有生产 validator import 是好的代码依赖边界，但只解决一层独立性。观察 adapter、语料作者、工作标准、Reviewer 与调参过程仍各有泄漏/偏置风险。生产 verifier 可以在系统处理候选时正常使用，不能再作为评测其专业正确性的唯一裁判。

### 3.2 外部对照带来的约束

本轮重点复核六组外部来源，均为原始论文或官方文档；没有独立复现其报告的效果。

| 来源 | 可以借用的东西 | 不可借用的结论 |
|---|---|---|
| Temporal 官方消息处理文档 | Update validator、回执/结果、去重、异步 handler 的一致性边界 | 框架有这些机制，不等于已实现本地领域约束；不能用裸引擎充当弱 S |
| LangGraph 官方 Functional API | checkpoint、interrupt、恢复与任务幂等的边界 | HITL/恢复机制不等于专业成果被正式接受 |
| Resume Means Resume，2608.03836v2 | 跨实现恢复符合性、实际 SIGKILL、独立 durable effect ledger、liveness 的评测方法 | 该版本说明 artifact 尚非公开；不能当作即刻可复用的公开 harness |
| Mnemosyne，2607.00269v3 | proposal/admission、义务与修复、同提交路径的成本匹配、正负控制 | 其约束集的有效性不是一般专业正确性，作者实验不能替 Courtwork 证明收益 |
| Matrix，2608.12761v1 | 结果正确与 provenance 完整分开；契约跨作者迁移的负面测试 | 作者明确报告过度阻塞的迁移失败；机制忠实不能替代契约适用性 |
| τ-bench，2406.12045 | 使用数据库后果而非模型自述评分；多次运行可靠性 | LM 模拟用户不是真人接管实验，最终状态也不足以覆盖全部中间治理后果 |

**版本限制**：Mnemosyne 的固定 v3 原文由 Exa 成功读取，其中明确有四例 Temporal SDK 对照，不能笼统说它“没有 Temporal 对照”。web 的无版本 HTML 返回头部标作 v2 的缓存页，不能把它当 v3 引用或拼接两版数字。Matrix 固定 v1 原文同样由 Exa 读取；web 未能另行取得该页。报告不依赖这些来源的具体效果数字来裁定 Courtwork。

来源与阅读限制见附录 B。与相邻工作相比，SE 需要明确哪些收益来自工作语义/信息选择/人机协作，而非重复宣称持久化、审批和版本控制已经有用。

## 4. 自研与复用裁决

| 模块/能力 | 裁决 | 具体理由与边界 |
|---|---|---|
| app/runtime/pi-session-runtime.mjs | 保留薄适配，复用 Pi | 已读取源码导入上游 session/runtime，不应为 benchmark 重写 loop；替换性需实际第二适配验证 |
| SQLite 存储、事务、备份、故障恢复 | 复用成熟机制 | 当前 BEGIN IMMEDIATE、事务和约束是在使用数据库，不是自研数据库；保留业务原子边界和测试 |
| app/core/core.py 的提交协议 | 保留最小工作语义 | 候选不可变、授权范围、版本基准、receipt 绑定与 obligation 后果可以是自有契约；不能推导技术独有性 |
| core.py 内实验 b1 event/rebuild 分支 | 有条件抽出 | production bridge/client 固定 b0；如没有生产消费者，独立为实验/测试实现，减少生产可信计算基，而非重写当前数据 |
| bridge.py / client.mjs | 保留或简化私有传输，不扩成新通用 RPC 平台 | 对现有 Node/Python 边界有实际用途；不宣称私有进程本身就是完整安全隔离 |
| owner.mjs Context Compiler | 应自有语义，立即修 R2/R3 | 这是 SE 最直接的待测增量；复用 tokenizer/检索组件，但不能丢掉工作适用状态 |
| work-adapter.mjs | 保留通用 lifecycle 接缝；清除意外领域假设 | 提取内容/路径不同类型；公共 schema 可生成验证器，但各信任边界仍须验证，不能为 DRY 删除服务端复验 |
| inbound-nda domain | 留在领域包 | rule/evidence/completion 由专业场景定义；不进入通用 Core；当前 synthetic predicates 不充当法律标准 |
| identity/approval | 保留业务授权映射，复用成熟身份设施 | 单人 local-user 仅是当前 profile；不能当多人 RBAC/组织问责已经验收 |
| benchmarks/continuity | 保留 runner 思路，独立化观察和 oracle | 优先覆盖反例与 S，而非继续增加自产领域 fixtures |

当前源码保留 b1 分支不等于生产使用 event sourcing；私有 capability 检查也不能仅因 Python 内可构造对象而宣称存在远端绕过。此类结论必须有真实调用边界和攻击可达性证据。

源码：[Pi 接缝](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/runtime/pi-session-runtime.mjs#L1-L46)、[CoreClient b0 启动](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/client.mjs#L64-L80)、[owner](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/owner.mjs)、[Core](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/app/core/core.py)、[NDA 契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/nda.md)。

### 4.1 T / S / E 必须怎样保持公平

**T 是历史/检索驱动的执行策略，不应被剥夺正常的提交工具和基础安全。S 是认真构造的常规持久化业务系统，不是“只有一个 Markdown 摘要”。E 是当前实际实现的显式工作语义，不是 Paper 全部愿景。**

S 至少允许版本化来源和成果、常规任务表、审批、CAS、事务、幂等与可查询回执；也允许正常的数据库关联和工程优化。若这些足以通过 B0，这是应有的校准结果，不是 S 作弊。相同业务要求可用不同物理结构实现；不能要求 S 也叫 Matter、Candidate，或者恰好按 Courtwork 的内部版本号递增。

Paper 自身允许事务表替代事件溯源，并允许既有 system of record 成为 owner。因此，S 可能已经实现 SE 的某些逻辑纪律。若 S/E 的功能处理相同，只剩命名和文件组织不同，这不是有效的因果对照，不能硬做三条曲线；应改成同一基础实现上的具体组件消融。

需要冻结：原始资料及更新时点、合法工具与权限、同一基础模型/配置、运行预算、人工审批时点与信息、Reviewer 标准、开发/调参投入边界。所谓同信息是可获得的事实相同，不是强制三个条件 prompt 逐字相同；投影恰恰是待测处理。不能把 E 的状态编纂、verifier 开发、额外输入 token、人工补录和维护成本藏在实验外。

建议两个相互分开的实验：

- **固定续行起点**：给定同一份已成立的工作与原始证据，比较状态投影如何影响恢复、版本判断、义务与成本。明确这是受控起点，不证明 E 能低成本自行形成该状态。
- **端到端形成与续行**：从原始工作输入开始，让各条件产生候选、审阅和状态，再经历改变/中断。全过程计入捕获、纠错、维护与人工成本。

在共同身份、CAS、事务和幂等之上，可做 `P×G` 消融：P=任务化治理投影；G=具体领域的语义准入/完成约束。关闭 G 不意味着关闭普通授权、事务或版本保护。测量分别报告合法成果、违规正式效应、误阻塞、恢复、关键遗漏和资源成本，不用一个总分吞掉权衡。

## 5. 下一轮最多三个有界交付

以下是拟议施工边界，不表示已经启动任务，也不授权付费运行。

### D1 — 观察契约 + 评分反例 + 最小独立 S

**范围**：只先修改 benchmark/evaluation 侧；外加一个独立、最小但正常的 CRUD/approval/transaction S。将问题 R1 的全局不变量、跨实现语义拒绝类别、完整观察映射与版本冻结落为文件。不要从 Courtwork validator 复制 oracle，也不要让 S adapter 合成实现没有的审计/义务证据。

**正控制**：E 与 S 对语义等价的合法完成都应通过；ID 和存储结构变化不改变结果。**负控制**：五个已给变体、全拒绝、错误来源/actor/obligation 关键语义、重复效应、missing/extra checkpoint、unknown/timeout；合法拒绝不能用任意基础设施错误替代。

**观察**：成果身份及内容、来源基准、义务关键语义、权限范围、提交/回执对应关系与运行失败分母。以运行前持久化的 attempt manifest 记录计划样本，防止崩溃前尚未写报告的尝试从分母消失。

**接受/停止**：所有预先声明的坏观察必须被识别，合法语义映射不受实现名字约束；否则不扩 B1/B2。S 若已经与 E 同样通过全部机制测试，不再宣传这些机制分数证明 SE 增量。

**独立复核**：非作者维护至少一组 mutation 与等价实现映射，并核对 raw evidence 到 normalized observation 的转换。

### D2 — 先修投影，再跑 HTTP 续行与真实中断

**范围**：R2/R3（以及 R4 的小修复）按生产 writer 分工单独提交，benchmark 不夹带新权限。用临时 dataDir、port 0、loopback provider，测试新 Session attach、sources 更新、修订后接受、producer 缺席读取/禁写与重新加载后的有效续行。可先使用通用 memo 隔离机制；NDA 层另标 synthetic，不自动算法律任务。

**正控制**：合法新候选能完成，超 24k 但仍在公开支持范围的成果能有界续行，无关来源更新不会被无解释地长期阻塞；历史成果与来源仍可查。**负控制**：相关来源变化后的旧候选、HTTP actor 注入、producer 缺席时变更、错误 scope、重复请求、同键异内容。

**故障**：至少精确区分提交前 SIGKILL 与提交后未 ACK 的 SIGKILL；触发以屏障/握手定位，不能只 sleep 一个时间。断线丢回执与真正杀进程分别报告。恢复先查询 receipt，再以同 request ID 重试。

**观察**：独立读取持久化成果/状态及其对应记录；如存在外部副作用，另用独立 effect sink/ledger，而非只看 agent trace。当前没有外部发送的场景不得虚称测试了外部 exactly-once。并记录未知、超时、无法续行和人工干预。

**接受/停止**：不存在半提交、重复正式效应、未授权变更、错误义务消失；合法工作在声明预算内能继续。只读历史不计为可执行续行。若失败，先修机制；若 S 同等成立且更简单，优先删减冗余实现，不升级叙事。

**独立复核**：非生产实现作者掌握 fault driver、恢复后观察器与至少一个失效 mutation；保留进程退出状态、请求/响应、数据库快照和哈希。

### D3 — 外部作者任务 + 有界模型 pilot；C3 后置

**范围**：只有 D1/D2 通过后，冻结 S/E 的真实处理差异，以少量、已授权的真实模型调用估计方差、成本和故障分布。新任务不能是开发 fixture 换名字；需独立编写的事实/版本变化/正确拒绝和必须完成的对照。法律标准需合格领域 Reviewer，而非生产 synthetic verifier 自证。

**正控制**：材料充分、来源有效、授权完整时产生可采用成果。**负控制**：证据不足、来源已被更新、需修订但不能沿用旧结论；也必须有“看似异常但合法”的样本测过度拒绝。按基础 Matter 分组留出，不能把同一模板的多次 seed 当独立样本。

**观察**：任务质量、合法完成率、违规效应、误拒绝、恢复/关键遗漏、token/latency、状态编纂和 verifier 维护成本、expert-hour。固定续行起点与端到端两种设计分别报告。用 P×G 消融归因，避免只比较整套组合。

**接受/停止**：事前给出具有业务意义的最小收益/风险与成本容忍界限；pilot 主要估计方差和可行性，不以小样本的“不显著”宣称等效。只有不确定区间足够窄，才能作不劣性/等效判断。S 或 T 在约定指标上不劣且总成本更低时，收缩 E 的显式结构；E 持续漏掉开放问题或提高专家劳动，则缩小场景/契约，而不是补更多偏向自己的 cases。

**独立复核**：任务作者、实现作者和接受 Reviewer 尽量分离；不可能完全分离时明确记录角色重叠。新 corpus/rubric 提升版本，已看过/调优样本不重标留出。

### 5.1 C3 与论文范围

模型换一个 executor 成功续行，只能支持机器可恢复；历史能打开，只能支持可读性；两者都不证明人类能快速理解和接管。τ-bench 式 LM 模拟用户也不能替代真实参与者。

C3 可从首轮实证主张中后置，但保留为独立研究问题。真正的短期接管实验需要真人、相当复杂度且不同的事项、平衡顺序/学习效应、判断错误与耗时，以及“误把历史接受当当前有效”的控制。它仍不能证明长期技能不会退化；后者需要纵向重复测量。不要将四层证据压成一项“handoff success”。

### 5.2 从 B0 到 benchmark / systems paper 的最低增量

不存在添加到某个固定题数就自动成为可信 benchmark 的门槛。最低应形成：独立工作要求；跨实现观察契约；可参加的强 S；正常/拒绝/恢复/liveness 正反控制；按基础事项分组的未调优任务；公开运行失败和完整成本；清晰的来源、版本与复现工件。

Systems paper 可以先不声称法律质量或人类接管，而聚焦“在明确故障模型下保持正式工作状态及可继续性”的有界系统贡献。但必须对照相邻的 conformance、transaction admission 与 workflow 研究说明新增点，并证明收益不只是普通事务/审批已经提供的性质。若所有有意义结果均由现有工程惯例解释，应将产物定位为可复用工程套件或案例研究，不为追求论文叙事另造重型 runtime。

F12 还需更长时间跨度与模型替换；小型 B2 不能一次性判定所有长期命题。F22/F24 分别允许治理管线与稀疏投影在无收益时降级，F18 允许独立 Work benchmark 在无增量解释力时退回 E2E 的一个部分。[Paper 证伪条款](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md#L1460-L1490)。

## 6. 现在可以公开什么

建议现在的发布面措辞：

> Courtwork 提供一个本地工作状态与提交边界原型，将候选生成和正式接受分开，并提供来源版本、义务、回执与可恢复状态的机制。冻结的开发测试目前包含一个合成 memo 任务族、五条脚本机制轨迹；作者及已有独立回执均报告通过其已声明检查。后续独立审查发现了评分覆盖和 Context 续行边界，尚待修复与端到端复验。这些结果不证明真实模型、法律工作质量、真人接管或相对普通持久化系统的效果优势。

不要写：“SE 已被 benchmark 验证”“完整治理已通过”“法律 Agent 已达到专业交付”“跨 Session 等于人类接管”“5/5 是五个独立任务”“历史 170/170 加本轮 5/5 构成产品总分”“普通 runtime 不可能实现这些能力”。

**最终裁决**：Core 的局部机制值得保留；不需要为了自证先扩成更厚 runtime。下一项投入应当使一个更简单的系统有机会赢，而不是使 Courtwork 更容易在自己的题目里全绿。

---

## 附录 A：本轮复现包

同目录 `probes/` 包含四份哈希核验过的原文件、两个新增探针、结果 JSON 与原测试日志。`source-manifest.json` 记录完整文件 Git blob SHA-1 / SHA-256；`verify_sources.py` 在执行前验证。

```sh
cd probes
python3 verify_sources.py
node --test grade.test.mjs
node mutation-probes.mjs
node context-probes.mjs
```

mutation harness 退出 0 的含义是“确认现有 grader 确实有这些误通过”，不是“修复后通过验收”。修复后的目标应让 M1–M5 的 `observedGradePass` 全部为 false；不要不加修改地将当前探针当作新代码应维持的绿色回归。

Context 探针仅移除原文件的两条 import，以加载原始纯函数；不实例化 WorkCoreOwner，函数体保持不变。输入是合成 view，不是真实数据库 snapshot。长成果输入的语义适格性与完整 Session 生命周期须按 D2 补验。

本报告的可下载文件是本轮生成的审查交付，不是提交回仓库的文件。

## 附录 B：外部来源索引与解释边界

读取日期：2026-09-08。以下只支持机制与方法比较，不对其作者结果作独立背书。

1. [Temporal — Handling Signals, Queries, & Updates](https://docs.temporal.io/handling-messages)。官方文档；重点读取 Update Validators、idempotency、handler races/termination。框架文档不证明领域模型正确。
2. [LangGraph — Functional API](https://docs.langchain.com/oss/python/langgraph/functional-api)。官方文档；重点读取 persistence、interrupt、replay、idempotency。部分未完成任务可重跑，外部效应仍须正确去重。
3. [Resume Means Resume，2608.03836v2](https://arxiv.org/html/2608.03836v2)。原始论文；checkpoint/interrupt/resume conformance、SIGKILL、独立 durable effect ledger；该版本写明 artifact 未公开，不能承诺直接复用代码。
4. [Mnemosyne，2607.00269v3](https://arxiv.org/html/2607.00269v3)。Exa 读取固定版原文；proposal/admission、有效状态、义务、约束集相对保证；包含 Temporal SDK 对照。web 的[无版本页](https://arxiv.org/html/2607.00269)返回 v2 缓存，不能作为 v3 性能数字的互证。没有执行其开源 artifact。
5. [Correct Is Not Governed / Matrix，2608.12761v1](https://arxiv.org/html/2608.12761v1)。Exa 读取固定版原文；作者报告 synthetic contract-transfer 的过度阻塞，区分 mechanism fidelity 与 contract validity。web 另行读取失败；未核验代码/实验。
6. [τ-bench，2406.12045](https://arxiv.org/abs/2406.12045)。原始论文；比较最终数据库状态与标注目标，模拟用户由 LM 扮演。只采用评测设计，不将 2024 年模型分数作为当前能力描述。

## 附录 C：主要内部来源与本轮阅读范围

- [handoff（61df606）](https://github.com/lesPrivilege/Courtwork/blob/61df606889b060a5d91451ca2d476835b6bdbbe3/engineering/research/se-continuity-2026-09-08/pro-review-handoff.md)；[协议](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/research/se-continuity-2026-09-08/README.md)；[下一能力](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/research/se-continuity-2026-09-08/next-capability.md)。
- benchmark 的 cases/grader/grade.test/runner/adapter 已读取；四份完整文件完成 blob 哈希核验，详情见 manifest。
- Core 关键区段：core.py 1–960；bridge.py 1–210、280–465；client.mjs 1–150；owner.mjs 全文；work-adapter.mjs 1–360；Pi 接缝 1–115；service.mjs 1–115。未声称这些是全文件或全安全面审计。
- [共享契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/contract.md)、[NDA 契约](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/docs/work-core/nda.md)、[current](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/current.md)、[architecture](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/engineering/architecture.md)。architecture 保留历史设计坐标，不用其旧路径覆盖当前 source owner。
- [B0 证据总页](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908/README.md)、[Luna review](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908/luna-review.md)、[Luna 原始报告 1–90 行](https://github.com/lesPrivilege/Courtwork/blob/d879e2ff94d234120f902e15101c103943719e33/evidence/se-continuity-20260908/luna-independent.json#L1-L90)。读取了 HEAD、环境、哈希和首条观察，并未重新核验所有历史 trace。
- [Canonical](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)：重点复核显式化/删除测试、Matter/存储实现边界、§8.5 benchmark、§11.5 归因、§14–15 边界与证伪；[Practice 1–85](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md#L1-L85)、[Practice Index 1–72](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md#L1-L72)用于核对文本责任与证据分级。
