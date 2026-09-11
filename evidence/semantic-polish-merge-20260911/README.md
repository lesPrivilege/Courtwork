# Semantic polish / Pages integration · 2026-09-11

User-authorized sequence: review the mature Pages branches and their construction reasons; compare real rendered pages; integrate the App and Pages lines at a fixed node; have Luna capture actual merged-product states; then push and deploy. The older empty-slot publishing exception is not used for this release.

## Source and decisions

- Shared starting main: `590739fa3d1bc401905261172260143e36e82c5e`.
- App polish source: `f99af46`; final Pages source: `e12d2e1`. Their App trees are identical (`1bf4df93764cb54b490404d9b1c18b26b5c11261`). The earlier full 767/767 and smoke evidence is in [the polish delivery](../semantic-polish-20260911/README.md); it is not described as newly rerun here.
- [Branch review](pages-branch-review.md): old mature Pages patches already have source equivalents in main; no duplicate cherry-pick. Other retained branches do not supply an additional mature product patch.
- [Construction session review](pages-session-review.md): user goals and author decisions are separated, including the stronger Paper/Tour entrance and Runtime placement discretion.
- [First-principles visual adjudication](visual-ruling.md): rejected five-link / wholesale-Paper-fold proposal, retained useful Tour/copy changes, restored prior figure grouping, and corrected public execution wording.
- [Independent publication review](release-review.md): PR/RD/copy/icon/capture ownership and bounded final source checks. This is independent source review, distinct from author visual judgement.

## Evidence and capture preparation

[Comparison manifest](visual-diff-manifest.json) pins the real browser image format, dimensions, hashes and source phases. Earlier inaccurate PNG metadata was corrected without altering historical image bytes; [metadata verification](metadata-verification.json) records the proof. [Shared-worktree snapshot](shared-worktree-premerge.json) checks all 15 existing dirty files and incoming overlap.

[Fixture plan](fixture-plan.md) and [fixture script](capture-fixture.mjs) use fresh disposable data, HTTP → Pi → Core and a local deterministic provider. They do not mutate the DOM or database, contact a paid provider or manufacture domain capability. Data provenance remains synthetic in the evidence; visible sample documents use ordinary task language. A new clean checkout at the merged commit is required before the publication capture batch.

## Verification and publication boundary

Final layout build, 230 local references, 10 figures, material, semantic/copy checks and five capture/public-data tests pass. All three App UI lints pass. Author actual-browser comparisons include desktop Hero/cards/figures, 320 Home/Tour and 390 Tour/Get; the screenshots are candidate evidence, not independent product acceptance. Native VoiceOver/IME/forced-colors, no-JS and actual 200% zoom are not established by these comparisons.

At this receipt stage the new product capture batch is still pending. Final merge SHA, 26 light/dark capture records, source/current-media handoff, readiness, GitHub push/workflow and live URL verification are recorded by the subsequent completion receipt. No frontend/backend product gates are closed merely by this branch transition or deployment.
