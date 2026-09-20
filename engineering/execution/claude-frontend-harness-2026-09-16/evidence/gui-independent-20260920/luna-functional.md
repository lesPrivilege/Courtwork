# Independent functional review · GUI G1/G2 candidate

Date: 2026-09-20  
Candidate: detached `fc6eccf4fa29a34edebd17f524cc9b59437f4a46`  
Base: `main@72c91a2f070cc8e134f1d09cebc7de735ff89415`  
Review mode: non-author read/test only. No product files, runtime state, credentials, or provider were touched.

## Evidence boundary

The author record is `engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md`, G1 delivery at lines 105–147 and G2 delivery at lines 149–191. It reports the intended in-place `Show all` filter, per-block focus restoration, an empty-project fix, and notice-pair aggregation. The findings below are independent checks against the fixed candidate; they do not self-accept the author work.

Focused command:

```text
node --test app/tests/chat-reading.test.mjs app/tests/home-presentation.test.mjs app/tests/event-weight.test.mjs app/tests/settings-preferences.test.mjs app/tests/settings-navigation.test.mjs
```

Result: **52 passed, 0 failed**. This covers stale detail rejection, Home projection/focus retention, G2 burst grouping and notice pairing, and preference/focus behavior. It does not cover a deleted project, a changed Home project scope, multi-page Home merge facts, or a zero-result 28-day Activity packet.

## Findings

### F-01 · Attention scope survives a removed or changed project — acceptance blocker

**Independent repro:** the parent’s isolated browser run closes the example project, leaving zero projects and zero Continue rows, while Home still renders the prior synthetic Attention row (`Project not resolved`) with `Attention unavailable. Showing the last loaded records`. Reload clears it. The same state can be reached by choosing project B after Attention was loaded for project A.

The candidate keeps `state.homeAttention.projectId` as the first default for every reload (`app/web/app.mjs:6312-6318`). `loadProjects()` removes invalid project ids from navigation state but does not invalidate `homeAttention` (`app/web/app.mjs:2016-2032`). `attentionBlock()` deliberately renders retained data when a read fails (`app/web/home-view.mjs:296-316`), so the old project’s rows remain visible with `Project not resolved`. The Home workspace picker changes `state.homeProjectId` and redraws the composer only; it does not start a new Attention read (`app/web/app.mjs:7412-7423`).

This is a state-ownership defect visible in the candidate. The underlying `state.homeAttention.projectId || …` default also exists in the base, so the retention mechanism is pre-existing; G1’s removal of the old project selector makes the missing invalidation more exposed, and the author record’s claim that the empty-project guard was fixed is not met. Before G1 acceptance, the existing Home/Attention owner should clear or replace the cached project scope when the project disappears or changes, then render the empty/unavailable state without stale rows. A late response must remain generation-guarded.

### F-02 · A 28-day zero Activity packet renders a full empty heatmap — ruling follow-up

The G1 ruling says a block with nothing is absent except the Continue condition sentence (`gui-grammar-convergence-20260919.md:84-92`). The implementation suppresses Activity only when the empty packet uses 84 days; a valid zero-total 28-day packet still renders the Activity block and all zero cells (`app/web/home-view.mjs:348-384`, especially lines 354-356 and 373-375).

Independent synthetic probe against the candidate printed:

```text
{"activityBlock":true,"heatmap":true,"summary":"Activity0 recorded runs · 28 days28d84d..."}
```

The code comment says the narrower period is intentionally kept so its period control remains available. That is a direct adjustment to the written empty-block rule and needs an explicit owner disposition. If retained, the UI needs an explicit empty-state sentence rather than a dense all-zero instrument; if the ruling stands, suppress the block for both periods. This is a bounded G1 contract issue, not a provider or runtime failure.

### F-03 · Merged `Show all` pages can report a false truncation sentence — follow-up

`loadHome()` merges prior and next pages into one `items` array but copies the newest page’s pagination facts unchanged (`app/web/app.mjs:6355-6369`). The server marks any non-zero offset page `truncated: true` even when it is the final page (`app/server/work-summary.mjs:10-14`). `pageNotes()` then interprets that fact as evidence that records remain outside the displayed set (`app/web/home-view.mjs:229-234`).

Independent synthetic probe with 31 already-merged items and a final offset page printed:

```text
{"pageNote":"Showing 31 of 31.","rows":31}
```

The sentence continues to say “Some items are outside this page” even though all 31 items are rendered and `hasMore` is false. The in-place `Show all` behavior itself matches the G1 ruling; this is a projection/receipt correction. Recompute truncation from the merged collection or distinguish “offset page” from “items still unavailable.”

### F-04 · Home filter state is never cleared, and the collapse focus fallback can disappear — follow-up

`state.home.filter` is initialized once and only mutated by the Home filter callback (`app/web/app.mjs:138`, `6275-6282`). `goHome()` reloads Home but does not clear that filter (`app/web/app.mjs:6394-6406`). Opening a Continue set, entering a chat, and returning Home therefore re-enters the previously filtered set rather than the default Home unless the user manually activates `All work`.

There is a related deterministic focus edge: the collapse callback searches for `home-more:${previous}` after rerender (`app/web/app.mjs:6275-6282`), but `Show all` is created only while `page.total > shown.length` (`app/web/home-view.mjs:261-265`). If an async refresh reduces the set to three or fewer rows while the set is expanded, the old `All work` control is removed and no return target exists; focus falls out of the Home control sequence. Preserve a scoped filter only if that is explicitly desired; otherwise clear it on Home entry, and use a stable fallback (the block heading or first row) when the prior control no longer exists.

## Checks with no independent defect found

- G2 notice pairing is scoped by both the matching notice kind and `runId` (`app/web/thread-projection.mjs:138-147`); the author’s paired and unpaired cases pass. The focused unit test does not add a cross-run fixture, so that coverage remains useful follow-up rather than an acceptance claim.
- Activity and Attention request generations reject late responses (`app/web/app.mjs:6292-6333`); the existing stale-detail and Home refresh tests pass. The deleted-project case above is invalidation, not a late-response race.
- In-place `Show all` → `All work` routing is consistent with the ruled G1 text (`gui-grammar-convergence-20260919.md:110,116`); it is not an external destination route. The pagination wording defect is separate.

## Disposition

F-01 is the only concrete acceptance blocker found in this bounded functional pass. F-02–F-04 are owner follow-ups/ruling corrections that should be recorded before integration or explicitly deferred. The candidate remains unmodified and unaccepted by this review.
