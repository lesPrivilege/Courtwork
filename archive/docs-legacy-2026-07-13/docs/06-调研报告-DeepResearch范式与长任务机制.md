# 调研报告：Deep Research 范式与长任务 Agent 机制（2026-07-09）

调研目的：评估"deep research 机制是通用件，法律垂类只需换推理提示词与信源策略"这一产品假设是否成立，为是否将 deep research 引入 Courtwork 场景注册表、以及引入到什么颗粒度给出裁定。结论先行，正文展开论据；本报告不改动任何已拍板架构决定，涉及 `docs/20` 的地方以"验证/补充"为口径。

---

## 0. 结论摘要（先读）

1. **假设裁定：部分成立，但"只改提示词"这个说法本身低估了工作量，是误导性表述。** Deep research 的**循环骨架**（plan → parallel search → reflect → synthesize → cite）确实是可跨领域复用的通用件，三家闭源产品和至少七个开源实现都收敛到同一个循环形状，这部分可以直接借鉴甚至直接调用现成 loop 逻辑。但"信源分级门禁""引用校验钩子""终止条件语义""确认节点插入粒度""报告模板"这五处，本质是**结构性的 schema/工具/门禁设计问题**，不是 prompt 遣词问题——用 prompt 表达"请只引用可靠信源"不构成可执行的分级门禁，这正是 `docs/20` 里"不许让 C 级事实未经确认流入 docx 批注依据"这条红线要防的事。
2. **可以借的**：LangChain `open_deep_research` 的 supervisor/researcher 分工模式、Anthropic 公开的 lead-agent + 独立 CitationAgent 两阶段设计、`think_tool` 反思模式、Claude Code 的 TodoWrite 式任务态追踪。这些是**模式**，不是代码依赖——因为 Courtwork core 已定案基于 pi-mono 借壳，不能再引入 LangGraph 作为第二套 agent 循环依赖，横向依赖会违反 CLAUDE.md 的依赖方向纪律。
3. **场景注册表声明可以成立**，但依赖 `docs/20` 中标注为"注册表 v2"的 `retrievalPolicy` 字段先落地，且 cite-check 工具需要真实对接法律信源（北大法宝法宝引证码/裁判文书网），而不是通用网页引用校验——这是 MVP 两个工具之外的新增确定性接口，需要写入 `packages/tools` 的 SPEC TODO。
4. **必须自研的五处**：信源白名单与分级映射（法律垂类特有源，非通用 web）、引用校验钩子对接真实法律库、终止条件的法律语义化（法条与类案双轨齐备判据）、留人确认节点的插入颗粒度、法律备忘录风格的报告模板。这五处开源填不上，理由与现有"五个必须自研加固的节点"清单同构——都是行业知识壁垒，不是工程量壁垒。

---

## 1. 主流范式：三家公开架构信息

三家的循环骨架高度收敛，均可归纳为 **plan → (parallel) search/read → reflect → synthesize → cite** 五段式，区别在并行策略与引用生成时机。

### 1.1 OpenAI Deep Research（2025-02 发布，o3 系）
- 架构描述为 "Plan-Execute-Synthesize"：分解查询为子任务、自主设计检索策略、动态调整；工具含浏览器、代码解释器、文件处理。
- 用"Intent-to-Planning"策略先澄清用户意图；用第二个模型（自定义 prompt 的 o3-mini）专门做思维链摘要，说明**摘要/压缩是独立的一环**，不是主循环模型顺带完成。
- 单次任务可运行到 30 分钟；GAIA 67.36%、HLE 26.6%（当时行业最高）。

### 1.2 Anthropic Claude Research（2025-04 发布，多智能体版本 2025-06 公开工程博客）
- 官方工程博客 `anthropic.com/engineering/multi-agent-research-system` 是最详尽的公开架构说明，核心信息：
  - **Orchestrator-worker 架构**：LeadResearcher 分析查询、制定策略、生成计划并**先存入 Memory**（因为超过 200K token 上下文会被截断，必须先落盘计划，防止中途丢失研究方向——这是长任务的关键工程细节，不是可选项）。
  - LeadResearcher 派生若干 Subagent 并行搜索，每个 Subagent 有独立上下文窗口、独立工具集、独立探索轨迹（"separation of concerns"）；返回摘要而非原始检索结果给 Lead，减少 token 拷贝开销。
  - Subagent 用 interleaved thinking 在每次工具调用后评估结果质量、判断是否有 gap，再决定是否继续检索或返回。
  - **引用生成是独立的最后一步**：所有发现汇总后，交给专门的 **CitationAgent** 处理文档与报告，定位具体引用位置，确保每条论断都有可追溯来源——引用不是主循环模型顺手写的，是拆出来的确定性/半确定性后处理步骤。
  - 性能：Opus 4 lead + Sonnet 4 subagents 比单 agent Opus 4 在内部研究评测上高 90.2%；但 token 消耗约为普通对话的 15 倍，agent 类任务本身已是对话的 4 倍——多智能体不是免费的性能提升，是拿 token 换效果。
  - 官方明确划定适用边界："需要所有 agent 共享同一上下文、agent 间存在大量依赖关系的领域，不适合多智能体"——例如大多数代码任务，并行子任务少，协调开销大于收益。
  - 长对话管理：agent 在阶段性完成后总结工作、把关键信息写入外部记忆，逼近上下文上限时可以生成干净上下文的新 subagent，通过检索存储的计划保持连续性——这是"检查点续行"在 prompt/工程层面的具体做法，而非框架自带能力。
  - 生产可靠性：agent 有状态、错误会复合，不能整体重启，要能从出错点恢复；用 rainbow deployment 避免升级中断正在运行的 agent；当前 subagent 执行是同步阻塞的（lead 等所有 subagent 完成才继续），异步化被列为未来方向但增加状态一致性/错误传播复杂度。
- Claude 消费级 Research 功能本身由 Brave Search 提供检索，引用与 Brave 结果对齐度约 87%（第三方测算，非官方数字），侧重深度信源（署名作者、一手数据、第三方验证）而非 SEO 内容农场。

### 1.3 Google Gemini Deep Research（Gemini 3 Pro 推理核心）
- 迭代式规划：formulates queries → reads results → identifies knowledge gaps → searches again，模型自行判断哪些子任务可并行、哪些需顺序执行。
- 官方强调"迭代检索能捕捉单次系统会漏掉的东西"——例如第一次检索命中一个有争议的论断，标准模型不会意识到有争议，Deep Research 会继续检索发现分歧并在报告里如实呈现（这是 reflect 阶段抓"矛盾"的直接例子，与 Courtwork S1 场景要做的"供述/证据矛盾清单"是同构问题，只是信源换成了卷宗内部文档而非 web）。
- 报告生成阶段独立于检索循环：模型认为信息充分后才转入"评估信息、识别主题与不一致、组织报告结构"的综合阶段。

**对 Courtwork 的启示（先放这里，5.3 再展开）**：三家不约而同把"生成阶段""引用/校验阶段""检索循环阶段"拆成互相独立的步骤，而不是让一个模型在一次生成里同时干三件事。这个拆分本身就是 Courtwork 现有架构（core 编排 + tools 确定性接口 + registry 声明产出 schema）已经隐含要求的形状——不需要额外发明，但需要把"CitationAgent 式独立引用校验步骤"显式建成 `packages/tools` 里的一个工具调用点，而不是指望生成模型自己把引用写对。

---

## 2. 开源实现盘点

| 项目 | License | Star（量级） | 维护状态 | 规划策略 | 循环控制 | 引用溯源 | 可嵌入性 |
|---|---|---|---|---|---|---|---|
| **gpt-researcher**（assafelovic） | Apache-2.0 | ~28k | 高，持续更新，2026 新增 `.claude/skills/` 给 Claude Code 直接理解扩展 | Planner 生成客观子问题（大纲先行的弱版本，非 STORM 式多视角大纲） | Planner → 多 crawler/scraper 并行执行 → Publisher 聚合，无显式"深度/广度"数值参数，靠 20+ 源并行覆盖广度 | Publisher 阶段做来源追踪与聚合，报告含引用，去重机制未见公开细节说明 | **Library 优先**：Python 包可嵌入，也有独立 web/CLI 应用；嵌入成本低，是本盘点里"拿来做参考实现"最方便的一个 |
| **LangChain open_deep_research** | MIT | 中高（生态位置突出） | 高，LangChain 官方维护，随 LangGraph 迭代 | **三段式**：scoping（用户澄清 + brief 生成）→ research（supervisor 分工）→ report；先把模糊需求收敛成明确 brief 再进入检索，比 gpt-researcher 多一道澄清环 | Supervisor 决定 brief 能否拆成独立子课题，派生 sub-agent 各自独立上下文迭代检索，用 `think_tool` 做**显式反思**（这是与其他实现的最大差异点——反思是一个具名工具调用，不是隐式 prompt 习惯）后决定是否追加检索或转入综合 | 子 agent 各自压缩发现后交回 supervisor，citation 处理未见独立 agent（不同于 Anthropic 官方方案，更依赖主循环自行标注） | **重度绑定 LangGraph**：作为 library 引入即引入整套 LangGraph 状态机/checkpointer 依赖，对已定 pi-mono 单一 agent 核心的项目是**横向依赖冲突**，只适合"抄模式，不用代码" |
| **Stanford STORM** | MIT | ~27k-27.6k | 高，Stanford OVAL 持续维护，衍生生态多（教育/写作场景） | **大纲先行**是核心差异化：先"多视角提问模拟"（模拟维基作者与领域专家对话）发现不同视角，再据此生成大纲，最后按大纲写正文——两阶段（Pre-writing 收集参考资料+生成大纲；Writing 按大纲扩写）是显式分离的 | 循环控制体现在"视角发现"阶段的对话轮数，而非"深度/广度"数值参数；适合结构化知识条目（百科式），不适合开放式任意深挖 | 参考资料与大纲绑定生成，引用随大纲条目走，溯源结构天然按主题分节，不是按发现顺序线性排列 | 中等：Python 库可调用，但"多视角模拟对话"步骤计算成本较高，更适合"生成结构化长文"场景而非"快速查证一个事实" |
| **HuggingFace smolagents open-deep-research** | Apache-2.0（smolagents 主库） | smolagents 主库 ~26.5k-27.7k | 高，HF 官方维护，作为 smolagents 的 example 而非独立包 | 复刻 OpenAI Deep Research 的最简实现，"代码即行动"范式（agent 生成 Python 代码调用工具，而非结构化 tool-call JSON） | 单 agent 循环 + GoogleSearchTool，无显式多 agent 分工，复杂度最低 | 未见独立引用校验步骤，报告级引用质量弱于专门实现 | **最易嵌入**：作为 smolagents 库的一个 example 脚本，依赖最轻，适合"验证循环骨架能不能在 pi-mono 上复刻"这类 POC，不适合直接生产化 |
| **ByteDance deer-flow / Deer-Flow 2.0** | MIT | 2.0 版本几天内 22k+ star | 很高，2026 年 GitHub Trending 第一，字节持续投入 | **超级 agent harness** 定位，不只是研究场景：message gateway（消息网关）作为"中枢神经"协调 lead agent 与专门 sub-agent；沙箱化执行（Docker/Kubernetes provisioner 双模式） | 长周期任务（分钟到小时级），带 memory 持久化、skill 库、可作为**嵌入式 Python 库**直接用 `DeerFlowClient`（不需要跑完整 HTTP 服务/前端/nginx/Docker），复用同一套 config/checkpointer/skills/memory/MCP/sandbox 配置 | 依赖 LangGraph/LangChain 底座（继承其生态） | **可嵌入但底座是 LangGraph**：`DeerFlowClient` 免去部署 HTTP 服务的问题解决了"重"的顾虑，但依赖链依旧绑死 LangGraph，与 pi-mono 单核心原则冲突，同 open_deep_research 的问题 |
| **Jina node-DeepResearch** | Apache-2.0 | 中（原型性质，OpenAI Deep Research 发布几小时内的快速复刻） | 中，README 明确标注 "not recommended for now, still under active development" | 无正式规划阶段，靠"Search → Read → Reason"循环自然涌现方向 | **纯 token 预算终止**：不设深度/广度参数，只设 token budget，超预算即停；多标准自评估决定是否已找到"definitive answer" | 无独立引用 agent，reason 阶段顺带产出来源 | **最轻量、单文件感强**：Node 实现，依赖 Jina Reader + Gemini/OpenAI，适合理解"极简 loop 长什么样"，不适合直接生产化（作者自己标注还在活跃开发中，接口不稳） |
| **dzhng/deep-research** | MIT | 中（衍生 fork 多，如 `free-deep-research`、`u14app/deep-research`） | 中 | **显式广度×深度**两参数（breadth 3-10 条查询/轮，depth 1-5 递归层数），是本盘点里"深度/广度"作为一等公民参数暴露给调用方的代表实现 | 每轮生成 follow-up 问题细化方向，递归到 depth 上限即停止细分、直接研究该子主题；5 分钟到 5 小时可配置运行时长 | 报告级 markdown 引用+来源列表，无独立校验 agent | **最简单可读的参考实现**：代码量小，适合"读懂算法伪代码"层面的参考，衍生版本 `u14app/deep-research` 支持 SSE API + MCP server，工程化程度更进一步 |
| **新出现（2025-2026，泛列，未逐一深挖）**：SkyworkAI `DeepResearchAgent`、OpenManus、PraisonAI（内置 deep research 能力的通用多 agent 框架）、Aomni `deep-research`、`nanoDeepResearch`（轻量工具包） | 各异 | 各异 | 2025 下半年至 2026 集中出现，说明"deep research 循环"已经从"独立产品形态"降级为"通用 agent 框架的一个内置能力"，与本报告 0.2 的判断一致 | — | — | — | 未逐一验证 license/架构，仅作为"这个领域仍在快速迭代、不必押注单一实现"的佐证列入 |

**架构维度小结**：
- **规划策略**分两派：STORM 的"大纲先行"适合生成结构化长文（如法律综述、行业研报），dzhng/deep-research 与 node-DeepResearch 的"迭代深挖不预设大纲"适合开放式查证（如"这个法条现在还有效吗""这家公司有没有被列入失信名单"）。Courtwork 的信源分级/留人确认场景更接近后者——法律研究通常是"验证一个具体命题"而非"写一篇维基百科词条"，STORM 模式优先级应低于迭代深挖模式。
- **循环控制**分两派：深度/广度数值参数（dzhng 系）vs token/时间预算（node-DeepResearch、Anthropic）vs 反思工具显式判定（LangChain think_tool）。法律场景更适合**语义化终止条件**而非纯数值——见 5.2。
- **引用溯源**分两派：报告生成时顺带产出（多数开源实现）vs 独立后处理 agent（Anthropic 官方方案）。**Courtwork 必须走后者**，因为 `docs/20` 要求 C 级结果结构上进不了"已核验"通道，这天然要求一个独立于生成模型的校验步骤，而不能信任生成模型自己声称"我引用的都对"。
- **可嵌入性**是本次调研对 Courtwork 决策最关键的一条：**凡是绑定 LangGraph 的实现（open_deep_research、deer-flow）只能借模式不能借代码**，因为 core 层已定案 pi-mono 借壳、"只借 loop 与 provider 抽象"、场景注册表与 schemas 永远长在本仓库——引入第二套 agent 编排框架违反依赖纪律，即使功能诱人也不能作为库直接 import。真正可以按 library 引入或直接抄实现细节的是 gpt-researcher（轻量、Apache-2.0、模式清晰）与 smolagents 的极简示例（做 POC 验证 pi-mono 上能否复刻同等循环）。

---

## 3. 长任务 loop engineering：模式对比与适用场景

| 模式 | 特点 | 适用任务形态 | 与 Courtwork 场景的对应 |
|---|---|---|---|
| **Plan-and-Execute** | 上层先生成完整计划，执行阶段用更便宜的执行器逐步跑完；效率高（有数据显示比纯 ReAct 快 3.6 倍完成率 92%），但计划一旦定型难以中途大改 | 任务分解在设计期可预测、步骤间强依赖顺序 | S4 诉讼文书起草（要素式生成，结构相对固定）更接近这个模式 |
| **ReAct**（Reason+Act 紧耦合循环） | Thought → Action → Observation 单步循环，每步都重新推理下一步做什么，灵活但容易发散、慢 | 路径不可预测、需要随时根据中间结果改变方向 | S1 卷宗阅卷中"发现矛盾后追查来源"这类子任务 |
| **Reflexion / 自我批判** | 在 ReAct 基础上加一个显式自评步骤，评价自己的输出再重试，复杂推理/结构化输出任务上有 15-25% 提升 | 输出质量对"回头检查一遍"敏感的任务 | 对应 cite-check 前的"自查引用是否支持论断"步骤，可作为 CitationAgent 之前的一道内部关卡 |
| **TodoWrite 式任务态追踪**（Claude Code 范式） | 不是推理模式，是**长上下文注意力管理机制**：显式任务清单（pending→in_progress→completed），每次工具调用后把清单重新注入上下文，防止"步骤 4-10 因为不再显眼而被跳过" | 任何多步骤任务，本质是解决"长上下文里早期指令被稀释"的问题，与推理范式正交，可以叠加在任何一种 loop 之上 | 对 Courtwork 有直接借鉴价值：S1/S2 这类多阶段场景（摄取→分类→对齐→产出）可以在 core 里维护一个显式任务态，配合场景注册表定义的多步骤流程，而不是完全依赖模型自己记住走到哪一步了 |
| **上下文压缩/记忆分层** | 三层架构共识：Tier1 当前会话工作记忆、Tier2 压缩会话摘要（锚定式增量摘要）、Tier3 跨会话外部持久存储；Anthropic 官方方案是"计划先存 Memory 防止 200K 截断丢失" | 单次任务预计消耗远超模型上下文窗口 | 卷宗摄取本身就是这个问题（大卷宗 OCR+实体对齐产出可能远超单次上下文），deep research 只是提供了一个现成的分层记忆参考实现，不是新问题 |
| **检查点/断点续行** | agent 有状态、错误会复合，不能整体重启；需要能从出错点恢复而非从头来过；LangGraph 的 `interrupt()`/checkpointer 是这条工程实践的框架化实现，本质是"暂停时把状态存下来、恢复时从同一节点续跑" | 任何长期运行、可能中途出错或需要人工确认的任务 | **与"留人确认节点"直接同构**——留人确认在工程实现上就是一次"预期内的、按产品设计触发的中断点"，用同一套检查点机制承载，不需要发明新机制，需要在 pi-mono 借壳的 core 上实现等价的"暂停-持久化-恢复"能力（LangGraph 的 `interrupt_before`/`interrupt_after` + checkpointer + thread ID 续跑是可参考的具体设计，但代码不能直接搬） |

**结论**：长任务 loop engineering 里，真正"通用可复用"的是 TodoWrite 式任务态追踪和检查点/续行机制——这两者与推理范式正交，属于工程基础设施层面，可以在 pi-mono 借壳的 core 之上原样实现，不需要等 deep research 场景才做，事实上 core 的确认节点机制本身就需要这套东西，deep research 只是恰好也需要。

---

## 4. Multi-agent 编排：orchestrator-workers 何时值得

Anthropic 官方数据是目前最具体的公开依据：
- **性能增益确实存在**：90.2% 优于单 agent（内部研究评测），三个因素解释 95% 方差——token 用量本身解释 80%，其余是工具调用数和模型选择。也就是说**多 agent 的核心价值是"合法地烧更多 token 做并行探索"**，不是什么架构魔法。
- **成本代价明确**：多 agent 系统 token 消耗约为普通对话的 15 倍（agent 任务本身已是 4 倍）。
- **官方划定的不适用边界**：需要所有 agent 共享同一上下文、agent 间存在大量依赖关系的领域不适合——多数代码任务属此列，因为并行度低、协调成本高于收益。
- **适用边界（社区总结，与官方吻合）**：任务可预测性低、真正可并行的独立子任务、上下文窗口会溢出、需要动态而非设计期决定的任务分解——满足这些才值得多 agent；否则单循环更省钱更好调试。

**对 Courtwork 的判断**：
- S1（卷宗阅卷）内部的"事件时间线/关系图谱/矛盾清单"三条产出，理论上是可并行的独立子任务（互不依赖同一上下文），**具备多 agent 化的结构条件**，但 MVP 阶段卷宗规模、成本敏感度、"午休之内出时间线"的时延目标，都指向**先用单循环跑通，不要在 MVP 就上多 agent**——15 倍 token 成本对一个还没验证摄取意愿的产品是不必要的早期负担。
- Deep research 场景（若引入）本身天然是"多个独立子问题并行检索"的形态，是多 agent 编排里少数官方明确背书的适用场景，但即便如此也应该做成**场景注册表里的可配置项**（是否启用并行 subagent、并行度上限），而不是 core 里的默认行为，这与 `docs/20`"core 不做场景特判，平衡点在声明层"的既有原则一致，可以直接复用同一套设计哲学。

---

## 5. 法律垂类适配评估（核心结论）

### 5.1 "只改提示词"假设的裁定

**结论：假设不成立，是误导性简化。** 理由分五层：

1. **信源分级不是提示词能表达的门禁**。`docs/20` 已经拍板"C 级结构上进不了已核验通道"，这要求 web search 结果在**类型层面**（schema 的判别联合/reason 枚举）就带着 `verified:false` 标签，且门禁在 core 的通用执行逻辑里做传播和拦截。这是数据结构 + 执行逻辑的设计问题，prompt 只能"建议"模型标注等级，不能保证；模型可能会遗漏标注或误判等级，这正是 Harvey/CoCounsel 的公开架构选择"不从 web 推理，而是原生嵌入 Westlaw/Practical Law 内容和工具"的原因——**它们把可信来源做成检索源本身受限，而不是靠模型自律**。Courtwork 的信源分级设计思路（A/B/C 三级 + 门禁在 core 执行）方向是对的，且比"只信任白名单库"更灵活（保留 C 级作为线索，走采编漏斗升级），但正因为保留了 C 级入口，门禁逻辑必须是代码而非 prompt。
2. **引用校验需要挂确定性工具，不是模型自证**。Anthropic 官方方案把 CitationAgent 拆成独立后处理步骤而非让主循环模型自己保证引用准确，这已经说明"引用准确"连在通用领域都不能靠一次生成里的提示词保证。法律场景的引用错误后果更重（虚构判例被写入交给法院的文书，已有真实案例因此被制裁，Stanford 研究测得 GPT-4/Westlaw/Lexis+ 幻觉率分别约 43%/33%/17%），必须挂 `packages/tools` 里的确定性引用校验工具（W5 已规划"法规/判例引用校验源"），且这个工具要对接**法律专用信源**（北大法宝法宝引证码、中国裁判文书网），不是通用网页反查。这是新增的确定性接口需求，需要写进 `packages/tools` SPEC 的 TODO，而不是复用 MVP 已定的两个工具（主体核验、通用引用校验）就能覆盖——通用引用校验源指向什么库、能否覆盖法条与判例双轨，是 deep research 场景引入前必须先补的空白。
3. **终止条件需要法律语义化，通用数值参数不够**。开源实现的终止条件多是"深度/广度数值耗尽"或"token 预算耗尽"或"多标准自评估收敛"，这些是**领域无关的工程判据**。法律研究的"够了"标准是领域知识：法条现行有效性（有没有被修改/废止/新法优先）、类案是否覆盖到不同审级/地域的裁判倾向差异、援引条文与案由是否匹配——这些判据无法从"检索到 2 个独立信源"这类通用规则推出，需要专门设计终止条件的 schema 字段（哪些条件构成"本场景已完成"），这是场景声明层的领域知识，不是可以从别的领域套模板复制的提示词。
4. **留人确认插入点的颗粒度是产品设计决策**。deep research 开源实现普遍没有强制的中途确认点（多是"跑到底出报告"的单次交付模式），而 Courtwork 的产品纪律是"每个关键产出节点留人确认"。要不要在检索到矛盾判例时就停下来问律师，还是等报告成型后统一确认，这个颗粒度选择直接决定用户体验和风险敞口，不同场景（S1 阅卷 vs 假设的"类案检索"场景）答案可能不同，这需要在场景注册表的"确认节点定义"里逐场景设计，不是通用循环自带的能力。
5. **报告模板需要法律文书的形式规范**，包括信源等级角标（已核验/库内/网络参考，`docs/20` W9 已计划）、条文与案例的引用格式（类似 Bluebook 但要适配中国裁判文书引用惯例）、区分"事实认定"与"法律意见"的呈现结构——这些通用 deep research 报告模板（markdown 标题+要点+表格）完全不涉及，需要专门设计并接入 `packages/output` 的产出管线。

**验证性佐证**：CoCounsel 的公开定位原文是"doesn't reason from the web—it's built with Westlaw and Practical Law content and tools natively embedded, making defensibility part of the architecture rather than a feature"——行业头部玩家自己的表态直接支持"只改提示词不够，必须在架构层做信源约束"这一判断，而不是反过来证明"用 prompt 管住信源"可行。

### 5.2 除提示词外还必须动的清单（汇总 5.1 论据）

1. **信源白名单/分级映射数据**：法律垂类特有源（法条库、裁判文书库、企查查/天眼查）的等级归类规则，不是通用 web 域名信誉打分能替代的。
2. **引用校验钩子对接真实法律库**：`packages/tools` 需要新增或明确 W5 现有"引用校验"工具的信源范围能否覆盖法条现行性 + 类案检索，若不能覆盖需要立项补充，写入该层 SPEC 的 TODO。
3. **终止条件的法律语义化**：场景声明里需要定义"本场景研究充分"的领域判据（法条效力+类案覆盖+矛盾已识别），而非套用深度/广度数值或 token 预算。
4. **留人确认节点插入颗粒度**：需要按场景单独设计触发时机（发现矛盾时/报告成型后/两者都要），这是产品设计工单，不是工程默认值。
5. **法律文书风格报告模板**：信源等级角标、条文/判例引用格式、事实与法律意见分层呈现，需要在 `packages/output` 层单独设计模板，不能沿用通用 markdown 报告结构。

这五处与仓库现有"五个必须自研加固的节点"（OCR 印章/手写、跨文档实体对齐、docx WPS 兼容、卷宗结构还原、法律垂类评测集）性质相同：**都是开源填不上的行业知识壁垒**，建议视为第六类必须自研节点，而不是当作"待办的小活"轻描淡写。

### 5.3 Courtwork 引入路径建议

**借哪个开源件的什么部分**：
- 借 **Anthropic 官方架构模式**（非代码，因为闭源）：lead agent + 独立 CitationAgent 两阶段设计，直接对应"生成阶段"与"cite-check 工具调用阶段"的分离，这个分离本身就该是 Courtwork 场景执行器（W6 core）里"编排工具与生成 → 产出 artifact"步骤的标准形状，不只对 deep research 场景适用。
- 借 **LangChain open_deep_research 的三段式模式**（scoping/research/report）与 `think_tool` 显式反思设计——只抄结构、不 import 代码，避免引入 LangGraph 作为第二套编排依赖。
- 借 **gpt-researcher 的 planner/executor/publisher 三角色划分**作为最简参考实现，因其 license 干净（Apache-2.0）、依赖轻，可以在 pi-mono 借壳的场景执行器里逐字对照实现同等逻辑，必要时直接阅读其源码作工程参考（不建议 import 整个包，因其内部假设了自己的 provider/工具封装，会和 Courtwork "provider 无关封装"原则打架）。
- 借 **Claude Code TodoWrite 范式**做多步骤场景（不只是 deep research，S1 摄取全流程同样适用）的任务态显式追踪，减轻长上下文注意力稀释问题。
- 借 **LangGraph interrupt/checkpointer 的设计（非代码）**——"暂停前存档、恢复时按同一节点续跑"这个设计模式，直接映射到 core 的留人确认节点实现上，需要在 pi-mono 借壳基础上补一层等价能力（pi-mono 本身是否已有类似机制需要 W6 工单开工时实测确认，本报告未验证）。

**deep research 作为场景注册表一个场景声明能否成立**：**可以成立，但有前置条件**。场景定义需要：
- 触发条件：用户在案件文件夹内提出需要外部信息验证的问题（如"这个条款现在还合规吗""对方公司有没有涉诉记录"）。
- 工具集：`web-search`（C 级，`docs/20` 已定位为 tools 层普通工具）+ `cite-check`（需要先扩展到法律信源，见 5.2 第 2 点）+ 现有主体核验工具（S3 已有）。
- 产出 schema：复用 `RiskList` 或新增一个"调查简报"artifact，字段上必须携带 `SourceAnchor` 与信源等级标签，走 `RevisionEvent` 记录律师的确认/否决。
- **前置依赖**：`retrievalPolicy` 字段（`docs/20` 标注为"注册表 v2，MVP 后"）必须先落地，否则这个场景没有地方声明"C 级信源可以进正文但必须强制标注"这条规则，会被迫在 core 或场景执行器里写临时特判，违反"core 不写场景特判检索逻辑"的既有决定。**建议**：如果 deep research 场景要提前于注册表 v2 排期，`retrievalPolicy` 字段需要连带提前，不能拆开做。
- 终止条件、确认节点粒度、报告模板三处仍需按 5.2 单独设计，不能沿用别的场景的默认值。

**与 core 事件流/确认节点如何对接**：deep research 的"迭代检索循环"在事件流上应该表现为一串可观测的 tool-call 事件（web-search 调用、cite-check 调用），场景执行器编排到"认为信息充分"（终止条件达成）后停在确认节点，等待律师对"调查简报"artifact 做确认/修正，修正记录进 `RevisionEvent`——这条路径和 S3 合同审查现有设计（风险清单 artifact → 修订指令集）结构一致，不需要为 deep research 单独发明一套事件流协议，只需要新增对应的 artifact schema 与场景声明文件。

---

## 6. 必须自研清单（本报告新增，供后续工单参考）

1. 法律信源白名单/分级映射规则与数据（区别于通用域名信誉打分）。
2. `packages/tools` 引用校验工具对接北大法宝/裁判文书网等真实法律库（当前 W5 范围是否覆盖需要在该层 SPEC 明确 TODO）。
3. 场景声明里的法律语义化终止条件设计（逐场景，不通用）。
4. 留人确认节点插入颗粒度的产品设计（逐场景）。
5. 法律文书风格的调查报告模板（信源等级角标 + 条文/判例引用格式 + 事实/意见分层），接入 `packages/output`。
6. 法律垂类 deep research 评测数据（法条引用正确率、类案检索召回率），并入 W7 eval 集，通用 DeepResearch Bench 之类的评测集不覆盖中文法律场景。

---

## 7. 来源清单

### 主流范式（闭源）
- [Deep Research System Card - OpenAI](https://cdn.openai.com/deep-research-system-card.pdf)
- [OpenAI Deep Research - Emergent Mind](https://www.emergentmind.com/topics/openai-deep-research)
- [How we built our multi-agent research system - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Use research on Claude - Claude Help Center](https://support.claude.com/en/articles/11088861-use-research-on-claude)
- [Citations - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/citations)
- [Build with Gemini Deep Research - Google](https://blog.google/technology/developers/deep-research-agent-gemini-api/)
- [Gemini Deep Research Agent - Google AI for Developers](https://ai.google.dev/gemini-api/docs/interactions/deep-research)
- [Deep Research Max: a step change for autonomous research agents - Google](https://blog.google/innovation-and-ai/models-and-research/gemini-models/next-generation-gemini-deep-research/)

### 开源实现
- [GitHub - assafelovic/gpt-researcher](https://github.com/assafelovic/gpt-researcher)
- [GitHub - langchain-ai/open_deep_research](https://github.com/langchain-ai/open_deep_research)
- [Open Deep Research - LangChain blog](https://www.langchain.com/blog/open-deep-research)
- [Langchain Open Deep Research Internals - architecture guide](https://www.bolshchikov.com/p/open-deep-research-internals-a-step)
- [GitHub - stanford-oval/storm](https://github.com/stanford-oval/storm)
- [GitHub - huggingface/smolagents](https://github.com/huggingface/smolagents)
- [smolagents open_deep_research example](https://github.com/huggingface/smolagents/tree/main/examples/open_deep_research)
- [GitHub - bytedance/deer-flow](https://github.com/bytedance/deer-flow)
- [DeerFlow Deep Dive: Managing Long-Running Autonomous Tasks](https://www.sitepoint.com/deerflow-deep-dive-managing-longrunning-autonomous-tasks/)
- [GitHub - jina-ai/node-DeepResearch](https://github.com/jina-ai/node-DeepResearch)
- [A Practical Guide to Implementing DeepSearch/DeepResearch - Jina AI](https://jina.ai/news/a-practical-guide-to-implementing-deepsearch-deepresearch/)
- [GitHub - dzhng/deep-research](https://github.com/dzhng/deep-research)
- [GitHub - u14app/deep-research](https://github.com/u14app/deep-research)
- [GitHub - DavidZWZ/Awesome-Deep-Research](https://github.com/DavidZWZ/Awesome-Deep-Research)
- [2026年3月更新｜字节DeerFlow 2.0 深度解析 - 知乎](https://zhuanlan.zhihu.com/p/2023363357256819250)
- [2025年多款Deep Research智能体框架全面对比 - 知乎](https://zhuanlan.zhihu.com/p/1930636757759656448)

### 长任务 loop engineering
- [Agent Design Patterns: ReAct, Reflexion, Plan-and-Execute - Inductivee](https://inductivee.com/blog/autonomous-agent-design-patterns)
- [ReAct vs Plan-and-Execute vs ReWOO vs Reflexion](https://theaiengineer.substack.com/p/the-4-single-agent-patterns)
- [TodoWrite vs Task in Claude Code](https://www.aibuilderclub.com/blog/claude-code-todowrite-vs-task)
- [Todo Lists - Claude Code Docs](https://code.claude.com/docs/en/agent-sdk/todo-tracking)
- [Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems](https://arxiv.org/html/2604.14228v1)
- [AI Agent Context Compression: Strategies for Long-Running Sessions - Zylos Research](https://zylos.ai/research/2026-02-28-ai-agent-context-compression-strategies/)
- [Context Window Management and Session Lifecycle for Long-Running AI Agents - Zylos Research](https://zylos.ai/research/2026-03-31-context-window-management-session-lifecycle-long-running-agents/)
- [Interrupts - LangChain Docs](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [LangGraph 201: Adding Human Oversight to Your Deep Research Agent](https://towardsdatascience.com/langgraph-201-adding-human-oversight-to-your-deep-research-agent/)

### Multi-agent 编排
- [How we built our multi-agent research system - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)（同上，编排核心依据）
- [Single-Agent vs Multi-Agent AI: When to Scale Your Dev Workflow - Augment Code](https://www.augmentcode.com/guides/single-agent-vs-multi-agent-ai)
- [Multi-Agent Orchestration: A Practical Architecture Without the Buzzwords - Augment Code](https://www.augmentcode.com/guides/multi-agent-orchestration-architecture-guide)

### 法律垂类适配
- [What to Know Before Adopting AI for Case Law Research - Harvey](https://www.harvey.ai/blog/ai-for-case-law-research)
- [CoCounsel Legal – Reimagined - Thomson Reuters Institute](https://www.thomsonreuters.com/en-us/posts/innovation/cocounsel-legal-reimagined/)
- [Does Harvey AI Hallucinate? What the Tests Show - AI Vortex](https://www.aivortex.io/legal/ai-tools/does-harvey-ai-hallucinate/)
- [AI on Trial: Legal Models Hallucinate in 1 out of 6 (or More) - Stanford HAI](https://hai.stanford.edu/news/ai-trial-legal-models-hallucinate-1-out-6-or-more-benchmarking-queries)
- [What the Science Says About Hallucinations in Legal Research - AI Law Librarians](https://www.ailawlibrarians.com/2026/02/19/what-the-science-says-about-hallucinations-in-legal-research/)
- [Citation Grounding: Detecting and Reducing LLM Citation Hallucinations via Legal Citation Graphs](https://arxiv.org/pdf/2606.00898)
- [Who Checks the Citations? Benchmarking Legal Hallucination Detection](https://arxiv.org/pdf/2606.21155)
- [北大法宝法律检索系统（V6.0智能版）介绍](https://library.zuel.edu.cn/_upload/article/files/16/da/a36893834ff8978060d5256a93b8/e444deee-233f-42a7-a186-890315cc285f.pdf)
- [A Self-Evolving Agent for Legal Case Retrieval - ACL 2026 Findings](https://aclanthology.org/2026.findings-acl.2152.pdf)
- [Large Language Models Meet Legal Artificial Intelligence: A Survey](https://arxiv.org/pdf/2509.09969)

### 评测基准
- [GitHub - Ayanami0730/deep_research_bench](https://github.com/Ayanami0730/deep_research_bench)
- [DeepResearch Bench: A Comprehensive Benchmark for Deep Research Agents](https://deepresearch-bench.github.io/)
- [FinDeepResearch: Evaluating Deep Research Agents in Rigorous Financial Analysis](https://arxiv.org/html/2510.13936)
- [DEER: A Benchmark for Evaluating Deep Research Agents on Expert Report Generation](https://arxiv.org/pdf/2512.17776)

---

**免责声明**：本报告基于 2026 年 7 月调研时点的公开信息（官方博客、GitHub 仓库、第三方分析文章），部分开源项目 star 数/维护状态为近似值，实际引入前建议对拟采用的具体项目重新核实 license 与最新提交记录；闭源产品（OpenAI/Google Deep Research）架构描述均来自第三方分析与官方系统卡，非源码级验证。
