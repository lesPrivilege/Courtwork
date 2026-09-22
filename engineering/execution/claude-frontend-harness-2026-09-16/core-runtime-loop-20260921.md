# Claude author loop · P03-C → D → E

2026-09-21 · User-authorized finite long-running backend task. Astra freezes architecture and integrates; Claude/Fable is the core author, with bounded Sonnet source exploration when useful. [Luna's traceable index](evidence/core-loop-index-20260921/README.md) precedes implementation. Observed main `b714c08`; 06d has a separate active frontend tree `courtwork-tabbed-preview-20260921` and must not be duplicated or changed.

## Working mode

Continuously repeat **read the next contract/evidence → choose one missing seam → write a counterexample → implement → run selected checks → record exact source/evidence → commit the finite milestone → continue the next authorized stage**. This is a finite implementation loop, not a periodic `/loop` timer, daemon, automation or permission to spawn endless retries. Stop when the authorized offline C/D/E handoff is complete, when a material unresolved contract blocks dependent work, or when explicitly stopped.

The latest user authorization lets Claude choose asynchronous test/exploration timing and continue C→D→E on its isolated author branch after the preceding author checks and milestone commit. Do not stop merely to ask whether to continue routine work. This supersedes older transport-stage wording requiring a human reply before every next author increment. It does **not** confer independent acceptance: Codex reviews each fixed milestone and alone merges main. Incorporate returns in the same owner/branch without rewriting reviewed history. No automatic push, deployment, cleanup deletion or user Host restart.

One product writer owns this backend lane. Exploration and isolated tests may run asynchronously when independent; no overlapping writers in service/store/runtime modules. Keep raw subprocess exit codes and complete useful failure evidence. Wait for dependent results before acting on them. Do not run competing full suites or repeat a green suite without changed source/new evidence. Do not end with a plan when the next implementation step is already authorized.

## Ordered stages and handoff

| Stage | Work / completion evidence |
|---|---|
| C0: implementation note | Read actual branch/state/index and [the minimum Host contract](p03c-host-consumer-contract-20260921.md). Record exact strict types, transition table, migration and chosen native evidence. This is an implementation note within the frozen rules, not another architecture campaign. |
| C: Host governed-read consumer | Reuse accepted Pi Port, Agents adapter and SDK transport. Narrow function-declaration forwarding; durable remote binding, intent/call/result receipts; one actual service-path repo_read and same-session continuation, plus required negative cases. Commit source and offline evidence. Do not label this the account-authorized live C milestone. |
| D: failure and recovery | Extend the same owner with observation recovery, cancellation confirmation, lost replies/restart/late/duplicate observations and fail-closed unresolved outcomes. Persisted read results are reused only under the established operation semantics; tools are never blindly rerun. Commit a fault matrix and bounded deterministic process evidence. |
| E: same repository read/write/check | Reuse the already accepted candidate write/check implementation and permission identity. Drive an exact synthetic write → approval → fixed check → matching result/diff/reopen, and deny/stale/revoked/cancel/unknown cases, against both the unchanged Pi baseline and new consumer. Commit parity evidence; return frontend contract gaps as small owner proposals rather than edit 06d. |

Use real production service/Store/SDK wiring with injected loopback native responses, disposable repositories/data and checked-free ports. No paid Agents call, user key lookup or credential migration. The user's DeepSeek dogfood connection is not an Agents API account grant. Claude authoring itself uses the explicitly requested installed Claude channel; do not initiate provider experiments to fill the live milestone. Capability exposure stays unavailable until its own live proof exists.

## Files and boundaries

Own `app/server/service.mjs`, `store.mjs`, `runtime.mjs`, the thin Agents Host adapter/gateway and accepted transport/adapter extensions, plus directly related tests/fixtures and original contract/evidence documentation. Preserve Pi internals except a proven shared-port compatibility adjustment with regression evidence. Reuse repository/candidate/check owners; do not fork them. Record cross-layer reasons before edits.

Do not change `app/web/**`, 06d files, browser/shell packages, live Settings, global provider configuration, native Pi/Hermes configuration, Work Core/bridge schema or the frozen Git root. A required shared route/allowlist/documentation hunk must be explicit and isolated. Schema/version changes synchronize their source entry points and bilingual README where applicable; preserve other writers' changes. Do not update `engineering/current.md` or integration/acceptance records as though you were the integrator; write your progress in this task's author record.

A provider/native guarantee that evidence cannot establish is unknown. A materially different owner, permission model, schema topology or required SDK/runtime upgrade goes to Astra with a concrete counterexample and alternatives; continue independent safe checks while that dependency waits. Do not silently broaden the contract, weaken tests, fabricate native facts or turn simulated support into production availability.

## Durable progress and stop report

Keep `engineering/execution/claude-frontend-harness-2026-09-16/evidence/core-runtime-loop-20260921/author-status.md` current at milestones: branch/base/current source SHA, claimed files, current stage, source references consumed, running jobs and their owned ports/data, passed/failed/unexecuted checks, next step and open decisions. No credentials or unbounded telemetry. Commit bounded source/evidence milestones; never `git add .`/`git add -A` or rewrite shared history.

Final handoff names exact C/D/E commits, production paths exercised, author versus independent evidence, retained unknowns, migration/rollback limitations and writer release. Stop owned test processes. Preserve branch, worktree, untracked and non-regenerable ignored content for Codex's integration and restore-verified cleanup. Do not claim complete live C, formal Work acceptance or product browser support from this offline author loop.

Core bridge reliability, local Pi workers and Runtime-management backend remain follow-on scopes, not additional parallel product writers. If a reproducible bridge defect blocks the chosen tests, record and repair only the smallest necessary existing-owner defect; no unrelated soak campaign or blanket timeout increase.


## C/D/E author handoff reviewed — 2026-09-22

Author C eec2244, D37a14a5, E2978f5a, packet45ae12e complete offline and released. [Parent review and seven decisions](evidence/core-cde-review-20260922/README.md) hold integration for **CDE-R1**: native terminal must not resolve execution-unknown local calls without Host-effect evidence. Luna32/32 is retained with an executable counterexample; author1421/1421 is not independent acceptance. Return only the scoped correction/service-path proof in the same branch. ArtifactHistory retention and read-only turns.retrieve are adopted;16KiB argument ceiling remains, so E is bounded parity. Future human cancellation/abandonment and HTTP/UI reconciliation are registered but not added to this return. Do not integrate the unreleased intermediate C schema19 separately.
