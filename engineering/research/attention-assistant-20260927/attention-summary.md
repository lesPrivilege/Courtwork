# Attention Assistant: role first, runtime separately

**Selected direction:** Hermes is the first research candidate for this Attention-specific integration. “Always-addressable” is the intended availability property; continuously running a model is not required. Attention remains a CW role with global conversations and governed source access. It is not defined by an email identity, a background process, a model tier or one runtime brand.

CW already owns Attention state, audit and receipts in Core; Host captures Session/Run identity and governs disclosure/tools/effects. A runtime may contribute authorized observations. It cannot infer resolution from completing a Run, sending a notification or reading an item. See [the domain contract](../../../docs/work-core/attention.md) and [global conversation contract](../../../app/docs/attention-agent.md).

The existing Pi path remains the accepted execution path. P03-B is already implemented; the next consumer must use and test that seam rather than repeat its extraction. Hermes selection is a research priority for this role, not production replacement or proof of a managed adapter.

<details>
<summary>Expand: existing capabilities and the missing integration seam</summary>

| Responsibility | Current fact | What a Hermes consumer must establish |
|---|---|---|
| State and formal closure | Core-owned Attention actions, CAS, audit and request receipts; runtime signal-only adapter | Signals preserve identity/version/digest and cannot set human status or grants |
| Source access | Global Attention tools expose bounded directory/detail/history under Host/Core disclosure | Native adapter cannot expand source scope or import historical instructions as permission |
| Execution | Accepted Pi Runtime Port; Host owns Run, admission and effects | Pin protocol and revision; map native identity, continuation, cancellation and unknown outcomes |
| Ingress | Synthetic GitHub/Gmail/trace/recovery cases already exist | Live authenticated transport, dedupe, stale/late events and cross-project refusal remain unaccepted |
| Scheduling | Due times are recorded facts; no general scheduler delivered by Attention tools | Wake ownership, retries and cancellation need a bounded owner contract |
| Notification | Delivery/read is separate from formal resolution | Destination permission, budget, receipts and ambiguous outcomes need explicit effect handling |

Use [the task index](INDEX.md) for source/tests. Existing fixtures are useful baselines, not live connector evidence. A native Hermes gateway log or session store does not become the Work ledger. Its configuration, credentials, plugins and memory remain native-owned unless a specific accepted adapter contract says otherwise.

</details>

<details>
<summary>Expand: external practice and next bounded research case</summary>

Hermes documents gateway event normalization, per-message agent execution, busy queues, interrupts and native session persistence. Atlas demonstrates inbox/wake/sleep mechanics. AEGIS documents decision cards, notification budget and a watchdog in a personal working example. LangGraph and Temporal provide useful pause/resume/replay and durable-execution references. These are different mechanisms and maturity levels; none establishes CW acceptance. Exact sources and pins are in [source-index](source-index.md).

The next research consumer should choose one documented Hermes transport and pin its source/executable revision. Test a synthetic observation through existing Host/Core seams: duplicate event, malformed/stale source, scope denial, signal-only restriction, interruption, restart and ambiguous effect. Establish native identity and capability refusals before broadening to real connectors or paid-provider execution. Keep findings in RD-001/P03 and the existing Attention owner record, not a new HERMES roadmap.

Failure-domain separation is an evidence question: can the watcher report a stalled execution when that execution path is impaired, while preserving Core and avoiding duplicate effects? It does not yet mandate a separate service or always-on deployment. Spark retains bounded preparation/comparison/source-backed findings; it is not silently repurposed as this watcher.

</details>
