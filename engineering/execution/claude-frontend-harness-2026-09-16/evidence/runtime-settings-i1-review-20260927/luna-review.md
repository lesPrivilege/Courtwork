# Runtime Settings I1 Luna independent review

Date: 2026-09-27

Reviewed product commit: a6e07f81a8f376cf1ad718cc23c7f7f06e8d7e0e

Reviewed author/evidence head: 36f8357e46bbb3581b5a83dd251a67205c0472a6

Base: 12799ff0bd67bc1758f2c723d1c1438563f1001b

## Scope

Read-only review of the production Settings → Agents → Runtimes consumer against the original 06c contract and the author evidence. No source, product checkout, provider, browser, or original writer tree was changed. No browser/headlessChrome command was run.

The product diff is bounded to the inventory controller/view, Settings/App wiring, static allowlist, the Agents group and glyph, semantic consumer registration, docs, and focused tests. The controller uses an epoch so only the newest runtime-info read lands; replies never navigate. The view preserves the prior reading during refresh/failure, restores Back/row/Refresh focus, keeps the technical disclosure open, and renders unknown runtime ids and operation keys verbatim. These behaviors are asserted in runtime-inventory-settings.test.mjs:106-270.

## Request duplication

Settings open calls settingsView.refresh and runtimeInventory.refresh from app.mjs:6950-6977. settingsView.refresh itself requests runtime-info at settings-view.mjs:1584-1604, while the inventory controller requests the same endpoint at app.mjs:7774-7779. Thus an ordinary Settings open issues two independent runtime-info reads. The author documents this choice in the evidence README (limits 2): independent block failure states are preserved. Each path has its own generation/epoch guard, so a slower response cannot overwrite a newer response in its own block, and no response navigates. I found no correctness failure in this duplication; it is a bounded efficiency/consistency tradeoff already disclosed by the author.

## Blocking finding: malformed schemaVersion 1 item crashes the view

inventoryOf in app/web/runtime-inventory.mjs:25-29 validates only that executionRuntimes exists, schemaVersion is 1, and items is an array. It accepts malformed item members. The view then assumes item.adapterId and item.availability.status in runtime-inventory-view.mjs:104-120.

Independent inline probe against the production controller/view:

    view throw null Cannot read properties of null (reading 'adapterId')
    view throw {} Cannot read properties of undefined (reading 'status')
    view throw {"adapterId":"x"} Cannot read properties of undefined (reading 'status')
    view throw {"adapterId":"x","availability":null} Cannot read properties of null (reading 'status')

The controller marks the response ready and emits it; the listener's render exception escapes the refresh promise. In app.mjs the refresh is launched with void, so a malformed authenticated Host response can leave the Settings inventory stale or produce an unhandled rejection instead of the bounded failed-read state required for unknown/malformed inventory.

Recommendation: request a narrow fail-closed correction before acceptance. Make inventoryOf return null for a schemaVersion 1 payload whose defaultAdapterId or item shape is invalid, or catch the render boundary and convert it to the existing NOT_REPORTED error. The minimum shape gate should require a string adapterId, boolean configured, object availability with status configured/unavailable, and liveStatus not_checked; capabilities may be null or an object. Keep unknown adapter ids and unknown operation keys accepted and displayed verbatim. Add one malformed-item negative test asserting failed read, no throw, and no empty-list claim.

This does not affect valid Host DTOs, the existing stale-reply guard, or the author’s unknown-id/operation behavior.

## Verification

Command:

node --test --test-concurrency=1 app/tests/runtime-inventory-settings.test.mjs app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs app/tests/settings-plugins.test.mjs app/tests/runtime-inventory.test.mjs app/tests/product-icons.test.mjs

Result: 61 passed, 0 failed, 0 cancelled, 0 skipped; exit code 0; duration 2.537s. Raw stdout is in luna-tests.stdout.txt. The malformed probe stdout is in luna-malformed-probe.stdout.txt.

## Acceptance recommendation

Request changes for the malformed schemaVersion 1 item guard, then rerun the same 61-test set plus the new negative case. Subject to that narrow fix, the valid-payload frontend behavior and request-duplication semantics are acceptable for the bounded read-only I1 consumer. Typography and visual acceptance remain outside this review.
