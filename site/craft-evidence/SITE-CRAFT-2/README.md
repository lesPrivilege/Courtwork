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

## B2 · hero 微演示：活的 schema 工作面（杠杆④）

变更面：`site/index.html`（hero 窗内容截图→重建）、`site/styles.css`（演示版式 + 4 枚 demo-* keyframe +
reduced 全灭）、`site/scripts/{deslop-scan,deslop-scan-lib,deslop-scan.test}.mjs`（`demo-motion` 门）、
`docs/design/site-evidence-line.md`（首屏条款修订 + 微演示动效契约留痕，本单票面授权）；
`site/main.js` 与其 AST 锁零触碰。同批清理：被替换的 `10-milestone-workbench-{1440,720}.webp`
成为死资产，已删除（原始真机帧仍在 `MILESTONE-SHOTS-1/`）。

- **三幕回放**：锚点跳转（原文引语蓝纹 + 依据行同亮）→ 逐条确认（确认门与处置动作）→
  修订对照（建议与未落格边界）。回放只移动注意力（background-color/border-color/opacity），
  数据字形绝对静止；三幕图例底部常驻，当前幕以刻线与底纹标示。
- **诚实重建**：mac-bar 标注「schema 工作面 · 微演示重建 · 合成数据试点」；演示全部文本取自
  页面既有已验字串（risk-01 引语/等级/状态、评语与建议、处置动词），零新造数据；
  处置动作为静态描绘，无 tabindex、无 role、无指针光标，不构成假控件。
- **逐帧采样**（`frame-samples.json`）：26 帧 × 500ms 覆盖 12s 循环——`dataStatic: true`
  （15 个数据节点 rect+text 全帧比特一致）；7 个注意力元素恒有且仅有 4 个契约 keyframe
  （demo-attn-a/b/c + demo-anchor-a）在跑；每区 bg 至少两个取值（循环真实发生）。
  reduced-motion：运行动画 0、注意力层全透明（`reduced-static.png`）；JS 关闭：无 `.js` 旗标、
  条款与三幕文本完整（`js-off-hero.png`）。

| 帧 | 说明 |
|---|---|
| `B2/demo-phase-{a,b,c}.png` | 三幕各自激活时的整页 1440 帧 |
| `B2/sample-final-frame.png` | 采样末帧的 hero 窗特写 |
| `B2/reduced-static.png` | reduced-motion 定格全景（零动画） |
| `B2/js-off-hero.png` | JS 关闭整页帧 |
| `B2/frame-samples.json` | 26 帧采样原始数据与判定 |

## B3 · 前卫版式：文书文化抽象引用（杠杆③ + SVG 件库起步）

变更面：`site/index.html`（卷号体例 ×5 / 骑缝分隔 / 落定章）、`site/styles.css`（三件版式）、
`site/scripts/deslop-scan.mjs`（印章 tether）。全部静态零动效，零新资产文件（SVG 内联）。

- **卷宗编号体例**：卷一（证据链）→ 卷二（真实工作面）→ 卷三（垂类泛化）→ 卷四（产品边界）
  → 卷尾（Courtwork），hero 为封面不编号。
- **骑缝式分隔**：半划齿痕落在卷二｜卷三之缝——真机证据与 catalog 投影的分界上，连续台账
  跨缝完整的完整性隐喻。
- **印记式落定章**：暗版右上与首则承诺同文的方印（不改/原件，朱雀仿宋阳文白线，-2° 微倾）；
  拒印泥红守语义预算。tether 双向反例实测：印文改字触红、首则 dt 漂移触红。

| 帧 | 说明 |
|---|---|
| `B3/seam-context-1440.png` | 骑缝分隔在卷二｜卷三缝上的语境帧 |
| `B3/promise-seal-1440.png` | 承诺暗版 + 卷四编号 + 落定章终态 |
| `B3/closing-tail-1440.png` | 卷尾编号与收尾判词 |
