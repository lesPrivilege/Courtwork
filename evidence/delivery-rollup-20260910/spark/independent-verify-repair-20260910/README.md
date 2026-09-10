# Spark repair independent verification

- Candidate: `936239dca9d7eac0cab859960f8b19950c760193` (`fix: open the bound Work surface after Spark navigation`)
- Source: fixed commit above; use an isolated checkout for reproduction.
- Reviewer run: isolated synthetic data, real candidate HTTP host at `127.0.0.1:8973`, headless Chromium CDP; host and browser stopped after capture.
- Seed: `/private/tmp/cw-spark-seed-verify-20260910.json`; project `07d00bbc-5224-44b0-aa96-069cdcb45ca7`; bound session `2d8148a3-391b-489b-b138-2eb523b4af36`; plain session `8dc8a03b-991a-475a-a9d5-75a2c014d2a9`; Matter `matter-7817ba08-7b25-4d7c-854c-96340b08e406`.

## Results

- `node --test app/tests/spark-routing.test.mjs app/tests/spark-projection.test.mjs app/tests/spark-view.test.mjs`: **44/44 pass**; see `focused-tests-44.log`.
- Integrated Spark browser checks: **22/22 pass** in `browser-results.json`. This includes the original 21 checks, with the focus harness corrected to activate Overview before the row Tab sweep, plus the requested narrow route check.
- Real host static `/web/spark-view.mjs` and `/web/spark-projection.mjs`: HTTP 200.
- Real host `/api/v5/work-derivations`: 404 remains correctly rendered as “No source yet.” with no maintenance numbers.
- Bound Matter row navigation: Spark closes, `Bound Work session` is selected, Work preview is visible (`surfaceOpen=true`). At 390×844 dark, `surface-preview-tab` is `:focus-visible`, has a non-zero focus box, the panel is inside the viewport, and document `scrollWidth === 390`; see `bound-route-dark-390.png`.

The prior long-title/long-candidate-ID and 200% equivalent evidence remains valid because this repair only changes host Matter routing after Spark row activation; it is retained at `../independent-verify-20260910/long-content-browser-results.json` with its three screenshots. The old 20d browser failure JSON remains unchanged at `../independent-verify-20260910/browser-results.json`.

## Reproduction

```sh
# Run from an isolated checkout of the reviewed candidate; retain this evidence driver separately.
node --test app/tests/spark-routing.test.mjs app/tests/spark-projection.test.mjs app/tests/spark-view.test.mjs
APP_URL=http://127.0.0.1:8973 WK6_CDP_PORT=20317 node evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910/browser-checks.mjs
```

The final browser driver is copied as `browser-checks.mjs`.

The copied author README is retained byte-for-byte as `repair-author-readme.md.txt`; its historical relative links resolve at [the canonical author evidence directory](../../../spark-delivery-20260910/README.md), not this copied location.
