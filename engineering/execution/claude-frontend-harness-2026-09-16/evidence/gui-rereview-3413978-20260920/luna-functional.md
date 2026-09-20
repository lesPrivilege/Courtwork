# Functional delta re-review · GUI G1/G2

Date: 2026-09-20  
Candidate: detached `34139788b16f60866e4c7abc947f428ccdc1c8f5`  
Reviewed delta: `fc6eccf4fa29a34edebd17f524cc9b59437f4a46..34139788b16f60866e4c7abc947f428ccdc1c8f5`  
Mode: non-author read/test only; no product, browser, provider, credential, or runtime-state writes.

The authoritative disposition is the fresh-node section in the main Courtwork record, `engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md:140-161`. It says F-01 blocks acceptance; F-02 is an explicit narrower-period exception; F-03 must correct merged facts; and F-04 preserves filter continuity while requiring a stable focus fallback. It explicitly rejects mandatory filter clearing.

## Independent checks

Focused command:

```text
node --test app/tests/home-scope.test.mjs app/tests/home-presentation.test.mjs \
  app/tests/event-weight.test.mjs app/tests/chat-reading.test.mjs \
  app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs
```

Result: **56 passed, 0 failed**. The new `home-scope.test.mjs` includes rendering checks for F-02/F-03 and source assertions for F-01/F-04. It does not dynamically drive the full `app.mjs` project lifecycle, so scope conclusions below include source-path analysis.

## Dispositions

### F-01 · Scope invalidation — fixed in the delta, no remaining stale-row blocker found

The new `homeAttentionScope()` and `invalidateHomeAttentionScope()` at `app/web/app.mjs:6324-6340` clear cached data and increment the generation when the selected project changes or disappears. The project picker calls invalidation at `app/web/app.mjs:7455`; `loadProjects()` calls it after rebuilding the valid project set at `app/web/app.mjs:2032-2037`. A prior request’s captured `own` value cannot publish after the increment because `loadHomeAttention()` checks it at `app/web/app.mjs:6342-6362`. This addresses the prior stale Attention row after example/project removal and the project-switch path by inspection.

One bounded follow-up remains: invalidation can start an Attention request, and the caller immediately starts the normal Home load which calls `loadHomeModules()` again. Bootstrap and project refresh therefore can issue two reads for the same new scope; the first is safely discarded by the generation guard. This is redundant work, not a stale-fact or authority failure, and is not an acceptance blocker for F-01.

The source comment says “first real project”, while the fallback is `state.projects[0]?.id` (`app/web/app.mjs:6324-6328`) and may be a preview project when preview data is present. Existing preview behavior intentionally renders the example Attention surface, so I treat the wording as a documentation precision issue rather than a functional finding.

### F-02 · Zero-result 28-day Activity — fixed and aligned

`activityBlock()` now computes `empty`, omits `heatmap()` and emits `No runs recorded in the last N days.` (`app/web/home-view.mjs:357-383`). The 84-day zero-result block remains absent. The new rendering test exercises both cases and passes. This matches Astra’s accepted bounded exception: retain the 28-day period controls while stating the empty period.

### F-03 · Merged pagination receipt — fixed and aligned

`pageNotes()` now emits the “outside this page” sentence only when the merged item count is below the total (`app/web/home-view.mjs:211-244`, especially line 232). The new test verifies that a complete merged set does not claim omitted records and that a partial set still does. The focused test passes.

### F-04 · Filter continuity and collapse focus — still requires correction

There are two separate issues.

1. The delta adds `state.home.filter = null` to `goHome()` (`app/web/app.mjs:6424-6438`). The updated author record repeats this as the F-04 change, but the authoritative disposition at main record line 156 explicitly accepts selected-set continuity and rejects mandatory clearing. This implementation/documentation pair is out of alignment with Astra’s ruling. The source should preserve the selected set across returning Home, or the owner record must receive a new explicit ruling before integration.

2. The collapse fallback only tries the prior `Show all` control and then a `.home-row` (`app/web/app.mjs:6287-6291`). If the refreshed set has zero rows, the set block is absent for `Waiting`/`Needs a look`, or the Continue block contains only its empty condition sentence (`app/web/home-view.mjs:253-281`), neither selector exists and `target?.focus()` is a no-op. The authoritative requirement is a stable heading/row fallback when `Show all` disappears. The new source assertion checks that a row fallback string exists but does not cover the zero-row case. This remains an acceptance finding for the F-04 focus requirement.

## Re-review result

F-01, F-02 and F-03 are substantively addressed by the returned delta and focused checks. F-04 is not ready for acceptance: the implementation contradicts the authoritative filter-continuity disposition and still loses focus in the zero-row shrink case. The candidate remains unmodified and is not independently accepted by this review.
