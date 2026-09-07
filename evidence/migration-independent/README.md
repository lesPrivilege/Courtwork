# Fresh integration independent acceptance

Candidate: `codex/fresh-integration` @ `5f3c4cd`.

The acceptance covers that candidate plus the two uncommitted parent fixes present during validation. Full SHA-256 fingerprints of the reviewed files at validation time:

- `app/web/app.mjs`: `d9cad2d13cc7a8173da8557ccc1132f7a85a02986d389b6fdcc076030fabc1c1`
- `app/web/settings-view.mjs`: `943e1ac50e242ddf726eb0c88c681aa9961a5fb480dd3e63484111a2b3d72bab`

This directory contains independent regression evidence for the focused settings permission control and schema/runtime seams. It does not modify application source. The parent worktree also has unrelated documentation and metadata changes; those are outside this acceptance scope.

## Executed checks

- `npm test --prefix app`: **134/134 passed** after the parent’s focused-control and connection-card fixes.
- `node --test evidence/migration-independent/permission-setting-counterexample.mjs`: **2/2 passed**.
- `node --test evidence/ui-maturity/surface-counterexamples.mjs`: **9/9 passed**.
- `node --test evidence/ui-maturity/message-edit-counterexamples.mjs`: **4/4 passed**.
- `node --test evidence/ui-maturity/run-receipt-counterexamples.mjs`: **5/5 passed**.
- `node --check app/web/app.mjs`, `app/web/settings-view.mjs`, and `app/web/ui-controls.mjs`: passed.
- `git diff --check`: passed.

The 134-test suite covers the existing schema 3 → schema 4 backup/fence, runtime binding, permission admission, active-run configuration freeze, host-session continuation, MCP discovery and unknown outcomes, workspace durability, idempotency, credentials, sync, and history contracts.

## Focused permission evidence

The first test drives a successful `draft → ask` update while the radio keeps focus, then makes the next `ask → read_only` request fail. It verifies that the focused panel does not retain a stale closure and restore `draft`; the authoritative `ask` selection remains checked.

The second test leaves a permission request pending, refreshes the focused panel, then starts a run before the request resolves. It verifies that the optimistic selection does not flash back to the old value, the fieldset stays disabled while the run is active, and request completion cannot unlock it early.

The historical pre-fix failure is preserved in [permission-setting-counterexample.before-fix.txt](./permission-setting-counterexample.before-fix.txt). The passing output is preserved in [permission-setting-counterexample.after-fix.txt](./permission-setting-counterexample.after-fix.txt).

The relevant fix is in `app/web/settings-view.mjs`: focused panels synchronize checked state and disabled state from the current session, pending updates avoid overwriting the optimistic choice, and the completion path rereads current session state. `segmentedPermission` accepts a dynamic disabled getter, so a run that begins during a request cannot be unlocked by an old closure.

## Other review findings

- User-message actions remain native buttons, reveal on `:focus-within`, and stay visible on touch-capable layouts.
- The connection badge remains a button with `aria-expanded` and `aria-controls`; the connection card uses native popover behavior.
- Closing the connection card now restores focus to its opener.
- The service-side permission mode remains guarded by the allowed-mode set, active-run admission, and configuration queue.
- Schema 4 storage still retains `permissionMode`, `hostSession`, and run facts; schema 3 migration retains an exact backup.

These checks support accepting the candidate for the reviewed seams. They do not claim a real external provider call or a complete takeover flow.

## 4fab4bd incremental acceptance

The merged delivery is `d44fb28` (`4fab4bd` merged onto `787bf1c`), with the reviewed visual delta isolated by `git diff f8e3c19..4fab4bd`. The delivery adds the runtime working clock and activity-ledger shimmer in `app/web/app.mjs` and `app/web/styles.css`; the previously accepted focused-permission fix remains in `app/web/settings-view.mjs`.

- Combined UI and permission evidence in [4fab4bd-ui-tests.txt](./4fab4bd-ui-tests.txt): **20/20 passed** (18 UI regressions plus 2 permission probes).
- `node --check app/web/app.mjs`, `app/web/settings-view.mjs`, and `app/web/ui-controls.mjs`: passed.
- `git diff --check`: passed. The command result is preserved in [4fab4bd-syntax-diffcheck.txt](./4fab4bd-syntax-diffcheck.txt).

The timer lifecycle is bounded to `currentRun()`'s active statuses (`created`, `running`, `waiting_user`, `stopping`). `renderComposer()` hides the hint and stops the interval on every non-active render; active renders call `startWorkingClock()`, which paints immediately and installs at most one one-second interval. `paintWorkingClock()` stops itself when the run or hint disappears, clamps negative elapsed values, and uses the recorded `startedAt` only as a local elapsed reading. Session changes clear `state.runs` before the next render, so the old session cannot keep the clock visible.

The activity shimmer is applied only when the grouped tool rows contain a non-result action for an active run and no failed row (`app/web/app.mjs:2254-2257`). Terminal or interrupted actions clear `is-working`, and a failed group remains visibly marked without an active shimmer. The waiting state uses a distinct static accent and wording (`app/web/app.mjs:2607-2621`).

Reduced motion remains respected in both layers: the existing global reduced-motion rule disables animation and transitions, while the new rule clears the shimmer gradient and fixes its text color and disables the composer dot loop (`app/web/styles.css:2539-2547`). The segmented thumb transition is likewise covered by the global transition reset. No harmful timer, active-state, or reduced-motion counterexample was found.

Final SHA-256 fingerprints of the merged files at this acceptance point:

- `app/web/app.mjs`: `ca1d12ce0ded325ea223e1f6ad9310012e529e460c7c09d5fffab3d4a027ee69`
- `app/web/styles.css`: `1368dc8b9c6bf983de5e13145f77e66c5d437c1499e20ba341e2d7765a292556`
- `app/web/settings-view.mjs`: `943e1ac50e242ddf726eb0c88c681aa9961a5fb480dd3e63484111a2b3d72bab`
