# Claude brand SVG handoff · 2026-09-11

> **Scope correction:** this handoff was prepared from an earlier misreading of the requested deliverable. It is superseded by [`claude-fakesnews-report-handoff-2026-09-11`](../claude-fakesnews-report-handoff-2026-09-11/). Retained for traceability; do not pass it to Claude for the current task.

**Package status:** self-contained handoff prepared; no Claude run, no asset acceptance, no product integration, and no deployment.

This directory is the only intended input surface for a bounded Claude brand/SVG task. It contains the current mark geometry, the relevant project and Paper facts, the latest user-authored naming and semiotic material, and an explicit offline work policy. It does not require the parent repository, ChatGPT history, credentials, or internet access.

## Package contents

- [`CLAUDE-WORK-GUIDE.md`](CLAUDE-WORK-GUIDE.md): the task brief and response contract to give Claude.
- [`network-policy.json`](network-policy.json): host-enforced boundary proposal; documentation alone is not a sandbox.
- [`source-bundle/`](source-bundle/): self-contained facts, creative inputs, external-context summaries, and labels.
- [`references/`](references/): two current SVG geometry references copied into this package as offline inputs.
- [`manifest.json`](manifest.json): file allowlist, provenance and checksums.
- `out/`: reserved for Claude's returned candidate package; empty at handoff time.

## Scope

The task is a bounded brand study for `les Privilege`: produce zero-dependency SVG candidate(s) and a short rationale while preserving the distinction between observed geometry, user-authored creative direction, interpretation, and unresolved questions. The task is not a claim that `les Privilege` is a real operating company, not a request to imitate Anthropic's mark, and not authorization to modify Courtwork, Paper, product UI, or deployment.

The package includes fictional/editorial material because it is part of the supplied creative brief. Any such material must remain labelled as fiction or interpretation in Claude's output. It must not become a factual claim about Anthropic, OpenAI, DeepSeek, a real person, a registered company, or a real event.

## Boundary status

The policy is ready to pass to a host runner. The host must enforce the allowlist and deny network/tools; Claude cannot enforce a filesystem or network boundary from prose alone. If the host cannot provide those controls, stop and return `NOT_RUN_BOUNDARY_UNAVAILABLE` rather than proceeding with a weaker implied sandbox.

**Prepared from:** Courtwork `main@2337ada33f1d59543c33ac9e98fcacc5a9e34d21`; source conversation `6aa3cac2-0b64-83ec-86d3-f4556e2bee0e`; observation date 2026-09-11 Asia/Singapore.
