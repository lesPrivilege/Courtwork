// Installed provider declarations, not live model capabilities or permissions.
// Connections keep their own identities and credential slots. The harness owns
// sessions and tool execution independently of this protocol registry.
export const PROVIDER_DEFINITION_VERSION = "courtwork-provider-1/pi-0.85.1";
export const FAKE_PROVIDER_ID = "fake-openai-loopback";
export const DEEPSEEK_PROVIDER_ID = "deepseek";
export const OPENAI_PROVIDER_ID = "openai";
export const COMPATIBLE_DEFINITION_ID = "openai-compatible";
export const PROVIDER_API_FORMATS = Object.freeze(["openai-completions", "openai-responses"]);

const protocol = (id, endpoint, reasoningFormat) => Object.freeze({ id, endpoint, reasoningFormat });
const definition = (id, title, kind, credential, protocols) => Object.freeze({
  id, title, kind, credential, version: PROVIDER_DEFINITION_VERSION,
  source: "installed-adapter", defaultApi: protocols[0].id, protocols: Object.freeze(protocols),
});
export const PROVIDER_DEFINITIONS = Object.freeze([
  definition(OPENAI_PROVIDER_ID, "OpenAI", "catalog", "api-key", [
    protocol("openai-completions", "provider-default", "openai"),
    protocol("openai-responses", "provider-default", "openai"),
  ]),
  definition(DEEPSEEK_PROVIDER_ID, "DeepSeek", "catalog", "api-key", [
    protocol("openai-completions", "provider-default", "deepseek"),
    // The installed host does not supply a native Responses endpoint for this
    // provider. An external API's newer documentation does not change that.
    protocol("openai-responses", "explicit", "openai"),
  ]),
  definition(FAKE_PROVIDER_ID, "Local test", "local", "fixture", [
    protocol("openai-completions", "host-fixed", "none"),
  ]),
  definition(COMPATIBLE_DEFINITION_ID, "OpenAI-compatible", "compatible", "api-key", [
    protocol("openai-completions", "explicit", "openai"),
    protocol("openai-responses", "explicit", "openai"),
  ]),
]);

export const providerDefinition = id => PROVIDER_DEFINITIONS.find(entry => entry.id === id) ?? null;
export const connectionDefinitionId = connection => connection?.kind === "compatible"
  ? COMPATIBLE_DEFINITION_ID : connection?.providerIdentity;
export const connectionDefinition = connection => providerDefinition(connectionDefinitionId(connection));

// Used both at configuration and Run admission. Caller retains connection
// endpoint/identity checks, credential lookup and all tool authorization.
export function providerRouteError(connection, { api, baseUrl }) {
  const format = connectionDefinition(connection)?.protocols.find(entry => entry.id === api);
  if (!format) return "unsupported API format for this provider";
  if (format.endpoint === "explicit" && !baseUrl) return "this provider API format requires an explicit endpoint";
  return null;
}

export function declaredProtocolCompatibility(definitionId, api) {
  const format = providerDefinition(definitionId)?.protocols.find(entry => entry.id === api);
  if (!format) throw new TypeError("unsupported provider protocol registration");
  return {
    thinkingFormat: format.reasoningFormat === "deepseek" ? "deepseek" : "openai",
    supportsReasoningEffort: format.reasoningFormat !== "none",
    requiresReasoningContentOnAssistantMessages: format.reasoningFormat === "deepseek",
    requiresThinkingAsText: false,
  };
}
