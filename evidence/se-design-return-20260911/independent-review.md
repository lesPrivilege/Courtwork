# Independent documentation review · Design return

Date: 2026-09-11 (Asia/Singapore). Reviewer: Luna Continuity. This is a bounded documentation consistency review only. I did not reread product source, run app tests, accept the return, or authorize implementation.

## Traceability and checks

- Review checkout: isolated Courtwork worktree, branch `codex/semantic-polish-prep-20260911`, `HEAD 3826eeb93c2bd4e5f8b9fbea13099efd1552846f`.
- The return documents cite product baseline `dbd1efe52d7a078cfdb8af03a82470135f31a9dd`; the reviewed `return-intake.md`, current/roadmap delta, source manifest, visual review, and consumption review are working-tree documentation around that baseline. The product source was not re-reviewed.
- `consumption-review.json` is structurally consistent: 45 rows, status `32 pass / 12 needs_revision / 1 unverified`, severity `27 low / 12 medium / 6 high`, and high-priority IDs `C05/C15/C16/C18/C23/C32` match its Markdown counterpart.
- `source-manifest.json` is valid and reports 66 verified archive members. The available `source.tar.gz` independently has 66 members and matches the recorded 3,497,170-byte SHA-256 `c4d33dcc2aa52e4c5e1f51fe9de0dd98c9eccde840f926b1b4e35d2839267313`.

## Result

**Bounded documentation review: conditional pass, with the findings below resolved before calling DR-01 complete.** The intake is explicit that the return is an adapted design direction and six implementation contracts; it does not turn boards into product capability, acceptance, or canonical assets. The visual review and consumption review preserve that same boundary, and the six work-order rows keep sample-only Rebuild, deferred capability, native/accessibility gaps, and post-implementation acceptance visible.

## Findings

1. **P1 · Capability evidence is referenced but absent.** `engineering/design/se-control-one-shot-2026-09-11/return-intake.md:3` and `engineering/research/se-control-design-return-2026-09-11/README.md:14` link `evidence/se-design-return-20260911/capability-review.md`, but that file (and a JSON companion) is absent in this checkout. The intake calls the capability review part of the ruling basis, while `engineering/current.md` says DR-01 source/ruling is delivered. Until the capability review arrives, keep DR-01 marked incomplete or explicitly “capability review pending”; do not imply the six-contract prerequisite has fully passed.

2. **P1 · Source citations will break after the planned source-directory removal.** `evidence/se-design-return-20260911/consumption-review.md:7` and `consumption-review.json:7` point to `engineering/research/se-control-design-return-2026-09-11/source/return-package/RETURN-design.md`. The stated handoff removes `source/` and retains only `source.tar.gz`. Update these locators to the archive form `source.tar.gz:return-package/RETURN-design.md` (and use `source-manifest.json` for byte/hash identity) before deleting the unpacked directory. The research README already uses the durable archive-relative paths, so this is a localized citation repair.

3. **P2 · DR-02/03/04 write ownership needs one file-level handoff.** The contracts say ownership must not expand and the queue is serial, but DR-02 includes “header wiring,” DR-03 includes necessary local CSS, and DR-04 owns `app.mjs` plus shared UI files. Header wiring and local CSS can touch the same `app.mjs`/CSS surfaces as DR-03/04. Before implementation, name the exact owner for each shared path or require an explicit handoff commit; otherwise “single writer” is an intent rather than a reviewable scope boundary.

## Scope disposition

The implementation boundary is otherwise clear and should be preserved: DR-01 is documentation/archive intake; DR-02 is glyph/header specimen work; DR-03 consumes existing Spark/Attention facts and typed actions; DR-04 handles Chat/Composer/Settings interaction deltas; DR-05 is an isolated Explore/Rebuild specimen with no new task store or POST/stop authority; DR-06 is Pages narrative/media work. `return-intake.md:44-55` correctly says these are contracts, not existing PRs or implemented features, and `current.md`/`roadmap.md` retain the unimplemented status for DR-02–06.

The review therefore supports consuming the return as a bounded design specimen and implementation plan after the missing capability receipt and archive citation are repaired. No product or source files were changed by this review.

## Resolution recheck · 2026-09-11

This is a narrow follow-up to the three findings above; no product source was reread and no app tests were rerun.

- The capability receipt is now present at `evidence/se-design-return-20260911/capability-review.md`. It identifies the candidate and states that it does not accept the return, approve merge, or close a product gate. Its findings keep Spark Rebuild, the Explore ladder, unavailable Chat intents, and static motion states bounded as sample or capability gaps. The former missing-evidence finding is resolved.
- `evidence/se-design-return-20260911/consumption-review.md:7` and `consumption-review.json:7` now cite `source.tar.gz:return-package/RETURN-design.md`, with `source-manifest.json` retaining member byte/hash identity. The former unpacked-source citation finding is resolved for the planned source-directory removal.
- `engineering/design/se-control-one-shot-2026-09-11/return-intake.md:55` now gives DR-02 exclusive header ownership of the shared `app.mjs`/CSS blocks, keeps DR-03 out of composer/header, and transfers shared write access to DR-04 only after the DR-03 handoff commit. It also requires each PR to record the handoff commit and unfinished work. The former shared-ownership ambiguity is resolved at the documentation-contract level.

**Final bounded disposition: pass for the documentation package as a design specimen and implementation plan.** The return remains conditional on the separate implementation and acceptance gates stated in the package; no canonical-asset, capability, native-host, or deployment claim is added by this recheck.
