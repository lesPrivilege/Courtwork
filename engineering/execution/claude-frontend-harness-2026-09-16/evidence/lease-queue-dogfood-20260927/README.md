# Lease queue real-provider dogfood — 2026-09-27

The bounded coding harness journey passes on product `9fb8dbb02a677088a926cafd85ba4bebac3b23c6`: browser preparation → real model diagnosis → exact write/check approvals → failing/passing Host tests → reload → independent review feedback → same-candidate correction → reload. This does **not** exercise Work Core's formal proposal/review/acceptance chain or close G4/general backend readiness.

## Scope and ownership

The user explicitly authorized computer use and a moderately complex backend task. Parent Astra prepared an independent synthetic lease-queue repository, operated the OpenAI in-app browser and independently inspected the output. CourtWork's configured DeepSeek V4 Flash/high through Pi 0.85.1 authored the candidate. No CourtWork product implementation was assigned or changed; the existing production authors retain their work.

The contract covers idempotent enqueue, expiry boundaries, fencing stale workers, retry exhaustion, detached values and JSON snapshot restoration. Inputs are valid JSON and the documented valid parameter domain. Source is pinned to `fd941934bf3cc861eda8ea72b8bb307aa64b2ece`. [Fixture bytes](fixture.json) contain the unchanged base and final candidate overrides; [integrity](integrity.json) proves the source stayed clean and README/package/original tests are byte-identical.

The outcome requires a real provider/browser/Host seam: unit tests alone cannot show permissions reach the correct candidate, failed checks return to the model, or a later Run resumes the same work. Keep the original source and tests fixed, check exact candidate/write identities, and separate model prose from Host facts. Cost was two bounded real Runs; no automatic retry campaign, process restart or stress workload. Rerun only for a relevant regression or new task, not to generalize this result.

## Actual result

- Session `5602d421-9596-48f0-b8e0-969c194e06d2`; candidate `47117908-8dde-4573-9126-d13ac489e48f`, final write revision **7**.
- First Run `bb8cbd3d-44db-42d1-affb-b68f06b05ba8`: baseline **2/12**, intermediate **20/21**, then **21/21**. The model repaired two source modules and added nine tests. One new-test expectation was corrected before running; another used numeric `1` where the contract required string `'1'` and was corrected after the failed Host check. The model's final prose calls both intermediate failures; only one intermediate failing Host check occurred.
- Parent's [unchanged independent probe](verify.mjs) then demonstrated loss of legal own `__proto__` JSON keys in the hand-written clone. The [first failure](independent-first.log) is retained. The review finding is **adopted**: return to the same model/candidate, reproduce before changing source, preserve ordinary object semantics and add regression coverage.
- After browser reload, second Run `c97a84ce-f338-4f82-8776-05d1343edacf`: added test fails **21/22**; corrected clone then passes **22/22**, exit 0. The original tests are unchanged. Parent's [final probe](independent-final.log) passes 88 expiry/restore transitions across attempt limits 1/2/3/5, stale/terminal receipt rejection, detachment and special JSON keys.
- [Host receipts](summary.json): **30 tool starts/results**, **12 exact approvals/resolutions**, **7 confirmed writes**, **5 started/settled checks**, two completed Runs. Both Runs bind the same candidate/base; the first immutable Run object is unchanged after continuation. Browser reload preserves both completed responses and does not admit another Run. [Final browser view](final-reloaded.png).

## Friction and limits

One `runtime_load` call failed with “Context resource is not exposed to this run”; the model continued without operator repair instructions. **Defer** this repeated discovery friction to the existing tool-discovery owner; it did not block this task and is not permission to widen resource exposure.

Several mouse/Enter attempts on location/approval controls did not produce the intended action; one location attempt selected an old recent folder, which was removed before preparation. Space activation reliably submitted the exact approval. **Defer root-cause attribution**: no deterministic product reproduction separates browser automation coordinates, focus/scroll behavior and UI rerendering. Do not count attempted input as an approval; only the recorded Host decision is evidence. No product fix was attempted.

No crash/process restart, cancellation, multiworker race, malicious snapshot, performance, accessibility or formal Core acceptance claim is made. The clone correction is confined to this synthetic backend; no credentials were inspected/exported and no product push/deployment occurred. The user-requested Host and browser remain available.

## Reproduction and evidence

Materialize `fixture.json.base` into an empty external folder for the baseline. Overlay `finalOverrides` for the final result. Run `node --test` there, and `node /path/to/verify.mjs /path/to/materialized-folder` for the independent probe. Do not apply these files to CourtWork product source. Node used here: 25.9.0.

`summary.json` is a selected projection of authenticated read-only public HTTP receipts, not fabricated events. Bootstrap authentication was held only in memory. Host/data paths in copied receipts and logs are normalized to `<HOST_DATA>` / `<DOGFOOD_ROOT>` for portability; raw receipts and captures remain in the external local rehearsal folder. `fixture.json` and integrity hashes retain exact source bytes. The parent probe's passes are external checks, not mislabeled as CW tool execution.
