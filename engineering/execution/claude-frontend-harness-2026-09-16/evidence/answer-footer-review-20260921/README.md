# Answer footer — independent acceptance

2026-09-21. Candidate `17f57c0680017a2fb18110160af5b35371879a9b`, base `af1cfad`; locally merged into main as `2c23272011f56ed1afc8f857c8f5b6bd832a57d6`. Astra accepts the bounded 06b correction after [Luna’s non-author review](luna-review.md) and OpenAI-provider browser execution against the exact candidate.

## Evidence and decisions

- Luna: 64/64 focused owner tests, exit 0; projection counterprobes and final-answer Copy identity passed. No source blocker.
- Astra: real CW Host with the author's loopback scripted provider and independent synthetic data/ports. Chat waiting → completion gives zero → one footer; exact Copy text comparison passes; reload retains the final footer. Attention waiting → completion also gives zero → one. Subsequent cancelled and failed Runs retain their body and add no footer; the earlier completed Run retains its one footer. See the numbered [browser captures](browser/04-attention-complete.ax.txt), [cancel](browser/05-attention-cancel.ax.txt), [failure](browser/06-attention-failed.ax.txt), and [reload](browser/07-chat-reloaded.ax.txt). Browser pane resized during this review; screenshots are observations, not fixed-viewport golden baselines.
- Adopt: completed tool-ending Runs have no invented assistant answer/footer. Artifact, presentation and notice rows remain separate evidence and preserve the preceding final-answer footer.
- Adopt: `length` follows recorded completed Run status; a footer denotes a settled message, not semantic completeness. Explicit truncation wording remains a future Runtime/Run-surface concern.
- Defer: Copy on failed/cancelled partial text without a completion footer, to the original Run-surface owner. This does not reopen the requested one-final-footer change.
- Adjust author claims: full suite was 1327/1328, the failing lifecycle file passed 13/13 in isolation; a timing cause is not independently established. Luna did not repeat the full suite. Two trailing-space lines in the immutable author checks log make whole-delta whitespace checks fail; source is clean. Preserve that raw evidence rather than rewriting it as green.

Native 200% zoom, screen reader and forced colors remain unexecuted. This review adds no paid provider trial, no G4 blanket acceptance and no new backend capability. User Host 8787 and preview 8899 were untouched; independent review service stopped and its tab closed. The active Pi Runtime Port writer remains separate.

Actual integrated main affected suites report 40/40 (output boundary, actions, static manifest, entry audit); [complete output](integrated-tests.log). The shell tail wrapper did not preserve the test process exit status, so no exit-code claim is made from it. Documentation links: 1,497 documents / 8,544 targets, no problems. Current working-diff whitespace check passes; historical author log whitespace remains as recorded above.
