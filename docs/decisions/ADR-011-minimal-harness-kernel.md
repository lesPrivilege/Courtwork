# ADR-011：最小 Harness Kernel 与扩展边界

- 状态：Accepted（**2026-07-20 经 ADR-017 / ADR-016 修订两处，见末节「修订记录」**）
- 日期：2026-07-14
- 来源：`1fdd7c8`
- 关系：细化 ADR-007、ADR-009 与 ADR-010；不替代 Turn、Work 或 Package ABI

## 背景

Courtwork 已有 provider 无关 Turn Engine、Chat Turn journal、Work SessionEvent 账本、受控交互、固定 Scenario、运行限额与 command/projection port。社区最小 agent harness 的经验说明，好的内核应提供少量稳定 primitive，把能力与 UI 外置，并保持每一步可观察。

这不构成引入第二套 agent runtime 的理由。Courtwork 的证据、schema、权限、确认和不可逆动作边界比通用 coding agent 更窄；任意扩展 hook、模型自主工具和动态流程会绕开既有裁决链。

## 决定一：现有 Turn Engine 就是唯一最小内核

Harness Kernel 不是新 journal、通用 step DSL 或第三方 runtime。它由现有机制组成：

```text
Provider adapter
      ↓
Turn Engine ── TurnEvent / TurnJournal ── Chat Harness
      │
      └── TurnRunnerPort ── Work Harness ── SessionEvent / artifact / confirmation
```

- 一次模型调用只由 Turn Engine 负责请求身份、reasoning、正文、usage、取消、失败和 terminal。
- Chat 与 Work 只共享 Turn、interaction resolver、runtime guard 和 provider；两本账不合并。
- Work 只以 `turn_linked` 引用 Turn，不复制 reasoning、正文 delta 或 Turn terminal 到 SessionEvent。
- UI 的 thinking、正文、ask-user、失败和终态只从 journal/replay 投影，不以定时器或 React 本地状态猜测。
- 审计事件默认不进入下一轮模型上下文；只有六段组装器明确选择的内容可以进入 prompt。

## 决定二：只借用极小 primitive，不引入 Pi runtime

采纳的设计形状只有：极小内核、显式事件、能力外置、窄上下文、投影与真源分离、可回放状态。

明确不引入：

- `@earendil-works/pi-*`、其他 Chat/Agent runtime、TypeBox 迁移或外部 session 格式；
- jiti/TypeScript 任意代码扩展、热重载 extension、project package 自动执行；
- `before_provider_request`、`context` 等可任意改写 prompt、provider wire、事件身份或 terminal 的 hook；
- 模型自主选择工具、任意 goto、动态图、后台 bash、subagent/crew 或 session 级 always-allow；
- YOLO 权限模型、MCP 工具全集注入和第三方 package 直接注入 JSX/CSS。

本阶段新增第三方 agent runtime 依赖数继续为零。

## 决定三：扩展面是受信装配，不是开放插件

能力必须同时通过三道门：

1. 垂类 descriptor 声明场景、工具、interaction、projection 与确认政策；
2. runtime binding 在受信 composition root 显式装配；
3. core 在执行时只允许当前已准入 Scenario 点名的封闭能力。

已注册但未被 Scenario 点名的工具不得执行。模型输出的 tool name、step、goto 或并行指令只是普通不可信文本，不构成调度命令。descriptor 继续禁止函数、URL、CSS、React、SDK client、secret 和可执行 hook。

企业接口采用按需 binding：只有已准入的垂类 runtime 可以把具名企业能力装配为通用工具或材料输入；core、provider 与 registry 不维护企业厂商 catalog，也不把全量工具 schema 塞入上下文。

## 决定四：Thinking、Progress 与 Ask User 同源但不同义

- Chat reasoning 的真源是 `reasoning_started / reasoning_delta / reasoning_completed` 与 Turn terminal。
- Work progress 的真源是 SessionEvent/Work projection；它可以复用同一宿主交互与动效组件，但不得被标成模型 reasoning。
- Ask user 的协议真源继续是 `InteractionTemplate → InteractionCoordinator → TurnJournal`；模板内容与锚点政策来自垂类，锚点由系统解析，回答 first-wins、非法输入零落账。
- 通用 UI 组件只接受 `running | settled | empty | failed` 等宿主 view model；不得把 Work progress 文案复制进 Turn journal，也不得为 reasoning absent 伪造内容。

## 决定五：本阶段只收口 Facade，不扩张控制循环

在 `WORK-BROWSER-1` 完成后，可用纯机械 facade 收口已有构造：

```ts
interface TurnHarnessRuntime {
  turns: TurnRunnerPort;
  interactions: InteractionRuntimePort;
}

interface InteractionRuntimePort {
  request(
    input: InteractionRequestInput,
    context: { materials: readonly MaterialTextLayer[] },
  ): InteractionRequestedEvent;
  resolve(input: ResolveInteractionInput): InteractionResolvedEvent;
  replay(turnId: string): TurnReplay;
}
```

factory 可以持有 provider、TurnStore、InteractionTemplateRegistry 与时钟；Chat/Work 消费者不得取得这些实现对象。此 facade 不新增事件、不改 journal、不改变 Scenario step 闭集，也不把完整 runtime 交给 Work executor。

Steering/follow-up 队列、Work interaction step、session tree 与 MCP proxy 全部延后。它们只有在真实用例出现、durable-before-effect 与 CAS 状态成立后，才能另立 ADR；不得用本 ADR 的“最小 harness”名义夹带。

## 门禁

- Chat/Work 直接 import Provider、TurnStore 或调用 `generate()` 必须触红。
- browser-safe harness/turn 出口出现 `node:*` 必须触红。
- 任意第三方 agent runtime、jiti 或开放 lifecycle mutation hook 进入生产依赖图必须触红。
- 同一 provider stream 经 Chat 与 Work 的 TurnRunnerPort 必须得到同序 TurnEvent 与同一 terminal 语义。
- pending interaction 时 provider 调用必须为零；未知、重复或并发回答不得消费 pending。
- runtime limit 触发后不得启动下一步、发布 artifact 或伪造 `scenario_completed`。

## 后果

Courtwork 可以吸收最小 harness 的优点而不成为通用 agent 平台。新增能力主要发生在垂类声明、受信 runtime binding 和宿主 projection；core 继续保持窄、可回放、可验证，Work live 仍按 ADR-010 的 durable 前置推进。

## 修订记录

按本目录变更规则，新决定不改写上文段落；此处只登记被后续 ADR 修订的条目与其落点。

### 修订一（2026-07-20，`HARNESS-CORE-1` R-10 准）· 决定二措辞

决定二原列拒绝项含「**后台 bash**」。修订为：

> **不引入自由 shell 与后台执行。**

**原禁令意图不变，表述更准**——原措辞只点了「后台 bash」这一形态，新措辞把「自由 shell」（不经闭集约束的命令字符串）与「后台执行」（脱离 turn 生命周期的进程）两个独立维度都覆盖到。[ADR-017](ADR-017-controlled-command-execution.md) 经 R-7 裁定 **bash 当期不入界**，其决定一至七封存不生效；本次只改措辞，不放宽覆盖面。

决定二的其余拒绝项（模型自主选择工具、任意 goto、动态图、subagent/crew、session 级 always-allow、YOLO 权限模型等）**一并不变**。

### 修订二（2026-07-20，`HARNESS-CORE-1` R-25 裁）· 「知交互」动词集扩集条款

`TOOL-READ-1` 需要一条「模型向系统请求白名单内只读工具」的通道。契约段「知交互」现列合法交互只有步骤宣告、`ask_user`、通知、请求确认。裁定扩一枚 `request_tool`，并立扩集条款如下。

**扩集条件**（四条同时满足才可扩，缺一不可）：

1. 新动词的**参数闭集由系统当次注入**，并以 `z.literal` 在 schema 校验层锁死；闭集外的取值是普通不可信文本，校验层拒收，结构上进不了执行路径。
2. **不新增步骤种类**——ADR-009 决定二的 Work 步骤闭集（`model | deterministic_tool | interaction | projection | confirmation`）不扩。`request_tool` 是 turn 内交互动词，其**执行仍落 `deterministic_tool` 步**。
3. 不放宽既有副作用边界：`request_tool` 的白名单仅 `pure_read`，经既有 `sideEffect` 门（`packages/core/src/scenario-executor/executor.ts:118`）在任何 `confirmationPolicy` 模式下强制。
4. 与决定二「模型自主选择工具」不冲突的判据是「**闭集由谁定**」而非「谁开口」：被拒绝的是模型发现并调用未声明能力；在系统注入的闭集内点名不属此列。

**红证要求**：闭集外取值被消费必须触红；白名单出现非 `pure_read` 项必须触红；步骤闭集被扩必须触红。三者缺一则本次扩集不成立。

**四知文本 golden 同步**：契约段常量（`packages/core/src/assembly/segments.ts` 的 `CONTRACT_SEGMENT_BODY`）随之改一次，其 golden 重铸一次——**改动即显式过账**，不得静默漂移。

判据来源与地址锁机制见 [ADR-016](ADR-016-uniform-slot-filling-protocol.md) 决定二；本条款是该机制在交互动词面的应用，契约真源在此，ADR-016 不重述。
