# EX-MA-R2 · 已安装 0.85.1 的 lane 实况（Luna 只读回执）

只读 `app/node_modules/@earendil-works/` 磁盘源码，未执行、未升级。三包 `package.json` 均为 **0.85.1**。探查在 `b4e3f71` 完成，`git diff 5b405b3 b4e3f71 -- app/package.json app/package-lock.json` 为空，故对本轮基线同样成立。所有断言出自 `.js` 实体，不采信 `.d.ts` 或文档。

## 一、实现与桩

- 整棵 `harness/**` 中 `SliceNotImplemented` 只有一个抛出点：`dist/harness/runtime/harness.js:228-230` 的 `watchSession`，无条件抛出、无兜底路径。
- `lane()` / `lanes()` / `accept` / `drive` / `requestOperationAbort` / `driveOperation` / `restoreSession` / `restoreLaneState` / `JsonlStorage.commit` 读其 `.js` 实体均为完整逻辑，无桩、无提前返回。首片 runtime matrix 中 Luna 按 GitHub 提交所作的判断，在实际安装包上一致。
- 其余 stub 形状的字符串属格式版本校验与普通错误分支，非缺功能标记。

## 二、并行的实际含义

- `Lane.drive()`（`dist/harness/runtime/lane.js:685-753`）以 `void driveOperation(...)` 脱离 await 运行；provider 流式调用（`dist/harness/runtime/drive/generation.js:113,193-202`）在 `session.mutate()` 锁之外。同一 Session 上两个 Lane 各持独立 `activeDrive`，可同时有在途请求——单进程事件循环并发，非多线程或 OS 隔离。
- 写入经单条 `MutationLine` 串行（`dist/harness/session/session.js:163-185`），只串行化短元数据提交，不串行化生成调用。
- 取消逐 lane 独立：`requestOperationAbort` 持久置 `cancel_requested`，经 `dist/harness/execution/effect-gate.js:1-46` 的 AbortController 生效。
- 一轮内工具调用默认并行（`dist/harness/runtime/drive/tools.js:413` 的 `Promise.all`，`toolExecution` 可设 `sequential`）。
- **三包内不存在 subagent / spawn-child / 跨 Session 消息 API**（`grep -rliE "subagent|spawn.?child|spawn.?agent"` 零命中）。vendor 原生只有并行 lane 与轮内并行工具调用。

## 三、Courtwork 实际调用点

- `grep -rn "AgentHarness|watchSession|\.lane(|\.lanes("`（排除 node_modules）**零命中**：生产从不调用 `AgentHarness.create`。
- 唯一 vendor 接入点是 `app/runtime/pi-session-runtime.mjs`：`createAgentSession`（:171）经 Courtwork 自有包装 `createSessionRun`（:150-364）驱动 `prompt/waitForIdle/abort/subscribe/dispose`。`app/server/service.mjs:1219` 调用之，`this.active`（:149）以不 await 的方式持有多个并发 Run，**跨 Session 的并发 Run 在生产上已经存在**；单 Session 单活跃 Run 由 `app/server/store.mjs:408,424,453` 限制。
- `pi-coding-agent` 的 `AgentSession` 与 `pi-agent-core` 的 `Harness`/`Lane` 在源码层互不引用（`dist/core/agent-session.js:15-40` 无相关 import），是两套并列实现，不是同一栈的上下层。
- `app/harness/child-execution.mjs` 不 import 任何 `@earendil-works` 包：C1–C10 的 child 性质今日全部对 Courtwork 合成 adapter 成立，与 vendor 无关。
- `app/runtime/fake-provider.mjs:203-298` 起本机 loopback OpenAI-completions SSE，密钥为静态合成值，已证 `pi-ai` 可离线无凭据运行。

## 四、今日可断言与不可断言

可对已安装 0.85.1 直接建离线 fixture（经 `AgentHarness.create` + `MemorySessionRepo`/`JsonlSessionRepo` + 复用 fake-provider）：两 lane 在途重叠；取消一 lane 不动另一 lane；杀进程后由 `JsonlSessionRepo` 重开命名 lane 并从 `restore.js:47-116` 恢复未结算 operation（`create` 返回 `open: OpenOperation[]`，`harness.js:290-304`）；`watchSession` 抛 `SliceNotImplemented` 的版本身份断言；逐 lane 配置独立。

不可断言：任何关于**生产语义**的结论——生产不走 lane，故 lane fixture 只刻画 vendor 本身；`watchSession` 式全 Session 事件流（只能逐 lane `watch` 后客户端合并）；OS 级隔离或真多进程 child；vendor 侧的 child 身份/授权/取消（无原语可测）；跨 Session 协调（Courtwork 自建，vendor 无对应物）。

## 五、未执行代码的不确定项

全部结论出自静态阅读与控制流推理，未跑 fixture；`MutationLine` 内部队列、`openai-completions` 流实现细节未逐帧核对；`pi-telemetry` 未查。
