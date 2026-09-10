# EX-VG1 · 外部影像 skill 拆解

2026-09-10 · Opus（WO-VG-01 第 0 项，intake VG-14）。只读取与 WO-VG-01 第 1–6 项相关的部分：`plate` / `object` 语法、QA 断言、manifest 字段。

读取方式：`gh api repos/<repo>/contents/<path>`（原文读入会话 scratchpad，未入库）；许可与维护日期取 GitHub API 的 `license.spdx_id` 与 `pushed_at`。未安装、未 vendor、未运行任何第三方脚本；下表中的 “可运行实现” 只根据读到的源码或文档判断，不代表运行过。所有外部色值、字体与品牌名称均未进入交付。

## 1 · rookie-ricardo/erduo-skills · `skills/anthropic-style-diagram`

读取：`SKILL.md`、`references/design-system.md`、`references/diagram-types.md`、`scripts/render.mjs`、`package.json`。

1. **许可 / 维护**：MIT（仓库与 package.json 一致）；仓库 `pushed_at` 2026-07-25。
2. **职责边界**：调用方写语义 SVG（几何 + 含义 + class 名），renderer（`render.mjs`，Playwright）负责主题、颜色、viewBox 裁切、样式烘焙与导出。调用方不写色值、不写 `<style>`、不手算最终高度。
3. **构图规则**
   - 可检查：`role="img"` 且 `<title>`、`<desc>` 为根下前两个子元素；无 `<script>`、`<a href>`、滤镜、渐变、注释；文字字号只有两档；每个 `<text>` 带 class；同类节点同一色阶；arrowhead 与节点间距约 10px；同层节点间距 ≥ 20px。
   - 品味描述：避免等宽网格；“找到那一件事”并加重；“不是一切都是堆叠”；留白无拥挤也无死区。
4. **QA**：`render.mjs --check` 在浏览器中计算三类几何问题并以非零退出：① 文字包围盒溢出其所属形状（圆形按椭圆计）；② 节点两两重叠（面积 > 4px²，包含关系除外）；③ 连线在 12%–88% 长度区间的采样点落入无关节点内部（端点所在节点豁免）。语言 JavaScript，依赖 Playwright。另有六条人工复核清单（冷读、逐条追箭头、找回路、读标签、查颜色、扫留白）。
5. **negative constraints 要点**：不硬编码色值；不画等宽网格；有回路的主题画成单向堆叠即为错误；标签 ≤ 5 词；审计通过只是底线而非批准。
6. **对照 VG-2 / VG-3 / VG-8**
   - 取：职责边界（VG-2①）——本单的 SVG 只写几何与语义 class，颜色由 `site.css` Figures 小节解析为 campaign token。
   - 取：颜色编码类别不编码序列（VG-2②）——本单图中只有“中性”一类加一处 VG-15 红，不按步骤换色。
   - 取：回路必须可见（VG-2③）——pipeline plate 的回写线按 canonical :23 画出且经过审阅门。
   - 取：三类几何审计算法（VG-2④ / VG-10）——在 `check-figures.mjs`（静态）与 `verify.mjs`（浏览器）中按其机制独立重写，不复制源码。
   - 不取：九组色阶、暖纸底色与字体（F2、VG-2 明令不引进）。
   - 不取：Playwright 依赖与 PNG 导出（F6 零依赖；页面直接内联 SVG）。
   - 不取：“每个节点都上色”的主张——与 VG-15 冷灰为主、红色唯一稀疏信号相冲突。

## 2 · yizhiyanhua-ai/fireworks-tech-graph

读取：`SKILL.md`、`docs/CAPABILITIES.md`、`references/composition-quality-contract.md`、`references/visual-quality.md`、`references/svg-layout-best-practices.md`。仓库文件树已列出，Python 脚本未读取正文。

1. **许可 / 维护**：MIT；`pushed_at` 2026-09-05。
2. **职责边界**：调用方给 JSON IR（architecture / workflow / sequence 等 schema），generator 负责布局与样式；风格只能改颜色、字体、材质与装饰，不能改拓扑、对齐、端口、走廊与各项预算。
3. **构图规则**
   - 可检查（showcase 档，文中写为强制）：连线交叉 0；单边折点 ≤ 2；路由长度 / 曼哈顿直线 ≤ 1.35；最短段 ≥ 16px；节点间空白 ≥ 40px；节点到容器边 ≥ 20px；边标签与无关几何 ≥ 4px；同一条业务边只有一条 `data-graph-role="edge"`，装饰层须标 `decoration` 与 `data-owner`；同侧多条边使用不同端口，不叠箭头。
   - 品味描述：先定容器与行再走线；图例放在流向走廊之外；超限时拆图而不是缩字。
4. **QA**：`scripts/validate_svg.py --check geometry|composition`，另有 `composition_quality.py`、`style_quality.py`（对比度向 4.5:1 调整）。语言 Python（文档称 PNG 导出另需渲染器）。文档明确写出：命令成功不等于视觉合格，须看最终光栅。
5. **negative constraints 要点**：不为通过检查而削弱语义或构图约束；不隐藏必需文案；视觉效果不得产生第二条业务连线。
6. **对照**
   - 取：“装饰不产生第二条连线”——本单的回写线、虚线空位都是语义元素，装饰元素一律 `aria-hidden` 且不承载连接。
   - 取：连线不穿越无关节点、节点间距下限作为静态断言。
   - 不取：12 种风格、图标库、GIF 动效（VG-3 只留 `plate` / `object` / `ambient`，F2 退役材料叙事）。
   - 不取：Python 校验器（不运行第三方代码；本单用 Node 标准库自写同构检查）。

## 3 · justnardo/design-system-assets

读取：`SKILL.md`、`references/asset_routing.md`、`references/manifest_schema.md`、`references/review_rubric.md`。

1. **许可 / 维护**：MIT；`pushed_at` 2026-04-28。
2. **职责边界**：先解析项目 design system（DESIGN.md → tailwind → `:root` 变量），再按资产类型路由：图标走 SVG 库，装饰 SVG 手写，照片 / 插画 / 纹理走图像模型，图表拒绝交给图像模型。解析不到 token 时停止并询问，不自行发明。
3. **构图规则**：可检查的只有路由表本身（资产类型 → 生产器）与 “图表不得走光栅模型”；其余为品牌契合的描述。
4. **QA**：五维 0–10 评分（颜色、风格、主体、技术质量、品牌契合）由视觉模型打分，strict 档要求均分 ≥ 8 且单项 ≥ 7。实现为 Python + 付费模型 API。manifest schema 已定义，但文档自述 “no script in this repo writes the manifest”（v1.2）。
5. **negative constraints 要点**：图标绝不走光栅模型；图表拒绝；不发明 brand token。
6. **对照**
   - 取：按资产类型路由（与 VG-8 renderer 分工同构，已由 intake 裁定，不再新增）。
   - 取：manifest 字段思路——`id`、`path`、`alt`、`intent`、来源哈希。本单 `figures.json` 按 WO 第 6 项字段实现，另加 `red`。
   - 不取：模型评分作为 QA（不可复现、需外部请求；本单 QA 只收可写成断言的项）。
   - 不取：图像模型生成（WO-VG-01 第 4 项禁止）。

## 4 · hahayang888/zyncli-template（五个 skill）

读取：`skills/{process-cutaway,paper-architecture,spatial-systems,axonometric-commons,cyanotype-evidence}/SKILL.md` 与各自 `references/style-guide.md`。五个 SKILL.md 除名称与描述外逐字相同（已 diff 核对），差异全部在 style guide。示例图（`.webp`）未读取。

1. **许可 / 维护**：MIT；`pushed_at` 2026-08-10。
2. **职责边界**：全部是图像模型的提示词编译器——调用方读文章、选 1–9 个 “认知锚点”、写 shot plan，skill 提供 visual DNA、调色板、must / never 与 prompt scaffold，由宿主的图像生成工具出图。
3. **构图规则**
   - 可检查：画幅 16:9；最小留白（24%–28%）与最大主体覆盖（68%–72%）；标签数上限（paper-architecture ≤ 3，cyanotype ≤ 4，process-cutaway 4–10，axonometric ≤ 6，spatial 2–6）；只用调用方提供的真实标签，不发明数字、日期、文字。
   - 品味描述：visual DNA、材质、光影、“缩略图剪影要强”等。
4. **QA**：每个 guide 五条清单 + 五条失败信号，均为人工判断，无可运行实现。
5. **negative constraints 要点**（逐项）
   - process-cutaway：输入到输出路径可见、单一变换、剖切面一致；不画齿轮、蒸汽朋克、仪表盘叠层、发明的规格。
   - paper-architecture：折叠须可信且有用途、一条可用路径；不画折纸动物、贺卡、剪贴簿、无功能镂空。
   - spatial-systems：一条可追踪路线、人的尺度、两到三个视图；不画导航截图、仪表盘、智慧城市图标。
   - axonometric-commons：活动分区、共享路线；不画通用等轴城市、SaaS 引导图、小人图标。
   - cyanotype-evidence：一条证据关系、缝线承担逻辑；不画蓝图 UI、装饰植物、伪手写、密集标本网格。
6. **对照**
   - 取：“只用真实标签，不发明数字”——本单所有图内文字取自页面现行标签或 canonical 用词（VG-4）。
   - 取：process-cutaway 的 “输入到输出路径可见 + 单一变换 + 注释从属”——作为 pipeline plate 的构图检查（Compile 是唯一的宽度变换）。
   - 取：cyanotype 的 “连线承担逻辑” 隐喻，只用线型（VG-3 已裁定，不取蓝色）——spark 图中来源到派生的细线即取此意。
   - 不取：五个调色板、暖纸画布、光影与 16:9 画幅（F2、VG-3）。
   - 不取：图像模型路线（WO 第 4 项）。
   - 不取：axonometric / spatial 的人物与城市尺度——registry 通用禁忌不画小人。

## 5 · README 级核对

| 来源 | 许可 / 维护 | 是否有 manifest 或 QA 机制 | 结论 |
|---|---|---|---|
| NousResearch/hermes-agent · `skills/creative/p5js`（README + SKILL.md） | MIT；`pushed_at` 2026-09-10 | 无 manifest；QA 为人工清单（分辨率、帧率、双色屏）。有一条可取原则：`randomSeed` + `noiseSeed` 固定，“同一 seed 同一输出”。 | 只取固定 seed 原则（已在 VG-8）；本单未使用 `ambient`，因此未消费。p5 运行时不取。 |
| BenoshAntonyBenoy/repo-graphics（README） | MIT；`pushed_at` 2026-08-16 | 有：`scripts/validate.mjs` 解析每个模板的 `:root` 并对十组文字 / 背景对做双主题 WCAG AA 检查（README 称零依赖）。 | 可取机制：对比度按双主题断言。本仓 `verify.mjs` V7 已有等价浏览器检查，不新增。 |
| Sma1lboy/brand-studio（README） | GitHub API 未报告许可（`license: null`）；`pushed_at` 2026-08-15 | 有：candidate → 人工接受 → `accepted.yaml` 与 approved manifest，scratch 不算视觉记忆。 | 许可不明，不引用其文本；机制与 VG-11（生成中间产物不入库、只收已接受的图）同向，无需新增。 |

## 6 · Cue（VG-13）

本单只用 `plate` 与 `object`，未用 `ambient`，图中无交互与动效，因此未浏览任何 Cue 条目。

## 汇总 · 可写成 VG-10 断言的检查项（去重）

| # | 断言 | 来源 | 本单实现 |
|---|---|---|---|
| A1 | 每个图 SVG 有 `role="img"`，`<title>` 与 `<desc>` 为根下前两个子元素，且被 `aria-labelledby` 引用 | anthropic-style-diagram；VG-10 | `check-figures` 静态 |
| A2 | SVG 内无 `<script>`、`<a>`、`<foreignObject>`、`<image>`、外部 `href` / `url()` | anthropic-style-diagram；F6 | `check-figures` 静态 + `verify` 请求监听 |
| A3 | 文字包围盒不溢出所属形状 / 不溢出 viewBox | anthropic-style-diagram render.mjs | 静态估算（字宽表）+ 浏览器 `getBBox` |
| A4 | 节点两两不重叠（包含关系除外） | 同上 | 静态（rect）+ 浏览器 |
| A5 | 连线在内部采样点不进入无关节点 | 同上 | 静态（line / 折线 path）+ 浏览器 `getPointAtLength` |
| A6 | 一条语义边只有一条连线元素；装饰不承担连接 | fireworks-tech-graph | 静态：连线必须带 `data-edge` 且 id 唯一 |
| A7 | 颜色只来自 `currentColor` / campaign token，SVG 内无字面色值 | anthropic-style-diagram；VG-2、VG-15 | `check-figures` 静态 |
| A8 | 红色只在 manifest 登记的元素上出现，每图 ≤ 1 | VG-15（本地规则） | `check-figures` 静态 + 浏览器计算色 |
| A9 | 非 `shipped` 概念的图在同区块内有状态 caption | VG-5、VG-10（本地规则） | `check-figures` 静态 |
| A10 | 图内文字只用真实标签，不发明数字 | zyncli-template | 人工；回执逐图列出标签来源 |
| A11 | 双主题对比度 AA | repo-graphics validate.mjs；VG-10 | `verify` V7（既有）覆盖图内文字 |
| A12 | 固定 seed，reduced-motion 下为静态帧 | p5js SKILL.md；VG-8 | 本单无 `ambient`，断言改为“图内无动画 / 过渡” |
