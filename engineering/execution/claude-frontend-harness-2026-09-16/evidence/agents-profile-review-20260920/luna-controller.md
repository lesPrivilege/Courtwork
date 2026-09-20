# Independent controller / contract review — Agent profiles frontend slice

Date: 2026-09-20

## Pin and scope

Reviewed the fixed candidate worktree:

- Path: `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-frontend-20260920`
- HEAD: `0f76407ac3f0fc7aa34585a003921e855c80820b`
- Branch: `claude-agents-frontend-20260920`
- Scope: `app/web/agent-profiles.mjs`, `agent-profiles-contract.d.ts`, the synthetic adapter, controller transition races, saved/draft and active-Run separation, runtime/Kit/permission projection, and capability gating.
- No product files were changed. No browser, provider, credential, or personal configuration was accessed.

The scoped command passed **16/16**:

```text
node --test app/tests/agent-profiles-specimen.test.mjs
```

## Independent adversarial probes

### Runtime detail after navigation

A gated `runtimeDetail()` reply was opened for `rt-pi`, then `openList()` was completed before releasing the reply. The resulting controller state was:

```json
{"afterView":"list","afterRuntimeDetail":{"status":"ready","id":"rt-pi"}}
```

The late runtime record therefore survives navigation and can reopen/keep a modal over the profile list.

### Save reply after discard

A gated save for `ap-work` was started after adding `kit-praxis`; `discardDraft()` was then called before releasing the save reply. The final state was:

```json
{
  "result": false,
  "draft": {"roleId":"role-work","kitIds":[],"runtimeId":"rt-pi"},
  "detail": {"kitIds":["kit-praxis"],"revision":5},
  "dirty": false,
  "save":{"status":"idle"}
}
```

The confirmed detail and local draft disagree while the controller reports no unsaved changes.

## Findings

### F-01 — Runtime detail is not invalidated when leaving the profile (blocker)

`app/web/agent-profiles.mjs:166-173` and `:186-195` reset `runtimeDetail` to `closed` during `openList()`/`openProfile()` but do not increment `detailEpoch`. `openRuntimeDetail()` only checks that epoch (`:356-368`). A reply already in flight can therefore set `runtimeDetail` back to `ready` after the user has navigated away. The probe above reproduces this exact state.

Increment the detail request epoch whenever navigation invalidates the detail surface, or add an equivalent current-surface/profile guard. Add a seam regression for runtime-detail → list/profile navigation before the reply.

### F-02 — A late save can overwrite the saved/draft relation after discard (blocker)

`discardDraft()` (`:259-265`) changes the draft and clears its dirty flag but does not invalidate `saveEpoch`. The stale-save branch (`:294-303`) calls `adopt(detail)` but leaves the discarded draft and `dirty` value in place. The probe shows revision 5 with `kit-praxis`, an empty draft, and `dirty: false`.

Either make discard invalidate an in-flight save at the controller boundary, or make the stale-save path reconcile `detail`, `draft`, and `dirty` without reporting a false clean state. Add a regression for save → discard → reply. The current view disables the Discard button while saving, but the controller method itself has no such guard and the seam must remain coherent under races.

### F-03 — Production capability failure has no user-facing reason

The contract explicitly permits a production adapter to return `{ canSave: false, reason }` (`app/web/agent-profiles-contract.d.ts:149-151`). The controller exposes this at `getState().capabilities` (`app/web/agent-profiles.mjs:127-138`) and uses only the boolean in `canSave()` (`:271-276`). `app/web/agent-profiles-view.mjs:424-432` disables Save but never reads `state.capabilities.reason`.

A backend-unavailable production adapter would therefore present a disabled Save control without the reason its contract supplies. Render that reason beside the disabled action, while keeping the action unavailable. The synthetic adapter always returns `canSave: true`, so the 16 tests do not cover this branch.

### F-04 — Missing permission effect is mislabeled as missing runtime

`projectProfile()` correctly keeps a selected runtime's missing grant as `effect: null` (`app/web/agent-profiles.mjs:61-66`). But the view renders any null effect as `Unknown — choose a runtime` (`app/web/agent-profiles-view.mjs:333-340`), even when `projection.runtime` is present and the runtime supports the action.

Use wording that distinguishes an absent permission-owner report from an unselected runtime, for example `Permission effect not reported`. This preserves requested vs supported vs granted separation and avoids asking the user to choose a runtime they already chose. Add a projection/view seam fixture with a supported action and no corresponding grant.

### F-05 — Contract wording conflates missing implementation with missing ownership (documentation adjustment)

`app/web/agent-profiles-contract.d.ts:14-16` says Kit identity/support and Runtime registration/availability/model ownership have “no owner today.” The order itself assigns backend work to the existing Provider / Runtime Control / RD owners (`06-agents-frontend-first-20260920.md:3`, `:45-53`); the delivery table repeats “no owner” for facts that are not yet exposed to this consumer (`06a-agents-profile-journey-20260920.md:69-75`).

Change the wording to “no implementation/exposed consumer fact in this slice” while retaining the original backend owner. This avoids making the frontend contract a competing ownership ledger.

## Additional race coverage note

`openList()` intentionally retains old rows while loading (`app/web/agent-profiles.mjs:166-183`), and the view only renders a loading status when there are no rows (`app/web/agent-profiles-view.mjs:148-166`). Late list replies are epoch-fenced correctly, but a refresh can visibly show stale profile values without a loading indication until the new reply arrives. Treat this as a UI/continuity follow-up rather than a controller correctness failure.

## Decision and limits

The targeted 16-test suite is green, but the candidate is not ready for independent acceptance because F-01 and F-02 are controller state-integrity failures. F-03 and F-04 require capability/permission disclosure correction; F-05 is a contract ownership wording adjustment. No full suite or browser run was performed, per scope.
