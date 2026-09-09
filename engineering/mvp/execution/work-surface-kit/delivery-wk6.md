# WO-WK6 交付 · 品牌注入 + 首页呼吸 + 文本收编（Opus 施工，Fable 收尾，2026-09-09）

分支 `claude/wk6-home-brand`，基线 `f8aff61`，工作树 `<isolated-checkout>`，端口 8853。Opus 在写交付前触发会话额度上限；提交与证据齐全，本记录由 Fable 依据证据文件写出。未推送。

## 提交

| SHA | 内容 |
|---|---|
| `802c65e` | `app/server/index.mjs`：STATIC allowlist 准入 `brand/src/*.mjs`（单独提交） |
| `8adafb5` | Home 构图与文本收编：去 header 行（Home 态）、去 eyebrow、去 Enter 提示、无项目时一句条件说明、连接 chip 入 composer 控件行；`styles.css` 布局与字阶，不加颜色 |
| `4007f80` | 品牌接线：`<court-symbol>` 三处（hero 48 glass、侧栏 wordmark 20 mono、会话 header 16 mono）；`app.mjs` 一个映射函数：activity ← run 八态、authority ← question 四态、presence ← 连接；动词 summon / write / retrieve / scope / withdraw，140 ms，不循环 |

## 验证（fixture 列，`evidence/wk6/`）

- `home-interaction-results.json`：无项目时条件句显示；有项目后消失；草稿跨项目创建保留；Shift+Enter 换行不发送；Enter 发送一 session 一 run；Send 为 composer 最后一个焦点。全部 pass。
- `brand-state-results.json`：无 run 时 idle / none / present；pending 授权时 authority=requested 且 activity 不变为 thinking；其余状态映射断言 pass。
- `npm --prefix app test`：134 / 134。
- 捕获：`empty-1440.png`、`empty-390.png`、`list-1440-reduced-motion.png`。

## 未验证

有列表态 390 捕获、reduced-motion 390 捕获（agent 中止）；allowlist 拒绝非准入路径的显式断言（代码审阅：STATIC 为白名单 Map，未列路径 404）；真实 provider `not_run`。

## 后续取代

WK-32 取消 Home 的 48 px hero 符号；WK8 已在本分支移除并改 slogan，见 `delivery-wk8.md`。
