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
  scope.projectId === null ? "every project" : "this project";

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
      "In progress",
      "sessionCandidates",
      `Chats with recorded activity, ${where}, right now.`,
    ),
    tile(
      "Needs a look",
      "inspectionCandidates",
      `Runs recorded failed or unknown, ${where}, right now.`,
    ),
  ];
}

const projectName = (projects, id) =>
  projects.find((project) => project.id === id)?.name ?? null;

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
