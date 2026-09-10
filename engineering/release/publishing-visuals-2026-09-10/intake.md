# Publishing visuals · intake

2026-09-10 · Fable · 基线 main `9c8b64e` · 分支 `claude/fable-publishing-visuals`

目的：为 Courtwork Pages 的影像层做筹备——语义源、视觉语法、渲染器分工、QA 与首批工作单。**本批不写 `site/` 代码，不派发 agent。**

输入：[影像 Skill 参考索引](inputs/visual-reference-index-2026-09-10.md)。用户裁定：色、纸等材质取本地裁定；该索引仅供参考、按需消费。

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

**VG-6 Attention 图默认不用红。** 用位置、孤立与字重表达“被提升到人的视野”；图中任何红色都需要 U-VG1 的新授权。图中的 Attention 取 CW 产品义（F8）；SE 的注意力预算义归入 `pipeline` 概念。

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

## 待用户裁定

- **U-VG1** Attention 图可否使用红色？默认不用（VG-6）。
- **U-VG2** 图由谁施工：Opus WO 施工、Astra 复核后合流（沿 PS 惯例），还是由 Astra 在 campaign 内直接施工？
- **U-VG3** 除 `plate` / `object` / `ambient` 外，要不要让 cyanotype、process-cutaway 作为 board 候选参评四轴？默认只做 `object` 内的纸层 / 剖面。
- **U-VG4** 现在派发 EX-VG1（Sonnet，只读拆解外部 skill）吗？它不阻塞 WO-VG-01 的盘点部分。

## 工作单

- [EX-VG1 外部 skill 拆解](work-orders/EX-VG1-skill-deconstruction.md)：已写，**未派发**。
- [WO-VG-01 盘点 + 首张 plate + QA 检查](work-orders/WO-VG-01-figures.md)：骨架，等 U-VG2。
