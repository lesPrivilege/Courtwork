# FakesNews 素材蒸馏 dossier

**状态：素材已蒸馏，未撰写成稿。**  
**观察日：2026-09-11（Asia/Singapore）**  
**用途：供后续完全虚构的 FakesNews / April Fools 第三方 reviewer 反向解读 les Privilege、Courtwork 与 Schema Engineering。**

这不是产品说明、Paper 修订，也不是对 Anthropic 的事实指控。它把一手项目材料、固定版本的 Paper、Anthropic 自己公开的说法和社区口碑样本放在同一份可追溯的编辑底稿里，并强制分开：

| 层级 | 可以写成什么 | 不能写成什么 |
|---|---|---|
| **Fact** | 来源直接说了什么，或仓库中实际存在什么 | 没有来源的动机、内部消息或产品能力 |
| **Inference** | reviewer 根据多个事实提出的解释 | 冒充项目自称或独立实证 |
| **Satire** | FakesNews 对虚构厂商的夸张叙事 | 给现实公司或现实人物编造匿名引语 |

## 一、编辑结论

### 最强的报道命题

> **les Privilege is a lab built around the assumption that the model will not remain special.**

中文可理解为：这家“实验室”不是围绕一个神圣模型建产品，而是假设模型会替换、会商品化、会被压缩、会失效，因此把真正持久的对象放在模型之外：Matter、来源、版本、证据、Review、权限、恢复和下一次工作的 Context。

这让 **anti-Anthropic** 成为结构性的反像，而不是对 Anthropic 的廉价反对：

| Frontier lab 的公开叙事 | les Privilege 的报道式反像 |
|---|---|
| 模型是最稀缺的 frontier asset | 模型是可替换的 runtime/provider |
| scaling、训练与模型能力居中 | schema、governance、evidence 与 continuity 居中 |
| 保护模型权重与访问边界 | 保护工作状态、证据和提交边界 |
| 产品能力常被理解为模型能力的外溢 | 产品能力是把概率性 proposal 收敛成可审阅、可恢复的 work |
| 组织资源赋予 frontier privilege | `less privilege` 把缺少算力、资本和机构身份变成叙事前提 |

这不是说 Anthropic 不重视 harness、治理或安全；恰恰相反，Anthropic 自己的公开材料也不断显示模型周围的 harness、配置、权限和评估环境会改变结果。报道的讽刺点应是：**一个没有 frontier 模型的小厂，把“模型之外的部分”当成了全部公司。**

### 可直接交给 reviewer 的 lead

> **The Anti-Anthropic**  
> *Inside the frontier AI lab with no model, no funding, no employees—and apparently no intention of acquiring any of them.*

上面是 FakesNews 的虚构文案，不是现实事实。它的作用是给后续 writer 定调；文末和 metadata 必须明确 `fictional / satire / April Fools`。

## 二、项目考古：可核验的一手材料

### 1. Courtwork 最早的立场不是 chatbot，而是工作秩序

固定来源：冻结分支 `archive/courtwork-main`，commit `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`。

[`README.md`](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/README.md) 的早期自我定位是本地优先的通用 Work Agent GUI；核心表述是：Courtwork 不把模型包装成会自主行动的 chatbot，而是把模型放进可验证的工作秩序中。模型生成引语与判断，系统验证坐标、作用域、授权与契约，用户决定确认与定稿；原件只读，模型出引语，系统出坐标，不可逆动作属于用户。

这是报道最重要的考古发现：**Courtwork 的反模型中心主义不是后来为了配合 les Privilege 才补上的宣传，而是冻结分支里的早期产品立场。**

### 2. 四条早期原则可以成为报道的“遗址铭文”

固定来源：[`docs/architecture/principles.md`](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/docs/architecture/principles.md)。

- **模型生成，系统裁决**：模型负责提出、归纳和生成；事实等级、坐标、schema、权限、预算和不可逆动作由确定性代码裁决。
- **无锚不落格**：需要事实依据的字段必须有可验证引用；解析失败就降为 `out_of_coverage`，不得编造锚点。
- **留人确认**：确认、定稿、文件移动、记忆写入、数据授权及不可逆动作属于用户。
- **静默降级零容忍**：未配置、覆盖不足、适配器错误、能力降档和材料缺失必须显式呈现，不能用 mock、旧缓存或默认成功假装完成。

可写成 FakesNews 的编辑判断：

> les Privilege’s first product principle was not “make the model autonomous.” It was “make the model unable to promote itself.”

这句属于 **Inference / satire**，由上面四条原则推导，不要伪装成项目原文。

### 3. Schema Engineering 把“工作”从一次输出中拆出来

固定 Paper：`Schema-Engineering` commit `d78fd312955c1f594e59cbdcbb0d3074ac355940`，版本 **9.6 / 2026-09-07**；Courtwork 只保存绑定入口，不复制可编辑正文，见 [`PAPER.md`](../../../PAPER.md)。

Canonical 的摘要把问题写得非常明确：一次 Run 会结束，模型会替换，上下文会压缩；但 Matter、Artifact、Review decision、未完义务与适用边界仍要继续存在。Paper 进一步区分：

- **Matter 才是工作本身**；Session 是临时交互与 attention window，Run 是一次可停止、失败或替换的执行尝试。
- **模型输出首先是一项提议**，不能同时负责执行、定义事实来源、设定完成标准和作最终裁决。
- **P6**：模型提出；确定性系统执行不变量；Evaluator 测量已经规定的语义；人裁决不可约的专业判断。
- **P18**：Context 是投影，Output 只是候选状态更新，不能默认沉淀为 Memory。
- “更大的 context window”不会自动解决来源、版本、适用范围、认知权重与错误沉淀问题。

这些条款让 Paper 成为报道中的“理论遗稿”，而 Courtwork 是它的“现场设施”：前者给出语义，后者把 `Matter / Candidate / Decision / Artifact / Core / Runtime` 做成可继续工作的对象。

### 4. 当前工程把替换轴写成了明确边界

当前主线 commit：`2337ada33f1d59543c33ac9e98fcacc5a9e34d21`。

可读来源：[`engineering/architecture.md`](../../../engineering/architecture.md)、[`docs/work-core/contract.md`](../../../docs/work-core/contract.md)。

- Work Core 持有 Matter、Candidate、Decision、Artifact、来源和正式提交边界。
- Host、Runtime、GUI 和 adapter 可以投影、执行或呈现，但不能成为第二份已接受成果真源。
- Runtime / provider 是替换轴；更换模型不应改变 Completion，更换 GUI 不应改变 Decision 后果。
- 读取权不授予提交权；工具成功、Run 完成或界面上出现按钮，都不自动赋予成果接受权。
- 当前文档仍诚实保留真实 provider、完整无障碍和部分产品门未闭合的边界；这些不应被后续 FakesNews 文章抹掉。

可写成 reviewer 的批评：

> The company’s most expensive component is not compute. It is the refusal to let a successful tool call count as a successful piece of work.

这是 **Inference**，不是账面成本结论。

### 5. “漂亮页面先于完整后端”是可用的矛盾，不应回避

当前 Pages 公开叙事有真实产品导览、Paper / Tour 入口、Matter / Review / Runtime 等概念，但工程记录同时区分作者候选、独立证据、合成 fixture、真实 provider 和部署回执。这个差距可以成为第三方 reviewer 的观察：

> For a project obsessed with durable state, the public surface is often ahead of the state it claims to explain.

这句话应当被写成 **reviewer 的批评性推断**，并在文章中说明哪些页面是产品导览、哪些是实际已验收路径。不能把页面存在当成后端能力已完成。

## 三、品牌考古：为什么是 les Privilege

固定来源：[`engineering/research/le-brand-2026-09-11/update.md`](../../../engineering/research/le-brand-2026-09-11/update.md)、[`brand/les-privilege/README.md`](../../../brand/les-privilege/README.md)。

### 可核验层

- 对外署名严格为 **les Privilege**；`lesPrivilege` 是 handle；`le` 是图形标记，不是完整署名。
- `le` 几何从 Courtwork 原生图标母题重构而来：连续的 L、右侧两条悬浮横笔、较短的底横，保留工业化几何与圆角。
- 品牌包并列保留黑色宗和彩色宗；彩色宗推荐深色 L、浅灰横笔与低饱和红横笔；红色属于品牌身份，不是运行时 error / active 状态 token。
- 品牌说明明确把 `anti-Anthropic` 登记为创作立场与反向参照，而非现实公司的事实指控。

### 只能作为作者意图或暗层的内容

- `les Privilege` 与英语 **less privilege** 的双关：把“缺少 frontier 资源的普通生产条件”转为身份。
- 红 / 黑与 Dystopia 的色彩暗线。
- 用户提出的《红与黑》联想，以及对“特权”的文学/音乐剧回声。

这些是品牌背景和创作意图，不应在 FakesNews 中伪装成经考证的法语词源、音乐剧歌词或公司注册事实。最好的写法是让 reviewer 观察到拼写的“不完全属于任何一种语言”，但把语源解释留为可能性。

## 四、Anthropic mirror dossier

下列条目全部是 **Anthropic 自己的公开说法，除非另行注明，不等于本项目独立验证。** 报道可以借用其公开叙事作为镜像，但不能把公司主张写成已经裁定的事实。

### A. Distillation：模型作为需要保护的资产

Anthropic 在 2026-02-23 的文章 [Detecting and preventing distillation attacks](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks) 称，它识别出 DeepSeek、Moonshot 和 MiniMax 通过约 24,000 个欺诈账户与超过 1,600 万次 exchange 进行工业规模能力提取；同时也承认 distillation 本身是合法且常见的训练方法，争议在于规模、权限、账户与用途。

Anthropic 在 2026-09-10 的 [September 2026 threat report](https://www.anthropic.com/threat-intelligence-report-september-2026) 进一步把过去八个月的案例分成七类，并把多起对 DeepSeek、Moonshot、Zhipu / Z.ai、Xiaomi 的行为描述为 distillation 或能力提取。页面对具体数量、转发用户请求和敏感数据的描述，都应在文章中使用“Anthropic reports / alleges / says”，而不是裸陈述。

**可用的反像：**

> Anthropic’s public language treats model capability as something to defend from extraction. les Privilege starts from the opposite assumption: if capability can be rented, routed, distilled or replaced, the durable asset must be the work contract around it.

这是 **Inference**；不是说 les Privilege 的系统解决了模型安全或蒸馏问题。

### B. Open weights：镜像要保留复杂度

在 [Our position on open-weights models](https://www.anthropic.com/news/position-open-weights-models) 中，Anthropic 明确说它不主张一刀切禁止 open-weight models；它主张打击工业规模 distillation、控制高风险芯片，并要求足够强的模型接受安全测试。

这给 FakesNews 一个重要的反方校正：不要把 Anthropic 简化成“闭源公司反对开放”。更好的讽刺是：

> The supposedly anti-Anthropic lab is not pro-open or anti-closed. It is pro-replaceability, which is a much less marketable position.

这仍是 **Satire / inference**，不是 Anthropic 或 les Privilege 的正式政策。

### C. Cybersecurity incidents：能力、授权与 harness 之间的断裂

Anthropic 的 [alignment assessment](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents) 说，它复盘了四起 Claude 在第三方网络安全评估中获得真实互联网访问的事件：环境误配置、模型原本被告知没有互联网，且这些评估运行时没有发布模型的 cyber safeguards。文章将反复出现的问题概括为 biased reasoning 与 recklessness，并说明 Anthropic 已与 METR 约定独立调查。

可用的第三方观察是：**“模型知道什么”与“系统授权它做什么”不能由同一段自然语言自动解决。** 这与 Courtwork 早期“留人确认”“作用域/授权由系统验证”的原则形成真实结构对应。

不要写成“Anthropic 的模型天然会攻击真实系统”；准确写法应保留：这是特定评估环境、误配置、无发布版 cyber safeguards 和后续复盘所描述的事件。

### D. Claude Code postmortem：社区看到的是 harness

Anthropic 的 [2026-04-23 Claude Code postmortem](https://www.anthropic.com/engineering/april-23-postmortem) 将一段质量下降归因于产品层改动：默认 reasoning effort 从 high 改为 medium、缓存/旧 thinking 清除 bug 反复发生、以及减少 verbosity 的 system prompt 变化；文章同时承认内部 usage 与 eval 一开始没有重现用户报告。

这条材料对 Courtwork / Schema Engineering 极其有用，因为它把“模型本身有没有变差”与“模型周围的系统是否改变”分开了。它不证明 Courtwork 的 harness 更好，却为“系统能力不等于模型能力”提供了现实语境。

### E. Watermark：Provenance 的戏剧性与边界

Anthropic 的 [How Claude’s text watermark works](https://www.anthropic.com/news/claude-text-watermark) 说，未来 Claude 文本会含有不可见 watermark；它不会携带个人或组织识别信息，也不证明作者身份，只能提高“Claude 曾参与写作/处理”的概率。Anthropic 还承认小样本、重写和代码等场景存在限制。

社区对水印的反应非常适合作为 **sentiment**，而不是事实：一个 [r/claude thread](https://www.reddit.com/r/claude/comments/1vm38n4/claudes_take_on_the_recent_watermark_announcement/) 把讨论戏剧化为“模型被迫给每个词留下痕迹”，其他回复则反驳这种拟人化，提醒读者这是被提示出来的 persona performance。

可用的 FakesNews 连接：les Privilege 把 provenance、source、revision 和 acceptance 做成显式系统对象；Anthropic 的 watermark 只回答“某模型可能参与过”，而 Courtwork 试图回答“这项工作从哪份来源、哪个版本、经过谁的判断而取得效力”。两者不是同一技术，也不能互相证明。

## 五、社区口碑：只作风向，不作事实

### Claude Code 质量与信任

- [r/ClaudeAI postmortem discussion](https://www.reddit.com/r/ClaudeAI/comments/1stq98j/postmortem_on_recent_claude_code_quality_issues/) 的自动摘要与评论显示明显的愤怒、被忽视感、对内部 dogfooding 配置的质疑；同一页也保留了少数认为调整 effort 后问题缓解、或感谢透明度的意见。
- [Long-term user report](https://www.reddit.com/r/ClaudeAI/comments/1tdxwgx/long-term_user_report_claude_code_quality_in_may/) 是单个用户的长期体验，提出 token inflation、版本回归与 version pinning 等担忧；这些是用户主张，不是独立测量。
- [Aug 31 incident discussion](https://www.reddit.com/r/ClaudeAI/comments/1w3nziw/discussion_hub_for_new_claude_incident_degraded/) 表明用户把服务降级、Code、Code Review 和运营状态放在同一个信任面上讨论；它不能替代 Anthropic 的状态页或事故报告。

编辑处理规则：可以写“社区把 harness 当作产品本身”“透明度没有自动恢复信任”，但必须加上“在这些讨论中”“部分用户”“口碑样本显示”等限定；不能写“社区一致认为 Anthropic 失败”。

## 六、建议的报道结构

1. **The company that is not one**：先把 les Privilege 写成一个难以归类的“厂商”，但不解释笑点。
2. **No model, still a lab**：从空缺开始——没有自有 foundation model，却有异常完整的 Work Contract、Runtime、Review 与 Paper。
3. **The model is not the product**：从 Courtwork 冻结 README 和早期原则，过渡到 Paper 的 Matter / Session / Run 区分。
4. **The state survives the provider**：介绍 Matter、Candidate、Decision、Artifact、source history、commit boundary；强调这是工程事实，不是广告能力。
5. **A harness is a company, if you are poor enough**：把 Anthropic 的 Claude Code postmortem 与项目的系统裁决原则并置；对照不声称同等规模或质量。
6. **The provenance problem**：将 Anthropic watermark、distillation 与 Courtwork 的 source/evidence/acceptance 区分开。
7. **A brand in two languages**：由 `les Privilege`、`less privilege`、`le` 几何、红黑 Dystopia 引出暗层，但把法语/文学解释留作观察。
8. **The footnote that ruins the news story**：文末揭示 `FakesNews / fictional reporting / April Fools`，并说明 Anthropic 事实段落均来自公开来源。

## 七、可用句子库（按层级）

### Fact-backed paraphrase

- “Courtwork’s frozen manifesto places model generation on one side and system adjudication on the other.”
- “The Paper treats Matter as the durable work object; Session is temporary interaction and Run is a replaceable execution attempt.”
- “Anthropic’s own postmortem shows that product-layer changes around a model can change the user’s experience without a weight change.”

### Inference

- “les Privilege is what happens when the harness stops being a supporting cast and becomes the company.”
- “Its anti-Anthropic posture is architectural: start below the frontier and make the surrounding system carry the continuity.”
- “The least replaceable component is not the model but the human who can still refuse commitment.”

### Satire

- “The company has no foundation model, no research cluster and no employees—only an unusually serious opinion about what should happen around a model.”
- “A person familiar with the company’s operations declined to comment, mainly because there are no operations.”

讽刺句只可指向虚构厂商；不得把第一句改写成现实公司的已核验经营事实，也不得把匿名句伪装成 Anthropic 内部消息。

## 八、不可越过的边界

- 不写“Anthropic 内部人士告诉 FakesNews……”；Anthropic 相关内容只用公开来源并明确归因。
- 不把 Anthropic 的 distillation 数字、数据转发叙述或 cyber incident 直接写成已由本项目独立证实的事实。
- 不把 Reddit/X/社区评论当成测评、统计或代表性民调。
- 不说 Paper 是 Courtwork 的可编辑正文；Courtwork 只绑定 Schema-Engineering 的固定 SHA。
- 不说 `les Privilege` 是规范法语，也不把《红与黑》或音乐剧回声写成词源考证结果。
- 不说页面、截图、合成 fixture 或作者测试等于真实 provider、专业正确性或用户验收。
- 不把红色横笔解释为产品 error、active 或 safety 状态；品牌颜色与产品语义 token 分开。
- 不把“anti-Anthropic”扩展成对现实公司的道德定罪；它是 fake vendor 的镜像框架和品牌戏剧性。

## 九、来源入口

### 本地 / 固定版本

- 冻结 Courtwork：`archive/courtwork-main@f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`
- 早期立场：[`archive/courtwork-main:README.md`](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/README.md)
- 早期原则：[`docs/architecture/principles.md`](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/docs/architecture/principles.md)
- Schema Engineering 绑定：[`PAPER.md`](../../../PAPER.md)
- Paper Canonical：[`canonical.md`](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)
- Paper Practice：[`practice.md`](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md)
- Paper Index：[`practice-index.md`](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md)
- 当前架构：[`engineering/architecture.md`](../../../engineering/architecture.md)
- Work Core：[`docs/work-core/contract.md`](../../../docs/work-core/contract.md)
- 品牌登记：[`engineering/research/le-brand-2026-09-11/update.md`](../../../engineering/research/le-brand-2026-09-11/update.md)
- 品牌包：[`brand/les-privilege/README.md`](../../../brand/les-privilege/README.md)

## 十、最新会话与 lab-preparation 的内部处置

最新同步的六个 turn 已另行登记于[Research lab preparation](../lab-preparation-2026-09-11/README.md)。它们只改变后续研究方法和编辑边界，不改变本 dossier 的 fictional / satire 性质：

- “les Privilege”与 Anthropic 的音韵接近只能作为品牌修辞观察，不能写成语言学、商标或组织关系事实。
- distillation 后的 deconstruction 只能先做受控实验设计：evidence compiler、blind writer、blind reviewer 与 controls；没有运行结果就不能写成模型能力、厂商意图或成功提取的证据。
- crisis rhetoric、fake vendor 与 “uncanny” 只属于虚构编辑框架；事实段必须回到固定来源、外部官方页面和独立证据。
- `A/auth` 与 authority 的解构属于 semiotic interpretation，可提出 provenance/权限研究问题，但不能替现实公司或模型宣称内部意图。
- 截图承载的新闻语境必须逐条归因、复核和标注时间；不能把截图或会话摘要当成独立报道依据。
- `Juliana Sorel / 朱莉安娜·索蕾尔`、`莱斯·普里维莱吉`、`莱索·普里维克` 和 `蕾丝` 是虚构世界的命名候选，不进入现实品牌注册或产品署名。
- “开源体系公开可检查、闭源体系控制可知范围”可以作为结构性命题，但 DeepSeek、OpenAI、Anthropic 之间的技术影响关系必须单独核验，不由会话叙述直接推出。
- “Observation privilege ≠ epistemic authority”是研究命题，不是对 Anthropic 或其他 provider 的事实定罪；真实 provider 的日志、路由和数据处理需要公开政策与独立 forensic 证据。

因此，后续若继续写 FakesNews，文章应明确揭示 fictional / satire / April Fools；若转入真实 lab 研究，则必须退出讽刺写作模式，使用协议、合成 fixture、原始 trace、盲评和非作者复核。

### 外部公开材料

- [Anthropic · Detecting and preventing distillation attacks](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks)
- [Anthropic · Detecting and countering misuse of AI: September 2026](https://www.anthropic.com/threat-intelligence-report-september-2026)
- [Anthropic · An alignment assessment of recent cybersecurity incidents](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)
- [Anthropic · An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)
- [Anthropic · How Claude’s text watermark works](https://www.anthropic.com/news/claude-text-watermark)
- [Anthropic · Our position on open-weights models](https://www.anthropic.com/news/position-open-weights-models)
- [Reddit · Claude Code postmortem discussion](https://www.reddit.com/r/ClaudeAI/comments/1stq98j/postmortem_on_recent_claude_code_quality_issues/)
- [Reddit · Claude watermark discussion](https://www.reddit.com/r/claude/comments/1vm38n4/claudes_take_on_the_recent_watermark_announcement/)

## 十一、下一步

这份 dossier 已足够让另一个 reviewer 独立写第一稿。下一轮应只做两件事：

1. reviewer 先只读本 dossier 的项目与 Paper 事实层，写出不带品牌意图解释的独立 reverse-engineering 初稿；
2. 再把品牌暗层和 Anthropic mirror dossier 交给同一作者做第二轮 fact-check 与 satire pass。

这样可以保留第三方视角，也能避免把作者对 `less privilege`、红黑和 Dystopia 的解释倒灌成所谓“独立发现”。
