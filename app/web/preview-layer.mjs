/* The example workspace: one synthetic story shown in the product's own
 * projections until real work exists (ONE-SHOT 2026-09-11 stage 4).
 *
 * It is a projection layer over `request()`, not a runtime: recorded responses
 * from the canonical capture fixture (evidence/semantic-polish-merge-20260911/
 * capture-fixture.mjs) answer the work-data reads the surfaces make, and any
 * write aimed at an example object is refused locally with a sentence. Nothing
 * here touches the user's data directory, usage, history, approvals or receipts;
 * the host's own facts (bootstrap, provider config, runtime info, extensions)
 * are never overridden. Entry is automatic only on a workspace with no projects;
 * the layer leaves for good when a real Run is admitted, and can be left or
 * reopened explicitly. The state kept per device is one word in localStorage. */

export const PREVIEW_STORAGE_KEY = "schema-engineering.preview.v1";
export const PREVIEW_SAMPLES_URL = "/web/samples/preview/responses.json";

/* IDs that identify a durable object in a mutation payload. Free-form input
 * text is deliberately excluded: mentioning an example in a prompt does not
 * target that example. */
const MUTATION_ID_FIELDS = new Set([
  "id",
  "projectId",
  "project_id",
  "sessionId",
  "session_id",
  "runId",
  "run_id",
  "questionId",
  "question_id",
  "attentionId",
  "attention_id",
  "matterId",
  "matter_id",
  "sourceId",
  "source_id",
  "candidateId",
  "candidate_id",
  "supersedes",
]);

/* Reads the example answers; everything else stays real. */
const WORK_ROUTES = [/^\/projects(?:\?|$)/, /^\/sessions(?:\/|\?|$)/, /^\/runs\//, /^\/work-summary\?/, /^\/work-activity\?/, /^\/work-usage-details\?/, /^\/work-derivations\?/, /^\/attention(?:\/|$)/, /^\/coordination\//];

export class PreviewRefusal extends Error {
  constructor(message) { super(message); this.name = "PreviewRefusal"; this.preview = true; }
}

export function readPreviewMemory(storage) {
  try { const value = storage?.getItem(PREVIEW_STORAGE_KEY); return value === "off" || value === "established" ? value : null; }
  catch { return null; }
}
export function writePreviewMemory(storage, value) {
  try { if (value) storage?.setItem(PREVIEW_STORAGE_KEY, value); else storage?.removeItem(PREVIEW_STORAGE_KEY); } catch { /* optional */ }
}

function hashBody(body) {
  const text = JSON.stringify(body ?? null);
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
export const requestKey = (method, path, body) => `${method.toUpperCase()} ${path}${method.toUpperCase() === "GET" ? "" : `#${hashBody(body)}`}`;

export function shouldBypassPreviewStats({ previewActive = false, realProjectCount = 0 } = {}) {
  return Boolean(previewActive && realProjectCount > 0);
}

export function createPreviewLayer({ storage = null, fetchSamples = null } = {}) {
  const state = { available: false, active: false, samples: null, ids: new Set(), story: null, reason: null };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(state); };

  function bodyTargetsExample(value, key = null, seen = new Set()) {
    if (key && MUTATION_ID_FIELDS.has(key) && typeof value === "string" && state.ids.has(value)) return true;
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    for (const [childKey, child] of Object.entries(value))
      if (bodyTargetsExample(child, childKey, seen)) return true;
    return false;
  }

  function index(samples) {
    const map = new Map();
    for (const entry of samples.entries || []) map.set(requestKey(entry.method, entry.path, entry.body), entry);
    state.samples = map;
    state.ids = new Set(samples.ids || []);
    state.story = samples.story || null;
  }

  return {
    get available() { return state.available; },
    get active() { return state.active; },
    get story() { return state.story; },
    get reason() { return state.reason; },
    memory() { return readPreviewMemory(storage); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* Loads the recorded story once; a workspace without the sample file has no example. */
    async load() {
      if (state.samples) return state.available;
      try {
        const samples = await (fetchSamples ? fetchSamples() : fetch(PREVIEW_SAMPLES_URL, { headers: { Accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)));
        if (!samples || !Array.isArray(samples.entries) || !samples.entries.length) { state.available = false; return false; }
        index(samples);
        state.available = true;
      } catch { state.available = false; }
      return state.available;
    },

    /* Automatic entry: no real projects, nothing remembered against it, samples present. */
    shouldAutoEnter({ projectCount }) {
      return state.available && projectCount === 0 && readPreviewMemory(storage) === null;
    },
    enter() { if (!state.available || state.active) return false; state.active = true; state.reason = null; emit(); return true; },
    /* `established` is written when a real Run was admitted; `dismissed` when the person left. */
    leave(reason = "dismissed") {
      if (!state.active) return false;
      state.active = false; state.reason = reason;
      writePreviewMemory(storage, reason === "established" || readPreviewMemory(storage) === "established" ? "established" : "off");
      emit();
      return true;
    },
    /* Reopening the example after leaving it does not erase the memory that real work exists. */
    reopen() { if (!state.available) return false; if (readPreviewMemory(storage) === "off") writePreviewMemory(storage, null); state.active = true; state.reason = null; emit(); return true; },
    isExampleId(id) { return state.ids.has(String(id)); },
    isExamplePath(path) { for (const id of state.ids) if (path.includes(encodeURIComponent(id)) || path.includes(id)) return true; return false; },

    /* The one seam: returns {payload} to answer locally, {refuse} to stop a write
     * against an example object, or null to let the real request through. */
    intercept(path, { method = "GET", body } = {}) {
      if (!state.active || !state.samples) return null;
      const upper = method.toUpperCase();
      const isWork = WORK_ROUTES.some((route) => route.test(path));
      if (!isWork) return null;
      const readLikePost = upper === "POST" && path === "/attention/query";
      if (upper !== "GET" && !readLikePost && bodyTargetsExample(body))
        return { refuse: new PreviewRefusal("This is an example. Start your own chat from Home or New chat; the example changes nothing.") };
      if (upper === "GET" || readLikePost) {
        const exact = state.samples.get(requestKey(upper, path, body));
        if (exact) return { payload: structuredClone(exact.payload) };
        // The story is finished: an incremental events page past what was
        // recorded is empty, never an error, so polling settles quietly.
        const events = path.match(/^\/sessions\/([^/]+)\/events\?afterSeq=(\d+)$/);
        if (events && state.ids.has(decodeURIComponent(events[1]))) return { payload: { events: [], lastSeq: Number(events[2]) } };
        if (upper === "POST") {
          const any = [...state.samples.values()].find((entry) => entry.method === "POST" && entry.path === path && entry.body?.projectId === body?.projectId);
          if (any) return { payload: structuredClone(any.payload) };
        }
        if (this.isExamplePath(path)) return { payload: null, status: 404, message: "This part of the example was not recorded." };
        return null;
      }
      // Writes: only those aimed at example objects are refused; real objects go through.
      if (this.isExamplePath(path) || path === "/attention/query") {
        if (/\/draft$/.test(path)) return { payload: { ok: true, preview: true } };
        return { refuse: new PreviewRefusal("This is an example. Start your own chat from Home or New chat; the example changes nothing.") };
      }
      return null;
    },
  };
}
