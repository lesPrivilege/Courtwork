# VERSIONAL-LANG-3 · Agent／Pages 同源双宗与重要标题预算

日期：2026-07-20。参考实物：`设计语言三档评估板.dc.html`（SHA-256
`0648262d0894dd7b79ad8603e4441d21f6115cac422052b397e20350b67008f0`）与
`巧思生长谱-版本学与写本.dc.html`（SHA-256
`dcba23b955d623bb55c258ba0e351858c4e187f6262f926dd85dec76e96bd870`）。

| 行 | 档位 | 唯一目标 | 裁决 |
|---|---|---|---|
| VL3-C01 | Pages 激进档 | `site/styles.css#shared-dual-theme-palette` | Pages 增加系统深浅双宗；浅宗逐值用 `color.*`，深宗逐值用 `themes.dark.*` |
| VL3-C02 | Agent 中间档 | `apps/desktop/src/styles.css#versional-important-title-token` | 两端共用 `--important-title`：浅宗冷墨，深宗泥金 |
| VL3-T01 | Agent 中间档 | `apps/desktop/src/styles.css#versional-important-title-consumers` | 只给欢迎题、案件题、设置总题、图谱总题；标题轨 600 |
| VL3-T02 | Pages 激进档 | `site/styles.css#versional-important-title-consumers` | 只给 Hero 与卷级大标题；Hero 继续宋体 700 |
| VL3-T03 | Agent 中间档 | `apps/desktop/src/preview/gallery/main.tsx#resolved-data-theme` | 图谱独立入口安装与主入口同一主题控制器；只解析根 token，不写组件分支 |
| VL3-S01 | Pages 激进档 | `site/assets/screenshots#versional-dual-theme-refresh` | 从本轮真实 Agent UI 重摄三态并替换六枚响应式 WebP |

禁区：泥金不得进入正文、功能标签、schema、数据、说明文字或通用 `h3`；组件不得写双宗分支，
两宗只在根 token 层换值。P2-L16 的拒迁是当时产品指令之前的历史裁决，不改写；本批以新行覆议。
