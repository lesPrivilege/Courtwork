# ADR-021：卷宗工作语义层（standing brief）

- 状态：**Accepted（2026-07-28；蒸馏触发、单一 compiler/双 Work adapter、预算、Turn/CAS/重启语义已冻结）**。实现仍须按 `DOSSIER-FLOW-1` 精确票面开工；本 ADR 不把任一尚未实现的能力升级为 product-live。
- 日期：2026-07-26（占号落痕 2026-07-27；接受 2026-07-28）
- 关系：消费 ADR-019（容器为唯一持久组织单元）与 ADR-009（模型调用只经 Turn Engine，pi 对话回合例外不外溢）；与 ADR-013 互补（全局 memory 不装案件内容，本层只装本卷内容）；与 ADR-016 同族（系统编译注入）；为 ADR-012 垂类包的「prompt 接口」提供正式通道；`DOSSIER-FLOW-1` 的契约基座。

## 背景

container 级设计与 session 级设计的分界：Work 的上下文不是 Codebase 级，也不由某一 session 拥有，而是一批**反复读取的工作语义**（kit 总纲、playbook、案件要点）。现行机制族（场景六段 assembly、memory 蒸馏段、系统编译续行投影）已证明「段不入史、每请求重渲染」的形态可行；缺的是把它升格为**卷宗级第一类契约**，使通用层无需垂类包即可注册常驻语义，垂类包只是同一入口的又一供给者——完全解耦。

## 决定一 · 语义段不入史，每请求系统重编

卷宗常驻工作语义段是独立注入段：不进对话 journal（史是 append-only 账本），每次请求由系统编译现场重渲染——「替换尾部 turn」的正名。固定段前缀稳定，天然前缀缓存友好（甜点档经济学；与实测表「DeepSeek 前缀缓存是否需显式 breakpoint」条目联动）。

## 决定二 · 供给者闭集（首版四类，扩集须修订本 ADR）

1. **卷内文件**：用户显式指定的已入库文件（kit 的 AGENTS/playbooks 即此形态）；指定动作即授权。
2. **历史输入蒸馏**：系统对本卷旧 input 的 summarize（挂 ADR-019 决定二摘要化实施；蒸馏是系统行为，可整体重建）。
3. **系统锚点**：自动触发的结构化锚点（案件状态、续行投影既有机制并入此类）。
4. **垂类契约包声明段**：包 descriptor 声明的语义注入——垂类 prompt 接口的唯一正式通道，包不得绕过本层另辟注入路径。

### 决定二细化 · 蒸馏供给者定形为「工作语义笔记本」

- 蒸馏产物落为卷内**逻辑笔记本文件**（用户可见、可审、可改；用户改动即转文件供给者语义）。
  v1 正文与 revision 和 Dossier 状态住同一原子信封，不冒充用户授权根中的 OS 文件，也不做跨
  filesystem 原子承诺；未来显式晋升到用户「工作稿」须另走修订/授权契约。
- 收割输入永远是冻结的 source range：上一次已提交 `sourceCut` 之后、本次 `frozenCut` 之前（含）的来源。只有笔记本修订与账本事件同一次 CAS 成功，`sourceCut` 才推进；provider 已返回但提交失败，不得冒充已覆盖。
- **硬约束（入门禁）**：已被前轮摘要覆盖的原始切片，本轮蒸馏输入必须显式排除（opencode `hidden`／pi `firstKeptEntryId` 同构）；违者即退化为重复劳动。
- 与决定三的相容表述：蒸馏内容由模型生成，但**须经 ADR-016 填格协议的 schema 约束结构化输出**落入笔记本，再由系统编译入段——被禁止的是自由散文直写，不是模型参与。

### 蒸馏触发闭集与 v1 最简形态（2026-07-28 冻结）

- v1 只允许三条触发路径：①场景 descriptor 明示、且用户发起首次全量阅读时的一次可选首读收割；②容量水位接近时系统提出 `ask-user`，用户确认后执行；③用户显式触发。
- **明确拒绝**每 N turn、idle timer、后台 worker 与静默逐出触发。文件供给者已经足够时零蒸馏；拒绝提议不改变任何水位或笔记本。
- DeepSeek 没有可在请求前精确判定的 cache TTL，因此“热/冷”只作为实验中的实际 hit/miss 结果，不是运行时触发条件。逐出增量的自动调度与冷 rebase 均后置；若未来引入，须携实测收益和并发仲裁证据修订本 ADR。
- **自动增量 / 冷 rebase 解锁前实验（落 eval 底座）**：以 Socmdia kit 为语料跑三组对比——甲·纯滑动窗零蒸馏／乙·热窗收割＋冷 rebase／丙·传统全量 compact；计量各组累计 input 成本（hit/miss 分列，rawUsage 真源）与任务达成质量；蒸馏净收益 = 丙、乙差值扣除蒸馏自身成本。数据不支持乙优于甲时，蒸馏整条维持「仅显式触发」，不得解锁自动化。

## 决定三 · 一个 Dossier compiler，两个显式 Work adapter

Dossier 状态只有一个确定性 compiler。它不认识 React、pi、Scenario 或 provider，输出冻结为：

```ts
interface DossierContextEnvelopeV1 {
  schemaVersion: 1;
  containerId: string;
  stateVersion: number;
  renderedDataBlock: string;
  renderedSha256: string;
  manifest: DossierContextManifestV1;
}
```

`manifest` 是用户可见的来源、冲突、截断、估计器与版本清单，不含密钥；`renderedSha256` 对
`renderedDataBlock` 的 UTF-8 字节取 SHA-256。adapter 只能原样放置该 data block，禁止重排来源、
重写内容或另算第二份 manifest。相同状态快照、route profile 与 task-independent compiler 配置必须
产出 byte-identical envelope。

compiler 内稳定顺序为：系统锚点快照 → 垂类包声明的**数据来源** → 用户显式文件（声明序）→
笔记本当前修订 → 受限历史尾窗。四类供给者在渲染面形成
`system_anchor | vertical_declared | user_file | notebook | history_tail` 五种 authority（历史
蒸馏供给者同时拥有 notebook 与 tail）。每个供给块必须带 `sourceId`、`revision`、内容摘要与
`authority`。顺序只为确定性与缓存，不代表 last-write-wins；系统锚点不能被用户文本覆盖，其他
来源出现同名或相反语义时两者都保留，并在 manifest 标为冲突，不让模型静默合并或自行裁出赢家。
垂类的规则/步骤仍只住既有 declaration/projection；`vertical_declared` 只能提供数据，不得重复注入
规则。供给者变更（增删文件、笔记本新修订、重建蒸馏）必须落账本事件。

v1 只有两个合法消费 adapter：

1. **Scenario Work adapter**：既有六段顺序保持
   `contract → declaration → tenant → projection → session_corpus → view_mapping`。
   `assembleScenarioRequest` 增加可选的 typed Dossier envelope，并让
   `buildSessionCorpusSegment` 把 `renderedDataBlock` 放在既有当次材料之前、task 之前；不得新增
   第七段或绕过该组装器。未启用 Dossier 时请求必须与现行 golden byte-identical。
2. **pi work-agent adapter**：只在绑定 container 且显式启用 Dossier 的 product session，把同一
   `renderedDataBlock` 追加到 pi lane 的**单条**稳定 system prompt 数据区；不得造第二条 system
   message、不得写入 pi transcript/journal，不得让 pi 自己重编或蒸馏该块。新 prompt 与新 leg
   都从 container 状态重新取 envelope；旧 pi message context 仍按 ADR-022 的中断规则处理。

Scenario adapter 的新鲜度接缝固定为 `ScenarioExecutorDeps` 上可选的 async
`resolveDossierContext(context)` port；executor 必须在**每次** provider request、调用
`assembleScenarioRequest` 之前 await 它。不得把 envelope 塞入 `ScenarioRunInput`、session header
或 closure 启动快照后全程复用，否则一次 run 内的后续 artifact/resume 会读到旧 revision。无 resolver
或返回 undefined 时保持现行请求 byte-identical；resolver error 在 provider 前 fail closed。

pi adapter 不能偷塞现行 ADR-022 v1 的 `{text}`：A2 protocol v1 **不具备 Dossier 通道**，因此
A2 总验不宣称本层已接入。`DOSSIER-FLOW-1` 若实现 pi adapter，必须同票把 transient wire 整体迁为
`protocolVersion:2`，host/sidecar 同制品原子升级、拒绝混跑，并把 prompt payload 冻结为：

```ts
{
  text: string;
  dossierContext: null | {
    schemaVersion: 1;
    stateVersion: number;
    renderedSha256: string;
    renderedDataBlock: string;
  };
}
```

host 发送前必须核 envelope 的 container 与 session 相同；sidecar 复算 SHA 后才把 data block 放进
单一 system prompt，绝不把它拼进 user text。v2 中 `text` 与 `renderedDataBlock` 各按 UTF-8 计，
二者合计最多 `131_072` raw bytes，并继续通过 ADR-022 编码后 1 MiB 门；超出时在 provider 调用前
以可见 manifest 标 `transport_limit` 并拒绝，不能静默截断。将来若证据要求更大 standing brief，
须另立 chunk/blob wire，不在 v2 放松 framing。

普通 `generic-chat` v1 **明确排除** Dossier：现有 `assembleGenericChatSystemPrompt` 的
`workContextSegment` 只承载当前案根/材料/场景状态的 L0 投影，不得偷渡 standing brief。
若未来要让自由 Chat 消费本层，须另行定义其授权、预算、账本与可见 manifest adapter，并修订本
ADR；不得把 Scenario 的六段接口硬套给 Chat。

## 决定四 · 可见、可审、有版本化上下文预算、fail-closed

用户可随时查看当前注入的完整语义段、来源清单、冲突与取舍 manifest。上下文预算与执行/金额
预算分开：

- 任何启用 Dossier semantics 的请求，其 model route 必须解析到版本化
  `ModelContextProfile`，至少含
  `providerId`、`modelId`、`version`、`effectiveAt`、`contextWindowTokens` 与
  `reservedOutputTokens`；缺失即在 provider 调用前 fail-closed。既有不启用 Dossier 的
  Chat/Work 请求不得因该 profile 缺失改变字节或失败语义。
- `usablePromptTokens = contextWindowTokens - reservedOutputTokens`。contract/declaration/
  tenant/projection/view mapping 与当次 task 先验必须能完整装入；不能装入即拒绝，不截断规则。
- 系统锚点与用户显式选择文件是 required source，任一无法完整装入即请用户缩窄范围并拒绝调用。
  笔记本与历史尾窗可按上节稳定序和各自声明上限确定性缩减，但每一处遗漏/截断、采用的 token
  估计器与估计是否为保守上界都必须进入 manifest；估计未知则拒绝，不能猜。
- `RuntimeGuard` 的 usd/step 限额继续只管计费与执行，不能冒充 context inclusion cap。
  provider 返回的 `rawUsage`、cache hit/miss 是请求后的评估事实，只用于校正与实验，不反写
  本次请求前的预算判定。

## 决定五 · 边界三条

案件内容只入本卷语义段，不入 ADR-013 全局 memory（互补零冲突）；session 是容器内时间切片，
只消费不拥有本层（container 级 ≠ session 级的机制落点）；v1 只供显式 Scenario Work 与
pi work-agent 消费，普通 Chat 不消费。两个 Work adapter 仍各守自己的账本，Dossier 状态不向任一
transcript 混写。

## 决定六 · 三道工程门（2026-07-26 夜增补）

1. **前缀确定性门**：语义段模板禁时间戳、动态计数、非确定排序；门禁形态＝同输入两次组装 byte-identical（DeepSeek 前缀单元整体失配下，隐性差异会无声打穿缓存且零报错）。
2. **rebase 非免费**：rebase 请求按 cache-miss 价预估计入 RuntimeGuard 预算，频率受预算约束，不得设计成频繁小步。
3. **尾窗预算初值**：参照 opencode `max(min_preserve, 25%·usable)` 与 pi `keepRecentTokens=20k / reserveTokens=16k`，最终值以本仓实测定，不抄字面。

## 决定七 · 容器级原子状态、重启与去重

- 新建 container-scoped `DossierStatePort`；不得复用 session-scoped `WorkStateStore`，不得以
  `workDraftStore` 的内存 `Map` 充当持久真源，也不得借机造跨域通用 KV。
- v1 物理真源固定为
  `app_data_dir()/dossier-semantics/<containerId>.json` 的 whole-envelope atomic CAS，containerId
  必须是单一 safe token，并随 container 整删。`DossierStateEnvelopeV1` 至少同持
  `storageVersion/revision/containerId`、逻辑 notebook 正文与 revision、`sourceCut`、来源
  digest/manifest、distillation attempts、只含 terminal 的 `PersistedTurn[]` 与 Dossier events；
  `InteractionEvent` 不得进入该数组，不得另放
  localStorage、session Work 信封或 pi JSONL 第二副本。
- 历史输入蒸馏的模型调用不是第二 runtime：composition root 只能注入 ADR-009 现有
  `TurnRunnerPort`。每次 provider attempt 都使用新的 `turnId/providerRequestId`，并在调用前以
  `{operationId,attempt,turnId,providerRequestId,expectedStateVersion,sourceCut,inputDigest}`
  记录不含正文/密钥的冻结引用；Dossier 代码不得 import `Provider`/`TurnStore` 或直调
  `generate()`/`stream()`。composition root 可按 ADR-009 以同一 provider 和 transient TurnStore
  构造 runner，但 store 不能成为第二个耐久位置。
- attempt CAS 成功后才可调用 runner。runner 返回的 `PersistedTurn` 必须先经
  `DossierStatePort.appendTurnTerminal(attempt identity, terminal)` CAS 进入上述
  `PersistedTurn[]`，此步不改 notebook/cut；随后才解析、按 ADR-016 schema 校验并尝试语义
  commit。terminal CAS 与语义 CAS 分开，是为了让崩溃后可以从同一耐久 Turn terminal 继续校验，
  而不把模型输出与 notebook 提前混成一次不可审的写。
- 一次成功 CAS 原子提交：笔记本新 revision、不可变 `dossier_semantics_committed` 事件、
  `sourceCut`、来源/内容 digest、`operationId/attempt/turnId/providerRequestId`、
  schema/compiler/model-route 版本与可见 truncation/conflict manifest。相同 `operationId` 的耐久
  committed 事件至多一笔。
- 只认上述已入 Dossier envelope 的 `PersistedTurn` terminal：completed 后解析并按 ADR-016 schema
  校验，随后才可做语义 CAS；failed（含 canceled）或未见耐久 terminal 不写笔记本、不推进 cut。
  terminal 已耐久而语义 CAS 前崩溃时，重启优先复用该 terminal 继续校验/commit；attempt 已落但
  terminal 缺席时才可显式以**新 attempt 与新 Turn 身份**重试。外部调用不宣称 exactly-once，
  同一 operation 的耐久语义提交仍 at-most-once。
- 用户在蒸馏期间编辑笔记本会改变 revision。旧模型产物的 CAS 必须失败并丢弃，重新读取当前
  revision 后才可用同一 operation 的下一 attempt 重试；绝不覆盖用户编辑。所有读写携
  `containerId`，跨容器读取、全局 memory 写入、无授权来源与无坐标来源一律拒绝。

## OSS 裁定（2026-07-28 一手源码复核）

`pi-observational-memory` **不直接依赖**：它是 pi coding-agent extension，依赖
`turn_end`、`agent_end`、`session_before_compact` 与 coding-agent session ledger；当前
Courtwork pi lane 使用的 `Agent` 没有相同 journal/compaction 表面，上游 V3 也仍标注不稳定且
无 V2→V3 兼容迁移。直接安装会引入第二份 session 真源。

只借四项机制：append-only ledger、`coversUpToId`/切点水位、带来源 ID 的 observation/
reflection、确定性 fold/render；容器隔离、六段编译、CAS、预算、用户编辑与审计仍由本 ADR
契约拥有。上游包或版本变化时按根总纲的 OSS 前置纪律重查，不凭本次 star 数续用结论。

## 调研回执（CONTEXT-SURVEY-1，2026-07-26，官方文档+源码实读）

证伪结论：三条核心设计零推翻——滑动尾窗与增量蒸馏为 opencode（`PRUNE_PROTECT`／`hidden` 集合／`previousSummary` 滚动）与 pi（`keepRecentTokens`／`firstKeptEntryId` 增量边界）已收敛的生产形态；Claude Code compact 官方自认「读它所压缩的全量对话，本身是一次大请求」，全量 summarize 不采纳的判断坐实；MemGPT/Letta 官方 v1 自我减法为重框架不采纳的反向证据；DeepSeek 无精确 TTL、前缀单元整体失配，hit/miss 计量法是唯一可行判据（加固而非证伪）。CONTEXT-SURVEY-1 已执行完毕，结论并入本节，不另立票。

**对照批补记（2026-07-27 夜）**：OpenClaw 与 pi 生态记忆扩展两路对照调研已归档（`research-2026-07-27-memory-continuation/`，按归档索引定位）。评审时并入四件：缓存边界二分与「动态值经工具调用取、不入前缀」（决定六第 1 条加固）；两层笔记本同构（决定二细化加固）；**自动静默蒸馏的外部事故实证**（OpenClaw flush 轮泄漏致压缩死循环——「无自动静默蒸馏、水位建议经 ask-user」由设计偏好升为携证裁量）；policy-only 策略块注入作注入编排实现选项（不扩供给者闭集）。`pi-observational-memory`（374★，MIT）入 `DOSSIER-FLOW-1` 开工前深读清单。**Hermes 补路（同日夜二）**：session-start 冻结快照为前缀稳定的强形态实现选项；Curator 双阈值（间隔＋闲置）为冷 rebase 时机参照；两枚事故反例（后台复盘并发覆盖 #2670、去重状态不持久重复 flush #3059）定为 `DOSSIER-FLOW-1` 票面必须显式处理的冲突面——后台蒸馏与用户并发改笔记本的时序仲裁以账本事件为真源。

## 已决项回执（2026-07-28）

原三项未决均已关闭：触发采用 descriptor 首读 / 水位 ask-user / 用户显式三态闭集；合成采用
单一 compiler + Scenario 第五段/pi 单 system prompt 两个显式 Work adapter，普通 Chat v1 排除，
并以来源冲突 manifest 取代覆盖；预算采用版本化 model context profile + required-source
fail-closed，不采用按类固定配额或先到先得。

## 排队影响

本 ADR 占号 + ADR-017 修订落痕后：`SANDBOX-PROBE-1` 入队（不触 App.tsx）；`EXEC-SCRIPT-1`、`DOSSIER-FLOW-1` 待各自前置；`GENERIC-PACK-1` 验收用例正式登记 Socmdia kit，其「甲路径」（S0–S5 编为声明式场景）不受 ADR-017 修订影响仍可先行——脚本执行是补全，不是它的前置。

2026-07-28 产品排程再裁：本 ADR 的契约继续 Accepted，但 `DOSSIER-FLOW-1` 不进入当前基础里程碑；
只有 ADR-022 的 `PI-BASE-HEADLESS-ACCEPT → PI-LANE-UI-1 → PI-BASE-GUI-ACCEPT` 依次放行，
再完成 `CONTEXT-PROFILE-1` 后才可开工。该门是产品顺序，不是 Dossier 技术依赖。

## 来源

- 草案原件：`adr-drafts-2026-07-26.md` 乙、丙两案（按归档索引定位，史料线索）。
- 现行机制族：六段 assembly 与续行投影（`PROJECTION-RESUME-1`）、ADR-013 memory 蒸馏段、ADR-016 填格协议、ADR-019 容器与摘要化条款。
- 同行形态（史料线索）：opencode／pi compaction 源码实读（CONTEXT-SURVEY-1，结论已并入正文，原稿未单独归档）。
- 2026-07-28 一手复核：
  [`pi-observational-memory`](https://github.com/elpapi42/pi-observational-memory) 的 README /
  `docs/how-it-works.md` 与
  [pi compaction 文档](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/compaction.md)；
  只作为 OSS 机制证据，不是现行能力真源。
