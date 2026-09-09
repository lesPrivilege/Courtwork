# Permission payload expectations (BE-30)

`POST /api/v5/runs/:runId/questions/:questionId` accepts, for a pending **permission** question:

```json
{"decision":"allow","expectedContentSha256":"<64 lowercase hex characters>","expectedToolCallId":"<exact permission.open toolCallId>"}
```

`decision` remains `allow|deny`. Each expected field is independently optional; callers should send both from the actual `permission.open` payload. A nonempty toolCallId is at most 200 JS code units; the digest is exactly 64 lowercase hexadecimal characters. Null, invalid type/length/format produce 400 `invalid_input`. Other fields remain rejected. Omitting both retains the old client's behavior; this is not mandatory global CAS or a client-generated revision.

The store compares supplied fields against the actual pending payload inside the same queued mutation that checks Run admission and resolves the question. A mismatch returns 409 `version_mismatch` without changing the question, Run, events, file bytes or live waiter. The client must read the current request and review it; it must not silently substitute a new hash and retry the old intent. Comparisons apply equally to allow and deny. No payload contents are returned in the error.

Run/question ownership and existing closed/pending/admission checks remain authoritative. A completed/cancelled/expired question or cancel that wins the queue still uses the existing `run_closed`/`question_unavailable` errors, rather than reviving the request to perform a hash check. Two matching concurrent answers still yield at most one resolution. These optional fields do not create an idempotent answer receipt: ACK loss does not authorize a second effect, and callers inspect the existing question/events.

`ask_user` continues to accept only `{answer}` and rejects permission expectation fields. This is not BE-31 structured questions or a Core Candidate decision. Runtime schema stays 4; no persisted fields, migration, new endpoint or UI changes. The permissions currently issued are bound to immutable tool-call payloads; queued payload change tests are synthetic failure injection, not a newly exposed update operation.

Validation: `node --test app/tests/permission-cas.test.mjs app/tests/permission.test.mjs app/tests/answer-admission-race.test.mjs app/tests/question-abort-race.test.mjs`. All run against independent local-fake data and ports; actual results are recorded in `evidence/harness-next-20260909/`.
