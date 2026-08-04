# PI-WRITE-HOST-1 · 侦察落痕（2026-08-04，双员实测于 `3908333`，实现前唯一测绘真源）

契约召回与代码测绘各一员独立完成；本文供实现与后继会话直接消费，坐标失效以现读为准。开工序循 PREFLIGHT §三：②五前向债前置门＋电池/D1 增行（纯 Rust）→③假 effect 打通 `HostRequest` 臂四段落账→④cap-std 真落盘＋TempFile replace＋屏障→⑤Node 装配五处＋prompt 换 `md-work-v1`→⑥双端 golden 与 crash/symlink/并发矩阵→⑦全量门（`build:product-sidecar` 先于 cargo）。

## TS 侧装配图（proof port 已备，只装配不重写门）

- `workspace-write-env.ts` 出四件：`bindWorkspaceWriteTool`（已固定 `executionMode:'sequential'`、`prepareArguments: gateRawWriteArguments`）、`createWorkspaceWriteEnv`（invocation-scoped）、`WorkspaceWritePort`、`WorkspaceWriteRegistry`。八字段 `WorkspaceWriteRequest` 与 `product-stdio.ts` 的 `ReservedHostRequest` 逐字同构——零翻译接线。
- 主落点 `product-runtime.ts capabilities()`：`createReadOnlyTools` 后分叉追加 write binder——**不得走既有 `tools.map` 的 `{env}` 注入**（case env 会覆盖 workspace env）。
- 同批必改闭集：`tool-policy.ts` 的 `READ_ONLY_TOOL_NAMES`（现 `['read','grep','glob']`）与 `DISABLED_TOOL_NAMES`（含 `'write'`）两表；`tool-policy.test.ts` 「两表不相交」自洽绿证将翻红＝有效首红。`PRODUCT_CAPABILITIES = ['case_read']` 须加 `'workspace_write'`（`product-stdio.ts` 的 `reserveHostOperation` 以 includes 闸）。
- `deliverHostResult` 现为显式抛出——实现为 port promise resolve。port 实现体＝`reserveHostOperation`＋`sendReservedHostRequest` 两段式；`writeOperationSent` 锁「一 tc 一 op」。
- **唯一新缝**：raw→public toolCallId 映射真源在 stdio 内部 `toolCalls` 表，runtime 拿不到——须 stdio 新增只读查询面或 runtime 镜像 `tool_started`；`workspace-write-env.ts` 「查不到即拒、绝不代分配」不可放宽。
- `index.ts` 按需扩导出（proof 票刻意未导）。
- prompt：`PRODUCT_PROMPT_ID='case-read-v1'`→`'md-work-v1'`，`PRODUCT_SYSTEM_PROMPT` 换 ADR-022 六-0 六条（①实读事实②/case 只读、/workspace 过程草稿③`.md` 只覆盖式 write④写前读、写后回读并报逻辑路径⑤无 edit/delete/rename/promotion/bash⑥权限只认 gate 与 journal），UTF-8 ≤2048 bytes，snapshot/byte gate 锁；`product-runtime.test.ts` exact snapshot 与「不含 write 说明」断言翻转＝首红。prompt 非安全边界（ADR-017 窄修订）。
- WRITE-PROOF 验收遗留「basename 恰为 `.md`」：ADR-022 六-B.2 明文非法，proof port 现行放行与 ADR 相悖——装配时按 ADR 补门，无需另拍板。
- `glob/grep` 双根显示 `/case/...`／`/workspace/...` 不得 `../workspace`；`/workspace` 回读属 WORKSPACE-READ-1 不做。工具闭集恰 `read/glob/grep/write`。

## wire 与五枚前向债

双端 wire 已实现零 schema 变更：TS `product-protocol.ts` 与 Rust `pi_loop_protocol.rs` 的 `read_host_request_payload`/`read_host_result_payload`/`read_list_entry`/`read_logical_path`/`write_host_result` 对位在场。**五债＝`read_host_result_payload` 三字段族＋`read_list_entry`＋`read_logical_path`**（1R3 D1 表①登记原文：WRITE-HOST 开工时连同前置门一并补）。偿形循 1R6：出站 `host_result` 走 `encode_outbound_line` 先编码后 effect/append（结构性覆盖）；违规电池与「Err ⇒ 副作用恰零」普适探针扩至五字段；D1 `bounded_input_manifest()` 增行带行为反例（`BoundedInput{input,site,judgments,code,probe}`，现四种 probe 全入站，须新增出站第五形态）。闭集门同批扩：`violation_battery()`（现 152 行/15 字段）加 effect 域 drive；journal 十九型 round-trip 闭集已含 effect 六型（`EffectStarted/Succeeded/Failed/Uncertain`），本票首次真实生成、须补真值样本；protocol golden 已覆盖 host_request/host_result。

## Rust effect 面

- **唯一插入点：`pump()` 的 `_ => fail_protocol(StateViolation)` 兜底**——`PacketPayload::HostRequest` 今日落此。新臂与 `AgentEvent` 臂同构：request_id 校验→门→encode-before-effect→`journal.append`（内含 `write_staged` 的 write_all+sync_all）→执行 effect→落三态→`write_encoded` 发包。四段账序 `ToolProposed→AuthorizationDecided→EffectStarted→Succeeded|Failed|Uncertain`；`effect_started` append+sync 失败则零 temp/replace（票面判据）。
- durable-before-effect（ADR-022 六-C）：授权与 proposalHash 持久 sync 后才 effect 准备；`created/overwritten` 授权前以 capability Dir 查在场并同笔落 `tool_proposed`，effect 前再查、已变则 `state_changed` 零写；`effect_succeeded` 只在 `TempFile::replace`＋平台屏障＋journal 屏障全完成后发布；replace 后无法自证→`effect_uncertain`→terminal failed retryable:false→session_failed，不自动重试；journal 只记 logical path/hash/byteLength/outcome。物理根 `app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`（`container_dir` 命名先例；`ensure_runtime_cwd` 禁 cwd 落 workspace）。
- 不可回退：R6 `prompt()` 编码→append→认领→发同一份字节范式；R7 读/计划纯相＋`PlannedSession::apply`、`stage/claim/write_staged` 三分；`DanglingEffect` crash fold（`effect_started` 无收束→派生 `EffectUncertain`）本票首次带真数据；单写者锁与 `sync_directory`（含计数面）。
- Cargo：cap-std 三件 `=4.0.2` 未入（现依赖仅 tauri/serde/keyring/reqwest/tokio/sha2/libc）；按 PREFLIGHT 修订「libc 只限 dirfd/no-follow/`*at`」注释不默默扩面。三项一手风险各带反例门：逐段下降自研义务（`open_dir_nofollow` 只管末段）、swap-race 门结构性必需（macOS 无内核 beneath）、TempFile 权限钉死（`new_anonymous` macOS 行为未实测须实证）。ambient 静态门种子：`open_ambient_dir`/`open_parent_dir`/**`from_std_file`（无参静默口）**/`cap_tempfile::TempDir::new`/`tempdir(ambient_authority)`/`ambient_authority()` 系/全部 `std::fs` mutation。
- 退出证据矩阵（票面原文循就绪图行）：prompt snapshot/byte gate 与四工具 exact set mutation 红证；两端路径 golden 一致；非 `.md` Node 零 op、Rust 畸形 request 零 effect；root 内/外 symlink 父段、final symlink、swap race、junction/reparse、cross-container 全拒零 effect；ambient/`create_dir_all`/canonicalize 授权/`std::fs` mutation/remove-then-rename 零出现；并发 reader 只见 old/new；kill 覆盖 temp sync、replace、parent/journal 屏障；无 delete-share 占用保旧文件；宽权限 temp 与 fallback mutation 必红；unsupported FS effect 前拒。

## born-red 复用装置

能力握手（`EXPECTED_CAPABILITIES` 现 `[CaseRead]`；`harness/ready/ScriptedSpawner`）；effect 臂缺失（scripted `host_request`→现行兜底红）；durable 序（`Journal::inject_append_failure_from` seam）；崩溃窗（`SessionShape::DanglingEffect`＋`seed_session`＋`PARTIAL_TAIL`）；TS 接线（`product-runtime.test.ts`「host_request 全程为零」翻转；`product-stdio.test.ts` R4 reserve/send 真值）；工具闭集（`tool-policy.test.ts` 自洽证）。

## 意外与禁区

1. capability 字面量 33 处测试种子逐枚复核不得批量 sed；两枚既有 drift 反例在新期望集下仍为漂移可保留；不新增自由 `capability_mismatch` code。
2. `uncertain` 只许 workspace_write；binder 把 uncertain 压成 `FileError('unknown')` 属有意设计（账本真源在 journal），勿修。
3. **观察②暂缓（`3908333` 明令）**：`fold()` 推进臂不得改挂 `AgentEvent(TurnFinished)`——与 R7 `plan_turn_usage_repair`（崩在两笔之间）语义相交未核清；effect 落账不得顺手动 fold 游标。
4. 首版能力边界不变：12 turns、prompt/workspace text 各 131,072 bytes；已知边界五（symlink 不跟随）、七（2000/200 上限显式告知）继续成立。
