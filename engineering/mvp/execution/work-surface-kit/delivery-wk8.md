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

## BR-1 消费（2026-09-09）

- 合入 Astra 品牌候选 `d799a7f`（`codex/brand-host-colors`，只改 `brand/`）为 merge `f61120e`；`adb2e01` 在 `styles.css` 加宿主映射 `court-symbol { --cw-ink: var(--ink); --cw-record: var(--muted-strong); --cw-background: var(--panel); }`；`75a366a` 两处落点为 hierarchical。
- 8853 实测：wordmark 内 actor 填色 = `--ink`（rgb 32,32,32），record 填色 = `--muted-strong`（rgb 100,100,100）；本支尚无 WK7 深宗与铅灰 token，合流 `claude/wk7-color-governance` 后取值自动切换为 slate-12 / slate-11 及深宗值。

## WK-39 · 侧栏次序（2026-09-09，`dbea510`）

New session 上移为导航首行（square-pen 图标 + 文字，与 Home 同一行式）；底部改为 account 式一行：首字母圆标 + 连接名（取自 provider 配置，"Local test" 或模型名；不虚构用户身份，仅为标签）+ 右侧 Refresh / Settings 两枚 icon-only 按钮（accessible name 不变）。8853 实测：侧栏可聚焦次序 wordmark → New project → Close nav → New session → Home → filter；底部 avatar "L" / "Local test" / 两工具按钮；无溢出；`npm test` 134 / 134。

## WK-40 · chat title 与装饰文本（2026-09-09，`d67bd1e`）

去 eyebrow；`#session-title` 内含 `#project-title`（前缀，仅侧栏折叠或 <1024 显示）与 `#session-title-text`；连接徽标 `#capability-badge` 经 `setCapabilityBadge()` 改 icon-only（accessible name "Connection · <连接名>"，四处赋值点统一）。8853 实测：Home 标题 "Home"、徽标 aria-label "Connection · Local test"；会话态标题 "Waiting on a write"、在场标记显示、`nav-collapsed` 时前缀 "Fixture project" 显示；`npm test` 134 / 134。
