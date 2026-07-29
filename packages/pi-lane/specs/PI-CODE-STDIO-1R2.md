# PI-CODE-STDIO-1R2 · tc 状态表返修回执

状态：实现完成，待独立验收。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-B 与实现就绪图同名行；本文件是该
工单的独占实现回执，不得在这里改 wire、状态机语义、依赖或验收标准。

实现会话只更新本回执，不改父级 SPEC、1/1R 旧回执或 ACCEPTANCE：

- 组合基线与目标 SHA：架构锚点 `main@efcd0ab3b06ed41e28bd1a0bb2c56bf2ac5b54df`，源树 clean、
  无同名 branch/worktree。worktree `/private/tmp/courtwork-pi-code-stdio-1r2-opus`，分支
  `codex/pi-code-stdio-1r2`。依序 cherry-pick
  `5b55885→5133c6e→0872a5c→855db1b→9f9255b→7c8c9c3→4df2e84`，落为
  `9b5968a→80e47ea→090da20→51ee62a→35145e1→3111e9b→63787cb`，逐枚 `git patch-id --stable`
  与原提交 **EQUAL**；四份 protocol/stdio source/test 与 1/1R 两份旧回执的 blob 与 `4df2e84`
  树 byte-identical。**组合 target `63787cb7b4528953e33544a5aca7c06a86d284af`**，`4df2e84`
  与 1R 修复 `9f9255b` 的内容均在祖先链（cherry-pick 故非字面 SHA 祖先，以 patch-id 等价与
  blob 同一为证）。clean target 上 pi-lane **10 files / 227 tests** EXIT 0，与 1R 验收所记
  基线一致。
- 实现提交：`7686dfd3d2137f0085d5b49810bfe920e5305d97`（只含
  `product-stdio.ts` + `product-stdio.test.ts`）。`product-protocol.ts`／`.test.ts`、
  `index.ts`、`package.json`、导出面与包外全部未触；`product-stdio` 无包外消费者
  （全仓引用仅 `product-protocol.ts` 注释一处）。
- 九枚验收反例的逐项先红：production 原样未动时注入，**10 files / 237 tests，10 failed /
  227 passed**（EXIT 1）；227 绿数与 clean target 逐字相同，故新增反例零误伤既有考卷。
  逐枚失败均为语义 AssertionError，无一出自 module-load、stub、编译失败或无命中 patch：

  | # | 反例 | 首红断言（Received） |
  |---|---|---|
  | 1 | read tc 升权 `workspace_write` | `[]`，即升权**未**被拒；另 ordinal 已烧至 `op_1_2` |
  | 2 | settled write 后发第二 operation | 自发 `tool_finished` 为 `[]`，`host_request` 两枚 |
  | 3 | 同一 tc 改 toolName | `['tool_started','tool_progress']`，改名事件照常出 wire |
  | 4 | unknown runtime event | `TypeError: Cannot read properties of unde…`（逃逸物本身即证据，非红证机制） |
  | 5 | write pending 时提前 finished | 上游 outcome 被直接投影，`[{tool_finished}]` |
  | 6 | pre-op write 伪 succeeded | outcome 为 `succeeded`，未按本地阶段改投 `failed` |
  | 7 | settled effect 被普通 finishPrompt 清掉 | `tool_finished` 为 `[]`，terminal 为 `completed` |
  | 8 | finished 后仍可 progress | `['tool_started', …(2)]`，倒退事件出 wire |
  | 9 | prompt1 stale tc 在 prompt2 reserve | `[]`，即 stale reserve 成功 |

  **红数为 10／其后 11，非验收所记的 9**，差额如实登记：反例二/七之外另有「settled effect
  未投影时起下一枚工具」，以及「每 prompt 至多一枚未 finished tc」的重叠 `tool_started`——
  两者是票面第三节明列的转移，验收九例未单列。以最终测试面对**原始 production** 复跑，
  `product-stdio.test.ts` 得 **11 failed / 80 passed（91）** EXIT 1，十一枚全红。
- 此次 late-send 首红（验收 NO-GO 指出的越权）：`tool_started(write) → reserve(op_1_1) →
  pre-op tool_finished:failed → send(op_1_1)` 在**上述实现之后仍**会发出一枚 `host_request`
  ——已 finished 的 tc 可凭旧 reservation 晚发写 effect。production 不动时补入反例十，得
  **1 failed / 93 passed（94）** EXIT 1，首红断言 `expected [] to deeply equal
  ['finished-send']`（即 send 未被拒）。转绿后同测另锁 `host_request` 恰 0 枚、
  `pendingOperationId` 为 null、已烧 ordinal 不回收（下一合法 reservation 得 `op_1_2`）。
- request-scoped tc identity 与单向 phase：`ToolCallRecord = {readonly requestId, readonly
  toolName, phase, writeOperationSent}`，`tool_started` 当场铸入 registry。
  `resolveActiveToolCall` 是 progress/finished 的唯一解析门，四条同时成立才算有效引用：
  toolName 在闭集内、tc 由**当前 prompt** 铸出、与登记同名、phase 非 `finished`。
  `tool_progress`／`tool_finished` 出 wire 的 toolName 取自 registry 而非本次事件，公开投影
  的稳定性不交给调用方。phase 单向 `started→reserved→pending→settled→finished`；
  read/glob/grep 在 host_result 后回到 `started`，保留同一 active tc 内的多 host-operation
  子循环（write 停在 `settled` 等自己的 `tool_finished`）。`activeToolCallId` 显式守住
  「每 prompt 至多一枚未 finished tc」，不以 `toolExecution:'sequential'` 或注释代替。
  `terminate`／`handlePrompt` 清 active 位但**保留 registry 记录**，使下一 prompt 的引用被判
  stale 而非「从未登记」。
- toolName→capability 与 ordinal 门序：`TOOL_CAPABILITY` 固定
  `write↔workspace_write`、`read|glob|grep↔workspace_read`；`PRODUCT_TOOL_NAMES` 由其键派生，
  兼作运行时闭集，不另立第二份词表。`reserveHostOperation` 依序验已宣告能力 → owner prompt
  → phase 非 finished → 固定映射 → write 单-operation，**全过之后**才 `operationOrdinal += 1`。
  未 send 的 reservation 就此烧号：不出 wire、不成为 pending、不得复用。
  `sendReservedHostRequest` 另在 send 当场重验 phase 恰为 `reserved`、`activeToolCallId`
  恰为该 tc、record owner 仍是当前 prompt、固定映射仍成立——reserve 期的一次通过不构成
  send 期的授权；**刻意不以「finish 时清理 reservation」代替该门**（理由见 mutation 段）。
- pre-operation write 分型：write 尚无 operation 时的 `succeeded|uncertain` 先以
  `failed` 闭合该 public tc，再按 upstream 违约关闭 prompt；本地阶段真能判定的
  `failed|denied` 如实放行，不误伤。
- pending / settled 结构互斥：`pending` 与 `settledWrite` 不并存。settled 未投影时，
  新 reservation/host request、起下一工具、普通 `finishPrompt`、改名与错 outcome 一律先经
  `closeSettledEffectOnViolation()`——按**已保存的 host status** 自发恰一枚正确
  `tool_finished`，再按 `effect_uncertain > budget_unknown > 已知 limit > cancel >
  upstream_event_unsupported` terminal。任何普通 terminal 都不得抹掉未投影的 settled effect。
- premature finished / finishPrompt 的 effect 收束：write 已 `operation_pending` 时的上游
  `tool_finished` 不投影、不提前 terminal，只进 pending 闩锁等严格匹配的 `host_result`；
  outcome 只认 host status，逐字映射 `ok→succeeded / denied→denied / failed→failed /
  uncertain→uncertain`。
- unknown event 与 lifecycle fail-closed：投影入口先做 kind/toolName 闭集。`turn_finished`
  改为具名 case，`default` 收为 `upstream_event_unsupported`，不再落进分支去读不存在的
  `turn/usage` 字段；cast 与未来上游 event 都不逃逸为 `TypeError` 或 callback failure，
  累计器亦不被写成 `undefined`。闭集外 toolName 同样只走 terminal（`capture()` 显式断言不抛）。
- 1R 六项回归：全部保留且原测试组零改写——`R1 固定安全文案与 retryability 闭集`、
  `R2 pending upstream failure 闩锁`、`R3 五 callback 共用 reentrancy guard`、
  `R4 reserve/send 接缝`、`R5 pending 不可变镜像与逐值关联`，连同两条 canary
  （`apiKey`／`caseRoot` 零出字节与文案）在最终 241/241 内全绿。
- production mutation 红证：**共注入 17 枚，逐枚先断言字面量恰好命中一次（`hits=1`）方写盘，
  跑后逐枚恢复并核 sha256；15 枚见红，2 枚为结构性等价——不得记作 17/17 红**。
  最终 production `product-stdio.ts` sha256
  `a35be5976710647922e01bc3dcaaa1ac71307c707f4985ac75ce0bdecb53b7ae` 与实现基线逐字节一致，
  零残留。

  | 变异 | 削弱面 | 定向反例 | 结果 |
  |---|---|---|---|
  | M1 | `read` 映射改指 workspace_write | 反例一 | RED |
  | M2 | `write` 映射改指 workspace_read | 反例一 | RED |
  | M3 | capability 门改为烧号后才拒 | 反例一 | RED |
  | M4 | `resolveActiveToolCall` 改名门 | 反例三 | RED |
  | M5 | `resolveActiveToolCall` finished 倒退门 | 反例八 | RED |
  | M6 | reserve 的 owner prompt 门 | 反例九 | RED（见下） |
  | M7 | pre-op 伪成功不再改投 failed | 反例六 | RED |
  | M8 | pending 提前 finished 的闩锁分支变死支 | 反例五 | RED |
  | M9 | settled 不再拦普通 finishPrompt | 反例七 | RED |
  | M10 | settled 不再与新 reservation 互斥 | 反例二 | RED |
  | M11 | unknown event 被静默吞掉 | 反例四 | RED |
  | M12 | 每 prompt 单一未 finished tc 的重叠门 | 重叠 tool_started | RED |
  | M13 | progress/finished 路径的 owner 门 | stale progress/finished | RED |
  | M14 | reserve 的 finished 阶段门 | 已 finished 不得再 reserve | RED |
  | M15 | **整块 send 期有效性门** | 反例十 | RED |
  | M16 | 仅撤 send 期 phase 恰 `reserved` | 反例十 | **NOT_RED · 结构性等价** |
  | M17 | 仅撤 send 期 `activeToolCallId` 恰等 | 反例十 | **NOT_RED · 结构性等价** |

  两项须如实登记的过程事实：

  1. **M6 首轮 NOT_RED 且补丁确已命中（`hits=1`）**，属覆盖缺口而非补丁失效：初版反例九用的
     stale tc 同时已 `finished`，阶段门先把它挡下，owner 门因而零区分力。已改为让 prompt 1
     留下一枚**未 finished** 的 tc（owner 是唯一适用判据），M6 随即见红；该次重整同时暴露出
     两处无覆盖的门，补为 M13／M14。
  2. **M16／M17 单独撤销不见红，是结构性等价，不是待补的覆盖缺口。** `publishToolFinished`
     在同一步把 phase 置 `finished` 且把 `activeToolCallId` 置 null，故任一条件单独即可拦住
     全部**可达**状态。已穷举求反例：`pending`／`settled` 被上游门挡住，read 子循环回到
     `started` 只能经 `send`，而 `send` 会清空 reservation——「reservation 尚存 且
     phase≠reserved 且 activeToolCallId 仍等于该 tc」不可达。四条子条件按票面要求全部落地，
     属纵深防御；其效力由 M15 整块承担。为使 M15 不沦为等价变异，**未**在
     `publishToolFinished` 内清理同 tc reservation：清理会让「撤掉 send 期门」仍被
     `reservation === null` 兜住，红证随之作废。
- 全仓门结果：串行执行、逐门单取真实退出码、全程无管道。

  | 门 | 退出码 | 数字 |
  |---|---|---|
  | `pnpm -r build` | 0 | — |
  | `pnpm lint` | 0 | — |
  | `pnpm test` | 0 | **162 files / 1564 tests** |
  | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 0 | 等级 `none`；扫 6 宿主 / 22 pi-lane 源码 |
  | `git diff --check` | 0 | — |

  1R 验收所记全仓为 162 files / 1550 tests，本轮 **1564 = 1550 + 14**，恰为本单净增测试数，
  可反向印证无其他考卷位移。定向门：protocol/stdio **167/167**、pi-lane 包 **241/241**，
  均 EXIT 0。`apps/**` 未触，Playwright 不适用。
- 新增概念及必要性：只加一张状态表与其固定词表，无新依赖、无新持久化格式、无新通用抽象、
  无 executable main。
  - `ToolCallPhase`／`ToolCallRecord`：验收拒绝的九例共同根因是「registry 只存两张裸映射」，
    架构裁定明文要求先冻结 registry 状态表；散加 guard 会新造未定义的收束优先级。
  - `TOOL_CAPABILITY` + 由其键派生的 `PRODUCT_TOOL_NAMES`：ADR 冻结的双向映射需要一个运行时
    载体；闭集由同一常量派生，避免第二份词表各自漂移。
  - `activeToolCallId`：ADR 要求「不能把正常上游调度当作安全边界」，故必须有一枚显式状态位。
  - `publishToolFinished`／`closeSettledEffectOnViolation`／`resolveActiveToolCall`：三处
    多调用点共用的判定，抽为函数是为消除重复判据，不是新增层次。
- 待独立验收项：
  1. **两处既有绿测按冻结契约改写，请架构裁定**——`tc 在 tool_started 首见 raw id 时分配`
     原本在第一件工具未 finished 时就起第二件、且把 pre-operation write 报为 `succeeded`；
     `第二枚 op 铸新号，不复用` 原本让 **read** tc 去 reserve `workspace_write`（即反例一本身），
     已改走 read 的多 host-operation 子循环。两者改写后在**新旧 production 上均绿**，故属
     再成形而非为迁就实现而放宽；但仍属改动既有绿测，按纪律登记待裁定。
  2. **`finishPrompt` 遇未投影 settled effect 时不抛，只吸收**：ADR 明文规定「先自发恰一枚
     正确 `tool_finished`，再按既定优先级 terminal」，未规定抛错；且 `cancel`／预算三例既有
     绿测正是该 runtime 形态，其断言在新契约下依旧正确。`reserveHostOperation`／
     `sendReservedHostRequest` 仍抛（无合法返回值可给）。此取舍请架构追认。
  3. **M16／M17 为结构性等价变异**（理由见上），四条 send 期子条件的效力由 M15 整块承担；
     若架构要求逐条独立红证，需要另开可达路径或调整 `publishToolFinished` 的清位时机，
     属契约变更，本单不自行改。
  4. 先红红数为 10／11 而非验收所记的 9，差额已在上文具名列出。
  5. 本单只到 protocol 层状态机；`PI-HOST-LOOP-1` 仍阻塞，未启动。
