# TOOL-READ-1 · Work 场景回合的受控只读工具请求通道

状态：票面冻结（2026-08-11 架构会话），待实现。**派单前置：`GENERIC-SCENARIOS-1` 清账释放 App 槽**（本票触 `App.tsx`＝视 trace 呈现落点而定，按互斥模型排队）。实现与验收须为不同会话；验收由 Codex 独立会话执行。

权威：ADR-011 修订二（2026-07-20，`request_tool` 扩集条款——扩集四条件、红证要求、四知文本 golden 同步；契约真源在彼，本票不复述）；ADR-009 决定二（步骤闭集不扩）；ADR-016 决定二（地址闭集机制）；ADR-017 决定八（reading 走既有工具契约，不套三段式）；就绪图 `TOOL-READ-1` 行为素材。

---

## 一 · 票面范围与架构裁定

**通道**（循 ADR-011 修订二逐条）：场景线 model 步回合可经结构化输出携带 `request_tool` 意图——本 turn 终结，系统解析意图，落既有 `deterministic_tool` 步执行（`sideEffect` 门强制 `pure_read`），结果回喂下一 turn。**回合内不循环**：不给 `runTurn` 加多请求流，provider 层零 tools 字段（其类型注释的显式判断维持）；`request_tool` 是 turn 间模式，与 interaction/confirmation 同族。

**裁定一 · toolResult 居所＝Work EventLog 账本条目族，Turn journal 两族闭集不扩**。Turn journal（`PersistedTurn | InteractionEvent`）不新增第三条目族；工具请求、执行与结果按既有 `deterministic_tool` 账本形状（executor 现行 `deps.ledger` 链）落 Work 侧 `SessionEvent` 账本，补「模型请求发起」的来源标记；结果内容经 `assembleScenarioRequest` 语料段缝以折叠文本喂下一 turn。既有账本 schema 扩员按 additive-default 键不升版先例办（`LEGAL-ANCHOR-BINDING-1` 裁定在案）；超出 additive 形态即停手 `[需架构拍板]`。

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
- 新增概念登记（复杂度节制）：预期两枚——`requestableToolIds` 声明键（为何非加不可：ADR-011 修订二条件 1 的静态声明面）与轮次上界判据；多于两枚须逐枚说明。
- 完工门：`pnpm -r build`、`pnpm lint`、root、desktop `--filter`、cargo（应零涉、跑通即证）、Playwright 完整链（届时按排程律与锁规程）、`site:guard`；floor 只升。
- 禁区：不触 pi lane；不改 provider `GenerationRequest`/流归一（零 tools 字段）；不扩 Turn journal 条目族；不触 chat 自由回合（chat 面工具化属 ADR-016 决定四空位，另票）；不动 legal/pm 场景声明。

## 四 · 待实现侦察项（开工首日完成，回执登记）

现行 `SessionEvent`/ledger 工具条目精确形状与 JSON Schema 落点；`assembleScenarioRequest` 语料段回喂的具体拼装位（含 token 预算影响）；trace 组件族落点是否可避开 `App.tsx`。三项侦察结论写入本 SPEC 回执后再动手，形状超出裁定一 additive 边界即停手上报。
