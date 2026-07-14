# 调研 F：DeepSeek 计费口径与 usage ledger 字段形状

- 调研范围：`packages/provider` 当期唯一 DeepSeek profile 的 usage/计费语义。
- 抓取日期：**2026-07-14**（等同今天，报告内所有标 ✓ 的数字均为本次实抓）。
- 置信度标注：✓ = 官方一手文档实抓；✓(三方) = 可信第三方来源，非 DeepSeek 官方原文；※ = 训练语料记忆，仅在实抓失败时使用（本报告未出现需要 ※ 的情况，唯一的例外见第 3 节的"未能核实"标注）；**未能核实** = 明确查不到，不猜。

---

## 0. 结论先行

**能不能从 API 响应准确反推成本？——不能，且原因不是"我们还没做"，而是协议本身没给这个信息。** 具体分两层：

1. **可以做到的部分**：DeepSeek 的 `usage` 对象官方确认会分别返回 `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` / `completion_tokens_details.reasoning_tokens`（见第 2、4 节），只要把这些字段接住、配合一张带生效日期的价目表，缓存命中/未命中/推理 token 三个维度的成本是可以从 usage **准确**算出来的——前提是价目表当天有效。
2. **做不到的部分（本报告最重要的发现）**：DeepSeek 在 2026-06-29 官宣、计划 2026 年 7 月中旬（即现在）随 V4 正式版上线的**峰谷计价**（高峰时段 9-12、14-18 北京时间，价格翻倍），在官方 `usage` 响应体里**没有任何字段**标注这一笔请求实际按哪档计价。响应里唯一的时间线索是 `created`（Unix 时间戳），要用它反推峰谷档位，必须由调用方自己把 DeepSeek 的峰谷时刻表硬编码进代码——而这张时刻表本身是外部易变事实（过去 12 个月 DeepSeek 至少 4 次改变计价结构）。**只要峰谷计价生效，从 usage 算出来的成本就只能是"假设按非峰时价估算"的数字，不是账单真值**，两者可能相差 2 倍。这必须显式标注为"估算"，不能当成精确值展示。
3. **架构现状更糟一层**：本报告在读 `packages/provider` 源码时确认，**当前实现在归一化 SSE `usage` chunk 的那一步（`provider-stream.ts:129-137`）就已经把 DeepSeek 返回的 `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`/`reasoning_tokens` 全部丢弃**，只保留 `inputTokens`/`outputTokens` 两个字段（`types.ts:42,65-68`）。也就是说，即使不考虑峰谷这个"响应里天生看不出"的问题，**今天连"响应里明明写了、但我们没接住"的那部分数据也在丢**。这precisely对应 `docs/status/current.md` 架构债第 6 条"usage ledger 与真实 token/cost 投影尚未成为统一权威来源"——且证明这条债不是"尚未开始"，是"正在发生中的数据丢失"。

诚实的降级形态（对照"静默降级零容忍"）：ledger 应该把 **token 计数**当作可能残缺但绝不伪造的事实（provider 没给就是没给，不是零），把**成本**当作从 token + 价目表推出的、带版本号和假设清单的**标注估算**，两者在类型层面就要分开，不能揉成一个裸 `number` 返回给上游当真数展示。详见第 6 节。

---

## 1. DeepSeek 现行模型与定价

来源：[Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)（英文/美元）与[模型 & 价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing)（中文/人民币），✓ 官方一手，抓取于 2026-07-14。

当前在售模型只有两个，均为 1M 上下文、支持思考/非思考双模式（默认思考开启）：

| Model（API model id） | 模型版本 | 上下文 | 最大输出 | 并发上限 |
|---|---|---|---|---|
| `deepseek-v4-flash` | DeepSeek-V4-Flash | 1M | 384K | 2500 |
| `deepseek-v4-pro` | DeepSeek-V4-Pro | 1M | 384K | 500 |

**定价（美元，per 1M tokens，✓ 2026-07-14 实抓）**

| Model | 输入·缓存命中 | 输入·缓存未命中 | 输出 |
|---|---|---|---|
| deepseek-v4-flash | $0.0028 | $0.14 | $0.28 |
| deepseek-v4-pro | $0.003625 | $0.435 | $0.87 |

**定价（人民币，per 1M tokens，✓ 2026-07-14 实抓，`zh-cn` 页面）**

| Model | 输入·缓存命中 | 输入·缓存未命中 | 输出 |
|---|---|---|---|
| deepseek-v4-flash | ¥0.02 | ¥1 | ¥2 |
| deepseek-v4-pro | ¥0.025（2.5 折，原价 ¥0.1） | ¥3（2.5 折，原价 ¥12） | ¥6（2.5 折，原价 ¥24） |

两条官方脚注（直接决定这张表"现在是不是就是最终价"）：
- 全系列缓存命中价已降至首发价 1/10，自北京时间 **2026-04-26 20:15** 起生效。
- V4-Pro 的 2.5 折优惠原定北京时间 **2026-05-31 23:59** 结束，官方决定**结束后不恢复原价，直接把促销价定为正式价**（永久生效）。今天（2026-07-14）已过该日期，所以上表就是当前的正式非峰值价，不是一个即将过期的促销快照——**除非**第 3 节的峰谷加价已生效（见下）。

**旧模型别名弃用**：`deepseek-chat`/`deepseek-reasoner` 将于 **2026-07-24 15:59 UTC 停用**（距今 10 天），过渡期内分别路由到 `deepseek-v4-flash` 的非思考/思考模式。核实 `packages/provider/catalog/deepseek.json` 发现 Courtwork 的 catalog 已经直接登记 `deepseek-v4-flash`/`deepseek-v4-pro`，不依赖旧别名，**这条弃用对当前实现没有紧急影响**，只建议验收时补一条"确认无代码路径引用 `deepseek-chat`/`deepseek-reasoner`"的存在性检查。

计价单位统一为"每百万 token"，币种上 DeepSeek **同时**发布美元（国际站英文页）与人民币（`zh-cn` 页）两套价目表，二者按约 6.9 CNY/USD 内部一致换算，但**实际扣费币种取决于账户注册地/结算设置，不是请求参数，也不会出现在 API 响应里**——这是 ledger 设计要单独处理的一个"账户级事实"，见第 6、7 节。

---

## 2. 上下文缓存的计费分档

来源：[Context Caching](https://api-docs.deepseek.com/guides/kv_cache)、[Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion)，✓ 官方一手，2026-07-14。

**是否分别计价**：是。`usage` 对象官方 schema 确认字段（非流式响应体，`usage` 顶层，均为 required）：

- `prompt_tokens`：等于 `prompt_cache_hit_tokens + prompt_cache_miss_tokens`
- `prompt_cache_hit_tokens`：命中缓存的输入 token 数
- `prompt_cache_miss_tokens`：未命中缓存的输入 token 数
- `completion_tokens`、`total_tokens`
- `completion_tokens_details.reasoning_tokens`（可选嵌套，见第 4 节）

**没有** `prompt_tokens_details` 这个嵌套对象（这是 OpenAI 自己 wire 格式的命名，即 `prompt_tokens_details.cached_tokens`）。DeepSeek 用的是**扁平命名**——`prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`直接挂在 `usage` 顶层。这是一处具名 wire 差异，adapter 层要按 DeepSeek 自己的字段名解析，不能照搬 OpenAI 的嵌套形状。

**触发与失效规则**（V4 已切换到 Sliding Window Attention 架构，缓存匹配机制与 V3 时代不同，本节内容已是 V4 现状）：

- 默认对所有用户开启，无需任何请求参数，也没有文档标注的关闭方式。
- 匹配单位是离散的"cache prefix unit"，不是"前缀重叠越长命中越多"的连续计费——一次请求要么**完整命中**某个已持久化的 unit，要么完全不命中该 unit（fall back 到检测更短的公共前缀）。
- Unit 在三种情况下被持久化：①每次请求会在"用户输入结尾"和"模型输出结尾"各产生一个 unit；②系统检测到多次请求间的公共前缀后，会把该公共前缀本身持久化为一个 unit；③对很长的单次输入/输出，系统会按固定 token 间隔切出中间 unit，避免长前缀因永远够不到边界而完全不可缓存。
- Best-effort，官方原话"不保证 100% 命中率"。
- 缓存构建耗时"以秒计"，闲置后自动清除，官方原话"通常几小时到几天"——**没有固定/可预测的 TTL 数字**，不能当常量硬编码。
- **未能核实**：是否存在最短前缀长度门槛（早期 DeepSeek 文档曾有过 token 粒度的说法，但本次抓取的现行 `kv_cache` 页面全文未提及任何最小长度，且明确说明匹配机制已因 SWA 架构改变——不确定旧说法是否还适用，不引用旧说法，直接标注未能核实）。

---

## 3. 错峰折扣（本报告最重要的发现）

**先纠正一个前提**：DeepSeek **历史上**有过"错峰折扣"（旧模型时代，UTC 16:30–00:30 时段有折扣），但该机制已经**取消**——搜索确认新定价自 2025-09-05 16:00 UTC 生效时错峰折扣就已终止。所以问题原话里"错峰折扣"如果是指"非高峰更便宜"，**答案是：这个机制目前不存在**。

但 2026 年 6 月底出现了方向相反的新机制——**高峰时段加价（peak-hour surcharge）**，这是需要重点回灌的发现：

**信息来源与置信度**：官方 `api-docs.deepseek.com/quick_start/pricing`（英/中双语页面，本次 2026-07-14 实抓）**完全没有**峰谷/时段相关的表格、字段或脚注——第 1 节给出的价目表就是该页面当前的全部内容，没有第二档时段价。峰谷加价信息全部来自**新闻报道**，非官方文档页：

- ✓(三方) [South China Morning Post，2026-06-30](https://www.scmp.com/tech/big-tech/article/3358868/after-triggering-price-war-deepseek-reverses-course-surcharge-peak-hour-api-use)：DeepSeek 于周一（2026-06-29）向订阅用户发邮件通知，"高峰时段（北京时间 9am–noon 与 2pm–6pm）API 价格翻倍"，并同步在官网发布单独公告；V4-Pro 输出高峰价 ¥12/M（对比非高峰 ¥6/M），适用于所有 V4 模型；DeepSeek 给出的理由是"更好地分配资源、提升服务稳定性"。
- ✓(三方) 多家中文财经/科技媒体独立报道，数字彼此一致：[新浪财经](https://finance.sina.com.cn/stock/roll/2026-06-30/doc-inifczzw4923841.shtml)、[澎湃新闻](https://www.thepaper.cn/newsDetail_forward_33478426)、[财联社](https://www.cls.cn/detail/2412093)、[IT之家](https://www.ithome.com/0/970/123.htm)、[21世纪经济报道](https://www.stcn.com/article/detail/3988420.html)——均称"高峰时段（每日 9:00-12:00、14:00-18:00 北京时间）价格为平时 2 倍"，具体数字：

  | Model | 高峰·输入缓存命中 | 高峰·输入缓存未命中 | 高峰·输出 |
  |---|---|---|---|
  | deepseek-v4-pro | ¥0.05/M | ¥6/M | ¥12/M |
  | deepseek-v4-flash | ¥0.04/M | ¥2/M | ¥4/M |

  这组数字**精确等于**第 1 节官方页面非高峰价的 2 倍（¥0.025→0.05，¥3→6，¥6→12；¥0.02→0.04，¥1→2，¥2→4），内部自洽，可信度高。
- 公告称计划生效时间为"7 月中旬"，与 V4 从 preview 转正式版的时间点重合（`api-docs.deepseek.com/news/news260424` 标题就是"DeepSeek V4 **Preview** Release"，说明截至该新闻发布日 V4 仍是 preview 状态，转正是后续动作）。

**未能核实**：峰谷加价截至本次抓取（2026-07-14，正处于官宣的"7月中旬"窗口内）**是否已经真正生效**。官方 `api-docs.deepseek.com` 的主定价页此刻没有反映这次调整，我找不到任何一手 DeepSeek 页面把峰谷时刻表和具体倍率发布在文档里（`platform.deepseek.com/pricing` 是纯前端渲染页面，抓取工具拿不到内容，无法核实）。可能是文档滞后于已生效的政策，也可能是政策临期调整/延后——两种可能我都没有一手证据排除。

**对项目最关键的一点，无论峰谷是否已生效都成立**：官方 `usage` 响应 schema（第 2 节列出的字段）**没有任何字段**标注"这笔按哪档计价"——没有 `pricing_tier`、没有 `peak`、没有倍率标记。唯一能用的时间线索是 chat completion 对象的 `created` 字段（Unix 秒），调用方若想反推峰谷档位，必须自己维护一份 DeepSeek 峰谷时刻表并做本地时区换算——这份时刻表本身是随时可能被 DeepSeek 修改的外部事实（过去 12 个月已经从"有错峰折扣"→"取消错峰折扣"→"引入峰时加价"来回变了方向），响应本身从不自证。

**结论（对应任务原话"如果响应里看不出，那我们就无法从 usage 反推真实成本"）**：确认为真。只要峰谷计价存在且生效，从 `usage` 算出的成本天然是"假设某一档"的估算，不是账单真值，且这个估算的误差可以达到 2 倍。ledger 必须显式标注"未计入峰谷"这条假设，不能悄悄按非峰价算出一个看似精确的数字。

---

## 4. reasoning 模型的 usage 语义

来源：[Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode)、[Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion)，✓ 官方一手，2026-07-14。

V4 两个模型都是**单模型双模式**（不再是"deepseek-chat 非推理 / deepseek-reasoner 推理"两个独立模型的旧格局），由请求参数控制：

- `thinking: { type: 'enabled' | 'disabled' }`，默认 `enabled`。
- `reasoning_effort: 'high' | 'max'`：常规请求默认 `high`；部分复杂 agent 请求（如 Claude Code、OpenCode 集成）自动设为 `max`。**兼容映射**：`low`/`medium` 映射到 `high`，`xhigh` 映射到 `max`——也就是说不管上游传什么，DeepSeek 实际只有两档有效强度。Courtwork 项目的 `reasoning: 'standard' | 'deep'` 二档路由与这个二档结构天然对齐，`standard→high`、`deep→max` 是干净的映射，不需要额外档位。

**usage 里的 reasoning 字段**：非流式响应体里，`completion_tokens_details.reasoning_tokens`（可选整数），官方原文标注该对象是"Breakdown of tokens used in a completion"（completion token 的构成拆分）——按此措辞，`reasoning_tokens` 是 `completion_tokens` 的**子集**，不是额外叠加的数字。

**计费**：官方定价表只有三档单价（输入缓存命中/未命中、输出），**没有第四档"推理 token 单价"**。结合上面"reasoning_tokens 是 completion_tokens 子集"的 schema 措辞，可以推出推理 token 与可见回答内容按**同一个输出单价**计费。本报告没能在官方文档里找到一句明确写出"推理 token 按输出价计费"的原文，这一结论是**基于官方 schema 结构的推断**，另有第三方资料（[chat-deep.ai](https://chat-deep.ai/pricing/)、[morphllm.com](https://www.morphllm.com/deepseek-api)，非 DeepSeek 官方）作同样陈述，标注 ✓(三方)+schema 推断，不是逐字官方确认。

对项目"standard/deep 两档计费差别"这个具体问题的回答：**两档不改变单价**，只改变会生成多少 reasoning token（`max` 档通常生成更多推理内容）——即"deep 比 standard 贵"是**用量效应**，不是**费率效应**。这一点对成本预估很重要：不能假设 deep 档有单独更贵的单价，只能假设它平均消耗更多 token。

多轮对话细节（间接影响缓存命中率，非核心但值得记录）：两个 `user` 消息之间若模型**没有**发起 tool call，`reasoning_content` 不需要且不应该在下一轮回传（回传了也会被 API 忽略）；若模型**发起过** tool call，则该轮的 `reasoning_content` **必须**完整回传，否则触发 400 错误。这个开关不改变计费单价，但会影响后续请求能否命中缓存前缀（见第 2 节"完整匹配"规则）。

---

## 5. 流式响应里的 usage

来源：[Create Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion) 流式 schema，✓ 官方一手，2026-07-14；取消/失败部分补充 ✓(三方) 与结构推断。

**usage 何时到达、要不要显式开启**：官方原文——若设置 `stream_options: { include_usage: true }`，会在 `data: [DONE]` 之前额外插入**一个专门的 chunk**，该 chunk 的 `usage` 字段携带整次请求的完整用量统计，`choices` 字段固定为空数组；**其余所有 chunk 的 `usage` 字段都是 `null`**。不设置这个参数则全程拿不到 usage。

**核实 Courtwork 现有实现**：`stream_options: { include_usage: true }` 已经在三处请求体构造代码里正确设置——`packages/provider/src/http-client.ts:24`、`packages/provider/src/openai-compatible-provider.ts:103`、`packages/provider/src/structured-output.ts:91`。这一步**没有问题**，请求侧已经在正确索取 usage；第 0 节指出的丢数据发生在**响应解析侧**（`provider-stream.ts:129-137` 只挑了两个字段），是解析步骤的问题，不是没请求到。

**取消（cancel）时还有没有 usage**：

- DeepSeek 官方文档（FAQ、错误码、Rate Limit、ToS 逐页核对）**均未提及**取消请求的计费口径，属于**未能核实**的一手信息。
- ✓(三方) [OpenRouter 帮助文档，2026-06-14](https://openrouter.zendesk.com/hc/en-us/articles/51691588409883-How-do-I-cancel-a-streaming-request-and-which-providers-stop-billing-when-I-do)——该公司代理真实流量到多家 provider，把 DeepSeek 列入"支持取消、abort 后停止计费"的 provider 名单（与 OpenAI、Anthropic、Together、DeepInfra、xAI 同列；AWS Bedrock、Google、Groq、Mistral、Perplexity 不支持）。这是第三方运营观察，不是 DeepSeek 官方承诺。
- **协议结构性事实（高置信度，直接从上面"usage 只在终态 chunk 出现"的官方行为推出，不是 DeepSeek 特有，是这套 wire 约定的通用推论）**：既然 usage 只随最后一个 chunk（`[DONE]` 之前）送达，客户端主动 abort 连接这个动作按定义发生在收到终态 chunk **之前**——也就是说**不管 DeepSeek 服务端账不账这笔钱，被取消的请求在协议层面上就不可能把 usage 传回客户端**。这不是 DeepSeek 的怪癖，是"usage 只挂最后一帧"这类设计的通用后果。同理，请求中途失败（网络中断、5xx）也拿不到 usage，因为同样没有正常抵达终态 chunk。
- Courtwork 自身 SPEC（PROVIDER-2）已写明"取消竞态只落一个 canceled 终态"——即当前实现遇到取消时统一收敛为单一 `canceled` 事件。**未能核实**的细节：如果 `usage` chunk 恰好和取消信号同时抵达（竞态窗口极窄），当前实现是否会在坍缩为 `canceled` 之前先把已经到达的 `usage` 事件转发出去，还是直接丢弃——SPEC 原文没有精确到这个粒度，需要专门看 provider 包的取消竞态测试用例才能确认，本次调研未展开到这一层。
- **对账退路**：DeepSeek 平台提供按 API Key 维度的月度用量 CSV 导出（`platform.deepseek.com/usage` → 按月导出，FAQ 页面确认），可以作为取消/失败请求的**事后、批量、离线**对账来源，但这与 Turn Engine 的实时事件模型是两套节奏，不能假装成同步信号。

**ledger 结论**：取消与失败的 Turn，`usage` 必须记为"未知"，不能记 0，也不能用已收到的 `content_delta` 长度去估算 token 数冒充精确值——这与 `types.ts` 里 `GenerationResponse.usage` 现有的可选类型设计、以及代码注释"usage 缺失时 RuntimeGuard.checkUsd 诚实跳过，不当作零成本"的哲学完全一致，只是这个哲学目前只体现在运行时预算护栏，还没有系统性地延伸到持久化的 ledger/`PersistedTurn` 层。

---

## 6. ledger 字段形状建议

**核心设计问题的取舍**：记 token 还是记 cost？

业界三个可比方案给出的答案高度一致，都是"token 是权威事实，cost 是派生估算"：

- **OpenTelemetry GenAI 语义约定**：标准化的、稳定的字段是 `gen_ai.usage.input_tokens`/`gen_ai.usage.output_tokens`；成本（`gen_ai.usage.cost_usd`）明确不是 provider 直接给的数据，文档原话是"从你自己维护的价目表算出来，同时作为 span 属性和聚合指标发出"，并且直接给出误差量级警示——标准场景下 token 估算成本通常与真实账单相差 1%-3%，但"缓存输入 token、reasoning token、批量折扣"这几类因素会显著拉大这个误差，官方建议定期用 provider 自己的账单端点做对账。这几乎是本报告第 2、3、4 节结论的业界通用版本。
- **Langfuse**：usage 明确按 provider 实际返回的类型分别存储（`input`/`output`/`cached_tokens`/`audio_tokens`……可扩展的 key-value，不强行压成两个字段），成本在展示层单独从"模型 + usage 类型 + 生效价目表"算出，两者物理分离。
- **Helicone**：被第三方评测直接点名——它的 cost 字段"是从 token 数和公开费率算出的估算……是工程日志级别，不是能对上账单的财务级 ledger"。这句话精准描述了"看起来精确其实是猜的数字"的风险，可以直接借用来定义 Courtwork 自己要避免的反模式。

**建议的字段形状**（沿用项目已有的 `GenerationUsage`/`PersistedTurn` 词汇，示意性草图，不是最终 API）：

```ts
interface TurnUsageRecord {
  // 原始层：provider 实际报了什么就存什么，缺了就是 undefined（不是 0）
  raw?: {
    providerId: string;
    modelId: string;            // 响应里真实返回的 model 字段，不是请求时填的别名
    promptTokens?: number;
    completionTokens?: number;
    promptCacheHitTokens?: number;
    promptCacheMissTokens?: number;
    reasoningTokens?: number;
    totalTokens?: number;
  };
  // 缺失原因是一等公民，不能靠 raw === undefined 一种状态糊弄过去
  unavailableReason?: 'canceled' | 'failed_before_terminal_chunk' | 'usage_not_requested' | 'scripted_provider';

  // 估算层：从 raw + 价目表推出，类型上就标注"这是估算"，不能悄悄退化成裸 number
  costEstimate?: {
    amount: number;
    currency: 'CNY' | 'USD';
    priceTableVersion: string;      // 指向具体一版价目表快照，可回放、可审计
    assumptions: string[];          // 例如 ["cache_hit_miss_unknown_assumed_all_miss", "peak_pricing_not_modeled_assumed_off_peak"]
  };

  // 对账层：可选，事后从 provider 的月度账单/CSV 回填，与实时 ledger 解耦
  reconciledAgainstBilling?: { source: string; periodMonth: string; amount: number };
}
```

取舍说明：
- **不把 cost 固化成账本的权威数字**，理由正是任务描述里提到的——单价是外部易变事实（本报告证明 DeepSeek 一年内变了至少 4 次：2025-09 取消错峰折扣、2026-04-26 缓存命中价砍到 1/10、2026-05-31 V4-Pro 促销转永久价、2026-06-29 官宣峰谷加价），如果把某个时间点算出的 cost 直接写死存进历史记录，价目表一旦修正/回滚，历史账本就会和当时的真实账单永久对不上，且没有办法重新算。
- **token 数才是"计量事实"**，理应作为不可变的原始记录；cost 永远可以用"某个历史价目表版本 + 当时的 token 数"重新推导出来，这是"可重放"而不是"写死"。
- `priceTableVersion` + `assumptions` 两个字段直接对应本报告第 2/3/4 节暴露的三个不确定性来源（缓存档位、峰谷档位、reasoning 是否单独计费），逼着实现者在写入这条记录的时候，必须显式声明自己在哪些维度上做了简化假设，而不是让这些假设隐藏在一个函数实现细节里（这正是当前 `pricing-table.ts` 的问题——它在代码注释里诚实写了这些假设，但函数签名上完全看不出来，返回的是一个裸 `number`）。

---

## 7. provider 无关性划线

**应该住在 `packages/provider` DeepSeek profile 里的具名怪癖**：

1. 三档单价的具体数字（¥/M、USD/M、缓存命中/未命中两档单价）——这是 DeepSeek 一家的商业事实，随时会变。
2. `usage` 字段的具体命名（`prompt_cache_hit_tokens`/`prompt_cache_miss_tokens` 这种扁平命名，区别于 OpenAI 自己 `prompt_tokens_details.cached_tokens` 的嵌套命名）——wire 级别的字段名归一化，天然是 adapter 的活。
3. 峰谷时刻表本身（北京时间 9-12、14-18，2 倍倍率）——这是外部时钟表，如果未来真要做"根据请求时间猜峰谷档位"这类推断，那推断逻辑也必须整体封在 DeepSeek profile 里当作一个标了"这是猜的"的 quirk，绝不能泄漏成 core 认识的通用语义。**本报告的建议是这个推断根本不值得做**（见第 8 节），但即便要做，归属也很清楚。
4. `reasoning_effort` 的取值域（`high`/`max`）与兼容映射表（`low`/`medium`→`high`，`xhigh`→`max`），以及它和 Courtwork `standard`/`deep` 二档路由之间的映射关系。
5. `stream_options: { include_usage: true }` 这类"要不要加这个 flag 才能拿到 usage"的 wire 请求构造细节——已经正确封装在 adapter 请求体构造代码里，core 不需要也不应该知道这个 flag 的存在。
6. 旧模型别名弃用节奏（`deepseek-chat`/`deepseek-reasoner` → 2026-07-24 停用）及其到新模型 id 的映射——具体日期和别名是 DeepSeek 自己的产品节奏。

**可以进 core 的通用 usage 语义**（provider 无关，形状是骨架，具体怎么从 wire 填进去仍是 adapter 的事）：

1. **"usage 是可选的、只在终态可能携带的"这条生命周期语义**——ADR-007 已经做对：`usage` 是 `ProviderStreamEvent` 的独立事件类型，可能压根不出现。这条不依附于任何具体 provider。
2. **"输入 / 输出 / 推理（若有）/ 缓存命中（若有）/ 缓存未命中（若有）"这一组可选字段的骨架**——不是 DeepSeek 独有概念：归档调研（`archive/docs-legacy-2026-07-13/docs/18-调研报告-provider接口与兼容策略.md`）已经记录 Kimi、豆包都有类似"自动/显式上下文缓存"机制，多数主流 provider 都有某种缓存命中折扣与推理 token 拆分，只是字段名不同。把"provider 可能会告诉我们这几类 token 数"当作 core 认识的通用可选骨架，属于合理的抽象层级；具体从哪个 wire 字段名解析出这些槽位，仍完全留给各 provider profile。
3. **"cost 从来不是 wire 直接给的权威数字，只能从 token + 价目表推出"这条通用原则**——换成任何一家 provider 都成立（连 OpenAI 自己的账单币种也不会出现在 chat completion 响应里），不是 DeepSeek 特有。
4. **"usage 缺失 ≠ 成本为零"这条不变量**——这本质是 Courtwork"静默降级零容忍"总纲在 usage 语义上的具体化，理应是 provider 无关的 core 级不变量，现状是这条原则已经体现在 `packages/provider/src/types.ts` 的注释和可选类型设计里，但还只是一处代码注释级别的约定，没有上升成 ADR 条款或贯穿到持久层。
5. **带生效日期区间的价目表这个"形状"**（不是表里的数字）——"价格会变，所以要有版本"是所有 provider 的共性，用 `priceTableVersion`/生效区间做价目表是通用设计模式。

**已经在代码里发现的、具体违反上述划线的点**（可直接作为回灌动作，见第 8 节）：

- `packages/provider/src/types.ts:42` 与 `:65-68` 的 `ProviderStreamEvent`/`GenerationUsage` 目前只有 `inputTokens`/`outputTokens` 两个字段，在 `packages/provider/src/provider-stream.ts:129-137` 归一化 SSE `usage` chunk 那一步就把 DeepSeek 实际返回的 `prompt_cache_hit_tokens`/`prompt_cache_miss_tokens`/`completion_tokens_details.reasoning_tokens` 丢弃——`http-client.ts:32,181`、`openai-compatible-provider.ts:115`、`scripted-provider.ts:45` 各自独立复刻了同样的两字段窄化。这几个字段按第 7 节的划线全部属于"可以进 core 的通用骨架"，修复不违反 provider 无关性，只是把骨架的可选字段补全、adapter 侧把已经解析出来但没往下传的字段接上。

---

## 8. 回灌建议

以下结论建议回灌 ADR-007 / `packages/provider/SPEC.md` / `docs/status/current.md`，本报告本身不裁定架构，只列出需要决策的点：

1. **`docs/status/current.md` 架构债第 6 条**建议从"尚未成为统一权威来源"细化为可验收的具体缺口清单：(a) cache-hit/cache-miss 字段在归一化时被丢弃；(b) reasoning_tokens 字段被丢弃；(c) usage 语义里没有价目表版本概念；(d) 取消/失败 Turn 没有"usage_unknown"的显式落盘状态。
2. **ADR-007 的 `ProviderStreamEvent.usage`/`GenerationUsage` 形状**建议追加一版决定（amendment 或新 ADR），把 cache-hit/cache-miss/reasoning-tokens 三个可选槽位纳入协议正式形状（第 7 节已论证这属于 provider 无关骨架，不违反 core 语义边界）；同步要求 `http-client.ts`/`openai-compatible-provider.ts`/`provider-stream.ts`/`scripted-provider.ts` 四处收窄逻辑一起改，避免只改一处留另外三处 drift。
3. **`packages/provider/src/pricing-table.ts` 需要一次数据 + 结构双重更新**：
   - 数据层：补齐 `deepseek-v4-flash` 的价格条目（当前注释称其"只公开缓存命中价"，本次核实这个前提已过期——V4-Flash 目前有完整的输入命中/未命中/输出三档公开价格）；补上缓存命中价档位，而不是统一按未命中价估算（当前做法是刻意保守、已被注释诚实说明，属于可接受的临时简化，但补全后估算会更准）。
   - 结构层：`estimateCostUsd` 目前返回裸 `number`，建议按第 6 节的 ledger 形状拆成"原始 usage 记录 + 带版本号/假设清单的估算"，避免调用方把这个数字当权威值直接展示给用户。
   - 价目表本身建议加生效日期字段——过去 12 个月 DeepSeek 已经至少 4 次调整计价结构，硬编码单一价格没有版本概念，下次调价后旧历史记录的成本会被静默算错而不自知。
4. **峰谷计价不建议做"猜档位"的时间推断**：由于响应里天生验证不了实际计价档位，任何本地猜测（哪怕逻辑上算对了 DeepSeek 公布的时刻表）都可能因为 DeepSeek 后续调整时刻表、或请求跨越峰谷边界等原因产生与账单不一致的数字，而这类"算出来但可能是错的"数字比"明确不算"更危险——正好撞上"静默降级零容忍"要防的那类情况。建议 ledger 对所有 cost 估算值固定携带"未计入可能存在的峰谷加价"这条 assumption 字符串，是否要投入做峰谷推断，留给专门的 ADR 决策，本报告不代为拍板。
5. **取消/失败 Turn 的 usage 语义**建议从代码注释级别的约定提升为 ADR 正式条款：`usage` 缺失时 `PersistedTurn` 必须体现"未知"状态，不能记 0，也不能用已收到的 delta 内容长度冒充精确 token 数。
6. **两条需要专门核实、本报告未能完全确认的事项**，建议列入下一次实现/验收会话的动作项，不应在没有实测前假设任一方向：
   - 峰谷计价截至目前是否已经真正生效（官方文档页尚未反映，只有新闻报道）；
   - Courtwork 自己在"usage 事件与 cancel 信号发生竞态"这个极窄窗口下，`normalizeProviderTransport` 具体会不会转发已经到达的 usage 事件——需要看 provider 包已有的取消竞态测试用例才能确认，SPEC 原文没有精确到这个粒度。
7. **模型别名弃用（2026-07-24）**：Courtwork catalog 已使用新模型 id，无需紧急改动，建议验收清单补一条存在性检查即可，不构成本报告的行动项主线。

---

## 9. 来源清单

| 来源 | URL | 抓取/发布日期 | 置信度 |
|---|---|---|---|
| Models & Pricing（EN） | https://api-docs.deepseek.com/quick_start/pricing/ | 抓取 2026-07-14 | ✓ 官方一手 |
| 模型 & 价格（ZH） | https://api-docs.deepseek.com/zh-cn/quick_start/pricing | 抓取 2026-07-14 | ✓ 官方一手 |
| Your First API Call | https://api-docs.deepseek.com/ | 抓取 2026-07-14 | ✓ 官方一手 |
| Token & Token Usage | https://api-docs.deepseek.com/quick_start/token_usage | 抓取 2026-07-14 | ✓ 官方一手 |
| Context Caching | https://api-docs.deepseek.com/guides/kv_cache | 抓取 2026-07-14 | ✓ 官方一手 |
| Thinking Mode | https://api-docs.deepseek.com/guides/thinking_mode | 抓取 2026-07-14 | ✓ 官方一手 |
| Create Chat Completion（API Reference，usage/流式 schema） | https://api-docs.deepseek.com/api/create-chat-completion | 抓取 2026-07-14 | ✓ 官方一手 |
| Rate Limit & Isolation | https://api-docs.deepseek.com/quick_start/rate_limit | 抓取 2026-07-14 | ✓ 官方一手 |
| Error Codes | https://api-docs.deepseek.com/quick_start/error_codes | 抓取 2026-07-14 | ✓ 官方一手（未提及取消计费） |
| FAQ（含月度用量 CSV 导出说明） | https://api-docs.deepseek.com/faq | 抓取 2026-07-14 | ✓ 官方一手 |
| Change Log | https://api-docs.deepseek.com/updates | 抓取 2026-07-14 | ✓ 官方一手 |
| DeepSeek V4 Preview Release 新闻 | https://api-docs.deepseek.com/news/news260424 | 抓取 2026-07-14（原发 2026-04-24） | ✓ 官方一手 |
| DeepSeek Open Platform Terms of Service | https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html | 抓取 2026-07-14（生效 2026-04-29） | ✓ 官方一手（未提及取消计费细节） |
| `pricing-details-usd`/`pricing-details-cny`（**已确认为过期孤页，未采用**） | https://api-docs.deepseek.com/quick_start/pricing-details-usd 等 | 抓取 2026-07-14，页内版权年份 2025，仍显示已弃用的 deepseek-chat/reasoner 旧模型价格 | 不采用——过期缓存页 |
| SCMP：DeepSeek 峰谷加价报道 | https://www.scmp.com/tech/big-tech/article/3358868/after-triggering-price-war-deepseek-reverses-course-surcharge-peak-hour-api-use | 发布 2026-06-30，抓取 2026-07-14 | ✓(三方) 主流财经媒体 |
| 新浪财经：DeepSeek 峰谷定价 | https://finance.sina.com.cn/stock/roll/2026-06-30/doc-inifczzw4923841.shtml | 发布 2026-06-30 | ✓(三方) |
| 澎湃新闻：V4 正式版与峰谷定价 | https://www.thepaper.cn/newsDetail_forward_33478426 | 发布 2026-06-29/30 | ✓(三方) |
| 财联社：多位用户确认收到调价邮件 | https://www.cls.cn/detail/2412093 | 发布 2026-06-29 | ✓(三方) |
| IT之家：V4 正式版峰谷定价 | https://www.ithome.com/0/970/123.htm | 发布 2026-06-29/30 | ✓(三方) |
| OpenRouter：取消流式请求与计费 | https://openrouter.zendesk.com/hc/en-us/articles/51691588409883-How-do-I-cancel-a-streaming-request-and-which-providers-stop-billing-when-I-do | 发布 2026-06-14，抓取 2026-07-14 | ✓(三方) 运营商一手观察，非 DeepSeek 官方 |
| OpenTelemetry GenAI 语义约定 | https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/ | 抓取 2026-07-14 | ✓(三方) 行业标准草案 |
| Langfuse：Token & Cost Tracking | https://langfuse.com/docs/observability/features/token-and-cost-tracking | 抓取 2026-07-14 | ✓(三方) 产品官方文档 |
| chat-deep.ai / morphllm.com（reasoning token 计费第三方陈述） | https://chat-deep.ai/pricing/ ；https://www.morphllm.com/deepseek-api | 抓取 2026-07-14 | ✓(三方)，非 DeepSeek 官方原文 |
| 归档报告：接口与兼容策略调研 | `archive/docs-legacy-2026-07-13/docs/18-调研报告-provider接口与兼容策略.md`（本地仓库） | 原调研 2026-07-10 | 项目内部资料，覆盖接口不覆盖计费，本报告与其定价数字交叉核对一致 |
| `docs/status/current.md`（架构债第 6 条出处） | 本地仓库 | — | 项目一手 |
| `packages/provider/src/{types.ts,provider-stream.ts,http-client.ts,openai-compatible-provider.ts,scripted-provider.ts,pricing-table.ts,pricing-table.test.ts}`、`packages/provider/catalog/deepseek.json` | 本地仓库 | — | 项目一手源码核查 |
