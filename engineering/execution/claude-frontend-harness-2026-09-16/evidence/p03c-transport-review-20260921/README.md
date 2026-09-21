# P03-C transport — independent review, 2026-09-21

Candidate: `b69a4b58b0fd12f271f1b8409bf8a99a628fcc68`, branch `claude-agents-transport-20260921`, base `2b57d7b`. Integration main inspected at `87183f9657cf5329cec4c64be3adacf3aa9771aa`. The author explicitly released the writer. Scope is the [existing transport order](../../p03c-agents-transport-20260921.md), not full P03-C or live runtime acceptance. The candidate's author packet is at the same source SHA, path `engineering/execution/claude-frontend-harness-2026-09-16/evidence/p03c-agents-transport-20260921/README.md`.

**Disposition: hold integration; return two transport-local corrections to Fable in the existing tree.** The dependency change is accepted within scope; the candidate is not merged, deleted or exposed to a real Host. No next C increment starts.

## Findings and original-owner returns

The [Luna report](independent-review.md) is retained as submitted. Astra reran its probes and corrected two conclusions below; its recommendations are not adopted wholesale. Its phrase “13 transport cases” is a counting error: the [raw focused log](independent-review.log) has 6 transport tests, 13 existing protocol tests and 3 architecture tests, 22/22 total, exit 0.

| ID / disposition | Demonstrated behavior | Finite correction and acceptance |
|---|---|---|
| **P03C-R1 — adjust and return (P2)** | A newline-form `OPENAI_CUSTOM_HEADERS` gives the **create** POST `Idempotency-Key: ambient-key` and changes its User-Agent. The subsequent event POST correctly retains `req_probe`. Thus the report's claim that the event key was replaced is incorrect, but ambient data still reaches allowlisted headers and violates explicit connection/identity ownership. See [probe.log](probe.log). | Fable makes header values, not merely names, follow transport/caller provenance. Suppress unrequested create identity and ambient User-Agent; preserve the explicit API key and each event's own requestId. Do not mutate process-wide environment. Regress create plus distinct concurrent event keys with ambient allowlisted headers set. No claimed remote idempotency follows. |
| **P03C-R2 — reject the 204-only blocker** | `sendEvents` accepts HTTP 200 `{}`, 200 empty and 204. Those observations are real; the inference that only the fixture's 204 is valid is unsupported. The pinned SDK declares `APIPromise<void>` and the [current official endpoint](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents/subresources/sessions/subresources/events/methods/create), fetched 2026-09-21, explicitly describes HTTP 202 as acceptance rather than durable completion. | Do not add a 204-only guard or invent a required JSON ACK schema. Record the fixture/current-doc status difference, and distinguish HTTP submission acceptance from remote effect completion. Revisit stricter validation only with the chosen protocol's actual response contract; this is not a required code fix. |
| **P03C-R3 — adopt and return (P2)** | `listItems` accepts `{data:[],has_more:true}`; existing `listAllItems` has no last cursor/item ID and returns the accumulated list. An explicitly incomplete page can therefore look like complete empty/partial history. See [pagination.log](pagination.log). | Fable rejects an incomplete page without a usable continuation cursor before it can settle recovery. Preserve valid opaque `last_id` and the documented final-item-ID fallback where usable. Add the exact empty-page counterexample through the real adapter's reconciliation path, asserting error/unknown rather than successful empty history; preserve valid multi-page coverage. Do not rebuild the recovery engine. |

Own source remains the transport and its regression tests; only a minimal existing-adapter guard if the actual test requires it. Update the author's packet for R1–R3 and D2–D4 below. Preserve all prior evidence identities, SDK pin, Pi and the active Composer writer. Return one delta/source SHA, focused checks with actual exits, relevant full-suite evidence and writer release. No broad stress test, Host/store work, fresh roadmap or paid endpoint is requested.

### Reproduction evidence

Astra archived the two Luna probes with only their imports made portable (candidate checkout argument), then reran them against `b69a4b5`; both exited 0 and printed observations, **not pass assertions**. [Header/ACK probe](probe.mjs) → [output](probe.log); [page probe](pagination.mjs) → [output](pagination.log). The ambient-header case intentionally leaves the event response unanswered, so its timeout is expected; the captured wire, not that timeout, establishes header provenance. The JSON-form custom-header case is invalid SDK configuration and is not a product finding. All values are synthetic. The author source remains unchanged.

Commands from repository root:

```sh
caffeinate -is node engineering/execution/claude-frontend-harness-2026-09-16/evidence/p03c-transport-review-20260921/probe.mjs /path/to/candidate
node engineering/execution/claude-frontend-harness-2026-09-16/evidence/p03c-transport-review-20260921/pagination.mjs /path/to/candidate
```

## Astra decisions independent of the transport review

**D1 — adopt the dependency-ledger correction.** [Independent recomputation](dependency-review.json) derives every candidate ledger entry from its lockfile with exact equality. The old lock hash was stale and 13 already-locked MCP-related packages were absent. All 288 unaffected entries remain identical; the root OpenAI entry changes to 7.15.0 and Pi's 6.40.0 entry moves with identical metadata/integrity. Retain the complete mechanical regeneration within this dependency-owning slice. This is not permission for unrelated upgrades. Tarball verification and 1340/1340/full smoke remain the author's evidence unless independently rerun; ledger equality does not establish those results.

**D2 — adjust the lost-create obligation.** The delivered transport has neither a creation correlation field nor a session-list lookup method. `getSession` requires the native ID that may be missing after a lost create reply. Keep the command durably unknown and prohibit automatic recreation. Before the next Host consumer, its original owner must define an attributable reconciliation path or an explicit operator-resolution path. SDK 7.15.0 declares create metadata and ID-paginated session listing, but that is not proof of unique or immediately complete lookup. The [official list reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents/subresources/sessions/methods/list), fetched 2026-09-21, lists `after`, `agent_id`, `limit`, and `order`, with metadata on returned sessions; it does not supply a command-key lookup guarantee. A negative listing is not proof of non-execution. No schema or lookup implementation is added in this review.

**D3 — adjust the uncertain tool-result obligation.** Persist the result and its caller-owned request key before submission; never rerun the tool to reconstruct an uncertain result. Reuse those bytes when a retry is authorized by the operation's verified semantics. Sending the same header alone does not prove remote deduplication for tool results or cancellation, which the author correctly labels undocumented. The next consumer must preserve unknown or reconcile before an unproven resend; automatic retry is not accepted by this packet.

**D4 — retain honest failure evidence.** The original 17-second failure has no retained error text. The reported sleep timing is a correlation, not a recovered diagnosis. Later successful runs do not erase it. Avoid repeating the 36-process stress run; use the bounded protocol/transport checks and preserve their actual exit status. The author full-suite and smoke results remain separately attributed.

## Verification boundary

Luna owns non-author transport/error/stream/header/pagination checks against the fixed candidate, using synthetic credentials and loopback only. Astra owns architecture, dependency disposition and integration. No paid request, personal credential lookup, Store/service/UI mutation, user 8787/8899 restart, or next-slice implementation is part of this review. The Composer tree and released transport candidate remain preserved.

`git merge-tree --write-tree main b69a4b5` produced a conflict-free proposed tree at inspected main; this is mergeability evidence, not a merge or acceptance. Repository document links and whitespace are checked for the review packet. No full-suite repeat is warranted before the demonstrated returns are fixed.
