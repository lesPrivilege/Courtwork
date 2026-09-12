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

/** API-specific, source-aware capability; missing metadata remains unknown. */
export function reasoningCapabilityOf(catalog, provider, model, api, baseUrl) {
  const models = catalog?.models;
  const unknown = { kind: "unknown", source: "unknown", values: [], defaultMode: "omit", notice: "" };
  if (!Array.isArray(models)) return unknown;
  const entry = models.find((m) => m.provider === provider && m.id === model);
  if (!entry) return unknown;
  if (typeof baseUrl === "string" && baseUrl.trim()) {
    const endpoint = value => String(value || "").replace(/\/+$/, "");
    if (endpoint(baseUrl) !== endpoint(entry.baseUrl)) return {
      ...unknown,
      notice: "A custom endpoint has no verified reasoning ladder. Provider default will be used.",
    };
  }
  const descriptor = (api && entry.reasoningByApi?.[api]) || entry.reasoningCapability;
  if (descriptor && typeof descriptor === "object") return {
    kind: ["enum", "unknown", "unsupported"].includes(descriptor.kind) ? descriptor.kind : "unknown",
    source: typeof descriptor.source === "string" ? descriptor.source : "unknown",
    values: Array.isArray(descriptor.values) ? descriptor.values.filter((value) => typeof value === "string") : [],
    defaultMode: "omit",
    notice: typeof descriptor.notice === "string" ? descriptor.notice : "",
  };
  if (Array.isArray(entry.supportedEfforts) && entry.supportedEfforts.length) return {
    kind: "enum", source: "unknown", values: entry.supportedEfforts, defaultMode: "omit", notice: "",
  };
  return unknown;
}

/** Exact legal enum values for this model/API; unknown is the empty set. */
export function supportedEffortsOf(catalog, provider, model, api, baseUrl) {
  return reasoningCapabilityOf(catalog, provider, model, api, baseUrl).values;
}

/** A provider default plus at least one explicit enum value needs a selector. */
export function effortSelectable(supported) {
  return Array.isArray(supported) && supported.length > 0;
}

/**
 * 把"当前配置 + 这次改了什么"投影成一个完整的 `PUT /provider-config` 请求体。
 *
 * - `change` 里出现的键即本次的显式意图，`undefined` 与 `null` 都算显式（清空）。
 * - 没出现的键从 `current` 带过去 —— 这就是两处写入不再互相清字段的原因。
 * - `baseUrl` 只在**身份未变**时自动带走：换了 provider，旧端点不再是关于它的陈述。
 * - `reasoningEffort` is carried only when the selected API declares that exact value;
 *   unknown/unsupported capability means provider default (omit), never a guessed level.
 */
export function projectProviderConfig(current, change = {}, catalog = null) {
  const has = (key) => Object.hasOwn(change, key);
  const provider = has("provider") ? change.provider : current?.provider;
  const model = has("model") ? change.model : current?.model;
  const api = has("api") ? change.api : current?.api;
  const sameIdentity = provider === current?.provider;
  const baseUrl = has("baseUrl") ? change.baseUrl : sameIdentity ? current?.baseUrl : undefined;
  const effort = has("reasoningEffort") ? change.reasoningEffort : current?.reasoningEffort;
  const supported = supportedEffortsOf(catalog, provider, model, api);
  const keepEffort =
    effort !== undefined && effort !== null && supported.includes(effort);
  return {
    provider,
    model,
    api,
    ...(baseUrl ? { baseUrl } : {}),
    ...(keepEffort ? { reasoningEffort: effort } : {}),
  };
}
