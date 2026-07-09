# 调研报告：md → docx 文书起草管线与中文字体控制（S4）

调研日期：2026-07-09
范围：面向 S4（文书起草：agent 生成 markdown → 转正式 docx）的技术路线选型，为"是否复用/扩展 W4 已落地的纯 TypeScript 直接著录管线，还是另起一套 md 渲染技术栈"提供依据。W4（`packages/output`）现状见 `packages/output/SPEC.md`：纯 TS 直接著录 + 手写 OOXML（`fflate` + `@xmldom/xmldom`），字体规则（正文仿宋、标题黑体、西文数字 Times New Roman、不用微软雅黑、每 run 显式 `w:rFonts`）已拍板并测试验证。本报告的候选方案、license、维护状态均尽量核实官方仓库（见文末来源清单）；无法核实的信息已标注"待核实"。

---

## 0. 结论先行

- **首选**：不引入新技术栈，S4 复用/扩展 dolanmiu/**docx**（npm，MIT）作为"结构化文书 artifact → document.xml"的构造工具，与 W4 共享同一份字体规则模块（`fonts.ts` 的 `buildRPr` 逻辑、fontRole 判定）。
- **备选**：pandoc + 定制 `reference.docx` 模板，仅作为团队短期赶工的过渡方案，且需接受额外的 WPS 兼容性回归成本与 GPL 二进制分发代价。
- **不建议**：remark-docx/mdast2docx 生态（生态尚薄、法律排版能力要自建插件，且底层同样是包了一层 docx.js，不如直接用 docx.js）；html-to-docx 中转（CJK 字体经 HTML 层容易丢失 eastAsia 语义，历史上有明确的中文乱码 issue）；python-docx（需要把 Python 引入当前纯 TS 的 output 管线，架构上多一条语言边界，且 numbering API 比 docx npm 更原始）。

---

## 1. 候选方案逐个评估

### 1.1 pandoc + reference.docx 模板

- **License**：GPL-2.0-or-later（Haskell 编译产物，含内嵌 Lua 解释器 hslua）。以命令行子进程方式调用（管道/临时文件/独立进程）通常不触发对调用方代码的 GPL 传染，但**分发上等价于把一个数百 MB 的独立二进制塞进 Tauri 安装包**——这正是 W4 spike 报告里明确拒绝 docx4j/JVM 子进程路线的同一类论据（"安装包塞入运行时，对 ToB 桌面产品是长期运维税"），pandoc 二进制体积和这个论据完全同构。
- **维护状态**：jgm/pandoc 是成熟活跃项目，issue/PR 响应正常。
- **样式映射机制**：`--reference-doc` 只借用参考 docx 的样式表/页面设置/页眉页脚，正文内容被忽略。中文相关的字体、编号、GB 式版式定制**必须手工在 Word GUI 里改这个参考模板的样式表**（标题 1/正文/多级列表样式），无法用代码声明式表达——`Achuan-2/pandoc_docx_template`（939 star，专门解决中文排版痛点的社区模板）的 README 直接印证了这个模式："要修改模板，需要更改每个类型所对应的 Word 样式，而不是自己改改当前段落的样式就能生效"，且该项目**自己在 README 里明确声明"本模板仅在 Windows 端的 Office Word 进行测试，可能不适用于 WPS 和苹果端的 Office"**——这是对"WPS 渲染是硬验收"这条红线的直接反证。
- **已知中文坑**：
  - pandoc 默认不给东亚文字打语言标签，导致引号等标点不能正确变为全角、`w:eastAsia` 常缺失（jgm/pandoc issue #9817）。
  - `-V mainfont` 等变量对西文字体生效不稳定，不少场景下只能通过手工改 `styles.xml` 才能让字体覆盖生效（jgm/pandoc issue #7022；中文社区大量博客记录"pandoc 中文乱码"需要 `-V mainfont=SimSun` + `--reference-doc` 组合才能勉强绕过）。
  - 条款自动编号需要 Lua filter（`pandoc/lua-filters`）配合参考模板里手工定义好的多级列表 `numbering.xml`，工程上是"模板 GUI 配置 + 脚本填内容"的混合体，难以做纯代码 review 和 golden file 快照测试。
- **结论**：功能上可行，但（a）GPL 二进制分发与 W4 已拒绝的子进程路线同构，（b）中文/WPS 兼容性定制发生在不可版本化 diff 的 Word 模板二进制里，与团队"精确控制吐出的每一段 XML"的加固哲学正相反。

### 1.2 docx（npm，dolanmiu/docx）—— 纯 TS 程序化生成

- **License**：MIT。
- **维护状态**：5.7k star、47 watcher、599 fork，最新 release 9.6.1（2026-03），4000+ commits，活跃维护，被多家商业产品使用（README "Used by" 列表）。
- **中文字体控制能力**：`TextRun`/`Style` 的 `font` 属性支持对象形式 `{ ascii, eastAsia, hAnsi, cs, hint }`，**逐 run 显式声明 `w:rFonts` 全部四属性**，与 W4 SPEC 拍板的字体规则（"每个 run 显式声明完整 `w:rFonts`"）的实现形态完全一致（dolanmiu/docx issue #549 确认了 eastAsia 独立生效的用法）。
- **法律排版能力**：`Numbering` 类支持多级列表抽象定义，`NumberFormat` 覆盖完整 ECMA-376 `ST_NumberFormat` 枚举，**包含 `chineseCounting`/`chineseCountingThousand`/`chineseLegalSimplified`/`ideographDigital`** 等中文数字编号格式——`chineseLegalSimplified` 这个枚举值本身就是为法律文书"第一条/第二条"式编号设计的，是目前调研到的候选方案里唯一原生匹配这个法律垂类需求的一处细节。页边距、行距、标题/正文样式均可用 `Style`/`ParagraphProperties` 声明式表达，可测试可 diff。
- **与 W4 手写 OOXML 路线的亲缘性**：docx 库仍是"生成方决定怎么序列化"的建造者模式，不是手写 XML，但它把 `w:rFonts` 等控制权完整暴露给调用方，比 pandoc 的"样式表隐式继承"模式在字体这件事上更贴近 W4 的直接著录哲学；真遇到 docx 库表达不了的深坑（历史上 W4 给 docx4j 也留了类似的 Plan B 记录方式），可以对症下药地在其输出上做局部手写 XML 补丁，不需要推倒重来。
- **结论**：license、维护、字体控制粒度、法律编号格式支持四项都优于其余候选，且分发上是纯 npm 依赖，不给 Tauri 安装包增加运行时负担。

### 1.3 remark-docx / mdast2docx（remark/unified 生态的 mdast→docx 转换器）

- 现状盘点（2025-2026）：
  - `inokawa/remark-docx`：104 star、23 fork，底层调用的正是 dolanmiu/docx 来编译，规模小、维护节奏慢。
  - `mdast2docx`（`md2docx` 组织，`@m2d/*` 插件家族，如 `@m2d/table`/`@m2d/html`/`@m2d/image`）：插件化架构更现代，最近仍在更新，同样是包了一层 docx.js（"leverages the full power of docx.js to style your document"）。
  - `@mohtasham/md-to-docx`：npm 下载量较高、更新频繁（2.18.0，17 天前发布），支持数学公式渲染等，但未见其文档层面对 `eastAsia`/中文专项处理的明确说明。
- **评价**：这一层生态的价值在于"markdown 语法解析 + 常见结构（表格/图片/公式）到 docx 元素的映射"，但字体控制能力**天花板等于它们包的底层 docx.js**——换句话说，直接用 docx.js 本身，控制力只多不少，且省掉一层生态成熟度不足、法律排版能力（GB 式版式、条款编号）需要额外插件补的中间层。生态本身也没有针对中文法律文书场景的现成模板或案例。
- **结论**：不建议作为独立技术栈引入；如果团队认为"markdown 语法解析"这一层有复用价值，可以参考其 mdast 遍历思路，但落地渲染仍应直接调用 docx.js。

### 1.4 python-docx + markdown 解析（TS 生态不足时的备选）

- **License**：MIT。生态成熟度高，中文社区经验丰富（大量 CSDN/博客记录 `rPr.rFonts.set(qn('w:eastAsia'), '宋体')` 的用法模式）。
- **问题**：（a）需要先设置 `font.name`（西文）再手动用 `qn('w:eastAsia')` 補中文，API 比 docx npm 的对象式 `font` 参数更底层、更容易漏设；（b）多级编号/`numbering.xml` 在 python-docx 里没有原生高层 API，需要直接操作底层 XML 元素，体验不如 docx npm 的 `Numbering` 类；（c）架构代价最大——把 Python 引入当前纯 TS 的 `packages/output`，等于在"产出管线"这一层新开一条语言边界，与仓库现有的"ingest 才是唯一的 Python 服务，且 OCR 生态原因不可替代"的既定基线相悖，S4 没有类似 OCR 生态原因的不可替代性，不构成开语言边界的正当理由。
- **结论**：不推荐，除非未来发现 TS 生态在某个具体能力上（目前未发现）确实做不到。

### 1.5 html-to-docx 中转路线

- **维护状态**：原始 `html-to-docx`（privateOmega）12 个月内无新版本，视为不活跃；`@turbodocx/html-to-docx` fork 活跃维护。
- **中文坑**：HTML 中转天然只有 CSS `font-family`概念，没有 OOXML 的 ascii/eastAsia 区分，历史上 `html-docx-js` 项目就有明确的"chinese font in the docx is garbled"issue（#11），本质原因和第 2 节的根因一致——中间层丢失了东亚字体维度。
- **结论**：不推荐，中转层天然与"中西文分别控制字体"的需求相冲突，除非 agent 产出物本来就是 HTML 且已控制在单一语言标签内（本产品不是这个场景）。

---

## 2. 中文字体错乱的根因与解法盘点

### 2.1 一句话根因

**OOXML 把西文（ascii/hAnsi）和东亚文字（eastAsia）视为同一个 run 里两个独立的字体维度，几乎所有"渲染出错"的案例，本质都是转换链路上某一环只设置/保留了 ascii 维度、没有显式设置 eastAsia 维度，于是 Word/WPS 按主题字体（`minorEastAsia`，通常是等线/微软雅黑）兜底渲染中文，而不是作者预期的宋体/仿宋/黑体。**

### 2.2 `w:rFonts` 四属性语义

- `ascii`：字符值 0–127（英文字母数字标点）。
- `hAnsi`（High ANSI）：不属于上述分组的其他 Unicode 子范围西文字符。
- `eastAsia`：中日韩文字专属维度。
- `cs`（Complex Script）：阿拉伯语/希伯来语/泰语等复杂书写系统。
一个 run 可以同时声明四个字体名，Word/WPS 按字符所属 Unicode 范围分别取用对应字体渲染——这就是"中西文混排、数字用 Times New Roman、中文用宋体"在 OOXML 层面天然支持的机制，前提是**转换链路显式写出 eastAsia**。

### 2.3 主题字体（`minorEastAsia`）陷阱

Word/WPS 的默认模板主题（theme1.xml）里定义了 `minorEastAsia`（通常是等线/微软雅黑）作为"未显式指定东亚字体时"的兜底。多个中文社区案例（Microsoft Q&A）描述的现象是：样式面板里明明设置了字体，但切换中文输入法或粘贴中文后，实际显示的却是主题默认的东亚字体——因为样式/run 没有显式覆盖 `eastAsia`，Word 判定这是"东亚文字"后直接走主题兜底逻辑，而不是使用者以为的"该样式的字体"。这与 pandoc 链路里 `-V mainfont` 只影响西文却对中文不生效的现象是同一个根因的两种表现。

### 2.4 样式继承 vs run 级覆盖

- 样式表（`styles.xml`）里的 `rFonts` 是"默认值"，会被 run 级 `rPr` 显式覆盖；反过来说，**只在样式层声明字体、不在 run 层强制覆盖，遇到用户手改文档、agent 生成的 run 缺少显式 `rPr`、或转换链路某处丢弃了格式节点时，都会"回落"到样式/主题默认，产生字体错乱**。
- W4 SPEC 已经把这条落地为工程纪律："管线写出的每个 run 显式声明完整 `w:rFonts`"——不依赖样式继承，这正是本报告 2.1 根因分析的直接解法，S4 应当原样复用而不是重新发明。

### 2.5 中西文混排在各方案里的实现方式

| 方案 | 实现方式 | 显式程度 |
|---|---|---|
| pandoc | 参考模板 styles.xml 里对每个样式手工声明 ascii/eastAsia，运行时无法逐 run 覆盖，纯文本内容混排时依赖 Word/WPS 的语言自动判定 | 隐式、GUI 配置 |
| docx (npm) | `TextRun({ font: { ascii, eastAsia, hAnsi, cs } })`，逐 run 代码声明 | 显式、代码可测试 |
| remark-docx/mdast2docx | 同 docx.js 能力，但生态本身未把这层显式暴露为"markdown 语法到 rFonts"的默认映射，需要自己在插件里补 | 视配置而定 |
| python-docx | `_element.rPr.rFonts.set(qn('w:eastAsia'), ...)`，逐 run 手动，无对象化 API | 显式但繁琐 |
| html-to-docx | 依赖 CSS font-family，无 ascii/eastAsia 区分，历史上有乱码 issue | 隐式、易丢失 |

### 2.6 WPS 与 Word 渲染差异已知案例

- 字体缺失替换：Office 端使用的字体（如 Times New Roman/Calibri）若 WPS 端字体库没有，会被替换为微软雅黑或仿宋等默认字体，引发换行/溢出（中文技术社区案例）。
- 复杂模板/特殊域代码/宏/公式在不同 Office 实现间渲染差异更明显；简单文本+表格兼容性相对较好。
- `Achuan-2/pandoc_docx_template`（GitHub 939 star，专门做中文 pandoc 模板美化的社区项目）**明确声明在 WPS 和 Mac 版 Word 上可能存在兼容性问题，建议用 Windows 版 Office 打开**——这是目前调研到的、对"pandoc reference-doc 路线 WPS 风险"最直接的第三方证据。
- 应对建议：字体内嵌（"将字体嵌入文件"选项）可以缓解字体缺失问题，但增加文件体积，且不解决 rFonts 语义层面的错乱；根本解法仍是 2.1–2.4 的"每 run 显式声明"。

---

## 3. 法律文书排版特殊需求可行性（GB/T 9704 式版式）

GB/T 9704-2012《党政机关公文格式》的典型规则：密级/紧急程度/一级标题用三号黑体，签发人姓名/二级标题用三号楷体，标题用二号（字体一般为小标宋），页码四号宋体，其余正文三号仿宋。虽然 Courtwork 面向的是合同/文书起草而非严格公文格式，但同一类版式约束（标题黑体、正文仿宋/宋体、固定行距、页边距、落款与日期缩进对齐、条款自动编号）具有可比性，逐项核对候选方案的可行性：

| 需求 | pandoc + reference.docx | docx (npm) |
|---|---|---|
| 标题黑体/正文仿宋 | 可行，但需手工改参考模板 styles.xml | 可行，`Style`/`TextRun` 代码声明，可单测覆盖（W4 已验证同类实现） |
| 固定行距/页边距 | 可行，参考模板的 `sectPr`/`pPr` 设置 | 可行，`ParagraphProperties`/`Document.sections` 声明式设置 |
| 落款与日期缩进对齐 | 可行但依赖手工调段落缩进/tab 停止点 | 可行，`indent`/`tabStops` 代码控制 |
| 条款自动编号（"第一条"） | 需要 Lua filter + 参考模板里手工定义的多级列表，工程上是 GUI 配置为主 | **原生支持**，`NumberFormat.CHINESE_LEGAL_SIMPLIFIED`/`CHINESE_COUNTING` 等 ECMA-376 中文编号格式，且可与 W4 已有的定位/角色判定逻辑共用同一套 fontRole 常量 |

结论：两条路线在"能不能做到"层面都可行，但 docx npm 路线是**声明式代码 + 可测试 + 有原生中文法律编号格式**，pandoc 路线是**模板 GUI 配置 + 难以版本化 review**。

---

## 4. 架构建议

### 4.1 首选：一套自研（扩展 W4 的直接著录能力），不是两套技术栈

建议 S4 不走"pandoc/现成 md 转换生态 + 强制模板"的独立技术栈，而是：

1. Agent 产出的不是自由格式 markdown 纯文本，而是（建议 core/schemas 层后续评估的 TODO）一个轻量结构化"文书草稿 artifact"——至少能区分标题层级、正文段落、落款/日期区块、条款列表这几种角色，而不是让渲染层去猜一段 markdown 文本里哪个是落款。这样才能复用 W4 已经验证过的 fontRole 判定逻辑（当前 W4 用"是否加粗"简化判定标题/正文，S4 生成新文书没有"已有加粗"这个信号可用，需要更明确的角色标记）。
2. 用 **dolanmiu/docx（npm，MIT）** 把该 artifact 程序化渲染成 `document.xml`/`numbering.xml`，复用 W4 `fonts.ts` 里的字体规则常量（正文仿宋、标题黑体、西文数字 Times New Roman）与测试哲学（golden file 快照），而不是手写 zip/XML——docx npm 本身已经把 `w:rFonts` 全量四属性和中文法律编号格式（`chineseLegalSimplified` 等）暴露为可测试的声明式 API，比手写 OOXML 省工程量，又比 pandoc/remark 生态更贴近 W4 的直接著录哲学。
3. 真遇到 docx npm 表达不了的深坑，参照 W4 对 docx4j 的处理方式——记录为可逆的局部 XML 补丁点，不需要推倒整条管线。

**理由**：字体规则是团队刚刚踩坑拍板、并写进 SPEC 硬性验收的加固点（"每个 run 显式声明完整 `w:rFonts`"）。如果 S4 另起 pandoc 技术栈，等于把"WPS 兼容"这个坑在两套完全不同的样式机制里各踩一次——而 pandoc 路线的 WPS 风险已经有第三方证据（Achuan-2 模板自己声明"可能不适用于 WPS"）。此外 pandoc 是 GPL 二进制、体积可观，塞进 Tauri 安装包与 W4 spike 报告已经拒绝的"JVM 子进程运维税"是同一类论据，选它等于绕开团队刚做出的架构判断。

### 4.2 备选：pandoc + reference.docx

仅在"团队短期没有精力扩展 docx npm 渲染层、需要最快跑通一个能用的 S4 draft 管线做验证"时作为过渡方案。若选择这条路：
- 用 `Achuan-2/pandoc_docx_template` 类似的手工模板起步，但必须补一轮专项 WPS 渲染回归测试（该项目自己都没有做这一层验证）。
- Lua filter 处理条款编号，模板改动纳入仓库版本控制（存 `.docx` 二进制到 git，diff 能力弱，是长期维护代价）。
- 明确这是**过渡方案**，不作为长期架构。

### 4.3 迁移成本评估（若先上过渡方案、后续切回 docx npm）

- 可迁移：GB 式版式规则本身（标题黑体三号、正文仿宋三号、行距等）是业务常量，从"Word GUI 里调出来的样式"翻译成"docx npm 代码声明"是确定性工作量，不是推倒重来。
- 有损耗：过渡期内针对 pandoc 参考模板跑的 WPS 渲染回归测试，切换后需要在新管线上重新跑一遍（两套渲染机制的兼容性问题不共享）；Lua filter 里实现的条款编号逻辑需要重写为 docx npm 的 `Numbering` 声明，不能直接复用。
- 净判断：过渡成本不算高，但既然 docx npm 路线在功能覆盖度（含中文法律编号格式）、可测试性、分发代价三方面都更优且没有明显短板，**没有必须先上过渡方案的理由**，建议直接一步到位。

---

## 来源清单

- [Feature Request: Support for East Asian Language Tags in DOCX Output · Issue #9817 · jgm/pandoc](https://github.com/jgm/pandoc/issues/9817)
- [Western fonts cannot be changed in the output docx · Issue #7022 · jgm/pandoc](https://github.com/jgm/pandoc/issues/7022)
- [Pandoc - FAQs](https://pandoc.org/faqs.html)
- [pandoc/COPYRIGHT](https://github.com/jgm/pandoc/blob/main/COPYRIGHT)
- [Pandoc GPL « Blog « - extrema.is](https://www.extrema.is/blog/2021/07/16/pandoc-gpl)
- [Pandoc licensing discussion - Hacker News](https://news.ycombinator.com/item?id=24884944)
- [GitHub - Achuan-2/pandoc_docx_template](https://github.com/Achuan-2/pandoc_docx_template)
- [GitHub - dolanmiu/docx](https://github.com/dolanmiu/docx)（MIT，5.7k star，release 9.6.1 / 2026-03，实测确认）
- [docx 9.7.1 on npm - Libraries.io](https://libraries.io/npm/docx)
- [Font for eastAsia · Issue #549 · dolanmiu/docx](https://github.com/dolanmiu/docx/issues/549)
- [NumberFormat | docx](https://docx.js.org/api/variables/NumberFormat.html)
- [Bullets and numbering - dolanmiu/docx Wiki](https://github.com/dolanmiu/docx/wiki/Numbering)
- [ST_NumberFormat (Numbering Format) - c-rex OOXML 文档](https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_ST_NumberFormat_topic_ID0EDNB3.html)
- [rFonts (Run Fonts) - c-rex OOXML 文档](https://c-rex.net/samples/ooxml/e1/Part4/OOXML_P4_DOCX_rFonts_topic_ID0E25RO.html)
- [GitHub - inokawa/remark-docx](https://github.com/inokawa/remark-docx)
- [mdast2docx - npm](https://www.npmjs.com/package/mdast2docx)
- [GitHub - md2docx/mdast2docx](https://github.com/md2docx/mdast2docx)
- [@mohtasham/md-to-docx - npm](https://www.npmjs.com/package/@mohtasham/md-to-docx)
- [GitHub - TurboDocx/html-to-docx](https://github.com/TurboDocx/html-to-docx)
- [chinese font in the docx is garbled · Issue #11 · evidenceprime/html-docx-js](https://github.com/evidenceprime/html-docx-js/issues/11)
- [Font — python-docx 1.2.0 documentation](https://python-docx.readthedocs.io/en/latest/dev/analysis/features/text/font.html)
- [python docx设置标题中文字体... - CSDN 博客](https://blog.csdn.net/qq_40272386/article/details/114867630)
- [为什么在word文档的修改样式中设置的是微软雅黑字体... - Microsoft Q&A](https://learn.microsoft.com/zh-cn/answers/questions/5521910/word)
- [为什么你的 Word 文档在 WPS 和 Office 中"长得不一样" - CSDN 博客](https://blog.csdn.net/iceveil/article/details/148147729)
- [《党政机关公文格式》国家标准（GB/T 9704-2012） - 中南大学深圳研究院](https://szyjy.csu.edu.cn/info/1068/2591.htm)
- [党政机关公文字体有哪些？ - 知乎](https://zhuanlan.zhihu.com/p/514794111)
- [Pandoc Markdown to DOCX 多级编号讨论 · jgm/pandoc Discussion #11658](https://github.com/jgm/pandoc/discussions/11658)
- `packages/output/SPEC.md`（仓库内部，W4 现状与字体规则拍板记录）

（本报告只写入本文件，未做 git 操作，未修改仓库其他文件。）
