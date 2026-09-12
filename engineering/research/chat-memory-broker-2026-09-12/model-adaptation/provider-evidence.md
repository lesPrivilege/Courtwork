# Provider官方合同与成熟实现 · 有界核查

查阅日2026-09-12。Astra使用OpenAI Docs检索并读取官方页面；Luna分别读取其余官方文档和上游实现。只读研究，无真实Provider请求；文档随时间变化，以下不是永久模型大全。未在本Host启用的Provider仅为适配目标。网页未提供固定修订号时不伪造revision，后续实现必须重新核验所支持的精确model/API。

## 官方能力矩阵

| Provider / 接口 | 读取到的能力事实 | Adapter / UI处置 |
|---|---|---|
| OpenAI Responses / Chat Completions | reasoning支持值与默认依模型而变。示例 `gpt-6-astra`官方模型页列low/medium/high/xhigh/max；reasoning指南明确不支持none，并限制其Chat Completions function calling。`GET /models`只给ID/owner等基础目录字段，不给逐effort能力表。 | 模型页/接口合同和已实现adapter共同决定支持集，目录可见不推导参数；Responses `reasoning.effort` 与Chat字段分别编码。截图Light不自动映射任何API值。 |
| Anthropic Messages | Models API可提供effort各档与thinking类型的capability；effort、adaptive thinking及extended thinking budget有不同模型适用条件，部分型号不可关闭。 | 优先消费真实capability并结合精确型号默认/互斥合同；effort与thinking mode/budget分别建描述，不能把“推理模型”布尔值扩成所有档位。 |
| Gemini GenerateContent | Models API给thinking标记、generation methods及token limits，但非完整逐档枚举；Thinking文档按型号区分level与budget。Gemini 3系列常用thinkingLevel，2.5使用thinkingBudget；各型号合法值/关闭能力不同。 | boolean只证明声明的thinking能力，不足以生成梯子；维护官方逐型号约束并由adapter验证。minimal不承诺Off，level/budget不能随意同时发送。 |
| DeepSeek / OpenAI-compatible | `/models`缺少精确参数能力；Thinking文档区分模式与effort，兼容输入可能映射到同一native强度，且某些参数会被忽略。 | 按连接与API格式登记，不因OpenAI-compatible就继承OpenAI枚举；保持requested、encoded及实际Provider观察的差异，不从200证明参数有效。 |

OpenAI依据：[reasoning指南](https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort)、[Astra模型页](https://developers.openai.com/api/docs/models/gpt-6-astra)、[List models](https://developers.openai.com/api/reference/resources/models/methods/list)。该例只用于证明逐型号/逐接口约束，未选择迁移目标、核验当前账户访问权或宣称截图中的所有模型已受本Host支持。

Anthropic依据：[Models API](https://platform.claude.com/docs/en/api/models/list)、[effort](https://platform.claude.com/docs/en/build-with-claude/effort)、[thinking限制](https://platform.claude.com/docs/en/build-with-claude/thinking-troubleshooting)、[extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)。文档中的更多新型号不是本地SDK自动可用清单。

Gemini依据：[Models API](https://ai.google.dev/api/models)、[Thinking](https://ai.google.dev/gemini-api/docs/thinking)。Google返回的usage/thought计数只作为事后观察；未提供数值时不补零，不靠思考摘要是否出现判定模式。

DeepSeek依据：[Models API](https://api-docs.deepseek.com/api/list-models)、[Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/)、[Models表](https://api-docs.deepseek.com/quick_start/pricing)。模型/接口差异须原生核验，不能把某兼容层映射跨路由复制。

### 两处精确核验

Anthropic的Models API实际schema示例包含 `capabilities.effort` 下逐值supported与 `capabilities.thinking.types`；因此可读取真实声明，不必从model名称猜能力。具体运行连接返回值仍需Host核验。

DeepSeek [Responses endpoint](https://api-docs.deepseek.com/api/create-response/)明确以 `reasoning.effort` 的none/low/high/max为枚举，同时接受minimal→low、medium/xhigh→high的兼容映射；省略默认启用。Thinking指南对OpenAI格式分别描述thinking开关和reasoning_effort。应按endpoint登记，不能把“兼容接受多个别名”画成多个可区分强度。此页未提供稳定文档revision，只记录查阅日。

## 上游参数成功与真实生效

以上发现支持一个工程结论：**没有通用、全Provider的完整能力握手协议**。能返回结构化capability的消费其返回；只能返回模型列表的需要有来源、可维护的adapter合同；只有人工声明的保留人工来源。自动生成或继承通用档位没有证据基础。

请求成功、服务端明确回显某项设置、Provider实际生成的thinking token数量，是不同观察。存在默认、adaptive行为或静默忽略时，任何单一观察都不能还原全部内部配置。尤其现Courtwork `effectiveEffort`来自Pi session设置，不是上游实效证明，见[接线差额](implementation.md)。

## 成熟实践消费

Luna固定读取Pi canonical仓库 `earendil-works/pi` 的提交 `71dca871bc80b6bc97be37f0ca3189399d651fff`，其pi-ai版本0.85.1与Courtwork锁定版本一致。版本相同不等于每份本地文件字节相同；本地主线事实仍以另一位Luna的源码核查为准。未扩大到更多UI库，因为现有Pi picker已能回答本片“descriptor→projection”接缝问题。

| 上游机制 | 消费裁决 | 固定来源 |
|---|---|---|
| Provider描述和模型元数据与picker分层 | 采用数据描述经Host注册，再由UI消费的关系；不注册上游UI代码 | [Provider contract](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/models.ts#L88-L148)、[model字段](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/types.ts#L844-L865)、[picker](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/coding-agent/src/modes/interactive/components/model-selector.ts#L161-L182) |
| 静态目录、动态overlay与可选远端刷新 | 安装目录和用户endpoint发现分开；不把Pi目录refresh称为每连接握手 | [remote catalog](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/coding-agent/src/core/remote-catalog-provider.ts#L45-L130)、[refresh gate](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/coding-agent/src/core/model-runtime.ts#L172-L214) |
| model thinkingLevelMap与Provider wire映射 | 精确支持项及null排除可消费；SDK缺省规则不升级为上游声明。OpenAI-compatible、DeepSeek、OpenRouter、Google不同wire编码留在adapter | [map合同](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/README.md#L1141-L1166)、[compatible映射](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/api/openai-completions.ts#L914-L963)、[Google映射](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/api/google-shared.ts#L31-L50) |
| supported-level helper与clamp | 不照搬无精确map时的通用梯子，也不静默采用相邻档。UI提交不合法时由Host拒绝并保留草稿 | [过滤与clamp](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/models.ts#L913-L944) |
| 按provider/model解析与auth路由 | 独立连接Provider身份可消费；配置CAS、active Run冻结及持久回执继续由Courtwork Host负责 | [lookup](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/models.ts#L230-L323)、[request routing](https://github.com/earendil-works/pi/blob/71dca871bc80b6bc97be37f0ca3189399d651fff/packages/ai/src/models.ts#L641-L700) |

Astra明确不采用探索建议中的“unknown fail closed到Off”：unknown、省略设置与明确关闭不等价。这里的保守处理是禁用无来源的参数选择，保留未知并按已定义的Provider default/无参数路径处理；不承诺关闭推理。SDK clamp也必须在准入前识别，不能把它的结果默认为用户已选值。

研究与接受职责：Luna提供官方和上游只读证据，Astra裁定消费/拒绝，另一位Luna核对本地主线与合同差额；没有以文档或上游源码替代真实连接/Run验证。
