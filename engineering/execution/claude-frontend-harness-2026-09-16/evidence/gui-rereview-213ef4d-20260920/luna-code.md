# Luna functional re-review — GUI corrective delta `213ef4d`

## Scope and provenance

This is a non-author review of the fixed detached candidate
`213ef4d55073996cb25cd717dc2905e775d6f560`, comparing only
`34139788b16f60866e4c7abc947f428ccdc1c8f5..213ef4d`. The review is limited to
F-04 Home continuity/focus and the previously identified spacing-lint fallback.
No product or documentation files were changed. The checkout remains detached
and clean apart from the supplied untracked `app/node_modules` symlink.

The governing integration disposition is
`engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md:171-176`, especially line 174: F-04 remains open until selected-set continuity is restored and both shrinking and zero-row/disappeared-set focus behavior are verified. The earlier ruling at line 156 rejects mandatory clearing on return to Home.

## Findings

### F-04 continuity is still open (acceptance blocker)

`app/web/app.mjs:6441-6444` still runs:

```js
state.home.filter = null;
restoreLayerFocus($("composer-input"));
```

inside `goHome()`. The final delta does not change this behavior. Returning Home therefore forcibly collapses the selected set, exactly the behavior rejected by the governing disposition. The test at `app/tests/home-scope.test.mjs:78-80` also still asserts that reset, so the test currently locks in the rejected contract rather than detecting it.

The final delta does improve the separate collapse focus chain at
`app/web/app.mjs:6291-6297`, but that does not repair this unchanged reset. Keep
F-04 blocked until the author removes the forced reset, updates the regression
contract, and exercises the actual Home-return path.

### Zero-row focus fallback is closed at the view projection level

The corrective source adds a focusable block anchor in
`app/web/home-view.mjs:269-273` (`tabindex="-1"`) and the app-level chain now
selects the set control, first row, block anchor, another Home row, then the
composer (`app/web/app.mjs:6291-6297`). The added test at
`app/tests/home-scope.test.mjs:87-92` verifies that an empty Continue block is
still rendered and has `tabindex="-1"`.

I independently exercised `renderHome` with synthetic data through the
non-empty → zero-row → Home projection. The expanded empty set retained its
block, removed its row, emitted the empty-state sentence, and the returned Home
projection retained a focusable Continue block; calling `focus()` made that
block the active element. This verifies the DOM/view portion. The app-level
`onFilter`/`goHome` closure is not exported and remains source-tested only; the
unchanged `goHome` reset above is therefore a real remaining integration gap,
not a claim that this synthetic view check proves the whole route.

### Targeted spacing fallback correction is closed

The final delta rewrites the fallback case in
`app/tests/spacing-governance.test.mjs:77-88`: an undefined token with a
literal off-scale fallback (`var(--space-7, 7px)`) is rejected, while a nested
token fallback and a 2px hairline fallback pass. The existing parser path in
`tools/lint-spacing.mjs:201-287` reports the fallback value and preserves the
property-scoped registration rule. This is the bounded fallback correction; no
broader lint rewrite is indicated.

## Verification

Focused tests on the candidate:

- `node --test app/tests/home-scope.test.mjs app/tests/home-presentation.test.mjs app/tests/event-weight.test.mjs app/tests/chat-reading.test.mjs app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs` — **57/57 passed**.
- `node --test app/tests/spacing-governance.test.mjs` — **8/8 passed**, including the production stylesheet lint and the literal/token/hairline fallback cases.
- Independent synthetic `renderHome` projection check — **passed** for non-empty → zero-row → Home focusable block continuity.
- `git diff --check 3413978 213ef4d --` on the scoped source/tests — **clean**.

## Handoff disposition

Accept the focus-anchor and targeted lint-fallback portions of this delta as
bounded corrections. Do not accept the GUI node as fully closed: F-04 remains
an acceptance blocker because the exact `goHome()` filter reset and its
source-only regression assertion are unchanged against the authoritative
ruling. The next author return should remove that reset, assert continuity, and
add a behavior-level route test; no broad lint expansion is required by this
review.
