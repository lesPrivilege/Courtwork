# EX-GI1 · Generative Identity 只读探索（Sonnet，2026-09-09）

只读探索，回应 [intake-round-3 §4ad WK-125 (d)](../intake-round-3.md) 与 [§4ac WK-124 (d)](../intake-round-3.md) 的派单。只读树 `<isolated-checkout>`（基线 main `5ea5ff0`）；未改 `brand/`、`app/**`，未 commit，未启动服务。specimen 输出见 [identity-specimen/](../../../../design/identity-specimen/index.html)（相对本文件路径；仓内路径 `engineering/design/identity-specimen/`）。

## 0. 结论先行（供 Fable / 品牌线速览）

现有 `brand/` 包**已经是**一份可用的 invariant 来源——geometry、材质角色、色彩闭集、八个动词的笔画语义都已冻结在代码里，不需要新起一套。三个方向共享同一颗"骨架"（4×6 网格 + 直线段构字），只在**怎么画这根骨架**上分叉：A 把它画成 brand 自己的圆头 baton；B 把它画成 ruled 手稿线上的细笔画；C 把它拆成校对/批注记号。这样三者互为对照组，人判断的是"哪种画法"而不是"哪种字形"。C 方向牺牲了个别字母的独立可读性换取"批注感"最强，是需要重点裁定的取舍。

## 1. 现有身份盘点

### 1.1 Canonical geometry（几何真源）

- **权威源稿**：`brand/sources/legacy/icon-dark.svg` / `icon-light.svg`（512 网格）；`brand/geometry/mark.svg` 是对其核心 4 个 rect 做 `(x−112,y−104)×.2` 的平移缩放，删除底盘，不改母题（`brand/CONTRACT.md:3`）。
- **母题**：`brand/sources/legacy/icon.md:5` ——"线 + 文"：一条竖线立在三行抽象文书旁，表达"有边、有据、有人把关"；**明令禁止**天平、法槌、盾牌、立柱、书卷等法律陈词滥调。这是最硬的一条 invariant，三个方向的字形语法都不能长出这类符号。
- **四枚矩形**（`brand/geometry/mark.svg:4-7`）：`stem`（竖线，x7.2 y4 w11.2 h52.8 rx2）、`line-1`/`line-2`（长横，w28 h9.6 rx2.8）、`line-3`（短横，w19.2 h9.6 rx2.8）。比例关系：短横:长横 = 19.2:28 ≈ 0.686；圆角家族只有两级：竖线 rx2、横线 rx2.8。三个 specimen 方向都复用"竖线粗、横线扁、两级圆角"这个比例关系，而不是照搬四个矩形本身（四矩形是 icon 几何，不是字母表几何）。
- **小尺寸简化义务**：`brand/sources/legacy/icon.md` 变体谱系条目——简化项须逐条登记，不得私自简化后不记录；本 specimen 的网格简化（见 §2）比照此纪律登记，不视为"顺手改"。

### 1.2 色彩角色闭集（brand 自有，独立于 app 的 R 层）

`brand/src/symbol.mjs:34` 冻结了浅/深两套五角色调色板：
```
浅：ink #283849 · record #6f8191 · depth #172638 · background #f9fafb · amend #865a4f
深：ink #e0e8f1 · record #b4c0ce · depth #273343 · background #161b23 · amend #d7b1a2
```
经宿主 token `--cw-ink` / `--cw-record` / `--cw-background` / `--cw-depth` / `--cw-amend` 暴露（`brand/CONTRACT.md:50` 起的 Host color tokens 段），未提供时按 theme 回退到上表默认值。**这是一套与 `engineering/mvp/execution/work-surface-kit/contracts/color-governance.md` 的 app R 层（`--ink` / `--accent` / `--danger` 等）完全独立的闭集**——两者都叫"ink"但不是同一个变量、不共享 token 命名空间。本轮 specimen 直接引用 `--cw-*`，不引 app 的 `--ink` 等（见待裁定 §7-1：两套 token 要不要在生成式身份场景合流）。

### 1.3 已有的比例 / 网格 / 笔画规则

- 五材质共享同一份 icon 几何，只换"怎么画这份几何"（`brand/CONTRACT.md:7`）：mono 单色、hierarchical 分 actor/record 两色、glass 线性面光+边缘高光、depth 加偏移、luminous 加光晕。**这正是"同一骨架、多种材质投影"的先例**——本轮三个字形方向沿用同一思路，只是把"投影维度"从 icon 材质换成了字形笔画语法。
- 八个动词的笔画/母题词表（`brand/src/symbol.mjs:45-51`，逐条 file:line 见上一次工具调用）：
  - `summon`：转角括弧提示线（"entering the frame"）
  - `take-floor`：peer 侧边细条暂时后退
  - `retrieve`：虚线来源路径 + 端点信号点
  - `scope`：边界折线（`M22 2h38v57H22`，一个开口的方括号）
  - `commit`：底部 durable-base 横线 + `activity=complete` 时才显出的 settled 勾号（两笔折线）
  - `review`：`comparison` 幽灵矩形（描边、半透明）+ **`amendment` 横线**（`M28 59h19`，amend 色，仅一条，位于末行下方）
  - `withdraw`：`trace` 淡横线（opacity .38，presence 消失后仍留痕）
  - 这些是**唯一已经存在的"revision mark"先例**：一处、amend 色、位于内容下方的短横线。Direction A 的"一处朱色 revision mark"直接复刻这一先例的位置/配色/粗细比例（`brand/CONTRACT.md` 八动词表）；Direction B 弱化为虚线；Direction C 改成贯穿末字的斜向 strike，是三者中唯一偏离这个先例位置的方向（见构造说明与待裁定 §7-5）。
- Motion 时长/曲线（`brand/CONTRACT.md:38` Motion lifetime）：140ms 操作态、440ms 解释态，`cubic-bezier(.23,1,.32,1)`——本轮不产出动效，仅记录供未来 generator 的"动态变体"参数参考。
- `brand/catalog.json:12` `materialThresholdPx: 32`（≤32px 降级为无滤镜 hierarchical；`brand/README.md` 正文写的是 24px——两处口径不一致，登记为 brand 包自身的既有分歧，不在本单修）。

### 1.4 哪些可直接成为 invariant

| 候选 invariant | 来源 | 直接可用 |
|---|---|---|
| 禁止的符号集合（天平/法槌/盾牌/立柱/书卷） | `brand/sources/legacy/icon.md:5` | 可直接采纳 |
| 竖线粗、横线扁、两级圆角（rx2 / rx2.8）的笔画比例关系 | `brand/geometry/mark.svg:4-7` | 可直接采纳（比例，非具体像素） |
| 色彩闭集 ink/record/depth/background/amend（浅深各一套） | `brand/src/symbol.mjs:34` | 可直接采纳 |
| "一处 amend 色 revision mark，位置在内容下方"的先例 | `brand/CONTRACT.md` review 动词 | 可采纳为 A/B 的默认位置；C 的偏离需裁定 |
| "document under governance"（批注/朱笔/schema lines/margins/ruled grid） | 用户转交 [material-grammar-2 §B](../inputs/material-grammar-2-generative-identity-2026-09-09.md) | 用户转交未核验，作方向性词汇，非几何事实 |
| canonical static mark 本体（stem+三行的四矩形） | `brand/geometry/mark.svg` | **不直接可用**——这是 icon 几何，不是字母表几何；字母表需要自己的 invariant（见 §2），本单待品牌线裁定是否要求字母表笔画从四矩形的比例"可推导" |

## 2. Invariant / Variation 草案（WK-125 (d) 两栏）

| Invariant（不动） | 来源 / 依据 |
|---|---|
| 禁止符号集合：天平、法槌、盾牌、立柱、书卷 | `brand/sources/legacy/icon.md:5`，file:line 已给 |
| 色彩闭集：ink / record / depth / background / amend，浅深各一套五值 | `brand/src/symbol.mjs:34` |
| Revision mark 只有一种颜色（amend），且默认只出现一处 | `brand/CONTRACT.md` review 动词先例 |
| 圆角只两级家族（细笔画级 / 粗笔画级），不随意添加第三级 | 类比 `brand/geometry/mark.svg` 的 rx2/rx2.8 两级；具体数值待品牌线定 |
| 字形只能由直线段（含少量对角线）构成，不含自由贝塞尔曲线 | 待品牌线裁定——本 specimen 的技术选择（见 §2 说明），不是既有事实 |
| canonical static mark 保持现状（icon 四矩形几何）不因生成式字母表而改动 | `brand/geometry/mark.svg`；WK-125(d) 明文"先有 canonical static mark，生成态是派生" |
| glyph 进入 UI 状态时只能投影 `ui-state-vocabulary.md` 已有状态 | [ui-state-vocabulary.md §1 Run 表](../contracts/ui-state-vocabulary.md) |
| 不复制 OpenCode 的 mono/block/pixel 风格 | intake-round-3 §4ac WK-124(d) 裁定原文 |

| Variation（有界可变） | 说明 |
|---|---|
| 笔画材质（baton / 细单线 / 批注记号） | 本轮三个方向即三个取值；未来 generator 的第一参数轴 |
| 网格比例（本轮用 4:6 宽高比） | 待品牌线裁定——**没有既有事实**，是本单为使三方向可比而选的临时网格，不是 brand 包既定值 |
| Revision mark 的位置与形态（末字下方横线 / 贯穿斜线） | 有先例（review 动词）但允许方向内变化 |
| 词/号的具体拼写内容（COURTWORK / MATTER / REV nn / matter initials） | 由调用方（host）给定，非几何决定 |
| 深浅 theme | 已有机制（`--cw-*` token 回退），字母表沿用不新增 |
| 是否加入笔画粗细的响应式降级（类比 icon 的 ≤24px 降级材质） | 待品牌线裁定，字母表在极小尺寸的行为目前无既有事实 |

**没有既有事实、本单标注"待品牌线裁定"的项**：网格具体宽高比、圆角具体像素值、笔画是否允许对角线（本 specimen 为覆盖 K/X 用了对角线，brand 包四矩形本身没有对角线先例）、是否允许非 90°/45° 角度。

## 3. 三个字形语法方向

三个方向共享**同一份骨架数据**（每个字母在 4×6 网格上的直线段列表——见 specimen 源码内的构造表，未写入本报告），只是渲染方式不同；这本身演示了"同一 invariant 骨架、多种材质投影"的可行性（类比 brand 五材质共享一份 icon 几何）。specimen 见 [identity-specimen/index.html](../../../../design/identity-specimen/index.html)，三栏同尺寸（1000×1166 viewBox）、同内容：18 字母构字表（覆盖 COURTWORK / MATTER / REVIEW / TRACE / EXPERT 五词 + REV 07 + NDA 所需的全部 18 个字符：A C D E I K M N O P R T U V W X 0 7）、五个完整词、`REV 07`、`NDA`（matter initials 示例）、一个 `CW` 状态字形三帧序列。

### Direction A · Baton grammar（笔画 + 一处朱色 revision mark）

- **构字规则**：4×6 网格，每笔画渲染为粗圆头圆角描边（stroke-width 1.6 单位、round cap/join），视觉上接近 brand 几何的 rounded-rect 语汇；相接的笔画在数据层是同一条 polyline，圆角处理自然连续，不额外画圆角矩形拼接。
- **Revision mark**：每个词/号只在**末字下方**加一条 amend 色横线，直接比例复刻 `brand/src/symbol.mjs:50` 的 `amendment` 笔画（位置、颜色、相对粗细）。
- **覆盖字母**：A C D E I K M N O P R T U V W X 0 7（18 个，见 specimen 构字表行）。
- **REV 07 / NDA / 三帧序列**：见 specimen；序列用 `CW` 二字构成，Frame1「Working」只显 C、W 淡出（opacity .28，表示未完成）；Frame2「Working」C/W 全显（同一状态、进度更深，不新造状态词）；Frame3「Completed」在末尾加一个复刻 brand `commit` 动词 `settled` 勾号（`brand/src/symbol.mjs:49`）的两笔勾，颜色仍是 ink，不引入新色。
- **一句话**：把 brand 现成的圆头笔画语汇直接长成字母，风险最低、最像"brand 自然延伸"。

### Direction B · Ruled-grid grammar（ruled grid 上的 stroke / margin 构字）

- **构字规则**：同一骨架改画成细单线（stroke-width 0.55 单位，round cap），每一行（含字母表整行、每个词各自一行）叠加三道 ruled 参考线（cap / mid / baseline，呼应"schema lines / ruled grid"），词的两端各加一个竖直 margin tick（复刻 `scope` 动词的边界折线 `brand/src/symbol.mjs:48` 的"开口括号"感）。
- **Revision mark**：末字下方虚线底纹（amend 色、dasharray），比 A 更弱，强调"页边批注"而非独立记号——对应用户转交材料里"margins / ruled grid"的构字来源。
- **一句话**：字母是笔画，页面（ruled + margin）本身也说话，最贴近"文书批注"的原始隐喻，但笔画本身最不像现有 brand 几何。

### Direction C · Annotation-mark grammar（annotation marks 组合：strike / insertion / caret）

- **构字规则**：同一骨架按每段笔画的方向分解——近水平段渲染为**strike 虚线**（校对删除号）；近垂直段渲染为沿路径叠放的**insertion caret**（^ 形短笔画堆叠）；对角线段渲染为一串**insertion dot**。字母不再是连续笔画，而是记号的聚落。
- **Revision mark**：一条贯穿末字的朱色斜向 strike（不是 A/B 的底线），是三个方向里唯一偏离 review 动词先例位置的方案。
- **可读性观察（如实记录，非结论）**：COURTWORK / MATTER / REVIEW 三词在 specimen 渲染中仍可辨认，但含多条对角线的字母（K M N V W X）在密集排列时（如 TRACE 的 R、EXPERT 的 X/P 相邻）视觉上互相干扰，单字母孤立识读比 A/B 弱。这是"annotation marks 组合"这一语法本身的代价，不是实现问题——记号密度越高、单字母辨识度天然越低，需要人工判断这个代价是否可接受，或是否需要放宽（比如只对垂直/水平笔画用记号、对角线仍用连续笔画）。
- **一句话**：批注感最强、与"document under governance"隐喻最贴合，但为此支付了单字母可读性成本，三者中最需要人裁。

### 三帧状态序列（三方向共同规则）

只投影 [ui-state-vocabulary.md §1 Run 表](../contracts/ui-state-vocabulary.md) 里的 `Working`（对应后端 `running`）与 `Completed`（对应后端 `completed`），不新造"loading / syncing / building"一类词。Completed 帧的勾号取自 brand 已有的 `commit` 动词 `settled` 笔画（`brand/src/symbol.mjs:49`），不是本单新发明的图形语义。

## 4. 确定性生成规范草案（不实现，只写规范）

**输入 → seed → 输出**：
```
input  = { matterTitle: string, matterType: enum, revisionState: enum }
seed   = stableHash(matterTitle + '|' + matterType + '|' + revisionState)   // 不含时间戳（见待裁定 §7-3）
output = deterministicMark(seed, direction, params)   // 同一 input 永远得到同一 mark
```

**参数空间（≤8 个，草案）**：

| # | 参数 | 取值范围 | 作用 |
|---|---|---|---|
| 1 | `direction` | a / b / c（本单三个方向，未来可扩展） | 选笔画材质语法 |
| 2 | `gridAspect` | 受品牌线约束的窄区间 | 字母宽高比 |
| 3 | `strokeWeight` | 受品牌线约束的窄区间 | 笔画粗细（继承 icon 两级圆角家族的粗细比） |
| 4 | `revisionMarkPresence` | boolean | 是否显示 revision mark（如 matter 无修订历史则不显） |
| 5 | `material` | 复用 brand 现有 `materials` 枚举（`brand/src/symbol.mjs:3`） | 是否叠加 glass/depth/luminous 等既有材质，而非新造 |
| 6 | `theme` | light / dark | 复用现有 `--cw-*` token 回退机制 |
| 7 | `wordSource` | 复用 `copy-convention.md` 词表内的词，不自造新词 | 限定生成对象只能是已冻结的产品词 |
| 8 | `localDisplacement` | 窄区间的笔画局部位移量（呼应用户转交材料"local displacement"一词） | 同一骨架的微扰变体，不改变可读性 |

**可复现要求**：同一 `(matterTitle, matterType, revisionState, direction, generatorVersion)` 元组必须永远产出字节级相同的 SVG（比照 `brand/exports/manifest.json` 对每个静态导出记录 sha256 的做法——generator 的输出也应可算 hash 并登记）。

**版本化边界**：generator 本体、参数默认值表、任一字母骨架数据变更都必须递增 `generatorVersion` 并在 manifest 里留痕；旧版本生成的 mark 不因 generator 升级而静默改变外观（类比 SE 论文对齐冻结版本的纪律）。本单不实现 generator 代码，只交规范文字，实现是未来单（owner 品牌线，见 §5）。

## 5. Facet 范式在 Courtwork 的流程

| 步骤 | 产物 | Owner |
|---|---|---|
| 1. 人写 palette rules / SVG primitives / composition constraints / art-direction constraints | 本报告 + §2 invariant/variation 表 + §7 待裁定清单裁定后的定稿 | 品牌线（人，通常是用户本人经 Fable 转达） |
| 2. agent 写 generator（p5.js 或等价、遵循 §4 规范） | 未来工单（本单不做），产出可执行 generator 代码 + 单测 | 施工 agent（不在前端 writer 队列，需专门派单） |
| 3. generator 探索合法状态空间 | 一批候选 mark（多组 seed 的输出样本），非最终产品 | 施工 agent |
| 4. 人选择 / 拒绝 | 裁定记录（哪些候选进入 governed 集合，哪些参数区间被收窄） | 品牌线 |
| 5. 接受的规则成为 governed | 更新后的 `brand/catalog.json` 一类 manifest，登记 generator 版本与冻结的参数区间 | 品牌线维护，`brand/` 目录 |

与 SE 论文的"稳定 schema + 有界 variation"同构（`inputs/shape-grammar-generative-identity-2026-09-09.md` §Identity）：generator 的参数空间必须先被人收窄到"合法"范围，探索永远在这个范围内进行，不是无约束生成后再挑。

## 6. 载体与边界

| 载体 | 适用方向 | 不适用理由 |
|---|---|---|
| 公共站 hero | A 或 B（结构清晰，远观仍可识读） | C 在大尺寸展示下记号密度带来的"噪点感"可能与"成熟感来自秩序"（WK-120）冲突，需专门验证 |
| Home 空态字标 | A（与现有 brand 圆头笔画语汇最接近，跳跃最小） | C 的批注记号在极简空态里可能读作"未完成/损坏"而非"品牌个性"，风险最高 |
| Matter initials（如 `NDA`） | A 或 B（短字符串，几个字母，可读性压力小） | 若允许进入导航行（见待裁定 §7-4），选字体密度更低的方向 |
| `REV nn` | A（复刻 review 动词的 revision mark 先例最直接） | — |
| 完成 seal | A（Completed 帧的勾号已复刻 commit 动词的 settled 笔画） | C 的批注记号语义是"修订中"，与"已完成/已封存"的 seal 语义有冲突，慎用 |
| state glyph（loading→resolved） | 三方向均可，但只能投影 `ui-state-vocabulary.md` 已有的 Run 状态（本单只做了 Working/Completed 两态） | 不得为 `Stopping` / `Waiting for you` 等其余 Run 值另造字形语义，除非另行裁定 |

**如何避免复制 OpenCode 的 mono/block/pixel 风格**：三方向均未使用固定像素网格点阵渲染（不是"点亮/熄灭格子"的 dot-matrix 视觉）；不使用等宽代码字体或任何字体文件（全部纯 `<path>`/`<line>` 矢量笔画）；A 方向的圆头描边刻意避开直角块状观感；B 方向引入非等距的 ruled 参考线与 margin tick，打破纯网格的"程序生成器"读法；C 方向的记号密度本身就与规整像素块相反。三方向的字符前进量（advance）目前仍是等宽网格（每字 5 单位），这是 specimen 阶段为便于生成与比较做的简化，**如果被裁定要长期使用，应在未来 generator 里改为按字母视觉密度调整的比例宽度**，进一步远离等宽代码字体的观感（登记为待裁定 §7-6）。

## 7. 待裁定清单

1. **两套 token 是否合流**：生成式身份继续只用 brand 自有的 `--cw-ink/record/depth/background/amend`（现状，本 specimen 采用），还是要求它在 app 内使用时改读 `color-governance.md` 的 R 层角色？前者保持 brand 包独立可移植，后者换来与 app 换肤联动但要建映射层。
2. **canonical static mark 是否沿现有字标不动**：是否要求生成式字母表的笔画比例"可从 `brand/geometry/mark.svg` 的四矩形推导"（本单未做这层推导，两者比例关系是本单独立选的），还是允许字母表有自己独立的一套几何常数？前者更"同源"但约束更紧，后者更自由但可能读作"第二套品牌几何"（`brand/sources/legacy/icon.md` 明确禁止"另起一套几何"）。
3. **seed 是否含时间**：本单规范草案（§4）明确不含时间戳，使同一 matter 的 mark 永久稳定；代价是同一 matter 的 revision 状态变化必须靠 `revisionState` 字段本身反映在 seed 里，不能靠"最近一次生成时间"这类隐式信号。
4. **matter initials 是否允许进入导航行**：`copy-convention.md` 现在"Matter | SE 的持久治理边界；产品 UI 现在不显"（`engineering/design/copy-convention.md:35`）——若生成式 initials 进入导航，等于让 Matter 概念首次在 UI 露出，这是比字形语法更大的产品决定，不应由本单代裁。
5. **Direction C 的可读性代价是否可接受**：是否要求生成式身份必须在单字母层面保持独立可读（那样 C 需要收窄记号密度或只对部分笔画方向使用记号），还是接受"整词可读、单字母不必"的批注美学？
6. **字符前进量是否长期等宽**：本单三方向都用等宽网格简化实现；是否要求未来 generator 改为比例宽度以进一步区别于等宽代码字体的观感？
7. **`EXPERT` 一词的定位**：品牌方向声明用"专家在场"的修辞（`brand/README.md:5`，`brand/src/symbol.mjs:27` 的 `summon:'Expert enters'`），但 `copy-convention.md:71` 把 "Expert" 列为 UI **不用**词（该处指 Settings 里"Advanced"一档，不用"Expert"当控件文案）。生成式字形若把 `EXPERT` 作为品牌层的展示词（如 expert identifier），需要品牌线明确这是品牌修辞词还是会被误读为要在 UI 复活一个已被否决的控件文案。
8. **`materialThresholdPx` 的口径分歧顺带处理**：`brand/catalog.json:12` 写 32px，`brand/README.md` 正文写 24px，两处不一致（本单发现，未改，登记供品牌线下次修 brand 包时一并处理，不属于生成式身份范围但与"小尺寸材质降级"这一相邻规则相关）。

## 8. 未做事项（如实登记）

- 未引入任何外部字体或网络字体；specimen 全部为内联 `<path>`/`<line>`/`<circle>`，标题/说明文字用系统字体栈（与 `app/web/styles.css:327-333` 的 `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` 一致），不影响字形本体。
- 未使用任何外链资源（图片、CSS、JS、CDN）；`index.html` 只通过相对路径 `<img>` 引用同目录的三个 SVG。
- 未修改 `brand/` 或 `app/**` 任何文件，未 git commit（工作区仍是只读探索的新增文件，`git status` 会显示 `engineering/design/identity-specimen/` 与本报告为未跟踪新增）。
- 未启动任何本地服务（验证渲染用的是 macOS QuickLook 缩略图与本地 `cairosvg` 静态转 PNG，均不监听端口）。
- 未宣称三个方向中任何一个已被采纳；报告与 specimen 均为供裁定的候选材料。
