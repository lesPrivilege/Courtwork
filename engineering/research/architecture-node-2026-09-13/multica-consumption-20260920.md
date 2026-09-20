# Multica — bounded source consumption

2026-09-20 · Astra architecture ruling, Luna source exploration. **Research only; no product implementation or runtime acceptance.** Upstream: [multica-ai/multica](https://github.com/multica-ai/multica), fixed commit `8c4f4328f6e3baff08394b309034463b5db9d7af` (commit date 2026-09-19). CW observation: `main@72c91a2f070cc8e134f1d09cebc7de735ff89415` plus current uncommitted direction records.

The user's referenced ChatGPT conversation `6aaebdab-96c0-83ec-875f-92886a1a88f1` was read in full as returned: one turn, no older page or attachments. Its claims are research leads, not authority. A shallow source checkout was read outside CW; no upstream scripts, installation, tests, daemon or provider were run. Links below pin repository evidence; live documentation was also read on this date and is not assumed to match every installed version.

## Ruling and conceptual corrections

Multica is a priority engineering reference for local-agent execution, especially adapter compatibility and failure/recovery cases. It does not change CW's product root objects, five-layer ownership, or current delivery order. Consume mechanisms through [RD-001](../RD-001-runtime-adapter.md), [RD-005](../RD-005-multi-agent-selection.md) and [RD-009](../RD-009-trusted-harness-extensions.md), using the [local-runtime contract](local-agent-runtimes-20260920.md).

| Upstream concept | Verified meaning | CW consumption |
|---|---|---|
| Agent | Durable identity/configuration; produces runs when work arrives | Supports Agent profile versus live instance separation. Display description and execution instructions are different inputs; neither implies a portable Kit implementation. |
| Runtime | Computer plus a coding CLI or custom profile; registered per workspace | Map its machine/environment and executor binding separately. It is not exactly CW's Runtime Adapter. |
| Daemon | Local registration, claim, process execution and result reporting | Responsibilities cross CW Host, Adapter and Environment; do not create a new Harness Core owner for the entire daemon. |
| Run / Issue | One execution versus a continuing work object | Preserve distinct identities and histories, but inspect automatic cross-object transitions. Multica Issue is not automatically CW Matter or its formal acceptance contract. |
| Agent provider | In adapter context, a coding-tool implementation | Do not confuse this with CW's model/API Provider connection. |

Sources: pinned [Agents](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/agents.mdx#L8-L34), [Daemon and runtimes](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/daemon-runtimes.mdx#L8-L24), and [Runs](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/tasks.mdx#L10-L31).

## Configuration and evidence surfaces

**Adopt the distinction, adjust the binding.** The Agent form clears runtime-dependent model/thinking/speed choices when changing its Runtime ([source](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/packages/views/agents/create/agent-configuration-panel.tsx#L74-L91)). CW should revalidate dependent capabilities/defaults and explain the change under its own revision/CAS and future-run rules. This supports the target Settings → Agents → Agent profiles / Runtimes and existing Models ownership; it is not a reason to duplicate their configuration stores or reproduce Multica's whole Agent settings form.

**Adopt object-scoped execution evidence.** The execution-log component reads issue tasks, separates active and terminal runs, and folds past runs while retaining transcript/stop/retry actions ([source](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/packages/views/issues/components/execution-log-section.tsx#L34-L120)). This reinforces CW's existing object-owned Run reading surface and provides a reference for coherent frontend and Settings presentation. It does not justify a new dashboard or reopening Claude's current G1–G4 design scope. This was a source-semantic review, not browser or accessibility acceptance.

## Execution, permissions and recovery

The [Luna adapter report](explore/multica-adapters-20260920.md) and [lifecycle report](explore/multica-lifecycle-20260920.md) supply pinned source locators and untested limits. Treat documented CLI counts as catalog coverage, not proof of equal capability or independently verified compatibility.

**Reject default permission bypass as CW policy.** The [security model](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/security-model.mdx) explicitly places the boundary at the daemon OS user and documents unattended approval behavior. A per-run directory, state location or scoped platform token is useful separation but does not prove filesystem or network isolation. CW continues to require an enforced native-policy mapping, Host tools, or an explicitly scoped trusted-process mode.

**Adjust local-data claims.** Native logins and working directories remain local, but the [runtime documentation](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/daemon-runtimes.mdx#L17-L24) says agent environment variables and MCP configuration are stored server-side. Local execution does not mean all context/secrets stay on the machine. CW's existing credential/reference owners remain authoritative; no import is authorized by this research.

**Adjust retry and resume.** [Manual retry documentation](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/apps/docs/content/docs/tasks.mdx#L126-L144) distinguishes the previous agent/session/workdir from a fresh rerun using the current assignee. CW should similarly bind precise native identity and source/binding versions, while keeping unresolved effects unknown. A transport timeout or process restart cannot alone authorize replay of an effectful task.

## Lifecycle findings and disposition

Astra consumes the [lifecycle report](explore/multica-lifecycle-20260920.md) as follows:

- **Adopt as reference:** transport wakeup separated from database claim; generation/lease-checked transitions; bounded terminal-callback replay; explicit distinction between retry lineage, native session and durable working directory. CW fixtures should cover a committed claim with a lost reply followed by fallback polling, and a terminal callback whose reply is lost. Neither case may cause duplicate execution or settlement.
- **Adjust recovery:** Multica can fail work from a previous daemon incarnation and schedule retries; CW must first reconcile prior processes and effects. Heartbeat/lease expiry alone does not prove absence of effects. Keep unknown outcomes when evidence is insufficient and never present cancel request/acknowledgement as a universal kill guarantee.
- **Keep work owners separate:** the inspected generic task-completion path does not finish the Issue, but failure handling can return an in-progress Issue to todo when no active task/retry remains. Thus Run and Issue are distinct but not devoid of coupling. CW must route any analogous work-state change through Work Core rather than copy this policy into the Adapter.
- **Do not promote disconnected code:** the report found Autopilot synchronization methods without verified direct callers for some paths. Their presence is not evidence of a complete running workflow. Autopilot remains outside this bounded adoption.

These findings make Multica valuable as a regression-case index. They do not establish exactly-once execution, production reliability, native session fidelity or CW compatibility; no upstream test was run.

## Concrete adapter cases to consume

Astra adopts three behavioral cases from Luna's [adapter inspection](explore/multica-adapters-20260920.md), to be implemented as CW-specific fixtures under the original owners:

1. **Executable identity is not protocol family.** Multica separates a command plus fixed argv from a backend family; its `omp` identity reuses Pi. CW consumes this separation while retaining upstream Pi as the public and development target, without promoting a downstream fork into another product Runtime. The catalog's 25 protocol families plus that identity explain the advertised 26; they are not 26 live compatibility results. CW must record executable/version and verified capabilities separately.
2. **Resume success may hide a new session.** The Hermes adapter checks resume provenance because a successful response may silently bind a fresh session. CW should reject or explicitly label a replacement identity rather than presenting it as continuation. Test requested-ID versus observed-ID mismatches and preserve the old attempt/result references.
3. **Empty managed configuration differs from inheritance.** Multica distinguishes absent MCP configuration from a managed empty object. Pi's adapter also deliberately avoids a blanket `--tools` argument because it can hide extension tools. CW must test native discovery and explicit denies independently: absence is not denial, a successful connection is not exposure, and a tool filter is not an OS sandbox. Runtime-specific Kit contributions stay behind their adapters.

Astra separately verified the Markdown file mechanism after Luna reached its reading limit: [runtime_config.go](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/server/internal/daemon/execenv/runtime_config.go#L161-L300) maps native instruction filenames and appends/replaces a delimited brief while preserving surrounding bytes on ordinary paths. It also documents recovery from incomplete markers. **Adjust:** prefer isolated task materialization; if CW ever writes shared native instruction files, independently test user edits, incomplete/forged markers, conflict detection and cleanup. Do not infer transactional safety or unconditional byte preservation from the marker convention. This parent verification supplements the adapter report's explicitly unverified marker locator.

These are source-grounded test requirements, not copies of upstream tests or claims that those tests passed here. Fixed source links are in the adapter report. The two marker concepts must also remain distinct: a task-context provenance marker is not the managed text boundary used to preserve unrelated configuration bytes, and neither confers execution authority.

## Reuse boundary

The pinned [LICENSE](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/LICENSE#L1-L103) incorporates Apache-2.0 text **with additional Multica conditions**, including hosted/embedded use and branding/attribution terms; [NOTICE](https://github.com/multica-ai/multica/blob/8c4f4328f6e3baff08394b309034463b5db9d7af/NOTICE) points to those combined terms. Do not catalogue it as plain Apache-2.0. This pass references behavior and writes CW-specific contracts; it imports no upstream implementation or tests. Any later source incorporation needs a specific license/attribution disposition before that change.

## Original-owner follow-through

Keep the authorized Claude serial construction → independently accepted fresh node → merge → preserved cleanup → first missing dogfood slice order. Multica informs the subsequent runtime/child work; it does not move those slices ahead of Pi dogfooding or the existing P03/DRT-03 lane. Broad squads, autopilot scheduling, daemon fleet management and Issue-centric product navigation remain deferred. Explore stays with Luna; bounded implementation may use DeepSeek; computer use stays on OpenAI; Astra owns final architecture and integration.

## Verification

Astra reviewed both Luna reports and disposed the source findings above. `node tools/check-doc-links.mjs` passed (1,415 documents, 8,053 checked links); `git diff --check` passed. The product `app/` paths and Git index were unchanged by this visit. This is source/document consistency evidence only, not independent acceptance of upstream or CW runtime behavior. No commit, merge, worktree deletion, deployment or provider call occurred.

## User clarification: Pi and comprehensible product structure

Use Pi consistently and continue upstream adoption; preserve the existing underlying IDs. Downstream-launcher observations in the inventory are historical, not an additional selected Runtime. The user also accepts Multica as a reference for architecture, documentation governance, frontend and Settings clarity. Apply those relationships through the [existing comprehension and ownership contract](local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership): a brief introduction should suffice for an experienced agent user to configure and use the product. This broadens reference consumption without copying the product topology, changing active construction scope, or claiming that usability has been verified.
