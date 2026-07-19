# SKIN-B4 · 记号批证据

基线 `main @ 4dde0f0`，隔离 worktree `impl/skin-b4`，隔离端口 1497（e2e）/ 1498（采集）。
判定口径见 `apps/desktop/SPEC.md` 的 SKIN-B4 节。

## 一、记号消费面（两枚上身）

| 件 | 帧 | 读法 |
|---|---|---|
| 鱼尾 · 节标 | `mark-fishtail-context.png` / `mark-fishtail-closeup.png` | 原件阅读面（`.reader-pane`）的节标左侧。**落点是渲染器不是语料**：`#` 行 → `h3` 是节标的渲染位；现行 demo 合同恰只有一条节标（文书题），故帧内只见一枚 |
| 落定章 · 裁决落定 | `settle-seal-before.png` / `settle-seal-after.png` / `mark-seal-closeup.png` | 同一张风险详情卡，**唯一变量是处置**：before 未处置无印，after 点「确认此项」后钤印。印覆正文是钤印常态（原型自述「承诺暗版右上」），故取 50% 与非交互 |

另三枚（界行 / 圈点 / 骑缝）**克制审计判为不上**，理由逐条登记在
`apps/desktop/scripts/assert-schema-parts.mjs` 的 `UNCONSUMED` 表内（登记即可见，且双向锁：
登记件一旦被接线即红）。**不上者无帧可摄，这不是证据缺失，是审计结论。**

## 二、应用图标位图重导出（前后对照一对）

`app-icon-{32,128}-{before,after}.png`。before 取自重导出前的 `src-tauri/icons/`（内容源自
首枚提交 `2d66c9f`），after 为 `node apps/desktop/scripts/export-app-icons.mjs` 的产物。
逐像素实测三处与结论见 SPEC；重导出动作留在仓里可复跑，源稿再动重跑即可。

## 三、采集复现步骤

图标一对由 `scripts/export-app-icons.mjs`（在仓）产出，前后两侧分别在重导出前/后拷出。

记号五帧为一次性采集，脚本未入仓（一次性证据不留第十个 `capture-*.mjs`）。复现：
起隔离端口 dev（`VITE_COURTWORK_E2E=1 pnpm dev --port <port>`），Playwright 走既有 e2e 路径——
鱼尾：`openWorkbench` → 回工具栏 → `module-working-folders-toggle` → `reader-entry` 首项 →
截 `.reader-pane h3`；落定章：`openWorkbench` → `flow-s3` → 选 `risk-04` → 截 `.risk-detail`
（before）→ 点「确认此项」→ 等 `settle-seal-risk-04` → 截同一张卡（after）与带 22px 留白的特写。

同一路径的**断言**版本常驻 `apps/desktop/tests/e2e/schema-marks.spec.ts`（四例），
证据帧会随基线失效，那四条断言不会。
