# Paste-in task for the CW agent (real model)

Paste the block below into the Chat once the repository is connected and a
private candidate has been started. It names no file line, no fix and no
expected result, so what comes back is the agent's own work.

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

The agent has to come through the Host's own gates, so a real pass produces
approvals you have to answer:

- a **write approval** naming `src/parcel.mjs`, `Private candidate`, and the
  hash of the bytes it replaces;
- a **check approval** naming recipe `node-test`, the Node binary, `--test`,
  `cwd: private candidate`, and the candidate's current write revision.

If the agent claims a fix without either card appearing, it has not written
anything and has not run anything. That is a finding, not a pass.
