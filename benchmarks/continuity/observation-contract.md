# Development conformance observation v2

This measures protocol fidelity, not SE's incremental value. One authored memo
family, six trajectories; E and S should both pass. v0's five trajectories and
historical scores remain frozen at d879e2f. No heldout claims.

Each checkpoint provides schemaVersion=2, operation, opaque revision,
workspaceId, current/historical source (ID, opaque version, content, digest),
the full proposal set (ID, owner, base/source/contract baseline, status, content, full obligations), active artifact
(ID, originating proposal, content, digest), full current obligations, decisions,
audits and receipts. Decisions/audits expose request, work, proposal, artifact,
action, reviewer and scope. Receipts expose the same effect binding. IDs differ
between implementations and are compared to test-environment assignments in
`fixture-identities.mjs`, frozen in the attempt manifest before execution. The
grader ignores adapter-returned identity assignments; numeric revision increments are NOT scored. Revisions must stay
unchanged on no-effect paths and change once on commit. One artifact's identity
must remain stable across replay/restart, without requiring a particular format.

Every checkpoint checks all these semantic obligations. Required fields cannot
be silently omitted; extra presentation fields are ignored. Reject outcomes
are distinct: stale_source, request_conflict, authority_rejected,
version_conflict. Invalid input/transport failure cannot substitute for them.
The result must include the expected artifact and one decision/audit/receipt
when committed; all references and the fixed reviewer scope must agree.
Obligation text, status, blocking and evidence_refs are checked, not just IDs.
Rejected operations/restart preserve the previous state; accepted replays
preserve the first complete effect. Source replacement preserves old bytes.

`observe.mjs` maps existing records; it must never reconstruct missing records
from the expected task. Trace entries retain raw state and SHA256 hashes;
observations carry rawRef. Grading checks hash, step and a complete raw-to-observation
mapping at each index before semantic invariants. It also checks the complete
expected proposal membership, status/basis, and receipt request-digest equality
to a preassigned request payload using each implementation's published encoding,
plus stability across replay/restart. Mutation tests cover raw-only changes, recomputed hashes with
stale observations, and consistently mapped corrupt raw facts. Hashes prove
internal record consistency, not independent attestation that an untrusted
adapter actually queried a database. Source review and nonauthor probes remain
necessary. Oracle/data and implementations share
an author: separate imports do not imply independent professional standards.

S uses separate ordinary jobs, versioned sources/documents, submissions, tasks,
approvals, audit and receipts tables, a reviewer table, BEGIN IMMEDIATE, CAS and
payload-bound idempotency. It imports no Courtwork implementation or grader.
It is the minimum conventional mechanism comparator, not a full T/S/E model
harness; no retrieval, professional semantic gate, or performance superiority
is claimed. Graceful restart reopens the persistent database in a new Python
process (in S each operation already uses a fresh process).

The immutable `.attempts.json` is fsynced before execution. `.journal.jsonl`
fsyncs started/completed records for each attempt; the final result summarizes
all planned attempts. If killed before the final report, use manifest + journal:
a started ID without completed record is interrupted, an unstarted ID remains
not_run. Neither may count as success; report planned/started/completed counts
separately. A truncated last journal line is incomplete evidence, not a PASS.
