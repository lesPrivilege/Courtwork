# P03-B Pi Runtime Port — independent bounded review

Date: 2026-09-21
Reviewer: Luna (non-author)
Candidate: `c2be5945b2a8eecd3e5213c0a345b7b1d00e2943`
Base: `172118a`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-pi-runtime-port-20260921`

## Disposition

**Accept the bounded behavior for parent integration, with D1/D3/D4 retained as architecture follow-ups.** I found no concrete behavioral blocker in the requested P03-B scope.

The port extraction keeps Pi session ownership in `app/runtime/pi-runtime-port.mjs`, while `RuntimeService` retains admission, Run identity/status, tool governance, effects, credentials, deadlines and Host settlement. The composition root supplies the required port; the service no longer imports `SessionManager` or directly starts Pi sessions.

## Source checks

- `app/server/service.mjs:2481-2489` resolves command receipts before capability/provider checks, then refuses unsupported `start`/`continue` before `store.createRun`.
- `app/server/service.mjs:2551-2584` leaves the serialized command/run admission race in the store. Native session creation is deferred until after the single owner is known (`:2633-2638`), so a concurrent retry cannot create a second journal writer.
- `app/runtime/pi-runtime-port.mjs:57-79` opens an existing locator in place or creates the established `<dataDir>/pi-sessions/<sessionId>` journal, translates Pi events through `mapSessionEvent`, and returns the wrapped `steer` handle. `:83-93` exposes compaction and explicit named refusals for `recover` and `submitToolResult`.
- `app/server/service.mjs:2980-2995` preserves the existing admission gate for observations. Once cancellation sets `admissionOpen:false`, late non-run observations are discarded; only the existing retained MCP receipt exception remains.
- `app/server/runtime.mjs:44-47` constructs the port at the composition root and passes it into the required service constructor.

## Verification

Command 1, from `app/`:

`node --test tests/pi-runtime-port.test.mjs`

Exit 0: **6 tests, 6 passed, 0 failed**.

The six cases cover:

1. first journal creation and second-Run continuation through the same native locator;
2. reopening and appending a pre-extraction journal;
3. command retry deduplication with one Run, one open, one start and one journal;
4. suppression of observations injected after confirmed cancellation;
5. explicit refusal of unsupported operations and pre-persistence capability refusal for compaction/continuation;
6. required port construction inputs.

Command 2, from `app/`:

`node --test tests/pi-runtime-port.test.mjs tests/answer-admission-race.test.mjs tests/provider-open-admission.test.mjs tests/cancel.test.mjs tests/execution-file-continuity.test.mjs tests/work-continuity.test.mjs tests/work-http-recovery.test.mjs tests/async-recovery-independent.test.mjs tests/extension-restart.test.mjs tests/compaction-runtime.test.mjs tests/compaction-lifecycle.test.mjs tests/manual-compaction.test.mjs`

Exit 0: **56 tests, 56 passed, 0 failed** (36.084s).

This covered the requested admission, cancellation, continuation/steering, journal restart/recovery and compaction neighbors. `git diff --check 172118a..HEAD` exited 0 and the worktree remained clean. Full raw output and exact commands are in [/tmp/cw-p03b-luna-review.log](/tmp/cw-p03b-luna-review.log).

Source hashes at review time:

- `app/runtime/pi-runtime-port.mjs`: `7a2f5846c60463646035fb5d1dca548c4f16873f7cb9f76e5d381a06fa8da1c7`
- `app/server/runtime.mjs`: `6e31b9ad688cf8da1224c9c2a85c4c5a1946f8c9eb356f6b7f2d9b4f2cae6005`
- `app/server/service.mjs`: `622527d898198cf534df0600ff7f57ad8c8879cd39155e27ebf60e5d70dd799f`
- `app/tests/pi-runtime-port.test.mjs`: `62ede0f55479fe611e31a91d05c97ead146e7bd63b435729622516779b50ccf0`
- `app/tests/execution-file-continuity.test.mjs`: `6cb30cd085578f8151ed354b1c58048a66443d3caa054a4fce1333c730f57c94`

## Counterexample assessment

### Capability preflight before persistence

Covered concretely by the new test: a wrapped port reports `compact` and `continue` unsupported; both HTTP requests return 409 `runtime_capability_unsupported`; no `openSession`, compaction operation, or new Run is recorded. The normal `start`/`continue` capability selection occurs after receipt replay but before `store.createRun`, preserving retry identity and refusing new work without persistence.

### Session retry identity and journal reopen

Covered by the new tests and adjacent `work-continuity`/admission suites. A settled retry returns the original Run receipt and does not reopen Pi. A second distinct Run opens the stored locator and appends to the same journal. A journal created by the pre-port path reopens in place, preserves the locator, and grows by append.

### Late-event cancellation

Covered by a real sink capture plus adjacent cancel tests. After cancellation, injected assistant/tool observations leave the event list byte-identical and the Run remains `cancelled`. The production gate matches this: `admissionOpen:false` suppresses late non-run observations, while the pre-existing retained MCP receipt rule remains explicit.

### Steering

The `execution-file-continuity` steering case passes through `entry.steer`, which is returned by the port's wrapped `createSessionRun` handle so `beforeExtraInput` still marks file coverage unknown. This preserves the existing Host behavior. There is no HTTP steering route; the author records that limitation and exposes `steer` because the current accepted test and Host active entry consume it. Treat this as the recorded D3 architecture choice, not a failed behavior in this slice.

## Remaining limits and decisions

- No paid/real provider, browser, computer-use flow, credentials, ports 8787/8899, or personal data were used.
- No second runtime exists, so cross-runtime capability isolation is shown only by refusal on the wrapped Pi port.
- `recover` and `submitToolResult` are explicit unsupported capabilities because Pi's loop is in-process; restart behavior remains the Host's existing `unknown` path.
- D1 (required composition-root port), D3 (declared but currently non-HTTP steering handle), and D4 (existing `{type,data}` observations rather than the future Agents API observation vocabulary) remain parent architecture decisions. D5's model-runtime ownership is preserved and was not expanded.
- The author reported transient failures in earlier full-suite runs and a final clean full run; I did not repeat the full suite. The bounded command above is independently green.
