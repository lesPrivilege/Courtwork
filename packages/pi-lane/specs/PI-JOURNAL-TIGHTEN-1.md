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

---

## 实现回执（2026-08-11 实现会话，分支 `claude/pi-journal-tighten-1`）

基线 `main@31533d3`。四段全部落地，禁区零触碰：wire schema 零改、journal 十九型闭集零变化、
limits 漂移门未动、④甲支未实现、`App.tsx` 未触（高水位门读数 2245，与上限同值未升）。
新增概念数：零——段④ 的 `piSessionClosedCopy` 是既有文案表的取法收敛，不是新状态或新持久化格式。

### 一 · 四段红证

| 段 | 红测（测名） | 红形 | 撤修复复红 |
|---|---|---|---|
| ① | `effect_family_rejects_empty_logical_path_in_all_three_types` | 三型 `logicalPath:""` 编码后回读**全部收下**（`expect_err` 落空，dump 出 `logical_path: ""` 的三枚 payload） | 三处**逐一**单点回退 `read_logical_path`→`read_string`，各自只让对应型转红且报对型名（`tool_proposed` / `effect_started` / `effect_succeeded`），三轮还原后复绿——闭口按族的区分力逐点坐实 |
| ① | `empty_logical_path_quarantines_the_whole_journal_on_reload` | 落过空 `logicalPath` 的档**载入成功**（`expect_err` 落空，dump 出四枚记录的完整 `LoadedJournal`） | 同上三轮；修复后得 `Quarantined{reason:"已 LF 结束的记录不合 schema"}` |
| ② | `fold_advances_observed_turn_cursor_on_turn_finished_not_usage` | 尾端半对（`turn_finished(2)` 已 durable、usage 未落）时 `left: 1 / right: 2` | 回退 fold 侧递推为 usage `.max()` → 复红同形 |
| ② | `fold_observed_turn_cursor_equals_turn_finished_count_on_every_prefix` | 前缀 3 处 `left: 0 / right: 1` | 同上；该枚即票面要的变异守卫，任何偏移或错事件推进必在某枚前缀偏离 |
| ② | `validate_records_compares_resume_prior_turns_with_the_same_cursor_as_fold` | **现行为绿**（两侧同为 `.max()`，如实登记零区分力，见「三」） | 单改任一侧均红：仅回退 fold → `StructureProblem("session_resumed 的 prior 三值必须逐值等于前序 fold")`；仅回退 `validate_records` → 同一枚同一理由。两向皆红即「两处必须同批」的区分力 |
| ③ | `cost_accumulation_overflow_degrades_to_unknown_instead_of_infinity` | `prior_usd` 得 `left: Some(inf) / right: None` | 回退 fold 侧 `is_finite` → 复红同形 |
| ③ | `overflowed_cost_never_reaches_the_durable_ledger_through_crash_fold` | crash fold 落账后 journal 实含 `"budget":{"turns":2,"usd":inf,…}`（`format_js_number(inf)` 出的是非 JSON 的裸 `inf`） | 同上；这是 `inf` 真正够得着耐久账本的那条路 |
| ③ | `validate_records_degrades_overflowed_cost_the_same_way_as_fold` | 对照断言 `left: Some(inf) / right: None` | 仅回退 `validate_records` 侧 → `StructureProblem("session_resumed 的 prior 三值必须逐值等于前序 fold")` |
| ③ | `overflowed_cost_history_refuses_resume_instead_of_writing_infinity`（`pi_loop.rs`） | 见「二」——现行得归因错的 `InvalidConfig`，不是 `ResumeRefused` | 回退 fold 侧 `is_finite` → 复红同形 |
| ④ | `maxUsd 开启而某回合费用未知：终态成因具名到 budget_unknown，文案与真达上限分流` | `sessionTerminal.detail` 恒为 `'prompt'`（差 `"detail": "budget_unknown"`）；`piSessionClosedCopy is not a function` | 摘掉 `pi-projection.ts` 里 prompt 成因码的取出 → 复红同形 |
| ④ | `真达上限仍走 budgetStopped；其余关闭走通用句——三档互不相等` | 同上（选择函数不存在） | 同上 |

### 二 · resume 语义变化一处的实测证据

`overflowed_cost_history_refuses_resume_instead_of_writing_infinity`（`pi_loop.rs`）：种一份
`maxUsd = Some(1000)`、两枚 `costUsd = f64::MAX`（各自都是 wire 合法值，该字段无上界）、以
`session_interrupted` 收束的既有档，随后 `start`。

- 修复后：`Err(ResumeRefused("maxUsd 已启用而历史费用未知"))`，`spawns == 0`，journal 前后逐字节相同。
- 撤修复（仅回退 fold 侧 `is_finite`）：**不是** `ResumeRefused`，而是
  `Err(InvalidConfig("配置无法编成 bootstrap packet"))`。

**票面订正（如实登记）**：段③ 所记「`session_resumed` priorUsd 把 `inf` 写进耐久账本」在这一条
路上**不成立**——bootstrap 出包的 wire 编码是 encode-before-effect 的第一道关，`inf` 在落账之前
就被它挡下，代价是用户拿到一个归因错的 `invalid_config`（说的是「配置」，实际是「历史费用溢出」），
仍属静默/错归因降级，方向仍触不变量四。`inf` 真正够得着耐久账本的是段③ 并列的另一条：crash fold
的 `prompt_budget_stopped{budget.usd}` 直取 fold 累计值，中间没有 wire 编码这道关——已由
`overflowed_cost_never_reaches_the_durable_ledger_through_crash_fold` 逐字节坐实
（撤修复即写出 `"usd":inf`）。两条路的根都在累加处，本票的修复同时收口两条。

### 三 · 零区分力如实登记

段② 的 `validate_records` 侧改动对**任何可载入的既有档**零行为区分力：`turn_finished` 必须
逐枚 +1、`turn_usage_recorded` 必须紧接同 turn 的 `turn_finished`、中部缺 usage 的档一律
quarantine——三条约束合取之下，`observed_turns`（usage `.max()`）与 `last_observed_turn`
在任何过得了门的档上逐值相同。故本项是**结构性收敛**（同步消灭优于同步验证），不是行为修复；
它的区分力只在「单改一处」时出现，已由上表两向单侧变异坐实。票面 §二「单改一处 resume 的
prior 三值比对当场红」成立，但成立方式是**跨 fold/validate 的耦合**，不是 `validate_records`
自身在现行档上会红——不得据票面措辞宣称后者。

### 四 · 偏离清单

1. **Rust/TS 侧 `TERMINAL_MESSAGES.budget_unknown` 措辞未改**（仍为「已启用金额限额，但存在费用
   未知的回合」）。理由：它已是具名文案、与新增 UI 文案同义不冲突，且是**耐久 payload 内容**、
   由双端 golden `fixtures/write-session-journal-v1.jsonl` 逐字节钉住 Rust 与 TS 两侧；改它属
   journal codec 面 churn，超出段④「文案面」所需，也与「对任何真实既有档逐值不变」的红线取向相悖。
   段④ 的「分流」落在**用户看得见的那一面**（`pi-copy.ts` 的 `budgetUnknown`）。若架构认为 wire
   message 也须换词，另立微票同批改 Rust／TS／golden 三处。
2. **段④ 触及 `pi-projection.ts`**（票面只列 `pi-copy.ts` 为段④ 坐标）。理由：`budget_unknown`
   的成因码住在 `prompt_failed.error.code`，`session_failed.cause` 只指名 `promptEventId`；不把它
   取出来，文案就没有可分流的判据。改动限于既有 `detail` 字段的取值来源，未新增视图字段。
3. **`StructureProblem` 加 `#[derive(Debug)]`**——测面 `expect()` 需要；无行为影响。
4. **`MAX_LOGICAL_PATH_BYTES` 的 import 从模块顶移入 `mod tests`**——段① 之后生产解码不再直引它，
   顶层保留即 `unused_imports` 告警。`cargo build` 现零 unused 告警。
5. **Playwright 完整链未跑**（票面明许，排程律让位在途 App 票）。`test:e2e` 里 Playwright **之前**的
   37 枚静态门 ＋ 4 枚门自身用例已逐枚实跑，全绿（含 `lint:voice`、`rp27`、`assert-app-highwater`、
   `assert-test-count` 下限 386）。

### 五 · sidecar 身份钉值

`product-stdio.ts` 只加注释（段④ 严格模式容忍留痕）。**清 `dist/product-sidecar` 后全量重建**：

```
bundle.bytes  = 547893      （前后同值）
bundle.sha256 = 951acf8ed3b541988041cd4b1ed80402c02c643d7d95f4cbce0b25a3ff74bc6c   （前后同值）
reproducible  = true
```

esbuild 剥注释，故身份**未迁移**，仓内在册钉值无须更新。headless sidecar 同批重建
（`555314 B / 061248fa…a9bea`），只为满足 `pi_loop.rs` 两枚 headless 用例的前置。

### 六 · 门数

| 门 | 读数 |
|---|---|
| `cargo test`（src-tauri 全量） | **259 passed / 0 failed / 1 ignored**（基线 257，+2 为段①②③ 新增；`cargo build` 零 unused 告警） |
| `pnpm --filter @courtwork/pi-lane test` | **565 / 565**（与基线同值，本票未改 pi-lane 行为面） |
| `pnpm -r build` | **EXIT 0**（首轮红：`tsc -b` 判 `sessionTerminal` 可选性，已收窄后复绿） |
| `pnpm lint` | **EXIT 0** |
| root `pnpm test` | **2171 / 2171**（与基线同值） |
| `pnpm --filter @courtwork/desktop test` | **849 / 849**（基线 847，+2 为段④ 新增） |
| desktop 静态门（Playwright 之前全部） | **37 枚 ＋ 4 枚门自身用例，RED=0**；PW 下限门读数 386 |
| Playwright 完整链 | **未跑**（票面明许，见偏离④.5） |

### 七 · 环境红（与树上红分开登记）

`apps/desktop/src/composition/matter-first-frame.dom.test.ts` 间歇 30s 超时（3 枚 `it.each` 用例
中的 1 枚，非固定同一枚）。**独立零因果裁定**：在**基线 `31533d3` 分离头**上单跑同一文件三轮得
`3绿 / 3绿 / 1红`，在本分支上单跑三轮得 `1红 / 1红 / 3绿`——同文件、同超时形态、同量级发生率，
与本票改动无因果。另有 `work/work-runtime.test.ts` 一枚 5s 超时只在与 `cargo test` 并发同刻出现，
单跑不复现，属负载竞争。两者均不进本票结论。
