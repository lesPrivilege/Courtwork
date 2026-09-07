# MX-R1 additions to the v6 contract

All routes retain `/api/v5` and the existing work-token requirement. Store schema remains 3. Web and extension contracts are unchanged.

## Historical artifact text

`GET /api/v5/sessions/:id/artifacts/file?runId=<id>&path=<recorded-relative-path>&sha256=<64-lowercase-hex>` returns `{path,runId,kind:"content-version",bytes,sha256,text,truncated}`.

The session must own the Run and the Run must contain the exact path/hash artifact record. The immutable blob is resolved only after that authorization. `bytes` and `sha256` cover the complete content (at most 4 MiB); `text` is limited to 512 KiB at a UTF-8 boundary. A deleted or overwritten workspace file does not change this response. Reading does not create storage, execute a Run, or call a provider.

| Status/code | Meaning |
|---|---|
| 400 invalid_input | malformed, duplicate or unexpected query input |
| 404 not_found | session/Run/exact recorded locator unavailable |
| 410 history_unavailable | legacy artifact or missing repository/ref/object |
| 500 artifact_integrity_failed | object type, size, or content hash does not match |
| 503 artifact_store_unavailable | Git process/storage operation unavailable |

Git >=2.36 stores private SHA-256 blobs and permanent refs under the data directory. Raw content SHA-256 is the API identity; the Git object ID is internal and different. Bytes and references are verified before workspace rename and artifact publication. A crash between those operations can leave an unpublished object or current file; neither becomes a fabricated artifact record. Refs have no automatic retention cleanup in this version. Evidence covers process SIGKILL windows, not an atomic power-loss transaction across Git, workspace and store.

## Native automatic compaction

Pi 0.85.1 remains the execution, summary, retry and JSONL owner. Real providers default to enabled; the loopback fixture defaults to disabled and explicitly enables the same SDK path in tests. `startServer({compaction})` accepts only:

- `enabled`: boolean.
- `reserveTokens`: positive integer, default min(16384, floor(contextWindow/4)).
- `keepRecentTokens`: positive integer, default min(20000, floor(contextWindow/2)).
- `maxCompactions`: integer 1–100, default 4.

Reserve plus kept tokens cannot exceed the known model context window. The Nth native compaction may finish; later automatic compactions are disabled for that Run. This is not a Run terminal condition or a currency budget. `maxTurns` counts ordinary turns, while the existing execution deadline also covers summarization. Cancellation remains effective if Pi resumes after a cancelled pre-prompt compaction: the adapter refuses another model request.

`run.notice` adds sanitized `compaction_end` fields: `reason`, `aborted`, `willRetry`, `outcome` (`completed`, `aborted`, `failed`), plus `code:compaction_failed` on failure. It also emits `compaction_limit_reached {limit}` and `summarization_retry {attempt,maxAttempts}`. Raw provider error text and summary text are not included in these notices.

`run.usage` adds each successful summary's native `result.usage` once. Missing usage on failed/aborted summaries and summary retries sets `missing:true`; already reported usage remains present. Native JSONL compaction entries remain internal session state, not public orchestration records. Fake fixtures establish mechanics only; real provider summary quality and GUI credential E2E remain separate acceptance work.
