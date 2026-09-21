# Independent bounded review: answer footer

Date: 2026-09-21
Reviewer: Luna (non-author)
Candidate: `17f57c0680017a2fb18110160af5b35371879a9b`
Base: `af1cfad`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-answer-footer-20260921`

## Scope and recommendation

I reviewed the actual candidate source, the 06b ruling/current contract, the author evidence packet, and the four production seams in scope. I ran the ten owner suites named by the author and added small projection probes for duplicate/empty assistant output, tool ending, telemetry/evidence rows, terminal statuses, `length`, and `error` stop reasons. The bounded source delta is acceptable for integration; I found no concrete blocker in the requested scope.

The change correctly moves the decision to `thread-projection.mjs`: a non-empty settled assistant row is remembered as the Run's possible answer, later tool/check/question/delta output removes that mark, and only a Run whose final recorded status is `completed` receives `row.final`. `user-message.mjs` is the sole footer gate. Chat and Attention both call it and retain their existing action builder, so Copy still targets the exact projected row identity and text.

## Source-grounded findings

- `app/web/thread-projection.mjs:40-58` keeps assistant segments and their stable IDs. `stopReason: "toolUse"` is a disqualifier, while an empty assistant message does not displace an earlier non-empty answer. `:59-61` removes the candidate on Pi tool activity; `:85-109` does the same for checks and questions/permissions. `:161-167` applies the completed-Run gate.
- `app/web/user-message.mjs:62-72` returns no footer unless `row.final`, and creates the timestamp and actions only inside that gate.
- `app/web/app.mjs:2828-2839,3109` preserves the existing `messageActionRow` identity and supplies it to the shared footer. `app/web/attention-agent-view.mjs:48-58,259-260` follows the same path. The surfaces no longer own a second assistant footer/timestamp rule.
- The exact source hashes at review time were:
  - `thread-projection.mjs` `f47df2622c2f2a253a362cd919f0d871e24a09489e0cf1a2902c0c907df0986d`
  - `user-message.mjs` `dbe8e16f2c88d10f0bb5bf9bafd468d5527744ef9da4c8b512f873a7971741b6`
  - `app.mjs` `a016200264d010813615a4c4966d256da4117350c59880a71b03313e80db7bff`
  - `attention-agent-view.mjs` `51039694c54415d3e67eeaeb8f6993d3da3e691a64c0bd5dfdde7769c5baf884`

This matches the 06b contract: intermediate narration/tool segments remain readable and keep their boundaries; only a genuine final answer receives the ordinary completion footer; failed, cancelled, and unknown output remains readable without being presented as final.

## Counterprobes

Against the candidate projection, the following results were observed:

- final answer followed by telemetry: the answer remains final;
- final answer followed by a tool start/result: no assistant row remains final;
- `stopReason: "length"` in a completed Run: the row is final;
- `stopReason: "error"` with a completed Run: the row is final;
- completed then failed status: no row is final;
- an empty assistant message after a final answer: the prior answer remains the candidate, while the empty row remains body-only;
- two settled assistant messages: only the second is final;
- artifact/presentation after the answer: the answer remains final.

The `length` behavior is explicitly recorded as an unresolved product policy in the author README. It is coherent with the current contract because the Host Run status is still `completed`, but it does not distinguish truncation in the footer. The `error` probe requires an inconsistent fixture to produce a footer: the runtime contract maps error/aborted outcomes to failed/cancelled Run status. These are policy/defensive-hardening choices, not observed regressions in the governed event shape. Preserving the final mark across notice/artifact/presentation rows keeps the footer attached to the answer while later evidence remains a separate row; this is also explicitly documented by the author.

The focused Copy path passed with a multi-segment Run: exactly one Copy action is built, and it copies the final answer's exact text. This confirms the footer gate did not create a new identity or use the wrong assistant segment.

## Verification

Command run from `app/`:

`node --test tests/output-message-boundary.test.mjs tests/chat-actions.test.mjs tests/thread-projection.test.mjs tests/execution-disclosure.test.mjs tests/run-rows.test.mjs tests/attention-agent.test.mjs tests/check-ui.test.mjs tests/inspector-presentation.test.mjs tests/static-web-manifest.test.mjs tests/entry-audit.test.mjs`

Result: exit 0, **64 tests, 64 passed, 0 failed**.

The candidate worktree was clean before review and no source/evidence files were modified. A whole-tree `git diff --check af1cfad..HEAD` reports two trailing-whitespace lines in the recorded `evidence/answer-footer-20260921/checks.txt` output (`checks.txt:13` and `:19`); production source has no corresponding issue. This is evidence-packet hygiene, not a product blocker, but the README's claim that `git diff --check` is clean is not literally reproducible from this checkout.

## Author limits retained

The author packet's limits remain in force: no real provider, no OpenAI computer-use/browser pass, no 200% native zoom, screen reader, or forced-colors run, and no live controlled/fail/cancel sequence on Attention. The author did not inspect or alter user 8787/8899, credentials, or the active `claude-pi-runtime-port` tree. The full suite was not repeated here; the author's recorded full run had the existing `review-core-client-lifecycle` timing flake (1327/1328), with that file's isolated rerun 13/13. Parent owns the independent browser and architecture decisions.

## Disposition

**Adopt for parent integration, with the recorded policy edges left for the owner decision:** `length` footer wording, whether failed/cancelled partial text should regain Copy without completion time, and whether evidence rows after an answer should keep its footer. None blocks the bounded correction to repeated intermediate footers.
