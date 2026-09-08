# SE hot-plug document review

**Date:** 2026-09-08  
**Scope:** bounded read-only review of the current CourtWork-fresh research package and its linked roadmap/current and Work Surface Kit material. Reviewed the current README, PR plan, validation gate, roadmap/current, local-seams evidence, paper-validation evidence, upstream evidence, and linked work-order/contract files against fresh HEAD `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`.

## Checks

- Local Markdown links in the reviewed README/PR plan/validation/roadmap/current set: **31 checked, 0 missing**. Anchor targets were not independently validated.
- `git diff --check`: **passed (exit 0)**.
- Product/runtime source remained unchanged relative to the reviewed fresh HEAD. This review made no project-file changes; this report is the only output written by this review.
- Runtime or provider tests were not rerun in this document-only review. Existing evidence and the repository's recorded test result remain the basis for runtime claims.

## Findings

### 1. Clarify the C01–C06 coverage claim before handoff

`engineering/research/experts-hotplug-2026-09-08/README.md:85` says that C01–C06 are already carried by the existing Work Extension, Candidate/Committed, Authority/Review, State/History, and compatibility boundaries. The same document identifies unresolved gaps around C02 per-rule state, C06 executable unload, and producer-absent/fallback behavior (`README.md:42,65,71`). Read together, the current wording can be read as claiming that the six claims are implemented and evidenced, although the plan still schedules these gaps as work and tests.

Suggested wording: “C01–C06 have corresponding conceptual boundaries in the existing model; C02 per-rule state, C06 executable teardown, and producer-absent historical fallback remain implementation/evidence gaps. No new Expert ontology is required at this stage.” Keep the current candidate and validation gates separate from the fixed Paper baseline.

**Impact:** without this edit, a reader may skip the H1/H3/H4 work or treat a conceptual mapping as an acceptance result.

### 2. Separate the action and projection seams in the PR plan

`engineering/research/experts-hotplug-2026-09-08/pr-plan.md:27` describes the extension-specific `/sessions/:id/actions` entry as a place for a typed “action/query,” while the current server seam accepts action mutations there and exposes read projection through `/sessions/:id/surface`. A query is not currently available through the action POST contract. The README's related wording (`README.md:32`) should use the same distinction.

Suggested wording: “Use `/sessions/:id/actions` for typed domain mutations and `/sessions/:id/surface` for read projections; add a query action only if a later implementation explicitly extends the contract.”

**Impact:** this prevents H3 implementers from designing an unplanned generic query endpoint or confusing host artifact/runtime projection with accepted domain state.

### 3. Normalize copied source-coordinate punctuation in local-seams evidence

`engineering/research/experts-hotplug-2026-09-08/evidence/local-seams.md` contains copied coordinates with malformed trailing punctuation, including `194-200));`, `core.py:746-831).`, `decide),`, and `inspector.mjs:90-171),`. These are editorial defects rather than runtime findings, but they make the evidence harder to locate and reduce confidence in the report. Normalize them before treating the file as a durable handoff reference.

## Status

The package is suitable for a documentation handoff after the two semantic clarifications above and the coordinate cleanup. The research validation correctly keeps proposed experiments, candidate Paper text, and executed evidence separate; the outstanding implementation claims should remain explicitly conditional on the planned gates.
