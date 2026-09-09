# EX-MA-R3 · 前端消费接缝（Luna 只读回执）

只读 `app/web`、`app/server`、`app/tests`、`tools/` 与 `105458a^` 历史 blob。探查在 `b4e3f71` 完成，其与 `5b405b3` 之差为纯文档，未触 `app/web`、`app/server`、`app/harness`。

## 一、已撤出的原型做过什么

`git show 105458a^:app/web/coordination-view.mjs`：一个 `<details class="coordination-view">` 折叠面，纯 DOM，无框架。开合驱动 `load()`：`Promise.all(['/coordination','/sessions'])`，校验 `schemaVersion===1` 后推出 `current`/`target`/`join` 三组选项，再取 `/coordination/threads/:id?offset=&limit=20`。三个写动作分别打到 `POST /coordination/threads`、`.../attach`、`/coordination/messages`。

其中一条做法值得原样继承：**请求发出前先构造回执对象**（`crypto.randomUUID()` 生成 `threadId`/`messageId`），以闭包变量跨重试保持同一对象，从而在回执未知时能以逐字相同的载荷重放。合同要求的"未知回执后保留精确 message ID/载荷"就是靠这个对象身份实现的，不是靠重新推导。发送后文案直书 `Message ${status}. This does not start a Run.`，把 `queued|delivered|stale_target|target_unavailable` 与 Run 分开。

撤出改了四处：`attention-agent-view.mjs` 的 import、构造、`dialog.append(header, toolbar, [此处], stream, status, composer)` 与 `deactivate()`；`app/server/index.mjs` 静态白名单数组去掉 `"coordination-view.mjs"`；`styles.css` 去掉三条选择器。今日 `app/web`、`app/server` 内 `coordination` 零命中，接缝是干净空槽。

## 二、体例

- 无框架无 vdom。`ui-controls.mjs:10` 的 `el()` 建 DOM；`icon(name)` 对固定 Set 之外的名字直接抛 `Unknown static icon`（:24-46），是硬性字形准入。
- 重渲染靠手工签名比对：`attention-agent-view.mjs:79-86` 以 `JSON.stringify([...])` 比对后 `replaceChildren()`，并手工还原滚动位置、焦点、选区与 `<details open>`。
- 顶层视图不是插件注册，`app.mjs:6444-6445` 直接具名构造；`surface-modules.mjs:477-482` 的声明式注册只管右栏 Run/File/Workspace/Runtime 卡片，与 Attention 对话面无关。
- 取数只有一个 `request()`（`app.mjs:712-765`）：`API_BASE="/api/v5"`，`X-Work-Token` 头，401 自动 bootstrap 重试一次，非 2xx 抛带 `.status`/`.body` 的 Error。新模块经既有构造参数拿到同一个 `request`，不需另铺鉴权。
- 投影模块（`presentation-adapters.mjs`、`thread-projection.mjs`）为纯函数、不取数、遇不认识的形状返回 `null`；视图模块持 DOM 与取数。新消费面应照此分为纯投影 + 视图两文件。

## 三、挂载点

- composer 归 `attention-agent-view.mjs:33` 与 `attention-conversation.mjs:41-67`（`send()` 打 `PUT /sessions/:id/draft` 后 `POST /sessions/:id/runs`），是唯一写入对话的路径。
- transcript 归同文件 `stream`，由 `projectThread()` 从 `state.events`/`state.runs` 投影。`thread-projection.mjs:6-134` 只认固定事件词汇，Thread 消息不在 `state.events` 中，**不能折进 `projectThread` 的行模型**——这与合同"投递与 Run/Core 接受分开显示""不导入成员会话的模型 transcript"一致，是硬约束。
- 二级面接缝即原型所在的那一处 `dialog.append(...)`。`<details>` 折叠面不与 composer 争写焦点，不需改 `shell-layout.mjs` 或 `surface-modules.mjs`。
- 需改：`attention-agent-view.mjs`（构造/插入/`deactivate`）、新投影模块、新视图模块、`app/server/index.mjs` 白名单、`styles.css`。
- "单一 composer writer" 在代码中不是控件数目规则，而是交付序列化规则：同一时刻只有一条工作线对 `app/web/**` 有写权。落到本轮即：消费面作为既有 Attention 对话模块图内的增量，不另起第二条挂载线、第二个 `<dialog>`、第二处 `init()` 构造或第二条 `POST /sessions/:id/runs` 路径。

## 四、准入与检查门

- **静态白名单是硬 404 门**：`app/server/index.mjs:23` 的字面数组决定 `/web/*.mjs` 能否被取到。**`app/tests` 中没有任何测试拿这个数组与磁盘文件对表**，漏加只在浏览器里静默 404。这是本轮后端测试线可直接补的一项机械检查。
- `renderer-admission.test.mjs` 管的是 extension `renderer.mjs` 的另一条静态路由，不覆盖第一方 `app/web` 模块。
- `architecture-boundaries.test.mjs:99-113` 只约束 `core`/`runtime`/`renderer` 三个域的 import，**不覆盖 `app/web` 内部**。
- `ui-event-mapping.test.mjs` 名不副实，实为 `thread-projection.mjs` 的单元测试，与 Thread 消息不是同一事件域，不构成新模块须过的门。
- `chat-work-shell.test.mjs`、`home-presentation.test.mjs` 是**源码正则回归**：例如 `home-presentation.test.mjs:43-44` 数 `POST /sessions/:id/extension` 出现次数、:47-48 断言若干臆造端点名不得出现。这是本仓"写入路径计数"规则的既有代码形态；coordination 尚无对应测试。
- 颜色/材质 lint 不在 `npm test` 内（`app/package.json` 的 `test` 只跑 `node --test`），须单独执行：`tools/lint-colors.mjs:18-33` 禁 `tier:S` 之外的颜色字面量，:42-108 要求 `background` 落在固定角色 token 集或在 `FILL` 表登记；`tools/lint-materials.mjs:29-32` 要求 `backdrop-filter` 选择器在 `REGISTERED` 登记，:110-134 要求 `--glass` 与 `backdrop-filter` 各自还上 `prefers-reduced-transparency` 兜底。`tools/contrast-report.mjs` 只查其 `pairs` 数组内已枚举的角色对，新角色不自动纳入。
- `app/web/README.md:26-30` 的 UI 交接哈希清单为手工维护，改 `index.html`/`styles.css`/`app.mjs` 会使其过期；其引用的 `deferred/structural-checks/ui-v6-*.test.mjs` 在本 checkout 未找到（Luna 标为存疑）。

## 五、合同与服务端逐项对表

`app/docs/coordination.md` 所列端点、字段、枚举、容量与页大小，逐条在 `app/harness/coordination.mjs` 与 `coordination-state.mjs` 中核到实现：`capabilities` 硬编码 `{message:true,explore:false,handoff:false,workflow:false}`（coordination.mjs:27）；`readMailbox`（:113-119）对 `offset`/`limit` 之外的查询键失败关闭；`kind`/`replyTo` 互斥、text ≤16000、ID/title ≤200、256/64/1024 容量均一致。**未发现文档与实现的差异。**

消费者相关的一处不对称：人类 HTTP 的 `readMailbox` 不接 `sessionId`、不按成员关系限权，任何持 work token 者可读任一 Thread ID 的收件箱；这与合同所述人类 API 权限一致，但意味着**服务端不为前端兜住越权 Thread ID**，"只从已知列表显式选择"是人类层唯一边界。
