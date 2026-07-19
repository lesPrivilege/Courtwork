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

## B4 · 磁青宗解冻置换 + 色彩语法四位落账（票面①③）

变更面：`site/styles.css`（色板 + 全量消费面）、`site/og.html`、`site/assets/icon.svg`、
`site/assets/og.png`（重渲）、`site/index.html`（设计边界小注）、
`site/scripts/{deslop-scan,deslop-scan-lib,deslop-scan.test}.mjs`（解冻 + `color-grammar` 门）、
`docs/design/site-evidence-line.md`（SITE-CRAFT-1 例外条款的退役色宗表述随宗修订，本单票面授权）。

### ① 解冻置换：冻结表到期，回绑 token 名

B1 分治裁定②立的 `siteFrozenColors` 按值冻结表（带到期指针）**整体删除**，改为按**名**绑定
`themes.dark`——站与壳 dark 同宗、同源，站面色值从此零第二真源。同批把 site 私名归位到 token 路径末段：
`--ink→--text-primary`、`--focus→--border-focus`、`--danger→--red-fg`，`og.html` 六枚变量同规改名。

**按名绑定的对照实验**（判例一：对照实验须在复现条件下做）——只动 `docs/design/tokens.json` 的
`themes.dark.bg.app` 一枚值、站面源码一字不动：

| | tokens.json | 站面源码 | `deslop-scan` |
|---|---|---|---|
| 对照 | 原值 | 未动 | exit 0 · PASS |
| 实验 | 单点漂移 | 未动 | **exit 1**，`site/styles.css` 与 `site/og.html` 的 `--bg-app` 双双触红 |

按值冻结表在同一实验下会保持全绿，故此实验对「按名 vs 按值」有真实区分力。

**品牌一致性闭合**（B1 分治裁定③挂账）：`site/assets/icon.svg` 四路径几何一字不动，仅描边从迁移前旧板
换到 `themes.dark.text.primary`；`og.html` 同批换宗并重渲 `og.png`（1200×630）。三件（站标 / 壳
`icon-light` / 壳 `icon-dark`）此后各绑本宗、同锚同源。退役值按判例三只述关系不复述色值。

### ③ 色彩语法四位 + 稀缺性宣告 + 机器门叙事

`design-boundary` 井由两行扩为三行：四位语法（磁青为底 / 墨为记 / 朱仅裁决 / 泥金 hero 唯一强调）、
语义色配额宣告、克制由机器门强制并链接本证据目录。**宣称逐条与门实测对齐**：

| 页面宣称 | 对应门 | 反例实测 |
|---|---|---|
| 词表之外的颜色 | `raw-color` | tokens 单点漂移 → 触红（上表） |
| 越界的朱与泥金 | `color-grammar`（本批新增） | 朱出裁决面 / 泥金出 hero / keyframe 夹带 / 白名单零消费，四向触红 |
| 未经登记的渐变与阴影 | `gradient`、`shadow` + `bannedVisual` 行禁 | 既有反例集 |
| 越界的动效 | `site-motion`、`demo-motion`、`press-feedback` | 既有反例集 |

`color-grammar` 门自身受变异检验：把门体空转 → `node --test` 由 26/26 转 **25 passed / 1 failed**（3 处断言红），
复原后回 26/26。门不是空转的。

**朱的归位**：B3 落章时 `semantic.zhu` 尚未入 token，红的语义预算全属风险与删除，故当时拒印泥红、
以白线阳文替代。B0 定值批准后朱成为独立语义族（朱＝人工落定/裁决），落定章正是该族的原型件，
本批归位为朱印；同族第二消费面为微演示的处置动作（确认此项/驳回/修正）——描边式朱批，
不做填充以免静态描绘被读成可点控件。红与朱在门内是两族，各有专属消费面。

### 元信息按底色分档（对比度闭合，产品负责人 2026-07-19 拍板：站面消费侧升档）

深宗把中性阶与浮起面的明度差压窄了：同一枚 `--text-tertiary`，在底纸上 4.28:1，落到 `bg-raised`
只剩 3.14:1。本批以**消费侧**闭合——新增 `--meta`（底纸 tertiary / 浮起面 secondary），零新色值、
不动 `tokens.json`、不碰产品壳，故不预支 B2 票面②对共用 token 的取值裁定。

实测（1440×900，装饰层 `aria-hidden` 不入正文口径；「回放峰值」＝注意力循环底纹最亮帧）：

| 态 | 低于 AA 4.5:1 元素 | 最低比值 |
|---|---|---|
| 基线（迁移前旧板，`main@74b82b1`） | 45 | 3.49:1 |
| 磁青置换后 · 未分档 | 50（回放峰值 53） | 3.14:1（峰值 2.67:1） |
| 磁青 + `--meta` 分档（**本批交付态**） | **14** | **4.28:1** |

交付态的 14 枚残余全部是 tertiary 落在底纸上、比值恰为 4.28:1——即 `themes.dark.text.tertiary`
自身在 tokens.json 中已登记的值（"对底纸 4.28:1"）。站面不再叠加任何本地劣化，残余等同壳侧
B2 票面②所辖的共用 token 缺口；分档法作为第三条闭合杠杆写入 SPEC 提案区交 B2 参考。

| 帧 | 说明 |
|---|---|
| `B4/01-full-1440.png` | 整页终态（磁青底 + 泥金母题 + 朱印） |
| `B4/02-hero-1440.png` | hero：泥金写经母题定格 |
| `B4/03-promise-seal.png` | 承诺浮起版面 + 朱印落定章 + 设计边界井 |
| `B4/04-evidence-chain.png` / `B4/05-scenario-ledger.png` | 卷一证据链 / 卷三垂类泛化 |
| `B4/06-design-boundary.png` | 四位语法三行小注特写 |
| `B4/07-reduced-hero.png` | reduced-motion 定格（运行动画仅 3 条 `ghosty-reduced-fade`，与 SITE-CRAFT-1-FADE 契约一致） |
| `B4/08-nojs-hero.png` / `B4/09-nojs-full.png` | JS 关闭：母题与全文完整 |
| `B4/10-mobile-375.png` | 375 窄屏 |

响应式实测：375 / 768 / 1180 / 1600 四档横向溢出均为 **0px**。

`og.png` 重渲命令（不入仓脚本，沿 `zhuque/SOURCE.md` 记录命令的先例；playwright 自 `apps/desktop`
依赖树解析，站面本身仍零构建依赖）：

```js
// viewport 1200×630, deviceScaleFactor 1
await page.goto(pathToFileURL('site/og.html'));
await page.screenshot({ path: 'site/assets/og.png', type: 'png' });
```

## B5 · 文书记号系原生 SVG 首场 + SchemaParts 件库（票面②）

变更面：`site/index.html`（件库 + 记号消费面）、`site/styles.css`（记号版式，退役 blockquote
`border-left`）、`site/scripts/{deslop-scan,deslop-scan-lib,deslop-scan.test}.mjs`（`schema-parts` 门）。
零新资产文件（件库内联）、零动效。

四记号各司一职：鱼尾＝节标（5 处卷次）、文武线＝结构分隔无彩（3 处引语，**退役通用彩色竖条**）、
侧点圈点＝强调（1 处判定句）、朱印落定章＝裁决落定（框廓入件库，印文留消费点）。
另并入 B3 原为内联的骑缝齿痕，以守单源。

**渲染实测**（`<use>` 引用失败会静默为零尺寸，故逐件量框）：

| 件 | 消费点 | 实测框 |
|---|---|---|
| `#mark-fishtail` | 5 | 12×6 |
| `#mark-rule` | 3 | 5×98（随 blockquote 高度拉伸） |
| `#mark-emphasis` | 1 | 9×9 |
| `#mark-seal-frame` | 1 | 91×91（印文 `不改原件` 未变，B3 tether 仍绿） |
| `#mark-seam` | 1 | 72×24 |

零尺寸件 **0**。件库 `display:none`，件库外几何 **0** 处。

**三条解耦预留的反例集**（`schema-parts` 门，五向）：几何抄成第二份 / 件里写死色值 /
件零消费者 / `<use>` 指向未声明件 / 件库整块缺席——逐条触红。门体空转变异 27/27 → 26 passed /
1 failed，复原回 27/27，证门非空转。

**单源门的当场收获**：B3 骑缝齿痕的内联几何是被门的单源检查扫出来的（不是人工回看）——
这正是「预留写成门」而非「预留写进文档」的价值。

| 帧 | 说明 |
|---|---|
| `B5/04-evidence-chain.png` | 卷一：鱼尾节标 + 两处文武线界行 + 圈点落在判定句 |
| `B5/05-scenario-ledger.png` | 卷三：PM 原句的文武线界行；卷宗计数 20/47/14/8 静止 |
| `B5/03-promise-seal.png` | 朱印落定章（框廓已转 `<use>`，印文与首则承诺同文） |
| `B5/01-full-1440.png` / `B5/02-hero-1440.png` | 整页 / hero 终态 |
| `B5/07-reduced-hero.png` · `B5/08-nojs-hero.png` · `B5/10-mobile-375.png` | reduced-motion / JS 关闭 / 375 窄屏 |

响应式实测：375 / 768 / 1180 / 1600 四档横向溢出均为 0px；reduced-motion 运行动画仍仅 3 条
`ghosty-reduced-fade`（记号系全静态，未引入任何新动效）。

## B6 · 排印光学 + 墨迹洇染压线单点实验（票面④的零下载部分）

变更面：`site/styles.css`（body 三条排印光学）、`site/index.html`（`#ink-bleed` 滤镜 + 单点消费）、
`site/scripts/{deslop-scan-lib,deslop-scan.test}.mjs`（单点裁定入 `schema-parts` 门）。
**票面④的字体轨（刻本标题类候选 / 朱雀正文轨）不在本批**——需联网取字与逐一核许可，
经产品负责人 2026-07-19 拍板「先做零下载的④」，字体轨另开一批。

### 排印光学：逐条实测适用面（不宣称未测得的效果）

| 属性 | Chromium 148 支持 | 站面实测 |
|---|---|---|
| `text-autospace: normal` | ✔ | **有效但面窄**：整页聚合 **+7px**（26907.1 → 26914.1）。Chromium 初值是 `no-autospace`，故这行是真开关而非复述默认 |
| `text-spacing-trim: trim-start` | ✔ | **当前零作用面**：渲染文本里开合括号计数为 **0**（源码里的 11 处全在 HTML 注释内）。合成探针上可测（250.14px vs 初值 258.14px vs `space-all` 274.14px） |
| `hanging-punctuation: allow-end` | ✘（Safari only） | **未实测**：`CSS.supports` 为 false，本批采样浏览器上取不到证据；按渐进增强声明 |

`text-autospace` 的增量集中在**三处 fixture 逐字引语**（唯一的未加空格中西混排 `的1`）：
证据链原件引语 +3.5px、微演示原件正文 +1.1px；而结论正文 / PM 原句 / hero 副题 / 设计边界小注
四处实测 **0**——它们是人工撰写的文案，本就手加了空格。

这正是该属性在本站的立身处：**人写的文案可以手加空格，fixture 逐字引语不能动**
（「无锚不落格」的另一面是引语一字不改）。`text-autospace` 是让这些不可编辑的字串
拿到正确视觉字距的唯一机制，不是装饰。

### 墨迹洇染：压线单点

刻本刷印时墨顺纸纤维洇开，线的边缘因此不是几何直边。`feTurbulence`（纸纤维噪声）+
`feDisplacementMap`（边缘位移，scale 1.7）——纯几何扰动，零色值、零渐变、零阴影、零动效。

落点唯一：**证据链「引语」节点的那条界行**——全页最该被逐字信任的一句，也是唯一一处
「墨真正压到纸上」的位置。

**奖级工艺裁定「单点，不铺开」已写成门**：`schema-parts` 门要求件库声明的每枚 filter
全站消费点恰为 1。裁定若只写在文档里，下一次就会被顺手铺开；写成门之后铺不开。
实测反例——把洇染加到第二条界行：

```
[schema-parts] site/index.html:1 craft filter #ink-bleed has 2 consumers; the single-point ruling allows exactly 1
```

| 帧 | 说明 |
|---|---|
| `B6/11-ink-bleed-on.png` / `B6/12-ink-bleed-off.png` | 同一条界行，仅滤镜开关（3× 放大，看边缘纤维） |
| `B6/13-ink-bleed-on-1x.png` / `B6/14-ink-bleed-off-1x.png` | 同对照的 1× 实尺——克制刻度：近看有、远看无，不喧宾夺主 |

**数据区静止复核**：7 个数据节点（卷宗计数 + 三处引语 + 微演示正文）在 1.2s 间隔前后
包围盒逐位一致（`identical: true`）；洇染是静态滤镜，运行动画数不因它增加。
