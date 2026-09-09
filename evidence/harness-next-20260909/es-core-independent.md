# ES-01 independent Core provenance and acceptance probes

2026-09-09. The independent harness [`es-core-independent.mjs`](./es-core-independent.mjs) first ran against the legacy fixed Core/bridge source commit `429a2f28a2c4438fbe3772a0f8b86cb2dac19d16` in the isolated `codex/harness-next-round` checkout:

```text
ES_CODE_SHA=429a2f28a2c4438fbe3772a0f8b86cb2dac19d16 node evidence/harness-next-20260909/es-core-independent.mjs
```

It used fresh temporary `dataDir` directories and a JSONL bridge launched from source files materialized by `git show <resolved SHA>:app/core/{core.py,bridge.py,file_candidates.py}`; no active working-tree Core import or existing runtime data was used. The harness created a `se-file-memo-v1` Matter, Run, basis and recorded file, then closed the Run before each acceptance attempt.

## Blocking acceptance counterexample: verification result is not integrity-bound

The first fixture saved a Candidate with empty evidence. Core correctly persisted the diagnostic as `verification: "failed"`. After the Core process was closed, the probe changed only `candidate_verification.record_json.result` from `failed` to `passed` and cleared its `reasons`, leaving the Candidate payload, file bundle, manifest, bytes, bundle digest, Candidate digest, basis and verifier unchanged. Reopening the fixed bridge reported the Candidate as `acceptable: true`; trusted `accept` then committed version 1 and an Artifact:

```json
{
  "name": "verification-result-tamper",
  "result": "accepted",
  "decision": {
    "action": "accept",
    "active_artifact": "artifact-candidate-1-1",
    "candidate_id": "candidate-1",
    "matter_id": "matter-1",
    "request_id": "tampered-accept",
    "version": 1
  }
}
```

The source path is `app/core/file_candidates.py:193-216`: `file_integrity` binds `candidateDigest`, `bundleDigest`, `basisFingerprint` and `verifier`, but does not bind `record.result` or `record.reasons`. `app/core/file_candidates.py:218-225` then accepts any persisted record whose policy/basis are current and whose mutable `record.result` says `passed`. `app/core/core.py:801-805` relies on that check before the atomic accept transaction. This violates the contract's immutable verification record and “do not accept client self-signed PASS” requirements (`backend-contract-draft.md:48-50`). The existing copied-record probe does not cover a same-record result flip because its candidate/bundle/verifier identities remain valid.

At this legacy SHA, this is an acceptance blocker for the Core integrity boundary: a damaged or incorrectly rewritten verification row can turn a known semantic failure into formal effect. The independent probe is a database fault injection, matching the existing byte/manifest/column corruption probes; it does not claim resistance to a malicious process with unrestricted write access. The later fixed-SHA rerun below checks the author’s record digest and accept evidence fix.

## Fixed-SHA rerun

The same harness was rerun after the fix at `b1ff74b08c053fa0e3ab47fb20f510eabb9440e9`:

```text
ES_CODE_SHA=b1ff74b08c053fa0e3ab47fb20f510eabb9440e9 ES_EXPECT_FIXED=1 node evidence/harness-next-20260909/es-core-independent.mjs
```

The harness resolved the requested SHA to the same commit and materialized those exact files before launching the bridge. Loaded source content hashes were:

```text
app/core/core.py             793251eba0851b73bbeb437387de4041f846030ec4ebff5a2cf725b4ad22e82a
app/core/bridge.py           867c6ec3a86cedc926eeb75b71883b838182ff65037d850531510392ecef2564
app/core/file_candidates.py  6d94023cf4d92b84ee710089eb87f0b1c2ef1494ceea0b6f6312afef9974c594
```

Results: the valid recorded UTF-8 file accepted at version 1 and read back exactly (`A😀\n`); the three targeted rejection categories all refused before formal effect (with one supplemental checksum-coordination variant):

| Probe | Result | Side effect |
| --- | --- | --- |
| Same-record `result` flip, stale `record_digest` | `INTEGRITY_REFUSAL` | Matter version 0, 0 Decisions, 0 Artifacts |
| Same-record `result` flip with coordinated `record_digest` rewrite | `VERIFICATION_REQUIRED` | Matter version 0, 0 Decisions, 0 Artifacts |
| `session_ref: null` / `sessionId: null` | `BINDING_MISMATCH` | No `file_run_basis` row initialized |
| `writtenAt: "not-a-timestamp"` | `INVALID` | 0 Candidates saved |

The coordinated checksum case is supplemental to the three primary negative categories and confirms the accept path independently rechecks required source evidence. This fixed rerun supports closing the previously observed Core acceptance blocker for this bounded probe set. It does not expand the scope to service, GUI, real-provider, deployment or G1–G5 acceptance.

## Legacy provenance boundary observations

On the legacy SHA, two additional direct bridge probes accepted provenance values that the file contract describes more narrowly:

* `app/core/bridge.py:569-571` allows `create_run.session_ref` to be `null` (and an empty string). `app/core/file_candidates.py:74-76` checks only equality with that value, so a file carrying `sessionId: null` was saved and accepted. The real extension adapter rejects this before the bridge (`app/extensions/work-adapter.mjs:313-317`), so this is a private bridge/Core defense-in-depth gap, not a claim that the normal service path emits null Session IDs.
* `app/core/file_candidates.py:75-76` checks that `writtenAt` is a nonempty string, not an ISO-8601 timestamp. A file carrying `writtenAt: "not-a-timestamp"` was saved and accepted. The source contract requires trusted recorded provenance with `writtenAt` (`backend-contract-draft.md:23`; `docs/work-core/contract.md:81`). The current RuntimeStore-produced records are timestamp-validated (`app/server/store.mjs:99-105`), so this is likewise a direct bridge boundary gap unless the bridge is intended to trust all host provenance fields without structural validation.

The legacy probe output for both observations was an accepted version-1 Decision with `active_artifact: "artifact-candidate-1-1"`; no mutation was made to product code. The fixed-SHA rerun above verifies these are now rejected at the private Core boundary.

## Legacy machine output summary

```json
{
  "requestedSha": "429a2f28a2c4438fbe3772a0f8b86cb2dac19d16",
  "resolvedSha": "429a2f28a2c4438fbe3772a0f8b86cb2dac19d16",
  "expectFixed": false,
  "outcomes": [
    {"name":"verification-result-tamper","status":"accepted","decision":{"request_id":"tampered-accept","matter_id":"matter-1","candidate_id":"candidate-1","action":"accept","version":1,"active_artifact":"artifact-candidate-1-1"}},
    {"name":"null-session-provenance","status":"accepted","decision":{"request_id":"null-session-accept","matter_id":"matter-1","candidate_id":"candidate-1","action":"accept","version":1,"active_artifact":"artifact-candidate-1-1"}},
    {"name":"malformed-writtenAt","status":"accepted","decision":{"request_id":"bad-time-accept","matter_id":"matter-1","candidate_id":"candidate-1","action":"accept","version":1,"active_artifact":"artifact-candidate-1-1"}}
  ]
}
```

This is non-author independent evidence for Core/provenance acceptance only. It does not claim service, GUI, real-provider, deployment or G1–G5 acceptance.
