# EX-WK4 · 窗口控件留位的官方接口（Sonnet，只读）

状态：已派发 2026-09-08。输出 `../explore/ex-wk4-window-controls.md`，卷首标 `直接可消费`。

固定三组官方文档的确切键名、CSS 变量名、版本与平台限制：Window Controls Overlay（MDN / W3C：`env(titlebar-area-x|y|width|height)`、`navigator.windowControlsOverlay`、`display_override: window-controls-overlay`）；Tauri v2 窗口配置（`titleBarStyle` 取值、`trafficLightPosition`、`hiddenTitle`、`decorations`，macOS 限制，`data-tauri-drag-region`）；Electron `BrowserWindow`（`titleBarStyle: hidden | hiddenInset | customButtonsOnHover`、`trafficLightPosition`、`titleBarOverlay`，`-webkit-app-region: drag`）。另记 Apple HIG 关于窗口标题栏与工具栏的可读段落（若可一手抓取）。每来源一行溯源索引 + 一张键名表；不作选型建议。
