# Claude Fake report handoff · 2026-09-11

> **Scope correction:** this explicit-label package is operator-facing only. Do **not** pass it to the blind writer because its path and contents reveal the intended frame. The current Claude input is the neutral [`claude-independent-report-handoff-2026-09-11`](../claude-independent-report-handoff-2026-09-11/). Retained for audit and post-run comparison.

**Package status:** operator-facing explicit-label handoff retained for audit; do not provide to Claude.

This is the correct handoff for the requested deliverable: a clearly fictional, satirical technology report about the invented lab/vendor `les Privilege`. It is not a logo task. The package gathers the project facts, Paper concepts, brand fiction, character/name material, and attributed external context needed for a report while keeping the writer offline and inside this package.

## Deliverable

Claude should return a complete fictional report package in `out/`:

- `report.md`: the finished report, with headline, deck, body, section breaks, and a clear fiction/satire disclosure.
- `fact-ledger.md`: sentence-level or paragraph-level separation of Observed / Reported claim / Interpretation / Satire.
- `sources.md`: only the sources supplied in this package, with attribution and access limitations.
- `README.md`: title, word count, intended reading order, unresolved questions, and non-claims.

The report may adopt a credible institutional/news voice as an object of analysis, but it must not impersonate a real outlet, invent real employees or anonymous sources, or make unsupported allegations about Anthropic, OpenAI, DeepSeek, or any other real organization.

## Package contents

- [`CLAUDE-WORK-GUIDE.md`](CLAUDE-WORK-GUIDE.md): exact writing brief and stop conditions.
- [`network-policy.json`](network-policy.json): host-enforced offline/package-only policy.
- [`source-bundle/`](source-bundle/): self-contained report material.
- [`manifest.json`](manifest.json): allowlist and provenance.
- `out/`: reserved for Claude's report package; empty at handoff time.

## Boundary status

The policy is a host contract, not a security sandbox by itself. The runner must deny network, browser, shell, credentials, external messages, package installation, parent-repository access, and writes outside `out/`. If it cannot enforce those boundaries, Claude must return `NOT_RUN_BOUNDARY_UNAVAILABLE` without writing a report.

**Prepared from:** Courtwork `main@2337ada33f1d59543c33ac9e98fcacc5a9e34d21`; source conversation `6aa3cac2-0b64-83ec-86d3-f4556e2bee0e`; observation date 2026-09-11 Asia/Singapore.
