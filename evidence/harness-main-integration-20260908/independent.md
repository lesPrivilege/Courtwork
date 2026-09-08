# Independent integration check · 2026-09-08

This check is limited to merge ancestry, product-byte preservation, and the
specific contract/documentation seam called out in the integration receipt. It
does not reread the full Fable design corpus or make a product-acceptance
claim.

## Inputs and ancestry

The checked integration node is `d60134ffd59ca09b35be83a69d2743314ff75b06`.
The expected inputs are main `8023e1bfda89ddad8fbf59d96f22a9f6bc40fed7`,
Harness Core `d6247a8e27dc512a00fd113c9fec9835d24d6594` (tested product bytes
`133269184468f1adf3b38acfc59091818daeb8e8`), and Fable
`99a9279868166c94e99fc2e396be551ef1fe3e53`. `git merge-base --is-ancestor`
returns success for all four relevant revisions (`8023e1b`, `d6247a8`,
`1332691`, and `99a9279`) against `d60134f`.

## Preservation checks

- `git diff --name-status 1332691..d60134f -- app tests` is empty. The merge
  therefore introduces no change to the tested Core product or its tests.
- `git diff --name-status 8023e1b..99a9279 -- app tests` is empty. Fable's
  contribution contains no application or test files; its contribution is
  documentation and dispatch material.
- `PAPER.md` has blob
  `5b13e0d875879e597e9e15d0fa09402b04aa76b0` at both `8023e1b` and `HEAD`.
  `LICENSE` has blob
  `17c7dfad2e83fe7d3fbde5b0039706f99ae078a6` at both revisions.
- The recorded clean-node checks in [README](README.md) report lockfile
  install success, `npm --prefix app test` 170/170, and smoke success. No
  product files changed after those recorded runs. This report independently
  checks the tree and ancestry; it does not relabel author-run tests as an
  independent full-suite run.

No merge-induced code, test, Paper, or license loss was found. The only merge
conflict was `engineering/current.md`; the resolved file retains the current
delivery facts and records the remaining frontend seam.

## Contract/documentation seam

The resolved contract states that `revise_candidate` creates a new candidate
with lineage while preserving the earlier candidate, Decision, and Artifact;
source revision leaves old candidates readable but stale for later decisions.
The corrected WK10b work order records the same behavior: a revision preserves
the prior Decision/Artifact, while a fresh decision based on stale candidate
base or source is refused. This wording is the basis for the second-segment
fixture and does not invalidate historical records.

The current packet advertises `action:"decide"` and its decision enum, while
the `revise_candidate` API already exists without a corresponding
`humanActions` declaration. The integration receipt and dispatch correction
leave that declaration/fixture as an explicit Astra follow-up before the
second-segment revision UI. Until then, the frontend must not invent the
missing action.

## Verdict

The two deliveries are ancestrally present and preserve the tested product
bytes, Paper, and license. The remaining item is the documented frontend
contract follow-up above; it is not evidence of merge loss.
