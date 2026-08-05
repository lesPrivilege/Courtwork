# PI-HEADLESS-HARNESS-1 · 实现回执（2026-08-05，Gate D 清偿 ＋ headless 合成 harness）

票面：就绪图 `PI-HEADLESS-HARNESS-1` 注（近 :205）＋ `PI-BASE-HEADLESS-ACCEPT` 行（~:402）；
本包 `SPEC.md` §九（六格矩阵 :734-739、evidence-per-cell :732、faux 不触网 §七:151）；
ADR-022 六-C（:650 headless 须显式注入 decision driver、禁 always-allow）；
`PI-WRITE-HOST-1-STAGE5/6/7`（Gate D 是裁定A 的 resume 孪生，上浮D 见 STAGE7 §四）；
`PI-WORKSPACE-READ-1`。基线 `claude/pi-headless-harness-1@94e8e83`（main@4ab5671 之后）。

两组件分段提交：
- **组件A（Gate D）**：`f948d1e`。
- **组件B（headless harness）**：`47d20fc`。

分段范围与协调更正一致（provider 为**可插拔注入点**，非焊死 faux——faux 只用于本单 smoke，
真验收换 DeepSeek 跑真模型，SPEC :741-744）。

---

## 一 · 组件A：Gate D 裁定节（协调裁定＝裁定A-mirror，留架构推翻窗，本节即落痕）

**裁定文**：`session_resumed` 加 `promptId`／`capabilities` 两枚字段，写侧记 resumed leg 的
**当刻实况**（`CURRENT_PROMPT_ID` ＋ `EXPECTED_CAPABILITIES`，与 fresh 路 `session_started` 同源）；
读侧闭集与 `session_started` **同一张表**（`LEGAL_PROMPT_IDS`／`LEGAL_CAPABILITY_SETS`），
**只扩员、不收窄**。旧值（`case-read-v1`／`[case_read]`）续 valid，闭集仍是闭集、非通配。

**为何是扩员（三选一里唯一诚实形，逐字复刻裁定A 的判定表）**：

| 选项 | 判定 |
|---|---|
| 维持现状（`session_resumed` 不记这两样） | **违不变量 4/6**：旧档 `session_started` 声称的旧值会继续顶名 resumed leg 的实况（`md-work-v1`＋三枚能力），durable 记录与事实分叉（STAGE7 §四 上浮D） |
| 收窄（只认当刻值） | 与裁定A 同病：把闭集换成单值，日后任一合法形都成非法 |
| **扩员**（本裁定） | 旧值与新形各自 valid，写侧不再撒谎，闭集仍是闭集 |

**「记录值＝该 leg 实际握手集」的落地形**：`session_resumed` 在 `start_inner` 里排在 spawn
之前编码，此刻 ready 尚未发生。可写的唯一诚实值是本 leg **必须**谈成的 `EXPECTED_CAPABILITIES`
——第 7 步 ready 若不逐值等于它，leg 当场以 `StateViolation` 收束，故「记下的」与「谈成的」
在任何能往下跑的路径上恒等（与裁定A 的 `session_started` 逐字同理）。

**契约修订登记**：这是对 `PI-HOST-LOOP-1` 冻结的 `session_resumed` payload 契约的**窄幅**修订
——恰加 `promptId`／`capabilities` 两枚字段＋读侧闭集。envelope 六规则、十九型闭集、`fold` 推进臂、
`prior` 三值判据、wire schema **一字未动**（`session_resumed` 只在 journal codec，不在 wire）。
**若需超出这两枚字段即 STOP 上浮**——本单未越界。

### born-red（先证会红，再做最小实现）

| 族 | 装置 | 实测红形 |
|---|---|---|
| 新形被自家读侧拒（扩员前） | `CURRENT_SESSION_RESUMED`（带两枚新字段）过 `decode_record` | `session_resumed payload 的字段集必须与契约逐字相同（additionalProperties:false）`（HEAD 实测红） |
| 旧+新两形各自 valid（扩员后） | `session_resumed_accepts_exactly_the_two_prompt_and_capability_forms` | 绿：两形各 decode 且**逐字节往返**（证被记住的值，非解码丢弃、编码补回的假往返） |
| 闭性负例 | `counterexample_resumed_prompt_and_capability_sets_are_closed_not_open` | 绿：集外 promptId／空 promptId／只 workspace_write／次序漂移／重复／空集 6 枚各拒 |

### mutation（撤员两向各红，cp-safe 还原、命中恰 1、还原后 SHA 逐字复原）

| 编号 | 变异 | 靶测试 | 实测红形 |
|---|---|---|---|
| M-D1 | `LEGAL_PROMPT_IDS` 撤旧值 `case-read-v1` | resumed_accepts | `旧值 … promptId 不在契约闭集内` |
| M-D2 | `LEGAL_PROMPT_IDS` 撤新值 `md-work-v1` | resumed_accepts | `新形 … promptId 不在契约闭集内` |
| M-D3 | `LEGAL_CAPABILITY_SETS` 撤 `[case_read]` 单员集 | resumed_accepts | `旧值 … capabilities 必须是 LEGAL_CAPABILITY_SETS 的一员` |
| M-D4 | `LEGAL_CAPABILITY_SETS` 撤三枚集 | resumed_accepts | `新形 … 同上` |

读侧判据与 `session_started` **共用** `read_legal_prompt_id`／`read_legal_capabilities`
（本单提出，撤员因此天然两侧同红）；encode 侧共用 `write_capabilities_array`。session_started 的
双端 golden（`dual_end_golden_*`）逐字节未动，证共享化零行为漂移。

**触碰面**：`pi_loop_journal.rs`（struct/encode/read/共享 helper/2 born-red/1 round-trip 站）、
`pi_loop.rs`（runtime :801 记实况／1 resume 断言站）。`fold()` 推进臂、`uncertain` 压扁、
capability 种子、上浮B（logicalPath 空串）一字未碰。

---

## 二 · 组件B：headless 合成 harness

### 2.1 架构图

```text
        ┌──────────────────────────── Rust host（真 production 代码）────────────────────────────┐
        │  PiLoopHost::start_with_pair(ProcessSpawner) ── spawn_verified_sidecar ──┐             │
        │      pair = for_lifecycle_test(冻结 Node runtime, headless bundle)        │             │
        │  install_write_host(WorkspaceFsHost.with_decision_driver(ScriptedApprove))│  真 disk    │
        │      read_host = WorkspaceFsHost（start_inner 装）                        ▼  app-data/  │
        │  prompt() ─ pump ─ 真 journal（durable）─ 四段账 ─ effect 落盘 ─ Terminal   pi-workspaces│
        └───────────────�(真 stdio wire：newline-framed JSON packet)──────────────────────────────┘
                          ▲ ready/agent_event/host_request/terminal  │ bootstrap/prompt/host_result
        ┌───────────────────────────── Node sidecar（真 Agent，独立 headless bundle）─────────────┐
        │  headless-main.ts ── createProductRuntime({ createProvider }) ── createProductSidecarSession │
        │      provider = 注入点：faux（本 smoke，不触网）｜ deepseek（真验收，真 key 走 bootstrap）  │
        │      faux 脚本走 cwd/headless-config.json（env_clear＋固定 argv 下唯一非 wire 通道）         │
        │  真 pi Agent（@earendil-works/pi-agent-core）＋真工具面（read/glob/grep/write）              │
        └─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 两注入点＝唯一 production 偏离（其余全走 production 代码）

| # | 注入点 | production 形态 | harness 形态 | ADR 依据 |
|---|---|---|---|---|
| 1 | **provider** | `product-main.ts` 焊死 `createDeepSeekProviderBinding` | headless 入口按 `headless-config.json` 选 faux／deepseek，经既有 `createProductRuntime({ createProvider })` seam 注入 | 协调更正：SPEC :741-744 六格需真模型，faux 只辖 CI；真验收换 DeepSeek 即与 production 同一支 |
| 2 | **decision driver** | production 恒 `None` ⇒ 每枚 write `policy_denied`（诚实边界） | 显式注入 `ScriptedApprove`（`approve:true` smoke／`false` 拒绝面） | ADR-022 六-C:650 明令 headless 须显式注入，禁 always-allow 冒充产品授权 |

**其余全真**：spawn（`ProcessSpawner`→`spawn_verified_sidecar`，`env_clear`＋固定 argv）、stdio
wire（`product-stdio` codec）、`WorkspaceFsHost`（probe/decide/perform 真件、真落盘、三道屏障）、
journal（durable 十九型 codec、四段账）、restart（`reclaim_after_fault`→新 `start_with_pair` resume）。
`sidecar.cjs`／`route-manifest.json`／sealed CJS 身份**零漂移**（headless 自成独立 bundle）。

### 2.3 概念账（复杂度节制：本单新增了什么、为何非加不可）

| # | 概念 | 落点 | 非加不可 |
|---|---|---|---|
| 1 | `headless-main.ts` | `packages/pi-lane/headless/` | provider 注入点须有一个**不引 production 入口**的组合根，守 demo/real 隔离（不变量 7）；io 接线逐字复刻 `product-main.ts`，刻意不 import 它以免反向把 faux 拖进其依赖图 |
| 2 | `headless-config.json`（cwd 文件） | sidecar cwd | sidecar 被 `env_clear`＋固定 argv 拉起，wire 冻结不借；faux 脚本／provider 选择只能走 cwd 文件，这是「provider 注入点」的落地形，非新 wire |
| 3 | `build-headless-sidecar.mjs` | `scripts/` | 复用 production `buildDeterministicBundle`／`bundleOptions`，只换 entry/outfile；headless bundle 是**独立**制品，不进任何冻结 manifest、不宣称供应链身份 |
| 4 | Rust harness helper（`headless_artifacts`／`write_headless_faux_config`／`start_headless_leg`） | `pi_loop.rs` 测试面 | 三枚常驻件即 HEADLESS-ACCEPT 的编程 API：定位制品、写 faux 配置、组合真 host＋注入 driver。缺件硬失败（承 `snapshot_e2e` 体例，不静默跳过） |

**刻意不新增**：不改 wire schema、不加第二份 provider 分支到 `provider.ts`/`product-main.ts`、
不给 sidecar 加 env/argv 通道、不加 GUI/edit/diff/CAS/promotion/bash。

### 2.4 smoke 证据（`headless_smoke_write_approve_readback_then_restart_readback`，真跑）

leg 1：真 Agent `read /case/备忘.md`（直读，无 host op）→ `write 简报.md`（host op）→
`ScriptedApprove` 授权 → 真 `WorkspaceFsHost` 落盘。实测四段账在 journal 上齐备
（`tool_proposed → authorization_decided → effect_started → effect_succeeded`），harness 从盘上
`fs::read_to_string == content`（**byte-identical**）；正文与物理根不进 journal。

restart：`reclaim_after_fault(SidecarEnded)` → drop → 新 `start_with_pair` resume 新 leg →
prompt 收尾。字节跨 restart 仍逐字节一致（harness 回读）；journal 经
`session_interrupted → session_resumed`，且 `session_resumed` 记 `"promptId":"md-work-v1"`
——**Gate D 在真 resume 上兑现**（组件A×B 合拢）。

---

## 三 · headline 阻断项（[需架构拍板]，上浮不自修）

**真 Agent 经 read/glob/grep 工具读 `/workspace`（一枚 `workspace_read` host op）今日恒
`StateViolation`。** 根因：`active_tool_call` 只在 `pump` 的 `ToolStarted{tool_name: Write}`
一臂落一枚（`pi_loop.rs`），读工具的 `tool_started` 不落它；于是 `serve_read_request` 的
「读须归属一枚在场 tool call」判据（`active_tool_call.is_none() ⇒ StateViolation`）当场翻红。

**为何既有门从未照到**：`PI-WORKSPACE-READ-1` 的 Rust 门全部以 **Write** tool_started 假冒
（`tool_started_line_for` → `ProductToolName::Write`），即在一枚 workspace_**read** host op 前
先发一枚 **write** tool_started 顶名 `active_tool_call`。Node 侧 `workspace-read-env` 测试是
Node-only（无 Rust host）。**真 read 工具＋真 host 的组合从未被跑过**——正是本票立意的
「每枚测试只桩住 seam 一侧」。本 harness 首次以真 read 工具触到它。

**影响**：挡住 `PI-BASE-HEADLESS-ACCEPT` 六格里凡涉 **/workspace agent 回读**的三格
（3 read-back、4 先 read 既有 workspace、5 resume 后回读）。`/case` 读不受影响（直读，无 host op），
故格 1/2 与本 smoke 的 /case 读均真跑通过。

**机器钉子**：`headless_workspace_readback_currently_stateviolations_blocker` 断言当前坏态
（真 read 工具读 /workspace ⇒ `StateViolation`，写已落盘、回读那步才被挡）。**它一旦转绿即
缺口已修**，须删该测试并在六格放开 /workspace agent 回读。

**为何不自修**：修法＝把 `active_tool_call` 由 write-only 扩到「凡能发 host op 的工具」
（write 取、read peek），属核状态机语义变更，且牵动 `PI-WORKSPACE-READ-1` 既有门的有效性
（那批 Write-顶名的读门须一并复核），超出本票 Gate D＋harness 的授权面。**[需架构拍板]**。

---

## 四 · 门与证据（包级，2026-08-05 实现 worktree 实测）

| # | 门 | 读数 |
|---|---|---|
| 1 | `cargo test --lib --offline`（`apps/desktop/src-tauri`） | **236 passed / 0 failed / 1 ignored**（基线 234 ＋ 2 headless：smoke ＋ blocker；组件A 的 2 枚 journal 测试含在 234 里） |
| 2 | `pnpm --filter @courtwork/pi-lane test`（vitest） | **531 passed / 17 files**（与 SPEC §十 基线同值，headless 非测试面、零影响） |
| 3 | `tsc -p headless/tsconfig.json`（typecheck:headless） | clean（headless 入口对真 src 类型逐值编译） |
| 4 | `pnpm --filter @courtwork/pi-lane build`（tsc src-only） | clean（headless 在 src 外，production build 不含它） |
| 5 | `eslint` 新文件（headless-main.ts／build-headless-sidecar.mjs） | 0 |
| 6 | `cargo clippy --offline --all-targets` | 本单归属 **0**（仍仅 `src/lib.rs` 既有 7 枚，未新增 `allow`） |
| 7 | `rustfmt --check` 触碰面 | clean（`pi_loop_journal.rs` 全 clean；`pi_loop.rs` **我新增段全 clean**，既有 8 处 drift 系 `PI-WORKSPACE-READ-1` 落时未 rustfmt，非本单，未触） |
| 8 | `build:headless-sidecar` 制品 | `headless-sidecar.cjs` **554,327 B** / `52b65d16fbc2f6000cc446cf6588fcca7455a72ecaf512da8db0fb608bc7f79c`、`reproducible:true`（`dist/` gitignored，不入库） |

每次 `cargo` 前 `pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 复核，全程 **0**。
**未跑仓级 `pnpm -r build`／`pnpm lint`／`pnpm test` 与 Playwright**（票面：包级自由、不跑仓级门）。

---

## 五 · 偏离与登记

1. **provider 由「焊死 faux」改「可插拔注入点」**（协调 2026-08-05 更正）。smoke 用 faux 证 plumbing，
   编程 API 接受 provider 选择（`headless-config.json` 的 `provider` 字段），真验收插 DeepSeek。
2. **Rust harness 落在 `pi_loop.rs` `#[cfg(test)]` 测试面**，非独立文件。理由：`for_lifecycle_test`／
   `install_write_host`／`ScriptedDecision`／`FixedKey`／`ProcessSpawner` 皆 crate-内测试面私有；
   独立文件够不到。HEADLESS-ACCEPT 在同测试面加六格 `#[test]` 驱动本 harness 三枚 helper。
3. **smoke 的 byte-identical read-back 由 harness 从盘上回读核验**，非 Agent /workspace 回读
   （后者被 §三 缺口挡住）。leg 1/2 的 Agent 读均取 `/case`（直读，走得通）。如实登记，不冒充
   Agent 回读已跑通。
4. **`pi_loop.rs` 既有 rustfmt drift 8 处未触**（属 `PI-WORKSPACE-READ-1`）。只做工单范围。

### [需架构拍板]（结转 ＋ 本单新增）

- **本单新增（headline）**：/workspace agent 回读 `StateViolation`（§三），阻断六格 3/4/5。
- **结转（本单未碰）**：上浮B（journal `logicalPath` 空串两侧异源）；②游标二元性随 WRITE-HOST 收敛；
  ④ `cost_usd` Disabled 臂裸 inf。

---

## 六 · 移交 `PI-BASE-HEADLESS-ACCEPT`（开工前必读）

1. **门次序**：验收自建 clean worktree 须先 `pnpm --filter @courtwork/pi-lane build:product-sidecar`
   **与** `build:headless-sidecar`，再 `cargo test --lib`——两制品缺一，`headless_artifacts()`
   硬失败（不静默跳过）。headless bundle 现值 `554,327 B` / `52b65d16…`。

2. **驱动六格的编程 API（三枚常驻 helper，`pi_loop.rs` 测试面）**：
   - `headless_artifacts() -> (node, bundle)`：定位冻结 Node ＋ headless bundle。
   - `write_headless_faux_config(app_data, serde_json::json!([...steps]))`：把 faux 脚本写进
     sidecar cwd。step 形：`{"kind":"tool","name":"read|glob|grep|write","args":{...}}` 或
     `{"kind":"text","text":"..."}`。真验收换真模型时改写 config 为 `{"provider":"deepseek"}`
     并经 `CredentialPort` 供真 key（`FixedKey` 换真件），provider 即与 production 同一支。
   - `start_headless_leg(h, node, bundle, approve)`：组合真 host＋注入 `ScriptedApprove`。
     `approve:false` 驱动格 6 拒绝面（逐次授权拒绝）。
   - 取证据：`host.records()`（journal／四段账／agent events）、盘上 `workspace_root(&h)` 下
     bytes、`host.prompt(...)` 的 `Terminal`。restart 沿 smoke 的 `reclaim_after_fault`→drop→
     新 `start_with_pair` 先例。

3. **先解 §三 阻断项再跑格 3/4/5**。缺口未修前，任何 /workspace agent 回读会 `StateViolation`
   关 leg——那是 harness 忠实暴露的产品缺口，不是 harness 失败。`headless_workspace_readback_
   currently_stateviolations_blocker` 转绿即放行信号。

4. **真 key/model 证据另行登记**，不与 faux 证据混写；无 key/model 只能记 `external-validated
   blocked`（SPEC :744），不得放行「harness 非瓶颈」。
