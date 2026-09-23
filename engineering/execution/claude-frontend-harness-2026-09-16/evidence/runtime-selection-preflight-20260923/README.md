# Runtime selection preflight — GPT-6 routing

2026-09-23 · User explicitly selects GPT-6 Sol + GPT-6 Luna. Actual subagents: `/root/sol6_runtime_binding` (gpt-6-sol, high) and `/root/luna6_runtime_selection` (gpt-6-luna, high); parent Astra retains architecture and final acceptance. These are bounded subagents, not new sidebar tasks.

[Luna6 source preflight](luna6-preflight.md.txt) and [Sol6 executable baseline](sol6-baseline/README.md) consume existing P03/RD-001/DRT contracts. Sol6 independently ran52 targeted existing tests, no product edits. Current production still composes one Runtime Port per Host. Local Pi subprocess is a child path, not a Session runtime selector. The profile expectation named `runtimeSelection` is composition CAS, not executor selection.

**Adopt:** Pi remains the default; the already-reviewed managed Agents adapter stays the first P03 alternate. Do not substitute child-only Pi or a new CLI to manufacture availability. Reuse current adapter/service/Store identities, factory injection and native binding/recovery rules; no new provider/permission registry. Any persistent selector requires an explicit typed owner and compatibility migration decision. No active or historical native session may silently switch executor.

**Adjust stale parts of the raw preflight:** C/D/E creation/root-turn identities, retained action ledger and read-only reconciliation already exist and are independently accepted. They are not new contract gaps to rebuild. Exact-root human cancellation and lost-create disposition remain future work. K3 also explicitly admits reference-only unchecked Kit compatibility on the verified in-process Pi port under its bounded policy; do not rewrite this as supported-only. It does not thereby admit Kits on the managed alternate.

**Readiness:** selectability is not live-service acceptance. First freeze the per-Session versus per-Run dispatch/identity/CAS contract and unavailable-runtime behavior, using the accepted native binding mismatch tests. Current evidence does not authorize a live remote credential, API call or public availability claim. R0 may define the minimum multi-port binding plumbing and offline conformance; live promotion remains its separate P03 evidence gate. Do not expose a working alternate merely because selection fields can be saved.

Sol6 first closes the small LP-R6 UI return in its existing tree. Runtime selection product implementation stays unstarted until LP-R6 is accepted/cleaned and parent fixes the concrete R0 contract from this preflight. Claude Kit/Profile authoring remains a separate frontend owner; no source lease transfers merely from this report.


## Evidence packaging correction

Parent commitb8935a8 accidentally copied the Sol baseline directory recursively, including318 tracked synthetic test-temporary files (test Host stores, native fixture sessions, SQLite and content Git objects), instead of only its README and test log. The tests used the stated isolated deterministic fixtures; no personal credential store was read for this task. Mutable test stores do not belong in the product repository. A follow-up removes the entire test-tmp copy from the current tree, after [external archive/physical restoration verification](scratch-removal-receipt.json). The original scratch directory remains outside the repository. Shared history is not rewritten; the earlier commit still contains that historical copy. The retained baseline README/log are the intended evidence. Future intake copies only explicitly named deliverable files, never the whole scratch directory.
