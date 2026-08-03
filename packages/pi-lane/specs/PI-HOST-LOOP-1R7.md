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
