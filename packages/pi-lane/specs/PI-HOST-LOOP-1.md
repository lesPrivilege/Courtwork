# PI-HOST-LOOP-1 · Route A 产品进程、Rust 生命周期与耐久 loop journal

状态：**待 Fable 实现**

角色：Fable 是实现会话；Sonnet 只可承担本票内只读源码盘点、上游核对、机械测试/证据整理。
同票实现不得自验收；完成后由全新 Codex 会话在独立 clean worktree 验收。

架构锚：`main@774aae6`（R5 no-ff 合入后，Route A 裁定已落）

## 一、权威、依赖与交付边界

权威按顺序读取：

1. 根 `CLAUDE.md`、`AGENTS.md`；
2. `docs/status/current.md`（能力状态不因本票开工而变化）；
3. `docs/architecture/implementation-readiness.md` 的 `PI-HOST-LOOP-1` 行；
4. `docs/decisions/ADR-022-pi-lane.md` 六-A、六-B、六-E；
5. `packages/pi-lane/SPEC.md` 与 `ACCEPTANCE.md`；
6. 本冻结件。

依赖已满足：

- `PI-CODE-STDIO-1R2` 已独立放行并清账；
- `PI-SIDECAR-DIST-1R5` exact target `6cdb9ba` 已由独立验收 `0b0d985` PASS，并以
  `5aef222` no-ff 合入；
- ADR-022 已裁 `routeId:"node22-runtime-sealed-cjs-v1"` 为现行 default。

本票只交付“真实 pi + `/case` 只读 + Route A verified spawn + Rust durable lifecycle”：

- Node 产品 entry/runtime，只注册上游 read/glob/grep；
- Rust 管理 verified Node + sealed CJS、bootstrap/prompt/cancel/shutdown、严格 wire、crash/restart；
- app-data 单一 loop journal、replay、session 累计预算和显式 resume；
- headless 集成 driver 与机器门。

它**不**交付 workspace write、授权/effect 执行、`md-work-v1`、workspace read-back、GUI/Tauri
invoke API、debug DMG 或公开发行。Host PASS 也只解锁 `PI-WRITE-HOST-1`，不能称基础通用
Markdown agent 已跑通。

## 二、八项架构补拍

### 1. `/case` 继续走 bootstrap 内存例外，不扩 host-request wire

ADR-022 六-A 已冻结：Rust 用 `grantId` 解析物理案件根，并只在首枚 bootstrap 的
`caseRoot` 字段把绝对路径交给 sidecar；provider key 同理只在
`provider.apiKey`。两者不得进入 argv、环境、stdout、stderr、journal、错误或诊断。

因此本票**不改** `product-protocol.ts` / `product-stdio.ts`，也不新增 `case_read`
`host_request`。现行 `host_request` 的 read 分支仍只属于后票 `/workspace`。产品 case env
在 Node 内直接以 bootstrap `caseRoot` 做只读访问，但其全部可观察投影必须虚拟化：

- `cwd` 恰为 `/case`；
- 模型参数只接现行相对路径 grammar、`/case` 或 `/case/<relative>`；`/workspace`、其他绝对根、
  `..`、空段、backslash、drive/UNC、控制字符、保留名与 symlink/reparse traversal 全拒；
- `FileInfo.path`、glob/grep 命中、工具结果和安全错误只出现 `/case` 或 `/case/...`；
- 物理 root 只活在 env 闭包，不进入对象属性、序列化、错误 message/cause 或 tool update；
- `ready.capabilities` 本票恰为 `['case_read']`；read/glob/grep 不申请 operation、不开
  `host_request`，write/bash/edit 工具不存在。

`scoped-env.ts` / `authorized-root.ts` 是 dev 形态且会投影物理路径，只可读作反例和底层
no-follow 手法；产品不得直接把其返回对象转售给模型。`tools.ts` 的上游工具形态只读复用，
不改模型工具 schema 或自行复制 read/glob/grep。为闭合现行工具的相对路径输出，本票窄改
`createReadOnlyTools()`：

- 新增唯一可选调用形态 `createReadOnlyTools({logicalRoot:'/case'})`，无参调用的 dev 行为与
  可观察输出逐字保持不变；
- read binder 保持上游 `name/label/description/parameters`（schema 同一对象），先用本次
  product env 把 path 归一成 `/case[/...]`，再只调用一次原版 `createReadTool().execute`；
  因而上游截断提示中的 path 也只能是逻辑绝对路径；
- glob/grep 只把既有相对命中投影成 `/case[/...]`，参数 schema、扫描/截断上限、正则与遍历
  逻辑不变。

撤掉 binder、改回相对命中、改变上游 schema identity 或双调 upstream 任一项须有红证。本票
对同时受同一用户控制的案件目录只承诺每次调用观察到的 symlink/reparse point 均拒，不宣称
Node 直读已消除并发路径替换 TOCTOU，也不据此把 `process/none` 升成 OS confinement。

### 2. 产品 provider 与临时 system prompt

产品 runtime 直接使用 pi-ai 0.82.1 的 DeepSeek provider/model catalog。key 只取 bootstrap
内存值，并显式放进本次 `streamSimple` options；不得写 `process.env`、不得调用 dev
`createDeepSeekLane()`、不得接受 endpoint/header/provider fallback。modelId 必须与 bootstrap
值及 journal 首记录一致。Rust 产品 Host 只消费 Keychain 中由用户显式保存的
`StoredCredential::Pasted` 或 `StoredCredential::Environment{name}`；后者可按既有
`active_secret()` 当场解析用户具名环境变量，但不得在没有这条存档时自动回落
`DEEPSEEK_API_KEY` 或扫描其他配置。无存档时即使固定环境变量存在，也须在 journal/spawn 前
保持未配置；解析后的 key 仍只进入 bootstrap 内存，child 环境继续严格为空。

本票临时 prompt id 为 `case-read-v1`，字节恰为以下四行以 LF 相连、末尾无 LF：

```text
你是一名只读文档助手，案件材料只在虚拟根 /case。
可用工具只有 read、glob、grep；回答前须实际读取，读不到或结果被截断就明确说明。
你不能修改、新建、删除文件，也不能执行命令或声称已经完成这些动作。
引用材料时使用 /case 开头的逻辑路径；不得猜测、回显或索要任何物理路径与凭证。
```

实现须锁 exact snapshot 和 ≤2,048 UTF-8 bytes。`PI-WRITE-HOST-1` 才把它替换成
`md-work-v1`；不得在本票提前加 write 说明或垂类提示。

产品 `Agent` 从本票起显式固定 `toolExecution:'sequential'`，并以同一 turn 两枚只读 tool call
的真实 characterization 证明 callback 不重叠；不得依赖上游 0.82.1 的 `parallel` 缺省。
每 leg 恰创建一枚 Agent，同 leg 的后续 prompt 保留该 Agent 的 messages；只有新 leg 创建空
messages 的新 Agent，并以第二 prompt/新 leg 对照锁死。`PI-WRITE-HOST-1` 只保持该 Agent 值，
并另外给 write binder 固定 `executionMode:'sequential'`。

真实 provider 不作为本票 hard gate 的随机裁判。`product-runtime.ts` 提供 crate/package 内部
factory seam，让测试注入 scripted `streamSimple`；production `product-main.ts` 只组合 pi-ai
DeepSeek catalog/model 与真实 `streamSimple`，不从 argv/env/wire 选择 provider。定向测试用
esbuild 从同一 runtime factory 生成临时 control CJS，在冻结官方 Node 22 下确定性逼出
read→tool result→terminal；metafile 与 bundle canary 必须证明 control provider 未进入
production CJS。production sealed CJS 另以 dummy in-memory key 真跑
bootstrap→ready→shutdown，零网络请求。

维护者显式提供真实 DeepSeek key/model 时可另跑 case-read external smoke；缺 key/network 或
模型未调用工具只记 `external-smoke blocked/failed`，不冒充 deterministic harness 失败，也不
阻断本票 PASS。真实甜点模型是否被 harness 阻塞由后续 `PI-BASE-HEADLESS-ACCEPT` 统一裁。

### 3. loop journal envelope 与十九种 payload

物理路径仍是
`app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl`。每行 envelope 顶层恰含：

`{schemaVersion:1,eventId,seq,containerId,sessionId,leg,requestId,operationId?,type,recordedAt,payload}`。

共同规则：

- `seq` 从 1 起跨 leg 连续；`eventId` 恰为 `event_<seq十进制>`，只在本 session 唯一；
- `recordedAt` 是非负 safe integer Unix epoch milliseconds，按 journal 次序非递减；
- 每层 record 都拒额外/重复 key；字符串必须 well-formed，数值沿 product codec 的 safe/finite
  纪律；
- `operationId` 只在 `tool_proposed | authorization_decided | effect_started |
  effect_succeeded | effect_failed | effect_uncertain` 出现，其余 envelope 必须没有该 key；
- session 级事件 `requestId:null`；prompt/turn/agent/effect 事件回对应 request；
- payload 不许自由 `JsonValue`、raw pi event、OS error、stderr、apiKey 或物理路径。

十九类 payload 精确为：

| type | payload 闭集 |
|---|---|
| `session_started` | `{routeId:'node22-runtime-sealed-cjs-v1',routeManifestSha256,nodeVersion:'22.23.1',targetTriple:'aarch64-apple-darwin'|'x86_64-apple-darwin',grantId,caseRoot:'/case',promptId:'case-read-v1',provider:{id:'deepseek',modelId},limits:{maxTurns,maxUsd},capabilities:['case_read']}`；`routeManifestSha256` 恰为 Rust 对已先验证与编译期 expected bytes byte-identical 的 runtime route-manifest **原始 bytes** 重算所得小写 SHA-256，不接受调用方、自报或旧值 |
| `session_resumed` | `{startedEventId:'event_1',previousLeg,priorObservedTurns,priorTurns,priorUsd,messageContext:'empty'}`；`previousLeg===leg-1`，各 prior 值必须由本 journal fold |
| `user_prompted` | 复用 `{text}`；trim 后非空，UTF-8 ≤131,072 bytes；这是本地 UI replay 的明文真值，不另存 prompt hash 副本 |
| `agent_event` | 直接复用 `AgentProjectionEvent` 闭集，不包 raw upstream event |
| `tool_proposed` | `{toolCallId,toolName:'write',capability:'workspace_write',logicalPath,proposalHash,contentSha256,byteLength,action:'created'|'overwritten'}` |
| `authorization_decided` | `{toolCallId,decision:'approved'|'denied',code:null|'user_denied'|'policy_denied'}`；approved↔null，denied↔非 null |
| `effect_started` | `{toolCallId,logicalPath,proposalHash,action:'created'|'overwritten',contentSha256,byteLength}` |
| `effect_succeeded` | `{toolCallId,logicalPath,disposition:'created'|'overwritten',contentSha256,byteLength}` |
| `effect_failed` | `{toolCallId,code}`；code 只收 ADR-022 `HostFailedError` 闭集，不落自由 message |
| `effect_uncertain` | `{toolCallId,code:'durability_unknown'}` |
| `turn_usage_recorded` | `{turn,countedTowardTurnLimit,usage,stopReason}`，逐值等于同 request 已落的 `turn_finished`；turn 是 observed ordinal |
| `prompt_completed` | `{status:'completed',budget}` |
| `prompt_failed` | `{status:'failed',error:{code,message,retryable},budget}`；message 只能来自 product stdio 固定/限幅/脱敏终态 |
| `prompt_canceled` | `{status:'canceled',reason:'user'|'host',budget}` |
| `prompt_budget_stopped` | `{status:'budget_stopped',budget}` |
| `session_completed` | `{reason:'host_shutdown'}` |
| `session_budget_stopped` | `{promptEventId,budget}`；指同 request 唯一 `prompt_budget_stopped` |
| `session_failed` | `{cause:{kind:'prompt',promptEventId}}` 或 `{cause:{kind:'protocol',code:ProtocolErrorCode}}` 或 `{cause:{kind:'runtime',code:'product_sidecar_error'|'unexpected_eof'|'nonzero_exit'|'signal'|'stderr_limit'|'lifecycle_timeout'}}` |
| `session_interrupted` | `{reason:'sidecar_ended'|'lifecycle_timeout',costCoverage:'known'|'unknown'}`；不落 signal/exit/stderr 原文 |

本票真实生成 1–4、11–19；5–10 只实现 closed decoder/replay/fold fixture，真实 effect 由
`PI-WRITE-HOST-1` 首次激活。不能因“尚未发 effect”把其 payload 留成自由 JSON。

事件顺序：

- fresh 在 secret/root/route preflight 通过后、spawn 前 durable 落 `session_started`；
- resume 在全部 journal/fold/drift 门通过后、spawn 前 durable 落 `session_resumed`；
- `user_prompted` durable 后才发 prompt；
- 每枚 outward `agent_event` 先落同义 journal；`turn_finished` 还须随后 durable 落
  `turn_usage_recorded`，两笔都 sync 后才发布；
- prompt terminal 先落唯一 prompt terminal；按 ADR 映射需要 session terminal 时再落第二笔，
  两笔都完成后才向调用者发布最终投影。

crash replay 只有一类半对可确定性补写：若 journal 最后一条完整 LF record 恰为合法
`agent_event(kind:'turn_finished')`，且尚无其同 request/turn 的 `turn_usage_recorded`，恢复须从
该已 durable payload 逐值生成唯一 usage row，以新 seq/eventId、同 leg/requestId、
非递减 recordedAt append+sync 后才进入其余 crash fold。缺口不在尾端、已有重复或不匹配 usage、
terminal 已在其后，均不是 partial-tail，整 journal quarantine；不得忽略该回合、重问 provider
或从 session 计数反推。

Host 收到 schema 合法但不等于 `['case_read']` 的 ready 时，须在首 prompt 前落
`session_failed {cause:{kind:'protocol',code:'state_violation'}}` 并回收 leg；不得新增自由
`capability_mismatch` code，也不得拿 spawn 前的 expected capability 洗白实收漂移。

Rust crash fold 自造 `prompt_failed` 时，七枚 `TerminalFailureCode` 文案必须与 TS 唯一表逐字
相同：

| code | message |
|---|---|
| `provider_error` | `provider 调用失败，本轮未能完成` |
| `host_error` | `宿主操作失败，本轮未能完成` |
| `budget_unknown` | `已启用金额限额，但存在费用未知的回合` |
| `effect_uncertain` | `目标可能已是完整新版本，落盘无法证明` |
| `upstream_event_unsupported` | `上游事件序列不在投影闭集内` |
| `invalid_state` | `状态机收到不合法的状态转移` |
| `unknown` | `未归类的失败` |

共享 golden 必须含这七格；Rust 不得从退出、stderr 或 OS error 拼 message。进程异常也不直接
等于 `session_failed.runtime`：有 active prompt 时先按 ADR crash fold 取 prompt/budget/effect
终态；安全 open leg 落 `session_interrupted`；只有无可归因 prompt 的不可恢复 runtime fault
才使用对应 runtime cause。

### 4. Route A manifest 是编译期 expected-side

唯一跟踪真源为
`apps/desktop/src-tauri/pi-sidecar/route-manifest.json`。Rust 以 `include_bytes!` 同义方式把
该文件 bytes 编进 host binary；运行时 resource manifest 必须先与编译 bytes byte-identical，
再 closed-decode。不得从 runtime/CJS 实物重算一份 manifest 后把自报值当 expected。
本节是 **route-pair manifest**；`PI-DEBUG-BUILD-1` 后续另冻的是 `.app`/DMG build-evidence
manifest schema，后者不得改写或替代本 manifest。

manifest 顶层恰含
`schemaVersion/routeId/nodeVersion/useCodeCache/bundle/targets`：

- `schemaVersion:1`、`routeId:'node22-runtime-sealed-cjs-v1'`、
  `nodeVersion:'22.23.1'`、`useCodeCache:false`；
- `bundle` 恰含
  `{resourceRelativePath:'pi-sidecar/sidecar.cjs',bytes,sha256}`；
- `targets` 恰两行并按 `targetTriple` UTF-8 升序，每行恰含
  `{targetTriple,machoArch,sourceArchive,runtime}`；
- `sourceArchive` 恰含 `{filename,bytes,sha256}`；
- `runtime` 恰含 `{externalBinBasename:'pi-sidecar',bytes,sha256}`；
- bytes 都是正 safe integer，SHA 都是小写 64 hex；targets 缺/多/重复/乱序均拒。

两 target 的冻结 source/runtime 真值：

| target | macho | archive filename / bytes / SHA-256 | runtime bytes / SHA-256 |
|---|---|---|---|
| `aarch64-apple-darwin` | `arm64` | `node-v22.23.1-darwin-arm64.tar.gz` / `50,067,502` / `ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953` | `112,928,848` / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d` |
| `x86_64-apple-darwin` | `x86_64` | `node-v22.23.1-darwin-x64.tar.gz` / `51,245,086` / `b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81` | `115,447,952` / `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b` |

bundle bytes/SHA 由本票 exact product entry 以 esbuild 0.28.1、`platform:'node'`、
`target:'node22'`、`format:'cjs'`、minify、零 sourcemap/code-cache 构建两次且 byte-identical
后得到；实现提交中的 source manifest 必须写具体正字节与 SHA，`0/null/TODO/placeholder`
一律拒。

生成根 `packages/pi-lane/dist/product-sidecar/` 是 ignored immutable snapshot，恰三件：

- `pi-sidecar-aarch64-apple-darwin`
- `pi-sidecar-x86_64-apple-darwin`
- `sidecar.cjs`

生成器先在 sibling `dist/.product-sidecar.stage-<SafeToken>` 验证双 archive 的冻结 name/
bytes/SHA、downloaded SHASUMS、tar、Node version 与 Mach-O，再写双 runtime 和 CJS；逐文件
sync、stage dir sync、manifest↔stage 重验后，正式根不存在才单次 rename + parent sync。
正式根已存在时只接受 exact inventory 且三件与本轮 stage byte-identical；否则硬失败，不原地
覆盖。更换 source 必须显式 clean snapshot。普通 `pnpm -r build` 不下载 Node、不偷偷生成或
覆盖 snapshot；独占 `build:product-sidecar` 才执行该动作。

Tauri config 的冻结映射：

- `bundle.externalBin` base：
  `../../../packages/pi-lane/dist/product-sidecar/pi-sidecar`；
- resource map：
  `../../../packages/pi-lane/dist/product-sidecar/sidecar.cjs`
  → `pi-sidecar/sidecar.cjs`；
- source manifest
  `pi-sidecar/route-manifest.json`
  → `pi-sidecar/route-manifest.json`。

packaged runtime 只从 current executable sibling `pi-sidecar` 解析；CJS/manifest 只从
Tauri `resource_dir()/pi-sidecar/` 解析。测试/headless locator 可注入临时 app-layout，
production 零本机 Node、PATH、repo、fixture 或 SEA fallback。本票只验证配置、locator 与
headless app-layout；真实 Tauri `.app` 的 nested signing/entitlements/inventory 仍由
`PI-DEBUG-BUILD-1` 支付，不能借本票宣布可发行。

“extra” 的闭集按位置判断：resource `pi-sidecar/` 恰含 route manifest 与 `sidecar.cjs`；
current executable sibling 目录可以含主程序等其他包内文件，但不得出现第二枚
`pi-sidecar-*` / route-prefixed sidecar 候选。不得把整个 `Contents/MacOS` 误判为两件闭集。

### 5. child 环境、deadline 与回收

- `env_clear()`；child env 严格为空。未来 proxy/CA 需求另票，不能留“必要变量”口子；
- argv 恰 `[verifiedRuntimePath, verifiedSidecarCjsPath]`，无其他 flag；
- cwd 恰为新建的 `app_data_dir()/pi-loop-runtime`，目录 mode 为 `0700`；root 与各级 parent
  都须是 regular directory、非 symlink，失败一律 pre-spawn。cwd 不得是 case/workspace/resource；
- stderr 每 leg 最多 65,536 bytes；原文只活在受限内存/test seam，不写 journal/log/error/UI。
  超限为 `stderr_limit` 并杀 leg；对外只给 byte count/hash 与固定 code；
- 每枚 host→child 完整 packet 的 write+flush 以 5,000 ms 为界；超时按
  `lifecycle_timeout` 收束。活动 prompt/provider stream **本体**不设总时限，stdout reader
  在该区间持续等事件；除这一处明确例外，全部 child I/O 与 lifecycle wait 都必须有界：
  bootstrap→ready 30,000 ms，cancel→prompt terminal 15,000 ms，
  idle shutdown→shutdown terminal 15,000 ms，fatal/shutdown terminal→EOF+exit 15,000 ms；
  违例先 SIGTERM、grace 5,000 ms，再 SIGKILL、kill-confirm 5,000 ms；
- 任一 timeout/EOF/nonzero/signal/runtime fault 先按已 durable journal 做 crash fold，再停止
  outward publish；kill-confirm 失败也必须具名。SIGTERM 必须由既有
  `libc::kill(pid,SIGTERM)` 完成；`std::process::Child::kill()` 只可用于 SIGKILL，不得用外部
  `/bin/kill` 或新增 spawn。

### 6. quarantine 实物

只有最后一条**未以 LF 结束**的 partial bytes 可截到前一枚 durable LF，并 sync file + parent。
已 LF 的坏 JSON/schema/seq/identity/terminal 次序一律把整份原 journal原子 rename 到：

`app_data_dir()/pi-loop/<containerId>/quarantine/<sessionId>/<sha256-of-original-bytes>.jsonl`

目标必须不存在；container/session/quarantine 每级均须 lstat 为 owned regular directory、
非 symlink。先关闭 active journal handle，再建目录并 sync，rename 后重新打开并 sync 目标文件，
再 sync 两级 parent。不得覆盖、自动修、自动新建同 session journal 或继续 spawn。相同目标已
存在也 fail closed。

crate-private `PiLoopHost::delete_container(containerId)` 同票交付：SafeToken 不合法拒；该
container 仍有任一 live session/leg 时以固定 `container_active` 拒且零删除；不存在则幂等返回
`deleted:false`；存在时先拒绝非 directory/symlink root，再删除该 container 的全部 journal 与
quarantine、sync `pi-loop` parent，返回 `deleted:true`。递归删除不得跟随内部 symlink。两
container 必须互不可读；删一方后另一方 bytes、journal、quarantine 与 live 状态不变。

### 7. resume 断点只由 journal 投影，不扩 sidecar wire

本票不新增 “break” packet/event。replay 从 durable `session_interrupted` +
`session_resumed.messageContext:'empty'` 导出内部断点 item；未来 UI adapter 再决定展示 shape。
新 leg 不传旧 pi messages，不暗做摘要/compaction。`leg=previous+1`、跨 leg requestId 去重、
grant/model/limits/capabilities/route manifest 漂移与 prior 三值不精确一律 spawn 前拒。

### 8. 无 WebView API；动态 spawn 纳入机器门

本票不新增 Tauri invoke command、event channel、frontend type 或 React consumer，只提供
crate-private `PiLoopHost` 与 headless integration driver。未来 `PI-LANE-UI-1` 另冻
start/prompt/cancel/resume/replay/delete adapter。

现行 isolation gate 只识别字面量 `Command::new("...")`，本票须同批扫出任何动态
`Command::new(<expr>)`。`capabilityLedger` 保持现有 literal row 形态；另增加一类 closed
dynamic row，恰含
`{capability,programExpression,enclosingFunction,requiredLevel,anchor,exactCount,note}`，本票
唯一行固定：

`{capability:'pi-product-sidecar',programExpression:'verified_runtime_path',enclosingFunction:'spawn_verified_sidecar',requiredLevel:'none',anchor:'apps/desktop/src-tauri/src/pi_loop_process.rs',exactCount:1,...}`。

scanner 在各 Rust production 段同时枚举 literal 与 dynamic `Command::new`；dynamic 表达式按
去首尾空白后的 exact source text、直接包围它的 Rust function name、anchor 与 count 四项双向
匹配；唯一调用必须直接住在 `spawn_verified_sidecar`，不能搬进 command factory/helper。
未登记、留空登记、错 function/anchor、改变量、拼接、helper 包裹、第二 spawn 或
literal/dynamic 串类都须触红。运行期的
`verified_runtime_path` 仍必须来自通过 manifest 身份门的不可变 path；机器门只证明调用点
闭集，不冒充运行期 hash 证明。这里 `process` 是拓扑，不是 ADR-018 全局隔离升档。
Node `src/` 的 child_process/fs-write ledger 仍为空；`node:process` 只许 stdin/stdout/exit，
不得读写 `process.env`。

## 三、实现文件闭集

只允许：

### Node product

- 新建 `packages/pi-lane/src/product-case-env.ts`
- 新建 `packages/pi-lane/src/product-case-env.test.ts`
- 新建 `packages/pi-lane/src/product-runtime.ts`
- 新建 `packages/pi-lane/src/product-runtime.test.ts`
- 新建 `packages/pi-lane/src/product-main.ts`
- 新建 `packages/pi-lane/src/product-main.test.ts`
- `packages/pi-lane/src/tools.ts`（只加 `/case` logicalRoot 调用形态，dev 默认逐字保持）
- `packages/pi-lane/src/tools.test.ts`（只测上述窄 binder/投影）
- 新建 `packages/pi-lane/fixtures/product-wire-v1.jsonl`
- 新建 `packages/pi-lane/scripts/build-product-sidecar.mjs`
- 新建 `packages/pi-lane/scripts/build-product-sidecar.test.mjs`
- `packages/pi-lane/package.json`（只加独占 build/test script，零依赖）

### Rust host / Route source

- 新建 `apps/desktop/src-tauri/src/pi_loop_protocol.rs`
- 新建 `apps/desktop/src-tauri/src/pi_loop_journal.rs`
- 新建 `apps/desktop/src-tauri/src/pi_loop_process.rs`
- 新建 `apps/desktop/src-tauri/src/pi_loop.rs`
- `apps/desktop/src-tauri/src/lib.rs`（只接 module 与内部构造，不加 invoke handler）
- `apps/desktop/src-tauri/Cargo.toml`（只把既有 `libc` 用途注释扩到
  `pi_loop_process` 的 SIGTERM；版本与依赖集合不变）
- 新建 `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`
- `apps/desktop/src-tauri/tauri.conf.json`（只加上述 externalBin/resources）

### 静态门与本票回执

- `apps/desktop/scripts/isolation-binding-lib.mjs`
- `apps/desktop/scripts/assert-isolation-binding.test.mjs`
- 本文件（实现完成后只追加回执，不改前述合同）

默认禁止 `Cargo.lock/pnpm-lock.yaml`，本票不得加 crate/npm；上一清单对 `Cargo.toml` 的注释
例外不许改 dependency table。`product-protocol.ts/.test.ts`、`product-stdio.ts/.test.ts`、
`session.ts`、`scoped-env.ts`、`authorized-root.ts`、`sidecar*.ts`、
`workspace-write-env.ts`、`index.ts`、`fixtures/sidecar-dist/**` 均只读。任何实证必须改白名单
的情况先停并标 `[需架构拍板]`，不得用顺手重构扩票。

`product-wire-v1.jsonl` 每行是一个 LF 终止的 canonical packet，覆盖 host→sidecar 与
sidecar→host 每种 packet/type/union branch、七枚 terminal failure 文案和边界值；文件本身不
构成可连续运行的 leg。Node 测试对每行去掉末尾 LF 后分别调用现行公开
`decodeHostPacketLine` / `decodeSidecarPacketLine`，必须恰有一个方向成功，再用公开
`encodePacketLine` canonical re-encode 为同 bytes；不得导出或复制内部 `decodePacketNode`。
Rust test 以 `include_bytes!` 读同一 tracked blob、closed decode 后 canonical re-encode 同
bytes。任一侧不得生成 fixture 后再验证自己；缺行、重复行、双向皆成/皆败、extra key、CRLF、
BOM、数值 lexeme 与任一字面量 drift 都须触红。

## 四、施工顺序与区分力

严格串行：

1. **H1 Node + Route A**：product case env/runtime/main、deterministic CJS、source manifest；
   verified Node 分别跑 production ready→shutdown 与 scripted read→tool result→terminal。
2. **H2 Rust lifecycle + journal**：pair preflight、clean child、strict driver、
   append+sync-before-publish、crash fold/quarantine/resume/budget。
3. **H3 failure matrix + machine gate**：物理/协议/crash/canary/dynamic-spawn 反例，最后回执。

绿构建不是功能证据。first-red 要优先落在现有真实行为：

- 现行 scoped env 的 `cwd/FileInfo/error` 物理路径泄漏；
- 现行 dev session 的 per-prompt `budget.reset()`；
- isolation gate 对动态 `Command::new(runtime_path)` 的静默漏扫。

新文件的 module-load red 只能记“测试接线成立”，不得冒充断言有区分力；真正强度由以下
counterexample/mutation 证明，逐枚验证确实命中并 byte-identical 恢复：

1. Route pair：缺/多/symlink/dir/零字节/错 target/arch/version/runtime SHA/CJS SHA/
   manifest extra/missing/乱序/双件交换，均在 spawn、Keychain read、journal 前失败；
   把 journal `routeManifestSha256` 改为旧值或任意其他合法 64 位小写 hex 必红；普通
   `pnpm test` 中的无网络测试须从 product source 临时重建 CJS，并逐值核 tracked manifest
   bundle bytes/SHA，source 漂移不能等独占下载/发布命令才发现；
2. `/case`：Unicode 与 255/1024 byte 边界正例；absolute/`..`/空段/backslash/drive/UNC/
   控制字/保留名/symlink/prefix sibling 全拒；把任一结果改回 physical path 必红；
3. wire：共享 tracked Rust↔TS golden；重复/额外/缺 key、BOM、CRLF、partial、>1 MiB、
   seq/session/request 漂移、ready capability 漂移、terminal 后来包均杀 leg；
4. durability：append/sync failure 时 outward=0；publish-before-sync、把 LF-bad 当 partial
   截断、撤 final `turn_finished`→usage repair、把非尾端/不匹配半对误补、quarantine 覆盖任一
   mutation 必红；
5. crash/deadline：逐个 crash fold 窗、cancel/shutdown/EOF/exit 与
   SIGTERM→SIGKILL→confirm 真跑；撤 timeout/kill-confirm 必红；
6. resume/budget：leg/prior 三值、跨 leg ID、配置/capability/manifest 漂移；第二 prompt/
   新 leg 重置预算或 null→0 必红；
7. canary：互异 secret/root 扫 argv/env/cwd/stdout/stderr/journal/reply/error/diagnostic；
   把 key 改回 env provider 或回显 root 必红；
8. isolation：动态变量、改名、拼接、helper 包裹与第二 spawn 都被双向 ledger 抓住；
9. credential/container：pasted 与用户显式保存的 environment-name 两路可启动；无存档时即使
   `DEEPSEEK_API_KEY` 存在也零自动回落，child env 始终为空；active container 删除零 effect，
   idle 整删 journal+quarantine 且另一 container byte-identical。

## 五、实现门、回执与停点

实现会话各门单独取 exit，不经管道：

1. 定向 Node tests（含 build script test）；
2. desktop Rust `cargo test` 与现行 format/clippy 门；
3. verified Node v22.23.1 + production sealed CJS 的 ready/shutdown control；
4. verified Node v22.23.1 + test-only scripted stream 的 read→tool result→terminal hard gate；
5. `pnpm -r build`；
6. `pnpm lint`；
7. `pnpm test`；
8. `pnpm --filter @courtwork/desktop lint:isolation-binding`；
9. `git diff --check`。

Tauri config 本票只证明 source mapping 与临时 app-layout locator，不把未支付的 nested signing
写成绿。实现提交与回执提交分开；回执引用真实 implementation SHA、first-red、有效 mutation、
route manifest hash、物理 headless 读数、门数字、偏离与所有 `[需架构拍板]`。停在待独立验收，
不 push、不 merge、不启动 WRITE/GUI/DMG/Pages。

## 六、独立验收要求

全新 Codex 会话从本冻结件所在 main tip 建独立 clean worktree；不消费实现者 ignored
`dist/product-sidecar`、runtime cache 或 manifest 读数。验收者独立重建 Node/CJS snapshot，
至少实注：

- wrong hash、extra、symlink、wrong arch/target；
- journal `routeManifestSha256` 的旧值/随机合法值；
- case path/canary 与 Rust↔TS wire drift；
- append/sync、partial-tail、LF-bad quarantine；
- final `turn_finished` 缺 usage 的唯一补写窗，以及非尾端/不匹配半对 quarantine；
- crash/cancel/kill-confirm、resume drift、budget null/limit；
- dynamic spawn gate 的变量/helper 形态；
- credential 无存档 env fallback、两 container 隔离/active 拒删/inactive 整删；
- official Node 22 production CJS ready/shutdown 与 test-only scripted read loop，且 control canary
  不得进入 production bundle；真实 DeepSeek 只作具名 external smoke。

payload/schema/route/deadline/公开 command 争议是契约问题，直接 REJECT；实现级小缺陷才可按
AGENTS.md 用 `fix-by-acceptance`。报告只追加 `packages/pi-lane/ACCEPTANCE.md`，明确
PASS/REJECT。架构消费 PASS 前，`current.md` 不更新，`PI-WRITE-HOST-1` 不开工。

## 七、当期禁止项

GUI/TSX/CSS/Tauri WebView command、workspace write/read、授权 UI/effect、write tool/table/
policy、`md-work-v1`、Dossier/edit/bash/MCP/planner/subagent/compaction、local HTTP/SSE、
第二 journal/provider transport、postject/SEA/code-cache/live route switch、本机 Node fallback、
DMG/Pages/version/README/current 能力晋级，全部禁止。

归档 `archive/research-pi-host-loop-inventory-2026-07-30.md` 只作源码索引；其中“R5/路线仍
blocked”已过时，任何其他结论也不得覆盖本冻结件。
