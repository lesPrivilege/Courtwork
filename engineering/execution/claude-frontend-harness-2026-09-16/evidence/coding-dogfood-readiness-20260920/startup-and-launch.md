# Launch, stop and restart

Three commands, in order. Everything is derived from this checkout — no
author home path, no fixed test port, no pre-seeded Chat.

## 1 · Prepare one instance

Run from `app/`. Pick any `--root` **outside** this repository; the script
refuses a root inside it, and refuses a destination that is not empty.

```bash
node scripts/prepare-coding-dogfood.mjs --root ~/Courtwork-dogfood-20260920
```

It creates `<root>/source` (an independent Git repository with a failing test
suite), `<root>/runtime-data` (the Host's `SE_RUNTIME_DATA_DIR`) and
`<root>/manifest.json`, then prints the source commit, the paths and the exact
startup command for that instance. No credential, API key or personal
configuration is read or written.

To look at an instance again without disturbing it:

```bash
node scripts/prepare-coding-dogfood.mjs --root ~/Courtwork-dogfood-20260920 --reuse
```

That reports whether the source is still at the manifest's commit, whether its
worktree is clean, and whether a Host has already opened the data directory —
so a second pass never silently resumes a scenario someone already solved.

**An instance is already prepared and untouched** at
`/Users/lesprivilege/Projects/.worktrees/courtwork-coding-dogfood-20260920-instance`
(source commit `c8310f06ef6049a9639ba418f6ea3c42cd7831ad`), if you would
rather not run step 1.

## 2 · Start the Host

Use the command the preparation printed. It is this shape:

```bash
node <appDir>/server/index.mjs --data-dir <root>/runtime-data --port 8787
```

The Host prints the URL it is listening on. Open that URL. Port 8787 is the
product default; if it is taken, rerun with `--port 0` and open the URL the
Host prints instead. `SE_RUNTIME_DATA_DIR=<root>/runtime-data` works in place
of `--data-dir`.

The model connection defaults to the **Local test provider**, which needs no
credential. Choose a real connection in Settings when you want a real pass.

Home starts with **Ask before editing** when no saved preference overrides it;
the service fallback for an omitted mode is **Allow edits** (`draft`). In
`draft`, candidate writes need no approval and only checks ask. For this
browser pass, explicitly select **Ask before editing** and record the actual
Run permission binding rather than relying on either default.

## 3 · Stop and continue

`Ctrl-C` (SIGINT) in the Host's terminal stops admission, then **cancels every
Run that is still open and waits for it**, and releases the data directory
lock. **Nothing is deleted.** Start the same command again on the same
`--data-dir` and reopen the Chat: the candidate, its write revision and the
whole history are still there, and nothing is replayed.

Because a clean stop drains Runs this way, a check that was running usually
settles *before* the Host closes — typically as `cancelled`, with whatever
output it had produced. `unknown` is reserved for an execution that was
genuinely left unresolved, which is what a crash or a `SIGKILL` produces: on
the next open its `check.started` is fenced with a `check.settled` of status
`unknown`, no exit code, and `failure.code` `check_unknown_after_restart`.

Either way the rule is the same: **read the receipt, do not infer it, and do
not re-run the check to find out.** The Host never re-executes a recipe to
resolve a past outcome, and a fresh check is a new execution with its own
identity, not an answer about the old one.

## Identity rules

- The **source** is the repository you connect; the Host never writes it. Its
  commit is fixed in the manifest and in the candidate's `baseCommit`.
- The **candidate** is a private worktree the Host owns, created from that one
  commit. Its `writeRevision` counts confirmed writes; an approval binds to the
  revision it was shown.
- A **check** is identified by its `(Run, call)` pair. That is the key the
  Host fences on, so it is the key to read evidence by — see
  [deterministic-replay.md](deterministic-replay.md).

## Cleanup

Deliberately separate from everything above. Removing an instance is one
command, and it is yours to run:

```bash
rm -rf ~/Courtwork-dogfood-20260920
```

Stopping the Host, rerunning the preparation, or rerunning the rehearsal never
does this for you.
