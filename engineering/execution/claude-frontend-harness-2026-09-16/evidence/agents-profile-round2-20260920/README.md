# 06a corrected journey — independent acceptance

2026-09-20 · Astra accepts the **synthetic-adapter frontend journey**, source `aca21c88fff2fc2e582f8c52d23d840d4ce53c3c`, locally merged at `b98e8ae59c14b725f0b644b74c3b0b4348cab885`. Reviewed `0f76407` remains an ancestor. This neither exposes Agents in production Settings nor freezes proposed backend fields as implemented APIs.

## AP-R1…R6 disposition

Adopt the six corrections under the [original owner record](../../06a-agents-profile-journey-20260920.md). [Luna's bounded non-author source review](luna-review.md) and [22 seam tests, exit 0](luna-tests.log) verify navigation epochs, save/draft reconciliation, unavailable-runtime recovery, capability/permission states and proposed-versus-existing ownership. The actual combined main tree passes [28/28 seam and static-manifest tests, exit 0](integrated-tests.log). The author's 1260/1260 full-suite summary and unidentified historical failure retain their original provenance and limitations; no duplicate full suite was needed.

Astra independently used OpenAI computer use in a separate in-app-browser tab at 8899. [Served source hashes](browser/served-source.json) match `aca21c8`. Browser evidence:

- Failed Save returns focus to Save; a real Tab goes to Discard changes. [Screenshot](browser/01-failed-focus.png), [AX](browser/01-failed-focus.txt).
- Pi unavailable still permits Open → Work profile; switching to Hermes clears the blocker. Save confirms synthetic revision 5 and focuses the receipt. [Screenshot](browser/02-recovered.png), [AX](browser/02-recovered.txt).
- Host cannot save displays the adapter reason adjacent to disabled Save. [Screenshot](browser/03-read-only.png), [AX](browser/03-read-only.txt).
- Unreported Praxis permission and unsupported Hermes coding actions remain distinct, with a recovery explanation. [Screenshot](browser/04-permission-readings.png), [AX](browser/04-permission-readings.txt).
- During a slow Save, a real Tab moves focus to Back. Completion confirms revision 3 without stealing that focus. [AX](browser/05-no-focus-steal.txt).

The review tab is closed. No actual Host/provider/key/native runtime was accessed by this preview. The completed author preview was relocated from its ended tree to persistent main on the same port 8899. User dogfood Host 8787 is untouched by this relocation.

## Adjustments and boundaries

Luna's raw report repeats the candidate's old “order-11 handoff unaccepted” statement. That is stale at integration: [prepared handoff acceptance](../coding-dogfood-final-20260920/README.md) and [basic real coding completion](../real-dogfood-20260920/completion.md) are independently recorded. Preserve the original sequencing deviation; integration-time acceptance does not make the earlier start conforming.

Astra corrects two leftover descriptive cells in the delivery record: every fact has an existing owner, and the fixture now has seven scenarios. These are documentation consistency adjustments, not another implementation return.

List-refresh stale rows remain an explicit follow-up, assigned to Claude in the dogfood-friction batch. Native zoom, screen readers and long-label stress remain unexecuted. Prior Escape/focus-return evidence is retained at `0f76407`, not relabeled as a new capture. The proposed per-profile revision, active Run binding and composition save still need their existing backend owners before production integration. No backend API, schema, authentication or runtime-management capability is accepted here.

Local merge is complete. Preservation/cleanup is recorded separately below when verified. No push or deployment; heartbeat stays paused.

## Merge and preservation completion

[The preservation receipt](preservation.json) records the actual `b98e8ae` merge, both ended 06a tree HEADs/refs, full tracked/untracked/ignored byte inventories, patch/unique-commit records, hash manifests and physically restored file archives. A verified incremental Git bundle was fetched into the previously restored repository and passed connectivity checks. Both trees matched their snapshots immediately before removal and had no unconsumed commits; both were then removed and the consumed author branch deleted. Archive refs remain. Courtwork and the frozen shared-Git dependency remain registered. The real 8787 Host/data and both synthetic repositories are preserved; 8899 is served from main. No Git-root migration, key copy, push or deployment occurred.
