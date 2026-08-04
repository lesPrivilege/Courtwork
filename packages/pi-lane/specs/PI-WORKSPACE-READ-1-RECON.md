# `PI-WORKSPACE-READ-1` · 自侦察与开工前置

本票无专属 RECON 票，按票面要求由实现会话自侦察。本件是侦察落痕，**不含任何生产改动**：
开工在第零节的定序问题上停住，等架构/协调裁定。坐标一律用符号锚，不用行号。

## 零 · 结论先行：开工被一条已登记的定序阻断

| 谱 | 原文 | 现读事实 |
|---|---|---|
| 就绪图本票行 | 依赖层 `PI-WRITE-HOST-1` | **已满足**：本树 `f0d6df0` 含合入提交 `66862ef` |
| 就绪图 `PI-TOOLS-HONESTY-1` 行 | 依赖层「**须早于 `PI-WORKSPACE-READ-1`**」 | **未满足**：该票未落地——`packages/pi-lane/src/tools.ts` 现读无 `matchesTruncated`、无 `skipped`，`git log` 无该票提交 |
| `docs/status/current.md` | 「当前在途：无实现票（`PI-WORKSPACE-READ-1` 随即开工）」 | 该句写于 2026-08-04 首三票清账段，**早于**七票立项 `d6a4cc5` 与 `PI-WRITE-HOST-1` 合入 `66862ef` |

两谱在此分叉。就绪图是唯一开工依赖图，故本会话按纪律停下，不自裁。

**定序不是形式问题，有实质技术理由**：本票必须改写 `walkFiles` 的遍历与
`createGlobTool`／`createGrepTool` 的命中投影（见三.3），而 `PI-TOOLS-HONESTY-1` 的**整张退出
证据**（200 条命中语料、chmod-0 目录 fixture、`matchesTruncated`／`skipped` 三枚 mutation）正落
在同两个函数。若本票先落：

1. 今日「满 200 命中仍报 `truncated:false` 且无注记」这条不变量 4 破口会被**原样扩到第二个根**
   ——`/workspace` 的命中同样被静默截断；
2. 本票的「双根显示」红绿证会建立在这条破口之上，承在案判例「golden 固化坏形」；
3. `HONESTY` 随后要在一个已经变成双根遍历的 `walkFiles` 上重建它的全部 fixture，且
   `skipped` 的语义要凭空多出一类（host-mediated 读的 `denied`／`failed`），等于让它在移动
   基线上答一道被本票改过的题。

反向落序则无此问题：`HONESTY` 先把诚实口径钉死，本票只做「两根各自计数如何汇总」这一步加法。

**请二选一并留痕，不接受悬置**：

- **(a) 先跑 `PI-TOOLS-HONESTY-1`**，本票在其后开工（就绪图原序，代价最低）；
- **(b) 显式授权倒序**，并同批裁定本票是否承接 `HONESTY` 的诚实口径——若承接即两票合并，须改
  票面；若不承接，须显式接受「双根都不诚实报命中上限」这一已知边界会短暂存在。

## 一 · 自侦察图：wire 面**零 schema 变更**（已实证，非推断）

票面要求「wire 若需新 request 形先核 protocol 既有 read 面」。现读结论：**双端 read 面已全部
在场**，本票不需要任何 wire schema 变更。

**Rust 侧**（`apps/desktop/src-tauri/src/pi_loop_protocol.rs`）：

- `WorkspaceCapability` 闭集已含 `WorkspaceRead`（`"workspace_read"`）；
- `WorkspaceOperation` 闭集已含 `Exists`／`ReadFile`／`List`；
- `WorkspaceReadArguments`（`{operation, logicalPath}`）与 `WorkspaceRequestArguments::Read` 在场；
- `HostResultValue` 已含 `Exists`／`ReadFile`／`List` 三支，`ListEntry`／`ListEntryKind` 在场；
- decoder 侧 `read_host_request_payload` 已按 capability 分叉取 read arguments，
  `read_list_entry` 在场并已带「`file` 必有 `byteLength`、非 `file` 必无」的对称判据；
- `read_host_result_payload` 已锁「`workspace_read` 的 operation 不得为 `write`」与
  「`uncertain` 只许 `workspace_write`」。

**Node 侧**（`packages/pi-lane/src/product-protocol.ts`、`product-stdio.ts`）：

- `WorkspaceCapability`／`WorkspaceOperation`／`WorkspaceReadArguments`／三支 `HostResultOutcome`
  逐一对称在场，`MAX_TEXT_BYTES = 131_072` 已用于 `read_file` 的 content 与 byteLength；
- `TOOL_CAPABILITY` 已把 `read`／`glob`／`grep` 三件**固定映射**到 `workspace_read`；
- `sendReservedHostRequest` 已有 `workspace_read` 出包分支（含 `list` 与 `exists|read_file` 两形）；
- `handleHostResult` 已有 read 的 `logicalPath` 回执同一性判据，且**已显式支持同一 tool call 内
  的多 host-operation 子循环**——原文：「write 停在 `settled` 等自己的 `tool_finished`；
  read/glob/grep 无 effect，回到 `started`」。`writeOperationSent` 的单-operation 限制只挂 `write`。

即：`PI-CODE-STDIO-1` 谱系当初就把读面一次铺齐，本票是**接线**，不是**扩契约**。

## 二 · 概念账：本票会新增什么，为何非加不可

| 新增 | 归属 | 为何非加不可 |
|---|---|---|
| `WorkspaceReadHost`（Rust trait 或直接在 `WorkspaceFsHost` 上扩三枚只读方法） | `pi_loop_workspace.rs` | `exists/read_file/list` 需要与 write 同一枚 capability 根、同一套逐段 no-follow 下降。STAGE4 移交 5 已明写「读侧票直接沿用 `session_root`／`descend` 两枚函数，不要另起一套解析」 |
| host-mediated `/workspace` 只读 `ExecutionEnv` | 新文件 `packages/pi-lane/src/workspace-read-env.ts` | pi 的工具一律经 `ExecutionEnv` 触碰文件系统；`/workspace` 的物理面不在 Node 进程内，故这枚 env 的每个方法都是一次 host round-trip。它与 `product-case-env.ts`（Node 直读）是两种材质，不能合并 |
| 路由 env（按逻辑根前缀分派到 case env 或 workspace read env） | 同上或 `product-runtime.ts` | `read/glob/grep` 只有一个 `context.env`。分派必须发生在 env 层，否则三件工具里各写一遍前缀判定＝三处可漂移的真源 |
| `openWorkspaceMarkdown` Tauri command | `lib.rs` ＋ `pi_loop.rs` | GUI 后续消费的窄只读查询面。现读全仓**零实现**，只在 `apps/desktop/SPEC.md`、`packages/pi-lane/SPEC.md`、ADR-022 六-D 与就绪图四处被引用 |

**不新增**：模型工具（`list` 不成为工具）、第二套路径 grammar、第二份 journal、任何编排抽象。

## 三 · 改动面测绘（现读现核）

### 3.1 Rust：能力闭集与 journal 读侧闭集（**含一枚 journal payload 闭集变更**）

- `pi_loop.rs` 的 `EXPECTED_CAPABILITIES` 现为 `[CaseRead, WorkspaceWrite]`，须扩为
  `[CaseRead, WorkspaceRead, WorkspaceWrite]`。字典序天然成立（`case_read` < `workspace_read`
  < `workspace_write`），与 Node 侧 `PRODUCT_CAPABILITIES` 同批。
- **`pi_loop_journal.rs` 的 `LEGAL_CAPABILITY_SETS` 现为两员**（旧档 `['case_read']`、⑤ 后
  `['case_read','workspace_write']`），须扩第三员。这**是**一枚 journal payload 闭集变更，
  落在票面禁区所说「须极窄且循裁定A先例登记」的范围内——扩员不收窄、旧两档续 valid，与
  `PI-WRITE-HOST-1` 序⑥ 裁定A 逐字同形。
- 既有反例 `["case_read","workspace_read"]`（缺 `workspace_write`）**扩员后仍是集外组合**，
  判据不失效；但其标签「含未谈成的 `workspace_read`」措辞会失实，须同批改为「缺 `workspace_write`
  的残缺组合」。
- `pi_loop.rs` 的三处注释（模块头 `EXPECTED_CAPABILITIES` 说明、`serve_host_request` 0.1／0.2 门）
  现文均写「`workspace_read` 未谈成、恒拒」，须同批订正，否则留下反事实自述。

### 3.2 Rust：`serve_host_request` 的读臂（与写臂的三处结构性不对称）

1. **0.3「一 tc 一 op」不适用**。写臂 `self.active_tool_call.take()` 认领即消费；读臂一次
   `glob` 会对每一层目录各发一枚 `list`，故读臂必须 **peek 不 take**。Node 侧已按此设计
   （`record.phase` 回 `started`），Rust 侧目前没有对应形态。
2. **四段账不适用**。读不是 effect：`tool_proposed`／`authorization_decided`／`effect_started`
   ／`effect_*` 四型都不该为读产生。**拟采「读臂零 journal 记录」**，理由是读非 effect 且正文
   不得入 journal；这样 journal payload 十九型闭集本身零变化（只有 3.1 的 capability 值域扩员）。
   此项请架构确认口径，不阻塞。
3. **`proposalHash` 语义待定**。wire 的 `host_request` 顶层恒带 `proposalHash`，写臂由
   `workspace_write_proposal_hash` 重算比对。读没有「提案」，Node 侧 `sendReservedHostRequest`
   仍会校验其 hex 格式。读臂该重算什么、还是只验格式，须裁——见四.A。

### 3.3 Node：`tools.ts` 的双根（与 `PI-TOOLS-HONESTY-1` 的正面冲突面）

现行 `createGlobTool`／`createGrepTool` 的命中投影是
`path.relative(context.env.cwd, absolute)` 再前缀 `logicalRoot`。**这正是票面点名要禁的
`../workspace` 的来源**：`cwd` 为 `/case` 而命中为 `/workspace/notes/a.md` 时，
`path.relative` 结构性产出 `../workspace/notes/a.md`。

故双根不能靠「换一个 cwd」或「多加一个前缀」解决，必须把投影从「相对 cwd」改成
「相对**各自根**」：每个根各走一次 `walkFiles`，命中直接以该根的逻辑绝对路径出面。随之而来的
三件事全部落在 `HONESTY` 的改动面上：`walkFiles` 返回值（`scanned`／`truncated`）要跨两根汇总；
`MAX_MATCHES`／`MAX_FILES_SCANNED` 是两根共享一份预算还是各一份；`listDir` 失败的
`continue` 在 host-mediated 根上多出 `denied`／`failed` 两类新来源。

`read` 一侧较轻：`bindReadToLogicalRoot` 只调 `context.env.absolutePath`，路由 env 就位后自然
分派；`ReadOnlyToolsOptions.logicalRoot` 的类型现为 `typeof CASE_LOGICAL_ROOT` 单值，须放宽。

### 3.4 Node：`product-runtime.ts`

- `PRODUCT_CAPABILITIES` 加 `workspace_read`（同 3.1 字典序）；
- `pendingHostOperation` 现为单槽且 `deliverHostResult` 硬编码
  「不接受 `workspace_write` 之外的 capability」，须泛化到读；
- `hostRegistry.allocateOperationId` 现硬编码 `capability:'workspace_write'`，读面须按
  `TOOL_CAPABILITY` 取值；
- `settledWriteOutcome` 只对 `write` 生效，读面不得复用它（读的 `tool_finished` 仍走本地判据）。

### 3.5 prompt 与 SPEC 的登记缺口闭合

`PI-WRITE-HOST-1` ⑤回执 §九.8 与 ⑦回执 §七登记：`md-work-v1` 六条第④条「写后回读」当期不可
服务——今日 `read /workspace/...` 被 case-only 容器以
「绝对路径只接受 `/case` 或 `/case/<相对路径>`」`denied`（`normalizeCasePath` 的绝对路径分支）。
本票落地后该缺口闭合，须同批：撤 ⑤§九.8／⑦§七 的缺口登记、订正 `packages/pi-lane/SPEC.md`
§九 与 `pi_loop.rs` 三处反事实注释。prompt 正文六条本身**不改**（ADR 原文，且 prompt 非安全边界）。

## 四 · 已识别的 [需架构拍板]

- **A（本票新发现）**：读面 `host_request` 的 `proposalHash` 语义未被任何谱定义。wire 顶层字段
  恒在场、Node 侧校验 hex 格式，但 ADR-022 六-B.2 的 `frame()` 只为 write 定义了域分隔串
  `courtwork.pi.workspace_write.v1` 与七字段拼接。读臂三选一：沿用同 frame 换域串、只验格式不重算、
  或读面固定某常量。本会话不自裁。
- **B（`PI-WRITE-HOST-1` 上浮，原样承接不自裁）**：journal 侧 `logicalPath` 用 `read_string`
  （允许空串），wire 侧 `read_logical_path` 用 `read_non_empty_string`，非空判据两侧不同源。
- **D（`PI-WRITE-HOST-1` 验收上浮，原样承接不自裁）**：resume prompt/capability 漂移门缺席。
  本票扩 `EXPECTED_CAPABILITIES` 会让该门的缺席**多覆盖一枚值**，但门本身挂 UI/HEADLESS 开工门，
  本票不顺手补。

## 五 · 本件未做

零生产改动、零测试、零 mutation。`cargo`／`pnpm` 门本件未跑（无可跑的改动）。
第零节裁定落下后，实现按 3.1→3.2→3.3→3.4→3.5 分段推进，TDD 先红。
