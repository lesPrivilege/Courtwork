# Engineering migration records

This directory holds the one bounded migration record, from 2026-09-08, that brought the Fresh integration documents into this repository. It is history: it shows where migrated material came from and where retired paths went. It does not describe the current implementation or status ([current](../current.md)), and it is not a source for legacy recall, which goes through the [legacy recall index](../ecosystem/legacy-recall-index.md).

Effect labels: **accepted** = a record whose result is already carried elsewhere; **reference** = provenance material; **redirect** = the target of retired paths named in other documents.

## When to read it

- You followed a link to a retired path, such as `execution/next-round-plan-v4.md`, `execution/charter.md` or `execution/framework-v5-result.md`, named in [mvp](../mvp/README.md): go to the evidence index below.
- You need to know where a migrated document came from: start at the packet README, then its evidence index.

## Packet: [2026-09-08/](2026-09-08/README.md)

| Document | What it holds | Effect |
|---|---|---|
| [README.md](2026-09-08/README.md) | The bounded migration record: sources, public payload and final receipt | accepted |
| [evidence-index.md](2026-09-08/evidence-index.md) | Separation of public engineering documents from historical execution material; redirect target of retired paths | redirect |
| [se-courtwork-migration-adjudication.md](2026-09-08/se-courtwork-migration-adjudication.md) | Historical ruling on T0-T4, data boundary, lineage and Paper/PR duties; old absolute paths are source records | accepted |
| [claude-design-context.md](2026-09-08/claude-design-context.md) | Delegation context for the Fresh Design; a proposed input, not an accepted visual system | reference |
| [ui-design-polish-delivery.md](2026-09-08/ui-design-polish-delivery.md) | Delivery summary and untested boundaries of one UI polish delivery | accepted |
| [runtime-control-frontend-intake.md](2026-09-08/runtime-control-frontend-intake.md) | Runtime control frontend contract takeover record | accepted |
| [runtime-control-frontend-explore.md](2026-09-08/runtime-control-frontend-explore.md) | Read-only comparison with mature implementations; design input, not technology adoption | reference |
| [work-surface-kit-source.json](2026-09-08/work-surface-kit-source.json) | Source manifest for the work-surface kit | reference |
