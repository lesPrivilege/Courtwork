# Pages media recapture · publication-final-20260911

Stage 5 of the [final Claude Design ONE-SHOT](../../engineering/release/ui-publication-closure-2026-09-11/ONE-SHOT.md): after every product change of this candidate (domain glyphs, Chat page, control accent, example workspace), the 13 Pages product screenshots were retaken on the same synthetic story as the previous batch.

| Item | Value |
|---|---|
| Product commit (all 26 entries) | `1397b995afe138fd07cd8022391f36d16bc29c85` — the last commit that touches `app/`; `site/src/capture-plan.mjs` is pinned to it |
| Batch | `site/media/publication-final-20260911/` · 26 native JPEG · 1440×900 · DPR 1 · 13 same-state light/dark pairs · `observations.json` |
| Registry | `site/media/main/manifest.json` (batch `publication-final-20260911`); previous registry archived as `site/media/archive/main-f1373cd.json`; previous JPEGs untouched in `site/media/merged-20260911/` |
| Story | `evidence/semantic-polish-merge-20260911/capture-fixture.mjs --active none --seed-only --retain` + the two recorded corrections (`capture-fixture-spark-correction.mjs`, `capture-fixture-conversation-correction.mjs`) on the same data directory; `--active approval` and `capture-fixture-running-correction.mjs` for the two live states, each on its own disposable server |
| Photographer | `recapture-media.mjs` — headless Chrome over CDP, real UI navigation, native viewport JPEG, no DOM or image edits; author-operated |
| Finalizer | `finalize-media.mjs` — JPEG dimension check, sha256, pair/state check, archive, manifest, plan pin |
| Non-author review | **pending** — visual acceptance and the `independent_reviewer` field are Astra's; `site/scripts/check-capture-ready.mjs` additionally requires the pinned commit to be an ancestor of `main`, which is only true after merge |

State per slot (light and dark share the state): Home; Spark overview (stale candidate v2 vs source revision 3); Attention items with the Investigating item selected; approval (actual `waiting_user` on `ws_write out/exhibit-index.md`); artifact (recorded file tab in the expanded workspace); Matter overview; Review with purpose-limitation expanded; continuity session; Models; Tools & Integrations; Appearance; global Attention conversation with the three-tool group expanded; running (active stream after `ws_list` / `ws_read`).

Differences from the previous batch that are the product, not the fixture: the sidebar now carries Chat and the Spark / Attention / Chat glyphs (atmosphere direction A); Settings tabs carry glyphs; the Appearance page opens with the diff preview; on/selected controls use the ordinary control accent. Run counts on Home are one higher than in the previous batch because the same corrections were applied to a fixture that already held the earlier runs.

```sh
node evidence/publication-final-20260911/recapture-media.mjs --origin http://127.0.0.1:8848 --fixture <fixture.json> --batch publication-final-20260911
node evidence/publication-final-20260911/finalize-media.mjs --batch publication-final-20260911 --source-sha <product commit>
node site/build.mjs --write-readme && node site/scripts/check-figures.mjs && node site/scripts/verify-product-pages.mjs --origin <preview>/Courtwork/
```
