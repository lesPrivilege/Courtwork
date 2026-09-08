# 对品牌包（`brand/`，Astra 所有）的修改请求

| 编号 | 请求 | 理由 | 提出 |
|---|---|---|---|
| BR-1 | `symbol.mjs` 的 `--cw-ink` / `--cw-record` / `--cw-background`（及 depth）改为可由宿主覆盖：内部写法改为 `var(--cw-ink-host, <现值>)` 一类回退，或把默认值放在 `:host` 上而非 `svg` 上，使 `court-symbol { --cw-ink: var(--ink); --cw-record: var(--muted-strong); }` 生效 | WK-38：应用内符号须跟随铅灰 skin 与深浅宗；现硬编码为蓝倾向的 `#283849` / `#6f8191`，与 WK-16 色彩治理（hex 只在 Tier S）和 WK-21（不用蓝系）不协调。品牌预览页可保留自身默认值 | Fable，2026-09-09 |

## BR-1 · Astra 取色确认与候选交付（2026-09-08）

已确认16/20px hierarchical使用两层实色：actor=`--cw-ink`，record=`--cw-record`；小尺寸无材质滤镜。蓝倾向来自shadow内svg重新声明公共变量，阻断宿主继承。

品牌包修复候选：`codex/brand-host-colors` / `d799a7fabceae2f84d70d00c504ecf6f88e269f9`（基线`f8aff61`）。只改`brand/`，未合入当前fresh或Opus候选。默认值移到实际`var()`使用点，保留品牌默认/显式theme；40份导出与manifest已再生。固定证据：该提交的`brand/evidence/BR-1.md`、`brand/evidence/BR-1-review.md`；契约在`brand/CONTRACT.md`的Host color tokens节。

裁定：保留WK6 `75a366a`已切换的侧栏20px与会话在场16px hierarchical，不再更换几何。应用writer在消费BR-1后补宿主映射：

```css
court-symbol {
  --cw-ink: var(--ink);
  --cw-record: var(--muted-strong);
  --cw-background: var(--panel);
}
```

仅切material仍会使用包默认蓝灰，不能记为取色完成。作者Chromium浏览器原有10/10、新取色7/7通过；Luna独立源码/导出复核通过（40/40 hash与render parity）。16/20px实际样板层级可辨，record对WK7 `10f1afe` panel的填色对比度浅5.84:1、深7.64:1。应用两处真实联调、其它浏览器/强制色未验；合流后按实际背景与在场状态补验。本回执不重排WO-RC/WO-WK9或转移其写权。

### BR-1 · 应用侧消费（Fable，2026-09-09）

`claude/wk6-home-brand` 合入 `d799a7f`（merge `f61120e`），`adb2e01` 加宿主映射；8853 实测 actor = `--ink`、record = `--muted-strong`。取色完成的最终判定待三支（wk6 / wk7 / rc）整合后在铅灰与深宗下复测。
