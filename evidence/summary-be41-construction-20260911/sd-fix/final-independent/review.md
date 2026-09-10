# SD-FIX final independent review

Reviewer: Luna, non-author reviewer. Product scope: Summary D1/D2 and WORK-3 at the fixed object `466bdfdc8f3795e0205508c8f26de5acf6c140fa`. Review tree: detached at that exact SHA. The source construction tree and the shared UI checkout were left untouched. No product file, `engineering/current.md`, main branch, deployment, or external service was changed.

## Bounded verdict

The scoped implementation and evidence are conditionally acceptable for a bounded SD-FIX review. I found no runtime or test blocker in the fixed 445 implementation plus the 466 documentation/evidence intake. This is not main-wide or product acceptance, and the author’s browser screenshots and 715-test run are not counted as my execution.

There is one documentation follow-up before treating the semantic record as fully synchronized: the live source comment in `app/web/composer-field.mjs` still says “Chat 88 → 180”, while the fixed CSS, WORK-3 checks, and active contracts now define an empty two-line field via `calc(2lh + 8px)`. Historical delivery/input records also retain the earlier 80–96/88 wording. This does not change the product bytes or fail the scoped tests, but it should be corrected or explicitly marked historical before a stronger documentation acceptance claim.

## Independent checks run

- `node --test tests/summary-disclosure.test.mjs tests/chat-shell-proportion.test.mjs tests/chat-work-shell.test.mjs tests/composer-field.test.mjs tests/shell-layout.test.mjs`: **37/37 passed**. The untouched command output is in [scoped-tests.txt](scoped-tests.txt).
- A synthetic Tiny DOM counterexample with a quote, combining accent, emoji, reordered files, and deletion: recorded focus identity survived reorder and deletion fell back to the Files disclosure. Raw output is in [counterexample.txt](counterexample.txt).
- `node --check` passed for `app.mjs`, Summary projection/card, composer field, surface modules, the fixed fixture server, and FE-01 composition checks.
- Fixed-commit-only `git diff --check` passed. The broader 445→466 check reports only preserved historical raw-log whitespace/newline warnings in `before-opener-tests.txt`, `contrast.txt`, and the TPS specimen output; those warnings are recorded in [static-checks.txt](static-checks.txt) and are not represented as a clean source check.
- The evidence JSON and key image dimensions were independently parsed/checked. Raw results are in [evidence-json-image-checks.txt](evidence-json-image-checks.txt).

## Scope findings

- D1 keeps the explicit clicked opener through the Summary card callback, uses the host’s existing return-focus owner, records `sessionEpoch`, rejects disabled/hidden targets, and has a same-scope disclosure fallback. The 17 Summary assertions in the 37-test run cover stale identity/generation, duplicate and late actions, disabled opener transfer, file reorder identity, and retry fallback.
- D2 uses `minmax(0, 1fr) minmax(0, 2fr)` for Summary rows, retains the full path and 64-character hash, and wraps long Unicode content. The supplied 1280/390 and large-text evidence is present; the independent quote/Unicode check adds a locator edge case.
- WORK-3’s fixed contract is content-driven: two visible lines, larger text expands the resting height, long content reaches the 180px ceiling and scrolls, clearing returns to the empty height, and Files/Model/Send stay inside the form. The 466 growth/error matrices pass those consistency checks.
- 466 consumes donor test semantics without adding a second growth mechanism: the active CSS has one `field-sizing` path and one JS fallback, with Home 96→160, Work 180, and support-gated `28dvh` ceilings. The added contract/check updates describe the two-line Work behavior.
- The four Home premise records all use 1440×900, Medium text, and an empty draft. Candidate Modules/Simple and main `8393d7b` Modules/Simple are separately labeled; the corresponding supplied images show the same synthetic project/session context. The main styles blob hash recorded in the receipt was independently recomputed.
- Supplied `native-chrome-200-*` artifacts are present and labeled as Chrome 152 Incognito at browser zoom 200%; the return accessibility-tree text names the focused Run details button. I inspected the supplied PNGs only as author evidence. I did not personally run a real browser/device or claim those screenshots as my execution.

## Explicit limits

Chromium 147 UI was not rerun; the fixed receipt says only a headless binary was available. Real forced-colors media/OS validation is explicitly **NOT RUN**. Native CourtWork host, IME, soft keyboard, VoiceOver, Q1 read-state/retry wiring, Q3 cross-client sync, and deletion-as-revocation remain outside this bounded review. I did not run the 715-test suite, use raw CDP/Playwright, access personal data, or take control of another agent’s browser.
