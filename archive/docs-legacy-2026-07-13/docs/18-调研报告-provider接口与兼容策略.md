# 调研报告：主流 Provider 接口格式与 OpenAI 兼容现状（2026-07）

状态：调研完成，供 provider 适配层 wire format 裁定参考。

## 0. 背景与调研前提

- `packages/core/SPEC.md`：Provider 封装已实现（`Provider` 接口 `id`/`modelId`/`generate`），模型 id/参数来自配置，不写死；**不含工具调用能力**——场景是声明式固定编排，工具调用由执行器编排，LLM 只在生成节点被调用（docs/24）。这意味着我们对 provider 的诉求非常窄：单轮/多轮文本生成 + 结构化产出，不需要 provider 的 agentic tool-calling 循环、不需要 Responses API 那类"模型自主串工具"的高级能力。
- `eval/SPEC.md`：多 provider 跑分待真实凭证，`providers:` 配置是唯一允许出现具体 provider/model id 的地方。
- `docs/27`：Provider 凭证三形态（MVP 用户自填 OS 钥匙串 / 试点 SaaS 后端代理 / 私有化企业网关），key 永不进事件流。
- 产品事实：国内市场为主（合规敏感），产出必须过 zod/JSON Schema 校验（硬需求），甜点区选型由 eval 跑分定，不在本报告拍板。

本报告只回答"wire format 怎么接、接哪几家、有哪些坑"，不做模型质量评测（那是 eval 的事）。

---

## 1. 国内主力六家

### 1.1 DeepSeek

- **OpenAI 兼容**：`base_url = https://api.deepseek.com`（或 `/v1`），直接用 `openai` SDK，只需改 `base_url`/`api_key`/`model`。兼容度高，社区生态最成熟。
- **模型迭代**：`deepseek-chat`/`deepseek-reasoner` 旧名将于 2026-07-24 停用，新名 `deepseek-v4-flash`/`deepseek-v4-pro`。**注意**：调研当天（2026-07-10）距停用仅 14 天，MVP 接入需直接用新模型名。
- **结构化输出**：官方文档（`api-docs.deepseek.com/guides/json_mode`）明确只支持 `response_format: {"type": "json_object"}`，**没有面向最终消息的 `json_schema` strict 模式**；要求 prompt 中显式包含"json"字样并给出示例格式；`max_tokens` 需留够，否则可能截断；文档自曝"偶发返回空内容"的已知问题。`json_schema` strict 目前只在 **beta 阶段的 tool-call 参数**里可用（约束 function arguments，不约束最终回复）。
- **推理内容字段**：`reasoning_content`（thinking mode），与 `content` 分离；`docs/guides/thinking_mode`。
- **上下文缓存**：自动隐式缓存，无需额外参数；2026-04-26 起缓存命中价降至首发价 1/10，且促销结束后正式价直接定为原价 1/4（永久生效，非限时）。
- **定价（2026-07）**：V4-Pro 缓存命中输入 ¥0.025/M、缓存未命中输入 ¥3/M、输出 ¥6/M；V4-Flash 缓存命中输入 ¥0.02/M。高缓存命中场景（固定 system prompt、重复工具上下文）成本极低，甜点区候选。
- **额外能力**：官方还提供 **Anthropic 消息格式兼容端点**（`guides/anthropic_api`）——即 DeepSeek 一家同时暴露 OpenAI 与 Anthropic 两种 wire format，可作为"若未来要接 Anthropic 生态工具但想用 DeepSeek 模型"的备选路径，本报告不深入。
- **企业开通**：官方自助注册（`platform.deepseek.com`）创建 key，未见强制企业资质门槛的公开资料；合规上仍需遵守国内生成式 AI 服务备案的下游义务（见第 5 节）。

### 1.2 Qwen（阿里云百炼 / DashScope）

- **两套接口**：DashScope 原生 API（功能最全）与 **OpenAI 兼容模式**（`base_url` 形如 `https://{region}.aliyuncs.com/compatible-mode/v1` 或北京地域 `dashscope.aliyuncs.com/compatible-mode/v1`）。
- **结构化输出**：官方文档（`help.aliyun.com/zh/model-studio/qwen-structured-output`）**明确支持两种模式**：JSON Object 模式（`{"type":"json_object"}`，仅保证合法 JSON，不保证结构）与 **JSON Schema 模式**（`response_format: {"type":"json_schema","json_schema":{...},"strict":true}`）。这是国内六家里**唯一在官方文档中明确写出 `strict: true` 字段**的。
  - 限制：仅部分模型支持（Qwen3.x-Plus 非思考模式、Qwen3.x-Flash 等系列），且**目前仅北京地域**开放该功能——多地域部署时需注意路由到正确 region 才能拿到 strict 能力。
- **深度思考**：`enable_thinking` 参数区分"混合思考模式"（可开关）与"纯思考模式"（不可关闭，如 QwQ/DeepSeek-R1 类）；思考开启时 `temperature`/`top_p` 等采样参数会被静默忽略（不报错）。
- **上下文缓存**：需要**显式**通过参数开启（不是默认行为），仅命中部分享折扣。
- **定价（2026-07）**：Qwen3.5-Plus 输入 ¥0.8/M、输出 ¥4.8/M；Qwen-Flash 输入低至 ¥0.2/M；采用阶梯计费（单价按单次请求输入 token 总量分档）；新用户 90 天内每模型各赠 100 万 token。
- **企业开通**：门槛最规范——企业账号需先完成**实名认证**才能开通百炼服务/建 API Key；API Key 与调用地域强绑定，创建前必须在控制台切换到目标地域；Key 支持"全部权限"（测试用）与"自定义 IP 白名单"（生产用）两级。这套流程对国内律所/企业客户走标准阿里云采购通道最友好（发票、资质、SLA 齐备）。

### 1.3 Moonshot Kimi

- **OpenAI 兼容**：`base_url = https://api.moonshot.ai/v1`（国际站）/ `platform.moonshot.cn`（国内站），可直接用 OpenAI SDK；官方专门提供"从 OpenAI 迁移到 Kimi API"指南。
- **结构化输出**：`response_format` 支持 `json_object` 与 **`json_schema`**（官方文档标注"推荐"），部分新模型（如 `kimi-k2.7-code`）明确列出支持 structured outputs (JSON schema)。是国内六家里结构化输出**文档措辞最积极**的之一（与 Qwen 并列第一梯队，但 Qwen 的 `strict` 字段更明确写在 API 参数里）。
- **已知兼容坑**：
  - 不支持 `tool_choice: "required"`；
  - `temperature` 设为 0（或接近 0）且 `n > 1` 时会报 "invalid request"（即 0 温度下只能返回 1 个候选）；
  - 有第三方 issue 反馈早期模型对 `response_format` 参数支持不稳定（Instructor 库报错），需在适配层做能力探测/降级而非假设一定生效。
- **上下文缓存**：自动，按前缀匹配，无需配置；命中价约为未命中价的 15%–17%（K2.6 缓存价 $0.16/M vs 正常 $0.95/M，约 83% 折扣；K2.5 缓存价 $0.10/M vs $0.60/M）。
- **定价（2026-07）**：K2.6 输入 $0.95/M、输出 $4/M；K2.5（最便宜档）输入 $0.60/M、输出 $3/M；旧 K2 系列（K2 0905/Turbo/Thinking/0711）将于 2026-05-25 EOL（调研时已过期，注意别选到停售模型）。
- **企业开通**：官方自助注册，无特别披露的企业资质前置门槛。

### 1.4 智谱 GLM（Zhipu / Z.ai）

- **OpenAI 兼容**：`base_url = https://open.bigmodel.cn/api/paas/v4/`——**注意路径不是标准 `/v1`，是 `/api/paas/v4/`**，第三方封装工具若硬编码拼接 `/v1` 会导致 404（已有 GitHub issue 反映此问题），适配层不能假设所有 provider 的兼容路径都是 `/v1`。
- **结构化输出**：官方 `docs.z.ai/guides/capabilities/struct-output` 全文示例**只使用 `response_format: {"type": "json_object"}`**，**没有出现 `json_schema`/`strict` 字段**；官方推荐做法是"system message 里手写 JSON 结构说明 + 客户端用 Python `jsonschema` 库二次校验"——即结构化保证责任落在调用方，不是模型侧强约束。这是国内六家里结构化输出**能力证据最弱**的一家（至少截至调研时公开文档未展示 strict 模式）。
- 另有社区诉求（GitHub issue）建议智谱补一个 OpenAI `/responses` 兼容接口以提升 Codex 类工具兼容性，说明智谱目前只对齐了 Chat Completions，未跟进 Responses API。
- **定价与生态**：2026 年价格连续两次上调（Q1 涨约 83%，4 月 8 日再涨 10%），性价比走弱；但 GLM 5.2 已开源权重（MIT license），对我们"私有化推理"路线（自带模型跑 vLLM/SGLang）是加分项——若企业私有化客户想用开源中文法律友好的模型且自建推理，GLM 开源权重是候选，与"云 API 直连"是两条不同的路。
- **企业开通**：自助注册为主，另有 Coding Plan 订阅套餐（与本报告的 API 调用计费是两套体系，不要混淆）。

### 1.5 MiniMax

- **OpenAI 兼容**：`base_url = https://api.minimax.io/v1`，官方文档专门给出 `OPENAI_BASE_URL`/`OPENAI_API_KEY` 环境变量配置方式，兼容度形式上完整。
- **推理内容字段**：`reasoning_split` 参数控制思考内容是否从 `content`（内嵌 `<think>` 标签）拆分到独立的 `reasoning_content`/`reasoning_details` 字段——**这是本报告里最独特的一处 quirk**：不设置该参数时，思考内容混在 `content` 字符串里用 `<think>...</think>` 包裹，消费方必须自己用正则剥离，否则会把思考过程当正文解析进 JSON。
- **结构化输出：本报告调研范围内最大的隐患点**——
  - 官方原生 API（`platform.minimaxi.com`）文档显示 `response_format: {"type":"json_schema",...}` **仅 `MiniMax-Text-01` 一个模型支持**；
  - 当前主力模型 **MiniMax-M2.5 通过 OpenAI 兼容端点完全不支持 `response_format`**——无论传 `json_object` 还是 `json_schema`，参数被**静默忽略**，不报错也不降级提示，模型直接输出自由文本（可能含 JSON 也可能不含）。这种"静默吞掉约束参数"的行为，对我们"产出必须过 zod 校验，失败要显式可见"的纪律是最危险的一类 quirk——适配层如果没有专门探测/黑名单这个组合，会在生产里悄悄退化成"提示词硬约束 + 事后校验失败率飙升"而毫无预警。
  - 另有限制：`stream: true` 与 `response_format` 互斥（不能同时用流式和结构化输出）；`n` 只支持 1；`temperature` 范围 `[0,2]`；`presence_penalty`/`frequency_penalty`/`logit_bias` 等部分 OpenAI 标准参数会被忽略。
- **定价**：M3 促销价（"永久 5 折"）输入 $0.30/M、输出 $1.20/M（原价 $0.60/$2.40）；人民币口径 M2.5 约 ¥2.16/M（输入）。

### 1.6 豆包 / 火山方舟（Volcengine Ark）

- **OpenAI 兼容**：`base_url = https://ark.cn-beijing.volces.com/api/v3`，官方文档明确"兼容 OpenAI SDK"，专门章节列出 base URL 与鉴权方式。
- **两套 API 体系并存**：常规 Chat Completions 之外，火山方舟**自己也在推 Responses API**（"迁移至 Responses API"独立文档章节，文本生成/深度思考/多模态/工具调用/上下文缓存/结构化输出全部有 Responses API 版本对应文档）——这说明"Responses API 化"不只是 OpenAI 一家的动作，国内头部 provider 也在跟进这个范式，我们的适配层若要面向未来，接口抽象需要预留"生成节点内部可能切到 Responses 语义"的余地，但**当前 MVP 阶段不必跟进**（我们的场景执行器不需要 provider 自主编排工具，Chat Completions 语义完全够用）。
- **结构化输出**：官方有独立"结构化输出(beta)"文档（Chat Completions 与 Responses API 各一份），处于 beta 阶段，具体 schema 约束能力与 Qwen/Kimi 相近但仍标注 beta，谨慎对待其稳定性承诺。
- **上下文缓存**：**隐式（自动）+ 显式（需主动开启）两种模式并存**，命中 token 按 4 折计费（即命中价 = 正常价 × 0.4）——折扣力度不如 DeepSeek/Kimi 的自动缓存激进，但可控性更强（显式模式适合我们场景里"固定 system prompt + 场景模板"的高复用场景，可主动确保命中）。
- **定价**：旗舟版输入 ¥6/M、输出 ¥30/M（偏贵）；`doubao-seed-1.6` 系列按输入长度分段计费，短输入区间（128–256 tokens）输入 ¥2.4/M、输出 ¥24/M——分段计费意味着我们的法律文书审查场景（长合同输入）成本敏感度高，需要在 eval 阶段按真实文档长度测算，不能只看短 prompt 的报价。
- **企业生态**：官方有专门的"大模型备案说明"文档，对企业客户合规路径给出较完整指引（比其他家更主动），且与字节生态（飞书等 office 场景，docs/17 关注点）天然贴近。

---

## 2. 海外基线

### 2.1 OpenAI：Responses API vs Chat Completions（2026 现状）

- OpenAI/Microsoft 官方口径：**Responses API 是新默认、新项目推荐入口**，带来 agentic 编排（一次请求内模型自主串多个工具）与更好的 prompt cache 复用（内部评测缓存利用率提升 40%–80%），推理模型（如 GPT-5 类）在 Responses 下有额外能力增益（如 SWE-bench +3%）。
- **但 Chat Completions 官方承诺"无限期继续支持，作为行业标准"**（"industry standard"措辞）——这对我们是关键信息：既然 Courtwork 场景执行器不需要模型自主工具编排（docs/24 已拍板），Responses API 的核心卖点（agentic loop）对我们是无效增益，而 Chat Completions 的"继续支持"承诺意味着把它作为唯一 wire format 基线**没有被上游废弃的风险**。
- **结构化输出（strict json_schema）**：`strict: true` 已是成熟能力，支持嵌套对象/数组、递归 schema、enum；已知限制：根对象不能是 `anyOf` 类型；`strict` 结构化输出与 `parallel_tool_calls` 互斥（需要显式把 `parallel_tool_calls` 设为 `false`）；这对我们无影响（不用 tool-calling 循环）。OpenAI 在海外基线里是结构化输出能力最强、最稳定的参照系。

### 2.2 Anthropic（Claude）：兼容层与原生格式差异

- **官方确认存在 OpenAI SDK 兼容层**：`base_url = https://api.anthropic.com/v1/`，`api_key = ANTHROPIC_API_KEY`，可直接用 `openai` SDK 调用。
- **但官方原话是"这个兼容层主要用于测试和比较模型能力，不被认为是大多数生产场景的长期或生产就绪方案"**——这是本报告里唯一一家官方明确劝退把兼容层用于生产的厂商。
- **已知损耗清单**（官方文档列出）：
  - System/developer 消息被"提升"并用单个换行拼接到对话开头（Anthropic 原生只认一条初始 system 消息）；
  - **`strict` 参数被忽略**——tool-use 的 JSON 不保证符合传入 schema，这对我们"结构化产出是硬需求"直接构成不可接受的风险；
  - 音频输入不支持，静默丢弃；
  - 大多数不支持的字段"静默忽略"而非报错（与 MiniMax M2.5 的静默吞参数是同一类风险，只是官方主动坦白了）。
- **结论**：若未来要接入 Claude 模型，**必须走原生 Messages API**（用强制 tool-use 的方式实现结构化输出——Anthropic 原生没有 `response_format`/`json_schema` 等价物，结构化输出的事实标准做法是定义一个"提交结果"工具并强制模型调用它，取 `tool_use` 的 `input` 作为结构化产出），不能依赖其 OpenAI 兼容层。这意味着如果 Anthropic 进入选型，我们的"OpenAI 兼容基线"必须留一个显式例外分支。国内合规敏感场景下 Anthropic 优先级本就不高，本报告不建议 MVP 首批纳入。

### 2.3 Gemini：OpenAI 兼容端点现状

- 官方地址：`https://generativelanguage.googleapis.com/v1beta/openai/`，官方文档明确"改三行代码即可用 OpenAI 库调用 Gemini"，覆盖 Chat Completions、图片生成（`/v1/images/generations`）、视频生成（Sora 兼容的 `/v1/videos`）。兼容层由 Google 官方维护、公开文档持续更新（文档标注最后更新 2026-06-30），成熟度高于 Anthropic 的兼容层。
- 国内可用性：Gemini 属于海外服务，国内网络直连与合规均有明显障碍，不建议作为国内客户 MVP 选项，仅作为"未来若做海外版本"的技术参照。

---

## 3. 结构化输出专项：跨家对比与坑位清单

| Provider | `response_format` 能力 | strict 保证 | 已知坑 |
|---|---|---|---|
| DeepSeek | `json_object` 仅有 | 无（strict 只用于 tool-call 参数，非最终消息） | 需 prompt 含"json"字样；偶发返回空内容 |
| Qwen（百炼） | `json_object` + **`json_schema`+`strict`** | **有**，但限特定模型 + 仅北京地域 | 跨地域部署需路由到北京才能拿到该能力 |
| Kimi | `json_object` + `json_schema`（官方推荐） | 文档积极但未见 `strict` 字段名 | 早期模型对该参数支持不稳定（第三方反馈）；`temperature=0`+`n>1` 报错 |
| 智谱 GLM | 仅 `json_object` | **无**，官方示例靠客户端 `jsonschema` 库校验 | 路径非标准 `/v1`（是 `/api/paas/v4/`） |
| MiniMax | 原生 API 仅 `MiniMax-Text-01` 支持 `json_schema`；主力模型 M2.5 **OpenAI 兼容端点完全不支持**，参数被静默忽略 | 无（对主力模型） | **静默吞参数**，最需要适配层主动探测/拉黑的组合 |
| 豆包（火山方舟） | "结构化输出(beta)"，Chat Completions 与 Responses API 各一份文档 | beta 阶段，未见成熟度背书 | beta 标签，需要实测验证稳定性 |
| OpenAI | `strict: true`，支持嵌套/递归/enum | **有，最成熟** | 根对象不可为 `anyOf`；与 `parallel_tool_calls` 互斥 |
| Anthropic（OpenAI 兼容层） | 有 `response_format` 形式但 **`strict` 被官方声明忽略** | **无**（兼容层下） | 官方明确"非生产就绪"；生产须走原生 tool-use 强制模式 |
| Gemini（OpenAI 兼容层） | 支持（细节未逐一核实，官方兼容层成熟度较高） | 待实测 | 国内不可用 |
| vLLM（自建） | `structured_outputs`（新统一参数，取代 `guided_json`/`guided_*`） | 有，多后端（xgrammar/guidance/outlines）保证 | 默认开启，无需额外 flag；私有化客户零改动即可用 |
| SGLang（自建） | `response_format: json_schema` 原生支持 | 有，多后端（xgrammar 默认/outlines/llguidance） | 建议 prompt 里也显式提示期望格式，配合语法约束效果更好 |

**不支持 strict 时的现实替代（统一策略）**：
1. `response_format: json_object`（若 provider 支持）+ system prompt 里显式给出 JSON 结构说明与示例（DeepSeek/GLM 官方都是这个套路）；
2. 拿到候选字符串后，先做"剥 markdown 代码围栏 + `JSON.parse`"（eval 层 `run-rules.ts` 已踩过这个坑：provider 返回的是原始字符串而非解析好的对象，这是跨进程边界数据形状变化，只有真实调用才会暴露）；
3. 过 `@courtwork/schemas` 的 zod 校验；失败则**重试 1–2 次**，重试 prompt 里应带上"上次输出的 schema 校验错误信息"（而不是原样重发）以提高命中率；
4. 仍失败：**不静默降级、不插入占位数据**——按 CLAUDE.md"留人确认是产品纪律"与"不许出现自动执行不可逆动作"的红线，生成节点失败应显式抛出中断（`packages/core` 的 `step_failed`/生成节点级失败机制已覆盖此语义），交由确认门禁或人工介入，而不是让适配层自己编一份"看起来合规"的假数据。
5. `strict` 能力仅作为**可选优化**（降低步骤 3 的重试率与成本），不作为架构依赖——因为国内六家里只有 Qwen 一家在文档层面明确、稳定地提供它，且还锁区域/锁模型。

---

## 4. 私有化推理：vLLM / SGLang 的 OpenAI 兼容现状

- **vLLM**：OpenAI 兼容 server 是官方一等公民能力，`vllm serve` 起服务后默认即支持结构化输出；参数已从早期 `guided_json`/`guided_choice` 等系列**统一收敛为 `structured_outputs`**（`StructuredOutputsParams`），多解码后端（xgrammar 默认、guidance、outlines 可选）保证生成过程中每一步 token 都被约束在合法 schema 内（而非生成完再校验重试）。
- **SGLang**：同样原生暴露 OpenAI 兼容 `/v1/chat/completions`，`response_format: {"type":"json_schema",...}` 直接可用，默认后端 XGrammar，可切换 Outlines/llguidance。
- **结论对我们的意义**：**私有化客户自带模型跑 vLLM/SGLang 时，我们的 provider 适配层理论上零改动**——因为这两个推理框架本身就对齐 OpenAI Chat Completions 的 wire format，且其结构化输出走的是"解码时约束"（比云端大厂的"生成后验证"更硬）。唯一需要适配层感知的差异是：不同版本 vLLM 的参数名在 `guided_json`→`structured_outputs` 迁移期可能不一致，适配层对私有化部署场景需要做一次版本探测或允许配置指定用哪套参数名（这与"模型 id/参数走配置"的既有原则一致，不需要新机制）。

---

## 5. 国内合规现状（下游义务，非 provider 自证清白）

调研中发现一个容易被误判的点，记录如下：

- 国内监管把 AI 合规拆成三类审批：**算法备案**（CAC，1–2 月）、**大模型备案**（自研模型对外提供服务，3–6 月）、**大模型登记**（调用第三方已备案大模型对外提供服务，1–3 月，**Courtwork 属于这一类**）。
- **常见误解**："我接的是阿里通义/DeepSeek 的已备案模型，就不用自己备案了"——**错误**。各家用户协议都明确写"模型层备案责任在模型厂商，但把能力包装成独立应用/小程序/Agent 对国内公众提供服务的下游方，仍需自行完成大模型登记及对应算法备案"。这一条不是 provider 接口层面的事，但会影响我们上线节奏（登记周期 1–3 月），建议记入产品侧合规 TODO（`docs/15`/`docs/28` 已有数据承诺合规相关文档，建议交叉引用，本报告不越权改写）。
- 企业开通侧，Qwen（阿里百炼）是六家里企业实名认证/API Key 权限管理流程记录最完整、最贴近对公采购习惯的一家（子账号权限隔离、IP 白名单生产建议），对律所/企业法务团队采购决策是加分项。

---

## 6. 策略建议（报告核心）

### 6.1 Wire format 基线裁定

**建议：OpenAI Chat Completions 兼容格式作为唯一主基线，Anthropic 原生 Messages API 作为唯一显式例外分支（若未来纳入 Claude）。**

理由：
- 国内六家主力（DeepSeek/Qwen/Kimi/GLM/MiniMax/豆包）**全部**提供 OpenAI 兼容层，且都是"改 base_url + api_key"级别的低成本接入；
- 私有化推理（vLLM/SGLang）原生对齐 OpenAI 格式，零额外适配；
- OpenAI 官方承诺 Chat Completions"无限期支持"，不存在被废弃风险；我们不需要 Responses API 的 agentic 编排能力（docs/24 已拍板场景固定编排，LLM 不自主选工具）；
- 唯一的例外是 Anthropic——其官方明确声明 OpenAI 兼容层"非生产就绪"且 `strict` 被忽略，与我们"结构化产出是硬需求"直接冲突。若 Anthropic 进选型（目前国内合规敏感场景优先级不高），必须走原生 Messages API + 强制 tool-use 模式，这是唯一需要"双基线"的场景，其余厂商不需要。

即：**单基线为主，留一个具名例外，不做通用双基线设计**（双基线会让 `packages/tools`/`packages/core` 的 provider 抽象层过度设计，为一个当前非优先级的 provider 背负复杂度）。

### 6.2 结构化输出的统一策略

优先级：**provider 原生 `strict: true`（若稳定支持）> `json_schema` 非 strict（Kimi 一类）> `json_object` + 提示词模板 + 服务端 zod 校验 + 有反馈重试（1–2 次）**。任何一级都不能跳过"过 `@courtwork/schemas` zod 校验"这一步——这是产品硬约束，不是 provider 能力越强就可以省略的可选项。重试耗尽后走显式失败（`step_failed`），不静默降级、不插入占位数据。

### 6.3 Quirk 层需要处理的已知差异清单（供 provider 适配层实现时逐条对照）

1. base URL 路径不统一（GLM 是 `/api/paas/v4/` 而非 `/v1`）；
2. `response_format` 支持程度三档（strict 有/json_schema 无 strict/仅 json_object/完全不支持且静默吞参数——MiniMax M2.5 是最危险的一档，需要显式探测或加入已知不兼容黑名单）；
3. 推理内容字段命名不统一：`reasoning_content`（DeepSeek 等多数）、`reasoning_content`+`reasoning_details`+`reasoning_split` 开关（MiniMax）、`enable_thinking`（Qwen）——若未来场景需要展示"模型思考过程"，适配层需要一个统一的内部字段做归一化映射；
4. 深度思考开启时部分采样参数被静默忽略（Qwen 思考模式下 temperature/top_p 失效不报错）；
5. 部分 provider 对特定参数组合报错而非忽略（Kimi 的 `temperature=0`+`n>1`）；
6. `response_format` 与 `stream` 互斥（MiniMax 原生 API）；
7. 跨进程边界候选输出是原始字符串而非解析对象，需统一"剥 markdown 代码围栏 + JSON.parse"预处理（eval 层已有先例，建议 provider 适配层复用同一处理，不要在 core/eval 各写一份）；
8. 上下文缓存是否需要显式开启参数（Qwen 显式 / DeepSeek·Kimi 隐式自动 / 豆包两者并存）——影响我们是否要在请求构造时主动加缓存相关字段以确保命中率，这是成本优化项，不阻塞 wire format 裁定，但建议 eval 跑分时把"是否显式开启缓存"作为受控变量记录，避免不同 provider 因缓存策略差异导致成本对比失真。

### 6.4 MVP 首批接入建议（2–3 家）

综合兼容度 × 结构化输出成熟度 × 国内合规 × 甜点区性价比：

1. **DeepSeek**——生态最成熟、价格最低（尤其高缓存命中场景）、自助开通门槛最低，是跑通全链路的第一选择；结构化输出仅 `json_object`，但配合统一重试策略完全可用。
2. **阿里百炼 Qwen**——结构化输出证据最强（官方文档明确 `strict` 字段，虽锁模型锁地域），企业开通流程最规范、最贴近国内律所/企业客户对公采购习惯（发票、实名认证、IP 白名单），建议作为"结构化输出稳定性"的对照基准。
3. **Moonshot Kimi 或 火山方舟豆包二选一，建议豆包**——豆包结构化输出有独立 beta 文档且两套 API（Chat Completions/Responses）并行维护说明厂商投入度较高，字节生态与 docs/17（office/邮件生态嵌入）诉求贴合，官方合规文档（大模型备案说明）主动性也更强；Kimi 价格与结构化输出表现同样有竞争力，可作为 eval 阶段的第四家候选而非首批（性价比与豆包接近，暂不必同时占两个名额）。

**不建议纳入 MVP 首批**：GLM（结构化输出证据最弱、近期价格连续上调，性价比走弱，但其开源权重对未来私有化推理路线仍有观察价值）；MiniMax（主力模型在 OpenAI 兼容端点完全不支持 `response_format` 且静默忽略，与我们的硬需求直接冲突，除非切到仅支持该能力的 `MiniMax-Text-01`，但那不是其主力/甜点区模型）。

各家 key 申请路径：DeepSeek/Kimi/GLM/MiniMax 均为官网自助注册即可拿 key；阿里百炼需先完成企业实名认证再开通服务、创建 Key 时需绑定地域并配置 IP 白名单（生产环境）；火山方舟走火山引擎控制台开通方舟服务后创建 API Key，企业客户可另申请备案指引文档。

---

## 来源清单

**DeepSeek**
- [Your First API Call | DeepSeek API Docs](https://api-docs.deepseek.com/)
- [JSON Output | DeepSeek API Docs](https://api-docs.deepseek.com/guides/json_mode)
- [Tool Calls | DeepSeek API Docs](https://api-docs.deepseek.com/guides/tool_calls/)
- [模型 & 价格 | DeepSeek API Docs](https://api-docs.deepseek.com/quick_start/pricing/)
- [pricing-details-usd | DeepSeek API Docs](https://api-docs.deepseek.com/quick_start/pricing-details-usd/)
- [DeepSeek V4、R1、V3、V3.1 API - 阿里云百炼帮助中心](https://help.aliyun.com/zh/model-studio/deepseek-api)
- [DeepSeek-V4 官方 API 真降价了 - 知乎](https://zhuanlan.zhihu.com/p/2042013762199314775)

**Qwen / 阿里百炼**
- [OpenAI Chat 接口兼容 - 阿里云文档](https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope)
- [如何让通义千问生成 JSON 字符串（结构化输出）- 阿里云](https://help.aliyun.com/zh/model-studio/qwen-structured-output)
- [深度思考模型的用法 - 阿里云百炼](https://www.alibabacloud.com/help/zh/model-studio/deep-thinking)
- [如何获取 API Key - 阿里云百炼](https://help.aliyun.com/zh/model-studio/get-api-key)
- [阿里云百炼模型价格 - 阿里云帮助中心](https://help.aliyun.com/zh/model-studio/model-pricing)
- [阿里云 Qwen3.6-Plus 收费价格 - 阿里云开发者社区](https://developer.aliyun.com/article/1724287)

**Moonshot Kimi**
- [API Overview - Kimi API Platform](https://platform.kimi.ai/docs/api/overview)
- [从 openai 迁移到 Kimi API](https://platform.moonshot.cn/docs/guide/migrating-from-openai-to-kimi)
- [Create Chat Completion - Kimi API Platform](https://platform.kimi.ai/docs/api/chat)
- [Use Kimi API's JSON Mode](https://platform.moonshot.ai/docs/guide/use-json-mode-feature-of-kimi-api)
- [Kimi API Pricing 2026 - TokenMix Blog](https://tokenmix.ai/blog/kimi-k2-api-pricing)

**智谱 GLM**
- [OpenAI API 兼容 - 智谱AI开放文档](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction)
- [Structured Output - Z.AI Developer Document](https://docs.z.ai/guides/capabilities/struct-output)
- [智谱AI开放平台定价](https://bigmodel.cn/pricing)
- [智谱GLM-5海外首发上线 订阅与API价格大幅上调](https://www.cls.cn/detail/2287927)
- [[需求] 建议智谱官方 API 支持 OpenAI 兼容的 /responses 接口 · Issue #39](https://github.com/zai-org/GLM-5/issues/39)

**MiniMax**
- [OpenAI SDK - MiniMax API Docs](https://platform.minimax.io/docs/api-reference/text-openai-api)
- [Feature request: response_format support for MiniMax M2.5 · Issue #4](https://github.com/MiniMax-AI/MiniMax-M2.5/issues/4)
- [文本合成 - MiniMax 开放平台文档中心](https://platform.minimaxi.com/docs/api-reference/text-post)
- [产品定价 - MiniMax 开放平台文档中心](https://platform.minimaxi.com/docs/pricing/overview)
- [MiniMax API Pricing](https://www.minimax.io/pricing)

**豆包 / 火山方舟**
- [兼容 OpenAI SDK - 火山方舟](https://www.volcengine.com/docs/82379/1330626?lang=zh)
- [Base URL 及鉴权 - 火山方舟](https://www.volcengine.com/docs/82379/1298459?lang=zh)
- [结构化输出(beta) - 火山方舟](https://www.volcengine.com/docs/82379/1568221?lang=zh)
- [迁移至 Responses API - 火山方舟](https://www.volcengine.com/docs/82379/1585128)
- [模型价格 - 火山方舟](https://www.volcengine.com/docs/82379/1544106?lang=zh)
- [原理及选型（上下文缓存）- 火山方舟](https://www.volcengine.com/docs/82379/1398933?lang=zh)
- [大模型备案说明 - 火山方舟](https://www.volcengine.com/docs/82379/1471389)

**海外基线**
- [Migrate to the Responses API | OpenAI API](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Chat Completions Overview | OpenAI API Reference](https://developers.openai.com/api/reference/chat-completions/overview)
- [Structured model outputs | OpenAI API](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI SDK compatibility - Claude API Docs](https://docs.anthropic.com/en/api/openai-sdk)
- [OpenAI compatibility | Gemini API | Google AI for Developers](https://ai.google.dev/gemini-api/docs/openai)

**私有化推理**
- [Structured Outputs - vLLM](https://docs.vllm.ai/en/latest/features/structured_outputs/)
- [OpenAI-Compatible Server - vLLM](https://docs.vllm.ai/en/v0.8.3/serving/openai_compatible_server.html)
- [Structured Outputs - SGLang Documentation](https://docs.sglang.io/docs/advanced_features/structured_outputs)

**国内合规**
- [精心整理｜2025大模型（生成式人工智能服务）备案 - 知乎](https://zhuanlan.zhihu.com/p/16792939911)
- [AI产品上线必看：算法备案、大模型备案、大模型登记，到底怎么选？- 阿里云开发者社区](https://developer.aliyun.com/article/1741693)
- [算法备案、大模型备案与登记：一文厘清 AI 合规核心要点 - 上海市锦天城律师事务所](https://www.allbrightlaw.com/CN/10475/9d795e4543aa51ea.aspx)
