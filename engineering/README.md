# CourtWork engineering

CourtWork's current implementation, design, contracts and evidence are maintained on `main` of this repository; `Courtwork` is the only persistent development directory. The frozen legacy implementation is read only through the [legacy recall index](ecosystem/legacy-recall-index.md).

Before anything else, check the actual working directory, branch, HEAD and worktree state. Then read [current](current.md) and pick the row below that matches your task. Open raw sources, history or other packets only when a specific question needs them.

| When you need to… | Read | You can stop when you have |
|---|---|---|
| Know where things stand and who holds what | [current](current.md) | The baseline, the holder of your lane, and the next step for your thread |
| Change product code in any layer | [architecture](architecture.md) (change boundaries, module map) → the contract named in the module map → the owning task record → [verification](verification.md) | The fact owner, nearest precedent, applicable contract and the checks that could detect your failure |
| Change UI | [UX grammar](design/ux-grammar.md) → [frontend contract](design/agent-interface-2026-09-10/frontend-contract.md) and the relevant precedent entries → [visual-spatial grammar](design/visual-spatial-grammar.md) → [copy](design/copy-convention.md) | Surface role, grammar entries, precedent and the evidence to record |
| Work on runtime, Harness or Kits | [Runtime and Work](architecture-runtime-canon.md) → [RD-001](research/RD-001-runtime-adapter.md) → [Runtime Control](../docs/runtime-control/INDEX.md) → [app docs](../app/docs/README.md) | The port obligation or control-plane rule you touch |
| Work on Attention, dogfooding or Kit development | [Attention reading index](research/attention-assistant-20260927/INDEX.md) | The row's owner, implementation and evidence |
| Work on formal work state | [Work Core](../docs/work-core/README.md) → [core contracts](core-contracts.md) | The transition, actor and version rules involved |
| Claim something works or is accepted | [verification](verification.md) | The claim, its evidence type and what stays unverified |
| Consume a report, chat or external reference | [consuming inputs](governance.md#consuming-inputs) → [research index](research/README.md) | Each question's disposition and landing place |
| Publish README, Pages or media | [release](release/README.md) → [site](../site/README.md) → [public readiness](execution/2026-09-08-main-round/public-readiness.md) | The generator to edit and the pins that must stay consistent |
| Find out why something was decided | [decisions](decisions.md) → the linked research ruling → [archive](archive/README.md) | The ruling, what it replaced and why |
| See the long-term direction | [product direction](product-direction.md), [Long-life Roadmap](roadmap.md) | Direction only: neither is a list of current features |

How work is run, reviewed, recorded and retired: [governance](governance.md). Where material goes and how raw inputs are kept: [repository layout](../docs/repository-layout.md).

## Paper boundary

The root [PAPER.md](../PAPER.md) pins the adopted Schema Engineering version (DEC-012) with its full SHA and links the latest reading entry. Implementation, contracts and acceptance stay in CourtWork. A generalizable observation flows back to SE's Practice Index only when a pinned engineering result supports it; the paper is not copied here and no second revision ledger is kept.

## Directories

| Directory | Contents |
|---|---|
| [execution/](execution/README.md) | Assignments, contracts and delivery packets with their evidence |
| [design/](design/README.md) | Design contracts, grammar, sources, samples and comparisons |
| [research/](research/README.md) | Research questions, inputs, rulings and interface proposals |
| [reviews/](reviews/) | Independent reviews and their dispositions |
| [ecosystem/](ecosystem/README.md) | External references, upstream channels and legacy recall |
| [release/](release/README.md) | Public pages and publication |
| [mvp/](mvp/README.md) | Earlier UI / work-surface assignments and deliveries |
| [migration/](migration/README.md) | Repository and data migration records |
| [archive/](archive/README.md) | History that has left the default reading path |
| [evidence/](../evidence/README.md) | Verification and delivery records from before the execution packets held their own |
