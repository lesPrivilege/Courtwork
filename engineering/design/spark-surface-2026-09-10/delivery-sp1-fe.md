# WO-SP1-FE · 交付回执

整合补记（2026-09-10）：原交付 `63840a7` 经 Astra 接缝与路由修补为 `936239d`，非作者 Luna 最终独立 44/44 针对测试、22/22 真实 host 浏览器通过，已合流 `d0118ab`。见[独立回执](../../../evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910/README.md)与[整合总账](../../../evidence/delivery-rollup-20260910/README.md)。当前签名、分页/scope 校验与 Work 路由以最终源码及补丁为准；下文保留原作者时点，不能把原始 `/projects` / `getProjects` 接缝描述当作最终实现。BE-41 仍未实现；前端通过不关闭 RV26-SP01 / ME03。

作者 Luna。开工基线 main `0c60f4f`，工作树 `/private/tmp/cw-spark-fe-20260910`，分支 `codex/spark-fe-20260910`。数据目录 `/private/tmp/cw-spark-fe-data`（未使用：本片无 mutation，无需数据目录）。端口 8861（仅用于本回执"验证"节所述的只读临时静态服务，未起产品 server）。

作者验证不构成独立接受，按 [SP-9](integration-ruling.md) 与工单，需未参与该代码的 Luna（或指定复核者）独立验证。

## 接单第 0 项 · coordination-view / coordination-projection 核对

结论：**不冲突**。核对方式：读 `app/web/coordination-view.mjs`、`coordination-projection.mjs`、`attention-agent-view.mjs`。

- 布局：`coordination-view.mjs` 不在侧栏、不在独立面板；它整个挂载在 Attention 对话框内部（`attention-agent-view.mjs:74`：`dialog.append(header, toolbar, recent, coordination.root, stream, status, composer)`），是该对话框里一个可折叠的 `<details>` 区块。Spark 是独立的侧栏入口 + 独立 `<dialog>`，与 Attention 对话框互不挂载，无 DOM 层级重叠。
- 路由：coordination 的路由前缀是 `/coordination`、`/coordination/threads`、`/coordination/messages`、`/sessions`；Spark 只读 `/work-derivations` 与 `/projects`。两者路由前缀不相交，`app/server/index.mjs` 的路由分派不会产生歧义。
- 语义：coordination 处理的是"人类经 Thread 向另一会话发消息"，不涉及 Matter、candidate、source_version；Spark 处理的是"Matter 的候选派生落后于现行源集"。两者读的是不同的 Core/Runtime 事实面（Thread 邮箱 vs candidate.source_version），字段与状态词没有交集。
- Spark 未 import、未引用 `coordination-view.mjs` 或 `coordination-projection.mjs` 中的任何导出；反之亦然。

## 硬约束自查

- 写权限：本次改动只落在 `app/web/**`（新增 `spark-view.mjs`、`spark-projection.mjs`；修改 `app.mjs`、`index.html`、`styles.css`）与 `app/tests/**`（新增 `spark-projection.test.mjs`、`spark-view.test.mjs`、`fixtures/spark-derivations/*.json`）。未改 `app/server/**`、`app/core/**`、`app/runtime/**`、`docs/**`。未改 composer 或 Chat Flow 既有文件（`chat-work-shell` 相关文件、`user-message.mjs` 等未动）。
- **未改 `app/server/index.mjs`。** 新增两个模块的静态准入清单条目留给 Astra 登记（见下"新增模块路径"）。
- 未新增依赖：两个新模块只 `import` 同目录下既有的 `./ui-controls.mjs`；未引入任何 npm 包或 CDN。`spark-projection.test.mjs`/`spark-view.test.mjs` 只用 `node:assert/strict`、`node:fs`、`node:test`。
- 未引入 `localStorage` / `sessionStorage` / `indexedDB`（`spark-view.test.mjs` 有反例测试断言这一点）。
- 未在 Spark 内 resolve / 创建 / 修改 Attention 事项：`spark-view.mjs` 源码（去注释后）不含 "attention" 字样，无对 `/attention*` 路由的请求，`onOpenMatter` 只把 `matterId` 交还宿主，不涉及 Attention。
- 合成 fixture 严格按 `be41-dto.md` 冻结形状手写（该文档只给了一条完整样例 + 五个文件各自的内容表述，未给全部字节），字段名与嵌套结构未改动、未新增、未省略。BE-41 未实现：端点 404 时前端走 `unimplemented` 态，不显示任何数字（见下"九态"）。
- `null` 与 `0` 不同形：`spark-projection.mjs` 的校验器把"`availability` 非 observed 但计数为数字"与"`availability` observed 但计数为 `null`"都当作不可识别的报文整体拒绝（不是各自取一个默认值），并有专门反例测试覆盖两个方向。

## 交付清单

- `app/web/spark-view.mjs` — `createSparkView({ request, onOpenMatter })`，签名与 `createUsageView`（`usage-view.mjs:4`）一致：宿主注入 `request`，构造函数自建并自持一个 `<dialog class="spark-dialog">`，`open(preferredProjectId)` 打开。内部自读 `/projects` 维护项目切换（Spark 无宿主注入的 `getProjects`，因为冻结签名只有 `request`/`onOpenMatter` 两项；这点在下面"待 Astra 核对"里提出）。
- `app/web/spark-projection.mjs` — 纯函数，无 DOM、无 fetch（`spark-view.test.mjs` 有反例测试对去注释后源码做字面扫描，断言不含 `fetch(`、`Date.now(`、`request(`、`localStorage`、`document.`、`createElement`）。导出 `validSparkDerivations`、`overviewBuckets`、`sourceSetChangeSummary`、`truncationNote`、`activityRows`、`sameSnapshot`、`CANDIDATE_STATUSES`、`AVAILABILITY_STATES`、`STALE_REFS_PAGE`。
- 侧栏入口：`app/web/index.html`，`#spark-button` 紧跟在 `#attention-button` 之后、`nav-filter`（查找）之前，纯文本按钮，同 `#attention-button`/`#home-button` 的既有 DOM 结构；不带 badge（`app.mjs` 未给它接任何未读计数逻辑）。
- `app/tests/fixtures/spark-derivations/{stale,quiet,empty,partial,truncated}.json` — 五个冻结验证 fixture，逐一通过 `validSparkDerivations` 校验（见"验证"节）。
- `app/tests/spark-projection.test.mjs`（26 项）、`app/tests/spark-view.test.mjs`（13 项）。

## `app.mjs` 的接线（新增，未改动既有 Chat Flow 逻辑）

- import `createSparkView`；模块级变量 `sparkView`（同 `usageView` 惯例）。
- `setAction($("spark-button"), "refresh-cw", "Spark", { visible: true })`，与 `home-button`/`attention-button` 同一行样式接线（`refresh-cw` 是既有 24-icon 集里的既有图标，未新增图形）。
- `$("spark-button").addEventListener("click", () => sparkView.open(currentProject()?.id ?? null))`，与 `attention-button` 直接调用 `attentionAgent.open()` 同一模式：**不引入 `state.sparkOpen`、不碰 `renderChatHeader()`、不碰 composer/home band 的既有显隐逻辑**。Spark 是叠加层 `<dialog>`（同 Usage、同 Attention 对话框的既有模式），不是替换 `conversation-body` 的第三个"view"。
- `sparkView = createSparkView({ request, onOpenMatter: (matterId) => void openMatterSurface(matterId) })`，紧邻 `usageView = createUsageView(...)` 那一行。
- 新增 `openMatterSurface(matterId)` 函数（`selectProject` 定义之前）：按工单"点击进入既有 Work 面，不新建面"的要求，在 `state.projects` 里逐个查 `state.sessionsByProject`（不存在则 `loadSessionsForProject` 懒加载），找到 `session.extensionBinding?.binding?.matterId === matterId` 的会话，调用既有 `selectProject(projectId, {sessionId})`；找不到就 `showToast` 提示"未有会话绑定该 Matter"，**不创建绑定、不新建会话**。

## 待 Astra 核对的两点（未自行决定，报上来）

1. **`matterId → session` 的路由依据。** BE-41 冻结 DTO 的 Matter 行不带 `sessionId`（`list_work` 同样不带，见 `SP-3`），我参照 `coordination-projection.mjs` 已经在用的 `session.extensionBinding?.binding?.matterId` 字段做反查。这条字段的形状我是从 coordination 那份代码里"抄"来的约定，不是本工单或 BE-41 文档里写明的契约；如果生产里 Matter → Session 的绑定关系有别的权威读法（或本来就不是一一对应），`openMatterSurface` 需要 Astra 改。
2. **Spark 的 project 来源。** BE-41 路由要求 `projectId` 必填，但冻结的 `createSparkView` 构造签名只有 `{request, onOpenMatter}`，没有 `getProjects` 或显式 `projectId`。我让 `spark-view.mjs` 自己 `request('/projects')` 建一个内部下拉（同 Usage 的做法但不复用宿主已加载的列表），`.open(preferredProjectId)` 只是给个初始建议值。如果冻结签名的意图是"Spark 永远读宿主当前已选中的项目、不该有自己的项目切换器"，这处要收窄。

## 九态浏览器检查（逐条）

验证方式：`/private/tmp/cw-spark-fe-20260910` 根目录起 `python3 -m http.server 8861 --bind 127.0.0.1`（绕开 `app/server/index.mjs` 的静态白名单，因为新模块的登记留给 Astra，此服务只用于本次人工核对，不是产品路径），配一个不落盘、不提交的临时页面（已在验证后删除，`git status` 已确认工作树干净）直接 `import { createSparkView } from '/web/spark-view.mjs'`，注入桩 `request`（按态返回五个 fixture 之一、404、抛错、挂起、或手工构造的两页/两页且 `snapshotRef` 改变）与 `onOpenMatter` 记录回调参数。Chrome（本会话 Browser 面板）逐态截图/读文本。

| 态 | 结果 |
|---|---|
| loading | 通过。`request` 挂起时面板显示"Loading maintenance state…"（`role="status"`），无数字。 |
| unimplemented | 通过。`request` 抛 `status:404` 时面板只显示"No source yet. This runtime has no maintenance source connected here."，不出现任何合成数字。 |
| error | 通过。非 404 抛错时显示错误原文 + Retry；点击 Retry 复用同一 `projectId`/`limit`/`offset` 重新请求（日志核对到两次一致的请求行）。 |
| empty | 通过。`matters:[]` 时显示"No Matters in this project's scope."，无分区标题。 |
| quiet | 通过。两个 Matter 均 `stale:0`：只出现"Up to date"分区 + 一句"Every Matter in scope is current with its source set. No prompt is generated for a quiet read."，无"Behind the current source set"标题，无告警样式（无色、无图标、无动画）。 |
| stale | 通过（主场景）。Overview：一个 Matter 入"Behind the current source set"（含 byStatus 分块、sourceSetChange 摘要"Revision 2 → 3 · 1 added, 1 replaced"），另一个入"Up to date"，两区不混排。Activity：逐条列出 candidateId/状态/`candidateSourceVersion of matterSourceVersion`/落后量/supersedes。点击 Matter 标题触发 `onOpenMatter('m-1')`（日志核对）。 |
| partial | 通过。`availability:"partial"` 的 Matter 只显示"Unavailable · contract_unsupported"（斜体、点线描边，同 `.usage-heat.is-incomplete` 既有约定），**不出现任何数字**，包括不出现"0 stale"。顶部另有"scope partial: contract_unsupported_excluded"。 |
| truncated | 通过。Activity 加载 20 条后显示"Showing 20 of 37. The remaining stale candidates for this Matter are not loaded on this page."，"37"取自 `derivations.stale`，不是已加载条数。 |
| paged | 通过。`page.total(2) > page.limit(1)` 时出现"More Matters"，翻页后 offset=1，显示"2–2 of 2 Matters"与"Previous Matters"；两页携同一 `snapshotRef`（fixture 构造保证），未触发拒绝态。 |
| paged 的拒绝分支（snapshotRef 改变） | 通过（工单未单列为第十态，但明确要求"两次不同 snapshotRef 的数字不得并列"，故一并核验）。第二页把 `snapshotRef` 改成不同值时，面板整体替换为"This runtime's maintenance state moved on since the last page. Refresh to read it again; the two pages are not shown together."+ Refresh，**不与第一页数字同屏**（第一页内容被完全清空而非叠加）。 |

## 明暗两主题 / 390 宽度 / 键盘可达性

- 暗色：`resize_window({colorScheme:'dark'})` 后截图核对，背景/文字对比清晰，Tab 焦点环可见（Activity tab 的黑色方框）。未新增任何颜色字面量（`node tools/lint-colors.mjs` 通过），全部复用既有 role token（`--ink`/`--muted-strong`/`--panel`/`--line`/`--scrim`/`--float`/`--radius-card`）。
- 390 宽度：`resize_window({width:390,height:844})` 后截图核对，对话框自身收窄（`width:min(880px,calc(100vw - 24px))`），Activity 表格内部出现横向滚动条（`.spark-table-scroll{overflow:auto}`），但 `document.documentElement.scrollWidth === document.documentElement.clientWidth === 390`，**页面级无横向溢出**。
- 键盘可达性：`Tab` 在 Matter 行之间正常前进（核对到从"Acme inbound NDA"跳到"Acme employment agreement"的开按钮）；Overview/Activity 的 `role="tablist"` 用 `ArrowRight`/`ArrowLeft`/`Home`/`End` 切换并把焦点移到新选中的 tab（核对 `ArrowRight` 把 `document.activeElement` 与 `panel[aria-labelledby]` 都从 overview 切到 activity）；对话框原生 `close` 事件驱动状态复位，`Escape` 与"Close Spark"按钮均可关闭，关闭后 `opener` 复焦。

## 全量测试 / lint / contrast / smoke

- `npm ci`（沿用既有 `package-lock.json`，未新增/升级任何依赖）。
- `node --test tests/*.test.mjs`：547 项。**Spark 新增的 39 项（`spark-projection.test.mjs` 26 项 + `spark-view.test.mjs` 13 项）在全部三次全量重跑中逐次全过，零抖动。**
- **已知的、按工单预期的失败（确定性，三次全量重跑均复现）**：`static-web-manifest.test.mjs` 的两项断言（"每个 app/web 模块都在静态白名单里"、"白名单决定 /web 的可取性"）失败，因为它逐个扫描 `app/web/*.mjs` 并核对 `app/server/index.mjs` 的静态白名单数组——新增的 `spark-view.mjs`/`spark-projection.mjs` 不在其中，符合工单"静态准入由 Astra 登记，Luna 不改该文件"的既定接缝，不是本次引入的缺陷。`spark-view.test.mjs` 里专门有一项测试把这个缺口显式记录为"尚未登记"而非断言"已登记"，防止将来静默变绿或静默漏检。
- **观察到的、与 Spark 无关的间歇性失败**：三次全量重跑分别观察到 2、2、5 项与 `app/web/**`/`app/tests/**` 均无关的信号/进程/时序类测试失败（`BG02-T1/T7`、`CLI SIGTERM settles a waiting Run`、`T-BUDGET-1`、`SE_TEST_CRASH_POINT alone is inert`、`T-SYNC-2`），每次失败的具体项不同，均属 `app/runtime/**`/`app/server/**` 的信号处理与并发时序测试，本片未触及这两个目录。排查发现：验证期间用 `ps aux` 确认本机同时有另一会话在跑一整套并发全量测试（`/private/tmp/se-fable-ic`），加上本会话自己起的浏览器自动化与静态服务器，系统处于重度并发负载；`node --test` 以 `--test-isolation=process` 逐文件起子进程，负载下计时类测试（依赖 `SIGKILL`/`SIGTERM`/deadline 的相对时间窗口）最先受影响。独立、低负载下重跑第一次全量出现的两项（`node --test tests/runtime-foundation.test.mjs tests/run-lineage.test.mjs`）：**13/13 全过**，与"系统负载导致的计时抖动、非本片引入的回归"判断一致。**未检项**：未能在同等重负载下逐一复测第二、三次出现的另外几项（`T-BUDGET-1`、`SE_TEST_CRASH_POINT`、`T-SYNC-2` 所在文件的独立重跑因同一并发负载被中止），如实记为未核实到底；建议复核者在系统空闲时重跑一次 `node --test tests/*.test.mjs` 确认这几项在低负载下同样保持通过。
- `node tools/lint-colors.mjs`：`ok (30 files)`，未新增颜色字面量、未新增区域背景。
- `node tools/lint-materials.mjs`：`ok (3 files)`。
- `node tools/lint-interaction.mjs`：`ok (27 files)`，交互语法负规则通过（本片全部只读，无新控件类别）。
- `node tools/contrast-report.mjs`：全部既有 role 组合"通过"，本片未引入新 token，沿用既有对比度结论。
- `node app/scripts/runtime-smoke.mjs`：`"status":"passed"`（未受影响，本片未改 `app/runtime/**`/`app/core/**`）。

## 新增模块路径（供 Astra 登记 `app/server/index.mjs` 静态白名单）

```
spark-view.mjs
spark-projection.mjs
```

插入位置参照既有数组（`server/index.mjs:24`）里 `usage-view.mjs`/`usage-projection.mjs`/`coordination-view.mjs`/`coordination-projection.mjs` 的写法，字符串字面量加入同一个 `for (const name of [...])` 列表即可，无需改动数组以外的任何逻辑。

## 未检项

- 未做真实 Chrome/Firefox/Safari 跨浏览器核对，只核对了本会话 Browser 面板（Chromium 内核）。
- 未做真实屏幕阅读器（VoiceOver/NVDA）朗读核对，只核对了 ARIA 属性与可聚焦顺序的字面正确性。
- `openMatterSurface` 的"跨全部已知项目找绑定会话"路径未做真实多项目场景下的端到端点击验证（本片是合成数据，宿主侧没有可用的真实已绑定会话可点；这条路径只做了源码审阅与函数级推理，未做浏览器回归）。
- 静态白名单登记后（Astra 完成 `app/server/index.mjs` 那一行改动之后），需要重跑一次 `node --test tests/static-web-manifest.test.mjs` 与 `spark-view.test.mjs` 里那条"记录为尚未登记"的测试（届时应改写为断言"已登记"）。
- BE-41 真实实现后，"paged"与"paged 拒绝分支"两态需要用真实 project 的多 Matter 场景重新核对分页与 `snapshotRef` 语义是否与本回执假设一致（本次分页/拒绝态用手工构造的两页合成响应验证，未必覆盖真实分页边界，如 `offset` 不对齐 `limit` 的情况）。

## 作者验证声明

以上全部结果为作者（Luna）自证，不构成独立接受。按 [SP-9](integration-ruling.md) 与工单，需未参与该代码的复核者重新核对本回执与代码。
