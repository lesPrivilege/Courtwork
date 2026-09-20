# Deterministic replay input — SYNTHETIC, not agent evidence

Everything on this page is a **fixture**. The Local test provider replays a
literal tool script; no model reasons about anything. A result produced here
says the Host wiring works. It says nothing about whether an agent can find or
fix the defect, and it must never be filed as real-model evidence.

The known fix is written into the script below on purpose. That is exactly why
this input is kept away from the [real-model prompt](real-model-prompt.md).

## Whole path, offline, in one command

```bash
node scripts/coding-dogfood-rehearsal.mjs
```

Run from `app/`. It prepares its own scratch instance, starts a real Host
process on an ephemeral port, drives the public HTTP routes, stops that
process and continues in a second one. It writes
`<scratch>/rehearsal-report.json` and exits non-zero on any failure. It never
touches the instance prepared for the browser pass.

`npm run dogfood:rehearsal` is the same thing.

## In-browser wiring check, no answer included

To confirm the Local test provider, the binding and the check are wired in a
browser without handing over the fix, paste this as the Chat message. It reads
the defective file and runs the check; the check is expected to exit **1**.

```text
/fixture script [{"name":"repo_read","arguments":{"path":"src/parcel.mjs"}},{"name":"check_run","arguments":{"recipeId":"node-test"}}]
```

Approve the check when the card appears. `Exit 1` on the tool row, with the
failing assertion in its `stderr`, means read + check are wired.

A `/fixture script` that also carries the corrected file text would make the
check exit 0, which is why one is not printed here: the only supported way to
see exit 0 in the browser is an edit somebody actually approved.

## Why the fixture's call ids repeat

The Local test provider numbers tool calls per **Host process**
(`fake-script-<request>-<step>`), so a call id from before a restart can
reappear in a later Run. The Host fences on the `(Run, call)` pair, which
stays unique. Any evidence read across a restart must key on both — the
rehearsal asserts this, and records how many ids were reused.
