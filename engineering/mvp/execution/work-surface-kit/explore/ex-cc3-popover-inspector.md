# EX-CC3 · Popover 统一 Inspector 落点，只读探索

状态：只读 explore，Sonnet，2026-09-09，派单见 [intake-round-3 §4w WK-118 (g)](../intake-round-3.md)。

只读声明：本卷只读 `/private/tmp/se-fable-r4d`（基线 `main` `d112beb`，HEAD `509c41d`）内的文档、`app/web/app.mjs`、`app/web/ui-controls.mjs`、`app/web/inspector.mjs`、`app/web/thread-projection.mjs`、`app/web/runtime-view.mjs`、`app/web/styles.css`、`app/web/index.html`、`tools/lint-materials.mjs`、`app/tests/*.test.mjs`、`evidence/fe03/`、`evidence/fe04/`。未修改任何产品代码、未 `git commit`、未启动任何服务、未新增依赖。链接与 Atlas 原文未经核验，一律标"Atlas 称"；结论标 file:line，无法核实处写"未核实"。

## 1. 现状盘点：今天有几类"浮出层"，各自怎么定位

产品代码里能找到的"某处点击/悬停后出现一块补充信息"的机制，共有五种，彼此不共享实现，也不共享状态容器：

### 1.1 原生 Popover（`popover="auto"`）+ Floating UI 计算位置 —— 已有两个实例，且已经是"多 trigger 共用一个 popup"

`connection-popover` 是本仓**已经存在**的"多锚点共享一个浮层"实例，形态与 Atlas 描述的 Base UI multiple/detached triggers 几乎一致：

- 声明：`<div id="connection-popover" class="context-popover connection-popover" popover="auto">`（`app/web/index.html:729-732`），复用 `.context-popover` 的材质/圆角/阴影，`.connection-popover` 只覆盖 `inset: auto; width: 340px`（`app/web/styles.css:2837-2839`），专门清掉基类的固定角落定位，好让 JS 算出的 `left`/`top` 生效。
- 两个不同位置的触发者共用同一个 `aria-controls="connection-popover"`：composer 里的 `model-settings-button`（`app/web/index.html:287-296`）与页脚的 `permission-settings-button`（`app/web/index.html:336-341`）。
- 打开逻辑 `openConnectionCard(anchor)`（`app/web/app.mjs:4791-4830`）：把触发它的元素存进 `state.connectionCardAnchor`，渲染内容后 `popover.showPopover()`。
- 定位靠 `anchorPopover(anchor, popover, {placement})`（`app/web/ui-controls.mjs:224-238`），内部是 Floating UI 的 `computePosition` + `offset(8)/flip()/shift({padding:8})`，`strategy:"fixed"`，通过 `autoUpdate` 在锚点滚动/尺寸变化时重算并直接写 `popover.style.left/top`（无过渡，每帧对齐，不插值）。
- 绑定时机：不在打开时算一次，而是监听 popover 自己的原生 `toggle` 事件（`app/web/app.mjs:5565-5584`），`open` 时才对当前 `state.connectionCardAnchor` 起 `anchorPopover(...,{placement:"top-start"})`，`close` 时调用返回的 cleanup 停止 `autoUpdate`；同时把两个触发按钮的 `aria-expanded` 与"谁是当前锚点"同步。
- Floating UI 库是本仓已经 vendor 好的本地文件 `app/web/vendor/floating.mjs`（`app/web/ui-controls.mjs:1-7` 的 import 来源），不是新依赖。

`context-popover` 是同一 `popover="auto"` 机制，但只有一个触发者（`show-run-button`，`app/web/app.mjs:5560`），且**不走 `anchorPopover`**：`openContextSummary()`（`app/web/app.mjs:4842-4871`）只 `showPopover()`，位置由 CSS 写死在右上角 `position:fixed; inset: 88px 20px auto auto`（`app/web/styles.css:2381-2397`）——它是"打开一张固定角落的卡"，不是"贴着某个锚点"。

两者共享同一套材质：`background: var(--glass-muted)` + `backdrop-filter: blur(var(--blur-transient)) saturate(1.4)`（`styles.css:2393-2394`），并列入 `tools/lint-materials.mjs:29-32` 的登记表（键是 CSS 类名 `.context-popover`，`layer: "transient"`）——因为 `connection-popover` 在 HTML 里也带 `.context-popover` 类，它不需要单独登记就能通过 lint。reduced-transparency 回退两处都有：`styles.css:2398-2403`（context-popover）与它继承的同一条规则对 connection-popover 同样生效（选择器命中）。开合的进入/退出动效：`dialog[open], .context-popover:popover-open, .ui-tooltip:popover-open` 共享一条 `@starting-style` 淡入 + 4px 位移（`styles.css:2722-2742`），`prefers-reduced-motion: reduce` 与 `:root[data-motion="reduce"]` 两条全局规则把 `transition: none !important` 打在 `*`（`styles.css:2320-2326`），会自动吃掉这条淡入过渡——但这条全局规则**只杀 CSS transition**，不会杀 `anchorPopover`/`autoUpdate` 里 JS 直接赋值 `style.left/top` 的瞬时跳变（因为那从来就不是过渡，是每帧重算），也就是说"锚点间平滑移动"如果将来要做，必须是一条新的、显式的 CSS `transition: left, top` 或 FLIP 位移动画，且必须自己去读 `prefers-reduced-motion`/`data-motion`，不能指望现有的全局兜底规则替它降级。

### 1.2 单例 tooltip，靠 CSS 属性选择器认锚点 —— 是目前"内容随锚点切换"最接近的先例

`installTooltips()`（`app/web/ui-controls.mjs:239-341`）建一个**唯一**的 `<div id="control-tooltip" popover="manual">`（`ui-controls.mjs:240-244`），随后：

- 监听 `document` 级 `pointerover`/`pointerout`/`focusin`/`focusout`（`ui-controls.mjs:301-325`），凡是 `event.target.closest("[data-tooltip]")` 命中即可成为锚点——锚点集合不是一次性登记的列表，是运行时按 CSS 属性选择器动态认领的，新增一个 `data-tooltip` 属性的元素立刻可用，不用改这个模块。
- `show(target)`（`ui-controls.mjs:260-297`）里：`hide()` 旧的，`tip.textContent = target.dataset.tooltip`，`tip.showPopover()`，然后对新锚点起一次新的 `autoUpdate` + `computePosition`。
- 用 `generation` 计数器（`ui-controls.mjs:249,275,290`）避免"锚点 A 的位置计算还没回调完，用户已经切到锚点 B"时把 A 的坐标写进 B 的 tooltip——这正是共享一个浮层、内容随锚点切换时必须有的竞态保护，且**已经在生产代码里存在**，可以原样复用到共享 Inspector。
- 显隐节奏：hover 首次 400ms 延迟显示、120ms 延迟隐藏（`ui-controls.mjs:310,316,318`）；`pointerdown` 立即隐藏（`ui-controls.mjs:326`）；Escape 隐藏（`ui-controls.mjs:327-339`）；`focusin` 只在 `:focus-visible` 时显示，`focusout` 立即隐藏（`ui-controls.mjs:320-325`）——键盘可达。
- 内容仅纯文本（`tip.textContent = ...`），不承载可交互 payload、不发请求、不分状态——这是它和"统一 Inspector"最大的差距：结构（单例 + 动态认锚 + generation 竞态保护）已经具备，但内容形状（可交互、多态、可能要拉数据）完全没有先例。

### 1.3 `<details>` 原位展开 —— Tool row 与 Trace 的事件行

Tool row 不是浮层，是一个 `<details class="tool-card">`（`app/web/app.mjs:2555`），点击 `<summary>` 原位展开/折叠，展开状态存在 `state.toolOpen`（一个 `Map`，键 `toolScopeKey(runId, callId, name)`，`app.mjs:2556-2559,2593-2595`）里，内容直接是 `appendToolDetails(detail, row)` 写进同一个 `<div class="tool-detail-block">`（`app.mjs:2590-2592`）。Trace/Run details 里的每条事件同样是 `<details class="event-row">`（`app/web/inspector.mjs:273-287`）。这两处都是 FN-26 定义的 Disclosure 原语（展开补充内容），不是 Popover，不悬浮、不遮挡、不需要 dismiss。

### 1.4 手写 `open` 集合 + `hidden` 属性 —— Runtime 资源行的 Permission / Source 详情

`app/web/runtime-view.mjs` 里资源列表的每一行有一个本地 `open` 集合（模块内闭包变量，未见于本次读取范围内的具体声明行，但消费处在 `runtime-view.mjs:1035-1039`：点击 `title` 切换 `open.has(resource.id)` 再整体 `render()`）。展开后追加的内容块——`permissionDetail(resource)`（`runtime-view.mjs:784-829`，权限效力与逐层 trace）、`sourceDetail(resource)`（`runtime-view.mjs:831-893`，descriptor 字段）、`sourceInspector(resource)`（`runtime-view.mjs:898-948`，需要点"View source"按钮再拉一次内容，`inspected?.id !== resource.id` 时直接返回 `null`）——全部 `detail.append(...)` 进同一个 `<div class="runtime-detail" hidden={!expanded}>`（`runtime-view.mjs:1076-1099`）。这是第四种机制：既不是 `<details>`，也不是 Popover，是手写的 `hidden` 属性配合整表重渲染。`permissionDetail`/`sourceInspector` 两个函数在没有对应事实时显式返回 `null`（`runtime-view.mjs:786,899`）——调用处用 `.filter(Boolean)` 吞掉（`runtime-view.mjs:1083,1095`），这正是派单里提到的"可返回 null 的 detail helper"。

### 1.5 整块工作面导航 —— File / Trace 的"打开"其实是换页，不是弹出一小块

点击一条工具行产出的文件引用，走的是 `openFile(ref)` → `activateSurface("file")`（`app/web/app.mjs:2881-2889,3661-3664`），把 `fileView.load(ref)`（`app.mjs:3565`，`createFileView` 定义于 `app/web/inspector.mjs:325-475`）的内容渲染进 `#surface-panel`（`app.mjs:3394`）——这是 WK-113 已裁定的"L2 悬浮工作面 / ≥1024 覆盖层"，是一整块可独立滚动、有自己 tab strip（run/file/workspace/runtime）的面板，不是跟着锚点走的小卡片。Trace（Run details）同理，`renderRun()`（`inspector.mjs:33-295`）整个渲染进同一个 surface-panel 容器。也就是说：**"Artifact/File" 与 "Trace/Run details" 今天根本不是浮出层，是导航目标**；Atlas 说的"点 file、点 source，同一个浮层迁移过去"和这两者的现状是两种不同的信息架构，不是"加个动画"的差距。

### 1.6 "Context chip"——Atlas 提到的第四类锚点，代码里没有对应的可点击入口

`renderContextBar`（`runtime-view.mjs:2444-2531`）和 Trace 里的"Effective context inspector"表格（`runtime-view.mjs:1760-1823`）都是**只读、不可点击**的展示：`context-bar-segment` 是 `role="img"` 的图形化条（`runtime-view.mjs:2482-2497`），`runtime-context-row` 只是 `<tr>`，没有 `addEventListener`（`runtime-view.mjs:1792`）。搜索 `context-chip`/`source-span` 一类类名在 `app.mjs`/`runtime-view.mjs`/`styles.css` 里均未找到。Atlas 说的"点 context chip 弹出检查器"目前**没有对应的产品对象**，落地前先要有一个可点击的 chip，这本身是新增交互面，不是复用现有点击目标。

### 1.7 一张现状表

| 锚点/触发 | 触发方式 | 定位方式 | 焦点/Escape | 材质登记 | payload 来源 |
|---|---|---|---|---|---|
| model-settings-button / permission-settings-button → connection-popover | click | Floating UI `anchorPopover`（`ui-controls.mjs:224-238`），随锚点移动会重算但不插值 | `handleSurfaceEscape` 专门分支，`app.mjs:5359-5365`，焦点还给 `state.connectionCardAnchor` | 复用 `.context-popover` 登记（`lint-materials.mjs:31`），有 reduced-transparency 回退 | DOM 内已有的 `state.providerConfig`/`currentSession()`，无二次请求 |
| show-run-button → context-popover | click | CSS 固定角落 `inset:88px 20px auto auto`，**不随锚点** | `handleSurfaceEscape` 专门分支，`app.mjs:5367-5373`，焦点硬编码还给 `$("show-run-button")` | 同上登记 | 同上，DOM 内已有数据 |
| `[data-tooltip]`（任意元素） | hover(400ms)/focus-visible | Floating UI，单例 tooltip，`generation` 竞态保护 | Escape/pointerdown/focusout 立即隐藏（`ui-controls.mjs:312-339`） | `.ui-tooltip` 用 `--float` 实色，未登记也不需要登记（无 blur） | `target.dataset.tooltip` 纯文本，无请求 |
| tool row `<summary>` | click | 原位展开，无定位问题 | 无需 Escape，`<details>` 原生语义 | 不适用（无 blur） | 事件流已投影出的 `row.request/result` |
| runtime 资源行 title / "View source" | click | 原位展开，手写 `hidden` | 无 Escape 语义，整表重渲染 | 不适用 | source 内容需要 `inspectSource(resource)` 二次请求（`runtime-view.mjs:974`），permission/descriptor 是已有字段 |
| artifact 行 / tool row 内文件引用 | click | 换到 `#surface-panel`（换页，非浮层） | 由既有 `restoreLayerFocus`/`surface.returnFocus` 处理（`app.mjs:3331`） | 不适用 | `createFileView` 二次请求 `/artifacts/file` 或 `/workspace/file`（`inspector.mjs:337-351`） |

## 2. "同一浮层随锚点迁移"的落点

**语义上属于"检查一个对象"的锚点**：tool row（检查一次工具调用）、文件引用（检查一条记录版本）、runtime 资源行的 source/permission（检查一个能力的授权与来源）、connection chip（检查当前连接与文件权限）。这四类的共同点是：只读、有明确的 identity（`{runId, callId}` / `{sessionId, runId, path, sha256}` / `resource.id` / session 本身），关闭它不产生任何后果。

**语义上不属于这一类的**：Question、Approval、`context-popover`（它现在承载的是"打开 Materials / 跳到某个 Run / 打开 Permissions 设置"这类**导航动作**，不是"检查只读事实"）。Question/Approval 需要保持随时可见、可键盘操作、提交后原地变态（primitive-canon §2.5/2.6，`contracts/primitive-canon.md:71-92`），这与"可被下一次点击顶替、随时可能被挤到另一个锚点旁边"的浮动检查器语义冲突——Atlas 自己在"八条共识"第⑦条也把这两者分到了"必须决策 → Dialog/inline Approval"，不是 Popover（`inputs/local-ui-atlas-2026-09-09.md` 共识⑦；`intake-round-3.md:199` WK-118(b) 已把这条采纳为既有裁定）。

**共享状态形状能否只用现有字段拼出**：

- **锚点身份（anchor identity）**——可以。四类锚点各自已经有稳定、无需新造的 identity：tool row 用 `toolScopeKey(runId, callId, name)`（`app.mjs:2556`）；文件引用用 `inspector.mjs` 里的 `target = {kind, sessionId, runId, path, sha256}`（`inspector.mjs:115-121`）；runtime 资源用 `resource.id`（`runtime-view.mjs:1062`「data-resource」）；connection 用 session 本身。一个判别式联合类型（discriminated union）能覆盖全部四种，不用碰后端契约。
- **payload kind**——也已经隐式存在（四种详情渲染函数分别对应四种 payload 形状），但从未被抽成一个统一的"kind → renderer"分发表；今天是四段各自独立的调用代码（`app.mjs` 里的 `appendToolDetails`、`inspector.mjs` 的 `createFileView`、`runtime-view.mjs` 的 `sourceInspector`/`permissionDetail`、`app.mjs` 的 `renderConnectionCard`），互相不知道对方存在。
- **position**——不需要新状态：`anchorPopover`/`autoUpdate` 已经是"给一个 anchor 元素，实时算出 fixed 坐标"的通用函数，不关心锚点是什么语义对象。
- 真正缺的是一个**统一的"当前打开的检查器是谁"单点状态**（anchor element + kind + ref），今天这四类各自散在 `state.toolOpen`（Map）、`open` 闭包 Set + `inspected` 变量、`state.surface`、`state.connectionCardAnchor` 四处不同容器里，且没有互斥关系——比如今天完全可能同时有一个展开的 tool row、一个展开的 runtime 资源行、以及打开的 surface-panel，三者互不冲突也互不知晓。做成"同一浮层"意味着这四处状态要合并成一个（只能有一个 inspector 打开），这是本次改动里**唯一必须新增的状态**，不是简单复用。

**原生 Popover API + CSS anchor positioning 在目标 Chrome 上是否可用**：`evidence/fe04/browser.mjs:13-14` 与 `evidence/fe03/README.md:22`、`evidence/fe04/README.md:25` 显示，本仓的 headless 断言固定执行 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`（**系统安装的 Chrome，路径写死，版本不写死**）——`browser.mjs:22-25` 在启动后用 CDP `/json/version` 在运行时读版本号，两份 README 均未记录读到的具体版本字符串（未核实）。本仓现有实现（`anchorPopover`/`installTooltips`）**已经绕开了原生 CSS anchor positioning**，改用 Floating UI 在 JS 里算 `position:fixed` 坐标——这本身就是"目标环境下 CSS anchor positioning 不足以直接用"的一个实际信号（虽然本卷未去核实这是历史选择还是刻意为之，`git blame` 未读，标"未核实"）。若 CC-I 沿用同一条路径（Floating UI + `popover` 属性），不必等待或验证 CSS anchor positioning 的浏览器支持面；若考虑改用原生 anchor positioning 换取浏览器原生的位置过渡，需要先确认目标 Chrome 版本足够新且项目不需要兼容 Safari/Firefox（本卷未核实这两者的支持现状，只在此处提示需要单独核实，不作为已核实事实写入）。

**位置/尺寸过渡在 reduced-motion 下的退化**：现有 `*{transition:none!important}` 全局规则（`styles.css:2320-2326,2793-2799`）能吃掉"用 CSS transition 做位移/变形"的方案，一次接入即自动降级为瞬时跳变，不需要额外写回退——前提是新代码确实用 CSS `transition`/`@starting-style` 而不是 JS 里手写 `requestAnimationFrame` 插值（后者不会被这条全局规则拦住，需要自己判断 `matchMedia("(prefers-reduced-motion: reduce)")` 或 `:root[data-motion="reduce"]`）。

## 3. 与既有契约的冲突点

| 契约 | 冲突/关系 | 判断 |
|---|---|---|
| FN-24 三类版本分开（renderer generation 约束旧回调，`engineering/design/frontend-layering-spec.md:109`） | 共享 Inspector 若异步拉取内容（如 `sourceInspector` 需要 `inspectSource()`），必须防止"打开 A 的请求还没回来，用户已经点了 B"时把 A 的内容画进 B 的浮层 | **可行，不需要改契约**——`installTooltips` 的 `generation` 计数器（`ui-controls.mjs:249,275,290`）与 `createFileView` 的 `generation`（`inspector.mjs:327,331,352`）已经是同一种模式的两份独立实现，CC-I 只需要把它套用到新的统一分发点，不是发明新机制 |
| FN-28 状态不只靠颜色（`frontend-layering-spec.md:123`） | 四类 payload 各自已经把状态用文字写清楚（`Failed`/`Interrupted`、`Recorded version`/`Current file`、`Effect`/`Step N`），迁移进同一个浮层容器不改变这些文字本身 | **可行**——只要新容器不引入"用位置或图标暗示状态"的捷径 |
| WK-101 禁 glass-on-glass（`intake-round-3.md:112`） | 若统一 Inspector 复用 `.context-popover` 的 `--glass-muted`/`--blur-transient`（Transient 层），而锚点恰好是 Chrome 层的 glass 元素（如 `.jump-latest-button`，`styles.css:1250,1266-1268`）之上，就会出现 WK-104 已经点名、FE-05 尚未消融的"运行时 glass-on-glass（popover 打开于 `.jump-latest-button` 之上）静态 CSS 未验"的同一个反例（`intake-round-3.md:116`） | **需改约/等前置**——这正是 Atlas README 索引把 popover-inspector 排在"候选工单 CC-I（FE-05 后）"的原因（`engineering/design/atlas/README.md` popover-inspector 行）；CC-I 不应早于 FE-05 的消融表落地 |
| WK-102 blur 只在登记类名（`intake-round-3.md:113`；机制见 `tools/lint-materials.mjs:29-32`） | 若 CC-I 给共享 Inspector 起一个新类名（不复用 `.context-popover`），必须同时在 `REGISTERED` 表新增一行并补 reduced-transparency 回退，否则 `npm test` 里的 `lint-materials` 会挂 | **可行，纯工程动作**——照抄 `.context-popover` 现成的两条规则（`styles.css:2381-2403`）即可，不构成契约冲突，只是"别忘了" |
| Focus restore 两步 Escape（`handleSurfaceEscape`，`app.mjs:5352-5394`） | 现在每个 popover 各自一段硬编码分支：`connection-popover` 焦点还给动态存的 `state.connectionCardAnchor`（`app.mjs:5359-5365`），`context-popover` 焦点写死还给 `$("show-run-button")`（`app.mjs:5367-5373`，因为只有一个触发者）。统一 Inspector 若要服务 4+ 类锚点，`context-popover` 这种"写死一个按钮 id"的写法必须换成 `connection-popover` 已经在用的"记住触发它的具体元素"模式 | **可行，需要扩展现有模式，不违反契约**——`connection-popover` 已经示范了怎么做，只是 `context-popover` 还没这么写；这是一次小改写，不是新发明 |
| chat-work-shell 冻结断言（`app/tests/chat-work-shell.test.mjs:57,63`） | 该测试断言 Matter header 的 scope 位当前**不得**带 `popover`/`aria-haspopup`/`chevron`/`addEventListener`/`button` 中任何一项 | **需改约（若涉及该区域）**——若 CC-I 打算让 scope 位本身也变成一个可点击锚点，这条冻结断言要先被裁定改写，不能悄悄加 |

## 4. 代价估算

**涉及文件/函数（若按"一个共享 Inspector 状态 + 复用 Floating UI 定位"的最小路径估算）**：
- `app/web/app.mjs`：新增/合并一个统一 open-inspector 状态（替代或包装 `state.toolOpen`、`state.connectionCardAnchor`、runtime-view 的本地 `open`/`inspected`、`state.surface` 的调用关系不必动，因为 File/Trace 按 §1.5/§2 的判断本轮不纳入）；`handleSurfaceEscape`（`app.mjs:5352-5394`）要从"逐个 popover id 分支"改成"关当前打开的那一个、焦点还给记住的锚点"。
- `app/web/ui-controls.mjs`：`anchorPopover`（224-238）可直接复用；如果要做"跨锚点内容切换"而不是"开新的、关旧的"，`installTooltips` 的 generation 保护模式（239-341）需要被抽成可复用的辅助，而不是在新代码里重写一份。
- `app/web/runtime-view.mjs`：`permissionDetail`/`sourceDetail`/`sourceInspector`（784-948）目前是"追加进本地 `<div hidden>`"的写法，要迁移成"喂给外部共享容器"需要改调用方式（谁调用、传给谁），不是改这三个函数本身的取数逻辑。
- `app/web/thread-projection.mjs`：不需要改，它只产出数据，不碰 DOM。
- `tools/lint-materials.mjs`：如新类名，加一行登记（29-32 附近）。
- `app/tests/chat-work-shell.test.mjs`、`app/tests/material-governance.test.mjs`：若新增的锚点落在这两个测试冻结的区域内，需要同步改断言（§3 最后一行）。

**需新增的断言**：
- Focus restore：从锚点 A 打开、切到锚点 B、关闭后焦点回到最后一次打开它的那个锚点（不是回到固定的第一个触发者）——这是目前 `context-popover` 单锚点场景下不存在、但改成多锚点后必须补的一条。
- Escape：两步链条（先关 Inspector，再進入既有的 `navigationOpen`→`surface`→`settings` 链，`app.mjs:5375-5394`）不能因为新分支插进去而打断原有顺序。
- reduced-motion：位置/尺寸切换在 `prefers-reduced-motion:reduce` 与 `:root[data-motion="reduce"]` 两条路径下都退化为瞬时（不能只测其中一条，二者在代码里是两条独立规则，`styles.css:2320-2326` 和其后 WK-78 那条）。
- 安全区/窄屏：`.context-popover` 今天没有专门的窄屏（`max-width:1023px`）覆盖规则，只有基类的 `max-width: calc(100vw - 24px)`（`styles.css:2385`）——若共享 Inspector 在窄屏保持"浮动小卡片"还是"退化为底部 sheet"，两种都需要各自的断言，现状是二者都没有（`connection-popover` 唯一的窄屏规则只是缩宽度，`styles.css:3029-3031`，不是变形态）。
- 材质：glass-on-glass 反例（§3 第二行）本身就该在 CC-I 交付前变成一条断言，而不是继续停留在"FE-05 未消融"的记录状态。

**对现有 RC / FE-T07 断言的影响**：`evidence/fe04/shell-checks.mjs:45-49` 的 CW-3 断言现在按"表外 backdrop-filter 计数"识别新增的 glass 表面，如果 CC-I 引入新类名会被这条断言看见（需要更新期望值，不是被破坏）；`evidence/fe04/rc/runtime-ui-viewport.mjs:179,197` 现有的 Escape/焦点断言集中在 Settings 页与 tab 焦点漫游，未覆盖 popover 分支，说明这部分目前完全没有自动化断言在盯，属于净新增而非"修改现有断言"。FE-T07（迟到响应与折叠）的断言在本次读取范围内（`evidence/fe04/fe-t07.mjs`）未见任何 popover/tooltip 相关内容（已用 grep 核实为零命中），说明它和 CC-I 大概率互不影响，但也意味着"迟到的异步内容画进新打开的锚点"这类竞态目前没有被 FE-T07 这类脚本覆盖，需要单独写。

## 5. 待裁定清单

1. **共享 Inspector 是否覆盖 File / Trace（今天的整块工作面导航），还是只做 tool row / runtime 资源 / connection 三类"原本就轻"的详情？** 前者要把 WK-113 已裁定的"工作面不是弹出层"（`docs/interface-components.md:5`）和"检查器是浮层"两条信息架构揉到一起，代价是要么违反 WK-113，要么把大文件/长 trace 硬塞进一个必须够小、够快关闭的浮层里；后者代价小，但达不到 Atlas 原文"点 file、点 source……同一个浮层迁移过去"的完整设想。
2. **hover 是否触发 Inspector，还是只 click/focus？** 现有 tooltip 是 hover 触发但内容纯文本、可安全丢弃；一旦内容变成可交互（复制哈希、展开逐层 permission trace），hover 触发意味着"移开鼠标可能打断正在读的内容"，容易和 Atlas 共识⑦"重要内容不能藏 Tooltip"自相矛盾——选 hover 代价是要重新设计消失时机（不能再用 tooltip 的 120ms 隐藏），选纯 click/focus 代价是放弃"预览优先"的轻量感。
3. **窄屏（<768/<1024）是退化为底部 sheet，还是维持浮动小卡片只缩宽度？** 现状（`connection-popover` 在窄屏只缩宽度，`styles.css:3029-3031`）是后者；改成 sheet 需要一套新的进入/退出动效与新的 Escape/焦点语义，且要决定它和已有的"<1024 工作面全屏 sheet"（`styles.css:2126-2130`）会不会互相冲突（同一屏幕同时出现两种 sheet 的可能性要先排除）。
4. **Inspector 是否可以"钉住"变成工作面的一个 tab？** 如果可以，等于把 §1.5 的"整块工作面导航"和"浮层检查器"两条路径在架构上打通，代价是要给 WK-113 的四个固定类型 tab（run/file/workspace/runtime）之外再定义一种"钉住的检查器"tab 身份，牵动 tab key 规则（`intake-round-3.md:169` WK-113 ③ 已经裁定不新增 `scope` 字段，钉住的 Inspector 用什么身份需要另外裁）；如果不可以，代价只是"关闭即丢失，用户要重新点一次"，实现更简单。
5. **connection-popover 与未来共享 Inspector 是同一个组件的两个实例，还是保留独立？** 前者收益是"多 trigger 共用一个浮层"这条能力只写一次；代价是 connection-popover 现在承载的是"操作型"内容（切换 permission mode 会发 PUT 请求，`app.mjs:4811-4824`），和"检查型"（只读）内容混进同一个组件需要在内部再分一次"只读/可操作"的档位，增加这一个组件的复杂度。后者收益是职责单一，代价是"多 trigger 共享"这条能力要实现两遍。

## 6. 不做

本卷不提出新色彩、新字体或新依赖（Floating UI 已在 vendor 里，不算新增）；不宣称任何后端能力已经存在（source 内容、permission trace 等今天已有的字段都已在文中标出对应的现有请求路径，没有编造缺失的后端接口为"已实现"）；Atlas 的选型判断与来源链接一律标"Atlas 称"，未做二次核验。
