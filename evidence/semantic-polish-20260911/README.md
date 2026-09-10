# WO-VS-01 local candidate delivery

2026-09-11 · product **f99af4695aa5796e703286b0875ec5663cc22c85** · branch `codex/semantic-polish-prep-20260911` · baseline `590739fa3d1bc401905261172260143e36e82c5e`. Astra owns the architecture, integration, frontend changes and final author visual judgement. Luna's independent source/behavior findings and closures are linked below. This is completed local polish work with bounded verification; no main integration, push, deployment or whole-product/native acceptance is claimed.

## Delivered behavior

- A 47-entry presentation semantic registry sits above the existing Lucide renderer. It separates objects, actions, states and brand identities; no-icon is explicit and requires visible navigation labels. Six-family raw-consumer accounting, scoped copy checks and App/Pages mapping gates reject undeclared drift. Domain permissions/state stay in Runtime/Core.
- Inspector shows host request durations and concise usage first, with exact requests, version identity, tool activity, recorded context and event trace available in disclosures. Usage uses oriented calendar navigation and model comparison while retaining UTC, incomplete/unknown values, fixed snapshots and non-additive cache counts.
- Chat/Attention/file actions reuse the archived renderer and existing capabilities. Production admits Copy/Edit/Copy path/Copy hash only; missing speech/feedback/regenerate/fork/share/pin and file host operations stay unavailable. The separate interactive fake demonstrates those states without claiming backend completion.
- Home titles reflect retained work, Attention items differs from the assistant, and Attention/Spark reserved identities use text. Settings reduces repeated host/setup metadata while preserving scope/policy/binding facts. Work/Matter/Question/Approval wording is aligned.
- Pages retains the archive-paper hero, places product proof next, uses five primary links and groups Tour into five stories. All **13 capture slots remain pending/blank**, as requested; old specimens and figure provenance are preserved.

Detailed ownership, adopted/adapted precedents, every surface/Settings/overlay/route disposition and limitations are in [coverage](../../engineering/execution/2026-09-11-semantic-polish/coverage.md). Original findings are in [audit](audit.md), and input provenance remains in the [research package](../../engineering/research/semantic-governance-2026-09-11/README.md).

## Final verification

All final commands ran against product f99af46 before this documentation-only receipt. Node 25.9; independent synthetic fixtures; no paid/real provider or personal session/credential store. RuntimeStore12/Core4/app5 authority is unchanged.

| Check | Result / raw evidence |
|---|---|
| `npm --prefix app test -- --test-concurrency=2` | **767 passed, 0 failed**, [final log](vs06-full-tests-fixed.txt) |
| `npm --prefix app run smoke` | Passed: local fake via public Runtime, file read/write/artifact, close/reopen/continuation and historical bytes; [log](vs06-smoke.txt) |
| `node tools/lint-colors.mjs` | [Passed](vs06-lint-colors.txt) |
| `node tools/lint-interaction.mjs` | [Passed](vs06-lint-interaction.txt) |
| `node tools/lint-materials.mjs` | [Passed](vs06-lint-materials.txt) |
| `node tools/check-semantic-consumers.mjs` | Six families, 38 accounted raw lines; [passed](vs06-semantic-consumers.txt) |
| `node tools/check-product-copy.mjs` | Three diagnostic exceptions; [passed](vs06-product-copy.txt) |
| `node tools/check-pages-semantics.mjs` | 13 capture slots, 10 figures; [passed](vs06-pages-semantics.txt) |
| `node tools/contrast-report.mjs` | [Static report](vs06-contrast.txt), not visual/native acceptance |
| `node site/build.mjs` | Nine product routes + semantic/build guards; [passed](vs06-pages-build.txt) |
| `node site/scripts/check-links.mjs` | [Passed](vs06-pages-links.txt) |
| `node site/scripts/check-figures.mjs` | [Passed](vs06-pages-figures.txt) |
| `node site/scripts/check-material.mjs` | [Passed](vs06-pages-material.txt) |
| `node tools/check-doc-links.mjs` | [Final documentation check](vs06-doc-links.txt) |

The first full suite had 765/766 passing because WK92 expected the retired “Continue in Work” text; the route assertions stayed intact and were aligned to Matter in 1eca099. [Original log](vs06-full-tests.txt) and [targeted correction](vs06-chat-wording-regression.txt) are retained. This is not reported as a first-pass green run. Staged diff whitespace checking passes for active documents/scripts; raw `contrast.txt`, `vs06-contrast.txt`, `vs06-full-tests.txt` and `vs06-home-nonempty-regression.txt` retain generator/test whitespace unchanged and are the four declared exclusions.

## Non-author findings and closure

| Slice | Independent evidence | Fix / final disposition |
|---|---|---|
| Registry | [Registry review](registry-independent-review.md) | Surface projection/owner-anchor validation fixed in 272a2f1; bounded closure recorded |
| Inspector / Usage | [Review and closures](inspector-usage-independent-review.md) | Malformed observation/model membership/measurement values corrected in 22a2073; stopping status restored in e2d2a57 |
| Chat / Settings | [Review and closure](chat-settings-independent-review.md) | Same-key different-record stale result and undeclared structured production handler admission fixed in d6c75ef |
| Final combination | [89e437d review and f99af46 closure](final-combination-independent-review.md) | Non-empty pending/failed Home rows called icon(null); fixed and directly render-tested (9/9) in f99af46 |

These are independent source/render/behavior reviews. They are not independent browser, visual, accessibility or overall product acceptance. The final Home regression also corrected TinyDOM's missing childElementCount, which had allowed earlier tests to skip non-empty lists.

## Author visual and interaction evidence

The actual Codex in-app browser was used throughout; synthetic HTTP/Pi loopback/Core data and a separately labeled Chat demo were kept distinct. [Capture manifest](capture-manifest.json) hashes all PNGs, records dimensions, phase and attribution. Intermediate captures remain evidence, not overwritten baselines. Original phase records are retained in [Inspector/Usage](../../engineering/execution/2026-09-11-semantic-polish/inspector-usage.md), [Chat](../../engineering/execution/2026-09-11-semantic-polish/chat-actions.md), [Home/Settings](../../engineering/execution/2026-09-11-semantic-polish/home-settings.md) and [Pages](../../engineering/execution/2026-09-11-semantic-polish/pages.md).

- Inspector: actual request disclosure/refresh retention and exact file detail; 1440 light, 1280 dark, 390 light. Narrow tab header was 23px containing a 44px tab; fixed to a 47px available tab/list. Final f99 follow-up at 390 was reviewed with two measured requests and no horizontal overflow visible.
- Usage: ArrowRight advances a week, End reaches the last day, Enter drills into the same observation, Escape returns focus. The original seed changed accounting after host restart; only baseline `12-usage-same-observation-1440.png` versus candidate Usage v2 is a matched numeric comparison. Original 01 is rejected fixture data and excluded.
- Chat: production actions, long content, fake streaming and error states at 390, dark/light states and menu keyboard/focus behavior. f99's real pending-question large-text check found `.message-stream` lacked a containing block: chat-panel scrollTop 24 and header y=-24 clipped the navigation button. Positioning the stream fixed scrollTop to 0, header 0..48 and full 44px navigation visibility. Both [failure](baseline/app-vs06-question-light-large-390.png) and [fixed](baseline/app-vs06-question-light-large-fixed-390.png) captures remain.
- Home/Attention/Spark: real final dark Home/pending state; Attention assistant and queue distinction; Spark Overview → ArrowRight Activity → Escape; low-frequency Conversations disclosure. General/Tools final 390 large-text captures plus [Settings sweep](baseline/app-vs06-settings-sweep.json). Theme/text/motion reset to System/Medium/Follow system for handoff.
- Pages: baseline and candidate 1440 hero viewed together, archive geometry retained; new primary navigation and product proof visibly ordered. Tour's first 390 check exposed 480px overflow; final header wraps to two rows, document width 390 and all five primary links 44px tall. Before/fixed captures retained. Pricing selection/ArrowRight tracks focus and illustration; Download's source dialog closes with Escape and returns focus. Experts 1280 reviewed.

No screenshot implies all states of that surface were tested. Large text here is the app's 1.143 scale, **not** actual browser 200% reflow. Native apps were locked; VoiceOver, IME, forced-colors and real browser zoom were not exercised. A full Pages dark matrix, every multi-model/long-path end-to-end permutation, and an end-user five-second test were not run. Existing focused automated cases cover some of these data boundaries, not native usability. These remain explicit release/qualification limits; no known blocker remains in the changed paths after the fixes. G1–G5, BE-42, Spark reconstruction/recovery and Chat IC2-G01–06 retain their separate owners/status.

## Reproduce and inspect locally

From a checkout containing this commit and the existing app dependencies:

```sh
node evidence/semantic-polish-20260911/fixture.mjs
node evidence/semantic-polish-20260911/chat-demo-server.mjs
node site/build.mjs
```

The fixture prints its isolated loopback URL and writes a transient preview manifest under the operating system temporary directory; it starts local fake tools only. Use a separate process for each server. The demo prints its own URL and only serves static demo/web GETs; it has no API proxy. Serve generated `site/dist` using the existing site preview command documented in [site README](../../site/README.md). The original seed's waiting run may cancel on a host restart; for final pending-question checks another explicit local `ask_user` fixture command was sent in that synthetic chat and then answered. Therefore final aggregate totals are not claimed identical to the initial seed.

At handoff the local App preview is on port 61046, Chat demo on 63609/, and Pages on 63820/Courtwork/. These are temporary process addresses, not durable deployment URLs. The baseline read-only proxy is a comparison aid only; it serves exact 590739f assets against the current synthetic API and rejects non-GET requests. No personal mutable data, credential files, node_modules or built site output is part of this receipt. Raw failure logs preserve original stack-path bytes as historical provenance; active source/evidence links are repository-relative.
