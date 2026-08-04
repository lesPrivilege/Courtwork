# PI-WRITE-HOST-1 · 开工序③ 实现回执（2026-08-04，纯 Rust，假 effect 打通四段账序）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ `PI-WRITE-HOST-1-RECON.md`／`-PREFLIGHT.md`
＋ `-STAGE2.md` §八 移交四项。基线 `claude/pi-write-host-1@32ad737`（开工序②）。

本阶段范围恰按 PREFLIGHT §三 开工序③：**`pump()` 的 `PacketPayload::HostRequest` 臂 ＋ 四段落账
状态机 ＋ 假 effect 注入座**。cap-std 真落盘、`TempFile::replace`、平台屏障属④；Node 装配与
`md-work-v1` prompt 属⑤；`/workspace` 回读属 `PI-WORKSPACE-READ-1`。本单一行不碰。

触碰面恰三文件：`apps/desktop/src-tauri/src/pi_loop.rs`、`pi_loop_protocol.rs`，以及本回执。
**`pi_loop_journal.rs` 一字未动**（禁区：观察② `fold()` 推进臂零触碰）；`pi_loop_protocol.rs`
的改动恰是两枚静态文案表（+35 行，**零删除**），wire 形状、codec 判据与 golden 全部零改。

## 一 · 本单新增了什么概念、为何非加不可

生产侧新增五枚概念，逐枚给出「非加不可」的理由：

| # | 概念 | 非加不可的理由 |
|---|---|---|
| 1 | `WorkspaceWritePlan` | 四段账的六个 payload 字段来自同一份请求。不立这一枚，六处各自从 `arguments` 取一遍，落账值与出包值就有六份可漂移的取值来源 |
| 2 | `WorkspaceWriteHost`（`probe`/`decide`/`perform`） | ③ 的定义就是「假 effect 打通序」。没有注入座，effect 只能硬编码——那是产品线上的假数据路径 |
| 3 | `WriteAuthorization` / `EffectOutcome` | 授权二态与 effect 三态是 ADR-022 六-C 的闭集；用 `bool`/`Option` 表达会让「denied 有 code」「uncertain 无 code」这两条结构性事实失去类型层担保 |
| 4 | `PiLoopHost.active_tool_call` | `host_request` 的 wire 恰四字段（`operationId/proposalHash/capability/arguments`），**没有 `toolCallId`**；四段账逐枚要它。本 leg 已 durable 的 `tool_started` 是它唯一的真源 |
| 5 | `HostFailureCode::message()` ＋ `HostDeniedCode::message()` | 出站 `denied|failed` 必须带 message。宿主自产、闭集穷举，体例逐字沿用同文件既有的 `TerminalFailureCode::message()`——不新造机制 |

**刻意不新增的三样**（复杂度节制）：

- `probe` 保持**不可失败**（`-> WriteDisposition`，非 `Result`）。③ 没有任何能让它失败的真件，
  预造 `Result` 等于造一条零证据的死分支；④ 接真 capability `Dir` 时再放宽签名并同批补反例。
- `uncertain` 的文案不另立常量，直取 `TerminalFailureCode::EffectUncertain.message()`——
  同一句话在 `host_result` 与 crash fold 的 `prompt_failed` 里各抄一份就会各自漂移。
- 不新增 `HostError` 变体、不新增 refusal mapper：四道门一律走既有 `fail_protocol(StateViolation)`
  （同 ready capability 漂移的既有形），编码失败走 `encode_or_fail` 复用同一枚出口。

## 二 · 四段账序（`serve_host_request`，`pi_loop.rs:1157`）

次序即语义，前一步不过就绝不走到后一步：

```
0.1 能力门      request.capability ∈ 本次握手真谈成的 self.capabilities
0.2 参数族门    只服务 workspace_write 的 Write 参数；exists|read_file|list 显式拒
0.3 tool call   active_tool_call.take()——一 tc 一 op，认领即消费
0.4 真件座门    write_host 缺席即显式拒（production 恒 None）
1   probe       在场判定 → created|overwritten
2   编码-先于-效果  encode_host_result(成功行) → OutboundLine 捏在手里
3   tool_proposed → decide → authorization_decided（denied 即在此收束，effect_started 不落）
4   二次 probe   动作已变 ⇒ effect_failed{state_changed}，零写
5   effect_started  第一次真实写入之前的最后一道 durable 屏障
6   perform     三态
7   effect_succeeded|failed|uncertain durable 之后才 write_encoded
```

第 7 步成功路发出的就是第 2 步验过的那一份字节（`OutboundLine` 原样搬运，不重编）。

### 本臂在产品线上今日结构性不可达（如实声明）

0.1 与 0.4 两道门今日各自独立地把它挡死：ready 握手恰 `['case_read']`（⑤ 才加
`workspace_write`），`write_host` 在 production 恒 `None`（④ 才装真件）。两枚
`#[cfg(test)]` seam（`grant_workspace_write` / `install_write_host`）只在测试里就位，
体例沿用 `Journal::inject_append_failure_from`——**production 没有 setter**。

## 三 · 落点

| 落点 | 内容 |
|---|---|
| `pi_loop_protocol.rs:161/188` | `HostDeniedCode::message()`（2 枚）、`HostFailureCode::message()`（13 枚） |
| `pi_loop.rs:382-495` | `WorkspaceWritePlan` / `WriteAuthorization` / `EffectOutcome` / `WorkspaceWriteHost` ＋ 四支出站结果构造器 ＋ `denied_code_on_wire` |
| `pi_loop.rs:527` | `active_tool_call` / `write_host` 两枚字段 |
| `pi_loop.rs:564/572` | 两枚 `#[cfg(test)]` seam（`install_write_host` / `grant_workspace_write`） |
| `pi_loop.rs:877` | `encode_or_fail`：`encode_host_result` 在 pump 里的落点，编不出来即显式落 `session_failed` 并回收 leg |
| `pi_loop.rs:1100` | AgentEvent 臂里 `active_tool_call` 的置位／清位（只认 `write`） |
| `pi_loop.rs:1119` | pump 的 `HostRequest` 臂（原 `_ => fail_protocol(StateViolation)` 兜底的一部分） |
| `pi_loop.rs:1157` | `serve_host_request` 四段账状态机 |
| `pi_loop.rs:1280/1289/1304/1325` | `effector` / `append_effect_record` / `settle_failed` / `settle_uncertain` |
| `pi_loop.rs:6324` | SafeToken 清账表 `operationId` 行的理由订正（见 §六.5） |
| `pi_loop.rs:6500+` | `ScriptedWriteHost`／`armed_host` 装置 ＋ 九枚新测试 |

## 四 · 红绿证

### 首红 BR-③1：`host_request` 掉进兜底（RECON §born-red 复用装置）

`32ad737` 上跑同一枚测试（未装 seam 的原形）：

```
panicked at src/pi_loop.rs: host_request 必须由本臂服务，而不是掉进兜底: Protocol(StateViolation)
```

绿形锁的不是「有几条记录」，而是四段账的**逐值**内容与次序：十枚记录的 `JournalType` 序列、
`tool_proposed`/`authorization_decided` 两枚 payload 逐字段、effect 六型全部挂同一
`requestId`＋`operationId`、出站 `host_result` 逐值、以及「正文一个字节都不进 journal」。

### 成对对照 M-③E：encode-before-append（唯一变量＝编码位置）

**担保边界，如实声明**：出站 write value 的三枚上界（`logicalPath ≤1024 非空`、
`contentSha256` 形状、`byteLength ≤131072`）与入站 `arguments` 的判据**逐一同源**，故在今日闭集下
「请求已 decode 成功」结构性蕴含「成功行编得出」——**不存在行为反例**。担保只能以
∀-future-codec 成对对照证，与 1R7 `codec-only future rule` 同形。

同树、同注入规则（`read_host_result_payload` 的 write value 上加一条只在 codec 里存在的
未来判据：`logicalPath == "未来规则.md"` ⇒ `InvalidSchema`），唯一变量＝`encode_host_result`
相对三枚 append 的位置：

| 臂 | 编码位置 | journal | 落盘记录 | `perform` | `host_result` |
|---|---|---|---|---|---|
| 实验（HEAD） | 三枚 append **之前** | 564 → **1243 B** | `session_started/user_prompted/agent_event/session_failed` | **0** | 0 |
| 对照 | effect **之后** | 564 → **2862 B** | ＋`tool_proposed/authorization_decided/effect_started/effect_succeeded` | **1** | 0 |

对照臂坐实「先落账后拒绝」真实可达（四段账全部 durable、假 effect 真的执行了一次），
实验臂坐实它被消灭。注入规则与两处改动跑完逐次还原，`pi_loop_protocol.rs` 复核
SHA 恒为 `cf3aa9aa…`、`pi_loop.rs` 恒为 `b290caf9…`（该次实验时的树）。

### 生产 mutation（`pi_loop.rs`，逐枚 `命中=1` 校验＋还原复核 SHA `4c5ae62b…`）

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M-③1 | 撤 0.1 能力门（条件恒 `false`） | `能力未谈成：实得 Process(UnexpectedEof)`——门一撤，未谈成的能力被照常服务，脚本 leg 当场读到 EOF |
| M-③2 | `active_tool_call.take()` → `.clone()`（认领不消费） | `one_tool_call_serves_at_most_one_operation` 红：第二枚 operation 被照常服务 |
| M-③3 | 撤第 4 步二次在场判定（`&& false`） | `write_arm_settles_…` 红于 `动作已变就必须零写` 的 `perform` 陷阱 |
| M-③4 | `settle_uncertain` 的 `reclaim_leg()` 删除 | `undurable_uncertain_terminates_the_leg_at_once` 红：leg 未终止 |
| M-③5 | `append_effect_record` 吞掉 append 失败（`let Ok(..) else { return Ok(()) }`） | `ToolProposed 落不住时 effect 必须恰 0 次`，left 1 / right 0 |
| M-③6 | 未获授权时不 return（`deny_code.filter(\|_\| false)`） | `write_arm_settles_…` 红于 `denied` 行的 `未获授权就不该走到 effect` |
| M-③7 | 发包移到终态 append **之前** | `终态没落住就不许发包`，left 1 / right 0 |

M-③5 与 M-③7 分工不同：前者判「屏障落不住就不许动手」，后者判「动手之后没落账就不许告诉对端」。
两层各有独立红证，不互相顶名。

### 票面第二项：`effect_started` append+sync 失败 ⇒ 零 effect

`counterexample_any_durable_barrier_failure_leaves_the_effect_at_zero` 把三枚屏障逐枚注入
（`tool_proposed` seq 4 / `authorization_decided` seq 5 / `effect_started` seq 6，走既有
`Journal::inject_append_failure_from` seam）：任一枚落不住，`perform` 恰 0 次、`host_result`
一枚不发、失败那一枚记录不留在盘上。**只测 `effect_started` 一枚是不够的**——前两枚落不住
却照样 effect，同样是「授权未 durable 就动手」，M-③5 的红正落在 `ToolProposed` 那一轮。

「effect 排在 durable 之后」另有一层直接读数：`ScriptedWriteHost::perform` 每次调用当刻把盘上
journal 的**完整字节**抄下来，测试解回记录类型序列断言它恰停在 `EffectStarted`。

### 票面第三项：`DanglingEffect` 的首份真数据

`dangling_effect_written_by_the_real_arm_folds_to_uncertain_and_closes_the_session`：盘上那枚
无收束的 `effect_started` 由**生产臂**写出（注入 seq 7 让 `effect_succeeded` 落不住），不是手工
种进去的。随后 `load_session` 的 crash fold 步骤 2 必须派生
`effect_uncertain{同一 toolCallId}` → `prompt_failed(effect_uncertain, retryable:false)` →
`session_failed`；逐值断言 `requestId`/`operationId`/`retryable`。最后以真 `start` 断言该
logical session 自此永久关闭（`SessionClosed`、`spawns == 0`）。

`seed_session` 与电池行数**未改**（`SessionShape::DanglingEffect` 及其手工种子自 1R7 起在册，
本单补的是「同一形状的真数据由生产码产生」这一层）。三道全局下限、recovery 族与效果域两道
族内守卫因此原值不动——不抬高是因为电池确实没长，不是漏抬。

### 票面第四项：list 结果的 framing 显式拒（移交②）

`counterexample_oversized_list_result_is_refused_by_framing_not_truncated`：条数恰
`MAX_LIST_ENTRIES=2000`、每枚条目名恰 `MAX_SEGMENT_BYTES=255` UTF-8 字节，**逐字段全部合法**；
取 U+0001（本包 SPEC 九点名的 encoded-packet worst case，1 字节编成 `\u0001` 六字符）后越
`MAX_PACKET_BYTES=1 MiB`。唯一出站入口以 `Protocol(PacketTooLarge)` **显式**拒，零静默截断。

两道补正让「红得准」立得住：

1. 逐枚断言拒绝理由恰是 `PacketTooLarge`——压成 `InvalidSchema` 说明红的是别的判据
   （②的五枚债行断言的正是 `InvalidSchema`，两族因此不互相顶名）；
2. 正向对照取同族、同字段上限、只把条数降到 512，解回来的条目数与每枚名字长度逐值不变——
   静默截断在这一枚上会当场现形。

**如实声明**：`list` 操作本身不由③ 的臂服务（属 `PI-WORKSPACE-READ-1`），故这枚反例住在
`encode_host_result` 这一层；臂上对应的另一半由 §四「四道门」里的「读操作未实装」行承担
——`workspace_read` 的 list 请求被**显式**拒，零 effect、零落账，不静默跳过。

### 计数

- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`：**185 passed / 0 failed / 1 ignored**
  （基线 176 passed / 1 ignored；净增九枚，全在 `pi_loop::tests`）。
- `cargo clippy --all-targets`：7 warnings，逐条归属 `src/lib.rs`（198/530/1552/1553/1559/1563/1565），
  **本单归属 0**（与②回执同一集合）。
- `rustfmt`：仅对 `pi_loop.rs`／`pi_loop_protocol.rs` 执行；`git diff` 的全部删除行恰为两处
  import 清单重排，**零行外溢**。
- diff：`pi_loop.rs` +1212/-13、`pi_loop_protocol.rs` +35/-0。

## 五 · 禁区遵守

- **观察②**：`pi_loop_journal.rs` 整文件一字未动（`git status` 只列两个文件），`fold()` 推进臂、
  游标、`turn_finished_follows` 零触碰。
- **`uncertain` 压扁**：`read_host_result_payload` 的「uncertain 只允许 workspace write」与
  binder 侧压成 `FileError('unknown')` 原样保留，本单零触碰。
- **capability 字面量零 `sed`**：`EXPECTED_CAPABILITIES` 仍恰 `[CaseRead]`；diff 里
  `CaseRead` 的**删除行恰 0**，33 枚既有种子逐字节原样，新增 3 枚是本单三枚新测试自己的
  ready 握手。未新增自由 `capability_mismatch` code。
- **wire schema 零改**：`pi_loop_protocol.rs` 的 35 行全是新增静态文案表，零删除、零 encode/decode
  改动；golden `product-wire-v1.jsonl` 与十九型 round-trip 全绿。
- **不加 edit/diff/CAS/promotion/bash/GUI**；未引 cap-std 任一件（`Cargo.toml`/lock 零触碰）；
  未碰 Node 侧、`package.json`、prompt 常量。
- **不跑仓级 pnpm 门**（属⑦）；每次 `cargo` 前 `pgrep -f "chrome-headless-shell|playwright"` 复核。

## 六 · 偏离与待追认

1. **0.1 能力门（`request.capability ∈ self.capabilities`）票面未点名**。理由：没有它，
   sidecar 今日就能以从未谈成的能力索取宿主 effect——属授权面 fail-closed 判定，不能等⑤。
   门读的是**本次握手实收**的 capability，不动 `EXPECTED_CAPABILITIES` 闭集本身。带 M-③1 红证。
2. **`decide` 进注入座（逐次授权二态 ＋ `denied` 出站路径）票面未点名**（票面只说「落三态」）。
   理由：不注入就只能硬编码 `Approved`，而 ADR-022 六-C 明禁「用 session always-allow 冒充产品
   授权」，核心不变量 3 同向；且 `AuthorizationDecided.code` 字段会成为结构性死字段。
   带 M-③6 红证。真实 decision driver（GUI 或 headless 验收注入）仍属⑤／验收票。
3. **第 4 步「授权后、effect 前二次在场判定 ⇒ `state_changed` 零写」票面未点名**，
   但 RECON §Rust effect 面逐字列明。stub 级实现（真 capability `Dir` 属④）。带 M-③3 红证。
4. **`settle_uncertain` 在 `effect_uncertain` 落不住时立即 `reclaim_leg()`**，票面未点名，
   ADR-022 六-C 明文（「若该记录自身无法 durable，宿主立即终止 sidecar leg」）。带 M-③4 红证。
5. **SafeToken 清账表 `operationId` 行的理由订正**。原文「本票 ready capability 恰
   `['case_read']`、宿主一枚都不生成」在③ 之后已成假话——本臂真的生成 `host_result`。
   改为如实说明：出站同一枚 operationId 由③ 的 encode-before-effect 结构性前置于 journal、
   effect 与发包。判据形状与计数冻结（4 行 host 输入 ＋ 5 行理由）未动。
6. **`probe` 保持不可失败**（见 §一）。④ 放宽签名时须同批补 probe 失败分支的反例；
   本单不预造。
7. **effect 不 publish `HostEvent`**。`HostEvent` 闭集未加变体——工具卡投影属 GUI 票，
   本阶段的账本真源恰是 journal。
8. **`probe` 被调用两次（授权前＋effect 前）是本臂的固定形**，`ScriptedWriteHost` 因此按调用
   次序给答案；born-red 绿形对 `(probes, decisions, performs) == (2, 1, 1)` 逐值断言，
   任何一侧被删都当场红。

## 七 · 移交④（开工前必读）

1. **真件只需换 `WorkspaceWriteHost` 的三枚方法**，臂本身不必再动：`probe` 换 capability `Dir`
   的逐段 `open_dir_nofollow` 在场判定（签名同批放宽为 `Result`，并补它自己的失败反例），
   `perform` 换 `TempFile` 私有同目录写入＋`replace`＋平台屏障＋`sync_directory`。
   `decide` 留给⑤／验收的 decision driver。production 的 `write_host` 从 `None` 换成真件那一刻，
   0.4 门就从「结构性挡死」退回「缺件才挡」——**0.1 能力门是那之后唯一的产品闸**，
   ⑤ 加 `workspace_write` 时必须同批确认它仍在。
2. **`effect_succeeded` 的发布条件由④ 收紧**：今日 `perform` 回 `Succeeded` 即落账；ADR-022 六-C
   要求它只在 `TempFile::replace` ＋平台屏障 ＋ journal 屏障**全部完成**之后发布。③ 的
   `EffectOutcome::Succeeded` 语义因此是「④ 的全部屏障已过」，不是「rename 返回了 0」。
3. **`uncertain` 的两条禁令随④ 落到真件上**：既不能声称回滚，也不得复用授权自动重试。
   ③ 已把「落账成功才可回 uncertain」「落不住即终止 leg」两条做成机器判据。
4. **[需架构拍板]（②移交③ 原样上浮，本单仍不自裁）**：journal 侧 `logicalPath` 用
   `read_string`（允许空串），wire 侧 `read_logical_path` 用 `read_non_empty_string`——非空判据
   两侧不同源。③ 落地后这条的结构性挡法更明确：`tool_proposed`/`effect_started` 的
   `logicalPath` 恒取自已过 wire 判据的请求，且成功行在任何 append 之前就编过一次，故空串
   永远走不到 append。收紧 journal codec 属改既有解码语义（可能拒既有档），仍不自裁。
5. **物理根仍未出现在本臂**：`WorkspaceWritePlan` 只带逻辑路径。④ 引入
   `app_data_dir()/pi-workspaces/<containerId>/<sessionId>/` 时，物理坐标只许活在真件内部，
   不得回流进 plan、journal、`host_result` 或错误文案（本模块红线 2）。
