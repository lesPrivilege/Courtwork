# SITE-CRAFT-2 · Pages 视效升级证据册

分批交付，每批独立可验。字体许可与来源快照见 [`zhuque/`](zhuque/)。

## B1 · 朱雀仿宋 + 藏青阶深地基（杠杆①②⑤）

变更面：`site/index.html`、`site/styles.css`、`site/scripts/{build,deslop-scan,deslop-scan-lib,deslop-scan.test}.mjs`、
`site/assets/fonts/`（新增子集 woff2 + 清单）。

- **朱雀仿宋上站**：hero 母题、承诺四则 dt、收尾判词共 37 字精确子集（12KB woff2，preload + swap）。
  剂量纪律成立：其余标题层仍为系统 sans。缺字防线为 deslop `display-font` 门（三向绑定：
  页面用字 ⊆ 清单、清单 sha 锚定字节、CSS 真实接线），测试含五向反例。
- **藏青阶做深**：新增 `--ink-deep / --plate-line / --plate-text / --plate-text-dim` 四个派生变量，
  全部 `color-mix` 自既有 token，零新 hex。承诺段从浅灰面升级为全站唯一暗色石版：
  版面（`--ink`）+ 凹刻井（`--ink-deep`）两级暗部，刻线为 bg-app 派生透明白，无阴影无渐变。
- **语义色稀缺性宣告 + 机器门叙事**（杠杆②⑤）：暗版底部 `design-boundary` 井内两行 mono 小注——
  「色彩只承载语义……」宣告与「这份克制不靠自觉，由机器门强制……」叙事，后者链接本证据目录。
- **数据字形**：卷宗计数 20/47/14/8 切到 mono（机器核验数字与叙事文字在字形上分轨）；纯静态属性，
  数据区绝对静止不涉。
- 秒杀项自查：reduced-motion 下 Typer 定格标题直接以仿宋呈现（`after-hero-reduced`）；JS 关闭不影响
  字体加载（纯 CSS @font-face）；375 窄屏折行完整（`after-hero-375`）。

| 帧 | 说明 |
|---|---|
| `B1/before-hero-1440.png` / `B1/after-hero-1440.png` | hero 母题：系统 sans → 朱雀仿宋 |
| `B1/before-promise-1440.png` / `B1/after-promise-dark-plate-1440.png` | 承诺段：浅灰面 → 藏青石版 + 设计边界井 |
| `B1/after-hero-reduced.png` | reduced-motion 定格态 |
| `B1/after-hero-375.png` | 375 窄屏 |

机器门：`node --test`（23 文件级测试含 display-font 五反例）、`pnpm site:guard`、`pnpm site:build` 全绿；
完整门禁数字见 `site/SPEC.md` 的 SITE-CRAFT-2 节。
