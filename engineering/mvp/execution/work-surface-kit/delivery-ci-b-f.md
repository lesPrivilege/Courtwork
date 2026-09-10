# Delivery · CI-B composer growth + CI-F unsupported paste

2026-09-10, Claude (Opus). Branch `claude/composer-grow-notice`, base `main`
`1992e90`. Rulings: the user's CI-A…CI-F on the composer-ingest specimen
(`claude/composer-ingest-specimen`, `engineering/design/composer-ingest-2026-09-10/`).
This order is CI-B and CI-F only; A2 (inline paste token) stays in the specimen.
Not merged, not pushed.

## What changed

| File | Change |
|---|---|
| `app/web/composer-field.mjs` (new) | `supportsFieldSizing`, `fitFieldHeight`, `installComposerGrowth` (JS fallback, never writes `value`), `unsupportedPasteNotice` |
| `app/web/styles.css` | `@supports (field-sizing: content)` growth; Chat ceiling `min(180px, 28dvh)`, Home `min(160px, 28dvh)`; `.composer-notice` |
| `app/web/app.mjs` | growth installed once; a fit after each of the three programmatic value writes; paste listener (nothing prevented); notice keyed to its draft target; `measureHomeLead` anchors the resting composer |
| `app/web/index.html` | `<p id="composer-notice" role="status" hidden>` inside the composer form |
| `app/server/index.mjs` | one STATIC list entry: `composer-field.mjs` (**outside `app/web`, flagged**) |
| `app/tests/composer-field.test.mjs` (new) | 6 tests |

## CI-B · growth

- The field grows from its variant's min-height to its ceiling, then scrolls:
  Chat 88 → 180, Home 96 → 160, Home Modules 48 → 160. The ceilings are the
  values already declared (WK-97); they were never reached because no sizer
  existed. **Open:** WK-97's comment says both variants grow to "the same cap",
  but 160 ≠ 180 — the values were kept, not unified.
- **Capability, not engine.** `field-sizing: content` behind `@supports`; where
  unsupported, `installComposerGrowth` sizes from `scrollHeight`. Both paths
  leave `value` alone. Chromium 152 here takes the CSS path; the fallback was
  exercised in the same page by forcing `field-sizing: fixed` (88 → 100 → 180,
  then scrolls).
- **Short viewports.** At 640×400 (1280×800 at 200 %) growth to 180 left the
  conversation 48px. The ceilings are now `min(<ceiling>, 28dvh)`: 112px at
  400 tall, unchanged above ~640 tall. **To confirm: the 28dvh figure.**
- **Home anchor (WK-96).** `measureHomeLead` read the *current* box and re-runs
  only when the composer area resizes, so a draft that had grown before the
  last measurement left an emptied composer at centre 0.52, under the 0.55
  line. It now anchors the resting box (current height minus growth): empty is
  0.56 whether the page loaded empty or with a capped draft, and growth goes
  downward with the first line fixed.
- `--composer-h` follows growth through the existing ResizeObserver (198 → 250
  on Home, 233 after send).

## CI-F · unsupported paste

- One sentence only when the clipboard has an image file and no non-blank
  `text/plain`: "Only text can be sent, so the image wasn't added." (plural for
  several). A paste with text is left to the browser and clears the sentence;
  `preventDefault` is never called (asserted in the test).
- Muted, `role="status"`, inside the form under the field. It clears on the
  next input, on send, and when the composer moves to another draft target
  (Home ↔ a chat, chat ↔ chat).
- Not handled here: non-image files (a copied PDF) — Chrome pastes its name as
  text where present; drag-and-drop of files onto the field.

## Verification

Real app on port 8933 (data `/private/tmp/se-composer-grow-data`), Browser pane,
real typing and clicks except where noted.

| Check | Result |
|---|---|
| Chat, typed 485 chars | 88 → 123, all five lines visible |
| Chat, Send clicked | field back to 88, notice cleared |
| Home Modules, typed | 48 → 100, top fixed (lead 24), cap 160 then scrolls |
| Home Simple, reload with capped draft → clear | top 425 both ways; empty centre 0.56 |
| 640×400 | Chat and Home cap 112; Chat conversation 70px at cap (48 before the guard) |
| 390×844 | Chat 88 → 180 (conversation 561 → 446); Home 96 → 160 |
| Image-only paste (synthetic `ClipboardEvent`) | sentence shown, not prevented, value unchanged |
| Image + text paste | no sentence, not prevented |
| Two images | plural sentence |
| Typing after the sentence; switching chat | sentence cleared |
| Fallback path (forced) | 88 → 100 → 180, scrolls; undo reverts the same step as the native path |
| Tests | `composer-field.test.mjs` 6/6 (suite 685 → 691). Full suite on a machine at load 11–17 (other sessions): 690/690 once, then 690/691, 689/691, 687/691, 688/691 — each time a *different* set of ~20 s backend timing tests (lifecycle, runtime-foundation, run-lineage, crash-point, event sync); those files pass 22/22 in isolation. Pristine `main` 1992e90 under the same load: 684/685, also one timing test (transport timeout). This slice touches no runtime or server logic beyond one STATIC list entry |
| Lints | colors, materials, shapes, interaction, contrast: 0 |

Not verified: WebKit / the native macOS host (the CSS path there depends on its
WebKit version; the fallback covers older hosts), a real OS clipboard image
paste (the pane cannot place one), IME, VoiceOver announcement of the status
line, the Large text size.
