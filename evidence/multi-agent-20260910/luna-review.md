# Luna independent review

Status: read-only exploration and conformance evidence for the multi-agent / Thread seam. This note does not independently accept the implementation or claim a complete multi-agent product. The Courtwork observations below were made on `codex/multi-agent-seams-20260910` at `c44e31f`, with the parent integration fixes present in the working tree.

## Primary Pi source observations

The local Motto checkout records `845d6ff1f6643aba440341cce877ce1c43ebbc39` as tag `v0.83.0`. At that revision, `packages/agent/src/harness/agent-harness.ts:171` defines a single `AgentHarness` holding one private `session`; its public surface is the single loop/session API and has no `lane`, `lanes`, or child scheduler. The JSONL repository's `packages/agent/src/harness/session/jsonl-repo.ts:134-160` does provide `fork`; it copies selected entries and records `parentSessionPath` at `:153`, which is storage lineage rather than an inter-agent runtime.

The actual local `v0.85.1` release is `d981de1229ef899957bbe968bc8dcda02a21f477`. Its `packages/agent/src/harness/agent-harness.ts:589-622` exposes `lane`, `lanes`, `watchSession`, and `AgentHarness.create`. `packages/agent/src/harness/runtime/harness.ts:30` describes the Harness as managing lanes, while `:78-145` restores named lanes under one `Session` and mutation line; `:305-306` still throws `SliceNotImplemented("watchSession")`. Session fork metadata is represented in `packages/agent/src/harness/session/types.ts:477,558,593-600`. A source search at that revision found no runtime implementation of Courtwork's `message_other_agent`; `subagent` hits in the product tree are documentation/examples, including the separate coding-agent extension example.

Courtwork pins `@earendil-works/pi-coding-agent` to `0.85.1` in `app/package.json`. The production path in `app/server/service.mjs:1201-1216` calls the local `createSessionRun` adapter and supplies custom tools; it does not call `AgentHarness.create`. Therefore the Pi lane/fork API is a candidate reference, not evidence that Courtwork currently runs native parallel child agents. `app/harness/child-execution.mjs` is a bounded synthetic adapter contract and should be read at that evidence level.

## Courtwork trust findings and current fixes

- An initial probe showed that the generic coordination listing could expose Threads from unrelated project scopes. The current model-facing path is `Coordination.runtimeDirectory` (`app/harness/coordination.mjs:29-33`), which filters project Sessions to the exact `sessionScope`; a global Attention Session is the explicit wider case. The local-human HTTP directory remains intentionally authenticated and global.
- `hostToolCeiling` is shared by runtime descriptors and execution (`app/runtime/control-plane.mjs:28-31`, `app/runtime/control-tools.mjs:22-41`). A `read_only` Session now reports `message_other_agent` with permission `deny` and omits it from model-callable tools; the earlier exposed/allowed metadata mismatch is covered by the coordination test.
- Model mailbox access passes the current Session to `Coordination.mailbox` and checks explicit Thread membership (`app/harness/coordination.mjs:106-111`). The authenticated human mailbox route has no model Session identity by design. Runtime messages also require an admitted source Run, reject extension-bound domain Sessions, and reject project cross-scope targets (`:78-85`).
- Message delivery is a single RuntimeStore outbox/inbox mutation with deterministic message identity, target revision CAS, explicit `queued`/`delivered`/`stale_target`/`target_unavailable` outcomes, and startup replay (`app/harness/coordination.mjs:64-105`). Delivery does not create a target Run, mutate Core Matter state, or constitute acceptance. Directory and mailbox reads are paged at a maximum of 20 records (`:29-33`, `:106-111`).

## Reproducible verification

From the reviewed worktree:

```text
node --test app/tests/coordination.test.mjs app/tests/request-telemetry.test.mjs app/tests/renderer-admission.test.mjs
21 tests, 21 passed, 0 failed
```

Those tests cover Thread identity/membership, idempotent outbox replay, stale and unavailable targets, reply lineage, schema migration, child grant/cancel/timeout boundaries, authenticated HTTP delivery, SIGKILL recovery, permission approval, read-only metadata and scope filtering, mailbox pagination, renderer admission, and telemetry integration.

The broader command `node --test app/tests/*.test.mjs tests/*.test.mjs` was also run. It produced 440 tests with 439 passed and one failure: `app/tests/runtime-foundation.test.mjs:81`, `CLI SIGTERM settles a waiting Run and the same data directory reopens`, timed out at its polling condition. This is recorded as an unresolved broader-suite result; the targeted coordination verification is green, and the full suite must not be described as green from this run.

## Fixed-combination follow-up: `c1f212275ffa8d42fad711cf65b47418e5ca6755`

The final targeted review was run at the fixed combination commit `c1f2122`:

```text
node --test app/tests/coordination.test.mjs app/tests/usage-details.test.mjs
21 tests, 21 passed, 0 failed
```

The coordination cases specifically rechecked runtime tool permission, exact source Session/Thread membership, target Thread revision and reply lineage, queued outbox replay after SIGKILL, no automatic recipient Run, and child helper grant, identity, cancellation, timeout, and late-completion behavior. The usage-details cases passed against retained Run records and scope/date/model filters; this read surface did not alter coordination ownership.

The human-facing coordination directory retains its explicit 256-Thread storage/list ceiling (`app/harness/coordination-state.mjs:20`, `app/harness/coordination.mjs:42`). Model-facing `thread_directory` and `thread_mailbox` responses are independently paged with a maximum page size of 20 (`app/harness/coordination.mjs:14,29-33,106-111`; `app/harness/tools.mjs:4,13-16`). The model directory applies exact project scope filtering while global Attention has the explicitly wider view.

The earlier broader result of 439 passed / 1 timed-out test belongs to the previous pre-`c1f2122` review round and is historical evidence only; I did not rerun the full suite in this follow-up. The targeted result above is the current bounded verification.

## Still unproved

Native Pi parallel lanes in Courtwork, persistent child intent/runtime references, child recovery across restart, real-provider child execution, permission escalation/duplicate approval, Core cross-Matter transactional proposals, ownership handoff, and durable Workflow execution remain outside this evidence. No paid provider, external message, deployment, or product acceptance was performed.
