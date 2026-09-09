# BE-PREVIEW · 未保存连接的模型发现与最小握手

状态：本轮实际派工；覆盖 BE-17/18 的探测范围，作者/验证结果见证据包。实现作者配置 `gpt-6-astra / low`，不向 Luna 转派关键代码。基线 `a431650`，分支 `codex/astra-provider-preview`。

## 问题与现状

用户在保存连接前需要知道目标是否响应、是否接受所提供凭据以及返回什么模型。当前 GET `/provider-models` 仅返回安装的本地 runtime catalog；配置与凭据 PUT 会持久改变状态，不能借它们临时测试表单再“恢复”。

本单提供独立、短生命周期的探测请求，不创建 Run，不生成文本，不改变已保存配置、凭据、ModelRuntime 或 Session 绑定。它完成发现/握手能力，不声称模型可生成或质量可用。

## 写权与 API

允许 `app/server/provider-preview.mjs`（新有界 helper）、`app/server/service.mjs`、`app/server/index.mjs`、`app/tests/provider-preview.test.mjs`（或等义新测试）、`app/docs/runtime-foundation.md` 与 `evidence/backend-dispatch-20260909/provider-preview-author.md`。不改前端、provider registry、Core、lockfile、个人数据或其他派单文件。

采用现有 token 认证的两个 POST：`/api/v5/provider-models/discover` 与 `/api/v5/provider-connection/test`。请求显式携带 `baseUrl`、选定的兼容协议/模式、可选 `apiKey`；具体字段与允许枚举由作者在正式文档冻结。首版仅支持 OpenAI-compatible 模型目录握手，local 是部署位置，不推断为 Ollama 原生等另一协议。

`baseUrl` 定义为 API 根：例如 `http://127.0.0.1:<port>/v1`，模型目录为其下 `/models`。明确尾斜杠规则，不盲目追加第二个 `/v1`。允许用户明确给出的 HTTP(S) 目标及 loopback；拒绝 userinfo/query/hash、非法协议与重定向，不隐式探测局域网或供应商地址。只使用请求中的合成/显式凭据，不读取已保存的个人 key。首版不支持任意 headers。

必须有超时、响应字节上限、模型数量/字段限额与格式检查；探测失败返回不含上游响应 body、header、key、栈或带秘密 URL 的稳定机器状态与显示原因。400 用于本地无效请求；上游成功/认证失败/不可达/超时/不支持/畸形目录等正常探测结果用一个明确冻结的结构表达。Test 只证明目录端点/认证的最小握手，不把空目录或握手通过写成 inference-ready。

只返回受支持的可信字段。上游模型名等字符串是数据，不作为 HTML、日志或执行参数。不得猜测 contextWindow/reasoning/effort 等能力；缺失则保留未知。GET `/provider-models` 的旧本地语义不变。

## 验收与退出边界

使用本地合成 HTTP server 和独立临时 runtime，覆盖成功/空目录、401/403、其他HTTP失败、畸形/超限JSON、超时、重定向、无效body/URL、秘密不回显和鉴权要求。至少通过实际HTTP路由证明 before/after 配置、已保存凭据和Run/Session绑定不变；不以mock helper替代服务集成。

作者执行受影响测试、既有 provider/配置回归，再按实际变化执行全量与 smoke；实际命令和失败保留在作者回执。非作者固定 diff 复核与必要复跑后由根 Astra 接收。

**未覆盖**：保存任意 compatible/local 模型并让现有 runtime 执行。当前 provider/model allowlist 仍有效；该能力需要另一张明确的 registry/credential/Session binding 契约，不能靠本次发现结果自动注册。FE-02 可消费本单探测结果，但不得据此显示未实现的 Save/Run 为可用。此剩余接缝进入后端队列，不伪称完整连接旅程完成。
