# Coding dogfood readiness and WebUI handoff

Order: [11 · Coding dogfood readiness and WebUI handoff](../../11-coding-dogfood-handoff-20260920.md).
Base: `0e06d7006f1e9262e850102e349fcc3bca6517f3` (main at pickup, one commit
past the order's observed `e687762`, which is the order document itself).
Branch: `claude-coding-dogfood-20260920` in worktree
`/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920`.
Author: Claude. Independent verification: Luna. Integration: Astra.

**Round 1** delivered source `3f04f76`, packet `94d60d2`. Luna passed the
rehearsal 14/14 and preparation/startup 8/8, and Astra
[held integration](../coding-dogfood-review-20260920/README.md) for a bounded
correction: DF11-R1–R5 and four packet corrections.

**Round 2** is that correction. Pin source
**`c6a2b91362df8800453a7b88fa0e57a643f29791`**; this packet is the commit after it, at
the branch tip.

**Status: [independently accepted for WebUI readiness](../coding-dogfood-final-20260920/README.md).** The author evidence below retains its source identity; final integration corrections have separate hashes. This is **not**
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
| Rehearsal console output / machine report | [round-2 run](rehearsal-run-v2.log) · [round-2 report](rehearsal-report-v2.json) |
| Test evidence | [round-2 targeted tests](targeted-tests-v2.log) · [round-2 full suite](full-suite-v2.log) |
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
3. **`app/tests/coding-dogfood-preparation.test.mjs`** — guards on the
   operator entry, so its refusals stay refusals.

`package.json` gains one line: `dogfood:rehearsal`.

No schema, no route, no recipe, no UI and no permission semantics changed.

## What the rehearsal actually verified

The round-2 run is recorded in
[rehearsal-report-v2.json](rehearsal-report-v2.json); final integration evidence
is linked from the original order record. The following assertions describe
the rehearsal, while round-1 files remain historical evidence. It passed on
`fake-openai-loopback`, the local deterministic provider; no credential was
configured, copied or discovered, and the per-process work token stays in
memory — the script asserts the exact token string is absent from the report
before writing it. Each Host child is spawned with an **explicit** environment
(`PATH`, `HOME`, `TMPDIR`, `LANG` only), excluding other ambient variables such as provider credentials; these four
values still inherit caller paths and do not create filesystem isolation.

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
- Every persisted `check.*`/`repository.*` event — all 12, complete, payloads
  included — compares equal as parsed objects to the pre-stop list, and
  `/effects` returns the same receipts: **nothing replayed, duplicated,
  retried or recomputed**. (Parsed-object equality over the whole event, not a
  projection of chosen fields, and not a claim about raw storage bytes, which
  this reads back through the API and never sees.)
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
conflate two executions. The rehearsal asserts `(Run, call)` uniqueness and
records `fixtureCallIdsReusedAcrossProcesses`. This is recorded rather than
"fixed": changing the fixture's id scheme is not this order's scope, and
`(Run, call)` is the right key to read evidence by whatever the id's origin.
Nothing here tests another provider, so nothing here says another provider
could not repeat an id.

**No product blocker was found, so nothing was repaired.** Slice 02's note
about write-effect presentation does not survive contact with the current
bytes: `web/run-rows.mjs` `appendCheckDetails` already presents recipe,
outcome, signal, duration, truncation, failure reason and both real streams,
and the Workspace card presents `Writes N` plus **Review changes** with the
per-file diff. The remaining gap is narrower than the old note: the `/effects`
receipt list (per-write status, bytes, hashes) has a public reader and no
screen. That was **not** a blocker for this path — the diff answers "what
exactly changed" — so no UI was touched.

This closes nothing of slice 02's. The positive path shows that a `confirmed`
write and a settled check are presented. How `prepared`, `failed` and
`unknown` write effects should appear is a different question, it was not
exercised here, and it **remains with slice 02's existing owner**, along with
the browser watch item on the [checklist](browser-checklist.md).

## Round 2 — the returned corrections

Every one of Luna's probes was reproduced against the corrected script and is
now closed. None of this changed product behaviour: the preparation and
rehearsal utilities, their tests and this packet are all that moved.

| ID | What was wrong | What it does now |
|---|---|---|
| **R1** | `resolveRoot` classified "outside the repository" by string prefix, so an ordinary child called `..name` read as outside; and it canonicalised with `path.resolve`, which cannot see through a symlink whose target is inside the checkout. | Containment is decided per path **component**, and against `realpath` — resolving the nearest existing ancestor first, so a destination that does not exist yet is still judged by where it would actually land. Both directions are refused (inside the repository, and containing it). The check runs before any `mkdir`, and is repeated after the two directories are created and before anything is written into them. |
| **R2** | The pasteable command was quoted with `JSON.stringify`, which is JSON encoding. Inside JSON's double quotes a POSIX shell still expands `$(…)`, backticks and `$VAR`. | `shellQuote`/`shellCommand` single-quote every argument that is not plainly safe, splicing an embedded quote as `'\''`. A round-trip test feeds spaces, quotes, newlines, `$( )`, backticks, `$VAR`, globs, `;`, `&&`, `\|` and an empty string through `/bin/sh` and requires the argv back verbatim — and asserts no substitution ran. |
| **R3** | `inspectPreparation` checked only `schemaVersion`, then read `manifest.sourcePath`/`dataDir` and printed `manifest.host.startup` — so a rewritten manifest could redirect `--reuse` at another instance and put its own text in the printed command. | A manifest is accepted only as a *description of the instance at that root*: scenario, root, `<root>/source`, `<root>/runtime-data` and a real commit must all agree, and the source must still resolve inside the root. The printed command is **derived** from `process.execPath` and the server entry resolved from `import.meta.url`; only the validated data directory comes from the instance. `host.appDir` is kept as provenance and **reported**, not enforced, so an instance survives this checkout moving. Mismatches fail closed without touching data. |
| **R4** | `spawn` inherited the shell's whole environment despite a comment claiming otherwise, and a child that started but never printed a URL outlived the failed attempt. | The child gets an explicit `PATH`/`HOME`/`TMPDIR`/`LANG` and nothing else. `startHost` owns it from `spawn` through readiness: early exit, readiness timeout and a bootstrap that does not answer all terminate it and wait. `terminate` escalates SIGTERM → SIGKILL, so an uncooperative child cannot keep holding the data-directory lock. |
| **R5** | `durableShape` compared five fields per event while the README claimed byte identity. | The restart compares the **complete** persisted `check.*`/`repository.*` events, payloads included, as parsed objects, and asserts the list is non-empty so it cannot pass vacuously. The claim now says exactly that, and full receipt comparison is kept alongside. |

R4's exit evidence is a new rehearsal step that needs no injected fault: a
second Host on a data directory the first already holds fails with
`LOCK_BUSY`, and the step asserts **zero** leaked Host processes afterwards —
which the restart later depends on, since a survivor would still hold the
lock. The same step spawns a child that installs a SIGTERM handler and
ignores it, waits for it to announce that handler is live, and requires
`terminate` to escalate to SIGKILL and the process to be gone.

### Packet corrections

1. **Approval prerequisite.** The product default is **Allow edits**
   (`draft`), under which `repo_write` is allowed with no card and only
   `check_run` asks. The prompt page now says to select and record **Ask
   before editing** first, the checklist has a row for the mode, and the
   sentence claiming a missing write card proves nothing was written is
   **gone** — replaced by "judge on the effects list, the diff and the check
   receipt".
2. **Stop versus interruption.** A clean Ctrl-C drains Runs through
   cancellation and waits for them, so an in-flight check usually settles
   *before* close, typically as `cancelled`. `unknown` is reserved for an
   execution genuinely left unresolved — a crash or `SIGKILL` — fenced at the
   next open with `check_unknown_after_restart`. The old blanket claim is
   corrected, and the instruction is to read the receipt, never to re-run the
   check to find out.
3. **Call identity.** `(Run, call)` throughout, and the categorical claim
   about real providers is removed: nothing here tests one.
4. **Write-effect presentation.** The positive path's diff and check display
   are enough for this narrow rehearsal and close nothing of slice 02's;
   `prepared`/`failed`/`unknown` presentation stays with its existing owner.

## Commands run, and their results

From `app/`, on the round-2 bytes in [source-sha256.json](source-sha256.json).
The `-v2` logs are this round; the round-1 logs are kept beside them as prior
evidence and are **not** evidence for these bytes.

| Command | Round 2 | Round 1 (prior) |
|---|---|---|
| `node scripts/coding-dogfood-rehearsal.mjs --root <scratch>` | exit 0 · **15/15** steps · [log](rehearsal-run-v2.log) · [report](rehearsal-report-v2.json) | 14/14 · [log](rehearsal-run.log) · [report](rehearsal-report.json) |
| `node --test --test-concurrency=4 tests/coding-dogfood-preparation.test.mjs tests/check-recipes.test.mjs tests/check-approval-revision.test.mjs tests/repository-binding.test.mjs tests/repository-candidate.test.mjs tests/synthetic-repo-fixture.test.mjs tests/architecture-boundaries.test.mjs tests/startup.test.mjs tests/static-web-manifest.test.mjs` | **85/85** · [log](targeted-tests-v2.log) | 79/79 · [log](targeted-tests.log) |
| `npm test` | **1250/1250** · [log](full-suite-v2.log) | 1244/1244 · [log](full-suite.log) |
| `node tools/check-doc-links.mjs` (repository root) | pass · 1,444 documents / 8,196 links / 0 problems · [doclinks.json](doclinks.json) | pass · 1,440 / 8,169 |
| `node server/index.mjs --data-dir <scratch>/runtime-data --port 8787` | — | listening; `GET /` 200 `text/html` 44,150 B; `GET /web/app.mjs` 200 328,538 B; `GET /api/v5/projects` 401; SIGTERM exit 0 |
| Luna's four blocker probes, re-run against the corrected script | all four **closed**; no repository pollution | all four open |
| Deliberate assertion failure injected into the rehearsal | — | exits 1 and leaves **no** orphan Host process |

The six new targeted checks are the R1–R3 guards: the `..name` child, the
symlink ancestor (existing link and not-yet-created leaf, plus an outward-link
control), the shell round-trip, a real preparation's command round-trip, the
six manifest-tampering refusals, and the derived-launch check.

The full suite is rerun rather than re-labelled because the preparation
script's exported surface changed.

## How to recheck this independently

```bash
cd app
npm test
node --test tests/coding-dogfood-preparation.test.mjs
node scripts/coding-dogfood-rehearsal.mjs --root "$(mktemp -d)"
```

To recheck the returned corrections specifically, the four probes from the
review reproduce directly: pass `<repo>/..name` and a symlink into the
checkout to `createPreparation` (both must be refused, and must leave the
repository untouched); read what `shellCommand` prints for a path containing
`$(…)` or backticks; and rewrite a manifest's `sourcePath`/`dataDir`/
`host.startup` and call `inspectPreparation` (it must refuse, and never print
the manifest's command). Each is also a named test in
`tests/coding-dogfood-preparation.test.mjs`.

The rehearsal is self-contained: it prepares its own instance, asserts every
step, exits non-zero on the first failure and writes its own report. Reading
[rehearsal-report-v2.json](rehearsal-report-v2.json) beside
[rehearsal-run-v2.log](rehearsal-run-v2.log) shows which facts were checked; the
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
- The `/effects` receipt list has no UI surface (above), and slice 02's
  `prepared`/`failed`/`unknown` presentation question stays with its owner.
- The startup-failure probe covers a Host that **exits** before listening
  (`LOCK_BUSY`). A child that starts, hangs and never prints a URL is handled
  by the same readiness deadline and cleanup path, but that timing was not
  separately provoked; the uncooperative-child probe covers the termination
  half of it directly.
- `unknown`-after-restart is still not exercised here: the rehearsal stops the
  Host between Runs, not during a check. It remains covered by the accepted
  Store-level case, and no receipt is fabricated for it.

## Integration note

This branch now contains main through `d0bfeba` (the review registration).
The merge took the integrator's order-document status over the delivery note
this branch had appended; that was the only conflict, and the packet's own
facts live here rather than in the order.

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

Claude's implementation scope for this order is **finished and released**
again after the returned correction; nothing outside the two utilities, their
tests and this packet was touched. The
worktree and branch are preserved for review; nothing was pushed, deployed or
deleted, no other worktree was touched, and the paused `courtwork-claude`
heartbeat was not restarted. Main-only `.agents/`, `.obsidian/` and
`skills-lock.json` are untouched and still untracked.

The prepared browser instance at
`/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920-instance`
is retained deliberately and is not deleted by any script here.
