# Luna final review: preparation returns at `4b7b98e`

Review tree: `/Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-20260920`, branch `claude-prepare-and-approval-20260920`. Reviewed `27aa6ac..4b7b98e` read-only.

HEAD: `4b7b98ebce4819b94a42337ed87c1b6a58a166e4`

Source hashes:

- `app/web/app.mjs` `6101e2ad75458a571f83947511face8070a317ceff949f4acd7fc91bac4df01a`
- `app/web/home-preparation.mjs` `0f9b1e96a6fdcfd789badbb428756711ee547634ae558970e7de84b503149169`
- `app/web/workspace-card.mjs` `25ee97770d6a794b91bb8060f17b825370a63643ef3f438180387512cd94b07c`
- `app/tests/prepare-lifecycle.test.mjs` `1c9804a3826d2674b448ad9de940023e0730673e9b6e2afe6dcb3287fd603cce`

## Accepted wiring

The production `createHomePreparation` controller is now the owner used by `app.mjs`; the lifecycle tests drive that controller and the real workspace card. Unconfirmed create recovery, Host-path adoption, corrected-folder routing, same-identity reconciliation, and PA-R3 retirement are all wired through production seams. The new tests cover the previous Remove gap, definitive folder refusal, and candidate/session reply loss.

The HTTP adapter at `app/web/app.mjs:782–843` parses JSON error envelopes into `error.body`; `home-preparation.mjs:51–53` then classifies any string `body.error.code` as settled and anything else as uncertain. That correctly treats a Host validation refusal such as `503 repository_validation_failed` and a stale revision as settled, while transport/no-envelope failures remain uncertain.

## Blockers

### 1. The classifier is applied to read-back failures and can misclassify a post-effect failure

`prepareChat` binds at `home-preparation.mjs:140–151`, then immediately performs the read-back at `154–155`. If the bind commits and that GET returns a coded error envelope, `createHomePreparation.prepare` catches it at `242–250`, calls the generic `uncertainFailure`, and marks it settled/correctable even though the binding landed.

I reproduced this with a bounded synthetic Host: POST Session succeeds; bind PUT commits `repositoryBindingRevision=1`; the following GET returns `{status:500, body:{error:{code:"internal_error"}}}`. The resulting phase was:

```json
{"status":"unfinished","uncertain":false,"correctable":true,
 "session":{"repositoryBinding":null,"repositoryBindingRevision":0}}
```

The Host had an active binding at the same time. This exposes the correction chooser and permits another binding intent against a mutation that is already present. The claim that “any coded Host error” means no effect is only valid for the documented mutation refusal envelopes, not a coded error from the read-back or an intermediary. The fix should scope settled classification to the specific mutating command/refusal contract, or treat read-back failures as uncertain and reconcile before correction.

### 2. `marker.failure` is not persisted across reload

`createHomePreparation` records `marker.failure` (`home-preparation.mjs:246–250`) so `preparationState` can expose `correctable`. However `storeHomeDraft` serializes the marker in `app.mjs:372–382` and omits `failure`; `restoreHomeDraft` restores the remaining fields only (`386–400`). After a definitive bind refusal, a reload loses the settled failure fact, so the restored marker has an unbound Session but no `failure`; `preparationState` returns `correctable:false` and the correction chooser disappears. The user is sent back to Finish preparing with the same refused folder and cannot correct it from the recovered state.

This contradicts the controller comment that the settled/uncertain outcome “has to survive a reload.” Persisting the small failure record (or an equivalent durable settled/correctable marker) is required for the correction path.

## Verification

Command from `app/`:

```text
node --test tests/prepare-lifecycle.test.mjs tests/prepare-and-approval.test.mjs tests/workspace-card.test.mjs tests/coding-start-friction.test.mjs tests/candidate-ui.test.mjs tests/repository-binding.test.mjs
```

Result: **68 passed, 0 failed**. `git diff --check 27aa6ac..4b7b98e` passed. The additional inline probe for the post-bind coded read-back failure is captured in the log. No full suite, browser, provider, user ports, credentials, or source edits were used.

Recommendation: adopt the extracted production controller and PA-R3/R2 behavior after addressing the two blockers above. Do not accept the broad “coded Host error is pre-effect” claim as written.
