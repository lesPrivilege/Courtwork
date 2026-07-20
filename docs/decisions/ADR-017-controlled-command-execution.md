# ADR-017：受控命令执行（bash 入界）

- 状态：Proposed
- 日期：2026-07-20
- 关系：修订 ADR-011 决定二的「不引入后台 bash」；泛化 ADR-004 的两级文件能力；受 ADR-018 的等级—能力绑定约束；效果授权时序沿 ADR-010
- 提出单：`HARNESS-CORE-1` Stage A

## 背景

实现就绪图 Round 5 方向②要求把 reading / edits / writing / bash 四项作为通用底座基础工具集，并明记「**bash 入界属重大边界变更……不 ADR 不动手**」。

**冲突面的准确坐标**（就绪图原文引「减法八条·无任意 shell」，实测该清单不存在，见 Stage A §0.1）：

1. `ADR-011` 决定二明列不引入的项里含「**后台 bash**」。
2. 归档 legacy 的两句硬承诺：「永无任意命令执行」「宿主零 shell」。
3. `ADR-004`：文件能力分两级——无损动作可直接执行；移动/重命名先生成 `FileOpsPlan` 经确认后执行并保留事务日志；**删除、覆盖等销毁级动词不进入 agent 能力面**。

**授权基础**：`ADR-009` 决定六已经预留了通路——「所有不可逆工具第一版仍只能由 Scenario 点名并经过 policy/confirmation；**未来模型 tool calling 也只能生成提案，不能直接执行**」。本 ADR 是这句话的兑现形态，不是对它的突破。

## 决定零：先回答「为什么不是继续不做」

按复杂度节制条与减法纪律，本 ADR 必须先证明 bash 非加不可。当前证据**不充分**，如实登记：

- `ADR-004` 的 `FileOpsPlan` 已覆盖 work agent 的文件整理需求，且形态更好——结构化、可投影、可逐条确认、可逆向重放。
- work agent 的已知场景（阅卷、审查、起草、卷宗整理）中，尚无一个**必须**用任意命令才能完成。

**决定性的一条**（一手源核实，2026-07-20）：归档 `pi-harness-comparison.md` 全文 17 行、未展开任何工具接口，故回一手源 `~/Projects/pi`（MIT，v0.75.4）实测。**pi 的 bash 范式恰恰是「不做权限模型」**：

- `bash.ts` 全文无白名单、无黑名单、无危险命令识别、无确认；全仓非测试代码搜 `rm -rf|dangerous|blocklist|forbidden|protected.?path` **零命中**。
- 执行形态是 `spawn(shell, ["-c", command])` ——**整串命令交 shell 解释**，stdin 被 ignore，**无默认超时**。
- 授权决定**零持久化**（`auth.json` 只存 provider 凭证）。
- 沙箱只是一个**示例扩展**（`examples/extensions/sandbox/`，用 `@anthropic-ai/sandbox-runtime` 走 macOS `sandbox-exec` / Linux `bubblewrap`），**不是运行时依赖**，需用户手动安装。
- 其 README 把这一取舍写在明面上：「**No permission popups.** Run in a container, or build your own confirmation flow with extensions」（`README.md:478`）、「**No background bash.** Use tmux」（`:484`）。
- 附带：agent loop **无迭代上限**（`while(true)`，无任何计数器），且工具错误被转成 `toolResult` 回喂模型而非中断——稳定抛错的工具在 loop 层会无限循环，兜底只有模型自停或 abort。

**结论**：「bash 采 pi 成熟范式」与「沙盒后期」（就绪图 Round 5 方向②）**互相排斥**——pi 的范式**就是**把安全性整体外包给容器。取其形而不取其容器，得到的不是 pi 的成熟范式，是它明确拒绝承担的那部分风险。

**因此本 ADR 的默认建议是：先不开 bash，只开 reading/edits/writing 三项，并把本 ADR 的授权模型作为它们的共用底座。** 若架构判定 bash 确须入界，以下决定即其受控形态——它与 pi 范式**不同源**，是本仓自建，不应以「采 pi 范式」描述。此为裁决请求首项。

## 决定一：bash 不是工具，是「提案 → 授权 → 执行」三段式

模型永不执行命令。它只产出**结构化命令提案**：

```ts
type CommandProposal = {
  argv: readonly string[];   // 已分词，不是待解析的命令行字符串
  cwd: ContainerScopedPath;  // 容器内相对路径，绝对路径留宿主
  purpose: string;           // 人读意图，供确认界面展示
};
```

- **无 shell 字符串**。提案是 `argv` 数组，不经 shell 解释——不存在管道、重定向、命令替换、`&&` 串接。「宿主零 shell」这句 legacy 承诺**在字面上继续成立**。
- 该形状与 `FileOpsPlan` 同构：模型出计划，系统裁决，用户确认，宿主执行，账本留痕。本 ADR 是那条既有路径的推广，不是第二条路径。
- 自由文本里出现的任何命令都是普通不可信文本（ADR-011 决定三），不构成调度。

## 决定二：每条提案的准入判定是三态闭集，默认 deny

```text
allow | ask | deny        // 默认 deny —— 未在白名单内即拒绝，不是「未在黑名单内即放行」
```

- **fail closed 是本决定的全部要点**。黑名单模型（识别危险命令后拦截）在此**明确拒绝**：它把安全性建立在「危险清单是否完备」上，而完备性不可证。
- 归档记录的 TRAE 三态（沙箱运行 / 手动运行 / 自动运行）是**三种运行模式**，其白名单语义是「跳过沙箱」——与本仓相反，**不借用**（详见 Stage A §0.2/§0.3 的口径校正）。本仓三态是**每条提案的准入判定**，不是全局模式档位。
- 判定结果与 `SideEffectClass` 联判：非 `pure_read` 的提案即便 `allow`，仍须经既有 gate/confirmation，`allow` 只免除「是否可提议」这一层，不免除确认。

## 决定三：白名单是能力声明，不是权限放宽

- 白名单粒度为 **`argv[0]` + 参数形状约束**，声明式，随包 descriptor 或宿主装配点静态声明——**不由用户在运行中追加**。归档记录的 TRAE「从拦截弹窗加白名单」交互**不采纳**：它把安全决定放在用户最想跳过它的时刻。
- 白名单**不能放宽 ADR-004 的销毁级动词禁令**。`rm`、覆盖写、权限变更永在 `deny`，白名单对其无效。这是 core 强制、包无权放宽——与 `runTools()` 的 `sideEffect` 门同一形态（`packages/core/src/scenario-executor/executor.ts:118`）。
- 白名单变更是代码变更，走 review 与门禁，不是运行时配置。

## 决定四：授权决定先于 effect 落盘

- 授权决定（allow/ask 的结果、actor、scope、提案快照 hash、判定依据）作为账本事件**先持久，再执行**。沿 `ADR-010` 决定二的 durable-before-effect 屏障，复用其已有的确定性红证手法（移除屏障即变红）。
- 事后弹窗、执行后补记、session 级 always-allow 一律**不构成授权**（就绪图「Effect 与授权」节既有纪律）。
- **WorkBuddy 的 Full Access 式总开关明确拒绝**：它是「授权先行、关闭逐步确认」，直接冲不变量 3。归档消费 pass 已把它列入反面教材桶。
- 授权作用域为**单次提案**。同一 `argv` 再次提出即再次判定——不存在「这个命令本会话已批准」。

## 决定五：审查只读结构化字段

- 若引入自动审查环节（模型或规则），其输入**只能是结构化提案字段**（`argv` / `cwd` / `sideEffect`），**不得读取模型的自由文本**。理由：自由文本是模型可控面，读它等于让被审查者写审查依据——这是提示注入操纵权限判断的直接通道。
- 该形状借自归档 `research-2026-07-19-agent-pedagogy/survey.md` 记录的 Sidecar 手法（独立轻量模型只审查结构化工具调用字段，刻意不读主模型自由文本）。**借形不借实现**：本仓当期不引入第二模型，规则判定即可。
- 配**拒绝熔断器**：同一步骤内连续 N 次提案被拒即停止重提，转人工，不无限重试。

## 决定六：能力面随隔离等级绑定

当期隔离等级为 `none`（ADR-018 决定一），故受控命令执行**只能落在最窄档**：白名单 + 逐次确认 + 授权先于执行，且仅限容器 scope 内。

- 不得以「将来会有沙箱」为由预先放宽（ADR-018 决定五）。
- 隔离等级晋升后能力面可随之晋升，但每次晋升须有该等级的证伪反例作证据。

## 决定七：明确不做

- 后台执行、长驻进程、命令队列（ADR-011 决定二原文的「后台 bash」在此**继续成立**）；
- shell 字符串、管道、重定向、命令替换；
- 交互式命令（需 TTY 的一律拒绝——无法在确认模型内表达其后续行为）；
- session 级 / 全局 always-allow、Full Access 式总开关；
- 用户在运行中追加白名单；
- 黑名单式危险命令识别作为主要防线；
- 模型自主决定是否提案、何时提案（提案仍只在场景声明或用户显式触发的步骤内产生）。

## 决定八：reading / edits / writing 三项可借 pi 范式，但走既有工具契约

与 bash 不同，这三项在 pi 中的形态**与本仓纪律不冲突**，可借形（MIT，一手核实）：

- **edits 的形状值得直接借**：`{ path, edits: [{ oldText, newText }] }`，两层 `additionalProperties: false`；约束写进 description——`oldText` 须在原文唯一、同批 edit 不得重叠、每条对**原始文件**匹配而非增量。错误分类闭集：未找到匹配 / 多处匹配 / edit 间重叠 / 结果无变化 / 空 oldText。这套约束把「改错地方」变成结构性不可能，与本仓「无锚不落格」同构。
- **截断在生产时完成并内联告知模型**：pi 的 read 用 head 截断（2000 行 / 50KB），bash 用 tail 截断；超限时正文追加 `[Showing lines X-Y of N. Use offset=Z to continue.]`。**截断是显式事实不是静默丢弃**——与不变量 4 相容。
- **不借的部分**：pi 的 write **无覆盖前确认、无 read-before-write 前置**，直接 `mkdir -p` + 覆盖写。这与 ADR-004「原件永远只读」「删除、覆盖等销毁级动词不进入 agent 能力面」直接冲突，**不采纳**——本仓的 writing 必须落在工作稿分区且经既有 gate。

实现形态：三项走既有 `ToolDefinition`/`ToolEnvelope` 契约（`packages/tools/src/contract.ts`），**不新造工具协议**；其副作用分级经既有 `sideEffect` 门（`executor.ts:118`）。是否额外套本 ADR 的提案—授权三段式见未决 4。

## 门禁

- 提案含 shell 元字符、或 `argv` 被拼成单字符串必须触红。
- 白名单外命令被执行必须触红（fail-closed 反例）。
- 销毁级动词经白名单放行必须触红。
- 授权事件未落盘即执行必须触红（复用 WORK-STORE-1 的屏障移除变红手法）。
- 审查环节读到模型自由文本必须触红。
- 同一提案二次执行复用首次授权必须触红。
- 能力面超出当前隔离等级允许的最高档必须触红。

## 未决（须架构拍板）

1. **bash 是否入界**（决定零）。默认建议：先只开 reading/edits/writing。
2. 若入界：首批白名单内容。建议起点为空集 + 逐条按真实场景拉动，而非预置一份「常用命令」。
3. 提案的产生位置：场景声明的新步骤种类，还是既有 `deterministic_tool` 步的一种？前者触 ADR-009 决定二的步骤闭集（当前封闭为 `model | deterministic_tool | interaction | projection | confirmation`），须显式扩集。
4. reading/edits/writing 三项是否也走本 ADR 的提案—授权—执行三段式，还是沿现有工具契约（`ToolEnvelope`）直接实现。

## 来源

- 被修订项：`docs/decisions/ADR-011-minimal-harness-kernel.md` 决定二；授权基础：`ADR-009` 决定六；两级文件能力与销毁级动词禁令：`ADR-004`；durable-before-effect：`ADR-010` 决定二；现行 `sideEffect` 运行时门：`packages/core/src/scenario-executor/executor.ts:118`。
- 方向登记：`docs/architecture/implementation-readiness.md` Round 5 方向②。
- **pi 一手源核实（史料线索，决定零与决定八的证据基底）**：`archive/research-2026-07-20-pi-first-source/pi-tools-first-source.md`。
- 同行形态与反面教材（史料线索，口径校正见 Stage A §0）：`archive/research-2026-07-19-work-agent-landscape/landscape.md`、`archive/research-2026-07-19-agent-pedagogy/survey.md`。
- 「永无任意命令执行 / 宿主零 shell」原始承诺（史料线索）：`archive/docs-legacy-2026-07-13/docs/11-会话唤醒prompt.md:620`、`:657`。
