# WORK-AGENT-GUI-1 · 通用 Work Agent GUI 主入口与真源对齐

状态：R1 返修契约已冻结（2026-08-18 架构会话）。首轮 Motto 实现 `8f93e7a`
经独立 Luna 验收 `d742b30` **REJECT**；实现与 R1 复验必须继续为不同会话。

权威：`CLAUDE.md`；ADR-022「2026-08-13 产品中心修订」；ADR-023「2026-08-13 口径订正」；
`docs/product/vision.md`；本票。能力状态只认 `docs/status/current.md`。

## 一 · 目标

把 desktop 已有的 Pi lane 认作零垂类也成立的默认 Work 主体，并消除一条会伪造成功的旧工作稿
路径。完成后信息架构是：

- `Work`：现有 `PiLanePanel`，唯一通用 agent 主入口；
- `Scenes`：现有声明式场景/产物工作台，generic 基线场景恒在，垂类包只作加法；
- `Chat`：现有轻对话。

`Agent` 现在时称谓仍锁 `PI-BASE-GUI-ACCEPT`。本票只可使用 `Work`，不得宣称 product-live 或
external-validated。

## 二 · 已证缺口与 born-red

现行顶层 `Draft` 才挂 `PiLanePanel`，顶层 `Work` 实为场景面。与此同时，场景面内的
`DraftSeat.workTrack` 挂 `WorkDraftPanel`；其 `work-draft-store.ts` 只是 renderer 内的 singleton
`Map`，无 Tauri/host 写入。真实 grant 传入 `caseRoot=''` 后会被拼成伪 `/工作稿/<name>.md`，
`assertWorkDraftWritable` 判为可写并回“已新建/已保存”，但没有任何磁盘 effect。两条生产入口可达
该伪真源：零垂类 `scene-unloaded-draft` 与右栏 `wf-open-work-drafts`。

实现前必须先以真实 grant DOM 用例证明：点击任一旧入口、新建并编辑后，界面报告成功；重载后
内容消失，Tauri/Pi host 调用为零。该反例是本票 born-red，不能只写静态 grep。

另有授权边界缺口：`usePiLaneSession` 现只因 `containerId` 变化 reset；同一 matter 的 `grantId`
改变后旧 lines/view/history 可留存并被新授权面继续消费。本票先写反例，再把 session reset 身份
收敛为 `{containerId, grantId}`。旧 grant 的 sessionId、journal 投影、workspace viewer 与 pending
proposal 均不得跨新 grant 可见或可操作。

## 三 · 冻结实现范围

1. 顶层段命名/顺序改为 `Chat | Work | Scenes`：既有 `draft` segment 可内部保留 id 以缩小改面，
   但其用户可见 label 改 `Work`，既有 `work` segment 用户可见 label 改 `Scenes`。不得用 `Agent`
   越过称谓门。
2. 选中或创建已授权工作区后的默认 segment 改为 Pi `Work`。点 case、建 case、切 case 时都须按
   现行 grant 状态落到同一 segment；未授权时 Pi 既有 StartGate 诚实阻断，不回退场景或 demo。
3. 零垂类提示改成“通用 Work 可用，专业 Scenes 未加载”。`scene-unloaded-draft` 退役，替换为
   `scene-unloaded-work`，点击切到 Pi `Work`。generic 场景按钮继续同框可用。
4. Working folders 的“工作稿”入口改为 Pi workspace/历史稿入口：点击切到 Pi `Work`，不再
   设置 `workDraftMode` 或进入 `DraftSeat`。
5. 删除 `WorkDraftPanel.tsx`、`work-draft-store.ts` 及其测试；删除 `DraftSeat.workTrack`、
   `workDraftMode/openWorkDrafts` 和全部生产 import/testid。`DraftSeat` 收窄为 generic/垂类 artifact
   显式移交后的 `DraftPanel` 交付轨；它仍可编译 `generic.DraftDocument`，不得并入 Pi workspace。
6. `usePiLaneSession` 以 container+grant 身份重置。重授权发生时先清旧 projection/history/viewer，
   后续命令只使用新 grant；不改 durable journal schema，旧 journal 留在旧授权身份下但不自动投影。
7. `App.tsx` 过手即拆：现行高水位 **2218**，本票删除旧状态/分支后必须只降不升；同步门常量。

允许改动：`apps/desktop/src/App.tsx`、`chrome/copy.ts`、`rail/CaseRail.tsx`、
`workbench/scene-strip.tsx`、`workbench/draft-seat.tsx`、`modules/ModuleStack.tsx`、
`pi/use-pi-lane.ts`，对应单测/E2E/静态门，以及删除上述旧 panel/store。实现若需新增一个纯路由
helper/guard 文件可自决并在回执登记；超出此面停手上报。

## 四 · 必须保持

- Pi production 仍走 `createTauriPiLane`→Rust command→sidecar/journal/workspace；browser E2E 只作
  scripted projection/路由证据，不升级生产成熟度。
- generic.draft/batch 与 Legal 场景仍走同一 scene registry/production Work command；本票不改
  descriptor、Package ABI、scenario executor、MaterialStore、TOOL-READ 或垂类 schema。
- generic `DraftDocument`→“送入起草画布”→`DraftPanel`→no-replace 编译路径保留；本票不把 artifact
  交付稿偷渡进 Pi workspace，也不新增 promotion。
- Pi `/case` 只读、`/workspace` host-mediated 写；不得恢复 case-root `工作稿/` 写入，不得新增
  edit/delete/rename/bash/plan/subagent/skills/MCP/git/package manager。
- case/grant 变化 fail-closed；demo fixture 与 production 双向隔离。

## 五 · TDD 与验收

实现必须先留 born-red 原始输出，再做最小修复：

1. 真实 grant 两条旧入口产生 renderer-only 假成功；修后旧 testid/source/import 零残留。
2. 同 matter 换 `grantId` 后旧 Pi projection/history/pending proposal 仍在；修后立即清空且旧 viewer
   不能读新根。
3. 顶层标签/默认 route 仍为 `Work=Scenes, Draft=Pi`；修后 `Work=Pi, Scenes=scenarios`，零垂类 CTA
   与 Working folders 均只到 Pi。
4. generic.draft artifact handoff、generic.batch 与至少一枚 Legal scene 全链保持原行为；回退任一
   scene route 或把 DraftPanel 删除必须红。
5. 注入生产对 `workDraftStore`/`WorkDraftPanel` 的任一 import、`caseRoot=''` 工作稿写或旧 testid，
   静态门必须红。

完工门：`pnpm -r build`、`pnpm lint`、root `pnpm test`、desktop 全包、`pnpm site:guard`、cargo，
以及独立端口且不复用共享 server 的完整 Playwright。App 高水位只降不升，floor 只升不降。每一枚
mutation 逐项恢复并以 `git diff --check`/工作树状态证明零探针残留。

独立验收由新的 Luna clean clone 执行，只追加 `apps/desktop/ACCEPTANCE.md`。它须明确把 browser
Playwright 归类为 scripted 路由证据；真实 Tauri/WKWebView、真实 DeepSeek、workspace durable
bytes/hash、Stop/恢复/键盘/读屏/焦点仍由后继 `PI-BASE-GUI-ACCEPT` 验证。本票 PASS 不取得 agent
称谓门。

## 六 · OSS 与复杂度结论

四选一：**删除当期动作**。本票不缺 UI/runtime 机制，现有 React、assistant-ui external-store 与
Pi host 已足够；新增路由库、状态库或第二编辑器只会制造真源。删除 browser-only store 比引入依赖
更符合复杂度预算。

本票新增概念恰一枚：顶层 `Scenes` 命名，用于把声明式场景与 Pi `Work` 主体分开。其余均是删除
伪真源、改路由或收紧既有授权身份，不新增持久格式、runtime、tool 或 schema。

## 七 · 后继与禁区

本票独占 App 槽。完成并独立验收后立即派 `PI-BASE-GUI-ACCEPT`；若真实 Tauri/key 缺席，只能登记
external-validated blocked，不得再用 scripted 绿证代替。

`TOOL-READ-PRODUCTION-1` 后置且只服务声明式 Scenes：它需另冻 MaterialStore→ReadySourcePort
per-run adapter、生产 registry、descriptor IDs 与 production trace。Pi Work 已有自己的四工具，
不得为了复用 TOOL-READ 把两条 runtime/journal 混写。generic durable resume、Legal-named command
中性化、docx 真机 write/readback 均为独立票，不得夹带。

## 八 · 实现回执（2026-08-13 · Motto）

- born-red（修复前原始实跑）：真实 grant 的 `scene-unloaded-draft` 与 `wf-open-work-drafts` 共
  **2/2 failed**；两入口各得到 renderer Map 成功行与伪 `/工作稿/*.md`，reload 后均为 0 行，
  Tauri/Pi host 调用均为 0。同 matter 从 `grant-old` 换 `grant-new` 的 DOM 用例 **1/1 failed**：
  仍见 `session-current`、`op-old`、prior history 1，且旧 decision/open 各被调用 1 次。
- 实现：用户可见顺序收敛为 `Chat | Work | Scenes`；选中/创建已授权容器默认进入 Pi Work；
  零垂类 CTA 与 Working folders 工作稿入口只切 Pi；旧 `WorkDraftPanel`、renderer Map store、
  `DraftSeat.workTrack` 与生产状态/入口全部删除。`DraftSeat` 仅保留显式 artifact handoff 到
  `DraftPanel` 的 no-replace 交付轨。`usePiLaneSession` reset 身份改为 `{containerId, grantId}`，
  授权变化立即清 projection/history/viewer/pending，并拒绝旧异步结果与旧授权动作；durable journal
  schema 未改。
- 永久守卫：新增生产源码/入口/标签守卫及其 Node mutation 测试；向真实生产文件逐项注入
  `workDraftStore` producer、`WorkDraftPanel` import、旧 `scene-unloaded-draft` testid、
  `caseRoot=''` + `工作稿` 写法，四次均 **exit 1 / 1 issue**，逐项恢复。grant reset 身份退回只看
  container 后 DOM 用例 **1/1 failed**；标签退回 `Chat | Draft | Work` 后 E2E **1/1 failed**；
  删除 `DraftPanel` 后 generic.draft E2E **1/1 failed**。守卫恢复后 Node **2/2 passed**、
  定向 DOM **17/17 passed**。
- 回归证据：desktop 单测 **100 files / 884 tests passed**；root **183 / 2251 passed**；完整
  Playwright（独立端口 15458，`reuseExistingServer:false`）**391/391 passed**，其中 browser 证据
  只归类为 scripted route，不宣称 Tauri/product-live；generic.draft、generic.batch 与 Legal S1
  均在该轮通过。`pnpm -r build` 15 个 workspace project 通过；`pnpm lint` 通过；
  `pnpm site:guard` **103/103 passed**；cargo **259 passed / 0 failed / 1 ignored**。
- 预算与偏离：`App.tsx` 从 2218 降至 **2195**，门上限同步下调；Playwright floor 从 388 升至
  **391**。OSS 结论按票执行“删除当期动作”，零新依赖，新增概念仅 `Scenes`。为维持旧场景测试的
  显式语义，E2E helper/相关用例在需要 Scenes 时显式点选；设计线级账把三个已删除 WorkDraft
  consumer 前向记为 retired。无 schema、wire、journal、runtime、Package ABI 或垂类契约偏离。

## 九 · R1 返修冻结（2026-08-18 · 架构）

### 9.1 拒绝证据与裁决

独立 Luna 在 `8f93e7a` 上完整实跑 build/lint/root **183 files / 2251 tests**、desktop
**100 / 884**、cargo **259 passed / 1 ignored**、site guard **103/103** 与独占端口 Playwright
**391/391**，并确认 work-agent 静态门经 `assert-test-count.mjs` 真正进入完整
`test:e2e` 链。常规门全绿不抵消下述两枚生产反例：

1. v1 GUI 历史索引只存 `{containerId, sessionId}`。`grant-old` 写入的历史在应用
   remount/reload 后，同 container 直接以 `grant-new` 初始挂载时仍会进入 prior list，
   `openWorkspaceMarkdown` 亦真收到旧 session。首轮只测同挂载 rerender，没有
   证成跨重载授权隔离。
2. 被持有的 `grant-old` `start` closure 在 rerender 到 `grant-new` 后仍能调用
   `port.start({grantId:'grant-old', ...})`。回复后 teardown 只是事后收摊，不能追认已发出的旧
   授权命令。

架构裁决：两枚都是本票已冻结的“case/grant 变化 fail-closed；后续命令只使用新 grant”
的实现缺口，不新立 wire 语义。R1 只收窄 GUI 索引缓存与命令前置门；不扩 Tauri
command、Pi journal/host/wire、workspace 物理格式或 Package ABI。

### 9.2 历史索引 v2 精确契约

`pi-history` 是可丢弃的 GUI 索引缓存，不是 journal 或文件真源。本轮准予把其现有版本化
格式升为 v2，**不计新增持久概念**：

- storage key 与 envelope version 同步升 v2；`PiHistorySession` 必填非空 `grantId`，写入值
  必须是生成该 fold 的当前 grant；
- v1 记录无法证明属于哪个 grant，**禁止迁移或猜测归属**。v2 reader 不读 v1 key，旧缓存
  当空处理；不为清理一枚可丢弃缓存新增 `removeItem` 宿主能力；
- 覆盖唯一性、prior 派生与 viewer `open` 放行一律同时比对
  `{containerId, grantId, sessionId}`；仅 container 相等不得放行；
- 历史容量仍是每 container 最多 3 段，不因 grant 数放大本地缓存；同挂载 grant 变更可继续
  删掉该 container 的旧 GUI 索引，但正确性不得依赖此 effect 曾在本次进程发生；
- 当前活动 session 仍由 `{containerId, grantId}` identity 控制；无须、也禁止为本票给
  `openWorkspaceMarkdown` 新增 grant 字段或改 Rust 命令契约。

### 9.3 stale start 前置门

`start` closure 必须在 mint sessionId、任何 React state 变化、建 coalescer 与调用
`port.start` **之前**，把该 closure 捕获的 identity key 与当前 `identityRef.current`
同步比对；不等即零副作用返回。不得用 closure 自己捕获的 `identityOwnsState` 布尔值代替
当刻 ref，也不得依赖 reply 后 teardown 作前置授权门。identity 在请求已发出后才变化的
race 继续沿现行 reply 身份复核＋teardown 收束，不改 host 协议。

### 9.4 R1 TDD、边界与验收

新的实现会话必须从 `d742b30` 顶端先把 Luna 临时探针收为永久测试，在未改生产码时
记录两枚稳定红，再做最小修复：

1. v1 old-grant 缓存＋全新 remount/reload＋同 container/new grant：prior 必为 0，
   `openWorkspaceMarkdown` 必为 0；
2. v2 中 old grant 与 current grant 同时存在：只当前 grant 可见、可 open；撤掉任一
   `grantId` validator/filter/open 比对必红；
3. 持有 old-grant `start`，rerender 到 new grant 后调用：mint/state/coalescer/port 全部零 effect；
   撤掉调用开头的 ref 门必红；
4. 新 grant 正常 `start`、同 grant 历史跨 reload 仍可见/可 open，不得为防泄漏把全部
   历史功能恒空；
5. 首轮全部路由、伪真源退役、generic/Legal handoff、App highwater 2195 与
   Playwright floor 391 门全保留，只升不退。

R1 允许改动仅：`pi/pi-history.ts` 及定向测试、`pi/use-pi-lane.ts`、
`pi/use-pi-lane.dom.test.ts`、work-agent 静态门/门测试、本票实现回执。禁止再改 `App.tsx`、
视觉/route、Tauri/Rust、journal/wire、Package ABI、垂类或全局文档；不加依赖、新存储 backend
或通用授权抽象。完工重跑本票全部门；只交实现与 SPEC 回执，停在待新的独立 Luna
clean-clone 复验，不自行合并或更新 `current.md`。

## 十 · R1 实现回执（2026-08-18 · Motto）

基线 `834ff6f0`；父链含首轮实现 `8f93e7a` 与独立 Luna REJECT `d742b30`。本回执由被终止
会话续行完成：全部实现与永久测试从 dropped stash `e878259f` 逐文件恢复并与工作树比对一致
（`refs/stash` 已空），Playwright 生成的 18 张 release/evidence 截图等测试生成物全部恢复为
HEAD；最终工作树 clean、stash 为空，提交只含 R1 允许文件。

- born-red（未改生产码基线实测，本轮复跑）：Luna 两枚临时探针收为永久测试后，生产码
  回退 HEAD 实跑 **8 failed / 4 passed（12）**。pi-history 5 枚红：storage key 未升 v2、
  v2 reader 仍读 v1 key、写唯一性缺 grantId 维度、缺/空 grantId 未拒读、prior 派生缺 grant
  过滤；DOM 3 枚红——v1 old-grant 缓存＋全新挂载/reload＋同 container new grant 时
  prior 为 1 且 open 放行、stale start closure 在换 grant 后 mint 与 port.start 均被调用、
  v2 新旧 grant 并存时旧 grant 仍可见。
- 实现：`pi-history.ts` 升 v2——`PI_HISTORY_STORAGE_KEY='courtwork.pi-drafts.v2'`、
  `PI_HISTORY_SCHEMA_VERSION=2`、`PiHistorySession` 必填非空 `grantId`、`isSession`
  fail-closed 拒读缺/空 grantId；写唯一性、`priorSessionsFor` 与 viewer `open` 放行一律同时
  比对 `{containerId, grantId, sessionId}`；容量仍每 container 最多 3 段；v1 不迁移、不猜
  归属，v2 reader 不读 v1 key；`openWorkspaceMarkdown`/Tauri/Rust wire 零改动。
  `use-pi-lane.ts` `start` closure 在 mint、任何 setState、建 coalescer、`port.start` 之前，
  把 closure 捕获的 identity key 与当刻 `identityRef.current` 同步比对，不等即零副作用返回；
  不用 closure 捕获的 `identityOwnsState` 布尔代替当刻 ref，也不依赖 reply 后 teardown 作
  前置门（请求已发出后才变的 race 仍沿现行 reply 身份复核＋teardown 收束）。
- 永久测试与门：新增 `src/pi/pi-history.test.ts`（7 例）；`use-pi-lane.dom.test.ts` 增 4 例
  R1 用例（v1 旧缓存全新挂载 zero prior/zero open、stale start 零 effect、v2 新旧 grant 并存
  只 current 可见可 open、同 grant 跨 reload 可见可 open＋新 grant start 正常），文件共 5 例。
  work-agent 静态门新增 `scanWorkAgentR1Contracts`（storage key v2、version 2、非空 grantId
  校验、open 比对 grantId、start 前置门先于 mint），并接入门测试 2 例；`assert-test-count.mjs`
  已确认该门与门测试进入完整 `test:e2e` 链。
- mutation（逐枚注入必红、逐枚恢复）：撤 start 顶部 ref 门→静态门 exit 1；撤 open
  `entry.grantId === grantId`→静态门 exit 1；v2 key 退回 v1→静态门 exit 1；撤 grantId
  `length > 0` 校验→静态门 exit 1；撤 `session.grantId === 'string'` 类型校验→
  pi-history「缺/空 grantId」1 failed；撤 `priorSessionsFor` 的 grant 过滤→
  pi-history「prior 派生」1 failed；撤 open 的 grantId 比对→dom「v2 并存」1 failed。
  全部恢复后定向 **12/12 passed**、门测试 **4/4 passed**、静态门通过。
- 全门数字（本轮实跑）：`pnpm -r build` **15/16** workspace project 通过；`pnpm lint`
  通过；root `pnpm test` **183 files / 2251 tests**；desktop `pnpm test` **101 files /
  895 tests**（R1 新增 pi-history.test.ts）；`pnpm site:guard` **103/103**；product/headless
  sidecar 构建 reproducible 通过；cargo **259 passed / 0 failed / 1 ignored**；
  `assert-test-count.mjs` Playwright **391** 条（floor 391，不降）；App highwater **2195**
  （上限 2195，不升）。完整 Playwright **391/391** 复用前序已完成全门结果（该状态与本次提交
  完全同源，18 张 release/evidence 截图即该轮生成物，已恢复为 HEAD 不入提交）。
- 偏离/新增概念：零新增持久概念（v2 沿既有版本化单键先例，不计新概念）；零新依赖、零新
  backend、零通用授权抽象；未改 App.tsx、视觉/route、Tauri/Rust、journal/wire、Package
  ABI、垂类或全局文档。唯一差异是恢复/续行过程的提交方式：先恢复被终止会话的 stash 对象，
  与任务正文一致，不构成契约偏离。
