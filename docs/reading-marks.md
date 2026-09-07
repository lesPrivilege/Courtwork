# Restrained reading marks

2026-09-07 · selective intake of the user's Critical Edition UI reference.

The useful transfer is to make provenance and recorded intervention easier to distinguish while preserving the existing Navigator / Work / Inspector composition. This is a small presentation change; it introduces no domain state or review authority.

## Adopted

- Confirmed answers and explicit allow/deny decisions carry a thin intervention-colored rule on their existing collapsible history row. Pending requests and closed requests without a decision do not. Text still distinguishes the actual outcomes; color alone conveys no status. The rule is not a claim about the authenticated identity of an actor.
- An expanded write decision states its scope: permission for that exact write. Review acceptance is not recorded here.
- The file inspector carries a quiet provenance note above the document. A saved run version and a workspace read have distinct descriptions. When a current file was opened from a run, the note reports byte identity against that run's recorded SHA-256 and shows both abbreviated hashes. Full hashes and copy controls remain in Version details. Matching bytes imply neither correctness nor review acceptance.
- Narrow-screen resolved rows retain 44px targets. The note stays in reading order rather than creating another sidebar.

## Deferred

Canonical status, accept/reject, alternative claims, anchored marginal comments, actor seals and clause-level comparison require explicit data contracts. Current workspace contents are not promoted to canonical; run completion is not acceptance. A byte comparison is not a semantic diff. No invented confidence, approval badges or historical styling are introduced.

## Visual contract

`--intervention` is dedicated to the thin rule on recorded answer/decision rows. Existing danger tokens continue to mean errors and destructive operations. Model output, pending proposals, file content and ordinary provenance use their existing colors. There are no new ornaments, animations or panels. A later visual pass may tune this token without changing state semantics.

## Verification

Actual local browser: confirmed write disclosure, recorded file, and current file matching its recorded version at 390px; desktop file inspector also checked. The run/file controls and tab order remain the existing controls. Existing surface and receipt counterexamples pass 14/14. JavaScript syntax checks pass. No backend change or provider call was needed. The different-hash branch was reviewed in source, not exercised by changing the saved fixture in this pass. Accessibility assistive-technology testing remains outside this check.
