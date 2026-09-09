# CC-W 交付 · 工作面：1440 主次切换 + tab strip，≥1680 三栏（WK-113 / WK-116 / WK-117 (b) / WK-118 ④⑤ / WK-119 补充 / WK-121 ②）

2026-09-09，Claude Opus（`opus-wo-medium`），**作者验证**（Astra 独验另计，本页不代它写结论）。
派单 [WO-CC-round5 §CC-W](work-orders/WO-CC-round5.md)；裁定 [WK-113](intake-round-3.md)（几何与 tab 契约）、[WK-116](intake-round-3.md)（选向 B + C、R4D-3…5）、[WK-117 (b)](intake-round-3.md)、[WK-118 ④⑤ (d)](intake-round-3.md)、[WK-119 补充](intake-round-3.md)、[WK-121 ②](intake-round-3.md)。
探索 [EX-CC1](explore/ex-cc1-three-pane-tabs.md)；台账 [misfit-ledger](misfit-ledger.md) M-2 / M-4 / M-9 / M-10。
证据 `evidence/cc-w/`（仓根，沿 CC-S 先例）。全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `414b196`（Astra 合流 CC-S 与 Fable WK-116…121 之后的清洁节点） |
| 分支 | `claude/cc-w-surface-tabs` |
| 树 | `<isolated-checkout>` |
| 端口 / 数据 | 8901（第二台服务器与 MCP fixture 用 8902）；`/private/tmp/se-agent-ccw-data/*`，每换一次用途换一个全新空目录 |
| CDP | 19960–19970 |

| SHA | 题 |
|---|---|
| `c0111ff` | `docs: the work surface is a third column from 1680 up, and two in-flight misfits close`（第 0 项） |
| `a17c7e8` | `web: the work surface switches views at 1440 and becomes a third column at 1680`（正文 1–5） |
| 本页所在提交 | `docs: the CC-W delivery and its evidence` |

第 0 项按工单要求**独立成一次提交**，并且这一次提交自己跑绿：`c0111ff` 处 `npm --prefix app test` 为 **248 / 248**（基线 244 + 第 0 项 4 条），内容是改约文档、`--doc-min` / `--doc-measure` 两个 token、M-9 与 M-10。正文 1–5 在 `a17c7e8`，跑绿 **255 / 255**。

## 2. 改动文件

| 文件 | 改动 |
|---|---|
| `app/web/index.html` | `+35 −0`：`#surface-back-button`（strip 行左端的返回控件）、`#surface-document-tab`（选中区 `#surface-document-select` + 关闭区 `#surface-document-close`）、`#surface-scope`（工作面标题带上的 scope 位） |
| `app/web/app.mjs` | `+249 −34`：`surfaceThreePaneQuery`（唯一的 1680 判定）、`surfaceViewSwitch()` / `renderConversationBodyVisibility()`（B 态聊天列 `hidden` + `inert` 的单一出处）、`surfaceDocumentRef` / `surfaceDocumentKey` / `documentTabTitle` / `surfaceTabButton` / `surfaceTabButtons` / `closeDocumentTab` / `renderDocumentTab`、`TAB_ACTIVITY` + `renderTabActivity` + `renderSurfaceTabActivity`、`renderSurfaceScope`、tablist 的 Delete / Backspace 与 `role="tab"` 收窄、`openFile` 记下打开它的控件、`setSurfaceExpanded` 前后的阅读位置保存与还原、`renderMessageStream` 的"没有布局盒就不写"守卫、scope 位离开 `#session-meta` |
| `app/web/styles.css` | `+205 −8`：`--doc-min` / `--doc-measure` 两个 token；`.request-width`（M-9）；`.surface-document-tab` / `.surface-tab-select` / `.surface-tab-close` / `.tab-activity` / `.surface-back` / `.surface-scope`；`@media (min-width: 1024px)` 里展开态去掉浮层材质、`is-view-switch` strip 44；新的 `@media (min-width: 1680px)` 三栏 grid 与 `is-three-pane`；`#file-content` 的正文行宽改为 `--doc-measure`（960 一档留给领域渲染器的面） |
| `app/web/ui-controls.mjs` | `+35 −2`：`setRequestLabel`（M-9）、`TOOLTIP_DELAY` / `TOOLTIP_GROUP_WINDOW` 与共享延迟（M-10） |
| `app/tests/work-surface-tabs.test.mjs` | `+255`（新）：11 条 |
| `app/tests/chat-work-shell.test.mjs` | `+34 −13`：WK-92 的 scope 位断言随 M-2 改写（见 §9.3） |
| `app/tests/primitive-reconciliation.test.mjs` | `+15 −4`：五个在途控件的断言随 `setRequestLabel` 改写（见 §9.3） |
| `docs/interface-components.md` | §Composition 工作面定性改约；Shell layout contract 新增顶带左端槽位一段 |
| `engineering/design/ui-composition-standard.md` | 尺寸 token 表 +4 行；§右侧 contextual surface 一行改写 |
| `engineering/design/copy-convention.md` | 新增 §3.4d 工作面词表 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §11 CC-W 增量 |
| `evidence/cc-w/**` | 新（复制脚本只改端口 + 两个新脚本 + 结果与截图） |

**写权干净**：相对基线，`app/server`、`app/runtime`、`app/core`、`app/domains`、`brand`、`contracts/`（含 `review-projection.md`、`glyph-semantics.md`、`presentation-primitives.d.ts`）、`intake-round-3.md` 差异为空；`app/package.json` / `package-lock.json` 未动；无新增依赖、字段或端点；**未新增 web 模块，因此无 allowlist 路径请求**；无新的后端请求（BE-2 保持登记，见 §12）。

## 3. 第 0 项逐条

| 条 | 落点 | 断言 |
|---|---|---|
| 改约 `interface-components.md` §工作面定性 | 旧的一句 "The work surface is not a third column:" 消失，改为三档：≥1680 真正的第三栏（nav 256 / chat ≥640 / doc ≥`--doc-min` 688、各自滚动、chrome 同一基线）；1024–1679 折叠 / 展开语义保留并加 tab strip，展开是**主区内的视图切换**（无遮罩、无模态卡外观，chat 列 `hidden` + `inert` 但 DOM 保留）；<1024 全屏 sheet 不变。标注 WK-113 / WK-116 | 单测「CC-W 第 0 项 · 工作面定性按视口分档」（含"旧定性全文只作为被替换的那一句出现一次"） |
| `ui-composition-standard.md` 同步 | §右侧 contextual surface 一行改写；尺寸 token 表新增四行：`--doc-min` 688、`--doc-measure` 740、三栏断点 ≥1680、tab strip 高（B 44 / C 沿 `--band-top`） | 单测「尺寸 token 表登记了 ≥1680 断点、--doc-min 与正文行宽上限」；两个 token 在 `:root` 里 |
| 顶带槽位裁定（WK-121 ②） | 顶带左端那个槽位**仍然只有一种离开动作**：应用里是侧栏开合钮，Settings 在场时是 `Back to app`。工作面的返回控件不进这个槽位，也不进 tablist：它在 strip 同一行的左端，是一个带框的按钮而不是一条下划线（`index.html:603`、`app.mjs` `renderSurfaceVisibility`）。理由写进 `interface-components.md` 的 Shell layout contract。Escape 两步序一字未改 | 单测「返回控件不在 tablist 里，也不占顶带那个槽位」；`cc-w-checks` CCW-1 实测 `backOutsideTablist: true`、`backRole: null` |
| M-9 决定类与 composer 按钮保持静止态宽度 | `setRequestLabel(button, label, inFlight)`：看得见的标签是一个 `<span>`，静止态标签是一条 CSS 生成内容（`::after` 读 `data-resting-label`），两者叠在同一个 grid 格子里，宽度取较大值。生成内容不进 `textContent`（既有反例脚本正是按它认这几个按钮的），可访问名由 `aria-label` 显式说一遍。按钮元素本身不被替换，焦点不动 | 单测 1 条（结构）；`cc-w-checks` CCW-5 实测：`Deny 118 / Approve 144`，在途期间两者宽度与左边界逐像素不变，焦点仍在按下的那个 `data-focus-key` 上 |
| M-10 tooltip 共享延迟 | `TOOLTIP_DELAY` 400 / `TOOLTIP_GROUP_WINDOW` 300。窗口的两个来源：浮层还开着（相邻迁移），或刚关掉不到 300ms。纯文本 tooltip 语义不变（仍只在 pointerover / focusin 上出现，仍是单例，内容仍由 `textContent` 写） | 单测 1 条；`cc-w-checks` CCW-6 实测 `first: 404ms · adjacent: 2ms · afterWindow: 404ms` |
| Atlas ④⑤（WK-118） | tab 是状态容器：文档 tab 在，`state.surface.fileRef` 就在，文件面的滚动与渲染都留在原地（切类型 tab 只换 `hidden`，不拆装）。agent activity 是类型 tab 上的一个 7px 记号（`.tab-activity`），形状三档 + sr-only 一句话，**不造 banner** | 单测「agent activity 是 tab 上的一个记号」；`cc-w-checks` CCW-7 实测 `status: ["running"], word: "Running", banners: 0` |
| 不改 intake | `intake-round-3.md` 差异为空 | §2 写权干净 |

## 4. 消融表（removal pass）

### 4.1 删除（去掉后不失去判断）

| 删除 | 为什么去掉后什么也没少 |
|---|---|
| 展开态的遮罩（`#surface-backdrop` 在桌面展开态） | 遮罩说的是"底下那一层还在，但你现在不能碰它"。B 态底下那一层**不在屏幕上**（`hidden` + `inert`），C 态三面都可用 —— 两种情况下都没有可压暗的对象。遮罩现在只画给真正的模态：<1024 的那张 sheet |
| 展开态的浮层材质（`--float` 底、1px `--line-strong`、`--radius-container`、`--shadow-float`） | 同一条理由的视觉一半。一张浮在纸上的圆角卡说"这是压在别的东西上面的一层"；视图切换与第三栏都不是那件事。删掉之后 B 态是主区里的一张纸，C 态是第三条列轨 |
| 展开态那个 `Return to chat` 的 minimize 钮（在 B 态） | 它与 strip 左端的 `Chat` 说同一件事。一行里两个返回控件是把同一个动作画两遍；B 态只留 strip 上那一个，C 态只留 minimize 那一个（并且改说 `Collapse work surface`，因为聊天就在旁边） |
| `File` 类型 tab（在文档 tab 在场时） | 文档 tab 与 `File` 档位打开的是同一个面。一条 strip 上出现两个按下去结果一样的 tab，是"必要性"这一门直接禁的东西。文档 tab 在时 `File` 不画；文档关掉时 `state.surface.fileRef` 也没了，`File` 本来就按既有规则隐藏。档位没有被从契约里删掉，它只是被自己唯一的实例顶上（列入 §13 待裁 ①） |
| `#file-content` 的 960 允许宽 | WK-46 (4) 让文档面里**每一件东西**都可以宽到 960，包括正文段落。面板宽 ≠ 正文行宽（WK-117 (b)）之后，这一档在文档面上没有对象：960 留给领域渲染器的面（文件树 / 版本表 / diff），那些本来就不是正文 |

### 4.2 新增（去掉后会失去判断）

| 新增 | 去掉它会失去什么 |
|---|---|
| `--doc-min` 688 与 ≥1680 断点 | 失去"三面到底放不放得下"的那个答案。1680 = 256 + 688 + (688 + 2×24) 是算术上刚好成立的那一档；没有这个数字，三栏就只能靠"看起来够宽"决定 |
| `--doc-measure` 740 | 失去"面板有多宽"与"一行有多长"的区别。1136 的面板里一行 1136 的正文是读不下去的 |
| 文档 tab 的关闭区（与选中区分开） | 失去"关掉这一份"与"看这一份"的区别。合成一个命中区之后，想切换的点到了关闭 |
| tab 上的 7px 记号 | 失去"这个档位里现在有事在发生"。没有它，唯一的说法要么是一条 banner（占一行，且与 tab 说的是同一件事），要么什么都不说 |
| `Chat` 返回控件（strip 行左端） | 失去 B 态的出口。展开态里聊天列不在屏幕上，如果返回只剩顶带那个槽位，那个槽位就要同时是"收侧栏"和"回聊天"两件事 |
| `renderMessageStream` 的"没有布局盒就不写"守卫 | 失去阅读位置。聊天列 `hidden` 时 `scrollTop` 与 `scrollHeight` 都是 0，照写会把记住的位置抹成 0 —— 这正是 R4D-3 要防的那件事（实测见 §8：`24 → 24`） |

## 5. 五轮收敛表（WK-100 体例）

轮次：① 结构 → ② 密度 → ③ 断点 → ④ 状态 → ⑤ 文案。每一格的数字都从渲染出来的文档上读，不从 CSS 反推。

### 5.1 1440（B 态，展开）

| 轮 | 读数 |
|---|---|
| ① 结构 | `app-shell surface-expanded surface-view-switch`；文档面占主区，聊天列 `hidden: true / inert: true / inDom: true`；无遮罩（`backdropHidden: true`）；strip 在文档面顶部，`Chat` 在 strip 左端、tablist 之外 |
| ② 密度 | 文档面 **1136**；strip 高 **44**；正文距 strip **24**；正文行宽 ≤ **740**（实测最宽 740，面板 1136） |
| ③ 断点 | 无横向溢出（`0`）；1679 仍是本形状（doc 1375）；1680 换成三栏；200 %（CSS 视口 720）无横向溢出 |
| ④ 状态 | 见 §6 状态矩阵 |
| ⑤ 文案 | `Chat` / `Back to chat`；`Close <完整路径>`；`Memory · Off`（搬到这条带上） |

### 5.2 1680（C 态，三栏）

| 轮 | 读数 |
|---|---|
| ① 结构 | `surface-three-pane`；grid `256px 688px 736px`；面板 `position: static`（真的第三条列轨，不再是绝对定位的层）；聊天列可用（`hidden: false / inert: false`） |
| ② 密度 | nav **256** · chat **688**（≥640）· doc **688**（= `--doc-min`）；三条 chrome 同一基线（chat header 与 doc header 都是 `top 0 / height 56`）；三面各自 `overflow: auto` |
| ③ 断点 | 无横向溢出（`0`）；短高度 720 下 composer 仍完整（`composerWhole: true`） |
| ④ 状态 | 见 §6 |
| ⑤ 文案 | 返回控件在这一档**不画**；minimize 钮说 `Collapse work surface` |

### 5.3 1024

| 轮 | 读数 |
|---|---|
| ① 结构 | 侧栏退为抽屉（既有 `@media (max-width: 1023px)`）；1024 本身仍是桌面档，展开态是 B 的视图切换 |
| ② 密度 | `--nav` 220、`--control` 44（既有）；文档面 = 主区宽 − 2×24 |
| ③ 断点 | 无横向溢出（既有 `SETTINGS-1024-overflow` 与本单 `WORK-overflow` 同一口径） |
| ④ 状态 | 见 §6；`surface-expand-button` 在 `<768` 折叠态才隐 |
| ⑤ 文案 | 同 1440 |

### 5.4 390

| 轮 | 读数 |
|---|---|
| ① 结构 | 折叠态与展开态都是同一张 `inset: 0` 全屏 sheet（既有，本单未动）；`surfaceIsModal()` 在这一档为真，遮罩与 `aria-modal` 照旧 |
| ② 密度 | `--page-gutter` / `--col-gap` 16（既有）；命中区 44 |
| ③ 断点 | 无横向溢出（`HOME-narrow-overflow: 0`、`CW-11 390: 0`） |
| ④ 状态 | 见 §6 |
| ⑤ 文案 | 同上；`Chat` 返回控件不在这一档出现（sheet 有自己的 minimize / close） |

原始读数在 `evidence/cc-w/composition-checks.json`（`WORK-5…9`、`SHELL-4/5`）与 `cc-w-checks.json`。
截图：`work-expanded-1440-light.png`、`work-three-pane-1680-light.png`、`work-three-pane-1680x720-light.png`、`work-expanded-1440-zoom200-light.png`、`work-expanded-desktop-shell-1440-light.png`、`work-three-pane-desktop-shell-1680-light.png`。**视觉四轴留用户，本页不自评。**

## 6. 状态矩阵（WK-112 (d)）

每格是 `file:line` 或 `not_applicable` + 理由。

### 6.1 tab strip（`#surface-tabs`）

| 状态 | 落点 |
|---|---|
| normal | `index.html:602` `role="tablist"`；`styles.css:1489` `.surface-tabs` |
| hover / selected | `styles.css` `.surface-tab:hover` / `[aria-selected="true"]`（下划线 + 字重） |
| loading | `not_applicable` —— strip 本身不读取；各面的读取态在各自的面里 |
| empty | `not_applicable` —— 至少有 `Workspace` 一档；strip 只在展开态渲染（`app.mjs` `$("surface-tabs").hidden = !expanded`） |
| error | `not_applicable` —— 同上 |
| disabled | `not_applicable` —— 不可用的档位是**不画**，不是画成灰的（`visibleSurfaceKinds()`） |
| dense | 随 `--text-body` 与 `--band-top` / 44 两档带高 |
| narrow | `<768` 是全屏 sheet，strip 沿 sheet 的带 |
| long-content | 文档 tab `max-width: 260px` + 省略号；类型 tab 是产品词，不会长到截断 |
| 键盘 | `app.mjs` tablist keydown：`ArrowLeft/Right`、`Home`、`End` 只在 `role="tab"` 之间走（`surfaceTabButtons()`），`Delete` / `Backspace` 在文档 tab 上关闭它 |

### 6.2 类型 tab（`surface-preview-tab` / `surface-run-tab` / `surface-file-tab`）

| 状态 | 落点 |
|---|---|
| normal / hover / selected | `styles.css:1497` `.surface-tab` 三条 |
| loading | `not_applicable` —— 档位是静态的 |
| empty | 该类型没有对象时**不画**（`visibleSurfaceKinds()`：`run` 要有 `runId`，`file` 要有 `fileRef`） |
| error | `not_applicable` —— 失败是面里的事实，不是档位的状态 |
| disabled | `not_applicable` —— 同 empty |
| activity | `app.mjs:3471` `TAB_ACTIVITY` + `styles.css:1548` `.tab-activity`：`running` 实心圆、`waiting_user` 空心环、`failed` / `unknown` 方块，各带一句 sr-only |
| 关闭 | `not_applicable` —— 档位不可关闭（WK-113 ⑥）；实测 `typeTabsWithClose: []` |
| dense / narrow / long-content | 同 §6.1 |

### 6.3 文档 tab（`#surface-document-tab`）

| 状态 | 落点 |
|---|---|
| normal | `index.html:653`；`styles.css:1495`。存在条件 = `state.surface.fileRef` 属于当前会话（`surfaceDocumentRef()`） |
| hover / selected | `.surface-tab-select:hover` / `[aria-selected="true"]`；选中态的下划线画在**外层**（`:has()`），所以选中区与关闭区共用同一条线 |
| loading | 文件内容的读取态由 `createFileView` 的 `Loading file…` 承担；tab 本身不等读取 |
| empty | `not_applicable` —— 没有文档就没有这个 tab（不画空 tab） |
| error | 读取失败仍留在面里；tab 保持，因为对象还在（FN-28：失败 ≠ 不存在） |
| disabled | `not_applicable` |
| dense | 随 `--text-body` |
| narrow | `<768` sheet 里同样渲染；关闭钮 24×24 在桌面档，`--control` 在 <1024 为 44 |
| long-content | `max-width: 260px` + `text-overflow: ellipsis`；`title` 与 `aria-label` 是完整路径（实测 `label: note-for-the-document-tab.txt` / `accessibleName: out/note-for-the-document-tab.txt`） |
| 关闭 | `#surface-document-close`（独立命中区，实测 `selectBox.right 686 ≤ closeBox.left 686`，24×24）或焦点在 tab 上时的 `Delete` / `Backspace`；关闭后回紧凑目录并把焦点还给打开它的那一行 |
| 身份 | `surfaceDocumentKey()` = `{sessionId, path, kind, sha256, runId}`（FN-22）；**不新增 `scope` 字段**，scope 由 `sessionId` 推出。renderer 失效判定不用这个 key，仍是 `sameSurfaceIdentity`（含 `status` / `modulePath`，R4D-4） |

### 6.4 ← Chat（`#surface-back-button`）

| 状态 | 落点 |
|---|---|
| normal | `index.html:603`；`styles.css:1576` `.surface-back`（带框按钮，与 tab 的下划线视觉分开） |
| hover / pressed | `.surface-back:hover` / `.quiet-button:active` |
| 出现条件 | 只在 B 态（1024–1679 展开）：`app.mjs` `back.hidden = !viewSwitch` |
| selected | `not_applicable` —— 它是一次动作，不是档位；不带 `role="tab"`（实测 `backRole: null`） |
| loading / empty / error | `not_applicable` —— 返回不发请求 |
| disabled | `not_applicable` |
| dense / narrow | `--control` 32 / 44 两档；`<1024` 不出现（那一档是 sheet） |
| long-content | 固定一词 |
| 焦点 | 按下它 → `setSurfaceExpanded(false)` → 焦点落回紧凑目录（`focusSurfaceRail`），聊天列的滚动与草稿由 `renderMessageStream()` 还原 |

### 6.5 scope 位（`#surface-scope`）

| 状态 | 落点 |
|---|---|
| normal | `index.html:675`；`styles.css:1593` `.surface-scope`；`app.mjs:3725` `renderSurfaceScope` |
| 出现条件 | 只在 Work 会话（`sessionMode(session) === "work"`）且工作面标题带在屏幕上（展开态） |
| hover / selected / disabled | `not_applicable` —— 它是一句陈述，零控件（实测 `surfaceScopeFocusable: 0`） |
| loading | `not_applicable` —— BE-19 之前它只有一个值，不来自读取 |
| empty | Chat 会话上**不画**（实测 CW-1 两处都是 `null`） |
| error | `not_applicable` |
| dense | `--text-caption`；与模式词同色（实测同为 `rgb(176, 180, 186)`） |
| narrow | sheet 的带上同样渲染 |
| long-content | 固定 `Memory · Off` |

## 7. text-sweep 增量

见 [text-sweep §11](text-sweep.md)：一处改词（`Return to chat` → `Collapse work surface`，只在三栏态语义成立），三处新增（`Chat` / `Back to chat`、`Close <完整路径>`、`Running` / `Waiting for you` / `Failed`），零删除。词表登记在 [copy-convention §3.4d](../../../design/copy-convention.md)。

## 8. 断言结果原文

### 8.1 WORK-5…9 / SHELL-4 / SHELL-5（`composition-checks.log`）

```
PASS WORK-5 {"shape":"app-shell surface-expanded surface-view-switch","docPane":1136,"strip":44,"proseGap":24,"backdropHidden":true,"shadow":"none","radius":"0px","chatColumn":{"hidden":true,"inert":true,"inDom":true},"overflow":0}
PASS WORK-6 {"shape":"app-shell surface-expanded surface-three-pane","columns":"256px 688px 736px","position":"static","nav":256,"chat":688,"doc":688,"docMin":688,"scrolls":{"doc":"auto","chat":"auto","nav":"visible"},"chromeBaseline":{"chat":{"top":0,"left":256,"width":687,"height":56,"bottom":56},"doc":{"top":0,"left":944,"width":736,"height":56,"bottom":56}},"composerWhole":true,"overflow":0}
PASS WORK-7 {"1679":{"shape":"app-shell surface-expanded surface-view-switch","doc":1375,"overflow":0},"1680":{"shape":"app-shell surface-expanded surface-three-pane","doc":688,"chat":688,"overflow":0}}
PASS WORK-8 {"height":720,"composerWhole":true,"composer":{"top":484,"left":280,"width":639,"height":180,"bottom":664},"overflow":0}
PASS WORK-9 {"cssViewport":720,"shape":"app-shell surface-expanded","overflow":0}
PASS SHELL-4 {"host":"desktop","shape":"app-shell surface-expanded surface-view-switch","unsafeControls":[]}
PASS SHELL-5 {"host":"desktop","shape":"app-shell surface-expanded surface-three-pane","unsafeControls":[]}
PASS SHELL-4-browser {"host":"browser","unsafeControls":null}
PASS SHELL-5-browser {"host":"browser","unsafeControls":null}
41 / 41
```

### 8.2 CC-W 行为（`cc-w-checks.log`，9 / 9）

```
PASS · CCW-1 · 文档 tab 至多一个、带名字、截断保留可访问全名；类型 tab 无关闭区；file 档不画两遍
  {"documentTabs":1,"label":"note-for-the-document-tab.txt","title":"out/note-for-the-document-tab.txt",
   "accessibleName":"out/note-for-the-document-tab.txt","fileTypeTabVisible":false,"typeTabsWithClose":[],
   "selectBox":{"left":482,"right":686,"width":204,"height":41},"closeBox":{"left":686,"right":710,"width":24,"height":24},
   "closeLabel":"Close out/note-for-the-document-tab.txt","backOutsideTablist":true,"backRole":null,
   "paneLabelledBy":"surface-document-select"}
PASS · CCW-2 · 方向键 / Home / End 只在 role=tab 之间走，关闭钮不是这条 tablist 的一站
  {"start":"surface-document-select","home":"surface-preview-tab","end":"surface-document-select","left":"surface-preview-tab"}
PASS · CCW-3 · Delete 关闭活跃文档 tab：回紧凑目录，焦点还给打开它的那个控件
  {"documentTabVisible":false,"open":true,"expanded":false,"kind":"preview","fileRef":null,
   "focusKey":"artifact:10","focusClass":"flow-row artifact-thread-row","railVisible":true}
PASS · CCW-4 · 面板 1136 里正文仍是一行的长度（≤ --doc-measure），代码块在自己的盒子里横向滚动
  {"panel":1136,"limit":740,"widestProse":740,"preOverflowX":"auto","preScrolls":true,"paneScroll":"auto"}
PASS · CCW-5 · M-9：Sending… 不改按钮宽度，邻居不位移，焦点留在按下的那个决定上
  before [{"text":"Deny this write","width":118,"left":927},{"text":"Approve this write","width":144,"left":1053}]
  during [{"text":"Deny this write","width":118,"left":927},{"text":"Sending…","width":144,"left":1053}]
PASS · CCW-6 · M-10：首个 tooltip 等 400ms，窗口内相邻即时切换，出窗口回到延迟
  {"anchors":2,"first":404,"adjacent":2,"afterWindow":404}
PASS · CCW-7 · agent activity 以微型记号入类型 tab，不造 banner，且不只靠颜色
  {"tab":"surface-run-tab","status":["running"],"word":"Running","radius":"50%","banners":0}
```

### 8.3 FE-T07 新增两条（`fe-t07.log`，8 / 8）

```
PASS · CC-W · B 态展开与返回：聊天列 DOM 保留，滚动位置与草稿不变，不重发命令、不重挂 renderer
  {"before":{"scrollTop":24,"draft":"cc-w draft that must survive the view switch","scrollable":true,"streamInDom":true},
   "during":{"shape":"app-shell surface-expanded surface-view-switch","bodyHidden":true,"bodyInert":true,
             "streamInDom":true,"backButton":true},
   "after":{"scrollTop":24,"draft":"cc-w draft that must survive the view switch"},
   "rendererKept":true,"commands":[]}
PASS · CC-W · 1679 ↔ 1680 跨越只换形状：不重发命令、不重读、不重挂 renderer、草稿不丢
  {"at1679":"app-shell surface-expanded surface-view-switch","at1680":"app-shell surface-expanded surface-three-pane",
   "draft":"cc-w draft across the breakpoint","rendererKept":true,"commands":[],"reads":[]}
```

### 8.4 因契约改变而改写的既有断言（三处，均未放宽）

| 断言 | 改写 | 为什么不是放宽 |
|---|---|---|
| `shell-checks` CW-1 / CW-2 / CW-4 / CW-8 | scope 位从 `#session-meta` 改在 `#surface-scope` 上量，并加"会话 meta 行上不得再有 scope 位"一条 | M-2 / WK-113 ③ 就是这次搬家。四件事逐条重量（只在 Work 上、只有一个值、零控件、无背景无边框），另加"落在工作面那条带里"；条数加一，阈值一条未松 |
| `primitive-reconciliation` 「四个送出一次决定的控件都经过同一个在途词」 | 调用形状由 `text: requestLabel(...)` 改为 `setRequestLabel(...)`，并加一条"在途词不再由 app.mjs 直接写" | `setRequestLabel` 内部就是 `requestLabel`，"只有一个在途词"这条性质没变；覆盖面从四处收紧为五处（`≥5`），并新增一条 `doesNotMatch` |
| `chat-work-shell` 「Matter header 的 scope 位是陈述」 | 同 CW-* 的理由，改在 `renderSurfaceScope` 那一段扫描 | 五个"不许有"的记号（popover / haspopup / chevron / addEventListener / button）逐个照旧扫描，只是换了被扫的那一段；另加对 `.surface-scope` 规则的无背景无边框断言 |

## 9. 三条 unresolved 的取舍

| unresolved | 选择 | 理由（选最保守者） |
|---|---|---|
| ① B 态 ← Chat 放在 strip 左端（strip 之外的同行控件）还是顶带的返回位 | **strip 同一行的左端，strip 之外** | 工单已定，但理由需要写清：顶带那个左端槽位在 WK-121 ② 之后已经承担"一个槽位一种离开动作"（侧栏开合 / `Back to app`），再往里塞第三种意思，就要在同一个位置上按当前是哪一屏解释三次。放在 strip 那一行则天然与 tab 相邻而不与 tab 同类：一个带框的按钮，一排下划线的 tab，视觉与语义都分得开，且不进 `tablist`（WK-117 (b)） |
| ② 三栏态 chat 列固定 640 还是 flex 至 740 | **`minmax(640px, 1fr)`，即从 640 起按剩余宽度伸展** | 两个候选里更保守的是"不固定"：固定 640 会在 1680 上留下 48px 无人认领的空白（1680 − 256 − 640 − 736 = 48），而无人认领的空白要么被某一列悄悄吃掉，要么变成第四条缝。`minmax(640px, 1fr)` 保证了下限（640 是 WK-96 的硬约束），把余量交给聊天列，1680 上实测正好 688；文档列则**固定**为 `--doc-min` + 两个 gutter，因为阅读列的稳定比聊天列的稳定更重要（换视口时正文不该重新折行） |
| ③ 文档 tab 的标题来源（文件名 / Run 标题 / 来源 id）与截断规则 | **文件名（`path` 的最后一段）** | 三个候选里只有它是"这个对象自己已经有的名字"：Run 标题是另一个对象的名字，来源 id 是身份不是名字（FN-22 明说标题不充当身份）。截断规则同样取最保守的一档：只在**看**的那一层截断（260px + 省略号），`title` 与 `aria-label` 保留完整路径，所以截断从不减少可访问信息（EX-CC1 §4 的通行做法） |
| ④（工单未列，施工中冒出）文档 tab 与 `File` 类型 tab 并存还是相互顶替 | **文档 tab 在时不画 `File` 档位** | 两者按下去打开同一个面。并存的读法（WK-113 ④ 的字面）会让一条 strip 上出现两个结果一样的 tab —— anti-slop 的 necessity 门直接禁这件事。档位没有从契约里删掉：它只是被自己唯一的实例顶上，文档关掉后 `fileRef` 也没了，`File` 按既有规则本来就隐藏。列入 §13 待裁 ① |

## 10. 既有回归（全量）

| 套件 | 结果 |
|---|---|
| `npm --prefix app test` | **255 / 255**（基线 244 + 本单 11） |
| lint-colors / lint-materials / contrast-report / smoke | ok / ok / **76 项全通过** / 通过（`realProvider: not_run`） |
| composition（Home / Work / Settings 几何与安全区） | **41 / 41**（基线 32 + 本单 9） |
| CC-W 行为（本单新增） | **9 / 9** |
| Models & Tools 五轮收敛 | 18 / 18 |
| Chat / Work / Memory shell | 12 / 12 |
| 探测（BE-17 / 18） | 8 / 8 |
| Primitive（FE-04 复跑，含 FE-T06） | 11 / 11 |
| FE-T01 | 3 / 3（无数据）· 4 / 4（rows） |
| FE-T07 | **8 / 8**（基线 6 + 本单 2） |
| FE-T11 | 6 / 6 |
| FE-T03 | 5 / 5 |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 |

复跑口径与 CC-S 相同：每换一次用途换一个全新空目录并重新播种；`primitive-checks`、`shell-checks`、`fe-t11`、`cc-w-checks` 不幂等（WK-109 ⑦）。全部日志与 JSON 在 `evidence/cc-w/`。

## 11. 哪一像素改变了哪一判断

| 改动 | 判断 |
|---|---|
| 遮罩与那张圆角浮卡消失 | 「工作面压在聊天上面」与「现在这一屏是文档」的区别。之前展开态是一张浮在压暗的聊天上的卡，读者要先分辨"底下那层还在不在"；现在 B 态就是主区里的一张纸，C 态就是第三条列轨 |
| 1680 上 grid 从 `256px 1424px` 变成 `256px 688px 736px` | 「切过去看」与「并排看」的区别。这是本单唯一真的多出一条列轨的地方，也是 shell-refinement 那句"三个上下贯通的工作面"第一次在算术上成立（688 ≥ 640，688 = `--doc-min`） |
| 1136 的面板里正文仍然停在 740 | 「面板有多宽」与「一行有多长」的区别。之前文档面里的段落可以宽到 960，一行读到末尾眼睛要跳很远回到行首 |
| strip 从 56 收到 44 | 「这条带是这一屏的 chrome」与「这条带是文档面自己的」。顶带 56 说的是整屏；文档面上再来一条 56 会读成第二个应用头。C 态它又回到 56 —— 那时它**确实**要与聊天的带落在同一条基线上 |
| 文档 tab 的关闭区从"没有"变成 24×24 且与选中区不重叠 | 「关掉这一份」与「看这一份」。之前这两件事根本没有第二个命中区可分 |
| Run tab 上多出 7px | 「这个档位里有事在发生」。它替掉的不是一条已有的 banner —— 之前这件事在 strip 上根本没有说法，要切进 Run 面才知道 |
| `Memory · Off` 从会话 meta 行搬到工作面标题带 | 「这个会话是哪一种」与「我正在看的这份工作属于哪个 Matter」。前者跟着会话标题走，后者跟着工作面走；两句话挤在同一行时，第二句读起来像第一句的补语 |
| 在途时 `Approve this write` 的邻居不再左右挪 118 → 144 那 26px | 「我按的是哪一个」。指针已经落在半路上的用户，之前有一瞬间会落到另一个决定上 |
| 第二个 tooltip 从 404ms 变成 2ms | 「我在一排控件上扫一遍」与「我在等一个控件解释自己」。之前扫一排要等四次 400ms，于是没人扫 |

## 12. allowlist 与后端请求

- **allowlist**：无。本单没有新增 web 模块文件，`app/server` 的静态准入清单未动。
- **后端请求**：无新增。**BE-2（多文档 tab 的 surface 状态）保持登记**在 [backend-requests.md](backend-requests.md)：本单严格按 WK-113 ④ 做"第一段只有一个受信活动文档"，没有建前端的多实例 map，也没有做伪多实例。`state.surface` 的形状一字未改（仍是单值 `kind` / `runId` / `fileRef`）。
- 允许的新前端状态只有"文档 tab 的开合与 strip 选择"，两者都不是新字段：文档 tab 在不在 = `state.surface.fileRef` 在不在；strip 选择 = 既有的 `state.surface.kind`。

## 13. 待裁定

1. **文档 tab 在场时 `File` 类型 tab 不画**（§4.1 / §9 ④）。WK-113 ④ 的字面是"四个固定类型 tab + 至多一个文档实例 tab"并存；实现按 anti-slop 的 necessity 门取了"实例顶替档位"，因为两者打开同一个面。若裁定要求两者同时可见，需要一并回答"按下去结果一样的两个 tab 各自说什么"。
2. **`Return to chat` 改成 `Collapse work surface`**。这是一次改词（text-sweep §11.1），理由是三栏态里"回到聊天"没有对象可指。若裁定认为 B / C 两态该用两个不同的词而不是一个共用词，需要再裁一次（今天是一个控件一个词，在 B 态那个控件根本不出现）。
3. **`WK-46 (4)` 的 960 允许宽在文档面上被收回**（§4.1 末条）。这是对一条既有裁定的收窄，理由是 WK-117 (b)；960 仍留给领域渲染器的面。若 WK-46 (4) 的本意包含"文档面里的版本表也可以到 960"，需要一次显式修订。
4. **"关闭文档 tab 后焦点归还"的断言落在 `cc-w-checks` 而不是 `fe-t07`**。工单把这一条列在 fe-t07 新增里，但 fe-t07 的 fixture（`work-seed`）里没有可打开的记录文件，硬塞会变成"为断言造数据"。本单为它写了自己的 fixture（`cc-w-seed`，一次真的 `ws_write`）。断言本身一条不少（CCW-3）。
5. **`--doc-min` 只保证 1680 这一档起始配置**（R4D-5 已提示）。`--text-scale` 拉到最大或系统字号放大时，688 的文档列仍然是 688 px，但里面能放下的字更少；本单没有为"三栏在任意缩放下都成立"作任何承诺，也没有加第二个断点。
6. **`state.surface.returnFocus` 现在由两处写**（打开工作面时、`openFile` 时）。语义因此是"最后一次打开这层的那个控件"，而不是"第一次"。这与 CC-S 的 M-12（"当前哪一屏"由两个值合说）同一族问题：`returnFocus` 承担了两个层级的返回目标。合并或拆分都属状态模型变更，工单明禁，未做。
7. **B 态里顶带仍然把标题居中到 740 的框里**（`.chat-header-inner` 既有规则），而文档面从 280 开始 —— 于是带上的会话名与下面的文档不共一条左边缘。本单未动这条既有规则（它属于 chat 列的 chrome，不属于工作面）。若裁定认为 B 态顶带该跟随文档面对齐，是一次独立的几何改动。

## 14. 未检项（分列）

| 项 | 结果 | 说明 |
|---|---|---|
| 触控 | `not_run` | 没有触屏设备；命中区按几何量到（关闭钮 24×24 桌面档、`--control` 44 窄屏），不等于实测触控。tab 的拖拽重排、drag-off cancel（Atlas ⑧）本单不做，也未检 |
| 读屏 | `not_run` | 没有 VoiceOver / NVDA 实测。`role="tab"` / `role="presentation"` / `aria-selected` / `aria-labelledby` / `inert` / sr-only 只在 DOM 与无障碍属性层面断言 |
| 真实 IME | `not_run` | `isComposing` 分支只由源码与合成事件覆盖 |
| 真实 provider | `not_run` | 全程 local-fake；`smoke.log` 自陈 `realProvider: not_run` |
| 200 % 缩放 | 只在 **1440** 量一次（CSS 视口 720，`deviceScaleFactor: 2`），按工单口径 | 1680 / 1024 / 390 的 200 % 未量。注意 1440 的 200 % 落在 <1024，因此量到的是全屏 sheet 那一档，不是 B 态 |
| 深色主题 / reduced motion | `not_run`（本单未新增颜色或动效；lint-colors、lint-materials、contrast 76/76 覆盖 token 层） | `cc-w-checks` 恰好在深色下跑（记号色 `#edeef0` 是 `--accent-11` 的深色档），是观察不是断言 |
| 多显示器 / 真实 Tauri 宿主 | `not_run` | 桌面宿主由 `?shell=desktop` 模拟，与 FE-01…04 / CC-S 同一口径 |
| 多文档 / 每 tab 独立滚动 | `not_run`（未实现） | BE-2 未交付；WK-113 ④ ⑤ 明定第一段不做 |
| 视觉四轴 | 留用户 | 本页不自评 |

## 15. anti-slop 门自查（WK-112 (c) / WK-112 §IX）

| 门 | 自查 |
|---|---|
| **necessity** | 屏幕上删的与加的都清楚：删了一层遮罩、一张浮卡的四种材质、一个重复的返回控件、一个与实例重复的档位、一档 960 的允许宽；加了一个文档 tab（带自己的关闭区）、一个返回控件、一个 7px 记号、一句搬了位置的 scope。没有新增卡片、装饰线、空状态插画或"欢迎"文案 |
| **hierarchy** | 层级来自三个距离与两条基线：strip 44 / 正文距 strip 24 / 面板到主区边 24；C 态三条 chrome 同一条 56 的基线，三列的分隔线只有一条（画在聊天列右侧，好让文档列的 688 是整数）。文档 tab 的选中态是下划线 + 字重，不是底色块。**WK-120 追问：字号 / 字重差是否足以让层级不靠颜色与框线成立？** —— strip 上答案是"是"：选中 tab 与未选中 tab 的差是 `font-weight 600 vs 400` 加一条 2px 下划线，去掉颜色仍可辨；文档 tab 与类型 tab 的差是"有没有名字与关闭区"，是结构差不是色差。**但 scope 位与模式词今天同为 `--text-caption` + `--muted-strong`，只靠位置区分**（一个在会话标题下，一个在工作面带上），这一处的层级确实还靠位置而不靠字阶——记在 M-11 / FE-05a 的范围里，本单不动字阶 |
| **system** | 两个新 token（`--doc-min` / `--doc-measure`）进了 `:root` 与 `ui-composition-standard` 的尺寸表，改数字必须同时改两处。没有新的 radius / shadow / 间距步；`.surface-tab-close` 用既有 `--radius-small`，`.surface-back` 用既有 `--radius-control` 与 `--control`；1680 断点在 JS 与 CSS 里各写一次（单测钉住 JS 侧只有一处） |
| **reference fidelity** | 采纳 shell-refinement 的是**结构**（共享顶部 chrome 基线、独立滚动、tab 组织可读对象），采纳 Atlas / EX-CC1 §4 的是**行为**（关闭区与选中区分离、截断保留全名、tablist 方向键）。`work-tabs.png` 的 550 中列、多余目录 / Help / 头像 / 模拟法律文字一律未采纳；画板上的像素距离没有当作几何验收依据（几何全部来自 §8 的实测） |
| **AI tells** | 新增可见字符串只有三个（`Chat`、`Close <路径>`、三个状态词），没有引导句、没有 emoji、没有把返回写成箭头（sprite 里没有这个 glyph，而 glyph 契约本单不可写——这一点写进了 text-sweep 而不是悄悄加一个图形）；空状态不画空卡（没有文档就没有文档 tab）；没有渐变、发光、圆角堆叠 |
| **reality** | 每个数字都从渲染出来的文档上读（`composition-checks.json` / `cc-w-checks.json`）；文档 tab 由一次真的 `ws_write` 记录出来再由 Chat Flow 那一行打开，不是注入的；M-9 的在途窗口用扣住传输的手法观察，答案照常由服务端给；M-10 的两次悬停是 CDP 的真实鼠标事件；截图由脚本自己拍；`not_run` 的八项逐条列出，没有用几何断言冒充可访问性或触控结论 |

## 16. Fable 复核（WK-126，2026-09-09）

非作者复核，与 §1–§15 的作者验证分列；Astra 独验另页。

| 项 | Fable 所做 | 结果 |
|---|---|---|
| 写权 | `git diff --name-only 414b196..HEAD` 对照工单可写清单；server / runtime / core / domains / brand / contracts / intake 差异 | 无越权；差异为空；无 allowlist 与后端请求 |
| 改约 | `interface-components.md` §工作面定性与顶带槽位段、`ui-composition-standard.md` 四个新 token 行 | 与 WK-113 / WK-116 / WK-121 ② 逐句一致 |
| 读码 | `app.mjs`（`surfaceViewSwitch` / `renderConversationBodyVisibility`、文档 tab 身份键、`closeDocumentTab` 按 `data-focus-key` 归还焦点、`TAB_ACTIVITY` 记号、`renderSurfaceScope`、`surfaceThreePaneQuery`）、`ui-controls.mjs`（`setRequestLabel` 生成内容占位、tooltip 400 / 300 窗口）、`index.html`、`styles.css` | 只有文档 tab 开合与 strip 选择是新前端状态；无多文档 map；renderer 失效条件未动 |
| 单测 / lint | 255/255；lint-colors / lint-materials ok；contrast 76 行全通过 | 一致 |
| 浏览器 | 自有端口 8893、三个新空目录、独立 CDP：`composition-checks` 41/41（WORK-5…9、SHELL-4/5 桌面宿主与普通浏览器）、`fe-t07` 8/8、`shell-checks` 12/12、`cc-w-checks` 9/9（M-9 宽度不变、M-10 405 / 1 / 407ms） | 一致 |
| 断言改写 | shell-checks CW-1/2/4/8、primitive 在途词五处、chat-work-shell scope 位 | 因契约改变，未放宽，接受 |
| 七项待裁 | 见 [intake-round-3 §4ae](intake-round-3.md) WK-126 | ①…⑥ 接受（⑥ 并入 M-12 簇为 M-14）；⑦ 记 M-15 入 FE-05a 第 0 项 |
| Anti-slop 门（WK-112 (c)） | necessity：文档 tab 只在有实例时出现、无 banner；hierarchy：strip 与类型 tab 靠位置与下划线分层，字号字重未动（FE-05a 留）；system：四个新 token 已登记，无新 radius / shadow；reference fidelity：EX-CC1 + shell-refinement + S12 三源；AI tells：无遮罩无浮层材质；reality：1440 / 1680 / 1679 / 1024 / 390 / 720 高 / 200%（1440）已量 | 通过 |
| 未复跑 | RC 三支、探测、Models、primitive、FE-T01 / T03 / T06 / T11、cc-s-checks | 作者结果原文在 §10；Astra 独验按 `evidence/cc-w/README.md` |
| 视觉四轴 | 留用户 | 未评 |

结论：接受。合流次序：先 `claude/cc-w-surface-tabs`（头 = 本条提交），再 `claude/fable-round4d`。
