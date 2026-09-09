# Run attempts and lineage v1 · BG-02 / RuntimeStore 9

A Run that ended without an answer can be continued by a **new Run that says so
in the record**. This first slice stores that statement and refuses the cases
where it would be a lie. It does not add a scheduler, an automatic retry, a
second attempt entity, an attempt counter or a replay of anything the earlier
Run did. [Adjudication](../../engineering/execution/2026-09-10-backend-governance/bg02-rulings.md)
BG02-D01…D10.

## Owner and field

The attempt owner is the host execution owner: the RuntimeStore Run. Lineage is
one field on that record, `supersedes`, holding the ID of the Run this one
continues, or `null`. There is no attempt table, no attempt ID and no stored
attempt number; a reader derives position by walking the chain. Work Core
`app_run` is unchanged, and no `run.*` event type is added — `GET /sessions/:id`
already returns the Run records that carry the field.

`POST /sessions/:id/runs` accepts exactly `{input, commandId, supersedes?}`.
When present, `supersedes` must be a non-empty string of at most 200 characters;
anything else, including `null`, is `400 invalid_input`, and an unknown field is
`400 unknown_field`.

## Set at creation, never afterwards

Lineage is decided when the Run is created and is immutable from that moment.
There is no update route and no repair route. Neither the model nor the runtime
creates a Run, so neither can declare its own lineage: the statement is always a
human admission through the HTTP route.

## Legal targets and the five refusals

The target must exist, belong to the **same Session**, have already ended, and
have ended in `unknown|failed|cancelled`. Refusals, in the order they are
decided inside the store's serialized mutation:

| Situation | Answer |
|---|---|
| No such Run, or a Run of another Session | `404 not_found` |
| The target has not ended | `409 supersede_active` |
| The target completed | `409 supersede_completed` |
| The target already has a continuation | `409 supersede_conflict` |
| The target's error is `mcp_effect_unknown` | `409 effect_unreconciled` |

A missing Run and a Run of another Session return the identical body, so lineage
cannot be used to probe another Session's Run IDs. Messages are fixed strings and
carry no caller data. A `completed` Run is not a failure to continue; whether a
"redo" of a completed Run has a meaning is left open. An unreconciled external
effect is BG-03's subject: the host will not start a continuation while it cannot
say what the previous Run already did outside the machine.

The lineage decision is made **before** the single-active-run gate, so naming a
live Run reports `supersede_active` rather than the generic `active_run`.

## The chain does not fork

At most one Run may continue a given Run. A second attempt to continue the same
target is `supersede_conflict`, whether it comes from the same or a different
`commandId`. Lineage is therefore a chain, never a tree, and there is no merge,
branch or "best attempt" selection.

## Idempotent identity includes lineage

The command receipt compares `(sessionId, commandId, input, supersedes)`. The
same `commandId` with the same input and the same lineage returns the retained
receipt and starts nothing; the same `commandId` with a different (or absent)
`supersedes` is `409 command_conflict`, because continuing a different Run is a
different intent, not a retry. Uniqueness, lineage admission and the active-run
gate all run in one `store._mutate` closure, so two racing requests observe each
other in order.

## No input is copied, nothing is replayed

A continuation carries its own `input` and its own `commandId`. The host never
copies the earlier prompt, re-emits its `user.message`, re-launches its tools or
re-sends any external action — the AM-B no-replay rule is unchanged. Reading what
the earlier attempt produced is an ordinary, explicit read in the same Session
(async tasks keep their existing get/wait); this slice changes nothing in
`async-tasks`, MCP or coordination.

## Schema 9 upgrade and old hosts

RuntimeStore 8 → 9 adds `supersedes` to the Run record. Validated schemas
3/4/5/6/7/8 are strictly validated in their own shape first, then preserved
byte-exactly in an exclusive mode-0600 backup `runtime-state.schemaN.<sha256>.json`,
and only then is the upgraded state atomically published. Every pre-existing Run
is given `supersedes: null`: history is never reinterpreted into a chain. An
occupied backup path (including a symlink) refuses the upgrade and leaves the
state file untouched.

`validateState` accepts the field for schema ≥ 9 and requires every stored link
to name a terminated Run of the same Session; a state file that lost that
property is a corrupt ledger and the host fails closed rather than repairing it.
Hosts before this change reject schema 9 outright. To restore, use the original
backup with a matching old host in a **separate** data directory.

## Restart

A continuation is an ordinary Run at restart: if it was in flight it becomes
`unknown` with `error.code = restart_unknown`, keeps its `supersedes`, and may
itself be continued. Run creation is a single `_mutate`, so there is no second
marker that a crash could tear apart from the record.

## Out of scope

No scheduler, no automatic retry, no attempt budget or backoff. No Core change,
no UI, no `run.*` event, no change to async tasks, MCP, coordination or
permissions, and no real provider. External-effect receipts remain BG-03. Whether
the `inspect` recovery hint should advertise lineage is not decided here.
