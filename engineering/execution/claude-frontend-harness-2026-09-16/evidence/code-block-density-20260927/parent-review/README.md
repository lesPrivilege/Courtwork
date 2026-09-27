# CB-D1 parent review · 2026-09-27

Reviewed original Claude `c61557c`, product `43aa69e`, based on `d4a08d7`. **Hold integration for CB-R1 (copy fidelity).** Astra accepts the side-column density design within this slice; this is not whole-product/accessibility acceptance.

## CB-R1 · preserve code payload; do not trim arbitrary DOM text

The new `markedCodeText(pre)` removes a terminal LF from every sanitized pre node. The actual production `markdown()` and Copy click handler reproduce:

| Input | Copied now | Required distinction |
|---|---|---|
| Fenced `abc` without retained blank line | `abc` | Removing parser-generated decoration is reasonable |
| Fenced `abc` plus one retained blank line before closing fence | `abc` | Retained code-token newline must not be removed |
| Raw HTML `<pre>abc\n</pre>` | `abc` | LF belongs to source/DOM content, not a marked code renderer suffix |
| Raw HTML `<pre><code>abc\n</code></pre>` | `abc` | Same source-content regression |

[Raw browser probe](copy-boundary-probe.json) was collected on the fixed source in OpenAI-controlled in-app Chromium. It invokes the real renderer and real Copy event handler with a temporary `navigator.clipboard.writeText` argument recorder, restored afterward. This proves the bytes requested for copying, not native clipboard persistence. Independent native IAB clipboard read returned empty despite Copied feedback, so no real OS clipboard success is claimed; author's headless clipboard evidence remains separate.

**Adopt correction in original Claude lane:** derive fenced/indented code copy content from the relevant parsed source/token without losing legitimate trailing whitespace; raw HTML pre content must retain its own semantic text. Do not apply generic trim/regex to all pre elements, alter sanitization, add source-controlled trusted HTML attributes, change streaming reference behavior or redesign the accepted layout. Add focused failing-before/passing-after cases for ordinary fenced code, retained blank lines, multiple blocks/nested lists, indented code, Unicode/entity content and raw pre/pre-code. Exercise both complete and incremental Markdown entry points and compare the reader's documented semantics where applicable. If broad parser changes seem necessary, prefer preserving pre-existing copy behavior and isolating exactness as a follow-up over data loss. Correct the unsupported blanket claim of exact authored bytes; a trailing LF does not universally execute on paste (terminal paste behavior varies).

## Visual and composition disposition

Parent drove actual Chat and Attention fake-provider replies on a separate Host using only temporary data, and viewed [1440 Chat](chat-1440.png), [390 Chat](chat-390.png), [390 Attention](attention-390.png). The constant header is gone, code is readable, Copy remains visible beside it and does not overlap. At390 the two Chat pre elements scroll to their actual end (343 and1201 CSS px), each with44px Copy targets and no overlap. [Desktop](chat-1440.json) and [narrow](chat-390.json) geometry retain the actual inspected values. A temporary raw-CDP screenshot sizing mismatch was corrected by using the built-in viewport control; final captures show the actual390 layout.

**Adopt side-column trade-off:** 36–52px less code width is acceptable for the bounded design; do not switch to an overlay or change wrap rules in this return. The author's measured examples are shorter overall; do not generalize that to arbitrary code lengths, since wrapping can eventually outweigh the removed header. Labelled source/Settings rows remain unchanged. Author99/99 and native accessibility limits remain separately attributed. Parent has not independently re-tested shared-reader visual/native200%/spacing/forced-colours/screen reader or live user Host.

Browser viewport/media/touch overrides and test tab were cleared. User8787, personal data and providers were untouched. No CB-D1 source merged, and Hermes remains queued behind this correction and parent disposition.

## Independent review and return receipt

[Luna review](luna-review.md.txt) agrees with CB-R1. [Targeted non-browser65/65](luna-tests.stdout.txt) pass at the reviewed source, exit0; [source-boundary counterexample](luna-boundary-probe.stdout.txt) confirms the missing whitespace distinction. These tests do not override the failing copy counterexample. Parent actually sent the narrow CB-R1 assignment to the original Claude/Opus conversation through OpenAI computer use; UI shows the submitted return and Running/Waiting response. No substitute author is launched.
