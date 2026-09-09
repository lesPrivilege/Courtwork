# EX-MA-R1 · 后端可测面（Luna 只读回执）

只读 `app/harness`、`app/server`、`app/runtime`、`app/tests`。探查在 `b4e3f71` 完成，`git diff 5b405b3 b4e3f71 -- app/ engineering/research/multi-agent-2026-09-10/` 为空。

## 一、接线实况

- 路由 `app/server/index.mjs:104-112`，非收件箱路由带任何查询串即 400（:106）。构造在 `app/server/service.mjs:137`，重启 `recover()` 在 `service.mjs:205`。
- 模型工具组合两处：inspector 报告面 `service.mjs:296`，实际执行面 `service.mjs:1179` → `governTools`（`service.mjs:1227`）。`read_only` 下 `message_other_agent` 由 `app/runtime/control-tools.mjs:22` 直接剔除，`hostToolCeiling`（`control-plane.mjs:29`）返回 deny。
- `capabilities` 三项 false 为硬编码（`coordination.mjs:27`）。
- **`app/harness/child-execution.mjs` 在生产上零调用方**：`git grep executeChild|narrowGrant|reduceFindings -- app/` 只命中模块自身、合同文字与测试。与合同"可执行符合性入口，非已安装调度器"一致，但意味着 C1/C2/C5/C6 今日的测试全部作用于无生产调用方的代码。

## 二、现有断言与名实之差

`app/tests/coordination.test.mjs` 222 行逐条核对后，三处名宽于实：

- "reply lineage requires a delivered reverse envelope, not an unrelated latest message"（:58）实际只测了**重复消费同一 `replyTo`**，未构造指向他线最新消息的反例；该更强主张今日只由 `coordination-state.mjs:54-57` 的结构校验兜住。
- "SIGKILL after outbox persistence recovers..."（:133-153）在 `enqueue()` promise 决议**之后**才发 kill，即持久化已完成，属干净重启，不是写入中途撕裂。名称本身准确，但不可外推为"崩溃安全"。
- `reduceFindings` 的 `conflicts` 是调用方字符串的并集透传（`child-execution.mjs:16-27`），唯一真检测是同 `executionId` 矛盾抛 `child_conflict`（:23）。测试 :97 断言的是 fixture 自带的 `'unresolved'` 存活，不是检测出冲突。

**全无覆盖的活代码路径**：`runtimeDirectory` 的 global 分支（`coordination.mjs:31`）；runtime 发送的跨 scope 守卫（:84）；domain 绑定守卫 `!caller.extensionBinding`（:83）；coordination 写入中途的撕裂恢复。

## 三、缺口三分

**(a) 今日即可测，无需改生产代码**

1. global scope 目录与跨 scope 发送：合同对全局 Attention 的两条主张今日只靠读代码成立，无测试。建 `scope:'global'` 会话即可覆盖。
2. domain 绑定守卫：既可从组合面断言 extensionBinding 会话拿不到三工具（`service.mjs:296`/`:1179`），也可直接以伪造 `runtimeOrigin` 调 `enqueue` 断言 `coordination_binding`。MA-05 的"domain 输入覆盖"一半今日就能关。
3. reply 血缘的对抗性反例：补指向非反向已投递消息的用例。

**(b) 需新 fixture，不需改生产代码**

4. coordination 写入撕裂恢复：`Coordination.mutate` 经 `store._mutate` → `_persist`，通用崩溃点 `store.mjs:327`（`SE_TEST_MODE=1` + `SE_TEST_CRASH_POINT=store_write`）对其同样生效，体例见 `async-recovery-independent.test.mjs:28-45`。限度：崩溃点限定词只有 `with-run`/`empty`，测得的是通用撕裂安全，不能声称是 coordination 专属崩溃点。
5. MA-02 的 vendor 对比 fixture：跨两套 SDK 跑同一组性质，体例可参 `coordination.test.mjs:189-211` 的 `git show <sha>:app/...` + 动态 import。

**(c) 被生产代码阻塞**：C1 持久 child intent 与 provider query（`executeChild` 是纯内存函数，无 store 参数、无 runtimeRef 字段）、native lane adapter 注册表、Matter policy 交集与审批升级、handoff（只支持 `mode:'invoke'`）、Core proposal 消费方、typed evidence anchors、broker/外部效应、OTel（`app/` 内零命中）、Workflow。C9 的"模型确实读到"按合同本就不可由 delivered 推断，属明示不主张，不是缺口。

## 四、测试体例

- 每个用例自建 `mkdtemp` 数据目录并 `finally` 清理；端口一律 `port:0`。
- `boot()`（`app/tests/helpers.mjs:11-56`）起真服务器并装 fake 凭据；`reopen()`（:141-151）对既有数据目录起第二个进程；`spawnWorker()`（:71-138）起真子进程并可 `SIGKILL`。
- 确定性模型行为靠 `/fixture script <JSON>` 前缀（`fake-provider.mjs:76-85`）与 `h.scriptInput(calls)`（`helpers.mjs:51-53`）。
- **fixture 复制清单**在 `app/tests/renderer-admission.test.mjs:16` 的目录数组。它按目录整体递归复制，故在 `app/harness/` 内新增文件不需改；只有在 `app/` 下新增被生产代码 import 的顶层目录才须再改这个数组。首片 436/437 的那次失败正是新增 `harness` 顶层目录未入清单。
- 全量时长以证据日志 `evidence/multi-agent-20260910/integration-tests.log` 记为 446/446、60.6s（作者在 `c1f2122` 的运行，Luna 未复跑）。

## 五、风险

- 加固 `child-execution.mjs` 等于加固今日无生产调用方的代码，投入产出须先裁。
- `coordination.mjs:83-84` 两条守卫今日只能经直接调用 `enqueue` 伪造 origin 触达（模型工具路径根本不为 extensionBinding 会话组合），无法判定其属纵深防御还是无人看管的可回归路径。
