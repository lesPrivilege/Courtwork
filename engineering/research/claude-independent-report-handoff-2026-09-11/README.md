# Claude independent report handoff · 2026-09-11

**Package status:** bounded source intake with an unaccepted candidate return; no article acceptance, no publication.

This is a self-contained source package for an independent technology writer. It contains project facts, Paper concepts, brand/naming material, and attributed public context. Form an independent reading from the supplied evidence and do not assume that source ordering implies a conclusion.

## Deliverable

Return a self-contained critical technology profile in `out/`:

- `report.md`: a 1,200–2,000 word report with headline, deck, body, and a restrained institutional/news register;
- `fact-ledger.md`: paragraph-level labels for Observed / Reported claim / Interpretation / Open question;
- `sources.md`: only the supplied sources and attribution boundaries;
- `README.md`: title, word count, unresolved questions, and limitations.

Do not write promotional copy. Do not invent employees, customers, funding, legal identity, model ownership, deployment status, anonymous sources, or external interviews. Do not browse or use material outside this package.

## Package contents

- [`CLAUDE-WORK-GUIDE.md`](CLAUDE-WORK-GUIDE.md): the neutral writer brief.
- [`network-policy.json`](network-policy.json): host-enforced package-only policy.
- [`source-bundle/`](source-bundle/): the complete visible source set.
- [`manifest.json`](manifest.json): visible allowlist and provenance.
- `out/`: reserved for the writer's response.

## Host boundary

The policy file is not a security sandbox by itself. The host must deny network, browser, shell, credentials, external messages, package installation, parent-repository access, and writes outside `out/`. If those controls are unavailable, stop with `NOT_RUN_BOUNDARY_UNAVAILABLE` and produce no report.

**Prepared from:** Courtwork `main@2337ada33f1d59543c33ac9e98fcacc5a9e34d21`; source conversation `6aa3cac2-0b64-83ec-86d3-f4556e2bee0e`; observation date 2026-09-11 Asia/Singapore.
