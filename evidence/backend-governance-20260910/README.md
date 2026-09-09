# BG-01 · Governed object directory / Matter disclosure

Astra author; Luna exploration and separately attributed bounded verification. Initial claim `3c4ef54`, implementation base `6921dbd18de153020c87e4438eebe5260762fee0`, product `9a8a13a`. Integration consumed main `b4e3f719ff6b4a6853b4f246d85c91dc49693d29` into **`caa448ee784d1a360e81904ca535f691d2a41ea4`**. The retained branch is `codex/backend-governance-20260910`. Shared main's existing WK-98 evidence modification was not touched.

The [contract](../../docs/work-core/governance.md) owns wire fields, supported kinds, limits and permissions; [claim/exploration](../../engineering/execution/2026-09-10-backend-governance/README.md) owns source provenance. The user authorized BG-01 implementation after reviewing the prerequisites; BG-02/03 remain later execution/effect slices.

## What changed

Core4/app5 holds three new Matter policy/event/request tables in the existing WorkCore SQLite. Directory metadata is derived from Matter and Attention owners. Authenticated human HTTP can grant/revoke current-content disclosure; global Attention tools discover, inspect and read only permitted, version-bound sources/current accepted Artifacts. No domain current state, source bytes or Artifact is copied into a second registry store. Existing Attention policy remains its owner.

Policy-only human reads permit revocation when an object's content exceeds the read budget. Grants still bind the human-observed complete permitted view; revokes require policy CAS with a null content hash. Runtime cannot read the policy endpoint or mutate grants. Changes to hidden source fields do not change registry-only hashes. Current-content grants survive content updates, but an old body page token cannot silently read the new version. Source descriptors say integrity unchecked; body readers verify exact bytes.

The Core schema upgrade validates old tables, writes an exclusive Core3/app4 backup, and atomically publishes schema and markers. Fixed old host `6921dbd` refuses the new database and successfully reads the backup in a separate directory. Runtime8, coordination and Usage are inherited from main. Two source conflicts retained both governance and coordination imports/tool construction and both architecture descriptions. No shared UI writer was replaced.

## Verification accounting

- [Initial author focused](focused.log): **21/21**, including Core visibility/version/source/Artifact/file/unknown-schema cases, actual HTTP/Pi tools, policy CAS and crash/migration recovery. Independent data and loopback provider only.
- [Initial default-concurrency full attempt](author-tests.log): interrupted after legacy timeout failures in durability/idempotency and file continuity. This is a failed/incomplete run, not a passing gate. Another whole-suite process overlapped earlier; that is a possible load factor, not proof of the cause. No timeout assertions were relaxed.
- [Isolated timeout recheck](timeout-recheck.log): the affected three files passed **19/19** with test concurrency1.
- [Final integration full suite](integration-tests.log): runs the same complete test globs at test concurrency2 against the fixed combination; **467/467 passed**, with no failed/cancelled/skipped tests.
- [Smoke](smoke.log): passed using the public local-fake service, persistence, close/reopen, continuation, revision and historical bytes; no real provider.
- [HTTP/Pi packets](../../app/tests/fixtures/governance/packets.json): synthetic real authenticated API results and actual Pi tool events for undisclosed/granted reads, revoke denial, and producer/original Session absence. They contain no host token or personal data. Packet generation command is `CW_GOVERNANCE_PACKETS=app/tests/fixtures/governance/packets.json node --test app/tests/governance-http.test.mjs` from the repository root.

## Review findings and attribution

Luna first mapped existing owners and reran selected existing checks on moving main. That was exploration, not fixed-product acceptance. During construction Luna identified non-object/corrupt disclosure records and target-source errors potentially escaping the runtime invisibility boundary. Astra added structured provenance validation and uniform runtime unavailability, and paired tests. Authorized humans retain explicit target integrity/budget errors rather than a silently complete-looking response. Source/Artifact descriptor integrity is explicitly unchecked until the byte reader runs. The private Core transport remains host-trusted; actual service envelopes capture identity and the runtime adapter checks before/after the Core call.

Astra additionally found that full content inspection must not be required to revoke a grant. The policy-only/null-hash revocation path and >128-source counterexample were added before the fixed product commit. Luna’s [fixed-SHA independent probe](independent/README.md) passed: 129-source budget refusal, human policy-only revocation, old grant receipt replay without resurrection, runtime denial, and closed/changed adapter identity. It is bounded and is not full independent acceptance of the whole backend.

## Scope limits

Human policy editor UI, general relation traversal, candidate/history readers through this new directory, scheduling, child execution integration, Run/attempt changes, external connectors/effects, real providers, personal data migration, deployment and Paper changes were not performed. Existing domain and Attention APIs retain their own contracts. G1–G5/native/professional acceptance remain open. A process-death test is not a machine-power-loss durability claim.
