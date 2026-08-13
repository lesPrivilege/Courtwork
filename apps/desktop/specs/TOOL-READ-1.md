# TOOL-READ-1 · Work 场景回合的受控只读工具请求通道

状态：票面冻结（2026-08-11 架构会话），**派单前置已解除**——`GENERIC-SCENARIOS-1` 已清账（合入 `9eef484`），App 槽释放，本票为队列首位；触 `App.tsx`＝是（裁定十，demo 分支约 10–20 行）。实现与验收须为不同会话；验收由 Codex 独立会话执行。

权威：ADR-011 修订二（2026-07-20，`request_tool` 扩集条款——扩集四条件、红证要求、四知文本 golden 同步；契约真源在彼，本票不复述）；ADR-009 决定二（步骤闭集不扩）；ADR-016 决定二（地址闭集机制）；ADR-017 决定八（reading 走既有工具契约，不套三段式）；就绪图 `TOOL-READ-1` 行为素材。

---

## 一 · 票面范围与架构裁定

**通道**（循 ADR-011 修订二逐条）：场景线 model 步回合可经结构化输出携带 `request_tool` 意图——本 turn 终结，系统解析意图，落既有 `deterministic_tool` 步执行（`sideEffect` 门强制 `pure_read`），结果回喂下一 turn。**回合内不循环**：不给 `runTurn` 加多请求流，provider 层零 tools 字段（其类型注释的显式判断维持）；`request_tool` 是 turn 间模式，与 interaction/confirmation 同族。

**裁定一 · toolResult 居所＝Work EventLog 账本条目族，Turn journal 两族闭集不扩**。Turn journal（`PersistedTurn | InteractionEvent`）不新增第三条目族；工具请求、执行与结果按既有 `deterministic_tool` 账本形状（executor 现行 `deps.ledger` 链）落 Work 侧 `SessionEvent` 账本，补「模型请求发起」的来源标记；结果内容经 `assembleScenarioRequest` 语料段缝以折叠文本喂下一 turn。既有账本扩员的先例援引**以裁定七为准**（本句原指的 `LEGAL-ANCHOR-BINDING-1` additive-default 先例经侦察证为不同类，已废止援引，勿再据以开工）。

**裁定二 · 白名单声明形制**：场景 descriptor 新增可选键 `requestableToolIds: string[]`（比照 `toolIds`，registry 准入校验：引用必解析、仅 `pure_read`、去重）；每次 model 步请求前系统按该清单当次注入 `z.literal` 闭集，闭集外取值是普通不可信文本，校验层拒收。模型不可发现清单外工具（prompt 不列、schema 不收）。

**裁定三 · 首批工具两枚**（住 `packages/tools`，领域无关）：`material-read`（读某就绪材料正文——复用 `MaterialStore.resolveForProvider` 复验链，blocked 态原样透出为工具失败，不降级）；`dossier-list`（列该 matter 就绪材料清单——复用既有 list 链，只报系统投影字段）。两枚 `sideEffect: 'pure_read'`。

**裁定四 · 循环上界**：每 artifact 的 `request_tool` 轮次上界 3，达界显式 `step_failed`（reason 具名「工具请求超限」），不静默截断也不无界循环；上界是系统裁决，写死在 executor 判据，非 descriptor 可调项（需求实证后再议开放）。

**裁定五 · 消费者边界**：本票交付通道＋两枚工具＋E2E 樁消费场景（demo/acceptance 族）；生产场景接线（generic/legal 各面）随各自票面后续声明 `requestableToolIds`，本票不夹带，避免与在途票冲突面。

**裁定六 · trace 呈现**：工具请求/结果在 Work 画布 trace 区显式呈现，投影自 EventLog 账本条目（界面事件面就是账本本身，判例在案）；呈现文案过 voice 门。落点优先组件层（`ProcessTrace` 族）；若必须触 `App.tsx`，遵守互斥模型排队。

## 二 · 红证义务（ADR-011 修订二三枚为底，另加两枚）

1. 闭集外 `toolId` 取值被消费必须触红（校验层拒收）。
2. 白名单出现非 `pure_read` 项必须触红（准入与运行时双侧）。
3. ADR-009 步骤闭集被扩必须触红。
4. 轮次上界：第 4 轮请求必须显式 `step_failed` 而非执行（born-red 先证现状无界或无通道）。
5. 四知文本 golden：`CONTRACT_SEGMENT_BODY` 知交互行扩 `request_tool` 后 golden 重铸一次，显式过账；漂移检测撤断言复红。

## 三 · 工序与门

- TDD 先红；分批提交；只做票面。`resolveForProvider`/`MaterialStore`/`ScenarioRuntime` 既有链复用，不造第二读取路径。
- 新增概念登记（复杂度节制）：预期**四枚**——`requestableToolIds` 声明键（ADR-011 修订二条件 1 的静态声明面）、轮次上界判据（裁定四）、`SessionEvent` 工具结果成员（裁定七）、单枚结果字节上界与截断标记（裁定九）。两处读侧穷举收口（裁定七）**不计新概念**——它消灭分支而非新增。多于四枚须逐枚说明「为何非加不可」。
- 完工门：`pnpm -r build`、`pnpm lint`、root、desktop `--filter`、cargo（应零涉、跑通即证）、Playwright 完整链（届时按排程律与锁规程）、`site:guard`；floor 只升。
- 禁区：不触 pi lane；不改 provider `GenerationRequest`/流归一（零 tools 字段）；不扩 Turn journal 条目族；不触 chat 自由回合（chat 面工具化属 ADR-016 决定四空位，另票）；不动 legal/pm 场景声明。

## 四 · 侦察定谳（2026-08-11 架构会话预跑，三项已闭；实现会话直接消费，不必重跑）

侦察结论与由此产生的四项补充裁定如下。原「开工首日侦察」义务随之解除。

**侦察事实**：①`SessionEvent`（`packages/core/src/events/types.ts`）是纯 TS 判别联合，九枚分支，**无 zod schema、无运行时校验、无 JSON Schema、无版本号**，JSONL 持久只做类型断言；工具相关**只有失败态** `step_failed{scope:'tool'}`，成功态零条目——`runTools` 的成功分支只写内存 `EvidenceLedger` 的等级累加，工具结果原文从未进账本。②工具结果经 `context.toolResults` 进 `taskInstruction`，而该值在 `runScenario` 只赋一次、**贯穿整条 `produceSequence` 反复注入**；`assemble.ts`/`segments.ts` 全篇**无长度上限、无截断**，`RuntimeGuard` 四件套只管步数/秒数/工具调用数/金额，且金额是调用后事后估算。③trace 链 `SessionEvent→projectSession→SessionProjection→processTraceFromWorkProjection→ProcessTrace`，`App.tsx:1657` 以 `{...session}` 展开传参故新字段自动透传；但逐事件卡片列表内联在 `App.tsx` 的 demo 分支内，非 demo 分支根本没有逐事件 trace 列表。④知交互行现原文未列 `request_tool`，字节级 golden 在 `packages/core/src/assembly/__golden__/assembled-request.golden.txt`，由 `assemble.test.ts` 的 golden 用例把守，`COURTWORK_UPDATE_GOLDEN=1` 重铸。

**裁定七 · 扩员循裁定A，且读侧通配须同批闭口**。toolResult 落账是给闭集**加新成员**，不是给既有 object 补默认键——故先例不是 `outOfCoverage`（additive-default 不升版），而是 pi journal **裁定A**（扩员成立、旧档续 valid、**读侧闭集非通配**）。第三项条件现被两处读侧结构性违反：`replaySession` 的 if/else 链无 else、`projectSession` 的 `default: return base`，未识别条目静默跳过——正是 `PI-HOST-LOOP-1` 定谳的「unknown→跳过」病根在 Work 账本面的同族形态。故：**扩员成立，但同批闭口两处读侧**，形状取「编译期穷举 + 运行期显式登记」两层：

- 编译期：两处读侧改穷举（`const _exhaustive: never = event` 或等价），`SessionEvent` 加员即编译失败——结构性杜绝缺口再生（循 `PI-READ-TOOLCALL-1` 的 `closed_enum!`＋穷举 match 先例）。
- 运行期：真正未识别的 type（外来/损坏行）**不得静默返回原状态**，须落显式「未识别账本条目」登记并可在 trace 面看见；**不取整份 fail-closed**——该通道现无任何运行时校验，硬失败会把既有档一次性变成不可读，与「旧档续 valid」相悖。
- 红证：新增 `SessionEvent` 成员而漏改任一读侧 → 编译失败（先证）；注入一枚未识别 type 的记录 → 显式登记在场（撤登记即静默跳过，复红）。

闭口是本裁定援引裁定A 的**前提**，不是范围外的顺带清偿；不闭口则工具证据自落地第一天就住在一条会静默丢弃自己的通道里（触不变量四）。

**裁定八 · 回喂复用既有 `toolResults` 通道，不新增短生命周期载体**。模型请求所得结果与场景声明期工具结果同属**会话作用域事实**，合并进 `context.toolResults` 即可（改动落 `executor.ts` 的 task 对象拼装点，`assemble.ts`/`segments.ts` 零改）。不为「只喂下一 turn」另造状态槽——那是新概念且无需求实证；后续 artifact 看见前序工具结果是正确语义，不是泄漏。

**裁定九 · 回喂须带显式字节上界**。现行链路零截断，而 `material-read` 可拉入整份材料正文、轮次上界 3、且结果贯穿后续每一次请求——无界会让 prompt 随轮次线性膨胀。定：**单枚工具结果上界 20000 UTF-8 字节**（系统常量，非 descriptor 可调项），超限尾部截断并附系统标记，标记同时进账本条目与 trace 呈现，**不静默截断**。原「字符」口径已由 §五 R1-2 定谳作废，本票内外一律只认 BYTES 口径。红证：超限用例见截断标记；撤标记即复红。

**裁定十 · trace 取结构化呈现**。复用既有 `ToolCallRow`/`TurnCard` 原语，改动落投影层 ＋ `App.tsx` demo 分支约 10–20 行，不新造组件（`App.tsx` 槽已随 `GENERIC-SCENARIOS-1` 清账释放，本票即队列首位）。不取「折成文本塞进 `progress: string[]`」的极简方案——工具结果是进过 prompt 的证据面，折成通用文本行会丢结构与来源标记，与裁定六「界面事件面就是账本本身」相悖。非 demo 分支无逐事件 trace 列表属既有缺口，裁定五已把消费者边界圈在 demo/acceptance，不在本票扩。

**golden 环节**：`CONTRACT_SEGMENT_BODY` 知交互行扩 `request_tool` 后，先跑一次红（未重铸即 DIFF 失败），再 `COURTWORK_UPDATE_GOLDEN=1` 重铸 `assembled-request.golden.txt` 显式过账。

## 五 · R1 架构裁定（2026-08-13，消费独立验收 REJECT）

独立验收在 clean clone 对目标 `e644afd` 作结，报告提交 `c04be88`，结论 **REJECT**。主体实现的 build、lint、root/desktop 定向测试与四类变异证据成立，但完整 desktop `test:e2e` 在 Playwright 启动前被三道静态门驳回；拒因与下列返修合同一一对应。

### R1-1 · 外提方案保留，三道门的读取面须同批迁移

保留 `DemoTurnStream` 外提（它兑现本票「过手即拆」且把 `App.tsx` 高水位降至 2218），不回退内联。实现会话须把下列三道既有判据的读取面机械迁到 `App.tsx + DemoTurnStream`，不得删判据、放宽文案或依赖后续提交补门：

- `assert-process-trace.mjs`：继续锁 stopped work 不得渲染完成事件，并新增 `workStopped` 从 App 真传入外提组件的消费锁；
- `assert-rp28-contracts.mjs`：四枚 `event | artifact | file | gate` route 与 `ToolCallRow` 判据继续成立；
- `assert-rp210-contracts.mjs`：demo settle 后须收敛、失败后静止的判据继续成立。

共享实现 worktree 现有三份未提交 diff 只可作为返修输入，未进入目标 SHA，不构成已交付事实。R1 完工须在**自身 tip**跑完整 `pnpm --filter @courtwork/desktop test:e2e` 前链与 Playwright；不得只跑 `npx playwright test`。

### R1-2 · 裁定九真义统一为 UTF-8 20000 字节

裁定九的安全目标是限制送入 prompt、EventLog 与 trace 的实际编码体积，故“字节上界”取真，统一为：**单枚工具结果的 UTF-8 编码最多 20000 bytes**。原文“20000 字符”作废，不得再据以实现或写文案。

- 计量对象为 `JSON.stringify(envelope)` 的 UTF-8 字节序列；
- 超限时须在不产生破损 Unicode 的边界截取，使「保留正文 + 系统截断标记」的 UTF-8 总字节数**不超过 20000**；标记自身计入上界；
- 账本 `content` 与回喂 `context.toolResults` 继续逐字同源，`truncated:true` 与显式系统标记同时在场；
- ASCII、CJK、emoji 三组边界反例必备：恰等于上界不截，越一字节/一个完整码点须截，输出不得含 U+FFFD 或孤立 surrogate；独立验收已证 `string.length` 会让 10000 个汉字约 30049 UTF-8 bytes 仍假绿，现形态必须退役。

常量、错误文案与测试名称须改为 `BYTES` 口径；不得保留 `MAX_CHARS` 第二真值。

### R1-3 · OSS 四选一裁定

本票选择 **「借行为或源码范式」**：借 pi/opencode 一手源码已经验证的显式 tool-result 配对、截断必须内联告知模型、权限/闭集 fail-closed 形态；**零新增直接依赖**。Courtwork 的 `z.literal` 请求闭集、`SessionEvent`、runtime guard、MaterialStore 复验、EventLog 与 trace 投影仍为本仓唯一真源，不接上游 runtime、session 格式、permission 默认或状态机。

本结论须进入本票实现回执，并在所触及层 SPEC 以最窄职责留痕；不得用提交消息、实现注释或归档报告替代权威 SPEC。

### R1-4 · 实现回执与清账证据

实现会话须在本票补“实施回执”：精确提交链、逐段 born-red、四枚新增概念的最终落点、两处读侧闭口、golden 重铸、门数与所有偏离；同时在 `packages/core`、`packages/tools`、`packages/registry`、`packages/demo-runtime`、`apps/desktop` 各层 SPEC 只写本层新增公开契约/模块职责与消费边界。新生产模块 `DemoTurnStream`、`tool-request`、`unknown-tool-error`、`dossier-read` 产生当刻未入册的偏差随 R1 前进式补齐，不改写历史。

R1 禁止扩张：不接 production generic/legal 场景，不改 provider/Turn journal/chat/pi，不新增依赖，不重做主体通道。R1 完成后必须由**新的独立 Luna clean clone**复验；首轮 REJECT 报告保留，不覆盖。

## 六 · R1 实现回执（2026-08-13，实现者 Motto）

### 6.1 精确提交链

分支 `claude/tool-read-1`（隔离 worktree 施工；基线 `main@80f0d15`）：

```text
80f0d15 基线（main；侦察定谳与补充裁定）
9b10939 裁定七：SessionEvent 扩员 model_tool_result，两处读侧同批闭口
f1fa33e 裁定二＋红证一/三/五：requestableToolIds 白名单、request_tool 闭集信封、四知文本（第一份 golden 重铸）
7df426f 裁定四/八/九：executor 的 turn 间工具请求通道、轮次上界、回喂与字节上界
247d8a4 裁定三/五/六/十：两枚只读工具、demo/acceptance 樁与 trace 结构化呈现
e644afd 门修：核心 browser-safe 边界回退、第二份 golden 重铸、App.tsx 过手即拆（首轮验收目标）
5b6f77c cherry-pick a9aa6cd（R1 返修裁定，只改本票 SPEC）
05ad0f8 test/feat：UTF-8 字节上界与三道门同步（本节所记）
9c5e476 docs(spec)：各层留痕与实现回执（R1 验收目标）
```

R1 独立复验（2026-08-13，报告提交 `ac20b209`）结论 **REJECT**：唯一决定性阻断＝`packages/demo-runtime` 新增直接 devDependency `zod` 与 pnpm-lock importer，与 R1-3/R1 禁区/demo-runtime SPEC「零新增直接依赖」逐字冲突；完整门、388/388 E2E、UTF-8、三门、闭集、pure_read、round4 与 golden mutation 均通过。返修见 §七。

### 6.2 R1-2 born-red 与 mutation 原始结果

**born-red**（先写测试、实跑于 `string.length` 旧口径实现；原始输出见会话日志）：

```text
packages/core/src/scenario-executor/tool-request.test.ts (17 tests | 3 failed)
  × CJK：多字节内容越界必须截——UTF-16 长度口径在此假绿
  × emoji：不得从 surrogate pair 中间截断，输出不含 U+FFFD 或孤立 surrogate
  × 截断后「保留正文 + 标记」的 UTF-8 总字节数仍 ≤ 上界（标记自身计入上界）
packages/core/src/scenario-executor/tool-request-loop.test.ts (12 tests | 1 failed)
  × 超上界尾部截断并附系统标记，标记同时进账本条目
      AssertionError: expected 20083 to be less than or equal to 20000
Test Files  2 failed | 34 passed (36)   Tests  4 failed | 408 passed (412)
```

旧口径三处假绿坐实：CJK 7000 字（≈21000 UTF-8 bytes）不截、emoji 5000 枚（≈20000 bytes＋信封开销）不截、ASCII 截断后「正文＋标记」20083 bytes 越界。修复后同套件 **412/412** 全绿。

**mutation 红证**（全部恢复后 `diff` 与原稿逐字节一致，树内无残留）：

| 变异 | 红形 |
|---|---|
| `toolIdSchema` 放宽为 `z.string()` | 4 failed / 408 passed：assemble 两枚（闭集外 toolId 被消费即拒收、toJSONSchema 闭集写进 prompt）＋tool-request 两枚（闭集内收外拒、单枚白名单也是闭集） |
| 撤除截断标记拼接 | 4 failed / 408 passed：ASCII 越界、CJK、总字节、loop 标记同时进账本 |
| 计量退回 `raw.length` | 3 failed / 409 passed：CJK、emoji、总字节（`string.length` 口径三处全红） |
| 三道门读取面退回只看 App.tsx | 三门各自 exit 1：`Failed or canceled Work may not render a completed event`；`App must declare the event turn-card route`；`demo 进行态须在 settle 后收敛，失败后静止（不永久闪烁）` |
| App 高水位 2218→2217 | `App.tsx 高水位门失败：当前 2218 行 > 上限 2217 行（净增 1）` exit 1 |

### 6.3 四枚新增概念最终落点（不多于预期四枚）

1. **`requestableToolIds` 声明键**（ADR-011 修订二条件 1 的静态声明面）→ `packages/registry/src/package-manifest.ts`（`z.array(z.string().min(1)).optional()`＋去重 refine）、`package-registries.ts` 的 `ScenarioRuntime`。
2. **轮次上界判据**（裁定四）→ `packages/core/src/scenario-executor/tool-request.ts` 的 `REQUEST_TOOL_MAX_ROUNDS = 3`，executor 达界写死显式 `step_failed`。
3. **`SessionEvent` 工具结果成员**（裁定七）→ `packages/core/src/events/types.ts` 的 `model_tool_result`（stepId/artifactType/round/toolId/verified/content/truncated）。
4. **单枚结果字节上界与截断标记**（裁定九＋R1-2）→ 同文件的 `MODEL_TOOL_RESULT_MAX_BYTES = 20_000` 与 `MODEL_TOOL_RESULT_TRUNCATION_MARK`（「20000 字节上界」文案）。

两处读侧穷举收口不计新概念（消灭分支而非新增）。

### 6.4 replaySession / projectSession 两处读侧闭口（裁定七）

- `packages/core/src/events/event-log.ts` 的 `replaySession`：switch 穷举（`default` 内 `const _exhaustive: never = event`）＋ `unrecognizedEntries` 运行期登记（`describeUnrecognized` 携 seq/type，缺 type 显式记「(缺 type 字段)」）。
- `apps/desktop/src/protocol/client.ts` 的 `projectSession`：同形穷举＋登记；`SessionProjection.modelToolResults`/`unrecognizedEntries` 随同派生。
- 红证：`SessionEvent` 加员漏改任一读侧即编译失败；注入未识别 type 记录显式登记在场。

### 6.5 两份 golden 重铸

1. `packages/core/src/assembly/__golden__/assembled-request.golden.txt`（`f1fa33e`）：知交互行扩 `request_tool`，先红后 `COURTWORK_UPDATE_GOLDEN=1` 重铸显式过账；`assemble.test.ts` golden 对照把守（定向 7 passed / 9 skipped）。
2. `packages/demo-runtime/src/acceptance/__golden__/s3-assembly.golden.txt`（`e644afd`）：同一处四知文本的第二份 golden，同法重铸；`s3-assembly-golden.test.ts` 3/3。

### 6.6 R1-2 UTF-8 字节裁定的实现

`foldToolResult` 计量对象改为 `JSON.stringify(envelope)` 的 UTF-8 字节（`TextEncoder`，web 平台标准 API，browser-safe）；超限先按「20000 − 标记字节」算出正文预算，再以 `for...of` 逐 code point 累加字节截取前缀——截点必在完整 code point 边界，`JSON.stringify` 输出恒 well-formed（孤立 surrogate 被转义）故结果不含 U+FFFD 或孤立 surrogate。`MODEL_TOOL_RESULT_MAX_CHARS` 退役，仓内源码/测试零残留。EventLog `content` 与 `context.toolResults` 消费同一 `foldToolResult` 产物，逐字同源；`truncated:true` 与标记恒同场（定向断言在案）。

### 6.7 三道门迁移（R1-1）

共享 worktree 三份未提交 diff 经逐份读核，与 R1-1 一致后随本票提交：`assert-process-trace.mjs`（stopped 不渲染 completed 判据保持＋新增 `workStopped={workStopped}` 消费锁）、`assert-rp28-contracts.mjs`（event/artifact/file/gate 四路由与 ToolCallRow 判据保持，取样面取两份并）、`assert-rp210-contracts.mjs`（settle 收敛/失败静止判据保持，同法取样）。只迁读取面：零删判据、零放宽错误文案、零 CSS/视觉语义改动。

### 6.8 全量门命令与实测数字（本票 tip 实测，无并发）

| 门 | 实测 |
|---|---|
| `pnpm -r build` | EXIT 0（15/16 workspace；desktop Vite 完成，仅既有 chunk 警告） |
| `pnpm lint` | EXIT 0 |
| `pnpm test` | **183 files / 2249 passed** |
| `pnpm --filter @courtwork/desktop test` | **100 files / 888 passed** |
| `pnpm site:guard` | EXIT 0（release-truth/deslop PASS；App 高水位 **2218/2218**） |
| `pnpm --filter @courtwork/pi-lane build:product-sidecar` | **547,893 B / `951acf8e…`** reused-identical（零漂移） |
| `pnpm --filter @courtwork/pi-lane build:headless-sidecar` | 555,314 B / `061248fa…` reproducible |
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **259 passed / 0 failed / 1 ignored** |
| `COURTWORK_E2E_PORT=19513 pnpm --filter @courtwork/desktop test:e2e` | 完整静态前链＋Playwright **388/388 passed**（6.7m，独占端口 19513） |

TOOL-READ 定向：core 五文件（assemble/segments/tool-request/tool-request-loop/event-log）**70 passed**；tools `dossier-read`＋`contract` **34 passed**；registry **123 passed**（7 文件）；demo-runtime（`tool-request.integration`＋`demo-assembly`）**5 passed**；`s3-assembly-golden` **3 passed**；desktop `session-event.contract` **9 passed**；core `tool-registration-boundary` **4 passed**。

### 6.9 偏离登记

1. **`rp28.spec.ts` e2e 适配**：demo 回合现同时有旧 Ran command 行与本票新增的模型请求投影行，同用 `ToolCallRow` 原语致 `tool-call-row` 双元素、strict mode 红。行为断言改 `.first()`——与同仓 `goal2.spec.ts`/`button-fixes.spec.ts` 既有写法一致，断言意图（默认折叠→展开 mono details）零放宽；全量轮 388/388 后该例定向复跑通过。
2. **`E2E-FLAKY-HOVER-1` 观察**（非本票引入）：`global-verbs.spec.ts`「data-card 复制按钮悬停」例在本票门轮与定向复跑期间以负载相关形态出现（opacity 收到 0，无负载隔离跑绿）；已独立归因——clean `e644afd` 与 `main@80f0d15` 同形复现（同负载下 2/6 红），与票面无因果；最终无负载全量轮该例通过。在册票 `E2E-FLAKY-HOVER-1` 维持，不在本票处置。

除上述两项（一为本票 trace 呈现的必要消费面适配、一为在册环境抖动观察）外，**零偏离**；票面禁区（pi lane、provider、Turn journal、chat 自由回合、legal/pm 声明、新依赖）零触碰。

## 七 · R2 最小返修回执（2026-08-13，实现者 Motto）

### 7.1 R1 独立 REJECT 与五条架构裁定的消费

R1 独立复验（报告提交 `ac20b209`，目标 `9c5e476`）结论 **REJECT**，**唯一决定性阻断**：`packages/demo-runtime` 新增直接 devDependency `zod` 与 pnpm-lock importer（仅为一个测试的 `import * as z from 'zod'`），与 R1-3/R1 禁区/本票 demo-runtime SPEC「零新增直接依赖」逐字冲突；其余完整门、388/388 E2E、UTF-8 20000 bytes、三门、闭集、pure_read、round4、golden 全部 mutation 均通过。五条架构裁定逐条落实：①「零新增直接依赖」同覆 dependencies 与 devDependencies，不改 SPEC/措辞；②不搬 fixture 到 Legal /testing、不给 Registry 新增 testing export、不新增 schema/API；③integration 真链与原 artifact `{summary}`、投影 `/summary`、deliver payload、事件与 prompt 断言保留；④复用 demo-runtime 已有直接依赖 `@courtwork/registry` 根导出的 `PromptSegmentSchema`（registry 提供真实 ZodType 身份）；⑤不触 provider、Turn journal、chat、pi、production generic/legal/pm、ADR-009 步骤闭集。

### 7.2 实现（代码提交 `37a34ce`）

- `packages/demo-runtime/src/acceptance/tool-request.integration.test.ts`：删 `import * as z from 'zod'`；`NOTE_SCHEMA = PromptSegmentSchema.extend({ summary: PromptSegmentSchema.shape.body }).pick({ summary: true })`（summary 字段与原 schema 同形）；bindings 去显式 `z.ZodType` 标注。三枚用例的 `/summary` 投影、`deliver {summary}`、`requestableToolIds`、真 executor/tools/materials、闭集外拒收、blocked 回喂与事件顺序断言**逐字未改**。
- `packages/demo-runtime/package.json`：devDependencies 恢复为仅有既有 `@types/node`；不新增替代依赖。
- `pnpm-lock.yaml`：只删 `packages/demo-runtime` importer 下 zod 的 specifier/version；全局 `zod@4.4.3` resolution 与其余 importer（core/legal/output/provider/reading-view/registry/tools 等）零漂移。
- `packages/demo-runtime/src/package-boundary.test.ts`：新增永久回归守卫（direct dependencies/devDependencies 不含 zod ＋ 源码无 direct import 两枚断言），只守本包直接依赖面，不扩为全仓依赖治理框架。

### 7.3 born-red 与 mutation 原始数字

- **born-red**（旧 `9c5e476` 状态实跑）：`package-boundary.test.ts` **2 failed / 6 passed**——manifest 含 zod（`expected [ '@courtwork/core', …(9) ] to not include 'zod'`）；源码命中 `/from\s+['"]zod['"]/`（`import * as z from 'zod'`）。
- 修复后：守卫＋integration 真链 **2 files / 11 passed**；`@courtwork/demo-runtime` 全包 **10 files / 43 passed**。
- 临时重加 direct zod（manifest 与源码 import 双形态）→ **2 failed / 6 passed** 再次变红，逐字恢复（`diff` 零残留）。

### 7.4 R2 提交链与状态

```text
37a34ce test/fix：去掉 zod 直接 devDependency，复用 registry PromptSegmentSchema（本节所记）
本提交   docs(spec)：R2 回执与精确既有提交链
```

状态：**R2 返修完成，待新的独立 Luna clean-clone 验收**。`current.md`/`implementation-readiness` 不动，只有独立 PASS 后由架构会话更新。

### 7.5 R2 全量门实测（tip `37a34ce`，无并发）

| 门 | 实测 |
|---|---|
| `pnpm install --frozen-lockfile` | EXIT 0，Lockfile is up to date |
| 守卫＋integration 定向 | **2 files / 11 passed** |
| `pnpm --filter @courtwork/demo-runtime test` | **10 files / 43 passed** |
| `pnpm -r build` | EXIT 0（15/16 workspace；仅既有 chunk 警告） |
| `pnpm lint` | EXIT 0 |
| `pnpm test` | **183 files / 2251 passed**（R1 2249 ＋ 守卫 2） |
| `pnpm --filter @courtwork/desktop test` | **100 files / 888 passed** |
| `pnpm site:guard` | EXIT 0（release-truth/deslop PASS；App 高水位 2218/2218） |
| product sidecar identity/repro | **547,893 B / `951acf8e…`** reproducible，第二次 `reused-identical`（零漂移） |
| headless sidecar identity/repro | 555,314 B / `061248fa…` reproducible，landedSha256 同值 |
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **259 passed / 0 failed / 1 ignored** |
| `COURTWORK_E2E_PORT=19641 pnpm --filter @courtwork/desktop test:e2e` | 完整静态前链＋Playwright **388 passed / 0 failed**（6.7m，独立新端口 19641，未复用共享 dev server） |
