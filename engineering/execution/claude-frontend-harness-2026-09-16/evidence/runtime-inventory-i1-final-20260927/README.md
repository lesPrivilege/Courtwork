# I1 backend acceptance — 2026-09-27

Parent Astra accepts the existing Sol delivery `2a4326930009eb526b2a248b163abc9e6e5c5733` under [the original I1 contract](../../06c-runtime-management-20260921.md#2026-09-26--production-continuation-i1-truthful-host-inventory), integrated as local main `766a4fb`. The sole integration conflict was two appended sections of the owner record; both the actual dispatch and author receipt are retained. No product code conflict or replacement author was introduced.

Authenticated `runtime-info` now reports existing configured executors and explicit unavailable candidates before any Session is needed. Host default, Session-selected identity, configured descriptor/ref/capabilities and live verification remain distinct. All rows retain `liveStatus: not_checked`; no connection, process creation, credential check or provider inference is performed by the inventory read. This is backend acceptance, not completed production Settings or live managed-runtime support.

Evidence:

- Luna fixed-source [review](i1-luna-review.md), [25/25 raw test output](i1-luna-tests.stdout.txt): unchanged-state reads, row-local failure/sentinel handling, detached capabilities and default-versus-selected semantics.
- Integrated-main [4/4 inventory checks](integrated-main-tests.log) and [fake runtime smoke](integrated-main-smoke.log), both exit 0. Original author's broader1713/1713 remains author evidence at its source; the whole suite was not repeated here.
- After the concurrent DS-1 dogfood Run completed and activeRuns was zero, parent restarted the user-requested Host from main. [Live authenticated API observation](live-api.json) shows Pi configured, managed `agents-api` not configured, both not_checked; repeated runtime-info responses equal and the public Session list unchanged. The completed DS-1 detail also remains equal across restart. No inference was requested by these reads.

No Host/Core schema, native configuration, permission or frontend change. The original Sol source tree and all other writers are preserved. Main was not pushed or deployed.

## Claude production06c handoff

The backend dependency is satisfied. The existing Claude/Opus owner may consume `executionRuntimes` in Settings/Agents as a read-only list → detail → refresh → return journey under the original contract. Read current main/HEAD, UX/frontend/visual-spatial grammar and the existing 06c controller/view/fixture before writing. Keep fixture mutation controls out of production; do not invent connection checks or Session creation to fetch inventory. Record loading, empty, failed read, unavailable reason, configuration ownership and not_checked explicitly. Preserve focus and draft/navigation continuity. No new connect/disable/disconnect, executor-selection policy, gateway or schema work is included.

Acceptance requires a real authenticated backend-backed browser read before a Session, Pi/configured and managed/unavailable facts, refresh/failure recovery, and relevant keyboard/narrow view checks. Astra owns cross-layer decisions and final integration. This does not start a competing UI author or override CB-D1's existing frontend owner.

Dispatch facts: `claude agents --json` observes existing Courtwork author `4349cf50-12b0-40e5-a51b-943592f13a93` (UX Design polish 和 agent harness GUI) idle. A separate CLI `claude auth status` reports loggedIn false, authMethod none; its help exposes no direct send-to-existing-session command. No new Claude inference/session was launched or credentials inspected. This is a concrete ready handoff, not a claim that Claude has received or started it.
