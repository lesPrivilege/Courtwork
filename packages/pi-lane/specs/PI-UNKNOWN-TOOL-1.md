# PI-UNKNOWN-TOOL-1 · 实现回执（2026-08-05，闭集外 toolName 与上游违约在投影入口拆分）

票面：就绪图 `PI-UNKNOWN-TOOL-1` 行（`docs/architecture/implementation-readiness.md`
「2026-08-05 架构/功能层验收批」，架构验收③）；`SPEC.md` §三.1 与 §九 六格 cell 6；
ADR-022 六-0（「缺工具、结果未回灌……均是 harness 缺陷」）、六-B.1；不变量 4。
基线 `claude/pi-unknown-tool-1@2c8fd7b`（≡ main@2c8fd7b）。

生产改动**一个文件**：`packages/pi-lane/src/product-stdio.ts`。另有三处随附：
`product-runtime.ts` 两段注释订正（零行为）、sealed CJS 身份重录（manifest ＋ Rust 侧登记）、
`SPEC.md` 两处措辞对齐。

---

## 一 · 根因（三段同链，逐段有源可查）

模型只要在正文里叫一声闭集外的工具名，logical session 就**非可重试**地关闭：

1. **内核先发事件、后查表**。`@earendil-works/pi-agent-core@0.82.1` 的
   `agent-loop.js:executeToolCallsSequential` 在 `prepareToolCall` **之前**就
   `emit({type:'tool_execution_start', toolName: toolCall.name})`——这个名字是模型自填的任意串。
   查表在其后：`prepareToolCall` 找不到工具才回 `createErrorToolResult('Tool X not found')`
   ＋`isError:true`，随即 `emitToolExecutionEnd` ＋ `createToolResultMessage` 照常回灌。
   （`failToolCallsFromTruncatedMessage` 同形：先 emit start、再造 isError 结果。）
2. **runtime 原样转发**（`product-runtime.ts:onAgentEvent` 的 `tool_execution_start` 臂）——
   这是**对的**：闭集判定的唯一真源应在状态机，runtime 立第二套策略即两处可漂移真源。
3. **状态机把它判成上游违约**：`product-stdio.ts` 的 `publishAgentEvent` 在 `tool_started`
   首门 `if (!PRODUCT_TOOL_NAMES.has(event.toolName)) failUpstream()` →
   `terminate({code:'upstream_event_unsupported', retryable:false})` → `closesSession` 为真 →
   `phase='closed'`。

后果与 `SPEC.md` §三.1 的承诺（「模型请求 edit/bash 得到内核 `Tool X not found`、isError
回灌可见」）**直接相反**，且属 ADR-022 六-0 自定判据下的 harness 缺陷：`/workspace` 里既有的
工作稿随会话一起停摆，六格 cell 6 在真 key 到位前已结构性不可能通过。产品 system prompt
第五条恰好点名「你没有 edit、delete、rename……」，模型复述这些名字的先验概率因此不低。

**威胁模型的盲区**：既有反例 `product-stdio.test.ts` 的「反例四」以
`as unknown as OutboundAgentEvent` cast 构造该事件，注释写「cast 或未来上游工具」——
设想的是**代码**违约，从未设想**模型输入**。cast 面看不出这两者的区别，故一条判据兼管了
两件事，而其中一件的正确答案与另一件相反。

---

## 二 · 概念账（票面要求单列）

**新增概念恰一个**：

| 概念 | 落点 | 为何非加不可 |
|---|---|---|
| **未投影 tool call 登记册**（`unprojectedToolCalls`） | `product-stdio.ts`，`Map<rawToolCallId, {requestId, toolName, finished}>` | start 不投影后，同一枚 tc 的 `tool_execution_end` 必然随之而来（内核对查不到的工具是「emit start → immediate 错误结果 → emit end」的定式）。没有这本册子，那枚 end 会落进「finish 无 start」的 fail-closed 支，会话照样死——**孤儿状态即缺陷本身，不是可省的整洁**。册子同时是「同 tc 重复登记 / 改名 / 跨 prompt 复用 / 二次收尾」四道判据在未投影侧的承重点 |

**未新增**：wire 形状、协议字段、工具、capability、依赖、持久化格式、抽象层、状态机。
`resolveUnprojectedToolCall` 是既有 `resolveActiveToolCall` 的逐条同构镜像（owner / 同名 /
未收尾），不是新判据种类。工具闭集仍**恰四件**，`PRODUCT_TOOL_NAMES` 仍从 `TOOL_CAPABILITY`
键派生、零第二份词表。

**未投影 tc 不进公开 registry**，因此：不铸公开 tc id、不占 `toolCallOrdinal`、
`publicToolCallId()` 对它恒 `undefined`（reserve/send 两段式接缝对它结构性不可达）、
不占 `activeToolCallId`、不动 `observedTurns`/`countedTurns`/`usd`。计数器零漂移由
§四证据表第 2 行的**双臂逐值相等**断言锁死，不靠人读。

---

## 三 · 拆分的确切边界（放行的只有一条）

`tool_started` 的门序由「闭集 → 查重 → settled effect → 重叠 tc」改为
「查重 → settled effect → 重叠 tc → 闭集」。三道结构门**一道不减**，且现在对闭集外的名字
一样生效——放行的只有「名字不在闭集」这一条。

| 形状 | 改前 | 改后 |
|---|---|---|
| 模型自填的闭集外 `tool_started`／`tool_progress`／`tool_finished` | `upstream_event_unsupported`、`retryable:false`、会话关闭 | 不上 wire、不铸 tc、不动计数器、**会话存活** |
| 同一枚 raw tc 重复登记（闭集内**与**闭集外） | fail-closed | fail-closed（两本册子一起查，未投影侧不成免检通道） |
| `tool_finished` 无 `tool_started` | fail-closed | fail-closed |
| 同一枚 tc 中途改名（两个方向） | fail-closed | fail-closed |
| 未 finished 的公开 tc 在场时又起一件工具 | fail-closed | fail-closed |
| 已收下 host_result、`tool_finished` 未投影时又起一件工具 | 先按 host status 自发 `tool_finished` 再 terminal | 同左，**闭集外的 start 也走这条** |
| 未投影 tc 的二次收尾 | （不可达：首枚已关会话） | fail-closed（单向推进，与公开 tc 侧同构） |
| 跨 prompt 引用上一轮的未投影 tc | （不可达） | fail-closed（owner prompt 门） |

**为何是「不投影」而不是「投影成别的」**：wire 的 `toolName` 是闭集类型，没有表达
「模型叫了一个不存在的工具」的形状，而扩 wire 是票面明禁的边界。显式回答这一条不变量本就
成立——内核把 `Tool X not found`（`isError:true`）直接交给模型，那是 SPEC §三.1 承诺的
唯一收信人。宿主侧因此**看不到**这次未遂调用；这是票面裁定的边界，登记于 §六。

---

## 四 · 门与证据（包级，2026-08-05 实现 worktree 实测）

基线 531 例 / 17 文件（`SPEC.md` §十，`PI-WORKSPACE-READ-1` 记）；本单净增 9 例 → **540 / 17**。

### 4.1 born-red ↔ green（唯一变量＝`product-stdio.ts` 的生产段）

`product-stdio.ts` 与 `route-manifest.json` 一并 `git checkout HEAD --` 回退（测试段与
`product-runtime.ts` 注释保持本单版本），跑同一条命令：

| 相 | production | 读数 | 红形 |
|---|---|---|---|
| born-red | HEAD（未拆分） | **6 failed / 534 passed（540）** | 六枚逐条见下 |
| green | 本单实现 | **540 passed / 0 failed**，EXIT **0** | — |

回退前 `cp` 备份、回退后 `cp` 回写，还原后 `shasum -a 256` 与备份逐字节相同
（`9d9e925e29c2b12f8b4fc40e4a4431c058da996f700ec5d8328d1c793963d78a`）——
「未提交面一律 cp 还原、不用 checkout 清」的判例照办。

六枚 born-red（全部落在**断言**上，不是抛错逃逸；首版曾红成
`ProductSidecarError: 注入 runtime 的 callback 抛出`，已改写为可诊断的断言形）：

| # | 用例 | 文件 | born-red 实测（逐字取自 vitest 输出，全部为 `AssertionError`） |
|---|---|---|---|
| 1 | 闭集外 start/finish 不上 wire、不铸 tc、不终结；后续合法 read 仍拿 `tc_1_1` | `product-stdio.test.ts` | `bash: expected ProductSidecarError: 当前没有活动 prompt to be null`（后续合法调用被关在门外） |
| 2 | 闭集外调用不动任何计数器（双臂逐值相等） | `product-stdio.test.ts` | `expected { snapshot… } to deeply equal { … }`；差量为 `phase closed`≠`idle`、`observedTurns 0`≠`1`、`usd null`≠`0.25`、terminal `upstream_event_unsupported`≠`completed` |
| 3 | 未投影 tc 的 progress 不上 wire、二次收尾仍 fail-closed | `product-stdio.test.ts` | `expected ProductSidecarError: 当前没有活动 prompt to be null`（首枚 start 即关会话） |
| 4 | 跨 prompt 的闭集外引用是 stale | `product-stdio.test.ts` | `expected [ 'capabilities', 'startPrompt:req-1' ] to include 'startPrompt:req-2'` |
| 5 | bash/edit/未知名逐枚 ⇒ 会话存活、isError 回灌、随后 write 端到端走通 | `product-runtime.test.ts`（真内核＋scripted provider） | `expected 'failed' to be 'completed'` |
| 6 | 同一未知名连叫两次仍逐枚回灌 | `product-runtime.test.ts` | `expected 'failed' to be 'completed'` |

第 4 枚的判据不是「没出 agent event」——会话早死时那也成立。真正分辨两者的是
`startPrompt:req-2` 是否发生过：现行实现里 req-1 就把会话关了，第二个 prompt 根本没开起来。

第 5 枚是票面判据 (a) 的完整闭环，逐项断言：唯一 terminal 为 `completed`；
`runtime.messages()` 里恰三枚 isError toolResult，正文为
`Tool bash not found` / `Tool edit not found` / `Tool 把文件删掉 not found`；
wire 上的工具事件恰 `tool_started:tc_1_1` / `tool_finished:tc_1_1`（**ordinal 从 1 起算**）；
恰一枚 `host_request`（`op_1_1`）且脚本宿主表中的字节等于模型给的字节；`turn_finished` 恰 5 枚、
终态 `budget.turns` 为 5。

**对照臂**（HEAD 即绿，非本单产物）：同一段脚本把闭集外三枚换成合法 `read`，其余逐字不变 ⇒
`tc_1_1..tc_1_4` 逐枚递增、零 `not found`。两臂唯一变量是工具名在不在闭集，
「ordinal 零漂移」因此是真判据而非「脚本本来就只有一枚 tc」。

### 4.2 mutation（八枚，命中恰 1 校验后写入；每枚跑前 `cp` 还原）

变异器 `mutate.py` 对每处替换先 `text.count(old)`，非 1 即硬失败拒绝写入
（「sed 变异必须带命中校验」判例）。全部八枚均报「命中 1 处」。

| # | 变异 | 预期承重判据 | 实测红形 |
|---|---|---|---|
| M1 | 撤拆分：闭集外分支改回 `failUpstream()`（登记册与解析门保留） | (a) 全族 | **6 failed**（＝born-red 同一六枚） |
| M2 | 查重门去掉 `unprojectedToolCalls.has(...)` | 实现层违约三形①-乙 | 1 failed |
| M3 | 未投影侧去掉同名门 | 实现层违约三形③ | 1 failed |
| M4 | 未投影侧去掉 owner prompt 门 | 跨 prompt stale | 1 failed |
| M5 | 未投影侧去掉 `finished` 单向门 | progress／二次收尾 | 1 failed |
| M6 | 未投影早返**上移**到 settled effect / 重叠 tc 两道结构门之前 | 拆分不绕开结构门 | 1 failed |
| M7 | 删 `tool_progress` 的未投影早返 | progress／二次收尾 | 1 failed |
| M8 | 删 `tool_finished` 的未投影早返 | (a) 五枚 | 5 failed |

八枚全部有效，**零等价变异、零作废**。M2–M7 各自只打红一枚且互不相同——判据之间无互相顶名，
拆分的每一条边都各有承重点。M6 专证「拆分没有顺手绕开既有结构门」：把早返上移一行即红。
每枚跑毕 `cp` 还原，末次还原后 SHA 逐字复原。

### 4.3 包级门（真退出码，不经管道）

| # | 门 | 读数 |
|---|---|---|
| 1 | `npx vitest run packages/pi-lane` | **540 passed / 17 files**，EXIT **0** |
| 2 | `pnpm --filter @courtwork/pi-lane build`（`tsc -p`） | EXIT **0** |
| 3 | `npx eslint packages/pi-lane` | EXIT **0** |
| 4 | `buildDeterministicBundle()` | `reproducible: true`，**547,283 B** ／ `93f04a1c…` |

退出码一律以 `cmd > log 2>&1; echo $?` 读取，不用 `| tail` 兜（`|tail` 吃退出码判例）。

**如实登记一枚既有 flake（非本单，勿误记为回归）**：本会话八轮全套件实跑中，有一轮红在
`workspace-write-env.test.ts:764`「经 binder 的同路径并发调用同样不被串起来」
（`expected [ 'enter:a.md' ] to deeply equal [ 'enter:a.md', 'enter:a.md', 'exit:a.md' ]`）。
归因：该文件对 `product-stdio` 零引用（`grep -c` 计 **0**），其等待器是同文件
`:705` 的 `const settle = () => new Promise((resolve) => setTimeout(resolve, 20))`
——赌 20ms 墙钟够三条异步链跑到 `enter`。本机同期有另一会话在跑 cargo，
`load average 6.79`，20ms 不够即塌成一条。同文件单独连跑 **6/6 绿**，
全套件复跑 **5/5 绿（540/540）**，本单实现与该用例无因果路径。
属既有「异步前置不赌时长」判例的在案违例，本单按只做工单范围**不改它**，另票处理。

**未跑**：`pnpm -r build`／`pnpm lint`／`pnpm test` 仓级门与 Playwright（票面：只跑本包套件，
仓级归验收）；`cargo`（票面：同机另有 Rust 实现会话在跑 cargo，本单禁跑）。

### 4.4 sealed CJS 身份第六次重录

`product-stdio.ts` 一动，sealed CJS 即漂移；`product-main.test.ts` 的跨侧门当场红
（实测 `expected 546906 to be 547283`）。逐值重录两处：

| 面 | 旧 | 新 |
|---|---|---|
| `apps/desktop/src-tauri/pi-sidecar/route-manifest.json` | 546,906 ／ `36615e5b…` | **547,283 ／ `93f04a1c…`** |
| `apps/desktop/src-tauri/src/pi_loop_process.rs`（编译期真值表 ＋「零字节」「大写 SHA」两枚变异夹具的搜索串） | 同上 | 同上 |

`ACCEPTANCE.md` 中出现的旧值是**历史验收记录**（当时实测的读数），一概不改。

---

## 五 · 对 SPEC 措辞的同批订正

1. **§三.1**（票面点名）：补「内核先发事件、后查工具表」这条事实，并把投影入口的两支
   （闭集外 toolName 不投影不终结 ／ 实现层违约仍 fail-closed）写死；同时说明 wire 的
   `toolName` 是闭集类型、没有「模型叫了不存在的工具」的形状，显式回答由内核直接给模型。
   **顺带订正一处既有失真**：原文「只注册 read/glob/grep。edit/write/bash 从不构造」——
   `write` 自 `PI-WRITE-HOST-1` ⑤ 起在产品装配里**确实构造**（host-mediated）。改为按 dev／
   产品两线分述，`edit`/`delete`/`rename`/`bash` 才是两线都从不构造的那一族。此项超出票面
   点名的两处，但属同一句话内的两版真值，登记于 §六偏离 1。
2. **§九 六格 cell 6**（票面点名）：原文「改 `/case`、delete、bash、无效/跨容器路径均零
   effect、零物理路径泄漏**且有 terminal**」——`delete`/`bash` 这一族改后**不产生 terminal**。
   改为按「经已注册工具落到闸门/容器判定」与「闭集外的名字由内核直答」两族分述，并明写
   「叫一声 `bash` 就收到 terminal 的是 harness 缺陷，不记模型能力」。
3. **§十**：单测计数 531/17 → 540/17，注明净增 9 例的构成。回执清单补本票一行。

---

## 六 · 偏离与登记

1. **SPEC §三.1 的订正范围略宽于票面点名**：票面只说「§三.1 与六格 cell 6 措辞同批对齐」，
   我一并订正了同句中关于 `write` 是否构造的既有失真（见 §五.1）。理由：那是同一句话里的
   第二版真值，留着即违反不变量 5「契约先行、不留两版真值」，且与本票要澄清的「哪些名字
   模型叫了会得到 `Tool X not found`」是同一件事。**未**改动 §三.2／§三.3、未改 §九 其余五格。
2. **改了 Rust 文件（`pi_loop_process.rs`）**，与票面「不动 Rust」字面冲突。范围严格限于
   sealed CJS 身份的**登记值**（编译期真值表两处 ＋ 两枚变异夹具的搜索串 ＋ 注释里的历次
   漂移账），零逻辑、零签名、零控制流。依据是该处注释自己冻结的协议：「双方由
   `product-main.test.ts` 的跨侧门逐值锁死，**不许只改一边**」。只改 manifest 会让 Rust 侧
   `compiled_manifest_decodes_and_matches_the_frozen_truth_table` 必红，属明知留红。
   **本单未跑 cargo**（票面机器约束：同机另有 Rust 实现会话在跑），故这四处改动**未经编译验证**
   ——请验收在 `build:product-sidecar` 后跑一次 `cargo test --lib` 复核。
3. **宿主侧看不到未遂调用**。闭集外的 `tool_started` 不上 wire，宿主与 journal 因此没有
   「模型叫了一个不存在的工具」的可见面。这是票面裁定（「闭集外 `tool_execution_start` 不上
   wire」）＋ wire 不得变更的直接后果，不是静默降级：显式面在模型侧（内核的
   `Tool X not found`／`isError`），而那正是 SPEC §三.1 承诺的收信人。若日后希望宿主也看得见
   （例如给 GUI 一条「模型试了不存在的工具」的提示），须扩 wire 闭集，属另票。
4. **`tool_progress` 的未投影分支今日结构不可达**：内核只在 `executePreparedToolCall` 里发
   update，而那条路径只对**查得到**的工具跑。仍写了这一支并配反例，理由是「no orphan state」
   与投影入口不靠上游形状自保；三行成本，M7 证其有承重。
5. **既有「反例四」改瞄而非删除**。原 `unknownTool` 子例（cast 出 `toolName:'bash'` 的
   `tool_started`）改为 cast 出**同 tc 改名**（起手 `read`、收尾 `bash`）——那是该子例威胁模型里
   仍然成立的那一半（调用方在同一 tc 上说了两个名字），仍判 `upstream_event_unsupported`。
   describe 标题同步由「未知 kind / 未知 toolName」改为「未知 kind、非 record 输入与 cast 改名」。
   闭集外 toolName 的两支新判据另立一组，不与该组混写。
6. **`product-runtime.ts` 两段注释订正，零行为**：文件头第 4 条与 `tool_execution_start` 臂原写
   「product stdio 已冻结『不在投影闭集内即 upstream 违约』」，该句自本单起为假。改为陈述
   「闭集判定的唯一真源仍在状态机，自本票起分成两支」——runtime 照旧一件不吞、一件不判。

### [需架构拍板]（本单未碰，只登记）

无本单新增项。相关结转项见 `PI-HOST-JOURNAL-1.md`（②游标二元性、④`cost_usd` Disabled 臂）
与就绪图 `PI-HOST-CONCURRENCY-1` 行（pi host 并发/中断模型待 ADR 修订）。

---

## 七 · 移交（六格判读前必读）

- 六格 cell 6 的「delete/bash 拒绝面」自本单起**不产生 terminal**；判读时看的是
  「模型收到 `Tool X not found` 后是否改用 `write` 继续」，收到 terminal 反而是 harness 红。
- cell 3/4（write→回读）在模型中途叫错工具名时不再被打断——`PI-DUALROOT-CONTRACT-1`
  的裸相对路径判读因此不会再被本缺陷污染。
- 本单**未**扩工具闭集、未改 wire、未改 capability、未改 system prompt。若判读认为 prompt
  第五条点名 `edit`/`delete`/`rename` 反而抬高了模型复述这些名字的概率、值得改写措辞，
  那是独立裁定，本单按票面边界**停在此处**，不自行改 prompt。
