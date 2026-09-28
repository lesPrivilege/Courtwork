# B2 bounded repo_list request summary — author evidence (2026-09-28)

Author: original Claude (Opus). Contract: [06b B2 implementation contract](../../06b-dogfood-friction-20260920.md) (frozen `5769668`, Luna `unsafe_display` correction `2722c9c`). Source commit: `d1e9919` on `claude/request-details-b2-20260928`, isolated worktree from `2722c9c`. Author evidence only; not acceptance.

## What was built

| Owner (existing) | File | Change |
|---|---|---|
| Pi mapper | `app/runtime/pi-session-runtime.mjs` `mapSessionEvent` | `tool_execution_start` for `repo_list` only: a candidate `requestSummary` from `args.path` (Pi 0.85.1 `tool_execution_start.args`, emitted before Pi's own validation). Other tools, updates and results are unchanged. |
| Shared helper | `app/runtime/request-summary.mjs` (new) | `summarizeRepoListArgs`, `boundRequestSummary`, `isSoleBuiltinRepoList`, `admitRequestSummary`, and `isLexicalRepositoryPath`, which is the Store's recorded-read path rule moved here without change. |
| Host observation | `app/server/service.mjs` `#onObservation` / `#requestSummary` | Keeps the summary only when this Run's single `repo_list` is the `createRepositoryTools` object and its binding exposes `tool:repo_list`. Redacts known secrets over the whole path first, then applies the bound. Otherwise removes the field and keeps the event. |
| Store serialized boundary | `app/server/store.mjs` `appendEventToState` | `admitRequestSummary` inside the mutation. Only a `tool.start` for `repo_list` may carry a summary, and only the call's first start. Non-omitted summaries are capped at 32 per Run, with later ones getting `run_limit`. Invalid data is removed. The recorded repository-read check reuses `isLexicalRepositoryPath`. |
| Shared projection/disclosure | `app/web/thread-projection.mjs`, `app/web/run-rows.mjs` | `row.requestSummary` is kept separate from legacy `row.request`, and the first start's summary wins. `appendToolDetails` shows a "Request summary" `h4.tool-detail-heading` plus `dl.data-list`, with the omission text and a "Shown: beginning only" fact. The Result is kept. |

**Data shape.** `{version:1, path, truncated, omittedReason: null | invalid_path | unsafe_display | run_limit}`. There is no new event type and no Store schema change.
- **Lexically invalid:** non-object args, a non-string, empty, absolute, backslash, `.`/`..`/empty segments, NUL, or more than 1000 characters.
- **Display-unsafe:** C0/C1/DEL characters, and ill-formed UTF-16 (lone surrogates). I chose to treat lone surrogates as display-unsafe; Astra may rule otherwise.

**Author decisions for review:**
- If redaction makes a valid path longer than 1000 characters, the summary is omitted completely (fail closed), and the tool event is kept.
- The inspector's "Arguments" section still reads only legacy `row.request`. It is outside the Chat/Attention consumer scope and does not show summaries.

## Author verification

The contract required these case classes:

| Contract item | Where |
|---|---|
| Synthetic Host → persisted/reopened journal → shared UI | `request-summary.test.mjs` "Host: real Pi repo_list starts …". Real `boot()` Host, a bound temporary repository, and the loopback fake provider. Eight scripted calls go through Pi (seven `repo_list`, one `repo_read`). The test reads the events API, restarts the Host with `reopen`, checks the events are unchanged, then runs `projectThread` → `renderToolRow` under tiny-dom. |
| Unknown tool/field sentinels, no raw argument snapshots | Mapper, Store and Host cases. The sentinel appears only in the user's own `/fixture script` input. |
| Invalid paths / `unsafe_display` | Unit, Store and Host cases: `../outside`, `7`, and `src/a\u0001b`. |
| Non-ASCII byte bounds | Astral and `é` paths: 256 code points, ≤2048 bytes, and never a split surrogate. |
| Known-secret redaction | `src/<fixture key>` is stored as `src/[redacted]`. |
| Same-call changed-input and concurrent replay | Store case: sequential, and `Promise.all` on the same call id. |
| Run budget across restart | 20 summaries, Host restart, then 14 more: 32 kept and 2 `run_limit`. Omissions don't spend the budget. |
| Update/result retention | Store and Host cases: updates and results never acquire a summary. |
| Cancellation/failure | A cancelled Run keeps its start summary; failed `repo_list` calls keep theirs next to the error Result. |
| Forged/untrusted observation | A session with no repository binding keeps the start event but no summary. `isSoleBuiltinRepoList` rejects same-name copies and collisions. |
| Old events | A legacy start stays byte-identical, is not backfilled, and projects/renders no summary. |

Results:
- Focused: [10/10](focused-request-summary.txt).
- Narrow regressions (Pi port, event weight, run rows, stream projection/session events, UI event mapping, repository binding/candidate, check UI, inspector, assistant-stream persistence, run activity, control plane, P03-C host consumer, extension run): [113/113](narrow-regressions.txt).
- Full app suite, run on the tree committed as `d1e9919`: [1801/1801](full-suite-summary.txt).

**Author browser addendum.** I checked only the case Parent's browser matrix did not cover: display truncation. Setup: an isolated `boot()` Host on a random port (61533), a temporary data directory and repository, and the fake provider. `repo_list("src/" + "é"×300)` shows Path with the first 256 code points, "Shown: Beginning only; the requested path is longer", and the Result "repository path segment is too long". The `unsafe_display` row showed its explanation next to its failed Result. The Host was stopped through its stop file and no process was left behind. I saved no screenshot.

**Parent evidence (not author evidence).** Parent reported this separately. Astra ran its own browser check against this source: a random port 61367, its own temporary data directory and repository, and the Local test provider. It covered `repo_list(src)`, `(../outside)` and `(a\nb)`: the normal summary plus Result, `invalid_path` and `unsafe_display` explanations with the failed Result, persistence after reload, and the Execution group/Space expansion. It did not cover the full Attention matrix, screen readers or zoom. That fixture belongs to Parent.

**Not done:**
- No paid provider, user Host restart, credential read, push or deploy.
- The Hermes server was not retried.
- `repo_read` and `repo_grep` were not started.
