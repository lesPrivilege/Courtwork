# 调研:长任务续行与记忆蒸馏跨行业核查(2026-08-06 抓取)

调研专员单次调研件,只读现行文档与源码、只写本文件,不改任何现行文档、不碰源码、不派实现。

**抓取日期**:本文全部网络证据抓取于 2026-08-06(北京时间不详,以 UTC 请求时刻为准,下不再逐条重复);仓内证据坐标锚定当日仓库 HEAD。

**证据分级**:
- **一手**:官方文档原文、官方仓 changelog/源码直读、node_modules 内 pinned 包源码直读、npm registry 直查。
- **转述**:第三方博客、社区讨论、changelog 之外的间接陈述,或官方页面里对另一功能的旁引(未逐句正面展开)。
- **推测**:无直接证据、基于结构合理性的推断——本文出现处均显式标注「推测」,不作为结论支撑。

---

## A. 仓内召回

### A.1 已有结论清单(按来源分组,一手/仓内证据)

**ADR-013(chat 会话与记忆)**:session 按连续性窗口(≤1 小时)自动划界;memory 定性为可撤销、可审计的系统缓存层,写入在 API 请求完成时蒸馏;用户面仅「查看＋一键清除」;Work 明确不复用 chat memory 语义,续行真源是声明式投影锚点。

**ADR-021(卷宗工作语义层)**:供给者闭集四类(卷内文件/历史输入蒸馏/系统锚点/垂类声明段);蒸馏产物落为「工作语义笔记本」,收割输入是冻结的 `sourceCut→frozenCut` 区间,已被前轮覆盖的切片必须显式排除(决定二细化);**蒸馏触发闭集 v1 只三条**(descriptor 首读／水位 ask-user／用户显式),**明确拒绝**每 N turn、idle timer、后台 worker、静默逐出;DeepSeek 无精确 cache TTL,故热/冷只作实验 hit/miss 判据、不做运行时触发条件;单一 compiler ＋ 两个显式 Work adapter(决定三);上下文预算走版本化 `ModelContextProfile`、fail-closed(决定四);三道工程门含尾窗预算参照 opencode/pi(决定六);**OSS 裁定**:`pi-observational-memory` **不直接依赖**(会引入第二份 session 真源),只借四项机制(append-only ledger、`coversUpToId`/切点水位、带来源 ID 的 observation/reflection、确定性 fold/render)。

**ADR-022(pi lane)**:决定四——pi lane 会话落卷宗容器内独立分区,格式从 pi 原生 journal,不写入场景线 Turn journal/确认账本;2026-07-28 窄修订后物理落点固定为 `app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl` 与 `app_data_dir()/pi-workspaces/<containerId>/<sessionId>/`,均随 container 整删。六-0——当期里程碑薄度判据:**最多 12 个 assistant turn**(`maxTurns` 整数 `1..12`)、单次 prompt/workspace text 各不超过 **131,072 UTF-8 bytes**、模型工具固定 `read/glob/grep/write` 四件、v1 product system prompt 上限 2,048 bytes/六条语义。六-C——**workspace 继承裁定**:`/workspace` 物理落点固定按 `(containerId, sessionId)`,**新 session 初始为空**,是过程 artifact 而非用户原件/工作稿/产出;workspace 内容要进入用户「工作稿」须等垂类修订/晋升契约(当期未实现)。

**ADR-015(垂类可选加载)**:matter 级规范文件(如 `场景规范.md`)是通用 agent 的一等**模型输入**,起手读取、跨 session 遵循,但**不属系统契约**——系统只保证读取次序与原件只读边界,不赋予 schema 效力、不据其裁决;与包注册的声明式场景分属两层。prompt 空间零泄漏:未加载垂类即零垂类语义入 prompt。**同日方向登记**:DeepSeek response-format API 兼容评估已入实现就绪图「需要实测」清单(`docs/architecture/implementation-readiness.md:487`),要求「带 key 的一手 API 实测」——本报告 B.1 节是该行的**源码层**补充证据,不替代该行仍待完成的真 key 实测。

**`benchmark-openwork-2026-07-26.md`**:OpenWork 的 agent loop 100% 外包给 opencode;三项真空白之一是「忙碌时消息排队/steer」,已转化为 `CHAT-QUEUE-1`(排队发送、不 steer,S3 场景禁 steer 既有裁定不变)——这是本仓自身的 loop-continuation 相邻缺口,与「长任务跨 session 记忆蒸馏」是两个不同问题维度。

**`research-2026-07-27-memory-continuation/`**:OpenClaw(缓存边界二分、两层记忆 MEMORY.md+daily notes、压缩前**自动静默** flush 致死循环事故 #54408)、pi 生态(`pi-hermes-memory` policy-only 注入、pi 官方 `handoff.ts` 锚最近 compaction 做增量提取+预填用户确认、`pi-observational-memory` 压缩前预蒸馏、`pi-rewind` git-refs 快照**不采纳**)、Hermes 本体(session-start 冻结快照、双通道写入+后台 flush agent、三阶段有损压缩、Curator 双阈值、硬底线黑名单不可被 `--yolo` 绕过、事故 #2670 并发覆盖与 #3059 重复 flush)——**全部已消费入 ADR-021**,加固三条＋反例实证一条＋新输入一条＋深读清单+1＋显式不采纳两条均已落痕。

**`research-2026-07-27-parallel-survey/`**:opencode 三题(权限归一化可借形/默认不借;工具结果四态机可借形;abort/steer——**服务端无队列无 steer**,排队是客户端特性,中断保留封口不回滚);`claims-timeliness-audit.md` 核实 DeepSeek 缓存四前提(自动启用无显式 breakpoint、无精确 TTL「几小时到几天」best-effort、前缀以 prefix unit 为粒度、usage 暴露 hit/miss 分列)与 `deepseek-chat`/`deepseek-reasoner` 已于 2026-07-24 弃用转为 `v4-flash`/`v4-pro` 别名。

### A.2 已调研过、勿重研边界

以下对象已有明确消费裁定(见上),本报告**不重新论证**,仅在 Part C 对照新增的「12 回合硬顶」与「workspace 不跨 session 继承」两条裁定时简短复用其结论坐标:OpenClaw、Hermes(NousResearch/hermes-agent)、`pi-hermes-memory`、pi 官方 `handoff.ts`、`pi-observational-memory`、`pi-rewind`、`ArtemisAI/pi-mem`(license 红线)、opencode/pi compaction 内部机制(`PRUNE_PROTECT`/`hidden`/`previousSummary`,`keepRecentTokens`/`reserveTokens`/`firstKeptEntryId`)、Claude Code `/compact` 自认大请求、MemGPT/Letta v1 自我 reframe、opencode abort/steer 语义、DeepSeek KV cache 四前提。

---

## B. 三枚宣称一手核实

### B.1 · 仓内 pinned 的 pi 栈是否支持 DeepSeek response-format/结构化输出

**版本坐标(一手,仓内直读)**:`packages/pi-lane/package.json:28-29` pin 死 `@earendil-works/pi-agent-core@0.82.1` 与 `@earendil-works/pi-ai@0.82.1`;实际安装于 `node_modules/.pnpm/@earendil-works+pi-ai@0.82.1_.../dist/`。

**API 面(一手,源码直读)**:DeepSeek provider(`providers/deepseek.js:5-14`)只是对 `openAICompletionsApi()` 的极薄包装,`baseUrl` 硬编码 `"https://api.deepseek.com"`(非 `/beta`)。对 `dist/` 全量 grep `response_format` **零命中**——本仓 pinned 版本任何 provider 的请求构造函数(`api/openai-completions.js` 的 `buildParams()`,已逐行读毕)都不设置该字段。真正存在的结构化能力是**工具调用级**「constrained sampling」:`Tool.constrainedSampling?: false | {type:"json_schema", strict:"prefer"|"require"} | {type:"grammar", variants}`(`dist/types.d.ts:339-351`),经 `resolveJsonSchemaStrictSampling`/`resolveGrammarConstrainedSampling`(`api/constrained-sampling.js`)映射为 OpenAI 工具 schema 的 `strict:true` 或自定义 grammar 工具。该能力是否对某 provider 生效,取决于 `compat.supportsStrictMode`;DeepSeek 未被列入 `detectCompat()` 的排除集合(`isMoonshot|isTogether|isCloudflareAiGateway|isNvidia`),因此按**通用启发式默认值**得到 `supportsStrictMode:true`——这不是针对 DeepSeek 的专门验证路径。

**上游一手佐证(2026-08-06 抓取 `raw.githubusercontent.com/earendil-works/pi/main/packages/ai/CHANGELOG.md`)**:`[0.82.0] - 2026-07-24` 条目原文——"Added `Tool.constrainedSampling`...enforcing provider-side constrained tool sampling across **OpenAI, Anthropic, Amazon Bedrock, Google Gemini, and Mistral**"——**DeepSeek 未在此列**。全 CHANGELOG 逐版检索,DeepSeek 相关条目全部关于 reasoning/thinking 格式兼容、定价与 prompt-cache 字段,无一涉及 `response_format` 或结构化输出。

**与 DeepSeek 官方文档交叉核实(一手,2026-08-06 抓取 `api-docs.deepseek.com`)**:①`guides/json_mode` 的 `response_format:{'type':'json_object'}` 是较老的非 schema 约束基础 JSON 模式,pinned 栈未接入。②`guides/tool_calls` 的 `strict` 模式(Beta)**明确要求** `base_url="https://api.deepseek.com/beta"` 才生效——而 pi-ai 的 DeepSeek provider 固定走非-beta base URL。**这是一处一手核实到的具体缺口**:即便本仓某工具设了 `constrainedSampling:{type:"json_schema"}`,经 pinned 栈发出的请求也不会命中 DeepSeek 真正实现 `strict` 校验的端点,实际行为(是否报错、是否静默降级为非严格)未经真 key 实测确认,不可从源码单独推断。

**上游最新版本(一手,2026-08-06 查 npm dist-tags)**:`pi-ai` 与 `pi-agent-core` 当前 `latest` 均为 **0.83.0**(2026-07-29),较 pinned `0.82.1`(2026-07-25)领先一个 patch 版本;`[0.83.0]` 与 `[Unreleased]` 两段 CHANGELOG 均**无** response_format 相关新增,也未把 DeepSeek 加入 constrained-sampling 已验证 provider 名单。**结论:pinned 版不支持,上游最新版同样不支持**,版本差仅四天、内容与本题无关(OAuth/Copilot/审计相关修复)。

### B.2 · DeepSeek 官方 API 是否提供内置 web fetch/检索类 server-side 工具

**一手确认(2026-08-06 抓取 `api-docs.deepseek.com/guides/responses_api`)**:DeepSeek 新上线的 **Responses API**(`client.responses.create(...)`,当前**仅 `deepseek-v4-flash` 支持**,`deepseek-v4-pro` 页面自称"early August 2026"跟进)提供工具 **`web_search` / `web_search_2025_08_26`**:「Supported, executed on the server side. `search_context_size` and `user_location` are ignored」——两个参数被接受但**无效果**,仅为兼容 OpenAI 客户端形状。`tool_choice` 可显式指定 `{"type":"web_search"}`;streaming 事件含 `response.web_search_call.{in_progress,searching,completed}`;input item 类型 `web_search_call` 支持原样回传由服务端自动还原检索结果。

**限制(一手)**:该工具**不经**本仓 pi-ai 当前实际使用的 Chat Completions 路径(`openai-completions.js`/`openAICompletionsApi()`)——DeepSeek provider 注册在 `providers/deepseek.js` 里走的正是 Chat Completions,而非 pi-ai 另有的 `api/openai-responses.js` Responses 变体。换言之,**该内置工具当前不可经本仓 pi lane 现有 wiring 触达**,即便未来接入也仅限 `deepseek-v4-flash`。

**计费与限制(未考)**:`quick_start/pricing` 页(2026-08-06 抓取)只列两模型的输入/输出/缓存每 token 单价,**未见 `web_search` 独立计费行**;`quick_start/rate_limit` 页本次**未查**,是否对 `web_search` 有独立限流未知。按纪律记「未考」,不推断其免费或同价。

**上线时点(一手,部分未考)**:`updates` 变更日志(2026-08-06 抓取)2026-07-31 条目称「V4-Flash natively supports the Responses API format and is specifically adapted for Codex」,把 Responses API 整体上线与该日期绑定;但该日志**未逐项列出 `web_search` 工具本身的独立上线时点**,此处记「未考」。

### B.3 · OpenAI Codex CLI 是否已支持「从同目录 session 蒸馏项目记忆」

**一手确认(2026-08-06 抓取 `learn.chatgpt.com/codex/customization/memories`,canonical `docs/customization/memories`)**:功能名 **Memories**,配置项 `[features] memories = true`(默认关闭)。机制原文:「Codex can turn useful context from eligible prior chats into local memory files」,存储于 `~/.codex/memories/`(含 summaries、durable entries、recent inputs、supporting evidence)。**触发时机非即时**:「Codex skips active or short-lived sessions...updates memories in the background instead of immediately at the end of every chat...waits until a chat has been idle long enough」——即**后台、闲置触发**,并在 rate-limit 余量低于阈值时跳过本轮生成(`memories.min_rate_limit_remaining_percent`)。可配置项还含 `generate_memories`/`use_memories`/`disable_on_external_context`(用了 MCP/web-search/tool-search 的对话可排除出记忆生成)/`extract_model`/`consolidation_model`(抽取与全局合并可分别配模型)。

**版本/时点(一手,2026-08-06 抓取 `learn.chatgpt.com/codex/changelog`)**:`Codex CLI 0.145.0`(2026-07-21)条目——「Added experimental paginated thread history with efficient resume, search, persisted names, sub-agent support, **and memories**」(PR #33364 等);同版本「Expanded `/import` to migrate...**project-scoped memories**」(PR #31672 等);逐行提交列表另见「Stabilize the memories feature flag」(PR #31804)。即该功能截至抓取日约两周前刚从实验标记转向「稳定化」。

**精度边界(一手部分＋转述)**:Memories 主文档正文本身**未逐句自证** `~/.codex/memories/` 内部按项目目录切分的具体键——该「project-scoped」措辞出现在 `/import` 迁移语境(PR #31672 等),是**部分二手佐证**而非本功能自身页面的正面陈述,故不拔高为完全一手确认的「严格按同目录分区」;但功能存在性、触发机制、可配置面均为一手确认。

**相邻但不同的功能(一手,避免混淆)**:同一 Customization 分组下的 **Chronicle** 是**仅 macOS + ChatGPT Pro 的 opt-in research preview**,靠周期性屏幕截图(非会话 transcript)构建记忆,官方自陈「increases risk of prompt injection」且「stores memories unencrypted」,存储于 `$CODEX_HOME/memories_extensions/chronicle/`——这是与「同目录 session 蒸馏」不同的另一路输入(屏幕上下文),不应与 Memories 混同引用。

---

## C. 开源方案消化:长任务续行/记忆蒸馏 三选一对照

前提(与任务口径一致):Courtwork 的 work 场景语义(12 回合硬顶、单容器授权根、matter 级规范文件)比通用 coding agent 更结构化确定,故多数面向「几十/上百轮编码会话」设计的机制在当期规模下**问题尚未出现**,不构成「该补课」的证据。

| 方案(来源,抓取/核实日) | 机制一句话 | 三选一 | 对照理由 |
|---|---|---|---|
| Claude Code Auto Memory(`code.claude.com/docs/en/memory`,2026-08-06) | 按 git repo 分区的 `MEMORY.md` 索引＋主题文件,模型在会话进行中自行判定是否记忆,**默认开启**,明文 markdown | **我们已有更强** | ADR-021 笔记本走 CAS＋事件账本＋来源冲突 manifest＋版本化预算＋fail-closed,均严于对方无确认账本的明文写入;其「索引封顶+溢出主题文件按需加载」的信息架构本身可借形,但只是呈现层,不改变上述判定 |
| Claude Code「Resume from a summary」(同上) | 会话闲置 >1 小时且 >10 万 token 时,弹窗三选一(摘要续行/原样续行/不再问),**用户显式选择**而非静默 | **可借形** | 与 ADR-021「无自动静默蒸馏,水位建议经 ask-user」的裁量同构;可作未来若 12 回合硬顶松绑后「大历史跨会话续行」场景的选择面参照,当期硬顶下无触发场景,零实现动作 |
| OpenAI Codex Memories 触发机制(`learn.chatgpt.com/codex/customization/memories`,2026-08-06) | 会话结束后台、闲置触发,**默认关闭** | **不适用** | 闲置/后台静默触发与决定二细化「明确拒绝每 N turn、idle timer、后台 worker、静默逐出」直接相冲,不可径借 |
| ——同功能的配额感知子机制 | `min_rate_limit_remaining_percent`:配额不足自动跳过本轮蒸馏 | **可借形** | 是 RuntimeGuard 当前没有的独立子机制(蒸馏尝试按预算余量门控),与触发时机裁定无关,可单独借形登记为未来实现选项 |
| OpenAI Codex Chronicle(`learn.chatgpt.com/codex/customization/chronicle`,2026-08-06) | 屏幕截图驱动记忆生成,官方自陈明文存储、抬升 prompt 注入风险,仅 macOS/Pro 预览 | **不适用** | 与「密钥/案件内容不落地」「fail-closed 零容忍」直接冲突;官方自陈的风险恰可作反面语料 |
| `pi-observational-memory`(已入 ADR-021 深读清单) | `turn_end`/`agent_end` 压缩前预蒸馏,目标「压缩时几乎无感」 | **不适用** | ADR-021 已裁「不直接依赖」(会引入第二份 session 真源);12 回合硬顶下问题规模(其设计针对几十/上百轮)与当期场景不匹配,即便硬顶未来松绑也需重新独立评估,不自动继承本次结论 |
| Hermes / pi 官方 `handoff.ts`(已入 ADR-021) | session-start 冻结快照;锚最近压缩点增量提取＋预填留人确认 | **我们已有更强** | ADR-022 决定四＋六-C(journal/workspace 物理隔离、新 session 初始为空)与 `handoff.ts`「一次性脚本、预填留人」同构,但多了 CAS、账本与 container 隔离,已是更强形态 |
| opencode/pi compaction 内部机制(`PRUNE_PROTECT`/`keepRecentTokens` 等,已入 ADR-021 决定六) | 滑动尾窗＋增量摘要,面向几十/上百轮编码会话的溢出问题 | **不适用** | 12 回合硬顶下单次 prompt/workspace 规模远低于其设计场景,当期不存在需要压缩的问题;若硬顶未来松绑需重新评估,不预先采纳 |
| MemGPT/Letta v1 自我 reframe(已入 ADR-021 反向证据) | 全量重框架记忆管理 | **不适用** | 已有反向证据(官方自我减法),重申维持 |
| Claude Code `CLAUDE.md` 目录树发现＋`.claude/rules/` 路径作用域(`code.claude.com/docs/en/memory`,2026-08-06) | 沿目录树向上多文件拼接,规则可按 glob 路径条件加载 | **可借形** | 对照 ADR-015 单一 matter 级 `场景规范.md`:路径作用域条件加载是当期没有的形态,可作未来 matter 内文件规模增长后的参照,当期零实现动作、不扩大决定二的供给者闭集 |
| Codex `#29870`「bounded AGENTS.md and Git root probes」(`learn.chatgpt.com/codex/changelog`,2026-08-06) | 限界目录树探测深度,防止无界向上扫描 | **我们已有更强** | matter 根是固定已知点,`场景规范.md` 不做目录树上溯,天然不存在这一类无界扫描面,无需借鉴其补丁思路 |

**三选一统计**(11 条判定,一条方案拆两条子判定):可借形 3、不适用 5、我们已有更强 3。

---

## 架构可裁决问题(至多三条,不给实现建议)

1. **DeepSeek `/beta` 端点依赖取舍**:pi-ai@0.82.1 的 DeepSeek provider 固定走非-beta base URL,而 DeepSeek 官方要求 `/beta` 才启用工具 `strict` 结构化输出,且 pi-ai 官方 changelog 未把 DeepSeek 列入其验证过的 provider 名单。若 ADR-016 填格协议或 ADR-021 蒸馏未来经 pi lane 消费 DeepSeek 结构化输出,是否需要先立项核实 `/beta` 端点的生产可用性与条款,还是明确维持现状(只走 Chat Completions、结构化约束完全靠己方 parse,不依赖上游 `strict`)?

2. **DeepSeek 内置 `web_search` 是否值得追加评估**:该工具现仅通过 Responses API 触达、仅 `deepseek-v4-flash` 支持,且不经本仓 pi-ai 当前使用的 Chat Completions 路径;ADR-022 六-0 当期工具集固定 `read/glob/grep/write`、不含检索。是否需要把「DeepSeek 内置 web_search 可用性/计费/限流」加入 `docs/architecture/implementation-readiness.md`「需要实测」清单单独一行,还是维持现状不予登记(因面向的 wire 版本与当期不同)?

3. **同赛道对照是否需要留痕**:Claude Code Auto Memory(默认开)与 OpenAI Codex Memories(默认关)均为「会话中或闲置后台静默触发、无显式确认账本、明文本地存储」的项目记忆蒸馏,均不满足决定二细化「无自动静默蒸馏」的门槛,本次核实未发现同赛道任何一家给出比 ask-user 更强的确认机制。是否需要在 ADR-021「已决项回执」之外新增一条「2026-08 同赛道复核,裁决未变」的时效性留痕,以便未来被外部对标质疑时有正面回应坐标,还是维持现状、只让本报告作为归档件存在?

---

## 附:归档索引条目草稿(照 `archive/README.md`「条目体例」七格,SHA 待入仓提交,不编造)

### `research-loop-continuation-2026-08-06.md`

- **票号／事件名**:长任务续行与记忆蒸馏跨行业核查(pi 栈结构化输出缺口／DeepSeek 内置工具／Codex 项目记忆三枚一手核实批)。
- **起讫**:2026-08-06 → 2026-08-06(一次性调研,当日写就即归档)。
- **SHA**:实现／验收／合入 无(调研件);入仓 **待入仓提交**。
- **本件证明什么**:三枚一手核实——①pinned `pi-ai/pi-agent-core@0.82.1` 无 `response_format`,DeepSeek 未入官方 constrained-sampling 验证名单,且 DeepSeek `strict` 工具模式仅在 `/beta` base URL 生效而 pinned 栈未接;②DeepSeek Responses API 已上线 server-side `web_search`(仅 v4-flash,不经本仓当前 wire);③OpenAI Codex CLI 0.145.0 起已有 `Memories`(后台闲置触发、配额感知跳过)与独立的 `Chronicle`(屏幕上下文,research preview)两条不同机制。另对 Claude Code/Codex/pi 生态十一项长任务续行与记忆蒸馏方案逐条对照 ADR-021/ADR-022/ADR-015 现行裁定,标可借形(3)/不适用(5)/我们已有更强(3),均未推翻现行裁定。
- **归档类别**:事件闭合(单次调研事件已完成;是否被吸收待架构复核)。
- **现行真值继承者**:吸收前仍只认 `docs/decisions/ADR-021-dossier-work-semantics.md`、`docs/decisions/ADR-022-pi-lane.md`、`docs/decisions/ADR-015-optional-vertical-loading.md` 本体与 `docs/status/current.md`;`docs/architecture/implementation-readiness.md:487`(DeepSeek response-format「需要实测」行)本件只补源码层证据,不替代该行仍待完成的真 key 一手实测。
- **已知失效点**:所核 npm 版本(`pi-ai`/`pi-agent-core` 均 `0.83.0`,2026-07-29)、DeepSeek changelog(截至 2026-07-31)、Codex CLI changelog(截至 0.145.0/2026-07-21)均为抓取日坐标,随上游发版折旧;DeepSeek `web_search` 工具的计费与限流细节、Codex Memories 是否严格按目录分区两点本件明确记「未考/部分二手佐证」,不得据此拔高或恢复为确定事实。
