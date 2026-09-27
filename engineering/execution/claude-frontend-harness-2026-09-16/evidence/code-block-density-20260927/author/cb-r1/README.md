# CB-R1 · Copy code fidelity · author return — 2026-09-27

Author: Claude (Opus 5.5), original owner. Same branch `claude/runtime-settings-i1-20260927`; the fix is `f660251`, on top of the reviewed `c61557c`. Main `c550395`, which holds the [parent review](../../parent-review/README.md), was then merged in. This is author evidence, not acceptance.

## Cause

`43aa69e` copied `pre.textContent.replace(/\n$/, "")` for every rendered `pre`. The DOM text cannot tell marked's renderer suffix apart from authored text, for two reasons:
- marked's `code()` renderer always ends a fenced or indented block's `pre` with one `\n`, and drops a retained final blank line;
- raw HTML `<pre>` / `<pre><code>` carry their own text, including a final LF.

## Correction (`app/web/ui-controls.mjs`, the shared `markdownTokens`)

`markdownTokens` is the single path behind both the complete `markdown()` and the growing reply.

- **Recording the code text.** A `marked.Renderer` subclass is passed to `marked.parser` and records each code token's own text in order. It tags that token's `<pre>` with `title="<nonce>:<index>"`, where the nonce is a fresh `crypto.randomUUID()` per render.
- **Why the tag is safe.** `title` was already allowed by the sanitizer. Source HTML cannot know the nonce, so a raw or forged `title` never takes a token's text. After sanitizing, each `pre` with this render's nonce copies its token text and the attribute is removed. Every other `pre` copies its own DOM text.
- **Fenced blocks** copy the token text as parsed: `abc`; `abc\n` when a blank line is kept before the closing fence; trailing spaces kept.
- **Indented blocks** copy the token text without its final line terminator. marked keeps that terminator only when the document ends right there and trims it before blank lines, and an indented block cannot hold a trailing blank line. So this removes a line ending, never code.

Unchanged: the accepted layout and side column, the sanitizer policy (no new allowed attribute), reference parsing, streaming, and the reader, which already copies from its own AST. No parser change.

## Before / after — [`code-copy-fidelity-browser.test.mjs`](../../../../../../../app/tests/code-copy-fidelity-browser.test.mjs)

The check runs in real headless Chrome, with the production renderer, sanitizer and Copy click handler. `navigator.clipboard.writeText` is recorded: this proves the bytes requested, not OS clipboard persistence. Each case runs through three entry points:
- the complete `markdown()`;
- a **growing** reply (`createAssistantBody`, block-incremental);
- a **settled** reply.

| Input | `d4a08d7` (before CB-D1) | `c61557c` (reviewed) | `f660251` |
| --- | --- | --- | --- |
| fenced `abc` | `abc\n` | `abc` | `abc` |
| fenced `abc` + retained blank line | `abc\n` | **`abc`** | `abc\n` |
| fenced `abc  ` (trailing spaces) | `abc  \n` | `abc  ` | `abc  ` |
| raw `<pre>abc\n</pre>` | `abc\n` | **`abc`** | `abc\n` |
| raw `<pre><code>abc\n</code></pre>` | `abc\n` | **`abc`** | `abc\n` |
| raw `pre` then the same fenced text | `abc\n`, `abc\n` | **`abc`**, `abc` | `abc\n`, `abc` |
| list-nested fence, top-level fence, indented block at the end | adds `\n` to each | `one\ntwo`, `three`, `four` | same |
| indented `x = 1` / blank / `y = 2` | `…y = 2\n` | `x = 1\n\ny = 2` | same |
| Unicode and entities: `é 😀 &amp; <b>not bold</b> é` | + `\n` | literal | literal (no decoding, no tags) |
| fenced inside a blockquote | + `\n` | `quoted` | `quoted` |
| forged `<pre title="cw-code:0">` before a fence | — | — | `raw\n`, `real`: no forging |

The complete, growing and settled columns agree in every case. No copy marker is left in the page.

Logs:
- [`before-d4a08d7.log`](before-d4a08d7.log) and [`before-c61557c.log`](before-c61557c.log): 1 pass, 2 fail on each. The same test file was run against `git archive` of each.
- [`after.log`](after.log): 3/3.

**Reader comparison.** This is recorded, and asserted in the third test. The shared reader, with its own parser and profile `cw-markdown-block-v1`, copies exactly the same text as the fixed Markdown path for every Markdown code case, including `abc\n` for the retained blank line. Its profile renders raw HTML `pre` as no code block, so those have no Copy there.

## Scoped checks

- **Targeted, [`targeted-tests.log`](targeted-tests.log): 102/102.** It covers the fidelity test (3) and CB-D1's `code-block-browser`, which still copies 69 / 264 bytes for its two fenced blocks. It also covers `stream-body-browser`, `attention-agent`, `chat-actions`, `markdown-core-read`, `markdown-source-independent`, `output-message-boundary`, `stream-thread-projection`, `settings-preferences` and `product-icons`.
- **Lints:** `lint-colors`, `lint-interaction`, `lint-shapes`, `lint-spacing`, `check-product-copy` and `check-semantic-consumers`, all exit 0.
- **Not repeated:** the full suite, and CB-D1's layout evidence (layout is unchanged).

## Claims corrected

Earlier text said a trailing LF "runs" a pasted command, and that Copy writes "the authored bytes". Both are now qualified in the [author README](../README.md) and the 06b record:
- whether a pasted LF runs a command depends on the terminal;
- the measured exactness held for the two fenced examples only.

## Not covered

- Native OS clipboard persistence in the parent's in-app browser.
- Copy from a hand-selected range (that is the browser's own behaviour).
- Screen reader.
- Other Markdown flavours outside marked's GFM tokens, such as tabs in indentation beyond marked's rules.
