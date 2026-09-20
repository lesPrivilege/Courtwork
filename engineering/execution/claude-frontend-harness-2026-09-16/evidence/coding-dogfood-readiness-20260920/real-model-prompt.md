# Paste-in task for the CW agent (real model)

Before pasting anything, set the Chat's permission mode to **Ask before
editing** and record the actual Run permission binding. Home starts in
`ask` unless a saved preference overrides it; the service fallback for an
omitted mode is `draft` (**Allow edits**). Under `draft`, the Host allows
`repo_write` with no approval card; only `check_run` still asks. The mode in
force determines what the cards you see are evidence of.

Paste the block below into the Chat once the repository is connected, a
private candidate has been started and the mode is recorded. It names no file
line, no fix and no expected result, so what comes back is the agent's own
work.

Do **not** paste the deterministic `/fixture script` line from
[`deterministic-replay.md`](deterministic-replay.md) into this Chat — that one
carries the answer and exists only to check wiring offline.

---

```text
This chat is connected to a small Node package called synthetic-parcel. Its
own test suite is currently failing.

Work out why, and fix it.

Read the source through the repository tools to find the defect. Make the
change as a write to the private candidate — leave the connected source
repository untouched. Once the edit is in, run the Host's node-test check
against the candidate.

Then report back:
  - the file and the exact line you changed, quoting it before and after;
  - the check's exit code and the part of its output that shows the result;
  - anything you looked at and ruled out.

Do not tell me the tests pass unless a check you actually ran says so.
```

---

## What to watch while it works

Under **Ask before editing**, the agent has to come through two gates you
answer:

- a **write approval** naming `src/parcel.mjs`, `Private candidate`, and the
  hash of the bytes it replaces;
- a **check approval** naming recipe `node-test`, the Node binary, `--test`,
  `cwd: private candidate`, and the candidate's current write revision.

## How to judge the result

Judge it on the Host's own receipts, not on the cards and not on what the
agent says:

- **Review changes** — the candidate diff: which files changed, and how.
- the **check's tool row** — recipe, outcome, exit code and the real
  `stdout`/`stderr`.
- `GET /sessions/<id>/repository-candidate/effects` — one receipt per write,
  with its status, byte count and content hash.

A missing write card does **not** prove nothing was written: in `draft` mode
there would be no card either way. The effects list and the diff are what
settle it. Equally, an agent's sentence that the tests pass settles nothing —
only a check receipt does.
