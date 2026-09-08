# 用户提供的 Settings 参考（2026-09-08）

用户在会话中提供两张桌面应用设置页截图，要求 CourtWork 的 Settings 按 dashboard 方式编排，并在侧栏提供更开放的用户自定义能力。原图未入库；本页按截图可观察内容登记，供 [WK-78](../intake-round-3.md) 与 [WO-WK12](../work-orders/WO-WK12-settings-page.md) 裁取。观察与推断分列；未核对两产品的当前版本。

## 参考一：Claude Code 桌面应用 Settings（模态面板）

观察：

- 面板覆盖在应用之上，左列导航 + 右列内容，右上角关闭；左列顶部搜索框。
- 导航分四组：Settings（General / Account / Privacy / Billing / Usage / Capabilities / Claude Code / Cowork / Claude in Chrome）、Desktop app（General / Extensions / Developer）、Customize（Skills / Connectors / Plugins / Memory）、Platform。
- 内容按二级标题分节（General、Code appearance、Appearance）。每行 = 标题 + 一句说明 + 右侧控件（开关、下拉、文本输入、分段按钮）。
- Code appearance 节：浅色 / 深色主题各一个下拉，下方各一块真实代码 diff 预览，随选择即时变化。
- Code font 为自由文本输入（占位 "e.g. JetBrains Mono"）；Interface font 为分段按钮（Anthropic Sans / System）；Transcript text size 为分段（Small / Medium / Large）。
- 说明句写明作用域与后果（"Applies to new sessions."、"counts towards your plan usage."）。

## 参考二：ChatGPT / Codex 桌面应用 Settings（整页）

观察：

- 整页替换应用主区，左上角 "Back to app"，左列 "Search settings…"。
- 导航分三组：Personal（General / Import / Profile / Appearance / Voice / Configuration / Personalization / Pets / Keyboard shortcuts / Usage & billing / Analytics / Account）、Integrations（Computer use / Computer history / Appshots / Plugins / Browser）、Coding（Hooks / Connections / Git）。
- 内容分节（Permissions、General），每节一张圆角卡，卡内逐行：标题 + 说明 + 右侧控件。
- Permissions 两行：Default permissions（工作区内读写，需要时再请求）与 Full access（可编辑任意文件并联网执行，附风险说明与 Learn more）。
- 路径行右侧显示截断路径 + Change；文件打开目的地下拉；语言下拉 Auto detect；菜单栏常驻、底部面板、终端位置（Bottom / Right 分段）、运行时防休眠等开关。

## 可迁移与禁区（推断，供裁取）

| 可迁移 | 禁区 |
|---|---|
| 行的解剖：标题、一句作用域 / 后果说明、右侧单一控件 | Full access 语义：SE 只有 Ask / Write / Read 与显式策略，不设"无需批准"总开关 |
| 分组导航 + 搜索；组名按对象而非按功能营销 | Pets、Analytics、Billing 等本产品不存在的节点 |
| 主题 / 字体选择附真实预览 | 为凑节点数画无后端的控件（WK-27：未支持者只作 Planned 文字行） |
| 整页或面板两种承载；返回入口与 Escape | 把 Settings 做成第二个状态真源（偏好只在客户端，运行配置仍走 control plane） |
