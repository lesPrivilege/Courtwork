# R2：多写者协作 vs 跨案件图谱资产 —— 架构审查

审查对象：矛盾一（单写者 CAS vs 团队协作）、矛盾二（案件隔离铁律 vs 跨案件图谱资产）。
方法：源码 + 契约审查，结论落 `文件:行号`；外部生态标注 ✓-fetch（本次直抓）/ ✓-search（本次 WebSearch 命中摘要）/ ※（训练语料未核实）/ ⚠（本报告推断）。
今天 2026-07-14，训练截止 2025-05，外部生态结论均已实核。

---

## 0. 结论先行

**矛盾一（单写者 vs 团队协作）**：ADR-010 决定二的 `WorkStateHostPort.compareAndSwap` **契约已定+代码未实现**（全仓零命中，见 1.1）；今天实际在跑的三套文件账本中只有两套（confirmation、turn）具备真正的 first-wins 原子性且只经"同进程模拟并发"验证，另一套（event-log）连基本比较都没有、仅 demo/fixture 路径消费；但矛盾本身**没有粗看那么死**——CAS 的锁粒度是 `(caseId, sessionId)` 而非 `caseId`（ADR-010:28-31, 123-124, 149/154），意味着"每人一个 session、共享只读上下文"的协作形态今天的存储粒度基本兼容，真正欠缺的是**跨 session 的 case 级聚合读**（未建）和**真实多用户 actor 身份**（今天硬编码字面量，见 1.4）；只有当"分工批注"被产品定义收窄为"同一 session/同一 envelope 多人同时写"时，才需要 CRDT/锁等结构性改造。

**矛盾二（案件隔离 vs 跨案件图谱）**："无全局查询 API"是 Accepted ADR-005 的契约（ADR-005:10），但今天的文件级存储适配器对 `caseId` **零感知、零强制**，隔离是调用方路径拼接的**约定**而非机器门保证的**结构**（见 2.1）；roadmap Stage 2/3 依赖的 `conflict-group` 维度字段与 Intapp/iManage 集成预置**从未离开已归档文档、从未被任何 Accepted ADR 吸收**（无契约无实现，见 2.2）；行业实践（Intapp/iManage/Harvey，✓-fetch/✓-search，见 2.3）证明跨案件图谱与利冲隔离**可以共存**，但前提是把图谱做成独立治理的容器（显式 wall/`conflict-group` 授权 + party 规范身份），而不是打开 core 账本的 `caseId` 作用域——这条路径今天在 Courtwork **一层都未搭**，甚至连同案内跨文档实体对齐都未落地（CLAUDE.md「必须自研加固」+ `docs/status/current.md:52`）。**是否"建在沙上"取决于实现路径选择，不是物理不可能**——但如果图谱资产化图省事直接放开 `caseId` 作用域，就会踩线；成立条件见 3.2。

---

## 1. 矛盾一：单写者 vs 团队协作

### 1.1 ADR-010 决定二的持久层：契约已定，代码未实现

全仓 grep `WorkStateEnvelopeV1|WorkStateHostPort|compareAndSwap`，命中仅两个文件：`docs/decisions/ADR-010-work-live-boundaries.md`、`docs/research/durable-work-state.md`。**`packages/core/src/work/` 下零实现**：

- `/Users/lesprivilege/Projects/Courtwork/packages/core/src/work/work-protocol.ts:1-12` 与 `/Users/lesprivilege/Projects/Courtwork/packages/core/src/work/work-store-file.ts:1-7` 都只是重导出既有 `event-log`/`confirmation-store`/`revision-store` 模块的 barrel 文件，不是 ADR-010 决定二描述的统一 opaque blob envelope。
- `docs/status/current.md:49`："`WorkCommandPort` 契约与 projection 注入缝已经成立，但生产实现仍未装配；真实 run/resume 必须等待 ADR-010 的 browser/store/material/binding 前置。"
- `docs/status/current.md:50`："ArtifactEnvelope 的持久读写与 package migration 尚未接入真实生产账本……Work live 持久层未落地。"

**判定：契约已定+代码未实现。** `WORK-STORE-1` 未开工与题目前提一致，代码层面可独立验证。

### 1.2 今天实际在跑的三套文件账本：并发安全程度并不一致

ADR-010 决定二尚未落地前，`packages/core/src/{events,session,revision,turn}` 各自的 Node 文件适配器就是事实上的持久层，三者对"写者数量"的假设互不相同：

| 文件 | 并发原语 | 判定 |
|---|---|---|
| `/Users/lesprivilege/Projects/Courtwork/packages/core/src/events/event-log-file.ts:26-31` | 无。`append()` 先 `readAll().length` 算 `seq`，再无条件 `appendFileSync`，**没有任何比较-写入检查** | 两个真实进程并发调用可各自读到同一 `seq=N` 并各写一条，产生**重复/冲突 seq**，不报错、不拒绝——这正是不变量 4「静默降级零容忍」要防的那类问题，但这条路径今天没有护栏 |
| `/Users/lesprivilege/Projects/Courtwork/packages/core/src/session/confirmation-store-file.ts:42-57` | `writeFileSync(consumedPathFor(...), ..., { flag: 'wx' })`，OS 级原子独占创建（`O_EXCL`） | 跨进程真安全（本地磁盘上 `O_EXCL` 是内核保证的原子操作；网络文件系统上的等价保证需要额外核实，见下） |
| `/Users/lesprivilege/Projects/Courtwork/packages/core/src/turn/turn-store-file.ts:28-34` | `if (readAll().length !== expectedLength) return false; appendFileSync(...)`——先读长度比较，再写，**两步之间无锁** | 形状上是乐观并发控制，但两步之间没有文件锁或原子原语；同进程内安全（见下），跨进程未证 |

`event-log-file.ts` 是三者中**唯一今天有消费方**的一个：全仓 grep `createFileEventLog` 命中，生产/测试消费方全部在 `/Users/lesprivilege/Projects/Courtwork/packages/demo-runtime/src/acceptance/*.ts`（`run-s3-demo.ts`、`run-legal-demo.ts`、`run-s3-real.ts`）与 `packages/core` 自身测试，**没有 `apps/desktop` 生产路径消费它**。按 CLAUDE.md 架构边界表，`packages/demo-runtime` 是"demo/acceptance 唯一装配点与 CLI；只由开发/验收消费"。

**判定：event-log-file.ts 的并发假设＝仅 demo/fixture 成立**——目前无生产多写者场景触发这个漏洞，但如果它在未来被直接搬进生产（而不是被 ADR-010 决定二的 envelope 替代），会静默产生数据竞争，必须显式排除。

### 1.3 "并发只有一个成功"的测试覆盖边界：同进程模拟 ≠ 真实多进程

`turn-journal.test.ts:271-290`（`lets only one fresh file-store instance append a concurrent resolution`）构造了两个独立 `TurnStore` 实例指向同一文件，通过 `Promise.allSettled` 并发调用，验证只有一笔成功。**但这个测试仍在同一个 Node 进程内运行**：`readAll()`/`appendFileSync` 都是同步调用，中间没有 `await`，JS 单线程事件循环保证两个 `Promise.resolve().then(...)` 微任务不会真正交错执行——第一个回调会完整跑完（读、比较、写）才轮到第二个。这证明的是"同进程内两个 store 实例互斥"，**没有证明真实跨进程（例如两台机器/两个独立 Tauri 实例挂载同一共享文件夹）下 `readAll().length !== expectedLength` 这个检查不会被 TOCTOU 竞态击穿**。`confirmation-store-file.ts` 的 `O_EXCL` 路径没有这个局限（内核原语，天然跨进程），`turn-store-file.ts` 的路径有。

**回答题目问题"first-wins 语义在两个用户并发时表现是什么"**：按 ADR-010 决定二文本设计意图（⚠ 推断，因为决定二未实现，这是对契约文本的解读而非实测），`compareAndSwap` 失败应返回 `{ applied: false }`，是**安全拒绝**，不丢写——失败方拿到的是明确的"版本已变"信号，不是数据损坏。但这个设计承诺目前只覆盖"六条持久化顺序"里系统内部的单 actor 重试（`docs/research/durable-work-state.md` 第 2 节已指出六点里五点可安全 republish），**没有为"两个独立人类 UI 会话同时对同一 envelope 产生冲突增量"定义任何恢复/合并/提示 UX**——ADR-010 全文没有一处描述"用户 B 提交时被拒绝后，界面应该怎么办"。这部分是**无契约**。

### 1.4 actor 概念：schema 层已强制存在，真实身份值未实现

- `RevisionEvent.actor`：`/Users/lesprivilege/Projects/Courtwork/packages/schemas/src/revision-event.ts:5-9,15` 强制 `actor: { userId, role? }`，`userId` 必填非空；`/Users/lesprivilege/Projects/Courtwork/packages/core/src/revision/revision-store-shared.ts:13-15` 落盘前另外强制 `sessionId` 存在。
- `ConfirmationActor`（`/Users/lesprivilege/Projects/Courtwork/packages/core/src/events/types.ts:24-28`）与 `InteractionActor`（`/Users/lesprivilege/Projects/Courtwork/packages/core/src/turn/types.ts:69-73`）都带 `channelId`/`actorId`/`role?`，且在 `turn-store.ts:456-515` 的 `resolveInteraction` 里做运行时形状校验（`isInteractionActor`）。

**这条链路是真实存在且被强制的：判定＝契约已定+代码已实现**（"字段存在且非空校验"这个粒度）。

但**真实取值**完全不同：`/Users/lesprivilege/Projects/Courtwork/apps/desktop/src/App.tsx:441` 硬编码 `actor: { channelId: 'desktop', actorId: 'local-user' }`——这是唯一在生产 UI 代码里构造 actor 的地方，字面量写死，不来自任何登录/身份系统。全仓搜索 `apps/desktop/src/composition/package-runtime.ts`（ADR-010 决定一原文所指"actor 由 desktop identity dependency 注入"的实现应该在的位置）**零 `actor` 命中**；ADR-009 里的 `identity` 字段（ADR-009:134,207-208）指的是**包版本身份**（`identity.version`/`identity.schemaVersion`），与人的身份无关。

**判定：真实多用户身份注入＝契约已定（ADR-010 决定一原文承诺）+代码未实现。** 今天如果两个人共用一套安装/同一份 profile，所有 `RevisionEvent`/确认/交互都会记成同一个 `local-user`——Stage 2 "谁改的"这条律师留痕纪律核心维度，现在就算换了存储引擎也无法回答，因为身份系统本身还不存在。这是比存储格式更前置的缺口。

### 1.5 "分工批注"最小要改什么：三档方案，按置信度标注

关键澄清先行：ADR-010 的 CAS 锁粒度是 **`WorkSessionRef = { caseId, sessionId }`**（ADR-010:28-31），`WorkStateEnvelopeV1` 顶层同时带 `caseId` 和 `sessionId`（ADR-010:123-124），`read`/`compareAndSwap` 都以这个二元组寻址（ADR-010:149,154）。**这不是 case 级单一锁，是 session 级单一锁**——ADR-010 决定一"第一版每个 case 只允许一个 active Work command"（ADR-010:108）是叠加在存储粒度之上的**产品策略限制**，不是存储原语本身的物理限制。这一点 ADR-010 正文没有明说，只能从类型定义反推，是一处需要回灌的表述空白（见第 4 节）。

由此，"分工批注"的技术难度取决于产品对"分工"的定义：

| 方案 | 形状 | 工程成本 | 对现有存储的改动面 | 置信度 |
|---|---|---|---|---|
| **A. 独立 session、共享只读上下文**（"分工"＝各自领活，互不同时写同一份） | 放开决定一"每 case 一个 active command"的限制，改为"每 session 一个"；新增 case 级聚合读（跨多个 `sessionId` 合并 `artifacts`/`revisions` 视图，今天 `replaySession`（`event-log.ts:43`）只处理单一 flat 事件数组，**不存在多 session 归并逻辑**）；补真实 actor 身份 | 低——不改 CAS 原语本身 | 新增一个"case 级只读投影层"，读多个 session 的 envelope 做 union；不改单 envelope 的写路径 | ⚠ 推断，基于 ADR-010 类型定义直接归纳，非训练语料 |
| **B. per-actor 追加日志 + 合并/冲突提示**（"分工"＝允许对同一份东西各自追加意见，如批注） | 把"单 blob 全量重写"换成"每个 actor 一条 append-only 流 + 读时按因果序合并"，与 `docs/research/durable-work-state.md` 第 1.2 节已经为解决 O(N²) 写放大问题建议的"snapshot + tail log"是**同一个改造方向的自然延伸**——只是 tail 从单一序列变成按 actor 分片 | 中——需要新的 host port 原语（至少两个：append-with-offset-check、snapshot），Rust 侧仍不解析 schema，边界不破 | `WorkStateHostPort` 从 `read/compareAndSwap` 扩展为 `read/compareAndSwap(snapshot)/appendTail(perActor)` | ⚠ 推断＋✓-search 佐证（CRDT op-log 本质就是"多条 per-actor 日志 + 合并算法"，见下） |
| **C. 全量 CRDT**（"分工"＝真正同时编辑同一份 envelope，如 Google Docs 式协作） | 用 Automerge/Yjs 替换 envelope 的表示，自动合并并发结构化编辑 | 高——存储表示、host port、读写路径全部重做 | 最大：Rust 侧要么托管 CRDT 合并（违反"Rust 不解析语义"边界），要么只搬运 opaque CRDT change-set（可行，但仍是新协议） | ✓-search：Automerge/Yjs 均为 2026 年成熟生产库；Automerge 面向 JSON 文档+版本历史，Yjs 面向速度/实时文本（见来源 [1][2]），但**未找到证据表明业界把 CRDT 用在"审计强约束的法律事件账本"这类场景**——法律留痕纪律要求的是"谁在何时改了什么"的确定性可审计记录，CRDT 的自动合并语义与"人工确认门禁"（不变量 3）在语义上需要额外调和，不是拿来即用 |

**三档方案里，A 是今天存储粒度已经基本支持、只欠身份系统和聚合读的选项；C 是唯一需要引入新数据结构范式的选项。roadmap 原文"共享 AI 上下文 + 分工批注"没有消歧这两种解读之间的差异，这本身是一处需要回灌的产品定义空白，不只是技术空白**（见第 4 节）。另注：CRDT 天然把 actor id + 因果序绑定在每个操作里（✓-search 佐证 Automerge 的"Git-like history"特性），如果走 C 档，"谁改的"这个维度反而会比今天的单 blob 设计更自然地满足。

---

## 2. 矛盾二：案件隔离铁律 vs 跨案件图谱资产

### 2.1 「无全局查询 API」今天是否被强制：不是，是约定

ADR-005:10（Accepted）："容器是隔离边界；数据访问必须携 container/case id，不提供无作用域全局读取。"

代码证据：四个文件级存储适配器——`event-log-file.ts:11`（`createFileEventLog(sessionId, filePath, ...)`）、`confirmation-store-file.ts:21`（`createFileConfirmationStore(dir)`）、`revision-store-file.ts:9`（`createFileRevisionEventStore(filePath)`）、`turn-store-file.ts:12`（`createFileTurnStore(filePath, ...)`）——**签名里都只接收一个裸 `filePath`/`dir` 字符串，没有 `caseId` 参数，没有任何路径合法性校验、没有符号链接/穿越检查、没有"必须落在某个已授权 case 目录下"的断言**。隔离能否成立，100% 取决于*调用方*（今天是 `demo-runtime` 的 acceptance 脚本）自己拼对路径。

全仓搜索未找到任何名为"case 隔离""cross-case""fail closed"的边界测试覆盖这四个文件适配器（`docs/status/current.md:29` 提到 WORK-PORT-1 已验收"非 demo 与跨 **session** 查询 fail closed"——这验证的是同一 case 内跨 session 的越权查询，**不是**跨 case）。ADR-010 把真正的"宿主目录授权与 opaque case ref"放进未开工的 `CASE-ROOT-1`（ADR-010:254-256）。

**判定：ADR-005 的「无全局查询 API」＝契约已定+代码未实现（作为强制机制）。** 归档 58 号文档"跨案件读取结构性不存在"这句话里的"结构性"，在今天的代码里并不成立——准确说法是"没人写过违反它的调用方代码"，是**行为上的巧合**，不是**类型系统或运行时守卫**上的必然。这正是题目"Build 全绿不代表功能真实现"的一个具体样本：没有任何测试会因为有人写出跨 case 读取代码而变红，因为没人写过反例，机器门也不存在。

### 2.2 conflict-group 与 Intapp/iManage 预置：无契约无实现

全仓 grep `conflict-group|conflictGroup|利冲`：命中 8 个文件，**全部在 `archive/docs-legacy-2026-07-13/`**（`58-架构决定-数据治理与存储拓扑.md`、`25-架构决定-三层记忆与偏好.md`、`13-调研报告-记忆系统与用户偏好.md`、`16-调研报告-企业私域库接入.md`、`29-架构决定-企业私域库接入.md`、`60-调研...`、`70-对外镜像材料...`），**零命中现行 `docs/decisions/`、`packages/`、`apps/`**。

溯源链：`docs/decisions` 索引里不存在任何一份 ADR 提及 `conflict-group`；追溯到已归档材料——`13-调研报告-记忆系统与用户偏好.md:111,116,174`（利冲隔离与 Intapp/iManage 集成模式的原始调研）→ `25-架构决定-三层记忆与偏好.md:3,9`（"依据 docs/13 调研"，拍板"现在仅预留：届时经 schemas 提案增加 conflict-group 维度字段；利冲对接律所既有系统，不自建"）。**这条决定从未升格为 Accepted ADR**，全部停留在已归档文档层。

"Intapp/iManage"字面全仓 grep 同样只命中 `archive/` 内 5 个文档（13/16/29/02/08 号），现行代码与现行 ADR 零命中。`party-verify` 工具（ADR-010 决定五提及）是**主体身份核验**（核验 PartyGraph 里某个当事人名称是否真实/规范），与**利冲检索**是两个不同概念，不应混淆——今天代码里存在的是前者的接口位，不是后者。

**判定：conflict-group 维度字段与 Intapp/iManage 集成预置＝无契约无实现。** 按 `docs/README.md:22-31` 项目自定的权威层级（可执行 schema/类型/机器门 → CLAUDE.md → Accepted ADR → 包内 SPEC → 现行文档 → commit 史/`docs/research/`/`archive/`），archive material 处于**最低一档**，与其他任何层级冲突时"低层材料不能覆盖高层契约"（`docs/README.md:33`）——这条规则今天已经把 ADR-005 摆在 conflict-group 意向之上，只是没人显式执行/回灌成一个书面判断。

**旁证时间线（⚠ 推断，基于文件时间戳与内容比对）**：这批文档在 2026-07-13 被归档，ADR-010 在 2026-07-14（今天）Accepted。conflict-group 占位从未在这次归档-立 ADR 的窗口中被重新提出，是这条线索"断供"的直接原因——不是被否决，是被遗忘在了权威链外。

### 2.3 跨案件图谱与利冲隔离能否共存：行业证据支持"能"，但需要独立治理容器

**✓-fetch，Harvey Blog "Long Horizon Agents and Ethical Walls"（作者 Gabe Pereyra，2026-03-12 发布，本次 2026-07-14 直抓全文）**核心论证：

- "The most important design decision is making the client matter the atomic unit of the product... not as a metadata tag, but as a hard security boundary." —— 与 Courtwork 现行"案件即隔离边界"方向一致，是被验证的正确出发点，**不是要推翻的部分**。
- "An AI platform that tries to build its own parallel conflicts system is making a mistake. The right approach is deep integration: When Intapp says a wall exists between Matter A and Matter B, the AI platform enforces that wall at the retrieval layer, the context layer, and the output layer." —— 关键论证：利冲判断不该由 AI 产品自建，而是**接入律所已有的 conflicts 系统**（对应归档 25/13 号"利冲对接律所既有系统，不自建"），AI 产品只在检索层/上下文层/输出层**执行**已有的墙规则。
- "Fail closed, not open"——权限不确定时必须拒绝而非放行，与 ADR-005/ADR-010 的 fail-closed 纪律同构。

**✓-search，Intapp/iManage 官方产品页与 Gartner Peer Insights 摘要**：conflict check 本质上需要一个**独立于矩阵文档本身**的、横跨全所的当事人/企业/关联方索引（"conflict check systems scan across... contacts, matters, notes, documents"），这个索引的数据源覆盖面通常是"4-7 个独立系统"（律所常见现状），其本身不是案件工作内容库，而是专门为冲突检索维护的**元数据层**（姓名、别名、企业关联、matter 描述），访问权限比案件全文更宽（否则无法做筛查）但内容颗粒度远比案件全文窄。

**综合可行形状（⚠ 推断，基于以上两份实抓/实搜证据的架构外推）**：

1. 图谱库作为**独立容器**存在（类比归档 58 号"容器同构定理"里"任何未来容器类型=同一目录形状"的既有设计原语，可以复用而非另起炉灶），物理上不与 `cases/<caseId>/` 混放；
2. 从 case-scoped `PartyGraph`（`/Users/lesprivilege/Projects/Courtwork/packages/legal/src/schemas/party-graph.ts:34-40`，今天 `caseId` 是必填字段，`nodes`/`edges` 是 case 内局部 ID，**没有任何跨 case 复用的规范身份字段**——即当事人在两个案件里各是独立的 `PartyNode.id`，没有 canonical entity id 做关联）导出到独立图谱库，必须是**显式、留人确认**的动作（呼应核心不变量 3"留人确认……属于用户"），不是后台静默同步；
3. 独立图谱库自带 `conflict-group`/wall 授权维度，读取该库时按律师的当前 case 归属与墙配置过滤，而不是放开 core 账本的 `caseId` 作用域；
4. 利冲判断本身**接入律所既有系统**（Intapp/iManage 或国内等价方案，需律所侧已有基础设施，Courtwork 不自建裁决逻辑）——这条 Harvey 已验证是行业正确解，Courtwork 归档决定方向一致，只是从未落地。

**对现行存储拓扑的改动面**：新增一个容器类型（独立于 `cases/`/`workspaces/`/`unfiled/`）+ `PartyGraph` schema 新增 canonical entity id 字段（当前没有，见上）+ 一条"case-scoped 图谱 → 团队级图谱库"的显式导出/确认流程 + 一个新 ADR 定义该容器的访问控制与 `conflict-group` 语义。**这不需要修改 core 账本的 `caseId` 作用域本身**——图谱库是并列的新东西，不是把老账本的门打开。

### 2.4 "建在沙上"判断的成立条件

Stage 3 监控层（合同履约、对手方风险、投资穿透）全部依赖 Stage 2"图谱资产化"完成。这个判断**只在以下条件下成立**：

- **如果** Stage 2 的实现路径选择"为省工程量，直接放宽 core 账本的 `caseId` 作用域或新增一个跨 case 的查询 API 去支撑图谱聚合"——那么它直接违反 ADR-005 Accepted 契约，且没有 2.3 节描述的独立治理层兜底，此时"建在沙上"成立：一旦利冲事故发生（律所最敏感的合规红线），监控层的商业信任基础会连带崩塌。
- **如果** Stage 2 按 2.3 节的"独立治理容器 + 显式授权 + `conflict-group` 过滤 + 律所既有系统接入"路径实现——这条路径行业已验证可行（Harvey/Intapp 现实产品），"建在沙上"不成立，但**代价是这条路径今天一层都没搭**：没有 ADR、没有 schema 的 canonical entity id、没有同案内跨文档实体对齐（CLAUDE.md 明确列为"必须自研加固"项，`docs/status/current.md:52`："`services/ingest` 仍只有规格，OCR、分类与实体对齐未落地"），更不用说跨案实体解析。三层积木（同案对齐 → 跨案解析 → 治理化存储）一层未建。

利冲隔离规则本身涉及具体执业规范（中国律师执业利冲规则、律所内部合规制度），本报告只陈述架构与行业事实，**不构成法律意见，需法务/合规角色复核**律所对"跨案件当事人图谱"这一数据形态本身在合规口径上是否被允许（即便是独立治理容器）。

---

## 3. 时序问题

### 3.1 两个矛盾必须在哪个工单之前解决

- **矛盾一**：必须在 `WORK-STORE-1` 定稿（ADR-010 决定二从"契约"变成"代码"）之前解决——一旦 `WorkStateEnvelopeV1` 的存储形状、host port 签名写成代码并有真实数据落盘，"单 envelope 全量 CAS"与"per-actor/多 session"两种形状之间的迁移就从"改文档"变成"改协议+迁移已有数据"。
- **矛盾二**：不直接阻塞 `WORK-STORE-1`（图谱库是并列新容器，不改 core 账本），但必须在**任何 Stage 2 图谱资产化代码开工前**解决——最迟不晚于团队协作层（一个案件=一个共享文件夹）开始实现之前，因为共享文件夹本身就会让"谁能看什么"这个问题从单机单用户场景第一次变成真问题。

### 3.2 现在改 vs Stage 2 再改的代价

**现在改（矛盾一）**：

- `WorkStateHostPort`/`WorkStateEnvelopeV1` 目前是纯文本契约，零实现、零下游消费者、零已发布用户数据依赖它的具体 wire 格式。
- `docs/research/durable-work-state.md` 已经因为 O(N²) 写放大问题独立建议"snapshot + tail log"两段式改造（第 1.2、5.1 节）；矛盾一分析进一步指出这个 tail 如果按 actor 分片，同一个改造顺带解决多写者问题——**两件事是同一次 `WORK-STORE-1` 工单内可以合并处理的同一个方向**，不是要另开一条路。
- 结论：现在改的边际成本≈在已经要写的工单里多带几个字段/接口决定，而不是推翻已交付的东西。

**Stage 2 再改（矛盾一）**：

- 届时 `WORK-STORE-1` 大概率已落地、已发布（`docs/status/current.md:37`：v0.1.1 Apple Silicon 构建已公开发布，说明团队有对外发布节奏，不是纯内部原型），本地已有真实用户数据在跑单 blob CAS 格式。
- ADR-010 决定三已经预留了 schema 版本迁移机制（`ArtifactEnvelope.schemaVersion` + "未知版本/缺 migration 隔离该 contribution"），但那是为"字段增删"设计的迁移，**不是为"从单一权威文件变成需要身份系统仲裁的多写者模型"这种所有权语义变化设计的**——后者不是一次 migration 脚本能吃下的，需要产品级重新设计+用户已有数据的迁移策略。
- 结论：Stage 2 再改的代价是"改一个已发布、已有真实数据、已被下游消费的实现"，显著高于现在改一份尚未落笔的契约。

**现在改 vs Stage 2 再改（矛盾二）**：

- 图谱资产化所需的三层积木（同案实体对齐、跨案实体解析、治理化跨案存储）现在一层都没有，所以"现在改"的说法不完全适用——更准确的表述是"现在补齐 ADR 层面的方向判断（新开一个图谱库 ADR，明确不打开 core 账本作用域）"，这件事的成本极低（一份 ADR + schema 加一个字段位），但如果拖到 Stage 2 实现压力下才第一次讨论，容易在时间压力下选择"打开作用域"这条危险捷径——**代价不是技术返工，是合规风险窗口期**。

---

## 4. 回灌建议

1. **ADR-010 决定一/二**：补一节"多 actor 语义"，显式写清楚：(a) `WorkSessionRef` 的锁粒度是 `(caseId, sessionId)`，"一个 case 一个 active command"是叠加的产品策略而非存储原语限制，为 Stage 2 方案 A（独立 session）预留改动路径；(b) actor 的真实注入点必须在 `WORK-PORT-1`/`WORK-STORE-1` 验收前从"desktop identity dependency"落到具体接口，即使 Stage 0/1 仍是单机单用户，也应该现在留出身份提供者的插槽，避免 `actorId: 'local-user'` 这类字面量散布到更多调用点后才发现要拔除；(c) 明确决定一"不支持并行 agent/subagent"这句话是否也覆盖"人类"，消除文本歧义。
2. **ADR-005**：补一条可注入反例触红的验收标准（比照 ADR-010 已有的"case A 读取 case B 必须 fail closed"验收下限句式），并在 `CASE-ROOT-1` 工单验收标准里写明"必须有测试证明跨 `caseId` 路径穿越会被拒绝"——把"结构性不存在"从今天的"没人这么写"变成"这么写会红"。
3. **新开一份 ADR**（不是修订 ADR-005，因为这是全新存储拓扑决定）：把归档 25/13 号文档的 `conflict-group` 维度字段与"利冲对接律所既有系统、不自建"正式转正，纳入 2.3 节的"独立治理容器 + party 规范身份 + 显式授权"形状，并明确"图谱库不得通过放宽 core 账本 `caseId` 作用域实现"这条红线。此 ADR 不阻塞 `WORK-STORE-1`，可并行调研，但必须在任何 Stage 2 图谱代码开工前 Accepted。
4. **文档治理缺口**：`04-长期Roadmap.md` 已归档，按项目自身权威层级排在最低档，与 Accepted ADR 冲突时天然让位（`docs/README.md:33`）。如果 Stage 2/3 仍是真实产品方向，需要把存活的部分提炼进一份现行、非 archive 的文档（如 `docs/product/` 下），否则未来的架构会话没有义务去满足一份权威链之外的文档——这很可能正是本次两个矛盾"直到现在才被看见"的直接成因：2026-07-13 的归档动作把产品意图和当天的契约层切断，而没有一份 ADR 去承接。

---

## 5. 来源与证据附录

### 5.1 代码证据（本仓库，file:line）

- `docs/decisions/ADR-010-work-live-boundaries.md:28-31,78-98,104-174,254-256` —— `WorkSessionRef`/`WorkCommandPort`/`WorkStateEnvelopeV1`/`WorkStateHostPort`/依赖图
- `docs/decisions/ADR-005-data-security.md:7-11` —— 容器隔离契约原文
- `docs/decisions/README.md:1-24` —— ADR 权威层级与变更规则
- `docs/README.md:20-33` —— 项目文档权威层级（含 archive 最低档裁定规则）
- `docs/status/current.md:29,37,49-52` —— WORK-PORT-1 验收范围、v0.1.1 发布状态、架构债 1/2/4
- `packages/core/src/work/work-protocol.ts:1-12`、`work-store-file.ts:1-7` —— barrel 重导出，非独立实现
- `packages/core/src/events/types.ts:24-28,45-116` —— `ConfirmationActor`、`SessionEvent` 判别联合（大多数事件类型无 actor 字段）
- `packages/core/src/events/event-log.ts:11-30,43-90` —— `EventLog`/`replaySession`（单 session 视角，无跨 session 归并）
- `packages/core/src/events/event-log-file.ts:11-36`（尤其 26-31 行）—— 无 CAS 的文件 append
- `packages/core/src/session/confirmation-store.ts:24-32`、`confirmation-store-file.ts:21-84`（尤其 42-57 行 `O_EXCL`）
- `packages/core/src/revision/revision-store.ts`、`revision-store-file.ts`、`revision-store-shared.ts:13-15`
- `packages/schemas/src/revision-event.ts:5-9,15,48` —— `RevisionActorSchema` 强制 `userId`
- `packages/core/src/turn/types.ts:69-73,109-113,155-162` —— `InteractionActor`/`TurnJournalBackend`
- `packages/core/src/turn/turn-store.ts:404-415,443-516` —— `appendWithRetry`/`resolveInteraction` 的 CAS 重试与 actor 校验
- `packages/core/src/turn/turn-store-file.ts:12-37` —— 文件级 `TurnJournalBackend`（长度比较非原子）
- `packages/core/src/turn/turn-journal.test.ts:238-290` —— 并发测试（同进程模拟，标注局限）
- `packages/core/src/scenario-executor/executor.ts:525-563` —— `RevisionInput`/`buildRevisionEvent`，`caseId` 仅为可选 payload 字段
- `apps/desktop/src/App.tsx:439-443` —— 硬编码 `actorId: 'local-user'`
- `apps/desktop/src/composition/package-runtime.ts` —— 全文 grep `actor` 零命中
- `docs/decisions/ADR-009-runtime-ports-and-harness.md:134,207-208` —— `identity` 指包版本身份，非用户身份
- `packages/legal/src/schemas/party-graph.ts:34-40` —— `PartyGraph.caseId` 必填，无跨 case 规范实体 id
- 全仓 grep `conflict-group|conflictGroup|利冲`：仅命中 `archive/docs-legacy-2026-07-13/docs/{58,25,13,16,29,60,70}*.md`，现行代码/ADR 零命中
- 全仓 grep `Intapp|iManage`：仅命中 `archive/docs-legacy-2026-07-13/docs/{13,16,29,02,08}*.md`，现行代码/ADR 零命中
- `archive/docs-legacy-2026-07-13/docs/25-架构决定-三层记忆与偏好.md:3,9` —— "依据 docs/13 调研"、"conflict-group 维度字段"拍板原文
- `archive/docs-legacy-2026-07-13/docs/13-调研报告-记忆系统与用户偏好.md:111,116,174` —— Intapp/iManage 伦理墙调研原文
- `archive/docs-legacy-2026-07-13/docs/58-架构决定-数据治理与存储拓扑.md:25` —— "无全局查询 API……结构性不存在"原文
- `archive/docs-legacy-2026-07-13/docs/04-长期Roadmap.md:28-29,34-44` —— Stage 2/3 团队协作层、图谱资产化、监控层原文
- `docs/research/durable-work-state.md` 第 1.2、2、5.1 节 —— O(N²) 写放大与 snapshot+tail 建议（本报告矛盾一 1.5 节 B 档直接承接）
- CLAUDE.md 架构边界表（`packages/demo-runtime` 行）—— "demo/acceptance 唯一装配点与 CLI；只由开发/验收消费"

### 5.2 外部证据

- ✓-fetch，2026-07-14 抓取，原文发布 2026-03-12：[Long Horizon Agents and Ethical Walls](https://www.harvey.ai/blog/long-horizon-agents-and-ethical-walls) —— matter-centric isolation 作为"硬安全边界"、利冲判断接入既有系统不自建、fail-closed、retrieval/context/output 三层墙执行
- ✓-search，2026-07-14：Intapp Conflicts 与 iManage Conflicts Checking 产品页摘要（[intapp.com/conflicts](https://www.intapp.com/conflicts/)、[imanage.com Conflicts & Intake](https://imanage.com/imanage-products/risk-compliance/conflicts-intake/)）—— 冲突检索连接企业既有数据源，AI 分诊+专家复核
- ✓-search，2026-07-14：律所冲突检索一般需要横跨 4–7 个独立系统的元数据层，覆盖当事人/别名/matter 描述/关联方（[Clio](https://www.clio.com/blog/conflict-check-how-to/) 等聚合摘要）
- ✓-search，2026-07-14：Automerge（JSON 文档+版本历史）与 Yjs（速度优先/实时文本）2026 年现状（[automerge.org](https://automerge.org/docs/hello/)、[yjs/yjs GitHub](https://github.com/yjs/yjs)）——CRDT 生态成熟，但未见业界将其用于法律留痕账本场景的直接案例，是本报告的外推而非已验证实践
- 本报告未能找到（未搜索到）中国大陆律所利冲检索系统（对标 Intapp/iManage）的公开架构资料；国内实践现状建议另行调研，本报告的行业证据以美国大所生态为主，**中国执业利冲规则细节需法务复核**，本报告不作为法律意见

---

**判定词汇小结**（按题目要求的五分类逐条落位）：

| 条目 | 判定 |
|---|---|
| ADR-010 决定二 `WorkStateHostPort`/`compareAndSwap` | 契约已定+代码未实现 |
| ADR-010 决定一"每 case 一个 active Work command" | 契约已定+代码未实现（策略层未接线；但为审慎的 v1 范围声明，非疏漏） |
| confirmation-store-file 的 `O_EXCL` first-wins | 契约已定+代码已实现 |
| turn-store-file 的乐观并发（length-check-then-append） | 契约已定+代码已实现，但验证范围仅限同进程模拟，跨进程未证 |
| event-log-file 的 `seq` 计算（无 CAS） | 仅demo/fixture成立 |
| `RevisionEvent.actor`/`ConfirmationActor` 字段强制存在 | 契约已定+代码已实现（字段粒度） |
| 真实多用户身份注入 | 契约已定（ADR-010 决定一原文）+代码未实现（硬编码字面量） |
| ADR-005"无全局查询 API"作为强制机制 | 契约已定+代码未实现 |
| `conflict-group` 维度字段 | 无契约无实现 |
| Intapp/iManage 集成预置 | 无契约无实现 |
| roadmap Stage 2/3 跨案件图谱资产 vs ADR-005 | 契约与roadmap冲突（archive 层级最低，天然让位，但产品意图未被程序性关闭） |
