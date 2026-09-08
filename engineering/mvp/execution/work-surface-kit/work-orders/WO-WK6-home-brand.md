# WO-WK6 · 品牌语义注入 + 首页呼吸 + 文本收编（Opus）

状态：已派发 2026-09-08。吸收 WO-WK5。基线 `f8aff61`；worktree `/private/tmp/se-agent-wk6`，分支 `claude/wk6-home-brand`；端口 8853；数据目录 `/private/tmp/se-agent-wk6-data`。

## 输入

`intake-round-2.md` WK-11…WK-15、WK-19；`engineering/design/ui-composition-standard.md`、`icon-controls.md`、`surface-hierarchy.md`、`ux-conventions.md`；`brand/CONTRACT.md`、`brand/HANDOFF.md` 合流门 3、`brand/catalog.json`；`docs/ui-composition.md` 保留项。

## 写权

`app/web/index.html`、`app/web/home-view.mjs`、`app/web/styles.css`（布局与字阶，不加任何颜色值）、`app/web/app.mjs` 仅品牌状态映射一处与首页调用处；服务端静态 allowlist 仅准入 `brand/src/*.mjs`（单独 commit）。不改 `brand/**`、Core、API、tests 之外的后端。

## 不得

新增颜色或改 token 值；循环 / hover 动画；由 `symbol-motion-end` 推进状态；改 DOM id、ARIA 关系、Run / File 身份、草稿与 renderer owner；新依赖；把状态、授权范围换成图标。

## 交付物

1. 三 commit：allowlist；首页构图与文本收编；品牌接线。
2. `delivery-wk6.md`：SHA、文件、验证原文、未验证、"哪一像素改变了哪一判断"。
3. 捕获 `evidence/wk6/`：1440 与 390，空态与有列表态，reduced-motion。

## 必须验证（fixture）

Home 既有 10 项反例仍过；空态 hero + composer 组位于视口 32–40%；有列表时组顶距在 64–160 px；删除文本后无功能丢失（Enter 行为、项目条件说明在无项目时可见）；品牌属性随 run / question / 连接状态变化的 DOM 断言；allowlist 拒绝非准入路径；无横向溢出；Tab 与 Escape 次序不变。真实 provider 列 `not_run`。验收 Astra / Luna。
