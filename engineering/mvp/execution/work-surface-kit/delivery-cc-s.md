# CC-S 交付 · Settings 替换全局导航（WK-116 / WK-115 ① ②）

2026-09-09，Claude Opus（`opus-wo-low`），**作者验证**（Astra 独验另计，本页不代它写结论）。
派单 [WO-CC-round5 §CC-S](work-orders/WO-CC-round5.md)、裁定 [WK-116](intake-round-3.md)、遗留 [WK-115 ① ②](intake-round-3.md)。
用户方向 [shell-refinement](../../../design/clean-cool-2026-09-09/shell-refinement.md) §"已确认的结构方向" 3 与 §呼吸感；接缝 [r4d-review](../../../design/clean-cool-2026-09-09/r4d-review.md)。
证据 `evidence/cc-s/`（仓根，沿 FE-03 / FE-04 先例）。全程 local-fake / loopback：未配置任何真实 provider，未读取任何凭据文件，fixture 内没有任何真实 key。

## 1. 基线、分支、提交

| 项 | 值 |
|---|---|
| 基线 | `main` `683b6d1`（Astra 合流 FE-04 后的清洁节点） |
| 分支 | `claude/cc-s-settings-nav` |
| 树 | `/private/tmp/se-agent-ccs` |
| 端口 / 数据 | 8899（第二台服务器与 MCP fixture 用 8900）；`/private/tmp/se-agent-ccs-data/*`，每换一次用途换一个全新空目录 |
| CDP | 19925–19954 |

| SHA | 题 |
|---|---|
| `9ecfb4d` | `web: Settings replaces the global navigation, and two facts stop sharing a word` |
| 本页所在提交 | `docs: the CC-S delivery, its evidence and the size-token registration` |

**两次提交而不是"第 0 项单独一次"**：工单要求第 0 项先做、单独提交。实际切分成了「实现一次 + 证据与交付页一次」。原因是第 0 项的改约本体（settings-active 时侧栏不渲染）与正文第 1–3 项落在同一批文件的同一批行上（`app.mjs` 的 `renderChatHeader`、`index.html` 的同一段、`styles.css` 的同一块），按行切分只能得到一个**测试不绿**的中间提交。取"每个提交都能独立跑绿"为更强的约束，逐条对应关系在下表。列入待裁定 ①。

## 2. 改动文件

| 文件 | 改动 |
|---|---|
| `app/web/index.html` | `+16 −9`：`settings-back-button` 移到页标题行左端并改文案；删 `.settings-page-head` 与页内第二个 `Settings` 标题；`aria-labelledby` 指向带上的 `session-title`；WK-78 注释按 WK-116 重写 |
| `app/web/app.mjs` | `+93 −16`：`navigationPanel.hidden` / `.inert`、`toggle-nav-button` 与 Back 的显隐；`openSettings` 收起导航抽屉；`unfinishedToolWord()` 与 Activity 组头的 `unknown` 计数；`LIST_KEYS` 加 `Home` / `End` 与其处理；`appendFlowRow()` 把未决卡收进自己的 `role="list"` |
| `app/web/home-view.mjs` | `+24 −8`：每个 Home 集合的行进一条 `role="list"`，行本身仍是 button / article，`role="listitem"` 写在包着它的那一层 |
| `app/web/styles.css` | `+55 −16`：四个 `--settings-*` token 与三档断点；`.app-shell.settings-active` 单列、侧栏 `display:none`、标题行不再居中到 740；`.settings-page-body` 两列；`.settings-section` 上限；组间 40、行 24；窄屏 44 命中区补 `.settings-search`；删 `.settings-page-head` 两条死样式 |
| `app/tests/settings-navigation.test.mjs` | `+128`（新）：7 条 |
| `app/tests/primitive-reconciliation.test.mjs` | `+15 −1`：`LIST_KEYS` 闭集断言改为逐项核对（见 §9） |
| `app/tests/chat-work-shell.test.mjs` | `+4 −1`：WK-92 的扫描窗口收到 meta 行那一段（见 §9） |
| `docs/interface-components.md` | §Settings 改约段 |
| `engineering/design/frontend-layering-spec.md` | FN-26 注与符合性表一行 |
| `engineering/design/ui-composition-standard.md` | 尺寸 token 表新增四行 + Settings 注 |
| `engineering/design/copy-convention.md` | §3.4b 状态词表加 `Unknown`；新增 §3.4c「离开一页」 |
| `engineering/mvp/execution/work-surface-kit/text-sweep.md` | §5 入口一行 + §10 CC-S 增量 |
| `evidence/cc-s/**` | 新（复制脚本只改端口 + 两个新脚本 + 结果与截图） |

**写权干净**：相对基线，`app/server`、`app/runtime`、`app/core`、`app/domains`、`brand`、`contracts/review-projection.md`、`contracts/glyph-semantics.md`、`intake-round-3.md` 差异为空；`app/package.json` / `package-lock.json` 未动；无新增依赖、状态、字段或端点；未新增 web 模块，因此**无 allowlist 路径请求**，无后端请求。

## 3. 第 0 项逐条

| 条 | 落点 | 断言 |
|---|---|---|
| 改约 `interface-components.md` §Settings | "while the sidebar stays operable" → "the global sidebar is not rendered … `Back to app` and Escape return to the view, the session and the focus that were there on the way in (WK-116)"；并在深链一句里写明 Back 的位置 | 单测「WK-116 · 改约已落在文档里」 |
| 改约 FN-26 注 | 保留"Settings 为页面而非模态（WK-78）"，补"settings-active 时全局侧栏不渲染 …"；符合性表 FN-26 行由「未实现」改「已实现」 | 同上 |
| 不改 intake | `intake-round-3.md` 差异为空（Fable 已在 `/private/tmp/se-fable-r4d` 记 WK-116） | §2 写权干净 |
| tool 行第六词 `Unknown` | `unfinishedToolWord(status)`：`cancelled` / `failed` → `Interrupted`，其余（含 `unknown` 与无 Run 记录）→ `Unknown`；Activity 组头同一判断，另加 `unknown` 计数 | 单测 1 条；浏览器 `cc-s-checks` 第 3 条（fixture 造 `unknown` 终态，见 §5） |
| Inbox `Home` / `End` | `LIST_KEYS` 加两键；只在焦点已在列表里时接管（与方向键同档），否则整页滚动不被夺走 | 单测 1 条；`cc-s-checks` 第 2 条 |
| 两条 `role="list"` | Home 下带每个集合一条 `home-list`；Chat Flow 未决卡一条 `pending-list`，遇到非未决内容即收口 | 单测 1 条；`cc-s-checks` 第 1、4 条 |

## 4. 消融表（removal pass）

### 4.1 删除（去掉后不失去判断）

| 删除 | 为什么去掉后什么也没少 |
|---|---|
| 页内 `<h2 id="settings-page-title">Settings</h2>` 与 `.settings-page-head` | 带上的 `<h1>` 已经写着 `Settings`，两个标题相距不到 60px。页面的可访问名改指那一个，屏幕上"Settings"只出现一次（断言 `SETTINGS-title`：`settingsHeadingsOnScreen: 1`） |
| Settings 态的侧栏 DOM 与 `toggle-nav-button` | 侧栏不渲染之后，一个开合它的按钮开合的是不存在的东西 |
| 给两条列表各起一个 `aria-label` | 两条列表都紧跟在自己的标题之后（Home 的集合名、会话流的上下文），再起一个名字是同一件事说两遍（WK-12）。**本可以加、审计后不加** |
| Back 的返回箭头 glyph | 文案已经是目的地名（`Back to app`）；IC-1 明禁"Back 导航和 Close 关闭共用一个箭头"，不加箭头就不必去区分它 |
| `state.settingsPreviousView` 一类的"记住来路"字段 | Settings 不改 `state.view` 也不改 `activeSessionId`，它只是主区当前显示的东西。回去不需要恢复任何东西，因为没有任何东西被改过（断言 `SETTINGS-5`） |
| 侧栏折叠态的第二套安全区处理 | 桌面宿主的 52px 惰性带整条横跨窗口，位于三列**之上**；折叠与否都不改变这一点（`SHELL-3`） |
| 一个新的 `--settings-*` 断点变量表 | 四个值就够，且三档只改 `--settings-gutter` 一个 |

### 4.2 新增（去掉后会失去判断）

| 新增 | 去掉它就看不出什么 |
|---|---|
| `hidden` + `inert` 两个属性 | 只写 `display:none` 的侧栏在 DOM 里还在；只写 `inert` 的侧栏读屏还念得到。"唯一导航"这句话要么是真的，要么就不该写进契约 |
| `--settings-nav` 独立于 `--nav` | 侧栏宽日后再动（CC-W）时不连带把设置导航挪走 |
| `unfinishedToolWord()` | 「被打断」与「不知道」的区别。旧写法把一个未知事实说成了一个已知事实 |
| 两条 `role="list"` | 「本会话 3 项」与「整个工作区 3 项」的区别。合并成一条，读屏用户听到的计数就是错的 |
| `.app-shell.settings-active .chat-title-wrap { display: block }` | Home 把标题收起来（名字在下面那一屏已说过），但从 Home 进 Settings 时这一页会没有名字 —— 实测到过一次，见 §12 |
| 窄屏 `.settings-search { min-height: 44px }` | 触屏上够不着的搜索框（实测 36，见 §12） |

## 5. `unknown` 终态是怎么造出来的

不是写进 store 的。`cc-s-seed.mjs` 起一个 `ws_write` 的 run，让它停在授权未决（`tool.start` 有、`tool.result` 无、run `waiting_user`），然后**用 SIGKILL 停掉服务器再起来**：宿主自己的重启恢复（`app/server/service.mjs:175`）把在途 run 记成 `unknown`，并把授权记成 `expired_restart`。优雅停机走的是另一条路，run 记成 `cancelled` —— 那正是同一对词的另一半。两条路都实测过，本页断言取前者。

## 6. 五轮收敛表（Settings，WK-100 体例）

轮次：① 结构 → ② 密度 → ③ 断点 → ④ 状态 → ⑤ 文案。每一格的数字都从渲染出来的文档上读，不从 CSS 反推。

| 轮 | 1440 | 1024 | 390 |
|---|---|---|---|
| ① 结构 | 全局侧栏不渲染（`navRects: 0`、`navFocusable: 0`、`inert: true`）；主区 = 导航列 + 内容列两列；标题行左端 `Back to app` | 同左，导航列折成 select | 同左，单列 |
| ② 密度 | 导航列 **240**、内容列 **820**、左右 gutter **48 / 48**；组间 **40**、组内行 **24**；label 左端同一条（`341`）、控件右边界同一条（`1119`） | 单列，`gap` 12 | gutter **16**，控件 ≥44（`controlsUnder44: []`） |
| ③ 断点 | 无横向溢出（`0`）；≥1680 gutter 开到 **64**；1440 下 200 % 缩放（CSS 视口 720）无横向溢出 | 无横向溢出（`0`），侧栏仍不渲染 | 无横向溢出（`0`），`settings-nav-select` 在、`settings-nav` 不在 |
| ④ 状态 | 见 §7 状态矩阵 | 同 | 同 |
| ⑤ 文案 | `Back to app`（目的地名）；页标题只出现一次；无新增字符串 | 同 | 同 |

原始读数在 `evidence/cc-s/composition-checks.json`（`SETTINGS-*`）。截图：`settings-general-1440-light.png`、`settings-general-1024-light.png`、`settings-general-390-light.png`、`settings-general-1440-zoom200-light.png`、`settings-desktop-shell-1440-light.png`、`home-collapsed-desktop-shell-1440-light.png`。**视觉四轴留用户，本页不自评。**

## 7. 状态矩阵（WK-112 (d)）

每格是 `file:line` 或 `not_applicable` + 理由。

### 7.1 导航列（`settings-nav-column`）

| 状态 | 落点 |
|---|---|
| normal | `app/web/styles.css:4620` `.settings-nav-column`；`app/web/settings-view.mjs` 的九个 tab |
| hover | `styles.css` `.settings-tab:hover` |
| selected | `.settings-tab.is-current`（`aria-selected` 由 `settingsPage.select()` 给） |
| loading | `not_applicable` —— 九个组名是静态的，不来自读取；组内容的读取态在各自的块里 |
| empty | `not_applicable` —— 组数固定为九 |
| error | `not_applicable` —— 同上 |
| disabled | `not_applicable` —— 九个组都可进；不可用的能力在组内以句子说明 |
| dense | `not_applicable` —— 密度偏好不作用于导航列（Text size 作用于全部字号角色） |
| narrow | `styles.css` `@media (max-width: 1023px)`：`.settings-nav` 隐、`.settings-nav-select` 显、`.settings-tab` 命中区 44 |
| long-content | `.settings-nav-column { overflow: auto }`；九个组名是产品词，不会长到截断 |

### 7.2 设置行（`settings-row`）

| 状态 | 落点 |
|---|---|
| normal | `styles.css:2936` `.settings-row`（grid 两列，label / help 一列、控件一列） |
| hover | `not_applicable` —— 行本身不是控件，hover 属于行内的控件 |
| selected | `not_applicable` —— 行不是可选对象 |
| loading | 由行内控件承担；Models 的探测行 `settings-view.mjs` `runProbe` 的 `Probing…` |
| empty | `.settings-block:empty { display: none }` —— 空块不留一张空卡 |
| error | `settings-view.mjs` 的 `probeLine` / 对比度警告；`runtime-view.mjs` 的四态说明 |
| disabled | `settings-view.mjs` 未交付步骤的 `Not available yet: …`（是句子，不是按不动的按钮） |
| dense | 行高随 `--text-*` 角色缩放；`padding: var(--space-3)` 不随字号变 |
| narrow | `@media (max-width: 1023px)`：行内 button / select / input / search 命中区 44 |
| long-content | `.settings-row-help { line-height: 1.5 }` 换行不缩字号；`.settings-readout { overflow-wrap: anywhere }` |

### 7.3 Back to app

| 状态 | 落点 |
|---|---|
| normal | `index.html` `#settings-back-button`（`.quiet-button`，页标题行左端） |
| hover / pressed | `.quiet-button:hover` / `:active` |
| selected | `not_applicable` —— 它是一次动作，不是一个档位 |
| loading | `not_applicable` —— 关掉这一页不发请求 |
| empty / error | `not_applicable` —— 同上 |
| disabled | `not_applicable` —— 永远可用；未保存表单的处理沿各表单现有 dirty 语义（§10 ②） |
| dense | 随字号角色 |
| narrow | `--control` 在 <1024 为 44 |
| long-content | 文案固定三词 |
| 焦点 | 进页时落在它（`app.mjs` `openSettings`）；离开时还给进来时握着焦点的控件（`closeSettings` → `restoreLayerFocus`） |

### 7.4 搜索（`settings-search`）

| 状态 | 落点 |
|---|---|
| normal | `index.html` `#settings-search` + `.sr-only` label |
| hover / focus | `styles.css` 输入通用规则 + `:focus-visible` |
| loading | `not_applicable` —— 只过滤本页已渲染的行，不发请求 |
| empty（无查询） | 九组全在 |
| empty（有查询无命中） | `#settings-search-empty`（`role="status"`） |
| error | `not_applicable` |
| disabled | `not_applicable` |
| dense | 随字号角色 |
| narrow | 本单补 `min-height: 44px` |
| long-content | 单行输入；命中的行本身按各自规则换行 |
| 键 | `/` 聚焦它（`handleRuntimeFinderKey`），IME 组合中不触发 |

## 8. text-sweep 增量

见 [text-sweep §10](text-sweep.md)：改 2（`Back` → `Back to app`、`Interrupted` → `Unknown`）、删 1（D-31 页内第二个 `Settings`）、新增 0。

## 9. 断言结果原文

| 套件 | 结果 | 文件 |
|---|---|---|
| `npm --prefix app test` | **244 / 244**（基线 237 + 本单 7） | `tests.log` |
| lint-colors / lint-materials / contrast / smoke | ok / ok / 76 项全通过 / 通过（`realProvider: not_run`） | `lint-colors.log`、`lint-materials.log`、`contrast.log`、`smoke.log` |
| Home / Work / **Settings** 几何与安全区 | **32 / 32**（基线 16 + 本单 16） | `composition-checks.json` |
| CC-S 第 0 项运行断言（本单新增） | **4 / 4** | `cc-s-checks.json`、`cc-s-checks.log` |
| Models & Tools 五轮收敛 | 18 / 18 | `models-checks.json` |
| Chat / Work / Memory shell | 12 / 12 | `shell-checks.json` |
| 探测（BE-17 / 18） | 8 / 8 | `probe-checks.json` |
| Primitive（FE-04） | 11 / 11 | `primitive-checks.json`、`primitive-checks.log` |
| FE-T01 | 3 / 3（无数据）· 4 / 4（rows） | `fe-t01-empty.json`、`fe-t01-rows.json` |
| FE-T07 | 6 / 6 | `fe-t07.json` |
| FE-T11 | 6 / 6 | `fe-t11.json` |
| FE-T03 | 5 / 5 | `counterexamples.json` |
| RC 契约 / 反例 / 视口 | 20 / 20 · 9 / 9 · 36 / 36 | `rc/*.json`、`rc-verify.log` |

### 9.1 SHELL-1 / 2 / 3 原文

```
PASS SHELL-1 {"unsafeControls":[]}
PASS SHELL-2 {"host":"desktop","unsafeControls":[]}
PASS SHELL-3 {"host":"desktop","unsafeControls":[]}
PASS SHELL-2-browser {"host":"browser","unsafeControls":null}
PASS SHELL-3-browser {"host":"browser","unsafeControls":null}
```

`unsafeControls` 是"左 80 × 上 52 的矩形里可聚焦元素的清单"。桌面宿主下三档都是空清单。普通浏览器下这个探针**返回 `null` 而不是空清单**：没有原生覆盖，产品就不叠第二层安全区（shell-refinement §原生窗口控制预留），所以那里根本没有一个要腾的矩形。SHELL-2 是 Settings 态、SHELL-3 是侧栏折叠态，两档都是本单新增。

### 9.2 `Unknown` 与 `Home` / `End` 原文

```
PASS · Run 终态 unknown 且工具无 result → 状态词是 Unknown ·
  {"runStatuses":["unknown"],"rows":[{"text":"ws_writeUnknown","meta":"Unknown"}],
   "group":["1 tool actionUnknown"]}
PASS · Home / End 到列表两端；焦点不在列表里时不接管 ·
  {"rows":6,"tookOverFromOutside":false,"atEnd":{"index":5,"last":5},"atHome":{"index":0}}
PASS · Home 下带是一条列表：role=list 在包着行的那一层，行本身仍是按钮 / article ·
  {"lists":2,"items":[5,1],"navItemsOutsideAList":0,"rowsAreButtonsOrArticles":true}
PASS · Chat Flow 未决卡是自己的一条 role=list，Home 那条不在场（两条列表不合并） ·
  {"role":"list","items":["listitem"],"cardInsideItem":true,"homeListPresent":false,"nonCardRowsOutside":0}
```

### 9.3 因契约改变而改写的三条既有断言

| 断言 | 原样 | 改成 | 为什么不是放宽 |
|---|---|---|---|
| `models-checks` **NAV-1** | 在 Settings 页上量 `.sidebar` 宽 = 256 | 在 Home 上量同一个值 = 256 | WK-116 之后 Settings 页上侧栏不渲染，在那里量只会量到 0。量的是同一个产品配置（`--nav`），阈值一字未动；Settings 自己的导航列宽由 `SETTINGS-2` 承担 |
| `primitive-reconciliation` **inbox 键盘没有批量键与数字键** | 逐字比对 `LIST_KEYS` 字面量 | 解析闭集后逐项核对八个键 | 断言的本意是"没有 a / e / d / x、没有数字键、没有一键决定"，不是"键集永不增长"。`Home` / `End` 是 WK-115 ② 裁定的纯导航键 |
| `chat-work-shell` **WK-92 scope 位是陈述不是控件** | 在整个 `renderChatHeader` 里扫 `button` 等字样 | 扫窗口收到画 meta 行的那一段 | WK-116 之后这个函数还负责隐藏侧栏与它的开合按钮，函数级扫描把那些 **id 里的 "button"** 当成挂在 scope 位上的控件。被断言的事实（scope 位没有 popover / 按钮 / caret）一条未减 |

## 10. 两条 unresolved 的取舍

| unresolved | 选择 | 理由（选最保守者） |
|---|---|---|
| ① Back to app 的位置：页标题行左端（安全区之后）还是导航列顶部 | **页标题行左端** | 导航列顶部会让唯一的离开动作和九个组名进同一条竖列，读起来像第十个组；页标题行左端是这条带上**本来就属于导航的那个槽位**（原先的侧栏开合钮），Settings 态它空出来，Back 顶上去不新增槽位、不新增行、不改变带高。桌面宿主下 52px 惰性带整条横跨窗口、位于三列之上，所以这个槽位天然在 80×52 之后（`SHELL-2` 实测空清单）。 |
| ② settings-active 时是否复用 `--nav` 轨道 | **独立 `--settings-nav: 240`** | 复用的理由是"视觉连续"，但侧栏此刻**不在屏幕上**，没有可连续的对象 —— 这个理由在 WK-116 之后已经不成立。240 是设计初值、也是用户给的 240–256 区间的下沿；不复用意味着 CC-W 若要改 `--nav`，不会顺手把设置导航一起挪走。 |

另两处按同一原则取保守：
- **未保存表单**沿现有 dirty 语义，本单不新增离开拦截。今天各设置表单自己承担保存，Settings 页没有一个跨表单的 dirty 汇总；新造一个拦截层要新增状态，属于工单明禁。
- **Escape 两步序**一字未改（抽屉 / 工作面 → 这一页）。只补了一件事：`openSettings` 顺手收起导航抽屉，否则第一步会指向一个不渲染的层。

## 11. 既有回归

RC 三支、composition、shell、探测、Models、FE-T01 / T03 / T06（含在 `primitive-checks`）/ T07 / T11 全部复跑，结果见 §9 表。复跑口径与 FE-04 相同：每换一次用途换一个全新空目录并重新播种；`primitive-checks`、`shell-checks`、`fe-t11` 不幂等（WK-109 ⑦ 已记）。

## 12. 哪一像素改变了哪一判断

| 改动 | 判断 |
|---|---|
| 侧栏 256px 从屏幕上消失 | 「我现在在改设置」与「我在用这个应用顺便点开了设置」的区别。之前 Settings 是主区里的一页、左边照旧站着整个工作区；现在这一屏只有设置 |
| 内容列 640 → 820、gutter 24 → 48 | 说明句不再挤成窄条；`Data directory` 那一行的三行说明变两行。同时控件右边界从 743 移到 1119，一屏里"控件都在这一条线上"看得见 |
| 组间距 16 → 40 | `New chats` 与 `Data` 之间从"两张挨着的卡"变成"两组"。之前 16 与组内行距 28 太近，眼睛读不出层级 |
| 行 padding 14 → 12 | 相邻两行内容间距 28 → 24，落进 16–24。变密了 2px，但组间距开了 24px：呼吸感从**组之间**来，不是从每行加空白来 |
| 页内第二个 `Settings` 标题消失 | 「这一页叫什么」只需要问一次。删掉之后带上那一行成了唯一的页标题行，Back 与标题在同一条基线上 |
| 从 Home 进 Settings 时标题一度**是空的** | 实测发现：`.home-active .chat-title-wrap { display: none }`（Home 不重复自己的名字）在 Settings 态仍然生效，于是这一页没有名字、`aria-labelledby` 指向一个空元素。补一条 `settings-active` 的覆盖，并加断言 `SETTINGS-title`（页标题 = `Settings`，屏幕上只出现一次）。**这是"删掉重复标题"这一步差点造成的真实缺陷**，不是事后补的装饰 |
| 390 下搜索框 36 → 44 | 触屏上够得着。实测读到 36 才发现：既有的 44 规则只覆盖了 `.settings-row` 里的控件，搜索框在导航列里 |
| tool 行 `Interrupted` → `Unknown`（一个词） | 「它被打断了」与「不知道它怎么了」。前者是一句关于宿主行为的断言，后者是一句关于自己知识的断言；Run 终态是 `unknown` 时只有后者为真 |

## 13. 未检项（分列）

| 项 | 结果 | 说明 |
|---|---|---|
| 触控 | `not_run` | 没有触屏设备；命中区按几何量到 ≥44，不等于实测触控 |
| 读屏 | `not_run` | 没有 VoiceOver / NVDA 实测。`role="list"` / `inert` / `aria-labelledby` 只在 DOM 与无障碍属性层面断言 |
| 真实 IME | `not_run` | `isComposing` / `keyCode 229` 的分支只由源码与合成事件覆盖 |
| 真实 provider | `not_run` | 全程 local-fake；`smoke.log` 自陈 `realProvider: not_run` |
| 200 % 缩放 | 只在 **1440** 量一次（CSS 视口 720，`deviceScaleFactor: 2`），按工单口径 | 1024 / 390 的 200 % 未量 |
| 深色主题 / reduced motion | `not_run`（本单未改任何颜色或动效；lint-colors、contrast 76/76 覆盖 token 层） | |
| 多显示器 / 真实 Tauri 宿主 | `not_run` | 桌面宿主由 `?shell=desktop` 模拟，与 FE-01…04 同一口径 |
| 视觉四轴 | 留用户 | 本页不自评 |

## 14. 待裁定

1. **第 0 项没有独立成一次提交**（§1）。按行切分会产生一个测试不绿的中间提交；取"每次提交都跑绿"。若体例要求以"第 0 项一次提交"为硬约束，下一单请指明允许中间提交不绿。
2. **`Back to app` 与顶带的关系**。Back 现在占的是原侧栏开合钮的槽位，因此它在 DOM 上属于 `chat-header` 而不属于 `#settings-page`。`openSettings` 的"焦点是否已在页内"判断因此永远为假、每次进页都把焦点放回 Back —— 幂等、无害，但如果 CC-W 让顶带承担更多东西，这个槽位需要重新裁一次。
3. **Settings 的 `<h1>` 与 `state.view`**。这一页现在借顶带的 `session-title` 当标题，而 `state.view` 仍是进来前的值（`home` 或某个会话）。语义上"当前是哪一屏"由 `state.settings.open` 与 `state.view` 两个值合起来说。合并成一个 view 值是更干净的模型，但那是新增/改状态，工单明禁，未做。
4. **窄屏 gutter 20 vs 16**。<1024 取 20、<768 取 16，都在 16–20 内；390 实测 16。若希望 1024 以下统一到一个值，需一次裁定。
5. **未保存表单离开**（§10）。今天没有跨表单 dirty 汇总，因此 Back 与 Escape 不拦截。若要拦截，需要一个新的状态，属工单明禁范围，登记待裁。
6. **`Unknown` 是前端推断**。BE-33（tool 未完成原因）交付后应改由后端给出原因，届时 `unfinishedToolWord()` 退役。
7. **Home 的三个集合各是一条 `role="list"`**（实测 `lists: 2`，因为当时只有两个集合有行）。WK-115 ② 说的"Home 下带是一条列表"若指**整条下带一条**而不是**每个集合一条**，需要改：今天每个集合有自己的标题与计数，按集合分列表更接近读屏用户听到的结构，故取此。列入待裁。

## 15. anti-slop 门自查（WK-112 (c) / WK-112 §IX）

| 门 | 自查 |
|---|---|
| **necessity** | 本单删的比加的多在"屏幕上的东西"这一侧：删掉一个重复标题、一整根侧栏、一个开合钮；加的是四个 token、两个 role、一个状态词、两个键。没有新增卡片、图标、装饰线或空状态插画 |
| **hierarchy** | 层级来自三个距离（gutter 48 / 组间 40 / 行 24）与两条对齐线（label 左 341、控件右 1119），不来自边框或底色。`.settings-block` 仍是一层平卡，没有加第二层高度 |
| **system** | 四个新 token 进了 `:root` 与 `ui-composition-standard` 的尺寸表，改数字必须同时改两处（已在表下写明）。没有为这一页复制另一套按钮、圆角或字号 |
| **reference fidelity** | 采纳 S01 / S06 的是**结构与对齐**（Back to app + 单导航列、分组间距、label/control 对齐）。`settings-dedicated.png` 的左栏宽度、蓝色主按钮、新品牌图形、"保存 custom 端点"一律未采纳；本单未引入任何新色、新字、新图形（lint-colors / lint-materials 全通过） |
| **AI tells** | 没有"Manage your preferences below"一类的引导句（新增字符串为 0）；没有 emoji；没有把 `Back` 写成箭头；没有给空块画一张大空卡（`:empty { display: none }`）；没有渐变、发光或圆角堆叠 |
| **reality** | 每个数字都从渲染出来的文档上读（`composition-checks.json`）；`unknown` 终态由宿主自己的重启恢复产生而不是被写进去；截图由脚本自己拍，不是手工裁剪；`not_run` 的四项（触控 / 读屏 / IME / 真实 provider）逐项列出，没有用几何断言冒充可访问性结论 |
