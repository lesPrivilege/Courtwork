# Provider 注册与能力快照探索

核验日：2026-09-14。范围：官方 OpenAI / DeepSeek API 文档实开核对；本地源码只读。此稿是研究登记，不作最终架构裁决；未发真实或付费 API 请求。

## 外部协议差异

| 面 | OpenAI 文档声明 | DeepSeek 文档声明 | 登记含义 |
|---|---|---|---|
| 连接与 wire | 官方 SDK 默认读取 `OPENAI_API_KEY`；REST 示例用 Bearer key 与 `/v1/responses`。[O1] | 声明 OpenAI 格式兼容，示例 `base_url=https://api.deepseek.com`、Bearer key；Chat Completions 与 Responses 是不同 wire。[D1] | 复用 SDK/格式只说明部分协议相容，不能推出路由、参数、响应状态与工具能力互换。 |
| 工具 schema / 并行 | Strict function schema 要求对象 `additionalProperties:false` 且 properties 全部 required；Responses 可尝试规整，不合规则回退为非 strict（响应标记 `strict:false`），Chat Completions 默认非 strict。支持 `tool_choice` 控制与关闭并行。[O2] | Strict 需 `/beta` endpoint，且只接受文档所列 JSON Schema 子集；Chat 工具调用只代表模型建议，应用仍须自行执行。Responses 兼容表称 `parallel_tool_calls` 被忽略、实际始终启用。[D2][D4] | 能力按确切 model × connection × wire 记录 schema 子集、strict、tool choice、parallel 的实际语义；不得用同名参数推断同义。 |
| Streaming | Responses 的 HTTP SSE 是带类型与固定 schema 的 semantic events（如 text delta、function-argument delta、completed）。[O4] | Chat 示例用 `stream=true`；thinking stream 区分 `reasoning_content` 和 `content`。Responses 文档列 `stream` 支持，但 `stream_options` 不支持。[D3][D4] | Provider协议Adapter 分 wire 解码事件，不把 reasoning delta 当作用户正文；streaming 能力不能仅记成布尔值。 |
| Reasoning / 参数 | `reasoning.effort` 的值、默认值及可用 endpoint 随模型变化；当前模型页示例中，GPT-6 Astra 不接受 `none`，且其 function calling 需 Responses。[O3] | Chat 格式用 `thinking.type` 开关和 `reasoning_effort`；文档映射不是一一对应（例如 medium/xhigh → high）。Thinking mode 下 temperature/presence/frequency penalty 无效，top_p 有下限；带 tools 的后续请求必须回传 reasoning_content，否则 400。[D3] | 参数值、默认、wire 编码与对话回传要求都属模型/协议能力；unknown 或 unsupported 要明确拒绝显式请求，不静默删参或降级。 |
| Provider 原生工具 | Responses 将 built-in、MCP 与 function/custom tools 分列；function call 仍由调用方解析并执行。[O1][O2] | 当前实开 Responses 兼容表对 function 标支持、对 custom 仅列 apply_patch，其余列出的 built-in/MCP 类型标忽略。[D4] | Host customTools 的定义/暴露/授权/执行与 Provider 托管工具分开。DeepSeek 同一文档 URL 的搜索索引摘要曾列 web_search 支持，而本次打开页面列为忽略；该项记为待核验，不据此宣称可用。 |

## 登记建议（候选，不裁决）

Settings 可继续统一展示 Models；运行时保留独立责任：ProviderDefinition 描述 provider/wire/auth 与原生工具；Connection instance 持有 endpoint、wire、credential reference 与 model IDs；ModelCapability snapshot 绑定 exact model、connection revision、wire、adapter version、来源与采集时点，逐项记 reasoning 映射、函数 schema 子集、strict/tool choice/parallel、stream event grammar（值可为 unknown/unsupported/明确枚举）；Provider协议Adapter 负责每个 wire 的请求编码、响应/流解码及必要字段往返；Harness adapter 另持session、工具循环、取消与恢复契约，两者不合并注册身份。Harness 注册的 Host customTools 只在 capability 可表达时投影 schema，Host policy 单独决定是否暴露/批准/执行。provider 原生托管工具不自动成为 Host customTool，也不授予 Host 权限。

每个 Run 固定 connection/model/wire/capability 与 adapter 版本，并记录工具 schema 与 policy 绑定；设置或能力更新供 future-run 使用，不能改写已绑定 Run。当前主线源码已有 connection 独立 endpoint/wire/model list 与 credential 分离、reasoning capability 的 unknown/unsupported/enum、Pi native DeepSeek thinking payload 映射；本稿不是从零缺失的判断。依据只读源码：`app/server/provider-connections.mjs:1-9,67-85,109-124`、`app/runtime/model-capabilities.mjs:1-27`、`app/runtime/pi-session-runtime.mjs:42-113`、`app/docs/runtime-foundation.md:143-153,259-271`。这些是主线 HEAD `f937c98a` 的代码声明；仓库 README/架构快照由父代理登记。外部官方 API 文档不证明本机 `pi-coding-agent@0.85.1` 对应路径全部已接线，本次也未作真实运行验证。

## 反例验收候选

1. 对标记为 unknown/unsupported 的 reasoning level 或 strict schema 显示明确阻断与原因；不能删掉参数、去掉 strict 后仍报成功。
2. DeepSeek Responses 请求若依赖 `parallel_tool_calls:false` 或 `previous_response_id`，应在发送前指出该 wire 不满足语义（官方表称其忽略/不支持），不能静默声称串行或有状态。
3. DeepSeek thinking + tools 多轮往返保留原始 `reasoning_content`；只复用普通 content 的后续请求不得伪装成成功续接。
4. 模型虽收到 Host tool schema，但 Host policy deny/未授权时，返回的 function_call 不执行；Provider 原生 hosted-tool 声明也不得绕过 Host customTools 的注册与授权。
5. 更新 connection 或 capability 时，活跃 Run 仍绑定旧版本；仅新 Run 使用更新后的 endpoint/model/wire/tool exposure。

## 官方来源（均在核验日打开）

- [O1 OpenAI Developer quickstart](https://developers.openai.com/api/docs/quickstart) — API key、SDK 与 Responses 请求。
- [O2 OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling) — tool choice、strict、parallel 与调用方执行。
- [O3 OpenAI Reasoning models](https://developers.openai.com/api/docs/guides/reasoning) — effort 与模型/endpoint 差异。
- [O4 OpenAI Streaming API responses](https://developers.openai.com/api/docs/guides/streaming-responses) — HTTP SSE 与 typed semantic events。
- [D1 DeepSeek Your First API Call](https://api-docs.deepseek.com/guides/function_calling) — OpenAI-compatible endpoint、Bearer key 与 Chat 请求。
- [D2 DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls) — function schema、strict beta 与 Chat/Responses 差异。
- [D3 DeepSeek Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) — thinking/effort、reasoning_content 与参数限制。
- [D4 DeepSeek Using the Responses API](https://api-docs.deepseek.com/guides/responses_api) — 参数与工具兼容矩阵、静默忽略项。
