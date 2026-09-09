# EX-CC5 · FE-05a V1 成单前置：1:1 / 深色宗 / 390 / CDP 命中区实测

2026-09-09，Sonnet。产品代码之外的静态验证页，只对 V1 一个方向做成单前置四项检查（intake-round-3.md
§4ab WK-123 (b)），不是验收，不做 V2、不做现状对照（那是 EX-CC4 的范围）。

## 来源

- 只读树：`/private/tmp/se-fable-r4d`。**基线说明**：本单任务书写的基线是 `main` `5ea5ff0`，
  但这棵树实际检出的 HEAD 是 `claude/fable-round4d` 分支的 `bef3cd9`（`main` 目前在
  `a7a08f0`）——`bef3cd9` 正是写下 WK-123 (b) 裁定、并把 EX-CC4 落盘的那一条提交（往前两条是
  `9c5ed1d docs: EX-CC4 静态字阶/密度消融页`），本单需要的 `type-density-constraints.md`、
  `intake-round-3.md` §4ab、EX-CC4 的 `README.md`/`index.html` 都在这个 HEAD 上，内容与任务书
  描述一致，因此按这棵树的实际检出工作，未切换分支或提交（只读树不做任何 checkout）。
- 规格：[type-density-constraints.md](../../type-density-constraints.md)（§2 约束——含
  "按钮完整可读" 新增硬约束一行；§3 V1 目标值；§4 消融面）。
- 方法底本：[EX-CC4 README](../README.md) 与 [index.html](../index.html)——七个变量 + 六类选择器
  的覆盖表逐字复用；本单只把作用域从 `.col-v1` 提到 `:root`（本页只有 V1 一栏，不必再摆现状/V2
  比较），去掉 `zoom`，加一条新 overlay（按钮 nowrap + min-width）。
- 用户裁定依据：[intake-round-3.md §4ab WK-123 (b)](../../../mvp/execution/work-surface-kit/intake-round-3.md)——
  "Work 的 Send / Cancel run 在拼版里挤成小黑块且取消文字折行，暂不通过"；"必须补 1:1 单页（不
  zoom）、深色宗、390、CDP 实测命中区；约束表加一条硬约束——按钮文字不折行、宽度由标签量得
  （min-width）、Send / Cancel run 在 28 高下保持完整可读"。
- 应用端口 **8903**（local-fake，`capabilities.mode: "local-fake"`，未配置真实 provider，未读取
  任何凭据文件，fixture 内没有任何真实 key）。数据目录 `/private/tmp/se-fable-r4d-excc5-data`
  （本单自建的空目录，全部检查结束后已删除）。CDP 端口 **19972–19976**（一次 DOM 抓取 + 一次
  1440 自然宽度量测 + 一次 390 自然宽度量测 + 两次深宗着色链路排障 + 一次完整四文件×双视口×
  双宗量测，逐次换端口避免残留连接）。本机静态文件服务器 **8909**（`python3 -m http.server`，
  只用于给 headless Chrome 提供 `file://` 之外的 `http://` 源以运行 CDP 量测与截图，同 EX-CC4
  沿用的做法）。8850–8861、8810、8817、8818、8887–8902、8921–8953 未被本单占用或触碰。
  结束时 `node server/index.mjs`、`python3 -m http.server`、headless Chrome 与 CDP 连接全部已
  停止，8903 / 8909 已释放，数据目录已删除。

## 生成方法

1. `npm --prefix app start -- --data-dir /private/tmp/se-fable-r4d-excc5-data --port 8903`。
2. 播种：复制 `evidence/cc-s/work-seed.mjs` 到本次会话的 scratch 目录，把三处相对 import
   （`app/domains/inbound-nda/index.mjs`、`fixtures.mjs`、`app/runtime/pi-session-runtime.mjs`）
   改成指向只读树的绝对路径，输出文件名改到 scratch 自己的目录，其余逻辑逐字未动，跑出
   "Complete NDA review"（idle，Run 已完成）。另加一段（同一份 scratch 脚本内追加，逻辑取自
   `evidence/cc-s/seed.mjs` 的 `/fixture question` 模式，`app/runtime/fake-provider.mjs:120`
   的假 provider 钩子）：绑定第二个会话 "Ablation waiting run"，用
   `commandId:"review"` + `input:"/fixture question"` 让 Run 走真实 `ask_user` 工具调用，
   停在 `waiting_user`（不是合成状态，是 Run 真的问了一句然后真的停在那里）。只读树没有被
   写过一个字节——两个脚本运行前都先复制到 scratch，import 路径全部改绝对路径。
3. 用 `evidence/cc-s/browser.mjs`（原样 import，只用环境变量 `APP_URL=http://127.0.0.1:8903`
   `WK6_CDP_PORT=19972` 改端口，未改一行）驱动 headless Chrome，取三处真实 DOM：
   - `#settings-page`（整份，含隐藏的其余八个组，走 `#settings/general` 深链）。
   - `.chat-header` + `#composer-area`，"Complete NDA review" 会话（idle：Run 已完成，
     Send 未禁用，Cancel run 隐藏）。
   - `.chat-header` + `#composer-area`，"Ablation waiting run" 会话（waiting_user：
     Cancel run 可见、`run-badge waiting_user` "Waiting for you"、`composer-run-hint`
     "Waiting for you · Ns · your input will not be sent automatically."）。
   导航到 Work 会话的方法与 `evidence/cc-s/shell-checks.mjs` 的 `expandProject` /
   `openSession` 一致：点击 `[data-nav-key="project:<id>"]` 展开项目，再点击
   `[data-nav-key="session:<id>"]` 选中会话，等 `window.__V5_UI__.state.activeSessionId`
   命中后再等 700–900ms。
4. 一个 Node 构建脚本读取这三段真实 DOM 片段与只读树里 `app/web/styles.css` 的**原文**，
   为每个消融面拼出**单栏 1:1**（不 `zoom`）静态页：`<style>` 先原样内联整份 `styles.css`
   （一字未改），再追加 V1 overlay（下节列出），最后把 DOM 片段套进最小必要的祖先容器
   （`.settings-page` 直接放进一个 `display:flex;flex-direction:column;height:900px（390
   文件 844px）;overflow:auto` 的容器，模拟 `.app-shell` 的 `height:100dvh` 上下文；
   `.chat-header` + `#composer-area` 套进一个 `width:1184px`（1440 文件——`1440 - --nav
   256px` 的真实 chat-panel 宽）或 `width:100%`（390 文件——`app-shell` 在 ≤1023 宽时侧栏
   变浮层不占列轨，chat-panel 本就满宽）的容器）。
5. **1440 与 390 是同一份真实 DOM，靠容器真实宽度触发 `styles.css` 自己的
   `@media (max-width:1023px)` / `(max-width:767px)` 断点，不是缩放**——这是本单与 EX-CC4
   最大的方法差异（EX-CC4 三栏并排要用 `zoom` 压缩，本单单栏不需要，也是任务书明确要求的
   "不 zoom"）。
6. 深浅宗：不铺开两份内容，同一份 DOM 用产品自己的切换机制——`<html data-theme="light">`，
   页头一个按钮把 `document.documentElement.dataset.theme` 在 `"light"`/`"dark"` 间切换，
   等价于 Settings › Appearance 里的 Theme 分段控件在浏览器里做的事。CDP 量测同样是调用
   `document.documentElement.dataset.theme = "dark"` 后等 150ms 再读。**查看方式**：打开
   文件后点页头 "Switch to dark" 按钮，或在 devtools 里把 `<html>` 的 `data-theme` 属性
   改成 `dark`。390 文件需要把**浏览器窗口宽度**调到 ≤1023（理想 390）才会看到本页描述的
   窄屏版式——媒体查询认的是浏览器真实视口宽度，不是页面里某个 div 的宽度；本单的 CDP 量测
   与截图已经把真实视口分别钉在 1440×900 与 390×844，不依赖人工缩放窗口。

## V1 overlay（七变量 + 六类选择器，逐字复用 EX-CC4；两条新增见下）

与 [EX-CC4 覆盖表](../README.md#覆盖的-token-清单只此七个变量--六类选择器覆盖其余-css-一字未动)
完全一致，只把作用域从 `.col-v1` 提到 `:root`：

| token | 现状 | V1 |
|---|---|---|
| `--text-title` | 20 | 18 |
| `--text-navigation-title` | 17 | 15 |
| `--text-section` | 14 | 13 |
| `--text-label` | 13 | 12 |
| `--text-meta` | 12 | 11.5 |
| `--text-caption` | 11 | 10.5 |
| `--tracking-caps` | 0.06em | 0.08em |
| `--control` | 32 | 28 |

选择器覆盖：`h1`／`.settings-section-title`／`.settings-block-title` 字重 → 500；
`.settings-tab` → 450，`.settings-tab.is-current` → 500（EX-CC4 已披露的偏离一处，本单原样
保留）；`.session-mode`／`.session-scope`／`.run-badge` → 450 + `line-height:1.45`；
`.settings-row-help`／`.permission-mode`／`.composer-model`／`#model-settings-button` →
`line-height:1.45`；`button{font-size:var(--text-label)}`；`.primary-button` → 500。

**本单新增两条**（EX-CC4 两处消融面上都没出现过的样本 / 约束表新增行）：

- `.segment { min-height: 26px; }`——约束表 §3 "segment 28 → 26，字号仍 meta"；
  "File access for new chats" 分段控件是这条覆盖第一次遇到真实样本。
- **390 命中区维持 44 的顺序修复**：`styles.css` 原文把 `--control` 的 44px 断言分别挂在
  `@media (max-width:1023px)` 与 `@media (pointer:coarse)` 两条 `:root` 规则上（第
  2128、2328 行）。因为整份 `styles.css` 原文排在这份 overlay **之前**，若不重申，本单
  overlay 里那条无条件的 `:root{--control:28px}` 会排在层叠顺序最后，在 390 / 触控下也把
  命中区压到 28——所以 overlay 末尾把这两条断言原样重放了一次。这是**顺序修复，不是新约束**，
  "390 下可见控件 ≥44 不变" 这条既有约束因此不受 V1 影响（已用 CDP 验证，见下）。

## WK-123 (b) 硬约束：按钮完整可读

**诊断——挤成小黑块与折行是 zoom 拼版的产物，还是 V1 覆盖本身造成的？两者都不是，是应用今天
已有的一个类名不同步，V1 只是把它的后果从"不明显"放大到"肉眼可见"。**

`#send-button` 与 `#cancel-run-button` 的真实 outerHTML（本单第 4 步实测抓到）都带着
`class="... icon-only"`，但两者在这两处消融面命中的状态下渲染的是**文字**（"Send" /
"Cancel run"），不是图标。`app/web/styles.css:471`：

```css
.icon-only { width: var(--control); min-width: var(--control); padding: 0; }
```

这条规则把按钮锁成一个 `var(--control)` 见方、零 padding 的正方形——设计给
`materials-button`／`toggle-nav-button` 这类真正只放一个 svg 图标的按钮用，但
`#send-button`／`#cancel-run-button` 的 JS 渲染路径（`renderComposer()`）在某些真实状态下
把 `textContent` 换成了可读文字，却没有摘掉 `icon-only` 类。这个不同步在**现状**（`--control`
32）下已经存在（EX-CC4 finding #6 已披露："`#cancel-run-button` 的 44px 高不是本消融造成的"）；
V1 把 `--control` 降到 28，只是把同一个正方形锁得更小，把已经存在的折行从"偶发/不明显"变成
"必然"。**用 1:1（不 zoom）单栏页复现：会复现**，且与视口、深浅宗无关——因为病根是
`width:var(--control)` 这条声明本身，不是 zoom 拼版的重新走版触发的假象。

修正（约束表新增行落成，只改 `padding` / `min-width` / `nowrap`，未改字号目标、未改
`--control`、未碰其余按钮）：

```css
button { white-space: nowrap; }
#send-button, #cancel-run-button {
  width: auto;
  padding: 5px 10px;      /* 恢复 button 基础规则的 padding（.icon-only 归零过） */
  min-width: 52px;        /* #send-button，静止标签量得，见下 */
}
#cancel-run-button { min-width: 84px; }
```

**min-width 的量法（"静止标签量得"，与 M-9"以静止态标签预留 min-width"同源）**：解开
`.icon-only` 的宽度锁（`width:auto`、恢复 `padding:5px 10px`）后，用 CDP 在 V1 字号
（`--text-label` 12px）下读 `scrollWidth`——`Send` 49px，`Cancel run` 81px（1440×900 与
390×844 下量得的宽度一致，宽度不随 `--control` 的高度变化）——各加 3px 安全余量，得到
52 / 84。这不是字号目标，是按钮几何的最小修正值。

修正后 CDP 复测：**0 处折行**（`getClientRects().length` 全部 = 1，`scrollWidth ≤
clientWidth` 全部成立），1440 下高 28、390 下高 44（命中区断言，见下），两宗颜色不同但
尺寸相同。详见 [measurements-v1.json](./measurements-v1.json) 的 `sendButtons` /
`cancelButtons` 字段与下方截图。

## CDP 实测汇总

**方法**：headless Chrome（`evidence/cc-s/browser.mjs`），对本目录四个静态页分别用
`Emulation.setDeviceMetricsOverride` 钉 1440×900（`mobile:false`）与 390×844
（`mobile:true`，触发触控媒体特征），每个视口下分别把 `document.documentElement.dataset.theme`
设成 `light`/`dark` 各测一次；量 `getBoundingClientRect`（高、宽）、`scrollWidth` /
`clientWidth`（折行判定：`scrollWidth > clientWidth` 或 `getClientRects().length > 1`）、
`document.documentElement.scrollWidth - innerWidth`（横向溢出）、以及每个采样文字角色的
WCAG 对比度——对比度直接从**该元素实际渲染出的** `getComputedStyle(...).color` 与向上找到的
第一个不透明背景色算（不是重抄 token 字面量，两宗切换是否真的生效也顺带验证了一遍）。
逐条原始数值见 [measurements-v1.json](./measurements-v1.json)。

### 折行（Send / Cancel run / 分段控件）

**0 处折行**，两个视口两种宗全部单行、`scrollWidth ≤ clientWidth`。

### 390 命中区（≥44 断言，仅对真正可交互控件计——按钮、分段控件的可点 `<label>`、
下拉；标题/说明文字与只读 `.settings-readout` 不适用该断言）

| 控件 | 1440 高 | 390 高 | 达标 |
|---|---|---|---|
| `#send-button` | 28 | 44 | 是 |
| `#cancel-run-button` | 28 | 44 | 是 |
| `#permission-settings-button`（权限控件） | 28 | 44 | 是 |
| `#model-settings-button` | 28 | 44 | 是 |
| `.settings-tab`（列表态，≥1024 时可见） | 28 | 隐藏（390 换成 `<select>`，见下） | — |
| `.segment`（"File access for new chats"，设置行/分段控件） | 28 | **32** | **否** |

**不达标 3 处**（浅深两宗各一份，共 6 条实测记录，控件相同、数值相同）：
`.segment` 的三个选项（"Ask before editing" / "Allow edits" / "Read only"）在 390 下
高 32px，未到 44px。**这不是 V1 造成的**：另建一份不套任何 overlay 的纯 `styles.css` 静态
页，同样 390 宽下量出 32px——`app/web/styles.css` 里 `.settings-row button, select,
input {min-height:44px}` 这条 `@media (max-width:1023px)` 规则的选择器只列了
`button`/`select`/`input` 三个标签，`.segment` 是包着隐藏 `<input type=radio>` 的
`<label>`，从未被这条规则覆盖到——是应用现状已有的命中区缺口，与字阶消融、与 V1 都无关。
不在 WK-123 (b) 硬约束范围内（该约束只点名了按钮），本单如实记录，供 Fable 判断是否单独
登记缺陷。

`.settings-tab` 在 390 下整条列表 `display:none`（换成 `#settings-nav-select` 原生
`<select>`，`styles.css` 自带 `min-height:44px`），所以不适用逐项命中区判定。

横向溢出：四个文件 × 两视口 × 两宗，`document.documentElement.scrollWidth - innerWidth`
**全部 = 0**。

### 深色宗对比度（0 处不达标）

采样角色：`#settings-general-title`（title 角色）、`.settings-block-title`（section 角色）、
`.settings-row-title`（body 角色）、`.settings-row-help`（meta 角色）、
`.settings-tab.is-current`、`.segment`、`.session-mode`／`.session-scope`（meta 角色）、
`.run-badge`、`#permission-settings-button`、`#model-settings-button`、`#send-button`、
`#cancel-run-button`。**全部 ≥ 4.5:1**，最低一档是 `.settings-row-help` / meta 角色：
浅宗 5.84、深宗 7.64（`--muted-strong` 对 `--panel`）。逐条数值见
`measurements-v1.json.measurements.*.singles[].contrast`。

**排障记录（一处，已修正，不是产品缺陷）**：量测过程中第一版 `#model-settings-button` 在
深宗量出对比度 1.14（文字色 `rgb(28,32,36)` 即浅宗 ink，背景已经是深宗面）——查下来是本单
自己的页面脚手架 CSS 里，为页头文案写了一行 `body { color: #1c2024; }`，这条规则排在
`app/web/styles.css:354` 的 `body { color: var(--ink); }` **之后**、特异度相同，按源码
顺序覆盖掉了产品自己的深宗切色，順着 `color:inherit` 一路漏到 `.frame` 里面的真实按钮上。
与产品无关，是本单脚手架的 bug；已改成把 `color` 限定在 `.page-head` 范围内，不再覆盖
`body`，复测后 `#model-settings-button` 深宗对比度回到 12.43。记在这里是为了说明"深宗
下每个角色都要挂着实际渲染取色，不能凭空信任覆盖顺序"，也提醒 Fable：**任何后续给产品
CSS 叠 overlay 的静态验证页，都要检查 overlay 有没有在 `body`/`:root` 这类广播选择器上
踩到产品自己的深宗规则**。

## 文件

- `settings-general-1440.html` / `settings-general-390.html` — Settings › General，
  单栏 1:1，浅深宗用页头按钮切换。
- `work-header-1440.html` / `work-header-390.html` — Work 头部 + composer，单栏 1:1，
  纵向堆叠 composer·idle 与 composer·waiting_user 两段真实状态，浅深宗同上切换。
- `measurements-v1.json` — 逐控件原始 CDP 数值（高宽、`scrollWidth`/`clientWidth`、
  折行判定、对比度）+ min-width 量法记录 + `.segment` 命中区基线对照。
- `screenshots/` — 8 张 PNG，命名 `<面>-<视口>-<宗>.png`（`settings-general-1440-light`
  … `work-header-390-dark`），CDP `Page.captureScreenshot` 直出，未经裁剪缩放。

## 结论（供 Fable 判定成单）

四项前置——1:1 单页、深色宗、390、CDP 实测命中区与按钮不折行——均已完成：

1. **1:1 不 zoom**：容器宽度触发真实断点，非缩放，已在方法节说明查看条件。
2. **深色宗**：产品自己的 `data-theme` 机制，0 处对比度不达标（排障记录一处脚手架自身
   的 bug，已修正）。
3. **390**：0 处横向溢出；`.segment`（分段控件）3 处命中区不达标，但经基线对照确认与
   V1 无关，是应用现状已有缺口。
4. **按钮不折行**：Send / Cancel run 在拼版里挤成小黑块与折行的病根是 `.icon-only` 类
   与文字内容不同步（应用现状已有，V1 只是放大后果），已用 nowrap + 恢复 padding +
   量得的 min-width 修正，复测 0 处折行。

## 不做

不改 `app/**` 一字；不 git commit；不引新字体、新颜色；不动间距 token；不做 V2；
不宣称这是验收——四项前置是否"过"，由 Fable 与用户判定，本页只交实测数据与诊断。

## 未覆盖项 / 局限

1. 可变字重轴（450/550）在目标渲染环境是否真的插值、还是被吸附到 400/500/700，未验证
   （同 EX-CC4 局限 #2，本单未新增验证手段）。
2. **真实触控 not_run**：390 下 `--control:44` 依赖 `@media (pointer:coarse)` 或
   `(max-width:1023px)` 命中；CDP 用 `mobile:true` 触发了 Chrome 自己的触控媒体特征模拟，
   与真实触屏设备行为一致，但终究是模拟，不是物理触控。
3. 一个人打开 `-390.html` 文件本身：文件里的媒体查询认浏览器真实视口宽度，不认页面内
   任何 div 的宽度——不缩窄浏览器窗口到 ≤1023 就会看到桌面版式而不是本页描述的窄屏版式；
   本单的 CDP 量测与截图已经把真实视口钉在 390×844，可作为不依赖人工缩放的记录。
4. 静态片段是一次真实渲染的快照，不再跑应用 JS，交互（hover、focus、点击切组、`Sending…`
   进行时改词）在这页里不存在——min-width 的验证只覆盖静止态标签，不覆盖换词那一刻。
5. 未回归 `--tracking-caps` 在这两处消融面的可见效果（同 EX-CC4 局限 #1，两处消融面仍然
   没有用到大写 eyebrow 元素）。
