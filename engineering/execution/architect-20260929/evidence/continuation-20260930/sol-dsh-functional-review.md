# DSH GUI functional comparison

2026-09-30. Sol bounded, read-only research report. This compares user journeys, not source-code diffs, and proposes probes for the original owners. It does not grant architecture, capability or product acceptance.

## Source and evidence scope

- Courtwork inspected checkout: `main@87e220723ad05a2279fb583a92fb5054ca23ba8b`; unrelated untracked `.agents/`, `.obsidian/` and `skills-lock.json` preserved.
- DSH official release pin: `639ed015397290b3745d163aafe02ffee4aa3f84`, commit dated 2026-09-29, release `dsh@0.2.0-rc.2`.
- DSH claims below are **documented only** in official user/package references. No DSH GUI was launched or operated, no provider was called, and no install or new test was run. Official GitHub documentation was readable; the documentation-site web fetch was restricted. This does not establish that the GUI is unrunnable: the documented launch is `npx @deepseek-ai/dsh web`, localhost port 3080.
- Courtwork status is taken from supported-preview and owner/evidence records, not newly verified execution. Read `engineering/current.md` and `engineering/verification.md`; the snapshot's older SHA is not substituted for actual Git HEAD.

## Journey comparison

| Journey | DSH documented GUI outcome | Courtwork main status | Functional gap / bounded probe and original owner |
| --- | --- | --- | --- |
| Configure model/runtime | Built-in and custom providers; three protocol choices; model discovery, capacity/input options; hot save; a deleted default model blocks the composer. | Supported DeepSeek/OpenAI configuration; production starts one Pi executor. Real runtime inventory is read-only and reports live status `not_checked`; native management and executor selector are deferred. | Empty setup to valid local endpoint, selected model, invalid/deleted route and next request. Prioritize truthful availability and Send behavior. Models/Host, original Claude UX, 06c and public G1. Broad provider or runtime support is a separate product decision. |
| Tools/extensions lifecycle | Plugins sidebar preflights and installs bundle specs from package/version, Git, tarball or absolute path; trust acknowledgment, progress, Stop, enable/disable and confirmed uninstall. Settings inventory is read-only. | Trusted local-folder extension admission, control plane, declarative resources, Skill proposal/review/apply and MCP lifecycle exist. Arbitrary executable Pi packages/hooks are not promised. Upgrade/remove/rollback remains a named gap. | Existing trusted A to replacement B, restart, rollback A, then read old bound history. Lost reply must reconcile. RD-009 / LocalExtensions / ExtensionRegistry, existing harness gap map. Do not rebuild local-folder installation or infer a marketplace requirement. |
| Approvals | Permissions selector combines sandbox and approval policy. Pending approval takes over composer; allow-once/reject and keyboard actions. | Exact candidate write/check approval; bounded real coding journey accepted. Main check code still executes with Host rights; containment is open. | Two pending questions, cancel while waiting, candidate changed after approval, and interrupted check cleanup. D1-D5 / RD-009; architect sandbox delivery is not accepted main capability. |
| Recovery | Reconnect restores Session history/control and workspace baselines. Install reconciliation works within a page; refresh loses tracked request/output, and completed install results are not retained by Host. | Durable Run/effect records and bounded read/write/check/reopen accepted. Exact-root unknown recovery is dormant; named lost-reply/material cases remain open. | Drop one write/check reply, reconnect/restart, inspect exact effect count and bytes, prove no repeat execution. Order11 / RD-006 / DF-04 and P03-D. No generic retry-unknown action. |
| Context/session continuity | Logged model choice retained; workspace selection required before composing. Default-off external memory examples cover write in A and recall/use in fresh B. | Conversation/material retention, Pi session reopen, `/compact`, frozen reference-only Kit binding. Deterministic evidence covers Matter continuation and accepted Artifact after restart. | Compact, restart, continue, delete compacted Chat, restart; separately remove/disable model before compact. Compaction/Host owner. Convergence S1/S2 are delivered fixes, not adopted main behavior. External memory interoperability does not imply CW needs a second memory owner. |
| Files/artifacts | Session-root tree with watched refresh and Sidebar previews. Tree explicitly lacks search, artifact filter, rename, drag/drop and context menu. | Scoped source read/search; private Git candidate; fixed-base diff/check; retained versions/comparisons; human version-bound accepted Artifact. | Read source, approved candidate edit, fixed check, inspect result/diff, reopen as one task. Order11 already has bounded accepted evidence: reproduce one failure rather than rebuild the journey. Formal Artifact acceptance is CW-specific, not a DSH deficiency. |
| Child work | Parent header descendant tree, status/usage/duration, child transcript or side pane. Continuable children accept FIFO follow-ups and independent Stop; one-shot is read-only. Other inactive outcomes are grouped. | Spark exact-source exploration, isolated workspace and version-bound notes; parent yields/resumes explicitly. Generic recursive/parallel teams are not promised. | Assign two retained versions, inspect exact sources/findings, revoke access, confirm refusal, consume note, resume parent; one interruption/restart budget case. Original Spark / P07 / RD-005 owner. Generic child continuation requires a product decision. |

## Prioritized dogfood probes

1. Approval and recovery under interruption: two pending approvals plus cancel; one dropped reply; restart; verify Host outcome, displayed outcome and zero repeated effects. Land in existing D1-D5 / RD-009 and order11 records.
2. Truthful fresh-user setup: unavailable model, unsupported effort, model change and compaction. Test one local deterministic endpoint before any authorized real-model trial. Land with Models/Host and original UX owner, public G1 / 06c.
3. One trusted extension replacement journey: retain old package/binding/history, replace, restart and roll back. Land in RD-009 / LocalExtensions / ExtensionRegistry; existing local admission is a foundation.
4. One Spark child-to-parent return: inspect/consume findings and explicitly resume; distinguish status, budget and authority. Land in the existing Spark / RD-005 record.

These are bounded counterexample probes, not a new roadmap or parallel product-writing authorization. DSH feature presence does not transfer its architecture or authority rules into Courtwork.

## Unaccepted delivery distinctions

- `claude/converge-loop-20260929@049f1b9` delivers S1 compact/delete/restart, S2 compaction/provider admission, S3 pending-question liveness, and S20 Host-fact UI projection fixes. Examples include unknown Runs previously displayed as Failed and coded admission refusals displayed as unconfirmed deliveries. The report treats these as delivered, unmerged and unaccepted, not missing work to reassign.
- `claude/architect-integration-20260929@d5cf033` delivers sandbox, workspace traversal, permission/HTTP outcome and fixed-recipe corrections. These are unaccepted and absent from the inspected main baseline.
- The convergence record paused further overlapping source slices. Its throwaway trial merge found conflicts but did not run the combined suite or establish semantic compatibility. Astra retains integration and independent acceptance.

## Primary sources

All DSH links below use the exact release pin; references describe behavior, not this review's execution evidence.

- [Release commit](https://github.com/deepseek-ai/deepseek-harness/commit/639ed015397290b3745d163aafe02ffee4aa3f84)
- [Web UI user guide](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/docs/user/guide/index.md)
- [Models configuration, with published form screenshots](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/docs/user/guide/providers.md)
- [Plugin manager GUI and its recovery/upgrade limits](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/ui-plugin-manager/README.md)
- [Approval GUI](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/ui-approval/README.md)
- [Permission presets](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/docs/subsystems/permission-presets.md)
- [Child conversation GUI](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/ui-subagent/README.md)
- [Files GUI and explicit limits](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/packages/client/ui-sidebar-files/README.md)
- [Reconnect behavior](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/docs/subsystems/web-client.md)
- [Optional memory journey](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/docs/user/guide/mcp-memory.md)

Courtwork owner paths (repository-relative): `app/docs/supported-preview.md`; `engineering/execution/claude-frontend-harness-2026-09-16/evidence/harness-gap-map-20260923/README.md`; that execution directory's `06c-runtime-management-20260921.md` and `11-coding-dogfood-handoff-20260920.md`; `engineering/research/RD-009-trusted-harness-extensions.md`; `engineering/reviews/doc-driven-code-review-2026-09-29/README.md`. Convergence source is the branch-only `engineering/execution/converge-loop-20260929/README.md` at the pin above. Parent dispositions belong in the original architect task, not in this evidence note or current snapshot.
