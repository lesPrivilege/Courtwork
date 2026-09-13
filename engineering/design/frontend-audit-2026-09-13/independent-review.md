# Independent bounded review · 2026-09-13

Reviewed the non-author product changes fixed in main commit `9525215f556758f09cd60916edf4ad03db181802` (15 explicit paths). The product files inspected in the shared working tree matched this commit. This is an independent bounded review, not product-wide acceptance.

## Scope and findings

- `flowRow` disclosure affordance and IC-9: confirmed the chevron is a decorative, hidden-from-accessibility-tree SVG only on `summary` rows; the native disclosure retains its summary text/name and native open behavior. The generated geometry path replaces the external SVG `<use>` at render time and keeps the pinned glyph source/family. Reviewed the new IC-9 wording against `ui-controls.mjs`, the generator and the product icon tests.
- Spark and Usage observation dialogs: reviewed the shared fixed-header / scrolling-body CSS, scroll position capture/restore across rerenders, and each view's existing focus restoration. The close action stays in the nonshrinking header; the scroll body allows shrinking inside the dialog's max-height. No source-level regression found.
- Chat page: confirmed `justify-content:flex-start` corrects the row alignment, and explanatory facets/retention information are placed in a closed native `About chats` disclosure. No source-level regression found.
- Attention and Settings copy: checked the removed decorative/duplicated copy against the retained object identity, action and Memory availability statements. The revised Memory wording stays scoped to that settings surface and does not claim that all chat history is nonpersistent.
- Final Usage legend increment: checked the exact copy, “Higher-contrast cells mean more reported tokens in this period. Dotted outline: incomplete usage.” against the existing `quantileLevels` heatmap classes (zero at level 0, positive values assigned increasing quantile levels), the theme role sequence from `panel-muted` through `ink`, per-day accessible labels/exact values, and `projection.heatmap` precedent. The legend describes the existing relative visual intensity encoding; the separate dotted-outline clause continues to identify incomplete usage. This was a copy-only increment after the targeted test run; no additional tests were run for it.

Nearest precedents consulted: `projection.heatmap` and `projection.distribution` in `precedent-map.md`, the Files retained-reader/return behavior, the icon control contract including IC-9, and the frontend continuity contract. The heatmap still uses the existing Usage projection and color roles; no new data meaning or action was inferred.

## Verification and limits

The following targeted suite passed before the final legend-only edit: `node --test app/tests/product-icons.test.mjs app/tests/chat-page.test.mjs app/tests/chat-work-shell.test.mjs app/tests/spark-view.test.mjs app/tests/spark-routing.test.mjs app/tests/usage-details.test.mjs` (57/57). Also passed: `node tools/lint-interaction.mjs`, `node tools/lint-colors.mjs`, `node tools/lint-materials.mjs`, and `git diff --check` on the reviewed implementation paths.

This review did not operate the browser or independently verify rendered viewport geometry, focus movement, or scroll preservation. The tests and source inspection do not establish those browser behaviors. The parent reports a separate browser pass; its newly found Files diff comparison button that remains at “Comparing…” is follow-up work outside this review. No full suite was rerun.
