# Explore before expanding · two observations, measured against the Host

2026-09-20 · Claude, before implementation and without implementing either.
Both were checked against the running Host on the isolated instance, not read
off the source. Neither is a proposal to redesign Home, to create a hidden Run,
to weaken an approval or to widen the fixed check runner.

---

## A · Starting a private candidate before the first paid inference

**Observed friction** (real dogfood packet, journey item 2): Home can stage a
folder but cannot start a candidate. A candidate needs a Session, and today the
only thing that creates one is sending the first message — so preparing where
edits will land costs a real inference before the person has decided anything.

**Do the Host routes already carry the semantics? Yes, completely.** Verified
end to end against the Host on 8912, with `curl`, in this order:

| step | call | result |
|---|---|---|
| 1 | `POST /sessions` | session `8a39d55f-…` created, no Run |
| 2 | `PUT /sessions/:id/repository-binding` `{operation:"bind", expectedRevision:0, rootPath}` | receipt, binding revision 1, active |
| 3 | `GET /repositories/inspect?rootPath=…` | `git.head = 58503f3df3af…` |
| 4 | `PUT /sessions/:id/repository-candidate` `{operation:"create", expectedRevision:0, expectedBindingRevision:1, baseCommit}` | receipt, candidate revision 1, **active** |
| 5 | `GET /sessions/:id` | candidate active, `writeRevision 0`, base `58503f3df3af` |
| 6 | `GET /sessions/:id/events?afterSeq=0` | `[]` — **zero events, zero Runs** |

The captured session is in
[host-receipts.json](browser/host-receipts.json) under the title
*"candidate before any inference"*. `#changeRepositoryCandidate` requires an
active binding, no active Run and a real base commit; it has never required a
Run to have happened. So this is **not** a backend gap and nothing needs to be
returned to Astra for it.

**Smallest existing-owner frontend change.** The sequence above is already
implemented, in order, inside `app.mjs`'s `startHomeRun` (session create with a
client-supplied `sessionId`, persisted creation marker before the POST, bind
with one reused `bindRequestId`, Session read back). The proposal is to let
Home's Workspace card reach that same prefix and stop before the Run:

1. On Home, when a folder draft is staged, the card's Edits section offers
   **Start private candidate** instead of hiding it.
2. Pressing it runs `startHomeRun`'s existing create-and-bind prefix, factored
   out as its own function, then the card's existing `startCandidate`. It uses
   the same persisted marker and the same idempotent `requestId`s, so a refresh
   or a lost receipt recovers the same chat rather than creating a second one.
3. The chat then exists with a folder and a candidate and no Run. Home's draft
   text and attachments stay where they are; the first send continues to be the
   first send.

What that costs the rest of the product: `state.homeStart` gains a state where
a session exists and no input has been sent, which `renderComposer` and the
recovery banner already model (`operation.session` set, `pending` false). The
sidebar shows a chat with no messages, which the product already allows.

**Exact evidence a change would have to produce**, in one bounded delivery:

- a seam test: Home with a staged folder → Start private candidate → exactly
  one `POST /sessions`, one `bind`, one `create`, and **no** `POST /runs`;
- the recovery case: the same action retried after a lost create receipt
  reuses `sessionId`/`requestId` and does not make a second chat or a second
  binding;
- the refusal case: no folder staged → the control is not offered, and a folder
  without a Git commit still gives `CANDIDATE_NO_GIT`, nothing sent;
- a browser pass showing the chat opening with the candidate already there,
  the Home draft intact, and the first send behaving exactly as it does today;
- Host receipts showing the Session's event list empty at the moment the
  candidate became active.

**Recommendation:** worth doing, in the existing owner, as its own bounded
item. It removes the only step in the coding journey that costs money before
the person has chosen anything. It should not be folded into this batch.

---

## B · Request arguments and candidate revision in pending tool / check details

This observation is really two, and they land on different sides of the line.

### B1 · Candidate revision in the approval's details — frontend only

**Already in the payload.** `permissionContext` for both governed tools returns
the candidate identity with the write revision, and `governTools` spreads that
context into the `permission.open` payload verbatim:

- `runtime/check-tools.mjs` `descriptor()` → `candidateId`, `candidateWriteRevision`
- `runtime/repository-candidate-tools.mjs` → `candidateId`, `candidateRevision`, `candidateWriteRevision`
- `runtime/control-tools.mjs` `governTools` → `requestPermission({ …, ...context })`

Confirmed on the wire: the `permission.open` events captured in
[host-receipts.json](browser/host-receipts.json) carry
`candidateWriteRevision`, and the product's own rehearsal already asserts
`askCheck2.data.candidateWriteRevision === 1` for a check bound to the write
its own Run just made.

**What the person sees instead.** `app.mjs`'s permission card renders the
details disclosure as `summary` + `payload.contentSha256` + a copy action
labelled *"Copy proposed arguments hash"*. The revision is dropped on the
floor by `permissionPresentation`, which never reads those fields.

**Smallest existing-owner frontend change:** `permissionPresentation` returns
the candidate reading it already has in the payload, and the details block
prints it beside the hash — the recorded candidate and the write revision this
approval is bound to, worded as the identity it is. Keeping write, check and
source identities distinct matters here: the revision names *which* candidate
state the check will run against, which is exactly the thing a person cannot
otherwise tell when a Run writes and then checks.

Evidence a change would have to produce: a projection test over a real
`permission.open` payload for both `repo_write` and `check_run`; the absent
case (a tool whose context carries no candidate) rendering nothing rather than
a zero; and a browser capture of both cards.

**Recommendation:** do it, in the existing owner, in the next bounded item. No
backend work.

### B2 · Request arguments for a pending tool call — a Host projection gap

**For a call that needs approval, arguments are already there.** `governTools`
puts `JSON.stringify(args)` (first 400 characters) into the approval's
`preview`, and the card renders it. The check approval in this journey showed
`{"recipeId":"node-test"}` on screen for exactly that reason.

**For a call that does not open an approval, there is nothing to show.** Pi's
`tool_execution_start` is projected as:

    case "tool_execution_start":
      return { type: "tool.start", data: { callId: event.toolCallId, name: event.toolName } };
                                          — runtime/pi-session-runtime.mjs

`callId` and `name`, and nothing else. `thread-projection.mjs` faithfully reads
`data.request ?? data.args ?? data.arguments ?? data.input` and finds none of
them, so a running tool row has no request detail to disclose. The adjacent
`message_update` handler deliberately drops tool-call argument snapshots,
with its reason stated in place: persisting them would flood the journal and
force a redraw per argument token.

So this one is **not** a frontend omission. Making a pending tool's arguments
readable needs the Host to decide what it records for a tool call that nobody
was asked about — the whole arguments once, a bounded preview, a hash, or
nothing — with the journal cost its comment already names.

**Returned to Astra as a backend gap.** The frontend consumer is ready: the
projection already looks for `request` on `tool.start`, and the disclosure
already knows how to show it. No product code was changed for this, and no
frontend workaround was built. Naming it precisely so it can be ordered: a
`tool.start` (or `tool.update`) payload that carries the call's arguments in
some bounded, Host-decided form, under the same redaction rules the approval
`preview` already follows.
