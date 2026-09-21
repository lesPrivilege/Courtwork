# M1 Runtime Settings rhythm — Luna checker scope

Task: 01a0c497-69ec-7ea1-9706-1f6ffaccdd07
Lease/disposition: engineering/design/grammar-convergence-20260921/disposition-20260922.md
Checker source before author work: aa765ede3d008c80cc9e4e6dcd50704cfa95db61
Branch: codex/m1-runtime-rhythm-20260922
Recorded: 2026-09-22

## Responsibility

Luna is the independent checker. The selected M1 candidate is a Runtime-detail-local spacing mapping that reuses the existing settings-group-gap consumer with an initial var(--space-4) hypothesis. The parent disposition requires measurement before any value becomes accepted.

The author may change only app/web/runtime-management-view.mjs, with an optional necessary regression in app/tests/runtime-management.test.mjs. The checker may write only this migration evidence directory. The checker does not edit product code, styles.css, settings-view.mjs, app.mjs, Preview/profile modules, controllers/adapters, shared Design/current/AGENTS, Core, or credentials.

The source tree is currently clean at the checker baseline, so no final candidate diff or author hash is claimed yet. Final review waits for the parent’s source-ready signal.

## Contract and structural checks

After source-ready, inspect the exact author SHA and run only the affected checks:

1. Confirm the detail path has one plain runtime-detail wrapper carrying the local inherited mapping, with no new visible card, border, padding, landmark, stylesheet route or dependency.
2. Confirm the list path does not inherit the detail mapping. The runtime list and its rows must retain their existing Settings consumer geometry.
3. Confirm unrelated Settings mounts do not receive the mapping. The Settings navigation, Settings group token contract and non-runtime consumers remain unchanged.
4. Confirm the author diff is limited to app/web/runtime-management-view.mjs, an optional focused test, and this migration evidence directory. Record exact SHA and hashes after source-ready.
5. Confirm strings, state labels, action availability/reasons, owner facts, field/control geometry, block padding, focus keys and scroll ownership are unchanged except for the local inherited property.

## Non-author test matrix

Use the existing production-controller/production-view tiny-DOM suite in app/tests/runtime-management.test.mjs; do not promote author claims or run the full suite solely for spacing.

| Invariant | Existing test(s) to run and inspect |
|---|---|
| List/detail isolation and return focus | opening a runtime moves the keyboard to its way back, and Back returns to the same row (line 159); empty, loading, failed and refreshing lists are four different readings (line 112); a late list reply after opening a runtime does not navigate or land (line 471). |
| Unknown outcome keeps draft and locks actions | a committed command whose reply is lost stays unknown, blocks every mutation, and Check status settles it without resending (line 356); an unknown outcome the owner never received settles as not applied and keeps the draft (line 385); RM-R1 submitted-draft unknown cases (lines 616–657). |
| Stale/fresh read-back and unrelated runtime identity | a revision changed elsewhere is refused, the draft is kept, and Reload shows the owner's values beside it (line 439); RM-R2 stale read-back cases (lines 658–730), including a read for another runtime id. |
| Draft, focus and scroll continuity | a draft survives leaving for the list and coming back (line 461); refusal focus (line 246); Escape confirmation focus (line 292); disconnect/return focus (line 307); command/receipt focus assertions throughout the file. |
| Unrelated Settings token isolation | app/tests/settings-navigation.test.mjs, especially the existing settings-group-gap: 40px source assertion at line 62. This guards against a forbidden global token/style edit, rather than testing M1 implementation. |

The initial focused command set after source-ready is:

    node --test app/tests/runtime-management.test.mjs
    node --test app/tests/settings-navigation.test.mjs

If a focused rerun is needed after a failure, use Node’s exact test-name pattern for the named cases above. Do not run npm --prefix app test as a spacing check unless a new failure or parent instruction makes the broader suite necessary.

## Required rendered evidence owned by parent/Astra

The checker will not use screenshots to infer CSS. Parent/Astra must supply or record same-state computed evidence for baseline 40px versus the candidate mapping:

- desktop 1280 and 1440 CSS viewports, narrow 390;
- light/dark and normal/large text preference;
- fine pointer plus coarse/hybrid where tools support it;
- boundary-to-next-heading gap, first field/primary-action position, content measure and total scroll extent;
- long runtime/help text, unknown with retained draft, stale→fresh read-back, unsupported/disabled reasons, refusal/reload focus, keyboard scrolling, and last/empty blocks.

Native zoom, real 200% text/reflow/text-spacing, reader mode, forced colors and unsupported coarse/hybrid cells remain explicitly unexecuted unless actually performed.

## Stop condition

Stop after the bounded source-ready review, focused checks and evidence packet. Return exact source SHA, changed-path scope, test commands/results, candidate measurement paths, and writer release to parent Arch. Do not expand into global density, Preview target work or another component family.
