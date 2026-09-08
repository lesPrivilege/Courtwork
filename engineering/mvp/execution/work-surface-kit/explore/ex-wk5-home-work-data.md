# EX-WK5 · Home 三带与工作页右栏本地数据与结构清单

状态：直接可消费

来源：`/Users/lesprivilege/Projects/Courtwork-fresh`，分支 `codex/fresh-courtwork`，HEAD `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`（本卷写入前核对；工作树另有与本探查无关的未提交改动，均未读取、未依赖）。

只读声明：本卷为只读 explore。未修改仓库内任何既有文件、未执行任何状态变更类 git 命令、未启动服务器、未访问数据目录或凭据存储、未访问外部 URL。

未核实说明前置：WK-33/WK-34 提到的 "WS-09 静态映射" 在本地仓库全文检索（`grep -rn "WS-09"`）无匹配，无法核对其是否与源码实际的 workspace/run/file 三 kind 完全对应；下表按源码实际结构撰写，WS-09 单列入未核实项。

---

## 1. 数据可得表

| 字段 | 来源端点或投影（file:line） | 是否跨会话聚合 | 分页/截断 | 可否按日计数（需要哪个时间字段，时区是否明确） | 缺失 |
|---|---|---|---|---|---|
| 会话列表：`id/projectId/title/draft/extensionBinding/createdAt/workspaceDir/permissionMode/hostSession` | `GET /sessions` 路由 `app/server/index.mjs:97` → `service.listSessions` `app/server/service.mjs:391-394` → `store.listSessions` `app/server/store.mjs:355` → `publicSession`（剥离内部 `_nextSeq`）`app/server/store.mjs:207-211`；字段集校验见 `app/server/store.mjs:122-125` | 否，仅按可选 `projectId` 过滤，单次返回该范围内全部 session | 无分页字段，一次性返回数组，无 `limit`/`offset` | 可，用 `createdAt`；ISO 字符串来自 `now()`=`new Date().toISOString()`（`store.mjs:25`），无显式 timezone 字段，需前端按浏览器本地时区换算 | 无 `updatedAt`/`lastMessageAt`，`createdAt` 只反映"创建"而非"最近活动" |
| 会话详情内嵌 `runs[]`（该会话全部 run，字段同下一行） | `GET /sessions/:id` `app/server/index.mjs:99` → `service.getSession` `app/server/service.mjs:416-424` → `store.listRuns(id)` `app/server/store.mjs:356` | 否，单会话范围 | 无分页字段，返回该会话全部 run 数组 | 可，用 `startedAt`/`endedAt`；同上无 timezone 字段 | 无 |
| run：`id/sessionId/status/admissionOpen/adapterId/provider/extension/startedAt/endedAt/error/commandId/artifacts/usage/hostSession/credentialGeneration` | `GET /runs/:runId` `app/server/index.mjs:111` → `service.getRun` `app/server/service.mjs:1157-1161`；字段集校验 `app/server/store.mjs:139-162` | 否，单 run | 无 | 可，`startedAt`/`endedAt`；无 timezone 字段 | `usage` 可能 `missing:true`（前端已按"下限"呈现，`app/web/inspector.mjs:174-206`） |
| `run.artifacts[]`：`path/bytes/sha256/kind/writtenAt` | 内嵌于 run，校验 `app/server/store.mjs:99-104`（`validateArtifact`） | 否 | 无独立分页，随 run 一起返回 | 可，用 `writtenAt`；ISO，无 timezone | 无公开 URL，需配合 `sha256` 走 `GET .../artifacts/file` 才能读内容 |
| question 全量字段：`id/runId/kind/prompt/payload/status/answer/decision/createdAt` | 无独立 GET 端点；`store.getQuestion` 只在服务端内部使用（`app/server/service.mjs:1081`），客户端只能经 `GET /sessions/:id/events`（或 `getSession` 内嵌 `events`）读到 `question.open`/`permission.open` 事件，字段为 `{id,kind,prompt}` 或 `{id,kind,...payload}`（写入处 `app/server/store.mjs:457-465`），`answer`/`decision` 不随 open 事件下发 | 否 | events 支持 `afterSeq` 游标（`app/server/service.mjs:1163-1182`），但无独立 `limit` | 可，用 work-summary 中的 `createdAt`；ISO，无 timezone | 全量 prompt/answer/payload 客户端不可直接读取（work-summary 摘要故意省略，见下一行引用的 `work-summary-api.md:56`） |
| `work-summary.sessionCandidates`：`projectId/sessionId/title/createdAt/recordedActivityAt/latestRun{runId,status,startedAt,endedAt}` | `GET /work-summary` `app/server/index.mjs:94` → `service.getWorkSummary` `app/server/service.mjs:373-389` → `deriveWorkSummary` `app/server/work-summary.mjs:16-56`（候选构造 `:37-39`，`runFields` `:7`） | 是，跨全部（或指定 `projectId` 内）会话排序聚合 | 有：`{items,total,offset,limit,truncated,hasMore,nextOffset}`，`page()` 实现于 `app/server/work-summary.mjs:9-14` | 可，用 `recordedActivityAt`（= session `createdAt` 与其全部 run `startedAt`/`endedAt` 中的最大值，`work-summary.mjs:23,31-33`）；ISO，无 timezone | 不含"今日"过滤字段，需前端再按 `recordedActivityAt` 筛一次 |
| `work-summary.pendingItems`：`projectId/sessionId/runId/questionId/kind/createdAt/label` | 同上，`app/server/work-summary.mjs:40-49`；仅 `pending` 且 run 处于 `running`/`waiting_user`、`admissionOpen`、且存在存活 answer receiver 才入选（`:43`） | 是，跨会话 | 同 `page()` 分页 | 可，用 `createdAt`；无 timezone | 不含 `prompt`/`payload`（按设计，`app/docs/work-summary-api.md:56`） |
| `work-summary.inspectionCandidates`：`projectId/sessionId/runId/status/startedAt/endedAt/errorCode/resultAt` | `app/server/work-summary.mjs:34-35`；仅 `failed`/`unknown` 两态 | 是，跨会话 | 同 `page()` 分页 | 可，用 `resultAt`=`endedAt ?? startedAt`；无 timezone | 只含 failed/unknown，不含 completed/cancelled 历史；`app/docs/work-summary-api.md:61-62` 明示这不是"未读/待批准"信号 |
| `work-summary.sessionVersions`：`sessionId/lastSeq` | `app/server/work-summary.mjs:54-55` | 是（仅覆盖上述三集合联合出现过的 session） | 无独立分页，随三集合联动 | 不适用（无时间字段） | 未被任一集合分页命中的 session 无版本号（`app/docs/work-summary-api.md:41`） |
| 跨会话「全部 run」列表（不经 `sessionCandidates.latestRun` 折叠为每会话一条） | **无对应 HTTP 端点**：路由表 `app/server/index.mjs:88-131` 未提供"全部 run"或"批量 session 的 run"接口；`store.listRuns()`（无参）仅服务端内部调用（`app/server/service.mjs:170,261,717`），未路由到 HTTP | 若存在则应为是 | — | — | **缺失**：无法一次性取得"今天全部 run"；`sessionCandidates` 每会话只给一条 `latestRun`，同日同会话的更早 run 不出现；要拿到某会话全部 run 只能单独 `GET /sessions/:id`（N+1），且该数组本身也不支持按时间过滤 |
| workspace 文件树：`path/bytes/sha256/mtime` | `GET /sessions/:id/workspace` `app/server/service.mjs:477-481` → `listWorkspaceTree` `app/runtime/workspace-tools.mjs:159-165` → `listTree` `:139-157` | 否，单会话 `workspaceDir` | 无分页，一次性返回全部文件（含 `materials/` 与 `out/`） | 可，用 `mtime`（文件系统 mtime，`workspace-tools.mjs:153` `info.mtime.toISOString()`）；无 timezone | 无版本历史，只反映当前文件系统状态 |
| workspace/artifact 文件内容：`path/kind(current\|content-version)/text/bytes/sha256/truncated`（artifact 场景另带 `runId`） | `GET .../workspace/file` `app/server/service.mjs:483-518`；`GET .../artifacts/file` `app/server/service.mjs:520-545` | 否 | 无分页；超 `MAX_READ_BYTES` 按 `truncated` 标记截断 | 不适用；`current` 读取不返回 `mtime`（只在文件树接口里有） | 同上 |
| connection/runtime-info：`apiVersion/adapterId/state/provider/capabilities/limits/cache/compaction/recovery/authority` | `GET /runtime-info` → `service.getRuntimeInfo` `app/server/service.mjs:340-361`；`GET /bootstrap` → `service.bootstrap` `:237-245`；`GET /runtime-control` → `service.getRuntimeControl` `:258-262` | 不适用，进程级快照，非会话/项目聚合 | 无 | 不适用，无时间戳字段 | 无按日/会话维度，不能用于 Today/热力图 |

---

## 2. 右栏结构表

三 kind 均共用同一宿主面板 `#surface-panel`（`app/web/index.html:270-276`，`aria-labelledby="surface-title"`）与背景层 `#surface-backdrop`（`:264-269`）、tablist `#surface-tabs`（`:299-304`，`role="tablist"`）。切换/展开/关闭的状态判定集中在 `renderSurfaceVisibility()`（`app/web/app.mjs:2782-2861`），Escape 处理集中在 `handleSurfaceEscape()`（`:4171-4238`），两者不区分 kind。

| kind | DOM 容器与 id | 打开/切换/关闭函数（file:line） | renderer 生命周期钩子（mount/update/dispose）及触发条件 | 展开工作面（expand/return/close）次序与 Escape 处理 | 保留项（citing `docs/ui-composition.md`） |
|---|---|---|---|---|---|
| workspace（`kind:"preview"`） | tab `#surface-preview-tab`（`index.html:305-314`，`role="tab"`，`aria-controls="surface-content"`，默认 `aria-selected="true"`，不隐藏）；content `#surface-content`（`:338-344`，`role="tabpanel"`，`aria-labelledby="surface-preview-tab"`，`tabindex="0"`） | `activateSurface("preview")`（`app.mjs:2862-2884`）；tab 点击绑定于 `app.mjs:4532`；会话概览卡 `onWorkspace` 回调同样调它（`:3861`）；关闭 `closeSurface()`（`:2759-2768`）；展开/还原 `setSurfaceExpanded()`（`:2745-2750`） | 分两支：无扩展绑定时走 `renderWorkspaceFiles()`（`:2951-2990`），每次整段 `container.replaceChildren`，无独立 mount/update/dispose（等价于"每次重挂"）；有扩展绑定时走扩展 renderer ABI，`loadSurface()`（`:3184` 起）判定 identity 未变则调 `state.surface.mounted.update(projection)`（`:3259`，触发条件为 projection 与上次不同，`:3247` 的 `projectionsEqual` 判定），identity 改变或首次绑定则 `mount(...)`（约 `:3349`）并赋值 `state.surface.mounted`（`:3375`）；`dispose()` 调用点分散在会话切换簇：`:1208`（草稿/工作面容器解绑段，EX-WK1 §4 的 `1137-1263` 簇）、`:1353`（`applySessionDetail`，`1263-1405` 簇）、`:1417`（`clearActiveSession`，`1405-1597` 簇），以及 `loadSurface` 内失败或 identity 改变时的旧 renderer 清理（`:3165,3269`） | 同下方共用 `handleSurfaceEscape`；展开态由 `.surface-expanded .surface-panel` CSS 接管为 `position:fixed;inset:24px`（`app/web/styles.css:1083-1091`） | `docs/ui-composition.md:14`："Workspace 保留扩展 renderer"；`:33`（文件读取按 session/path/kind/run/hash 绑定，记录版本与当前文件分别请求）；`:39`（保留主区顺序、稳定 DOM id、ARIA 关系、popover/dialog/tab 角色、关闭/返回次序、Run/File 身份、renderer owner） |
| run | tab `#surface-run-tab`（`index.html:315-325`，`aria-controls="run-content"`，默认 `hidden`，由 `renderSurfaceVisibility` 按 `state.surface.runId` 是否存在切换 `hidden`，`app.mjs:2843-2848`）；content `#run-content`（`:345-352`） | `openRun(runId)`（`app.mjs:2885-2888`）→ `activateSurface("run")`（`:2862-2884`）；调用来源含会话概览卡 `onRun`（`:3862`）、Run 历史弹层 `onRunHistory` 的 `onRun`（`workspace-view.mjs:144-164` 触发，装配于 `app.mjs:3869-3880`）、Home 行的 `inspect:true` 分支（`app.mjs:3890-3894`） | `renderInspector()`（`app.mjs:2894-2905`，调用 `renderRun`）是纯函数，每次 `container.replaceChildren` 整段重绘（`app/web/inspector.mjs:32-43`），无 mount/update/dispose 对象；触发点：`activateSurface("run")` 内 `void readRunDetails()`（`:2881`）；`readRunDetails()`（`:2924-2950`）先同步 `renderInspector()`（loading 态）再异步 fetch 后 `mergeRun`+`renderInspector()`；`refreshRunDetails()`（`:2906-2923`）供轮询/刷新复用；状态存于全局 `state.runs`，随会话切换在 `clearActiveSession` 段清空（EX-WK1 §4 的 `1405-1597` 簇），无独立 dispose 钩子 | 同上（共用 `handleSurfaceEscape`） | `docs/ui-composition.md:14`："Run 内含 Results、Usage，诊断再收进 details"；`:39` 保留段中的 "Run/File 身份" |
| file | tab `#surface-file-tab`（`index.html:326-336`，`aria-controls="file-content"`，默认 `hidden`，由 `state.surface.fileRef` 是否存在切换）；content `#file-content`（`:353-360`） | `openFile(ref)`（`app.mjs:2889-2893`，先校验 `ref.sessionId` 匹配当前会话才生效）→ `activateSurface("file")`；来源含 `inspector.mjs` 内 artifact 行的 `onFile`（`:114-141`，`:402-432` 两态：recorded version / current file）与 `workspace-view.mjs` 的文件行回调 | `createFileView()` 返回 `{load, dispose, pause}`（`app/web/inspector.mjs:319-469`，实例化于 `app.mjs:4670`）；`load(next)`（`inspector.mjs:323-453`）每次整段 `replaceChildren`（无增量 update），触发于 `activateSurface("file")` 内 `void fileView.load(ref)`（`app.mjs:2883`）；`pause()`（中止 in-flight fetch、保留已渲染 DOM）在 `closeSurface()`（`:2764`）与每次 `activateSurface()` 开头（`:2870`，不论切到哪个 kind 都先 pause）调用；`dispose()`（彻底清空 DOM 并递增 generation 计数器阻止旧 fetch 回写）在会话切换簇 `:1353`（`applySessionDetail`）与 `:1417`（`clearActiveSession`）调用 | 同上 | `docs/ui-composition.md:14`："File 明确 Current file / Recorded version"；`:33`（文件读取按 session/path/kind/run/hash 绑定） |

补充（不分 kind，适用于全部三者）：
- Escape 次序：`handleSurfaceEscape`（`app.mjs:4171-4238`）先处理已打开的 popover（connection/context，`:4178-4193`），再处理导航抽屉（`:4195-4199`），再处理展开态还原（`:4201-4204`，即"第一次 Escape 还原布局"），最后才真正 `closeSurface()`（`:4205-4207`，"下一次关闭"），与 `docs/ui-composition.md:15` 的描述一致。
- Tab 键盘：`ArrowLeft/ArrowRight/Home/End` 在 `#surface-tabs` 上的 `keydown` 处理（`app.mjs:4413-4432`），只在未隐藏的 tab 间循环，与 `docs/ui-composition.md:25`（"选择 tab 用箭头 / Home / End"）一致。
- 焦点保留：`renderSurfaceVisibility` 末尾在 modal 打开且当前焦点不在面板内时把焦点转移到当前选中 tab（`app.mjs:2853-2860`）；`closeSurface()` 用 `restoreLayerFocus(state.surface.returnFocus, ...)` 还原关闭前的焦点（`:2767`）。
- 响应式：`>=1024px` 三栏并排、`768–1023px` Inspector 覆盖层、`<768px` Inspector 占满（`docs/ui-composition.md:21-23`），底层 `inert`/`aria-hidden` 在 `renderSurfaceVisibility` 中统一设置（`app.mjs:2799-2821`）。

---

## 3. 参考图元素 → 本地事实对照

| 参考图元素 | 判定 | 依据 |
|---|---|---|
| Today 四格（统计瓦片） | **无实现，部分可派生** | 当前 `home-view.mjs`（全文件见下）不渲染任何 stat tile；`work-summary` 可提供 `pendingItems.total`（当前全部 pending，非"今日"过滤）与 `sessionCandidates` 中各会话 `latestRun`（每会话仅一条，无法精确统计"今日 run 数"——同一会话今日的更早 run 不出现，见表 1 "跨会话 run 列表"缺失项）；要做到 WK-34 所说"Today 取今日 pending / run 计数"，pending 计数可用（`pendingItems.total`，需前端按 `createdAt` 再筛"今日"，无 timezone 保证），run 计数在多 run/会话场景下不精确 |
| 热力图（按日活动） | **可派生，但不完整/代价高** | WK-34 裁定"热力图取 run `startedAt` 按日计数"；表 1 已确认没有跨会话的"全部 run"端点，只有 `sessionCandidates.latestRun`（每会话一条）与逐会话 `GET /sessions/:id` 的全量 `runs[]`（N+1 请求）；小规模会话数下可逐会话拉取后前端聚合，规模变大后无索引化聚合端点（`app/docs/work-summary-api.md:99-106` 明示服务端是 O(S+R+Q) 的常驻状态扫描，非可无限扩展的索引查询服务） |
| "Continue working" 卡片（title / project / status / edited-ago） | **有数据** | `work-summary.sessionCandidates.items` 直接给 `title`、`projectId`（配合 `GET /projects` 得 project 名）、`latestRun.status`、`recordedActivityAt`；"edited X ago" 需前端用 `recordedActivityAt` 与当前时间做差值计算，字段本身不含现成的"多久之前"字符串；现有 `home-view.mjs:64-97` 已经用同一批字段渲染一行式列表（`home-row-title`/`home-row-meta`/`home-row-status`），但未做卡片布局与相对时间格式化 |
| Progress list（步骤 done/pending） | **无数据** | run/session/question schema 均无"步骤"概念（表 1 全部字段列举，无 step/stage 字段）；唯一接近的是 events 流（工具调用等），但 WK-16 禁止编造状态，从原始事件反推"步骤完成度"属于新发明语义，不在既有已记录字段内 |
| Preview list（artifact 数量） | **有数据** | 单 run 维度：`run.artifacts.length`（`inspector.mjs:90,119` 已用 `${run.artifacts?.length \|\| 0} recorded files` 呈现）；会话工作区维度：`GET /sessions/:id/workspace` 返回的文件树条目数（`app/server/service.mjs:477-481`） |
| Context 卡片（files/links/projects, percentage） | **部分有数据，percentage 无数据** | files 可用工作区文件树计数；projects 可用 `GET /projects`；"links" 在 schema 中无对应字段（session/run/question/artifact 均无 URL 或引用链接概念）——无数据；"percentage" 无任何字段支持，WK-34 已明确裁定此类字段"无数据源...不进产品"（`intake-round-2.md:81`），本探查未发现与之相反的字段，予以确认；现有 `workspace-view.mjs:66-131` 的 `renderSessionOverview` 已提供 Workspace/Runs/Session settings 三组，字段为 materials 入口、latest run 状态、`run.artifacts.length`、`run.usage.turns`、permission 标签，无 links、无百分比 |
| tab 条（多文档 tab） | **结构已存在但语义不同** | 现有 `#surface-tabs` 是固定三 kind（workspace/run/file）单选 tablist（`index.html:299-336`），`state.surface.kind`/`runId`/`fileRef` 均为单值，非"可堆叠的多文档 tab 列表"；参考图里"同时打开多个文档 tab"的能力本地不存在 |

---

## 4. 结论（≤10 行，仅观察）

1. work-summary 三集合（`sessionCandidates`/`pendingItems`/`inspectionCandidates`）已提供跨会话聚合、分页（`total/truncated/hasMore/nextOffset`）与排序，是 Home 上带/下带唯一现成的跨会话数据源（`app/server/work-summary.mjs:16-56`）。
2. 全仓没有任何"跨会话全部 run 列表"端点；`sessionCandidates.latestRun` 每会话只折叠出一条最新 run，按日精确计数/热力图需要逐会话拉取或新增聚合端点。
3. 所有时间字段均为 `new Date().toISOString()` 产生的 UTC ISO 字符串（`store.mjs:25`），系统内无一处显式携带 timezone 元数据；现有前端用 `Date`/`toLocaleString()` 隐式按浏览器本地时区显示（如 `inspector.mjs:70-77`）。
4. 右栏三 kind（workspace/run/file）共用同一宿主面板与 tablist，切换/展开/Escape 逻辑集中在 `renderSurfaceVisibility`（`app.mjs:2782-2861`）与 `handleSurfaceEscape`（`:4171-4238`），三者不分叉。
5. 三 kind 的 renderer 生命周期形态不同：workspace 在有扩展绑定时才有真正的 mount/update/dispose 三段式（`:3184` 起），无绑定时和 run kind 一样是"每次整段重绘"；file kind 独有 `load/pause/dispose` 三态对象（`inspector.mjs:319-469`），`pause` 与 `dispose` 触发点不同（前者随每次 tab 切换，后者只在会话切换时）。
6. "放大工作面"的两段式 Escape（先还原布局、再关闭）已在 `handleSurfaceEscape` 中显式实现，与 `docs/ui-composition.md:15` 描述一致。
7. Home 当前渲染（`home-view.mjs`）是纯文字行列表，不含任何 stat tile、热力图、卡片式布局或百分比字段；参考图中的 Today 四格、热力图、Progress/Context 的百分比与"links"均无本地数据支撑。
8. Preview（artifact/workspace 文件计数）与 Continue 卡片（title/project/status/最近活动时间）在既有字段下可以做到有数据支撑；Progress 步骤化进度在现有 schema 下无字段支撑。
9. question 全量字段（prompt/answer/payload）不经任何汇总端点下发，只在事件流的 open 事件里出现一次，且 work-summary 故意省略（`app/docs/work-summary-api.md:56`）。
10. "WS-09" 字符串在本地仓库检索不到，无法核对 WK-33 所指静态映射与本表所列源码三 kind 的对应关系是否完整。

## 未核实项

- WK-33/WK-34 提到的 "WS-09 静态映射" 未在本地仓库找到对应文件/字符串，无法核对映射内容，也无法确认是否存在本表未覆盖的第四种 kind。
- `docs/surface-assignment.md`（V7-02）与 `docs/ui-composition.md` 之间是否存在冲突或先后覆盖关系未逐条比对，本卷只引用了与右栏结构直接相关的段落。
- 未启动服务、未实际运行 `work-summary`/`sessions`/`runs` 等端点验证响应，以上字段与分页行为均为静态代码阅读结论，未做运行时验证。
- 扩展 renderer ABI（`mount`/`update`/`dispose`，`app.mjs:2992-3403` 簇）的完整签名与外部扩展契约未展开阅读，本卷只摘录了与 workspace kind 生命周期直接相关的调用点。
- `readUiState`/`writeUiState`（EX-WK1 §4 的 `134-262` 簇）持久化了哪些 surface 状态字段（是否包含 kind/expanded 等）未在本卷展开核实。
