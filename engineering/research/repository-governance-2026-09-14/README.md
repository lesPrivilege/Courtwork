# Repository governance proposal · local cross-check

2026-09-14 · bounded local cross-check and follow-up. The comparison below records the earlier source review; no external research, product edit, or owner-rule change was performed. The final section records Astra's separate ruling and the authorized PR-template addition. The source checkout for the comparison was `codex/release-final-20260913` at `fd96f96bc40725e301a4c92e0f2f50fd3245458c`.

## Input

[Verbatim user input](input.md) · 447 lines / 12,488 bytes · SHA-256 `05dffaa0630f8b486e8e863ae73af1021b0340be24f76b2bf0749a95a2b525af`.

The input says its author used Exa to inspect about 40 results, then presents claims about OpenAI/Codex, GitHub Copilot, Amsterdam Design System, Canonical Pragma, AWS ADR guidance, and other external systems. Those statements are preserved as supplied and **not independently verified or used as authority** here.

## Local comparison

| Proposed layer | Existing local entry | Finding |
|---|---|---|
| Knowledge registry | Root [README](../../../README.md) and [engineering index](../../README.md); domain indices under `engineering/`; `engineering/current.md` owns current status. | The repository already has a human-readable index and task-specific owner entry points. It is not a machine-readable path-to-contract registry. That difference alone does not establish a practical gap. |
| Standing contract | Root [AGENTS.md](../../../AGENTS.md). It requires checking branch/HEAD, reading current status then the relevant assignment/contract/evidence, preserving other writers, and routes UI work through UX Grammar, frontend contract and relevant precedent. Astra owns architecture/integration decisions. | Already provides concise standing behavior and points to sources of truth. Do not copy contracts into it or multiply its steps into a second agent prompt. |
| Scoped contracts | Root README's development entry and `AGENTS.md` direct UI work to [UX Grammar](../../design/ux-grammar.md), the [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md) and relevant precedent. Runtime, Work, Core, product, release and migration facts each retain their owner documents. | Path-specific source selection exists as a human workflow. No evidence from this input requires child `AGENTS.md` files in every subsystem. |
| Change contract | The UI [change template](../../design/agent-interface-2026-09-10/change-template.md) already records task/scope/base SHA, owner facts, semantic/control/placement effects, applicable UX rules, persistent-copy purpose/disclosure, action result/recovery, precedent/evidence, new terms/registrations, fixtures, scene coverage, exact checks, author/reviewer scope, and remaining work. | This is already a substantial task-local compilation format for UI changes. There is no repository-wide change-contract schema in the compared files. A universal schema is not justified without a demonstrated recurring miss in non-UI work. |
| Verification | [Verification selection](../../verification.md) maps risks to evidence, chooses the cheapest check able to detect the failure, separates deterministic UI from real harness capability, requires exact command/evidence and limits, and says not to repeat a full suite without new risk. Root [README](../../../README.md) retains concrete local commands. | This already supplies risk-based verification and the necessary evidence fields. It explicitly rejects fixed screenshot/token-saving targets, new test frameworks, blanket full suites, and helper-level approval forms. |
| PR handoff | `.github/` currently contains workflows but no reusable pull-request template. [`pull-request.md`](../multi-experts-2026-09-10/pull-request.md) is a body for one historical research change, not a general form. | This is the only objectively absent artifact among the named entry points. Whether a reusable PR form is needed is a local product/process choice, not something established by the external citations. |

## Minimum possible gap

There is no governance-layer blocker for the release work. At review time, the only objectively absent artifact among the named entry points was a reusable PR template. Its minimum form links to the task/change record and asks for problem/behavior change; applicable owner, nearest precedent and task record; new semantics/registrations or “None”; verification evidence and limits; author and independent review scope. UI changes link to the existing change template rather than repeat its fields. Astra's follow-up ruling below resolves the optional proposal.

No evidence here calls for a `registry.yaml` plus resolver CLI, a universal change-contract schema, child agent instructions in every directory, A0–A3 significance taxonomy, automated semantic/style CI gate, or mandated four-agent sequence. They would introduce new machinery and definitions before a concrete recurring failure has been shown. Deterministic repository checks may be automated when their contract is stable; semantic, architecture and visual judgment stays with the existing owners and review paths.

The attachment's proposed single linear authority order is also not locally established. Current rules preserve domain/service ownership of facts and authority, while architecture decisions and UI grammar have distinct owners. A new universal hierarchy should not be inferred from this external proposal.

## Astra ruling · 2026-09-14

Astra adopts the existing workflow: one source of truth per owner; retrieve the relevant entry points by task; use the nearest implemented precedent; and keep executable checks separate from semantic and visual judgment. The sole new mechanism is the short, manual [PR template](../../../.github/pull_request_template.md), with five asks: problem and behavior change; applicable owner, nearest precedent and task record; new semantics/registrations or “None”; verification evidence and limits; author and independent reviewer responsibilities. It links the existing UI change template and risk-based verification guidance rather than duplicating either.

This template is a handoff aid, not a new owner contract, automated report or release gate. No YAML resolver, universal schema, child `AGENTS.md` files, new significance levels or mandatory four-agent sequence is added. Owner authority and verification rules remain in their current sources; no additional owner rule changed.
