# Browser checklist — real-model dogfood pass

Fill this in during the actual browser run. Everything below the line is
**unrecorded until a human does it**: leave a cell blank or `not_run` rather
than copying a value from the offline rehearsal. Nothing here has been
executed by the author.

## Run identity

| Fact | Value |
|---|---|
| Date / operator | |
| Provider and connection | |
| Model and effort | |
| Host URL | |
| Source repository path | |
| Source commit | |
| Chat (session) id | |
| Candidate id | |
| Budget consumed | |

## Steps

| # | Step | What counts as done | Result |
|---|---|---|---|
| 1 | Open the Host URL | The Chat list loads | |
| 2 | Choose the model connection in Settings | The picker shows the connection you intend to use, not the Local test provider | |
| 3 | Start an ordinary Chat | It opens with no repository connected | |
| 4 | Connect the prepared source repository | The Workspace card names the path and its branch/commit | |
| 5 | Start a private candidate | `from <commit> · Writes 0` | |
| 6 | Paste the [real-model prompt](real-model-prompt.md) | The agent starts reading the source | |
| 7 | Answer the **write** approval | The card names `src/parcel.mjs`, `Private candidate`, and the prior-bytes hash | |
| 8 | Answer the **check** approval | The card names `node-test`, the Node binary, `--test`, `cwd: private candidate`, and the write revision | |
| 9 | Open the check's tool row | Recipe, outcome, duration and the real `stdout`/`stderr` are there | |
| 10 | Open **Review changes** | The diff shows exactly one file and the one changed line | |
| 11 | Confirm the source is untouched | `git -C <source> status --porcelain` is empty and `HEAD` is unchanged | |
| 12 | Stop the Host (Ctrl-C in its terminal) | It exits without being killed | |
| 13 | Start the Host again on the same data directory | It prints a URL | |
| 14 | Reopen the same Chat | Same candidate, same `Writes` count, same history; nothing replayed | |
| 15 | Give it a new bounded follow-up task | A **new** check execution, its own row and call id | |

## Outcome

| Question | Answer |
|---|---|
| Did the agent find the defect unaided? | |
| Did it fix it through a governed candidate write? | |
| Did it run the Host check rather than asserting success? | |
| Did its report match the recorded diff and exit code? | |
| Anything it got wrong, or any surface that did not answer a question you had | |

## Known gaps to watch for

- The `/effects` write-receipt list (status, bytes, hashes per write) is a
  public API reader with no screen of its own; the card shows a `Writes`
  count and **Review changes** shows the diff. If you find yourself wanting
  per-write receipts in the UI during this pass, record it here as a finding
  rather than assuming it exists.
- `Exit 0` is a process outcome, not acceptance of the work.
