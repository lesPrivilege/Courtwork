# Chatspace / Work review · integration closure

2026-09-13 · Astra integration owner. User requested Luna independent review of the Context/activity work, acceptance of the other conversation’s Work review card already on main, and local merge closure. The user then added persistent left-aligned agent-message time and smaller message actions. No push or deployment was requested.

## Scope and decisions

- Initial Context/activity implementation `9a5694c` and small-ring refinement `bf9f686` were already ancestors of main. `de55674` includes the separate Work review object-card delivery (`9672a12`). There was no missing branch to merge again. This closure accepts their combination with the review corrections below and the explicit message-footer additions.
- Work review remains one Core-owned object entry after Run activity: title, pending/stale/read-only facts, and the existing Review action. Run completion does not become Work acceptance. Normal refresh is absent; failed reads retain a named retry. Astra reviewed the other author’s code and supplied 1440 screenshot; that supplied screenshot remains the other author’s browser evidence.
- The newly supplied six-archetype text was already summarized in the existing surface-classification registration. [Luna intake](review/surface-intake.md) closes its full-source archive gap and maps it to the existing IA/Attention/Work queue. Astra adopts this mapping, without reopening the full audit or treating vendor claims/the 71-candidate sweep as verified.

## Review corrections

1. Hidden/reduced-motion intervals no longer advance the phrase-carousel clock. Resuming continues its prior phase; a new Run/process still resets normally.
2. Both measurement entries now announce a dialog, matching the named nonmodal dialog role on the native popover. Browser keyboard opening reports “Request context” dialog, and Escape restores the Context button with `aria-haspopup=dialog` and the card closed.
3. The Work review root remains mounted through message-stream updates. First activity insertion still precedes the card, including the empty-chat transition. A summary reread restores detached focus to Review or its retry only while focus remains on the body; it does not steal a user’s later focus elsewhere.

4. Native time elements no longer use a prohibited accessible name; readable hidden text carries the full Run-start provenance, while the visible clock is excluded from duplicate announcement.

The original findings and Luna’s independent verification are retained in the [independent review](review/independent-review.md). Acceptance is bounded to these UI projections and their owner/interaction contracts; full native accessibility and true capacity/TPS measurement are not closed by this work.

## Message-footer additions

The [user screenshot](evidence/20-user-message-time-reference.png) requested agent-message time analogous to user messages, then smaller buttons. Both message footers share `renderMessageTime`; Chatspace and Attention show the agent time before the action row, permanently visible even when hover actions are hidden. The store has no per-event timestamp, so the projection uses the matching Session/Run’s recorded `startedAt`, as the existing user footer does. Agent tooltip/accessibility text explicitly says “Run started”; it does not invent a per-message generation timestamp or redraw clock. Invalid/missing dates are omitted. Inline message action glyphs use the existing 16px row tier, with 32px desktop / 44px touch targets retained; menu controls are unchanged.

## Validation evidence

- [Host smoke](evidence/closure-smoke.txt): read/write, artifact persistence, close/reopen, continuation/revision and historical bytes passed, fake provider only.
- [Combination full suite](evidence/closure-full-tests.txt): 939/939 passed in 216.4 seconds. Main advanced from bf9f686 to de55674 during that run, so it is combination-worktree evidence, not a frozen bf9f686 result. It precedes review repairs and message-footer additions.
- [Post-repair scope](evidence/review-fixes-targeted.txt): 18/18; [message/projection/Attention checks](evidence/message-time-targeted.txt): 31/31. These cover paused clock, wrong-scope/missing time, message boundaries, Core read outcomes and focus-return/non-stealing logic.
- [Final immutable source manifest](evidence/closure-final-source-sha256.txt) fixes de55674 plus 12 explicit source/test files in an isolated detached worktree. Its [full suite](evidence/closure-final-full-tests.txt) passed **941/941** in 221.6 seconds. It includes the focus, activity and footer work but precedes the final native-time accessibility correction. After that correction, [final targeted checks](evidence/message-time-final-targeted.txt) passed **35/35**. Final delivered file hashes are [here](evidence/closure-delivered-source-sha256.txt); all other snapshot files match. No claim is made that the full suite was rerun after the last accessibility-only change.
- Author synthetic browser: [streaming focus](evidence/review-focus-streaming.json) retains the same Review button while text grows 2187→4993 characters; sibling order remains message-list/activity/review-summary. [Terminal focus](evidence/review-focus-terminal.json) remains on Review after Completed and the read-only label clears. [Capture](evidence/17-review-focus-streaming.png).
- [Message-time capture](evidence/18-agent-time-desktop.png) verifies the actual timestamp and smaller icons. This follow-up browser viewport was 1195px; attempts to override a background tab did not affect it and are not recorded as 390/1280 passes. Prior ring/card 390/1280/1440 evidence remains attributed to its earlier source. Time/icon additions did not receive another native narrow/200%/screen-reader matrix.
- [Final lint](evidence/closure-lint.txt) and [links](evidence/closure-links.txt) retain their bounded coverage. No credentials or mutable workspace data enter Git.

## Final disposition

Luna gives bounded independent acceptance with all four P2 findings resolved and 20/20 final independent targeted tests passing. Astra accepts the combined local-main delivery within that scope. The final author targeted set passes 35/35; the preceding isolated snapshot passes 941/941. Full native accessibility, real capacity/TPS and overall Release acceptance remain separate.
