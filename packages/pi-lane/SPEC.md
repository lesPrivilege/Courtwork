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

## 一 · 职责

| 模块 | 职责 |
|---|---|
| `authorized-root.ts` | 授权文件夹边界。以**规范化后**路径判定，symlink 出界按界外处理 |
| `scoped-env.ts` | 只读 `ExecutionEnv`（我方供给的容器）。写面与 shell 在此不实现 |
| `tool-policy.ts` | 工具闸门。挂 pi 内核 `beforeToolCall`，把「默认放行」翻转为默认拒绝 |
| `tools.ts` | 只读三件：`read`（pi 原版）、`glob`、`grep`（自备，同样只经 env） |
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
5. **symlink 一律不跟随**，界内软链子树也不可见（取保守解）。
6. **glob 语法只到三个元字符**（`**`、`*`、`?`）；扩语法是契约变更。
7. **单次调用上限**：扫描 2000 份文件、200 条命中，超限在结果里显式告知模型。
8. **不宣称等同场景线保障**：本线没有确认账本、没有 durable-before-effect 落账、没有事实等级。

## 六 · dev 入口用法

```
PI_LANE_ROOT=<授权文件夹绝对路径> pnpm --filter @courtwork/pi-lane dev
```

可选环境变量：`PI_LANE_PORT`（默认 4319）、`PI_LANE_MAX_TURNS`（默认 12）、
`PI_LANE_MAX_USD`（默认 0.5）、`DEEPSEEK_API_KEY`（凭据，只在本进程解析）。

授权文件夹**必须显式给出**，不默认取 cwd——默认取 cwd 等于默认越权。
缺凭据时页面显式标红并禁用提问入口，`/api/prompt` 回 503，不静默假跑。

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
  固定回 `not_supported`；最终 basename 按 ASCII 大小写不敏感必须以 `.md` 结尾，非 Markdown
  在分配 operation/调用 port 前以 `unsupported_file_type` 拒绝；raw leading `@` 与
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
  strict discriminated union、per-direction seq、request/session/state machine、1 MiB framing
  和可注入 driver；必须覆盖 duplicate JSON member、fatal UTF-8/lone surrogate、LF-only、
  integer lexical gate、pre-bootstrap null-session error、C0 worst-escape/max-list packet，
  sidecar-leg seq 与本 leg 去重集合重置、fresh/resume 自洽门、从给定
  `priorObservedTurns/priorTurns/priorUsd` 初始化累计器、race-late cancel no-op 与在途 host
  request 的 uncertain 优先收束。新进程没有历史 journal，本票不得伪测跨 leg requestId 去重、
  previous+1、prior 精确 fold 或 model/limits/grant/container/capability 漂移；这些由
  `PI-HOST-LOOP-1` 的 Rust/journal 反例承担。它只校验 workspace arguments 的闭集形状/hash 格式；逻辑路径语义由
  `workspace-write-env` 与未来 Rust host 双验，不在 codec 复制。不得新增尚无产品 driver 的
  假 executable main，不改 env/tools/session/package/lock，并只改自己的独占回执行。
- `PI-SIDECAR-DIST-1` 只改 `packages/pi-lane/fixtures/sidecar-dist/`、独立报告
  `docs/engineering/pi-sidecar-dist-1.md` 与自己的回执行；做 Node 22 LTS sealed bundle vs SEA
  实验，不改生产 wire/session。若实验必须引 exact MIT/Apache 工具，只允许该票改
  `packages/pi-lane/package.json` 与根 lockfile，并须在报告逐包记 license/用途/移除结论。
- 三票从同一已验收基线、独立 clean worktree/branch 施工；共享父级 SPEC 是只读权威。实现会话
  分别只更新 `specs/PI-WRITE-PROOF-1.md`、`specs/PI-CODE-STDIO-1.md` 或
  `specs/PI-SIDECAR-DIST-1.md` 的独占回执，不争用本文件。分发票实测正文另落独立 engineering
  report，仅在其专属回执写链接与结论。
- 后续 `PI-WRITE-HOST-1` 才把 port 接到 Rust exact 同版本
  `cap-std/cap-fs-ext/cap-tempfile@4.0.2` workspace、逐段 no-follow、授权与 journal；
  `PI-WORKSPACE-READ-1` 再让既有 read/glob/grep 显式路由逻辑 `/workspace` 并跨重启回读，同时
  提供 GUI 后续消费的
  `openWorkspaceMarkdown({containerId,sessionId,logicalPath})` 窄 command；它只读当前 `.md`，
  以同一 grammar/capability 校验后返回逻辑路径、UTF-8 content、重算 hash 与 byteLength，
  131,072 bytes 封顶，正文不落 journal、物理路径不出 Rust。`list` 只是
  `ExecutionEnv`/host 内部操作，不新增模型工具。
- `PI-HOST-LOOP-1` 负责 product `/case` 虚拟 env、物理路径/错误脱敏与 session 累计预算；
  `PI-WRITE-HOST-1` 负责产品 `session.ts`/tool table/tool policy 的 write 装配与
  `toolExecution:'sequential'`，并把 dev 只读 prompt 换成上文六条/≤2,048-byte
  `md-work-v1`；proof 不提前改这些消费点。glob/grep 双根结果必须显示
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
- [`PI-SIDECAR-DIST-1`](specs/PI-SIDECAR-DIST-1.md)

## 十 · 门与证据

- 单测 74 例（`vitest run packages/pi-lane`），含容器越界、闸门拒绝、预算停 loop、dev 入口 HTTP 面。
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
