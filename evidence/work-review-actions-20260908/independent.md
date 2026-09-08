# Independent review · Work action and renderer seam · 2026-09-08

This review covers only the `3d97beb8df20ee0061dc31e8cd72d01ac3b6afd7` delta from clean main `a2c2e4cdda08a4976be6eca96b61237555633809`: versioned `humanActions`, revision admission, NDA decision filtering, active-Run read-only projection, and the exact optional renderer route. It does not review the full Core or Fable design and it does not inspect or implement Opus’s renderer.

## Tree and scope

The isolated construction checkout used branch `codex/work-review-actions`, at frozen code `3d97beb`. The commit changes `app/core/owner.mjs`, the inbound-NDA adapter, `app/extensions/work-adapter.mjs`, `app/server/service.mjs`, `app/server/index.mjs`, the fixture generator/fixture, and two focused tests. `git diff --name-status a2c2e4c..3d97beb -- app/web app/extensions/inbound-nda/renderer.mjs` is empty; `app/extensions/inbound-nda/renderer.mjs` is absent by design. Parent documentation changes in the working tree were left untouched.

## Checks performed

- `node --test app/tests/work-actions.test.mjs app/tests/renderer-admission.test.mjs app/tests/nda-runtime.test.mjs` passed **6/6**. The tests cover `schemaVersion:1`, parent/current-base binding, immutable prior candidate/Decision/Artifact history, current-source revalidation, stale-base refusal, actor/reused-ID refusal, active-Run and generation gates, and incompatible/read-only surfaces.
- In `app/core/owner.mjs:22-69`, `decide` descriptors remain limited to pending candidates at the current Matter base/source/contract. `revise_candidate` descriptors bind `candidate_id` to the parent and `base_version` to the current Matter version, clone the adapter-supplied proposal schema, and carry `schemaVersion:1`.
- `app/extensions/inbound-nda/index.mjs:44-60` applies the unresolved-finding accept restriction only to descriptors whose action is `decide`; revision descriptors are not accidentally treated as decisions. `app/server/service.mjs:673-685` removes all actions and sets `readOnly:true` while any host Run is active, and `:722-742` independently refuses mutation during that Run.
- `app/tests/fixtures/work-core/nda-packets.json` parses with keys `schemaVersion`, `fixtureVersion`, `dataClass`, `decision`, `revision`, `pending`, `accepted`, `revised`, and `history`. The prior `pending`, `accepted`, and `history` packets remain; `revision` and `revised` are added. Its recorded SHA-256 is `0defdc38ae440278e731e4a1c10c76f22840957e327c7910caee4578719343b7` over 133300 bytes.
- `app/tests/renderer-admission.test.mjs` uses a disposable copied app tree. `app/server/index.mjs:13-20,169-177` serves only the exact `/extensions/inbound-nda/renderer.mjs` key, returns 404 for absent bytes, returns the exact synthetic JavaScript bytes when present, and leaves private sibling/traversal paths at 404. No actual renderer bytes were authored here.
- `git diff --check` and `git diff --cached --check` pass for the checkout’s current documentation/evidence work.

## Findings

No concrete defect was reproduced in this bounded delta. The intentional residual boundary is that the manifest advertises the exact inbound-NDA renderer seam while the renderer file remains absent, so the route returns 404 until Opus supplies it; the test and delivery README document this as unavailable/read-only behavior. The backend does not claim UI completion or formal acceptance.

## Verdict

The reviewed action descriptors, NDA filter, active-Run gate, fixture update, and exact optional renderer admission behave as specified by the focused contract. This is independent bounded evidence, not product acceptance or a frontend review.
