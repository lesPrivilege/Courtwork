# Composer working-location entry — independent review and bounded return

2026-09-21 · Astra. Candidate `ac6049b63ba855f5adf275a1cfbfbe617cc1ebd4`, base `3bf1e0b`. **Hold integration for CE-R1 below.** Preserve the released source/evidence tree for the original frontend author. This is the disposition of the existing [06b working-location ruling](../composer-entry-review-20260921/README.md), not another roadmap.

## Accepted design and executed journey

The single Work location entry, lighter context band, separate Project/Folder/Edits readings and unchanged Host authority are retained. Luna independently reran the affected 15 suites: [115/115, exit 0](cw-composer-independent-review.log); [source report](cw-composer-independent-review.md). Passing tests do not cover the race below.

Astra used OpenAI computer use through the in-app browser against an independently started real Host on 8971 and loopback synthetic provider on 8972. No user configuration or 8787/8899 instance was used. Actual captured viewport: **591 × 772**.

1. [Open the unified entry](browser/02-location.png): one panel presents Project and Folder separately, without the former nested card.
2. Create a project through New project; success returns focus to the stable entry. Enter an isolated synthetic Git folder by path; the card explicitly distinguishes read access and private edits.
3. [Prepare before inference](browser/03-prepared.png): the UI confirms the Chat/candidate are ready without sending. Project becomes fixed, binding uses its canonical path, and candidate identity/write count are shown. [DOM receipt](browser/03-prepared.dom.txt).
4. Escape closes the panel and returns focus to `workspace-chip`. Reopening confirms the existing focus/scroll weakness described below. Refresh preserves the project, folder, prepared state and unsent draft: [restored Home](browser/05-restored-home.png).
5. Send through the prepared path reaches the same named Chat and completes a synthetic reply: [Chat](browser/06-chat.png), [DOM](browser/06-chat.dom.txt). This is not a real-model capability test.

## CE-R1 — adopt; original Composer author must correct before integration

Luna F-01 is supported by the production source chain and minimal real-card probe. A **plain Home Send** marks `homeStart.pending`, then stores `operation.session` immediately after `/sessions`. While bind, attachments or draft persistence still await, `preparedHomeChat()` exposes that Session, but the new `sending` condition requires `!session`; `preparationState()` returns none for the non-prepared marker. Consequently the panel receives no busy reason and can expose enabled location mutations after creation and before admission.

Keep the entry readable, but preserve the location mutation lock for the **whole pending plain-send operation**, including the interval after Chat creation. Keep uncertainty recovery accessible. Do not replace the accepted preparation controller, change Host contracts, or fix this by hiding all state from the person. Add a production-wiring regression that pauses after `/sessions` and before/after bind/read-back, opens the panel and proves Connect/Change folder/Disconnect/Start edits cannot race the original Send; verify normal unlock/recovery. The current 115 tests and card-only probe are not an executed full browser race; do not present them as such. Retest the bounded delta and relevant owner seams.

## CE-F2 — adjusted/deferred shared-focus follow-up, not a second blocker

[Reopened bound panel](browser/04-reopened.png) auto-focuses Disconnect and scrolls the title/Close above the viewport (observed scrollTop 71.5, clientHeight 400, scrollHeight 670). Improve initial focus so the person first sees the location reading without focusing a removal action; this remains the existing shared focus owner. Escape and New project return-focus were independently verified. Ordinary outside dismissal onto another focusable control was not executed; preserving that deliberate new focus is appropriate, so narrow the author's blanket light-dismiss claim rather than forcibly stealing focus. No additional lifecycle defect is established by Luna F-02.

Native 200% zoom, screen reader, forced colors, native folder chooser, wide/dark independent captures and the plain-Send race remain unexecuted in this browser pass. The attempted viewport override produced invalid framing and was discarded; no wide-screen claim is made. Author headless-Chrome screenshots remain author evidence. Prior G4 residuals stay open. The synthetic review Host and tab were stopped; user services remain untouched. No merge, source/evidence deletion or next frontend journey.
