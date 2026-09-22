# Kit K1/K2 final acceptance — reference-only context planner

2026-09-22 · Parent Arch/Astra accepts product/test source **966dfdb26111f23145f3edeaef19de180193e98a**, final handoff **9a09f8ef06f1b3b46189e6bba73a2dfd3e8f7a44**, under the [K0 parent contract](../kit-k0-parent-20260922/README.md). Integrated main: **70a2268d25a4cb4baf96cda2ca2ab30326f86df8**. Module SHA-256 is `c37e811ea5cd7081c6f92527f1d6985f586a95db2d5dd86ac480138757696a07`.

## Accepted outcome

`planKitContext` is a pure reference-only planner over an already-admitted Runtime Control binding. It validates exact Kit/resource identities, accounts rendered source bytes/UTF-16 units and separators, preserves deferred bodies, refuses missing/mismatched required content or budget excess, keeps compatibility evidence and permission readings distinct, and returns deterministic context/plan identities without mutating the input. No-Kit delegates to the original compiler. The new module reuses the actual compiler/source resolver; it adds no resource importer, policy evaluator, profile store or runtime factory.

The [K2 General/Coding/Praxis evidence](../kit-k0-20260922/k2-final-examples.json) demonstrates a bounded synthetic binding→plan→context consumer. Deselecting a Kit on the same admitted binding does not remove that binding's instructions; changing only version/deferred metadata can change the plan while leaving text identical. These are intentional contract boundaries, not evidence of a production selection transaction.

## Independent evidence and dispositions

[Parent-task Luna review](luna-review.md.txt), [full51/51 log](luna-tests.log), [9/9 adjacent source/control log](luna-adjacent.log) and [two independent probes](luna-probes.log) pass, exit0. The51 comprise44 author cases plus7 previously independently authored probes; the parent reviewer adds two further adversarial inputs: optional deferred tamper refuses, and wrong-runtime-revision unsupported evidence remains unchecked/not-applicable rather than becoming an unsupported result or an invented permission. [Exit/source summary](luna-exit.txt), [source hashes](source-sha256.txt).

Parent inspected input/ref/compatibility/render/refusal code and the actual existing compiler and resolver. **Accept** the pure-module scope; no concrete blocker remained. **Adopt** author K2-A1's strict malformed runtime/evidence correction: explicit null runtime plus empty evidence remains valid unchecked; absent/undefined malformed input is not silently normalized. Preserve its original failing evidence and author attribution.

[Actual integrated-main51/51](integrated-tests.log) passes, exit0. Merge had no conflicts. Four new product/test files match the author's source hashes; shared Host/control/source/permission/Store/Core/UI and package owners remain unchanged. No additional full application, provider, browser or migration check was warranted for this pure-module merge.

The author's internal Luna final log is only a command/result summary, not a full per-case transcript; that correction remains in [the author handoff](../kit-k0-20260922/k1-k2.md). The complete parent execution logs above do not retroactively change its evidence attribution.

## What remains unimplemented

This does not implement a Kit catalog, importing/selecting/removing resources, saved per-profile composition, Adapter runtime-revision discovery, immutable production Kit→Run binding, real runtime compatibility, native hooks or formal Work acceptance. `compiled` is not ready-to-execute and `supported` is only the supplied evidence's scope; Host still decides action admission. The future consumer must supply the admitted binding, freeze plan/runtime identity and consume retained output. UI consumes an owner projection, not this Node module as browser code or a fixture masquerading as backend truth.

RuntimeStore20/Core4/bridge5 and package pins are unchanged. 06e-R1 and M1 remain their separate frontend owners. User services/data were not started/restarted/upgraded, no credentials/native/provider calls were made, and no push/deploy occurred.

## Preservation and cleanup

[Preservation receipt](preservation.json) records9,423 entries /468,756,629 file bytes, including ignored/untracked files, modes, symlink targets, refs and patches. Physical archive extraction matched the manifest; the complete-history Git bundle was cloned and fsck-verified. The temporary verification dependency symlink was absent. Before removal the source was unchanged/clean, all commits integrated, and no task/test or infrastructure cwd holder remained. Only the ended Kit checkout and merged task branch were removed; archive ref `refs/archive/kit-compiler-20260922/Courtwork` remains. Persistent Courtwork, frozen shared Git database, M1 and06e trees are retained.

The six K0 files and historical author logs remain at their original bytes. This final receipt is the authoritative parent adoption, superseding their historical pending-parent wording without rewriting it.
