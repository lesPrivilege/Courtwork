# `@courtwork/pi-lane` SPEC

通用 agent loop 线（ADR-022）的落点。与场景线（ADR-009/011 谱系）**并立不相交**：
两线各自账本，不迁移、不混写；垂类包与确认账本流程只挂场景线。

当期只开**读面**。写面与 bash 面锁 `SANDBOX-PROBE-1`，且**放行不等于升档**——探测放行的是原语可行
与判据可满足，等级仍须由实现自带该等级的越界反例证成（ADR-022 决定二补句，2026-07-27）。

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

## 八 · 偏离与待拍板

- **dev 入口落点**：就绪图行写「desktop dev 入口」，实现落在 `packages/pi-lane/dev` 并由 sidecar
  自服务。理由是避免触碰 `apps/desktop` 的 vite 配置（既有场景线文件），也避免 dev 页被打进产品包。
  若架构要求必须挂 desktop 下，改动面是 vite 多入口配置一处。**[需架构拍板]**
- **根 `CLAUDE.md` 架构边界表未加本包**。该表是仓库最高工程说明，改它属契约面，实现会话不自行动手。
  建议补一行：`packages/pi-lane　通用 agent loop 线（ADR-022），只读面，与场景线并立`。**[需架构拍板]**
- **`nodePrimitiveLedger` 为空册时的扫描面失效判据**：`packages/pi-lane/src` 扫不到 `.ts` 即触红。
  若本包退役，须同批把扫描面与登记册一并销号，不得让判据静默空转。

## 九 · 门与证据

- 单测 74 例（`vitest run packages/pi-lane`），含容器越界、闸门拒绝、预算停 loop、dev 入口 HTTP 面。
- ADR-018 门单测 12→23 例；真树注入实测：`child_process` 与 `fs:writeFile` 各触红一次，还原复绿。
- Playwright floor **不动**（本票不加 e2e 用例，dev 入口不属产品面）。
- 变异对照两例（授权边界）：包含判定退化成裸字符串前缀 → 五条红证转红；跳过 symlink 规范化 →
  定点只打红「symlink 出界」一条。
