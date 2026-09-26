# Order 3 frontend independent review — 2026-09-26

Fixed candidate `7944e122ffe1fd6e86516ce7213686a29749ab82`, product `88e3e7e`, fixture `9b96b06`, based on accepted backend/main `0ec94c5`. Original Claude branch/tree preserved, with only pre-existing untracked `app/node_modules`; main product remains unchanged. Parent Astra/Codex owns disposition and actual OpenAI-browser verification; Luna provides bounded non-author source/test review. **Hold for STR-FE1, streaming Markdown reference scope.** Backend STR-R1/STR-R2 stay accepted.

## Independently observed

- Luna39/39: new projection/session-events/activity plus output-boundary27, chat-work-shell5, attention-agent7. [Raw log](luna-targeted.log). No new issue identified in reviewed seq/session admission, persisted/legacy segment identity, partial mapping and incremental/full-render switching. These narrow tests do not establish complete browser or accessibility coverage.
- Parent used the OpenAI-controlled in-app Chromium browser on the exact candidate fixture, isolated data and checked-free loopback ports18961/18962. No paid provider or user service. Screenshots captured with the tab's supported CDP surface at actual1280×900 and390×844 CSS viewports; native pane screenshots initially scaled the emulated viewport, so the retained images use Page.captureScreenshot.
- [390px dark Chat](390-dark.png): long Markdown/CJK remains readable and page scrollWidth equals390; composer and Send remain visible. [1280px light Chat](1280-light.png) and [1280px dark Attention](1280-attention-dark.png) show the changed reading/activity/partial treatment. This is bounded visual evidence, not full reflow/text-spacing acceptance.
- [Selection through final](selection-through-final.json): body stays connected, selected text stays `Paragraph 1 explains wha`, rendered text remains781 characters through updates and settlement with a visible `Content updated` hint; release paints10,912 rendered characters. This independently supports D2(a) at growing and structural-final boundaries.
- Observed live Chat bar delays were0,-0.13,-0.26,-0.39,-0.52,-0.65,-0.78 seconds. [Emulated reduced-motion check](reduced-motion.json): active Run's seven bars have zero animation instances and `is-moving` is absent. This does not claim native OS preference coverage.
- Attention successfully streams on its global conversation after Chat finishes. Cancel in a controlled active window renders `Interrupted` with `Cancelled` status ([reading](attention-cancel.json), screenshot above); Escape closes the dialog and focuses `attention-button`. The first cancel attempt arrived after completion and is not counted as cancellation evidence.
- Attempting concurrent Chat and Attention Runs was refused with `only one active run is allowed`, preserving the Attention draft. Source `RuntimeStore.createRun` honors existing singleActiveRun policy. This is a truthful existing backend restriction, not a frontend defect or a successful simultaneous-stream test; do not expand concurrency to satisfy this review.

All temporary browser media/viewport overrides were reset, the test tab closed and the review fixture stopped. No page mutation or browser setting is left for the user.

## STR-FE1 — preserve document-wide reference semantics while growing

Luna found and Parent independently reproduced with the **production** `createAssistantBody` and sanitizing `markdown` imports in the actual browser. [Retained result](markdown-reference.json). Repro input:

```md
[ref]: https://example.com

Read [the link][ref]
```

| Before / actual growing output | Required after | Why |
| --- | --- | --- |
| `<p>Read [the link][ref]</p>` | A sanitized anchor labelled `the link`, as the full-document renderer already produces | The definition has already arrived; this is a complete reference expression, not unfinished syntax |
| Previously drawn `Read [the link][ref]` stays literal after a later definition block arrives | Invalidate affected earlier blocks when the reference environment changes | Source text equality alone does not mean a block's interpretation is unchanged |

`markdownBlocks()` discards the lexer's shared document reference environment, and `renderBlock(raw)` independently parses each block. The unchanged-block reuse condition also misses references supplied later. A normal final reparses the whole text and is correct; sanitization is still present. This is a **growing-state fidelity regression**, not a security defect or final-output loss. It affects both surfaces through the shared body implementation.

**Disposition: adjust, required before frontend acceptance.** Preserve whole-document reference resolution while retaining unchanged settled rows and bounded changed-block rendering. Reuse the existing parser/sanitizer and explicit dependency invalidation; do not introduce a Markdown engine or restore whole-thread parsing on every poll. Keep selection-held text frozen until release, then render the newest semantically correct snapshot.

Required narrow regressions: definition-before-use, definition arriving after an already-painted reference, unchanged unrelated block identity, growing versus canonical output once definitions exist, and final convergence. Include a real browser/DOM path through production `createAssistantBody`; a lexer-only string test is insufficient. Retain sanitizer behavior and avoid raw-HTML bypass. Test before correction on7944e12 and after the fixed source.

## Other dispositions and evidence limits

- **Adopt:** existing1.8-second staggered activity recipe and the fix preventing stream-container remount. **Defer:** the per-bar varied-period specimen; no product change or new design decision is needed for that candidate. Existing UX-05/CR-01/Atlas remains the unified grammar.
- **Retain:** shared cursor, stable segment bodies, partial labels and D2(a) behavior within the independently exercised paths. Do not relabel these as complete frontend acceptance while STR-FE1 remains.
- Author headless4-round timing and payload comparison is useful author evidence; Parent did not rerun those performance rounds. Early after-rounds used an intermediate motion/selection source as the author disclosed. Some first/terminal p95 values increase; this review accepts the narrower explanation that text-only updates reuse settled bodies, not a claim every percentile or all end-to-end latency improved. Poll cadence remains unchanged.
- Not independently checked: reconnect fault injection/C3, full C6 set beyond references, native200% zoom, forced colors, screen reader, full keyboard traversal, native OS motion preference, all-browser matrix, Node22/24 or a real provider. Author1709/1709 and smoke remain author evidence. No full suite was rerun without a new reason.

## Explicit original-Claude action order

Continue the same preserved frontend branch and fix **only STR-FE1** in the shared body/parser integration, with the regressions above and updated measured evidence if the correction changes rendering cost. Keep accepted backend, cursor ownership, partial semantics, selection freeze and the shipped1.8-second recipe. No Figma, extra writer or routine permission question is required. Update the original streaming record with exact source commits, failing-before/passing-after evidence and limits, then stop for independent disposition. Do not merge, push or claim combined acceptance. Parent retains the remaining browser verification after the fixed delivery.
