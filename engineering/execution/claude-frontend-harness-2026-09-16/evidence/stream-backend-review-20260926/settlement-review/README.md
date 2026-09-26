# Independent settlement return review — 2026-09-26

Source `7a1f3a6bf701f968ff7881d783057b73af3e509c`, product correction `befc592`, original Claude branch. Parent main at `b9b3d9f`; no product files or candidate state changed. **Adopt the live-settlement correction and retain STR-R2 acceptance; hold backend completion for the persisted multi-segment recovery seam under original STR-R1.**

## Verified corrections

- Parent's original transient snapshot failure probe now returns [failed / runtime_projection_failed](original-fault-probe.json), with usage missing.
- Parent's exact final-versus-held-write probe now returns [one error partial for segment0](final-inflight-failure.json), 648 characters of newest accepted text. The previous no-final counterexample is closed.
- Luna independently passes75/75: segment9, persistence9, P03-C/D/E29, protocol/transport/Pi port28. [Raw log](luna-targeted.log). New service regression includes late-event stability and reopen for the one-segment failure.
- Parent real-Host audit [6/6](audit.json), [console](audit.log), Node25.9. C10:176,496 delta-event bytes,252,960 state-growth bytes,35 deltas, unchanged bounds. STR-R2 remains accepted for this fixture. Author full1696/1696 remains separately attributed, not independently rerun.

The live `unsettled` map and list settlement now retain text until final persistence succeeds, and service terminal writers spread that list. Existing schema22/Core4/bridge5 stay unchanged.

## Reproduced remaining seam: Pi retry plus persisted recovery

An initial real mixed-text/tool probe did **not** reproduce multiple open segments; source inspection explains that Pi drains observations before tool execution (`pi-session-runtime.mjs` beforeTool wrapper). It is not evidence for a blocker.

The supported Pi **provider retry** path does reproduce the schedule. [Retained probe](retry-crash-image.mjs) uses the real Host and Pi port, synthetic local text at30ms/chunk with `failAfterChunks:16`, and holds the second segment0 snapshot append. Pi's retry emits segment1 while segment0's error final still awaits that append. Both segments have text in RuntimeStore and neither has a durable final.

The probe captures the actual `runtime-state.json` bytes at that point. It then releases/closes its synthetic Host, restores those exact captured bytes in its own disposable data directory, and reopens the Host. This is **captured crash-image replay**, not an OS process-kill claim; no synthetic assistant events are invented or inserted. [Result](retry-crash-image.json):

- Before: durable delta segments `[0,1]`, durable finals `[]`, Run running.
- After reopen: Run unknown; only segment1 receives an unknown partial; segment0 remains unsettled.

Luna independently reran the same captured-image replay; [its result](luna-retry-crash-image.json) confirms segment0 remains unsettled. This supersedes the earlier unproven concern based only on callback concurrency.

`persistedPartial` still selects only the last delta across the Run. Startup recovery and cancel-without-active-entry still call that singleton helper, although the live path now handles a list. Thus the new per-segment guarantee does not yet hold across recovery. This uses ordinary Pi retries, not the separately deferred managed-runtime native interleaving case.

## Explicit original-Claude correction

Continue the same branch; **do not redo the accepted live failure/settlement fix or STR-R2**. Under STR-R1, make persisted recovery enumerate each segment with persisted text and no durable final, in stable segment order, using only persisted evidence and the legacy compatibility rule. Update both existing consumers (startup recovery and no-active-entry cancellation) to atomically append those partials before the unknown terminal record. Skip settled or textless segments, retain unknown, and remain idempotent on subsequent reopen/cancel; do not rewrite history or invent unpersisted text.

Add a production recovery regression using the supported Pi retry schedule or the captured state it actually produces, failing on7a1f3a6 and passing on the correction. Cover settled+unsettled segments, legacy events and repeated recovery through the existing contracts. The retained probe accepts the checkout path: `node <receipt-dir>/retry-crash-image.mjs <absolute-checkout>`. Keep the author evidence, source SHA and handoff in the original streaming record. Return the fixed source for independent disposition; frontend stays queued, no new writer/approval/Figma requirement.

No full-suite, Node22/24, live provider, browser or performance/motion acceptance claim. G1 remains mitigated; whole-file write amplification and native interleaving remain their previously recorded limits. Candidate/worktree remain preserved.
