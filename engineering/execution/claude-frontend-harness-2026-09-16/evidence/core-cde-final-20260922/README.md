# Core C/D/E final adoption

2026-09-22 · Parent Astra accepts final candidate `e49232e77b6b797f256a345d951b0d36b23b416f` (C/D/E plus CDE-R1). Integrated main: `ca859a517a22a29b9b8b4c7810f7488cbdc63edf`. The [earlier return and seven decisions](../core-cde-review-20260922/README.md) remain the decision history; this is its final disposition.

## Evidence and scope

[Luna review](luna-review.md) and [raw candidate checks](luna-tests.log):33/33 exit0. Parent inspected the production predicate, validator, paired resolution and service reconciliation delta. [Actual integrated-main checks](integrated-tests.log):39/39 exit0, adding the unchanged Pi Runtime Port suite to C/D/E/schema19. CDE-R1 is adopted and closed: no-result execution-unknown calls remain fenced even when the native root has ended; retained-result delivery-unknown calls still reconcile. The new test crosses real service/reopen/reconcile/admission, refuses a next Run and records no additional write/check/request.

Author1422/1422 remains author evidence. The earlier author1419/1422 failure and isolated9/9 rerun are retained in its packet; resource contention is the author's interpretation, not an independently established diagnosis. No independent full-suite or live provider claim. Cross-record validator completeness remains a documented review limit without an additional reproduced violation.

The accepted scope is the offline, injectable Agents Host consumer, durable recovery fences and bounded16KiB write/check scenario parity. It does not expose a selectable remote runtime, new recovery HTTP/UI, native credential management, automatic uncertain-result resubmission, known-root cancellation UX, or lost-create resolution. Original owners retain those gaps. Formal Work acceptance and runtime completion remain separate.

Final RuntimeStore19 is adopted; Core4/bridge5 are unchanged. AGENTS, architecture and app README carry19. Only the final corrected shape is integrated; intermediate C19 is not a standalone release. User8787 remains on its already-running prior Host/data; no restart, data upgrade or credentials/provider were involved. New tests/tasks use independent data.

## Preservation and writer release

[Preservation receipt](preservation.json):42,114 entries /1,008,376,908 file bytes, including ignored/untracked files, modes and symlink targets, refs and patches. The file archive was physically extracted and matched; the complete-history Git bundle was cloned and fsck-verified. Source bytes were compared again immediately before removal; the tree was clean, all commits integrated and no process had a cwd inside it. Only the ended core tree and merged branch were removed; its archive ref remains. Frozen shared Git database, persistent Courtwork, M1 and the new Pi task are retained. No push/deploy or Git-root migration.

The previous C/D/E Host writer is released. The [local Pi task](../../local-pi-worker-loop-20260922.md) may merge this accepted main and progress to its explicitly scoped L3 consumer after L0–L2. This transfers only that order's minimal Host/child changes, not a general Runtime/Settings/Core rewrite. Parent Arch retains final architecture and integration.

The displayed Luna report normalizes only trailing whitespace and its redundant final blank line. Exact received bytes remain in `29a6c17` at the same report path; findings and test output are unchanged.
