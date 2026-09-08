# Long-life roadmap final review

**Date:** 2026-09-08 (Asia/Singapore)  
**Checkout:** `/Users/lesprivilege/Projects/Courtwork-fresh`  
**Branch / baseline:** `codex/fresh-courtwork` / `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`

## Result

**PASS for the bounded documentation review.** The revised `engineering/roadmap.md` now clearly labels itself as long-term architecture, keeps R0–R5 separate from PT0–PT9, distinguishes design from current implementation, and covers the requested scenario/interaction/deployment axes. The new §6 sidecar rule also makes the external system-of-record owner and receipt authoritative, while preventing stale local snapshots from overwriting it (`engineering/roadmap.md:110-123`).

The existing Experts/NDA route remains compatible: `engineering/research/experts-hotplug-2026-09-08/README.md:95` links to `../../roadmap.md#nda--experts-验证路径`, and `engineering/roadmap.md:171` has the corresponding heading. The heading slug is `nda--experts-验证路径`.

## Verification evidence

- `git diff --check`: passed (exit 0).
- Local-link/anchor scan over the changed roadmap, architecture, contracts, current/pre-takeover docs, Long-life evidence files, and Experts README: 69 Markdown links checked; 0 missing paths or anchors.
- No product source, Paper, or project file was modified by this review. The worktree still contains the pre-existing WSK/research modifications and untracked planning material.

## Findings

### No blocking semantic contradiction found

- `engineering/current.md:25-26` explicitly records the Experts and Long-life work as research/design delivery and leaves the new NDA behavior, producer-absent fallback, paired experiments, and stage gates unimplemented or unaccepted.
- `engineering/roadmap.md:68-70` accurately keeps the existing Core/runtime seams as a starting point while naming cross-session Matter attachment, durable async/effect reconciliation, unload fallback, and related gaps.
- `engineering/research/longlife-2026-09-08/README.md:5,16,41` preserves the fixed 9.3 baseline, treats 9.6 as an uncommitted candidate, and does not turn the roadmap or external mechanism notes into implementation/acceptance claims.
- `engineering/pre-takeover-roadmap.md:126-151` now labels the old position as a historical snapshot and explains the DEC-009 replacement of the former Core-read-only restriction.

### Non-blocking traceability note

`engineering/research/longlife-2026-09-08/evidence/paper-coverage.md:220` uses the illustrative command `git show f8ec...:papers/src/...`; it would be more reproducible to name the exact fixed files (`papers/src/canonical.md`, `papers/src/practice.md`, and `papers/src/practice-index.md`). The surrounding fixed/candidate version boundary is otherwise explicit, and this does not change the roadmap’s semantic scope.

## Not checked

No product tests, runtime experiments, provider calls, or full-paper revalidation were performed in this final review. The report therefore validates document consistency and traceability for the bounded scope, not implementation acceptance or any R/PT gate.
