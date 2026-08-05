# `@courtwork/pi-lane` SPEC

通用 agent loop 线（ADR-022）的落点。与场景线（ADR-009/011 谱系）**并立不相交**：
两线各自账本，不迁移、不混写；垂类包与现有 `ConfirmationLedger` 流程只挂场景线，pi write
逐次授权只落自身 journal。

现行实现只开**读面**。2026-07-28 产品将“coding-agent 基本能力先行、底层闭合后再做巧思与 GUI”
定为下一序，并进一步裁定“先复用 pi 覆盖式 write，修订后置”。同日续裁把当前完整里程碑冻结为
**薄 harness + 基础 GUI**：先通过通用 `.md` headless 任务矩阵，再让用户在 GUI 中完成、停止、
授权并只读核验 workspace Markdown；Dossier、垂类修订和 UI 巧思均后置。下一票先做 headless
write characterization；进入产品仍须经虚拟 workspace、Rust host effect、逐次授权与
durable-before-effect 总验。Node 直写与 bash 没有因此开放。

2026-07-29 架构清账：`PI-WRITE-PROOF-1` 已含验收修复并独立放行（验收 tip
`9caa8ae`），以 no-ff merge `7216b2f` 进入 `main`；`PI-CODE-STDIO-1R2` 已含
验收修复并独立放行（验收 tip `cc5faf5`），以 no-ff merge `db4f360` 进入 `main`。
这两项只把 write 的 package/headless proof 与 product stdio/状态机前置闭合为可消费事实；
它们仍未由 `index.ts`/产品 host 装配，未实现 Rust durability、workspace 回读、GUI 或真实
模型全链，因此不更新 `current.md` 的产品能力成熟度，也不取得 agent/发行称谓。

## 一 · 职责

| 模块 | 职责 |
|---|---|
| `authorized-root.ts` | 授权文件夹边界。以**规范化后**路径判定，symlink 出界按界外处理 |
| `scoped-env.ts` | 只读 `ExecutionEnv`（我方供给的容器）。写面与 shell 在此不实现 |
| `tool-policy.ts` | 工具闸门。挂 pi 内核 `beforeToolCall`，把「默认放行」翻转为默认拒绝 |
| `tools.ts` | 只读三件：`read`（pi 原版）、`glob`、`grep`（自备，同样只经 env）。产品形态双根：命中相对**各自根**算再投影，`../workspace` 结构性产不出 |
| `workspace-read-env.ts` | host-mediated `/workspace` 只读容器（`PI-WORKSPACE-READ-1`）。每次读是一枚 `exists｜read_file｜list` host request，Node 侧零 fs；`read_file` 回读双验（重编码后 hash/byteLength/logicalPath 三项复核） |
| `dual-root-env.ts` | 双根路由容器。按逻辑前缀把一枚 `ExecutionEnv` 分派到 `/case`（Node 直读）或 `/workspace`（host-mediated）。只分派，不改写返回值 |
| `budget.ts` | 回合与开销计量 |
| `session.ts` | 装配 pi `Agent` + 容器 + 闸门 + 预算 |
| `provider.ts` | DeepSeek 甜点档接线与就绪判定 |
| `sidecar.ts` / `sidecar-main.ts` / `dev/index.html` | dev 入口：`node:http` + SSE + 静态页 |

## 二 · 引入锚定（ADR-022 决定五）

- `@earendil-works/pi-agent-core@0.82.1`（MIT）、`@earendil-works/pi-ai@0.82.1`（MIT），
  `package.json` 写**精确版本**，无 `^`。
- **包名警告**：ADR-022 与就绪图行写的无 scope 名 `pi-agent-core` 在 npm 上是他人占位包
  （486 字节空壳），**不是 pi**。真名带 `@earendil-works/` scope。详见
  [`docs/engineering/pi-lane-1.md`](../../docs/engineering/pi-lane-1.md) 第一节。
- 升版按 ADR-022 决定五逐版核对 changelog；扩展 API 破坏性变更触发重评。
  `provider.test.ts` 的 usage 键断言是一道升版跳闸——上游改 `Usage` 形状即红。

## 三 · 三道独立的锁

1. **配置层**：只注册 read/glob/grep。edit/write/bash 从不构造，模型请求得到内核的
   `Tool X not found` 错误结果（`isError: true`，回灌可见）。
2. **闸门层**：`beforeToolCall` 默认拒绝，理由点名能力与依据。仅对**已注册**工具生效——
   内核先查工具表再调钩子，故装配期有 `assertToolsWithinPolicy` 校验兜住漂移。
3. **容器层**：`ExecutionEnv` 的写方法一律 `not_supported`、`exec` 一律 `shell_unavailable`，
   且本包生产码**零 `child_process`、零 fs 写调用**——由 ADR-018 门 R3 的 pi-lane 扫描面静态锁死
   （`apps/desktop/scripts/isolation-binding-lib.mjs` 的 `nodePrimitiveLedger`，当期为空册）。

第三道给出的是**静态红证**而非配置承诺：向本包生产码注入 `child_process` 或 fs 写原语，门必红。

## 四 · 本单新增了什么概念、为何非加不可

只新增两个概念，都由 ADR-022 决定二直接拉动：

- **授权文件夹（`AuthorizedRoot`）**——pi 范式把安全性整体外包给容器，取形即承接这份外包；
  容器须由我方供给。缺此概念，「授权文件夹外零读」无处落地。
- **只读容器（scoped `ExecutionEnv`）**——pi 的工具一律经 `ExecutionEnv` 触碰文件系统，
  这是唯一能一次性收口读/写/exec 三面的接缝。在此层拒绝，比在每件工具里各写一遍边界少一处漂移源。

其余都是既有概念的复用：预算是计数器，闸门是 pi 官方钩子，sidecar 是一个 `node:http` 服务。
**未引入**编排框架、状态机、持久化格式或通用抽象。`glob` 采手写 15 行的 `**`/`*`/`?` 翻译，
以省掉 minimatch/glob 一个新依赖。

## 五 · 已知边界（ADR-022 决定三：扩展不可达的不变量须显式登记，不静默放弃）

1. **无持久 transcript**。挂钩子只能用 `Agent`，而 journal 与 compaction 住 `AgentHarness`，
   当期不可兼得。ADR-022 决定四的卷宗分区本票只交提案（评估件第四节）。
2. **禁用面的拒绝语出自内核**，不 fork 改不了；我方政策说明经 system prompt 传达。
3. **模型对未注册工具的尝试不入任何账**——钩子在那之前就不被调用。
4. **预算是「越限即停」，非「永不越限」**：usd 只能事后知道，最后一个回合可能压线越过。
5. **symlink 一律不跟随**，界内软链子树也不可见（取保守解）。**但跳过要出账**：
   `symlinksSkipped` 计数进 `details`，文本出「另有 N 处符号链接未跟随」。不出账，模型看到的
   就是一棵「不存在这条链接」的树，而不是「有一条链接我没跟」——保守解是策略，隐瞒不是。
6. **glob 语法只到三个元字符**（`**`、`*`、`?`）；扩语法是契约变更。
7. **单次调用上限恰三枚**：扫描 2000 份文件、200 条命中、单行 400 字符。三条是**三类**不完整来源，
   各自出独立字段（`truncated` / `matchesTruncated` / `lineTruncated`）并在结果文本里分别具名，
   不合成一个布尔——第一条说「还有文件没看」（换起始目录），第二条说「看到的命中没全列」
   （换更窄的模式），第三条说「这一行本身被裁了尾」（改用 `read` 取全文）。
   行截断另在**行尾**留具名标记并带原长（`…（本行截断：原 N 字符，只给前 400）`）：计数说明有几行，
   标记说明是哪一行——只报总数，模型仍读不出手里这句引语是不是完整的。
   两件工具的 `matchesTruncated` 语义有一处差别，如实登记：glob 只在**真有**第 201 条命中被丢弃时
   置位；grep 置位于「因命中已满而停止继续搜」，故满 200 条整时即便余下文件恰好零命中也会置位——
   宁可多报一次不完整，不肯少报一次。命中满额之后遇到的拒读文件不再进 `skipped`：那时已经不读了，
   由 `matchesTruncated` 一并说明。行截断按 **UTF-16 单元**切，恰好落在代理对中间时会切出半只字符；
   本票不改切法（那是上限语义变更），但截断自此有标记，不再是静默的。
8. **不宣称等同场景线保障；对「完整」的承诺有明确边界**：本线没有确认账本、没有
   durable-before-effect 落账、没有事实等级。容器拒读的目录与文件进独立的 `skipped`
   （带 `FileError` code）：`details` 出逐条（路径与命中同一条投影链），文本出「另有 N 处不可读
   已跳过：<拒因计数>」。逐条路径只进 `details`、文本只给条数与拒因分类，是为了不让一棵大范围
   拒读的子树顶掉模型上下文。
   **本层可观察的不完整来源恰六类**——扫描上限、命中上限、行截断、容器拒读、symlink 不跟随、
   裸 NUL 行——六类各自出字段与注记。该口径不是列举，是**对 `tools.ts` 检索路径上全部九条
   丢弃/限幅分支逐条扫描**后的结果（三条与已有类同账）；九行族表逐条带坐标住
   [`specs/PI-TOOLS-HONESTY-1.md`](specs/PI-TOOLS-HONESTY-1.md) 十节，**改这个函数先对表**。
   故「工具结果里没有注记」是一句可依赖的断言，其**确切含义**是：容器交给本层的每一个条目
   都被检索、每一条命中都完整列出。「无命中」因此不再与「读不动所以没看见」同形。
   裸 NUL 行的判据刻意在 `matcher.test` **之前**——先认出二进制、再谈匹配，故被跳过的行里
   **可能有真命中**（`nulLinesSkipped` 的注记逐字这么说）。判据位置与「不把乱码喂给模型」的
   策略都不变，只是不再沉默：保守解是策略，隐瞒不是。计数粒度取**行**（与分支同位、零新增状态）；
   要按文件报「哪几份疑似二进制」需要第二个概念，本票不加。
   **承诺到此为止，本层不替容器作保**：容器自己在 `listDir` 内部丢掉的条目，工具连它们存在都
   不知道，`ExecutionEnv` 也没有第二条通道能把「我丢了什么」带出来。现有三处，逐条登记：
   （a）产品形态的 grammar 排除——`product-case-env.ts` 的 `listDir` 对保留名、控制字符、超长段
   的**真实文件**直接 `continue`，它们不进模型面，也不进任何注记；（b）目录内**单个条目**
   `lstat` 失败——`scoped-env.ts`、`product-case-env.ts` 各一处 `if (info.ok)`，静默略过；
   （c）**非法 UTF-8 字节被静默改写**——两份容器的 `readFile(…, 'utf8')` 把坏字节换成 U+FFFD，
   命中行**内容变了**却照原样出面，无任何标记（2R 复验上浮）。前两处是「丢条目」，第三处是
   「改内容」，形态不同但同属容器层：`ExecutionEnv` 的 `listDir`/`readTextLines` 契约里没有
   位置能把「我丢了什么／我改了什么」带出来（上游 `Result<FileInfo[], FileError>` 单值、
   `FileInfo` 无「被排除」变体、`FileErrorCode` 闭集 8 枚）。三处都要改 env 契约本身，与
   `PI-WORKSPACE-READ-1` 的双根改造是同一处接缝，见九节移交。在那之前，它们是**显式登记的
   产品边界**，不是本层的一句更大的全称句。ADR-022 六-B.1 对 wire 侧明令禁止「替换后继续」，
   读取侧目前无对应条款——这一条也随之交出。
   **`PI-WORKSPACE-READ-1` 的处置（2026-08-05，逐件不悬置）**：三处**维持显式登记**，理由是
   收口它们要改 `ExecutionEnv` 契约本身（多一条 per-entry 失败通道），属 ADR 级跨层变更，
   实现会话不自裁——请架构在 env 契约票里一并裁。但本票**没有让这一族多一个成员**：新增的
   host-mediated 读容器 `workspace-read-env.ts` 在同一位置取 **fail-closed** 而非 `continue`
   ——宿主列目录时已按同一套 segment 闭集筛过，故 Node 侧再见到不合规的名字只可能是两端
   grammar 分叉，整次 listing 因此具名拒绝，不表现成「那个文件不存在」。(c) 的 U+FFFD 一路
   在读容器里也不成立：`read_file` 的正文由 Rust 侧 UTF-8 fail-closed 取出，Node 侧再按
   重编码后的 hash/byteLength 双验，坏字节结构性到不了命中面。

## 六 · dev 入口用法

```
PI_LANE_ROOT=<授权文件夹绝对路径> pnpm --filter @courtwork/pi-lane dev
```

可选环境变量：`PI_LANE_PORT`（默认 4319）、`PI_LANE_MAX_TURNS`（默认 12）、
`PI_LANE_MAX_USD`（默认 0.5）、`DEEPSEEK_API_KEY`（凭据，只在本进程解析）。

授权文件夹**必须显式给出**，不默认取 cwd——默认取 cwd 等于默认越权。
缺凭据时页面显式标红并禁用提问入口，`/api/prompt` 回 503，不静默假跑。

三枚数值变量**设置了就必须是有限正数**，否则 stderr 具名报错并 `exit(1)`，与缺授权文件夹同一处方
（判定住可测的 `dev-config.ts`）。`PI_LANE_MAX_TURNS=十二` 这类写法过去会静默变成 `NaN`：`budget.ts`
的 `turns >= limits.maxTurns` 与 `usd >= limits.maxUsd` 双双恒假，ADR-022 决定三要的那道上限于是
整枚失守而进程一声不吭；`PI_LANE_PORT` 同族（`listen(NaN)` 被 Node 当 0，服务起在随机端口而 banner
印着 `NaN`）。不回落默认值——把用户写错的上限静默换成另一个上限是同一种静默降级换了个位置。

## 七 · 真 key 复核步骤（本票**未执行**，留给持 key 者）

本机环境未设置 `DEEPSEEK_API_KEY`；实现会话不代取、不代填凭据，也不动用他人额度。
自动化门内的全部 loop 证据走 pi-ai 自带构造 provider（faux），不触网。持 key 者按下列步骤补齐，
结果**另行登记**，不与构造 provider 的证据混写：

1. 备一个只含 md 的文件夹（建议同时放一份文件夹**外**的文件用于反例）。
2. `DEEPSEEK_API_KEY=<key> PI_LANE_ROOT=<文件夹> pnpm --filter @courtwork/pi-lane dev`。
3. 三例各跑一次并留痕：**问答**（就某份 md 的内容提问）、**检索**（跨文件找一个词）、
   **摘要**（概括整个文件夹）。
4. 反例一次：要求模型读文件夹外的绝对路径，确认得到拒绝而非内容。
5. 反例二次：要求模型执行命令或改写文件，确认得到 `isError` 的拒绝结果。
6. 记录每轮结束时页面显示的回合数与开销，与 DeepSeek 后台账单对照，核实 usd 计量口径。

## 八 · 偏离回执

- **dev 入口落点已追认**：`packages/pi-lane/dev` + sidecar 自服务保持 dev-only，避免触碰
  desktop Vite 与产品包；ADR-022 修订记录已销记，不迁回 desktop。
- **根总纲边界已补**：`CLAUDE.md` 已登记 `packages/pi-lane`，并于 2026-07-28 将“场景执行器自研 /
  通用 loop 受控内嵌”写成现行技术基线，不再悬置。
- **`nodePrimitiveLedger` 为空册时的扫描面失效判据**：`packages/pi-lane/src` 扫不到 `.ts` 即触红。
  若本包退役，须同批把扫描面与登记册一并销号，不得让判据静默空转。

## 九 · 下一阶段冻结票面

### 当期薄 harness 不变量

- 产品 Agent 只注册 `read/glob/grep/write`；`exists/read_file/list` 只在 env/host 内部，不成为
  模型工具。继续直接消费 pi core，不引 `pi-coding-agent`、planner、subagent 或第二 loop。
- product system prompt 不超过 2,048 UTF-8 bytes，只锁六条：基于实读；`/case` 只读；
  `/workspace` 是过程草稿；`.md` 覆盖前先读、写后回读并报告逻辑路径；没有
  edit/delete/rename/promotion/bash；权限与 effect 只认 gate/journal。不得复制 schema、Dossier、
  plan 模板或长 coding playbook；定向 snapshot/byte gate 必须先红后绿。
- 首版能力边界是最多 12 assistant turns、prompt/workspace text 各 131,072 UTF-8 bytes 的通用
  Markdown 工作。模型可用正确工具但写得不好，不等于加厚 harness；只有必要 tool/host result
  已完整、未截断进入 transcript 后，才允许把内容错误归为模型能力。
- **prompt 第④条「写后回读」的缺口已于 `PI-WORKSPACE-READ-1` 闭合**（2026-08-05）。
  `PI-WRITE-HOST-1` ⑤回执 §九.8 与 ⑦回执 §七曾如实登记：读侧票放行前，模型照 prompt 第④条
  回读 `/workspace/...` 只会拿到一枚 case-only 容器的 `denied`。读面装配之后该路径真的通了——
  read/glob/grep 经双根 env 路由到 host-mediated 读容器，同 leg 与跨 leg 均可逐字节回读。
  两处历史登记**不改**（回执记的是当时事实，改它才是造假）；缺口的现行状态以本条为准。

### `PI-WRITE-PROOF-1`（可与 STDIO/分发并行）

权威：ADR-004/017/018 的 2026-07-28 窄修订、ADR-022 决定六。

- 直接实例化当前已安装 core 的 `createWriteTool()`，不得复制 schema/execute 或新增工具名。
  characterization 如实锁：参数表面只有 `{path,content}`，但上游 object 非闭集、空串可过且
  validator 会做 primitive→string coercion；不存在即创建/存在即覆盖只是
  `ExecutionEnv.writeFile` 契约，上游自身不建父目录。raw exact-key/type gate 属 Courtwork
  policy，必须在上游 coercion 前拒额外字段、非 string 与路径 alias。
- 允许在同一文件实现极薄 `bindWorkspaceWriteTool`：保留上游
  `name/label/description/parameters`（parameters 引用同一对象），固定
  `executionMode:'sequential'`；wrapper 只用 raw toolCallId 从注入 registry 查取预先映射的
  public toolCall，创建 invocation-scoped env，再**恰一次** delegate 上游五参 execute；
  `writeFile` 真正发 host request 时才为该次 operation 分配 op。tc 的首分配属于未来 product
  event projector，因为上游 `tool_execution_start` 发生在 validate/beforeToolCall/execute 前；
  proof 用预种 registry，映射缺失必须拒绝且 port 零调用。不得复制 schema/execute、不得由 binder
  预分配 tc/op，或以共享 mutable `currentOperation` 关联。
- 新增 `workspace-write-env.ts`：逻辑 cwd 固定 `/workspace`；相对路径只落该根，
  `/workspace/<safe-relative-path>` 规范化为同一 logicalPath；完整采用 ADR-022 六-B.2 的
  POSIX/跨平台 segment grammar，拒绝空/NUL、`/workspace` 根本身、其他绝对路径、
  `.`/`..`、backslash、drive/UNC、Windows 保留名、超长路径与跨 session。`canonicalPath`
  固定回 `not_supported`；最终 basename 按 ASCII 大小写不敏感必须以 `.md` 结尾且扩展名前
  至少有一个字符（basename 恰为 `.md` 必拒），非 Markdown 在分配 operation/调用 port 前以
  `unsupported_file_type` 拒绝；raw leading `@` 与
  NBSP/Unicode-space alias 在 binder 调上游前拒绝。
  content 采用同 ADR 的 131,072 UTF-8 bytes 上限；另锁 repeated U+0001/引号/反斜杠的
  encoded-packet worst case，raw cap 以内不得撞破 1 MiB framing。
- `writeFile` 只调用注入的 `WorkspaceWritePort`，每 tool call 独立 env，每次真实 port 调用独立
  分配 operationId；port request 精确为
  `{sessionId,requestId,operationId,logicalPath,content,contentSha256,byteLength,proposalHash}`，
  hash/frame 逐字采用 ADR-022 六-B.2。不得用共享 mutable current-operation。其余 write-like
  方法、remove/temp/exec 全拒。生产源码继续零 Node fs 写。
- 启用 write 的 Agent 装配必须显式 `toolExecution:'sequential'`；0.82.1 缺省
  `parallel` 的 characterization 也要锁住。共享 env 同路径受上游 mutation queue 串行，而
  invocation-scoped env 不共享该 queue；两件须分测，产品只依赖 Agent sequential 与后续
  Rust/container 串行化。
- characterization 锁上游 Unicode 单位 bug：`备忘😀` 成功文案报 4，但 port request 必须从
  原 content 得到 UTF-8 `byteLength:10` 与对应 hash；任何产品事实不得解析 success text。
  另锁 pre-write abort 为 port 0 调用、post-write abort 可为 port 1 调用但 tool error，证明
  “上游 error ≠ effect 未发生”；产品 outcome 后续只认 host_result/journal。
- 本票只允许新增 `workspace-write-env.ts` 与定向 test/fixture，并只改本节下方
  `PI-WRITE-PROOF-1` 的独占回执行；不改 current product tool table、`session.ts`、wire、
  Rust/Tauri、package/lock、其他 SPEC/ACCEPTANCE 段或 GUI。测试 host 可在临时目录证明 nested
  `.md` create、overwrite 与 byte-identical read-back；非 `.md` 必须 port 零调用且 op 零分配，
  但该 adapter 不进生产。
- 完成只叫 `package/headless proof`，不更新 `current.md`，也不宣称 coding agent 基础已闭合。

### 并行相邻票与合流门

- `PI-CODE-STDIO-1` 只新增
  `src/product-protocol.ts`、`src/product-stdio.ts` 及同名测试：逐字段实现 ADR-022 六-B 的
  strict discriminated union；完整 packet 顶层恰为
  `{protocolVersion,seq,sessionId,requestId,type,payload}`，逐包业务字段只在 nested `payload`
  中，flat v1 必拒。另实现 per-direction seq、request/session/state machine、1 MiB framing
  和可注入 driver；必须覆盖 duplicate JSON member、fatal UTF-8/lone surrogate、LF-only、
  integer lexical gate、pre-bootstrap null-session error、C0 worst-escape/max-list packet，
  sidecar-leg seq 与本 leg 去重集合重置、fresh/resume 自洽门、从给定
  `priorObservedTurns/priorTurns/priorUsd` 初始化累计器、race-late cancel no-op 与在途 host
  request 的 uncertain 优先收束。Terminal codec 必须拒绝与
  `effect_uncertain > budget_unknown > known limit > cancel > outcome` 冲突的 budget/status 组合，
  包含 reached/unknown/stopReason/usd 互洽反例。新进程没有历史 journal，本票不得伪测跨 leg
  requestId 去重、previous+1、prior 精确 fold 或 model/limits/grant/container/capability 漂移；这些由
  `PI-HOST-LOOP-1` 的 Rust/journal 反例承担。它只校验 workspace arguments 的闭集形状/hash 格式；逻辑路径语义由
  `workspace-write-env` 与未来 Rust host 双验，不在 codec 复制。不得新增尚无产品 driver 的
  假 executable main，不改 env/tools/session/package/lock，并只改自己的独占回执行。
- 成熟 OSS 四选一结论为**保留自研**这一条窄 strict scanner/stdio state machine，不新增依赖。
  TypeBox 只能校验 parse 后的 value；现有 line splitter 不满足 LF-only、fatal UTF-8 与 partial
  EOF；`jsonc-parser` 虽能提供 offset/token，但仍须自写 duplicate-key stack、canonical integer、
  strict trivia/framing 与全部跨字段状态门，不能减少概念数。后续若重开依赖选型，必须以 exact
  stable version 的相同反例 spike 证明能删除现有边界，而非只替换约 200 行 tokenizer。
- `PI-CODE-STDIO-1` 的实现 `79a13d2` 经独立验收修复 `0ffae46` 后仍由 6 枚临时反例坐实
  3 blockers + 2 majors，结论为 **REJECT**；build/test 全绿不改变此结论。返修票
  `PI-CODE-STDIO-1R` 只许改同四份 source/test 与专属
  `specs/PI-CODE-STDIO-1R.md` 回执，基线为验收报告 tip，不得改旧回执、ACCEPTANCE、父级
  SPEC/ADR、index/env/tools/session/package/lock、Rust/Tauri 或 GUI：
  1. `PromptCompletion` 删除自由 message，精确 union 为
     `completed | provider_error/host_error + retryable:boolean |
     invalid_state/unknown + retryable:false`；其余三种 failure 不得由 runtime 构造。terminal
     message 每 code 一枚本地 source literal（措辞非 wire ABI）；即使 cast 塞入 secret/绝对
     路径或 callback 抛含 canary Error，也不得出 wire/error/cause。
  2. upstream 违约时若有 pending operation，闩锁失败而不清 pending、不提前 terminal；停止后续
     runtime 输出，仍接受当前 request 至多一次 cancel，只待严格匹配 host_result。进入闩锁即把
     usd 传染 null；result 先解 deferred，状态机再基于保存的 tc/toolName/status 自行发恰一枚
     tool_finished 并自动 terminal，不等 runtime finish。uncertain 必收束 effect_uncertain，
     其他结果按原优先级关闭；host_result 已到、tool_finished 未到的 race 同样闭合。
  3. 五个 runtime callback 共用 callback-depth guard；同步 inbound reentry 在触碰
     carry/seq/phase/wire/exit 前抛，`finally` 复位；`startPrompt` 的合法同步 outbound 不受禁。
     未捕获 callback Error 只换成固定无 cause `ProductSidecarError`；闩锁收束期 callback Error
     不得再次丢 effect。
  4. 关闭 write proof→stdio 接缝：删 `ProductSidecarSessionOptions.hashProposal` 与会二次铸 op/
     hash 的一段式 `requestHost`，改为 `reserveHostOperation({publicToolCallId,capability})` +
     `sendReservedHostRequest(existing request)`。reserve 后 hash 失败只烧 ordinal；send 原样消费
     proof 的 op/hash，零预测、零重算、零 shared-current。reservation 保存 public tc/toolName。
  5. pending 保存 send 入参的一次不可变镜像；全部 status 比 request/op/capability/operation，
     只有 ok 再比 value：write 比 `logicalPath/contentSha256/byteLength`，
     exists/read_file/list 比 logicalPath；错值 fatal 且 runtime consumer 零调用。正常 write
     的 tool_finished outcome 也必须与已保存 host status 一致。
  6. Terminal decoder 对 `budget_unknown|effect_uncertain|upstream_event_unsupported|
     invalid_state|unknown` 强制 `retryable:false`。
  TDD 首红必须直接落在上述现有缺陷而非 stub/module load；六项各做有效 production mutation，
  write 三个镜像字段分别撤门也须逐项红，另锁五 callback reentry、reserve/send 的同 op/hash、
  pending `ok/denied/failed/uncertain`、host_result-before-violation race、cancel 与 usd taint、
  canary。完成后仍只叫“待独立复验”，不得自放行；原验收要求的 semantic mutation 证据缺口由
  后续独立验收补齐。
- `PI-CODE-STDIO-1R` 实现 `9f9255b` / 回执 `7c8c9c3` 虽保住上述六项与全仓 1550 绿测，独立
  验收 `4df2e84` 另注入 9 枚 production 反例得到 **9 red / 227 green**，结论仍为
  **REJECT**。USD 一律传染、预登记 public tc、callback 不回滚与 reserve/send 不二次铸 op/hash
  四项不回退；问题是 tc registry 未真正绑定 request/tool/capability/phase，且普通 finish 可
  抹掉已确认 effect。返修 `PI-CODE-STDIO-1R2` 只许改同四份
  `product-protocol.ts/.test.ts`、`product-stdio.ts/.test.ts` 与新回执
  `specs/PI-CODE-STDIO-1R2.md`；不得改 1/1R 旧回执、ACCEPTANCE、父级 SPEC/ADR、index/env/
  tools/session/package/lock、workspace-write-env、Rust/Tauri 或 GUI：
  1. public tc 记录不可变 `{requestId,toolName,phase}`，只属生成它的 active prompt；每 prompt
     至多一枚未 finished tc。progress/finished/reserve 必须同 tc、同 toolName、同 request，
     finished 后 progress/finished/reserve 与旧 prompt tc 全拒。不能拿
     `toolExecution:'sequential'` 代替机器门。
  2. tool→capability 映射固定为 `write↔workspace_write`、
     `read|glob|grep↔workspace_read`。owner/name/phase/宣告能力全部通过后才烧 ordinal；send 前
     的有效重复 reserve 只烧掉旧 hash-failure ordinal，send 后 write 不得铸第二 op。
  3. pre-operation write 只准可信本地 `failed|denied` 分型；`succeeded|uncertain` 必须由状态机
     改投 `tool_finished:failed` 后以 upstream failure 关闭。write pending 时 runtime 的
     tool_finished/finishPrompt 只进入 pending failure 闩锁、不得先出 finished/terminal；
     outcome 仍只认 host_result。
  4. host_result 已收但 tool_finished 未到时，settled effect 与新 reservation/pending 结构互斥。
     合法同名、同 outcome finished 正常闭合；改名/错 outcome、普通 finish、新 tool 或新 host
     request 都须先按保存 status 自发恰一枚正确 finished，再按原优先级 terminal。任何普通
     terminal 都不得清掉 settled effect。
  5. runtime 投影入口先做 kind/toolName 运行时闭集检查；unknown/future event 不得落入
     turn_finished default、抛 `TypeError` 或变成 callback failure。重复 finished、finished 后
     progress、pending 前 finished、跨 prompt stale tc 都须 fail-closed；read/glob/grep 的同 tc
     多 host-operation 子循环仍保留。
  6. R2 不得破坏 1R 已成立的固定安全文案、retryability、五 callback guard、四态 latch、
     cancel/usd/result-before-violation、同一 op/hash 与逐值 correlation。九枚验收反例须先在
     未改 production 的 1R tree 直接见红；上述每个新增转移做有效 source mutation，且至少锁
     capability 双向错配、tc 改名、stale tc、pre-op succeeded、pending 提前 finished、
     settled→finish、新 pending 与 unknown event。完成后仍须异会话 clean-worktree 验收，
     不得由实现者或本轮验收者放行。
  7. `710faaa` 的实现收敛项由架构拍板如下：原两枚绿测包含已冻结的非法转移，允许分别改到
     顺序闭合 tc 与 read 多 operation 子循环，但独立验收仍须另注入旧非法形态；settled write
     上的 `finishPrompt` 在状态机发保存结果的唯一 finished 与优先级 terminal 后正常返回，
     不要求额外抛错；send 期 phase exact 与 active-tc exact 在可达图中同步失效，撤整块有效性
     门的 mutation 可作为红证，两道检查均须保留，不为制造单条件 mutation 改变状态图。
- `PI-CODE-STDIO-1R2` 已由异会话在 clean worktree 独立验收：先以
  `43b3796 fix-by-acceptance` 补上 reserve 后、send 前 tc 已结束时的有效性复核，再由
  `cc5faf5` 明确 **PASS**；实现/验收组合以 `db4f360` no-ff 合入 `main`。放行只覆盖本包
  strict protocol、stdio 状态机与 write proof→stdio 的两段式接缝，不代表 sidecar 分发路线、
  Rust host/journal、workspace effect 或产品 composition 已成立。
- `PI-SIDECAR-DIST-1` 的实现 `70e6482`、回执 `01ff5e7`/订正 `3207b27` 经独立验收
  `9b8142f` 判定 **REJECT**；其报告与 SEA-default 建议不得用于路线裁定。返修
  `PI-SIDECAR-DIST-1R` 只许改 fixture `README.md`，`scripts/` 下
  `fetch-runtime.mjs`、`extract-runtime.mjs`、`build-sealed.mjs`、`build-sea.mjs`、
  `measure.mjs`、`coldstart-rounds.mjs`、`sign-probe.mjs`、`reproducibility-probe.mjs`、
  `clean.mjs`，以及 `scripts/lib/toolkit.mjs`、新增
  `scripts/lib/probe-verdict.mjs` 与 `scripts/probe-verdict.test.mjs`，原独立报告
  `docs/engineering/pi-sidecar-dist-1.md` 与新回执 `specs/PI-SIDECAR-DIST-1R.md`。被测
  `sidecar-fixture.mjs` 冻结；不得改旧回执/ACCEPTANCE、package/lock、生产源码、父级文档、
  Tauri/Rust 或 GUI：
  1. 新增薄的纯 verdict 层及定向测试，`measure`、三轮冷启、签名/可复现性探针必须消费同一
     判定，不得各自只写观察值。库存恰为十件：两架构 × sealed 三档 + SEA 两档；两枚
     `esm-naive` 必须以 `Dynamic require of "process"` 的非零启动失败作负控，其余八枚缺一、
     多一、跳过或任一项 blocked 均令顶层 JSON `status:'failed'` 且进程非零。
  2. 八候选逐件锁 `ready` 的 Node version/arch/SEA 身份、pong、三 payload 的 byte/hash、
     exact `read/grep/glob` 工具表、`read`/2 turns/assistant 的真实 loop 与 EOF code 0。
     abort 必须收到 `aborted` ack 且 `wasRunning:true`、slow 以 `aborted` 闭合、随后 ping
     仍通及 EOF 0；throw/exit/hang/sigterm 必须分别为 code 1/code 7/SIGKILL/SIGTERM，逐类
     复启 ready。
  3. runtime 只从固定 `https://nodejs.org/dist/v22.23.1/` 取。下载写同目录唯一 partial，
     fsync 后核冻结文件名/byte size/SHA、下载 SHASUMS 的同名记录与 tar 完整性，全部通过才
     原子 rename 并同步父目录；现存正式件先验再复用，失配拒绝且不覆盖。解包再核
     `node --version` 与 Mach-O arch。不得把 HTTPS+SHA 写成 release-key 认证。
  4. 冷启固定八候选、三轮 × 每轮 25 样本（丢三热身），逐轮随机化并记录顺序；少轮、少样本、
     异常 EOF 或身份错均非零，只报告同机数字，不设路线胜负阈值。两次从空 route 目录重建，
     sealed minified bundles 与 SEA default 必须 byte-identical；code-cache 必须记录不一致，
     arm64 blob 注入 x64 必须观察 `Code cache data rejected.`，不得静默降级。
  5. sign probe 锁两候选 × plain/hardened-no-entitlements/hardened-with-entitlements 三姿势的
     sign/verify/launch 观察与 synthetic `.app` 的逐件先内后外签名；只宣称同机 ad-hoc
     探针，不宣称 Tauri bundler、Developer ID、notarize 或跨机可复现。
  6. 直接反例至少覆盖缺产物、payload/hash、tool/loop、abort 四岔、四 crash、身份三元组、
     冷启缺轮/样本、default SHA 漂移、code-cache 误报可复现、跨架构 warning 消失与
     archive 截断/预置错件；每枚须验证变异确实命中并使生产 verdict 非零。README/报告统一
     2.27 GiB 与完整 isolation 命令。全流程从空 `dist/` 起跑，原始 JSON 保全到独立验收后再清。
- `PI-SIDECAR-DIST-1R` 实现 `ba71df8` / 回执 `61c2b09` 虽交出 102 例 pure-verdict 绿测、
  31 枚自报 counterexample 与全仓 1397 绿测，独立验收 `f261347` 仍判 **REJECT**：
  production `measure` 对真实多余目录/文件报绿，cold-start 会用后续正确 identity 洗掉首个
  错样本，reproducibility 会把两个 null SHA 判作相等；另有 crash 无界等待与 SEA
  remove-signature/sign/strict-verify 非零仍记 ok。R1 已成立的官方 Node 来源门、stdio/abort/
  四 crash exact 语义、八候选/两负控、sign matrix 与删除旧 SEA-default 建议均不回退；
  `PI-SIDECAR-DIST-1R2` 只许改 fixture `README.md`，`scripts/` 下
  `build-sealed.mjs`、`build-sea.mjs`、`measure.mjs`、`coldstart-rounds.mjs`、
  `sign-probe.mjs`、`reproducibility-probe.mjs`、`clean.mjs`，
  `scripts/lib/toolkit.mjs`、`scripts/lib/probe-verdict.mjs`、
  `scripts/probe-verdict.test.mjs`，原工程报告
  `docs/engineering/pi-sidecar-dist-1.md` 与新回执
  `specs/PI-SIDECAR-DIST-1R2.md`。不得改 `fetch-runtime`/`extract-runtime`、
  `sidecar-fixture.mjs`、1/1R 旧回执、ACCEPTANCE、package/lock、生产源码、父级文档、
  Tauri/Rust 或 GUI：
  1. 新建唯一 `dist/assembly`；corpus、runtime、构建 scratch、JSON 与反例留档全在其外。
     assembly 顶层恰为 `route-a/`、`route-b/`，其下分别恰有六个、四个 target/variant 目录：
     route A 每目录恰为 executable + 指定 bundle，route B 每目录恰为 executable。production
     从 `readdir/lstat` 的实物构造
     observation，不从 `INVENTORY.map()` 反推 observed；预期项须为 regular file，额外文件、
     子目录、symlink、socket/FIFO 或错 basename 全部顶层 failed/非零。
  2. cold-start 每轮保留 25 枚 `{sample,identity,elapsed,eof}`；三枚 warmup 只不入性能统计，
     仍须过身份和 EOF 门。每枚逐一校验 Node version/arch/SEA，`identityDrift !== null` 必红，
     不得用首值、末值或 drift 值代替逐样本证据。
  3. 双 cycle 每项先记录并校验 assembly 内相对路径、exists、regular-file、正安全整数 bytes
     与 64 位小写 hex SHA，再比较：sealed/default 只许两份有效 SHA 相同，code-cache 只许两份
     有效 SHA 不同。`null`、空串、占位串、缺件、目录或零字节均先失败；测试 fixture 不得再用
     `sea-arm` 一类非 SHA 占位值。
  4. crash 的具名 deadline 固定为 ack 15,000 ms、exit 15,000 ms、respawn-ready 30,000 ms、
     respawn-EOF 15,000 ms、kill-confirm 5,000 ms；throw/exit/hang 必须收到 `crashing` ack，
     sigterm 不要求 ack 但同样要求有界退出。任一超时写结构化 failure，杀掉仍存活子进程且
     最终非零；kill 后也不得裸 `await exited`。用能 ready 但忽略 crash/exit 的受控子进程
     证明整支 probe 在上界内失败，不得改冻结 fixture 来制造红证。
  5. SEA 每 variant 从干净 staging 严格走 copy → remove-signature → postject → ad-hoc sign →
     `codesign --verify --strict` → publish；四个外部阶段任一非零都写精确 stage/exit/stderr、
     顶层非零，且 assembly 零该 variant 成品。先成功后注入失败也不得复用 stale executable；
     只有全部通过才原子发布。
  6. 三枚验收 blocker 必须在未改 production 的 R1 tree 直接先红；再补物理额外文件/目录、
     报告 JSON 位于 assembly 外不误伤、首/尾/warmup 身份错、null/空/非 hex/缺件 SHA、
     忽略 crash 与 SEA 四阶段失败反例。既有 102 测试、31 反例及从空 assembly 的完整双架构
     功能/冷启/双 cycle/sign matrix 全部复跑；每个新 gate 做有效 source mutation。
  7. 报告继续不提路线建议。SEA default 只称同 worktree、同绝对路径的两次空 assembly
     byte-identical；跨路径变化与 Developer ID 后净体积均标未实测。负载超时只登记本次观察，
     不外推频率。许可写为 Postject 自有部分 MIT、package 内 `vendor/LIEF` Apache-2.0，最终
     制品携带/notice 归发行票。残留双列：`3207b27` 的 2,436,991,750 B（2.27 GiB）是历史范围，
     R1 的 2,527,892,648 B（2.35 GiB）是较大保全范围，互不取代；R2 另以逐项求和报告实值。
     本条只取代上一段 R1 条款 6 的“统一 2.27 GiB”口径，不改其他 R1 门。
- `PI-SIDECAR-DIST-1R2` 实现 `42858b2` / 回执 `33100d8` 经独立验收 `9ebb92a`
  判定 **REJECT**；验收修复 `850fa11` 已把 SEA 成功行 `publishedPath` 从“非空”收紧为
  exact assembly cell，须完整保留。拒绝点只由 `PI-SIDECAR-DIST-1R3` 处理：同一枚 SHA
  已验证的官方 arm64 Node 上，`codesign -d --entitlements - --xml` 出现 exit 0 / stdout
  0 bytes / invalid-blob warning，令两枚 with-entitlements 格 blocked；架构后续已用同 host/tool/
  Node SHA 的 seatbelt 内外成对实测把根因定位为 security execution domain，而非 blob 损坏。
  R2 未登记/判定此前提，REJECT 仍成立。R3 从当前架构 `main` tip 新建，再顺取
  `c304745→e8963ef→972f42a→c6361a7→4e530cb→3435fa8→166a89a→42858b2→33100d8→850fa11→9ebb92a`；
  只许改 fixture `README.md`、`scripts/sign-probe.mjs`、
  `scripts/lib/probe-verdict.mjs`、`scripts/lib/toolkit.mjs`、
  `scripts/probe-verdict.test.mjs`，新增
  `upstream/node-v22.23.1/osx-entitlements.plist`，原工程报告
  `docs/engineering/pi-sidecar-dist-1.md` 与新回执
  `specs/PI-SIDECAR-DIST-1R3.md`。不得改其他 fixture/build/runtime 脚本、1/1R/1R2 旧回执、
  ACCEPTANCE、package/lock、生产源码、父级文档、Tauri/Rust 或 GUI：
  1. canonical probe 输入只认 Node `v22.23.1` commit
     `bd96dfbf0361576724b65322046e2ca9f9609cb9` 的
     `tools/osx-entitlements.plist` 原始 632 bytes：Git blob
     `045df8eaf98e65e4fb4ea9a82b5821d41590dbdd`、SHA-256
     `a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797`；同树的
     `tools/osx-codesign.sh`（blob `346afdbe66e9fda3349c46b5ccae221160313720`）须作为
     “上游确实消费该文件”的一手证据。仓内副本须 exact path、`lstat` regular-file/non-symlink、
     exact bytes/hash、绝对 `/usr/bin/plutil` 合法、恰六键且值全 true。任意手写、历史 `dist/`、运行时生成、
     抽取输出或路径替代均禁止；这份副本是固定输入，不叫 fallback。
  2. 在解释官方 blob 前先做 security execution-domain preflight：用 canonical file 签临时
     official Node 副本，要求 strict verify + XML 回读 + canonical 逐值比较，并以该副本运行
     `scripts/sidecar-fixture.mjs`，在 deadline 内完成 `ready → stdin EOF → exit 0`；
     只签/验不启动不算 control。official Node 必须分别通过
     `/usr/bin/codesign --verify --strict --verbose=4`，并由
     `/usr/bin/codesign -d --verbose=4` 取得 exact `Identifier=node`、
     `CDHash=59cdea89a982b05f23e756c08115bebc555ff092`、
     `TeamIdentifier=HX7739G8FX`、`flags=0x10000(runtime)` 及按序三条 Authority：
     `Developer ID Application: Node.js Foundation (HX7739G8FX)`、
     `Developer ID Certification Authority`、`Apple Root CA`。
     synthetic ad-hoc `.app` 的 `/usr/sbin/spctl -a -vv` 必须在 `LC_ALL=C` 下 exact
     stdout 空、exit 3、stderr 第一非空行 `<app>: rejected`，不能把 exit 1 /
     `internal error` 等任意非零冒充预期拒绝。
     `Authority unavailable`、invalid blob、0-byte XML 或 security subsystem internal error
     一律结构化为 `security_execution_domain_blocked` 并非零，不能继续判官方内容，也不能用
     human 输出绕过；canonical/source/tool 失败、control 协议/启动失败与未知错误另记
     `probe_failed`，不能滥归环境。提供快速 `--preflight-only`；实现须以验收保存的 exact command receipt
     写先红/变异并在自身执行域实跑，独立验收须真跑“Codex seatbelt 准确 blocked + 明确批准的
     非受限域通过”两格，正式签名读数只取后一格。环境变量只作诊断，功能 preflight 才作判定。
  3. preflight 通过后，官方实物 extraction 才与输入分账。同轮运行 XML 与默认 DER
     human-readable 两路径，逐条保全 argv/exit/signal/stdout/stderr bytes+SHA。XML 必须非空、
     是合法 plist 且与 canonical 等义；human parser 只收单层 dictionary、无重复/额外键、
     六键 bool true。两路都须与 canonical 逐键逐值等同；human 是交叉见证，不是 XML fallback。
  4. 重签模式精确改名为
     `adhoc-hardened-with-node-v22.23.1-entitlements`；旧
     `adhoc-hardened-with-official-entitlements` 在生产 fixture 零出现。六格每行都记录
     canonical input path/SHA，并从签后副本回读 actual entitlements：plain 与
     hardened-no-entitlements 恰为 none，with-upstream 恰等 canonical 六键。sign/strict
     verify 绿不能替代实际回读；临时 plist、错 input SHA、少/多/错值或 blocked 均失败。
  5. CLI 强制 `--execution-domain-id <[a-z0-9][a-z0-9-]{0,31}>`，拒绝已存在目标；
     每次在私有 staging 原子发布到 `dist/security-domain/<id>/`，其中
     `host-tool-receipt.json`、`preflight.json`、`manifest.json` 是最小闭集，full 只在**同一
     进程/域** preflight 通过后增加 `sign-probe.json`。禁止共享顶层 `dist/sign-probe.json`、
     跨运行复用 preflight、覆盖目录或留下 stale/半份 sign 读数。manifest 锁 id/mode/status/
     cwd/timestamps 及其余 JSON 的 repo-relative path/bytes/SHA；实现、验收各以不同 id 物理
     留档，并在自己的回执引用 manifest path + 外算 SHA。
     verdict 必须消费同轮 receipt：macOS product/build、Darwin、hardware/process arch、
     harness Node path/version/arch/bytes/SHA、`xcode-select`/CLT version，以及 official Node
     bytes/SHA/固定 signature identity。Apple 工具实际调用只许绝对 `/usr/bin/codesign`、
     `/usr/sbin/spctl`、`/usr/bin/plutil`，三者各以 `lstat` regular/non-symlink +
     path/bytes/SHA/Mach-O slices 登记；每条 receipt 的 `argv[0]`/tool SHA 绑定该件并固定
     `LC_ALL=C`。缺字段、空值、事后常量、command exit/双流 bytes+SHA 不自洽、指纹与实际
     executable 不一致均有具名失败。
  6. sign probe 的 ready/EOF/kill-confirm 进入具名 deadline；不得再裸
     `await proc.exited`。canonical hash/语义、受限域误归因、`spctl internal error` 假拒绝、
     XML 空成功、human 少/多/false/重复、fixture symlink/path、每格 input SHA、签后 actual、
     execution-domain id/path 碰撞、跨域复用、PATH 三枚同名 shim、host/tool receipt 与
     bounded control cleanup 均须先在未改 R2 production 上见红，再逐门有效 source mutation。
  7. R3 的上游六键含 `get-task-allow`，只作同机 ad-hoc 控制变量，不授权
     `PI-DEBUG-BUILD-1` 或公开发行复用。批准的非受限域快速签名门通过后，实施与独立验收各自
     从空 assembly 复跑 R2 的 203 verdict 回归、76 counterexamples、600 cold-start samples、
     双 cycle、六格签名、来源门与四仓库门；不得从旧 `dist/final` 回填。报告仍零路线建议，
     R3 异会话完整放行前不得裁路线或启动 Host。
- `PI-SIDECAR-DIST-1R3` 实现 `7b4184b` / 回执 `47fd7e5` 经独立验收 `eb71d6f`
  判定 **REJECT**。R3 的 canonical fixture、四层证据、双 execution domain、deadline、实际
  签后回读与 R2 exact-cell 门全部保留；拒绝只因三处 hard-verdict false-green：完整
  host/runtime identity 未进入判定，DER human 未从 raw stdout 严格重解析，blocked reason
  覆盖 control launch/protocol failure。`PI-SIDECAR-DIST-1R4` 从当前架构 `main` tip 新建，
  再顺取
  `f0162fd→eb806f2→b284764→f7ecd32→20461aa→c6a9819→df65ab0→0230bf6→57f91dc→
  473bc00→ba374d8→7b4184b→47fd7e5→eb71d6f`。只许改
  `fixtures/sidecar-dist/scripts/sign-probe.mjs`、
  `fixtures/sidecar-dist/scripts/lib/probe-verdict.mjs`、
  `fixtures/sidecar-dist/scripts/probe-verdict.test.mjs`、
  `fixtures/sidecar-dist/README.md`、
  `docs/engineering/pi-sidecar-dist-1.md` 与新回执
  `specs/PI-SIDECAR-DIST-1R4.md`。不得改 toolkit、canonical plist、其他
  fixture/build/runtime 脚本、旧回执/ACCEPTANCE、package/lock、生产源码、父级文档、
  Tauri/Rust/GUI：
  1. `runFullProbe()` 必须把完整同轮 receipt 交给 `verdictSign()`，不得再投影为
     `{tools,commands}`。hard verdict 必须消费并关联 `schemaVersion:1`、与 probe 相同的
     `executionDomainId`、非空时间、host 六字段、harness Node、Developer Tools、official Node、
     canonical source、tools 与 commands。host `platform` 恰为 `darwin`；harness
     `path===execPath`、arch 等于 host process arch，且与 official Node、三 Apple tools 一样
     均锁 regular/non-symlink、正 bytes、有效 SHA。official actual/expected SHA 都须等冻结
     Node SHA；canonical tag/tag-object/commit/codesign-script blob/entitlements blob 逐值等于
     ADR 常量。三工具既有 argv[0]/tool SHA/`LC_ALL=C`/双流自洽门不退，且各至少出现一条
     command。macOS、Darwin、hardware arch、`xcode-select` 与 CLT version 须非空登记，但不
     冻结具体版本。
  2. 把 DER human grammar 做成 `probe-verdict.mjs` 导出的纯解析器并由采集端与 verdict 共用。
     只收 raw stdout 的唯一根 `[Dict]` 和恰六组 `[Key]`/`[Value]`/`[Bool] true`，可忽略空行；
     `[Array]`、嵌套/重复 root、未知 marker、自由文本、残缺组、重复/额外键、非 bool/false
     均失败。stderr 只许 exact `Executable=<command argv 最后一项>`。采集端不得丢
     `parseError`；verdict 须重解析 raw command，并要求 producer 保存的
     `parseError/entries/values` 与重解析结果逐值一致。
  3. 把 preflight 分类抽成 production 实际调用的纯函数，固定次序为 control lifecycle/
     protocol 或 ordinary probe failure → `probe_failed`；ordinary 不包含能被已冻结具名
     security evidence 解释的 control sign/XML、official signature 或 `spctl` 失败。其余形态
     有具名 security evidence → `security_execution_domain_blocked`；无 blocked 且所有 exact
     gate 绿 → `passed`；其他 → `probe_failed`。不得把含 sign/XML 的旧总 `controlOk` 直接
     置顶。抽取前后须先证明旧行为等价，再让
     `control lifecycle=false + blockedReasons>0` 在旧 blocked-first 逻辑上见红；不得以新 helper
     缺失、stub 或 module-load failure 冒充首红。
     “独立重算”必须从同轮 raw command 到 gate 全链成立，不能在 command membership 之后又读
     producer 摘要：control sign/verify、official verify/display 与 `spctl` 的 exit/signal/
     streams 由判定端重导，official identity 从 raw display 重解析，Gatekeeper 第一非空行从
     raw stderr 重取，producer 字段只作 parity。official verify/display 的 exact argv-last
     必须等于已过 SHA 的 receipt `officialNode.path`。XML 不新增自写宽 parser；采集保存 raw
     stdout 落盘 path/bytes/SHA 与绝对 `plutil -lint`、`plutil -convert json -o -` 完整 receipts，
     verdict 绑定同轮 command、核落盘指纹等于 raw stdout，并从绑定 JSON stdout 自行解析六键。
     command field identity 至少须包含 production 已记录的 `error`，不得漏字段后仍称逐字段相同。
  4. first-red 至少含验收实证的 `host/harnessNode/developerTools/officialNode` 四枚删除、
     raw `[Array]` 一枚与混合 preflight 一枚；另补 receipt id mismatch、canonical source
     缺/漂、harness path/execPath mismatch、official SHA 漂移、nested Dict/未知 marker 与
     三工具 command 缺件。各门须有实际命中的 source mutation；至少独立撤完整 receipt 投影、
     恢复 `if (!key) continue` 与 blocked-first，逐枚定向见红并 byte-identical 恢复。
     另补 official verify/display 与 receipt path 同步换 bogus、raw control-sign 非零而摘要为零、
     raw official/Gatekeeper/XML 与摘要漂移、command `error` 漂移；path、raw gate/parity、
     完整 command identity 各有有效 source mutation。
  5. 实物重跑必须错峰、串行：先 build 后让 seatbelt control 准确
     `security_execution_domain_blocked`，再故意隐藏/缺失 `packages/pi-lane/dist/index.js`
     证明混合形态为 `probe_failed`，恢复后在批准非受限域跑 preflight + full 六格。随后从空
     assembly 复跑全部 verdict（既有 224 例不得回退，数字随新例增长）、76 counterexamples、
     600 cold-start、双 cycle、十件 inventory/source、六格 sign 与四仓库门。实现/验收各用
     新 execution-domain id/manifest，旧 `dist` 零回填；报告继续零路线建议。
     若实现会话的功能 preflight 证明其执行域非受限，架构支持会话可在同一实现 worktree 的
     冻结 production bytes 上代跑前两枚短观察；须 fresh id，回执逐枚标明实际执行角色、
     manifest path/外算 SHA 与 `sign-probe.mjs`、`lib/probe-verdict.mjs` 的 Git blob，恢复
     build 后复核 blob 未变。production byte 后续一旦变化，外供观察作废并须重跑。此例外
     不允许伪造 blocked，不替代实现会话的非受限 full/长矩阵，也不替代独立验收在 clean
     worktree 自跑 seatbelt blocked、混合 `probe_failed` 与批准域 full 六格。
  6. fixture README 只把“受限域只写 blocked”窄化成“control lifecycle/ordinary gate 成立后
     才可写 blocked”；原工程报告只追加 R4 实测，二者都不得改路线结论。本票不引入依赖或新
     产品概念；这是 project-specific 证据判定，OSS 结论维持窄自研、零新依赖。实现提交先于
     回执提交，最终停在待独立验收，不 push、不 merge、不裁路线、不启动 Host/DMG/Pages。
     该句只记录 R4 的历史门；R4 已被下文拒绝，现行门由 R5 取代。
- `PI-SIDECAR-DIST-1R4` 实现 `891c23d` / 回执 `07d2dbc` 经独立验收判定
  **REJECT**。R4 已闭合 R3 的三项既知假绿，但 production observation 仍有三项 P1：
  跨架构 code-cache ready 后无界等待且 hard verdict 不核最终 exit；command time 只作
  observation↔receipt 副本 identity，不能拒绝整列缺失或同一常量；preflight/full 的成功判定
  仍可由 producer summary 洗绿 raw command、actual-entitlements、run 与 nested `.app`
  失败。验收树五文件约 1800 行的未提交返修已经越过 `fix-by-acceptance` 的小缺陷边界，只作
  诊断输入；任何实现会话不得接管、代提交或把它当 first-red 证据。
- `PI-SIDECAR-DIST-1R5` 从本架构 `main` tip 新建 clean worktree/branch，顺取
  `f0162fd→eb806f2→b284764→f7ecd32→20461aa→c6a9819→df65ab0→0230bf6→57f91dc→
  473bc00→ba374d8→7b4184b→47fd7e5→eb71d6f→891c23d→07d2dbc`；除下述两枚外，
  每枚 patch-id 与源提交相同，冲突即停。**配方修订（2026-07-30 架构裁，首次组合实测）**：
  `ba374d8` 与 `eb71d6f` 两枚 ACCEPTANCE 拒绝报告在现行 `main` 上无法满足 patch-id
  等同——原提交在其时文件末尾追加，该位置已被后续合入 `main` 的 WRITE-PROOF/STDIO
  验收报告占据，任何冲突解法都会改变 hunk 上下文（实测：前十枚 patch-id 逐枚相同，
  `ba374d8` 即停）。此两枚改为**架构内容移植**：由架构会话把源提交的 added lines
  逐字节按各自源 hunk 的前导上下文落位（2026-07-30 移植实测订正：该历史文件中
  DIST 各节并不连续，`PI-SIDECAR-DIST-1R` 以 `##` 子节居 `PI-SIDECAR-DIST-1` 节首）——
  `ba374d8` 的 74 行紧接 `PI-LANE-1` 放行节尾行之后，`eb71d6f` 的 122 行紧接移植后的
  `PI-SIDECAR-DIST-1R2` 拒绝节尾行之后——提交信息保留原主题并标注「架构移植＋源 SHA」，
  验证以移植区与源提交 added lines 逐字节相等代替 patch-id；实现会话不执行、不修改
  移植。其余十四枚配方不变。只许改：
  `fixtures/sidecar-dist/scripts/reproducibility-probe.mjs`、
  `fixtures/sidecar-dist/scripts/sign-probe.mjs`、
  `fixtures/sidecar-dist/scripts/lib/probe-verdict.mjs`、
  `fixtures/sidecar-dist/scripts/probe-verdict.test.mjs`、
  `fixtures/sidecar-dist/README.md`、`docs/engineering/pi-sidecar-dist-1.md` 与新回执
  `specs/PI-SIDECAR-DIST-1R5.md`。不得改 toolkit/canonical fixture、其他 fixture/build/runtime
  脚本、旧回执/ACCEPTANCE、package/lock、父级文档、产品源码、Rust/Tauri/GUI：
  1. 在 untouched R4 target 上先以 production-used observation 写三类 first-red：
     跨架构 warning 正确但最终非零/超时；command time 两副本同时删掉与全填同一合法常量；
     preflight-only target 同步漂移，以及 full 六格 raw 非零/signal/error/security stderr/
     run/actual-entitlements/nested `.app` 失败却由好摘要报绿、A/B 串格。不得用 helper 缺失、
     stub、module-load failure 或旧脏验收树冒充红证。
  2. `reproducibility-probe` 保留 60,000 ms ready 门；ready 后发送 EOF，退出固定用既有
     `CRASH_DEADLINES.exitMs`，失败再用 `CRASH_DEADLINES.killConfirmMs` 收束。observation
     必须显式携 `timeouts` 与 `{code,signal}`；hard verdict 只接受 `timeouts:[]`、
     `launched:true`、exact warning、`exit:{code:0,signal:null}`。ready/exit/kill-confirm
     任一超时均结构化失败并令进程非零，不得裸 `await proc.exited`。
  3. 每条同轮 command 的 `startedAt/finishedAt` 都须是可往返
     `Date#toISOString()` 的 canonical UTC 时间，且 `startedAt <= finishedAt`。
     `commands` 数组就是串行调用顺序，相邻项须满足
     `previous.finishedAt <= next.startedAt`；整轮还须满足
     `commands[0].startedAt < commands[last].finishedAt`。时间字段仍参加完整 command
     identity；真实性 timeline 是额外 hard gate，不能用两副本相等代替。
  4. preflight-only 与 full 都须在形成最终 manifest/status 前运行 production-used hard
     verdict。每条被判断的 raw command 必须逐字段属于同轮 receipt；raw argv/target/exit/
     signal/error/stdout/stderr、实际 run 与 actual-entitlements 是真源，producer summary
     只可作 exact parity。preflight 从 raw 重导 control lifecycle、四 gates、official
     identity、XML/plutil 与 Gatekeeper；full 六格另绑定唯一 stage root 与 subject/mode
     physical cell，从 raw 重导 sign/verify/display flags、launch exit/timeouts、Node/SEA
     来源身份、签后 XML/plutil，并闭合 nested `.app` 的 inner/outer/deep verify、spctl 与
     nested run。缺 status/receipt、摘要漂移、A/B 串格、同步换 bogus target 均失败。每个
     semantic role + subject + mode 必须绑定 `commands` 数组中唯一的 receipt occurrence/index；
     同一 occurrence 不得跨 role/cell 复用。expected argv-last/target 从 trusted stage root
     与冻结的 subject/mode coordinate 独立构造，不得从 row/appPath 摘要反推。
     **preflight 的 official Node expected path 同理独立构造（2026-07-30 Stage A C3 补拍）**：
     以判定层自持的 probe root（非 receipt 值）拼接冻结布局坐标
     `dist/runtime/node-v22.23.1-darwin-<host-arch>/bin/node`，host-arch 取判定进程实测；
     raw display/verify 的 argv-last 与 receipt `officialNode.path` 均须等于该构造值，
     `officialNode` 冻结 SHA 门不变——path 自此只是被验值、不是真源（Stage A 实测：
     锚在自报 path 时 observation＋commands＋officialNode.path 三处同步漂移零区分力，
     full 与 preflight-only 同样假绿）。final status
     只取 hard verdict：preflight raw 重导 `{status:'ok',classification:'passed'}` 才为
     `ok`；精确 `{status:'failed',classification:'security_execution_domain_blocked'}` 才为
     同名 blocked；任一证据完整性/ordinary/control/full failure 均为 `probe_failed`。
     producer 自报 status/classification 与 full summary 只作 parity，调用 verdict 后不得忽略
     failures 或再由 summary 重算 final status。
  5. 至少四枚有效 production mutation 分别撤跨架构 exit/deadline、timeline 严格推进、
     preflight hard verdict、full raw 真源；逐枚校验 patch 确实命中、定向见红、byte-identical
     恢复。旧 R2–R4 门不得删弱；结构性等价 mutation 如实登记，不计作红证。
  6. 从空 assembly 严格串行复跑全部 verdict、既有 76 项回归矩阵与 R5 新增反例
     （分别计数）、600 cold-start、双 cycle、十件 inventory/source、built seatbelt blocked、
     缺 build 混合 `probe_failed`、批准域
     preflight/full 六格与
     `pnpm -r build`、`pnpm lint`、`pnpm test`、
     `pnpm --filter @courtwork/desktop lint:isolation-binding`、`git diff --check`。
     实现与后续验收各用 fresh execution-domain id/manifest，旧 `dist` 零回填；README 与工程
     报告只追加 R5 实测，不得改路线建议。
  7. 实现提交先于回执提交，最终停在待独立验收；不 push、不 merge、不裁路线、不启动
     Host/DMG/Pages，不更新 `current.md`。只有另一全新 Codex 会话在独立 clean worktree
     自跑完整物理矩阵并放行，架构才可消费报告裁路线。Fable 提供不可变实现 SHA 后，由架构
     另立 `PI-SIDECAR-DIST-1R5-ACCEPT`，冻结 target、允许面、反例与 mutation；验收默认只追加
     `packages/pi-lane/ACCEPTANCE.md`，实现级小修才适用 `fix-by-acceptance`，不得消费实现者
     manifest 代替自跑。**已冻结（2026-07-30）**：目标 `6cdb9ba`，件见
     [`specs/PI-SIDECAR-DIST-1R5-ACCEPT.md`](specs/PI-SIDECAR-DIST-1R5-ACCEPT.md)——其中逐组
     项数以独立字面量冻结（8/5/14/23/15/11＝76），精确构成为 68 个失败注入 + 8 个
     恢复／证据对照；验收须另造 8 个失败变体补强且与历史 76 项分计。冻结件同时登记
     `sea` 打印 9 行含一行非矩阵项、`reproducibility-probe.mjs` 不支持枚举 flag 两处读数陷阱；
     枚举为零或少于冻结值一律判失败。实现回执引用但未提交的 scratchpad 不算可复跑交付物。
  8. **已放行并清账（2026-07-30）**：exact target `6cdb9ba` 经独立 Codex 验收
     `0b0d985` PASS，no-ff merge `5aef222` 使二者成为 `main` 祖先。验收独立取得 384/384、
     600 cold samples、历史 76 项（68 negative + 8 controls）、strengthened 8/8、R5 五枚
     有效反例 + 验收自造 SIGTERM 反例、四枚 production mutation 与三 execution domains；
     evidence-packaging 缺口保留在验收报告，不冒充 production blocker。
  9. **架构路线消费**：ADR-022 六-E 已裁
     `routeId:"node22-runtime-sealed-cjs-v1"` 为现行 default——官方 Node v22.23.1
     target-triple external binary + minified sealed `sidecar.cjs` resource，双件同版、spawn
     前各自 exact hash/identity、Rust-only path resolution、`useCodeCache:false`、零 live
     route switch/fallback。SEA/postject 只留 historical dev evidence plane，不得成为
     production consumer 或制品依赖。该裁定只解锁 `PI-HOST-LOOP-1`；不代表 Host、GUI、
     debug DMG 或公开发行已经成立，`current.md` 不随之升档。
- 原三张并行票从同一已验收基线、独立 clean worktree/branch 施工；共享父级 SPEC 是只读权威。
  原实现会话分别只更新 `specs/PI-WRITE-PROOF-1.md`、`specs/PI-CODE-STDIO-1.md` 或
  `specs/PI-SIDECAR-DIST-1.md` 的独占回执，不争用本文件。分发票实测正文另落独立 engineering
  report，仅在其专属回执写链接与结论。返修票不属于这组三票；为避免把父级架构提交反向
  cherry-pick 到旧基线，组合树均从本节所在 `main` tip 新建，再按序取证据提交：
  `PI-CODE-STDIO-1R` 取 `79a13d2 → 223185e → 0ffae46 → cfb4715`；
  `PI-CODE-STDIO-1R2` 取
  `5b55885 → 5133c6e → 0872a5c → 855db1b → 9f9255b → 7c8c9c3 → 4df2e84`；
  `PI-SIDECAR-DIST-1R` 取 `70e6482 → 01ff5e7 → 3207b27 → 9b8142f`；
  `PI-SIDECAR-DIST-1R2` 取
  `e364868 → 43c1ae7 → 1d4329e → 7a500d1 → ba71df8 → 61c2b09 → f261347`；
  `PI-SIDECAR-DIST-1R3` 取
  `c304745 → e8963ef → 972f42a → c6361a7 → 4e530cb → 3435fa8 → 166a89a →
  42858b2 → 33100d8 → 850fa11 → 9ebb92a`；
  `PI-SIDECAR-DIST-1R4` 取
  `f0162fd → eb806f2 → b284764 → f7ecd32 → 20461aa → c6a9819 → df65ab0 →
  0230bf6 → 57f91dc → 473bc00 → ba374d8 → 7b4184b → 47fd7e5 → eb71d6f`。
  `PI-SIDECAR-DIST-1R5` 取同一 R4 链，再追加 `891c23d → 07d2dbc`。
  实现者只改各自票面文件
  与新回执，并在回执记录组合后的目标 SHA；冲突一律停下回架构，不得借解决冲突改父级文档。
- 后续 `PI-WRITE-HOST-1` 才把 port 接到 Rust exact 同版本
  `cap-std/cap-fs-ext/cap-tempfile@4.0.2` workspace、逐段 no-follow、授权与 journal；
  `PI-WORKSPACE-READ-1` 再让既有 read/glob/grep 显式路由逻辑 `/workspace` 并跨重启回读，同时
  提供 GUI 后续消费的
  `openWorkspaceMarkdown({containerId,sessionId,logicalPath})` 窄 command；它只读当前 `.md`，
  以同一 grammar/capability 校验后返回逻辑路径、UTF-8 content、重算 hash 与 byteLength，
  131,072 bytes 封顶，正文不落 journal、物理路径不出 Rust。`list` 只是
  `ExecutionEnv`/host 内部操作，不新增模型工具。
- **`PI-TOOLS-HONESTY-1` 给 `PI-WORKSPACE-READ-1` 的移交**（详见
  [`specs/PI-TOOLS-HONESTY-1.md`](specs/PI-TOOLS-HONESTY-1.md) 六节）：`walkFiles` 现回
  `{ scanned, truncated, skipped, symlinks }`，`skipped` 是 `{ path, code }[]`、路径与命中共用
  同一枚 `HitProjection`。双根改造只需按根各跑一次 walk 后**按根归并**这四笔，字段形状与文本注记
  不必再动；`skipped` 天然可带第二个根的条目，因为它记的是路径而不是「第几个根」。
  同批未收口的**三处**一并交出，它们都住 env 契约、与双根是同一处接缝（五-8 末段）：
  `listDir` 内单条目 `lstat` 失败静默略过；产品形态 grammar 排除真实文件而模型面零登记；
  `readFile(…, 'utf8')` 把非法 UTF-8 字节静默换成 U+FFFD 后照常出面。
  `ExecutionEnv` 若在双根改造里获得 per-entry 的失败/排除通道与「内容已被替换」的标记位，
  这三处即可同批收口——在那之前它们只是显式登记的边界，工具层不得用一句更大的全称句盖过去。
  另交出一份**九行丢弃分支族表**（`specs/PI-TOOLS-HONESTY-1.md` 十节）：本票三轮被拒两次，
  两次都是「按验收点名的实例收口，而不是按族收口」，族清单自此由实现方持有、改函数先对表。
- `PI-HOST-LOOP-1` 负责 product `/case` 虚拟 env、物理路径/错误脱敏与 session 累计预算；
  专属冻结件为
  [`specs/PI-HOST-LOOP-1.md`](specs/PI-HOST-LOOP-1.md)。该票不扩 `case_read`
  host-request：物理 case root 仍只在 bootstrap 例外进入 Node 内存，模型/工具/journal 只见
  `/case`；并按 Route A tracked manifest 管 verified Node+CJS、十九型 closed journal、
  crash/quarantine/resume 与动态 spawn 机器门。产品 credential 只消费用户显式保存的 pasted
  或 environment-name source、不做固定 env fallback；shared Rust↔TS golden 锁 wire/固定终态
  文案且只走现有公开 codec，journal route hash 必须绑定已验证 runtime manifest 原始 bytes；
  Agent 从本票固定 `toolExecution:'sequential'`；官方 Node22 的 production
  ready/shutdown 与 test-only scripted read hard gate 分离，真实 DeepSeek 只作 external smoke；
  零 WebView command、零 write/effect；
  `PI-WRITE-HOST-1` 负责产品 `session.ts`/tool table/tool policy 的 write 装配与
  write binder `executionMode:'sequential'`，同时保持 Agent 顺序，并把 dev 只读 prompt 换成
  上文六条/≤2,048-byte `md-work-v1`；proof 不提前改这些消费点。glob/grep 双根结果必须显示
  `/case/...` 或 `/workspace/...`，不得形成 `../workspace`。
- 独立 `PI-BASE-HEADLESS-ACCEPT` 必须实跑
  `agent write → 批准 → Rust 精确落盘 → agent read-back → restart read-back`。缺任一段，
  build 全绿也不算基础 agent 功能成立，基础 GUI 不开工。restart 指同一 logical session
  在 `session_interrupted → session_resumed` 后以新 sidecar leg 回读；journal/workspace/累计预算
  延续，pi message context 明示从空开始，不得伪装无损续聊。

### `PI-BASE-HEADLESS-ACCEPT` · 通用 Markdown 任务矩阵

独立验收每格同时留 Agent events、host request/result、journal 与最终文件 bytes/hash：

1. 单文件事实问答：read 后回答；读不到或截断须显式。
2. 多 `.md` 定位汇总：glob/grep → 定点 read → 带来源文件名的摘要。
3. case brief → `/workspace/brief.md`：read → write → 逐次授权 → byte-identical read-back。
4. 改写既有 workspace Markdown：先 read，再整体覆盖同路径，再 read-back；不因没有 edit 失败。
5. 嵌套 Unicode 路径：`notes/会议纪要.md` 写入后 interrupt/resume 新 leg 仍可回读。
6. 拒绝面：改 `/case`、delete、bash、无效/跨容器路径均零 effect、零物理路径泄漏且有 terminal。

只有全部必要结果已完整、未截断回灌后，模型仍遗漏或写差，才记模型能力；枚举/读取不通、限幅
未显式、host result 丢失、批准后未落盘、回读不一致或终态缺失一律是 harness 失败。A2 放行后
只开 `PI-LANE-UI-1`；该 GUI 再由 `PI-BASE-GUI-ACCEPT` 在真实 Tauri + 真实 DeepSeek 复跑同构
任务。无 key/model 证据只能记 external-validated blocked，不得放行“harness 非瓶颈”。两条
基础线均放行后，Dossier、修订、plan/source 与 UI 巧思才可开工。

当期禁止项：pi `edit`、自研 create/edit/diff/CAS/merge、用户文件 promotion、bash/remove、
OpenWork server/SDK、AI SDK runtime、GUI 与第二份 journal。

### 并行票独占回执

- [`PI-WRITE-PROOF-1`](specs/PI-WRITE-PROOF-1.md)
- [`PI-CODE-STDIO-1`](specs/PI-CODE-STDIO-1.md)
- [`PI-CODE-STDIO-1R`](specs/PI-CODE-STDIO-1R.md)
- [`PI-CODE-STDIO-1R2`](specs/PI-CODE-STDIO-1R2.md)
- [`PI-SIDECAR-DIST-1`](specs/PI-SIDECAR-DIST-1.md)
- [`PI-SIDECAR-DIST-1R`](specs/PI-SIDECAR-DIST-1R.md)
- [`PI-SIDECAR-DIST-1R2`](specs/PI-SIDECAR-DIST-1R2.md)
- [`PI-SIDECAR-DIST-1R3`](specs/PI-SIDECAR-DIST-1R3.md)
- [`PI-SIDECAR-DIST-1R4`](specs/PI-SIDECAR-DIST-1R4.md)
- [`PI-SIDECAR-DIST-1R5`](specs/PI-SIDECAR-DIST-1R5.md)
- [`PI-SIDECAR-DIST-1R5-ACCEPT`](specs/PI-SIDECAR-DIST-1R5-ACCEPT.md)
- [`PI-HOST-LOOP-1`](specs/PI-HOST-LOOP-1.md)
- [`PI-WORKSPACE-READ-1` 侦察](specs/PI-WORKSPACE-READ-1-RECON.md)
- [`PI-WORKSPACE-READ-1`](specs/PI-WORKSPACE-READ-1.md)
- [`PI-HEADLESS-HARNESS-1`](specs/PI-HEADLESS-HARNESS-1.md)

## 十 · 门与证据

- 单测 **531 例 / 17 文件**（`vitest run packages/pi-lane`，2026-08-05 由
  `PI-WORKSPACE-READ-1` 在其 worktree 实测；`PI-TOOLS-HONESTY` 一线为首轮 489/16、1R 496/16、
  2R 500/16；更前的 469/15 出自同日 `PI-WRITE-HOST-1` 独立验收），含容器越界、闸门拒绝、
  预算停 loop、dev 入口 HTTP 面、六类不完整来源的诚实面，以及本票新增的 host-mediated 读容器
  与双根检索面。原写「74 例」是 `PI-LANE-1` 期真值，
  其后由 product-* 诸票增长；每票只据实更新该计数，不追认也不复核其他票面的证据。
- ADR-018 门单测 12→23 例；真树注入实测：`child_process` 与 `fs:writeFile` 各触红一次，还原复绿。
- 变异对照两例（授权边界）：包含判定退化成裸字符串前缀 → 五条红证转红；跳过 symlink 规范化 →
  定点只打红「symlink 出界」一条。

### Playwright 全链实跑与记名豁免

验收令要求「不触产品面」由 351 门实跑作证，不采信宣称。`COURTWORK_E2E_PORT` 隔离端口，
`reuseExistingServer: false` 故每轮自起服务。三轮实跑：

| 轮次 | 树 | 结果 | 红例 |
|---|---|---|---|
| 实验 | `codex/pi-lane-1` @ `1889f6f` | 350 过 / 1 红（5.3m） | `composer.spec.ts:45` |
| 对照一 | 基线 `07e94da`（已构建） | 348 过 / 3 红（5.0m） | `composer.spec.ts:45`、`goal1.spec.ts:77:3`、`host-auth.spec.ts:41` |
| 对照二 | 基线 `07e94da`（重跑） | 350 过 / 1 红（8.5m） | `composer.spec.ts:45` |

**记名豁免**：`composer.spec.ts:45 › 附件 chip 生命周期：上传成功、作用域确认单向落定`。
判据是基线 2/2 复现、实验态同形同错（断言停在 `scope` 未变为「已存入卷宗」），
且本分支在 `apps/` 下只改三个门脚本、`apps/desktop/src/` 与任何 spec 零改动。
该红的修复在在途分支 `codex/composer-spec-sync-1`，未入 main，故基于 main 的本票必然携带它。

**另记两条抖动**（非本票所致，也不宣称本票修复）：`goal1.spec.ts:77:3`（首轮 30.2s，形如超时）
与 `host-auth.spec.ts:41`（TCC 面，环境敏感）只在对照一出现，对照二消失；两轮耗时 5.0m→8.5m，
机器负载有变。351 门在本机**并非逐轮确定性**，这条留给验收角色自行复核，不由本票下结论。

- Playwright floor **不动**（本票不加 e2e 用例，dev 入口不属产品面），三轮总数恒为 351。
- 本节写入后未重跑 Playwright：链上读 `SPEC.md` 的两个门（`assert-schema-parts.mjs`、
  `skin-r2-ledger-contract-lib.mjs`）只读 `site/SPEC.md` 与 `apps/desktop/SPEC.md`，
  不读 `packages/*/SPEC.md`，故本文件的改动碰不到任何门；其余快门在写入后复跑。

## 十一 · 回环往返的环境前置与悬挂形态（`PI-LANE-SIDECAR-HANG-1`）

`sidecar.test.ts` 八枚（全文件）各挂满 5s 通用超时，于两个独立环境复现（DEMO 验收沙箱 `4db54a1`、
维护者本机 `69d6ddc`），同日 1R7 实现 worktree 全绿。本节记根因、淘汰过的候选与现行修法。

**结构性前提**：本文件是全仓**唯一真发网络往返**的测试——`packages/provider/src/http-client.test.ts`
的 fetch 是 `vi.fn()` 注入桩。故凡本机回环不通的环境，红只会落在这一个文件、且是整文件级。
这条前提此前从未写下来，于是「只有它红」被读成用例问题，而不是环境前置问题。

**根因（已注入复现，非推断）**：`start()` 只在 `listen` 回调里 `resolve`，而 `listen` 失败**不走回调**、
只发 `'error'` 事件；该事件没有监听者，promise 于是永不 settle，每枚测试挂到 vitest 的 5s 通用超时。
失败原因被完全吞掉——拒 bind 注入实测：八枚 40.06s，日志里 `EPERM` 出现 **0 次**、Unhandled 段 **0 个**。
这是不变量四（静默降级零容忍）在测试面的破口：环境问题被降级成一句无信息的
`Test timed out in 5000ms`，读日志的人拿不到任何可行动信息。

**实验表**（本机 node v25.9.0、8 核、vitest 4.1.10；worktree `8d90aa8` 装齐并构建）：

| 条件 | 结果 | 判 |
|---|---|---|
| fresh worktree 装齐并构建，root 全量 | 167 文件 / 1782 全绿 12.1s | 本机**不复现**，如实登记 |
| 主仓单文件 | 8 绿 496ms | 不复现 |
| Seatbelt 拒 `connect(localhost)` | 8 红 **306ms**，`EPERM` 显式可见 | 「拒绝」只快红不悬挂，**证否** |
| Seatbelt 拒 `bind` | 8 红 × 5006ms、合计 **40.06s**，八句「Test timed out in 5000ms」 | 与登记签名**逐字同形**，根因坐实 |
| 16 路 CPU 饱和（8 核 2× 超订）root 全量 | 1784 全绿 **30.1s**（空载 12.1s） | 「并行 worker 负载」**证否**：只拖慢 2.5×，造不出 5s |
| node 25 代理矩阵（`HTTP_PROXY` 指黑洞） | 默认 DIRECT 11ms；仅 `NODE_USE_ENV_PROXY=1` 时 HANG | 代理默认不劫持回环；该变量本机未设 |
| `packages/pi-lane` 对 `@courtwork/*` 的依赖 | **零**（三处命中全在注释） | 「fresh checkout 缺 gitignored 构建制品」**结构性证否** |

**未证否，不下结论**：那两个环境具体是哪一层让回环不通（bind 被拒／OS 本地网络权限／静默丢包），
本机无法到达那两个环境，故不判。修法不依赖该结论——三条路都已具名，下次在失败环境跑一次即自报。

**修法**（只动测试面，产品码零改动；不 skip、不 retry、不放大 timeout、不放宽断言）：

1. `start()` 挂 `'error'` → 具名 reject，带 errno 与环境事实。用 `on` 而非 `once`：`afterEach` 对
   未起来的 server 调 `close` 会再发一次 `'error'`，届时没有监听者那一发就是未捕获异常。
2. 唯一请求出口 `call()` 给回环往返显式预算 `ROUND_TRIP_BUDGET_MS = 2000`。预算必须显著**小于**
   5s 通用超时，否则先到的仍是那句无信息的超时；健康环境往返是毫秒级，两个量级余量，
   不是在赌时长（判例见 `workflow.md`「异步前置要等条件，不要赌时长」——此处等不到条件的是
   环境本身，故给预算并具名，而非放大等待）。
3. 环境事实随失败报出：node 版本与 `NODE_USE_ENV_PROXY`/`HTTP_PROXY`/`NO_PROXY` 的**有无**。
   只报有无不报值——代理 URL 可能内嵌凭据，不变量八禁其进日志。

**效果**（同一注入环境，拒 bind）：修前八枚 40.06s 零信息；修后十枚合计 **17ms** 全部具名，
形如 `回环监听失败 127.0.0.1:0：EPERM（node v25.9.0；NODE_USE_ENV_PROXY=未设；…）`，并带
`Caused by: listen EPERM` 与序列化 errno。

**注入反例与变异红证**：

| 编号 | 注入 | 无修复时 | 有修复时 |
|---|---|---|---|
| 反例一 | 先占端口，令 `listen` 撞 `EADDRINUSE` | 挂满 5006ms，报无信息超时 | 具名快红，断言 `/回环监听失败.*EADDRINUSE/` |
| 反例二 | 黑洞服务只 accept 不回话 | 挂满 5003ms，报无信息超时 | 按预算具名，断言 `/回环往返未在 \d+ms 内完成/` |
| M1 | 只撤 `start()` 的 `'error'` 监听 | — | 定点只打红反例一（5007ms），反例二仍绿 |
| M2 | 只撤 `call()` 的显式预算 | — | 定点只打红反例二（5017ms），反例一仍绿 |

**自伤留痕**：反例首版的陪衬服务自己没挂 `'error'`，于是在拒 bind 环境里两枚反例各挂满 5s，
把本票要修的形态原样复刻了一遍（实测 10 枚 10.03s）。`listenPlaceholder` 因此同样挂 `'error'`。
教训是这条前提对**任何** `listen` 都成立，不只对被测的那一个。
