import path from "node:path";

/* 06b B2 · the bounded, display-only request summary for the trusted built-in
 * `repo_list` (contract: 06b-dogfood-friction-20260920.md, "B2 bounded
 * repo_list request summary"). It records what was requested at execution
 * start, never authorization, resolved filesystem identity or success.
 *
 * Owners: the Pi mapper derives a candidate from the start event's arguments;
 * the Host keeps it only for its own `repo_list` and applies known-secret
 * redaction; the Store admits it at its serialized mutation boundary (first
 * summary per call wins, per-Run budget). Every stage reapplies
 * `boundRequestSummary`; anything it cannot admit is omitted, not repaired. */

export const REQUEST_SUMMARY_TOOL = "repo_list";
export const REQUEST_SUMMARY_RUN_LIMIT = 32;
const VERSION = 1;
const MAX_PATH_CHARS = 1000; // repo_list's own parameter bound
const MAX_DISPLAY_CODE_POINTS = 256;
const MAX_SERIALIZED_BYTES = 2048;
const OMITTED_REASONS = new Set(["invalid_path", "unsafe_display", "run_limit"]);
const KEYS = "omittedReason,path,truncated,version";
// Display-unsafe: C0/C1 controls and DEL (the request-telemetry display rule).
// POSIX allows most of these in filenames, so this is not an execution verdict.
const UNSAFE_DISPLAY = /[\u0000-\u001f\u007f-\u009f]/u;

/** The repository read path rule the Store applies to recorded reads. */
export function isLexicalRepositoryPath(value) {
  return value === "." || (!path.isAbsolute(value) && !value.includes("\\")
    && value.split("/").every(part => part && part !== "." && part !== ".."));
}

// A display-truncated path keeps every complete segment valid; its cut last
// segment may be any prefix.
function isLexicalPrefix(value) {
  return value.length > 0 && !path.isAbsolute(value) && !value.includes("\\")
    && value.split("/").slice(0, -1).every(part => part && part !== "." && part !== "..");
}

const omitted = omittedReason => ({ version: VERSION, path: null, truncated: false, omittedReason });

/** Candidate summary from repo_list's start arguments. Only `path` is read;
 * every other argument is omitted. The path is kept whole here so known-secret
 * redaction runs before any display cut. */
export function summarizeRepoListArgs(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return omitted("invalid_path");
  const value = Object.hasOwn(args, "path") ? args.path : ".";
  if (typeof value !== "string" || value.length > MAX_PATH_CHARS || value.includes("\0") || !isLexicalRepositoryPath(value)) return omitted("invalid_path");
  if (UNSAFE_DISPLAY.test(value) || !value.isWellFormed()) return omitted("unsafe_display");
  return { version: VERSION, path: value, truncated: false, omittedReason: null };
}

/** Validate a summary and apply the display and serialized bounds. Returns
 * the bounded summary, or null when the value is not an admissible summary. */
export function boundRequestSummary(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== KEYS) return null;
  const { version, path: requested, truncated, omittedReason } = value;
  if (version !== VERSION || typeof truncated !== "boolean") return null;
  if (omittedReason !== null) {
    return OMITTED_REASONS.has(omittedReason) && requested === null && truncated === false ? omitted(omittedReason) : null;
  }
  if (typeof requested !== "string" || requested.length > MAX_PATH_CHARS || requested.includes("\0")
    || UNSAFE_DISPLAY.test(requested) || !requested.isWellFormed()) return null;
  if (!(truncated ? isLexicalPrefix(requested) : isLexicalRepositoryPath(requested))) return null;
  const points = Array.from(requested);
  const cut = points.length > MAX_DISPLAY_CODE_POINTS;
  const summary = { version: VERSION, path: cut ? points.slice(0, MAX_DISPLAY_CODE_POINTS).join("") : requested, truncated: truncated || cut, omittedReason: null };
  return Buffer.byteLength(JSON.stringify(summary), "utf8") <= MAX_SERIALIZED_BYTES ? summary : null;
}

/** The Host's eligibility rule: exactly one offered tool is named repo_list,
 * and it is the repository owner's own object — an extension, MCP or other
 * tool with the same name never inherits eligibility. */
export function isSoleBuiltinRepoList(tools, builtinTools) {
  const named = tools.filter(tool => tool?.name === REQUEST_SUMMARY_TOOL);
  const builtin = builtinTools.find(tool => tool?.name === REQUEST_SUMMARY_TOOL);
  return Boolean(builtin) && named.length === 1 && named[0] === builtin;
}

/** Store admission for one event's data inside the serialized mutation.
 * Only the first tool.start of a (runId, callId) may carry a summary; at most
 * REQUEST_SUMMARY_RUN_LIMIT non-omitted summaries per Run. The underlying
 * event is never dropped: an inadmissible summary is removed from it. */
export function admitRequestSummary(events, { runId, type, data }) {
  if (!data || typeof data !== "object" || !Object.hasOwn(data, "requestSummary")) return data;
  const { requestSummary, ...rest } = data;
  if (type !== "tool.start" || rest.name !== REQUEST_SUMMARY_TOOL || typeof rest.callId !== "string" || !rest.callId) return rest;
  const summary = boundRequestSummary(requestSummary);
  if (!summary) return rest;
  let recorded = 0;
  for (const event of events) {
    if (event.runId !== runId || event.type !== "tool.start") continue;
    if (event.data?.callId === rest.callId) return rest;
    if (event.data?.requestSummary && event.data.requestSummary.omittedReason === null) recorded += 1;
  }
  return { ...rest, requestSummary: summary.omittedReason === null && recorded >= REQUEST_SUMMARY_RUN_LIMIT ? omitted("run_limit") : summary };
}
