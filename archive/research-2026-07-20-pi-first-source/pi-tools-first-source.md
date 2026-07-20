# pi 四类基础工具一手源核实（2026-07-20）

调研原稿，不具约束力。只读核实，未修改被调研仓库。

**立项理由**：`research-2026-07-15-round-3/pi-harness-comparison.md` 全文 17 行，**未展开任何工具接口**；而实现就绪图 Round 5 方向②以「reading/edits/writing/bash 采 pi 成熟范式」为论断基础。归档层缺证据，故回一手源。

**被调研对象**：`~/Projects/pi`（本机，仓外）。`@earendil-works/pi-coding-agent` 等四包 **v0.75.4**，**MIT**（`LICENSE:1-21`，标准 MIT 全文，无附加条款/CLA/non-compete）。Node `>=22.19.0`。依赖全为精确固定版本，根 `check:pinned-deps` 强制。

**核实边界**：本机快照无 `.git`，**提交日期与 issue/PR 响应时延无法从本地判定**。活跃度替代证据取自 `CHANGELOG.md` 自述：236 条版本标题，`0.10.0`(2025-11-25) → `0.75.4`(2026-05-20)，即约 6 个月 235 版；含 63 处 issue/PR 链接、180 个去重外部贡献者署名——**只证明 PR 被合并并记账，不证明响应时延**。

> **坐标约定（重要）**：本文全部 `packages/...` 形式的路径均**相对 pi 仓库根**（`~/Projects/pi`），**不是 Courtwork 仓内路径**。Courtwork 无 `packages/agent`、`packages/ai`、`packages/coding-agent`、`packages/tui` 四包，故不构成实际碰撞；但自动化链接检查会把它们误报为断链，遇报按本约定排除。凡指 Courtwork 自身的坐标，本文一律显式写明「本仓」。

---

## 一、bash：无权限模型，安全性整体外包给容器

**这是本次核实最重要的一条**，直接决定 ADR-017 的立论。

- 定义 `packages/coding-agent/src/core/tools/bash.ts:265`。schema `:23-26` 仅两字段：`command: string`（必填）、`timeout?: number`，其 description 逐字为 `"Timeout in seconds (optional, no default timeout)"`。
- 执行 `:74-80`：`spawn(shell, [...args, command], { cwd, detached: platform !== "win32", stdio: ["ignore","pipe","pipe"], windowsHide: true })`。args 恒为 `["-c"]`——**整串命令交 shell 解释**。stdin 被 ignore，交互式命令必挂。
- **超时无默认值**，仅 `timeout > 0` 时 `setTimeout → killProcessTree`（`:85-90`）。
- 输出上限 2000 行 / 50KB，`truncateTail` 保尾；超内存缓冲即溢写 `tmpdir()`，并把路径告诉模型：`[Showing lines X-Y of N. Full output: /tmp/pi-bash-<hex>.log]`（`:356-361`）。
- 退出码非 0 → **抛异常**（`:393-395`），失败不是返回值。

### 权限/确认：内置为零

- `bash.ts` 全文无白名单、无黑名单、无危险命令识别、无确认弹窗。
- `coding-agent/src` 非测试代码搜 `rm -rf|dangerous|blocklist|forbidden|protected.?path|readonly.?path` —— **零命中**。
- 唯一的 "allowlist" 是**工具名**级（`--tools` 决定暴露哪些工具），非命令级：`src/cli/args.ts:234`、`core/agent-session.ts:170`、`core/sdk.ts:60`。
- 唯一拦截层是**扩展钩子**，位于 agent 层非工具层：`core/agent-session.ts:396-415` 的 `beforeToolCall`；**无扩展注册时直接 `return undefined` 放行**（`:398-400`）。契约 `core/extensions/types.ts:984-988` 为 `{ block?: boolean; reason?: string }`。事件按工具名判别联合，`BashToolCallEvent.input` **可原地 mutate 改写命令**，且注释明确「No re-validation is performed after mutation」（`:816-820`）。
- `ctx.ui.confirm()` 是给扩展调用的 API（`extensions/types.ts:128-129`），**默认实现返回 `false`**（`runner.ts:193`）；核心工具链无人调用。
- **授权决定零持久化**：`auth.json`（`core/auth-storage.ts:55,209`）只存 provider API key 与 OAuth token，与工具权限无关。

### 沙箱：示例扩展，非运行时依赖

`examples/extensions/sandbox/index.ts` 用 `@anthropic-ai/sandbox-runtime`（`:47`），macOS `sandbox-exec` / Linux `bubblewrap`（`:5-6`）；需用户手动复制到 `~/.pi/agent/extensions/` 并 npm install（`:37-41`）。该依赖只在**根 devDependencies**（`package.json:38`），不是 coding-agent 运行时依赖。配置面含 `network.allowedDomains/deniedDomains`、`filesystem.denyRead/allowWrite/denyWrite`。注释 `:8-10` 说明它**整体替换内置 bash 工具**。

### 上游自述（可直引的设计意图）

`packages/coding-agent/README.md`：
- `:478`「**No permission popups.** Run in a container, or build your own confirmation flow with extensions」
- `:484`「**No background bash.** Use tmux. Full observability, direct interaction.」
- 另 `:474` 无 MCP、`:476` 无 sub-agent；`:365` 的「Permission gates and path protection」列在**扩展可实现**而非内置已实现。

---

## 二、read / edit / write 接口

注册处 `core/tools/index.ts`：工具名闭集 `"read"|"bash"|"edit"|"write"|"grep"|"find"|"ls"`（`:83`）；四件套装配点 `createCodingToolDefinitions:138-145` / `createCodingTools:168-175`。

### read（`core/tools/read.ts:206`）

- schema `:20-24`：`path: string` 必填；`offset?: number`（1-indexed）；`limit?: number`。
- 成功返回 `{ content: (TextContent|ImageContent)[], details?: { truncation? } }`。
- 失败一律 `throw`，无错误对象。分类：offset 越界（`:289`）、fs 错误透传（`:243`）、abort（`:230,:236`）。
- 截断 `truncateHead`，双限 2000 行 / 50KB（`truncate.ts:11-12`），先到先算。**内联告知模型**：行限 `:315`、字节限 `:317`、单行超限 `:307`（并直接建议改用 bash `sed -n 'Np' | head -c`）、用户 limit 提前截止 `:324`。
- 图片自动 resize 至 2000×2000（`:59-60`）；非 vision 模型注记 `:90-95`。

### edit（`core/tools/edit.ts:293`）

- schema `:31-51`：`path: string` 必填；`edits: Array<{ oldText, newText }>` 必填。**两层均 `additionalProperties: false`**（`:39,:50`）。
- 约束写在 description：`oldText` 须在原文唯一、同批 edit 不得重叠（`:35`）；每条 edit 对**原始文件**匹配而非增量（`:47`）。
- **参数容错** `prepareEditArguments:90-114`：模型把 `edits` 发成 JSON 字符串时自动 parse（`:98-103`，注释点名 Opus 4.6 / GLM-5.1）；顶层 legacy `oldText`/`newText` 自动折叠进 `edits`（`:105-113`）。
- 成功返回携 `details: { diff, firstChangedLine }`（unified diff）。
- 失败全 `throw`，分类闭集（`edit-diff.ts`）：空 oldText `:205`、未找到匹配 `:219`、多处匹配 `:224`、edit 间重叠 `:240-243`、结果无变化 `:256`。
- 并发保护 `withFileMutationQueue` 按绝对路径串行（`:20`）；BOM 保留 `:76`、行尾风格探测还原 `:77,:90`。

### write（`core/tools/write.ts:186`）

- schema `:14-17`：`path`、`content` 均必填。
- 自动递归创建父目录（`:221`）。
- **无截断、无覆盖前确认、无 read-before-write 前置检查。**

---

## 三、toolResult 的表示与回灌

**wire 类型**（`packages/ai/src/types.ts:292-300`）：

```ts
interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: TDetails;
  isError: boolean;
  timestamp: number;
}
```

- **持久形态**：JSONL 每行一 entry；header `{ type:"session", version:3, id, timestamp, cwd, parentSession? }`；entry 基类携 `parentId`——**会话成树，可分叉**（`harness/types.ts:334`）。工具结果**没有专用 entry 类型**，整条 `ToolResultMessage` 原样塞进 `MessageEntry.message`（`:341`），`details` 一并落盘。append-only：`setLeafId` 写 `leaf` entry 而非改写（`jsonl-storage.ts:230-244`）。
- **`details` 落盘且供 UI 渲染，但模型看不到**：`providers/anthropic.ts:1102-1108` 只发 `tool_use_id`/`content`/`is_error`。
- **回灌逐字不变**：`agent-loop.ts:212-215` push 进 messages，`:283-296` 整数组重转送出；`harness/messages.ts:155-158` 恒等透传。唯一例外 `core/sdk.ts:282-315`（`blockImages` 时图片换文本占位）。
- **截断发生在生产时**（工具内部），`ToolResultMessage` 一出生即截好；事后无二次折叠。
- **compaction 永不在 toolResult 处切**：`harness/compaction/compaction.ts:277-278` 的 `findValidCutPoints` 内 `case "toolResult": break;`——结构性保证 toolCall/toolResult 配对不被劈开。摘要以 user 消息包 `<summary>` 注入（`harness/messages.ts:147-154`），切点前内容整体丢弃。

---

## 四、agent loop 控制结构

主体 `packages/agent/src/agent-loop.ts:155-269`，双层循环（外 `while(true)` `:170`；内 `while (hasMoreToolCalls || pendingMessages.length > 0)` `:174`）。

- **单轮工具调用无上限**：`runLoop` 内无计数器。全仓搜 `maxIterations|maxSteps|maxTurns|maxToolCalls|iterationCount|stepCount` 仅命中测试/探针（`test/sdk-codex-cache-probe-tool-loop.ts:67` 的 `MAX_TURNS = 50`）。**生产代码零上限。**
- **终止条件五条**：LLM stopReason 为 error/aborted（`:196`）；本轮无 toolCall（`:206`）；工具批次协同终止 `shouldTerminateToolBatch:544`（`.every(terminate === true)`——批内有一个不终止即继续）；宿主钩子 `shouldStopAfterTurn`（`:241-250`）；无后续消息（`:265`）。
- **并行默认**（`agent.ts:218`）；**任一工具声明 `executionMode: "sequential"` 则整批降级串行**（`:381`）。并行仅限 execute 阶段——prepare 阶段（含 `beforeToolCall` 权限钩子）仍逐个串行（`:461-500`、`:581-605`）。
- **错误不中断、不重试、转成 toolResult 回喂模型**：`:656-661` catch 后 `return { result: createErrorToolResult(...), isError: true }`，**不 rethrow**。`isError` 全文 19 处均为构造/透传/事件负载，**无 `if (isError)` 分支**——不参与循环控制。
- **结构性后果**：无上限 `while(true)` + 错误转结果 ⇒ 稳定抛错的工具在 loop 层会无限循环；兜底只有模型自停、`shouldStopAfterTurn` 或 abort signal。
- 重试在更高层：provider SDK `maxRetries`（`ai/src/types.ts:127-138`）；硬编码 provider 重试（`openai-codex-responses.ts:53` `MAX_RETRIES=3`，指数退避 + `Retry-After`）；应用层 `agent-session.ts:2428` `_isRetryableError` / `:2446` `_prepareRetry`（默认 3 次 / 2000ms，重试前把错误消息从上下文剔除）。

---

## 五、附带发现

`truncate.ts` 与 `compaction.ts` 各有两份分叉副本（`packages/agent/src/harness/...` 与 `packages/coding-agent/src/core/...`），常量相同、文件不同；coding-agent 的工具全部 import 自己那份——改 agent 那份不影响实际发布的 CLI。
