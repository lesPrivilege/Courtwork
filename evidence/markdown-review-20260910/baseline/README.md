# Markdown renderer browser baseline

Author: Terra (bounded implementation and evidence author). This is a current-state baseline for Astra's acceptance; it is not independent acceptance and it changes no product code.

## Run

From the repository root:

```sh
node evidence/markdown-review-20260910/baseline/run.mjs
```

The runner first reserves/checks `127.0.0.1:8976` for its own static server and `127.0.0.1:20276` for Chrome DevTools. Override only with `MARKDOWN_BASELINE_PORT` and `MARKDOWN_BASELINE_CDP_PORT`; `MARKDOWN_BASELINE_CDP_TIMEOUT_MS` bounds each CDP request. It starts a temporary Chrome profile, serves only `app/web/` under `/web/` plus this fixture's single `fixture.html`, calls the production `markdown()` export in a real headless Chrome document over native CDP, writes `results.json`, then kills its own browser and closes its own server. It does not start or call the product backend, a model, or a provider. The synthetic fixture page declares no external resource; this baseline does not assert that the Chrome process makes no external traffic.

The corpus strings are synthetic. The runner does not emulate a DOM parser and does not treat fixture-only checks as renderer proof: each assertion reads DOM produced by `app/web/ui-controls.mjs#markdown` in Chrome.

## Current implementation status

The current renderer enables GFM headings, nested unordered/ordered lists, tables, and fenced code. It preserves CJK, emoji, and combining marks. It produces semantic strong/emphasis/delete elements, so visible text omits formatting delimiters. HTTP(S) links receive `target="_blank"` and `rel="noopener noreferrer"`; non-HTTP(S) and relative links lose `href`. Tables receive `.table-scroll` wrappers. Fenced code receives `.code-block` and exact `pre.textContent` survives.

## Verification result

`author-results.json` preserves Terra's initial run. `results.json` is the current machine record. It binds the tested `ui-controls.mjs`, vendored `marked.mjs`, vendored `purify.mjs`, and baseline Git HEAD to SHA-256 values. The latest recorded browser run passed all 8 renderer/safety cases, had no browser runtime exceptions, and validated every declared revision-fixture hash. It generated at least 200 KiB UTF-8 for the long-document check. The runner reads the DOM produced by `app/web/ui-controls.mjs#markdown` in real headless Chrome; it does not emulate a parser.

The unsafe case establishes that raw `<script>`, image `onerror`, `javascript:` and `data:` links did not become executable content for those inputs. No `script` or `img` element survived and the fixture sentinel stayed unchanged. The corpus separately verifies repeated paragraphs and separate cross-paragraph nodes.

## Current unsupported behavior and limits

Images have no supported renderer because `img` is absent from the renderer allow-list. Relative assets lose `href`. Inline math remains literal text, Mermaid remains a normal code block, and GFM footnotes are not rendered as footnote semantics. These are observations, not product defects or requested fixes.

The code-block chrome contributes `CodeCopy code` to `.code-toolbar.textContent`, and therefore `.code-block.textContent` includes that toolbar label ahead of the source code. The `pre.textContent` coordinate itself stays exact. Consumers that map a code block from ancestor `textContent` must account for this current contamination.

The three incomplete-input snapshots only establish that their static final states do not execute content. They do **not** establish streaming stability, incremental parsing behavior, or anchor preservation.

The long document is generated to at least 200 KiB UTF-8 and timed once with browser `performance.now()`. Its reported duration is an environmental observation, not a performance threshold.

## Future revision oracle fixtures

`revision-pairs.json` covers prefix insertion, movement, duplication, rewrite, deletion, CRLF normalization, and emoji change. The runner checks only its structure and declared SHA-256 values. Its declared future oracle expectations are: an original anchor remains immutable; duplicated text is ambiguous; rewriting must not silently relocate the anchor. These pairs do not count as present renderer behavior.
