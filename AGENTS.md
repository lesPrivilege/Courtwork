# CourtWork · working agreement

The sole persistent development entry is `Courtwork`. Read the actual branch and HEAD before work; do not use `Courtwork-fresh` as an active checkout or register Fresh as a separate development line. Legacy Courtwork is a frozen source, not the implementation or governance authority. Read `engineering/current.md`, then the relevant assignment/contract and evidence. `PAPER.md` pins the separate SE doctrine source.

## Work and review

- Check cwd, branch, HEAD, worktree status and the relevant delivery before acting. Do not infer current state from an old chat or clean working tree alone.
- Astra owns architecture, integration and migration decisions; Luna may research, implement bounded assignments, or independently verify another author's work. Authors do not claim independent acceptance of their own code.
- Honor explicit user scope and existing authorization. Continue reversible, authorized work without inventing repeated approval gates. Do not send external messages without user authorization.
- Preserve other writers' edits. Use isolated worktrees and independent synthetic data/ports; never checkout, stash or reset an active shared UI checkout.
- Keep state/evidence ownership in the existing service/domain contracts. UI and brand motion display facts; they do not confer authority or formal acceptance.
- Before product edits, record the affected responsibility, owner, nearest precedent and any necessary cross-layer changes in the existing task record; apply `engineering/architecture.md`'s change-boundary rules. Scale the explanation to the change, without adding an approval step.
- Dispose of review findings in the original task/owner record as adopt, adjust, reject or defer, with a reason and implementation/evidence entry. Review IDs locate inputs; they do not create another roadmap.
- `engineering/current.md` owns current project status; contracts/RD own their specific facts. `brand/` is a separately usable zero-dependency SVG package. SE's filesystem directory maintains papers, not product tickets.
- For UI work, read `engineering/design/ux-grammar.md`, then `engineering/design/agent-interface-2026-09-10/frontend-contract.md` and load only the relevant entries from its precedent index. Record the nearest implemented precedent, affected grammar and verification evidence; review semantics remain independent of skin.

## Documentation language

- English is the default authoring language. Keep `README.md` as the English entry point and `README.zh-CN.md` as its Simplified Chinese counterpart, with reciprocal language links. Update both in the same change when shared content changes; commands, links, capability scope, and version facts must stay aligned.
- Prefer English for new and substantially revised secondary documentation, including architecture, Design/UX, API, contracts, module READMEs, and engineering guidance. Chinese explanations or translations may supplement English when useful; a bilingual copy is not required for every document.
- Migrate existing Chinese documentation incrementally when relevant to the work. Preserve historical records, evidence, source transcripts, and quotations in their original language and bytes; add an English summary separately when needed. Language changes do not change contract authority, acceptance, or implementation status.

## Verification and Git

- Choose checks through `engineering/verification.md` for the actual change; green tests do not confer architecture or capability acceptance. Runtime/UI baseline commands are in README; use independent fixtures for migration/recovery and do not run paid providers by default.
- Host RuntimeStore schema 15 and Core user schema 4 / bridge app schema 5 evolve separately; see `engineering/architecture.md` and their store/bridge migration owners. Upgraded data must not be shared with an old host. Credentials and mutable session/workspace data stay outside Git. Do not inspect or copy personal credential stores.
- Stage explicit paths and review `git diff --cached --name-only`; no `git add .`/`git add -A`. Do not rewrite shared history.
- Keep source/evidence paths portable in active documentation. Preserve historical archive bytes and provenance; use frozen SHA + path for legacy recall.
- When changing schema, supported capabilities or release sources, synchronize the affected current entry points under `engineering/verification.md`; preserve historical evidence identities and explicitly pinned adoption versions.
- The user authorized main takeover on 2026-09-08 before the remaining product gates. Continue those gates as engineering work; a branch transition does not claim product acceptance or authorize deployment. See `evidence/main-cutover-20260908/README.md`.
- This implementation is the Courtwork main line. Frozen legacy SHA/tag/archive remain read-only sources. Legacy recall uses a fixed SHA and explicit path through the index, never implicit inheritance. Fresh is a retired migration label.

## Workspace continuity

The existing SE task/project space may remain the discussion home, with `Courtwork` as the sole persistent product code folder and SE Papers attached separately. Repository files and exact evidence links are the durable handoff; a project label does not guarantee all prior transcripts are automatically in context. Do not attach or search the legacy working tree by default.
