# Local Pi worker — fresh Astra core loop

2026-09-22 · Parent architecture/integration: Arch (Astra). Execution: a new isolated Astra task, with bounded Luna exploration/non-author verification and Sol implementation. This is the next local-runtime increment under [RD-001](../../research/RD-001-runtime-adapter.md) and [RD-005](../../research/RD-005-multi-agent-selection.md), not a new roadmap or general orchestration framework.

## Outcome and adopted boundary

A CW parent can delegate a bounded source-reading job to an **upstream Pi process**, receive an attributable retained result, and distinguish successful execution, refusal, cancellation and unknown outcome after failure. A native process is genuinely exercised against a deterministic loopback model; this proves integration, not model quality or live-provider access. Governed coding is a subsequent capability within this direction, not something a read-only milestone claims.

CW already owns Spark assignments, attempt admission, exact sources, budgets, retained results and explicit consumption in `app/harness/subagents.mjs` / `subagent-state.mjs`. The accepted Pi Runtime Port is an **in-process SDK** implementation. The missing seam is an external process under those existing owners. Consume both; do not implement another assignment ledger, queue, artifact store, shared transcript, permanent orchestrator or agent framework. `child-execution.mjs` is conformance-only; its abort race cannot prove a process stopped.

Use Pi as the upstream/public name. Keep existing IDs and historical evidence intact. Installed binary, compatible protocol, available authentication and admitted capability are four different facts. Runtime replacement concerns future admitted work; it does not transfer an active native session.

## Mandatory consumption and first-party evidence

Read AGENTS, current, architecture/change boundaries and verification first, then:

- [Local Runtime contract](../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md), especially tools, identity, cancel/detach and Codex-parent distinctions.
- [Pinned CLI sources](../../research/architecture-node-2026-09-13/explore/local-cli-precedents-20260920.md) and [control-plane disposition](../../research/architecture-node-2026-09-13/control-plane-precedents-20260921.md). These older observations are evidence at their pins, not proof about an arbitrary installed binary.
- The original [P03-C/D/E order](core-runtime-loop-20260921.md), [Host consumer contract](p03c-host-consumer-contract-20260921.md) and [CDE recovery ruling](evidence/core-cde-review-20260922/README.md). Remote terminal evidence never establishes an unknown local effect.
- Existing `pi-runtime-port.mjs`, `pi-session-runtime.mjs`, `subagents.mjs`, `subagent-state.mjs`, `check-runner.mjs`, ArtifactHistory and their tests. Source paths are relative to `app/`; locate the actual file rather than guessing a module exists.

Luna's current bounded preflight is consumed in the sibling `evidence/local-pi-worker-index-20260922/` packet once recorded. Freeze the selected upstream source/package integrity and protocol revision before implementation. Primary sources are Pi's actual RPC/CLI/extension implementation and its child-process example, plus the relevant Multica adapter/lifecycle source. ACP/MCP are comparison points only if needed by a real consumer; neither protocol supplies CW grants or durable effect reconciliation. Do not upgrade dependencies or import a framework merely to match newer documentation.

## Serial milestones

| Milestone | Construction and acceptance evidence |
| --- | --- |
| L0 · finite source/contract check | Verify the exact upstream executable and protocol, empty private configuration, discovery/extension/context loading, available interruption and native identity. Record an adopt/adjust/reject table mapping each borrowed practice to an existing CW owner. Identify the concrete Host/child integration seam and the smallest durable fields it lacks. Reuse the parent preflight; a follow-up Luna pass is at most 12 calls, with explicit not-found results. |
| L1 · process adapter | Implement a narrow Pi-specific process/RPC adapter using structured argv and `shell:false`, explicit environment/configuration, separate bounded diagnostics, correlated replies and native observations. Handle split UTF-8/JSONL, malformed/oversized input, backpressure, exit-before-reply, duplicate/late terminal observations, timeout and caller cancellation. Keep command acknowledgement, turn terminal and process exit separate. Do not parse TUI output or silently fall back to a different executable/runtime. |
| L2 · actual upstream process conformance | Use a verified upstream Pi executable with throwaway home/agent directory/cwd/session data and a loopback deterministic provider. Prove no ambient extensions/skills/project instructions/configuration are loaded; test the exact controls rather than infer isolation from flags. Exercise a bounded reply, protocol error, cancel, hard termination of only owned children, crash/late-output and result identity/size boundaries. A process terminated before its handler is ready does not prove escalation. No paid provider or personal credentials. |
| L3 · existing Host/child consumer | After the C/D/E acceptance/merge prerequisite below, connect one explicitly selected local Pi binding to the existing assignment/attempt/result path. Persist dispatch intent before launch; record native identity when observed; retain exact result bytes/hash before publication; recheck source/grant changes; reject stale/duplicate results and fence unknown attempts without rerunning them. Verify public Host/service boundaries and restart with isolated data. Keep the existing serial child lane and explicit consumption. No new Settings route or automatic runtime selection is required for this first consumer. |

Commit each completed milestone with author evidence, then continue the next permitted milestone autonomously; asynchronous checks are allowed, overlapping product writers are not. Stop the finite loop after L3's reviewable delivery, or at a demonstrated capability/architecture blocker with a concrete reduced alternative. Do not append a second runtime, full coding, fleet, Browser or Settings project.

## Permissions and capability decision

The initial consumer is bounded consultation/source reading. The process receives approved source versions or Host-owned source callbacks, never an unrestricted workspace read tool by implication. Disable native tools and automatic executable extension discovery where the selected upstream actually permits it. If a small explicit CW extension is needed for callbacks, verify its public upstream contract and keep each call's authorization/effect in the Host owner. Do not fork Pi or imitate unsupported native permission protocols.

A CLI tool list, system prompt, cwd, worktree or separate HOME is **not an OS sandbox**. Configuration hygiene protects against accidental ambient authority; the runtime binary remains a trusted local process. Record that trust boundary honestly. If required tool control cannot be enforced at the model-reachable boundary, retain a tool-less bounded invocation and return the missing Host callback seam; do not enable filesystem/shell coding as a workaround. Read-only execution does not imply no credentials/network unless actually constrained and tested.

Future write/check delegation must use the existing repository candidate, approval identity and fixed check owners, with an explicit leased increment and fresh evidence. Model output, exit zero and result consumption do not grant formal Work acceptance. Native child agents remain native-owned unless CW actually creates and accounts for their attempts.

## Write lease and coexistence

The new task owns newly named Pi-process adapter/transport/contract modules under `app/runtime/`, dedicated `local-pi-*` tests/fixtures/scripts, and its own evidence/contract sections. Prefer cohesive modules over a premature generic CLI framework. Sol may implement disjoint named files after Astra fixes their interface; Luna must not independently accept code it authored. The fresh task's Astra reviews implementation locally; **parent Arch retains final cross-cutting architecture, independent acceptance and main merge**.

At order preparation main is `b1e9baab9fd67a2eec352f94d0b4d691164a9e99`. C/D/E source `e49232e` is released for independent return review, not yet accepted. L0–L2 can proceed independently. L3 may start only after the parent record identifies accepted integrated C/D/E main and releases the existing `service.mjs` / `store.mjs` / `runtime.mjs` writer. Then merge that main into the isolated task branch (no history rewrite) and record the exact smallest change to the existing Host/subagent owners before coding it. No schema version is reserved by this order. A new persistence topology, enforcement model or shared API must return to parent with a concrete contract proposal; keep working on independent tests while it is considered.

M1 Runtime Settings and the user's running 8787 instance/data remain protected. No `app/web` or global CSS lease. Do not restart services, read/copy native authentication, scan personal credential stores, edit global agent configuration, push, deploy, delete other worktrees or resume the old heartbeat. The earlier permission to test a key in the user's WebUI is not permission to export it into this task. Keep live trials separately budgeted and authorized.

## Verification and handoff

Choose tests for the actual changed seam through verification.md. Preserve a failing counterexample before fixing lifecycle defects; use real child processes for process claims, actual service/restart tests for durable claims, and independent review for acceptance. Avoid repeated full-suite/resource-stress runs without a new defect or change. Log both failures and successful reruns without inventing a cause. Pin test source and input identity, commands/exit codes, process cleanup and limitations.

For the final packet provide: exact source/milestone SHAs; verified upstream version/integrity/license; reference-to-code adoption map; responsibility/permission contract; actual-process and Host/restart fault matrix; results' attribution/hash/source freshness; author and non-author evidence separately; all unsupported modes and remaining owner gaps; writer release. No test names or prose may describe synthetic model output as real-agent capability. OpenAI computer use is reserved for a later meaningful visible journey; headless protocol work does not need screenshots.
