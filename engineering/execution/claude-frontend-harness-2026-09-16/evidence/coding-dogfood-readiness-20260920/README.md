# Coding dogfood readiness and WebUI handoff

Order: [11 · Coding dogfood readiness and WebUI handoff](../../11-coding-dogfood-handoff-20260920.md).
Base: `0e06d7006f1e9262e850102e349fcc3bca6517f3` (main at pickup, one commit
past the order's observed `e687762`, which is the order document itself).
Branch: `claude-coding-dogfood-20260920` in worktree
`/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920`.
Author source commit: **`3f04f76fa4ffaa742598b19703195575f537c708`** — pin
this one; this packet is the commit after it, at the branch tip.
Author: Claude. Independent verification: Luna. Integration: Astra.

**Status: `ready for independent review`.** Not self-accepted, and **not**
`real-model dogfood passed` — no browser pass and no real model has run. N-02
stays open.

## What this delivers

One reproducible coding scenario a person can open in CW and hand to its
agent, plus the offline rehearsal that proves the assembled path works before
anyone spends a real model on it.

| Deliverable | Where |
|---|---|
| Preparation, startup, stop/restart, identity rules, cleanup | [startup-and-launch.md](startup-and-launch.md) |
| Natural-language task for the real model | [real-model-prompt.md](real-model-prompt.md) |
| Deterministic replay input, labelled synthetic | [deterministic-replay.md](deterministic-replay.md) |
| Browser checklist, blanks for the real pass | [browser-checklist.md](browser-checklist.md) |
| Rehearsal console output / machine report | [rehearsal-run.log](rehearsal-run.log) · [rehearsal-report.json](rehearsal-report.json) |
| Test evidence | [targeted-tests.log](targeted-tests.log) · [full-suite.log](full-suite.log) |
| Final source hashes | [source-sha256.json](source-sha256.json) |

## The new seam

The existing runtime smoke is in-process and exercises `ws_*` artifacts; it
never starts an HTTP server and never touches a repository candidate. The
accepted unit and HTTP cases run the Host **inside the test process**, so a
restart there is a Store reopen, not a process boundary.

What was missing, and is what this order adds:

1. **`app/scripts/prepare-coding-dogfood.mjs`** — an operator entry that lays
   down one durable, recoverable instance outside the repository, and refuses
   to reset one. It reuses the existing fixture generator
   (`tests/fixtures/synthetic-repo/create-synthetic-repo.mjs`); no fixture
   file is copied.
2. **`app/scripts/coding-dogfood-rehearsal.mjs`** — the same scenario driven
   end to end against a **real `server/index.mjs` child process** on an
   ephemeral loopback port, over the public HTTP routes a browser uses, then
   stopped and continued in a **second, independent process**.
3. **`app/tests/coding-dogfood-preparation.test.mjs`** — six guards on the
   operator entry, so its refusals stay refusals.

`package.json` gains one line: `dogfood:rehearsal`.

No schema, no route, no recipe, no UI and no permission semantics changed.

## What the rehearsal actually verified

Every line below is an assertion in the script and a step in
[rehearsal-report.json](rehearsal-report.json). It passed on
`fake-openai-loopback`, the local deterministic provider; no credential was
configured, copied or discovered, and the per-process work token stays in
memory — the script asserts the exact token string is absent from the report
before writing it.

**Process 1**

- The Host starts as its own child, binds an ephemeral loopback port, serves
  the WebUI document (44,150 B) and `web/app.mjs` (328,538 B), and answers
  `401` to an `/api/v5` call with no token.
- An **ordinary Chat** starts with no repository connected, then binds one
  explicitly and starts one private candidate from the exact source commit.
  The Chat id is unchanged across the connection; the public candidate summary
  carries no Host path.
- `repo_read` on the defective file records its own `repository.read`
  provenance, and the approved `check_run` **exits 1** — the failing check is
  established from the fixture's real `node --test`, not asserted.
- In **one Run**: the `repo_write` approval names the exact path and the hash
  of the bytes it replaces; the following `check_run` approval reports
  `candidateWriteRevision: 1`, so it is bound to the write that Run just made;
  the approved check **exits 0**, and `check.settled.callId` matches its
  `check.started`.
- The exact change is read back through the **public readers**, not from a
  count or a sentence: `/repository-candidate/diff` returns one file, with
  `-  return Math.floor(count / perPage);` and `+  return Math.ceil(...)` in
  the patch, `patchSha256 0a66a5d1…`, `truncated: false`;
  `/repository-candidate/effects` returns one `confirmed` receipt whose
  `contentSha256` is the hash of the exact bytes the candidate now holds, and
  which carries **no** `contentRef`.
- The **connected source is unchanged**: same `HEAD`, empty `git status`.
- A Run cancelled while its check approval is open records **no**
  `check.started` — zero spawns.

**The process boundary**

- The Host stops on `SIGTERM` with exit 0 and no signal kill.

**Process 2, same data directory**

- A fresh process resolves the **same Chat, the same candidate,
  `writeRevision` still 1, and the same `baseCommit`**.
- Every `check.*` and `repository.*` event is byte-identical to the pre-stop
  list, and `/effects` returns the same receipts: **nothing replayed,
  duplicated, retried or recomputed**.
- A **new** bounded read/check task runs as its own execution with its own
  identity and adds **no** write effect.
- Revoking the candidate while a check approval is open leaves the Run
  cancelled with no `check.started`, and does **not** write the candidate back
  to the source.

## Findings

**A real one, in the fixture, not the Host.** The Local test provider numbers
tool calls per Host *process* (`fake-script-<request>-<step>`), so a call id
from before a restart legitimately reappears in a later Run —
`fake-script-2-1` occurs twice in the recorded scenario, in two different
Runs. The Host is correct: it fences on the `(Run, call)` pair, which stays
unique, and the restart reconciliation matches on Run id **and** call id. The
hazard is evidential: anything keyed on a call id alone across a restart will
conflate two executions. The rehearsal now asserts `(Run, call)` uniqueness
and records `fixtureCallIdsReusedAcrossProcesses`. This is recorded rather
than "fixed" — changing the fixture's id scheme is not this order's scope, and
a real provider does not have the problem.

**No product blocker was found, so nothing was repaired.** Slice 02's note
about write-effect presentation does not survive contact with the current
bytes: `web/run-rows.mjs` `appendCheckDetails` already presents recipe,
outcome, signal, duration, truncation, failure reason and both real streams,
and the Workspace card presents `Writes N` plus **Review changes** with the
per-file diff. The remaining gap is narrower than the old note: the `/effects`
receipt list (per-write status, bytes, hashes) has a public reader and no
screen. That was **not** a blocker for this path — the diff answers "what
exactly changed" — so no UI was touched. It is carried as a watch item on the
[browser checklist](browser-checklist.md) for the real pass to confirm or
refute against a person's actual question.

## Commands run, and their results

From `app/`, on the final bytes in [source-sha256.json](source-sha256.json):

| Command | Result |
|---|---|
| `node scripts/coding-dogfood-rehearsal.mjs --root <scratch>` | exit 0 · 14/14 steps · [log](rehearsal-run.log) |
| `node --test --test-concurrency=4 tests/coding-dogfood-preparation.test.mjs tests/check-recipes.test.mjs tests/check-approval-revision.test.mjs tests/repository-binding.test.mjs tests/repository-candidate.test.mjs tests/synthetic-repo-fixture.test.mjs tests/architecture-boundaries.test.mjs tests/startup.test.mjs tests/static-web-manifest.test.mjs` | **79/79** · [log](targeted-tests.log) |
| `npm test` | **1244/1244** · [log](full-suite.log) |
| `node tools/check-doc-links.mjs` (repository root) | pass · 1,440 documents / 8,169 links / 0 problems · [doclinks.json](doclinks.json) |
| `node server/index.mjs --data-dir <scratch>/runtime-data --port 8787` | listening; `GET /` 200 `text/html` 44,150 B; `GET /web/app.mjs` 200 328,538 B; `GET /api/v5/projects` 401; SIGTERM exit 0 |
| Deliberate assertion failure injected into the rehearsal | exits 1 and leaves **no** orphan Host process |

The full suite is included because `package.json` changed and a new test file
was added; it is a run on these bytes, not a re-labelling of an older result.

## How to recheck this independently

```bash
cd app
npm test
node --test tests/coding-dogfood-preparation.test.mjs
node scripts/coding-dogfood-rehearsal.mjs --root "$(mktemp -d)"
```

The rehearsal is self-contained: it prepares its own instance, asserts every
step, exits non-zero on the first failure and writes its own report. Reading
[rehearsal-report.json](rehearsal-report.json) beside
[rehearsal-run.log](rehearsal-run.log) shows which facts were checked; the
assertions themselves are the contract, in
`app/scripts/coding-dogfood-rehearsal.mjs`.

## Gaps this delivery does not close

- **No real model, no browser, no human interaction.** `realProvider` and
  `browserInteraction` are `not_run` in the report and blank on the checklist.
  `real-model dogfood passed` and N-02 remain open.
- The rehearsal drives the HTTP surface a browser uses; it does **not** drive
  the browser. Nothing here says the WebUI is usable, only that it is served
  and that the routes behind it behave.
- The cancellation case covered here is the operator-reachable
  cancel-at-approval (zero spawn). **Cancelling a check already in flight**
  and **stale-approval rejection after a competing write** are covered by the
  accepted lower-level cases in `tests/check-recipes.test.mjs` and
  `tests/check-approval-revision.test.mjs`; they were not re-executed at the
  fresh-process level and are not claimed here.
- **Restart-to-`unknown`** for a check interrupted mid-flight is covered by
  the accepted Store-level case. The rehearsal stops the Host between Runs,
  not during a check, so it does not exercise that path; no receipt is
  fabricated for it.
- Linux is untouched. Everything here ran on Darwin 27.0.0 arm64, Node
  v25.9.0, Git 2.50.1.
- The `/effects` receipt list has no UI surface (above).

## Integration note

Main advanced to `95ed9cf` (`docs: authorize frontend-first Agents work with
Design Scout reuse`) while this order was being worked, and a second worktree
`courtwork-agents-frontend-20260920` was opened on it by another writer. That
commit is documentation for a different order and touches **no file this
branch touches**; `git merge-tree` against current main reports no conflict.
This branch is still based on `0e06d70`, so integration is a clean
fast-forward-or-merge, not a rebase over contested bytes. No file outside this
branch's own worktree was read for writing, and the other writer's tree was
not touched.

## Writer release

Claude's implementation scope for this order is **finished and released**. The
worktree and branch are preserved for review; nothing was pushed, deployed or
deleted, no other worktree was touched, and the paused `courtwork-claude`
heartbeat was not restarted. Main-only `.agents/`, `.obsidian/` and
`skills-lock.json` are untouched and still untracked.

The prepared browser instance at
`/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920-instance`
is retained deliberately and is not deleted by any script here.
