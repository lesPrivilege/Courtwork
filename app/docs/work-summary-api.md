# Work summary API (C4 work-index increment)

`GET /api/v5/work-summary` is a read-only Dashboard/Threads query. It uses the
existing `x-work-token`, Host/Origin checks, `no-store` response, and error envelope.
No schema migration, execution-loop change, provider call, AgentSession opening,
workspace read, transcript parsing, or implicit view/ack write is performed.

## Query and bounds

All parameters are optional, single-valued; unknown/repeated keys are 400
`invalid_input`. `projectId` is a nonblank string up to 200 characters; an unknown
project gives empty collections, matching the existing session-list behavior.
`limit` is an integer 1–100 (default 50), applied separately to all three sets.
`sessionsOffset`, `pendingOffset`, `inspectionOffset` are nonnegative safe integers,
default 0. Numeric syntax is decimal digits without signs or leading zeroes except
`0` itself. Invalid bounds/syntax are 400. An offset beyond total returns no items
with the actual total, `hasMore:false`, and `truncated:true`.

Each collection has `{items,total,offset,limit,truncated,hasMore,nextOffset}`.
`total` counts the entire filtered set before paging. `truncated` means this page
omits items before or after it (including an out-of-range offset); it is not an
empty/inbox-complete signal. `nextOffset` is null at the end. To expand a set,
repeat the same projectId/limit with its returned nextOffset in the corresponding
parameter; the other offsets are independent. There is no silent hard cap on
accessible candidates beyond per-response limits.

Pages are fresh reads, not a retained transaction: concurrent changes can shift
offsets, causing duplicates or omissions across pages. Deduplicate by the source
ID and refresh from offset 0 to reconcile. There is no stable multi-request export
or global transaction cursor in this version. Never infer “no pending work” from
an error, `truncated:true`, or an empty page with nonzero offset/total. Read errors
use the existing 500 `internal_error`, never a successful empty fallback.

## Response allowlist

- `observedAt`: server observation time (ISO timestamp), not a global version.
- `sessionVersions`: unique `{sessionId,lastSeq}` for the union of sessions in the
  three returned pages, ordered by sessionId ascending. `lastSeq` is that session's
  event high-water mark; it is neither comparable across sessions nor a revision
  for fields changed without events. Sessions contributing only to totals have
  no version entry until their item is paged in.
- `sessionCandidates.items`: `{projectId,sessionId,title,createdAt,
  recordedActivityAt,latestRun}`. Includes all sessions, including those with no
  Run (`latestRun:null`). A candidate identifies a session the UI can reopen;
  it does not promise immediate Run admission while another Run is active.
  `latestRun` is `{runId,status,startedAt,endedAt}` from greatest startedAt,
  breaking ties by runId ascending. `recordedActivityAt` is the greatest session
  createdAt and all of its recorded Run start/end timestamps. It excludes draft
  edits, user visits and events lacking timestamps. Sort: recordedActivityAt
  descending, sessionId ascending. No priority or “recently visited” is inferred.
- `pendingItems.items`: `{projectId,sessionId,runId,questionId,kind,createdAt,label}`.
  Only `pending` ask_user/permission records with a running/waiting_user Run,
  admissionOpen true, and a live answer receiver are included. Fixed labels are
  `Answer requested` and `Permission requested`; clients can localize by kind.
  Sort: createdAt ascending, questionId ascending. Prompt, answer, permission
  payload, file path and content preview are intentionally absent.
- `inspectionCandidates.items`: `{projectId,sessionId,runId,status,startedAt,
  endedAt,errorCode,resultAt}` for failed/unknown Runs only. `errorCode` is the
  recorded code or null; no error message/body is copied. `resultAt` is endedAt
  or, if absent, startedAt. Sort: resultAt descending, runId ascending. This is a
  status-filtered candidate set, **not unread, unacknowledged, approval, or open
  work**. Historical failed/unknown Runs stay locatable when later Runs succeed.

All identifier ties use deterministic string/code-unit order, independent of
locale. Timestamps are compared by parsed instant. Completed/cancelled Runs may
appear as the latest Run of a session, but not as inspection or pending items.
No raw store snapshot, credential, work/session token, host path, provider config,
material body, full prompt, tool payload or alternate event stream is returned.
User-authored session titles and recorded error codes retain their source meaning;
this endpoint does not claim to redact secrets users deliberately put in titles.

## Consistency and detail flow

The service samples live receiver IDs and derives all pages, totals and lastSeq
synchronously from a single published store state without `await`. Store mutations
publish a replacement state after persistence; an in-flight mutation can therefore
leave a response seeing the previous committed state. A response never joins an
old question with a newer terminal Run. Closed admission hides a pending question
even before its later cancellation record is persisted. Restart initialization
expires old questions and marks interrupted Runs unknown before HTTP is available.

On click, refetch `GET /api/v5/runs/:runId` and the existing
`GET /api/v5/sessions/:sessionId` (or session events with afterSeq) for the current
Run and question/permission event details. Reconcile open with resolved events;
do not present the summary label as permission to execute. Submit only through
`POST /api/v5/runs/:runId/questions/:questionId` with the existing `{answer}` or
`{decision}` body. The existing 409 run_closed/question_unavailable remains
expected for a stale summary; refresh on conflict. The summary changes no answer,
cancellation or permission semantics.

Known inherited C4-r1 boundary: overlapping cancel/answer requests can commit an
answer after the stopping event because the existing answer mutation does not
recheck admission. Independent probes reproduce this in both the frozen baseline
and this increment (the probed runs still finish cancelled without writing the
file). This does not mean a new answer request after cancellation completes is
accepted; that sequential stale case returns 409. Atomic writer admission repair
is a separate lifecycle change, not a guarantee added by this read-only endpoint.

## First-version scale boundary

This is an in-process scan of the existing resident state: O(S+R+Q) inspection,
plus O(S log S + P log P + F log F) sorting and O(S+R+P+F) temporary storage,
where P/F are pending/inspection candidates. Output is at most 100 items per set
and 300 session version entries. It does not scan/copy events or read host JSONL
or workspace bytes. The underlying whole-state persistence and memory limits
still apply; this is not an indexed or unlimited-scale query service.
