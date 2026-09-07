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
