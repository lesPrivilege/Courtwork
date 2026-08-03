# PI-HOST-LOOP-1R7 · 恢复分相与既有会话电池

状态：**待实现（第七轮返修）**

角色与纪律同原票与 1R…1R6。全部合同、九门、既有闭口与禁止面原样有效；1R6 的
encode-before-effect、装置退役与普适探针**全数保留**。本件新增结构性裁定一项（恢复
分相）、电池扩族一项、自陈与披露卫生一项。

拒绝证据：`PI-HOST-LOOP-1R6@57a19a5`（实现 tip `e3118a7`）经独立复验 `cd3810a`
**REJECT**。fresh start、prompt、cancel/shutdown 的先编码形状、bytes 复用、H2 退役/保留
边界与 142 电池构成全部成立；唯一决定性：`start_inner()` 在真实编码 exact bootstrap
之前调用会写盘的 `load_session()`。恢复既有会话时后者先截断 partial tail、补
`turn_usage_recorded`、执行 crash fold 并 durable append `session_interrupted`；验收以
codec-only future rule 反例实测 journal 558 B→790 B、spawn 0、writes 0——「任何 journal
append 前编码」「Err ⇒ journal 字节零增」「∀ 今日与未来 codec 规则」三项担保在
resume/recovery 路径不成立。

## 零、结构性裁定（对 R6 blocker 的回答）

1R6 把 wire 判据前置从「验证同步」升为「结构性成立」，但两相边界切在 `load_session()`
之后——病根不是又一道漏抄的门，而是**读取既有账本与修复既有账本混居同一函数**：读是
纯的，修是 durable effect。验收给出的两条出路（恢复分相／撤三项担保）裁定取前者；撤
担保会把「哪些写算恢复豁免」变成新的种群枚举题，正是 1R3…1R5 三层同败的病。

**裁定一 · 恢复分相。** `load_session` 拆两相：**读/计划相**——取单写者锁、读字节、
内存跳过 partial tail、解码校验、算出修复计划与投影，零 journal 内容写入；**durable
apply 相**——物理截断、usage 补写、crash-fold 全部追加。`start_inner` 内编码成功之前
只允许纯读与判定（既有入参门、读/计划相、resume 判定）；apply 修复、opening append 与
spawn 全部后置于编码成功，发送复用同一份 bytes（或重编码＋byte-equality，沿 1R6 取舍）。
编码或任一后续门失败 ⇒ 修复计划弃置，journal 内容字节零增；下次成功 start 重算同一
计划。幂等由 `leg_open` 闸门既证：apply 后折叠即置 false 不复触发，弃置则原状重现。

**零漂移已核（坐标于 target `57a19a5`）**：`fold()`（`pi_loop_journal.rs:2045-2115`）
纯函数；bootstrap 恢复态字段与 crash-fold 追加互不作用——`leg` 只由
`SessionStarted/SessionResumed` 分支写（:2059/:2064），`prior_observed_turns`/
`prior_turns` 只由 `TurnUsageRecorded` 写（:2080-2083），`SessionInterrupted.cost_coverage`
是既成事实重述（:2590 取 fold 前投影）；partial-tail 物理截断（:2174-2185）对解析不
必要——解码唯一输入是内存切片 `existing[..complete_len]`（:2186）。分相前后 bootstrap
逐值相同，故本裁定不改变任何成功路径的 wire bytes。

**担保边界（如实声明）**：三项担保不撤，观察面精确化——journal 内容字节、记录数、
修复应用、spawn、wire writes、requestId 占用。三件 inode 级动作获准先于编码：容器目录
`create_dir_all`（:2153）、`.lock` 创建（:1483-1490）、0 字节 journal 创建
（:1711-1717）——单写者锁先于一切读写是 R8 既有裁定。quarantine（:1737-1788）人口与
违规电池人口不相交：它只对结构损坏 journal 发生、动作是搬移不增内容字节，属账本自身
状态的诚实处置、与配置有效性正交，证据面沿既有 quarantine 测试，不入本不变量。
`reclaim_after_fault`（`pi_loop.rs:1071`，经 `load_session_holding`）是已运行会话的故障
收账，fold 即目的效果，不适用 encode-before-effect——分相 API 须允许调用方选择 apply
时机，不得为凑不变量扭曲故障收账。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r7`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd→a204d13→d4163df→5271342→
be0d9ad→3f0bc6f→a082257→9d4013e→e3118a7→57a19a5→cd3810a` 二十五枚；逐枚 patch-id
与源提交相同，冲突即停回架构。七轮拒绝报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### J1 · 恢复分相（Rust production）

- 拆相主体 `load_session_locked`（:2142-2307）。读/计划相产出修复计划**值**：truncation
  长度、usage 补写记录、crash-fold 追加记录**全集**——步骤 1–5 与
  `close_with_budget_unknown` 全部路径（append 点 :2468/:2476/:2492/:2500/:2514/
  :2546/:2555/:2595/:2613/:2626），不只步骤 5；投影以「既有完整记录＋计划记录」内存
  折叠得出。
- apply 相逐条落盘既定计划；「apply 后重折叠 == 计划投影」有测试自证（逐值）。
- `start_inner` 只在编码成功后 apply；任何 Err 出口（resume 漂移具名拒、closed 门、
  codec 拒）修复零应用。`reclaim_after_fault` 保持立即 apply，行为零变化
  （characterization 锁定）。
- 不改 wire/payload 闭集、不改 codec、不改 quarantine 语义与时机、不改 fresh 路径行为。

### J2 · 违规电池扩既有会话族

- `universal_start_case` 增 **recoverable existing-session 输入族**：至少 partial-tail、
  缺 usage 尾（补写候选）、open idle leg（R6 反例原形）、dangling effect（crash-fold
  步骤 3/4 形态）四类 journal 形状；拒绝触发至少含 resume 漂移具名拒与电池既有违规值
  各一（后者防未来把入参门后移到载入之后）。
- 断言升级：从「fresh 零字节」升为「journal 内容与 pre-start snapshot **逐字节不变**＋
  修复未应用（partial tail 原样在盘、无新增 interrupted/usage 记录）＋spawn 0＋
  writes 0＋records 0＋requestId 不占用」。
- R6 验收的 codec-only-future-rule-after-load 探针转为**登记 mutation 形态**（临时注入
  codec 规则的验收脚本步骤，构造法入回执），不作 in-tree 常驻。

### J3 · 自陈与披露卫生

- `pi_loop.rs:211-222` 注释块改写：「那是 spawn 之后的事」现在时断言随 1R6 H1 失实、
  「清单与源码扫描的双向自证」提法随 H2 退役——改为当前事实或显式历史陈述。
- 本轮回执订正 R6 回执 §三计数：`3,129` 行实为 3,128 行内容＋1 行尾空行格式空缺。
- 回执必须显式披露 resume/recovery 路径全部副作用时序；R6 偏离 5 只披露 fresh 路径，
  立为不完整披露的反面判例（判例正文入 workflow.md）。

## 三、first-red、mutation 与门

- **first-red**（untouched 尖 `cd3810a` 组合后）：① open idle leg journal＋resume 漂移
  具名拒——现行代码红（修复已应用、字节已增），分相后同输入转前置具名拒且逐字节不变
  （绿形对照入回执）；② J2 电池 recovery 行雏形红；③ partial-tail journal＋Err 出口——
  物理截断未发生（盘上 tail 原样）的断言先红后绿。
- **mutation ≥5**：apply 前移（物理截断或 crash-fold append 挪回编码前）→J2 行红；
  「apply 后重折叠 == 计划投影」断言撤除→自证红；电池删 recovery 族→覆盖自证红；
  resume 漂移拒后 apply 照跑→红；`reclaim_after_fault` 改为延迟 apply→characterization
  红。逐枚命中校验、定向红、byte-identical 恢复；等价如实登记。
- 原票九门全量非受限域取数；R6 turbofish permanent、G1 四门、encode-early、普适探针
  全保留不回退；生产前缀 SHA 必变如实报；sealed CJS 零漂移（Node 零触碰）；E2 卫生
  条款继续：计数摘实跑原始行、真源在 exact target 树内。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新会话从独立 clean
worktree 复验（自建 snapshot、recovery 反例自行实注、分相边界以自造 journal 形状独立
探测）。未获 PASS 前不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`。

## 五、冻结后裁定（2026-08-03 回执受理，架构）

1. 回执 §八.9-1 追认为正解：计划折叠至终态（`session_failed`／budget_unknown 族）的
   会话经 closed 门拒绝且零 apply，终态 fold 不经 start 路径落盘。依据：journal 唯一
   真源是原始记录，fold 是确定性投影；用户可见错误面与分相前实现同源（同为
   SessionClosed），resume／未来 GUI／workspace 派生一律以折叠读取，无第二真源。后续
   GUI 票不得据此新增「补写终态」旁路；如未来确需物化终态，另立票改契约，不在本线顺手做。
2. 回执 §八.9-2 追认：apply 中途失败留部分修复，与旧 crash-fold 部分 append 同类且
   self-healing（截断幂等、补写与 fold 追加各自消除自身重算条件），非新增失效模式。
3. 换靶两处准：「撤除断言→红」按语义改「注入使断言为假的等价靶」——撤除断言只会空绿，
   属原票措辞病，特此订正；recovery 形状按票面「步骤 3/4 形态」括注扩为五类
   （`activePromptBudget` 入列）。
4. 本节只受理回执登记，不改变任何实现要求；验收按票面＋本节合并读取。closed 门拒绝的
   零 apply 语义须与「盘上已 durable 关闭的会话拒绝面」对照验证（两态同一错误面）。

## 六、实现回执（2026-08-03，待独立验收）

坐标：票面冻结于 `main@497a288`；worktree `/private/tmp/courtwork-pi-host-loop-1r7`、branch
`codex/pi-host-loop-1r7`。基线顺取二十五枚，逐枚 stable **patch-id 等同 25/25**（复核脚本对
`497a288..86f1c17` 与票面链逐位比对）；链尾 untouched 尖 `86f1c17` ≡ `cd3810a`，七轮拒绝报告随
链入树，`ACCEPTANCE.md` 零触碰。实现提交 **`f915eea`**，恰两文件
（`pi_loop.rs` +453/−14、`pi_loop_journal.rs` +326/−74）。

## 一、first-red 账（全部落在 untouched 尖 `86f1c17` 上，逐枚还原）

J2 的 recovery 族先按最终形态写进树，直接对 untouched production 跑——这就是 first-red 本身。
另以一枚临时探针（跑后逐字节还原，还原后 `pi_loop.rs` SHA-256
`793b2eb2ef16bf602cdd652768f723693e6b1e03f75199ded7ddb900441fb17b` 与写入前相同）取全表读数：

| 形状 | 触发 | journal 字节 | durable 记录 | spawn | writes | 实得 |
|---|---|---:|---:|---:|---:|---|
| partialTail | resume 漂移 | 601 → **796** | 1 → 2 | 0 | 0 | `ResumeRefused("grant 漂移")` |
| partialTail | modelId 含 NUL | 601 → 601 | 1 → 1 | 0 | 0 | `InvalidConfig` |
| missingUsageTail | resume 漂移 | 1,119 → **1,699** | 3 → 5 | 0 | 0 | `ResumeRefused` |
| missingUsageTail | modelId 含 NUL | 1,119 → 1,119 | 3 → 3 | 0 | 0 | `InvalidConfig` |
| openIdleLeg | resume 漂移 | 564 → **796** | 1 → 2 | 0 | 0 | `ResumeRefused` |
| openIdleLeg | modelId 含 NUL | 564 → 564 | 1 → 1 | 0 | 0 | `InvalidConfig` |
| activePromptBudget | resume 漂移 | 755 → **1,394** | 2 → 4 | 0 | 0 | `SessionClosed` |
| activePromptBudget | modelId 含 NUL | 755 → 755 | 2 → 2 | 0 | 0 | `InvalidConfig` |
| danglingEffect | resume 漂移 | 1,211 → **2,107** | 3 → 6 | 0 | 0 | `SessionClosed` |
| danglingEffect | modelId 含 NUL | 1,211 → 1,211 | 3 → 3 | 0 | 0 | `InvalidConfig` |

对应票面三枚：**①** open idle leg ＋ resume 漂移具名拒——untouched 上 564 → 796 B（crash fold
的 `session_interrupted` 已落账），常驻断言当场红：

```text
recovery.partialTail/resume 漂移具名拒（载入之后）：被拒的一轮改写了既有 journal
（601 B → 796 B，实得 ResumeRefused("grant 漂移")）
```

**②** J2 电池 recovery 行雏形红——即上表五枚 resume 漂移行。**③** partial-tail ＋ Err 出口——
untouched 上 601 → 796 B 里，那 37 字节半行已被物理截掉（`assert_repair_not_applied` 的
`ends_with(PARTIAL_TAIL)` 一支）。

**绿形对照**（票面要求随附）：分相后同一批输入全部转前置具名拒且逐字节不变（§六读数）；
而同一份 open idle leg journal 在**不漂移**的配置下 start 成功时，恢复计划照常 apply——
常驻测试 `recovery_seeds_all_carry_a_repair_and_a_successful_start_applies_it` 锁定盘上次序恰为
`session_started → session_interrupted → session_resumed`，且既有字节只被追加、未被改写。
「拒绝时零字节」不是靠不做修复换来的。

## 二、J1 delta（production）

### 2.1 `pi_loop_journal.rs`

- `Journal` 拆三段：`stage`（`&self` 纯构造，`eventId ↔ seq` 的唯一真源）、`claim`（只前移内存
  计数）、`write_staged`（注入门 ＋ encode ＋ write ＋ `sync_all`）。`append` = stage → write →
  claim，**写盘失败时计数一枚不前移**，与旧行为逐字相同；新增 `plan_append` = stage → claim。
- 新增 `RecoveryPlan { truncate_to, appends, repaired_turn_usage }` 与 `PlannedSession`。
  计划的 `appends` 是**完整 `JournalRecord` 值**（含 `eventId`/`seq`/`leg`/`recordedAt`），不是
  payload 清单——步骤 2/3/4 里「后一枚引用前一枚 `promptEventId`」的交叉引用因此天然成立。
- `load_session_locked` → `plan_session_locked`：物理截断改算 `truncate_to`；usage 补写与
  `crash_fold` → `plan_crash_fold` / `plan_close_with_budget_unknown` 全部改走 `plan_append`
  （**十个 append 点一个不漏**：`:2468/:2476/:2492/:2500/:2514/:2546/:2555/:2595/:2613/:2626`
  的旧坐标全部转 plan）。两枚计划函数自此无 I/O 失败面，签名由 `Result<Vec<_>>` 降为 `Vec<_>`。
- `PlannedSession::apply` 按「先截断、后逐枚 append + sync」次序兑现计划。
- `load_session` / `load_session_holding` = `plan_session_locked(..)?.apply()`——**签名与语义
  零变化**，`reclaim_after_fault` 走的仍是它，立即 apply。新增 `plan_session` 供 `start_inner`。
- quarantine 的人口、语义与时机零改动；wire/payload 闭集、codec、fresh 路径行为零改动。

### 2.2 `pi_loop.rs`

`start_inner` 步骤 4 由 `load_session` 换成 `plan_session`，`projection` 取自计划相；
`planned.apply()` 挪到步骤 6、**紧随 5.5 编码成功之后**、`opening` append 与 spawn 之前。
判定顺序与文本一字未动：入参门 → route → caseRoot → credential → 读/计划相 → closed 门 →
resume 八道漂移门 → 编码 → apply → opening append → cwd → spawn → bootstrap → ready。

## 三、J2 电池扩族

`violation_battery()` **142 → 152 行**，字段 **10 → 15**（新增 `recovery.partialTail` /
`recovery.missingUsageTail` / `recovery.openIdleLeg` / `recovery.activePromptBudget` /
`recovery.danglingEffect`）。五类形状 × 两类触发：`ResumeDrift` 的拒绝点在载入**之后**（本轮
裁定要挡的那一类）、`ConfigViolation`（`modelId` 含 NUL，沿用电池既有违规值）的拒绝点在载入
**之前**（防未来把入参门后移到载入之后）。

票面点名四类形状全覆盖；`dangling effect` 归 crash fold 步骤 2，票面括注的「步骤 3/4 形态」
另立 `activePromptBudget` 一类（active prompt ＋ `maxUsd` 已启用 → `prompt_failed` ＋
`session_failed` 两枚，含 `promptEventId` 交叉引用），两种读法都落地。

断言升级（`universal_recovery_start_case`）：spawn 0 ＋ writes 0 ＋ **journal 与 pre-start
snapshot 逐字节不变** ＋ 全树 footprint 零增 ＋ durable 记录数不增 ＋ `fold().request_ids`
不变（requestId 不占用）＋ **修复未应用**（逐形状特征痕迹：partial tail 仍原样在盘、
`turn_usage_recorded` / `session_interrupted` / `prompt_failed` / `effect_uncertain` 计数为 0）
＋ 零回显。「修复未应用」不靠字节断言活着——放宽字节断言它仍单独判红。

塌缩守卫加两道：`recovery_rows >= 8`、`recovery_fields.len() >= 4`（承「静默零＝空枚举与全通过
同形」）。对照组 `recovery_seeds_all_carry_a_repair_and_a_successful_start_applies_it` 逐形状
证明种子**确有**修复可做（直接走恒 apply 的 `load_session`，修复痕迹必须出现且落盘）。

`#[test]` 计数：`pi_loop.rs` 35 → 37、`pi_loop_journal.rs` 21 → 22；`cargo test` 164 → 167。

## 四、J3 自陈与披露卫生

- `pi_loop.rs:209` 注释块改写：「encoder 在 spawn 之后」改为显式历史陈述（「**历史上**那是
  spawn 之后的事」），并补当前事实——1R6 起编码先于 append/spawn、1R7 起 `load_session` 的
  durable 修复也退到编码之后，encoder 的同名检查因此是「同一批判据的第二遍」而非「最后一道」；
  「清单与源码扫描的双向自证」改述为已按 1R6 H2 退役，今日自证＝`bounded_input_manifest` 行为
  反例 ＋ 违规电池普适不变量。
- **订正 R6 回执 §三计数**（票面点名）。R6 回执称保留面 `3,129` 行（1145–4113 共 2,969 ＋
  4114–4273 共 160）「逐字节保留」。本会话独立复核：pristine `28d81b2` 的 4114–4272（159 行
  内容）在 target `d70c1b5` 中逐字节出现，但其后紧跟的是 `\n}\n`（`mod tests` 收尾），而
  pristine 该段之后是一枚**空行**再接被删块。故实为 **3,128 行内容 ＋ 1 行尾空行格式空缺**，
  行为零影响。验收该项事实成立。

## 五、mutation 账（七枚；逐枚命中校验、定向红、byte-identical 恢复）

全部对**已提交的实现源**（`pi_loop.rs` SHA-256 `6889bc39…065372`、`pi_loop_journal.rs`
`ac962535…95ac5`、`pi_loop_protocol.rs` `f9b47ddc…1473de`）重跑一遍；每枚跑前以
`assert count(anchor)==1` 校验命中，跑后 `cp` 还原并逐文件复核 SHA 相同。

| # | 变异 | 靶 | 读数 |
|---|---|---|---|
| M1 | `planned.apply()` 挪回 `plan_session` 之后、closed 门与编码之前 | 电池 recovery 族 | 红：`601 B → 796 B`，`ResumeRefused("grant 漂移")` |
| M2 | 物理截断挪回读/计划相 | J1 计划断言 ＋ 电池 partialTail | 双红：「半行必须被算进截断计划」；`601 B → 564 B` |
| M3 | `apply` 落盘时重新 `stage`（不兑现计划） | J1 断言 ③ | 红：盘上 seq 6/7 ≠ 计划 seq 4/5 |
| M4 | 电池删 recovery 族（`RECOVERY_SHAPES.take(0)`） | 塌缩守卫 | 红：「recovery 族只剩 0 行」 |
| M5 | grant 漂移拒**之前**先 `apply` | 电池 recovery 族 | 红：`601 B → 796 B` |
| M6 | `reclaim_after_fault` 路不落盘（延迟 apply 的等价靶） | characterization | 红：「故障收账必须当场落盘（564 B → 564 B）」 |
| M7 | **codec-only future wire rule**（R6 验收探针转登记形态，见下） | — | 成对对照，见下 |

**M4 首跑无效并如实登记**：`for shape in RECOVERY_SHAPES {` 在加了对照组之后不再唯一，
第一次注入被命中校验挡下（`count==2`）而未落地，那一跑的「绿」是补丁没生效、不是覆盖缺口
（承在案判例「0 红可能是补丁没生效」）。改用「注释行 ＋ for 行」双行唯一锚点后命中并定向红。

### M7 · codec-only future wire rule（票面 J2 第三条：转登记 mutation 形态，不作 in-tree 常驻）

**构造法**（两步，均为临时注入、跑后逐字节还原）：

1. 只在 `pi_loop_protocol.rs` 的 bootstrap **decoder** 内、`provider.modelId` 的 trim 判据之后
   插入一条 Host 从未手抄的 wire 规则：
   ```rust
   if model_id.contains('/') {
       return reject(ProtocolErrorCode::InvalidSchema, "provider.modelId 不得含 '/'（临时注入的 future wire rule）");
   }
   ```
   `encode_packet_line` 末尾会以同一份 decoder 复验 body，故该规则自动成为编码判据。Host 侧
   一道门不加不减；`modelId` 含 `/` 在既有前置门是**放行**值（电池 `provider.modelId/含路径
   分隔符` 一行即此事实）。
2. 临时探针：造一份 leg-open 的可恢复 journal，historic `modelId` 与二次 config 同为
   `deepseek/v4`（journal schema 本来允许，故八道 resume 漂移门全过），驱动完整 `start`。

**成对对照**（唯一变量＝`apply` 相对编码的位置）：

```text
分相后（本轮实现）  FUTURE-CODEC: journal_bytes_before=558 after=558 spawn=0 writes=0 error_code=Some("invalid_config")
对照臂（apply 前移） FUTURE-CODEC: journal_bytes_before=558 after=790 spawn=0 writes=0 error_code=Some("invalid_config")
```

对照臂逐字复现 1R6 复验的 **558 B → 790 B**；实验臂 **558 B → 558 B**。还原后
`pi_loop.rs` / `pi_loop_protocol.rs` / `pi_loop_journal.rs` 三枚 SHA 与注入前相同，
`git status --short` 零行。

## 六、G3 同义复扫（行为归属；沿 1R6 偏离 9 的口径）

152 枚电池逐行记录实际拒绝 code。既有 142 行的归属由本会话**自行实测**（临时给
`universal_start_case` / `universal_prompt_case` 加一行 code 输出，跑后逐字节还原、SHA 复核
`6889bc39…065372` 相同），实得与 1R6 逐值持平：104 枚全落 `pi_loop.rs` 前置面——`invalid_ref`
64（containerId 16 / sessionId 16 / grantId 16 / prompt.requestId 16）、`invalid_config`
23（caseRoot 5 / modelId 4 / apiKey 4 / maxTurns 3 / maxUsd 7）、`case_root` 13、
`invalid_prompt` 4；codec / journal / process 三模块各 0。新增 10 枚 recovery 行：

```text
recovery.partialTail/resume 漂移具名拒（载入之后）：拒于 resume_refused（601 B 原样）
recovery.partialTail/modelId 含 NUL（载入之前）：拒于 invalid_config（601 B 原样）
recovery.missingUsageTail/resume 漂移具名拒（载入之后）：拒于 resume_refused（1119 B 原样）
recovery.missingUsageTail/modelId 含 NUL（载入之前）：拒于 invalid_config（1119 B 原样）
recovery.openIdleLeg/resume 漂移具名拒（载入之后）：拒于 resume_refused（564 B 原样）
recovery.openIdleLeg/modelId 含 NUL（载入之前）：拒于 invalid_config（564 B 原样）
recovery.activePromptBudget/resume 漂移具名拒（载入之后）：拒于 session_closed（755 B 原样）
recovery.activePromptBudget/modelId 含 NUL（载入之前）：拒于 invalid_config（755 B 原样）
recovery.danglingEffect/resume 漂移具名拒（载入之后）：拒于 session_closed（1211 B 原样）
recovery.danglingEffect/modelId 含 NUL（载入之前）：拒于 invalid_config（1211 B 原样）
```

合计 **拒 114 / 放行 38**，10 枚新行 100% 被拒且逐行零副作用。

## 七、九门（非受限域、逐门独立 exit、串行；退出码先落文件再读）

九门在**源码定稿之后整套重跑**（承判例「门跑过之后又编辑就必须重跑」）；重跑后源码零编辑，
`pi_loop.rs` blob SHA-256 `6889bc39a5d3baac774cbe08d5ddc35ea3528913bb7ef8f4168c103eae065372`、
`pi_loop_journal.rs` `ac96253538fb5111077e1ae4edc67f1814044518c7d81c6f658515282f595ac5`。
（此后只跑过 mutation 与 M7 注入，逐枚还原且 SHA 复核相同，`cargo test` 收尾复绿 167/0/1。）

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | 14 files / 448 tests | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | 10/10；bundle **523,235 B** / sha256 `75eff9b9…65399b`，两次现编 byte-identical | 0 |
| 1c | `node --test scripts/assert-isolation-binding.test.mjs` | 43/43 | 0 |
| 1d | `pnpm --filter @courtwork/pi-lane test:verified-node-gate` | 8/8 | 0 |
| 2a | `cargo test` | **167 passed / 0 failed / 1 ignored**（＝基线 164 ＋ 新增 3） | 0 |
| 2b | `cargo test --lib -- --ignored` | 1 passed（快照 E2E，15.51 s） | 0 |
| 2c | `rustfmt --check` 四模块（逐模块独立跑） | 四枚全零命中 | 0 / 0 / 0 / 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | **7 处，全落 `src/lib.rs`**（5 枚 unnecessary unsafe ＋ 2 枚 unneeded return）；本票四模块零命中 | 101（既有基线，同 1R4／1R5／1R6） |
| 3 | verified Node ＋ production sealed CJS | 10 PASS | 0 |
| 4 | verified Node ＋ scripted control CJS | 14 PASS | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | 166 files / 1,771 tests | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 等级 `none`；扫 10 份宿主源码、30 份 pi lane 源码 | 0 |
| 9 | `git diff --check` | 零命中 | 0 |

**生产前缀 SHA（如实报新值）**：`pi_loop.rs` 生产段（`#[cfg(test)]\nmod tests` 之前）由
55,787 B / `c6cc789a…c82ea` 变为 **57,356 B / `a243cba06c1a18150147acfec586100c15cb345c07176e21d63f430d95293040`**；
`pi_loop_journal.rs` 由 97,992 B / `cb923183…72ef4` 变为
**104,299 B / `52ce44519d2b535a5b95499994af16b75cd40a39b320644da832d4b5bf0ac119`**。本轮触碰两枚
Rust production，SHA 必变。（parent 的 `pi_loop.rs` 前缀独立重算为 55,787 B / `c6cc789a…`，
与 1R6 回执及其独立复验一致。）

**sealed CJS 零漂移**：523,235 B / `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`，
与 1R4／1R5／1R6 独立复验自建快照逐字节相同（Node 侧零触碰）。

**「只收紧」按行为担保衡量**：1R6 全部装置一枚不退——encode-before-effect、bytes 复用、两枚
codec 映射函数、turbofish permanent、G1 四道 NUL 门、D1 清单 11 行 / 34 枚行为反例、SafeToken
七成员清账、四轴 `prompt_axis_probe`、142 枚电池全部原位保留，142 枚只增不减地扩到 152。
全仓门读数与 1R6 持平（1a 448、7 1,771、8 `none`），2a 由 164 增至 167。

## 八、偏离登记

1. **`Journal::append` 由「先查注入门再构造」改为「先构造再查注入门」**。`stage` 会先读一次
   时钟。计数前移时机、失败时不前移计数、返回值与落盘字节全部逐字未变；`now_millis()` 是纯读。
2. **计划记录的 `recordedAt` 取自计划相的时钟读数，而非落盘时刻**。这是「计划即将落盘的那一份
   字节」所必需——否则「apply 后重折叠 == 计划投影」在 `last_recorded_at` 上必然不成立。两次
   读数相差微秒级；`now_millis()` 的 `max(last_recorded_at)` 单调钳制原样保留，`opening` append
   的时钟仍在 apply 之后读，故 journal 次序非递减不变。计划被弃置时这些时间戳一个字节都没落盘。
3. **`crash_fold` / `close_with_budget_unknown` 更名为 `plan_crash_fold` /
   `plan_close_with_budget_unknown`，返回类型由 `Result<Vec<_>, JournalError>` 降为 `Vec<_>`**。
   票面授权拆相但未逐字授权改名与改签名；改名是为让「只计划不落盘」在调用点自明，降签名是因为
   计划相已无 I/O 失败面（保留 `Result` 会留下一条永不为 `Err` 的死路）。五步次序、判定与逐值
   payload 一字未动。
4. **新增 `plan_session` 一枚 `pub(crate)` 入口，`load_session` / `load_session_holding` 保留**。
   票面写「`load_session` 拆两相」，未规定入口数。取「旧入口语义零变化 ＋ 新增只做计划的入口」，
   `reclaim_after_fault` 因此**零改动**即满足「保持立即 apply」，characterization 由新增常驻测试
   锁定，而不是靠改调用点去凑。
5. **票面 mutation「『apply 后重折叠 == 计划投影』断言撤除→自证红」按等价靶实施**。撤除一条
   断言只会让测试变**绿**，不构成红证。改注入「`apply` 不兑现计划」（落盘时重新 `stage`）作为
   打中同一条断言的等价靶（M3），实得定向红。如实登记，不冒充票面原形。
6. **`activePromptBudget` 一类为票面括注「crash-fold 步骤 3/4 形态」而增**（票面正文点名的
   `dangling effect` 归步骤 2）。两种读法都落地，故形状是五类而非四类，电池 10 行而非 8 行。
7. **`universal_recovery_start_case` 里加一行 `eprintln!` 输出实际拒绝 code**。§六的行为归属
   读数由它自测自出，不靠回执手抄（承 1R6 偏离 9 的口径）。
8. **`assert_journal_bytes_unchanged` 未改口径**（新出现文件须为零字节）。recovery 族另加一条
   更严的「具名 journal 文件逐字节相等」，两层并存；旧口径不放宽也不收紧，142 枚既有行读数
   因此与 1R6 逐值持平。

### 8.9 resume/recovery 路径的副作用时序（票面 J3 要求的显式披露）

1R6 偏离 5 只披露 fresh 路径的零字节 journal/lock，未披露既有 session 上的截断/补写/crash fold
——票面已将其立为**不完整披露的反面判例**（判例正文见 `workflow.md`「读修分相判例」）。本轮
逐条列出 `start_inner` 在**编码成功之前**可能发生的全部副作用，含 inode 级：

| 动作 | 坐标 | 性质 | 是否算入「Err ⇒ 字节零增」 |
|---|---|---|---|
| 容器目录 `create_dir_all` | `pi_loop_journal.rs` 读/计划相 | inode 级，零内容字节 | 否（票面 §零明文获准） |
| `.lock` 文件创建 ＋ `flock` | 同上 | inode 级，零内容字节；单写者锁先于一切读写是 R8 既有裁定 | 否（同上） |
| 0 字节 journal 创建（`open_append` 的 `create(true)`） | 同上 | inode 级，零内容字节 | 否（同上） |
| journal 整份 quarantine（rename） | `quarantine_session` | 搬移，不增内容字节；只对**结构损坏** journal 发生 | 否（票面 §零裁定人口不相交；证据面沿既有 quarantine 测试） |
| 物理截断 partial tail | 已后移至 `PlannedSession::apply` | durable | **是**——本轮之前发生在编码前 |
| `turn_usage_recorded` 补写 | 同上 | durable | **是**——同上 |
| 五步 crash fold 全部追加 | 同上 | durable | **是**——同上 |
| `session_started` / `session_resumed` | 编码之后 | durable | 是（1R6 起即在编码之后） |

实测（分相后，`ConfigViolation` 触发即在读/计划相之前拒，`ResumeDrift` 触发在读/计划相之后
拒）：两类触发的 journal 内容字节与 pre-start snapshot **逐字节相同**，footprint 新增项只有
零字节的 `.lock`（fresh 时另有零字节 journal）。

**两项如实声明的后果**：

- **永久关闭态的 crash fold 在 start 路径上不再落盘。** `danglingEffect` /
  `activePromptBudget` 两类的计划会把 session 关成 `session_failed`，于是 closed 门先于一切
  拒绝，计划随之弃置——盘上因此**保留** dangling/active 原状，而不是 1R6 那样被 durable 关闭。
  这是票面「任何 Err 出口（含 **closed 门**）修复零应用」的直接后果，非实现自选。该 session
  已不可再起，`reclaim_after_fault` 与今后以修复为目的的路径仍会立即 apply。
- **`apply` 本身可能中途失败。** 截断成功而某枚 append 失败时，盘上是「已截断 ＋ 部分追加」。
  这与旧实现中 crash fold 第二枚 append 失败时的形态同类（append-only ＋ 每枚 `sync_all`，
  下次载入按同一规则重算），非本轮新增失效模式。

## 九、`[需架构拍板]`

无新增。1R6 §九挂的 `implementation-readiness.md` WRITE-HOST 偿债形态已由架构于 `5642c65`
改写，本轮不再重挂。

## 十、停点

停在待独立验收：实现提交 `f915eea` 与本回执提交在 `codex/pi-host-loop-1r7`，**未 push、未合入**；
`ACCEPTANCE.md`、`docs/status/current.md` 与 readiness 零触碰；`PI-WRITE-HOST-1` 未开工，
GUI/DMG/Pages 未启动。请全新会话从独立 clean worktree 复验：自建 snapshot、自行实注 recovery
反例与 codec-only future rule、以自造 journal 形状独立探测分相边界。
