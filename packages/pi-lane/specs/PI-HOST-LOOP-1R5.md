# PI-HOST-LOOP-1R5 · NUL 前置裁定与 fail-closed 扫描

状态：**待 Fable 实现（第五轮返修）**

角色与纪律同原票与 1R…1R4：Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立
验收。五件的全部合同、白名单、九门、既有闭口与禁止面**原样有效**；本件只新增闭口，不回退
任何既有门。

拒绝证据：`PI-HOST-LOOP-1R4@d4163df`（实现 tip `a204d13`）经独立复验
`5271342`（措辞澄清 `be0d9ad`）**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`
「PI-HOST-LOOP-1R4 独立复验（2026-08-02，拒绝）」节）。requestId 门、七成员清账、
M1–M4、E2 订正与八项偏离全部成立；唯一决定性 blocker：**扫描轴仍由语法白名单定义**
（三枚硬编码函数名＋`MAX_*`＋`.trim()` 特判），协议里已存在的 wire-string NUL 门
（`pi_loop_protocol.rs::scan_string()` 的 `unit == 0`，具名 `InvalidSchema`）不在轴上；
`modelId`/`apiKey` 含 NUL 先 durable `session_started` 并 spawn、prompt `text` 含 NUL 先
durable `user_prompted` 并占用 requestId，encoder 回灌 decoder 才拒。验收另以一枚未登记
`contains('/')` 门证明 allowlist 机制本身 false-green。

## 零、两项裁定（对验收 `[需架构拍板]` 的回答）

**裁定一：NUL 归 D1 `Fronted`。** 三轴理由：① 副作用——NUL 值毒化 durable journal
（落下永远发不出去的 `session_started`/`user_prompted`）、浪费 spawn、占用 requestId，
正是历轮在杀的「先污染后拒绝」形；② 语义——config/prompt 存在的唯一目的是被发送，
不可编码＝无效输入，不存在「合法配置碰上编码事故」这回事；③ 家族——wire 冻结判据
（ADR-022 六-B.1「不得含 NUL 或 lone surrogate」）作用在同一批 host 方向输入上，与
上界/非空/形状同族。**lone surrogate 在 Rust `String` 侧结构性不可达**（String 保证
Unicode scalar 序列），以具名理由行入账，不是静默略过。

**裁定二：扫描器 fail-closed 化，名字清单永久出局。** 常量名单（1R3）与函数名单（1R4）
两轮同败，病根同一：白名单对 unknown 的处置是**跳过**。终局形态是反置：枚举前置函数族的
**全部拒绝分支**，不认识的判据表达式**判红而非跳过**；任何排除只能是票面或清账表的
具名理由行，实现代码里的过滤器/白名单不再是合法排除载体。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r5`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd→a204d13→d4163df→5271342→be0d9ad`
十九枚；逐枚 patch-id 与源提交相同，冲突即停回架构。五轮拒绝报告随链入树后
`ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### G1 · NUL-free 前置（Rust production）

`modelId`/`apiKey`/prompt `text`/`caseRoot` 四枚自由串输入的 NUL-free 判据前置——
分别落 `validate_start_config()`/`validate_api_key()`/`prompt()` 前置块，先于任何
journal append 与 spawn，具名沿**既有 code 闭集**（config 侧 `invalid_config`、prompt 侧
沿该行既有 code），不新增 code；`scan_string()` 的 wire 检查降为最后防线。SafeToken 四员
由文法排除 NUL（具名理由行，不另设门）。复验三行副作用表转 permanent 首红：断言
journal 字节零增、内存 records 零增、spawn 零、requestId 不占用。

### G2 · 扫描器 fail-closed 化（测试装置）

1. 正向：枚举 host 前置函数族（`validate_start_config`/`validate_api_key`/`prompt` 前置
   块）生产段的**全部拒绝分支判据表达式**，逐条要求 ledger 有行；**不认识的表达式＝红**，
   不是跳过。验收的 `contains('/')` 结构反例转 permanent mutation 形态（加未登记门→红）。
2. 对照面：`pi_loop_protocol` 具名 wire 判据（`scan_string` 的 NUL/lone-surrogate、长度、
   非空、SafeToken、shape…）逐枚入 ledger——`Fronted`（有前置门）或具名理由 `Other`
   （如「lone surrogate：Rust String 结构性不可达」「JSON 深度：结构约束非输入值判据」）；
   协议模块新增具名判据函数不入账即红。
3. 排除载体收口：扫描器内不得存在跳过型过滤器；清账表理由行是唯一排除位置。

### G3 · 新轴全面复扫

新扫描器装上后对四模块 host 方向面复扫一遍，凡浮出的既有成员一律本轮入账（Fronted 补门
或具名理由行），**不留给下一轮**；复扫结果（浮出几枚、各如何处置）入回执。

## 三、first-red、mutation 与门

- **first-red**：复验三枚 NUL 副作用实录（untouched 尖上逐值复现 spawn/journal 增量表）；
  旧扫描下 `contains('/')` 未登记门全绿实录；新扫描器装上后 NUL 判据缺行即红。
- **mutation ≥4**：撤任一 NUL 前置门（行为反例＋ledger 锚点双红）；扫描器退回白名单式
  （unknown→skip）必红；协议模块加具名判据不入账→红；前置函数加未登记门→红。逐枚命中
  校验、定向红、byte-identical 恢复；等价如实登记。
- **门**：原票九门全量非受限域取数，逐门独立退出码；全部既有常驻保持绿；只收紧不回退。
  本轮触碰 Rust production——生产前缀 SHA 必变，如实报新值；sealed CJS 不应漂移（Node
  零触碰），若漂移即停手。fmt/clippy 沿基线口径。
- **E2 卫生条款继续**：回执计数摘实跑原始行；引用真源全在 exact target 树内。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、三枚 NUL 反例与未登记门 mutation 自行实注、对照面清账逐行
核）。未获 PASS 前不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`、
不启动 GUI/DMG/Pages。
