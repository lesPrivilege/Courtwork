# WO-WK5 · 品牌符号接入应用（Opus 或 Fable）

状态：已并入 WO-WK6（2026-09-08）；映射表以 intake-round-2 WK-14 为准。

## 问题

CW-BRAND-01 尚未接入 `app/web`。把 `<court-symbol>` 以宿主状态映射方式接入，不让 UI 自行产生权限或成果语义。

## 输入

`brand/CONTRACT.md`、`brand/HANDOFF.md` 合流门第 3 条（allowlist 作为单独可审阅增量）、`brand/catalog.json` tokens；ux-conventions §2 注意力规则。

## 映射（冻结）

| 宿主事实 | 属性 |
|---|---|
| run running / stopping | `activity=thinking` |
| run completed / cancelled / failed / unknown | `activity=complete`（complete 不表示接受）或 `idle` |
| question pending（授权类） | `authority=requested`；allow → `scoped`；deny / expired → `revoked` |
| 连接正常 / 断连 | `presence=present` / `absent`（record 不消失） |
| 会话创建 | 一次 `play('summon')` |
| run 开始输出 | 一次 `play('write')`，140 ms 档，不循环 |
| 会话关闭 | `play('withdraw')` |

材质：≤24 px 由包自动 hierarchical；32 px 以上默认值待用户裁定。主题由宿主传 `theme`。

## 写权

`app/web/index.html`（模块引入）、`app/server` 静态资源 allowlist（仅准入 `brand/src/*.mjs`，单独 commit）、`app/web/app.mjs` 状态映射一处；不改 `brand/**`。

## 不得

循环动画；hover 触发；由 `symbol-motion-end` 推进任何业务状态；开放任意路径。

## 验证

fixture 四会话下属性随状态变化的 DOM 断言；reduced-motion 静态；allowlist 拒绝非准入路径。验收 Astra / Luna。
