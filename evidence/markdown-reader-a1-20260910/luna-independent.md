# Markdown reader A1 independent evidence

Date: 2026-09-10  
Checkout: codex/markdown-reader-a1@a243a6ca0f43c12f5d1f69aa80dbf1b29e38dd29  
Scope: independent source/DTO verification plus bounded host integration review

The only product-adjacent file added for this follow-on is [app/tests/markdown-source-independent.test.mjs](../../app/tests/markdown-source-independent.test.mjs). It imports the fixed source module but does not change it, call the host, mutate Core, or use a browser.

## Verification

Command:

~~~sh
node --test app/tests/markdown-source-independent.test.mjs
~~~

Result: 17/17 tests passed.

The test computes SHA-256 with node:crypto over Buffer UTF-8 bytes and computes source ranges with Array.from code-point slices. It covers:

- Candidate and Artifact selectors, exact request DTOs, identity propagation, and supported projection gating.
- Manifest duplicate path, unsupported page, wrong identity, and page-hole rejection.
- Content pagination at the 4,000-code-point boundary with an emoji-only 4,001-code-point source.
- Continuation replay/changed body, wrong ID/path, page identity/hash swaps, final digest mismatch, and empty terminal files.
- Abort before a request and after a delayed response, with no partial result.
- BOM preservation, CRLF, combining marks, duplicate paragraph ranges, full-document reference definitions, GFM-derived semantic nodes, unsafe links, images, and raw HTML warnings.
- Producer-absent behavior at the DTO boundary: an Artifact selector remains an exact immutable read; no current workspace fallback is available to the callback.
- Source identity, size, malformed UTF-8, traversal path, and read-only projection behavior.

## Contract cross-check

The reader path validator at [app/web/markdown-source.mjs](../../app/web/markdown-source.mjs) line 107 matches the Core and adapter portable path rule: ASCII alphanumeric, dot, underscore, slash and hyphen; no empty/dot/dot-dot segments. Core applies the same shape at [app/core/file_candidates.py](../../app/core/file_candidates.py) lines 65–67 and the adapter at [app/extensions/work-adapter.mjs](../../app/extensions/work-adapter.mjs) lines 204–212. There is no observed “spaces are valid recorded paths” mismatch. The source reader is stricter about the complete file identity only where it must be: valid Core ref, raw byte count, UTF-8 text, and SHA-256.

The source-only command does not claim real HTTP/service binding, producer lifecycle, DOM accessibility, or browser/parser performance. Those are covered by the separate Core/HTTP and host/browser evidence below. The earlier pre-merge observation that the continuity test could not load because `@earendil-works/pi-ai` was absent is historical for that checkout; it is not a current merged-suite limitation.

## Current host and merged-suite follow-up

The current review checkout is `codex/markdown-reader-a1@21fde2f` (the source-only test file itself remains the file authored at `a243a6c`). The parent’s current merged-suite report is 365/365 passing, including 19 new tests. This supersedes the pre-merge dependency observation above while preserving it as historical evidence about the earlier baseline.

The recorded author host run in [host-checks.json](host-checks.json) reports 10/10 passing checks and `exceptions: []`; I reviewed this JSON and did not rerun its browser process. Its fixture exercises the actual `createFileView` host path and a real Core candidate over HTTP: opening a manifest entry reuses the File surface, a 4,000-code-point paginated source renders as a read-only Markdown reader, repeated-block Find counts all 205 blocks, raw mode preserves the exact source string, background work does not replace mode/find state, the 390px host has no page overflow, delayed reads are discarded after close and identity switch, and current/truncated/identity-mismatched payloads remain previews or are refused.

Source inspection confirms the lifecycle fences behind that result. `app/web/inspector.mjs` creates a fresh generation and `AbortController` per load (lines 334–364), routes Core files only through the scoped `readCoreFile` callback (353–356), parses only complete bounded Markdown revisions (398–407), ignores stale/aborted completions (465–466), and aborts in-flight work on dispose or pause (484–498). `dispose()` also destroys the reader and clears the container; `pause()` intentionally preserves the loaded reader/DOM for collapse and reopen. `app/web/app.mjs` aborts the manifest controller when the renderer is disposed (1269–1293), clears the file ref and disposes the File view on session switch (1425–1450), clears the document ref and restores opener focus on close (3476–3494), rejects cross-session `openFile` calls (3933–3942), and guards manifest results by abort, session epoch, active session, and connected group before adding rows (4219–4235). The document tab key includes the Core candidate/artifact and digest identities (3448–3457), and the tab exposes the full path through its title and accessible name (3729–3749).

The earlier plan’s shorthand “producer absent ⇒ `surface.extension === null`” did not describe the observed unloaded lifecycle. The correction is now recorded in [docs/markdown-reader.md](../../docs/markdown-reader.md#L41): after extension unload, the service retains the descriptor and returns `extension.id: "evidence-memo"`, `extension.status: "unloaded"`; the projection is `readOnly: true` with `humanActions: []` ([service.mjs](../../app/server/service.mjs#L733), [markdown-core-read.test.mjs](../../app/tests/markdown-core-read.test.mjs#L202)). The host resolves that descriptor to the `producer-unloaded` branch and keeps the historical Core file query available ([surface-modules.mjs](../../app/web/surface-modules.mjs#L534), [surface-modules.mjs](../../app/web/surface-modules.mjs#L584)). This is a bounded static nonauthor finding: preserve the read-only history guarantee and use the actual descriptor/status shape; no service-shape change is proposed here.

## File hashes

- app/tests/markdown-source-independent.test.mjs: 453fa647a05e8dc0838c28917d52c74615be6f39c065d80a4c8c21f6f50955db.
- evidence/markdown-reader-a1-20260910/luna-plan.md remains the read-only contract plan from the preceding A1 review.
