# WORK-AGENT-GUI-1 · 通用 Work Agent GUI 主入口与真源对齐

状态：票面冻结（2026-08-13 架构会话），待实现。实现与验收必须为不同会话。

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
