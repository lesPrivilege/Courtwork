# K0 verification and finding disposition

Baseline product source: `f74ae1e5c010e5b35997d4a8bfbaff2d1053b951`. Scope: new K0 documents only. Author: Astra. Bounded non-author reviewer: Luna Max (`kit_owner_map`), read-only source exploration and contract review; no authorship of these documents. Parent architecture disposition remains separate.

Author reviewed the actual Runtime Control/source/compiler/Host call sites and the pinned upstream mechanisms identified in [source-map](source-map.md). The [contract](contract.md) and [consumer proposal](consumer-and-verification.md) contain future test obligations, not passed K1/K2 tests.

The [raw Luna review](luna-review.md.txt) names author commit `2c874cfe6c3a4d6f4f529c48229e713dac7871c5` plus a declared author delta. That exact delta was subsequently committed as `d5a69edfb66ec7108d12c4270d16bbc2c20746c5`: method name `inspect`, early no-Kit passthrough and scalar validation for every rendered string. These three corrections were author-found; they are not credited as independent discoveries.

| Review finding | Astra disposition | Implemented contract correction / evidence |
|---|---|---|
| K0-REQ-01 | **Adopt** | `contract.md`, minimal descriptor: requirements are restricted to non-content resources; a present content kind refuses even when optional. Content must use exact core/deferred pins. K1 matrix adds the bypass counterexample |
| K0-REV-01 | **Adopt** | `contract.md`, input runtime: Adapter evidence is explicit and unavailable from RuntimeBinding; consumer proposal requires freezing adapter ID/revision with the plan. A Run's separate adapter ID does not provide a revision |
| K0-SEG-01 | **Adopt** | `contract.md`, rendering step 3: prefix each non-first segment once and concatenate segment text with an empty separator. Exact sums count separators once |
| K0-CON-01 | **Adopt** | `contract.md`, conflict rule: only a selected target triggers refusal; a reciprocal declaration is unnecessary; an absent target does not refuse |

No finding creates another work order. These are author-disposed contract corrections, not independent product acceptance. No product tests, runtime process, model/provider call, browser service, native file injection, personal data operation or deployment is claimed.

## Author verification and handoff

- `node tools/check-doc-links.mjs`: pass; 1576 documents, 9077 checked links, no problems after the finding dispositions.
- `git diff --check` and staged `git diff --cached --check`: pass. Explicit paths only were staged; staged names were reviewed before each commit.
- Diff against `f74ae1e` is confined to this new K0 packet. Product, shared governance entry points, historical fixtures and schema files are byte-unchanged.
- Persistent checkout was reobserved at `main@f74ae1e` with the same three pre-existing untracked entries. No other worktree, service or native configuration was modified.

The isolated branch is retained for Parent Arch's concrete K0 disposition. K1/K2 have not begun, and no compiler behavior has been experimentally established here. Parent may select this reference-only contract or adjust it before releasing the named pure-module files. This completes the requested K0 source/contract delivery; it does not claim finite K2 completion, production Kit selection, main integration or capability acceptance.
