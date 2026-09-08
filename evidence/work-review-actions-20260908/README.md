# WK10b backend action and renderer seam · 2026-09-08

User authorized Astra's backend precursor while Opus implements WK10b first segment in a separate frontend worktree. This work starts at clean main `a2c2e4cdda08a4976be6eca96b61237555633809`, branch `codex/work-review-actions`. Code freeze `3d97beb8df20ee0061dc31e8cd72d01ac3b6afd7`. No `app/web/**`, actual renderer, Home, Settings, brand or personal runtime data was modified.

## Delivered contract

- Each action descriptor has `schemaVersion:1`; `decide` retains its existing payload enum. `revise_candidate` fixes parent candidate and current Matter base, delegates proposal schema to the work adapter, and requires a fresh client candidate ID. Core still owns identity/CAS/history; NDA verifies current evidence/facts. Pending, closed and source-stale supported-contract parents may be revised without revoking prior Decision/Artifact records.
- Host surface actions disappear and `readOnly` becomes true during an active host Run, matching the existing POST action refusal. Unloaded/absent producer and unsupported-contract paths remain read-only.
- Inbound NDA manifest declares `/extensions/inbound-nda/renderer.mjs`. The exact server route is admitted; missing bytes return404, actual bytes return JavaScript, sibling/private/traversal paths remain404. The actual module is still Opus's second-segment work. Admission is not UI completion or formal authority.
- `nda-packets.json` fixtureVersion2 retains pending/accepted/history, adds the actual declared revision request and resulting revised packet. Generated through real local HTTP/Pi/Core loopback. SHA-256 `0defdc38ae440278e731e4a1c10c76f22840957e327c7910caee4578719343b7`, 133300 bytes. Prior fixture remains at `1332691:app/tests/fixtures/work-core/nda-packets.json`; no historical evidence is relabeled.

Consumer: [Work Core](../../docs/work-core/contract.md), [NDA](../../docs/work-core/nda.md), [packet](../../app/tests/fixtures/work-core/nda-packets.json). No changed database or domain-contract schema, provider route, dependency lock or model loop. The descriptor field is additive; consumers must not execute unknown versions/actions.

## Verification

Targeted command: `node --test app/tests/work-actions.test.mjs app/tests/renderer-admission.test.mjs app/tests/nda-runtime.test.mjs` — 6/6 author pass. Actual API tests execute the declared revision after acceptance, preserve old records, reject stale base/spoofed actor/reused identity, rebuild a source-stale parent from current verified input, keep unresolved accept unavailable, and test active Run/unload/version/generation refusal.

Renderer test uses a disposable source copy and synthetic module bytes, so it neither edits the frontend worktree nor claims to test the forthcoming product renderer. Exact-path 200, missing404, private siblings/traversal404 are exercised through the actual server.

Full `npm --prefix app test` at code freeze — **174/174 pass**. Existing lockfile install succeeds. `npm --prefix app run smoke` passes. Logs: [install](install.log), [targeted](targeted-tests.log), [full](full-tests.log), [smoke](smoke.log). [Independent review](independent.md) is scoped separately from author results. All runs use isolated synthetic data and loopback/port0; Opus port8873 and data are untouched. No paid provider, real-model evaluation, UI usability, or G1–G5 product acceptance is claimed.

Independent bounded review at `3d97beb`: **6/6 pass**, no concrete defect reproduced. It verifies action/identity/current-base/read-only semantics and exact renderer admission; it does not accept the forthcoming UI. Final documentation-only commits preserve the tested code bytes.
