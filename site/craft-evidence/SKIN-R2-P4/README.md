# SKIN-R2 P4 · B5 深色实现证据

实现基线：`main@10cc519`。本目录是实现会话的自检证据，不替代独立验收。

## 实机结论

真实 Tauri WKWebView 在 macOS 26.5.2 深色系统下以 `system` 模式解析为 `data-theme="dark"`。1600×900 CSS 窗口在 DPR 2 截为 3200×1800；欢迎面、Settings 数据面和键盘 focus 三帧均来自同一真壳进程。

- `tauri-wkwebview-dark-system-1600x900.png`：完整壳与 composer。
- `tauri-wkwebview-dark-settings-1600x900.png`：raised 设置面、hairline/strong/disabled 同屏。
- `tauri-wkwebview-dark-focus-1600x900.png`：键盘 Tab 后 focus 环实际消费 `themes.dark.border.focus`。
- `browser-light-1600x900.png` / `browser-dark-1600x900.png`：同一真实数据状态的双宗矩阵；Chromium 只作行为与跨引擎回归。

## 四槽覆核

| 槽 | 真值 | 最严实算 | 实机判断 |
|---|---:|---:|---|
| hairline | `#2A3A52` | raised 上 1.1541:1 | 只承常规乌丝，低对比符合“线不抢层级” |
| strong | `#3E5270` | raised 上 1.6726:1 | 输入、外框与 hairline 可辨，不靠局部补色 |
| focus | `#6A94F1` | raised 上 4.5006:1 | 真壳 focus 帧清楚越过控件边，达到既定 4.5 目标 |
| disabled | `#4C5A70` | raised 上 1.8990:1 | 与可用文本明显分档，仍可识别为禁用；不承担正文或唯一信息 |

四槽均直接取 `docs/design/tokens.json#themes.dark`；未发现需要回架构改 token 的缺口，组件零局部补色。

## 行为与机器门

- `courtwork.settings.v1` 内新增 `appearance.themeMode`，未新建存储键；缺值/畸形值回退 `system`。
- `system` 监听 OS；显式 `light` / `dark` 对 OS 变化保持不动。根节点只写解析后的 `data-theme`。
- `checkThemeBoundary` 拒绝组件级 `[data-theme]`、CSS `prefers-color-scheme` 和宗内布局分支。
- `schema-marks.spec.ts:69` 已由前向占位守卫替换为真断言：两宗 mark、文书面与数据文字矩形逐位相等，颜色分别变化。
- 裸 `.titlebar` 与其死账已删除；`.chat-titlebar`、`.titlebar-credential-warn`、`.titlebar-settings` 保留。
- reduced-motion、Settings opt-in、旧 snapshot 与现有数据写入路径未改。
