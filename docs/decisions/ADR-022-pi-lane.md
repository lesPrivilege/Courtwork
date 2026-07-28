# ADR-022：通用 agent loop 线（pi lane）

- 状态：**Accepted（2026-07-27；2026-07-28 已冻结“薄 harness → 基础 GUI → 原生语义/交互生长”的生产阶梯）**
- 日期：2026-07-27
- 关系：修订 ADR-011 决定二「不引入第二 agent runtime」（携新必要性证据，见该 ADR 修订记录三）；受 ADR-018 等级—能力绑定约束（Node 直写/bash 锁 `os_confined`，host-mediated workspace 见决定六窄例外）；保全 ADR-017 决定零的核心逻辑（取形必须带容器）；与 ADR-012 垂类包边界并立不相交；消费 ADR-019（loop 会话落卷宗容器）
- 提出：2026-07-27 产品定调——「此阶段优先立起确定性、有依据的通用 agent 能力；方案成熟、依赖 pi 生态、不存在技术或验证瓶颈；甚至可以只是一个 pi agent 的 GUI」

## 背景

到「应对大多数 .md 任务」的通用能力，仓内自研线（TOOL-READ → edits/writing 票 → EXEC-SCRIPT）依赖链长且尚有未立之票；而标准 agent loop（read/edit/write/bash + while 循环）在 pi 生态是已收敛的生产形态（`@earendil-works/pi-agent-core` 为 TS 库，MIT，一手核实见归档 pi 批次；包名全称见修订记录之包名订正）。语义层、确认原语等创新点须实测验证，通用 loop 不须。产品据此定调：确定性能力先行，创新层在其后嫁接。

减法纪律①（开源轮子尽可能用）与本裁定同向；此前「借形不接管真源」的边界按本 ADR 显式放宽为「loop runtime 整体引入，真源仍在容器、授权与垂类契约」。

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
- agent 可见两枚逻辑根：只读 `/case` 与可写 `/workspace`。read/glob/grep 的相对路径仍以
  `/case` 为 cwd；write 的相对路径以 `/workspace` 为 cwd，同时允许把虚拟绝对
  `/workspace/<safe-relative-path>` 规范化为同一 logicalPath；`/workspace` 根本身、`/case`
  或其他绝对路径一律拒绝。read 必须能显式读取
  `/workspace/...`，使“写后回读”成为基础闭环；路径结果和错误不得泄露物理根。
- `/workspace` 物理落点固定为
  `app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`，新 session 初始为空、按 container
  可整删；它是过程 artifact，不是用户原件、工作稿或产出。原件与 `产出/` 对 write 根本不可寻址；
  workspace 内容进入用户「工作稿」须等垂类修订/晋升契约。
- 只允许一层极薄 binder：保留上游 `name/label/description/parameters`（parameters 对象同一性
  有 characterization），仅把上游五参 `execute` 适配为 Agent 四参 execute；binder 使用 raw
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
  [`archive/research-gui-design-direction-2026-07-28.md`](../../archive/research-gui-design-direction-2026-07-28.md)。

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
   如实标 external-validated blocked。该票是 released 前置，不阻塞底座的开发态 headless 验收。

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

后续产品装配归属也冻结：`PI-HOST-LOOP-1` 建 product `/case` 虚拟 env、路径/错误脱敏、累计预算
与 Rust 生命周期；`PI-WRITE-HOST-1` 才注册 `createWriteTool()`、扩产品 tool policy、设置
`toolExecution:'sequential'`、启用六-0 的 `md-work-v1` 最小 system prompt，并把每次 toolCall
绑定独立 write env/operation；
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
