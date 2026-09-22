# Local Pi worker primary-source intake and Astra selection

2026-09-22. [Luna's unchanged report](luna-preflight.md.txt) records actual first-party fetches at Pi0.85.1 source `d981de1229ef899957bbe968bc8dcda02a21f477` and locked local implementation reads. Historical local paths/line locators in that raw report are retrieval notes, not portable product links. No process/model/provider, credentials, install or product capability was tested in this research. The [existing control-plane index](../../../../research/architecture-node-2026-09-13/control-plane-precedents-20260921.md) remains the broader precedent owner.

## Consumed first-party sources

- [Pi RPC specification](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/rpc.md) and [RPC implementation](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/modes/rpc/rpc-mode.ts): structured framing; command acceptance versus session settlement.
- [Pi subagent process example](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/examples/extensions/subagent/index.ts): one process per invocation, explicit cwd/pipes, shell:false and bounded termination. Its no-session mode does not demonstrate durable resume.
- [Pi extension boundary](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/docs/extensions.md) and [RPC client](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/coding-agent/src/modes/rpc/rpc-client.ts): trusted executable extensions and owned-process lifecycle.

## Parent decisions for the implementation order

**Adopt:** begin with the one-shot upstream JSONL process interface and no native tools/extensions. Keep a Pi-specific adapter and explicit unsupported capabilities. L0 must verify the actual print-mode terminal envelope; RPC's `agent_settled` is a useful distinction, not permission to assume identical behavior in another mode. Native session/event evidence and process exit are separate facts.

**Adjust:** CW supplies the exact source packet, attempt identity, deadlines, output limits and result retention. Supplying bytes is not proof the model read or covered them; source-inclusion evidence and model-reported coverage stay distinct. Reuse the existing child owners. Require actual upstream-process loopback tests to prove CLI controls and ambient-resource exclusion. The task may use a verified CLI entry from the already locked upstream dependency for conformance; do not substitute an unrelated global launcher or claim installed-runtime compatibility.

**Adjust:** the raw report's blanket EOF/signal→unknown wording is conservative, not the final state table. No retained terminal/result evidence means no success claim; but a clean exit after a verified retained completion, a proven pre-dispatch refusal, or confirmed no-effect cancellation should keep its supported outcome. Unknown execution/effects cannot be cleared by process death. Define and test this evidence-dependent classification rather than making every exit unknown.

**Defer:** persistent RPC sessions/steering/resume, toolful coding, ACP and another runtime. Add only a demonstrated consumer need; don't implement unused managed-session features to make the order look large. No Multica/framework import is needed for the first consumer, and older comparative references remain available.

**Reject:** treating HOME/cwd/flags as an OS sandbox, or replacing CW permission/result/acceptance with native prose/exit codes. A trusted Pi process can still access the OS account's resources. A Kit does not confer grants.

These are operative instructions in the [local Pi order](../../local-pi-worker-loop-20260922.md), not raw-conversation registration. The new task owns implementation within that order; parent Arch retains deviations and final acceptance.
