# Coding dogfood readiness — independent acceptance

2026-09-20 · **Astra accepts the prepared synthetic scenario for WebUI handoff and local integration.** Accepted source: `3618947a6441c644bfaded75d41e96a6b4251b38`. This closes the bounded readiness order, not real-model N-02 or browser/user acceptance.

## Source, authorship and review

Claude supplied source `c6a2b91` and packet `231532a`. Astra combined it with main `066be48` in an isolated integration tree. The two residuals were repaired there: `46409b2` checks the reused data directory's canonical boundary before read/launch; `3618947` bounds bootstrap headers/body by the startup deadline and corrects packet wording. Claude's source tree and the reserved user instance were not edited. [Final source manifest](source-sha256.json) separates these identities from the author packet's historical source manifest.

Luna independently verified Astra's corrections. Authors do not claim independent acceptance of their own implementation.

| Original finding | Final disposition and evidence |
| --- | --- |
| DF11-R1 · preparation boundary | Closed: component containment, canonical ancestor checks and legitimate external roots pass [round-2 preparation review](luna-round2-preparation.md). |
| DF11-R2 · shell quoting | Closed: synthetic argv round-trip preserves spaces, quotes, newlines and substitutions literally; no manifest command executes. [Probe log](round2-preparation-probes.log). |
| DF11-R3 · reuse trust | Claude's manifest/derived-launch correction is retained. Luna found data-directory symlink redirection still accepted; Astra corrected it. External sentinel, instance-root/source aliases reject before read/launch, while ordinary reuse and a legitimate root symlink remain valid. [Independent final review](luna-final-preparation.md), [13/13 tests](final-preparation-tests.log), [probes](final-preparation-probes.log). |
| DF11-R4 · process ownership | Explicit environment, LOCK_BUSY cleanup and SIGKILL escalation pass. Luna's residual bootstrap timeout finding is fixed; stalled headers and body each time out, terminate the real Host, and permit a clean reopen of the same data lock. [Final independent review](luna-final-process.md), [2/2 lifecycle tests](final-lifecycle-tests.log). |
| DF11-R5 · restart evidence | Closed: [final rehearsal](final-rehearsal.json) compares 12 complete persisted check/repository events as parsed objects, plus complete effects; no nonempty assertion is bypassed. |

The final separate-process rehearsal passes **15/15, exit 0**, with clean normal shutdowns and no matching Host remaining; [console](final-rehearsal.log). All data was independently generated scratch, using the deterministic provider. Real provider and browser interaction remain `not_run`.

Astra's first lifecycle test attempt had an incorrect Node mock restoration call (`mock.restore`); this test-harness failure is retained in [initial output](astra-lifecycle-initial-failure.log), fixed to `mock.mock.restore`, and followed by passing author and independent runs. Claude's 1250/1250 full suite remains evidence for `c6a2b91`, not relabeled for Astra's changes. The final integration changes only two preparation/rehearsal guards and their focused regressions; no Host, Store, schema, UI, provider or Core code changed, so another full suite was not needed.

## Packet corrections and remaining boundaries

- Home defaults to Ask before editing unless a saved preference overrides it; the service fallback for omitted mode is draft. Explicitly select Ask and record the actual Run binding. Missing cards never substitute for effects/diff/check receipts.
- Graceful shutdown drains active Runs through cancellation; only unresolved recovered execution is fenced unknown. A new check cannot resolve an old outcome retroactively.
- `(Run, call)` is the check identity for every provider; provider-wide uniqueness is not assumed.
- The environment allowlist excludes other ambient variables, including provider credentials. PATH/HOME/TMPDIR still inherit caller paths; this is not an OS sandbox or a claim of impossible native configuration discovery.
- Slice 02's failed/prepared/unknown write-effect presentation, full G4, real-model task success and human acceptance remain open under their original owners. The separate 06a frontend return remains unaccepted and is not part of this merge.

## Operator handoff

Use the accepted scripts in the persistent Courtwork checkout. [Launch and restart](../coding-dogfood-readiness-20260920/startup-and-launch.md), [natural-language paste-in task](../coding-dogfood-readiness-20260920/real-model-prompt.md) and [browser checklist](../coding-dogfood-readiness-20260920/browser-checklist.md) are the handoff. The reserved synthetic instance stays outside Git and remains for the user to open; the automated rehearsal never consumed it. `--reuse` derives the launch command from the current checkout rather than the old manifest's author-tree path.

Do not paste the deterministic fixture answer into a real-model trial. The initial connection is Local test; the user chooses an explicitly authorized real model/connection for the actual task. No personal credentials, runtime installations or provider configuration were read or changed in this work.

## Integration and preservation

Local merge and restoration-verified cleanup of the ended dogfood trees are already authorized. Their actual integrated main SHA, source recheck, archive hashes and removed/retained trees will be recorded in the completion receipt. Preserve the reserved instance, both pending 06a trees, Courtwork, and the frozen shared Git database. The existing heartbeat remains paused. No push or deployment is included.

[Evidence SHA-256 manifest](sha256.json) covers retained review files and this acceptance record, excluding itself. Raw Luna reports retain their original paths/wording; this disposition controls the final scope.
