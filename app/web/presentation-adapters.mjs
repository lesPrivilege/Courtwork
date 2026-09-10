/* WO-WK13 · The only place in app/web that knows the shape of GET /work-summary.
 *
 * Signatures follow `engineering/mvp/execution/work-surface-kit/contracts/
 * presentation-primitives.d.ts` (WK-34 / WK-80). The three rules of that file
 * hold here and nowhere else:
 *
 *   1. Time is passed through as the server's own UTC ISO string. This module
 *      never computes "how long ago" and never re-cuts a day boundary; the view
 *      renders the instant in the browser's local zone (EX-WK5 §4.3, G-3).
 *   2. A missing fact is an explicit null, never 0 and never "". A set the
 *      response did not carry yields `value: null` and `page: null`, so the view
 *      renders the missing label instead of a number (FN-28, DC-1).
 *   3. Adapters are pure: no fetch, no cache, no Date.now(), and no sort that
 *      overrides the server's published ordering (work-summary-api.md).
 *
 * The metric definition, scope, window and missing value are fixed here rather
 * than in the component, because a component that decides what a number means
 * is a component that can quietly change it (boundaries §5).
 */

/** Visible text for a set the response did not carry. Not a zero. */
const MISSING_LABEL = "Not available";
/** Visible text for a session that has no recorded run. Not "Completed". */
const MISSING_RUN_LABEL = "No run recorded";

/** Pagination facts are passed through verbatim; `truncated` / `hasMore` are the
 * server's own words for "there is more than you are seeing" (ux-conventions §4). */
function pageFacts(page) {
  if (!page) return null;
  return {
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    truncated: page.truncated,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
  };
}

/* `scope.projectId === null` means every project; the caption says which,
 * because a count without a scope is not a fact about anything. */
const scopeWords = (scope) =>
  scope.projectId === null ? "all retained work" : "this project";

/**
 * work-summary → the three tiles of Home's top band (WK-37).
 *
 * The window is `current` for all three: the three sets are a snapshot of
 * standing state and the response carries no day filter, so there is no "today"
 * reading to be had (EX-WK5 §1, gaps-wk9 G-3). `observedAt` is the moment the
 * host read the response — the caller passes `summary.observedAt`, which is the
 * server's own stamp; this module does not call the clock.
 */
export function toStatTiles(summary, { scope, observedAt, load }) {
  const where = scopeWords(scope);
  const window = { kind: "current" };
  const tile = (label, key, caption) => {
    const page = summary?.[key];
    return {
      label,
      value: page ? page.total : null,
      missingLabel: MISSING_LABEL,
      caption,
      window,
      scope,
      observedAt,
      load,
    };
  };
  return [
    tile(
      "Waiting for you",
      "pendingItems",
      `Open questions and approval requests, ${where}, right now.`,
    ),
    tile(
      "Continue",
      "sessionCandidates",
      `Retained chats, ${where}, right now.`,
    ),
    tile(
      "Needs a look",
      "inspectionCandidates",
      `Runs recorded failed or unknown, ${where}, right now.`,
    ),
  ];
}

const projectName = (projects, id) =>
  id === null ? "Global Attention" : projects.find((project) => project.id === id)?.name ?? null;

/**
 * work-summary.sessionCandidates → the lower band's WorkCards. The row state and
 * the card state consume this same output; only the field selection differs
 * (WK-56), which is why no display concern appears in the shape.
 */
export function toWorkCards(summary, projects) {
  const page = summary?.sessionCandidates;
  return {
    items: (page?.items ?? []).map((item) => ({
      sessionId: item.sessionId,
      title: item.title || "Open chat",
      projectName: projectName(projects, item.projectId),
      projectId: item.projectId,
      runStatus: item.latestRun?.status ?? null,
      missingRunLabel: MISSING_RUN_LABEL,
      runStartedAt: item.latestRun?.startedAt ?? null,
      runEndedAt: item.latestRun?.endedAt ?? null,
      sessionCreatedAt: item.createdAt,
      recordedActivityAt: item.recordedActivityAt,
    })),
    page: pageFacts(page),
  };
}

/* ─────────────────── proposed contract additions (WK13) ───────────────────
 * `presentation-primitives.d.ts` shapes only the session set. The other two
 * sets of DC-2 carry different recorded fields and cannot be forced into
 * `WorkCardInput` without inventing values: `pendingItems` has no title and no
 * run status, `inspectionCandidates` has no session title and no createdAt.
 * Writing a pending item as a WorkCard would have to fill `missingRunLabel`
 * with "Permission requested", which says a run is absent when the truth is
 * that a question is open — exactly the fabrication rule 2 forbids.
 *
 * The two shapes below are therefore stated here and registered in
 * delivery-wk13.md as an addition for the contract owner to fold into the
 * `.d.ts`. They add no field the response does not carry.
 * ─────────────────────────────────────────────────────────────────────── */

/**
 * work-summary.pendingItems → the Waiting-for-you rows. `label` is the server's
 * own word for the request ("Permission requested" / "Answer requested",
 * work-summary.mjs); the client does not re-derive it from `kind`, and it does
 * not name the tool, because the summary does not carry one (copy-convention,
 * Astra 联调补充).
 */
export function toPendingRows(summary, projects) {
  const page = summary?.pendingItems;
  const titles = new Map(
    (summary?.sessionCandidates?.items ?? []).map((item) => [
      item.sessionId,
      item.title,
    ]),
  );
  return {
    items: (page?.items ?? []).map((item) => ({
      sessionId: item.sessionId,
      projectId: item.projectId,
      projectName: projectName(projects, item.projectId),
      title: titles.get(item.sessionId) || "Open chat",
      runId: item.runId,
      questionId: item.questionId,
      kind: item.kind,
      label: item.label,
      createdAt: item.createdAt,
    })),
    page: pageFacts(page),
  };
}

/**
 * work-summary.inspectionCandidates → the Needs-a-look rows. `status` is only
 * ever `failed` or `unknown`, and the two are kept apart: unknown is not a
 * failure that has been established, it is a result the host could not report
 * (FN-28). `errorCode` is null when the run recorded none.
 */
export function toInspectionRows(summary, projects) {
  const page = summary?.inspectionCandidates;
  const titles = new Map(
    (summary?.sessionCandidates?.items ?? []).map((item) => [
      item.sessionId,
      item.title,
    ]),
  );
  return {
    items: (page?.items ?? []).map((item) => ({
      sessionId: item.sessionId,
      projectId: item.projectId,
      projectName: projectName(projects, item.projectId),
      title: titles.get(item.sessionId) || "Open chat",
      runId: item.runId,
      status: item.status,
      errorCode: item.errorCode ?? null,
      runStartedAt: item.startedAt ?? null,
      runEndedAt: item.endedAt ?? null,
      resultAt: item.resultAt,
    })),
    page: pageFacts(page),
  };
}


/** Home read adapters reject unsupported or internally inconsistent packets.
 * Server-owned UTC buckets are never rebuilt from paginated summary rows. */
const validStamp = value => typeof value === "string" && Number.isFinite(Date.parse(value));
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
const DAY_MS = 86_400_000;
export function toHomeActivity(data, expectedDays = null) {
  if (!data || data.schemaVersion !== 1 || data.timeZone !== "UTC" || !validStamp(data.observedAt) ||
      data.coverage?.retainedRecords !== "complete" || data.coverage?.historical !== "unknown" ||
      data.scope?.kind !== "retained-recorded-runs" || data.scope.projectId !== null ||
      !Array.isArray(data.buckets) || !data.buckets.length || !nonnegative(data.recordedRunCount) ||
      !Number.isSafeInteger(data.interval?.days) || data.interval.days !== data.buckets.length ||
      (expectedDays !== null && data.interval.days !== expectedDays) || data.interval.runTimeField !== "startedAt" ||
      data.deduplicationKey !== "run.id") return null;
  const start = Date.parse(data.interval.start);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(11) !== "00:00:00.000Z" ||
      Date.parse(data.interval.endExclusive) !== start + data.interval.days * DAY_MS) return null;
  let total = 0;
  for (const [i,bucket] of data.buckets.entries()) {
    if (!bucket || bucket.date !== new Date(start + i * DAY_MS).toISOString().slice(0,10) || !nonnegative(bucket.recordedRunCount)) return null;
    total += bucket.recordedRunCount;
    if (!Number.isSafeInteger(total)) return null;
  }
  if (total !== data.recordedRunCount) return null;
  return {
    observedAt: data.observedAt, total, days: data.interval.days,
    coverage: "UTC · Retained runs only. Deleted-chat history is unknown.",
    buckets: data.buckets.map(({date, recordedRunCount: count}) => ({
      date, count, level: count === 0 ? 0 : count === 1 ? 1 : count < 4 ? 2 : count < 8 ? 3 : 4,
      label: `${date} · ${count} retained ${count === 1 ? "run" : "runs"} (UTC)`,
    })),
  };
}
export const attentionLabels = {
  investigating: "Investigating", needs_you: "Needs you", waiting: "Waiting", later: "Later", resolved: "Resolved",
};
const validAttention = item => item && item.schema_version === 1 &&
  typeof item.attention_id === "string" && item.attention_id.length > 0 && typeof item.descriptor?.title === "string" && item.descriptor.title.trim().length > 0 &&
  Object.hasOwn(attentionLabels,item.status) && Number.isSafeInteger(item.revision) && item.revision > 0 &&
  validStamp(item.updated_at) && ["current","unknown"].includes(item.freshness);
export function toHomeAttention(data) {
  if (!data || data.schema_version !== 1 || !Array.isArray(data.items) || !nonnegative(data.count) || !nonnegative(data.offset) ||
      typeof data.truncated !== "boolean" || data.truncated !== (data.next_offset !== null) || data.disclosure?.count_scope !== "visible" ||
      data.items.some(item => !validAttention(item)) || new Set(data.items.map(i=>i.attention_id)).size !== data.items.length ||
      (data.items.length && data.offset + data.items.length > data.count) ||
      (data.next_offset !== null && (!nonnegative(data.next_offset) || data.next_offset !== data.offset + data.items.length || data.next_offset <= data.offset || data.next_offset >= data.count || !data.truncated))) return null;
  return { count:data.count, offset:data.offset, nextOffset:data.next_offset,
    items:data.items.map(item=>({id:item.attention_id,title:item.descriptor.title,status:item.status,label:attentionLabels[item.status],revision:item.revision,updatedAt:item.updated_at})),
  };
}
export function toHomeAttentionDetail(data) {
  if (!validAttention(data) || typeof data.reason !== "string" ||
      (data.descriptor.summary !== null && typeof data.descriptor.summary !== "string")) return null;
  const next=data.next_action;
  if (!next || !["inspect","decide","wait","follow_up","none"].includes(next.kind) ||
      typeof next.label !== "string" || !["manual","at","after","external"].includes(next.trigger) ||
      (next.due_at !== null && !validStamp(next.due_at)) || (next.trigger === "at" && next.due_at === null)) return null;
  // Display fields only; grants and action descriptors never become controls.
  return { descriptor:{title:data.descriptor.title,summary:data.descriptor.summary}, status:data.status,
    reason:data.reason,next_action:{kind:next.kind,label:next.label,trigger:next.trigger,due_at:next.due_at},
    updated_at:data.updated_at,revision:data.revision,freshness:data.freshness };
}

/* WK-158 · `human_actions` → the closed set of editors this app understands.
 *
 * This is a validator, not a form generator. `payload_schema` is evidence that
 * the host and this app agree on the shape of an action that exists today; it
 * is not a licence to render arbitrary controls for an arbitrary future schema.
 * Each action below has a recognizer for the exact schema it was written
 * against, and anything else — an unknown action, a widened schema, a
 * descriptor whose `expected_revision` no longer matches the object that was
 * inspected — is omitted with a stated reason rather than guessed at.
 *
 * Pure, like every adapter in this file: no fetch, no clock, no request IDs, no
 * DOM, and no authority. A descriptor here says the host advertised the action;
 * the server may still refuse it. */
const NEXT_KINDS = ["inspect", "decide", "wait", "follow_up", "none"];
const NEXT_TRIGGERS = ["manual", "at", "after", "external"];
const STATUS_TARGETS = ["investigating", "needs_you"];
/* Advertised but deliberately not built here. `attach_relation` is relation
 * maintenance and needs its own entity-selection review; `request_disclosure`
 * is the policy editor (CC-P); `create` is not a detail action and
 * `record_signal` is Runtime-only. Omission is explicit, never a dead button. */
const OUT_OF_SCOPE = new Set(["attach_relation", "request_disclosure", "create", "record_signal"]);

const sameSet = (value, expected) => Array.isArray(value) && value.length === expected.length &&
  new Set(value).size === value.length && expected.every(entry => value.includes(entry));
const objectSchema = (schema, required, properties) => Boolean(schema) && schema.type === "object" &&
  schema.additionalProperties === false && sameSet(schema.required ?? [], required) &&
  sameSet(Object.keys(schema.properties ?? {}), properties);
/* A bounded string field returns its recorded maximum so the editor can honour
 * the host's own limit instead of inventing one. */
const boundedText = (schema, max) => schema && schema.type === "string" && schema.minLength === 1 &&
  schema.maxLength === max ? { maxLength: max } : null;
const enumField = (schema, values) => Boolean(schema) && sameSet(schema.enum, values);
function nextActionField(schema) {
  if (!objectSchema(schema, ["kind", "label", "trigger", "due_at"], ["kind", "label", "trigger", "due_at"])) return null;
  const { kind, label, trigger, due_at: due } = schema.properties;
  if (!enumField(kind, NEXT_KINDS) || !enumField(trigger, NEXT_TRIGGERS)) return null;
  if (!due || !sameSet(due.type, ["string", "null"]) || due.format !== "date-time") return null;
  const text = boundedText(label, 500);
  if (!text) return null;
  /* `none` is a recorded next action, not a disposition: snooze and set_waiting
   * both refuse it in the contract, so it is never offered by these editors. */
  return { kinds: NEXT_KINDS.filter(entry => entry !== "none"), triggers: [...NEXT_TRIGGERS], labelMaxLength: text.maxLength };
}
const reasonOnly = properties => ({ reason: boundedText(properties.reason, 4000) });
const ADAPTERS = {
  acknowledge: schema => objectSchema(schema, [], []) ? {} : null,
  resolve: schema => {
    if (!objectSchema(schema, ["reason"], ["reason"])) return null;
    const { reason } = reasonOnly(schema.properties);
    return reason ? { reason } : null;
  },
  snooze: schema => deferralFields(schema),
  set_waiting: schema => deferralFields(schema),
  resume: schema => statusFields(schema),
  reopen: schema => statusFields(schema),
};
function deferralFields(schema) {
  if (!objectSchema(schema, ["reason", "next_action"], ["reason", "next_action"])) return null;
  const { reason } = reasonOnly(schema.properties);
  const nextAction = nextActionField(schema.properties.next_action);
  return reason && nextAction ? { reason, nextAction } : null;
}
function statusFields(schema) {
  if (!objectSchema(schema, ["reason"], ["reason", "status"])) return null;
  const { reason } = reasonOnly(schema.properties);
  if (!reason || !enumField(schema.properties.status, STATUS_TARGETS)) return null;
  return { reason, status: { options: [...STATUS_TARGETS] } };
}
/* The order the choices are offered in: the cheapest disposition first, the two
 * that end the object's life last. */
const ACTION_ORDER = ["acknowledge", "resume", "set_waiting", "snooze", "resolve", "reopen"];

/**
 * @returns `{ actions, omitted }` — normalized descriptors this app can edit,
 * and every advertised action it will not render, with the reason it did not.
 * Returns `null` when the response carries no local human action list at all.
 */
export function toAttentionActionDescriptors(detail) {
  if (!detail || !Array.isArray(detail.human_actions) || !Number.isSafeInteger(detail.revision)) return null;
  const actions = [];
  const omitted = [];
  for (const descriptor of detail.human_actions) {
    const action = descriptor?.action;
    if (!descriptor || typeof action !== "string") { omitted.push({ action: null, reason: "malformed-descriptor" }); continue; }
    if (descriptor.schema_version !== 1) { omitted.push({ action, reason: "unsupported-schema-version" }); continue; }
    if (descriptor.expected_revision !== detail.revision) { omitted.push({ action, reason: "revision-mismatch" }); continue; }
    if (OUT_OF_SCOPE.has(action)) { omitted.push({ action, reason: "out-of-scope" }); continue; }
    const adapter = ADAPTERS[action];
    if (!adapter) { omitted.push({ action, reason: "unknown-action" }); continue; }
    const fields = adapter(descriptor.payload_schema);
    if (!fields) { omitted.push({ action, reason: "unsupported-payload-schema" }); continue; }
    actions.push({ action, expectedRevision: descriptor.expected_revision, fields });
  }
  actions.sort((left, right) => ACTION_ORDER.indexOf(left.action) - ACTION_ORDER.indexOf(right.action));
  return { actions, omitted };
}
