# Luna final delta review: `b3f3fd75b7f2f2b5c3084d4be5d83c614eca3854`

Review tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-prepare-integration-20260921`, HEAD `b3f3fd75b7f2f2b5c3084d4be5d83c614eca3854`. Reviewed the delta from `4b7b98e` read-only. The worktree already contained unrelated author evidence/untracked dependency artifacts; they were preserved.

## Acceptance

The two prior blockers are closed in the production path.

- `home-preparation.mjs` now annotates each step with a preparation phase. Only the documented `repository_validation_failed` refusal during the bind mutation is considered settled. Reads/read-backs, arbitrary coded errors, stale revision errors, and transport failures remain uncertain. The prior probe—bind commits, then coded `internal_error` on Session read-back—now yields `uncertain:true`, `correctable:false`, with no folder chooser.
- `app.mjs` now serializes and restores the bounded preparation failure record through the existing Home marker. A definitive folder refusal retains its correction state after reload. `preparationFailureForStorage` accepts only a boolean `uncertain` and string `message`, truncates the message, and drops malformed failure data; the malformed-state probe fails closed.

Production wiring remains correct: `app.mjs` uses `createHomePreparation`, passes `phase.correctable` to the card's correction chooser, and routes continuation/check status through the controller. PA-R3 retirement and prior PA-R1/R2 behavior remain unchanged in the reviewed delta.

## Verification

Focused command from `app/`:

```text
node --test tests/prepare-lifecycle.test.mjs tests/prepare-and-approval.test.mjs tests/workspace-card.test.mjs tests/coding-start-friction.test.mjs tests/candidate-ui.test.mjs tests/repository-binding.test.mjs
```

Result: **70 passed, 0 failed**. This includes the new coded bind read-back post-effect probe, documented refusal classification, production marker reload, and malformed persisted failure checks. `git diff --check 4b7b98e..b3f3fd75b7f2f2b5c3084d4be5d83c614eca3854` passed.

Source hashes:

- `app/web/app.mjs` `904f289c04aa92186d411bc07ae1ac25bb9575e0f2d639bc4eeb57405b059ee6`
- `app/web/home-preparation.mjs` `d91965c5fe69eb88c0b9b0c41d6d6d49e4918a0877438332afaa309a8b074847`
- `app/web/workspace-card.mjs` `25ee97770d6a794b91bb8060f17b825370a63643ef3f438180387512cd94b07c`
- `app/tests/prepare-lifecycle.test.mjs` `8bf39a950b5141ed70ca79d31e37c4132dc5bf5eb2e64cf4afd5a57d06e57691`
- `app/tests/prepare-and-approval.test.mjs` `781142551cc119a6fc283540d38dbac42c1c6be0ace9add3f820f783c1c602f1`

No full suite, browser, providers, user ports, credentials, or source edits were used. **Recommendation: accept this delta.**
