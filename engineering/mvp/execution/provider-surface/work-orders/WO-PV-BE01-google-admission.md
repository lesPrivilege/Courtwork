# WO-PV-BE01：`google` provider 准入（Fable，2026-09-10）

用户 2026-09-10 裁定首轮 dogfood 第二条为 `google` + Gemini API key（PV-12 / PV-19）。本单只做准入，不做 Vertex、不做多连接、不做网关。归属按 PV-1 为后端（Astra）；若改派本地 Opus，写权与禁令不变。

基线：`main` `ee6df72` 或其后的 main 头。凭据只在 Web UI 输入（PT2 既有裁定），本单交付时真实 provider 证据栏保持 `not_run`。

## 事实前提（EX-PV1 / EX-PV2 已核）

- pi-ai 0.85.1 内置 `googleProvider()`：`baseUrl` `https://generativelanguage.googleapis.com/v1beta`，`auth:{apiKey: envApiKeyAuth("Gemini API key", ["GEMINI_API_KEY"])}`，`api: googleGenerativeAIApi()`，模型目录 `GOOGLE_MODELS` 自带 `contextWindow` / `maxTokens` / `thinkingLevelMap`（`dist/providers/google.js:5-14`）。
- Courtwork 今日的闭集只有一处定义（`app/server/service.mjs:39`），传输格式闭集两条（`app/runtime/pi-session-runtime.mjs:24`），且 `api` 的 `stream` / `streamSimple` 派发是显式表（同文件 L74-77），改 `model.api` 一处不足。
- 凭据教条：继承的 `DEEPSEEK_API_KEY` 在启动时被剥离并记日志，`~/.pi/agent/auth.json` 与环境变量均不作为凭据来源（`app/tests/credentials.test.mjs` T-CRED-1 / 3 / 5）。

## 做什么

1. **身份准入**：`ALLOWED_PROVIDER_IDS` 增 `google`；`pi-session-runtime.mjs` 的注册循环把 `google` 纳入（沿 `deepseek` / `openai` 同一条 `registerNativeProvider` 路径，不新写一套）。
2. **传输格式**：`API_FORMATS` 增 `google-generative-ai`，并在 `api` 派发表登记其 `stream` / `streamSimple`（来自 pi-ai `dist/api/google-generative-ai*`）。校验保持对称：`google` 选非目录格式时必须显式给 `baseUrl`，与 DeepSeek 同规则（`service.mjs:694` 的形状，不要写成 provider 专属分支——若能改成"目录格式取自 provider 记录"的通用判断，优先如此）。
3. **凭据**：沿现有路径（UI 输入 → `credentials.json` 的 `google` 键 → `setRuntimeApiKey`）。**新增剥离**：继承的 `GEMINI_API_KEY` 与 `GOOGLE_API_KEY` 须与 `DEEPSEEK_API_KEY` 同样在启动时剥离并记日志。不引入任何 ambient 凭据来源（ADC、`GOOGLE_APPLICATION_CREDENTIALS`、gcloud 配置文件一概不读）。
4. **目录**：`/provider-models` 自然带出 Gemini 模型；核验 `contextWindow`、`supportedEfforts`、`defaultEffort` 三字段对 Gemini 系模型确有值（thinkingLevelMap → `getSupportedThinkingLevels`），若某档位映射为空，如实记录，不在 host 侧自造档位。`allowModelNetwork` 保持 false，`modelsPath` 保持 null。
5. **三层校验一致**：HTTP 输入、Run 发起复核（`service.mjs:1001-1010`）、持久化层（`store.mjs:60-75`）三处对新格式的判断必须同步，缺一处即为未交付。

## 不做

Vertex / ambient credentials（PV-20，须用户单独裁定）；OAuth；多连接与连接注册表（BE-21）；`lastVerifiedAt`（BE-28）；error class（BE-38）；自定义网关与手工模型录入（PV-21）；目录联网刷新；前端任何改动（PV-M-1 的写入合一属 PV 前端单）；真实网络调用进测试。

## 验收

- 现有全量测试不放宽；`app/tests/credentials.test.mjs` 增 `GEMINI_API_KEY` / `GOOGLE_API_KEY` 剥离用例（T-CRED-3 同形）；provider-config 校验、`/provider-models` 列表、Run 发起门（503 `provider_unsupported` / `effort_unsupported`）各增 `google` 用例。
- 作者验证：`npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app run smoke`；全程 local-fake / loopback，不联网。
- 交付页写：基线 SHA、改动文件、三层校验对照表、新增用例原文、Gemini 模型的目录字段实测表、未检项、待裁定。真实 provider 证据栏写 `not_run`，理由为凭据只在 UI 输入。
