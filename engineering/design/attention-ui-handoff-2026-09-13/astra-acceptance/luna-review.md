# Luna bounded review · WO-ATT-UI02

2026-09-13 · Independent check against integration worktree `codex/attention-ui02-integration-20260913`, HEAD `edd853dc90d4419f008b5b68259401c989471ce1`. Scope: `app/web/attention-view.mjs`, its Attention CSS, and the changed Core-backed conflict/recovery test. Astra owns browser and full-page acceptance; this is a focused code and synthetic-test review.

## Finding and disposition

I found one local P2 concurrency defect in `settle()`: two same-project mutations could overlap, and A's `finally { motion.hold = false; }` released B's feedback hold while B's canonical re-inspect had completed but B's registry query was still pending. A deterministic probe returned an A-issued registry snapshot with B still `needs_you`, then recorded a B detail as `Resolved` and an `attention-receipt` WAAPI call before B's list read finished. The pre-fix failure is preserved in [luna-concurrency-review-before-fix.txt](evidence/luna-concurrency-review-before-fix.txt).

Astra changed `motion.hold` to a counter: each settle increments it and decrements in `finally`; `runMotion()` continues to defer feedback while the count is nonzero. The independent probe now verifies that no B receipt animation runs during the held registry read and that it runs exactly once after that read completes. The finding is closed in this reviewed source.

The other targeted behaviors held: A's late conflict preserves B's same-project draft and does not display A's alert; A's late successful receipt after switching projects preserves B's draft and does not display A's receipt; keyboard Enter, editor, and receipt paths make no WAAPI calls. Conflict copy guides the person to review current state after the automatic re-read.

The adjusted presentation follows the recorded Courtwork grammar: selected registry rows use the existing `var(--selected)` fill and native focus, with no inset rail; alerts retain the existing subdued `.inline-notice` panel without a left rail; `.attention-next-kind` is plain muted text without a raised chip or shadow. Workspace/detail headings scale with `--text-scale`. The nearest implemented precedents are `.chat-row.is-current` for selection and existing Attention triage/action/receipt surfaces for its current-fact sequence.

Task-history timeline: defer from this delivery. Core's event query makes it a viable later history surface, but it adds a distinct historical-reading interaction (including paging and stale/error behavior) beyond this current-state triage flow.

## Verification and boundary

- Independent synthetic probes: [test source](../../../../app/tests/attention-ui02-concurrency.test.mjs); it was mechanically moved from this acceptance directory after the recorded run, with only four relative-import paths adjusted and no test-semantic changes. Before relocation, after the hold-counter fix, **4/4 pass** ([log](evidence/luna-concurrency-review-after-fix.txt)); before the fix, the overlap case failed as described while the other three passed.
- Adjacent targeted Attention suites (`attention-ui02`, `attention-triage`, `attention-triage-recovery`): **25/25 pass** ([log](evidence/luna-adjacent-targeted.txt)).
- `git diff --check`: pass.

No independent live-browser, visual, or assistive-technology run was performed here; use Astra's separate evidence for those acceptance dimensions. This review does not extend to unrelated product surfaces or release gates.
