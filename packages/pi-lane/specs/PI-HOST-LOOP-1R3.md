# PI-HOST-LOOP-1R3 · 按族闭口与覆盖自证

状态：**待 Fable 实现（第三轮返修）**

角色与纪律同原票 `PI-HOST-LOOP-1.md`、`PI-HOST-LOOP-1R.md`、`PI-HOST-LOOP-1R2.md`：
Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立验收。三件的全部合同条款、文件
白名单、九门、十一项＋四项闭口与禁止面**原样有效**；本件只新增闭口，不回退任何既有门。

拒绝证据：`PI-HOST-LOOP-1R2@1ab9c03`（实现 tip `b4175ea`）经独立复验 `23f8339`
**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1R2 独立复验
（2026-08-02，拒绝）」节）。1R2 四枚原形已全部转常驻绿，六项登记偏离逐项获追认；两枚
blocker 均落在**同一批判据的未点名同族成员**上。

## 零、本轮方法订正（架构自陈）

前两轮返修按验收报告点名的实例逐条闭口，于是每轮都由下一位验收者找到同族的另一个实例：

- C2 补了 `maxTurns/maxUsd/modelId` 三项上界——因为那是 1R 报告点的三项；而 ADR-022
  同批冻结的 `caseRoot ≤4096`、`apiKey ≤8192` 从未有人管，1R2 复验一试即中。
- C4 冻了 `routeId/nodeVersion/useCodeCache/targets`——因为那是 1R 报告点的字段；而
  `bundle.bytes/sha256` 被显式注释成「构建产出不冻结」，于是 resolver 拿被判 manifest
  的自报值当期望，正中在案判例「被测物不得给自己出考卷」（2026-07-20，源
  FILE-PREVIEW-1）。

**结论：验收报告点名的是样本，不是清单。** 本轮起，闭口的完成态是「该判据辖下的闭集
被穷举覆盖，且覆盖本身有机器自证」，不是「报告里那几项已修」。D1/D2 按族收紧，D3 对本票
冻结面做一次穷举清账，把「下一轮再找到一个兄弟」这条路堵死。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r3`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339` 十二枚；逐枚 patch-id 与源提交相同，冲突即停回架构。三枚拒绝
报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### D1 · 有界输入闭集全部前置于 journal/spawn/effect（Rust）

复验红证：`apiKey = 'k'×8193` 实得 `spawns=1, journal_exists=true` 后才由 packet encoder
报 `Protocol(InvalidSchema)`；4097-byte `caseRoot` 的 `validate_start_config()` 返回
`Ok(())`，最终以 `CaseRoot("案件根不可 lstat")` 收——**拿文件系统外观代替配置门**。

收紧（族级）：凡进入 host→sidecar 方向、且在 `pi_loop_protocol` 有冻结上界或非空要求的
输入，一律在 **journal append 与 spawn 之前**以具名 `invalid_config`（既有 code 闭集内）
拒绝，零副作用；encoder 的同名检查降为纵深防御的**最后一道**，不得是第一道。已知闭集
（值一律 import 常量，禁另抄）：

| 输入 | 冻结判据 | 现状 |
|---|---|---|
| `maxTurns` | `1..=MAX_TURNS_LIMIT` | 1R2 已前置 |
| `maxUsd` | `null` 或 `(0, MAX_USD_LIMIT]` 有限数 | 1R2 已前置 |
| `modelId` | 非空且原串 `≤MAX_MODEL_ID_BYTES` | 1R2 已前置 |
| `caseRoot` | 非空且 `≤MAX_CASE_ROOT_BYTES`，**长度门先于 lstat** | **缺** |
| `apiKey` | credential 解析后、journal/spawn 前，非空且 `≤MAX_API_KEY_BYTES` | **缺** |
| `containerId`/`sessionId`/`grantId` | SafeToken 语法与既有上界 | 实现须自证前置或补门 |
| prompt `text` | `≤MAX_TEXT_BYTES`，须先于 durable `user_prompted` 与发包 | 实现须自证前置或补门 |

**覆盖自证（机器，双向）**：一枚常驻测试持**手写冻结清单**（输入名 → 常量名 → 具名
拒绝 code），并双向核对——① 清单每项都有 pre-journal/pre-spawn 红例，每例双轴断言
（具名外观＋`spawns=0 && journal_absent`）；② 以源码扫描（体例可参照既有
isolation-binding scanner）证明 encoder 的 host→sidecar 分支所消费的每一枚有界常量都
出现在清单内——**在 encoder 新增一道上界而不补前置项即红**。期望侧必须是手写字面量，
不得从被测结构或 encoder 派生（承「被测物不得给自己出考卷」）。

### D2 · gate 判据的 expected side 一律独立于被判物（Node 门装置）

复验红证：合成 layout 里把 sealed CJS 换成 29-byte 实物、同时把该 layout manifest 的
`bundle.bytes/sha256` 同步改成新值，production resolver **exit 0，FALSE_GREEN**。成因是
`FROZEN_ROUTE.bundle` 只含 `resourceRelativePath`（`:60-66`），`assertManifestFrozen()`
只比 path（`:147-163`），resolver 再把实物与**同一份被判 manifest** 比（`:230-235`）。

收紧（族级）：

1. **唯一 expected side 是 tracked manifest**——按 repo 路径读取
   `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`，与 Rust `include_bytes!`
   同源锚（§二.4 已冻结「不得从 runtime/CJS 实物重算一份 manifest 后把自报值当
   expected」，本条把该规则补到 Node 门）。
2. **layout 内 manifest 只是被判物**——若被测 layout 携带 manifest，须先与 tracked
   bytes **byte-identical** 才允许 closed-decode（镜像 Rust 侧「resource 必须先与编译
   bytes 逐字节相同」的次序），不得作为期望来源。
3. **实物逐值比对锚回 tracked**——sealed CJS 与两枚 runtime 的 bytes+SHA 一律与 tracked
   manifest 的对应值比；`FROZEN_ROUTE` 继续冻不随构建变的字段。`:145` 那条
   「`bundle.bytes/sha256` 不冻结故不比」的注释按本裁定改写。
4. **覆盖自证**：gate 比较的每一类值（bundle／runtime×2／manifest 字段）各有一枚
   **同步漂移**反例（实物与 layout manifest 同改）必红；另有一枚清单核对，逐条指名每个
   expected 值的独立锚点（tracked manifest 或 `FROZEN_ROUTE` 常量），出现第三类来源
   （从被判物自取）即红。

### D3 · 冻结面穷举清账（本票范围内一次性）

对本票冻结面做一次穷举清点并把结果写入回执，不留「下一轮再发现一个兄弟」的空间：

1. **有界输入清账**：`pi_loop_protocol` 全部 `MAX_*` 常量逐枚登记——消费点、方向
   （host→sidecar／sidecar→host／journal／内部）、是否属 D1 前置闭集；不属者写明
   理由（如只辖入站解码、或本票不生成该 payload）。
2. **expected-side 清账**：本票全部判据（Rust preflight／编译期真值表／Node gate／
   跨侧门／builder 冻结表）逐条登记其期望来源，标明是「独立锚点」还是「与被判物同源」；
   同源者当场补门或显式登记为不适用并说明理由。
3. 清账表随回执交付；**不得以「已跑门全绿」代替清点**，也不得静默截断（承「no silent
   caps」：若某项本轮不处理，须显式登记原因，不得省略行）。

## 三、first-red、mutation 与门

- **first-red**：两枚复验反例在 untouched 链尖（`23f8339` 组合后、未改 production）以
  production-used 路径先红；D1 的清单自证与 D2 的同步漂移各自另有先红。
- **mutation**：每闭口 ≥2 枚有效 production mutation，其中 D1 须含「encoder 加新上界而
  不补清单」一枚、D2 须含「expected 改回从被判 manifest 自取」一枚；逐枚验证命中、
  定向红、byte-identical 恢复；结构性等价如实登记不计红证（承 1R2 M3 判例：冗余判据的
  变异必等价，零红是覆盖缺口信号而非实现多余）。
- **门**：原票九门全量非受限域取数，逐门独立退出码；十一项＋四项常驻、R1–R8 与全部既有
  反例保持绿；只收紧不回退（旧判据名删除数为 0 的机器自证随回执）。sealed CJS 身份若因
  production 改动漂移，按 1R Stage-2 仪式在同一提交内同步三处钉死值并复绿留证。

## 四、回执与停点

实现提交先于回执提交；本文件实现完成后只追加回执，不改前述合同。停在待独立验收：由全新
Codex 会话从独立 clean worktree 复验（自建 snapshot、不消费实现者 ignored 产物、两类
blocker 原形与 D3 清账表逐项自行核）。未获 PASS 前不 push、不 merge、不更新 `current.md`、
不开 `PI-WRITE-HOST-1`、不启动 GUI/DMG/Pages。
