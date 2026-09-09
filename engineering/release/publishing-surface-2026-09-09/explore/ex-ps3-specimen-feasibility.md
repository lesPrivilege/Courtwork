# EX-PS3 · 互动标本可行性：纯静态重放一段已记录的工作

Sonnet，只读 explore，可起服务。2026-09-09。基线 Courtwork `main` `172130e8d0ba1e6642e967ac0c1e0938e221d4a8`（worktree `<isolated-checkout>`）。

**状态：直接可消费**（表内已含转录值、file:line 与实测字节数，不需再查原文件；唯一需要复核的是「未核实项」列标注的几行）。

## 卷首

**只读声明**：本次 explore 未修改、未创建仓内任何文件（本文件除外）。启动过一次本地服务：`node server/index.mjs`，`SE_RUNTIME_DATA_DIR=/private/tmp/se-fable-ps-ex3-data PORT=8906`，仅监听 `127.0.0.1:8906`；所有请求均为 `curl http://127.0.0.1:8906/...`，未访问任何外部 URL，未使用任何真实凭据（`provider-credential` 写入的是 README 记录的公开常量 `fake-local-loopback-key`）。服务已停止（`kill`），数据目录 `/private/tmp/se-fable-ps-ex3-data` 已删除。`app/node_modules` 此前不存在，已从 `./app/node_modules` 复制（未触碰该源目录本身）；`git status --short` 在复制后为空，说明 `node_modules` 属仓内 `.gitignore` 忽略范围，未产生仓内改动。

**基线漂移**：读取过程中 worktree 的 `main` 从 `172130e` 前进到 `4acabb9`、再到 `0741d2e`（另一并行 Sonnet 会话提交了 EX-PS4 回执与本批文档，`git diff --stat 172130e HEAD` 显示改动全部落在 `engineering/release/publishing-surface-2026-09-09/**`，不涉及 `app/**`）。本卷引用的所有 `app/`、`docs/` 文件字节与下表 sha256 一致，未受影响。

**来源文件与 sha256**（读取时状态，均为 `172130e` 下字节，经上条核实未随后续提交改变）：

| 文件 | sha256 | 字节 |
|---|---|---|
| `app/web/app.mjs` | `958e033de234a44f2bfd88b00f43e1ec6a00a2c7835907c16d95c8f28bf225d6` | 225432 |
| `app/web/thread-projection.mjs` | `3cb84b522fa955d1233fca13be179203a078f2dc2361e17ef2a107b90095dd64` | 6472 |
| `app/web/presentation-adapters.mjs` | `7f84ffa9f2ce957a8081d6b67a2eea1d982c3cfa4edbfa92d04770c0d72bc5b3` | 7389 |
| `app/web/surface-modules.mjs` | `2409c1a732d573ff7f89f63009f65f7e66a349c33da99e464021163419e86d15` | 40646 |
| `app/web/user-message.mjs` | `f15f404df2cdeb2464c25a92f11fb6f6854b1a0a8512ec7b71d40fd1e3129200` | 1366 |
| `app/web/workspace-view.mjs` | `ea51d3b1f001c7cda704010da262dd8b13f89b096acbfc7e19b295006c600e5a` | 4546 |
| `app/web/runtime-view.mjs` | `5b3693f6d995669824ad7361019d03a4c0bf439290d470e2cf5fcee8b949e8e2` | 106415 |
| `app/web/inspector.mjs` | `3e6b1cda8e939c8182b027309315d8950f03f12944b93dafb3a52d5e7a33ee6f` | 14599 |
| `app/web/ui-controls.mjs` | `b873fa68cb202fc0bdb178cb7aea3d5df909d143e05deec4190837f811fbf4e2` | 12142 |
| `app/web/index.html` | `a8e23d61840819049837fae8df731382b70a2250d13a9fbee59bff65322f5ffa` | 32723 |
| `app/web/styles.css` | `c09a829b4a30c9c9409910f79eaf4ce99fc1d1d93aaac54a68deae2012793272` | 124199 |
| `app/extensions/inbound-nda/index.mjs` | `ea74dcb49710259e9b5de489d882be64cb20286eb80c46d35596a26d17092274` | 4654 |
| `app/extensions/inbound-nda/renderer.mjs` | `7e1f2095bd1d970960f2bfdb9f48ac4028f6bcc14b035d1ae0178c9fd6b85ef6` | 14940 |
| `app/domains/inbound-nda/index.mjs` | `8e9541ea1d622821b9e325e9ebcc35f873480bd998597b15fc291e73bc3bfb04` | 27966 |
| `app/domains/inbound-nda/fixtures.mjs` | `8c4e6331b18c1e00efa2e8e465973edd4bc829e31d0af93cf9e68625656c9d7f` | 13413 |
| `app/domains/inbound-nda/rules.mjs` | `bb8857f2a641e3e82ef71a318cb37ac504e583f58be458abe35c5ff1b05fdaa6` | 2891 |
| `app/domains/inbound-nda/constants.mjs` | `fd4bf35eec310085eef8011592950494791df3ef9bef508e65e3e0c1dfca4c5f` | 512 |
| `app/domains/inbound-nda/serialization.mjs` | `c65629e0447774f0adf877aab832bf2880172cc593d71482c4afaba3d2ce72d8` | 558 |
| `app/tests/helpers.mjs` | `807ae1c590c9081fbba9d851a6a8286cabb4a77580488c60923f08d05f68b532` | 6847 |
| `app/scripts/work-core-fixture.mjs` | `67abff0d8591740e3ecbe7948771ca065b5e63bfe250da2e2e287c7d304ddbd2` | 3344 |
| `app/tests/fixtures/work-core/nda-packets.json` | `0defdc38ae440278e731e4a1c10c76f22840957e327c7910caee4578719343b7` | 133300 |
| `app/docs/api-v6.md` | `353b1dcef181b05632938621d973fd6c152cc8da59699e5b101aa5ef9ef4b0bf` | 17535 |
| `docs/runtime-control/api.md` | `e5db337ec880647451fa8d098a6e6650bb86b0693eaf0f067ced4abd3956d982` | 5438 |
| `app/server/index.mjs` | `f8980d10a36210d27c2643248581f7702ededf77c3e6cb0a928490619f48c78a` | 15623 |

`app/web/*.mjs` 之外也读取了 `home-view.mjs`、`materials-view.mjs`、`settings-view.mjs`（工单许可的 `app/web/*.mjs` 通配范围内，工单来源清单未单列，未列 sha256，仅作交叉参照）。

**未启动的服务 / 未访问的 URL**：除 `127.0.0.1:8906`（本卷自建）外，未启动任何服务；未访问任何外网 URL。

---

## 表 1 · 模块表（`app/web/*.mjs`）

「fetch/依赖 `/api/v5`」列只统计字面量 `fetch(` 与 `/api/v5` 出现次数（非经其他模块转发调用）；「host 状态依赖」列区分「直接读写」与「经宿主注入回调，模块本身不触碰」。

| 文件 | 主要导出 | fetch / `/api/v5` | 可对一份 JSON 投影纯渲染 | 依赖的宿主状态 | `/web/` 绝对路径引用数 |
|---|---|---|---|---|---|
| `app.mjs` | 无显式 `export`（顶层脚本，DOMContentLoaded 启动） | 是：`fetch(` ×1（`app.mjs:713`），`API_BASE="/api/v5"`（`app.mjs:67`）| 否——是编排层本身，持有 token、轮询、路由 | 直接读写：`window.localStorage`（`app.mjs:240-255`，UI 偏好）、`window.sessionStorage`（`app.mjs:194,280,295,5913`，草稿/命令历史）、`bootstrap.sessionToken`（`app.mjs:736-737,1140,6034`） | 0 |
| `thread-projection.mjs` | `projectThread(events, runs, sessionId)`、`canAnswer`、`validPermission`、`permissionPresentation` | 否 | 是——纯函数，输入 `events[]`/`runs[]` 输出行对象 | 无 | 0 |
| `presentation-adapters.mjs` | `toStatTiles`、`toWorkCards`、`toPendingRows`、`toInspectionRows` | 否 | 是——纯函数，输入 `work-summary` 快照 | 无 | 0 |
| `surface-modules.mjs` | `surfaceModule`、`surfaceSlot`、`workPacket`、`candidateActions`、`renderWorkPacket`、`shortRef`、`decisionActionWords` | 否 | 是——`workPacket(projection)`/`renderWorkPacket(packet, hooks)` 直接消费 `surface` 端点的 `projection` | 无（`hooks` 由调用方注入） | 0 |
| `user-message.mjs` | `renderUserMessage(row, {onCopy, onEdit})` | 否 | 是 | 无 | 0 |
| `workspace-view.mjs` | `renderWorkspaceFilesView(container, {files,onFile,onMaterials,onRefresh})`、`renderSessionOverview`、`renderRunHistory` | 否 | 是——`files` 数组直接传入 | 无 | 0 |
| `runtime-view.mjs` | `createRuntimeView(...)`、`renderContextBar`、`renderRecordedContext(payload)`、`admittedCharacters`、`hasParentGate` | 否 | `renderRecordedContext(payload)` 是——直接消费 `runtime-context` 端点整份返回值；`createRuntimeView` 否，是带轮询/请求回调的编排壳 | `createRuntimeView` 经参数接收请求回调（未直接触碰 token） | 0 |
| `inspector.mjs` | `formatBytes`、`renderRun(...)`、`noticeText`、`validateFilePayload`、`createFileView(container,{request})` | 否（`fetch` 由 `request` 回调持有，不在本文件内） | `renderRun`/`formatBytes`/`noticeText` 是纯函数；`createFileView` 否——需要宿主注入的 `request` 回调去打 `workspace/file` 或 `artifacts/file`（`inspector.mjs:325-345`） | `createFileView` 经 `request` 回调间接依赖宿主网络层 | 0 |
| `ui-controls.mjs` | `el`、`icon`、`flowRow`、`action`、`copyAction`、`markdown`、`anchorPopover`、`installTooltips`、`sessionMode*` | 否 | 是——纯 DOM 构造 | 无 | 1（`icon()` 内 `` `/web/vendor/icons.svg#${name}` ``，`ui-controls.mjs:74`） |
| `home-view.mjs`（通配范围内，非工单显式来源） | `renderHomeBand`、`renderHome` | 否 | 是 | 无 | 0 |
| `materials-view.mjs`（同上） | `createMaterialsView({request,getSession,onOpenFile,notify})` | 否（`request` 回调持有） | 否——需要宿主 `request`/`getSession` 回调 | 经回调间接依赖 | 0 |
| `settings-view.mjs`（同上） | `createSettingsView`、`readPreferences`、`writePreferences`、`createSettingsPage` | 否 | 大部分是；`writePreferences` 否 | 直接读写：`globalThis.localStorage`（`settings-view.mjs:1237`，经 `globalThis.__cwPrefs` 中转） | 0 |

**观察**：全部 `fetch(` 与字面量 `/api/v5` 只出现在 `app.mjs` 一处（`app.mjs:713`、`app.mjs:67`）；其余 11 个视图/投影模块无一处直接调用 `fetch`，均以「宿主传入数据或回调」为界面——这与 `app/extensions/inbound-nda/renderer.mjs` 的 `mount({container,projection,dispatch,signal,query})` 是同一设计（见表 5）。唯一的绝对 `/web/` 路径引用不在 `app.mjs`，而在 `ui-controls.mjs:74` 的图标 `href`。

---

## 表 2 · 三层数据源表

| 层级 | 端点 / 文件（实测字段） | 样本大小 | `nda-packets.json` 覆盖 |
|---|---|---|---|
| Event log | `GET /api/v5/sessions/:id/events?afterSeq=N` → `{events:[{seq,runId,sessionId,type,data}],nextSeq}`；`GET /api/v5/sessions/:id` 首屏另带 `{session,events,runs,lastSeq}` | 实测：一次 `se_submit_candidate` 提交产生 17 条事件、19635 字节（`/tmp/events.json`，本会话生成，未入库）；一次 `ask`-模式 `ws_write` 产生 11 条事件、14788 字节，含 1 条 `permission.open`（`toolCallId,tool,path,bytes,contentSha256,preview`，见 `docs/api-v6.md` 「Permission cards」小节） | **未覆盖**。`nda-packets.json` 顶层键为 `schemaVersion,fixtureVersion,dataClass,decision,revision,pending,accepted,revised,history`（`work-core-fixture.mjs:23`），其中 `decision`/`revision` 是**客户端发出的动作载荷**（`extensionId,generation,action,payload`），不是服务端事件流；文件内没有任何 `seq`/`type`/`data` 结构 |
| Work state | `GET /api/v5/sessions/:id/surface` → `{extension,projection}`，`projection` 含 `domain,matter,title,sources,candidates,artifact,draft,decisions,runs,evidence,stateVersion,readOnly,compatibility,humanActions` | `nda-packets.json` 内 4 份快照实测字节（JSON 序列化后）：`pending` 18614 · `accepted` 19893 · `revised` 28582 · `history` 26838，总计约 93927 字节，占全文件 133300 字节的约 70% | **已覆盖，四份**：`pending`（提交后、决定前）、`accepted`（accept 决定后）、`revised`（revise_candidate 后）、`history`（扩展 `unload` 后的只读态） |
| Compiled context | `GET /api/v5/runtime-context?sessionId=<id>&runId=<id>` → `{mode:"recorded-run",runId,binding:{revision,hash,composition,resources[],content[],policies[],context[]},loaded[],tokenUsage,legacyWithoutControlSnapshot}`（`docs/runtime-control/api.md` 「Example sequence」「Admission and provenance detail」两节） | 实测：对本会话生成的一次 run 请求该端点，返回 12672 字节（`/tmp/rc-hist.json`，本会话生成，未入库）；`binding.context` 与 `loaded` 在 fake responder 单工具调用场景下均为空数组，`tokenUsage` 为 `{input:2,output:3,cacheRead:0,cacheWrite:0,turns:2,missing:false}` | **未覆盖**。`nda-packets.json` 不含任何 `runtime-context`/`compiled context` 字段；`work-core-fixture.mjs` 全文没有调用过 `/runtime-context` |

**观察**：`nda-packets.json` 是一份「Work state 专用」fixture，Event log 与 Compiled context 两层目前没有任何固定 sha256 的仓内样本；两层的形状只能从 `docs/api-v6.md`／`docs/runtime-control/api.md` 的文档与本卷的一次性实测（未持久化、未入库）得到。

---

## 表 3 · 捕获脚本轮廓（事实陈述，非代码）

沿 `tests/helpers.mjs` 的 `boot()` 与 `work-core-fixture.mjs` 的调用序列，若要一次性录下「事件列表 + 每步 surface 投影 + 记录的 context + 文件列表」，观察到的调用序列与落盘键如下：

| 步骤 | 端点 / 动作 | 顺序位置 | 建议落盘键（观察产品已给出的字段名） |
|---|---|---|---|
| 1 | `boot()` 内部 `startServer` + `PUT /provider-credential`（`fakeResponder`/`fake-openai-loopback`） | 最先（`helpers.mjs:11-27`） | 不落盘（凭据非展示对象） |
| 2 | `POST /projects` | `helpers.mjs:29-30` | 不必落盘（specimen 不需要展示 project 创建） |
| 3 | `POST /sessions`（Chat 场景：默认 `draft`；Run 场景若要出现 `permission.open` 需 `permissionMode:"ask"`，本卷实测确认，见表 2 行 2 备注） | `helpers.mjs:32-35`，`work-core-fixture.mjs` 用默认 | `session`（原样，`session.id/workspaceDir/permissionMode` 供 File 层路径核对） |
| 4 | （仅 候选/决定 场景）`POST /extensions/inbound-nda/lifecycle {action:"load"}` | `work-core-fixture.mjs:10` | `extension.surface.module` 落盘供渲染 ABI 复核（表 5） |
| 5 | （仅 候选/决定 场景）`POST /sessions/:id/extension {extensionId,input:{title,sourceText,facts}}` | `work-core-fixture.mjs:11` | 不必落盘（绑定确认信息已含在后续 surface 里） |
| 6 | `GET /sessions/:id/surface`（绑定后，构造 `domain` 用） | `work-core-fixture.mjs:12` | 若要展示"绑定后、Run 之前"一帧，落 `surface.bound` |
| 7 | `POST /sessions/:id/runs {commandId, input}`——本卷验证：`input` 既可以是自然文本（真实模型场景），也可以是 `/fixture script [...]` 前缀 + JSON 数组（`tests/helpers.mjs:51-53` 的 `scriptInput`；`runtime/fake-provider.mjs:76` 前缀常量） | `work-core-fixture.mjs:14`（inbound-nda 用例）；`tests/durability.test.mjs:213`、`tests/control-plane.test.mjs:104` 等（`ws_write`/`ask_user` 用例） | `run`（创建即答的响应体） |
| 8 | 轮询 `GET /runs/:id` 至终止态（`pollRun`，`helpers.mjs:39-48`）；若 `status==="waiting_user"`，需要 `GET events` 找到 `permission.open`/`question.open` 的 `id` 并 `POST /runs/:id/questions/:qid {decision|answer}`（本卷实测：`ask` 模式下 `ws_write` 触发 `permission.open`，见表 2） | `helpers.mjs` 未内置该分支；本卷手写验证（`/tmp/events2.json` 第 10 条事件） | `run.final`；`events` 全量（见步骤 9） |
| 9 | `GET /sessions/:id/events?afterSeq=0` | 每个 run 结束后各取一次 | `events`（Event log 层，逐 run 一份或累加一份） |
| 10 | `GET /sessions/:id/surface`（每个动作后各取一次：绑定后 / run 完成后 pending / decide 后 accepted / revise_candidate 后 revised / unload 后 history——`work-core-fixture.mjs:15,19,22,26` 的既有序列） | 每次状态转移后 | `surface.<state名>`（Work state 层，命名沿用既有 `pending/accepted/revised/history`） |
| 11 | `GET /runtime-context?sessionId=&runId=`（每个 run 各取一次；本卷实测字段见表 2） | run 完成后 | `context.<runId>`（Compiled context 层） |
| 12 | `GET /sessions/:id/workspace`（File 层：`{tree:[{path,bytes,sha256,mtime}]}`，`docs/api-v6.md` 「Workspace」节） | 有 `ws_write` 落地后 | `workspace.tree` |
| 13 | `GET /sessions/:id/workspace/file?path=...`（当前文件）或将来 `GET /sessions/:id/artifacts/file?...`（内容版本，`docs/api-runtime-mx-r1.md` 提及但本卷未读取该文件，未核实其确切路径分段） | 对 `workspace.tree` 里每个要展示的文件 | `workspace.files.<path>` |
| 14 | （若剧本含"Continue in Work"）`POST /sessions/:id/actions {extensionId,generation,action,payload}` | `work-core-fixture.mjs:17,25`（`decide`/`revise_candidate`） | `decision`/`revision`（沿用既有键名） |
| 15 | 结束：`POST /extensions/inbound-nda/lifecycle {action:"unload"}` + `h.runtime.close()` + 删除 `dataDir` | `work-core-fixture.mjs:27,30` | 不落盘 |

**未核实项**：步骤 13 提到的 `GET /sessions/:id/artifacts/file`（内容版本读取路径）只在 `docs/api-v6.md` 「MX-R1 runtime increment」一段的文字描述中出现（"`GET /api/v5/sessions/:id/artifacts/file`"），本卷未实测调用该端点，也未读取 `docs/api-runtime-mx-r1.md` 的完整字段表（该文件不在工单只读清单内）。

---

## 表 4 · 子路径核对（`/web/`、`/api/`、`url(/` 绝对引用）

对 `app/web/index.html`、`app/web/styles.css`、`app/web/*.mjs`、`app/extensions/inbound-nda/*.mjs`、`app/extensions/evidence-memo/*.mjs` 做穷举 grep（含三种引号/模板字符串），命中 7 处：

| file:line | 原文 | 说明 |
|---|---|---|
| `app/web/index.html:8` | `"/web/styles.css"` | `<link>` 引用 |
| `app/web/index.html:877` | `"/brand/src/court-symbol.mjs"` | 品牌模块动态 import |
| `app/web/index.html:878` | `"/web/app.mjs"` | 主入口 `<script type="module">` |
| `app/web/app.mjs:67` | `const API_BASE = "/api/v5"` | 全部 API 调用的前缀常量 |
| `app/web/ui-controls.mjs:74` | `` `/web/vendor/icons.svg#${name}` `` | `icon()` 内 `<use href>`，唯一一处非 `app.mjs`/`index.html` 的绝对路径 |
| `app/extensions/inbound-nda/renderer.mjs:21` | `"/web/ui-controls.mjs"` | ES module import |
| `app/extensions/inbound-nda/renderer.mjs:28` | `"/web/surface-modules.mjs"`（`import {...} from` 起始行；实际 specifier 在其后续行） | ES module import |

`app/web/styles.css` 内 `url(/` 计数为 0；`app/extensions/evidence-memo/*.mjs` 内三类绝对引用计数为 0（该 renderer 无 import 语句，纯闭包函数）。

**观察**：7 处引用全部是「根相对路径」（以 `/` 开头，未带任何前缀）。产品 server 把这些路径挂在域名根（`server/index.mjs:14-28` 的 `STATIC` Map 键即 `"/"`、`"/web/..."`、`"/api/v5..."`、`"/brand/src/..."`），若原样部署到 `https://<user>.github.io/Courtwork/` 子路径，浏览器会把这 7 处解析到 `https://<user>.github.io/web/...`（丢失 `/Courtwork/` 前缀），全部 404。

---

## 表 5 · 渲染 ABI

`app/extensions/inbound-nda/renderer.mjs` 导出单一函数：

```
mount({ container, projection, dispatch, signal, query } = {}) → { update(next), dispose() }
```

- `container`：DOM 节点，要求 `typeof container.replaceChildren === "function"`（`renderer.mjs:64-65` 的显式校验，否则抛 `TypeError`）。
- `projection`：即表 2「Work state」层 `surface` 端点返回体里的 `projection` 字段（不是整个 `{extension,projection}`），可为 `null`（渲染"No read-only projection is available yet."占位，`renderer.mjs:352-360`）。
- `dispatch`：`async (action, payload) => receipt`，要求 `typeof dispatch === "function"`（`renderer.mjs:66`）；仅在用户点击 `decide`/`revise_candidate` 按钮时被调用（`renderer.mjs:141` `decide()`、`renderer.mjs:265` `revise()`）——**没有服务器/没有点击时，`dispatch` 从不被调用**。
- `signal`：可选 `AbortSignal`，用于停止后续 `update` 生效（`renderer.mjs:57-60`）。
- `query`：可选 `(kind, request) => Promise`，当前唯一用法是 `onReadSource: query("source", request)`（`renderer.mjs:284-287`），用于展开某条 finding 时回读源文件片段；不传时该功能被禁用（`onReadSource: null`），不报错。
- 返回值 `update(next)` 替换当前 `projection` 并重渲染；`dispose()` 标记已销毁并移除 abort 监听。

**是否能只靠 `pending/accepted/revised` 三份投影挂载、无服务器**：能。渲染路径 `mount → render() → workPacket(current) → renderWorkPacket(packet, hooks)`（`surface-modules.mjs` 导出）全程只读 `current`（即传入的 `projection`），没有一处在渲染路径上调用 `fetch`、`XMLHttpRequest`、`WebSocket` 或 `navigator.sendBeacon`（本卷对 `renderer.mjs`、`surface-modules.mjs`、`ui-controls.mjs` 三文件的 `grep -c "fetch("` 结果均为 0，见表 1）。唯一的网络式行为入口是 `dispatch` 与 `query`，两者都是宿主注入的回调，指向一个「replay-only」的桩函数（例如 `dispatch` 直接 `throw` 或返回一个标注"replay, not sent"的拒绝态、`query` 返回预先打包的源文本）即可满足 ABI，不需要改 `renderer.mjs` 一个字节。`evidence-memo` 的姊妹 renderer（`extensions/evidence-memo/renderer.mjs:1-8` 注释原文："no fetch, URL, storage, provider, or Core access"）确认这是该产品 renderer 的通用设计前提，不是 inbound-nda 特例。

---

## 表 6 · 体量与风险

- **预计标本 JSON 大小**：以本卷实测数字外推——Work state 4 帧（沿用 `nda-packets.json` 现有量级）约 94 KB；Event log 若含 1 个"提交候选"run（17 事件，19.6 KB）与 1 个含 `permission.open`/`question.open` 的 ws_write/ask_user run（11 事件，14.8 KB，实测未含 `ask_user` 分支，估计带上后单 run 在 15–20 KB 量级），两 run 合计约 35–40 KB；Compiled context 按 run 数计，每 run 约 12–13 KB（本卷实测 12672 字节，`binding.context`/`loaded` 为空——若剧本要展示"已注入指令/技能"，此数字会显著增大，属未核实的上界），2 run 约 25–26 KB；File 层 `workspace.tree` 与若干文件正文预计数 KB。**合计量级：约 160–200 KB**，与现有 `nda-packets.json`（133 KB）同一数量级，均未接近 GitHub Pages 单文件或仓库体量限制。此为外推估算，非实测总量，实际由捕获脚本一次性生成后可读出精确字节数。
- **需要复制的产品模块清单**（可原样复制、无需修改，均在表 1 确认为纯函数/无 `fetch`/无 `/web/` 硬编码，`ui-controls.mjs` 除外）：`ui-controls.mjs`（连同其 `vendor/floating.mjs`、`vendor/marked.mjs`、`vendor/purify.mjs`、`vendor/icons.svg`）、`surface-modules.mjs`、`thread-projection.mjs`、`presentation-adapters.mjs`、`user-message.mjs`、`workspace-view.mjs`、`inspector.mjs`（`renderRun`/`formatBytes`/`noticeText` 三个纯函数；`createFileView` 需配合下条）、`runtime-view.mjs` 的 `renderRecordedContext`/`renderContextBar`、`app/extensions/inbound-nda/renderer.mjs`（连同 `app/extensions/evidence-memo/renderer.mjs` 若剧本也要展示这一 surface）。
- **哪些模块必须由站点另写最小替代**：`app.mjs`（225 KB，唯一持有 `fetch`/`API_BASE`/token/轮询/`localStorage`/`sessionStorage` 的编排层，见表 1）不能整份复用，需要一个站点自写的最小编排壳，职责仅剩「从打包 JSON 里按 `runId`/`path` 取出对应快照，喂给上条列出的纯渲染函数」；`inspector.mjs` 的 `createFileView` 与 `materials-view.mjs` 的 `createMaterialsView` 都以 `request` 回调为界（`inspector.mjs:325`、`materials-view.mjs:3-7`），站点需另写一个把 `request(endpoint, query)` 重定向到打包 JSON 查表的桩函数，不改这两个文件本身；`settings-view.mjs` 依赖 `globalThis.__cwPrefs`（`settings-view.mjs:1237`）——若标本不展示设置面，可整体不复制。

---

## 表 7 · 结论

1. 12 个 `app/web/*.mjs` 视图/投影模块中，只有 `app.mjs` 一处含字面量 `fetch(` 与 `/api/v5`；其余全部通过参数/回调接收数据，天然适合纯 JSON 投影渲染。
2. `app/extensions/inbound-nda/renderer.mjs` 的 `mount({container,projection,dispatch,signal,query})` 在渲染路径上无 `fetch`；`dispatch`/`query` 是宿主注入回调，替换为桩函数即可满足"无服务器时只靠三份投影挂载"。
3. `nda-packets.json`（133300 字节，sha256 见卷首）只覆盖 Work state 一层（4 帧，约 94 KB）；Event log 与 Compiled context 两层目前没有任何固定 sha256 的仓内样本。
4. Event log 与 Compiled context 的形状本卷用一次性实测确认：`GET events?afterSeq=` 返回 `{events:[{seq,runId,sessionId,type,data}],nextSeq}`；`GET runtime-context?sessionId=&runId=` 返回 `{mode,runId,binding:{...},loaded,tokenUsage,...}`。
5. `permission.open`（Approve this write）与 `question.open`（Question）事件均已实测触发：`permission.open` 需要会话 `permissionMode:"ask"` + `ws_write` 脚本调用；inbound-nda 自身的 `se_submit_candidate` 工具不触发这两种事件。
6. 全站根相对绝对路径引用共 7 处（`index.html` ×3、`app.mjs` ×1、`ui-controls.mjs` ×1、`renderer.mjs` ×2），部署到 `/Courtwork/` 子路径下会全部 404，需要站点自己的相对化处理。
7. 产品 server 的 `STATIC` allowlist（`server/index.mjs:13-28`）是封闭 Map，任何站点文件都不经它提供，标本渲染所需的模块必须由站点自己打包/服务，不能依赖产品 server。
8. `app.mjs` 是唯一不可原样复用的关键文件（持有 token/fetch/storage 的编排层）；其余纯渲染模块可原样复制。
9. `evidence-memo/renderer.mjs` 头部注释明确同一套"no fetch/URL/storage/provider/Core access"设计前提，说明"渲染函数不碰网络"是该产品 renderer 层的通用约束，不是 inbound-nda 一个 extension 的特例。
10. 未核实项：`GET /sessions/:id/artifacts/file`（内容版本读取）的确切字段表本卷未读取 `docs/api-runtime-mx-r1.md`（不在只读清单内），仅在 `docs/api-v6.md` 文字段落中见过端点名。
