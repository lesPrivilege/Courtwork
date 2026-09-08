# Per-turn harness ownership review

The host owns admission, permissions and durable receipts. Pi owns the model/tool
loop and native conversation. SE retains explicit Review/commit authority. The
same arrangement applies to the independent service and its HTTP adapter.

| Stage | Owner / source | Compatibility invariant and evidence |
| --- | --- | --- |
| Admit and freeze configuration | service.mjs configurationQueue/createRun | Key/config updates serialize with admission; active Run blocks changes; commandId remains idempotent. |
| Prepare session | service.mjs executeRun; pi-session-runtime.mjs createSessionRun | Setup is inside terminal error handling; abort/usage handles installed before prompt; persistent native locator reused. |
| Build context | stable system prompt; runtime.context custom message | Current extension state enters the native tail only on change; latest context does not grant permissions; foundation test compares the prior wire prefix after context change. |
| Select API/model | createIsolatedModelRuntime; resolveModel | Native per-API dispatch and applied baseUrl; two wire fixtures prove actual endpoint, encoder and SSE/tool decoding. |
| Request/cache | stream wrapper / native SessionManager | Stable session identity, short retention, sorted tools; successive and restarted requests preserve prior encoded input. Provider cache availability is external. |
| Execute tools | Pi loop; workspace tools; ExtensionRegistry | Only admitted tools; write permissions remain host-enforced; result bytes carry immutable history references. Existing permission and artifact tests retained. |
| Project events | adapter forward/pending drain; store mutation queue | SDK subscribers are asynchronous to the emitter; host waits for writes before completion. Delayed-write and rejected-write tests cover the seam. |
| Count usage | adapter counters; service final receipt | Native reported normal/summary usage counted once; incomplete accounting marked missing; fixture cache counters verified. |
| Compact | native auto compaction / host cap and deadline | Native summary remains conversation authority; cap bounds compactions, not ordinary continuation; changed context reasserted if absent after compaction. |
| Cancel / human wait | service budget and native abort | Deadline includes setup, pauses for human input; sticky abort prevents the next provider request; pending questions settle. |
| Dispose / close | per-Run dispose; runtime.close; CLI | Wait for idle and pending projections, dispose native resources; stop admission and settle Runs before releasing lock. SIGTERM test and independent smoke cover restart. |
| Resume | native JSONL plus service reconciliation | Same-path reopen continues history; interrupted Run is unknown, never replayed; source replacement is independent of data migration. |
| Consume output | orchestration caller / domain extension | Run completion and file creation are evidence, not formal SE acceptance; future scheduling or child-agent adapters remain separate consumers. |

Concrete corrections from this review: selecting only model.api did not select a
native transport; stored baseUrl previously had no execution effect; extension
context was collected without reaching the model. The implementation now fixes
all three and keeps dynamic context out of the stable system prefix. It also
closes the admission/key race and the SDK event-emitter persistence gap.

Validation: 118/118 regression tests passed, including six focused foundation and
protocol tests and two extension restart checks. The independent upstream review
found the old activation reset; startup now restores status/generation, requires
reload for changed versions and preserves dormant catalog records. Fixtures establish mechanics, not real-model quality or paid
provider cache hits. No frontend, domain extension or dependency lock changed. See
[upstream integration boundaries](upstream-integration.md).
