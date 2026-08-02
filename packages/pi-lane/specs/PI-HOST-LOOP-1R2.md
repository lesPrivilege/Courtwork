# PI-HOST-LOOP-1R2 · 复验拒绝的四项闭口

状态：**待 Fable 实现（第二轮返修）**

角色与纪律同 `PI-HOST-LOOP-1.md`（原票）与 `PI-HOST-LOOP-1R.md`（1R）：Fable 实现、
Sonnet 只读跑腿、完成后交全新 Codex 会话独立验收。原票与 1R 的全部合同条款、文件白名单、
九门、十一项闭口与禁止面**原样有效**；本件只新增四项闭口，不回退任何既有门，不改
wire/payload 闭集本身——四项全部是把既有契约语义收紧到实现里。

拒绝证据：`PI-HOST-LOOP-1R@fa9e2f8`（实现 tip `6f3a337`）经独立复验 `427f4fa`
**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1R 独立复验
（2026-08-01，拒绝）」节）。1R 十一枚常驻、R1–R8、正向 Route A controls 与 443 枚 Node
测试全绿，不抵消四类独立扩边反例；四类均命中 production 方法，非验收可代修的小缺陷。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r2`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa` 九枚；
逐枚 patch-id 与源提交相同，冲突即停回架构。两枚拒绝报告（`314117d`、`427f4fa`）随链
入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、四项闭口

### C1 · `aborted` 终态必走 canceled（Node）

1R §二 N2 原文：「上游 `stopReason:'error'` 收 `failed/provider_error`，`'aborted'` 走
canceled 路径；一切非 `'stop'|'toolUse'` 不得 completed」。复验红证：faux provider 真实发
`stopReason:'aborted'`，terminal 实得 `{status:'failed',error:{code:'unknown'}}`——
`product-runtime.ts` 的 `completionFor()` 只特判 `error`，default 一律 `failed/unknown`。

收紧：`completionFor()` 改为对 `StopReason` 闭集**全枚举映射**——`stop|toolUse`→
completed（现行）、`error`→`failed/provider_error`（现行）、`aborted`→canceled（reason
按宿主发起方既有语义）、其余/未知→`failed/unknown` 仅作显式兜底分支并有注释指明闭集
来源。常驻 N2 扩表钉住 `aborted` 分支与「非 stop|toolUse 零 completed」的全枚举断言。

**2026-08-02 C1 裁定（实现实测后补拍）**：两道白名单障碍经红证坐实——canceled 在
runtime↔状态机接缝（`PromptCompletion` 闭集）不可表达；且任何 `product-runtime.ts`
production 改动都使 sealed CJS 身份漂移，而该身份被三处白名单外文件钉死。裁**甲路**：

- `product-stdio.ts` 的 `PromptCompletion` 闭集扩 `{kind:'canceled'}`——进程内接缝
  闭集扩项，wire `Terminal` 本已含 canceled，**wire 闭集零变化**。状态机消费：
  `cancelRequested` 已置则维持既有 reason 语义不回退；未置而收 canceled 完成时以
  `reason:'host'` 收。语义依据：pi 的 `aborted` 只能由宿主侧 AbortController 触发，
  provider 结构上无法产生，故宿主归因恒真。cancel 闩锁、budget_stopped 与既有终态
  优先级全部不回退。
- 白名单随裁扩四件：`packages/pi-lane/src/product-stdio.ts`、`product-stdio.test.ts`
  （只增 canceled 分支与消费断言，旧判据零删除）、
  `apps/desktop/src-tauri/pi-sidecar/route-manifest.json` 与
  `apps/desktop/src-tauri/src/pi_loop_process.rs`（后两件**仅限** sealed CJS 身份三处
  钉死值随批订正：manifest `bundle.bytes/sha256`、编译期真值表、变异靶字面量）。
- 身份订正仪式（承 1R Stage-2「门先于自查」裁定）：production bundle 两次构建
  byte-identical 后，三处钉死值与 tracked manifest 在**同一提交**内同步；跨侧门
  （`product-main.test.ts`）与 Rust 编译期门在新身份上复绿为证。
- **乙路（`aborted`→`failed/provider_error`）明确拒绝**：把非错误标成 provider 失败
  违反终态诚实，其 retryable 语义还诱导重试已被中止的运行。

### C2 · bootstrap 上界闭集前置于 journal/spawn（Rust）

ADR-022 冻结 `maxTurns` 整数 `1..12`、`maxUsd` 为 `null` 或 `0 < n <= 100000`、`modelId`
trim 后 ≤256 UTF-8 bytes；1R 又明定一切 bootstrap/config 非法值在 journal/spawn 前以具名
错误拒绝。复验红证：`validate_start_config()` 只查下界与非空，`maxTurns=13` 实得
`Protocol(InvalidSchema)`（错误拖到后置 packet encoder）且 **spawn 已发生一次**；
`maxUsd=100001`、257-byte `modelId` 走同一漏检路径。

收紧：`validate_start_config()` 补齐三项上界，与既有下界构成闭集，一切非法值在
journal/spawn 前以 `invalid_config` 具名拒绝。常驻 R2 表扩 `maxTurns=13`、
`maxUsd=100001`、257-byte `modelId` 三行，每行**双断言**：具名 `invalid_config` 外观＋
零 spawn 副作用（承复验示范：外观与副作用分别钉）。

### C3 · journal 载入拒绝不可能的 turn 历史（Rust）

原票/ADR 要求 observed upstream turn 从 1 开始跨 prompt/leg 严格递增；已 LF 完整但次序
不可能或非尾端半对的 journal 必须整份 quarantine。复验红证：孤儿 usage（无对应
`turn_finished` 的 `turn_usage_recorded`）与倒序 ordinal（`2→1`）两份完整 LF 历史均被
`load_session` 接受为 `LoadedJournal`——`validate_records()` 只取 `max(turn)`，
`plan_turn_usage_repair()` 只从 `turn_finished` 单向找 usage。

收紧：`validate_records()` 要求 observed turn 自 1 起、跨 prompt/leg 逐枚 `+1` 连续
（等值、倒退、跳号均 quarantine），`turn_usage_recorded` 与同 request/turn 的
`turn_finished` 逐枚配对；孤儿 usage 除「唯一尾端半对补写窗」外一律 quarantine——
`plan_turn_usage_repair()` 双向闭合。复验两枚反例原形转 permanent 首红。

### C4 · verified-node gate 的 runtime 身份闭口（Node 门装置）

1R「三·补」把 `verified-node-gate.mjs` 纳入 tracked 实现，目的即门 3/4 在可复核冻结
Node 身份上运行。复验红证三类：arm64 runtime 尾字节 XOR（同尺寸、SHA 已漂移）gate 仍
10/10 exit 0——resolver 对 runtime 只比 bytes 不比 SHA；runtime 换 symlink 仍通过——
`requireFile()` 用跟随 symlink 的 `statSync()`；manifest 的
`routeId/nodeVersion/useCodeCache/resourceRelativePath` 删改仍通过。

收紧：runtime 逐架构 **bytes+SHA** 双核（与 sealed CJS 同待遇）；`requireFile()` 改
`lstatSync` 拒 symlink/非 regular；manifest closed-decode 并逐值核
`schemaVersion/routeId/nodeVersion/useCodeCache/bundle/targets` 全部冻结值后才放行。
三类注入转 permanent 反例（注入-断红-byte-identical 还原留档）。随批订正同源漂移：
`build-product-sidecar.mjs` 回执文案 `pi-sidecar/sidecar.cjs` →
`pi-loop-resources/sidecar.cjs`（与 tracked manifest、Tauri mapping、Rust 冻结值同源）。

## 三、first-red、mutation 与门

- **first-red**：四类复验反例在 untouched 链尖（`427f4fa` 组合后、未改 production）以
  production-used 路径先红；禁 stub、module-load failure 或与被判对象同源的判据冒充。
- **mutation**：≥4 枚有效 production mutation，每闭口至少一枚——撤 `aborted` 分支、撤
  任一上界、撤 turn 连续/孤儿拒、撤 runtime SHA 或 lstat——逐枚验证命中、定向红、
  byte-identical 恢复；结构性等价如实登记不计红证。
- **门**：原票九门全量非受限域取数，逐门独立退出码；1R 十一项常驻、R1–R8 与全部既有
  反例保持绿；只收紧不回退（旧判据名删除数为 0 的机器自证随回执）。

## 四、回执与停点

实现提交先于回执提交；本文件实现完成后只追加回执，不改前述合同。停在待独立验收：由
全新 Codex 会话从独立 clean worktree 复验（自建 snapshot、不消费实现者 ignored 产物、
四类反例与 mutation 自行实注）。未获 PASS 前不 push、不 merge、不更新 `current.md`、
不开 `PI-WRITE-HOST-1`、不启动 GUI/DMG/Pages。
