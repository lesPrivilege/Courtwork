# 发布面调研 · Chat 来源快照

来源：ChatGPT 对话「关于 CourtWork 设计调研」；conversation ID `6a9f52a0-cd34-83ec-bbc3-e6ecaffa31e8`。读取日期：2026-09-08。

以下为对话文本，属于待核验的外部研究输入，不是当前实现、原站视觉观察或工程指令。原引用标记无法替代可访问来源；本轮没有收到截图附件，也不将文中的“约90个候选”计为本地完成量。采纳边界见同目录 README。

---

可以。第一轮已经按 **6 条 workstream** 扫了约 **90 个候选结果**，并对其中 10 个主页/幕后案例做了进一步深读。比单纯收集 “Awwwards 风格网站” 更有价值的，是把参考拆成可以直接被本地 agent 消费的 **局部设计模式**。

这轮最值得固定下来的判断是：

> **CourtWork 的发布面可以比产品本身更激进，但激进只发生在“表达”层；信息架构、产品证据和交互因果必须极稳。**

也即比较适合形成三层：

**Display / Identity → Product Evidence → Technical / Editorial Record**

第一屏制造记忆，第二层立刻证明“这不是 concept site”，后面逐渐回到真实产品、workflow、trace、review surface、repo / paper / architecture。

### 1. 第一批 A 级取资对象

| 来源 | 最值得消费的局部 | 建议真实截图 | 对 CourtWork 的迁移 | 不应照搬 |
|---|---|---|---|---|
| **Linear** [官网](https://linear.app/?utm_source=chatgpt.com) | Hero 内直接运行“产品”；`Fig 0.x` 技术说明书式编号；产品 UI 就是主要视觉资产 | Hero 动画 2–3 个状态；Fig 0.1–0.3；diff/review section | CourtWork 的 **真实工作对象直接成为 hero 主角**；EXHIBIT / FIG / TRACE 编号可以成为页面语法 | 紫色黑底、glow、Linear 式 SaaS 套壳。现在 Linear 自己也在主动删减边缘复杂度。 citeturn369050search0turn369050search7 |
| **Minard** [官网](https://minard.app/?utm_source=chatgpt.com) | 极少见的“研究软件 + 个性化 editorial”结合；`1000× distillation`、pipeline、四种 lens | 首屏；Four Lenses；pipeline；6 API calls | **高度相关**：复杂理念不做 marketing cards，而用真实结构、数字、图谱自己说话 | 它的古典花饰只能理解为“自有标点语言”，不要照抄 |
| **Unlost** [官网](https://unlost.unfault.dev/?utm_source=chatgpt.com) | 极强 manifesto + install command + 三枚事实性 trust chips；随后立刻进入具体情境 | Hero；`When it matters`；Record → Extract → Ground | Paper 的抽象命题可以压成一句强判断，然后用 CourtWork 实际状态迁移证明 | 大段 developer manifesto 不能吞没视觉 |
| **Exat** [Codrops 幕后案例](https://tympanus.net/codrops/2026/04/10/the-exat-microsite-pushing-a-typography-showcase-to-new-creative-extremes/?utm_source=chatgpt.com) | **interaction = explanation**；scroll 是状态变量而非触发器；静/动区交替 | glyph grid 静止态 + hover 态；stacked panel 前后状态 | 最适合指导 CourtWork 的“激进部分”：鼠标/scroll 让 provenance、revision、state 发生**有语义的变化** | 不需要把 variable font / WebGL 当视觉装饰 |
| **R—K ’26** [Codrops 幕后案例](https://tympanus.net/codrops/2026/04/07/r-k-26-the-thinking-and-code-behind-a-portfolio-led-by-presence/?utm_source=chatgpt.com) | Hero 负责第一秒建立标准；12-column grid 稳住激进视觉；dock、preloader、footer 都属于同一世界 | preloader→hero 转场；dock；editorial article；footer | 很适合作为 **“发布面不是文档站，而是一个完整作品”** 的施工参考 | WebGL、声音、preloader 不应同时上；只挑一项成为 signature |
| **Nova / Panic** [Nova](https://nova.app/?utm_source=chatgpt.com) | 成熟 desktop 软件的长期 craft；产品截图和品牌插画并列，文案有性格但不损害功能判断 | Hero；feature screenshot；extension 区 | CourtWork 如果最终有 desktop-like GUI，可消费它的 **软件实体感** | 不必模仿传统 feature checklist。Nova 明确把 clean / thoughtful / fun 与 power 同时作为产品身份。 citeturn369050search2 |
| **Things** [官网](https://culturedcode.com/things/?utm_source=chatgpt.com) | 极高完成度但极低视觉噪声；动画用于解释展开、移动、位置关系 | Hero device composition；具体 interaction section | 用于约束 CourtWork 后半页：前面越激进，**产品证据区越应像干净纸张** | 不适合拿来做 CourtWork 的第一屏主语言。Things 的动效核心仍是保持人在结构中的位置感。 citeturn369050search3 |
| **Zed** [官网](https://zed.dev/?utm_source=chatgpt.com) | 直接把 code / agent dialogue / real UI 当视觉内容 | Hero；agent interaction；code state | 对 CourtWork 很重要：**不要为真实界面另画 marketing illustration** | 代码编辑器语法不要泛化成所有 developer-tool 网站 |
| **Raycast** [官网](https://www.raycast.com/?utm_source=chatgpt.com) | marketing chrome 与产品 chrome 共用语言；键盘、extension、command palette 都是品牌资产 | Hero；keyboard field；extension grid | 学它的“网站就是产品世界的延长线” | 不建议再做黑底 + 彩色 glow；这已经成为过度消费的 developer SaaS 模板。Raycast 2026 重设计本身也强调 familiar + fresh，而不是彻底陌生化。 citeturn369050search1turn369050search8 |
| **Lookback / Better Off** [幕后案例](https://tympanus.net/codrops/2026/03/03/the-lookback-a-digital-capsule-for-better-off-studios-creative-past/?utm_source=chatgpt.com) | 同一 corpus 的 timeline / index / surf 三种 lens；跨视图 FLIP 保持对象连续性 | timeline；index；相同对象跨 view 转换前后 | 非常适合 CourtWork 后续 **timeline / evidence index / graph** 的跨视图连续性 | 不需要无限滚动本身 |
| **Podium** [幕后案例](https://tympanus.net/codrops/2026/06/23/podium-building-a-website-where-running-becomes-storytelling/?utm_source=chatgpt.com) | 点击对象本身扩展成下一页面，而不是盖一层过场动画 | grid→detail 两帧 | screenshot / case example 可以直接“长成” detail，而非重新加载一套视觉 | 慢节奏并非 CourtWork 必须 |
| **Horeca** [幕后案例](https://tympanus.net/codrops/2026/06/10/building-horeca-advanced-motion-design-in-webflow-without-the-performance-trade-offs/?utm_source=chatgpt.com) | 是很好的**反过度工程施工手册**：CSS sticky 优先、GSAP 只负责真正需要的 choreography | sticky cards；mega menu；深度 feed | 作为本地 agent 的实现约束，而不只是美术参考 | 最值得抄的是删动画的判断，不是它所有的动画 |

这些视觉取样可以帮助快速感受“个人站允许多远的陌生化”。其中一部分是发现阶段的二手展示图；正式 research index 仍应由本地 agent 从原站重抓。

image_group{"layout":"carousel","aspect_ratio":"1:1","image_refs":["turn369050image0","turn369050image1","turn369050image3","turn369050image4","turn369050image5"]}

### 2. 不按“网站”分类，而按 CourtWork 将要施工的局部建立 index

这样后续 agent 不会得到一个 bookmarks 文件，而会得到真正的 **pattern library**：

| 局部 | 一级参考 | 应研究的变量 |
|---|---|---|
| **Hero / first frame** | R—K、Linear、Unlost、Goodgrowth | 首帧静态构图；1–3 秒后的状态；headline 与视觉对象关系；进入下一 section 的方式 |
| **Brand signature** | Exat、Goodgrowth、Dash Creative | 一种可复用行为：distortion / reveal / annotation / state change，而不是一个装饰效果 |
| **Navigation** | R—K dock、Raycast、Pell Mell、Framer community | top→scrolled 状态；hide/reveal；dock；mobile bottom-nav；是否侵占 hero |
| **Product proof** | Linear、Zed、Nova、Things | screenshot / scripted DOM / video；真实程度；chrome framing；是否能交互 |
| **Screenshot choreography** | Podium、Lookback、Screen Studio 类站点 | 从缩略图到 full surface；scroll zoom；before/after；对象连续性 |
| **Long-form explanation** | Minard、Unlost、Linear | pipeline、architecture、number callout、technical labels、代码片段 |
| **Scroll narrative** | Exat、Horeca、1820 | scroll=continuous state / discrete trigger；pin 数量；reverse；fast-scroll 行为 |
| **Microinteraction** | Exat、1820、GSAP community | hover 是否揭示信息；cursor 是否有语义；focus/mobile 同构；interruptibility |
| **Editorial layer** | Minard、R—K、Pell Mell | serif/sans/mono 分工；oversized type；旁注；caption；figure numbering |
| **Footer / closure** | R—K、Panic、OSS 项目 | GitHub、license、paper、latest build/changelog、contributors；最后一屏是否仍有作者性 |
| **Reduced motion / mobile** | Exat、Arnaud Rocca、Horeca | 是否是另一套设计，而非简单 `animation: none`；hover 的 touch 替代 |
| **Performance grammar** | Horeca、Exat、Goodgrowth | CSS vs JS；offscreen pause；WebGL context 数；media preload；single RAF |

这里有个很有用的社区实践：复杂 scroll 场景不能只测试“从头顺滑滚到底”。GSAP 社区近期的实际讨论集中在 **快速反向滚动、trackpad 小幅来回、多个 state transition 重叠** 等失败状态；`preventOverlaps`、明确状态边界以及真正的 state machine 才决定 demo 是作品还是脆弱特效。对 CourtWork 这种更强调状态语义的网站尤其重要。

### 3. CourtWork 最值得尝试的设计母题

我会把发布面的设计 brief 暂时定成：

**Evidence Editorial / Living Record**

不是“法律科技风”，也不是“AI developer SaaS 风”。

CourtWork 如果真实产品对象中存在 document、review、trace、revision、citation、state、proposal/commit 等对象，那么这些东西本身就足够形成非常独特的视觉词汇：

**`EXHIBIT 01` / `TRACE 04` / `REV. B` / marginal note / redline / source anchor / status stamp / record index**

它们可以承担 Linear 的 `FIG 0.x` 所承担的功能，但语义来自 CourtWork 自己，而不是装饰性模仿。

第一屏甚至可以非常克制地只做一个激进动作：例如一份看似静态的 “record” 随指针或 scroll **逐层显露 source → proposal → review → committed state**。用户实际经历一次产品理念，而不是先读一段解释。这里就是 Exat 那条原则最有价值的迁移：**interaction 应该让系统结构变得可见。**

之后页面立即退回稳定态：

**Hero signature → actual CourtWork surface → one end-to-end case → governing model → repo/paper**

所以不用堆 testimonial、pricing、十张 bento feature cards。GitHub Pages 的第一目标是让一个陌生的工程师、研究者或领域人士在几十秒内得到：

> 这是一个有明确主张、已经被做成真实软件、而且可以检查其实现和思想来源的项目。

### 4. 截图 index 建议直接采用这个 schema

```text
id
source
url
category
region
viewport
state
capture_note

pattern
design_intent
why_it_works
courtwork_take
do_not_copy

motion_trigger
motion_semantics
reverse_behavior
mobile_fallback
reduced_motion

implementation_hint
complexity: S | M | L
priority: A | B | C

asset_path
captured_at
```

截图不要只存一张“漂亮全页图”。对于有动效的站，每个 reference 至少捕获：

`rest → active/hover → scroll transition → mobile`，真正重要的再补 `reduced-motion`。

推荐目录也可以直接固定成：

```text
research/ui-index/
├── index.yaml
├── shots/
│   ├── hero/
│   ├── navigation/
│   ├── product-proof/
│   ├── editorial/
│   ├── motion/
│   └── footer/
└── notes/
    ├── hero.md
    ├── product-proof.md
    ├── motion-grammar.md
    ├── typography.md
    └── anti-patterns.md
```

### 5. 第一批实际抓图队列

优先顺序可以直接是：

**A0:** Linear → Minard → Unlost → Exat → R—K  
**A1:** Nova → Things → Zed → Raycast  
**A2:** Lookback → Podium → Horeca → Goodgrowth → 1820

这批已经足够让本地 agent 不从“生成一个漂亮 SaaS landing page”开始，而是从 **十几种经过真实项目验证的局部语法中做裁决**。

另外我会明确把 **Awwwards / Godly / gallery / X / Reddit 等降为 discovery layer**：它们适合发现某个 header、cursor、transition 或 screenshot treatment；真正进入 CourtWork 的 design index 时，尽量回溯到 **原站 + 作者 build case study + 实现讨论**。这一轮 Exa 最有价值的部分恰恰不是找到了更多漂亮页面，而是 Codrops、GSAP community 和作者源码把大量原本属于“前端设计隐性知识”的东西暴露成了可以被 agent 消费的具体施工判断。

