# K3 · Parent final review and bounded return

2026-09-22 · Parent Astra. Reviewed packet `cb26d2060d0882607bab12e37ba76cdb141392ce`, source/test pin `b99900771db008da505b2450bf382bf378dd3be3`; main `dbe9493a04f7a1bbe6bb761a99d17ace3bce0416` remains schema20. **Hold integration for K3-R1.** Original backend task/tree retains the correction; Claude E1 may continue within its disjoint frontend lease. Pages is excluded.

## K3-R1 — adopt: a Kit declaration cannot silently lose its frozen history

The [parent probe](missing-binding-probe.mjs.txt) creates a real ordinary Chat through the authenticated Host, imports an instruction and v2 profile with one Kit, selects it, and completes a Run through the real in-process Pi/deterministic provider. After closing the Host, it changes only two Kit projections in independent synthetic persisted state: `run.kitBinding = null` and removal of `runtime.bound.data.kitBinding`. The nonempty v2 `composition.kits` and existing composition/hash remain.

[Observed result](missing-binding-probe.log), exit1:

- Full `validateState` accepts the inconsistent schema21 state.
- An actual Host reopens that state successfully.
- Recorded `/runtime-context?sessionId=…&runId=…` returns HTTP200 with one declared Kit, no `kitContext`, and a null Run summary.

The null-summary branch in `validateKitBindings` checks for a ghost event summary, then skips checking the retained Kit-bearing composition. The historical reader consequently takes the no-Kit path. This violates the original order's load-time cross-record validation and frozen recorded-context contract. This is a synthetic persisted-corruption/load counterexample, **not evidence that normal HTTP admission drops summaries, that a wrong inference was sent, or that the database authenticates malicious rewrites**.

Return the smallest existing-owner validation change: a retained admitted v2 composition with nonempty Kits must require its Run summary and matching event projection; preserve legitimate v1/empty-Kit and schema20 migration histories. Add an actual persisted-load/reopen regression alongside the Store invariant, exercising both absent and explicit-null event summary as appropriate. Refuse inconsistency before a successful historical read; do not reconstruct from current profile/resources, fabricate old context, infer supported compatibility, or widen this into a generic repair system. Explain the precise legacy boundary. No new endpoint or UI change is requested.

The first parent attempt established validator acceptance but called the test helper as `reopen(h)` rather than `reopen(h.dataDir)`, so its TypeError did not prove reopening. The preserved final probe corrects that harness call and demonstrates the HTTP200 readback. Its exact original checkout locators are historical reproduction inputs, not active development instructions. All data were disposable; Hosts closed and the temporary dependency symlink was removed.

## Other reviewed evidence and limits

[Luna's independent review](luna-review.md.txt), [test log](luna-tests.log), [probe log](luna-probes.log), [exit record](luna-exits.txt) and [source hashes](luna-source.sha256) support 23 Host +4 Store +51 K1 tests and2 separate probes. That bounded pass did not exercise removal of both projections; it does not override K3-R1. Parent also inspected admission/replay queues, exact retained payload checks, bounded declarations, immutable Store transitions and the real request artifact.

The exact-context evidence is actual Host→locked Pi→deterministic loopback, not a live-model capability claim. The retained Runtime Control contribution is242 UTF-8 bytes/240 UTF-16 units with SHA256 `b0b64043f010e5a89e57542659eb445f81cd6160fecd20038ccce6e06ad66158`, appears once, and excludes deferred bodies until the existing loader is explicitly used. Author1565/1565 and smoke remain author evidence; the parent did not repeat the full suite.

No main product/schema adoption, user-data migration, browser/UI acceptance, deployment or tree cleanup occurs with this return. The E1 concrete contract remains a candidate frontend handoff. Backend writer may resume only this finite correction and its affected evidence; frontend files and the original Claude writer remain protected.

[Luna narrow source assessment](luna-followup.md.txt) agrees with the finite return after reading the parent probe; it did not rerun that probe. Its phrase “Run binding removed” refers to setting the required Run field to null, as shown in the original code/log, while the event property is deleted. Legitimate schema20/v1 and empty-v2 histories remain in the required positive matrix.
