# Clean integration checkpoint — 2026-09-22

User explicitly authorizes settling delivered work, pushing main, then starting the next task from the pushed clean node. Product integration source is **7dc852a25643505dc41a109476fc6800e9f643fa** (M1 after accepted Preview/CDE/local Pi/Kit planner). The checkpoint's final documentation commit is the main SHA chosen for the push; no tag or product release is implied.

## Accounted state

- Accepted integrated owners: Preview lifecycle; C/D/E recovery; local Pi LP-R5; Kit K1/K2; [M1 final selection](../m1-final-20260922/README.md). Each retains exact source, evidence limits, original-owner disposition and restoration-verified ended-tree cleanup. RuntimeStore20/Core4/bridge5 remain the product baseline.
- **06e remains held**, branch claude-role-composer-20260922 at69f39a7, under the [A selection/06E-R1 return](../06e-selection-review-20260922/README.md). Its unaccepted specimen is not merged or included by pushing main, and the protected original tree is not deleted. This is named carry-forward work, not an unaccounted dirty change.
- Persistent Courtwork and Courtwork-legacy-frozen shared Git dependency remain. The three pre-existing untracked local metadata entries `.agents/`, `.obsidian/`, `skills-lock.json` are preserved and excluded from staging/push; no bytes are deleted or hidden to manufacture cleanliness. The committed main has no pending source changes.

## Checks

[Full synthetic suite](full-suite.log): **1538/1538, exit0**, one run after M1 integration. [Deterministic runtime smoke](smoke.log):exit0, real provider not run. The formerly intermittent candidate-create case passed in this run; earlier failures remain undiagnosed and are not retroactively called green or resource flakes. No further stress rerun is planned.

Repository links and screenshot publication readiness pass. Pending history has no blob over95MiB (largest under1MiB); the five declared historical fixture pins are ancestors of main, so a full-history clone includes them without publishing private archive refs. [Strong credential-pattern scan](tracked-history-check.json) covers1393 pending text blobs with no matches; it is a bounded check, not a guarantee of all possible secret formats. No personal credential store or secret value was read/output.

Push is ordinary fast-forward `origin/main` only, after fresh origin fetch showed no remote-only commits. No force-push, tags, archive refs, other branches, tracked-history rewrite or manual deployment. Runtime CI will follow repository configuration; Pages deploy is gated to workflow_dispatch and is not triggered by push.

## Next bounded task

[Kit→Run K3](../../kit-run-binding-20260922.md) is prepared from [Luna source intake and parent corrections](../kit-run-index-20260922/README.md). Only after push/remote SHA verification, start a new isolated Astra task from this node. The first integration is ordinary Chat/current in-process Pi via existing profile/CAS and Run owners, with exact retained context and real Host request proof using a deterministic provider. Schema21 is reserved for the proposed new persistence interpretation but is not implemented/adopted here.06e stays with its own frontend owner.

The push and new-task receipt will be recorded after those actions complete. This checkpoint does not claim real Kit UI selection, arbitrary-agent support, fullG4, production release or user data migration.


## Push, dispatch and generator correction

[Push log](push-checkpoint.log) records origin/main ea56db8→**678d71c58acc6968569a8850d39be404b19d4dfd**; a separate git ls-remote returned exactly that SHA. [Dispatch/CI receipt](push-and-dispatch.json) identifies the fresh task **Kit to Run · Host integration**,01a0c9a7-6aca-79b2-a578-da1414a73404, its same bf41 checkout/branch and verified base. The task reported K3-A complete and started its leased Host/Store work. No second checkout, source/schema adoption or live capability is implied by that progress.

The first push's [Pages build failed](pages-initial-failure.log): a863067 had updated both public README languages with the accepted offline Pi consumer paragraph, but omitted the English generation source. Parent's pre-push checks had verified links/capture readiness rather than a full site build, so they did not catch this consistency gap. It is not a screenshot gap or a need to weaken the build check.

**Correction:** add that exact existing English paragraph to site/src/readme.mjs. English README and its Chinese counterpart were already semantically aligned and remain byte-unchanged. No public capability claim or product source changes. [Fixed site build](pages-fixed-build.log) passes; [two builds match188 files](pages-determinism.json); material/figure checks,5/5 public-data/capture tests and188-file/296-reference link check pass. The corrective source and this receipt are committed/pushed as a follow-up, without rewriting history or rerunning unrelated backend tests. Remote CI remains separately observed; no deployment workflow was triggered.

Runtime CI run35744901028 subsequently completed successfully on678d71c. The user then explicitly excluded further Pages work; only the already completed README generator parity fix is retained, with no page redesign or deployment. [Claude/Codex implementation lanes](../../frontend-backend-live-integration-20260922.md) now permit the minimum actual frontend/backend integration in their separate owners.

The raw initial CI failure log preserves two whitespace-only timestamped lines; these are the sole intended staged whitespace exceptions in this follow-up. Source and authored prose checks pass.
