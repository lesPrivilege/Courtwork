# P03-B · Pi execution port — author delivery, 2026-09-21

Author record for the Fable core lane of [next-dispatch-20260921](next-dispatch-20260921.md). Owner remains [RD-001](../../research/RD-001-runtime-adapter.md) and [P03/DRT-03 slice B](../../research/agents-api-first-2026-09-14/implementation-plan-20260916.md). This is an author's delivery awaiting Codex's independent verification; nothing here is an acceptance claim, and it closes nothing beyond slice B.

## Pickup state

- Actual main at pickup: `172118a` (the dispatch's planning SHA `af1cfad` plus the docs commit that carries the dispatch). Dirty paths on main: only untracked `.agents/`, `.obsidian/`, `skills-lock.json`; untouched.
- Worktrees at pickup: legacy-frozen (`f9ade85`), `claude-answer-footer-20260921` (`af1cfad`, claimed by the Chat author — not touched).
- Main moved to `c5de23c` during the work (footer accepted; the dispatch now queues a Composer working-location entry ahead of Runtime management). `git diff 172118a..c5de23c` touches nothing under `app/server`, `app/runtime`, or the test files changed here, and leaves the core-lane text as it was. The branch was not rebased, so the source SHA stays `172118a`.
- Writer worktree: `../.worktrees/courtwork-pi-runtime-port-20260921`, branch `claude-pi-runtime-port-20260921`, from `172118a`. `app/node_modules` cloned copy-on-write from main; `npm ls --depth=0` clean. No server was started on any port; 8787, 8899 and user data untouched. No credentials, paid calls, dependency changes or network use.

## Sonnet preflight (exploration, not acceptance)

Bounded read-only map at `172118a`; it overran its 20-call budget (26 calls) and said so. What I used from it, each re-verified against source before acting:

1. Pi session handling in `service.mjs` was exactly: the `SessionManager` import; `#ensureHostSession` (open / create + locator); `SessionManager.open` in `#executeCompaction`; one `getEntries().length === 0` read for file-memo clean-session eligibility; the `createSessionRun` and `compactSessionJournal` calls. Every other `@earendil-works/*` import under `app/server` and `app/runtime` is `Type` for tool schemas or `parseFrontmatter`, unrelated to session lifetime.
2. Journal path is `<dataDir>/pi-sessions/<sessionId>`; the locator `{id, path}` is Host data in `store.hostSession` / `run.hostSession`. There is no journal migration code and none is needed: the on-disk format and locator are unchanged.
3. Cancellation: Host-owned status arbitration (`cancelRun`, the `finally` of `#executeRun`), Pi-owned sticky `stopped` shim inside `createSessionRun`. Idempotency: the command receipt lookup and `store.createRun` happen before any native session is opened.
4. `agents-api-adapter.mjs` / `agents-api-contract.d.ts` are protocol-only and offline; consumed as delivered, not edited.
5. No injection seam existed for the runtime; tests either call `createSessionRun` directly or seed a real journal and hand its path to the store.

**The map missed one consumer**, found by the suite rather than by reading: `tests/execution-file-continuity.test.mjs` steers a live Run through `service.active.get(id).session.steer(...)`, i.e. through the raw Pi `AgentSession` the Host entry used to hold. See decision D3.

**SDK pin difference, recorded for the later transport owner, not acted on:** the delivered adapter pins `openai` **7.15.0** (`app/runtime/agents-api-adapter.mjs:41-45`, verified 2026-09-15, with tarball hash); the implementation plan names **7.16.0** as the candidate (`implementation-plan-20260916.md:57`, explicitly unverified against the published artifact). Both records are preserved; no dependency was changed.

## What changed

| File | Change |
|---|---|
| `app/runtime/pi-runtime-port.mjs` (new, 95 lines) | `createPiRuntimePort({ dataDir, modelRuntime })`: `id`, `describe()`, `openSession({ sessionId, workspaceDir, nativeRef })` → `{ nativeRef, historyIsEmpty(), start(options) }`, `compact(...)`, and `recover` / `submitToolResult` that throw `RuntimePortError` (`runtime_capability_unsupported`). Owns the adapter identity string, the journal root, `pi-agent` dir, `SessionManager.open/create`, and the native-event → `{type,data}` translation. |
| `app/server/service.mjs` | No `@earendil-works/pi-coding-agent` import; no `SessionManager`, `createSessionRun`, `compactSessionJournal` or `mapSessionEvent`. Requires a `runtimePort`; `adapterId` is the port's `id`. `#ensureHostSession` deleted. `#onSessionEvent(event)` became `#onObservation(observation)` with the same redaction, admission gate and persistence. Adds `#runtimeCapability` / `#requireRuntimeCapability`. |
| `app/server/runtime.mjs` | Two lines: the composition root builds the Pi port and passes it. **Outside the file list the dispatch gave me** — see D1. |
| `app/tests/pi-runtime-port.test.mjs` (new) | Six cases, below. |
| `app/tests/execution-file-continuity.test.mjs` | One expression: `.session.steer(` → `.steer(` (D3). |

`app/runtime/pi-session-runtime.mjs` is unchanged: `createSessionRun` and `compactSessionJournal` stay the Pi implementation, and the tests that call them directly keep their meaning. Store, schema, web renderers, Models semantics, Pi version, hook loader and child-agent dispatch are untouched.

Host keeps, unchanged: admission and configuration serialization, command receipts, Run identity/status and the final-status priority chain, `governTools` and permission decisions, candidate/check effects, runtime bindings, credentials, deadlines and budgets, MCP effect settlement, the Core bridge. The port receives tools that are already governed and reports only what Pi returned; it holds no Run status.

Ordering preserved: the native session is still opened inside `#executeRun`, after `store.createRun` has decided the single owner, so concurrent retries of one `commandId` cannot each open a journal writer. `historyIsEmpty()` is read lazily at the same point the old `getEntries()` read happened.

## Decisions returned to Codex

- **D1 · composition root.** The Pi port is constructed in `createRuntime` and is a required constructor argument of `RuntimeService`; the service has no default runtime. The alternative that would have stayed inside my file list — a Pi default inside the service constructor — makes the Host quietly choose a runtime, which is the fallback the exit condition forbids. Two lines in `runtime.mjs`; please rule on the widening.
- **D2 · capability refusal has three real consumers**, not a registry: `/compact` availability in command facts, `compactSession` (409 before any operation record), and Run admission (`start` for a Session with no native session, `continue` otherwise; 409 before `store.createRun`). Refusal happens before the runtime is reached and before anything is persisted. `recover` and `submitToolResult` are declared unsupported with reasons, because Pi's loop is in-process and executes tools itself; the Host's existing "not in process → `unknown`" path is therefore still the only restart behaviour, unchanged.
- **D3 · steering.** The started handle exposes `steer(text)`, routed through `createSessionRun`'s wrapped method so `beforeExtraInput` still marks file coverage unknown. It exists because an accepted test depends on that path and the Host must not hold a Pi `AgentSession` to reach it. There is still no HTTP steering route; `steer` is declared in `describe()` because the handle really has it. If Codex prefers no declared-but-unrouted capability, the alternative is to move that test case down to `createSessionRun` level and drop `steer` from the port.
- **D4 · observation shape.** The port emits the existing `{type,data}` event vocabulary (`assistant.delta`, `assistant.message`, `tool.start|update|result`), not the `AgentsApiObservation` type from the protocol slice. Unifying the two vocabularies is a cross-layer decision for slice C's owner; I did not pre-empt it.
- **D5 · `modelRuntime` stays a Host object** handed to the Pi port at construction. It is Pi's class but it is the provider/credential plane, which the dispatch excludes. `service.mjs` still imports provider helpers from `pi-session-runtime.mjs`; that is Models coupling, not session handling, and is left for its owner.

## Evidence

All from the writer worktree, Local test provider, loopback only.

New cases (`node --test tests/pi-runtime-port.test.mjs`, 6/6), each through `startServer` → HTTP → production `RuntimeService` → production Pi port, with a wrapper that only counts calls and keeps the observation sink:

1. Two Runs in one Session: `adapterId` still `pi-coding-agent@0.85.1/agent-session`; first open has `nativeRef: null`, second reopens by the stored locator; one journal file under `pi-sessions/<sessionId>`; journal user turns are `["first","second"]`.
2. A journal created the pre-extraction way (direct `SessionManager.create` + `store.setHostSession`) is opened in place; locator unchanged on Session and Run; the file only grows (`after.startsWith(before)`).
3. Three concurrent posts of one `commandId`, then a post after settlement: one Run id, one `openSession`, one `start`, one journal file.
4. After a confirmed `cancelled`, `assistant.message`, `tool.start` and `tool.result` pushed into the Run's real sink leave the Session's event list byte-identical and the status `cancelled`.
5. Real port: `recover()` / `submitToolResult()` throw `runtime_capability_unsupported`; every unsupported row has a reason. With `compact` and `continue` marked unsupported: both HTTP calls answer 409 `runtime_capability_unsupported`, the runtime is never reached, no Run and no operation is recorded.
6. The port refuses construction without `dataDir` or `modelRuntime`.

Full suite (`npm test`, 1326 tests with the six new ones):

| Run | Result | Note |
|---|---|---|
| Baseline at `172118a`, before any edit | 1 failure | `review-core-client-lifecycle` "bridge ready timeout"; 13/13 alone. Not Pi-related. |
| Change, run 1 | 1 failure | `execution-file-continuity` steer case — **caused by this change**, deterministic 5/5, root cause D3, fixed. |
| Change, run 2 | 2 failures | `run-lineage` BG02-T2 and `work-continuity` concurrent admission, 15–23 s each. Both files 12/12 in three isolated reruns. I did not capture their error text under load, so "load flake" is my inference, not a finding. |
| Change, run 3 | 1326/1326 | |

`npm run smoke` passes, including runtime close/reopen and session continuation. Existing fixtures that cover the dispatch's comparison list ran inside the full suite unchanged: admission/replay (`answer-admission-race`, `provider-open-admission`), deny/approval (`prepare-and-approval`, `check-approval-revision`, `governance-recovery`), streaming boundaries (`assistant-stream-projection`), fixed check (`check-recipes`), cancellation (`cancel`), restart recovery (`extension-restart`, `async-recovery-independent`, `work-http-recovery`), compaction on seeded journals (`compaction-runtime`, `compaction-lifecycle`, `manual-compaction`).

Check for the exit sentence, from `app/`: `grep -n 'SessionManager\|pi-coding-agent' server/service.mjs` prints nothing.

## Not done, not claimed

- No real provider, no browser or computer-use pass; nothing here exercises a paid model.
- No second runtime exists, so "no cross-runtime capability leakage" is shown only as refusal against a wrapped Pi port, not against a real alternative implementation.
- The unexplained run-2 failures above. An acceptor with a quieter machine should rerun the full suite rather than rely on my isolation reruns.
- Late observations are injected after settlement. Events racing *during* `stopping` are covered only by the pre-existing `cancel` tests through real Pi, as before.
- No live Agents API, CLI orchestration, hooks or cross-runtime handoff. P03-C–F not started.

## Writer release

One commit on `claude-pi-runtime-port-20260921`; tree clean after it. The writer is released: `app/server/service.mjs`, `app/server/runtime.mjs`, `app/runtime/pi-runtime-port.mjs` and the two test files are free for Codex's verification and integration. Not pushed, not merged; `engineering/current.md` and shared acceptance summaries not edited.
