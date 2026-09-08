# WO-WK9 · Home 三带与工作页两态设计画布（Opus）

状态：已派发 2026-09-09。设计先行，不写产品代码。输入：intake-round-2 WK-32…37、EX-WK5、`engineering/design/work-surface-boundaries.md` §5、编排体例、WK7 铅灰 token（`claude/wk7-color-governance` 的 `styles.css` `:root`）。

## 交付（均在 `design/wk9/` 下，静态 HTML，无依赖）

1. `index.html`：画布索引，内嵌各 artboard iframe 或链接。
2. Artboards：`home-a-1440.html`、`home-b-1440.html`（三带，A/B 差异受控：下带卡片 vs 行）、`home-a-390.html`、`work-collapsed-1440.html`（右栏三悬浮卡）、`work-expanded-1440.html`（tab 面板）、`work-390.html`；每板浅 / 深宗各一（`?theme=dark` 或双份文件）。数据全部来自 EX-WK5 可得字段的样例，无数据元素只以"Planned · Backend pending"文字行出现。
3. `clean-evaluation.md`：按 WK-36 判准逐项评分 A/B 与两态，列出参考图中被排除的元素及理由。
4. `../contracts/presentation-primitives.d.ts` 草案：StatTile / Heatmap / WorkCard / RunSummary / FileList / WorkspaceList 的输入 schema、adapter 签名（work-summary / session / run → schema）、缺失值与时区语义（boundaries §5）。
5. `gaps-wk9.md`：热力图端点、多文档 tab、Progress 概念等 gap（WK-27 格式）。

## 不得

绘制无数据源的数字；彩色状态胶囊；插画与渐变；新增颜色（只用 token）；改变 kind 静态映射、renderer 身份、Escape 次序。

验收：用户四轴判断；Astra 复核契约不越 Core 边界。

## r3（待 r2 交付后派发）

1. 修正 Send 为产品圆形 icon-only（WK-48），复测 accent 计数。
2. 扩展模块预留版式（WK-49）：新板 `extension-states-1440.html`，六态各一格，同一模块形态；`work-collapsed` / `work-expanded` 各加一个 ③ 态扩展模块示例；Run 检查栏内 `runtime.inspector` 槽位一板。
3. 消融表（WK-47）：导轨每模块与元素的去除测试。
4. 冻结控件清单随简报给出（WK-48）。
