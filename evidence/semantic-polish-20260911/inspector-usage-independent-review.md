# Independent Inspector / Usage review · fixed candidate `8094d1f`

Review date: 2026-09-11. The target is
`8094d1fce14e9b7f531444a1b99e26da8d1d0db8`, reviewed from a clean detached
checkout of that commit. Unstaged Chat, Attention, telemetry and product files
in the active semantic-polish worktree were excluded. This is a bounded
non-author source and focused-test review; it makes no browser, visual,
VoiceOver, forced-colors, 200% reflow, or whole-product acceptance claim.

## Contract comparison

The Inspector/Usage contract requires request measurements to reuse the
telemetry owner, keep each request on its own host-time origin, retain missing
and partial values, distinguish recorded/current file targets, keep raw events
as an Event trace, and reuse the shared tool lifecycle vocabulary
([inspector-usage.md:5-16](../../engineering/execution/2026-09-11-semantic-polish/inspector-usage.md)).
Usage must preserve UTC interval/scope/coverage/accounting facts, fixed
top-four-plus-Other membership, Monday-first keyboard movement, and exact
read-only snapshot drilldown rows ([usage-details.md:3-11](../../app/docs/usage-details.md)).

The implementation follows the existing seams. `inspector.mjs:112-175`
preserves content-version and current-file targets and exposes the full hash
inside Version details. `inspector.mjs:177-195` keeps input/output/turns
separate from cache counts and labels incomplete values as lower bounds.
`inspector.mjs:195-227` reuses `renderRequestMeasurements`, `projectThread`,
and `toolStateWord`; `:261-293` retains raw records under Event trace.
`usage-projection.mjs:24-38` matches Home's Monday-first calendar directions,
and `usage-view.mjs:14-21` carries the same snapshot into read-only drilldown
requests. No Runtime/Core schema or mutation owner is changed in this commit.

## Independent checks

All commands below ran against the exact commit in a clean detached checkout;
the temporary checkout used the existing workspace dependency installation for
the synthetic HTTP test.

| Check | Result |
|---|---|
| `node --test app/tests/inspector-presentation.test.mjs app/tests/telemetry-presentation.test.mjs app/tests/usage-details.test.mjs` | pass: 12/12 (5 Inspector/telemetry, 7 Usage, including synthetic HTTP snapshot rejection) |
| `node tools/lint-interaction.mjs` | pass: 33 files, 0 registered exceptions |
| `node tools/lint-materials.mjs` | pass: 5 files |
| `node tools/lint-colors.mjs` | pass: 38 files |
| `node --check` on Inspector, telemetry, usage projection and Usage view | pass |
| `git diff --check` | pass |

The tests cover target-kind/hash behavior, tool lifecycle projection, request
timing and missing values, disclosure rendering, UTC/model/day accounting,
overflow, strict HTTP input, stale snapshots, pagination, quantile ties, and
calendar keyboard boundaries ([inspector-presentation.test.mjs:6-22](../../app/tests/inspector-presentation.test.mjs),
[telemetry-presentation.test.mjs:6-25](../../app/tests/telemetry-presentation.test.mjs),
[usage-details.test.mjs:16-79](../../app/tests/usage-details.test.mjs)).

## Findings and bounded follow-ups

1. **P1 · `validUsageDetails` accepts malformed interval/date metadata.** The
   contract requires `interval.start`, `endExclusive`, `days`, valid UTC dates,
   and the surrounding scope/coverage/source/accounting facts
   ([usage-details.md:5-9](../../app/docs/usage-details.md)). The renderer
   gate at `app/web/usage-projection.mjs:13-21` checks only that bucket count
   equals `value.interval?.days` and that dates match a loose digit pattern; it
   does not validate interval endpoints, day bounds, contiguity, or the other
   required fields. A minimal object with valid schema/id/counts,
   `interval:{days:0}`, and `buckets:[]` returns `validUsageDetails(...) ===
   true`, then `usage-view.mjs:50-53` throws because `interval.start` is
   missing. An object with bucket date `2026-99-99` also returns true and
   produces `usageCalendar(...)` values with `offset:null`/`weeks:null` after
   JSON serialization. Extend the validator and keep the renderer fail-closed.

2. **P1 · Usage drilldown accepts a shallow response and can crash rendering.**
   The contract requires the response to echo exact filter, scope, interval,
   snapshot, total/offset/limit/nextOffset and safe Run rows
   ([usage-details.md:9](../../app/docs/usage-details.md)). `usage-view.mjs:14-21`
   currently checks only `schemaVersion`, matching `snapshotId`, and that
   `items` is an array. `usage-view.mjs:106-109` then reads each row's
   `sessionTitle`, `startedAt`, `status`, and `usage.input/output` without a
   DTO check. Reproduction with a valid overview followed by
   `{schemaVersion:1,snapshotId:<same>,items:[{}]}` reaches the render and
   throws `TypeError: Cannot read properties of undefined (reading 'input')`
   at line 108. Validate the echoed scope/interval/filter, safe pagination
   fields, and every Run row before assigning `drill.result`; reject with the
   existing unavailable message.

3. **P2 · Telemetry validation does not enforce the full v1 measurement shape.**
   The contract says identity/purpose, phase, timings, context, nullable
   terminal usage, and requested/observed model identity are owner facts, and
   malformed measurements fail closed ([request-telemetry.md:7-13](../../app/docs/request-telemetry.md)).
   `telemetry-view.mjs:3-9` validates only schema/request id/phase,
   requested-model string types, nonnegative timings, context token count and
   usage counters. It accepts empty requested-model strings and malformed
   `purpose`, `observedModel`, effort, source, wall-clock and context-window
   fields. Reproduction: a row with `purpose:{}`, empty requested-model
   strings, `observedModel:{provider:42,model:{}}`, non-string effort/source
   fields and otherwise valid timing data is returned by
   `requestMeasurements(...)` (length `1`). Validate the fields consumed by the
   renderer and reject malformed rows while preserving deliberate
   out-of-interval timing details.

## Review disposition

The fixed candidate is **reviewed with follow-ups**. The positive behavior and
focused tests are credible for the bounded Inspector/Usage slice. Findings
1–2 are renderer safety and observation-integrity gaps; finding 3 is a
fail-closed telemetry-shape gap. The candidate's own visual screenshots and
author checks remain intermediate evidence only; this review supplies no
independent visual or product acceptance.

## Fixed candidate follow-up · `22a2073`

Review date: 2026-09-11. This appendix reviews
`22a20731ecc6631e143629eb5118ed60c52f9823` in a clean detached checkout.
Only the five-file fix and its focused tests were inspected; concurrent
Chat/Settings/Home edits in the active worktree remain outside scope.

The three prior repros are closed by direct execution against the fixed
source:

| Prior repro | Result |
|---|---|
| Missing `interval.start` with `interval:{days:0}` | `validUsageDetails(...) === false` |
| Impossible bucket date `2026-99-99` | `validUsageDetails(...) === false` |
| Malformed telemetry metadata (`purpose:{}`, empty model fields, malformed observed model) | `requestMeasurements(...)` returns `0` rows |
| Shallow drilldown `{schemaVersion:1,snapshotId:<same>,items:[{}]}` | `validUsageRuns(...) === false`; the view shows “Usage run list is unavailable” without throwing |

The fixed validator now checks canonical UTC interval endpoints and contiguous
dates, scope/coverage/source/accounting, aggregate/model/day count sums, model
identity keys, and the requested `days`/project scope
(`app/web/usage-projection.mjs:13-55`). `validUsageRuns` checks the echoed
scope, interval, date/model filter, safe pagination fields, page length, and
each run row before `usage-view.mjs:14-21` assigns the result. Telemetry now
validates source/purpose, nonempty model identity, observed model, effort,
wall-clock, context, nullable measurement fields, and required missing facts
(`app/web/telemetry-view.mjs:3-20`).

Independent scope/filter/pagination checks passed. A valid all-scope response,
valid project-scoped response, valid date/model filter, both pages of a
two-row result, and these mutations were exercised: wrong scope, wrong date
filter, wrong offset, wrong limit, wrong `nextOffset`, malformed row, and
unsafe count. The valid cases returned `true`; every mutation returned
`false` from `validUsageRuns`.

Focused verification against `22a2073` passed:

| Check | Result |
|---|---|
| `node --test app/tests/inspector-presentation.test.mjs app/tests/telemetry-presentation.test.mjs app/tests/usage-details.test.mjs` | pass: 15/15 |
| `node tools/lint-interaction.mjs`, `lint-materials.mjs`, `lint-colors.mjs` | pass |
| `node --check` on changed browser modules; `git diff --check` | pass |

One residual bounded failure remains: `app/server/store.mjs:19-21` permits
`stopping` Runs, and `usage-details.mjs` includes all statuses, but
`validUsageRuns` at `app/web/usage-projection.mjs:66` omits `stopping` from its
accepted status set. An otherwise valid Usage overview containing a stopping
Run passes `validUsageDetails`, while its server drilldown result returns
`validUsageRuns(...) === false`. Add the persisted `stopping` status to the
projection enum before considering active-run drilldown fully verified.

Disposition: **three prior findings fixed and independently verified; one
P2 follow-up remains for the valid `stopping` Run status**. This appendix is
source/fixture evidence only and does not claim browser, visual, or full
product acceptance.

## Residual closure · `e2d2a57`

Review date: 2026-09-11. The follow-up commit
`e2d2a57c96afce5b78b3c4653ef53d81743250ab` changes only the Usage projection
status set and its regression test. In an exact detached checkout, the direct
prior repro now returns `{status: "stopping", accepted: true}` from
`validUsageRuns`; mutating that same row to invented `queued` returns
`accepted: false`. The persisted enum remains the source of truth at
`app/server/store.mjs:19-21`.

`node --test app/tests/usage-details.test.mjs` passes 10/10, including the new
stopping Run regression and the existing scope/filter/pagination and malformed
DTO cases. The residual finding is closed for this bounded source/fixture
review. No browser, visual, or full-product acceptance is claimed.
