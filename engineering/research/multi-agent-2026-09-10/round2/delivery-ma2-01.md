# WO-MA2-01 交付 · coordination 后端测试补齐

执行 Opus（`opus-wo-medium`）。工作树 `/private/tmp/se-ma2-tests`，分支 `claude/ma2-backend-tests`，基线 `964c37f`。未合流，未 rebase，未 push；主树 `/Users/lesprivilege/Projects/Courtwork` 未动。

**写权用掉三处**（与工单一致，无第四处）：

- `app/tests/coordination.test.mjs`（改：新增七个用例，扩写一个既有用例，改两个用例名）
- `app/tests/static-web-manifest.test.mjs`（新建，唯一的新测试文件）
- 本文件

生产代码一行未改。`app/harness/child-execution.mjs` 未动，其测试的断言未动（只改了测试名，见 T6-c）。

## 回归记数

| | 命令 | 结果 |
|---|---|---|
| before（基线 `964c37f`，本次自跑） | `node --test tests/*.test.mjs ../tests/*.test.mjs` | **467/467**，0 失败，57.3s |
| after | 同上 | **476/476**，0 失败，97.0s |
| smoke | `npm --prefix app run smoke` | passed（`local-fake`，七项 check，`realProvider: not_run`） |

净增 9 个用例（coordination 7 + 新文件 2）。本片无 UI 改动，未跑颜色/材质 lint。

## 逐项

### T1 全局 scope 的目录与跨 scope 发送 —— 已测

三个用例，一个单元两个、一个 HTTP：

**`global Attention directory spans scopes; it never yields another mailbox body or membership`**（单元）
断言落在 `app/harness/coordination.mjs` 的 `runtimeDirectory`：`s.scope === 'global' || same(t.scope,sessionScope(s))` 这个分支，以及它末尾那个只取 `{id,title,scope,revision,status,available}` 的 map。
测到：全局会话的目录含三条线（两条 project + 一条 global），项目会话的目录仍只有两条；目录条目的键**恰好**是那六个（`assert.deepEqual(Object.keys(entry).sort(), …)`），故 `sessionIds` 与 `creation` 回执不会随目录漏出；目录序列化后不含任何消息正文与成员 Session ID；全局会话读他线邮箱 `mailbox(ta,{sessionId:g})` 仍被 `member()` 挡回 `coordination_binding`。

**`runtime cross-scope sending is Attention-only; a project Run is refused at that guard alone`**（单元）
断言落在 `enqueue` 的 `check(caller.scope === 'global' || same(source.scope,target.scope), 'Cross-scope runtime messaging requires Attention', 'coordination_binding')`。四条：全局会话带 `runtimeOrigin` 跨 scope 发送 delivered 且 `actor==='runtime'`、`sourceRunId` 为真 Run；项目会话跨 scope 被拒，**并以错误文案 `/Cross-scope runtime messaging requires Attention/` 钉住是这一条守卫**（`coordination_binding` 这个码在同一函数里有四处，不加文案就分不清打中了哪条）；同一个项目 Run 同 scope 仍可发（证明被拒的是跨 scope 而不是这个 Run）；人类路径（不带 origin）跨 scope 允许，符合合同"Human cross-project communication is allowed as an explicit local-human operation"。

**`global Attention crosses scope through the model tool, still spending exactly one exact-argument decision`**（HTTP，真服务器 + fake provider）
路径是 `POST /attention/conversations` 建全局会话 → 两条线 → `POST /sessions/:id/runs` 脚本化 `message_other_agent`。断言落在 `service.mjs` 逐 Run 组合（`coordinationTools`）与 `runtime/control-tools.mjs:governTools` 的 `requestPermission`：Run 停在 `waiting_user`；**决定之前 `coordination.messages` 为空**；question 的 `payload.tool === 'message_other_agent'` 且 `payload.preview` 含目标线 ID 与原文（合同的"exact-argument human permission decision"）；allow 之后恰好一条 delivered、`actor==='runtime'`、source=attention、target=project；全程 `questions.length === 1`（一次发送一次决定）；收件方 Session **没有**任何 Run（无回调唤醒）。同一用例里还断言了模型目录两侧：全局会话 `['attention','project']`，项目会话 `['project']`。

**限度**：跨 scope 发送只测到 global→project 一个方向。project→global 的模型路径在这里不可达（它先被上面那条守卫拒掉），已用单元用例覆盖拒绝面。

### T2 domain 绑定守卫 —— 已测（两侧）

**`domain-bound Sessions receive no coordination tool at either composition site`**（HTTP）
真绑定 `evidence-memo`（`POST /extensions/evidence-memo/lifecycle` + `POST /sessions/:id/extension`），并给绑定会话与对照的未绑定会话**各建一条线**，先断言两者 `currentThreadId` 都存在——差别只在 `extensionBinding` 一项，否则测的就成了"没有线所以没有工具"。
两个组合面各自断言：
- inspector：`service.mjs:getRuntimeControl` 的 `additionalTools`，绑定会话的 `resources` 里没有 `tool:thread_directory|thread_mailbox|message_other_agent`，未绑定会话三个都在；
- 逐 Run：`service.mjs` 的 `const collaborationTools = !session.extensionBinding && … ? coordinationTools(…) : []`。观测方式是 `boot({fakeResponder})` 抓取 fake provider **实际收到的请求体里的 `tools`**，即真正交给模型的那张表，不是再读一遍生产代码的结论。绑定 Run 的工具表不含三者但仍含 `se_read_source`（证明这张表非空且确实是绑定会话的表），未绑定 Run 三者俱在。

**`a domain-bound Session cannot message from a Run even with a host-shaped origin`**（单元）
断言落在 `enqueue` 的 `check(!caller.extensionBinding, 'Bound domain messaging awaits coverage contract', 'coordination_binding')`，同样以错误文案钉死是这一条。用例里绑定**先于**建线（否则 `member()` 的 scope 比对会先抛同一个错误码，测试就打在了错误的符号上——这一点写进了用例注释）。另断言同一条消息不带 `runtimeOrigin` 时是允许的人类操作，且状态里没有留下任何 `actor==='runtime'` 的消息。

### T3 reply 血缘的对抗反例 —— 已测

扩写既有用例 `reply lineage requires a delivered reverse envelope, not an unrelated latest message`，断言落在 `enqueue` 的 `check(parent?.status === 'delivered' && parent.sourceThreadId === target.id && parent.targetThreadId === source.id, 'Reply origin unavailable', 'coordination_binding')`。现在四个反例：(1) 重复消费同一 `replyTo`（既有）；(2) 指向目标线最新的一条**同向**已投递消息，且这条从未被任何回复消费过——这是既有用例缺的那个反例；(3) 指向一条 `queued`（反向但未投递）的消息；(4) 指向不存在的 ID。(2)(3)(4) 都以 `/Reply origin unavailable/` 钉住符号。末尾断言全过程只落地了一条 `kind:'reply'`。

### T4 coordination 写入中途的撕裂恢复 —— 已测

两个新用例，共用装置 `crashDuringCoordinationWrite`/`tornWriteFixture`/`reopenAfterCrash`：

- `a crash inside the enqueue write leaves no half message; the same key then sends exactly once`
- `a crash inside the delivery write keeps the message queued; recovery then delivers it exactly once`

崩溃点是 `app/server/store.mjs` `_persist` 里的 `maybeCrash("store_write", state.runs.length > 0 ? "with-run" : "empty")`，即 tmp 写完与 rename 之间；以 `SE_TEST_MODE=1` + `SE_TEST_CRASH_POINT=store_write:empty` 起子进程。

**与 `async-recovery-independent.test.mjs` 的 `startCrashHost` 的差别，以及为什么必须这样**：那个体例起的是 `startServer`，而服务器启动本身就会持久化（`service.initialize()` 无条件调 `store.expireQuestionsForRestart()` → `_mutate` → `_persist`），会把崩溃点在到达 coordination 之前用掉。故这里的子进程只 `import` `RuntimeStore` 与 `Coordination`，直接调 `enqueue`／`deliver`；进程用 `--input-type=module -e` 内联，不新增文件（写权只允许一个新测试文件）。装置断言子进程确实死于 `SIGKILL` 且没打印 `SURVIVED`，否则用例失败——崩溃点没打中不会被当成通过。

三条断言（工单要求的三项）：
1. **状态字节仍可校验通过**：重开 `RuntimeStore` 成功（`open()` 会跑完整 `validateState` 与 `validateCoordination`），`schemaVersion === 8`；重开前先断言目录里存在半截 `runtime-state.json.<uuid>.tmp`（证明崩溃确实落在 write 与 rename 之间），重开后断言日志里有 `discarded 1 incomplete state write`（崩溃被明确记账，未被静默吞掉）。
2. **同键重发返回同一回执**：enqueue 撕裂后重发拿到 delivered 回执，再发 `deepEqual` 同一对象；deliver 撕裂后原键重发拿回的是留存的那条记录本身，消息总数仍为 1。
3. **收件箱不出现半条或重复**：enqueue 撕裂后 `messages` 为空数组（rename 未发生，整条入队都不在），随后只有一条；deliver 撕裂后消息仍是 `queued`／`revision:1`／`deliveredAt:null`，目标收件箱为空（未投递不可见），`recover()` 之后恰好一条 delivered，且总数仍为 1。

**限度（按工单要求明写）**：`store_write` 的限定词只有 `with-run`/`empty` 两种，它是 store 的**通用**写入崩溃点，不是 coordination 专属崩溃点。这两个用例证明的是"coordination 的写入落在通用撕裂安全之内"，**不得**外推为"coordination 有自己的崩溃点覆盖"或"coordination 崩溃安全已全面验证"。用例里 `empty` 限定词之所以够用，是因为装置刻意让状态里没有 Run；一旦将来同一路径上先有 Run 存在，这个限定词就选不中这次写入。

### T5 `/web/*.mjs` 静态白名单机械对表 —— 已测

新文件 `app/tests/static-web-manifest.test.mjs`，两个用例，断言落在 `app/server/index.mjs` 的 `STATIC` 表（Map 字面量的 `/web/...` 键 + `for (const name of [...]) STATIC.set(\`/web/${name}\`, …)` 那个循环）。

- 双向对表：磁盘上 `app/web/**/*.mjs`（递归，含 `vendor/`）与源码白名单里的 `.mjs` 项逐字 `deepEqual`；白名单里每一项（含两个 `.css`）都 `stat` 到真实文件。`STATIC` 未导出，故清单从源码文本取；用例断言那个循环的正则**必须**匹配到，源码改形导致提取不到时是失败而不是空跑。
- 行为面：起真服务器，磁盘上每个模块 `GET /web/<rel>` 都是 200 且 `content-type` 为 `text/javascript`。

**例外与理由（写在用例头注释里）**：`web/index.html` 不在 `/web/` 下取，由 `/` 与 `/index.html` 两个键提供；`web/skins/*.css` 根本不进路由，它是 `styles.css` 的同源对照文件，由 `settings-preferences.test.mjs` 逐字比对，产品从不请求它；`web/README.md`、`web/vendor/manifest.json`、`web/vendor/*LICENSES.txt` 是仓内说明与许可材料，同样不进路由。这三类以 404 断言钉住，免得日后被当成"没测过就可以随手加"。

**今日结论**：在 `964c37f` 上**未查出不一致**——22 个磁盘模块与白名单逐字相符，白名单无悬空项。

**限度**：同一张 `STATIC` 表里还有一段 `/brand/src/*.mjs`（三项，指向 `app/../brand/src`），本单按工单口径只对 `/web/*.mjs`，未纳入。它今日同样零对表，是留着的同类缺口。

### T6 三处名实收敛 —— 三处逐项处理

| 处 | 选择 | 理由 |
|---|---|---|
| reply 用例名里的 "unrelated latest message" | **补反例** | T3 已补足同向、未投递、不存在三种反例，名称现已名实相符，故保留原名不改。 |
| SIGKILL 用例的时点 | **改名** | 断言本身没问题（kill 发生在 `enqueue()` promise 决议之后，持久化已完成），问题只在与 T4 新增的撕裂用例并列时容易被读混。改为 `clean restart after the outbox write completed recovers exactly one local delivery without a Run`，并加注释说明它测的是干净重启后的重投递、撕裂由 T4 两个用例覆盖。断言一字未改。 |
| `reduceFindings` 的 `conflicts` | **改名** | 事实是调用方字符串的并集透传，唯一真检测是同 `executionId` 矛盾抛 `child_conflict`；补反例等于加固今日零生产调用方的模块，与 MA2-D07 冲突。改为 `child grant monotonically narrows; the reducer passes caller-supplied conflict strings through and refuses contradictory results for one execution ID`，并加注释写明透传与检测之分。**断言一字未改，`child-execution.mjs` 未动**。（工单 §0 说"不碰其测试"，§1 T6 又点名这一处；按 MA2-D08"按事实补足反例或改名"取改名这一侧，即只动名字不动覆盖面，两条约束因此都不破。若复核认为连名字也不该动，回退这一处即可，不影响其余各项。）

## 暴露但未改的实现问题 / 事实

按 MA2-D04，下列各条只记录，不动生产代码。

1. **`!caller.extensionBinding` 今日确属纵深防御，不是可回归的活路径。** T2 两侧同测的结果是：模型工具组合根本不为 domain 绑定会话组合这三个工具（inspector 与逐 Run 两处都不组合），故这条守卫只能由伪造的 `runtimeOrigin` 触达。EX-MA-R1 §五 的疑问由此可以定性了：它是第二道闸，不是无人看管的可回归路径。这不是缺陷，但意味着删掉它不会有任何测试变红（除了本单新增的那个直接调用用例）——现在有了。
2. **`coordination_binding` 一个错误码承载四种不同拒绝**（成员关系变更、domain 绑定、跨 scope、reply 血缘）。调用方无法按码区分原因，本单新增用例只能靠错误**文案**区分符号。文案属实现细节，前端若要据此分流会脆。记账，不改。
3. **人类 HTTP 的收件箱读取不做成员关系限权**：`mailbox(id)` 不带 `sessionId` 时跳过 `member()`，任何已知 Thread ID 都可读正文。这与 MA2-D12 与合同"they can inspect the local user's retained Threads across projects"一致，是有意为之，非缺陷；一并记明，因为它是前端片"只从已知列表显式选择"那条约束的真正来源——服务端不会兜。
4. **人类跨 scope 发送不经任何 scope 守卫**（`enqueue` 的两条守卫都在 `if (runtimeOrigin)` 之内）。同样与合同一致，但意味着"跨 scope 需要 Attention"只是对模型的约束，对本地人类操作不是。前端片若提供跨线发送入口，越权面由前端的选择范围决定。
5. **`/brand/src/*.mjs` 三项白名单今日零对表**（见 T5 限度）。它指向 `app/` 之外的 `brand/src`，漏改同样只在浏览器里静默 404。
6. **`store_write` 崩溃点没有 coordination 限定词**（见 T4 限度）。今日靠"状态里没有 Run"来选中目标写入；这不是稳定的选择器。要长期钉住 coordination 专属撕裂点，须在生产侧加限定词——那是改生产代码，本轮不做。

## 今日不可测、留空的项

无。工单六项均已落地为断言，无伪造通过，无空项。

（本单未触 (c) 类被生产代码阻塞的缺口，MA2-D06 已把它们排除在本轮之外。）
