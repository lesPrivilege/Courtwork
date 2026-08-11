# PI-JOURNAL-TIGHTEN-1 · journal 值域收窄、游标归一与预算终态文案同源

状态：票面冻结（2026-08-11 架构会话），待实现。实现与验收须为不同会话；验收由 Codex 独立会话执行。

权威：本票是四项 [需架构拍板] 结转项（`PI-LANE-UI-1` SPEC 结转登记）的架构裁定落地件。裁定依据为 2026-08-11 深读报告（现读 `main@98bba73`），结转措辞三处订正随本票生效（见「五」）。约束红线：**wire schema 零改、journal 十九型闭集零变化、对任何真实既有档逐值不变、不触 resume 语义**；新增概念数为零。

---

## 一 · 段① `logicalPath` 值域收窄（结转项①，裁定：契约订正＋最小修复）

契约订正：`logicalPath` 在 journal 与 wire **同为非空**，单一判据非两份规则副本（同步消灭优于同步验证）。

最小修复：`pi_loop_journal.rs` 三处解码（`tool_proposed`/`effect_started`/`effect_succeeded`）由 `read_string` 换共用 `read_logical_path`（放开 `pi_loop_protocol.rs` 该函数可见性即可，零新函数）。

红测（先证红，三型**同批**立例——闭口按族，单点修复即重犯 `PI-HOST-JOURNAL-1R` 判例）：手工构造 `logicalPath:""` 的三型记录各一例，断言整份 quarantine 携具名 reason；撤修复三枚全绿。

随批留痕：本项是**值域收窄**，与裁定A（payload 闭集扩员、旧档续 valid）方向相反但不冲突——裁定A 不得被误读为「读侧一律只许放宽」。深读另证：空串现行在 Rust 全程过境无感、在 UI（`pi-projection.ts` 提案判空返回 undefined 处）静默丢弃整枚提案，触不变量四；修复后该形态由 quarantine 显式承接，UI 侧无需另改。

拒既有档风险：实际为零——写侧唯一来源已过 wire 非空判据，能被拒的档必是被改过的档，恰为 quarantine 设计目标。

## 二 · 段② 游标归一（结转项②，裁定：收敛单一来源）

现况订正：**三变量两口径**（非结转所记两变量）——`validate_records` 流内 `last_observed_turn`（TurnFinished 严格 +1 递推）、同函数 `observed_turns`（TurnUsageRecorded `.max()`）、`SessionProjection.prior_observed_turns`（fold `.max()`）。等价性现由三条外部约束合取涌现（双笔紧邻落账、usage.turn 配对校验、双向补写闭合），非结构保证。

修复：fold 与 `validate_records` 两处 `.max()` 改为在 `TurnFinished` 上以 `turn_finished_follows` 递推；`TurnUsageRecorded` 只保留配对校验不再推进游标。**两处必须同批改**，单改一处 resume 的 prior 三值比对当场红。

红测：尾端只有 `turn_finished(N)` 而 usage 未落时 `fold(...).prior_observed_turns == N`（现行给 N-1，先红后绿）；补一枚变异守卫（递推改回 `.max()` 或 `+2`）证区分力。

不拒既有档：凡过 `validate_records` 的档新旧口径逐值相同；`session_resumed` prior 三值比对不受影响。

## 三 · 段③ 费用累加溢出降级（结转项③主修，裁定：fold 面 is_finite 降级）

现况订正：**裸 `inf` 非「Disabled 臂」专属**——`Disabled`/`Open`/`Reached` 三臂全部带出，仅 `Unknown` 臂被 `None` 挡。最短真实路径：无上界的合法大额 `costUsd` 若干枚→累加 `+inf`→crash fold 或 `session_resumed` priorUsd 把 `inf` 写进耐久账本→下次 load 解码失败→整份 quarantine→UI 整段会话塌 decodeFailure。真实 DeepSeek 计费量级下不可达，属耐久面鲁棒性缺口。

修复：fold 与 `validate_records` 两处累加后 `!usd_total.is_finite()` 即 `cost_known = false`——现成的「费用未知」通道承接，`max_usd` 开启时自动落既有 `budget_unknown` fail-closed 链，关闭时 `usd` 出 `null` 非 `inf`。**两处同批**。

红测：两枚 `costUsd: 1e308` 的 `turn_usage_recorded`→断言 `prior_usd == None`（现行 `Some(inf)`）；撤修复则 `encode_record` 出含 `inf` 的行且回读 quarantine（双向红证）。

resume 语义变化一处，架构明示接受：溢出档在 `max_usd = Some` 时命中「历史费用未知」→ `ResumeRefused`——以显式拒绝换不可解释的 `inf`，方向合不变量四。

留痕两条（不立票）：wire `costUsd` 上界维持历票「属 wire 判据面随另票」，但**上界非充分挡法**（12×任意上界仍可溢出），溢出根治在本段；`encode_record` 改 `Result`（写侧自解码自检）改动面显著大于所需，只留痕作 journal codec 大改候选，当前由上游判据覆盖。

## 四 · 段④ 预算终态文案同源（结转项④，裁定：丙＋——严格模式容忍留痕＋文案修复＋前瞻条款）

深读定谳：结转句的靶打偏——`PromptBudgetStopped` 无条件关 session **不是缺陷**（精确镜像 live 路径，且 Rust 以自身 fold 逐值复核 sidecar 自报预算，伪 budget_stopped 结构不可达；真限额达成即恒为真，关闭是 fail-closed 正确保守行为）。真缺陷面在旁：**maxUsd 开启时单回合 `costUsd:null` 使 `usd` 永久置 null→`budget_unknown`→`retryable:false`→session 永久关闭且 resume 拒绝**——瞬时 provider 行为换来不可逆惩罚，且 UI 文案失真（用户看到「已达本段上限」，实际是「有一回合没拿到计费数据」）。

裁定：

- **maxUsd 语义维持严格模式，显式容忍留痕**：容忍条款——maxUsd 开启即严格模式，任一回合费用不可核算即终止本段；该代价须在**开启 maxUsd 的时点**向用户讲明（设置面文案），非事后。
- **文案同源修复随本票**：`budget_unknown` 成因获得具名文案（「本段有一回合未取得计费数据，费用已不可核算，本段结束」类，最终措辞过 voice 门），与 `budgetStopped`（真达上限）分流；`pi-copy.ts` 与 Rust 侧对应文案族同批。禁形：`budget_unknown` 不得再复用「已达本段上限」。
- **前瞻条款**：真 key 总验（`PI-BASE-HEADLESS-ACCEPT`/`PI-BASE-GUI-ACCEPT`）实测出现 usage 缺失回合，即升级甲支——`budget_unknown` 改关 prompt 不关 session、下一 prompt 前留人确认、确认动作落 journal（闭集扩员循裁定A：扩员、旧档续 valid、读侧闭集非通配）。届时另立票，本票不实现甲支。
- 三支共同红线：不得放宽 limits 漂移门以「调高上限续跑」（耐久预算真值不可改写，不变量六）。

红测：构造 maxUsd 开启＋某回合 `costUsd:null` 的序列，断言终态文案走 `budget_unknown` 具名族而非 `budgetStopped` 族（现行同源即红）。

## 五 · 结转措辞订正（随本票生效，供后票引用）

1. ③非「Disabled 臂」专属——三臂全带出，仅 Unknown 挡。
2. ②是三变量两口径，非两变量。
3. ④的实体是 `budget_unknown` 抖动关段（`resolveTerminal` 第二档＋`plan_close_with_budget_unknown`），非 `PromptBudgetStopped` 分支。

## 六 · TDD、门与禁区

- 每段 born-red 双向红证；段①三型同批、段②③各两处同批（闭口按族）。
- 完工门：`cargo test`（src-tauri）、pi-lane 包级、`pnpm -r build`、`pnpm lint`、root 全量；desktop 文案面过既有 voice/静态门。Playwright 完整链**不在本票实现会话跑**（排程律，全仓同刻至多一条，让位在途 App 票），由验收会话按届时实况补跑或以等价链覆盖并留痕。
- sidecar 涉 TS 面（`product-stdio.ts`/`pi-copy.ts`）改动后须显式 clean 重建制品并核身份钉值（改 TS 后 cargo 前 clean 重建判例）。
- 禁区：wire schema 零改、journal 十九型闭集零变化、不触 `fold` 推进臂之外的状态机语义、不动 limits 漂移门、不实现④甲支、不触 App.tsx。
