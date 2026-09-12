// Host-owned capability projection for the two installed protocol adapters.
// A boolean is never evidence of a concrete parameter ladder.
import { REASONING_EFFORTS } from "../server/provider-fields.mjs";

export const MODEL_ADAPTER_VERSION = "courtwork-reasoning-1/pi-0.85.1";
export function declaredThinkingMap(entry) {
  return Object.fromEntries(REASONING_EFFORTS.map(level => [level,
    entry.reasoningEfforts?.includes(level) ? (level === "off" ? "none" : level) : null]));
}

export function describeReasoning(model, { entry = null, api = model?.api, baseUrl = model?.baseUrl } = {}) {
  const sameEndpoint = (baseUrl ?? "").replace(/\/+$/, "") === (model?.baseUrl ?? "").replace(/\/+$/, "");
  const supportedApi = api === "openai-responses" || (api === "openai-completions"
    && model?.compat?.supportsReasoningEffort !== false
    && [undefined, "openai", "deepseek"].includes(model?.compat?.thinkingFormat));
  let source = "unknown", kind = "unknown", values = [];
  if (supportedApi && api === model?.api && sameEndpoint && entry?.reasoningEfforts !== null && entry?.reasoningEfforts !== undefined) {
    source = "user-declared";
    values = entry.reasoningEfforts.filter(level => typeof model?.thinkingLevelMap?.[level] === "string");
    kind = values.length ? "enum" : entry.reasoningEfforts.length ? "unknown" : "unsupported";
  } else if (supportedApi && sameEndpoint && !entry && model) {
    source = "runtime-catalog";
    values = model.reasoning === true ? REASONING_EFFORTS.filter(level => typeof model.thinkingLevelMap?.[level] === "string") : [];
    kind = values.length ? "enum" : model.reasoning === false ? "unsupported" : "unknown";
  }
  return { kind, source, values, defaultMode: "omit", adapterVersion: MODEL_ADAPTER_VERSION,
    notice: kind === "unknown" ? "Supported reasoning settings are unknown. Provider default omits the parameter." : source === "user-declared" ? "Settings declared for this connection; provider behavior has not been verified." : "Settings from the installed runtime catalog; provider behavior has not been verified." };
}
