# 06c Runtime management — independent disposition

2026-09-21 · Astra. Candidate `84faff90235ecd5716bff7fe91448b86a2457213`, main/base `ff553e89ba26ba5e3db6b8ee6071bb3f7cc5bd93`. **Hold integration for RM-R1/R2 and the RM-C1 contract correction below.** Original Opus owner retains the same source/evidence tree. No new backend, schema or design direction is requested.

## Independent evidence and retained design

[Luna's review](cw-runtime-management-independent.md) and [test log](cw-runtime-management-independent-tests.log): new suite 26/26, adjacent suites 67/67, exit 0. The appended F02 finding supersedes the report's earlier one-return summary and broad statement about revision guards. Author full 1378/1378 remains author evidence; not repeated independently. The preview isolation, existing Settings anatomy, native-versus-CW ownership distinction, operation identity, saved-versus-draft separation and bound-Run semantics are retained.

Astra used OpenAI computer use in the in-app browser against an independently launched read-only preview on 8975, with only synthetic in-memory state:

- [Runtime list](01-list.png), desktop 1195×772: one action per row and explicit example/preview identity.
- Disable Pi: [revision 4 confirmed while the existing Run keeps revision 3](02-disabled.dom.txt), [visible receipt](02-disabled.png); Disconnect stays unavailable while the Run is bound.
- Hermes connect with a changed name and a committed lost reply: [unknown state](03-unknown.dom.txt). Mutations remain locked; navigation away/back preserves the unknown operation. A later draft typed before Check status remains distinct from the confirmed connection name: [reconciled result](04-reconciled.dom.txt).
- Native Escape cancels inline disconnect confirmation and returns focus to Disconnect. Confirming disconnect retains the newer draft and both connection-history records: [result](05-disconnected.dom.txt).
- [390×844 dark layout](06-narrow-dark.png) reports no document horizontal overflow. This is responsive emulation, not native zoom or full touch/accessibility acceptance.
- A refused connect retains its draft and restores focus to Connect; a real Tab moves to Discard changes: [refusal DOM](07-refused.dom.txt).
- Reproduced the unknown-copy contradiction again with an exact submitted label: [complete DOM](08-unknown-wording.dom.txt), [visible alert](08-unknown-wording.png). Screenshot alone does not contain the lower draft line; the same-state DOM contains both claims.

The independent preview and tab were stopped. No actual local agent, credentials, authentication, native configuration, production Settings or provider was used. User Host 8787 was still PID 65142; 8899 had no listener at the final read-only check. Neither was started/stopped by this review. Native zoom, screen reader, forced colors, Safari, multi-tab/restart recovery, exhaustive long-label stress and all fixture states are not independently claimed.

## RM-R1 — adopt F01; truthful submitted/unknown/draft wording

At `runtime-management-view.mjs:540–549`, dirty text always says **Not applied**, including when that exact configuration was submitted and its response was lost. The alert correctly states the effect is unknown, so the same page contradicts itself. Both Luna's public controller/view probe and Astra's browser reproduce it.

Keep last-confirmed state, submitted configuration and any newer local draft distinct. Pending/unknown/checking cannot assert that the submitted values were not applied. Later unsubmitted edits may be described as local edits without claiming the earlier command failed. Preserve locks and non-resending Check status. Add a real controller/view regression for the unchanged submitted draft during a lost reply, plus newer input during reconciliation. Do not rewrite the accepted whole journey.

## RM-R2 — adopt F02 with a bounded consistency rule

The [public-controller probe](cw-runtime-management-stale-read.log) returns detail revision 6 after a confirmed command receipt at revision 7. `adopt()` checks the revision, but `afterConfirmed()` overwrites that decision with `readBack="done"` merely because the read returned successfully. The resulting page offers Connect using old disconnected state. No duplicate effect was observed: the fixture's revision precondition still protects the owner.

Do not mark a transport-successful read as consistent read-back. Keep unresolved/stale reads distinguishable and mutations blocked until an adequate owner reading arrives; keep an explicit read/recovery action available without resending the command. Validate the runtime identity and revision through the real adapter seam, including navigation/reopening and a subsequent fresh response.

**Astra adjustment to the review recommendation:** at the receipt's revision, connection facts must agree with that receipt. A legitimately *newer* revision may describe a later connection or configuration; show it as newer observed state while retaining the original command receipt. Do not reject every newer state solely because its connection differs. The regression should cover stale → adequate read and a valid newer revision, without inventing remote exactly-once guarantees.

## RM-C1 — adjust the proposed status-lookup contract

`runtime-management-contract.d.ts:189–191` defines `not-applied` as no owner record and concludes nothing changed. Before backend adoption, that conclusion requires a stronger contract: the owner must authoritatively establish that this operation was not applied **and cannot later apply**. Mere absence from a lookup, including lag, queueing, expiry or an unresolved request, is not sufficient. Represent unavailable/inconclusive lookup as pending/unknown and preserve the lock.

Correct the proposed contract and fixture explanation. A fixture may return definitive non-delivery when it actually controls that fact; do not teach a future adapter to convert arbitrary not-found into safe retry. Add a small contract/controller case that inconclusive lookup keeps the original operation unresolved. This is a proposal correction, not a requirement to build production status storage now.

## Other observations and exit

The author's `agent-profiles-view.mjs` optional-note `append(null)` observation is source-confirmed and assigned to the existing 06a owner as a separate follow-up. It is not a 06c blocker and does not authorize widening this return to redesign Agent profiles. Exa/Figma authorization is unnecessary for these concrete corrections; no connector setup is requested.

Deliver one bounded correction commit on the existing branch, preserving reviewed ancestors, accepted design, source/evidence and limits. Re-run the affected seams with complete logs; identify any remaining unexecuted case. Release for Luna delta review and Astra integration. Role-first Composer, production runtime connection and key/hook implementation remain unstarted. No merge, worktree deletion, push/deploy or heartbeat activation in this review.
