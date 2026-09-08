# EX-WK4 · 窗口控件留位的官方接口

状态：**直接可消费**。Sonnet，只读 explore，2026-09-08。

只读声明：本卷全程只用 WebFetch / WebSearch / 只读浏览器（读取渲染后 DOM 与 shadow DOM 内的兼容性表，未提交任何表单、未修改任何页面状态）读取工单指定的官方文档；未修改本工程任何文件（本文件本身除外）、未启动任何本地服务、未读取任何本地数据目录或凭据文件。来源文件与 sha256（本卷依据的工单 / 体例 / 裁定文件，均只读）：

- `work-orders/EX-WK4-window-controls.md` · sha256 `162060d5fa77c10d3d101e49d7f06c1974cb0aaa91b63048b1dd308af657806d`
- `handoff-convention.md` · sha256 `7ab1df384a41845cb3378a45a711fa5d7cf13d781841fed1c6aa9b44e6285084`
- `intake-round-2.md` · sha256 `30db7c1bb12f318e1c09b7e475b6cf384999edf56e4f248fec280dd16828ce32`

未能取得一手正文 / 已访问但与主题无关的 URL（不作为下表转录依据）：

- `https://developer.apple.com/design/human-interface-guidelines/the-window` — 404（该 slug 不存在；改用下方 `windows`，见 AP1）。
- `https://developer.apple.com/design/human-interface-guidelines/toolbars` — 已取得一手正文（AP2），但全文检索 "traffic" 无匹配，工具栏页未讨论红绿灯留位。
- `https://developer.apple.com/design/human-interface-guidelines/sidebars` — 已取得一手正文（AP3），全文检索 "traffic" / "window control" 均无匹配。
- Electron `https://www.electronjs.org/docs/latest/api/browser-window` 与 `.../tutorial/window-customization` 的实时页面——两页均为长文档虚拟化渲染，`titleBarStyle` / `trafficLightPosition` / `app-region` 等关键词不在初始 DOM 内（`document.body.innerText` 不含），改抓 Electron 官方仓库同一文档源（`electron/electron` 的 `docs/api/structures/base-window-options.md`、`docs/tutorial/custom-title-bar.md`、`docs/tutorial/custom-window-interactions.md`，即渲染进 electronjs.org 的同一份原文，见 EL1–EL3）。

## 1. 溯源索引行（体例 §3）

```
MDN1 · https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay · 2026-09-08 · MDN 内容 CC0/CC-BY-SA（页面页脚惯例，未逐页核实）· REUSE · 转录到 本卷 §2 表 A
MDN2 · https://developer.mozilla.org/en-US/docs/Web/API/Navigator/windowControlsOverlay · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 A
MDN3 · https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/getTitlebarAreaRect · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 A
MDN4 · https://developer.mozilla.org/en-US/docs/Web/API/WindowControlsOverlay/geometrychange_event · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 A
MDN5 · https://developer.mozilla.org/en-US/docs/Web/CSS/env · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 A / §3
MDN6 · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display_override · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 A
TA1 · https://v2.tauri.app/reference/config/ · 2026-09-08 · 未在页面正文明示许可（tauri-apps/tauri 仓库 MIT，未在本次抓取核实）· REUSE · 转录到 本卷 §2 表 B
TA2 · https://v2.tauri.app/learn/window-customization/ · 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 B
EL1 · https://raw.githubusercontent.com/electron/electron/main/docs/api/structures/base-window-options.md（渲染于 https://www.electronjs.org/docs/latest/api/browser-window#new-browserwindowoptions）· 2026-09-08 · 未在正文明示许可（electron/electron 仓库代码 MIT，文档许可未核实）· REUSE · 转录到 本卷 §2 表 C
EL2 · https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/custom-title-bar.md（渲染于 https://www.electronjs.org/docs/latest/tutorial/custom-title-bar）· 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 C
EL3 · https://raw.githubusercontent.com/electron/electron/main/docs/tutorial/custom-window-interactions.md（渲染于 https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions）· 2026-09-08 · 同上 · REUSE · 转录到 本卷 §2 表 C / §3
AP1 · https://developer.apple.com/design/human-interface-guidelines/windows · 2026-09-08 · Apple 官方文档，未见开放许可声明 · REFERENCE · 转录到 本卷 §4
AP2 · https://developer.apple.com/design/human-interface-guidelines/toolbars · 2026-09-08 · 同上 · REFERENCE（无红绿灯相关正文，仅登记已读）· 转录到 本卷 §4
AP3 · https://developer.apple.com/design/human-interface-guidelines/sidebars · 2026-09-08 · 同上 · REFERENCE（无红绿灯相关正文，仅登记已读）· 转录到 本卷 §4
```

## 2. 键名表

版本口径：MDN 页面本身不标版本号，版本信息取自页面内嵌的浏览器兼容性表（BCD，经 shadow DOM 逐层展开取得，非页面可见正文摘要）；Tauri 版本为 `v2.tauri.app` 当前正式文档（v2 线）；Electron 版本为 `electron/electron` 默认分支 `main` 对应的 `docs/latest` 渲染源（对照仓库 release 列表，当前稳定线为 v44.x）。

### 表 A · Window Controls Overlay（Web 标准，MDN）

| 键名 | 取值 / 类型 | 平台限制 | 版本（MDN BCD） | 原文 ≤15 词 |
|---|---|---|---|---|
| `navigator.windowControlsOverlay` | 只读，返回 `WindowControlsOverlay` 对象 | 仅安装为桌面 PWA；移动端此属性本身无支持 | Chrome 105、Edge 105、Opera 91（桌面）；Firefox / Safari 不支持 | "exposes information about the title bar geometry" |
| `WindowControlsOverlay.visible` | 只读 boolean | 同上 | 同上（随接口） | "indicates whether the window controls overlay is visible" |
| `WindowControlsOverlay.getTitlebarAreaRect()` | 方法，返回 `DOMRect` | 同上 | 同上（随接口） | "Returns the size and position of the title bar" |
| `geometrychange`（事件） | `WindowControlsOverlay` 上的事件 | 同上 | 同上（随接口） | "Fired when the geometry of the title bar area changes" |
| `display_override: ["window-controls-overlay"]` | manifest 数组项 | 仅桌面操作系统的独立 PWA 窗口；manifest 字段本身 Chrome Android 105 / Samsung Browser 20 也标"全支持"，但 JS 接口（表上两行）在移动端仍为不支持 | Chrome 105、Edge 105、Opera 91（桌面全支持） | "the full window surface area will be available … window control buttons … will appear as an overlay" |
| `env(titlebar-area-x)` / `-y` / `-width` / `-height` | CSS 环境变量，标题栏可视区坐标与尺寸 | 需已启用 `window-controls-overlay` 显示模式 | Chrome 93、Edge 93、Opera 78（桌面）；Firefox / Safari 不支持 | "available when using the window-controls-overlay display_override manifest field" |

### 表 B · Tauri v2 窗口配置（`tauri.conf.json` → `app.windows[]`）

| 键名 | 取值 | 平台限制 | 版本 | 原文 ≤15 词 |
|---|---|---|---|---|
| `titleBarStyle` | `"Visible"` \| `"Transparent"` \| `"Overlay"`，默认 `"Visible"` | 仅 macOS（"How the window title bar should be displayed on macOS"） | Tauri v2 config 参考 | "Shows the title bar as a transparent overlay over the window's content" |
| `hiddenTitle` | boolean | macOS | Tauri v2 | "If true, sets the window title to be hidden on macOS" |
| `decorations` | boolean，默认 `true` | 全平台（无平台标注） | Tauri v2 | "Whether the window should have borders and bars" |
| `trafficLightPosition` | `LogicalPosition \| null` | 仅 macOS；要求 `titleBarStyle: Overlay` 且 `decorations: true` | Tauri v2 | "Requires titleBarStyle: Overlay and decorations: true" |
| `transparent` | boolean | macOS 需 `macOSPrivateApi` 私有 API 开关（会影响 App Store 上架）；Windows 建议配合 `noRedirectionBitmap` | Tauri v2 | "prevents your application from being accepted to the App Store" |
| `data-tauri-drag-region`（HTML 属性，非 JSON 键） | 置于元素上启用拖拽 | 只对直接施加的元素生效，不向子元素传播；Windows 上另需 CSS `app-region: drag` 支持触控/触笔 | Tauri v2 学习指南 | "will only work on the element to which it is directly applied" |

### 表 C · Electron `BrowserWindow`（`docs/api/structures/base-window-options.md` 等）

| 键名 | 取值 | 平台限制 | 版本 | 原文 ≤15 词 |
|---|---|---|---|---|
| `titleBarStyle` | `'default'` \| `'hidden'` \| `'hiddenInset'` \| `'customButtonsOnHover'`，默认 `'default'` | `hiddenInset`、`customButtonsOnHover` 仅 macOS；`customButtonsOnHover` 标"实验性" | Electron docs（`main` 分支，对应 v44.x 线） | "the traffic light buttons will display when being hovered over" |
| `trafficLightPosition` | `Point`（`{x, y}`） | 仅 macOS；对无边框窗口生效 | 同上 | "Set a custom position for the traffic light buttons in frameless windows" |
| `titleBarOverlay` | `Object \| boolean`，默认 `false` | 子键 `color`、`symbolColor` 仅 Windows/Linux；`height` 跨平台 | 同上 | "enables the Window Controls Overlay JavaScript APIs and CSS Environment Variables" |
| `app-region: drag` / `no-drag`（CSS 属性，现行教程用词） | 标记可拖拽 / 排除拖拽矩形区 | 全平台；历史文档另见 `-webkit-app-region` 前缀写法（`base-window-options.md` 内一处残留提法） | 同上 | "Setting app-region: drag marks a rectangular area as draggable" |

## 3. 哪个平台提供哪个信号给 CSS

| 环境 | `env(titlebar-area-*)` | 拖拽 CSS/属性 | 无信号 |
|---|---|---|---|
| 浏览器 PWA（`display_override: window-controls-overlay`） | 有，四个变量（x/y/width/height） | 无需拖拽标记（浏览器原生标题栏区仍由系统处理） | — |
| Tauri v2（`titleBarStyle: Overlay`） | 官方文档未见 Tauri 对接或转发这组 `env()` 变量；配置只经 Rust 端 `trafficLightPosition` 与前端 `data-tauri-drag-region` | `data-tauri-drag-region` 属性（Windows 可加 CSS `app-region: drag` 支持触控） | 未见 `env(titlebar-area-*)`（未核实，非"确认不存在"） |
| Electron（`titleBarOverlay` 启用） | EL1 原文明确引用 WICG 说明文档的 "CSS Environment Variables"，即与浏览器 PWA 同一套 `env(titlebar-area-*)`（Electron 基于 Chromium，未见文档给出不同变量名） | `app-region: drag` / `no-drag`（与 WCO 无关的独立拖拽机制） | — |
| Electron（仅 `titleBarStyle`，未启用 `titleBarOverlay`） | 未启用 WCO，无 `env(titlebar-area-*)` | `app-region: drag` / `no-drag` | 无标题栏几何变量 |

## 4. 结论

1. 三条技术路径（浏览器 WCO / Tauri Overlay / Electron titleBarOverlay）的键名、取值枚举、平台限制均已从官方文档一手核实并逐条转录，见上表。
2. 浏览器端 WCO 全家族（属性、方法、事件、`display_override` 值、四个 `env()` 变量）版本落在 Chrome/Edge 93–105、Opera 78–91，Firefox 与 Safari 桌面版均无支持——WK-30 的"仅 Chromium 桌面 PWA"前提成立。
3. Electron 的 `titleBarOverlay` 文档原文自陈接的是同一套 WCO 的 JS API 与 CSS 环境变量（非 Electron 自造变量名），可与浏览器路径共用同一份 CSS 契约注释。
4. Tauri v2 未见官方文档记载对接 `env(titlebar-area-*)`；其留位机制走的是配置层 `trafficLightPosition`（Rust 端）+ `data-tauri-drag-region`（HTML 属性），与 WCO 是两条不同信号通道——若日后选 Tauri 作为壳，CSS 契约无法直接复用 `env()`，需另立一条本地约定。
5. Apple HIG "Windows" 页一手取得，核心句为"避免自建窗口 UI，不要复制系统外观"；"Toolbars" 与 "Sidebars" 两页一手取得但均未讨论红绿灯留位，未强行转录。
6. Electron 官方文档站点对 `browser-window` 与 `window-customization` 两条长页做了内容虚拟化，直接渲染页抓不到关键词；改抓其 GitHub 源文件（渲染进同一站点的同一份原文）取得实证。
7. 未发现任何来源要求或建议 80×52 px 这一具体尺寸；WK-30 的尺寸数字来自用户截图目测，不由本卷背书或反对。
8. 本卷不做选型建议；三条路径的取舍（是否引入 Tauri、是否维持纯浏览器）留 Fable 裁定。
