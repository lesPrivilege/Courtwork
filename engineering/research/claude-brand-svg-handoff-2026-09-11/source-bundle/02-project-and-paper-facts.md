# 02 · Project and Paper facts

These notes provide semantic context for the visual task. They are not a request to implement product behaviour.

## Observed project boundaries

- Courtwork is a local-first Work Agent GUI whose stated separation is model generation, deterministic checking, and human confirmation/finalization.
- Current Work Core owns Matter, Candidate, Decision, Artifact, sources, and formal commitment state.
- Host, Runtime, GUI, and adapters may project or execute facts but are not a second accepted-work authority.
- Provider and Runtime are replacement axes; a model change should not silently change completion semantics.
- A successful tool call, completed Run, or visible UI control does not itself grant acceptance authority.
- Synthetic fixtures, screenshots, local checks, and published pages have their own evidence scope.

## Paper binding

Courtwork binds to Schema Engineering 9.6 / 2026-09-07 at commit `d78fd312955c1f594e59cbdcbb0d3074ac355940`. The Paper is maintained separately and its editable body is not copied into this package.

The relevant semantic split is: Matter is durable work; Session is temporary interaction; Run is an execution attempt; Context is a projection; model output is a proposal; deterministic invariants, evaluator measurement, and human authority remain distinct.

## Visual consequence

The mark may communicate a stance toward replaceability, evidence, and human authority as an interpretation. It must not claim that the product already proves those properties or that the identity grants authority.
