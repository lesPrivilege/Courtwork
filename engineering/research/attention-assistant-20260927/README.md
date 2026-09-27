# Attention Assistant and Dogfooding Kit intake

2026-09-27 · Source: “定义 Attention Assistant” · Exploration: Luna · Decision owner: Astra.

**Decision:** select Hermes as the first integration-research candidate for the next Attention-specific case. Keep Attention a CW role independent of runtime lifecycle; retain Core state and Host authority. Adopt a documentation-first Dogfooding Kit approach using the existing map, contracts, tools and verification records. This intake implements that reading structure, not a Hermes adapter or executable Kit.

## Read only what the task needs

| Need | Read next | Stop condition |
|---|---|---|
| Find the right owner or next implementation seam | [Task index](INDEX.md) | Owner, contract and bounded checks identified |
| Understand Attention and the Hermes choice | [Attention summary](attention-summary.md) | Role, runtime and formal-state boundaries clear |
| Develop CW using its existing harness | [Dogfooding summary](dogfooding-summary.md) | Map → grammar → tools → gates route clear |
| Resolve a proposal or apparent conflict | [Astra decisions](decisions.md) | Disposition, reason and existing owner found |
| Verify a quote, external mechanism or source limit | [Source index](source-index.md) | Exact source found; do not default-load the archive |

This is L0. Topic summaries provide L1 and optional L2 expansions. The index routes to current owners; it is not a second current-status page, contract, roadmap or automatic context loader. Current implementation remains in [engineering/current](../../current.md).

## Source completeness and evidence

The returned conversation contains **4 turns / 8 messages**, with `hasMore:false` and no next cursor. Both exported screenshots were retrieved, preserved and visually inspected by Astra. Original API text, chronological reading copies, IDs, text hashes and attachment hashes are retained in the [manifest](source/manifest.json). This establishes completeness of the returned API page; it does not establish that upstream search logs or linked pages were attached.

Luna supplied two bounded reports, retained byte-for-byte: [runtime exploration](explore/luna-runtime.md.txt) and [development/disclosure exploration](explore/luna-dogfood.md.txt), with [hashes](explore/manifest.json). Read the parent corrections in [decisions](decisions.md) before using their dated coordinates. Luna's focused Kit/Profile checks passed **103/103** on the existing baseline; that is evidence for existing behavior, not acceptance of this proposed integration.

No product code, schema, dependency, native configuration, credential store, provider, user Host or UI changed. Public source inspection is not runtime execution. No Hermes integration, live connector, scheduler, path-trigger loader, generic Kit catalog, or product closure is claimed.

## Intake verification

Astra recomputed the raw API SHA-256, all eight source-message hashes, all four verbatim reading copies, both attachment hashes/sizes and both preserved Luna-report hashes. The terminal page has no continuation. Repository documentation validation passed (1,685 documents / 10,162 local links, zero broken targets); Whitespace checks pass for authored documentation. The full staged check reports 11 trailing-space lines in verbatim source/report copies (Markdown hard breaks); those original bytes are intentionally preserved. These checks validate source integrity and discoverability, not the truth of quoted external claims. No full product suite or browser test was rerun for this documentation-only change.

Luna's final bounded read-only review of the six curated documents and owner-pointer diff found no actionable issues: P03/Kit facts, research-only adoption boundaries, source qualification and task routes were consistent. This is documentation consistency review, not independent acceptance of a future runtime or Kit implementation.
