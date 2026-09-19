# DWB follow-on visual polish · paste work orders

**Status:** Prepared, not launched. Run these two work orders serially only after the Host-created candidate worktree write slice has non-author acceptance. The current project preview still has no Connect/Access GUI; these are direct candidate-worktree assignments, not instructions to click an unavailable product menu. No provider was called while preparing this handoff.

## Shared source and contract

The task is the later visual-only dogfood named in [the second-slice decision](write-dogfood-round2.md). It is bounded by [Chat reading contract CR-03/CR-04](../../design/chat-reading-2026-09-11.md), [the DWB acceptance plan](../RD-006-deferred-workspace-binding.md), and the accepted inline-code precedent in [Chat UI production receipt](../chat-memory-broker-2026-09-12/ui-completion/README.md). The fixture is [code-reading-mixed-20260914.md](fixtures/code-reading-mixed-20260914.md), SHA-256 `ee144aac7a10e90da98fec024c0d0a43af785655bd998646279d1eca2d4bd1fa`.

The current production entry points are `app/web/ui-controls.mjs::markdown` (sanitized Chat Markdown and fenced-code toolbar), `app/web/markdown-reader.mjs::appendSemantic` (fixed-revision document rendering and fenced-code toolbar), `app/web/user-message.mjs::renderUserMessage`, and `app/web/attention-agent-view.mjs` (Attention messages). The nearest selectors are in `app/web/styles.css`: `code:not(pre code)` at line 2107; `.markdown-body pre`, `.markdown-body pre code`, `.code-block`, and `.code-toolbar` at lines 2116–2140; the Chat and Attention code-block surface rules at lines 6338–6342. These line numbers describe the prepared baseline and must be refreshed against the candidate SHA before editing.

The work changes only the visual projection. Preserve source bytes, copy output, safe Markdown tag policy, source identity, fixed-revision reader behavior, message identity, selection/scroll continuity, Review semantics, actions, permission/runtime behavior, and the original component treatment for diffs and machine output. Do not add syntax coloring or a package. Record the actual selector delta and the nearest precedent in the existing UI change record; do not promote candidate screenshots to an accepted baseline.

## Work order 1 · inline-code contrast

**Prompt to paste:**

> Work only in the supplied Host-created candidate worktree at the exact base SHA recorded in the task. Inspect `engineering/design/ux-grammar.md`, the relevant `engineering/design/agent-interface-2026-09-10/frontend-contract.md` clauses and `precedent-map.md` `markdown.reading` row, `engineering/design/chat-reading-2026-09-11.md` CR-03/CR-04, and the current cascade in `app/web/styles.css` before editing. Use only the synthetic mixed Markdown fixture linked in this handoff.
>
> Fix the contrast of **inline code in reading text** across the user message, assistant message, Attention assistant message, and recorded Markdown reader. Begin from the current `code:not(pre code)` rule and map its actual computed foreground/background on each surface and in light/dark themes. Keep prose text and code text easy to distinguish without relying on opacity alone. Preserve contrast of normal-size text, authored user-message surface pairing, selectable/copyable original text, and wrapping of long paths and identifiers. Keep fenced code, diffs, permission payloads, tool machine output, runtime metadata, and non-reading code controls visually governed by their existing components.
>
> Change only the inline-code contrast treatment and selectors needed to target those reading surfaces. Do not change typography/density, spacing, markup/parser behavior, tokens outside their owner, toolbars, permissions, Runtime, or Review. No syntax highlighting, new markup spans, or dependencies.
>
> Validate the same fixture in the four real reader surfaces in light and dark themes; include keyboard selection/copy, a long path/identifier, 200% zoom, and forced-colors. Run `node tools/lint-colors.mjs`, `node tools/contrast-report.mjs`, relevant existing Markdown/message tests, and record every not-run check. Return the actual CSS diff, changed-path list, SHA-256 for changed files, exact base/HEAD, screenshots or browser evidence, command output, and whether the original source tree stayed unchanged. Do not describe a summary as a Git diff; use the Host-generated candidate diff/receipt.

**Acceptance focus:** exact inline selector/surface scope, readable foreground/background pair in light/dark, no spill to fenced/diff/machine surfaces, preserved copy/source text, and a reproducible before/after against the fixed fixture.

## Work order 2 · fenced-code density

**Prompt to paste after Work order 1 is complete and reviewed:**

> Continue only from the accepted Work order 1 candidate commit and its unchanged synthetic fixture. Re-read CR-03/CR-04 and the nearest actual renderer/styles after that commit. Make one bounded visual change to **fenced Markdown code density** in the same user, assistant, Attention, and recorded-document readers. Work from the actual `.markdown-body pre`, `.markdown-body pre code`, `.code-block`, `.code-toolbar`, and Chat/Attention surface selectors; refresh their current coordinates first.
>
> Compare the short, unknown-language, and longer code blocks in the mixed fixture in light/dark themes. Improve the amount of space the blocks occupy while preserving enough line separation for scanning, legible source, the toolbar/Copy action, unmodified code bytes, horizontal access to long lines, and surrounding prose rhythm. Keep inline-code contrast as accepted in the previous commit. Keep `--text-reading`, existing typography tokens, spacing tokens, diffs, permission/runtime output, and message/document source semantics unchanged. No syntax highlighting, wrapping toggle, copy behavior change, or new dependency.
>
> Test the same fixture in all four reader surfaces at 1440, 1280, and 390 CSS-pixel widths, light/dark themes, keyboard focus on each Copy action, selection/copy of short and long blocks, 200% zoom and forced-colors. Check for viewport overflow and clipped code/toolbars. Run `node tools/lint-materials.mjs`, `node tools/lint-interaction.mjs`, relevant Markdown/message tests, and the full `npm --prefix app test` suite once both serial tasks are complete. Record not-run checks accurately.
>
> Return the actual Host-generated diff/receipt, changed paths and hashes, base/HEAD, before/after screenshots or browser evidence, test results, and confirmation that no source tree was modified. Do not merge or auto-publish; hand the result to the existing non-author reviewer.

**Acceptance focus:** the dense block remains scannable and operable across widths, the toolbar remains reachable, text remains copy-identical, and no other code or diff surface changes unintentionally.

## Required environment and execution boundary

The existing app accepts Node `>=22.19.0`; the preparation host had Node `v25.9.0`, npm `11.12.1`, Playwright `1.59.1` installed globally, and Google Chrome `152.0.7977.83` at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. The app itself does not declare Playwright as a production dependency. A compatible browser runner can use the established local preview pattern in `engineering/research/chat-memory-broker-2026-09-12/specimen/verify-browser.mjs` with:

```sh
PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" \
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node <candidate-owned-synthetic-browser-check.mjs>
```

Use `npm --prefix app ci` only if the isolated candidate lacks its pinned ignored dependencies. Use local synthetic fixtures and a fresh temp data directory/port; the default provider is deterministic fake. The existing project checks are `npm --prefix app run check:product` and targeted `node --test <exact-file>`. Do not configure real credentials or call a paid provider. Capture candidate screenshots as evidence, not as a product-accepted visual baseline.

The task-specific paste/execution recipe is **not integrated into a user-facing GUI**, and the Connect/Access control surface remains absent. The direct handoff is executable by an external Luna/Agent only once the candidate tools have passed their non-author review. No visual work has been assigned, pasted, or run as part of this preparation.
