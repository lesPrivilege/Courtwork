# Runtime R1 parent review — fixed backend candidate

2026-09-23 · Parent Astra. Packetb7426c1f1ac8be0e3184b54b2320ff31787722e1, product49e2c00e2b3c9a3ea0df0fcf95fd0564d3f13fdb. **Hold schema22 integration for R1-R1/R2/R3.** Source is fixed and writer released; original GPT-6 Sol retains only the bounded correction. Main stays schema21. No user Host/data or live remote operation is involved.

## R1-R1 — adopt, Store cross-Run revision invariant

[GPT-6 Luna review](luna6-review.md.txt), [exact reproduction](revision-drift.mjs.txt) and [persisted/reopen output](revision-drift.log) show that Store accepts two nonchild Runs in one Session with the same adapter ID/configurationRef but revisions `pi-r1` and `pi-r2`, then accepts the state after reopening. A configuration ref includes adapter revision by definition, and the accepted contract requires later bound Runs to preserve that revision. Current validation checks each Run against Session ref and choice counter, but never checks bound adapter revisions across the lineage.

Enforce this at the existing Store admission/load/mutation owner, including a direct rejected second admission and a corrupt persisted-reopen case with unchanged bytes. Compare only actual bound nonchild records; legacy unknown annotations and proven Spark child exceptions keep their contract. No second registry, forged ref reconstruction or schema increment is needed. This is a direct Store/persisted-state counterexample; it does not demonstrate that the present public service constructed a wrong descriptor. Existing service checks are not a substitute for the leased Store invariant. The exact Store script is diagnostic: its baseline prints the accepted counterexample and exits normally; after correction it should stop at the specific invariant rejection. Preserve that distinction rather than describing every probe as a pass on exit0; the permanent regression should assert the rejection and unchanged state.

## R1-R2 — adopt, command discovery still uses default Pi

[Parent real HTTP probe](command-probe.mjs.txt), [exit1 log](command-probe.log): a selected managed Session completes a real loopback Run. Scoped Runtime Info correctly says `adapterId:agents-api` and `nativeCompaction:false`, but GET commands and POST status say the Chat has no recorded conversation to compact. `#commandFacts` calls `#runtimeCapability("compact")` without the Session's actual port, then tests Pi's absent journal. It reports the wrong prerequisite for an unsupported operation.

Use the selected/pinned Session executor in command facts, preserving ordinary Pi behavior. Missing or contradictory configuration should produce honest compaction-unavailable facts without needlessly breaking unrelated retained/read-only command information. Prove managed history remains unsupported, Pi history retains its behavior, and no compaction/provider/native effect occurs merely from discovery/status. Direct compact admission already resolves the selected port; do not rewrite it or add a fallback.

## R1-R3 — adopt, rejected constructed managed port is not disposed

[Parent composition probe](construction-probe.mjs.txt), [exit1 log](construction-probe.log): a trusted factory returns an object with an invalid managed ID and a counted close callback. Construction is correctly rejected, but callback count is0. `runtime.mjs` registers the constructed object for cleanup only after validating its ID.

Track ownership as soon as the factory returns, so validation failure disposes every constructed port once and closes Store/fake/other owned resources. Keep valid startup/shutdown and factory-throw-before-return behavior separate. The probe proves the cleanup callback is skipped; it does not claim a real orphan process/socket was observed. No plugin/general factory expansion follows.

## Positive evidence and scope

[Luna22/22 targeted log](luna6-targeted.log) covers new Store5/public HTTP11/Pi6. [Two other corruption probes](crossrecord.log) reject a forged child binding and Session/native contradiction without rewriting the file. Parent inspected service routing, choice/Run admission, compaction/reconcile, active port capture, native gateway identity and default composition. Author1623/1623 and smoke remain author evidence at49e2c00; they do not override these independently reproduced findings. No parent full-suite or browser acceptance has been claimed for this candidate.

The original source/evidence tree remains for correction. Re-run the exact probes against fixed bytes and the relevant adjacent lifecycle/migration/HTTP suites, preserve both failed and corrected evidence, then report a source/packet pin and writer handoff. Do not repeat already accepted K3/E1/LP-R6 construction. Parent will independently review the delta; no merge, source cleanup or real runtime availability promotion is authorized by this review.

Reproduction files preserve their original isolated checkout locators for exact before/after execution; they are evidence, not another persistent product path. Only these named logs/scripts were copied; temporary stores stay outside Git.
