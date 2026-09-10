# CS-01 × CI-B/F integration

2026-09-10, Claude (Opus). Branch `claude/cs01-ci-bf-integration`, worktree
`/private/tmp/se-cs01-integration`. Not merged, not pushed, not independently
browser-accepted. Order per ruling: CI-B/F → CS-01 → EX-IC2.

## History (original SHAs kept; nothing rewritten)

```
525aed0  CI-B/F receipt (base of this branch; d55d006 + 0aca122 below it)
bf508fe  merge WO-CS-01 bb0a501 (106330b product + bb0a501 evidence;
         brings its construction base 438bb9c = main 1992e90 + codex/summary-disclosure-r2 eff0e41)
65043fa  test: one composer growth mechanism
7b69327  merge WO-CS-01 doc sync c616933
1614318  docs: composition standard states the integrated composer sizes
```

`eff0e41` (summary disclosure) is carried because it is CS-01's build base; being
here does not accept it. **Non-author review (2026-09-10, `2265649` on
`claude/summary-disclosure-review`): conditional pass, fixes pending.** Two P2
defects must be fixed by the module's owners (Astra/Luna) and re-verified by a
non-author: D1 focus returns to `<body>` after closing a file / Run opened from a
card (Chromium 147; not reproduced on 152); D2 the Run information SHA-256 row
collapses to a 0-width column on long paths and pushes Open down ~1000px. P3 D5
(hard-coded threshold in `app.mjs`) is already superseded here by CS-01's accepted
640 formula; D6 (`current.md`) is the conflict resolved at CS-01's build base.
Astra's branch is at `796c3a5`, whose later commits do not touch D1/D2; this branch
still carries `eff0e41`. When the fix SHA lands it is merged here and the combined
checks, full suite and STATIC recheck are rerun.

**User rulings on the review's Q1–Q3 (2026-09-10; Q text at
`se-agent-sdr/evidence/summary-disclosure-20260910/independent-review/README.md:102-104`):**

- **Q1** — "no card + host reader" is accepted for this order but is *not* full
  card-state coverage. loading / error / unavailable / incompatible / Retry are
  recorded as **unit-tested only, not wired in production**, never as passed. A Run's
  `Failed` is not a read error; `readerAvailable:true` only states the fixed built-in
  reader, it proves no absent-reader compatibility. Independent card read states
  need their own wiring order later; not this round.
- **Q2** — the whole `<1024px` range, 768–1023 included, stays on the existing
  on-demand sheet; the review point asking for an inline summary before the prose is
  corrected accordingly. Focus containment, Escape close and focus return inside the
  sheet must still be verified. Automatic switch to the sheet across the breakpoint
  and desktop overriding `surfaceOpen:false` stay existing behaviour, with no new
  interaction acceptance.
- **Q3** — the host sync limit stays; cross-client revocation is **not** recorded as
  met. Deleting a Session and revoking permission are different things: a card not
  updating within 6 s proves a sync gap, not a server boundary failure. Reads and
  actions after a stale Open must still pass the server's existence and permission
  checks; if one returned data the caller may no longer access, that is a blocker,
  not display lag.
- Consequence: after D1/D2 are fixed and re-verified by a non-author, the summary
  module can enter a **bounded** combined acceptance; Q1's unwired states and Q3's
  sync limit stay open and do not close the full state matrix.

**Q3 server-side check on this base (`revoke-probe.mjs`, scratch data, 8934):**
after `DELETE /api/v5/sessions/:id` (200) every read a stale Open would issue is
refused — `GET /runs/:id` 404 "run not found"; workspace tree, workspace file,
artifact file, surface and events 404 "session not found" (the existence check fires
before any path or locator is read; workspace bytes are retained on disk by design,
`workspaceRetained: true`, and are not reachable through these routes). So the stale
card only re-shows what the page already held. This covers **deletion** only; there
is no separate permission-revocation path to exercise, and the card's stale Open was
not re-driven in a browser here (the review did that: `revoke-check.txt`).

## What the integration decided

| Area | Result |
|---|---|
| Composer growth | **One mechanism: CI-B.** `@supports (field-sizing: content) { #composer-input { field-sizing: content; } }` for every variant, `composer-field.mjs` fallback where unsupported, plain ceilings + `@supports` dvh override. WO-CS-01's Chat-only `.app-shell:not(.home-active) #composer-input { field-sizing }` rule was folded into it in the merge. |
| Chat empty height | WO-CS-01's `calc(2lh + 8px)` kept (a size candidate per ruling). |
| STATIC list | Union: summary-disclosure's modules + `composer-field.mjs`. |
| Tests | `chat-shell-proportion.test.mjs` now asserts the single rule and the absence of the Chat-only one; `composer-field.test.mjs` asserts the two-line minimum under the 180 ceiling. |
| Docs | `ui-composition-standard.md` rows for Work's initial height (two lines, candidate), growth, and the provisional 28dvh cap. |

## Checks on the combined base

| Check | Result |
|---|---|
| `combined-checks.mjs` → `checks.json` | **15/15** (headless Chrome, 1280×800, Home Simple). Native host and a simulated fallback host (`CSS.supports('field-sizing')` false before load, property forced off): Home 96 → 160 top fixed, centre 0.56 empty; switching from a capped Home draft to a chat starts at the chat minimum (54.2); chat grows (123) and caps at 180; returning to Home refits its restored draft to 160. Large text: Home centre 0.56 (the observer re-measures by itself in a rendering browser), chat minimum scales to 60.8, caps at 180. |
| WO-CS-01's own `checks.mjs` on this base → `cs01-checks-on-integration.json` | **21/21**, unchanged script, fresh `serve.mjs` fixture: composer empty/grow/bound/caret/undo/returns/restored/error-line, keyboard, Escape, band, long names, summary floor, touch 44, 390 sheet, 640×400 and 720×450 zoom stand-ins, Home 820, Settings band 48, native band. |
| Browser pane (8934) | Chat 54.2 → 146.6 typed → 180 cap; cards panel ends above the grown composer (432 < 498); prose and composer edges identical (288–936); Send returns to 54.2. Paste notice: image-only shown, image+text none, never prevented, cleared on switching chat. 390×844: Chat 54.2 → 180, Home 96 → 160. 640×400: 112 / 112 with dvh; with the dvh rule deleted, 180 / 160. |
| STATIC (curl, 8934) | 200: `composer-field.mjs`, `summary-disclosure.mjs`, `summary-disclosure-projection.mjs`, `summary-disclosure.css`. 404: `/web/not-a-module.mjs`, `/web/composer-field.js`, `/web/../server/index.mjs`. |
| Targeted tests | `chat-shell-proportion` + `composer-field` 13/13 |
| Lints | colors, materials, shapes, interaction, contrast, doc-links: 0 |
| Full suite | **712/712**, exit 0, on `776ee4e` (this note's commit), clean tree, load ≈ 5, one run: raw log `full-suite-776ee4e.log`. The commit that adds the log adds only the log and this row; no code |

A measurement trap worth knowing: in a **hidden** Browser pane no frames render, so
ResizeObservers do not fire and timers are throttled — `--composer-h` and the Home
lead read stale (a first large-text reading of 0.52 was this). Use a rendering
browser (the headless script) for anything observer-driven.

## Open

- **WORK-3** in `work-surface-kit/evidence/fe01/composition-checks.mjs` still asserts
  Work's initial height 80–96; WO-CS-01's two-line start (≈54) fails it. Left
  unchanged: the two-line height is a candidate awaiting ruling.
- 28dvh is provisional; 640×400 / 720×450 approximate 200 % zoom, they are not
  real zoom. Not verified: real zoom, soft keyboard, the native macOS host /
  WebKit, a real OS clipboard image, IME, VoiceOver, independent browser acceptance.
- EX-IC2 slice B must re-capture on this base (its `1992e90` captures predate CS-01).
