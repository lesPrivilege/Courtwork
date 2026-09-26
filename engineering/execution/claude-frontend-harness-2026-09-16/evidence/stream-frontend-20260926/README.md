# Order 3 frontend · author delivery evidence — 2026-09-26

Author: Claude (Opus 5.5), original Order 3 author. Branch `claude/stream-backend-20260925`, fast-forwarded to integrated main `0ec94c5`. This is **author evidence**. It is not independent, visual, accessibility or combined acceptance.

Commits:
- `9b96b06` · the fixture, probe and headless measurement harness;
- `88e3e7e` · the product change and its tests;
- the docs commit that adds this README.

## What changed and why (measured causes)

| Finding on `0ec94c5` | Cause | Correction in `88e3e7e` |
| --- | --- | --- |
| Chat receipt→DOM grows with the thread: 14 ms on the first long reply, 41–45 ms by the third (built-in browser and headless) | Every poll rebuilt every row and re-parsed every reply's Markdown | Bodies are kept by segment key; a text-only poll grows only the growing body in place; that body re-renders only its changed Markdown blocks |
| A selection made inside a growing reply was lost (09-25 audit) | Full rebuild each poll; the stream container was also re-inserted each render (below) | D2(a) freeze with `Content updated`, carried across structural rebuilds; no container re-insertion |
| Attention downloaded the whole detail every ~1.5 s: 40 KB → 325 KB per tick for one 12,000-character reply | Its own full-detail loop, not the cursor | The shared `events?afterSeq=` cursor (`session-events.mjs`); the full detail is re-read only at Run boundaries and cursor gaps |
| Cancelled/legacy text stayed `pending` after its Run ended | Projection pinned delta-after-terminal as pending | Partial, with the WK-57 state word `Interrupted`/`Unknown`, no answer actions |
| Activity bars showed no fluctuation | The `animation` shorthand reset every mark's `animation-delay` to 0 and out-ranked the `:nth-child` delays; all seven marks computed `1.8s / 0s` and moved as one | The accepted study recipe is restored: staggered, one −130 ms phase step per mark, inside the shorthand |
| Activity animation restarted about once per poll (6 Animation instances per mark in 4 s) | `renderComposer` prepended the message stream before `#preview-banner` and then the banner before the stream on every render. The banner element always exists, so the stream was detached and re-inserted each time | Nodes move only when out of place; banner-then-stream is left alone |

The row identity now follows the Host's `(runId, segment)`. Older events use the accepted finals-before rule. Tool and question events no longer advance an assistant counter. Four existing assertions in `output-message-boundary.test.mjs` pinned the old ids and the old pending-after-terminal state; they are updated to the accepted contract and annotated in the file.

## Headless measurements (repeatable)

Command, loopback fake provider only:

```sh
node app/scripts/stream-frontend-measure.mjs --out <report.json>
```

- **Setup:** HeadlessChrome 153, 1440×900 CSS px, DPR 1, same machine as the Host. Each build ran 4 rounds.
- **Before:** `0ec94c5` plus only the fixture, probe and harness files, with the fake-provider `burst` option.
- **After:** `88e3e7e`.
- **Scenarios:** run in order in one Chat thread, so later scenarios run on a longer thread; then Attention in a new conversation.
- **Raw data:** [`headless/`](headless/). Aggregate: [`headless/summary.json`](headless/summary.json) (lower-middle median and range).
- **Units:** fake-provider chunks of 24 characters. Nothing here is decode TPS.

| Scenario (fixture units) | Receipt→DOM p50, before → after | p95, before → after (range) | Frames with script >50 ms, before → after (range) |
| --- | --- | --- | --- |
| Chat `sustained` 12,000 characters at 1,200 characters/s, first reply | 19 → 9 ms | 24 (23–40) → 39 (37–41) | 0 → 0 (0–1) |
| Chat `burst` 60 chunks back to back, 700 ms pauses | 34 → 7 ms | 40 (36–42) → 22 (14–24) | 0 (0–2) → 0 |
| Chat `sustained`, third long reply in the thread | 44 → 7 ms | 51 (51–53) → 27 (27–31) | 7 (7–9) → 0 (0–1) |
| Chat `flood` 6,000 characters/s (1–3 polls) | 50 → 32 ms | 50 → 32 | 3 (2–3) → 0 |
| Chat `tools`: text, tool, text (1 poll) | 52 → 37 ms | 52 → 37 | 2 → 0 (0–1) |
| Chat `markdown` with reduced motion (1 poll) | 68 → 42 ms | 68 → 42 | 3 (2–3) → 0 (0–2) |
| Attention `sustained` | 14 → 11 ms | 21 (20–22) → 29 (27–31) | 0 → 0 |

Per-poll payload: Chat unchanged (it already used the cursor). Attention per-tick p50 159,623 → 44,720 bytes. The max, about 342 KB, is the one full-detail read at the Run boundary on both builds.

How to read the table:
- **First-reply p95.** It is the single render that first creates the reply row. That render varies between 16 and 40 ms on both builds (before-4: 16, before-2: 40, after: 39–40). Later polls on the first reply fell from 15–24 ms to 5–11 ms.
- **Attention p95 29 ms.** This is the terminal render. It includes the one canonical `markdown()` of the final text, which the convergence requirement asks for.
- **Host persist → browser receipt** (round 4, keyed by Run and seq): p50 about 120–220 ms and p95 up to about 440 ms on both builds for Chat; Attention p95 797 → 680 ms. This latency is set by the 900 ms (Chat) / 1500 ms (Attention) poll and the 250 ms Host coalescing, not by rendering. **The visible text therefore still advances in steps of about one poll**, roughly 1,000 characters per step at 1,200 characters/s. The transport is unchanged and SSE remains a candidate.
- Rounds 1–3 joined seq across sessions and their Host join is ignored. The script now keys by Run.
- After-rounds 1–3 ran from the working tree while the activity CSS was still the candidate recipe, and before the D2(a) rebuild hold was added. Neither changes render timing. The activity numbers below come only from `after-activity.json` (the shipped recipe); C8b comes from `after-final-chat.json`.

## Activity motion (same load)

| Measure, Chat `sustained`, 40 samples at 100 ms | `0ec94c5` | `88e3e7e` |
| --- | --- | --- |
| Computed delay per mark | all `0s` | `0s, -0.13s … -0.78s` |
| Animation instances per mark in 4 s | 6 (restarted each poll) | 1 |
| Spread across the seven marks at one instant (scaleY, p50 / max) | 0 / 0 (moving as one) | 0.13 / 0.46 |
| Range per mark | 0.466 each | 0.55 each |
| `prefers-reduced-motion: reduce` (emulated) | still | still; 0 animation instances |
| Hidden document (built-in pane hidden, observed) | — | `is-moving` off; marks at rest |

Files: [`headless/after-activity.json`](headless/after-activity.json), [`headless/before-1.json`](headless/before-1.json) … `activity`.

[`activity-specimen.html`](activity-specimen.html) compares three rows:
- before;
- the shipped recipe;
- a **proposed candidate**, not shipped: a per-mark period of 1.1–1.86 s and per-mark peak. It measured spread p50 0.63 in an intermediate run.

The candidate goes beyond the accepted study recipe, so it is left for Parent's selection. All rows are decorative and non-numeric. No random variation or rate is implied. Real decode TPS stays deferred.

## Correctness checks

Built-in Chromium 152 pane at 1024×768, DPR 2, author-driven, fixture `stream-frontend-fixture.mjs`, on the working tree that became `88e3e7e`:

| Case | Result |
| --- | --- |
| C2 text → tool → text | Rows `assistant:0`, execution group, `tool`, `assistant:1`; narration kept |
| C3 Chat, 4 requests dropped mid-stream | `Connection lost` shown. After recovery: `completed`, exactly one row, DOM equal to one `markdown()` of the Host final, not pending |
| C3 Attention, 2 requests dropped | Recovered; one body equal to one `markdown()` of the final |
| C4 Chat cancel mid-stream | Run `cancelled`, one Host partial (`stopReason: cancelled`). Row `message assistant partial`, `Interrupted`, no footer; rendered text equals the Host partial |
| C4 Attention cancel | `Interrupted`, no footer, run row `Cancelled` |
| C6 convergence | 3 settled 12,000-character replies (fences, lists, links, inline code, CJK) equal one `markdown()` of each final (DOM compared, focus keys ignored) |
| Reload after settlement | 8 Host finals ↔ 8 bodies, all equal to one `markdown()`; 1 partial `Interrupted`; 0 pending |
| C7 scrolled away | `scrollTop` held at 200 over 4 polls while text grew 2,689 → 5,092; Back to latest shown |
| C8 selection in a growing reply | Selection kept 4 s; text held at 2,708 with `Content updated`; on release painted once (6,924) and kept growing; hint hidden |

Headless, on `88e3e7e`:

| Case | Result |
| --- | --- |
| C8b selection held through the Run's final (structural rebuild) | Selection kept; text held at 187 with `Content updated`, not pending. On release, the final is painted (861 rendered characters of an 889-character source); hint hidden |

Built-in browser before-change baseline: [`built-in-browser/`](built-in-browser/) (`browser-before.json`, `host-before.json`). The after run in the built-in pane was lost with a page reload and was replaced by the headless harness above.

Unit and suite:
- `stream-thread-projection` 6/6, `stream-session-events` 3/3, `stream-activity-recipe` 3/3; `output-message-boundary` 15/15 after the annotated update.
- Full `npm --prefix app test`: **1709/1709**.
- `runtime-smoke` exit 0, with the real provider not run.
- Lints: `lint-colors`, `lint-interaction`, `lint-materials`, `lint-shapes` and `lint-spacing` report ok or no findings; `check-product-copy` and `check-doc-links` report no problems.

## Not covered: pending Parent browser verification

Not run by the author:
- 1280 and 390 px;
- dark scheme;
- native 200% zoom and text spacing;
- keyboard traversal through a streaming thread;
- forced colors;
- screen reader announcement of `Content updated` (it is `role="status"`);
- simultaneous Chat and Attention streams;
- Node 22/24;
- a live or paid provider.

Computer-use visual inspection stays with the OpenAI route. Suggested steps:
1. Start `node app/scripts/stream-frontend-fixture.mjs --port 8861` and open its URL.
2. In Chat, send `stream sustained`. While it streams:
   - select a sentence in the growing reply, check that `Content updated` appears and nothing jumps, then release;
   - scroll up and check that the position holds;
   - press Stop and check `Interrupted` beneath the text with no Copy footer.
3. Repeat in Attention.
4. Send `stream markdown` at 390 px and 200% zoom, in light and dark.
5. Open `activity-specimen.html` to choose between the shipped recipe and the candidate.

Other remaining limits:
- The first render that creates a reply row, and the terminal render, still rebuild the list; their cost scales with the thread.
- Poll cadence bounds visible text cadence.
- Two unsettled legacy segments without a final between them collapse to one row by the accepted legacy rule.
