# WO-WK8 交付 · slogan、按钮降级、CourtWork 命名、窗口控件留位（Fable，2026-09-09）

分支 `claude/wk6-home-brand`（叠在 WK6 三提交之上），提交 `bd54107`。未推送。

## 改动

- `<title>` 与侧栏 wordmark 文本改为 CourtWork（WK-29）；应用内不再出现 "Schema Engineering"。
- Home hero 改为一行 "Work that exists beyond the model."，移除 48 px 品牌符号与其 summon 播放（WK-26 / WK-32）；placeholder 保留功能提示。
- `#use-edit-message`（Use as draft）降为 secondary（WK-25）。
- 侧栏顶部加 `.shell-strip` 空拖拽条：仅 `html[data-shell="desktop"]` 或 `navigator.windowControlsOverlay.visible` 时显示，高 `env(titlebar-area-height, 52px)`、左内距 `env(titlebar-area-x, 80px)`，`app-region: drag`；header 内控件 `no-drag`；fixture 用 `?shell=desktop` 启用（WK-30 / EX-WK4）。

## 验证（8853，Chromium）

- `?shell=desktop`：`document.title = CourtWork`；wordmark 文本 CourtWork；hero 文本为 slogan；无 `#home-hero-symbol`；`use-edit-message.className = secondary-button`；留位条 display block、高 52；`elementFromPoint(40,26)` 与 `(79,51)` 均为 `.shell-strip`（非交互）。
- 纯浏览器：`data-shell` 为空，留位条 display none，无横向溢出。
- `npm --prefix app test`：134 / 134。

补充提交 `af7cf8b`：侧栏不在屏上时（桌面折叠或窄视口抽屉）主区 header 同样左让 `env(titlebar-area-x, 80px)` 并成为拖拽区；800 px 宽下 `elementFromPoint` 于 (10,10) / (40,26) / (79,51) 均为 header 本体，导航开关左缘 = 80。

## 未验证

真实 Tauri / Electron 壳下的 env() 取值（fresh 尚无壳，WK-31）；Home 10 项脚本本次未重跑（改动不涉及其断言路径，留 Astra 独验）；390 桌面态捕获。
