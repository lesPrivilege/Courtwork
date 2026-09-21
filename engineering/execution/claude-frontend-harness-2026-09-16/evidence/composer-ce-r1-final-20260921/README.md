# CE-R1 — independent correction review

2026-09-21 · Astra. **Accepted for this bounded working-location slice.** Candidate `4695426be6cd1ea9f7aca2cc8ed1521e6a521af7`, following `ac6049b` and main merge `be6a999`. This record follows the [original bounded return](../composer-entry-acceptance-20260921/README.md); it does not reopen CE-F2 or expand accessibility acceptance.

## Independent browser evidence

OpenAI in-app browser, actual viewport 1195 × 772. Independent real Host 8971, scripted loopback provider 8972, evidence-only gate proxy 8973; disposable data and a synthetic Git folder under the OS temporary directory. No real provider, personal credentials or user 8787/8899 instance used. The proxy forwards held requests unchanged. The author harness was read before reuse; the browser driver was Codex's own computer-use interface, not the author's CDP runner or debug-state handle.

One **ordinary Home Send**, without preparing a candidate first, was held serially:

1. Chat created, bind not forwarded: [actual panel](01-bind.dom.txt) remains readable; folder picker, path and Connect are disabled, with the in-progress explanation.
2. Binding read back, draft save not forwarded: the already-open panel repaints to the bound reading; Disconnect and Start private candidate stay disabled and Change folder is absent. [DOM](02-draft.dom.txt), [screenshot](02-draft.png).
3. Home marker handed off, Run admission not forwarded: [panel](03-admission.dom.txt) remains locked and says the message is being sent. It does not mislabel the in-flight request as an unknown outcome.
4. After release, [completed Chat](04-completed.dom.txt) shows one answer and the panel restores Change folder, Disconnect and Start private candidate. [Reload](05-reload.dom.txt) retains the completed answer.

[Proxy commands](gates.jsonl) show one create, one bind and one Run admission, all 200; no revoke or 409. [Persisted Host projection](host-result.json) confirms one Session, active binding revision 1 and one completed Run. Disabled controls were inspected through the real DOM; no forced click or hidden app-state mutation was used. Author evidence separately attempts enabled controls before the correction and demonstrates the original revocation.

## Attribution and limits

Author full suite 1352/1352 and before/after/recovery browser probes remain [author evidence](../composer-entry-20260921/ce-r1-return.md). This independent browser pass verifies the three gated in-flight windows, normal unlock and reload; it does not independently rerun refused-folder correction, bind/draft reply loss, native folder selection, native 200% zoom, narrow-width race, screen reader or forced colors. Previous accepted preparation recovery remains in its original evidence. Shared initial focus/scroll CE-F2 stays deferred. Synthetic test services and tab were stopped after the pass.

## Final disposition and integration

**CE-R1 adopt, closed within this finite scope.** Luna's [final non-author review](luna-final-review.md) passes [122/122, exit 0](luna-tests.log). Astra's independent browser pass verifies the actual production wiring at the original three await windows, continuous repaint, normal unlock, completed binding and reload. Source `4695426` is integrated as main `d52f44f5956defd0c404ac194d9fe167ce82984a`; [actual-main owner/lifecycle/manifest checks](integrated-tests.log) pass 40/40, exit 0. The integration tree equals the reviewed source tree. No repeated full suite; author 1352/1352 belongs to the delivered source.

**Review F-01 adjusted/withdrawn, not a new author return.** The [initial Luna report](luna-original-review.md) proposed a Chat-navigation interval with `home=false`, pending Home marker and no pending Run. Astra tested a [surface-only gate](cw-ce-r1-surface-proxy.mjs): the ordinary Home Send made no surface request and [completed](06-handoff-probe.dom.txt); [command log](cw-ce-r1-handoff-gates.jsonl). Source confirms the new Session has no extension binding, selection closes its surface, and both proposed awaits immediately resolve before another browser event can run. Luna's reachability re-review withdraws the blocker. The standalone helper/card state did not establish a user-reachable race. Original and corrected reports are retained separately.

Post-create bind/read-back lost replies remain explicitly unexecuted and assigned to the existing plain-Send recovery owner; this acceptance does not claim complete unknown-effect recovery. CE-F2's shared initial focus/scroll and native accessibility residuals remain open, with no new parallel roadmap or implementation.

[Local integration and restoration-verified cleanup are complete](completion.md).
