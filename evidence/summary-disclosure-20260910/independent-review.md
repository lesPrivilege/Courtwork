# Independent fixture review

- Reviewer: Luna, non-author, bounded review only.
- Fixed product: `21113758a73d5c8311eee570864856c6ab4f7947` (`2111375`).
- Worktree: independent Courtwork worktree, branch `codex/summary-disclosure-r2`.
- Fixture endpoint: `http://127.0.0.1:8977/`; `8976` and its browser tab were left untouched.
- Runtime: a separate temporary Runtime11/Core4/app5 created by `serve.mjs`; the fixture log reported synthetic `sessionId`, `otherSessionId`, and `runId`. No personal data or paid provider was used.

## Previous counterexample

On the initial in-flight fixture at port `9876` (`HEAD 67ed0fd` with the then-uncommitted older fixture; no exact product SHA is available), I used CUA to create the second synthetic session, select `error`, expand Details, click Retry, immediately select `Secondary synthetic`, wait 800 ms, and return to `Source review · synthetic`. The AX state showed `Run summary → Loading → Loading run details…` with no Retry action. This was the stale loading window later addressed by the scoped generation changes. No screenshot was persisted for that run.

## Fixed-SHA checks completed

- `node --check evidence/summary-disclosure-20260910/serve.mjs` passed.
- `node --check evidence/summary-disclosure-20260910/fixture.mjs` passed.
- `GET /fixture-config.json` on `8977` returned `200 application/json`.
- The same endpoint with `Host: localhost:8977` returned `403`, confirming the loopback Host gate.
- Static host seam review found no authority duplication: `fixture.mjs:1-8` imports the appended real host exports; `:11-20` scopes reads by active session/view/epoch; `:41-55` uses the host open/read intents; `:56-63` only observes host surface state and calls existing `closeSurface`.
- Host source confirms `openRun` records the opener through `activateSurface` (`app/web/app.mjs:3948-3967`), Escape collapses through the existing `setSurfaceExpanded` (`:3397-3421`, `:5873-5883`), and `closeSurface` owns return-focus (`:3561-3573`). No static architecture blocker was found for the intended fixture-only bridge.

## CUA status

The required final-SHA CUA run (error → Retry → second synthetic session → return → Retry recovery; Details → Open → Escape) is pending because this subagent's `mcp__cua_repl` currently reports `browsers: []`. I did not use or alter the parent's IAB tab 1, port `8976`, or its data, and I have no screenshot paths to claim for the final-SHA run. This evidence must not be read as native-host or live-product acceptance.
