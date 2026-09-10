# Work Continuity Evals

Can the next executor identify what remains valid and continue the work?

| Evaluation | Why it exists | Entry |
|---|---|---|
| Continuity | Sources change, requests repeat, executions end. Work still needs a valid next step. | [Synthetic suite](continuity/README.md) |
| Core State Machine | Individually safe actions can interact in unexpected orders. | [Design](../engineering/execution/2026-09-10-benchmark-series/bm-03.md) |
| Fault & Replay | A missing response leaves the caller uncertain whether work committed. | [Design](../engineering/execution/2026-09-10-benchmark-series/bm-04.md) |
| Disclosure | A fresh executor needs relevant, current information to act correctly. | [Design](../engineering/execution/2026-09-10-benchmark-series/bm-05.md) |

[Evaluation contract](SPEC.md) · [Implementation series](../engineering/execution/2026-09-10-benchmark-series/README.md) · [Evidence](../evidence/README.md)

Continuity currently uses synthetic development data and deterministic clients. The remaining families have design contracts. Results grow here as experiments are implemented.
