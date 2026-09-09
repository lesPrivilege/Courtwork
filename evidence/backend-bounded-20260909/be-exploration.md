# Backend bounded exploration evidence

2026-09-09. This is a read-only consumer audit at `codex/backend-bounded-20260909` / `fd3861b15ce4875b37af674d8c9dd0798d258fd4`. It checks the remaining backend requests against the latest CC-W handoff and current runtime/Core sources. No product source, HTTP route, schema, migration, credential, or provider code was changed for this audit.

## BE-2 — surface tabs

The request is still explicitly a backend gap: `engineering/mvp/execution/work-surface-kit/backend-requests.md:6` describes the current `kind` / `runId` / `fileRef` surface as single-valued and asks for multi-document state. The current host state confirms that shape in `app/web/app.mjs:143-169`; `activateSurface` writes one `kind` at `app/web/app.mjs:3698-3712`, while `openRun` and `openFile` overwrite the one `runId` or `fileRef` at `app/web/app.mjs:3714-3722`. Opening file A then B therefore leaves only B addressable. The `/surface` response at `app/server/service.mjs:700-712` is a separate extension/projection read and does not, by itself, prove that a backend tab API must exist or that it does not.

The latest CC-W work order sets the bounded target at four static module kinds plus at most one document tab, while requiring reuse of the single-value surface and forbidding a new endpoint, field, or state container such as a multi-document map (`engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md:69-84,110-123`). Multi-document instances, per-tab scroll, and pin/persistence semantics therefore remain BE-2 follow-up work for the contract owner to coordinate. This audit does not re-specify the frontend behavior or grant CC-W a new state container or ephemeral-instance write authority. The current `docs/interface-components.md:5` still carries the pre-CC-W “not a third column” wording; the work order `:105-116` is the pending contract revision, not evidence that the revision or BE-2 exists.

The renderer boundary agrees: the module contract says the host owns selected kind, tab strip, renderer lifecycle, and formal state (`app/web/surface-modules.mjs:1-18`), while the exploration records the four static type tabs and overwrite behavior (`engineering/mvp/execution/work-surface-kit/explore/ex-cc1-three-pane-tabs.md:48-61`). This supports the safe recommendation above and does not support a backend tab ledger.

## BE-30 — optimistic authorization concurrency

Permission payloads already carry `toolCallId` and `contentSha256` (`app/server/store.mjs:190-199`), but the answer path does not compare either value. `answerQuestion` accepts only `{answer}` for ask-user or `{decision}` for permission and maps all storage races to generic `question_unavailable` (`app/server/service.mjs:1171-1198`). The queued mutation checks pending status and run admission, then resolves the question without an expected-payload comparison (`app/server/store.mjs:493-505`).

Minimal first failure: a client submits the requested `expectedContentSha256` (or `expectedToolCallId`) with its decision, but the current request shape rejects the extra field with an HTTP 400 input-validation error instead of comparing it to the pending payload. The ordinary two-client double-answer race is already correctly rejected as `question_unavailable` by the pending/status checks and is not the BE-30 failure. BE-30 remains an indexed request (`engineering/mvp/execution/work-surface-kit/backend-requests.md:41`); it needs an expected-hash/tool-call comparison and an explicit `version_mismatch` contract.

## BE-31 — structured question schema and sensitive-information guard

The persisted question schema is limited to `kind`, `prompt`, `payload`, status, answer, decision, and `createdAt` (`app/server/store.mjs:178-200`). An `ask_user` question requires `payload === null`; the service accepts a free-text answer up to 4000 characters (`app/server/service.mjs:1180-1185`). There is no requested primitive schema, enum definition, or server-side sensitive-information check. Consequently, a `question.open` event cannot tell a renderer what constrained input is required, and the host cannot enforce the MCP elicitation rule requested by BE-31 (`engineering/mvp/execution/work-surface-kit/backend-requests.md:42`). This stays indexed pending the schema/validation contract.

## BE-32 — event time

`appendEventToState` creates events with exactly `seq`, `runId`, `sessionId`, `type`, and `data`; it does not attach a timestamp (`app/server/store.mjs:215-221`). The runtime contract defines the same fields and no time field (`app/docs/runtime-api-proposal.md:170-195`). A trace middle layer therefore cannot display event times from the event stream without fabricating them or reusing an unrelated record time. BE-32 remains a request (`engineering/mvp/execution/work-surface-kit/backend-requests.md:43`); no bounded consumer workaround is evidence of an event timestamp.

## BE-33 — unfinished tool result reason

The Pi adapter maps tool start/update/end to `tool.start`, `tool.update`, and `tool.result`, carrying `isError` only; it has no cancellation, timeout, or unfinished-reason mapping (`app/runtime/pi-session-runtime.mjs:341-375`). The projection marks a tool finished only when it sees `tool.result` (`app/web/thread-projection.mjs:41-65`). The UI consequently derives `Interrupted` from a missing result plus a failed/cancelled Run and otherwise says `Unknown` (`app/web/app.mjs:2410-2416,2595-2616,2664-2675`).

This is the documented low-priority gap (`engineering/mvp/execution/work-surface-kit/backend-requests.md:44`). The current inference should stay in place until the runtime event source defines a stable terminal reason enum and ownership rule; otherwise a backend field would merely rename an unknown fact. No BE-33 implementation is claimed here.

## BE-14 / BE-15 / BE-16 — recorded metadata gaps

* **BE-14.** The Core `decision` table has no `decidedAt` column (`app/core/core.py:245-256`); `_full_state` selects no decision time (`app/core/core.py:723-750`), and the insert writes no time (`app/core/core.py:839-845`). `matter_view` exposes the decisions as-is (`app/core/bridge.py:400-423`). The requested time is still an unimplemented ledger item (`engineering/mvp/execution/work-surface-kit/backend-requests.md:23`); a UI clock or run start time would not be a decision time.
* **BE-15.** `matter_view` has a top-level title (`app/core/bridge.py:400-423`), but `list_work` returns only `matter_view(...)["matter"]` (`app/core/bridge.py:741-744`), so the Continue-existing list does not receive that title. There is also no recent-decision timestamp to return. The request remains indexed at `engineering/mvp/execution/work-surface-kit/backend-requests.md:24`.
* **BE-16.** `getRuntimeInfo` reports API/version, adapter, state, provider, capabilities, limits, cache, recovery, and authority, but no data directory or stable workspace identifier (`app/server/service.mjs:352-372`). The stable identifier/path requested for General › Data is therefore unavailable, as recorded at `engineering/mvp/execution/work-surface-kit/backend-requests.md:25`; the current settings copy correctly treats the data directory as not reported (`docs/interface-components.md:57`).

## Verification and stop condition

Source inspection used the current branch/HEAD above, the latest `backend-requests.md` and CC-W work order, and the exact files/line ranges cited in this record. Pre-existing tracked and untracked working-tree changes (including `engineering/execution/2026-09-09-backend-bounded/README.md`) were preserved. No implementation is warranted within this bounded read-only assignment. The remaining requests stay indexed for Astra contract/architecture ownership; this evidence does not claim BE-2, BE-14–16, or BE-30–33 delivery or product acceptance.
