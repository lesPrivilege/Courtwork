/* PV-54: shared pure configuration projection; no DOM or host authority. */
/* PV-M-1 · 一个配置，一处投影。
 *
 * `PUT /api/v5/provider-config` 整体替换配置：请求体里没有的字段就是被清掉的字段。
 * 在此之前有两个写入方各自装配请求体 —— 模型选择器带 `reasoningEffort` 不带完整
 * 端点，Settings 的连接表单带端点不带 effort —— 于是"保存连接"会静默清掉已选档位，
 * "选模型"会在换 provider 时丢掉端点。两处都不是错的写法，错的是有两处写法。
 *
 * 这里是那唯一一处：读同一份 `/provider-config` 快照，按同一套规则装配同一个字段集。
 * 调用方只说自己改了什么，没说的字段由快照带过去。 */

/** `PUT /provider-config` 的字段闭集（`app/docs/runtime-foundation.md`）。 */
export const PROVIDER_CONFIG_FIELDS = Object.freeze([
  "provider",
  "model",
  "api",
  "baseUrl",
  "reasoningEffort",
]);

/** 目录为这个 provider/model 声明的档位。目录没有这条模型时返回 `null` ——
 * 那是"不知道"，不是"只有 off"，两者在下面的携带规则里处置不同。 */
export function supportedEffortsOf(catalog, provider, model) {
  const models = catalog?.models;
  if (!Array.isArray(models)) return null;
  const entry = models.find((m) => m.provider === provider && m.id === model);
  if (!entry) return null;
  return Array.isArray(entry.supportedEfforts) && entry.supportedEfforts.length
    ? entry.supportedEfforts
    : ["off"];
}

/** 目录未声明多于一档时不出选择器（PV-27）：只出 `Off`。 */
export function effortSelectable(supported) {
  return Array.isArray(supported) && supported.length > 1;
}

/**
 * 把"当前配置 + 这次改了什么"投影成一个完整的 `PUT /provider-config` 请求体。
 *
 * - `change` 里出现的键即本次的显式意图，`undefined` 与 `null` 都算显式（清空）。
 * - 没出现的键从 `current` 带过去 —— 这就是两处写入不再互相清字段的原因。
 * - `baseUrl` 只在**身份未变**时自动带走：换了 provider，旧端点不再是关于它的陈述。
 * - `reasoningEffort` 只在目标模型的目录声明里**确实支持**时带走。目录没声明这条
 *   模型（`supportedEfforts` 为 `null`）时按"无从核对"原样带走，由后端裁决；目录
 *   声明了却不含该档位时省略 —— 带上去只会换来一个 `invalid_effort` 的保存失败，
 *   而丢一个这条模型本来就没有的档位不是丢字段。
 */
export function projectProviderConfig(current, change = {}, catalog = null) {
  const has = (key) => Object.hasOwn(change, key);
  const provider = has("provider") ? change.provider : current?.provider;
  const model = has("model") ? change.model : current?.model;
  const api = has("api") ? change.api : current?.api;
  const sameIdentity = provider === current?.provider;
  const baseUrl = has("baseUrl") ? change.baseUrl : sameIdentity ? current?.baseUrl : undefined;
  const effort = has("reasoningEffort") ? change.reasoningEffort : current?.reasoningEffort;
  const supported = supportedEffortsOf(catalog, provider, model);
  const keepEffort =
    effort !== undefined && effort !== null && (supported === null || supported.includes(effort));
  return {
    provider,
    model,
    api,
    ...(baseUrl ? { baseUrl } : {}),
    ...(keepEffort ? { reasoningEffort: effort } : {}),
  };
}
