# M1 author checks

Source candidate: base `aa765ede3d008c80cc9e4e6dcd50704cfa95db61`; candidate commit `b8cd54f4d2e3d142ed367d49e08297170394495d`; product/test diff SHA-256 `d4ab4a38e4b236fff963a0e2229379e384ad80e9d3e024ed4b31038983dcb26e`.

| Check | Result |
|---|---|
| `cd app && node --test tests/runtime-management.test.mjs` | pass · 35/35 · includes detail-only inheritance boundary, list removal, existing state/focus/caret/unknown/read-back cases |
| `node tools/lint-spacing.mjs` | pass · 4 files · existing spacing/type token governance |
| `node tools/lint-interaction.mjs app/web/runtime-management-view.mjs` | pass · 1 file · 0 registered exceptions |
| `git diff --check -- app/web/runtime-management-view.mjs app/tests/runtime-management.test.mjs engineering/design/grammar-convergence-20260921/migrations/m1-runtime-rhythm/sol` | pass |
| query-wrapper root probes | pass · baseline/candidate return the requested `data-text-size=large`/`data-theme=dark` and `normal`/`light` attributes |

The first test run had 34/35 because tiny-dom reports `tagName` as lowercase. The assertion was corrected to normalize `tagName`; no product byte changed in response. The complete rerun above is the authoritative result.

No full suite was run: the lease asks for scoped Runtime view/controller checks and this change introduces no shared CSS, controller, adapter, schema, dependency, or server behavior.

Unexecuted by the author: browser/keyboard inspection, native zoom, actual 200% text resize/reflow, text-spacing overrides, forced colors, reader mode, and coarse/hybrid input. Fresh Astra owns rendered and keyboard evidence; missing cells make no conformance claim.

Parent rendered evidence covered four baseline/candidate pairs and the state/keyboard journeys recorded in `change-record.md`. A separate 320 CSS px normal-text probe established bounded field and action reachability only. Native zoom, actual 200% text resize, text-spacing overrides, forced colors and coarse/hybrid input remain unexecuted; no WCAG conformance claim is made.
