# WO-PV-BE02：连接身份与发现模型准入（薄切片）（Fable，2026-09-10）

目标是 PV-25 的最小可执行层：一条用户填写的兼容连接，持有自己的 Base URL、api 格式、自己的 key 与一个来自发现的模型 ID，保存后能真跑一次 run，且 run 记录读得出它用了哪条连接。不做连接管理大页，不做多连接并列切换，不做 Vertex，不做错误类重构。

基线：`main` `ee6df72` 或其后的 main 头。凭据只在 Web UI 输入，交付时真实 provider 证据栏 `not_run`。归属按 PV-1 为后端。

## 事实前提（EX-PV1 / EX-PV2 / EX-PV4 已核，勿重推）

- `ModelRuntime` 有三个方法：`registerNativeProvider`（整体替换，今日对 deepseek / openai / fake 用的就是它）、`registerProvider`（字段级合并，今日**未被调用**，正对应"用户填的 baseUrl + key + 模型列表"）、`unregisterProvider`（今日从未调用）。provider 查找发生在 `stream()` 调用当刻（`pi-ai/dist/api/lazy.js:36-38`），已发出的请求不受后续注册影响；跨请求的原子性由 Courtwork 自己的 `active_run` 门提供，pi 不提供。
- `registerProvider` 走的 `applyExtension` 路径**没有任何默认值**（`pi-coding-agent/dist/core/provider-composer.js`）：缺字段静默通过校验，代价后移——缺 `contextWindow` 在首次 Run 的 `resolveCompactionPolicy` 抛错（`app/runtime/pi-session-runtime.mjs:132-136`），缺 `cost` 在首次计费抛 `TypeError`，缺 `reasoning` 静默降为 `["off"]`。
- 运行期凭据是"provider id → 单槽"的 `Map`（`pi-coding-agent/dist/core/runtime-credentials.js`）：两个不同 id 可各持一把 key，同一 id 不能持两把。`AuthResult.source` 是自由文本，`getProviderAuthStatus` 再归成 `runtime` / `stored` / `environment` 三档；Courtwork 今日从不读它。
- 启动次序：`createIsolatedModelRuntime()` 在 `RuntimeService` 存在之前跑（`app/server/runtime.mjs:32-47`），`initialize()` 只重指配置指针与重注入已存 key。今日没有任何一步会重注册用户定义的连接。

## 做什么

1. **连接身份**：新增持久化的连接记录，字段至少 `{id, providerIdentity, api, baseUrl, models:[{id, contextWindow|null}], credentialStatus}`。运行期为每条用户连接注册一个**独立的 provider id**（由连接 id 派生，与目录身份 `openai` / `deepseek` / `google` 的命名空间不重叠），用 `registerProvider` 注册，删除时 `unregisterProvider`。禁止把用户连接注册到目录 provider id 上——凭据单槽会互相覆盖（PV-26）。
2. **连接作用域凭据**：`credentials.json` 的键从 provider id 改为连接 id（目录连接也各自是一条连接）。这是破坏性改动，按项目惯例直接迁移，不留兼容层：迁移一次，旧键按其 provider 对应的默认连接归位，迁移写进交付页。
3. **发现模型准入**：`POST /provider-models/discover` 的结果可被选中并保存到连接的 `models` 列表；保存后 `#setProviderConfig` 的"模型必须命中已装目录"判断对用户连接改为"必须命中该连接自己的模型列表"。目录连接的判断不变。
4. **未知能力如实处理（PV-27 / PV-30）**：发现来的模型 `contextWindow` 为 `null`。**不猜值、不套同名模型**。首次 Run 不得因此抛错：对未知窗口的连接，压缩策略走 `resolveCompactionPolicy` 的既有诚实分支（`enabled:false` 时返回降级策略而不抛），即该连接默认关闭压缩，并在 run 记录与 `/provider-config` 响应里显式标出"context window unknown, compaction disabled"。用户可选填一个窗口值以启用压缩；填了就按填的值走，并记录该值来源是用户输入而非目录。
5. **成本**：Model 记录给显式零成本以避开 `calculateCost` 的 `TypeError`，但 usage 面必须能把它与"真的是 0"区分开——沿用既有 `missing` / `Not reported` 语义，不得显示 `$0.00` 当作事实。若现有 usage 结构区分不了，如实写进待裁定，不自造字段。
6. **重启恢复**：启动时在 `ModelRuntime` 建好之后、服务可接请求之前重注册全部已存连接。模型列表为空或过期的连接注册成功但发起 Run 时仍走既有 `provider_unsupported` 门（503），不得在启动期抛错使宿主起不来。
7. **凭据来源可回溯**：run 记录里记下该次用的连接 id 与凭据来源档（消费 `getProviderAuthStatus` 的 `runtime` / `stored` / `environment`，不自造分类）。这是 PV-24 "可回溯"的落点。
8. **保存时的错误区分**：保存一条兼容连接失败时，至少区分认证失败、目录不可达、模型不在该目录三类——BE-17/18 的 `status` 枚举已有这三类，直接消费。运行期错误分类仍是粗粒度（`classifyRuntimeError` 今日只能靠正则认出认证失败），属 BE-38，本单不动。

## 不做

Vertex / ambient credentials（PV-D1）；OAuth；多连接并列切换与连接管理页；`lastVerifiedAt`（BE-28）；错误类重构（BE-38）；目录联网刷新；任意 provider 身份的完整网关形态（PV-D2）；前端改动（归 WO-PV-FE01）。

## 验收

- 现有全量测试不放宽。新增：连接记录的增删改查、两条连接各持自己的 key 且互不覆盖、用户连接注册到独立 provider id、发现模型可保存并通过 Run 发起门、未知窗口连接首次 Run 不抛错且压缩关闭并被记录、重启后连接可用、迁移用例（旧 `credentials.json` 形状 → 新键）。
- 凭据教条不放宽：继承环境变量仍剥离，`~/.pi/agent/auth.json` 仍不读，新增用例覆盖用户连接路径。
- 作者验证：`npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app run smoke`，全程 local-fake / loopback 不联网；兼容连接用本地 fixture 目录（fake loopback 或本地 HTTP fixture）验证端到端。
- 交付页：基线 SHA、字段与迁移表、三层校验对照、未知能力的呈现原文、新增用例原文、未检项、待裁定。
