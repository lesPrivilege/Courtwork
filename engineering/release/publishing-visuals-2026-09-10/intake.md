# Publishing visuals · intake

2026-09-10 · Fable · 基线 main `9c8b64e` · 分支 `claude/fable-publishing-visuals`

目的：为 Courtwork Pages 的影像层做筹备——语义源、视觉语法、渲染器分工、QA 与首批工作单。**本批不写 `site/` 代码，不派发 agent。**

输入：[影像 Skill 参考索引](inputs/visual-reference-index-2026-09-10.md)（含追加的 Cue）。用户裁定：色、纸等材质取本地裁定；该索引仅供参考、按需消费。

## 事实

| # | 事实 | 出处 |
|---|---|---|
| F1 | Pages 已由 Astra 认领为独立发布作品，campaign 名 **Archival Instrument**；campaign 参数集中在 `site/src/site.css` 末段（`/* Campaign 01 */`，:574 起）。 | `evidence/pages-polish-20260910/README.md` §裁定与实现 |
| F2 | 用户已撤回暖纸方向：底纸冷白灰、承托浅蓝灰、纸张白色 raised，墨色、边线与阴影去绿相；“色彩不再承担复古材料叙事”。 | 同上 §底纸取色修订 |
| F3 | Attention 红的现行授权只有一处：Review 固定录制候选旁 5px 点加文字，`--campaign-attention-review` 独立色槽，静态、无脉冲；其余中性。 | 同上 §Attention克制注入 |
| F4 | 现有图：FIG. 00 hero 纸层（Source → Candidate → Matter，标注 Concept study）；01 Anatomy 三投影仪器（Event log / Surface / Context）；`site/src/assets/diagram.svg`（Governed work state → Context projection → Model / human proposal → Candidate →〔validation · evidence · authority · review〕→ Committed change → Updated state）；pricing 三张 SVG；closing shot（纯字）；品牌字标复用 `brand/geometry/mark.svg` 四枚矩形。 | `site/src/page.mjs:117`, `:238`, `:413`, `:417`; `site/src/pricing.mjs` |
| F5 | `#long-work` 已写入 Spark、Attention、Expert/runtime 的研究方向，并有 caption：“Spark 自动维护、通用恢复与自动唤醒尚未交付；长期质量和成本收益仍待验证。” | `site/src/page.mjs:263-279` |
| F6 | 页面无外部资源请求；站点原生静态、零依赖（PS-8）。截图一律经 capture 管线绑定产品 SHA、尺寸与哈希，“No image was reconstructed or relabelled”。 | `site/README.md`; `evidence/pages-main-visual-20260910/README.md` |
| F7 | SE canonical 9.6 的术语是 Committed Event Ledger / Current Semantic State / Context Projection，以及 §5.4 `Store → Govern → Retrieve → Compile`。索引中的 “Event Log / Matter State / Compiled Context” 不是 canonical 用词；“Compiled” 在 canonical 中专指 **Compiled Work Expert**（版本化、E2E 验证、权限收敛的激活配置，“不是人格化 Agent”）。 | SE `papers/src/canonical.md:25`, `:29`, `:366`, `:427-445` |
| F8 | “Attention” 有两义：SE canonical 指一次 Run 的注意力 / Context 预算（`:27`, `:528`）；CW 产品指需要人介入或值得人看的事项（ATT-BE-01，`docs/work-core/attention.md`）。 | 同左 |
| F9 | Spark 在 CW 是来源整理 / 派生 / 维护工作的名称，不设第二份 canonical memory 真源；自治 Spark 未交付。 | `engineering/research/multi-experts-2026-09-10/README.md:27`; F5 |
| F10 | 已有外部参考的消费规则：只取机制、说明解决什么问题、无装饰版本能否同样完成、如何退化；不建立第二份权威 DESIGN.md。 | `engineering/design/reference-consumption.md` |

## 裁定

**VG-1 薄层成立。** 语义 → brief → grammar → renderer → QA。每张图必须引用 [semantic registry](visual-semantic-registry.md) 中的概念 id；registry 之外没有影像语义。renderer 可替换，语义源不随之变化。

**VG-2 不引进 “Anthropic style”，名称与色板都不引进（F2 + 用户本轮裁定）。** 从 anthropic-style-diagram 只取四项机制：① 调用方负责 geometry + meaning，renderer 负责 theme / colour / export；② 颜色编码类别，不编码序列，同类节点同一色阶；③ 结构中有分支、汇合或回路时不画成等宽网格或单向五步；④ overflow / overlap / 连线穿越无关节点的 QA。色阶取 Campaign 01 token。

**VG-3 视觉语法挂在 Archival Instrument 之下，不另立 campaign。** 索引提出的六种 grammar 收为三种：
- `plate`：结构图，语义 SVG，承担系统关系（今日的 diagram.svg、pricing 图属此类）；
- `object`：概念物件，纸层 / 剖面 / 轴测，承担一个工作对象的直觉（今日的 FIG. 00 属此类；paper-architecture、process-cutaway 的方法并入这里）；
- `ambient`：程序化氛围，只用于研究方向区块，不承担事实。

cyanotype、chrome-currents、precision-circuit 不进首批：它们引入 F2 已退役的颜色 / 材料叙事。可取的只有 cyanotype 的“接触痕迹”这一隐喻，用线型表达，不用蓝色。若想让它们作为 board 候选参评，见 U-VG3。

**VG-4 语义用 canonical 词。** 图中文字沿页面现行标签（Event / State / Context、Event log / Surface / Context），定义回指 canonical；不用 “Compiled Context”、“Matter State” 这类混合词。

**VG-5 声称状态是 registry 的必填字段**：`shipped`（当前产品具备）/ `recorded`（固定录制可证）/ `research`（研究方向）/ `concept`（概念演绎）。`research` 概念的图只能出现在 `#long-work` 或 Paper 入口，并沿用 F5 的 caption；不以现在时描绘自治 Spark、自动唤醒、第二 runtime 或生产级多 Expert。

**VG-6（已被 VG-15 取代）Attention 图默认不用红。** 用位置、孤立与字重表达“被提升到人的视野”；图中任何红色都需要 U-VG1 的新授权。图中的 Attention 取 CW 产品义（F8）；SE 的注意力预算义归入 `pipeline` 概念。

**VG-7 先盘点、升级已有的图，不另起。** 索引母题 1（Matter as workspace）与 FIG. 00 重叠，母题 5（Evidence → Candidate → Decision）与 diagram.svg 重叠：这两项只做对照 registry 的审计与必要修订。母题 2（Store → Govern → Retrieve → Compile）目前没有图，是**唯一的首张新图**；Govern 为视觉重心，Retrieve 与 Compile 之间保留“可读 ≠ 已生效”（canonical `:445`）。母题 3、4 属于 `research`，放第二批，只进 `#long-work`。

**VG-8 renderer 分工。**
| 资产 | renderer | 约束 |
|---|---|---|
| 有结构的图 | 手写或构建时脚本生成的 SVG | `<title>` + `<desc>`；currentColor / campaign token；双主题 |
| ambient | 原生 canvas / SVG + 固定 seed | 不引入 p5 等运行时依赖（F6）；reduced-motion 下为静态帧；无 JS 可读 |
| 概念插画 | 图像模型 | 仅 `concept` 类；不承担结构；不得形似产品 UI；manifest 记录模型、brief 与哈希 |
| 产品画面 | 现有 capture 管线 | 沿 F6，影像层不另开截图来源 |

p5.js 等 skill 只作方法参考，不作依赖。

**VG-9 外部 skill 只作方法消费**（F10）：读取、拆解并提取契约，登记许可；不 vendor 进仓库，不安装为运行时。由 EX-VG1 执行。

**VG-10 影像 QA 契约**：文字溢出、节点重叠、连线穿越无关节点、双主题对比度、390 宽重排、reduced-motion、无 JS、title/desc 齐备，非 `shipped` 概念必须有状态 caption，且不得出现外部请求。实现为 `site/scripts/` 下的检查，并注册进现有构建检查；由 WO-VG-01 施工。

**VG-11 位置。** 索引的 `site/visuals/{semantics,briefs,accepted,generated,manifests}` 收窄为：语义归 registry，brief 归本批，接受的图放 `site/src/assets/figures/`，一份 `figures.json` manifest；生成的中间产物不入库。registry 与 grammar 经用户接受后迁入 `engineering/design/`，本批目录只保留草案与回执。

**VG-12 单一写者。** `site/` campaign 归 Astra（F1）。本批不改 `site/`；图的施工只在 U-VG2 定下写者之后派发，同一时刻只有一个 site 写者。

**VG-13 Cue 按条目消费。** 只在某个具体工作项需要交互或动效参考时，于免费层浏览对应条目，登记条目来源（原站点、页面类型），按 F10 只取机制。不连接其 MCP，不付费，不把生成的 prompt 或 React 源码直接用作施工输入。条目本身是第三方站点的再策展，采用前须回溯原站核实。

## 用户裁定（2026-09-10）

用户原话：“Opus 直接做，红色需要克制和按需使用，作为 dystopia 风格的注入。全部完成后我来合流。”

**VG-14 施工与合流（U-VG2）。** Opus 直接施工 WO-VG-01 全部工作项，施工期间是唯一的 `site/` 写者；Fable 做语义复核；用户合流。EX-VG1 不再单独派给 Sonnet，并入 WO-VG-01 第 0 项，由 Opus 按需读取（U-VG4）。U-VG3 未另行答复，按默认处理：不做 cyanotype、process-cutaway 候选 board。

**VG-15 红色 = Dystopia 式注入（U-VG1，取代 VG-6 的“默认不用红”）。** Dystopia 的含义取本地：冷灰 / 石墨中性色阶承担全部层级（`app/web/styles.css:215` 的 preset，Pages Campaign 01 冷白灰与之同向），红色是这层冷灰之上唯一的稀疏信号。规则：
1. 只用现有 `--campaign-attention-review`（浅 `#b3262d`，深 `#ed9396`，`site/src/site.css:700-704`）。不新增红值，不复用 danger，不从 `app/web` 导入 token（`skin-injection-2026-09-10/skin-constitution.md:18`）。
2. 红色只标记“需要人 / 被提升到人的视野”这一处（registry 的 `attention`，以及 `decision` 门处的人）。结构、箭头、类别、装饰、氛围一律不用红。
3. 按需：一张图最多一处红；图中没有需要人的点，就不用红。图之间不为统一而补红。
4. 静态，不脉冲、不闪烁；配文字或形状，去色与 forced-colors 下仍可辨。
5. 每处红色在 `figures.json` 记录所在元素、对应概念与理由，由 `check-figures` 校验上限。
6. Review 区块的 A/B/C 红线提案（`skin-injection-2026-09-10/specimen-proposals.md`）不在本单范围，不改。

## 工作单

- [EX-VG1 外部 skill 拆解](work-orders/EX-VG1-skill-deconstruction.md)：并入 WO-VG-01 第 0 项（VG-14），不单独派发。
- [WO-VG-01 图的全部施工](work-orders/WO-VG-01-figures.md)：已派发给 Opus（`opus-wo-medium`）。

## Fable 复核（WO-VG-01 交付后）

回执中的五个待裁项，以及复核时发现的一处语义错误，裁定如下。改动由 Fable 直接完成，与回执同在分支 `claude/vg01-figures`。

**VG-16 行内图不记哈希。** FIG. 00、Anatomy 仪器与 pricing 属于 campaign 行内标记，manifest 只记录位置（`source.file` + `basis: rendered-fragment`），不记 sha256。campaign 作者修改标记时无须重算哈希。独立 SVG 文件保留 sha256，构建与 `check-figures` 照旧核对。（待裁定 4）

**VG-17 pricing 补 `<desc>` 与 `data-figure`，扩大写入范围到 `site/src/pricing.mjs`。** 三图的 desc 均声明“概念定价示意，不是当前在售方案”；Organization 图另注 Expert runtime 尚未交付。几何检查交给浏览器（`geometry: "browser"`），因为样式来自 `pricing.css`，静态估算会误报。`deferred` 通道删除。（待裁定 1）

**VG-18 Anatomy 用词改为页面自身的一致用语**：标签 “Compiled context” 改为 “Context projection”（`copy.mjs`、`steps.mjs`、public-copy-v3），导航 “Matter state” 改为 “Work state”，与 tab 标签一致。`site/verification/contrast.json` 是历史记录，不改写。（待裁定 2）

**VG-19 其余两项维持现状。** “决定处有人”只约束画出决定门的图；FIG. 00 只在 caption 中提到 Decision，因此不改 Astra 的构图（待裁定 3）。状态 caption 以最近的顶层 section 为界，pricing 的 “CONCEPT PLANS · NOT CURRENTLY OFFERED” 满足要求（待裁定 5）。`diagram.svg` 的门不加红，同意 Opus 的理由。390 宽下 pipeline 在自身容器内横向滚动，与既有 diagram 一致，接受。

**VG-20 pipeline 的一处语义错误。** Retrieve 的输出原标为 “candidate”，与同图回路里的 Candidate（提议）同词异义。已改为 “possibly relevant” 与 “object”（canonical `:25`：Retrieve 返回潜在相关对象）。Compile 的卡片原标 assignment / role / stage，把输入画成了产出，已改为 “context projection · per assignment”。

复核重跑：构建、`check-links`、`check-material`、`check-figures`（10 张图，0 problems）、`verify.mjs` 28/28（8961 / CDP 19971，独立 profile，结束后删除），截图矩阵已刷新。`check-specimen` 需要在 source SHA 的隔离 checkout 中运行，在任何新 main 上都会拒绝；它不在 `pages.yml` 中，不属于本单的回归。
