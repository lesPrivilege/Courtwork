# Hermes / Praxis — bounded CW consultation receipt

2026-09-20 · Existing owner: [RD-005](../../../RD-005-multi-agent-selection.md). Controller and disposition: Astra. Executor: the installed Hermes CLI, `praxis` profile. **Status: invocation completed; advisory output adopted with corrections. No CW Runtime Adapter or product capability accepted.**

The user explicitly authorized a CW work order to test the configured Hermes instance while Claude continues serial construction. This is a read-only consultation outside the product writer scope. It does not advance the merge/cleanup/core-R&D sequence or change the user's Praxis workspace configuration.

## Work order and reproducible inputs

[CW-HERMES-CONSULT-20260920](work-order.md) asks for a handoff-readiness decision, at most five attention items, a Praxis artifact contract and two unsent stakeholder drafts, and the limits/next possible test. Sources are frozen, numbered excerpts in [S1](S1.txt), [S2](S2.txt), [S3](S3.txt), and the controller observation [S4](S4.txt). The [manifest](manifest.json) records original source paths/line ranges, full-source and snapshot hashes, query hash and runtime revision. These excerpts include uncommitted direction documents and historical snapshots; they are not a source-code delivery commit.

The CLI ran in a disposable task directory outside CW and the user's Praxis working folder, selecting `-p praxis` without changing the sticky default, model, rules or persistent configuration. The profile's configured model was used. The [query](query.txt) contains the complete bounded packet and instructions. No repository write tool, browser, shell, external message or delegation was requested.

```sh
hermes -p praxis chat --query-file '<task-directory>/query.txt' \
  --oneshot --format stream-json --toolsets none \
  --max-turns 2 --run-budget 180 --in '<task-directory>'
```

The controller imposed a 220-second outer process deadline. `--toolsets none` is a **version-specific empty selection**: the inspected `model_tools.py::_select_tool_names` starts with an empty set, and the unrecognized `none` name contributes no tools. This is not a stable documented read-only mode or an OS sandbox. No `--yolo` or hook auto-approval flag was used. The normal profile rules and native session persistence remain active; this test neither inspects private profile material nor verifies which Praxis Kit fragments were injected.

## Observed result

| Fact | Observed value |
|---|---|
| Installed runtime | Hermes v0.21.3 / 2026.9.14, source `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88`; tracked runtime source clean |
| CW observation baseline | `72c91a2f070cc8e134f1d09cebc7de735ff89415` plus explicitly snapshotted uncommitted documents |
| Model in native init event | `deepseek-v4-flash`; selected through the existing `praxis` profile |
| Native session | `20260920_001224_207d5e`; not a CW Session/Run |
| Process/result | Exit 0; one terminal result; no outer timeout; 32.587 seconds process duration |
| Model events | One init, 1,620 text events, one result; zero tool-use/tool-result events |
| Runtime-reported tokens | Input 9,326; output 6,892; total 16,218. These are runtime counters, not a billing receipt; monetary cost is unknown |
| Advisory verdict | `not_ready` for core R&D; no reported actions or external messages |

The [raw final answer](response.md), [native result envelope](result.json), [event summary](event-summary.json), and [process receipt](process.json) preserve the actual outcome. Private native session stores and diagnostics are not copied into the repository. Normal Hermes session/log persistence is distinct from model tool activity.

## Controller assessment and dispositions

| Check / finding | Disposition |
|---|---|
| Separates design readiness, construction, independent acceptance, merge and cleanup; preserves Claude's writer scope and existing owner records | **Adopt** as useful advisory reasoning. The construction-complete state is unverified at this observation; the absence of a final report does not itself prove every implementation is unfinished. |
| Source citations | **Adopt with limits.** Referenced line ranges exist in the frozen packet and key gating claims were checked against it. Valid locators alone do not prove every inference. |
| Praxis artifact contract and sponsor/implementer drafts | **Adopt** as draft communication using the same facts and uncertainties. Nothing was sent. This does not establish a formally admitted Praxis Kit or an accepted Expert workflow. |
| Carries forward the old four-worktree count despite S4 naming a new Claude construction tree | **Adjust.** Five registered trees were observed by the controller at dispatch preparation. The old four-tree inventory remains historical. A live refresh is required at integration; a report must not combine historical and newer inventory as one current snapshot. |
| Allows “or a bounded handoff” in the final-report trigger | **Adjust.** A bounded handoff can support review, but the latest user sequence requires the agreed serial construction scope, accepted node, merge and cleanup before core R&D. The response's final verdict retained this gate. |
| Next proposed test asks for an executing Hermes instance while also forbidding all network/provider calls, and mixes an allowlisted artifact write with “read-only” | **Reject as executable specification; retain intent.** A future offline enforcement fixture must use deterministic transport, or a live test must explicitly permit its configured inference endpoint and bounded artifact output while denying unrelated access. No such test was started. |
| Requested ≤800 words | **Not met.** Whitespace count is 859 words before the JSON block, 892 overall. Future tasks need tighter output framing or a controller limit. |

This single run supports **configured Hermes CLI invocation, one-shot structured output, source-based consultation and a native result/session reference**. It does not establish filesystem enforcement, deny paths, continuation/recovery, cancellation, a CW-managed child, Kit admission, formal acceptance or product interoperability. No model tool calls were observed; that is not an adversarial enforcement test. The local profile's normal context behavior was retained, not independently audited.

No second provider invocation, product implementation, merge, worktree cleanup, push or deployment is included. The next Hermes trial remains a proposal under RD-005 and the [Praxis direction](../../praxis-kit-20260919.md).
