# One completed-answer footer per Run

2026-09-21 · Claude, author. Branch `claude-answer-footer-20260921`, one
commit from integrated main `af1cfad`, in its own worktree. Answers the 06b
return registered after [prepared real dogfood](../prepared-real-dogfood-20260921/README.md),
using [Luna's exploration](../prepared-real-dogfood-20260921/luna-message-projection-explore.md).
**Not accepted.** Released for Luna's non-author delta review and Astra's
integration decision.

## Before any code changed

The counterexample was reproduced on the unchanged tree, in the browser and at
the projection, before the product files were edited.

- **The real transcript.** The dogfood Run's [completed AX capture](../prepared-real-dogfood-20260921/05-completed.ax.txt)
  has five `Copy response` controls and one `Copy message`. Its
  [persisted events](../prepared-real-dogfood-20260921/events.json) hold ten
  `assistant.message` events: four non-empty `toolUse` narrations, five empty
  `toolUse` turns and one `stop` answer.
- **Replayed in a browser.** An evidence-only [scripted loopback provider](harness/scripted-provider.mjs)
  replays that Run's assistant texts in their recorded order, with `ws_list`
  standing in for each turn's tools. [Chat](browser/before-chat-dogfood.json)
  and [Attention](browser/before-attention-dogfood.json) each drew **five
  footers**, all with the same Run start time. That matches the real capture.
- **The controlled sequence.** [Waiting for the person, and with a tool still
  outstanding](browser/before-chat-controlled.json), the narration already
  carried the timestamp and actions. A [failed Run and a cancelled Run](browser/before-chat-fail-cancel.json)
  both showed a completed-answer footer under their narration.
- **At the test seam.** Six of the new projection/footer tests fail against the
  unchanged product files (checks.txt). The failed/cancelled guard passes on
  both trees.

## What changed

Four product files, all existing owners. There is no new route, event, schema,
action capability, timestamp, model call, token, icon or dependency.

| File | Change |
|---|---|
| `app/web/thread-projection.mjs` | The projection names one row per Run as `final`. That row is the last settled, non-empty assistant message with nothing after it except more assistant output, and only in a Run whose status is `completed`. A later delta, tool, check or question removes the mark. So does `stopReason: "toolUse"`. An empty message neither receives the mark nor removes it from an earlier row. No row is merged, moved, renamed or re-identified. |
| `app/web/user-message.mjs` | `renderAnswerFooter(row, createActions)` is the single footer rule. It sits beside the existing `renderMessageTime` and user footer. It returns `null` unless `row.final`, and it builds the actions only when it draws the footer. |
| `app/web/app.mjs` · `app/web/attention-agent-view.mjs` | Each surface's own `!row.pending` footer block is replaced by a call to the shared footer. Everything else on both surfaces is unchanged: bodies, tool rows, execution disclosure, Copy target, `messageActionRow` identity `[session, epoch, kind, id]`, user footers. |

Nearest precedents: `messageActionRow` / `createChatActions` (unchanged, still
the only action owner); `renderMessageTime` and the user footer in
`user-message.mjs`, which already served both surfaces; and the 04 rule that
[intermediate segments do not repeat the ordinary message footer](../../README.md#04--让真实长-run-保持可读).
Affected grammar: UX-05, because the terminal status stays the owner's own
word and the message does not repeat it, and UX-08, because model output and
the Host's outcome are shown separately. The 04 record's claim that this rule
had already shipped was wrong. Its disposition is written back in
[04](../../04-run-surface.md#completed-answer-footer-correction--2026-09-21).

### Terminal semantics: what was decided and what was left open

- **Completed is the only final.** A Run that is running, waiting, stopping,
  failed, cancelled, unknown, or missing from this client's records shows no
  footer. This holds even when a settled `stop` message came before the
  failure. The text stays readable and the run-status row says how the Run
  ended.
- **The next tool decides whether text was narration, not `stopReason` alone.**
  The Agents API adapter emits `assistant.message` without `stopReason`. A
  whitelist of `stop` would therefore have removed the footer from every such
  answer. `toolUse` is used only as a disqualifier.
- **Open, recorded rather than invented:**
  - A completed Run whose last output is a tool, check or question has no
    final answer. It shows no footer, so it has nothing to Copy from a footer.
  - A completed Run whose answer ended with `stopReason: "length"` is shown as
    final. Whether a truncated answer needs its own word has not been decided.
  - The last text of a failed or cancelled Run no longer offers Copy. It can
    still be selected as text. Before this change, every settled narration in
    such a Run had Copy. That loss follows from the ruling that failed or
    cancelled output carries no success styling. Astra may want Copy back on
    those rows without the timestamp.
  - A notice, artifact or presentation row that comes after the answer leaves
    the final mark where it is.

## Checks (verification.md)

Recorded in [checks.txt](checks.txt).

- `tests/output-message-boundary.test.mjs` is extended with seven tests:
  - narration → empty tool turn → answer keeps every row and its id, and marks
    only the answer;
  - **the persisted real dogfood events** give 10 assistant rows, 5 of them
    visible, 17 tools and exactly one final (the `Done.` row), still after the
    check;
  - running / waiting_user / stopping / created give zero finals, and a
    pending delta is never final;
  - failed / cancelled / unknown / unrecorded Runs keep both texts and give
    zero finals;
  - a following tool / permission / question / check / delta removes the mark,
    a second answer moves it, an empty answer does not, and Agents-API-shaped
    messages without `stopReason` work;
  - each Run in a Session has its own final;
  - the shared footer, in the tiny DOM, builds no action row for a non-final
    reply.
- `tests/chat-actions.test.mjs`:
  - the old source pin on each surface's `!row.pending` footer is replaced by
    one that requires both surfaces to call `renderAnswerFooter`, and neither
    to build `assistant-message-actions` or call `renderMessageTime` itself;
  - a new test goes events → projection → shared footer → real
    `createChatActions` with the production adapter → click Copy. The Run has
    **one** Copy control, it copies the final answer byte for byte, and its
    `Copied` feedback expires.
- Ten affected owner suites pass 64/64: output-message-boundary, chat-actions,
  thread-projection, execution-disclosure, run-rows, attention-agent,
  check-ui, inspector-presentation, static-web-manifest and entry-audit.
- The interaction, colors, materials, shapes and spacing lints pass.
- The full `npm test` run gave 1327 passes and 1 failure out of 1328. The failure was `review-core-client-lifecycle`, the Core bridge timing flake already recorded under slice 01. That file is untouched by this change and passes 13/13 when run alone. Document links pass (1,492 documents / 8,519 links), and `git diff --check` is clean.

## Browser pass (in-app browser, not OpenAI computer use)

The Host was started from this tree by [harness/start.mjs](harness/start.mjs)
on loopback **8941**, with the scripted provider on **8942** and a throwaway
data directory. The unchanged tree ran first and the candidate ran second,
over a copy of the same data. The provider connection holds a
synthetic placeholder string, not a key. Nothing reached a real provider.
The user's 8787 and the 8899 preview were not connected, read or changed.

| Case | Before (`af1cfad`) | After |
|---|---|---|
| Dogfood replay, Chat | 5 footers, one repeated time | [1, on `Done.`](browser/after-chat-dogfood.json): the **same persisted Run**, reopened after the Host restart |
| Dogfood replay, Attention | 5 | [1, on `Done.`](browser/after-attention-dogfood.json) |
| Controlled: streaming → ask_user waiting → tool → streaming answer → completed | footer present while waiting and while the tool ran | [0 footers at every sampled transition until Completed, then 1 on the final](browser/after-chat-controlled.json) |
| Failed Run | footer on its narration | [0; error row and Failed unchanged](browser/after-chat-fail-cancel.json) |
| Cancelled mid-answer | footer on narration, partial pending | [0; both texts readable, partial still pending](browser/after-chat-fail-cancel.json) |
| Reload, all eight harness Chats | — | [each Completed Run shows exactly one footer, on its last answer; each Failed or Cancelled Run shows none](browser/after-reload-all-chats.json) |
| Copy, Chat and Attention | — | [Chat](browser/after-chat-copy-focus.json) and [Attention](browser/after-attention-dogfood.json) both copied **1,353 characters, equal to the recorded final text**. Focus stayed on the button and `Copied` returned to `Copy response` |
| 375 px, dark | — | [one footer; no horizontal overflow](browser/after-375-dark.json) |

The DOM contained no footer of any kind under a non-final reply, so no hidden
duplicate actions exist.

## Not executed, and why

- **OpenAI computer use and PNG screenshots.** This author's toolchain can
  read the live DOM, focus, clipboard calls and network, but it cannot write
  image files and has no OpenAI computer use. The packet therefore holds
  verbatim DOM measurements, not a visual baseline. Astra's OpenAI browser pass
  on the real dogfood transcript remains outstanding.
- **A real provider.** Not called. The replay reproduces the transcript's
  assistant texts and segment order. Its tools are stand-ins, so it is not a
  real-model success.
- **200% native zoom, screen reader and forced colors.** Not run. These G4
  residuals stay with their existing owners and are neither reopened nor
  closed here.
- **Attention's live controlled, fail and cancel sequences.** Attention was
  exercised on the persisted dogfood Run and on Copy. It uses the same
  projection and footer function, and its source pin is tested, but the live
  sequences were driven in Chat only.
- **The deferred ask_user observation.** Untouched. It remains with the Runtime
  instruction/tool-discovery owner.
