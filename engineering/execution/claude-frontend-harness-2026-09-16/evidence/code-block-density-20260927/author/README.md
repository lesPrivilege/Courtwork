# CB-D1 · code-block density · author evidence — 2026-09-27

Author: Claude (Opus 5.5), original frontend owner, serial lane. Branch `claude/runtime-settings-i1-20260927`, fast-forwarded to main `d4a08d7`. The product commit is `43aa69e`. This is author evidence, not acceptance. The input is the [user screenshot](../user-screenshot.png), with the command reproduced verbatim.

## Change

- **No header on unlabelled blocks.** These are the blocks from `ui-controls.mjs` `markdownTokens` (Chat, Attention, Order 3 growing replies, Settings text) and from `markdown-reader.mjs` `appendSemantic`. They no longer carry the constant "Code" header row. The sanitizer drops fence languages, so the label identified nothing.
- **Copy moves beside the code.** It sits in its own top-right column (`.code-copy`), a grid column beside the `pre` and never over it. Selected or horizontally scrolled code is therefore never covered.
- **Unchanged.** The button, its name ("Copy code"), its feedback ("Copied") and its focus key. It is the existing `quiet-button` control, 28px on a fine pointer and 44px through the existing narrow/coarse override. The code's type, padding and each surface's wrap policy are as before:
  - Chat: `pre`, horizontal scroll;
  - Attention and the reader: their existing wrapping.
- **Labelled headers keep their rows.** The reader's source inspector ("Source · code points…") and the appearance preview (a file name) still use `.code-toolbar`.
- **Exact copy.** Copy in Chat and Attention no longer includes the `\n` that marked appends inside every `<pre><code>`. Before, the 69-byte command copied as 70 bytes, so pasting it into a terminal ran it at once. It now copies the authored bytes, matching the reader. This is an intentional change, found during measurement.

Token mapping: existing `--space-2` padding on the copy column, the existing `--control` / `quiet-button` target, and no new token, colour, radius, shadow or glyph. Lints and `contrast-report` pass.

## Measured before / after

Command, loopback fake provider only, disposable Host:

```sh
node app/scripts/code-block-density-browser.mjs --out <dir>
```

HeadlessChrome 153. The before side is the same script against `git archive d4a08d7`. Raw data: [`before/record.json`](before/record.json) and [`after/record.json`](after/record.json), with run logs beside them. Heights are CSS px and include the 1px borders.

| Surface · viewport | Block | Height before (of which header) | Height after | Code width before → after | Code type | Copy target |
| --- | --- | --- | --- | --- | --- | --- |
| Chat 1440 light / dark | one-line command | 89 (37) | **52** | 738 → 702 | 15/25.5 mono | 28×28 |
| Chat 1440 light / dark | multiline + long line | 191 (37) | 154 | 738 → 702 | 15/25.5 | 28×28 |
| Chat 390 touch light / dark (DPR 2) | one-line | 105 (53) | **62** | 356 → 304 | 15/25.5 | 44×44 |
| Chat 390 touch | multiline | 207 (53) | 154 | 356 → 304 | 15/25.5 | 44×44 |
| Chat, **zoom 200% emulated** (720×450 CSS, DPR 2) | one-line / multiline | 105 / 207 (53) | 62 / 154 | 686 → 634 | 15/25.5 | 44×44 |
| Chat, **text ×2 emulated** (`--text-scale: 2`) | one-line / multiline | 122 / 326 (45) | 77 / 281 | 738 → 702 | 30/51 | 28×28 |
| Attention 1440 light | one-line / multiline | 83 / 200 (37) | 46 / 163 | 588 → 552 | 11.5/19.55 | 28×28 |
| Attention 390 touch dark | one-line / multiline | 118 / 255 (53) | 65 / 221 | 338 → 286 | 11.5/19.55 | 44×44 |
| Reader 1440 light | one-line / multiline | 79 / 199 (37) | 46 / 162 | 1152 → 1116 | 15/24 | 28×28 |
| Reader 390 touch dark | one-line / multiline | 143 / 359 (53) | 114 / 354 | 274 → 222 | 15/24 | 44×44 |

**Trade-off, for the parent.** The side column takes 36px of code width on a fine pointer and 52px at 390 on a coarse pointer.
- Chat scrolls long lines, so it only shows less per line.
- Attention and the reader wrap. At 390 their code gets taller: the reader's one-line command goes from 2 to 4 wrapped lines. Every block is still no taller overall, because the removed header outweighs it.

An overlay corner button would keep the width, but the ruling allows one only if it never covers selected or scrolled text. A column guarantees that.

## Behaviour (after; the before side for comparison)

| Check | Result |
| --- | --- |
| Keyboard: focus Copy, Enter (Chat 1440, both blocks; Chat 390; Attention; reader) | Focused and `:focus-visible`. The clipboard holds exactly the authored bytes: 69 / 264. Before, Chat and Attention held 70 / 265. Feedback "Copied"; focus stays on Copy |
| Selection of the code (Chat 1440 and 390) | Exactly the code; no "Copy"/"Code" chrome in the selection (before and after) |
| Long line scrolled to its end (Chat) | End reachable; Copy does not overlap the code box after scrolling |
| Copy over code, any case | Never (`copyOverPre: false` in every measured block) |
| Page exceptions | 0 before, 0 after |

Screenshots in [`before/`](before/) and [`after/`](after/):
- `chat-desktop-1440-{light,dark}`, `chat-narrow-390-touch-{light,dark}`;
- `chat-zoom-200-emulated-720`, `chat-text-scale-2-emulated`;
- `attention-desktop-1440-light`, `attention-narrow-390-touch-dark`;
- `reader-desktop-1440-light`, `reader-narrow-390-touch-dark`.

Tooltips visible in some captures come from the keyboard-focus step.

## Checks

| Command | Result |
| --- | --- |
| `node --test tests/code-block-browser.test.mjs` (the run above, asserted) | 1/1 |
| Targeted, [`targeted-tests.log`](targeted-tests.log): the above plus `stream-body-browser`, `attention-agent`, `chat-actions`, `markdown-core-read`, `markdown-source-independent`, `output-message-boundary`, `settings-preferences`, `product-icons`, `stream-thread-projection` | 99/99 |
| Lints, [`lints.log`](lints.log): `lint-colors`, `lint-interaction`, `lint-materials`, `lint-shapes`, `lint-spacing`, `check-product-copy`, `check-semantic-consumers`, `product-semantics`; plus `contrast-report` | all exit 0 |

The full suite is not repeated. The changed seams are the two code-block builders and one scoped CSS block, and their consumers are covered above.

## Not covered

- **Native browser zoom and OS text size.** The two 200% rows are emulations and are named as such.
- **Text-spacing overrides.**
- **Forced colours.**
- **Screen reader.** Announcement of "Copy code" / "Copied", and reading order: the code is now read before Copy.
- **Real touch hardware.** 390 uses Chrome's touch emulation.
- **The Settings appearance preview.** Its structure is unchanged: it is a labelled `.code-toolbar` built outside these builders.
- **The live dogfood Host.**

Computer-use inspection stays with the parent.
