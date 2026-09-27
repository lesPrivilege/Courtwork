# Runtime Settings I1 RFS delta Luna review

Date: 2026-09-27

Reviewed final head: d37320c1906951b17e3256b6ee92d4cc4f174dff

Product fix: 6acad62da80ab7f1984fb799dbca5072869db9ce

Prior reviewed source: 36f8357e46bbb3581b5a83dd251a67205c0472a6

## Delta disposition

The prior RFS-R1 blocker is fixed. The prior malformed supported-version inventory crash came from inventoryOf accepting only schemaVersion/items and passing malformed rows into the view. readInventory in app/web/runtime-inventory.mjs:28-61 now validates every field the view consumes, requires a non-empty defaultAdapterId, rejects duplicate ids, and returns a distinct UNREADABLE failure for malformed supported-version contents. Missing/old versions remain NOT_REPORTED.

The prior recovery requirements are now covered by runtime-inventory-settings.test.mjs:297-356. Seventeen malformed shapes are rejected without a throw, last-good detail/rows/focus remain visible, and the next Refresh reaches the reader again. A malformed first read, including a missing default id, fails as non-empty error rather than empty inventory and then recovers. Unknown but well-shaped adapter ids, operation names, and reason codes remain data at :358-363.

The prior RFS-R2 typography delta is scoped to .data-list.runtime-inventory-reading and .runtime-inventory-reading-text in app/web/styles.css:2005-2014. The view marks status/operation values as reading role while labels and Technical detail stay metadata at runtime-inventory-view.mjs:146-150,178-198. No global data-list rule changes.

## Reused prior findings

- Stale replies and late navigation remain guarded by the controller epoch and no-navigation reply path; the unchanged tests continue to pass.
- Request duplication remains the previously recorded bounded choice: settingsView.refresh and runtimeInventory.refresh each issue runtime-info reads with independent state. This delta does not change that behavior.
- Unknown runtime ids and operation names/reason codes remain accepted only when their surrounding shape is valid.
- No browser, provider, full-suite, or paid-provider claim is made by this review. Visual/a11y acceptance remains on the parent OpenAI CUA lane.

## Verification

Command:

node --test --test-concurrency=1 app/tests/runtime-inventory-settings.test.mjs app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs app/tests/settings-plugins.test.mjs app/tests/runtime-inventory.test.mjs app/tests/product-icons.test.mjs

Result: 80 passed, 0 failed, 0 cancelled, 0 skipped; exit code 0; duration 2.230s. Raw stdout is in luna-tests.stdout.txt.

The run includes the new malformed first-read/last-good/retry cases, all malformed row variants, valid unknown-value preservation, stale/late/focus behavior, Settings navigation/preferences/plugins, product icon checks, and backend inventory tests.

## Recommendation

Accept the RFS source delta for parent integration. The previous blocker is closed by source-level validation and recovery tests. No remaining code-level blocker was found in this bounded review. The scoped CSS change is internally consistent, but visual/typography acceptance remains explicitly parent-owned.

No product edits, commits, browser scripts, headless Chrome, providers, or main-checkout changes were made by this review. The original writer tree remains intact.

Review hygiene note: git diff --check over the RFS return delta reports trailing whitespace in the committed before/controller-36f8357.log capture at several blank-line entries. This is an evidence-log formatting issue outside product source; it does not affect the 80-test result or the RFS code disposition.
