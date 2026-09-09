# Attention Chat closure · author evidence

Opus took the closure listed in [opus-handoff §4](../../engineering/design/attention-agent-2026-09-10/opus-handoff.md), starting from the fixed handoff commit `5899765` on an isolated worktree and branch. Product code below it is Astra's `f4f2436`; main was still `ee6df72` with another writer's uncommitted documents, so nothing was merged, staged or reset on their behalf. This is the author's own record. It is not an independent acceptance of the slice, and it does not close the rest of the Home queue or G1–G5.

## What changed

| File | Change |
|---|---|
| `app/web/user-message.mjs` | `messageSummary()`: the bounded preview of a long authored message reads as words. The previous preview was a 280-character slice of the source, so a message opening with a heading, a table or a fenced block opened with `#` and `\|`. The exact original is untouched behind Read full message, Source and Copy, none of which read the summary. |
| `app/web/thread-projection.mjs` | `toolStateWord()` and `unfinishedToolWord()`: one home for the tool row's state vocabulary (WK-57, WK-115 ①). Both chat presentations read it. |
| `app/web/app.mjs` | The full conversation reads the shared functions instead of its own local ladder. No behaviour change. |
| `app/web/attention-agent-view.mjs` | The dialog's assistant role label uses the shared `.message-role` treatment. Run state reads the shared `runLabels`, so `Run waiting_user` is now `Waiting for you`. The tool row carries its state word in its own slot instead of `name · phase · failed`. |
| `app/web/styles.css` | Conversation titles line up on one left edge (`justify-content` on a flex button defeated the existing `text-align: left`). While conversations are managed the stream is hidden, so the list takes the free height and the composer keeps the dialog edge instead of floating mid-panel. One visibility grammar for message-level utilities: the whole-response Copy reveals with its message like the authored Copy/Edit, and stays put where there is no pointer. Dead `.attention-agent-message.is-user` rules removed — the dialog's authored rows carry `.attention-authored-message`. |
| `app/runtime/fake-provider.mjs` | Streamed reply text no longer loses its newlines. `/.{1,24}/gu` skips line terminators, so every multi-line reply reached the UI as one run-on line and no Markdown block after the first could be parsed. The local test adapter is the only provider this slice ran. |
| `app/tests/ui-event-mapping.test.mjs` | Unit coverage for both new pure functions, including the identifier and fenced-only cases of the preview. |
| `app/tests/settings-navigation.test.mjs` | WK-115 ① now pins the ladder at its new single home and asserts both chat presentations read it. The rule is unchanged; only its address moved. |

## Verified in a real DOM

An independent synthetic host on its own port and data directory, local-fake loopback provider only. No personal directory, no saved credential, no paid provider, no deployment.

- Assistant Markdown in the dialog: table (in its own `overflow-x` container, `tabindex="0"`), fenced code with its own persistent copy, ordered list, blockquote, two external links. Before the provider fix none of this could be produced at all, so earlier browser evidence for assistant Markdown in this dialog was bounded by the fixture, not by the renderer.
- Long authored message: the preview reads as a sentence; Read full message, Source and Copy still carry the exact original.
- Conversation list: titles on one left edge; a 174-character title wraps in place with the date and Rename still aligned; a non-matching search says so; the composer keeps the dialog edge while managing.
- Active run: the answer textarea kept focus and caret across two 1.5 s poll redraws. On answering, the tool row dropped its state word, the question showed `Request resolved` with no answer action, the run read `Completed`, and focus fell back to the composer.
- Refused send: with another conversation holding the single active run, `POST /runs` returned 409 and the dialog showed the refusal while keeping the draft in the composer.
- 476 px viewport with dark colour scheme: layout holds, the toolbar wraps, and message-level actions are persistent where there is no pointer (`hover: none`).

## Checks

- `node --test tests/ui-event-mapping.test.mjs tests/settings-navigation.test.mjs` — 12/12.
- `node --test tests/attention-agent.test.mjs tests/architecture-boundaries.test.mjs tests/presentation-adapters.test.mjs tests/renderer-admission.test.mjs` — 18/18.
- Full bounded suite: `node --test --test-concurrency=2 app/tests/*.test.mjs tests/*.test.mjs` — **434/434**, `full-bounded.log`.
- `tools/lint-colors.mjs`, `tools/lint-materials.mjs`, `tools/contrast-report.mjs` — pass. `tools/check-doc-links.mjs` — 562 documents, 2530 links, no problems.

An earlier full run recorded 431/434 while the synthetic host and the browser session were running beside it, kept in `full-under-load.log`. Two of the three were `CORE_UNAVAILABLE: bridge ready timeout` under that load and pass in 0.4 s and 0.2 s when run alone; the third was the WK-115 ① source guard, which this slice then updated. No timeout was relaxed and no assertion removed.

## Not fixed here

- A refused send repeats the service sentence and does not name the conversation that holds the active run. Saying which one requires a cross-conversation run fact the dialog does not read today.
- In the dark colour scheme the authored plane sits close to the dialog ground and is separated by its border alone. That belongs to the material round, not to this closure.
- While a run is active the same state word can appear on the tool row, on the run-status row and on the live status line. The full conversation has the same shape, so reducing it is a ruling, not a repair.
- Item 3's read-failure state, item 5's full accessibility matrix (200% zoom, forced-colors, reduced motion, a complete keyboard sweep) and the native host were not exercised.
