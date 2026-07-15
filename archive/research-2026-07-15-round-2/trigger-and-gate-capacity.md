# R5：场景/触发/门禁对 Stage 3 监控的承载力——架构审查

审查角色：源码 + 契约审查。每条结论落 `文件:行号` 或 ADR 原文；不从叙事推断。

---

## 0. 结论先行

**冲突点一（"用户触发" vs Stage 3 系统触发）：不是真冲突，是措辞未收紧。**
不变量的实质约束对象是"不可逆动作的决定权"，不是"谁/什么按下调用键"——这一点由 `docs/architecture/principles.md:13-15`（原则三，唯一逐字具有"不变量"地位的条款）、`ADR-009:119-125`、`ADR-011:46-56` 三处独立表述共同印证，三处都只字未提触发源；执行器签名 `runScenario(scenario, input, deps)`（`packages/core/src/scenario-executor/executor.ts:502-506`）本身对调用方是谁完全不敏感（trigger-blind by construction）。但 `CLAUDE.md:45`（技术基线）与其唯一逐字来源 `ADR-002:9` 把"用户触发"和"不让模型自主选择不可逆流程"焊在同一句话里，字面上排他性地只承认"用户"这一种触发源，且未像 `docs/product/vision.md:25` 那样开放"或由系统…触发"的口子。由于 `CLAUDE.md:5` 自称"仓库最高工程说明"、系统提示要求"OVERRIDE 任何默认行为"，这句字面表述若不收紧，会在未来实现会话中被机械执行、误判 Stage 3 违反不变量而拒绝实现——即使真正的不变量和代码都不禁止这样做。

**冲突点二（远程确认）：这条缝在 core 执行器层已经通，在桌面生产链上完全不通。**
`ConfirmationActor`（`packages/core/src/events/types.ts:24-28`）的 `channelId` 是设计者显式留下的渠道无关缝（同文件 19-22 行注释直接点名"未来的 IM/工作流通道网关"）；`resumeScenario` 的完整 CAS 流程今天已经用磁盘落地实现、并有跨进程测试直接验证 `channelId: 'wecom'` 的确认可以从"另一个进程"完整跑通（`packages/core/src/scenario-executor/executor.test.ts:790-834`）。但这条缝在桌面生产链上完全不通——**不是因为远程比本地难，而是因为本地这条 Work 确认链本身也还没通**：`apps/desktop/src/App.tsx:441` 的硬编码 actor 实际喂给的是 Chat/Turn 的 ask-user 通道（`turnClient.resolveInteraction`），不是 Work 场景确认门；Work 场景确认门在桌面侧目前仅 demo/fixture 成立（`apps/desktop/src/demo/client.ts:75,104-111`），`WorkCommandPort` 本身契约已定、代码未实现（`apps/desktop/src/protocol/client.ts:98-101` 原文自陈"declared without constructing or wiring an implementation into React"），IM 通道网关本身无契约无实现（repo 内无任何网络入口代码）。

---

## 1. 触发与声明是否已解耦

**结论：已解耦。** 证据链：

- 场景声明结构：`packages/legal/src/scenarios/index.ts:34-142`，每个场景对象携带 `trigger: {fileTypes, userActions, classifierTags}`（如 S1 见 `index.ts:38-42`，S3 见 `index.ts:79-83`）。
- schema 层：`packages/registry/src/package-manifest.ts:59-71` 定义 `PackageTriggerSchema`——三个字符串数组字段，`.refine` 只要求"至少一项非空"（`package-manifest.ts:66-70`，错误信息"触发条件至少提供一项，否则场景永远不会被触发"）。这是**声明性质的 UI 路由/上新提示元数据**。
- 运行时消费面：`packages/registry/src/admission.ts` 全文对 `trigger`/`actor`/`caller`/`invoker` 关键词 grep 零命中——包准入只校验 `trigger` 字段的**形状**，从不读取它来决定"谁可以调用"。`packages/core/src/scenario-executor/executor.ts` 全文同样不引用 `scenario.trigger`。
- 决定性证据——`runScenario` 签名（`executor.ts:502-506`）：
  ```ts
  export async function runScenario(
    scenario: ScenarioRuntime,
    input: ScenarioRunInput,
    deps: ScenarioExecutorDeps,
  ): Promise<ScenarioRunResult>
  ```
  没有 actor、没有 trigger source、没有 caller identity 参数。`ScenarioRunInput`（`executor.ts:72-77`）只有 `inputArtifacts`/`toolInputs`/`materials`。**启动一个场景，在类型系统层面对"谁/什么发起了这次调用"是盲的。**
- `ADR-010` 决定一进一步明确："`ScenarioRunInput` 只能由受信 composition binding 依据已准入 package 与 MaterialStore 构造"（`ADR-010-work-live-boundaries.md:102`）——即今天的契约已经是"受信装配点决定何时调 `runScenario`"，不是"UI 事件是唯一入口"。`ADR-011` 决定三的三道门（`ADR-011-minimal-harness-kernel.md:46-54`）同样只要求"受信 composition root 显式装配"，不要求 UI 是唯一合法调用方。

**一个 scenario 今天能不能被非用户发起：能，从类型与执行器实现角度没有任何阻挡**，唯一硬性要求是调用方必须是"受信 composition root"（不能是任意暴露的开放接口/模型自主调用）。

判定：**契约已定（ADR-010 决定一 + ADR-011 决定三）+ 代码已实现（执行器签名本身即 trigger-blind）**，但目前只有 demo-runtime CLI 和（尚未接线的）desktop UI 两个受信 composition root 的候选位置，"scheduler composition root"这个具体实例——**无契约无实现**（repo 内 `cron`/`scheduler` 关键词零命中，见第 3 节）。

---

## 2. 不变量措辞的精确含义

### 2.1 ADR-009 / ADR-011 / principles.md 原文语境

- `ADR-009` 决定二：Work 步骤种类"第一版封闭为 `model | deterministic_tool | interaction | projection | confirmation`……不开放模型自主选工具、任意 goto、动态图、并行 agent/subagent、session 级 always-allow **或不可逆动作自动批准**"（`ADR-009-runtime-ports-and-harness.md:119-125`）。约束对象是**场景内部的分支自由度**（模型不能在运行中自己发明新步骤/新工具/新流程），不是"谁按下开始键"。
- `ADR-011` 决定三：能力必须过三道门（垂类声明、受信 runtime binding、core 执行时白名单）——"已注册但未被 Scenario 点名的工具不得执行……模型输出的 tool name、step、goto 或并行指令只是普通不可信文本，不构成调度命令"（`ADR-011-minimal-harness-kernel.md:46-54`）。仍然是**约束模型**，不是约束触发源。
- `ADR-011` 门禁段唯一出现"触发"二字处："runtime limit **触发**后不得启动下一步、发布 artifact 或伪造 `scenario_completed`"（`ADR-011-minimal-harness-kernel.md:96`）——这是"限额触发"，与"用户触发"词义无关，不构成对触发源语义的扩展。
- `principles.md` 原则三（"留人确认"，`docs/architecture/principles.md:13-15`）："确认、定稿、文件移动、记忆写入、数据授权和任何不可逆动作都属于用户。自动化可以准备计划，不得替用户作决定。"——通篇不出现"触发"，约束对象是**决定权**（谁按"确认"），不是**启动权**（谁按"开始"）。

对照 `docs/product/vision.md:25`："场景由用户显式触发或由系统推荐，模型不得自行决定执行不可逆流程。"——把"触发"处理成**开放列举**（用户显式触发 / 系统推荐），并列的仍是"模型不得自行决定不可逆流程"。这印证"触发"在产品定位文档里本就不是排他性"只能是用户"的用词。

### 2.2 "场景是用户触发的"这句话的真实出处与地位

其唯一逐字来源是 `ADR-002-schema-workflow.md:9`（2026-07-13，Accepted）："场景是用户触发的固定声明式 pipeline；模型只在声明允许的生成节点工作。"`docs/decisions/README.md:3,22-24` 明确"只有状态为 Accepted 的 ADR 具有约束力"、"新决定不得靠修改旧段落偷偷覆盖；需要替代时新建 ADR 并写 Superseded"——`ADR-002` 未被任何后续 ADR 标记 Superseded，`ADR-009/010/011`（均 2026-07-14，晚于 ADR-002 一天）通读全文（已逐字读取）**没有一处重申或修订"用户触发"这个具体措辞**，只反复重申"模型不得自主选择不可逆流程"这一半。

`CLAUDE.md:45`（技术基线）"agent loop 自研；场景是用户触发的声明式固定编排，不让模型自主选择不可逆流程"是对 `ADR-002:9` 的转述，且把两个原本独立的分句焊得比源 ADR 更紧（源 ADR 原句第二分句是"模型只在声明允许的生成节点工作"，比 CLAUDE.md 转述的"不可逆流程"用词更窄）。**注意：这句话不在 `CLAUDE.md:29-36` 的 8 条编号"核心不变量"之内**，它出现在独立的"技术基线"小节（`CLAUDE.md:40-47`），是对 MVP/Stage 0 阶段"怎么进入 pipeline"的技术形状描述，不是被三份独立架构文档反复强化的架构不变量本体。

### 2.3 架构级判断

- **约束的实质对象是"不可逆动作的决定权"，不是"触发的物理来源"**——由 `principles.md:13-15`、`ADR-009:119-125`、`ADR-011:46-56` 三处独立、互不引用的表述共同印证。
- 对 Stage 3："定时/事件触发的哨兵"与"用户触发"**字面上确实不是同一件事**（一个人手动点，一个时钟/webhook 自动点），但也**不构成对真正不变量的冲突**——只要监控场景内部仍保持 `model|deterministic_tool|interaction|projection|confirmation` 的封闭步骤集、不可逆动作仍经 `confirmationPolicy: gates`，触发源换成 scheduler 不改变这个实质（详见第 5 节：`runTools` 与 gate 的顺序天然支持"先推事实、后留判断"）。
- 但**字面表述**（`ADR-002:9` + `CLAUDE.md:45`）确实排他性地只写了"用户"，没有 `vision.md:25` 那样的"或由系统…"开口。这是一处需要收紧的**措辞漂移**，不是需要推翻的架构决定。

判定：**契约措辞与 roadmap 表面冲突（字面层），设计意图与代码实现均不冲突（语义层）。**

---

## 3. `scheduled` 预置的真实度

`archive/docs-legacy-2026-07-13/docs/47-架构决定-文件操作分级.md:26`（已归档，按 `CLAUDE.md:60`"历史材料只在 archive/；现行文档、源码与脚本不得引用归档内容"，**今天没有当前契约效力**，仅作需求来源引用）承诺："触发方式与来源声明解耦——MVP 仅手动触发，Stage 3 scheduled 复用同一声明（定时扫 = 换触发器不换声明）。"

对照今天代码：

- **执行器层**：`runScenario(scenario, input, deps)`（`executor.ts:502-506`）三个参数均非 UI 专属类型，`ScenarioRunInput`（`executor.ts:72-77`）与 `ScenarioExecutorDeps`（`executor.ts:43-70`）都是纯数据/端口类型。**换一个调用者（scheduler）不需要改这一层的签名或实现**——47 号的承诺在执行器这一层成立。
- **命令端口层**：`ADR-010` 决定一定义的 `StartWorkCommand`（`ADR-010-work-live-boundaries.md:39-45`）同样不含 actor/trigger 字段；"actor 由 desktop identity dependency 注入，React 不能自报 actor"（`ADR-010-work-live-boundaries.md:103`）——这句话已经预留了"actor 与触发解耦、由受信层单独注入"的形状，与 47 号承诺同构。**但 `WorkCommandPort` 在桌面侧没有生产实现**——`apps/desktop/src/protocol/client.ts:98-101` 原文注释："Production command boundary. WORK-PORT-1 deliberately declares this port without constructing or wiring an implementation into React." 今天唯一"能跑"的 Work confirm/resume 路径是 `apps/desktop/src/demo/client.ts` 的 `DemoWorkFixtureAdapter`，其文件头注释自陈"Explicit demo-only composition. No production command implementation lives here."（`demo/client.ts:75`），`review.resolve()`（`demo/client.ts:108-110`）只做一次 `assertDemoRequest` 校验，**不写事件、不建 actor、不接 `resumeScenario`**。desktop 侧真实的风险清单确认流程（`App.tsx:895-903`）调用的是 `workFixture`（demo fixture），不是 `resumeScenario`。
- **调度器本身**：repo 内对 `cron`/`scheduler`/`wecom`/`webhook`/`企业微信`/`飞书`/`dingtalk` 等关键词全仓 grep（除 `executor.test.ts` 测试数据与 `events/types.ts` 注释外）**零命中**——没有任何调度基础设施代码。

**"换触发器今天要改几处"**：(a) 执行器本身——零改动，已 trigger-blind；(b) `WorkCommandPort` 的一份真实实现——从零写起，且这份实现不管未来触发源是谁都要写；(c) scheduler composition root——从零写起。**不是"换触发器要动很多处"，而是"根本没有任何触发器（含今天号称唯一合法的'用户触发'）真正接进 Work 生产代码"。**

判定：**执行器层「契约已定+代码已实现」（trigger-blind by construction）；`WorkCommandPort` 层「契约已定（ADR-010）+代码未实现」；scheduler「无契约无实现」。**

---

## 4. 远程确认的结构缝

### 4.1 类型定义

`ConfirmationActor`，`packages/core/src/events/types.ts:24-28`：
```ts
export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}
```
紧邻文档注释（`types.ts:19-22`）："渠道无关身份标识：不隐含确认方与 core 同进程/同机/同客户端（SPEC TODO 异步确认预留）。channelId 对应未来的 IM/工作流通道网关（企微/飞书/钉钉/律所内部 OA），actorId 对应 RevisionEvent.actor.userId。"——这条缝是设计者**显式、有意识**留下的，不是偶然字段。

### 4.2 confirmation_requested → confirmation_resolved 完整路径（Work 场景门禁分支）

1. `pauseAt()`（`executor.ts:418-446`）：`deps.confirmationStore.save(pending)` 落盘 pending，随后 `eventLog.append({type:'confirmation_requested', ...})`（`executor.ts:441-444`）。
2. 外部决定到达：调用 `resumeScenario(requestId, response, scenario, deps)`（`executor.ts:645-650`）。
3. `confirmationStore.peek(requestId)` 读快照 + `assertResumeIdentity`/`assertResumeResponse` 做 validate-before-consume（`executor.ts:651-655`, `600-615`）——`assertResumeResponse` 强制 `channelId`/`actorId` 非空字符串（`executor.ts:600-604`），**但不限制取值**，代码层面 `channelId` 可以是 `'desktop'`、`'cli'`，也可以是 `'wecom'`。
4. `confirmationStore.consume(requestId, snapshot.version)`（`executor.ts:658`）——CAS 条件消费。
5. `eventLog.append({type:'confirmation_resolved', actor: response.actor, decision, instrumentation})`（`executor.ts:665-671`）。
6. 若 confirm，`produceSequence` 续行剩余产出（`executor.ts:693-706`）。

这条路径没有一步绑死 desktop 进程内存——`ConfirmationStore`/`EventLog` 是接口（`confirmation-store.ts:24-32`、`event-log.ts:11-15`），落盘实现 `createFileConfirmationStore`/`createFileEventLog`（`packages/core/src/session/confirmation-store-file.ts`、`packages/core/src/events/event-log-file.ts`）用 `node:fs`，天然跨进程可见（同目录下任何进程都能 `peek`/`consume`）。唯一绑死的是"必须落在同一台机器的同一个目录"——这是本地优先架构的既定选择，不是这条缝独有的限制。

**直接实证**：`executor.test.ts:790-834`——测试显式注释"模拟另一个进程：所有依赖都重新构造，只共享磁盘路径与可序列化配置"，用全新构造的 `secondDeps`（新的 `createFileEventLog`/`createFileConfirmationStore` 实例）对 `firstDeps` 暂停的场景发起 `resumeScenario`，`actor: { channelId: 'wecom', actorId: 'lawyer-42' }`（`executor.test.ts:823`），断言 `done.status === 'completed'`（`executor.test.ts:828`）且完整历史可从磁盘重读（`executor.test.ts:833`）。**这就是"企业微信确认"在 core 执行器层的最小可行形态，且已经绿灯通过。**

### 4.3 ADR-010 决定二第 5 条：同一 CAS 状态转换——帮助还是阻碍

`ADR-010` 原文："resume 必须 validate-before-consume，并使条件消费与 `confirmation_resolved` 成为同一 CAS 状态转换"（`ADR-010-work-live-boundaries.md:177`）。

对照今天实现：`executor.ts:658`（`confirmationStore.consume`）与 `executor.ts:665-671`（`eventLog.append(confirmation_resolved)`）是**两次独立调用，写两个不同存储介质**（`confirmation-store-file.ts` 用 `<requestId>.json`/`.consumed` 文件对，`event-log-file.ts` 用一份 JSONL）——**今天不是同一次 CAS 状态转换**。若进程在两步之间崩溃：pending 已被 tombstone（不可能重新 consume），但 `confirmation_resolved` 从未写入事件流——产生"确认已生效但历史查无此事"的不可回放状态。

判断：**这是必要的正确性要求，不是阻碍，但今天没做到，且这个缺口和"是否远程"无关**——本地 desktop 单进程确认一样会撞上这个崩溃窗口。`ADR-010` 决定二把它列为 `WORK-STORE-1` 的前置目标（统一 `WorkStateEnvelopeV1` + `WorkStateHostPort.compareAndSwap` 把 `pendingConfirmations` 和 `events` 装进同一个 blob 一次 CAS——`ADR-010-work-live-boundaries.md:115-159`）。一旦落地，对远程通道反而是**帮助**：它逼着未来的 WeCom webhook handler 不能自建一条平行的"直接改事件流"捷径，只能调同一个 `WorkCommandPort.resume`。**结论：设计意图是帮助（保证任何渠道都不能绕开一致性），当前实现是阻碍（缺口存在，且是远程确认能否安全上线的前置条件之一）。**

### 4.4 一条来自企业微信的确认今天要穿过哪些层、会撞到什么

1. **没有 HTTP/webhook 入口**——repo 内没有任何服务器能接收企业微信回调（`services/ingest` 是 OCR/分类 Python 服务，与此无关）。`ADR-009` 背景段明确"当期不新增 localhost server、Node sidecar、远程 backend 或数据库"（`ADR-009-runtime-ports-and-harness.md:39`）。**企业微信服务器把回调送到用户桌面机器上，今天没有网络地址可送**——这是第一个、也是最根本的撞墙点：不是代码 bug，是当前架构形态（本地单机应用，非常驻服务）与"服务器推 webhook 进来"这个模式本身的结构性矛盾，Stage 1 的 IM 网关需要先解决"谁是那个常驻可达的中转服务"，目前没有任何 ADR 为这个中转服务定义边界。
2. 就算有网关把回调转成本地可调用动作，落地点应该是 `WorkCommandPort.resume`——但如 3.2 节所述，**这个口没有生产实现**（`apps/desktop/src/protocol/client.ts:98-101`），撞到"根本没有函数可以调"。
3. 即使绕过 `WorkCommandPort`、像 demo-runtime CLI 一样直接调 `resumeScenario`，会撞到 `deps` 构造问题——`confirmation-store-file.ts:1-3`、`event-log-file.ts:1-2` 是 **Node-only**（`node:fs`/`node:crypto`），desktop 生产运行时是 Tauri WebView（浏览器沙箱），不能直接 `require('node:fs')`——这正是 `ADR-010` 背景段第 3 条点名的问题（"core Work stores 是同步接口，file adapter 又直接依赖 node:*，不能把异步 Tauri invoke 冒充同步持久"，`ADR-010-work-live-boundaries.md:15-16`），同样未实现（`WorkStateHostPort`，`ADR-010:148-159`）。
4. 最后撞到 4.3 节的 CAS 非原子缺口。

**综上：远程确认这条"缝"分两半——core 执行器内部这一半是「契约已定+代码已实现」（类型、校验、CAS 一致性、跨进程测试全部到位，直接测过 `'wecom'` 字符串）；desktop 生产环境到 core 之间这一半是「契约已定（ADR-010 WorkCommandPort）+代码未实现」；再往外到真实 IM 通道这一半是「无契约无实现」。今天"通不通"：core 层通，桌面生产链完全不通——不是因为远程比本地难，而是因为本地这条链本身也还没通（demo fixture 挡在最外层）。**

---

## 5. "哨兵"形态的门禁语义

**今天 core 的 scenario 执行器是否必须产 artifact：技术上不是必须，但没有"仅推事实"的独立执行形态；不需要为此伪造 artifact 或另起执行链。**

- `produceSequence`（`executor.ts:448-493`）对 `scenario.outputArtifacts` 数组逐项调用 `generateArtifact` 并 `eventLog.append({type:'artifact_produced', ...})`（`executor.ts:461-477`）。数组允许为空——`outputArtifacts: z.array(ArtifactTypeIdSchema).default([])`（`package-manifest.ts:97`）**没有** `.min(1)` 约束（对比 `PackageTriggerSchema` 显式要求至少一项，`package-manifest.ts:66-70`）。一个 `outputArtifacts: []` 的场景理论上可以直接从 `runTools` 跑到 `scenario_completed`（`executor.ts:485-492`）而不产任何 artifact。
- 但**没有独立的"事实推送"事件类型**——`SessionEvent` 联合类型（`events/types.ts:45-116`）里能承载结构化、经 schema 校验、可锚定、可渲染结论的载体只有 `artifact_produced`；`progress`/`todo_snapshot` 是内部进度叙述，没有 schema 校验、没有 renderer、没有确认门禁。**"事实"要被人看到、结构化、锚定，唯一路径是变成 artifact。**
- 这**不等于必须伪造 artifact**：roadmap 的"事实推送 + 留人判断"恰好可以诚实映射为"一个新 artifact 类型（如 `legal.ComplianceAlert`）+ `confirmationPolicy: gates`"——produced artifact 本身就是"推送的事实"，gate 就是"留人判断"（确认/驳回/归档）。这是对现有原语的**合规复用**，因为 artifact 的语义定义（"系统产出的、经 schema 校验、可锚定的结构化结论"）本来就覆盖监控发现。
- 一个原本题面未预设、审出来的关键细节：`runTools()`（`executor.ts:137-169`）——**`scenario.toolIds` 声明的所有工具在第一个 artifact 产出之前（当然更在第一个 gate 之前）一次性无条件执行完毕**；副作用检查（阻止非 `pure_read` 工具）**只在 `confirmationPolicy.mode === 'none'` 时触发**（`executor.ts:151-156`），`gates` 模式下这个检查完全不触发。这意味着：若把"推送到 IM 通道"实现成一个 `toolId`（`sideEffect: 'external_send'`，`packages/schemas/src/confirmation-policy.ts:9-14` 已预留此枚举值），只要场景是 `gates` 模式（Stage 3 场景几乎必然如此，因为它一定有非 `pure_read` 的推送动作），这个推送工具会在**任何 gate 之前**无条件触发——这恰好是"先推事实（工具执行）、后留判断（artifact 产出后的 gate）"顺序的诚实实现，**不需要新执行链**。（需注明：全仓 grep `packages/tools/src` 未发现任何工具注册点给 `sideEffect` 赋值——这个副作用分级机制今天是"契约已定，尚无生产实例"，上面是结构推演，不是已跑通的路径。）

**三难判断（诚实结论）：不是三难，二选一都不需要。** "artifact + gates"原语组合已能诚实表达"事实推送 + 留人判断"，不需要伪造 artifact（因为 artifact 语义本就覆盖"系统产出的结构化事实"），也不需要第二套执行链（`runScenario`/`resumeScenario` 对"推送优先于门禁"这个顺序已原生支持）。真正缺的不是执行语义，是**投递语义**——把 artifact/`confirmation_requested` 事件"推到 IM 通道"这一步，今天没有任何代码（无 `external_send` 类工具实现、无 channel adapter）。这是「无契约无实现」，但量级是"缺一个新工具 + 一个新 composition binding"，不是"需要动摇 core 执行模型"，因此不会触发 `ADR-011` "不引入第二 agent runtime"的红线（`ADR-011-minimal-harness-kernel.md:44` "本阶段新增第三方 agent runtime 依赖数继续为零"）。

判定：**契约已定（artifact + confirmationPolicy 原语 + `SideEffectClassEnum.external_send`）+ 核心执行语义已实现（`runTools` 先于 gate 无条件执行的顺序天然匹配"先推后判"）+ 投递适配器无契约无实现。**

---

## 6. `runtime guard` 与限额

今天的 `RuntimeGuard` 四件套（`packages/core/src/scenario-executor/runtime-limits.ts`）：`checkStep`/`checkToolCall`/`checkTime`/`checkUsd`，超限**同步抛出** `RuntimeLimitExceededError`（`runtime-limits.ts:18-26,44-73`）。检查点内嵌在 `runTools`（`executor.ts:146` `guard.checkToolCall()`）与 `produceSequence`/`generateArtifact`（`executor.ts:459` `guard.checkStep()`；`334,473` `guard.checkTime()`；`336` `guard.checkUsd()`）里，抛出后**没有任何 try/catch 拦截**——异常直接从 `runScenario`/`resumeScenario` 的返回 Promise 冒出。对照 `ADR-011` 门禁"runtime limit 触发后不得启动下一步、发布 artifact 或伪造 `scenario_completed`"（`ADR-011-minimal-harness-kernel.md:96`）——这一条本身满足：异常中断 `for` 循环，后续代码确实不会跑。

但"限额触发后系统状态如何"这件事上，**今天没有任何生产者把这次中断写成一条可回放的 SessionEvent**：

- `SessionEvent` 联合类型里 `type:'error'`（`events/types.ts:116`）在全仓库 grep 下**零生产调用点**（core/demo-runtime/desktop 皆无，仅类型定义处出现一次）。
- `ADR-010` 决定三设计的 `ScenarioFailedEvent`（`reason: 'runtime_limit' | ...'`，`ADR-010-work-live-boundaries.md:201-211`）**今天在 `events/types.ts` 里根本不存在这个变体**；`ADR-010` 原文自己承认这是要"取代当前无人消费的泛化 error 分支"（`ADR-010-work-live-boundaries.md:213`）——即 ADR 作者已知道 `error` 分支形同虚设。
- `WorkCommandOutcome.failed.reason` 类型（`apps/desktop/src/protocol/client.ts:82-87`，与 `ADR-010:72` 一致）已列出字面量 `'runtime_limit'`，但这只是**类型声明**——全仓 grep `runtime_limit` 字符串，命中的只有类型定义处与测试断言 `RuntimeLimitExceededError` 本身，**没有任何一行代码把 `RuntimeLimitExceededError` catch 住并映射成 `{status:'failed', reason:'runtime_limit'}`**。`apps/desktop` 全仓 grep `RuntimeLimitExceededError` 零命中。

**无人值守时会怎样**：今天唯一被验证过的调用方式是人在场的调用——demo-runtime CLI 脚本（`run-s3-real.ts`、`run-legal-demo.ts`）同样没有 try/catch 包裹 `runScenario`，异常会变成 Node 未捕获 rejection，终端可见堆栈（人盯着终端时），进程非零码退出。**在没有人盯着终端/UI 的场景下**（例如 cron 定时唤起的一次 Stage 3 监控扫描），这次限额中断只是一次静默消失的 rejected Promise——没有 SessionEvent、没有持久失败标记、没有下次唤起时"上次失败了"的提示。这直接抵触 `principles.md` 原则四"静默降级零容忍"（`docs/architecture/principles.md:17-19`："未配置、覆盖不足、适配器错误、模型能力降档、包拒载和材料缺失必须显式呈现。不得用 mock、旧缓存、默认成功或空结果假装完成"）——超限失败虽未列名，但"必须显式呈现"的精神完全适用，今天的实现恰好相反：不呈现、只消失。

判定：**契约已定（ADR-010 决定三的 `ScenarioFailedEvent` + `WorkCommandOutcome.failed.reason` 类型）+ 代码未实现（`events/types.ts` 无此变体、无任何 catch/映射逻辑）。** 这是 Stage 3 无人值守场景的一个具体前置阻塞点：不是"限额保护不够严格"，而是"限额保护触发后的结果对无人值守调用方不可见"——与是否远程确认无关，是所有非交互式调用方（scheduler 是其中一种）都会踩中的坑。

---

## 7. 不变量措辞的修订建议

**`CLAUDE.md:45`（技术基线）现状：**
> agent loop 自研；场景是用户触发的声明式固定编排，不让模型自主选择不可逆流程。

**建议改为**（两处收紧：①明确"用户触发"只是当前已实现的一种触发形态，不是排他性上限；②把"决定权"从"触发"里解耦出来单独强调）：
> agent loop 自研；场景是声明式固定编排，由用户显式触发，或由受信 composition root 以同一声明代表用户已授权的意图触发（含未来的 scheduled/事件触发）；无论触发源是谁，不可逆动作的执行与否始终由 confirmationPolicy 门禁裁决，模型不得自主选择不可逆流程或绕过门禁。

**`ADR-002-schema-workflow.md:9` 现状：**
> 场景是用户触发的固定声明式 pipeline；模型只在声明允许的生成节点工作。

**建议**：不直接改写已 Accepted 的 ADR 正文（`docs/decisions/README.md:20-24` 明确禁止靠改旧段落偷偷覆盖），而是新增一条决定（新 ADR 或 ADR-002 的"补充决定"段落，仿照 `ADR-005` 已有的追加先例），把 47 号第 26 行"触发方式与来源声明解耦"的承诺，结合本次在 `executor.ts` 里实证的"trigger-blind by construction"事实，转正为一条 Accepted 条款——明确"用户触发"specifically 指"用户的既往授权/当下决定权覆盖该次执行"，触发的物理来源可以是用户点击、系统推荐待人确认、或受信 composition root 的 scheduled 调用。

不建议修改 `docs/architecture/principles.md` 原则三——它的措辞（`principles.md:13-15`）已经精确落在"决定权"上，不含"触发"歧义，是这次审查里表述最干净的一份文档，无需改动。

---

## 8. 回灌建议

1. **新增/修订 ADR（建议新开 ADR-013"触发源与声明解耦"或作为 ADR-002 附录）**：把 47 号已归档的承诺转正为当前可引用契约，明确触发源与决定权分离；同时登记 `runScenario`/`ScenarioRunInput` 已经 trigger-blind 这一既成事实，避免未来实现会话误判需要"新增 actor 参数"才能支持 scheduled 触发。
2. **`CLAUDE.md:45` 与 `ADR-002:9`** 按第 7 节措辞收紧，避免字面表述挡住 Stage 3 立项时的实现会话。
3. **`ADR-010` 应补一条决定（或在 `WORK-STORE-1` 工单里显式列出）："失败终态必须显式持久化"**——把 `ScenarioFailedEvent` 从"设计已提及但未列入 `SessionEvent` 联合类型"转正，要求 `RuntimeLimitExceededError` 等 executor 异常必须在 `WorkCommandPort`/composition root 层被捕获并映射为该事件，不允许以裸 Promise rejection 作为终态呈现方式。这是 Stage 3 的前置阻塞，建议现在就登记，避免 Stage 3 立项时才发现。
4. **`ADR-010` 验收下限**（`ADR-010-work-live-boundaries.md:279-296`）建议补一条显式反例：杀进程于 `confirmationStore.consume` 与 `eventLog.append(confirmation_resolved)` 之间，验证重启后状态一致（或至少可检测到不一致并 fail closed）——目前的验收下限清单里没有直接针对这条 CAS 非原子缺口的反例项。
5. **建议新开一份"IM/远程通道网关边界"ADR**：`ADR-001~012` 均未定义这个中转服务的宿主形态、认证与数据出境红线。roadmap 已有产品口径（"卷宗内容不出通道商服务器可控范围，推送只含脱敏摘要 + 深链"，`archive/.../04-长期Roadmap.md:19`），但这是产品叙事，不是技术边界决定；`ADR-009:39`"当期不新增 localhost server、Node sidecar、远程 backend"与"接收 IM 服务器 webhook"存在结构性矛盾，建议在 Stage 1 立项前就把这个矛盾摊开决定，而不是等到实现时才发现无路可走。

---

## 9. 证据附录（file:line 索引）

**契约文档**
- `CLAUDE.md:5,29-36,40-47,60` — 不变量编号范围、技术基线原文、archive 引用禁令
- `docs/decisions/ADR-002-schema-workflow.md:9` — "用户触发"唯一逐字来源
- `docs/decisions/ADR-009-runtime-ports-and-harness.md:39,119-125` — 不新增远程 backend；Work 步骤封闭集
- `docs/decisions/ADR-010-work-live-boundaries.md:15-16,39-45,72,100-159,171-183,201-214,279-296` — WorkCommandPort/actor 注入、CAS 序列、ScenarioFailedEvent 设计、验收下限
- `docs/decisions/ADR-011-minimal-harness-kernel.md:44,46-56,89-96` — 三道门、门禁段
- `docs/decisions/README.md:3,20-24` — 仅 Accepted ADR 有约束力；变更规则
- `docs/architecture/principles.md:13-15,17-19` — 原则三"留人确认"、原则四"静默降级零容忍"
- `docs/product/vision.md:25,56` — 触发的开放列举、"不自动执行不可逆动作"
- `archive/docs-legacy-2026-07-13/docs/04-长期Roadmap.md:19,34-44` — Stage 1 IM 网关、Stage 3 资产监控层
- `archive/docs-legacy-2026-07-13/docs/47-架构决定-文件操作分级.md:26` — "触发方式与来源声明解耦"

**代码**
- `packages/legal/src/scenarios/index.ts:34-142` — LEGAL_SCENARIOS，trigger 字段
- `packages/registry/src/package-manifest.ts:59-71,90-105` — PackageTriggerSchema、PackageScenarioObjectSchema
- `packages/registry/src/admission.ts` — 全文 grep trigger/actor/caller/invoker 零命中
- `packages/core/src/scenario-executor/executor.ts:43-77,137-169,418-446,448-493,502-523,536-541,596-615,645-707` — 执行器全链路（runTools、pauseAt、produceSequence、runScenario、resumeScenario）
- `packages/core/src/scenario-executor/executor.test.ts:790-834` — 跨进程 'wecom' resume 实证
- `packages/core/src/scenario-executor/runtime-limits.ts:1-74` — RuntimeGuard 四件套
- `packages/core/src/events/types.ts:19-28,45-116` — ConfirmationActor 定义与注释、SessionEvent 联合类型（含未生产的 error 变体）
- `packages/core/src/events/event-log.ts:11-15` — EventLog 接口
- `packages/core/src/session/confirmation-store.ts:24-32` — ConfirmationStore 接口
- `packages/core/src/session/confirmation-store-file.ts:1-84` — Node-only 落盘 CAS 实现
- `packages/core/src/events/event-log-file.ts:1-36` — Node-only 落盘 JSONL 实现
- `packages/schemas/src/confirmation-policy.ts:9-21` — SideEffectClassEnum（含 external_send）、sideEffectsPermitNoGate
- `apps/desktop/src/App.tsx:437-445,895-903` — resolveInteraction 硬编码 actor（Chat/Turn 分支）、RiskList 网关走 demo fixture
- `apps/desktop/src/protocol/client.ts:78-115` — WorkCommandPort/WorkProjectionPort 声明，未接线注释
- `apps/desktop/src/demo/client.ts:1-146`（尤其 75,90-141） — DemoWorkFixtureAdapter，"demo-only composition"自陈
- `apps/desktop/src/provider/turn-protocol-client.ts:224-225` — resolveInteraction 实现（localStorage backend）

**全仓 grep 负向结果（用于支撑"无实现"判定）**
- `cron|scheduler|wecom|webhook|企业微信|飞书|dingtalk`（除测试数据/类型注释）→ 零命中
- `type:\s*['"]error['"]` 生产调用点 → 零命中（仅类型定义一处）
- `RuntimeLimitExceededError` in `apps/desktop` → 零命中
- `sideEffect` 赋值 in `packages/tools/src` → 零命中
