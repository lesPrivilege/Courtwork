# LP-R6 final parent acceptance — retained findings, unresolved execution

2026-09-23 · Parent Astra accepts backend `afa6b1792b65b512f1634c8d1a241fc7b5b675aa` plus GPT-6 Sol UI closure `a0a1c46b00d30b7dd53f061ee7f02176326159da`. Integrated main **db04448d821c56c20621c1a75161b768e19c0f1f**. RuntimeStore21/Core4/bridge5 and package pins remain unchanged.

## Accepted bounded outcome

After an actual owned local Pi process completed and its exact output/terminal receipt were retained, a Host crash before publication leaves its Run/attempt unknown. The existing explicit reconcile can now publish those retained findings once; it does not re-execute. The findings reader returns exact verified UTF-8 bytes. Assignment stays blocked, unknown history remains, and retry/admission/deletion fences remain unchanged. The UI explains this distinction and withdraws the consumed recovery action only when the current unknown attempt has its own matching result. Older results do not hide the latest attempt's recovery control.

## Evidence and dispositions

**Adopt/close LP-R6 and LP-R6-UI.** The [first parent UI return](../local-pi-recovery-ui-20260923/README.md) retains independent backend45/45 and a public reconcile→result→persisted-state→Host-reopen probe. The UI delta has [GPT-6 Luna independent31/31](luna6-ui-tests.log) and [source assessment](luna6-ui-review.md.txt), including current/older/no result and normal completed/failed controls. Author checks are separately retained in the original packet; no full suite is relabelled or inferred.

Parent actual OpenAI in-app browser used the accepted real terminal-crash fixture and fixeda0a1c46 app on an ephemeral Host with independent data:

1. Before recovery, Needs attention and Reconcile are available; there is no published result.
2. Reconcile produces `Retained before publication.`. [Screenshot](browser/recovered.png), [text](browser/recovered.txt), [checks](browser/checks.json) show Needs attention, explicit unknown/retry-blocked guidance, zero Reconcile/Retry controls and no browser errors.
3. Reload and reopen Spark preserves the result and those controls: [text](browser/reloaded.txt). [Host receipt summary](browser/receipt.json) shows one result revision, blocked assignment, unknown latest attempt, zero new provider requests and zero runtime source-read receipts.

Actual integrated-main [20/20](integrated-tests.log), [exit0](integrated-tests.exit), crosses retained-result recovery, Session deletion fences and the real UI projection cases. Product merge was conflict-free; source bytes match the fixed candidate. No schema, new route, permission model, scheduler, Runtime selection, source coverage or Work acceptance is introduced.

## Limits and cleanup

The local Pi worker remains explicitly injected/offline/tool-less; this does not expose arbitrary native tools or a selectable production local runtime. Unknown execution is not resolved by publishing findings. Cases without a matching completed terminal/result remain fenced, as do negative-terminal/lost-creation flows. Native zoom, screen reader, forced colors and broad new UI layouts were not in this small projection return. User Host/data, credentials, paid providers and Pages/deployment were untouched. Parent test Host/tab stopped; temporary dependency symlink removed.

[Preservation receipt](preservation.json) records9,817 entries /479,114,889 bytes including ignored/untracked files, modes, symlinks, refs and patches. Physical extraction matched the manifest; the complete Git bundle was cloned/fsck-verified. Fixeda0a1c46 was clean, unchanged, fully integrated and had no cwd holders before the ended recovery worktree/branch were removed. Archive ref remains. Persistent Courtwork metadata and frozen shared Git database are retained. Runtime selection R0 is the next original-owner contract stage, not already-available alternate-runtime capability.
