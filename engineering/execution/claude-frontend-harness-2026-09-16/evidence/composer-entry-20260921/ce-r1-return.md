# CE-R1 return · a plain Home Send keeps its location locked

2026-09-21 · Claude (Opus 5), the original Composer author, on
`claude-work-location-20260921`. This is the held candidate `ac6049b` with main
`6de5a84` merged in (merge `be6a999`, no web change from main) and one return
commit. It answers CE-R1 of the
[independent review](../composer-entry-acceptance-20260921/README.md).
**Not accepted.** Released for Luna's delta review and Astra's decision.

## Reproduced first, in the browser, with its effect at the Host

A gate proxy ([gate-proxy.mjs](harness/gate-proxy.mjs), evidence only) sits in
front of a real synthetic Host. It holds, without changing, the first request
at each of three points of one plain Home Send:
1. the bind, after the Chat exists;
2. the draft save, after bind and read-back;
3. Run admission.

At each hold [race.mjs](harness/race.mjs) opened Work location, recorded every
control, and pressed every enabled mutation. Before the fix
([race-before](race-before/race.json), [commands](race-before/race-gate.jsonl)):

| Hold point | Enabled mutations | Effect |
|---|---|---|
| after create, before bind | Connect folder…, path, Connect | — |
| bound, before admission | Change folder…, **Disconnect**, **Start private candidate** | Disconnect **landed** (binding revision 2, `revoked`); Start private candidate got **409** |
| Run admission in flight | Connect folder…, path, Connect | — |

The Run then completed against a revoked folder: the Send had lost its
location under it.

## The correction

- **The decision now lives in the owner, where tests can reach it.**
  `workLocationLock()` in `home-preparation.mjs` is a pure function beside
  `preparationState`. `app.mjs` only asks it, through `renderWorkspaceCard`'s
  `busyReason`. It returns a lock for:
  - **a plain Home Send, for its whole operation** — creating the Chat, then
    binding, reading back, flushing materials and saving the draft — as long
    as the card is reading that Send's own Chat. The reason shown is
    `SEND_BUSY`, or `PREPARE_UNCERTAIN` when the create is unknown.
  - **the Run admission the Send ends in**, and any Chat send. Because
    `submitHomeRun` clears the Home marker before it awaits `submitSessionRun`,
    the pending Run is what holds the location there. The reason is the new
    `RUN_SENDING`. The Run owner records an admission as unconfirmed *before*
    posting it, so while one is in flight both flags are set and in-flight
    wins. The browser measured this, which is why the order is what it is.
    Unconfirmed alone (a lost reply) gives `PREPARE_UNCERTAIN`. Once the Run
    is admitted, the card's existing `active` lock takes over.
  - **preparation**, exactly as before (PA-R2).
- **A settled Send holds nothing.** After a refusal or a failure, the folder
  can be corrected on the same Chat.
- **Two card gaps closed in the same seam.**
  - An unbound Chat's chooser now states the lock's reason; before, its only
    sentence was the help text.
  - A bound Chat no longer repeats the lock sentence under Edits.
- **The open panel repaints through every phase.** It follows the Send via
  `renderComposer` and the two `operation.session` assignments.

Reading stays available throughout. No Host contract, command, identity or
preparation step changed, and nothing is hidden from the person.

## After ([race-after](race-after/race.json), [commands](race-after/race-gate.jsonl))

| Hold point | Enabled | Reason shown |
|---|---|---|
| after create, before bind | only the path disclosure (the field and Connect inside it are disabled) | *Your chat is being started with this location, so it cannot change until that finishes.* |
| bound, before admission | only "Which is which" | same |
| Run admission in flight | only "Which is which" | *Your message is being sent with this location, so it cannot change until the run starts.* |

At the Host there was one bind (revision 1, `active`), no revoke and no 409,
and the Run completed. [Screenshots](race-after/): `race-1…3` and
`race-4-after-release`.

**Recovery, in the browser** ([recovery.json](race-after/recovery.json),
[commands](race-after/recovery-gate.jsonl)):
- A staged folder that does not exist is refused by the Host with its settled
  503, and Home reports *Could not start… Your instruction is kept.*
- The panel is unlocked again, with the chooser enabled and no lock sentence.
- The corrected folder binds on the same Chat. There is one `POST /sessions`
  in total.
- A second Send completes with binding revision 1 at the Host.

## Tests

[checks-ce-r1.txt](checks-ce-r1.txt) records the commands and totals.

- **New `home-send-location-lock.test.mjs` (7 tests).** It drives
  `workLocationLock` and the real `createWorkspaceCard` with the marker
  exactly as `submitHomeRun` holds it at each await: creating, created
  unbound, bound and read back. At every point, every location control is
  locked, the reason is said, and pressing all of them sends nothing to the
  Host. It also covers:
  - the ac6049b condition, shown returning no lock (the counterexample);
  - Run admission, in flight, in flight while also unconfirmed, and
    unconfirmed alone;
  - an unknown create;
  - a settled refusal, which unlocks, followed by one bind on the same chat.
- **`prepare-lifecycle.test.mjs`** now calls the production
  `workLocationLock` instead of a copy of the old inline logic. Its seam pin
  follows the decision into the owner.
- **Totals.** The 16 owner and adjacent suites pass 122/122. The lints,
  contrast report and `git diff --check` are clean. The full suite on the
  merged tree is 1352/1352.

`submitHomeRun` itself is still in `app.mjs`, which no test imports. The
whole-page race is therefore the browser pass above, not the unit file, and
the unit file does not claim otherwise.

## CE-F2 and the light-dismiss claim

- **CE-F2 is deferred, as ruled; the initial focus is unchanged.** The
  author README's focus claim is narrowed in place. A light dismissal returns
  focus only when focus would otherwise be left on the page or inside the
  closed panel; a click onto another focusable control keeps its focus, and
  that case was not driven.
- **Related placement limit.** While a bound Chat is locked, the lock sentence
  sits beside the disabled Disconnect, below the fold of a 431 px panel at
  1440×900, the same placement as the accepted PA-R2 precedent. Bringing it
  into first view belongs with CE-F2's initial-focus work.

## Not executed

- OpenAI computer use.
- Native page zoom, screen reader and forced colors.
- The race at 390 px or 200%; it was driven at 1440×900 only.
- A lost reply to the bind or to the draft save. Only the settled refusal and
  the gated in-flight windows were driven; the unknown-create lock is
  unit-tested.
- The native folder dialog (Connect folder… was not followed).
