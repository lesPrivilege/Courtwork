# CourtWork publication screenshots · 2026-09-14

This packet replaces the active screenshot batch for the public product tour. The product source is `fd96f96bc40725e301a4c92e0f2f50fd3245458c`; the same full commit is pinned by `site/src/capture-plan.mjs`, `site/media/main/manifest.json` and `site/src/source-preview.json`. The batch has 13 slots × light/dark = 26 native 1440×900 JPEGs. The active manifest records each file's SHA-256, byte count, source, state ID, UTC capture time and displayed local URL.

The immutable per-image time/URL source is [`capture-log.json`](../../site/media/publication-release-20260914/capture-log.json), SHA-256 `aac791efc5eb430df50acf22bdae6b4459a925f095725c21a939b05fe8062b1d`. Its entries are retained as captured. All timestamps are 2026-09-13 UTC (2026-09-14 in Asia/Singapore). The native JPEG dimensions were checked from their bytes; `device_pixel_ratio` was not present in the capture log and is left `null` in the manifest.

## Synthetic fixture and states

The source fixture's SHA-256 is `2bd166adf43278fdac38414b89561833d1f510a6a415bd194aff6c9e4efe037d`. [`fixture.json`](fixture.json) preserves its scenario and identity fields; only the machine-local `dataDir` is projected to `synthetic/workspace`. The evidence copy's SHA-256 is `3ace73c4f2966c1929d6d02560f3e27d04a0075251796558ba05c0aa9e76ef51`. No credential store or runtime-state file is included. The fixture records Project Cedar, the local deterministic `fake-openai-loopback` provider and synthetic state; no external model call was made.

| Slot | Captured state |
|---|---|
| Home | Project Cedar workspace overview. |
| Spark | Completed assignment in the Findings dialog, with its source references. |
| Running | The same active Run in both themes; stream text and elapsed time advance naturally. The Run was stopped after both captures. |
| Attention | Synthetic delivery-timing item in Attention. |
| Approval | Same unanswered `waiting_user` permission in both themes. Returning from Settings hides the right Work panel in the light capture; the dark capture retains it. No permission decision was made. |
| Artifact | Completed Run with `out/delivery-note.md` open. |
| Matter | Cedar follow-up chat summary with Work information expanded. The Candidate remains pending without a Decision. |
| Review | Original ReviewSession with its purpose rule expanded. The Candidate remains pending; no Decision was recorded. |
| Continuity | Follow-up work surface for the same Matter across Sessions. |
| Models | Settings → Models; only the local fake provider is configured. |
| Integrations | Settings → Tools / integrations; local extension state only. |
| Settings | Appearance defaults, unchanged across the light/dark pair. |
| Conversation | Completed conversation in the global Attention conversation surface. |

Approval and Running share one underlying pending permission / active Run per light/dark pair. Their right-panel visibility differs because returning from Settings automatically hides the panel in the light view; it does not represent a different work state. The Running stream progresses naturally between captures.

## Site-page visual check

The separate page review is limited to these four native browser captures:

| Page | Route | Viewport | Evidence |
|---|---|---:|---|
| Home | `index.html` | 390×844 | [`home-390.jpg`](site-visual/home-390.jpg) |
| Tour | `tour.html` | 1440×900 | [`tour-1440.jpg`](site-visual/tour-1440.jpg) |
| Tour | `tour.html` | 390×844 | [`tour-390.jpg`](site-visual/tour-390.jpg) |
| Release | `get.html` | 390×844 | [`release-390.jpg`](site-visual/release-390.jpg) |

Astra visually checked these four views and observed no horizontal overflow at the captured viewport sizes. This review covers only the listed routes and sizes; it does not establish coverage of other routes or breakpoints, or a site-wide accessibility result.

## Local checks

- Two consecutive site builds produced the same 188-file output tree, SHA-256 `5a4a7a30774047cbc2d642abaaf3f86d3f0e31cee11e4cb9372fe760f54ca6b7`. The four Site visual evidence files are not part of the deployed output.
- `node site/build.mjs --write-readme`: passed. The generated README was already in sync; the build checked every active image's source, byte count, native dimensions and SHA-256, and built the product pages from the pinned source preview.
- `node site/scripts/check-material.mjs`: passed, no material problems.
- `node site/scripts/check-figures.mjs`: passed, no figure problems.
- `node --test site/scripts/public-data.test.mjs site/scripts/capture-plan.test.mjs`: 5/5 passed.
- `node site/scripts/check-links.mjs`: passed; 188 built files and 296 local references, no problems.
- `node tools/check-doc-links.mjs`: passed; 1,310 documents, 7,292 links, no problems.
- The actual manifest also passed `validateCaptureBatch(..., { publish: true })`: all 13 slots have one light/dark pair with matching state IDs and source SHA.
- `node site/scripts/check-capture-ready.mjs`: passed after fast-forward. `main` and the candidate worktree were both at `ed015c1f291728278f7fb5bf087a4f629a26db10`; the main worktree was clean. The guard reported `Screenshot batch ready.`

## Review scope and limits

Per the task handoff, Astra inspected all 26 images in the actual browser. This metadata update is not an independent visual review and does not claim independent visual acceptance. The capture batch demonstrates synthetic interface states only; it does not establish model quality, formal product acceptance, a human Decision, or closure of the G1–G5 work-loop release gates. Existing media files were retained unchanged.
