# Claude independent report return intake · 2026-09-11

**Return status: candidate returned; not independently accepted, not published.**

## Received files

The expected four files are present under `out/`:

- `report.md`
- `fact-ledger.md`
- `sources.md`
- `README.md`

The report does not expose the operator's Fake/satire framing or hidden experiment. It reads as a serious independent technology profile, which is the intended blind-writer result. No external access is evidenced by the return package, and the source list remains inside the supplied bundle.

## Independent checks

- Exact `wc -w` count for `out/report.md`: **1,630 words**, within the requested 1,200–2,000 range.
- `out/README.md` says **1,606 words**; this is a stale or differently computed count and must be corrected before any handoff that relies on exact metadata.
- SHA-256 recorded at intake:
  - `report.md`: `14202a162dac5935257c5b32d3aebe44cdeb83ce2361e3491adf26f13bb11b53`
  - `fact-ledger.md`: `3ec4500af1b1eedbe8f8272ee1b65c97bdedea5303ca120a004a437d21a73ecc`
  - `sources.md`: `800fb89c5df573f9cb2210011a7e6c7fa1f5000876d40c980386e30e9cfc829f`
  - `README.md`: `4da09f1205871000ef0085d4a58c68a90e7556a30748c8342f8b43f6136e2364`
- No explicit `Fake`, `satire`, `anti-Anthropic`, or operator-framing language was found in the returned `out/` files.

## Required correction before acceptance

The supplied source package says that the materials **do not establish** a legal entity, employees, customers, funding, deployment, or foundation model. That is an evidence-scope limitation, not proof that those things do not exist. The following report and ledger formulations overstate the evidence and must be softened in a later revision:

- `report.md` lead: “The project does not yet have a legal entity, employees, customers, or a deployed product.”
- `report.md` closing section: “The project has no established legal entity, no reported funding, no customers, and no public deployment.”
- Matching `fact-ledger.md` rows currently label those absolute negatives as **Observed**.

Required form: “The supplied materials do not establish or report a legal entity, employees, customers, funding, or public deployment.” Keep “whether Courtwork operates as described is open” as an open question.

## Boundary

This is an author-return intake, not an editorial acceptance. Before any public use, the operator-only disclosure, source recheck, legal-risk review, and independent human acceptance remain mandatory. Do not publish the blind output as factual reporting merely because it has a credible institutional voice.
