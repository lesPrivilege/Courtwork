# ADR-022：通用 agent loop 线（pi lane）

- 状态：**Accepted（2026-07-27；2026-07-28 已冻结“薄 harness → 基础 GUI → 个人 debug → 原生语义/交互生长”的生产阶梯与 agent 称谓门）**
- 日期：2026-07-27
- 关系：修订 ADR-011 决定二「不引入第二 agent runtime」（携新必要性证据，见该 ADR 修订记录三）；受 ADR-018 等级—能力绑定约束（Node 直写/bash 锁 `os_confined`，host-mediated workspace 见决定六窄例外）；保全 ADR-017 决定零的核心逻辑（取形必须带容器）；与 ADR-012 垂类包边界并立不相交；消费 ADR-019（loop 会话落卷宗容器）
- 提出：2026-07-27 产品定调——「此阶段优先立起确定性、有依据的通用 agent 能力；方案成熟、依赖 pi 生态、不存在技术或验证瓶颈；甚至可以只是一个 pi agent 的 GUI」

## 背景

到「应对大多数 .md 任务」的通用能力，仓内自研线（TOOL-READ → edits/writing 票 → EXEC-SCRIPT）依赖链长且尚有未立之票；而标准 agent loop（read/edit/write/bash + while 循环）在 pi 生态是已收敛的生产形态（`@earendil-works/pi-agent-core` 为 TS 库，MIT，一手核实见归档 pi 批次；包名全称见修订记录之包名订正）。语义层、确认原语等创新点须实测验证，通用 loop 不须。产品据此定调：确定性能力先行，创新层在其后嫁接。

减法纪律①（开源轮子尽可能用）与本裁定同向；此前「借形不接管真源」的边界按本 ADR 显式放宽为「loop runtime 整体引入，真源仍在容器、授权与垂类契约」。

## 产品称谓与本阶段出口（2026-07-28 补充）

合同审查窄链已经跑通，但场景执行、结构化 preview 与 docx 产出本身不构成通用 agent：
缺 Pi 时用户不能在同一 work 面发起任意 `.md` 需求、观察 tool loop、逐次授权 write、停止、
续行并核验 workspace。故 A0/A1、单独合同审查、build 全绿或只过 headless 均不得把 Courtwork
写成当前已成立的 agent。

称谓门只认 `PI-BASE-GUI-ACCEPT`：它必须消费 A2 的真实 read/write/恢复链，在真实 Tauri
WKWebView 中同时通过确定性 provider 与维护者真实 DeepSeek 甜点档矩阵。放行前产品统一称
“本地优先法律工作台”；放行后才能把“通用 work agent”写成现在时能力，并仍须逐项声明
未成立的垂类、脚本与发行边界。

本阶段出口不是公开 release，而是 `PI-DEBUG-BUILD-1` 的维护者本人本机 debug 制品。它只为
验证已放行 Pi 闭环在实际安装形态下不被 sidecar 装配、签名或 WebView 生命周期破坏；不产生
`v0.2.0`、tag、GitHub Release、Pages 下载位、发行成熟度或公开 agent 叙事。未来公开发行另受
ADR-020 的显式重启门约束。

## 决定一 · 引入 pi-agent-core 作通用线 runtime，双线并立

- 通用线以 **Node sidecar 承载 `@earendil-works/pi-agent-core` 库**（内嵌形态，非外挂 serve 进程；无 scope 的 npm 名 `pi-agent-core` 是第三方占位空壳，禁止依赖）；我方持有 GUI、容器、扩展与预算面。
- 既有声明式场景 runtime（ADR-009/011 谱系）**原样保留**，垂类包与现有
  `ConfirmationLedger` 流程只挂场景线；pi 的逐次 write 授权只写自身 journal，不复用或混写
  场景确认账本。两线并立、各自账本，不迁移、不混写。
- ADR-011 的禁令按重启条款修订为：**不自研第二 runtime、不引入编排框架**；成熟开源 loop 以本 ADR 的受控引入线接入。新必要性证据三条：产品定调（确定性优先）；`pi-agent-core` 库形态使内嵌可行（非进程外包）；容器路线在途（`SANDBOX-PROBE-1` 已派）。

## 决定二 · 取形必须带容器（ADR-017 决定零逻辑保全）

pi 范式把安全性整体外包给容器；引入 pi 即承接这份外包——**容器由我方供给**，不是省略：

- **读面（pure_read）**：落现行 `none` 隔离等级内，可先行（ADR-018 决定五语义不变）。
- **写面与 bash**：一律锁 `SANDBOX-PROBE-1` 放行后按其结论落地；探测不成立则写/bash 面走降档路线另裁，不以「pi 生态成熟」为由绕过等级绑定。**放行不等于升档（2026-07-27 补句）**：探测放行的是原语可行与判据可满足，不是等级——等级仍按 ADR-018 决定五由**实现自带该等级的越界反例**证成（探测报告第十一节第 4 条同口径）；升档前写面与 bash 不可授，`PI-LANE-1` 的「edit/write/bash 配置层禁用」即此结果。
- ADR-017 的受控脚本执行（argv 三段式）与 pi lane 的 bash 是两条能力面：前者属场景线的受控形态，后者属 loop 线且只在容器内成立；两者互不豁免对方的前置。

### 2026-07-28 窄修订：write 提案不等于把写权授给 Node

上段“写面锁隔离升档”继续约束 `NodeExecutionEnv`、`node:fs` 与任何子进程直接写。决定六新增的
pi `write` 只把上游工具调用转为 host request；物理 effect 由 Rust 在 app-data agent workspace
执行，Node 生产码无 fs 写，故按 ADR-018 的 host-mediated `process` 窄例外开工。bash 与任何用户
文件写面不随此修订放行。

## 决定三 · 不变量经扩展机制挂载，不改内核

我方不变量以 pi 官方扩展机制（一手核实：`permission-gate`／`protected-paths`／`tool-override` 三例）挂载：原件只读（授权文件夹外零读写，fail-closed）；危险动作事前确认；预算面（步数／usd 上限——pi loop 原生无上限，`while(true)` 无计数器，上限必须由扩展或 sidecar 层补齐）。**扩展不可达的不变量显式登记为已知边界，不静默放弃、不宣称等同场景线保障。**内核零 fork；需改内核即回本 ADR 修订。

## 决定四 · 会话归属与持久

pi lane 会话落卷宗容器内独立分区（工作稿旁），格式从 pi 原生 journal；不写入场景线 Turn journal 与确认账本。跨线引用（loop 产物进场景、场景材料进 loop）后置，需求实证后修订本 ADR。

### 2026-07-28 窄修订：逻辑属容器，物理属 app-data

“工作稿旁”只保留逻辑归属，不再表示用户案件根内的物理同目录，也不直接采用 pi 原生 journal。
决定六冻结我方版本化 JSONL：loop journal 物理落
`app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl`，agent workspace 另落
`app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`；二者随 container 整删，均不进入用户
原件、工作稿、产出或场景线账本。

## 决定五 · 升级纪律

锚定引入版本；升级逐版核对上游 changelog；扩展 API 破坏性变更触发重评（回本 ADR）。上游 license 逐版复核（pi 主仓 MIT，子仓有 Apache-2.0 先例，不默认继承）。

## 决定六 · 生产底座、能力阶梯与 GUI 开工门（2026-07-28 冻结）

产品顺序固定为：先把 coding-agent 已收敛的 loop 与**最小安全文件能力**做成无 GUI、可恢复、
可验收的薄底座；底座通过独立验收后立即做基础 GUI，并以 GUI 独立验收闭合“用户真的能完成并
核验通用 Markdown 工作”。ADR-021 Dossier、垂类修订/晋升、plan/source 等架构巧思与 UI 巧思
都在这两条基础线之后生长，不与基础 GUI 抢当前里程碑。

生产路径固定为：

```text
headless acceptance → 基础 React GUI
  → Rust host command
  → 双向 NDJSON stdin/stdout
  → Node sidecar 内的 pi Agent
  → 有序 packet
  → Rust 单写者：app-data/pi-loop/<containerId>/<sessionId>.jsonl
  → headless replay / React 只读投影
```

### 六-0 · 当前里程碑与薄度判据

当前目标不是复刻一套厚 coding harness，而是让推理能力足够、coding/agentic 能力普通的模型在
下列已声明边界内不被 harness 卡住：授权 `/case` 中的通用 `.md` 输入，最多 12 个 assistant
turn、单次 prompt/workspace text 各不超过 131,072 UTF-8 bytes，完成定位、跨文件汇总、新建或
整体改写 `/workspace/*.md`、写后回读与最终路径报告。超出上下文、回合或文件边界的任务不靠
偷偷引入 planner/compaction/bash 来伪装支持。

- 模型工具固定为 **`read/glob/grep/write` 四件**。`exists/read_file/list` 只是
  `ExecutionEnv`/host operation，不得升成第五件模型工具。产品仍是一个 pi `Agent` 加一条
  tool loop，不另造 planner、task graph、subagent、skill runtime 或第二 harness。
- v1 product system prompt 只含六条语义：基于实读事实；`/case` 只读、`/workspace` 是过程草稿；
  `.md` 新建/改写只用覆盖式 write；覆盖前先读、写后必回读并报告逻辑路径；无
  edit/delete/rename/promotion/bash；权限/effect 只认 gate 与 journal。不得复制工具 schema、
  注入长 coding playbook、Dossier 正文、plan 格式或产品营销人格，UTF-8 总长不得超过 2,048
  bytes。prompt 只是帮助模型正确使用已授权能力，不承担安全边界；实现以 snapshot/byte gate
  锁住六条与上限。
- “模型没完成”只能在所有必要 tool/host result 已完整、未截断地进入 agent transcript 后归因
  模型；缺工具、结果未回灌、截断未显式、授权后未落盘、workspace 无法回读或路径/状态泄露均是
  harness 缺陷。独立验收必须同时保留 Agent events、host request/result、journal 与最终
  bytes/hash，不能只看最后一段自然语言。
- 当期明确不需要 `@earendil-works/pi-coding-agent` 整包、TUI/CLI、动态 extension/skills、
  图像、git/package manager/MCP、edit/diff/CAS/merge、delete/rename、bash/TTY、自动批准、
  plan/subagent、steer/follow-up queue、compaction/branch/thread export 或第二 runtime。

### 六-A · 宿主、进程与凭据边界

- dev 的 `127.0.0.1` HTTP/SSE 只留开发自服务，禁止进入产品路径。WebView 不直连 sidecar，
  不拥有绝对路径、凭证明文、进程句柄或 JSONL 写权；Rust 是 sidecar 生命周期与 loop journal
  的唯一宿主。
- 产品启动输入只收 `{containerId, grantId, modelId, limits}`。Rust 以 `grantId` 解析案件根，
  再把绝对根和从现有 Keychain 读取的 provider secret 放入**首枚 stdin bootstrap packet**；
  二者不得进入 argv、环境变量、stdout、stderr、journal、错误或诊断。子进程使用闭集清洁环境，
  `cwd` 不得设为案件根。dev 的 `DEEPSEEK_API_KEY` 约定不得进入产品启动链。
- bootstrap 是唯一允许携 secret/path 的 wire 分支，Rust 不落账、不转发，sidecar 只在当前进程
  内消费。测试必须用 canary secret/path 扫描 stdout、stderr、全部 JSONL 与错误对象，任一命中
  即红。
- sidecar 可继续直接消费 pi-ai 的 DeepSeek 原生 provider；这不改变“凭证只由 Rust 从
  Keychain 取出”的产品真源。若未来需要让 sidecar 失去 provider 网络权，须另立 broker 票，
  不在实现中暗造第二 transport。

### 六-B · wire 与持久化最小契约

- wire 是一行一个 JSON object 的 NDJSON，单 packet 最大 1 MiB。双向公共头固定为
  `{protocolVersion:1, seq, sessionId, requestId, type}`；每个方向的 `seq` 从 1 严格递增。
  未知版本/type、重复/跳号、session 错配、超限或非 object 一律协议失败并终止该 session，
  不做宽松兼容。
- host→sidecar 闭集为 `bootstrap | prompt | cancel | host_result | shutdown`；
  sidecar→host 闭集为 `ready | agent_event | host_request | terminal | protocol_error`。
  `host_request` 预留字段固定为
  `{operationId, capability, proposalHash, arguments}`，`host_result` 必须回同一
  `operationId`；首批只允许下述工作稿能力，不能借预留面传任意路径、shell 或自由 RPC。

#### 六-B.1 · wire 标量、状态机与逐包 payload

所有层级都是 `additionalProperties:false` 的严格 record；decoder 必须拒绝任一层重复 JSON member。
字符串必须是 Unicode scalar sequence：不得含 NUL 或 lone surrogate；Node 侧以
`String.prototype.isWellFormed()`、Rust 侧以 UTF-8/字符串解码后同义规则双验，hash/byteLength
一律在该门之后计算。Node 字节解码必须用 `TextDecoder('utf-8',{fatal:true})` 同义路径，禁止
`Buffer.toString()` 把非法字节替换成 U+FFFD 后继续。每行是 UTF-8
无 BOM 的单个 JSON object，连换行在内最多 `1_048_576` bytes。decoder 必须先以字节 framing
拒绝超限行再 parse；encoder 必须先完成 UTF-8 JSON 序列化、按**编码后实际字节**复核上限才可
写 stdout/stdin，不能只检查 raw payload。wire delimiter 只收单字节 LF (`0x0A`)；CRLF、空行、
EOF 前未见 LF 的 partial packet 都拒绝。声明为 integer 的 JSON number lexeme 只允许
`0|[1-9][0-9]*`，再按字段排除 0；指数、fraction、前导零、负数与 `-0` 均不得先 parse/coerce 后
放行。其他非负 number 同样拒绝 negative zero。公共五字段集为：

```ts
type SafeToken = string; // /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
type Header = {
  protocolVersion: 1;
  seq: number;                 // 1..Number.MAX_SAFE_INTEGER 的整数
  sessionId: SafeToken | null; // null 仅用于 bootstrap 尚未成立的 protocol_error
  requestId: SafeToken | null;
  type: string;
};
```

`Header` 只是每枚 packet 的公共字段投影，不是一枚可单独发送的完整 packet。v1 wire 的每枚
packet 顶层**精确六字段**
`{protocolVersion,seq,sessionId,requestId,type,payload}`；逐包字段只可嵌套在单一
`payload` member 内，不得平铺到顶层。packet root 与 payload 内每一层 record 分别执行
`additionalProperties:false`/重复 member 拒绝；nested 与 flat 两种形态不得双读兼容。

- host 与 sidecar 各自维护一条 **per-sidecar-leg** `seq`，均从 1 开始，发出任何 packet
  （含 error）都加一。一个 sidecar 进程只承载一个 logical session；同一 session 显式恢复时
  会启动新 leg，双向 seq 重新从 1 开始。sidecar 只持当前 leg 的去重集合与累计器初始化值；
  跨 leg 的 ID 唯一性、配置一致性与预算真值由持有 durable journal 的 Rust 宿主独占校验。
- `containerId/grantId/sessionId/requestId/operationId/eventId/toolCallId` 共用 `SafeToken`；
  host 生成 session/request/event，sidecar 生成对外 toolCall/operation。bootstrap 的 `leg` 是
  正安全整数：fresh 固定为 1，恢复固定为上一已落账 leg + 1。sidecar 不把 provider 给出的 raw
  tool-call id 直接上 wire；每 leg 分别按出现序铸 `tc_<leg>_<ordinal>` 与每次 host operation
  铸 `op_<leg>_<ordinal>`，并保留进程内映射。`tool_execution_start` 早于 validate/
  `beforeToolCall`/execute，因此 event projector 必须在首见 raw id 时分配并登记公开 tc，再发布
  `tool_started`；raw gate 即使随后 block，也用同一 tc 发布 finished，但**不分配 op**。binder
  execute 只查既有 raw→tc 映射；每次真正发 `host_request` 时才另分配 op（一个 tool 可有多次
  host operation）。tc/op 带 leg 前缀；在 Rust 已验证 leg 恰为 previous+1 的前提下，新进程
  ordinal 重置也不会在 logical session 内复用 ID。当前 leg 的 raw id 重复、start 前先见
  update/end、或 binder 映射丢失均按 `upstream_event_unsupported` 终止。
- `sessionId:null` 只允许 bootstrap 未经验证时 sidecar 发出的首枚 fatal `protocol_error`；
  其 `seq:1,requestId:null`，随后立即非零退出。其余包的 sessionId 必为同一 SafeToken。
  `requestId:null` 只允许 `bootstrap/ready/shutdown`、其 shutdown `terminal`，以及无法归因的
  `protocol_error`。`prompt` 使用当前 leg 此前未见的新 requestId；Rust 在发包前还须证明它在
  整个 logical session journal 中未见。其
  `agent_event/host_request/host_result/terminal/cancel` 全部回同一 id。
- 首包必须是 host `seq:1 bootstrap`。有效 bootstrap 后首枚 sidecar 包必须是 `seq:1 ready`；
  invalid JSON、超 framing 或 bootstrap schema 失败则由上述 `seq:1 protocol_error` **取代**
  ready。ready 前、上一
  prompt 尚未 terminal 就发新 prompt，均为 fatal state violation。
  `completed|canceled` 后回 idle；`failed` 只有
  `provider_error|host_error` 且 `retryable:true` 才回 idle。其他 failed、
  `budget_stopped`、shutdown terminal 或 fatal protocol error 都关闭 logical session，不再收包；
  idle 续 prompt 的累计预算不重置。
  `cancel` 正常只引用当前活动 prompt，最多一次；若 terminal 已先发出、随后才从 stdin 读到同一
  request 的 race-late cancel，则只消费其 seq 并 no-op，不发第二 terminal，也不把一次正常
  Stop/terminal 竞态升级为协议崩溃。更早 request、未知 request 或重复 cancel 仍 fatal。
  cancel 处理后不再产生新 delta/host request；已经在途的唯一 host request 必须先由 Rust 回
  `aborted` 或真实 effect outcome。`ok|denied|failed` 可先投影真实 outcome 再按下文预算矩阵发
  canceled；`uncertain` 优先级更高，必须发 `failed + effect_uncertain`，不得伪 canceled。
  `shutdown` 只可在 idle，sidecar 回 `status:'shutdown'` 后退出 0。

逐包 payload 冻结如下；表中未列字段一律拒绝：

| type | requestId | payload |
|---|---|---|
| `bootstrap` | `null` | `{containerId,grantId,caseRoot,provider:{id:'deepseek',modelId,apiKey},limits:{maxTurns,maxUsd},resume:{kind:'fresh'|'after_interruption',leg,priorObservedTurns,priorTurns,priorUsd}}`；`caseRoot` 是宿主已规范化的绝对路径且只在本包出现，`maxTurns` 整数 `1..12`，`maxUsd` 为 `null` 或有限数 `0 < n <= 100000` |
| `prompt` | 新 token | `{text}`；trim 后非空，UTF-8 最多 `131_072` bytes |
| `cancel` | 活动 prompt | `{reason:'user'|'host'}` |
| `host_result` | 对应 prompt | `{operationId,capability,operation,status,value?,error?}`；operation 为 `write|exists|read_file|list`，与待办完全相同且恰好一次 |
| `shutdown` | `null` | `{reason:'host_shutdown'}` |
| `ready` | `null` | `{capabilities}`；`capabilities` 是元素闭集 `case_read|workspace_read|workspace_write` 的 array，去重并按字典序；未宣告能力不得发 request |
| `agent_event` | 活动 prompt | 下列 `AgentProjectionEvent` 闭集之一 |
| `host_request` | 活动 prompt | `{operationId,capability,proposalHash,arguments}`；精确 union 见六-B.2 |
| `terminal` | 活动 prompt 或 shutdown 的 `null` | 下列 `Terminal` 闭集之一 |
| `protocol_error` | 可归因 id，否则 `null` | `{code,message,fatal:true}`；message 最多 1024 UTF-8 bytes，禁止回显 raw line/payload/secret/物理路径 |

bootstrap 中 `caseRoot` 是非空、最多 4,096 UTF-8 bytes 的平台绝对路径；sidecar 只把它交给
`/case` env，不再拼接、回显或持久化。`modelId` trim 后非空且最多 256 UTF-8 bytes，`apiKey`
非空且最多 8,192 UTF-8 bytes；provider record 不容许 endpoint、headers 或其他自由配置。
`resume.leg` 是正安全整数；`priorObservedTurns/priorTurns` 是非负安全整数且前者不得小于后者，
`priorUsd` 是非负有限数或 `null`；
`null` 表示历史中至少一回合费用未知，不能伪装成 0。上述长度边界都必须在 Rust 发包前和
sidecar 收包后各验一次。

`131_072` 的 prompt/workspace content raw 上限是无 chunk v1 的保守 framing 约束，不是模型或
文件系统上限：JSON 最坏可把单字节控制字符编码成六字节 `\u00XX`，故其最坏主体为
`786_432` bytes，仍给严格 envelope 留出余量。codec 测试必须用重复 U+0001、引号、反斜杠与
多字节 Unicode 验证 raw cap 内可发、超 raw cap 与编码后超 `1_048_576` 都在写流前失败。后续若
真实工作稿需要更大内容，只能另立 chunk/blob 协议，不能放宽 packet 门或让“有些 cap 内字符串
碰巧发不出去”成为隐含行为。

`AgentProjectionEvent` 只允许：

```ts
type AgentProjectionEvent =
  | { kind: 'assistant_text_delta'; delta: string }
  | { kind: 'assistant_reasoning_delta'; delta: string }
  | { kind: 'tool_started' | 'tool_progress'; toolCallId: SafeToken;
      toolName: 'read' | 'glob' | 'grep' | 'write' }
  | { kind: 'tool_finished'; toolCallId: SafeToken;
      toolName: 'read' | 'glob' | 'grep' | 'write';
      outcome: 'succeeded' | 'denied' | 'failed' | 'uncertain' }
  | { kind: 'turn_finished'; turn: number;
      countedTowardTurnLimit: boolean;
      usage: { inputTokens: number | null; outputTokens: number | null;
               cacheReadTokens: number | null; cacheWriteTokens: number | null;
               costUsd: number | null };
      stopReason: 'stop' | 'length' | 'tool' | 'aborted' | 'error' | 'unknown' };
```

delta 必须非空且单包最多 65,536 UTF-8 bytes。usage 每个已知 token 值是非负安全整数，
cost 是非负有限数；null 都表示该字段未知，不是 0。`turn` 是从 1 开始、跨 prompt/sidecar leg
严格递增的 observed upstream turn ordinal；`BudgetView.turns` 只累计
`countedTowardTurnLimit:true`。stopReason 为 `aborted|error` 时 counted 固定 false、全部 usage
字段固定 null，不采信上游合成的零；其他 stopReason counted 固定 true，缺失字段仍为 null。
pi 的 `agent_start/turn_start/message_start/message_end/agent_end` 仅作本地结构信号，不出包；
`message_update/tool_execution_start|update|end/turn_end` 必须映射为上述闭集，不得透传 raw
message/args/result。上游新增未知 event/tool name 时 terminal
`failed + upstream_event_unsupported`，不能静默吞掉或塞 raw JSON。TypeScript union 不是运行时
验证；投影入口须先验 kind/toolName 再读取 turn/usage 等分支字段，cast 或未来上游 event 也不得
逃逸为 `TypeError` 或 callback failure。

runtime 向状态机报告失败时只给结构化 code/retryability，**不得给自由 message**。sidecar 的
terminal message 只能由本地固定 code→安全文案表产生，不能拼接或截断后转发 provider body、
runtime error、host error、bootstrap secret/path 或任意调用方字符串；截断只是长度门，不是脱敏。
runtime 可报告的普通失败只限 `provider_error|host_error|invalid_state|unknown`，预算、effect 与
upstream 投影失败均由状态机自身判定。具体措辞不是 wire ABI，但每个 code 必须映到独立的本地
source literal 并由 snapshot 锁住；不得用插值、`String(error)` 或 `error.message`。

per-leg **write** tool registry 至少区分
`started → validated → raw_gate_passed → operation_reserved(op,tc) →
operation_pending(snapshot) → host_result(status) → operation_settled → tool_finished`；阶段只能
单向推进。`tool_started` 当场把 public tc 绑定到当前 `requestId` 与一枚不可变 `toolName`；
后续 progress/finished/reserve 都必须引用当前 prompt 中仍有效、同名、尚未 finished 的 tc，
旧 prompt tc、finished tc 与改名事件一律拒绝。产品 Agent 虽固定
`toolExecution:'sequential'`，状态机仍须显式守住“每 prompt 至多一枚未 finished tc”，不能把
正常上游调度当作安全边界或用注释证明重叠不可达。模型工具到 host capability 的映射固定为
`write ↔ workspace_write`、`read|glob|grep ↔ workspace_read`；映射、owner、阶段与宣告能力全部
通过后才可烧 operation ordinal。

write 在 **operation 尚未创建** 时的 finished 只按本地阶段事实分型：

- TypeBox/参数 validation、raw extra/type/path alias/content-size 失败，或 host_request 前 abort
  → `failed`；
- 只有明确的 capability 未授权、用户拒绝或 policy deny → `denied`；
- 任何其他 start 后、operation 前的未知结束 → `failed`，随后 prompt 以
  `upstream_event_unsupported` 关闭，不从通用 error message 猜类型。

因此 pre-operation 的 `succeeded|uncertain` 绝不得原样上 wire；状态机须先以 `failed` 闭合该
public tc，再按 upstream 违约关闭。write 一旦 send 即只允许这一枚 operation；host_result 未到
前收到 runtime `tool_finished` 或 `finishPrompt`，都视为 upstream 违约并进入下述 pending
闩锁，不得相信调用方 outcome。host_result 已到而合法 `tool_finished` 未到时，保存的
`operation_settled` 与新的 reservation/pending 结构性互斥；runtime 提前 finish、起下一工具或
发下一 host request 时，必须先按已保存 host status 发恰一枚正确的 `tool_finished`，再按既定
优先级 terminal。任何普通 terminal 都不得清掉未投影的 settled effect。read/glob/grep 才可在
同一 active tc 内重复 host-operation 子循环。

`workspace-write-env` 已冻结为“gate 后由 registry 分配 op → 用该 op 计算 proposalHash → port
发送含同一 op/hash 的八字段 request”。product stdio 必须提供与之同构的两段式内部 API：

```ts
reserveHostOperation({ publicToolCallId, capability }): operationId
sendReservedHostRequest({
  sessionId, requestId, operationId, capability, proposalHash, arguments
}): void
```

`WorkspaceWriteRegistry.allocateOperationId(tc)` 的生产实现委托第一段；
`WorkspaceWritePort.write(request)` 原样把既有 request 交第二段。第二段只接受本 prompt 中仍
有效、tc/capability 相同的 reservation，随后把一次复制的 request snapshot 同时用于出包与
pending correlation；它**不得**再分配 op、重算 proposalHash 或读取私有 current-operation。
reserve 只可发生在所有本地 gate 之后；若其后的异步 hash 在 send 前失败，ordinal 永久烧号但
不出 wire、不成为 pending、不得复用。该烧号不是 effect/journal 事实。product stdio 不再持有
第二枚 `ProposalHasher`。同一 tc 在首枚 request 尚未 send 时可以再 reserve，以烧掉 hash
失败留下的旧 ordinal；一旦 send，write 不得为该 tc 铸第二枚 operation。owner/tool/capability/
phase 任一门失败都发生在 ordinal 分配之前。

一旦进入 `operation_pending`，write 的 `tool_finished.outcome` **只认对应
`host_result.status`**，不认上游 tool result 的 `isError`。0.82.1 在 `writeFile` 成功后若 signal
恰好 abort，仍会抛 `Operation aborted`；此时 effect 可已成功，必须先投影
`tool_finished:succeeded`；prompt terminal 再按下文预算优先矩阵，只有费用仍可判定或 maxUsd
未启用时才可 canceled。反向同理：host denied/failed/uncertain 不得被上游通用 error 文案重新
分型。read/glob/grep 无 effect，才可由其已脱敏执行阶段与结果映射 outcome；它们若一次 tool
需要多次 host operation，registry 可重复 `operation_pending → host_result` 子循环，但每轮都铸
新 op，不能复用 write 的单-operation 假设。

upstream 投影违约一律把累计 `usd` 传染为 null：该事件已证明 provider turn 在跑，但合法
`turn_finished`/usage 闭合已不可再信。若 maxUsd 启用，后续 `budget_unknown` 因此高于普通
upstream failure。

若违约时仍有 `operation_pending`，或 host_result 已到但对应 write 尚未合法
`tool_finished`，状态机进入 `pending_upstream_failure`，不得用 force 清空或提前发普通 failed：

1. 等待期停止新的 runtime delta/event/host request/finish；host inbound 仍只接受当前 request
   至多一次合法 cancel 与该 operation 的严格匹配 host_result。cancel 仍调用受 guard 包裹的
   runtime cancel，但其 callback 失败不得阻断 effect 收束。
2. host_result 未到时不得 terminal。到达后先做全部 correlation；把 result 交 runtime
   consumer 以解开既有 deferred，但 callback 的返回或异常不再拥有终态。
3. 状态机保存 reservation 中的 public tc/toolName，并从 host status **自行发恰一枚**
   `tool_finished`：write 逐字映射 `ok→succeeded / denied→denied / failed→failed /
   uncertain→uncertain`；read 若因本异常路径被迫中止，`denied→denied`，其余合法 status
   收为 failed。若 result 在违约前已经合法收下但 tool_finished 尚未到，同样消费已保存的
   outcome，不再等第二枚 result。
4. 随后由状态机自动按
   `effect_uncertain > budget_unknown > known limit > cancel > upstream_event_unsupported`
   发 terminal，不依赖 runtime 再调 finish。对应 runtime 的迟到 event/finish 不得产生第二枚
   wire packet。

错 op、错 request 或错 capability/operation/value 仍是 host wire 违约，不能借闩锁降格或忽略。
若违约前该 operation 的 `tool_finished` 已合法发布，则 effect 已闭合，直接按同一优先级 terminal。

```ts
type BudgetView = {
  turns: number;
  usd: number | null;
  turnLimit: 'open' | 'reached';
  usdLimit: 'disabled' | 'open' | 'reached' | 'unknown';
  stopReason: 'turns' | 'usd' | null;
};
type Terminal =
  | { status: 'completed' | 'budget_stopped'; budget: BudgetView }
  | { status: 'canceled'; reason: 'user' | 'host'; budget: BudgetView }
  | { status: 'failed';
      error:
        | { code: 'provider_error' | 'host_error'; message: string; retryable: boolean }
        | { code: 'budget_unknown' | 'effect_uncertain' | 'upstream_event_unsupported' |
                  'invalid_state' | 'unknown'; message: string; retryable: false };
      budget: BudgetView }
  | { status: 'shutdown' };
```

`BudgetView.turns` 是非负安全整数；`usd` 是非负有限数，或在任一**已发起 provider 请求**的
回合费用未知后为 `null`。`turnLimit:'reached'` 当且仅当累计 counted turns 已达 maxTurns；
`usdLimit:'disabled'` 当且仅当 maxUsd 为 null；启用金额限额时其余三态分别表示已知未达、已知
已达、不可判。终态优先级固定为
`effect_uncertain > budget_unknown > 已知 limit reached > cancel > 其他 outcome`：

- maxUsd 非 null 且本次或历史存在已发起 provider 请求但 cost 未知，必须
  `failed + budget_unknown + retryable:false`；即使 turnLimit 同时 reached 也不伪装
  budget_stopped；
- 无更高优先失败时，任一已知限额 reached 才发 `budget_stopped`；两项同时 reached 时
  `stopReason:'turns'`；
- cancel 仅在 provider 尚未发起、费用已完整结算，或 maxUsd 本就为 null 时可收束为 canceled；
  maxUsd null 时未知费用只把 `usd/usdLimit` 保持 `null/'disabled'`，不阻断 turn limit。

decoder 还必须拒绝与上述优先级自相矛盾的单包 Terminal：`budget_stopped` 的
`usdLimit` 不得为 `unknown`，且 `turnLimit:'reached'` 时 `stopReason` 必须为 `turns`，否则须由
`usdLimit:'reached' + stopReason:'usd'` 成立；`completed`、`canceled` 与
`effect_uncertain|budget_unknown` 之外的 failed 不得携 known reached 或
`usdLimit:'unknown'`。`failed + budget_unknown` 必须携 `usdLimit:'unknown'`；
`failed + effect_uncertain` 因优先级最高可与其他 budget 状态并存。另锁
`usdLimit:'unknown' → usd:null`、`usdLimit:'open'|'reached' → usd` 为已知数；
是否精确达到 bootstrap 中的 maxTurns/maxUsd 仍由持 session 配置的一侧校验，不在无状态 codec
猜阈值。decoder 同时执行 retryability 闭集：只有 `provider_error|host_error` 可携
`retryable:true`；其余五种 failed code 必须为 false。

其他非 budget terminal 的 `stopReason` 为 null；failed error message 同样最多
1024 UTF-8 bytes且不得带 raw provider body、secret 或物理路径。bootstrap 的
`resume.priorObservedTurns/priorTurns/priorUsd` 必须精确等于 Rust 从已 sync journal fold 的
累计值：fresh 必须为 `0/0/0`；after_interruption 只可用于同一 session 的
`session_interrupted` 尾态。新 leg 的 `containerId/grantId/provider.id/modelId/limits` 必须与
`session_started` byte-equal，ready capability set 必须与首 leg 一致；任一漂移必须新建
session，不能借 resume 换模型/限额/能力。上述“精确等于历史”、previous+1、跨 leg requestId
去重与 capability 对比全部由 Rust/journal 在启动前或 ready 后、首枚 prompt 前验证；新的
sidecar 没有历史 journal，不得宣称复核这些事实。sidecar 只做当前包可判定的自洽门：
fresh=`leg:1 + 0/0/0`，after_interruption 的 leg 至少为 2、
`priorObservedTurns>=priorTurns`，并从宿主给定 prior 初始化累计器；当前 leg 内 ID 重用仍
fatal。`maxUsd` 非 null 而 `priorUsd` 为 null、已达任一 limit 或已落其他 session 终态时，
Rust 不得启动新 leg；其中前两种只凭当前 bootstrap 即可判定的矛盾，sidecar 也须拒绝。

`protocol_error.code` 闭集为
`invalid_json | packet_too_large | invalid_schema | unsupported_version | unknown_type |
seq_mismatch | session_mismatch | request_mismatch | state_violation | duplicate_id`。fatal error 发出后
不得继续收发，sidecar 非零退出；secret/path canary 不得出现在 message。

注入 runtime 的 `capabilities/startPrompt/cancel/deliverHostResult/shutdown` 都是同步可重入
边界。状态机须以同一 callback-depth guard 包裹五者；callback 尚未返回时同步调用
`receive/endOfInput` 属 runtime 编程错误，必须在消费字节、推进 seq/phase、写 wire 或 exit 前抛
`ProductSidecarError`。该 guard 不禁止 `startPrompt` 同步调用合法的 outbound API；所有 guard
都须 `finally` 复位，callback 返回后也不得无条件覆盖已经 closed/terminal 的状态。任一 runtime
callback 抛出的原 Error/message/cause 均不得转发或保留；普通路径只向 driver 重抛一枚固定字面量、
无 cause 的 `ProductSidecarError`。`pending_upstream_failure` 已进入 effect 收束后，cancel/
host-result consumer 的 callback 异常只作固定内部失败并继续上述收束，不能再次丢 pending。
transport 是单向 stdio adapter，不属于 runtime callback，契约上禁止同步回调 session。
callback 抛错后不做事务式状态回滚：已经发出的 event/effect 不可撤销；未来 host driver 必须把
逃逸的 `ProductSidecarError` 当作 runtime/sidecar fault，终止该进程并按 journal 恢复规则落账，
不得吞错后继续使用同一内存 session。

#### 六-B.2 · workspace request/result 与跨平台逻辑路径

wire 内的 workspace `logicalPath` **不带** `/workspace/` 前缀，是 POSIX 相对路径；UI/模型边界
才加虚拟根。除 `list` 的根 `"."` 外，路径由 `/` 分隔的非空 segment 组成，总 UTF-8 最多 1024
bytes、单 segment 最多 255 bytes。segment 不得为 `.`/`..`、不得含控制字符、DEL、
`<>:"/\|?*`，不得以空格或 `.` 结尾，且大小写不敏感时不得命中
`CON|PRN|AUX|NUL|COM1..9|LPT1..9`（带扩展名也拒）。绝对路径、空段、backslash、Windows drive、
UNC 与任何不满足此 grammar 的输入，Node/Rust 两端用同一 golden 拒绝；一端拒而另一端接收即
协议漂移。

`host_request` 只有两种 capability：

```ts
type WorkspaceHostRequest = {
  operationId: SafeToken;
  proposalHash: string;
} & (
  | { capability: 'workspace_write'; arguments: {
      logicalPath: string; content: string;
      contentSha256: string; byteLength: number;
    }}
  | { capability: 'workspace_read'; arguments:
      | { operation: 'exists' | 'read_file'; logicalPath: string }
      | { operation: 'list'; logicalPath: string } }
);
```

write content 最多 `131_072` UTF-8 bytes；`byteLength` 必须等于 UTF-8 实长，
`contentSha256`/`proposalHash` 均为小写 64 位 hex，Rust 必须重算。workspace 只含本协议写入的
UTF-8 Markdown；workspace write 的最终 basename 按 ASCII 大小写不敏感必须以 `.md` 结尾，
且 `.md` 前至少有一个字符（basename 恰为 `.md` 非法）。Node gate 须在分配 operation 前以
`unsupported_file_type` 拒绝；若畸形 request 仍到 Rust，Rust 防御门以同 code 拒绝且零
effect。`read_file` 超同一上限 fail closed。`list` 只列直接子项、
按 UTF-8 name 升序、
最多 2,000 项；超限返回 `limit_exceeded`，不得静默截断。它只是 env 内部操作，**不新增模型
`list` 工具**；现有 glob/grep 通过它遍历。codec 必须用 2,000 个各 255 UTF-8 bytes 的合法
name 构造 max-list 正例，证明完整 host_result 仍不越 1 MiB；未来字段扩形若令正例越限，须先
收紧 list cap 或修订协议，不得运行时静默少列。

proposal hash 不引入自研 canonical JSON。定义
`frame(x)=u32be(UTF8(x).byteLength) || UTF8(x)`，再对下列 frame 顺序拼接取 SHA-256：

- write：domain `courtwork.pi.workspace_write.v1`、sessionId、requestId、operationId、
  logicalPath、十进制 byteLength、contentSha256；
- read：domain `courtwork.pi.workspace_read.v1`、sessionId、requestId、operationId、
  operation、logicalPath。

`host_result.capability` 必须复述 request capability；`operation` 对
`workspace_write` 固定为 `write`，对 `workspace_read` 复述其 arguments.operation。
`host_result.status` 是 `ok|denied|failed|uncertain`。`ok` 的 value 与 request 严格同构：

- write → `{logicalPath,disposition:'created'|'overwritten',contentSha256,byteLength}`；
- exists → `{logicalPath,exists:boolean}`；
- read_file → `{logicalPath,content,contentSha256,byteLength}`；
- list → `{logicalPath,entries:[{name,kind:'file'|'directory'|'symlink',byteLength,mtimeMs}]}`；
  `name` 必须是单个合法 segment，`byteLength` 对 file 为非负安全整数、对 directory/symlink
  为 `null`，`mtimeMs` 为非负安全整数或 `null`；wire 的 `symlink` 是“不跟随链接”的统一投影，
  Windows junction/mount point/name-surrogate reparse point 也归此类，只可列名，永不读取。

codec 只证明 result 自身形状合法；有 pending 真值的状态机还必须保存**实际发出包的不可变镜像
字段**并逐值关联，不能只比较 operationId/capability/operation，也不能在回包时重读 runtime
仍可变的 arguments 对象。全部 status 都比较 requestId/operationId/capability/operation；
仅 `status:'ok'` 的 value 再逐值比较：write 比
`logicalPath/contentSha256/byteLength`，exists/read_file/list 比 `logicalPath`。非 ok 没有
value，不虚构比较。任一错配以 `request_mismatch` fatal，且不得调用 runtime 的
host-result consumer。

`denied` 只含 `{code:'user_denied'|'policy_denied',message}`；`failed` 只含
`{code:'invalid_path'|'not_found'|'not_directory'|'is_directory'|'symlink_forbidden'|
'limit_exceeded'|'hash_mismatch'|'state_changed'|'unsupported_file_type'|
'unsupported_filesystem'|'io'|'aborted'|
'interrupted',message}`；`uncertain` 只允许 workspace write，且只含
`{code:'durability_unknown',message}`。error message 最多 4096 UTF-8 bytes且不得含物理
路径/secret。`ok` 只带 value，其他状态只带 error。`denied|failed` 必须能证明目标零变化；
`uncertain` 明示目标可能已是完整新版本，既不能声称回滚，也不能复用授权自动重试。

Rust 在 write 授权前以 capability Dir 检查目标是否存在，派生
`created/overwritten` 静态动作标签并与 proposalHash 同笔落 `tool_proposed`；授权后、effect 前
再次检查，若动作已变则 `state_changed` 且零写。不存在模型自由“目的”字段，也不扩
`{path,content}`。

- Rust 为每个 journal entry 铸
  `{schemaVersion:1,eventId,seq,containerId,sessionId,leg,requestId,operationId?,type,recordedAt,payload}`。
  `requestId` 对 session 级事件为 `null`，对 `user_prompted`、prompt/turn/agent/effect 事件为
  对应 `SafeToken`；同一 operation 的全链必须回同一 request，恢复不得靠“最后一枚 prompt”猜。
  `type` 首版闭集为
  `session_started | session_resumed | user_prompted | agent_event | tool_proposed | authorization_decided |
  effect_started | effect_succeeded | effect_failed | effect_uncertain | turn_usage_recorded |
  prompt_completed | prompt_failed | prompt_canceled | prompt_budget_stopped | session_completed |
  session_budget_stopped | session_failed | session_interrupted`。
  对外发布一枚事件或终态前，必须先 append、文件 `sync_all`、再发布。unknown pi event 不可
  原样塞进 `payload` 逃过闭集。
  `effect_uncertain` 是显式终态：replace 已返回成功或已被调用但结果无法证明，而后续 filesystem/
  journal 屏障无法确认时尽力 durable 落账；落账成功才可回 `host_result.status:'uncertain'`。
  若该记录自身无法 durable，宿主立即终止 sidecar leg。
- journal 打开时先校验 JSONL：只允许把**最后一条未以 LF 结束**的 partial record 截断到前一枚
  durable LF 并再次 sync；任何已 LF 结束却 JSON/schema 非法的记录、event seq 缺口/重复、身份
  漂移或不可能的终态次序都必须 quarantine 整个 session，禁止自动修。只有结构/状态检查通过，
  才能执行下列 crash fold；全套 fold 完成并 sync 前不得启动 sidecar。
- **crash fold 次序固定**：
  1. 先补半闭合终态：已见 `prompt_budget_stopped` 而缺 session terminal，只补
     `session_budget_stopped`；已见要求关闭的 `prompt_failed` 而缺 session terminal，只补
     `session_failed`。已有 prompt terminal 时后续步骤不得再造第二枚。
  2. 再收 dangling effect：已见 durable `effect_uncertain` 且其 request 尚无 prompt terminal，
     补 `prompt_failed(effect_uncertain,false) → session_failed`；见 `effect_started` 而无
     `effect_succeeded|effect_failed|effect_uncertain`，先追加派生 `effect_uncertain` 再走同一
     关闭链。不得猜 succeeded/failed、复用授权或自动重试。
  3. 再收 active prompt 的预算：若仍无 prompt terminal，先 fold durable
     `turn_usage_recorded`。maxUsd 非 null 且 coverage unknown，补
     `prompt_failed(budget_unknown,false) → session_failed`；否则任一已知 limit reached，补
     `prompt_budget_stopped → session_budget_stopped`。这覆盖“第 maxTurns 回合已耐久、budget
     terminal 发出前 crash”，不得落成不可 resume 又无 session 终态的孤儿。
  4. 若 active prompt 预算仍 open，由于 v1 没有 provider-start ack，仍保守视为可能已付费：
     maxUsd 非 null 走 budget_unknown 关闭链；maxUsd 为 null 才追加 `session_interrupted`，并在
     payload 把 cost coverage 记 unknown，使累计 usd 保持 null。
  5. 若当前 leg 已由 `session_started|session_resumed` 打开、尚无 session/leg-close 且没有 active
     prompt（包括 ready 前 crash、prompt terminal 后 idle crash），追加不改变既有 cost coverage
     的 `session_interrupted`。

  步骤 1–4 产生的 session terminal 永久关闭 logical session；步骤 4 的 maxUsd-null interrupted
  与步骤 5 只关闭当前 leg，可由用户显式启动 after_interruption 新 leg。
- journal 映射固定：每枚 prompt terminal 只落
  `completed→prompt_completed`、`failed→prompt_failed`、`canceled→prompt_canceled` 或
  `budget_stopped→prompt_budget_stopped` 之一。budget terminal 随后再落
  `session_budget_stopped`；`budget_unknown|effect_uncertain`、fatal protocol 或不可恢复宿主错
  以及任一 `retryable:false` failed 随后落 `session_failed`；只有
  `provider_error|host_error + retryable:true` 的 prompt_failed 不顺便关闭 session。idle
  shutdown 落
  `session_completed`。普通 EOF/kill 只有在上条 crash fold 第 4（maxUsd null）/5 步落
  `session_interrupted`，它
  关闭当前 sidecar leg 而不销毁 workspace；用户显式再次运行时先落 `session_resumed` 再启动
  新 leg。任一 `session_completed|session_budget_stopped|session_failed` 都是 logical session
  终态，后续 bootstrap 必拒。
- 首版恢复只承诺 **journal/UI replay、workspace 与累计预算恢复**，不伪称 pi 模型上下文无损续跑。
  `after_interruption` 的 Agent message context 从空开始，projection 必须显示上下文断点；用户的
  下一 prompt 是新请求。需要压缩/重建模型上下文时，由 ADR-021 的后续工作语义契约解决，不能在
  host 票里暗塞不可审计摘要。
- `loop/` 是 ADR-019 的**逻辑容器子档**，物理上属于 ADR-005 规定的 app-data 状态平面，
  不是用户案件根里的可见文件夹。精确落点为
  `app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl`；`containerId` 与 `sessionId`
  都须为单一安全 token。它不入场景 Turn journal、确认账本或跨容器索引；提供按 container
  整删的宿主原语。用户文件仍只在 `<grant-root>/工作稿` 与 `<grant-root>/产出`。
- 预算沿已证链 `turn_end → recordTurn → abort()`：投影只可说“达到/超过上限后已停止”，同时
  给实际累计值、上限与最后完成回合；不得称硬上限或 RuntimeGuard 等价。压线末回合可使实际值
  高于上限，但其后不得再发 provider request；canceled/failed 且 usage unknown 的回合不得
  伪记为零，而须把累计 `usd` 传染为 null。若 `maxUsd` 非 null，一旦任一回合费用未知，当前
  prompt 以 `failed + budget_unknown + retryable:false` 收束并落 `session_failed`，之后零 provider
  request；若 `maxUsd` 本就为 null，只继续执行 turn 限额并诚实显示费用未知。**产品预算按
  `sessionId` 累计，不按 prompt 重置**：每次 prompt 和重启都从 `turn_usage_recorded` fold
  恢复；现行 dev `session.ts` 的 per-prompt `reset()` 不得进入产品 session。第二次
  prompt/replay 重置累计值、或把 null 恢复为 0 的 mutation 必须触红。每枚
  `turn_usage_recorded` 同时持久 observed ordinal 与 counted flag；resume 的
  `priorObservedTurns` 从前者最大值 fold，`priorTurns` 只数 counted，二者不得互推。

### 六-C · 能力阶梯

| 阶 | 可交付能力 | 不可越过 |
|---|---|---|
| A0（现行） | dev-only read/glob/grep，进程退出即散 | 不宣称产品面 |
| A0.5（write 核心证据） | 直接注册 pi 原版 `createWriteTool()`；用可注入 host port 在空 workspace 创建、覆盖、建父目录并回读 | 只算 package/headless 证据；无 Rust journal 不称产品底座 |
| A1（生产宿主） | stdio wire、sidecar 分发、Rust 生命周期、container-scoped JSONL、replay/cancel；Node 达到 `process` 但不称 sandbox | 零 GUI、零 Node fs 写/exec |
| A2（薄 harness / Markdown headless） | read/glob/grep + pi `write` 经 Rust workspace effect；逐次授权、恢复、write 后可读，以真实 `.md` 任务矩阵独立验收 | 未通过总验不得称 product-live，不注册 edit/bash/remove |
| A3（基础 GUI） | `PI-LANE-UI-1` 只投影 A2 journal/command，并提供 workspace `.md` 只读查看；另做 `PI-BASE-GUI-ACCEPT` | 不夹 Dossier、垂类修订、plan/source/queue 或第二状态真源 |
| A4（原生能力生长） | ADR-021 Dossier、垂类“修订/晋升”与相应 UI 巧思按实证嫁接同一底座 | A2+A3 未独立验收不得开工 |
| A5（具名脚本） | 仅 ADR-017 的 `scriptId → 固定 argv`；真实 kit 证据到来才可排产 | 无自由 shell、后台、TTY、运行时加白 |

A0.5/A2 的工具与 workspace 精确语义如下：

- 工具定义**直接使用** `@earendil-works/pi-agent-core@0.82.1` 的
  `createWriteTool()`：参数固定 `{path,content}`；不存在即创建、存在即覆盖、父目录由
  Courtwork `ExecutionEnv.writeFile` 兑现；不 fork、不改名、不另造 `create_work_draft`。
  上游 TypeBox schema 本身是开放 object，会接受额外字段并发生 primitive→string coercion；
  产品必须在 `beforeToolCall` 对 raw arguments 做 exact-key/type gate，不能把“上游参数看起来
  只有两项”误写成 strict schema。
- agent 可见两枚逻辑根：只读 `/case` 与可写 `/workspace`。四件工具的裸相对路径以同一口径落
  `/workspace`（2026-08-05 修订；原「read/glob/grep 默认 `/case`」两义口径废止），读取案件
  材料一律显式 `/case/` 前缀。write 仍允许把虚拟绝对 `/workspace/<safe-relative-path>`
  规范化为同一 logicalPath，`/workspace` 根本身、`/case` 或其他绝对路径一律拒绝写。read 必须
  能显式读取 `/case/...` 与 `/workspace/...`，写后回读同串即同文件；路径结果和错误不得泄露物理根。
- `/workspace` 物理落点固定为
  `app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`，新 session 初始为空、按 container
  可整删；它是过程 artifact，不是用户原件、工作稿或产出。原件与 `产出/` 对 write 根本不可寻址；
  workspace 内容进入用户「工作稿」须等垂类修订/晋升契约。
- 只允许一层极薄 binder：保留上游 `name/label/parameters`（parameters 对象同一性
  有 characterization）；`description` 保留上游原文，仅许在其后追加产品寻址口径（2026-08-05
  订正，与本节逻辑根口径同批），不得改写或删减上游文字。仅把上游五参 `execute` 适配为
  Agent 四参 execute；binder 使用 raw
  `toolCallId` 从 per-leg registry **查取 event projector 已分配的公开 tc**，创建
  invocation-scoped write env，再原样调用一次上游 execute。真正进入 `writeFile`/发
  `host_request` 时由 registry 为该次 operation 分配新 op；binder 不预分配 tc/op。不得复制
  schema/execute，不得使用共享 mutable `currentOperation`。
- write 专用虚拟 `ExecutionEnv` 只实现路径归一、`canonicalPath:not_supported` 与
  `writeFile → host_request`；append/remove/temp/exec 均 `not_supported`。raw path 若以 `@`
  开头或含上游会静默折叠的 Unicode space，必须在调用上游前拒绝，避免 alias 改写真实目标。
  Rust 收到
  `{logicalPath,content,contentSha256,byteLength}` 后再次拒绝绝对路径、`.`/`..`、symlink/
  junction/name-surrogate reparse point、非安全 token 与越界；Node 生产码零 fs 写。上游
  `NodeExecutionEnv` 永禁案件根与 workspace。
- binder 固定 `executionMode:'sequential'`，产品 `Agent` 同时显式固定
  `toolExecution:'sequential'`（0.82.1 缺省为 `parallel`）；双锁均须 characterization。上游
  mutation queue 只按“同一 env 对象 + canonical path”串行，invocation-scoped env **不共享**
  该 queue，故产品只依赖 Agent 顺序执行与 Rust container/session 串行 effect，不能拿 upstream
  queue 冒充持久化并发控制。
- 上游成功文案的 `${content.length} bytes` 实为 UTF-16 code units；产品的 UTF-8
  `byteLength`/hash/proposal/UI/journal 一律从原 content 独立计算，禁止解析或持久化该文案。
  同样禁止从上游通用 error 文案判断 effect 是否发生；唯一真源是 host_result + Rust journal。
- 每次写均走 `tool_proposed → authorization_decided → effect_started →
  effect_succeeded|effect_failed|effect_uncertain`。授权与 proposal hash 持久并 `sync_all` 后
  Rust 才可进入 effect 准备；`effect_started` 本身还必须成功 append + `sync_all`，它是第一次
  temp create/write/replace 或其他物理 mutation 前的最后一道门，落不住则零 mutation。journal
  只记 logical path/hash/byteLength/outcome，不复制正文。
  headless 验收的 decision driver 必须显式注入，不得用 session always-allow 冒充产品授权。
  `effect_succeeded` 只在受测本地 filesystem 上 `TempFile::replace`、该平台要求且可用的持久化
  屏障和成功 journal 屏障全部完成后发布；并发 reader 必须只见完整旧版或完整新版。replace 调用
  前失败且可证明目标未变才可落 `effect_failed`；replace 已成功、或调用后无法证明目标未变而后续
  屏障失败，必须落/派生 `effect_uncertain`，随后以 `tool_finished:uncertain` 和
  `terminal failed + effect_uncertain + retryable:false` 收束当前 prompt，并由 Rust 落
  `session_failed` 关闭 session，不得自动重试。atomic visibility、durable success 与 power-loss
  durability 是三个不同主张；Windows 只承诺实测且平台 API 能证成的层级。
- “修订”当期明确不做：无 pi `edit`、无 `oldText/newText`、diff review、CAS、merge 或用户文件
  promotion。它们只能由后续垂类契约引入，不能夹进 write 票“顺便完善”。
- 这一路是受信 Rust 宿主执行已确认 workspace effect，Node 只提案，因此按 ADR-018 计
  `process` 而非 `os_confined`。任何 Node 直写或 bash 仍须先满足 `os_confined` 与越界反例。

#### 六-C.1 · 宿主并发与中断模型（2026-08-05 修订，`PI-HOST-CONCURRENCY-1` 前置）

背景实证（2026-08-05 架构层验收④）：`prompt()` 阻塞独占 `&mut self` 且无总时限，`cancel()`
需同一独占借用，故 prompt 在泵中时结构性无人可调；`WriteDecisionDriver::decide` 同步跑在同一
阻塞泵内，授权等待期间 host 线程整体卡住。A1 已把 cancel 列为可交付能力，
`PI-BASE-GUI-ACCEPT` 要求 Stop race 真测——以原 API 形状该测试写不出来，借用检查器先拦。

- **宿主线程独占**：每条 logical session 的 `PiLoopHost` 由一条专属宿主线程独占持有并独占
  驱动；同步内核（四段账序、编码先于效果、普适电池所锁语义）不改形。单写者不变量由线程
  独占继承，不新增第二状态真源。`start` 属构造入口（届时以 Tauri command 落形），不在
  运行期命令闭集内。
- **入站命令通道**：外部（Tauri command 层、headless 驱动）只经入站命令通道与宿主线程
  交谈，运行期命令闭集 `prompt | cancel | decision | teardown`。命令通道是进程内端口
  （ADR-009 2026-08-05 窄修订），与六-B 的 wire 闭集不同层，不得混写。活动 prompt 期间新
  prompt 命令具名拒绝、不排队（与六-D 禁 queue 同源）；闭集外或错序命令 fail-closed 具名
  拒绝，不静默丢弃。
- **泵的可唤醒性**：泵的任一等待点（sidecar stdout 等待、授权回执等待）必须同时可被命令
  通道唤醒；实现形态（有界轮询切片或 reader 线程双源 recv）由实现票冻结。活动 prompt 本体
  无总时限的例外维持不变——可中断性由 Stop 保障，不由时限保障。
- **cancel 可达**：cancel 经命令通道在 prompt 泵中可达。wire 端语义零改：六-B.1 的 cancel
  包、race-late no-op、在途 host request 先收束、`effect_uncertain > cancel` 优先级与
  cancel→terminal 有界 deadline 全部如旧。
- **decide 改「投提案＋等回执」**：`WriteDecisionDriver` 的同步签名保留为内核契约；产品
  driver 的形态是「经投影面呈现提案，阻塞等待命令通道上的 `decision` 回执」。回执须携
  operationId 对齐当前悬置提案，错配即失效丢弃并显式登记。等待期间命令通道必须仍被服务：
  回执到则按回执收束；**Stop 到则悬置提案立即以 `authorization_decided(denied,
  user_denied)` durable 收束**（Stop 蕴含拒绝，不新增 wire 拒绝码），host_result 照四段
  账序发出后走既有 cancel 路径。等待无时限——授权属用户，系统不代拒，但必须可被 Stop 与
  teardown 收束teardown 收束与 Stop 同形（同码 `user_denied`，不新增
  wire 拒绝码；2026-08-05 随④交验追认）。
- **回执不得追溯生效**：`decision` 回执只对当前唯一悬置提案有效；提案已收束（含因 Stop
  收束）后到达的回执一律失效丢弃并显式登记，effect 恰零次。这是 Stop race 真测的判定核心。
- **悬置提案不跨 leg**：等待期间 session 中断（crash/teardown）时，journal 允许 leg 尾部
  存在无 decision 的 `tool_proposed`（仅限尾部一枚）；恢复不自动重提、不代答，新 leg 由
  模型重新提案。读侧校验按此收口，leg 中部无 decision 仍拒。
- **fail-closed 边界不变**：production 无 driver 恒 `policy_denied`；本修订只定义有 driver
  时的产品形态。journal payload 闭集与 wire 闭集零变化。

### 六-D · OSS 与 GUI

- 不直接引入整包 `@earendil-works/pi-coding-agent`：当前 core 为 0.82.1，而该包会连带 TUI、
  动态扩展、图像与 CLI。首批只从已安装 core 直接调用 `createReadTool/createWriteTool`；继续保留
  本仓 scoped glob/grep，避免把上游可调用/下载的 `fd`/`rg` 变成产品隐式依赖。上游
  `NodeExecutionEnv` 与 `bash(command:string)` 仍拒绝。
- Rust workspace 文件边界 exact 同版本依赖 Bytecode Alliance 的
  `cap-std/cap-fs-ext/cap-tempfile@4.0.2`（能力目录与 no-follow/tempfile 扩展，支持
  Linux/macOS/Windows；三者许可同为
  `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT`）。`cap-std` 只保证链接解析不逃出
  capability root，**不保证 root 内 symlink 一律不跟随**，故不得单独把它写成 no-link 证据。
- mutation 从已授予 workspace `Dir` 起逐个安全 component 下降：先
  `open_dir_nofollow`；仅 `not_found` 时 `create_dir(single_component)`，随后重新
  no-follow 打开并继续持有返回的 `Dir` handle；新建目录后还须完成该平台支持的父目录 entry
  屏障。最终 basename 同样 no-follow 检查。
  `create_dir_all`、canonicalize 授权、ambient absolute path、mutation 退回 `std::fs` 与
  remove-then-rename 全禁；Windows 还须把 junction/mount point/name-surrogate reparse point
  纳入拒绝矩阵，未在 Windows runner 证成前不宣称该平台 no-link 已放行。
- 同目录临时文件和替换直接用 `cap_tempfile::TempFile`：受信宿主只编排私有权限、write、
  file `sync_all`、`TempFile::replace`、目标平台支持的父目录屏障与 journal 状态机，不自研
  临时名或平台 rename primitive。Unix workspace dir/file 分别收紧为 `0700/0600`；Windows
  沿受信 app-data ACL 并真机复核。命名 temp 经 kill 残留只由 session workspace GC 回收。
- 这是 capability filesystem，不是 OS sandbox；不得据此把 sidecar 等级写成
  `os_confined`。实施票须用真实 Tauri target 与本地 filesystem 跑链接、并发 reader、kill
  window 与平台占用反例。远程/移动/未实测 filesystem 不宣称 atomic visibility 或断电
  durability；失败即回架构，不自建替代路径库。`open_parent_dir/open_ambient_dir/
  create_ambient_dir_all` 等 ambient escape API 在 workspace 模组零出现。
- `PI-LANE-UI-1` 直接依赖 MIT、React 18/19 兼容的 `@assistant-ui/react` **headless
  primitives + 公共 `useExternalStoreRuntime` hook**。只提供 `onNew/onCancel` 与 Courtwork
  journal projection 所需的最小 adapter；未提供 callback 的 edit/reload/branch/queue 必须保持关闭。禁止
  `LocalRuntime`、Assistant Cloud、AI SDK/AG-UI/OpenCode adapter、其 thread persistence/export
  与 stock Tailwind/shadcn 皮层。Courtwork 继续拥有 provider、loop、session、授权与持久真源。
- 基础 GUI 必须让用户核验 app-data workspace 中已经成功写入的 `.md`，否则“write 成功”不是
  可用工作闭环。文件索引只从同 session journal 的 write proposal + succeeded effect fold，
  不扫描成第二真源；打开时只经 Rust command port：
  `openWorkspaceMarkdown({containerId,sessionId,logicalPath}) →
  {logicalPath,content,contentSha256,byteLength}`。Rust 复用同一 workspace capability/path grammar，
  extension 按 ASCII 大小写不敏感只收 `.md`、UTF-8 且不超过 131,072 bytes，返回当前内容与重算
  hash。失败闭集为
  `session_mismatch|invalid_path|not_found|is_directory|symlink_forbidden|limit_exceeded|
  unsupported_file_type|io`；message 最多 1,024 UTF-8 bytes，额外字段、物理路径与 secret
  均拒。WebView 不见物理路径，正文不写回 journal。视图复用 desktop 既有 `ChatMarkdown`
  安全 renderer（raw HTML 不执行），只读、可关闭；无编辑、保存、rename/delete、diff、
  promotion 或 filesystem API。
- `effect_uncertain` 不能混进 succeeded 索引，但其工具卡必须提供“核验当前 workspace 文件”
  动作，以 proposal 的 logicalPath 调同一 `openWorkspaceMarkdown`；`not_found` 或当前
  bytes/hash 都如实显示并标 `unverified`，绝不把核验结果补写成 succeeded。打开 succeeded
  索引项时若当前 hash 与该项已落账 hash 不同，也必须显示“当前内容已不同于已确认版本”，不能
  用当前内容冒充历史成功版本。
- 实现前锚定当时 exact version（2026-07-28 npm latest 核实为 0.14.28）、复核 MIT/传递依赖并实测
  bundle delta 与 Tauri WKWebView；只用稳定公开 API，`unstable_*` 禁入。首版最大回合仍为 12，
  不为假想长列表先加虚拟化；达到有测卡顿/节点量阈值后再评 `react-virtuoso`。现行
  `@tanstack` 禁令不为 assistant-ui 官方 virtualization 示例开例外。
- Logue、OpenWork/OpenCode 等只证明成熟 agent GUI 的交互面已收敛，可借工具状态、授权、来源、
  Stop/恢复等行为；它们不是指定视觉参考或可嵌入组件。OpenWork 还拥有 server/SDK/session/SSE
  与多壳生命周期，不能被误写成 Courtwork 的薄依赖。
- [Open WebUI v0.11.0](https://github.com/open-webui/open-webui/releases/tag/v0.11.0) 只补两条
  行为证据：展示投影的流态更新可以合并到至多每个 animation frame 一次，但任何 terminal
  必须取消 pending frame 并立即 flush；自动跟随只在用户仍贴近底部时成立，用户上滚读史后
  streaming、Stop 与 terminal 均不得夺回视口。合帧只作用于 React 展示投影，Rust journal
  逐事件持久与发布顺序绝不合并。其 Svelte/Socket.IO/backend、`content-visibility` 长列表
  路径与源码均不接入；首版仅 12 回合，且 Tauri WKWebView 不为该方案承担 WebKit 风险。该版本
  受 [Open WebUI License](https://github.com/open-webui/open-webui/blob/v0.11.0/LICENSE) 及
  [LICENSE_NOTICE](https://github.com/open-webui/open-webui/blob/v0.11.0/LICENSE_NOTICE)
  约束，不满足本项目直接复制或依赖口径。
- **成熟 GUI 机制不等于 Design 答案**。`PI-LANE-UI-1` 不再增设“先确定全部前端”的设计
  前置票；给 Opus 的权威输入是本节业务边界、`docs/design/` 现行原则/token、功能状态矩阵、
  anti-slop 禁区与已筛选参考，构图、比例、信息层级、间距、浅色 token 微调和合规微交互由
  实现会话在真实截图中完成。不得提前冻结 wireframe 或以“像某参考站”作为验收标准。
- 首轮 craft **浅色先行**：保持冷色而把亮层拉向冷白、墨/深控件与关键边界压深，拒绝用中等
  藏青覆盖全站；气质取扁平、版本目录学、克制的制度/档案式反乌托邦，不取 cyberpunk。
  现行 dark token 仍须结构、对比、溢出与状态可辨回归，但磁青宗精修不阻塞浅色基础 GUI，
  新组件不得为 dark 写版式或状态分支。
- 负面护栏锁紫蓝霓虹渐变、玻璃、pill/圆角/卡片汤、shadow stack、无意义 dashboard、裸
  spinner 与永久 skeleton/shimmer、弹簧/抬卡/crossfade、装饰网格/噪点、法槌/天平/卷轴及
  伪古文交互词。OpenDesign 只借“截图 + computed style + 11 层 + Don'ts”的参考打包方法；
  Moda 只借反馈时机；Logue/Open WebUI/OpenWork 只借成熟形态，均不成为视觉真源。调研证据见
  `archive/research-gui-design-direction-2026-07-28.md`（史料线索）。

### 六-E · 分发与发行拆票

`PI-WRITE-PROOF-1`、`PI-SIDECAR-DIST-1` 与 `PI-CODE-STDIO-1` 可从同一已验收基线并行：
write proof 只新增 `workspace-write-env.ts` 与定向测试，不改产品 tools/session/policy；
STDIO 票只新增 strict codec、可注入 stdio machine 与定向测试，不改 env/tools/session；
分发票不得改生产 wire/session 源码。三票只写各自预留的 SPEC 回执行。

1. `PI-SIDECAR-DIST-1` 比较 Node 22 LTS runtime + sealed JS bundle 与 Node SEA；两路都按
   Tauri `bundle.externalBin` target-triple 形态，用会真实 import pi core 的 fixture 实测体积、
   冷启、stdin/stdout、abort、崩溃回收与 aarch64/x86_64 装配。它只交路线建议与工程证据；
   路线由架构回写本 ADR 后，生产宿主票才开工。
2. `PI-SIDECAR-RELEASE-1` 独立承担 Developer ID、逐件 nested executable 签名、
   notarize/staple、Finder 首启与 `spctl`。`codesign --deep` 只作 verify，不能代签；无凭据
   如实标 external-validated blocked。该票是未来 released 前置，现行 **parked**，不阻塞
   底座、GUI 或个人 debug。
3. `PI-DEBUG-BUILD-1` 只在 `PI-BASE-GUI-ACCEPT` 放行后构建 exact accepted `productSha`
   的 arm64 Tauri `.app` / DMG；`productSha` 固定为 build receipt 出现前、clean local
   `main` 上已含 GUI 放行记录的产品 tip。文件名固定
   `Courtwork_debug_<short-product-sha>_aarch64.dmg`，复制到仓库外
   `/private/tmp/courtwork-debug-builds/<full-product-sha>/<dmg-sha256>/`，路径已存在时只接受
   byte-identical，随后去掉写位。`spctl` 拒绝是未公证 debug 件的预期边界，不得伪绿。

`PI-DEBUG-BUILD-1` 不改四处产品版本，不写 `release/*.sha256`、Release notes、
`release/DEPLOYMENT.md`、`current.md` 或 site/README 版本真值；不 tag、不 push、不创建
GitHub Release/asset、不 notarize/staple、不宣称 `released` / `product-live`。它不依赖
`PI-SIDECAR-RELEASE-1`，成功成熟度最多为 `external-validated`，且验证范围只到维护者个人
debug。既有
`v0.1.2` 公开历史原样保留。构建会话只可新增
`packages/pi-lane/specs/PI-DEBUG-BUILD-1.md`；独立验收会话只可追加
`apps/desktop/ACCEPTANCE.md`。这两枚后置文档提交不改变 `productSha`，也不得以自身新 tip
重建替换已验 exact DMG。

#### `PI-DEBUG-BUILD-1` 物理证据与签名闭口

本票在 sidecar 路线裁定后仍**不可直接派发**。架构角色须先把该路线的精确签名表冻结为
`packages/pi-lane/specs/PI-DEBUG-BUILD-1.signing-plan.json`；该 blob 必须已在 `productSha`
tree 中，manifest 以 repo-relative path + byte SHA 双绑，不能引用后置提交中的未来表。每行恰含
`relativePath/kind/architectures/signingOrder/entitlementsSource/entitlementsSha256/
hardenedRuntime`，顶层另含 `routeId/schemaVersion`，所有层 `additionalProperties:false`。
表的路径闭集来自最终 `.app/Contents/{MacOS,Frameworks,PlugIns,Resources}` 的递归
Mach-O/executable inventory，而非文件扩展名猜测；entitlements 为 `none` 时也须显式登记。
此时 `entitlementsSource:"none"` 且 hash 固定为空字节 SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`；其他值只能是架构冻结的
canonical plist repo path 及其 byte hash。
路线未知、表未冻结、字节/hash 未定、实物少件/多件/非 regular/symlink、架构漂移或出现表外
executable 均为 `debug-blocked`，实现者不得现场决定。

签名严格按 `signingOrder` 由最深 nested executable 向外层 `.app` inside-out 执行；每件只消费
表中 canonical entitlements bytes，以 ad-hoc identity 单独签名，再逐件执行
`codesign --verify --strict --verbose=4`，抽取实际 entitlements 做 canonical plist 比较并复算
hash。最外层签完再做整包 strict/deep verify；`codesign --deep` 只可作最后 verify，永不代签。
任一步非零、实际 entitlements 与表不等、hardened runtime 漂移或签后 executable hash 未进入
manifest 都不得产出 debug artifact。

同一架构会话还须在派单前冻结
`packages/pi-lane/specs/PI-DEBUG-BUILD-1.manifest.schema.json`；它是 JSON Schema Draft
2020-12、全层 `required` + `additionalProperties:false`、零 nullable，并精确约束：commit/tree
OID 为当前仓库 40 位小写 hex，SHA-256 为 64 位小写 hex，byte length 为正 safe integer，
repo/executable path 是 `/` 分隔的安全相对路径且无空段、`.`、`..`、反斜杠或 NUL，
`buildArgv` 为非空 string 数组，版本/identifier 为非空 string，architectures 为去重排序的
`arm64|x86_64` 非空闭集；inventory `kind` 与 host architecture 的 enum 随已裁路线在该 schema
中闭死。该 schema blob 同样必须属于 `productSha` tree 并由 manifest path + hash 双绑；实现者
不得另写 validator 语义。

DMG 与 manifest 在同一仓库外最终目录。构建会话先在唯一 staging 目录生成，计算 DMG SHA 后
以拒绝覆盖语义发布，再将严格 JSON `manifest.json` 通过
`manifest.json.partial → fsync → atomic rename → parent fsync` 落定，最后才把 DMG、manifest
与目录去掉写位。manifest 必须通过上述 repo schema，`schemaVersion:1`，顶层恰含：

- `productSha/sourceTreeOid/gitStatusPorcelainSha256/pnpmLockSha256/cargoLockSha256`；
  `sourceTreeOid` 必须等于 `productSha^{tree}`，clean porcelain 的 hash 必须等于上列空字节
  SHA-256；两枚 lock 分别固定根 `pnpm-lock.yaml` 与
  `apps/desktop/src-tauri/Cargo.lock`；
- `routeId/manifestSchema/debugSigningPlan/buildArgv/toolchain`；`manifestSchema` 与
  `debugSigningPlan` 均恰含 `repoRelativePath/sha256`，且前者 path 固定为上列 schema、后者固定
  为上列 signing plan；`buildArgv` 是 argv 数组，不存 shell；
  `toolchain` 恰含 `nodeVersion/pnpmVersion/rustcVersion/cargoVersion/tauriCliVersion`；
- `dmg:{fileName,byteLength,sha256}`；
- `app:{bundleIdentifier,shortVersion,bundleVersion,buildInventory,mountedInventory}`；
- `host:{macOSVersion,buildVersion,architecture}`。

两份 inventory 均为按 `relativePath` 排序的精确闭集，每项恰含
`relativePath/kind/architectures/byteLength/sha256/signatureIdentifier/
entitlementsSha256`；build 与只读挂载副本的主程序、sidecar 与全部 nested executable 必须
逐项同集、同 bytes/hash。manifest 不含自身 hash；构建回执只引用唯一
`productSha/manifestPath/manifestSha256/dmgSha256/dmgByteLength`。同一 `productSha` 即使存在
多个不同 DMG，独立验收也只能消费回执指定的 manifest 与 exact DMG，禁止任选。验收必须从
`productSha` tree 读取 schema 与 signing plan、先核两者 byte hash，再校验 manifest 和实物；
当前 worktree 或后置回执 tip 的同名文件均不是权威输入。

构建/回执会话不得启动、书写或判定 acceptance。另一**不同会话**须从独立 clean worktree
开始，先逐字核回执 → manifest SHA/schema → productSha/tree/locks → physical DMG bytes/SHA →
mounted inventory/signing plan，再从只读挂载直接启动真实 Tauri/WKWebView；同一会话、同一
worktree、缺 manifest 或换 DMG 一律 REJECT。验收矩阵两格缺一不可：

1. 直接驱动随包 sidecar 的 deterministic provider control，复跑 read/write/Stop/crash/restart，
   区分装配/协议失败与外部 provider 波动；
2. 从 mounted App 以维护者真实 DeepSeek key 跑 read→proposal→允许/拒绝 write→workspace
   回读、Stop 与重启。

确定性格或物理同一性任一失败记 `debug-blocked`；真实 key/model 缺席只能记
`external-validated blocked`，不得放行。manifest、回执、验收报告和命令输出不得含 key、
`Authorization`、原始 prompt 或 workspace 正文，只留长度、hash、状态与必要的逻辑路径。

`PI-SIDECAR-DIST-1@3207b27` 的独立验收 `9b8142f` 判定 **REJECT**，故其 SEA-default 建议
不是架构输入，路线仍未裁。拒绝不表示两路线功能失败，而是装置会把 stdio/abort/crash 失败
只写进 JSON 后仍报 `status:'ok'`，还会静默跳过缺失产物；验收侧取得的 Node 22 archive 又未过
官方 SHA 门，双架构制品无法独立重建。

返修 `PI-SIDECAR-DIST-1R` 只修实验可信度，不改生产契约。库存闭集固定为两架构各三枚
sealed 产物与两枚 SEA 产物：其中两枚 `esm-naive` 是必须以既知 dynamic-require 原因失败的
负控，其余八枚才是候选。少件、多件、错 version/arch/SEA 身份、任一 probe 失败或 blocked
都须令顶层 verdict 与进程非零；不得以「失败也是数据」把候选失败降格成成功。stdio 须锁
ping、三 payload 的 byte/hash、exact tool set、真实 read loop 与 clean EOF；abort 须锁在途
ack、`aborted`、继续 ping 与 clean EOF；四种 crash 须锁 exact code/signal 及复启。三轮冷启
逐轮随机化八候选并保存顺序，不设性能胜负阈值。

官方 Node 只从固定 nodejs.org 版本目录取，先写唯一 partial，核下载的 SHASUMS 对应项、已冻结
byte size/SHA、tar 完整性与解包后的 version/Mach-O arch，全部通过后才原子落正式名；现存正式
archive 也须先验，错件不得覆盖。该门只证明 HTTPS 来源的传输完整性，不冒充 release-key
供应链认证。两次空目录重建须再锁 sealed/default 可复现、code-cache 不可复现与跨架构 warning；
ad-hoc/sign synthetic `.app` 仍只算同机探针，绝不冒充 Tauri bundler、Developer ID 或公证。
返修经另一会话放行后，架构才消费报告并在本节裁路线。

`PI-SIDECAR-DIST-1R@61c2b09` 的独立验收 `f261347` 再判 **REJECT**。三枚 production
反例分别坐实：磁盘真实多出 `route-a/unexpected-physical/proof.txt` 后 `measure` 仍
`status:'ok'`；首枚 cold-start 身份错误、后 24 枚正确会被漂移后的 identity 洗白；SEA
default 的 `shas:[null,null]` 会被 JavaScript 相等性当作可复现。另有两处尚未形成有界失败：
packet 驱动的 crash ack/exit 可无限等待，SEA remove-signature/sign/strict-verify 的非零退出
不决定 variant 状态。故 R1 的 102 绿测、31 枚自报 counterexample 与全仓绿门均不赋予报告
消费资格，路线仍未裁。

`PI-SIDECAR-DIST-1R2` 只闭合实验装置，不改变产品 wire 或路线候选。十件可随包制品须进入
唯一 `dist/assembly`，构建暂存、runtime、corpus、JSON 与反例留档全在其外；assembly 内每个
route/target/variant 目录及 basename 是 `readdir` + `lstat` 得出的精确闭集，额外文件、目录、
symlink 或非 regular file 一律失败。cold-start 保留并校验每轮 25 枚 identity/EOF 样本，
warmup 只从统计排除，不能从安全门排除；任何 drift 失败。双 cycle 的每份 observation 先证明
文件存在、是 regular file、字节数为正且 SHA 是 64 位小写 hex，再谈相等或不等。crash 的
ack/exit/respawn-ready/respawn-EOF/kill-confirm deadline 分别固定为
15,000/15,000/30,000/15,000/5,000 ms，超时写结构化 failure、清理子进程并非零退出。SEA
按 remove-signature → postject → ad-hoc sign → strict verify 全部成功后才从 staging 发布，
任一步失败不得留下或复用旧成品。

残留口径在此拍板为**并列而非订正**：`3207b27` 的 `2,436,991,750 B（2.27 GiB）` 是原实验
保全范围的历史峰值；R1 的 `2,527,892,648 B（2.35 GiB）` 来自包含 31 份反例、cross-arch
与 final 读数的较大保全范围，不能“取代”旧值。R2 须另报其最终实际总数与逐项求和。报告只可
称 SEA default 在同 worktree、同绝对路径的两次空 assembly 构建 byte-identical；换路径变化与
Developer ID 后净体积均属未实测。负载超时只登记本次观察，不形成免责频率。许可口径固定为
Postject 自有部分 MIT、package 内 `vendor/LIEF` 为 Apache-2.0；是否进入最终分发件及 notice
义务归发行票复核。

`PI-SIDECAR-DIST-1R2@33100d8` 的独立验收 `9ebb92a` 第三次判定 **REJECT**。验收先以
`850fa11` 修掉一处实现级假绿：SEA 成功行的 `publishedPath` 原只要求非空，故
`../bogus` 会通过；返修后必须等于该 target/variant 的唯一 assembly cell。该修复与对应首红、
mutation 均须保留。最终拒绝点在 sign probe：同一枚已过来源门的官方 arm64 Node
（SHA-256 `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`）上，
`codesign -d --entitlements - --xml` 虽 exit 0，却给出 0-byte stdout 与
`invalid entitlements blob` 警告；旧脚本因此无法生成临时 plist，两枚
hardened-with-entitlements 格正确 blocked。实现会话另一时点留下的 568-byte 抽取件与六格
全绿是真实历史观察，但没有绑定当时的 OS/codesign 身份，不能替代独立复现。架构后续在**同一
主机、同一 `/usr/bin/codesign`、同一 Node SHA** 做成对复核，已坐实分叉来自执行域：Codex
seatbelt 内重现 0-byte/invalid，批准的非受限执行中得到 568-byte XML，SHA-256
`cf2c3d27530139c19ee66f289be8169991dc3206322d5df3c22f529c136883e6`，逐键等于上游
六键；官方 signature verify 与旧 synthetic `.app` 的 `spctl` 也分别呈现
`Authority unavailable`/`internal error` 对真实证书链/`rejected` 的同形分叉。故 R2 的两份
观察都真实，错误是没有把 security execution domain 当成证据前提，并把环境 preflight 失败
误归为 entitlement 内容失败。另以只读 Mach-O SuperBlob 交叉核实：官方实物同时带 legacy XML
`-5` 与 DER `-7` 槽，CodeDirectory special-slot hash 均匹配；`-5` 的 632-byte payload 与上游
plist **逐字节相同**，`-7` 亦解出同一六键真值。因此 seatbelt 内的 warning 不是原始 blob
损坏证据。

`PI-SIDECAR-DIST-1R3` 只修这条证据链，不改变两条路线、库存、功能 wire 或产品签名方案。
架构现冻结四层，严禁再混成一层：

1. **canonical 输入来自 Node 上游源码，不来自本机抽取。** Node `v22.23.1` annotated tag
   `af059a8d162418050857e202315220d1b79a6d03` 解引用到 commit
   `bd96dfbf0361576724b65322046e2ca9f9609cb9`；该树的
   [`tools/osx-codesign.sh`](https://github.com/nodejs/node/blob/bd96dfbf0361576724b65322046e2ca9f9609cb9/tools/osx-codesign.sh)
   （Git blob `346afdbe66e9fda3349c46b5ccae221160313720`）明确把
   [`tools/osx-entitlements.plist`](https://github.com/nodejs/node/blob/bd96dfbf0361576724b65322046e2ca9f9609cb9/tools/osx-entitlements.plist)
   传给 `codesign --entitlements`。后者恰 632 bytes、Git blob
   `045df8eaf98e65e4fb4ea9a82b5821d41590dbdd`、SHA-256
   `a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797`。R3 只许把这
   632 bytes 原样存为
   `packages/pi-lane/fixtures/sidecar-dist/upstream/node-v22.23.1/osx-entitlements.plist`，
   以 byte/hash、绝对 `/usr/bin/plutil` 与恰六枚 `true` 键三重校验；它是**冻结的上游 probe 输入**，
   不是 fallback。实现者现场手写、从历史 `dist/` 拷贝、从某次 `codesign` 输出生成或在
   抽取失败时换另一份 plist，一律禁止。
2. **先判 security execution domain，不能拿受限域结果判签名内容。** `sign-probe` 先以固定
   canonical file 给官方 Node 的私有副本做 hardened ad-hoc 签名，再要求 control 的 strict
   verify、XML extraction 与 canonical 逐值比较全部通过；该 control 还须以
   `scripts/sidecar-fixture.mjs` 做一次有界的 `ready → stdin EOF → exit 0` 启动，不能只证明
   “签得上/验得过”。同时要求官方 Node strict verify 通过并由独立 display 命令取得下列固定
   identity；synthetic ad-hoc `.app` 的 `spctl` 必须是 exact `rejected`，不能把
   `internal error` 等任意非零当 Gatekeeper 拒绝。任一项出现 `Authority unavailable`、
   invalid blob、0-byte XML 或 security subsystem internal error，只能结构化记为
   `security_execution_domain_blocked` 并非零退出；不得继续给官方 blob 定性，也不得以默认
   human 输出绕过 preflight。canonical/source/tool gate 的普通失败、control 协议/启动失败或
   未知错误必须记 `probe_failed`，不能被宽泛归入环境 blocked。实现会话须以验收保存的 exact
   command-receipt 形状写先红/变异，并在自身可用执行域跑 `--preflight-only`；独立验收则必须
   在 Codex seatbelt 与明确批准的非受限执行中各真跑一次，前者准确 blocked、后者通过后才完成
   正式六格。报告须把两域结果分开，不能混成一次运行；`CODEX_SANDBOX` 一类环境变量只作诊断，
   功能 preflight 才是判定真源。
3. **官方实物 observation 独立于签名输入。** preflight 通过后的同一轮须同时保存
   `codesign -d --entitlements - --xml <official-node>` 与不带 `--xml` 的 DER human-readable
   路径之完整 argv/exit/signal/stdout/stderr byte/hash。exit 0 + 空 stdout 不能叫成功；
   XML 必须是可解析 plist 并与 canonical 等义；另以严格的 flat-dictionary parser 解析 human
   路径，拒绝未知层级、重复/额外键、非 bool 或 false，不能只用正则捞六个 key。两条路径均须
   把实物还原成与冻结上游文件**恰同的六键真值**；任一不可读或语义漂移即顶层失败。human
   路径是交叉见证，不是 XML 失败时的 fallback。
4. **六格重签始终只消费第 1 层固定 bytes。** 旧模式名
   `adhoc-hardened-with-official-entitlements` 退役为
   `adhoc-hardened-with-node-v22.23.1-entitlements`，防止把“来自官方实物抽取”继续写进语义。
   两候选 × plain / hardened-no-entitlements / hardened-with-upstream 三姿势仍是精确闭集；
   每格除 sign/strict-verify/launch 外，还须回读**签后副本**的实际 entitlements：前两姿势恰
   `none`，第三姿势与冻结六键逐值等同，并记录实际消费的 canonical repo path/SHA。签名命令改用
   临时抽取件、漏传/换掉 canonical path、输入 hash 不符、实际回读不同或任一格 blocked 均失败。

R3 禁止再让不同执行域覆写同一份 `dist/sign-probe.json`。CLI 必须显式接收
`--execution-domain-id <id>`（只收 `[a-z0-9][a-z0-9-]{0,31}`）以及可选
`--preflight-only`，并拒绝已存在的目标目录。每次调用先在私有 staging 中原子形成
`dist/security-domain/<id>/host-tool-receipt.json`、`preflight.json`、`manifest.json`；
只有同一进程、同一域的 preflight 通过，full 模式才追加 `sign-probe.json`。full 不能消费先前
preflight 文件，blocked/full 也不得产生半份或 stale `sign-probe.json`。`manifest.json`
记录 execution-domain id（只作标签，不作真源）、mode/status、cwd、started/finished time，
以及除 manifest 自身外每件 JSON 的 repo-relative path/bytes/SHA-256；实现回执、验收回执与报告
分别引用各自 manifest 的 path + 外算 SHA。不同会话/域使用不同 id，目录不碰撞、不覆盖。

三枚 Apple 工具的**实际调用**只许绝对 `/usr/bin/codesign`、`/usr/sbin/spctl`、
`/usr/bin/plutil`，每条 command receipt 的 `argv[0]` 与 tool SHA 都须绑定同轮
`host-tool-receipt.json`；禁止先给系统实物做指纹、实际却经 `PATH` 调同名 shim。三件工具均以
`lstat` 证明 regular/non-symlink，并记录 path/bytes/SHA-256/Mach-O architectures；所有 Apple
命令固定 `LC_ALL=C` 并把该环境值写入 receipt。`spctl` 的唯一预期拒绝命令是
`/usr/sbin/spctl -a -vv <app>`：stdout 空、exit 3，stderr 第一非空行须 exact
`<app>: rejected`；exit 1 / internal error 不是拒绝。

官方 Node 的签名身份拆成两条、不得以一句“证书链有效”代替：

- `/usr/bin/codesign --verify --strict --verbose=4 <official-node>` 必须 exit 0；
- `/usr/bin/codesign -d --verbose=4 <official-node>` 必须 exit 0，且在已过来源 SHA 的实物上
  解析到 `Identifier=node`、`CDHash=59cdea89a982b05f23e756c08115bebc555ff092`、
  `TeamIdentifier=HX7739G8FX`、`flags=0x10000(runtime)`，以及按序恰三条 Authority：
  `Developer ID Application: Node.js Foundation (HX7739G8FX)`、
  `Developer ID Certification Authority`、`Apple Root CA`。

`host-tool-receipt.json` 还须记录同轮环境而非事后口述：macOS product/build、Darwin release、
hardware/process arch、执行探针的 Node version/execPath/bytes/SHA、`xcode-select` 与 CLT
package version。official Node 另记 path/regular-file/bytes/SHA 与上述 identity。
preflight 与关键命令均保全 argv、cwd、started/finished time、exit/signal、stdout/stderr
bytes+SHA 与原始内容；上述字段缺失、空值、事后常量补写、tool receipt 与 argv 不一致须有
定向反例。`sign-probe.mjs` 已在本票触碰面内，其 control/sign-matrix 的
ready/EOF/exit/kill-confirm 等待同时收进具名 deadline；不得保留裸 `await proc.exited`
让复验挂死。

`get-task-allow` 虽在 Node 该版本上游六键中，按 Apple 公证规则不得据此成为 Courtwork 公开
发行默认。R3 的 632-byte 文件只服务同机 ad-hoc probe；它不自动进入
`PI-DEBUG-BUILD-1.signing-plan.json`，更不得进入 parked 的 `PI-SIDECAR-RELEASE-1`。未来产品
debug/release entitlements 仍须由架构在对应 signing plan 逐件冻结，运行时零 fallback。

R3 从含 `850fa11`/`9ebb92a` 的组合树开工，先让 canonical hash/语义、受限域误归因、
`spctl internal error` 假拒绝、XML 空成功、human 严格解析、签后回读、执行域目录碰撞、
跨域 preflight 复用、PATH shim、host/tool receipt 与 bounded control launch 的反例在未改
production 上见红，再做有效 source mutation。快速
`--preflight-only` 在受限域须准确 blocked、在批准的非受限域须通过；正式签名门过后，才允许
从空 assembly 复跑 R2 全量：203 例既有 verdict 回归、76 枚 counterexample、600 cold-start
samples、双 cycle、六格签名、来源门与四个仓库门。
实现与独立验收均不得从旧 `dist/final` 回填数字；报告继续零路线建议。只有另一会话完整放行 R3，
架构才可消费报告裁路线；此前 `PI-HOST-LOOP-1`、`PI-DEBUG-BUILD-1` 继续 blocked。

`PI-SIDECAR-DIST-1R3@47fd7e5` 的独立验收 `eb71d6f` 第四次判定 **REJECT**。R3 已正确建立
canonical 上游输入、双 execution domain、签后回读、绝对 Apple 工具、deadline 与不可覆盖
manifest，但 hard verdict 仍有三处实现违约：完整 `host-tool-receipt.json` 在进入 verdict 前被
截成 `tools/commands`，故删除 host、harness Node、Developer Tools 或 official Node 身份仍会
假绿；DER human parser 跳过未知 hierarchy，且 verdict 只信派生的六键而不重解析 raw stdout；
preflight 让具名 blocked reason 无条件压过 control launch/protocol failure，故缺失 sidecar
产物造成的 `ERR_MODULE_NOT_FOUND`/ready timeout 会被误报为 execution-domain blocked。全仓
build/lint/test 绿、seatbelt 内 built control 准确 blocked、上游 632-byte 来源再次核真均不能
抵消这些 false-green；不得消费 R3 报告、裁路线或启动 Host/DMG。

`PI-SIDECAR-DIST-1R4` 只闭合上述三处判定，不改变 R3 的四层模型、两条路线、库存、wire、
canonical bytes、签名模式、deadline 或产品 signing plan：

1. full probe 必须把同轮完整 host receipt 原样交给 verdict。判定至少硬消费
   `schemaVersion/executionDomainId/capturedAt/host/harnessNode/developerTools/officialNode/
   canonicalSource/tools/commands`：receipt id 与 probe id 相等；host 六字段非空、
   `platform:'darwin'`，process arch 与 harness arch 一致；harness `path===execPath`、
   regular/non-symlink、正 bytes、有效 SHA 与非空 Node version；Developer Tools 两字段非空；
   official Node actual/expected SHA 都等于冻结的
   `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，且为
   regular/non-symlink 正字节；canonical source 的 tag/tag-object/commit/two blobs 逐值等于
   本节已冻结常量。三枚 Apple tool 的既有指纹/command 相关性不退，且每件至少有一条同轮
   command receipt。macOS/CLT 的具体版本只登记，不冻结成支持矩阵。
2. DER human observation 的唯一解析器须是共享纯函数：只解析 raw stdout 的一个根
   `[Dict]` 与恰六组 `[Key] → [Value] → [Bool] true`，空行可忽略；未知 marker、嵌套
   `[Dict]`、`[Array]`、自由文本、残缺三联、重复/额外键、非 bool 或 false 一律
   `parseError`。stderr 只许 exact `Executable=<argv-last>` 信息行。采集端保存
   `parseError/entries/values`，verdict 必须从 raw command 再解析并与三者逐值一致，不得把
   producer 的派生字段当真源。
3. preflight 分类顺序固定为：control `ready → EOF → exit 0` 协议/启动失败或其他 ordinary
   probe failure 先记 `probe_failed`；这里 ordinary failure 不含已被具名 security evidence
   解释的 control sign/XML、official signature 或 `spctl` 失败。在 control lifecycle 与普通
   门成立后，出现已冻结的 security blocked evidence 才记
   `security_execution_domain_blocked`；无 blocked 且全部 exact gate 通过才是 `passed`，
   其余均为 `probe_failed`。不得把包含 sign/XML 的旧总 `controlOk` 直接置顶，否则合法的
   seatbelt blocked 会反被误归普通失败。环境变量仍只诊断。为使首红落在
   真实旧逻辑，可先把 blocked-first 表达式行为等价抽成 production-used 纯 classifier，证明
   既有测试结果不变后再加混合反例；缺 import、stub 或未被 production 调用的 helper 不算红证。

R4 所称“完整 receipt 关联”与“判定端独立重算”还包含 raw→summary 这一段，不只包含
observation→receipt membership。`official verify/display` 的 argv 形状须分别 exact
`codesign --verify --strict --verbose=4 <official-path>` 与
`codesign -d --verbose=4 <official-path>`，末项必须等于 receipt 中已过 SHA 的
`officialNode.path`；XML/human 的既有 exact path 门不退。command identity 须消费 production
receipt 的全部既有字段，至少包含 `error`，不能把未比较字段写成“field-identical”。

`controlSignatureOk/signatureOk/spctlOk` 不得由 producer 的 `signExit/verifyExit/values`、
signature identity 或 Gatekeeper 摘要循环互证。判定端须从已绑定 raw commands 重导 exit/signal、
stdout/stderr 与 signature identity，再要求 producer 摘要逐值相同；classifier 只消费重导值。
XML 语义继续复用成熟的绝对 `/usr/bin/plutil`，不自研第二套宽 XML parser：采集端保存 raw
codesign stdout 落盘件的 path/bytes/SHA、`plutil -lint` 与 `plutil -convert json -o -`
两条完整 command receipt；判定端要求落盘指纹等于 raw stdout、两条 argv exact 指向该件、
command 与完整 receipt 同轮绑定，并从绑定的 JSON stdout 自行 `JSON.parse` 后核六键。缺/改 raw
exit、路径、指纹、plutil receipt、JSON 或 producer parity 任一项都须红。

R4 必须在 R3 target 上先复现验收的四枚 identity 删除、一枚 raw `[Array]` 与一枚
`control lifecycle=false + blockedReasons>0` 假绿，再补 execution-domain id、canonical source、
harness path/execPath、official SHA、未知 marker/嵌套 Dict 与三工具 command coverage 反例。
至少三枚独立 production mutation 要分别撤掉完整 receipt 投影、恢复 skip-unknown parser、
恢复 blocked-first 次序并见红；mutation 须验证命中、逐枚恢复且 production bytes 最终同源。
新增 raw→summary 闭口还须先红 official verify/display 换成 bogus target、raw control-sign
失败而 summary 报零、raw official identity/Gatekeeper/XML 与摘要漂移、command `error` 漂移，
并以有效 mutation 分别证明 path、raw gate/parity 与完整 command identity。
随后先以 built control 在 seatbelt 内准确 blocked，再以故意缺 sidecar build 的混合形态准确
`probe_failed`，批准的非受限域跑 preflight/full 六格；最后从空 assembly 复跑全部 verdict、
76 counterexamples、600 cold-start、双 cycle、十件/source 与四仓库门。实现和新的独立验收
使用各自 execution-domain id/manifest，fixture README 同步把“受限域只写 blocked”窄化为
“control lifecycle/ordinary gate 成立后才可写 blocked”，旧 `dist` 零回填，报告继续零路线建议。只有异会话完整
放行 R4，架构才可消费报告裁路线；此前 `PI-HOST-LOOP-1`、`PI-DEBUG-BUILD-1` 继续 blocked。
该句只记录 R4 当时的历史门；R4 已被下文独立验收拒绝，现行门由 R5 取代。

R4 的实现执行域若经功能 preflight 证明为非受限域，不能伪造 blocked，也不能为取得 blocked
而改探针。此时只允许架构支持会话在**同一实现 worktree、冻结后的 exact production bytes**
上代跑 built-seatbelt 与缺 build 混合态两枚短观察：使用实现票独占的 fresh id，回执逐枚记录
实际执行角色、manifest path + 外算 SHA，以及 `sign-probe.mjs` /
`lib/probe-verdict.mjs` 的 Git blob；恢复被隐藏 build 后还须核对两件 production blob 未变。
任一 production byte 此后变化，两枚观察立即作废并须 fresh-id 重跑。该代跑只补实现票无法
进入的 execution-domain cell，不算实现者自跑，不替代批准非受限域 full/长矩阵，更不替代
独立验收；验收会话仍须在自己的 clean worktree 以自己的 fresh id 真跑 seatbelt blocked、
seatbelt 混合态 `probe_failed` 与批准非受限域 full 六格。

`PI-SIDECAR-DIST-1R4@07d2dbc`（实现 `891c23d`）经独立验收判定 **REJECT**。R4 已闭合
R3 的三项既知假绿，但验收又在 production observation 上坐实三项 P1：

1. 跨架构 code-cache 注入在 ready 后裸等子进程退出，hard verdict 又只核
   `launched/warning`；进程可无界等待，或带正确 warning 但最终非零退出仍假绿。
2. command 的 `startedAt/finishedAt` 只参加 observation↔receipt 副本 identity，没有真实性
   约束；两边同步删字段、或所有 command 同填一枚合法时间常量，均可通过。
3. full/preflight 虽绑定了 raw command receipt，成功判定仍大量消费 producer 的
   `signExit/flags/launched/values/.app` 摘要；raw 非零、signal、spawn error、security stderr、
   串格 target、真实 run/actual-entitlements/.app 失败都可被正确摘要洗绿。preflight-only
   也未在发布状态前执行独立 hard verdict。

这三项使 R4 的路线报告继续不可消费；`PI-HOST-LOOP-1`、`PI-DEBUG-BUILD-1` 与路线裁定保持
blocked。验收树中的五文件未提交返修约 1800 行，已经超过“实现级小缺陷”的
`fix-by-acceptance` 例外；它只作诊断输入，不是可代提交工作树，原验收会话也不得验收其衍生物。

`PI-SIDECAR-DIST-1R5` 只闭合上述三项，不改变 R2–R4 已成立的来源、assembly、cold-start、
canonical 四层、双 execution domain、签名模式、库存、wire、deadline、路线候选或产品
signing plan：

1. `reproducibility-probe` 的跨架构子进程保留 60,000 ms ready 门；ready 后发送 EOF，
   退出固定用既有 `CRASH_DEADLINES.exitMs`，失败后用
   `CRASH_DEADLINES.killConfirmMs` 收束。observation 显式携
   `timeouts` 与 `{code,signal}`；hard verdict 只接受 `timeouts:[]`、
   `launched:true`、exact warning 与 `exit:{code:0,signal:null}`。ready/exit/kill-confirm
   任一超时均结构化失败并令进程非零，禁止裸 `await proc.exited`。
2. 每条同轮 command receipt 的 `startedAt/finishedAt` 都必须是可往返
   `Date#toISOString()` 的 UTC 时间，且 `startedAt <= finishedAt`。`commands` 数组就是串行
   调用顺序，相邻项须满足 `previous.finishedAt <= next.startedAt`；整轮还须满足
   `commands[0].startedAt < commands[last].finishedAt`，因此整列缺失、倒序或同一常量均失败。
   时间字段继续参加完整 command identity；这道 timeline 门是额外真实性约束，不以两副本相等
   代替。
3. preflight-only 与 full 都必须在形成最终 manifest/status 前运行 production-used hard
   verdict。每条被判断的 raw command 必须逐字段属于同轮 receipt；raw argv、target、exit、
   signal、error、stdout/stderr 与实际 run/actual-entitlements 是真源，producer summary 只可
   作 exact parity，不能单独决定成功。preflight 须从 raw 重导 control lifecycle、四 gates、
   official identity、XML/plutil 与 Gatekeeper；full 六格另须绑定唯一 stage root 与
   subject/mode physical cell，从 raw 重导 sign/verify/display flags、launch exit/timeouts 与
   Node/SEA 来源身份、签后 XML/plutil，并对 nested `.app` 的 inner/outer/deep verify、spctl 与
   nested run 做同义闭口。缺 status、错/缺 raw receipt、摘要漂移、A/B 串格或同步换 bogus
   target 均失败。每个语义 role + subject + mode 必须绑定 `commands` 数组中唯一的 receipt
   occurrence/index，同一 occurrence 不得跨 role/cell 复用；expected argv-last/target 必须从
   trusted stage root 与冻结的 subject/mode coordinate 独立构造，不能从 row/appPath 摘要反推。
   final manifest/status 只取 hard verdict：preflight raw 重导为
   `{status:'ok',classification:'passed'}` 才映射 `ok`；
   `{status:'failed',classification:'security_execution_domain_blocked'}` 才映射同名 blocked；
   任一证据完整性/ordinary/control/full hard-verdict failure 一律映射 `probe_failed`。
   preflight 自报 status/classification 与 full summary 都只作 parity，调用 verdict 后不得忽略
   failures 或再用 producer 字段重算 final status。

R5 必须在 untouched R4 target 上先写反例并见红：跨架构 warning 正确但 exit 非零/timeout；
command times 全删与全填同一合法常量；preflight-only target 同步漂移；六格 raw 失败而摘要
成功、A 格复用 B 实物、run/actual-entitlements/nested app raw 失败。至少以四枚有效 production
mutation 分别撤跨架构 exit/deadline 门、timeline 严格推进、preflight hard verdict 与 full
raw 真源门，逐枚验证命中、见红、byte-identical 恢复。

实现最终仍须从空 assembly 串行复跑全部 verdict、既有 76 项回归矩阵及 R5 新增
反例（分别计数）、600 cold-start、双
cycle、十件/source、seatbelt blocked、缺 build 混合 `probe_failed`、批准域 preflight/full
六格与仓库门；实现与验收各用 fresh execution-domain id，旧 `dist` 零回填。另一 Codex
会话必须从 clean worktree 独立复验，不能消费实现者的 manifest 代替自跑。Fable 给出不可变
实现 SHA 后，架构另立 `PI-SIDECAR-DIST-1R5-ACCEPT`，冻结目标 SHA、允许面、反例与 mutation；
验收者原则上只追加 `packages/pi-lane/ACCEPTANCE.md`，实现级小修才可按 AGENTS.md 使用
`fix-by-acceptance`，契约问题直接 REJECT。R5 放行前报告继续零路线建议，`current.md`、Host、
DMG、Pages 与 R5 实现链的 merge/push 均不动；架构契约提交可正常入 `main` 供实现/验收读取。

#### 2026-07-30 路线裁定：Route A 为现行 default

`PI-SIDECAR-DIST-1R5` exact target `6cdb9ba` 经独立 Codex 验收 `0b0d985` **PASS**，并由
no-ff merge `5aef222` 保全进入 `main`。验收在空 assembly 上独立闭合 384/384 verdict、
600 个 cold-start samples、历史 76 项（68 个失败注入 + 8 个恢复／证据对照）、另造 8/8
strengthened negatives、R5 五枚有效 counterexample + 验收自造 SIGTERM 反例、四枚 production
mutation 与三种 execution domain；二次只读审计未发现 PASS blocker。实现回执所引未入 Git
scratchpad 与 `crash.ignored` JSON 的 `caught` 写入时序仍是如实登记的 evidence-packaging
缺口，不改变 production hard verdict，也不得在后票复用为权威装置。

现行默认路线冻结为 **Route A：官方 Node v22.23.1 runtime + minified sealed CJS bundle**，
`routeId:"node22-runtime-sealed-cjs-v1"`，`useCodeCache:false`。生产装配恰为不可拆分的同版双件：

1. target-triple 命名的官方 Node runtime 作为 Tauri `bundle.externalBin`；
2. `sidecar.cjs` 作为 Tauri resource，由 Rust 在启动前解析实际 resource 位置，并作为 argv
   交给同版 runtime。

Rust 必须在 spawn 前把双件作为一个 manifest pair 校验：expected route/version/target、
regular 且 non-symlink、正字节、各自 exact SHA，缺件、多件、错版、错架构或 hash 漂移一律
fail-closed。物理路径只存在于 Rust；不得进入 WebView、模型上下文、journal、provider error
或产品文案。安装后不得把“双件可分别校验”实现成热替换；不得增加 Route A/B live switch、
runtime fallback、naive ESM 档或 SEA fallback。

裁点不是性能或体积胜负。R5 证明两路 stdio、真实 tool loop、abort、crash 与双架构装配在
功能上同构；SEA default 的单件装配也是真实优势。但当前阶段先支付 Host lifecycle、journal
与恢复，Route A 的 JS 文件可读、栈可定位、改 sidecar 只需重打 CJS，且只依赖稳定 esbuild；
Route B 把单件收益交换为 Node SEA Stability 1.1、`postject@1.0.0-alpha.6`、LIEF 许可与
remove-signature→inject→resign 全链，并仍带构建绝对路径。约 1 ms 冷启与签名前约 0.85 MiB
差异不构成裁点。只有真实 Tauri build 证明 Route A 的 resource/signing 是实质阻断，才可由
新证据修订本 ADR 重开 Route B；不得运行时自动降级。SEA `code-cache` 档因不可复现且跨架构
静默拒 cache，明确不进入 default。

`postject`/LIEF/SEA 只保留在历史比较 fixture 的 dev evidence plane，不能进入 production
consumer、production build graph 或制品；是否迁档/删除该 fixture 与 devDependency 另以窄票
处理，不能为“清理”改写已验收证据。路线裁定只解锁 `PI-HOST-LOOP-1`，作用域到维护者个人
`PI-DEBUG-BUILD-1`；不解锁公开发行。两路共同的 V8 entitlement、Tauri nested executable/
resource 重签、inside-out signing、Developer ID/notarize/staple/Gatekeeper 与原生 Intel
验证仍未支付。R3 的 Node 上游六键 plist 只是一手 probe 输入，尤其 `get-task-allow` 不得进入
公开发行；`PI-DEBUG-BUILD-1` 前仍须由真实 Tauri inventory 冻结 route-specific signing plan
与 manifest schema，`PI-SIDECAR-RELEASE-1` 继续 parked。sidecar 的分发形态是独立
`process`；ADR-018 的全局当期隔离等级仍为 `none`，不因路线裁定升档。

#### `PI-HOST-LOOP-1` 开工补拍

专属冻结件为 `PI-HOST-LOOP-1` 票面（**史料线索**；该票已清账，件随 2026-08-05 归档批离开
`packages/pi-lane/specs/`，去处按归档索引的 `pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1*.md`
条目定位——`decisions/README.md` 定 ADR 正文不直书归档路径，故此处转指索引）。
这里登记会改变跨层语义的八项裁点，避免实现会话自行补合同：

- `/case` 不扩成第三种 host-request capability。Rust 仍只在 bootstrap 例外把物理 case root
  交给 sidecar；Node 产品 env 直接只读该根，但 cwd/FileInfo/tool result/error 一律投影
  `/case`，ready 恰宣告 `case_read`，读工具零 operation/host_request。现行工具只加保留
  upstream schema identity 的 `/case` path binder/显示参数；workspace read/write wire 不动；
- product runtime 的 key 只来自 bootstrap 内存并显式传 pi stream options；Node 不读
  `process.env`。Rust 只消费用户显式保存的 pasted 或 environment-name credential，不做固定
  `DEEPSEEK_API_KEY` 自动回落，child env 仍为空。Host 期临时 prompt 固定 `case-read-v1`，
  Agent 从本票起固定 `toolExecution:'sequential'`；WRITE-HOST 才换 `md-work-v1` 并加 write
  binder 顺序锁。Host hard gate 以同一 runtime factory 的 test-only scripted stream 在官方
  Node 22 跑真实 read tool loop，production CJS 另跑 ready/shutdown；真实 DeepSeek 只作外部
  smoke，不拿模型是否主动调工具裁 harness；
- journal envelope 的 eventId/recordedAt/operationId 规则与十九种 payload 全部 closed，
  replay 不收自由 JSON；fresh/resume 都在 spawn 前 durable，turn usage 与 outward event
  遵循 append+sync-before-publish；Rust 补终态用 TS 同一七枚固定 message，shared
  Rust↔TS golden 是独立 expected-side；唯一可补的 LF-complete 半对是 journal 尾端
  `agent_event(turn_finished)` 缺同义 usage row，恢复逐值追加并 sync 后再 fold，其余半对
  quarantine；
- Route A 的 expected-side 是编进 Rust 的 tracked
  `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`；ignored product snapshot 恰为双
  target Node + 一件 `sidecar.cjs`，manifest 与双件逐值核验，production 零 fallback；
  journal 的 `routeManifestSha256` 只能由 Rust 对已验证与编译期 expected byte-identical 的
  runtime manifest 原始 bytes 重算，不收调用方、自报或旧值；
- child 用空环境、固定非案件 cwd；stdin packet 与 bootstrap/cancel/shutdown/exit/
  kill-confirm 有界，只有活动 prompt/provider stream 本体无总时限；SIGTERM 复用既有
  `libc::kill`，stderr 原文不持久；
- LF 完整的坏 journal 原子移入按原 bytes SHA 命名的 container quarantine，零自动修/覆盖/
  续跑；只有末尾无 LF partial 可截断；
- resume 断点只从 journal fold 导出，不增 sidecar packet，不回填旧 pi messages；
- 本票不新增 WebView/Tauri command；container inactive 才可整删 journal+quarantine；
  动态 `Command::new(path)` 按 exact expression/enclosing-function/anchor/count 进入
  ADR-018 双向机器门。

这些是 Host 工单的实现输入，不是新能力事实。异会话 PASS 前 `current.md` 不变，
`PI-WRITE-HOST-1` 不开工。

后续产品装配归属也冻结：`PI-HOST-LOOP-1` 建 product `/case` 虚拟 env、路径/错误脱敏、累计预算
与 Rust 生命周期，并从产品 Agent 首次出现起固定 `toolExecution:'sequential'`；
`PI-WRITE-HOST-1` 才注册 `createWriteTool()`、扩产品 tool policy、保持 Agent sequential、
给 write binder 固定 `executionMode:'sequential'`、启用六-0 的 `md-work-v1` 最小 system
prompt，并把每次 toolCall 绑定独立 write env/operation；
`PI-WORKSPACE-READ-1` 只给既有 read/glob/grep 增 `/workspace` 路由，glob/grep 返回
`/case/...` 或 `/workspace/...`，并提供上述只读 `openWorkspaceMarkdown` host command；
绝不显示 `../workspace` 或物理根，也不新增 `list` 模型工具。

## 未决四题（`PI-LANE-1` 必答，答案回本 ADR 补记）

1. 预算上限（steps/usd）能否经扩展 API 可靠实施，还是须 sidecar 层强杀。**已答（2026-07-27，`docs/engineering/pi-lane-1.md` 第二节，源码级）：不能**——`beforeToolCall` 的 block 只换错误 toolResult 不停 loop；`shouldStopAfterTurn` 不被 `Agent` 转发、`AgentHarness` 零权限钩子。实现取宿主 `abort()`（`turn_end` 记账、被 abort 回合不计入，红证在案）。**已知边界：越限即停 ≠ 永不越限**（末回合可压线超出）——A2 产品底座及其后 GUI 必须如实呈现该语义，不得宣称等同场景线 RuntimeGuard；乙路（直驱 `agentLoop()` 换真停钩、自担状态机）与丙路（请求前预估）留为升级选项，届时裁。
2. 授权决定能否持久化入我方账本（执行前落盘），扩展钩子的时序是否满足 durable-before-effect。**已答（同件第三节）：时序满足**——`beforeToolCall` 被 `await` 且 prepare 阶段串行先于执行。三限制随答登记：未注册工具在钩子前即被内核拒（「全部请求落账」须另解析 `message_end`）；immediate 结果的拒绝语不可覆盖；durable 的落得住半边归我方（ADR-010）。本票读面未实现账本，只证时序可用。
3. journal 分区的具体落点与备份/删除语义（ADR-019 容器分区细则）。**提案已采（2026-07-27 架构裁；2026-07-28 细则冻结并订正于决定六）**：`loop/` 是逻辑容器子档，物理落 app-data 的 `pi-loop/<containerId>/<sessionId>.jsonl`，不与用户可见的工作稿目录混写；不入跨容器检索、不写场景线 Turn journal 与确认账本、随容器整删、凭据不入。loop transcript 属过程记录，不走「先入卷再确认」。**现行边界：当期 `Agent` 层无 harness journal，pi lane 会话进程退出即散**（SPEC 已登记）。
4. Node sidecar 的签名/公证链影响（与 `SANDBOX-PROBE-1` 裁点一共用一个 sidecar 的可行性）。**2026-07-27 的阶段性回答**：探测报告曾据 Seatbelt 可行性预定场景线走“Rust 自研窄 profile”，并把 sidecar 签名代价整体推给后续生产挂载；dev 形态确实未进入 `.app`，因此当期零事实可测。**2026-07-28 纠正**：自研 profile 与 ADR-018 外采纪律冲突，预定路线撤销；sidecar 分发事实改由 `PI-SIDECAR-DIST-1` 比较，Developer ID/notarize 真值由 `PI-SIDECAR-RELEASE-1` 独立支付。旧探测只证明原语可行，不再充当产品选型。

## 对既有口径的两处反转（如实登记）

- OpenWork 标杆报告曾以「我们在它外包的那层持有自研资产」立论；本 ADR 后叙事口径改为：**loop 是 commodity，资产在容器、确认账本、预算硬限额与垂类契约**——资产清单本身不变，「自研 loop」不再列入。
- `OSS-SUBTRACT-1` 的最大一问（loop 自研 vs 换件）由本 ADR 先答；该票重定向为「其余自研面盘点」，优先级降一档。

## 修订记录

> **返修合同件的去处（2026-08-05 一次性登记，下方不再逐条写路径）**：`PI-HOST-LOOP-1` 原票与
> `1R`…`1R7` 七份返修合同、`PI-CODE-STDIO-1{,R,R2}`、`PI-SIDECAR-DIST-1` 六轮及其验收令、
> `PI-WRITE-PROOF-1` 已随该批清账离开 `packages/pi-lane/specs/`。要回读其中任何一件属**史料线索**，
> 去处按归档索引的 `pi-lane-receipts-2026-07-28--08-05/` 各条目定位（索引是归档的唯一入口，故此处不直书
> 归档路径）；每条附逐轮
> SHA 表，可据此定位单轮件。ADR 正文不直书归档路径（`decisions/README.md` 变更规则），故下方各条
> 只写票号，不写件的路径；归档件恒不具约束力，本 ADR 与各层 SPEC 才是现行契约。

- **2026-08-05 · 「随 container 整删」登记为未兑现边界**：决定四与六-C 冻结「journal 与
  workspace 二者随 container 整删」，实现当期只删 journal 树且 `delete_container` 生产
  零可达；架构裁定按未兑现边界显式登记，workspace 删除面待 container 删除真实入产品面时
  随票补齐。正文原句不动（行号坐标保全），本条为其现行读法。
- **2026-08-05 · 六-C.1 并发与中断模型＋逻辑根口径收敛（产品负责人拍板）**：架构层验收④
  实证 cancel 结构性不可调、decide 同步阻塞授权等待（详六-C.1 背景）。拍板：宿主专属线程＋
  入站命令通道（闭集 `prompt|cancel|decision|teardown`）、decide 改投提案等回执、Stop 收束
  悬置提案为 `user_denied`、回执不追溯生效、悬置提案不跨 leg；wire 与 journal 闭集零变化，
  端口面见 ADR-009 同日窄修订。同批按验收②把六-C 裸相对路径改四工具单一 `/workspace` 口径
  （原 read 默认 `/case` 与 write 默认 `/workspace` 使「写后回读」同串异文件），`/case`
  强制显式前缀；工具 description 双根口径随 `PI-DUALROOT-CONTRACT-1` 落地。实现票
  `PI-HOST-CONCURRENCY-1` 另派：两枚 Stop 真竞态测试、回执不追溯反例、
  `#![allow(dead_code)]` 收窄、同工具形槽位 fail-closed、`capability_for` 单点收敛。随②交验
  订正 binder 条款：`description` 保留上游原文、仅许其后追加产品寻址口径——原「保留上游
  `description`」字面与双根口径冲突，追加式为正解（实现按此先行，措辞随批归位）。随④交验追认三项：teardown 与 Stop 同形收束（同码
  `user_denied`）、旧 `PiLoopHost::cancel` 退役不留第二 cancel 路径、宿主 trait 加
  `Send`（线程模型机械必然）。
- **2026-08-03 · HOST-LOOP 1R7 放行与七轮收束**：`PI-HOST-LOOP-1R7@744c070`（实现
  `f915eea`）经独立验收 `6da6aea` **PASS**：恢复分相结构成立（M7 双臂对照——同树同
  codec-only future rule，apply 前移臂复现 558→790，分相臂 558→558）、电池 152 行/15
  字段含五类 recoverable existing-session 形状、七枚 mutation 逐红、§五.4 两态对照过。
  no-ff 合入 `653c121`，六轮拒绝报告以 patch-id 等同随链入树。§五冻结后裁定四则随票
  受理（终态 fold 不经 start 落盘为正解；apply 中途失败 self-healing 同类；换靶两处准）。
  `PI-HOST-LOOP-1` 至此清账，`PI-WRITE-HOST-1` 依赖层齐备；成立范围只到 Host 读面基础，
  不及 WRITE/GUI/headless 总验与真 key 端到端。
- **2026-08-03 · HOST-LOOP 1R6 复验拒绝与 1R7 恢复分相**：`PI-HOST-LOOP-1R6@57a19a5`
  经独立复验 `cd3810a` REJECT——encode-before-effect 的 fresh/prompt 形状、bytes 复用、
  装置退役边界与 142 电池全成立；唯一决定性：`start_inner()` 在真实编码前调用会写盘的
  `load_session()`，恢复既有会话时 partial-tail 截断、usage 补写与 crash fold 的 durable
  append 先于编码（codec-only future rule 反例实测 journal 558 B→790 B 而 spawn/wire
  均零），三项担保在 resume/recovery 路径不成立。裁定**恢复分相**：`load_session` 拆
  读/计划（纯，零 journal 内容写入）与 durable apply 两相，apply 后置于编码成功；三项
  担保不撤、观察面精确化（inode 级创建获准先行、quarantine 人口不相交、
  `reclaim_after_fault` 立即 apply 不适用 encode-before-effect）。零漂移已经源码核实：
  `fold()` 纯函数，bootstrap 恢复态字段与 crash-fold 追加互不作用，物理截断对解析不
  必要。违规电池扩 recoverable existing-session 族，断言升「与 pre-start snapshot 逐
  字节不变＋修复未应用」。新立 `PI-HOST-LOOP-1R7`，基线顺取二十五枚 patch-id 等同。
- **2026-08-02 · HOST-LOOP 1R5 复验拒绝与 1R6 结构性裁定**：`PI-HOST-LOOP-1R5@a082257`
  经独立复验 `9d4013e` REJECT——G1 四门与阳性对照全成立；唯一决定性：拒绝分支扫描器以
  `return Err(` 字面量定义种群，fail-closed 建立在 fail-open 种群上，turbofish 合法拼写
  即出圈（常量名→函数名→return 字面量三层同败）。裁定 **encode-before-effect**：Host 在
  journal/spawn 前真实编码 exact wire packet，编码失败以既有具名 code 拒绝、成功 bytes
  复用发送——codec 成为唯一校验真源，wire 判据前置从验证同步变结构性成立；文本扫描双轴
  与同步账本受契约祝福退役（行为反例与手写清单全数保留），新增普适不变量探针
  （`Err ⇒ 副作用恰零`）。担保边界如实声明：非 wire 判据靠显式门＋电池广度＋独立验收，
  不再假装文本扫描能证。新立 `PI-HOST-LOOP-1R6`，基线顺取二十二枚 patch-id 等同。
- **2026-08-02 · HOST-LOOP 1R4 复验拒绝与 1R5 两裁定**：`PI-HOST-LOOP-1R4@d4163df` 经
  独立复验 `5271342` REJECT——requestId/七成员/M1–M4/E2 全成立，唯一决定性：扫描轴仍是
  语法白名单（函数名单），协议既有 wire NUL 门（`scan_string` `unit==0`）不在轴上，
  `modelId`/`apiKey`/prompt `text` 含 NUL 先落账（前两者并 spawn、后者占 requestId）后才
  由 encoder 拒。裁定一：**NUL 归 D1 Fronted**（毒化 durable journal＋浪费 spawn＝先污染
  后拒绝；不可编码＝无效输入；lone surrogate 于 Rust String 结构性不可达，以具名理由行
  入账）。裁定二：**扫描器 fail-closed 化**——枚举前置函数族全部拒绝分支，unknown 判据
  表达式判红而非跳过；协议具名 wire 判据作对照面逐枚入账；排除只能是票面/清账表具名
  理由行，实现内白名单/过滤器永久出局。新立 `PI-HOST-LOOP-1R5`，基线顺取十九枚 patch-id 等同。
- **2026-08-02 · HOST-LOOP 1R3 复验拒绝与 1R4 扫描轴对齐**：`PI-HOST-LOOP-1R3@51369e4`
  经独立复验 `a0644cd` REJECT——D2 已闭合，决定性恰一枚：D1 覆盖自证的扫描轴按 `MAX_*`
  常量枚举，而族定义是「受验输入」，SafeToken 函数型判据不在轴上；prompt `requestId`
  （六-B.1 SafeToken 七成员之一）同时躲过清单与扫描，撤其 production 门后全套自证假绿。
  新立 `PI-HOST-LOOP-1R4`：requestId 入册双轴、扫描轴扩
  函数型判据、SafeToken 七成员全员清账；回执计数据实且真源必须在 exact target 树内。
  判据订正落痕：扫描谓词从族定义出发与族同宽，语法标记不得反过来定义族。
- **2026-08-02 · HOST-LOOP 1R2 复验拒绝与 1R3 按族闭口**：`PI-HOST-LOOP-1R2@1ab9c03`
  经独立复验 `23f8339` REJECT——`apiKey ≤8192`／`caseRoot ≤4096` 两枚冻结上界仍后置
  （8193-byte key 先落 journal 再 spawn，4097-byte root 以 lstat 外观代替配置门）；
  verified-node gate 未独立冻结 `bundle.bytes/sha256`，实物与被判 manifest 同步漂移
  FALSE_GREEN。四枚 1R2 原形与六项偏离均已获追认，两枚 blocker 都是**同批判据的未点名
  同族成员**。新立 `PI-HOST-LOOP-1R3`：D1 有界输入闭集
  全部前置并以双向清单自证覆盖、D2 gate expected side 一律锚 tracked manifest 并对每类
  比较值加同步漂移反例、D3 对本票冻结面（全部 `MAX_*` 与全部判据的期望来源）穷举清账。
  方法订正一并落痕：验收报告点名的是样本不是清单，闭口的完成态是闭集被穷举覆盖且覆盖
  有机器自证。
- **2026-08-02 · PromptCompletion 闭集扩 canceled（1R2 C1 裁定）**：runtime→状态机
  接缝原闭集无 canceled 分支，上游单方 `aborted` 无路可走（1R 复验 Blocker 1 根因
  之一）。扩 `{kind:'canceled'}`，wire `Terminal` 闭集不变；未置 `cancelRequested` 的
  canceled 完成以 `reason:'host'` 收——`aborted` 仅宿主侧 AbortController 可产生，
  归因恒真；cancel 闩锁与预算终态优先级不回退。sealed CJS 身份三处钉死值按 1R
  Stage-2 仪式同批订正。乙路（改契约文字把 aborted 归 provider_error）因违反终态
  诚实明确拒绝。
- **2026-08-02 · HOST-LOOP 1R 复验拒绝与 1R2 四项闭口**：`PI-HOST-LOOP-1R@fa9e2f8`
  经独立复验 `427f4fa` REJECT——`aborted` 终态未走 canceled、bootstrap 三项上界后置于
  spawn、journal 载入接受孤儿 usage 与倒序 observed turn、verified-node gate 对 runtime
  同尺寸篡改/symlink/manifest 字段漂移假绿（另录 builder 回执 resource 前缀同源漂移）。
  1R 十一项常驻与正向 controls 全绿不抵消。新立 `PI-HOST-LOOP-1R2` 冻结四项闭口；基线顺取九枚 patch-id 等同，两枚拒绝
  报告随链入树；1R 十一项与既有门不回退。
- **2026-08-01 · HOST-LOOP 首轮验收拒绝与 1R 十一项闭口**：`PI-HOST-LOOP-1@0d4799c`
  经独立验收 `314117d` REJECT。决定性违约为凭证读取先于 route 身份门（逐字违反「route-pair
  失败先于 Keychain read/journal/spawn」）；另十枚坐实非法输入回显物理根、provider error 与
  政策拒绝两类 false-success、config/prompt 门后置、预算采信 sidecar 自报、wire fault 不
  fold、shutdown 非零伪 completed、resume prior 三值不核、单写者缺失。返修合同冻结于 `PI-HOST-LOOP-1R` 票面：十一项闭口在既有契约语义内收紧实现，不改
  wire/payload 闭集，不回退既有门；验收反例原形转 permanent 首红。放行前
  `PI-WRITE-HOST-1` 继续 blocked。
- **2026-07-30 · PI-HOST-LOOP-1 开工接缝订正**：反对性审查闭合 `/case` 工具输出、
  Agent parallel 缺省、explicit credential env 边界、shared Rust↔TS golden、ready 漂移、
  Rust 补终态固定文案、stdin/deadline/SIGTERM、inactive container 整删与 dynamic spawn
  ledger，以及 final turn/usage crash 半对；不扩既有 wire。
- **2026-07-30 · PI-HOST-LOOP-1 开工合同闭合**：在 R5 放行与 Route A 裁定后，补冻
  `/case` bootstrap 内存例外（不扩 host-request）、十九类 journal payload、tracked
  route manifest、child 空环境与 lifecycle deadline、SHA quarantine、journal-only resume
  break、无 WebView API及动态 spawn 机器门；专属 SPEC 成为 Fable 下一张实现票。
- **2026-07-30 · R5 独立放行与 sidecar default 路线裁定**：exact target `6cdb9ba` 经
  独立验收 `0b0d985` 放行并由 no-ff merge `5aef222` 进入 `main`。架构消费同机、双架构、
  双 cycle、签名与 execution-domain 证据后，裁 Route A（Node v22.23.1 runtime + sealed
  CJS）为 `node22-runtime-sealed-cjs-v1` 现行 default，code-cache 与 live fallback 禁止；
  SEA 留作已验证备选。裁定只解锁 Host，不升级 `current.md`、GUI 或发布事实。
- **2026-07-30 · R5 验收冻结件 76 项口径订正**：R2 沿用至 R5 的“76 counterexamples”
  历史叫法实际包含 68 个失败注入与 8 个恢复／证据对照；冻结件初版却又要求 76 项逐项
  非零且具名，二者不可同时成立。现保留 8/5/14/23/15/11 的历史矩阵与逐项观察，另要求独立
  验收自造 8 个失败变体并分计，不把对照冒充红证，也不降低 production 门。实现回执引用的
  `scratchpad/r5-stage-{b,c}` 未进入 Git 对象，验收必须由契约与 production 源码独立重建，
  并把 evidence-packaging 缺口写入报告。
- **2026-07-30 · R5 实现期一处既有断言改写追认**：R4 期测试「full matrix 命令里的
  internal error 不得串味到 preflight 分类」原断言整份观察为绿；该绿只成立于 R4 不判
  六格 raw，与 R5 六-E 闭口三（六格 raw security stderr 必须失败）不可同真。追认按原意
  收窄：串味主张收紧为五枚 preflight 判据名逐一不得出现在 failures，并新增该格自身必须
  红在 `sign.matrix.raw.display.security`；只加门不减门，撤 full raw 真源的 mutation 使
  其转红（区分力在案）。独立验收须复核旧「整份观察绿」形态在 R5 下不可再现，且串味防护
  仍有效。
- **2026-07-30 · R4 独立验收再拒绝与 R5 evidence-truth 闭口**：
  `PI-SIDECAR-DIST-1R4@07d2dbc` 虽闭合 R3 的三项既知假绿，独立验收仍在真实 observation
  坐实跨架构 exit 无界/漏判、command timeline 无真实性、raw command/run/actual-entitlements/
  nested `.app` 可被 producer summary 洗绿三项 P1。R4 保持 REJECT；旧验收树的大宗未提交
  返修不进入实现史。新立 R5，冻结有界 cross-arch lifecycle、canonical 串行 timeline 与
  preflight/full raw-truth hard verdict；实现后只交全新 Codex 会话从 clean worktree 独立验收，
  放行前路线、Host、DMG、Pages、R5 实现链 merge/push 与 `current.md` 均不动。
- **2026-07-29 · stdio R2 实现收敛拍板**：`710faaa` 登记的两处既有测试改写予以接受：
  旧形态分别包含“前一 tc 未 finished 即起下一工具并把 pre-operation write 报 succeeded”
  与“read tc 申请 workspace_write”，均已被本 ADR 冻结为非法转移；新测试在合法状态图上
  保留 raw→public tc 分配与 ordinal 不复用的原目的，验收仍须另外注入旧非法形态并观察
  fail-closed。settled write 已收 host_result、尚未投影时调用 `finishPrompt`，规范行为是状态机
  先按保存的 status 发恰一枚 `tool_finished`、再按既定优先级发 terminal，随后正常返回；
  不额外抛 runtime API 错误，reserve/send 的非法调用仍抛。send 当场的
  `phase==='reserved'` 与 active-tc exact equality 在当前可达状态图同步失效，允许以撤整门的
  mutation 证明效力；两道检查仍作为纵深防御保留，不为制造非等价单变异而改状态图。
- **2026-07-29 · R2 验收再拒绝与 entitlements 四层证据契约**：保留 acceptance 的 SEA
  exact-cell 修复；以 Node v22.23.1 上游签名脚本和 632-byte plist 冻结 canonical probe 输入，
  把 security execution-domain preflight、官方实物 observation 与重签输入拆开，并让重签只
  消费上游固定 bytes。任意手写/历史抽取 fallback 禁止；受限域/非受限域成对复证、XML 空成功、
  DER human 严格解析、签后实际 entitlements、同轮 host/tool 指纹、exact `spctl rejected` 与
  bounded launch 一并进入 R3 红绿门。路线继续未裁。
- **2026-07-28 · sidecar 分发返修再拒绝与物理证据闭口**：`f261347` 以三枚独立 production
  反例坐实 R1 仍会把真实多制品、首样本身份漂移与空 SHA 报绿，并确认 crash 无界等待及 SEA
  重签失败不决定 build status。路线继续未裁；R2 改用独立 assembly 物理闭集、逐样本身份、
  有效文件摘要、有界 crash 生命周期与成功后发布，残留双列、实测/推论和许可证口径同时闭口。
- **2026-07-28 · stdio 返修独立验收再拒绝与 tc 状态表闭口**：`4df2e84` 在原 227 绿测之外
  注入 9 枚 production 反例全部见红，坐实 tool→capability 越权、settled effect 被普通 finish/
  新 pending 抹掉、tc 改名/跨 prompt 复用/finished 后倒退、unknown event 逃逸与 pre-operation
  伪成功。保留 USD 一律传染、预登记 public tc、callback 不回滚及 reserve/send 单一 op/hash；
  新增 request-scoped 不可变 tc identity、显式单向 phase、精确 capability 映射、pending/settled
  结构互斥与 premature finish 自闭合。`toolExecution:'sequential'` 不再被接受为状态门的替代品。
- **2026-07-28 · 基础 GUI 的 Design 自主边界**：区分 headless GUI 机制与视觉设计；取消
  “先把前端全部确定好”的隐含前置，冻结浅色先行、冷白/深墨、扁平版本目录学、克制反乌托邦
  与 anti-slop 禁区，把构图、浅色 token 微调、微交互和截图迭代留给 Opus；dark 只守同构回归，
  磁青精修后置。
- **2026-07-28 · sidecar 分发实验独立验收拒绝与返修门**：`9b8142f` 坐实关键 probe 只记
  失败不判红、缺产物可静默跳过，且独立 Node 22 archive 未过 SHA 门；撤销对原路线建议的
  消费资格，冻结十件库存、八候选/两负控、统一 hard verdict、来源原子落盘、随机化冷启与
  双 cycle 可复现性复证。路线保持未裁。
- **2026-07-28 · stdio 独立验收拒绝后的安全闭口**：独立反例坐实 runtime message 泄漏、
  pending effect 被 force 丢弃、runtime 同步 inbound 重入复活、host-result 值未关联与安全终态
  `retryable:true` 五类缺陷；相邻 write proof 交叉复核再发现 op/hash 会在 stdio 被二次生成。
  冻结固定安全文案、pending failure 闩锁及自动收束、五 callback reentrancy guard、逐值
  correlation、retryability 闭集与 reserve→send 单一 op/hash 接缝；不改变 wire 字段或既定
  终态优先级。
- **2026-07-28 · stdio packet 形态与 Terminal 互洽门拍板**：明确五字段 `Header` 只是公共投影，
  完整 packet 顶层恰六字段且业务字段统一嵌套在 `payload`；flat v1 必拒。把既有终态优先级可由
  单包判定的反例写成 decoder 门，不改变预算优先顺序。
- **2026-07-28 · `.md` basename 边界拍板**：最终 basename 恰为 `.md` 不构成可识别的
  workspace artifact；Node 与 Rust 的 `unsupported_file_type` 门统一要求扩展名前至少一个字符。
- **2026-07-28 · 产品再裁：薄 harness 与基础 GUI 为当前里程碑**：冻结四工具与六条最小
  system prompt、通用 `.md` 任务边界、模型失败/harness 失败分界和 workspace Markdown
  只读查看；Dossier、修订、plan/source 与 UI 巧思整体后移到 A2+A3 独立验收之后。
- **2026-07-28 · 产品再裁：pi write 先行、修订后置**：重写决定六的能力阶梯与 OSS/UI
  选型。撤销同日早稿的自研 `create/edit_work_draft`，直接采用 pi 覆盖式 `write`；通过虚拟
  workspace env + Rust host effect 保住原件只读、逐次授权与 durable-before-effect。新增
  `PI-WRITE-PROOF-1` 作为可与 STDIO/分发并行的 headless 证据；GUI 改为 assistant-ui
  External Store/headless primitives 窄接，长列表库不预装。Dossier 与 GUI 原曾拟并行，
  已由上一条新裁改为基础 GUI 先闭环。

- **2026-07-27 晚**：决定二补句「放行不等于升档」——澄清性补句，不改任何决定语义；起因是 SANDBOX-PROBE-1 复读会话提请「探测已放行」易被误读为「写面已解锁」。同批裁定：ADR-018 门 R3 的扫描面随 `PI-LANE-1` 扩到 `packages/pi-lane` 的 Node 侧执行/写原语（机器门路线，非文档承诺路线；开口子同批封口子判例），条款入该票派单加签与就绪图行。

- **2026-07-27 夜二 · 包名订正（供应链陷阱）**：正文两处 `pi-agent-core` 补全为 **`@earendil-works/pi-agent-core`**（引入锚定 0.82.1，MIT，Node ≥22.19.0）。npm 无 scope 名 `pi-agent-core` 是第三方名下的占位空壳（486 字节，自述 placeholder name reservation；发布者为 pi 作者本人故未被抢注，但库本身未发布于该名下）——照订正前文本 `npm i` 会装错包。`PI-LANE-1` 实现一手核实后上报，订正为澄清性修订，不改决定语义。同批裁定一件：dev 入口落点准予 `packages/pi-lane/dev`（sidecar 自服务，不触 desktop 构建配置、dev 页不进产品包），就绪图行「desktop dev 入口」措辞随清账订正。

## 来源

产品定调：本对话 2026-07-27（接入形态与首票范围经显式确认）。pi 一手核实：归档 `research-2026-07-20-pi-first-source/`、`pi-ecosystem-2026-07-26.md`、`research-2026-07-27-parallel-survey/`（史料线索）。被修订项：ADR-011 决定二（修订记录三）。等级绑定：ADR-018 决定五。2026-07-28 生产接缝复核：
[Tauri Node sidecar](https://v2.tauri.app/learn/sidecar-nodejs/)、
[external binaries](https://v2.tauri.app/develop/sidecar/)、
[Node SEA](https://nodejs.org/api/single-executable-applications.html)、
[Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) 与
[nested code signing](https://developer.apple.com/documentation/xcode/creating-distribution-signed-code-for-the-mac/)。
