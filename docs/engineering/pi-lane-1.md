# PI-LANE-1 评估件：ADR-022 未决四题逐题回答

> **2026-07-28 效力订正**：本件的 0.82.1 源码与机器实测仍是有效证据；其中把生产挂载统称
> `PI-LANE-2`、把场景线沙箱写成“Rust 自研窄 profile”的排程/选型叙述已被 ADR-018/022
> 修订替代。现行顺序是 write proof、stdio/分发、Rust host、workspace read、独立 headless
> 总验，再开基础 GUI并独立验收；Dossier/修订/UI 巧思均在两条基础线之后。报告正文保留当时
> 答卷，不作为当前票面。

**性质**：实现会话交付的证据材料，不是裁定。ADR-022 的补记由架构角色落；本件只负责把
「实测到什么」写清楚，含反例与做不到的部分。第二至五节的机器实测锚定 `@earendil-works/pi-agent-core@0.82.1`
与 `@earendil-works/pi-ai@0.82.1`，上游升版须按 ADR-022 决定五逐版复核，届时本件同批重核。

**证据来源约定**：凡标「实测」者，出自本机安装的 dist 产物逐行读取或真跑；凡标「推论」者，
标明前提。归档调研（`archive/research-2026-07-20-pi-first-source/` 等）只作线索，本件结论不依赖其转述。

---

## 一 · 引入锚定与 license 复核（ADR-022 决定五）

| 项 | 值 |
|---|---|
| runtime | `@earendil-works/pi-agent-core@0.82.1`，MIT，`engines.node >=22.19.0` |
| provider 层 | `@earendil-works/pi-ai@0.82.1`，MIT，同 engines |
| 锁定方式 | `package.json` 写精确版本（无 `^`）；lockfile integrity 见下 |
| pi-agent-core integrity | `sha512-Z3kloziJIE2dmrisRckZX8zDca/gIv9/YdFAzeoqpHiLV2wsni6bL4hInNSjVKLbqT+4kqLIkph2JQLKvSepjg==` |
| pi-ai integrity | `sha512-3WFYRhEp3lQB3444EhPMBcM7zSaEUE3eJgHOR7s4081NLqbw/FsWilIKWXSua0Gv3sRr7m9xMidR3pPDE7jI/A==` |
| 来源仓 SHA | **不可得**。npm 包未带 `repository`/`gitHead` 字段；本机 pi 快照无 `.git`。锚点只能取 integrity |

### 一处必须纠正的包名（建议回 ADR-022 补记）

ADR-022 正文与就绪图 `PI-LANE-1` 行写的是**无 scope 名** `pi-agent-core`。npm 上该名
**不是 pi 的包**：它是 mitsuhiko（Armin Ronacher）名下的占位包，`description` 自述
"Placeholder package name reservation for pi-agent-core."，`unpackedSize` 486 字节、3 个文件、
发布于 2026-04-07；`pi-ai` 同形。照字面执行 `npm i pi-agent-core` 装到的是空壳，不是 pi。

真名是 `@earendil-works/pi-agent-core`（旧 scope `@mariozechner/*` 停在 `0.73.1`，仍可解析）。
这不是笔误层面的问题——它是一个**供应链取字风险**：文档字面与真实分发名不一致，
下一个照文档办事的会话会装错包。故本件把它列为需要落痕的第一条。

### license 逐仓复核

两包 `package.json` 的 `license` 字段均为 `MIT`。ADR-022 决定五点名「子仓有 Apache-2.0 先例，
不默认继承」——本票只引入这两包，逐包核实即完；未来若引入 `pi-coding-agent` 或 srt 一族须重核
（srt 为 Apache-2.0，见 `sandbox-probe-1.md` 第七节）。

### 依赖尾巴（已知边界，非阻塞）

`pi-ai` 的运行时依赖含五家 provider SDK：`openai`、`@anthropic-ai/sdk`、`@google/genai`、
`@mistralai/mistralai`、`@aws-sdk/client-bedrock-runtime`。本仓只用 DeepSeek（走
`openai-completions` 通道），但整条尾巴仍进 `node_modules`：pi-ai 自身 5.5 MB、pi-agent-core 1.7 MB，
传递的 provider SDK 另计（openai 13 MB、@google/genai 14 MB、@anthropic-ai/sdk 6.4 MB、
bedrock-runtime 1.1 MB，本机实测解包体积）。这与第五节的分发体积直接相关。

---

## 二 · 未决一：预算上限能否经扩展 API 可靠实施

**答：不能。扩展 API 停得住工具，停不住 loop；上限必须由 sidecar 层强杀。**

### 实测三条（`dist/agent-loop.js`、`dist/agent.js` 逐行读取）

1. **`beforeToolCall` 的 `block` 不是「停」，只是把这次工具调用换成一条错误 toolResult**
   （`agent-loop.js:418-424`：`block` 为真时返回 `kind:"immediate"` 的 `createErrorToolResult`）。
   错误结果照常回灌模型，外层 `while` 继续。归档已记「错误不中断、不重试、转成 toolResult 回喂」，
   本次在 0.82.1 复核仍成立。**结构性后果**：靠 `beforeToolCall` 拦预算，等于把一个稳定报错的
   工具喂给一个没有计数器的 `while(true)`——那不是省钱，那是烧钱。

2. **能真停 loop 的钩子是 `shouldStopAfterTurn`，但它不在 `Agent` 的选项面上。**
   它只存在于低层 `AgentLoopConfig`（`types.d.ts:186`），由 `agentLoop()` / `runAgentLoop()` 直接消费
   （`agent-loop.js:151-157`：返回真则 `emit agent_end` 并 `return`）。而 `Agent` 这一层
   **不向 loop 转发它**——`dist/agent.js` 全文搜不到该标识符。`AgentHarness` 建在 `Agent` 之上，同样够不着。

3. **`AgentHarness` 的选项面不含任何权限钩子**（`harness/types.d.ts` 的 `AgentHarnessOptionsBase`
   只有 session/models/tools/resources/systemPrompt/streamOptions/retry/model/thinkingLevel/
   activeToolNames/steeringMode/followUpMode）。即：**要挂我方不变量，就只能用 `Agent`，用不了 `AgentHarness`。**

### 由此得到的可行形态（本票已实现并有红证）

在 `Agent.subscribe` 的 `turn_end` 上记账，越限即调 `agent.abort()`。这是宿主侧的强杀，不是扩展点。
实测语义两条，都必须如实说出：

- **越限即停，不是永不越限**。usd 只能事后知道——一个回合的开销在该回合结束前无法确定，
  故最后一个回合总可能压线越过上限。要做到「永不越限」需请求前的开销预估，那是另一层能力。
- **被 abort 打断的那个回合不计入用量**（其 `stopReason` 为 `aborted`），否则计数会多出一个空回合。
  这条是实测出来的：不做此排除时，`maxTurns: 3` 会记成 4。

红证：`packages/pi-lane/src/session.test.ts`「预算真停得下 loop」两例——三十条「继续调工具」的脚本
回应下，`maxTurns: 3` 停在 3 个回合，剩余脚本回应超过 20 条未被消费。

### 供架构裁量的三条路（本件不裁）

| 路 | 代价 | 备注 |
|---|---|---|
| 甲：宿主 `abort()`（本票所取） | 停在回合边界，可能超一个回合 | 零 fork，当期够用 |
| 乙：绕开 `Agent`，直接驱动 `agentLoop()` 以取 `shouldStopAfterTurn` | 自行承担 transcript/事件/队列状态管理 | 仍零 fork，但等于放弃 `Agent` 的现成状态机 |
| 丙：请求前开销预估以求硬上限 | 需要 token 预估器与模型价目联动 | 超出本票范围 |

---

## 三 · 未决二：授权决定能否持久化入我方账本，钩子时序是否满足 durable-before-effect

**答：满足。`beforeToolCall` 是 `await` 的，且在工具执行之前串行完成——把落盘放进这个钩子里，
先落盘再执行的次序有保证。**

### 实测（`dist/agent-loop.js`）

- `prepareToolCall()` 内：先查工具表，再 `await config.beforeToolCall({...})`（`:405-412`），
  返回 `block` 则不执行（`:418-424`）；不 block 才进入 `executePreparedToolCall`。
  钩子是被 `await` 的，其内部的异步落盘会被等待。
- **即使在并行执行路径下，prepare 阶段仍是串行的**：`executeToolCallsParallel` 用
  `for (const toolCall of toolCalls) { ... await prepareToolCall(...) }`（`:332-341`），
  并行只发生在 execute 阶段。故一批工具调用的授权决定按序落盘，不会交错。

### 三条必须一并登记的限制

1. **只覆盖已注册的工具**。未注册的工具名在 `beforeToolCall` **之前**就被内核以
   `Tool ${name} not found` 拒掉（`:394-400`），钩子根本不会被调用。故「所有工具请求都落账」
   这句话在 pi 上不成立——落账的是「已注册工具的调用请求」。若账本需要记录「模型试图调用一件
   我们根本没给的能力」，得另在 `message_end` 事件上自行解析 assistant 消息里的 toolCall 块。
2. **`afterToolCall` 不作用于 immediate 结果**（`:307-312` 与 `:342-347` 直接构造 finalized，
   跳过 `finalizeExecutedToolCall`）。即：内核给出的拒绝语改不了，我方理由无法覆盖上去。
3. **durable 的那一半仍是我方责任**。钩子只保证「等你落完再执行」，不保证你落得住——
   fsync 与崩溃语义按 ADR-010 由我方实现，pi 不参与。

本票不实现授权账本（读面无不可逆动作，没有需要事前确认的东西）。以上只回答「时序是否可用」。

---

## 四 · 未决三：journal 分区落点与备份/删除语义（提案）

**先说本票的实况：没有 journal。** 第二节实测的结论是「要挂钩子只能用 `Agent`」，
而 session journal 与 compaction 住在 `AgentHarness`（`harness/session/jsonl-repo.ts`）。
两者当期不可兼得——这是 pi 0.82.1 的层次事实，不是取舍偷懒。故 pi lane 当期是**无持久 transcript**
的会话：进程退出即散。这条已在 SPEC 登记为已知边界。

### 提案（供架构裁定，本件不自裁）

按 ADR-019 决定一，持久分区的唯一单位是容器（卷宗/项目），不按 session 分区；ADR-019
可证伪判据第 64 行明确「出现第四种持久分区单位（按 session / 按 turn / 按 provider 分区）必须触红」。
pi 原生 journal 恰恰是**按 session 一份 JSONL**。故提案是：

- **落点**：容器分区内新增一档 `loop/`，与工作稿并列；其下按 pi 原生 journal 格式存放，
  文件名用 pi 的 session id。这样对外的持久分区单位仍是容器（`loop/` 是容器的一个子档，
  不是新的分区单位），对内保留 pi 的格式以免自造格式。
- **可见性**：`loop/` 不进跨容器检索 index（ADR-019 决定一「跨容器检索命中必须触红」照旧适用）；
  不写入场景线 Turn journal 与确认账本（ADR-022 决定四）。
- **备份/删除**：随容器整体走——容器删除即连带删除 `loop/`，不给 pi lane 单独的会话管理面
  （ADR-013 §5「用户零 session 管理面」不变）。
- **密钥**：`loop/` 与其他分区同规——凭据永不进入（ADR-019 第 58 行）。

**待架构确认的两点**：其一，`loop/` 是否需要与 `工作稿` 一样进入「先入卷再确认」的流程
（本票认为不需要——loop transcript 是过程记录，不是产出）；其二，若将来为取 `shouldStopAfterTurn`
而改用低层 loop（第二节乙路），journal 就得我方自写，届时格式是否仍从 pi 原生。

---

## 五 · 未决四：Node sidecar 的签名/公证链影响

**部分已由 `SANDBOX-PROBE-1` 回答**（ADR-022 未决 4 已记）：场景线沙箱定乙路（Rust 自研窄 profile），
不需要 sidecar，故「与 srt 共用一个 sidecar」只在甲路成立，而甲路已挂重启条件。本节只补剩余部分——
**sidecar 自身的签名链代价**。

### 本票的实况：dev 形态不触发该代价

当期 dev 入口由 `pnpm --filter @courtwork/pi-lane dev` 在本机 Node 下起进程，**不进 `.app`、
不参与签名与公证**。故本票没有产生任何签名链事实可供实测——这一点必须说清，避免把
「没遇到问题」误读成「没有问题」。

### 生产形态的代价（推论，前提标明）

前提：Tauri v2 的 `.app` 内嵌 Node 运行时与本包 JS，随宿主一同签名公证。由此可推四条：

1. **发行包内必须有 Node 运行时**。当前发行包不含 Node（`sandbox-probe-1.md` 第七节原记）。
   官方 Node 22 的 macOS 分发解包体积在数十 MB 量级；本件未实测该数字，不给具体值。
2. **嵌套签名是必须项**。`.app` 内的可执行文件（node 二进制）须逐个签名，且 hardened runtime
   下 JIT 相关 entitlement 需要评估——Node 的 V8 需要可写可执行内存，通常要
   `com.apple.security.cs.allow-jit`。这一条会直接放宽宿主的 entitlement 面，属安全代价而非仅工程代价。
3. **公证须覆盖嵌入可执行文件**，故公证时长与失败面随之扩大。
4. **依赖尾巴一并入包**：第一节列的五家 provider SDK 会随 `node_modules` 进发行包，
   除非另做打包裁剪（esbuild/rollup 单文件化）。裁剪本身是新的工程面，且会与 pi 的动态
   `providers/*` 导入形态冲突——`pi-ai` 的 provider 走子路径导出，静态打包需显式保留。

### 与裁点一的关系

`sandbox-probe-1.md` 第七节记「sidecar 嵌套签名的代价由 `PI-LANE-1` 先付」。本件如实修正这个假定：
**本票没有付这份代价，只把它推到了 `PI-LANE-2`**。因为 dev 形态不进发行包，代价在生产挂载时才出现。
故沙箱票的甲路成本表里「Node 运行时不再计入本票账下」这一行的前提当期尚未成立。

---

## 六 · 内核时序实测汇总（上述结论的共同依据）

| 事实 | 坐标 | 对我方的影响 |
|---|---|---|
| 未注册工具在 `beforeToolCall` 之前被拒 | `agent-loop.js:394-400` | 禁用面的拒绝语出自内核，不 fork 改不了 |
| `tool_execution_start` 对未注册工具照发 | `agent-loop.js:299-304`、`:334-339` | 「拦在执行前」要以 execute 未被调用为准，不能以事件缺席为准 |
| `beforeToolCall` 被 await，prepare 阶段串行 | `agent-loop.js:332-341`、`:405-412` | durable-before-effect 可行（第三节） |
| `afterToolCall` 不作用于 immediate 结果 | `agent-loop.js:307-312`、`:342-347` | 拒绝语无法事后改写 |
| `shouldStopAfterTurn` 不经 `Agent` 转发 | `agent.js` 全文无该标识符 | 预算须宿主强杀（第二节） |
| `AgentHarness` 无权限钩子 | `harness/types.d.ts` | 挂载点只能是 `Agent`（第四节的连带后果） |

---

## 七 · 已知边界登记（ADR-022 决定三：扩展不可达的不变量须显式登记）

1. **无持久 transcript**（第四节）。进程退出即散。
2. **禁用面的拒绝语不可定制**（第六节）。我方政策说明只能经 system prompt 传达给模型。
3. **模型对「未注册工具」的尝试不入任何账**（第三节限制 1）。
4. **预算是越限即停，非永不越限**（第二节）。
5. **symlink 一律不跟随**：授权文件夹内指向文件夹内的软链子树也看不见。取保守解以少一个越界口子。
6. **glob 只支持三个元字符**（`**`、`*`、`?`）：够 md 检索用，省掉一个新依赖；扩语法是契约变更。
7. **单次调用扫描上限 2000 份文件、200 条命中**：超限在结果里显式告知模型，不静默截断。

## 八 · 未做的部分

- **真 key 的端到端跑通未做**。本机环境未设置 `DEEPSEEK_API_KEY`，实现会话不自行取得或代填凭据，
  也不动用他人额度。自动化门内的 loop 证据一律走 pi-ai 自带的构造 provider（faux），不触网。
  持 key 者可按 SPEC「真 key 复核步骤」一节自行执行，其结果应另行登记，不与构造 provider 的证据混写。
- **授权账本未实现**（第三节说明理由：读面无不可逆动作）。
- **journal 未实现**（第四节：当期层次不可兼得，只交提案）。
