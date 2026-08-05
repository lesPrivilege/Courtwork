# `PI-DUALROOT-CONTRACT-1` 实现回执

票面真值：`docs/architecture/implementation-readiness.md` 的 `PI-DUALROOT-CONTRACT-1` 行。
口径拍板：ADR-022 六-C（2026-08-05 修订）＋ 修订记录同日条。分支 `claude/pi-dualroot-contract-1`。

---

## 一 · 缺陷与改法

**缺陷原形（票面实证）**：同一个裸相对字符串在两根之间**两义**。

| 面 | 无前缀输入的落根 | 出处 |
|---|---|---|
| 写面 | `/workspace` | `workspace-write-env.ts` 的 `resolveWorkspaceLogicalPath`：不以 `/` 起头即 `relative = input` |
| 读面 | `/case` | `dual-root-env.ts` 的 `route()` 落 `roots[0]` fallback，而 `roots[0]` 恰是 `/case` |

两根还都**照收**——没有任何一层拒绝，故模型照 system prompt 第④条「写后回读确认」复用同一
路径，写进 `/workspace`、读回 `/case`，两次都「成功」。四件工具的 description 与 `path` 参数
说明当时仍是单根口径，模型没有任何可读到的规则能分辨这件事。

**已裁口径（不再二选一）**：四件工具的裸相对路径一律落 `/workspace`，`/case` 强制显式前缀。

**两处收口**：

1. **默认根具名**。`DualRootEnvOptions` 新增 `defaultLogicalRoot`（必填），`route()` 的
   fallback 改由它决定；认不出在册根即当场拒绝装配。唯一生产装配点 `product-runtime.ts`
   写死 `WORKSPACE_LOGICAL_ROOT`。`roots` 次序自此**只**决定 glob/grep 不给起点时的检索次序，
   与寻址语义脱钩——「换个次序就悄悄换了寻址语义」这条路结构性消失。
2. **口径进工具契约**。新增单枚常量 `DUAL_ROOT_ADDRESSING_NOTE`（住 `workspace-write-env.ts`，
   与默认根 `WORKSPACE_LOGICAL_ROOT` 同模块，改根名与改文案同屏），逐件挂到 `read`／`glob`／
   `grep`／`write` 的 description；glob/grep 的 `path` 参数说明同批改双根口径。
   工具契约是模型唯一能读到的寻址规则，prompt 不能替它。

**本单新增了什么概念**：恰一个——「具名默认根」。它不是新抽象，是把原来住在数组下标里的隐含
语义拿出来命名。文案取常量而非按配置生成：生产装配恰一形，生成式文案要多一份「文案随配置变」
的真源。

---

## 二 · 退出证据与红证（七枚变异，逐枚定点）

命令一律 `cmd > log 2>&1; echo $?` 读退出码。变异后逐枚还原并复绿。

| # | 变异 | 红 |
|---|---|---|
| M1 | 默认根改回 `roots[0]`（**缺陷原形**） | 5 红：read/glob/grep 裸相对三枚、write→read-back 一枚、具名默认根一枚 |
| M2 | read binder 的 description 撤回上游原文 | 2 红：上游原文＋口径的逐字断言、四件同载口径 |
| M3 | glob/grep 撤 `withAddressingNote` | 1 红：四件同载口径 |
| M4 | write binder 的 description 撤回上游原文 | 2 红：binder characterization、四件同载口径 |
| M5 | 撤「未知默认根即拒绝装配」 | 1 红：具名默认根须在册 |
| M6 | `path` 参数说明改回单根原文 | 1 红：glob/grep `path` 说明双根口径 |
| M7 | `route()` 去掉前缀匹配（全落默认根） | 6 红：含「显式 `/case/…` 照常可达」两枚 |

票面四条退出证据与红证的对应：裸相对四工具一致落 `/workspace`＝M1／M7；write→同串 read-back
命中同一文件＝M1；显式 `/case/…` 照常可达＝M7；description 双根口径静态断言＝M2／M3／M4／M6。

---

## 三 · 随本票改动的既有绿测（逐项登记，非静默改判据）

1. **`product-runtime.test.ts` 十处 `path: '备忘.md'`／`'证人.md'` → `/case/…`**。这些用例读案件
   文件只是为了走通一次 tool call（cancel、预算、终态枚举等），裸相对写法在新口径下指向
   `/workspace`；不改就是让它们断言一件契约已经不成立的事。断言本身一字未动。
2. **`tools.test.ts`「read 保持上游 description」**与 **`workspace-write-env.test.ts`「binder 保留
   上游 description」**：由「逐字相等」改为「上游原文逐字在前 ＋ 口径缀于其后」的**逐字**等式
   （不是放宽成 `toContain`）。`parameters` 同一性断言一字未动。
3. **`fixtures/write-session-wire-v1.jsonl` 两行 `inputTokens` 重烤**（516→636、548→667）。工具
   description 是请求的一部分，描述变长即 token 变多；faux provider 的计数是它的函数。三轮实测
   同值。该 golden 由 Rust 侧 `include_bytes!` 消费（`pi_loop.rs` 的双端 golden 测试把
   sidecar→host 段原样喂入），token 值不参与 Rust 侧任何断言。
4. **sealed CJS 身份第七次重录**：`547,283`／`93f04a1c…` → **`547,893`／`951acf8e…`**
   （`reproducible: true`，clean snapshot 连跑两次同值）。逐值重录两处：
   `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`、
   `apps/desktop/src-tauri/src/pi_loop_process.rs`（编译期真值表 ＋「零字节」变异夹具的搜索串）。
   `ACCEPTANCE.md` 里的旧值是历史验收读数，一概不改。

---

## 四 · 偏离与登记

1. **ADR-022 六-C 的 binder 条款与本票口径有一处字面冲突**：该条写「保留上游
   `name/label/description/parameters`」，而票面要求四件工具 description 同批改双根口径。
   本单取**追加不改写**（上游原文逐字在前，口径缀于其后），使两条尽可能同时成立，并按
   「实现会话不自裁契约」把该条的措辞订正留给架构 —— **[需架构拍板]**：六-C 是否改写为
   「保留上游 `name/label/parameters`；`description` 只许在上游原文之后追加产品口径」。
2. **上游 `read`/`write` 的 `path` 参数说明未改**（维持 `(relative or absolute)`）。改它要 fork
   上游 schema、放弃 `parameters` 同一性（validator 缓存按 schema 身份取），属契约级取舍。
   已登记为 SPEC 五-9 的已知边界；口径落在这两件的 description 上。
3. **`md-work-v1` prompt 未改，且经核**与新口径**无冲突**：第②条「你有两个逻辑根……一律用逻辑
   路径」本就在要求显式前缀，与「裸相对按 `/workspace`」相容。prompt id 属 `session_started`
   闭集，本票不动（票面边界）。
4. **`createReadOnlyTools` 的 `logicalRoots` 未收窄成固定两根**。生产调用点恰一处、已固定；
   其他取值只存在于既有单测的特征化装置（`['/case']`／`['/workspace']`），收窄会改写
   `PI-TOOLS-HONESTY-1`／`PI-WORKSPACE-READ-1` 的多枚既有用例，超出票面。双根口径文案因此
   只挂产品形态（`logicalRoots !== undefined`），dev 形态不挂——那里没有逻辑根，写上就是假话。

---

## 五 · 门与读数

| 门 | 读数 |
|---|---|
| `vitest run packages/pi-lane` | **553 passed / 17 files**，EXIT 0（基线 540/17，净增 13） |
| `pnpm -r build` | EXIT 0 |
| `pnpm lint` | EXIT 0 |
| `pnpm test`（仓级） | **1938 passed / 170 files**，EXIT 0 |
| `build:product-sidecar`（clean snapshot 重建） | `reproducible: true`，**547,893 B**／`951acf8e…`，连跑两次同值 |
| `build:headless-sidecar`（clean 重建） | `reproducible: true`，**555,314 B**／`061248fa…`（无机器门冻结，见 `PI-HEADLESS-HARNESS-1` 六节订正） |
| `cargo test`（两制品重建之后） | **237 passed / 0 failed / 1 ignored**，EXIT 0（与合流 tip 同值） |

**未跑**：Playwright（票面门清单未列；本票零 desktop UI 面改动，且全仓同刻至多一条 PW 属排程律，
同期另有 Rust 实现会话在同一仓）。`site:guard` 亦未跑（无站面改动）。
