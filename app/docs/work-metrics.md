# Recorded Activity and Usage (BE-1/3/25/29)

Version 1, 2026-09-09. Authenticated read-only projections of one published RuntimeStore state. No transcripts, providers, new Runs or Core mutations. Runtime schema remains 4; no migration.

## Endpoints

- `GET /api/v5/work-activity?days=30&projectId=…`
- `GET /api/v5/work-usage?days=30&projectId=…`

`days` defaults to 30, accepts decimal integers 1–366 without leading zeros. Includes today and preceding N−1 UTC calendar days. Optional `projectId`: absent means all retained sessions; unmatched ID yields empty scoped results. Unknown, repeated, empty or malformed parameters return 400 `invalid_input`. Existing token/origin protection applies. Unavailable store or unsafe integer totals fail as errors, never empty success.

Both return `schemaVersion:1`, `observedAt`, `timeZone:'UTC'`, `interval:{start,endExclusive,days,runTimeField:'startedAt'}`, `scope:{kind:'retained-recorded-runs',projectId:null|string}`, `recordedRunCount`, and:

```json
{"coverage":{"retainedRecords":"complete","historical":"unknown","reason":"deleted_sessions_remove_run_records"}}
```

Coverage means all retained records in the sampled store and selected scope/interval were scanned. Deleting a Session removes its Run records; no durable all-history watermark exists. A zero bucket means zero retained recorded runs, never proof of no historical activity. A heatmap claiming historical activity must present unknown coverage and must not color these zeros as verified historical inactivity. No retention ledger is introduced.

Activity adds `deduplicationKey:'run.id'` and ascending `buckets:[{date:'YYYY-MM-DD',recordedRunCount:0}]`, one per day. Count each Run once regardless of status, events, retries, usage, or completion time. Midnight-crossing Runs belong to their start day; command replay does not increment count. Concurrent reads see a whole old or new published state. Separate HTTP requests remain separate observations.

Usage adds `source:'provider-reported-run-usage'`, `isBillingRecord:false`, `tokens:{input,output,cacheRead,cacheWrite}`, `missing`, `missingRunCount`, `reportedRunCount`, and `accounting:'no_runs'|'not_reported'|'reported'`. Fields sum existing Run usage without combining cache/input or estimating charges. Any included Run with incomplete accounting sets aggregate `missing=true`; its partial numbers still contribute. `not_reported` means incomplete aggregate accounting, not that every field is absent. Reported zero differs from no Runs and missing usage. All usage belongs to Run start day, not token occurrence or invoice period. Active Runs normally retain missing accounting until final collection. Reported totals still have unknown historical coverage.

## Optional summary date

`GET /api/v5/work-summary?date=today` or `date=YYYY-MM-DD` filters each collection before pagination. Without `date`, old shape/behavior remain unchanged. `today` resolves once from response `observedAt` in UTC. Explicit dates must exist in the calendar. Filtered responses add:

```json
{"dateFilter":{"date":"2026-09-09","timeZone":"UTC","start":"2026-09-09T00:00:00.000Z","endExclusive":"2026-09-10T00:00:00.000Z","fields":{"sessionCandidates":"recordedActivityAt","pendingItems":"createdAt","inspectionCandidates":"resultAt"}}}
```

Session candidates use latest recorded activity (creation/start/end), pending questions use creation, inspection uses end or start when no end. This filters current collections; it does not reconstruct historical Session state. Old pending questions disappear from `date=today`; callers needing all actionable questions must keep the unfiltered query. Activity uses start time, so its count need not equal summary counts.

## Consumer and verification

CC-D0-b may consume after integration in the existing frontend queue; this does not install UI. `app/tests/work-metrics.test.mjs` covers UTC boundaries, deduplication, partial accounting, authenticated HTTP, replay, restart/deletion and unpublished-write isolation. Existing summary tests protect the unfiltered shape. Author and independent results are separate in `evidence/backend-bounded-20260909/`.
