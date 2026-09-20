# Luna final bounded review — `2b98abb`

## Scope

This is an independent review of the detached candidate
`2b98abb5f412ba5b6f7c04837c4a23ed7d075a93`, comparing only
`213ef4d55073996cb25cd717dc2905e775d6f560..2b98abb`. It covers the two exact
remaining corrections named by the latest Astra owner record:

- F-04 selected-set continuity and its opposite regression expectation.
- The default scratch-directory expressions in the two G4 capture scripts.

No product or documentation files were edited by this review. The checkout has
only the supplied untracked `app/node_modules` symlink.

## Results

### F-04 continuity: closed within the bounded scope

`app/web/app.mjs:6430-6446` now leaves `state.home.filter` untouched in
`goHome()`. Its comment records the ruled contract: returning Home preserves
the expanded set, and `All work` is the clearing control. The prior forced
assignment is gone.

`app/tests/home-scope.test.mjs:78-87` now asserts the opposite behavior:
`state.home.filter = null` is rejected, `state.home.filter = key` remains the
filter-control mutation, and the existing focus fallback chain remains covered.

I also executed the exact current `goHome` function body in a side-effect-free
mocked closure. The harness supplied mocked lifecycle dependencies and a
synthetic state with `home.filter = "pendingItems"`; it verified that the filter
remained selected and that deactivation, draft persistence, session clearing,
navigation closing, focus restoration and `loadHome()` were called in order.
No browser, server, provider or credential state was involved. This validates
the route body beyond the source assertion, while remaining clear that it is a
mocked lifecycle check rather than a browser navigation run.

### Default scratch expressions: closed

The two capture scripts now use their already imported `tmpdir()`:

- `evidence/gui-grammar-20260920/capture-fixture-cells.mjs:27`
- `evidence/gui-grammar-20260920/capture-single-run-burst.mjs:23`

With `G4C_SCRATCH` unset, I evaluated each exact expression in isolation. They
resolved to `/tmp/cw-g4-fixture-cells` and `/tmp/cw-g4-single-run-burst`,
respectively. Both scripts also pass `node --check`. The scripts themselves
were not imported or run: importing them would execute their capture `main()`
functions, start a local server and headless Chrome, and update the evidence
manifest. This check verifies the portability defect without creating scratch
state or recapturing evidence.

## Verification

- `node --test app/tests/home-scope.test.mjs` — **5/5 passed**.
- Mocked execution of the current `goHome` body — **passed**; selected filter
  retained and lifecycle calls observed.
- Isolated evaluation of both unset-environment scratch expressions —
  **passed**.
- `node --check` on both capture scripts — **passed**.
- `git diff --check` on the scoped delta — **clean**.

## Disposition

Both exact remaining corrections are closed for this bounded local-integration
review. The accepted focus fallback and targeted spacing correction were not
reopened. The deferred G4 visual/accessibility matrix cells and broader
core-dogfooding acceptance remain governed by the existing owner dispositions;
this report makes no broader release or full-matrix claim.
