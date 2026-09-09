# WO-MA2-01 · coordination 后端测试补齐

派单人 Fable，执行 `opus-wo-medium`。裁定见 [本轮 README](README.md) MA2-D04/D05/D06/D07/D08，现状与钩子见 [EX-MA-R1](explore/ex-ma-r1-backend-testability.md)。基线 `964c37f`。

**这一片要证明的事**：合同里关于全局 Attention、domain 绑定与崩溃恢复的几条主张，今日只靠读代码成立。本片把其中今日可测的部分变成测试证据，并把三处名宽于实的既有测试收敛到名实相符。不是加固功能，是把已有主张钉住。

## 0. 写权与红线

- 隔离工作树 `/private/tmp/se-ma2-tests`，分支 `claude/ma2-backend-tests`，`app/node_modules` 已软链到主树。需要起服务时端口一律 `port:0`，数据目录一律 `mkdtemp`；**不要**占用 8804/8816/8818/8930 等既有端口。
- **写权**：`app/tests/coordination.test.mjs`、至多一个新测试文件、本单交付文档 `engineering/research/multi-agent-2026-09-10/round2/delivery-ma2-01.md`。
- **不得**改 `app/harness/**`、`app/server/**`、`app/runtime/**`、`app/web/**`、`app/core/**`。测试若暴露实现问题，写进交付文档并留在那里，**不改生产代码来让测试变绿**（MA2-D04）。
- 不得新增依赖。不得改既有测试的断言以迁就新测试。
- 不碰 `app/harness/child-execution.mjs` 及其测试（MA2-D07：该模块今日零生产调用方）。

## 1. 六项

行号取自 `b4e3f71`，主线已前移，**按符号定位，不要信行号**。

**T1 全局 scope 的目录与跨 scope 发送。** `runtimeDirectory` 的 `s.scope==='global'` 分支与 runtime 发送的 `caller.scope==='global' || same(...)` 守卫都是活代码，今日零覆盖。建 `scope:'global'` 会话（体例见 `coordination.test.mjs` 的 schema6 迁移用例，或 `POST /sessions` 带 `scope:'global'`），覆盖：全局会话的目录跨 scope 可见、但拿不到他线收件箱正文；全局会话跨 scope 发送成功且仍走一次人类权限决定；项目会话跨 scope 发送被拒。

**T2 domain 绑定守卫。** `enqueue` 的 `!caller.extensionBinding` 今日只能从直接调用触达。两侧都测：组合面上 extensionBinding 会话拿不到三个工具（inspector 与逐 Run 组合两处）；直接以伪造 `runtimeOrigin` 指向 domain 绑定会话调 `enqueue`，断言 `coordination_binding`。

**T3 reply 血缘的对抗反例。** 既有用例只测了重复消费同一 `replyTo`。补：`replyTo` 指向目标线最新的一条**同向**消息、指向未投递消息、指向不存在 ID——三种均须拒绝。

**T4 coordination 写入中途的撕裂恢复。** `Coordination.mutate` 经 `store._mutate` → `_persist`，通用崩溃点在 `store.mjs` 的 `maybeCrash("store_write", ...)`。以 `SE_TEST_MODE=1` + `SE_TEST_CRASH_POINT=store_write` 起子进程（体例见 `async-recovery-independent.test.mjs` 的 `startCrashHost`），在 `enqueue`／`deliver` 期间崩溃后重开，断言：状态字节仍可校验通过；同键重发返回同一回执；收件箱不出现半条或重复消息。**限度写进交付文档**：崩溃点限定词只有 `with-run`/`empty`，测到的是通用撕裂安全，不得写成"coordination 专属崩溃点"。

**T5 `/web/*.mjs` 静态白名单机械对表。** `app/server/index.mjs` 里那个字面数组决定 `/web/*.mjs` 能否被取到，今日**无任何测试与磁盘对表**，漏加只在浏览器里静默 404。补双向断言：磁盘上 `app/web/*.mjs` 每个文件都在白名单里；白名单里每一项都在磁盘上存在。目录（`vendor/`、`skins/`）与非 `.mjs` 资源按实际路由规则处理，例外要在测试里写明理由。若立刻查出现有不一致，**不改生产代码**，记进交付文档。

**T6 三处名实收敛。** 逐项二选一（补反例，或改名到与断言相符），并在交付文档写明选了哪个及理由：reply 用例名称中的"unrelated latest message"（T3 若已补足即名实相符）；SIGKILL 用例实为持久化完成后的干净重启，非撕裂（T4 落地后两者关系要在名称上分清）；`reduceFindings` 的 `conflicts` 是调用方字符串并集透传，唯一真检测是同 `executionId` 矛盾抛 `child_conflict`，测试名不得读作"检测出冲突"。

## 2. 验收

- 先在本片基线跑一次全量 `node --test tests/*.test.mjs ../tests/*.test.mjs`，记下数目；改完再跑，记 before/after。主线刚并入 governance 一片，基线数目以你自己这次为准，不要沿用别处的 446。
- `npm --prefix app run smoke` 通过。
- 本片无 UI 改动，不跑颜色/材质 lint。
- 交付文档逐项记：每项测了什么、断言落在哪个符号上、限度是什么、以及所有"暴露但未改"的实现问题。今日确实不可测的项写明原因并留空，**不得伪造通过**。
- 不合流。完成后停在分支上等复核。
