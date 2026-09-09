# Brand exploration · 00 Brief（Fable，2026-09-09）

品牌图形层重开。承接 CW-BRAND-01 品牌包（[brand/README](../README.md)、[CONTRACT](../CONTRACT.md)：竖线 + 长 / 长 / 短三行的四矩形母题、presence / authority / activity 三轴、八个动词）、WK-124 (d) 生成式身份线、WK-125 identity invariant / variation、WK-130 EX-GI1 三向 specimen（[identity-specimen](../../engineering/design/identity-specimen/index.html)）。输入：[用户转交](input-brand-primitive-2026-09-09.md)。裁定编号本线 `BR-n`。用户 2026-09-09 指定：fresh Opus 单独考虑 icon 设计与产品面注入。

## 1. 事实

| 事实 | 来源 |
|---|---|
| 现有母题：`brand/geometry/mark.svg` 四矩形（stem + line-1/2/3），从冻结 512 母版平移缩放；`src/geometry.generated.mjs`、`exports/`（8 样板 × 5 材质，40 SVG）均由它派生；web component `court-symbol` 消费同一几何 | `brand/geometry/mark.svg` 首注；`brand/README` |
| 状态轴：presence（available / present / active / absent）、authority（none / requested / scoped / revoked）、activity（idle / thinking / complete）；宿主给事实，组件只显示 | `brand/CONTRACT.md` §Host-owned state |
| 动词八个；产品反馈动画 ≤ 220ms 不循环；解释性样板 440ms | `brand/CONTRACT.md` §八个动词、§Motion lifetime |
| 材质参考板 `brand/references/material-board.png`（Imagegen，三材质，只取光与材质，不取几何）；视觉来源索引 10 项 | `brand/references/README.md`；`brand/sources/visual-runtime-index.json` |
| EX-GI1 三向字形语法 specimen（A Baton / B Ruled-grid / C Annotation-mark）；用户同意 A 为字标基线，GI 不开 generator 单 | WK-130 |
| WK-133：Lucide 设计指南升为 icon grammar 验收规则（24 grid、2px 描边、round cap / join、1px 安全边、光学密度对照）；WK-110：agent 自绘 glyph 只在 specimen 内，准入须过规则 | intake-round-3 §4al |
| 仓内可作"素材库"的四处：`brand/sources/`、`brand/references/`、`engineering/design/identity-specimen/`、`engineering/design/scout/`；仓外未找到用户所指的库 | 本批检索 |

## 2. 裁定

| 编号 | 裁定 | 理由 / 来源 |
|---|---|---|
| BR-1 | **品牌图形层是独立线，不是 UI polish，也不属于发布面批次。** 现有母题降为候选历史稿 **E · Record lines**，与四个新方向同台比较，不保留优先权；C + W monogram 不开。发布面（WO-PS-01/02）只用字标文字 "CourtWork"，不把现有 mark 作为独立品牌元素上页；产品截图里出现的现有 icon 是产品事实，不裁剪。品牌锁定后，Pages 与产品在同一单里换。 | 输入 §三层；PS-1 |
| BR-2 | **三层与 Brand Lock 采纳。** 第 1 层 glyph / invariant geometry；第 2 层 material icon；第 3 层 stateful mark。Brand Lock：Invariant = mark geometry · proportions · negative space · stroke logic · corner logic；Semi-stable = type · palette · material · elevation；Contextual = lighting · glass · blur · motion · background · composition。外部参考只能影响 Contextual 与 Semi-stable 的 material / elevation，永不改 Invariant。WK-125 的 canonical static mark = 第 1 层；variation = 第 3 层；GI 线（WK-130 A 字标基线）只从锁定后的第 1 层派生字标，不反过来定义 mark。 | 输入 §Brand Lock；brand-system-skill 的 Anchor Kit 原则 |
| BR-3 | **次序固定：16px 黑白 glyph → App icon（material）→ stateful / motion。** 第 1 层成立标准：16 / 24 / 32 px 各成立；黑底白与白底黑各成立；favicon 16 与 macOS 菜单栏 template（单色、透明底）成立；16px 下最细笔画 ≥ 1.5px 且无半像素糊边；剪影在 16px 与同类工具图标并排仍可辨；无文字、无渐变、无玻璃、无模糊、无层叠超过三层、无法槌 / 天平 / 柱子 / 书本轮廓 / 对话气泡 / 星芒 sparkle。过 WK-133 的光学验收（视觉重心居中、circle / square 密度对照）。第 1 层未选定前，不做第 2、3 层。 | 输入 §顺序；WK-133 (c) |
| BR-4 | **四个几何命题各出一套，不出"最终图"。** A Folio（两至三层错开的 record plane）、B Governed Frame（开放结构闭合为受约束框架）、C Trace Mark（主体 + 一条不被吃掉的侧边 trace）、D Annotation Mark（主体 + 极少量校勘符号），另加 E Record lines（现有）。每方向一张同尺寸同内容的板：16 / 24 / 32 / 64 四档 × 黑白两极 × 一行 16px 与 Lucide 邻居并排的语境条。每方向两到三个变体，变体只改一个变量。用户最想试的 Folio × Trace 作为 A 与 C 之间的第六格 **F**，同规格。选向归用户四轴（成熟、安静、身份、耐久）；Fable 给推荐。 | 输入 §四个方向、§Folio × Trace |
| BR-5 | **第 3 层的状态只投影已有语义。** 候选词 idle / ingest / govern / review / approved / provenance 是示意；实际状态集 = brand CONTRACT 三轴（presence / authority / activity）与 [ui-state-vocabulary](../../engineering/mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) 已映射的产品状态，不为动画发明产品没有的状态；全部状态预制、确定、可逆，且必须能回到 base（video-states-website 的 base → controlled → return）；scene state 与 playback state 分离沿用。第 3 层在第 1 层锁定、第 2 层验收后才派。 | 输入 §第 3 层；WK-124 (d) "state glyphs only project ui-state-vocabulary states" |
| BR-6 | **角色与写权。** Sonnet EX-BR1：只读解构两个参考 repo 与现有品牌包不变量，写 `02-reference-deconstruction.md`。Opus（fresh，`opus-wo-medium`）WO-BR-01：第 1 阶段出 03 板并停在"待用户选向"；第 2 阶段（选向后）App icon 材质研究与 `brand/geometry/mark.svg` 替换、`brand/scripts/build.mjs` 重生成、品牌验收测试；第 3 阶段产品面注入 = 品牌包重生成后产品经既有 allowlist 模块路径自然更新，任何 `app/web` 改动作为 FE 队列的第 0 项，不在本单写。写权：`brand/exploration-2026-09-09/**`；第 2 阶段起 `brand/geometry/**`、`brand/exports/**`、`brand/src/geometry.generated.mjs`、`brand/tests/**`。不得改 `brand/src/court-symbol.mjs` / `symbol.mjs` 的 ABI、`brand/CONTRACT.md` 的状态轴、`app/**`。素材库按 §1 第 7 行的四处；用户另指路径时补入。 | 用户 2026-09-09；handoff-convention §1 |

## 3. 目录

```text
brand/exploration-2026-09-09/
├── 00-brief.md                       本页
├── 01-semantic-field.md              Fable：mark 必须说什么、不得说什么
├── 02-reference-deconstruction.md    Sonnet EX-BR1
├── 03-glyph-directions/              Opus：A–F 板 + E 现有，index.html + 每向 SVG
├── 04-small-size-test/               Opus：16 / 24 / 32 渲染量测、favicon、菜单栏 template
├── 05-material-studies/              选向后
├── 06-motion-states/                 第 2 层验收后
├── 07-brand-lock.md                  锁定记录
└── 08-release-assets/                进入 brand/ 正式包
```

## 4. 未决（留用户）

| 编号 | 问题 | Fable 建议 |
|---|---|---|
| BU-1 | "本地已收入的 brand Design 素材库"指哪里 | 暂按 §1 第 7 行四处；不阻塞第 1 阶段 |
| BU-2 | 选向（03 板出后） | 待板 |
