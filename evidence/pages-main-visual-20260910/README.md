# Pages + parallel delivery integration · 2026-09-10

Astra integrated from actual main `8b1e0b143f7091da0acba3ee24af58595e721eb8` in an isolated worktree. The shared main's existing WK-98 evidence modification and `site/verification/main-20260910/` were preserved. This delivery follows the user's merge/push authorization; no Pages deployment was performed.

## Source and authorship

The six-page structure from `21e8a9b` and subsequent Pages polish were already reachable from main, so were retained without replaying duplicate branches. Attention closure `0bff8b5`, MA2 frontend `8bef964`, backend tests `d0feb07`, round-two docs `4c32d21`, provider frontend `84c39a7` (including backend `e61c9d5`), and Fable decisions `7f0509c` were merged. Multi-expert research `370b891b33338988a29f50a7c475f9d7e7225577` was subsequently merged as documentation and consumed for the new philosophy section.

Astra owns conflict resolution, integration, schema migration, screenshot capture and Pages edits. Luna performed bounded read-only branch exploration, source review and an independent fixed-product migration check; this is not full independent product acceptance. The research review confirmed ME-00 documentation only, ME-01–10 planned, and the order deterministic governance → Spark derivation/recovery → selective Attention. No automatic Spark, general recovery, wake scheduler, second runtime or production multi-agent capability is claimed.

## Product and schema seam

Product capture SHA is `e818463ab31aa06a4c9d52a968a68099fdb02c3e`. Both main lineage and the provider branch had used schema 9. The combined runtime uses schema 10: main schema 9 retains `Run.supersedes`; validated older stores initialize connections without losing history; exact original bytes are backed up and old hosts reject the new store. Core4/app5 remain unchanged. [Luna's independent receipt](luna-schema10.json) covers a synthetic three-run lineage, main9→10, byte-exact backup, reopen and old-main rejection without modifying new data.

Attention conflict resolution preserves both recent conversations and the Thread panel with its lifecycle. The settings guard now restricts numeric input to PV-FE01's optional integer context-window field; the old Appearance rule no longer incorrectly bans that separate provider field. Range/meter restrictions remain. Application executable files at final capture match the fixed product; subsequent changes are Pages, tests and documentation.

## Pages

Homepage retains the narrative and concept paper visual, followed by a visible current Home capture and all six product entrances. Tour, Get, CLI, Changelog, Models and Data remain six pages. The new homepage philosophy specifically consumes the latest research: deterministic sources, rebuildable Spark findings/context, selective Attention, roles separated from execution, and lifecycle quality/cost. Existing capabilities are supporting evidence; research is explicitly a direction awaiting implementation and evaluation.

[Media manifest](../../site/media/main/manifest.json) contains 15 original JPEG screenshots across ten media IDs, including dark/mobile variants. Nine Tour states have images; running is reserved and Matter uses the fixed replay. Every screenshot binds its product SHA, dimensions, hash, setup and limitations. The build checks signatures, dimensions, bytes and hashes. Media capture used real UI in the connected in-app browser and isolated synthetic local deterministic data. No image was reconstructed or relabelled from an older build.

The existing specimen and benchmark remain fixed to `9e5384f`; they are not evidence for the newer product. CLI remains an offline recorded-data interaction; the download modal states that no signed package is distributed. Research links are pinned separately to `370b891`.

## Verification

- [Full application tests](full-tests.log): 522/522 pass. [Settings subset](settings-tests.log) and [runtime smoke](smoke.json) pass; real provider not run.
- [Prior full run](prior-full-tests.log): 521/522, obsolete global numeric-input prohibition; then corrected and full suite rerun. [Initial interrupted run](initial-interrupted-tests.log) retained: stale coordination schema expectation caused failure and prevented cleanup. [Coordination crash recheck](coordination-crash-tests.log) passed after correcting the expected schema. [Lineage checks](schema10-tests.log) retained.
- [Browser checks](browser-checks.json): all six pages at 1440 px and homepage plus all six pages at actual 390×844, no horizontal overflow; download modal/Escape/focus restore; typed CLI review cannot decide; nine Tour images decoded after viewing. Desktop/mobile screenshots accompany this receipt. An initial viewport attempt affected a different tab; invalid mobile-labelled captures were replaced after verifying actual `innerWidth=390`.
- `node site/build.mjs`, `check-links.mjs`, `check-material.mjs`, public-data tests, three product lints, document links, research intake verification and `git diff --check` are checked for this delivery. Build reproducibility is recorded in `build-checks.json`.
- Legacy CDP suites were updated for the new captured Home and 11/9 Tour counts, but were not rerun here. The connected-browser checks above are this turn's UI evidence; earlier 18/36 result counts are not reused.

Logs use portable checkout labels; original SHA-256 and projection details are in [log-projections.json](log-projections.json). No personal store migration, paid provider, external agent message or deployment. Native/real-provider/product-readiness gates remain open.
