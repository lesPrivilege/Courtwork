# Markdown reader A1 seam plan

Date: 2026-09-10  
Role: Luna, bounded read-only contract review  
Baseline: codex/markdown-reader-a1@a243a6ca0f43c12f5d1f69aa80dbf1b29e38dd29

This is a pre-acceptance design handoff. It changes no product code, Core schema, Runtime contract, vendor dependency, or fixture bytes. The implementation owner should consume the existing Core/HTTP contracts and prove the reader against the independent oracles below before any UI acceptance claim.

## Contract facts the reader must consume

The ES-01 file contract is already in [docs/work-core/contract.md](../../docs/work-core/contract.md), especially lines 75–99. Core’s implementation is the authority for the wire fields and range behavior in [app/core/file_candidates.py](../../app/core/file_candidates.py):

- file_summary and the page response are assembled at lines 235–251 and 253–309.
- File identity is checked before slicing: candidate ownership and file integrity are checked at lines 266–272; an artifact is joined to its owning candidate/Matter and its candidate/content hashes are checked at lines 261–265.
- HTTP derives the Matter from the bound Session and forwards kind, exactly one ID, path, offset, and limit at [app/server/service.mjs](../../app/server/service.mjs) lines 792–813. The route is registered at [app/server/index.mjs](../../app/server/index.mjs) line 126. The deployed prefix is /api/v5; test helpers omit that prefix.

For GET /api/v5/sessions/:sessionId/work-query?kind=file-manifest&candidateId=..., with no artifactId, the successful response is:

~~~
{
  "schemaVersion": 1,
  "candidateId": "candidate-…",
  "artifactId": null,
  "candidateDigest": "sha256(payload identity)",
  "bundleDigest": "sha256(selected-recorded-versions manifest)",
  "files": [
    {
      "path": "out/memo.md",
      "bytes": 123,
      "sha256": "sha256(raw UTF-8 bytes)",
      "sessionId": "producer Session id",
      "runId": "recording Run id",
      "recordIndex": 0,
      "kind": "content-version",
      "writtenAt": "timezone-bearing ISO timestamp"
    }
  ],
  "offset": 0,
  "end": 1,
  "nextOffset": null,
  "fileCount": 1
}
~~~

Manifest pages count entries, not characters. The limit is 1–16. offset === fileCount is an empty terminal page; offset > fileCount is INVALID. The manifest is sorted by the ASCII/UTF-8 path order fixed by Core.

For GET /api/v5/sessions/:sessionId/work-query?kind=file-content&candidateId=...&path=out%2Fmemo.md&offset=0&limit=4000, the successful response is:

~~~
{
  "schemaVersion": 1,
  "candidateId": "candidate-…",
  "artifactId": null,
  "candidateDigest": "sha256(payload identity)",
  "bundleDigest": "sha256(selected-recorded-versions manifest)",
  "path": "out/memo.md",
  "fileDigest": "sha256(raw UTF-8 bytes)",
  "byteLength": 123,
  "text": "the requested text page",
  "offset": 0,
  "end": 4000,
  "nextOffset": 4000,
  "codePointLength": 5173
}
~~~

An Artifact request has the same fields with the actual artifactId; a Candidate request has artifactId: null. Content offsets and codePointLength count Unicode code points, not UTF-16 code units or UTF-8 bytes. Core decodes the stored UTF-8 BLOB and slices the decoded string at lines 282–287. Content limits are 1–4000 code points. fileDigest and byteLength describe the complete raw file, even when the page is partial. The reader must follow nextOffset; it must not calculate the next request as offset + page.text.length.

The query requires exactly one of candidateId and artifactId. It rejects missing/both IDs, wrong Matter ownership, artifact/candidate mismatches, unknown paths, invalid ranges, or damaged persisted identity. HTTP’s context is null, so the private Core Run admission check used by model tools does not apply to this read-only bound-Session query. The model-facing tools remain stricter: [app/extensions/work-adapter.mjs](../../app/extensions/work-adapter.mjs) lines 694–737 require an open bound Run, and the host reader in [app/server/service.mjs](../../app/server/service.mjs) lines 1084–1107 resolves only an exact recorded path + sha256 selector from that Run’s durable content-version records.

The client should retain the complete identity tuple candidateId, artifactId, candidateDigest, bundleDigest, path, fileDigest, byteLength, codePointLength. A page with a changed identity, an unexpected path, an unexpected offset, a backward/duplicate continuation, a gap, or a final length/hash mismatch is a protocol failure. It must never be replaced with a current-workspace read.

## Unsupported and producer-absent behavior

An unknown file schema is deliberately bounded. When the manifest query sees an unsupported schema, Core returns:

~~~
{
  "schemaVersion": 1,
  "candidateId": "candidate-…",
  "artifactId": null,
  "metadata": {
    "schemaVersion": null,
    "candidateDigest": "…",
    "coverage": "unknown",
    "verification": "unknown",
    "reasons": ["CONTRACT_UNSUPPORTED"],
    "acceptable": false
  },
  "status": "unsupported"
}
~~~

That response has no text and no decoded file list. A content query for the same candidate returns CONTRACT_UNSUPPORTED (HTTP 409). The reader must show a bounded unsupported state, never render an assumed body, and never turn acceptable:false into an action affordance.

The HTTP query remains readable when the producer is unloaded. [app/server/service.mjs](../../app/server/service.mjs) lines 701–715 returns the Core projection read-only for the retained evidence-memo/NDA binding; lines 792–813 do not require the extension registry to be loaded. Session deletion retains Core work/history after claiming project ownership (lines 718–727). A continuation Session may bind the same Matter only with the existing project/extension ownership checks at lines 665–679. The expected producer-absent state is:

- GET /surface: read-only projection, no humanActions;
- GET /work-query?kind=file-content&artifactId=...: the same exact immutable page, even after deleting the producer Session and unloading the extension;
- no mutation or review action is inferred from a readable page.

## Concrete HTTP seed for a Markdown Candidate and Artifact

Use a disposable local-fake/loopback run and the existing evidence-memo file-memo-v1 binding. Keep the fixture synthetic and retain the exact bytes below; do not normalize it before hashing or parsing:

~~~js
const markdown = "\uFEFF# Heading\r\n\r\n😀 **中文** e\u0301\r\n\r\nA &amp; B\r\n\r\n| A | B |\r\n| - | - |\r\n| 中 | 😀 |\r\n\r\n~~~js\r\nconst x = 1;\r\n~~~\r\n\r\nSame clause.\r\n\r\nSame clause.\r\n\r\n<script>window.__a1 = 1</script>\r\n";
const path = "out/memo.md";
const sha256 = hash(Buffer.from(markdown, "utf8"));
~~~

Run the following sequence using the existing HTTP/Pi/Core test helpers, with a fresh project and Session:

1. Load the evidence-memo extension; bind {title, sourceText:"Approved source.", profile:"file-memo-v1"}.
2. In the fake model script, call ws_write({path:"out/memo.md", text:markdown}), then submit se_submit_candidate({artifact_text:"Source-backed memo.", evidence:[…], obligations:[], recordedFiles:[{path:"out/memo.md", sha256}]}). Source evidence end must use Array.from(source.text).length, as in [execution-file-continuity.test.mjs](../../app/tests/execution-file-continuity.test.mjs) lines 17–20.
3. After the Run completes, read the candidate ID from the surface and query its manifest. Assert the single manifest entry has the exact path, bytes:Buffer.byteLength(markdown), sha256, Session/Run identity, kind:"content-version", and timestamp. Fetch all content pages and verify page identities, concatenated text, codePointLength, raw UTF-8 byte length, and independent SHA-256.
4. Accept through POST /api/v5/sessions/:id/actions using the existing decision payload and top-level fileCapabilityVersion:1. Omitting that field must remain a 409 CONTRACT_UNSUPPORTED, as exercised by [execution-file-continuity.test.mjs](../../app/tests/execution-file-continuity.test.mjs) lines 55–63. Capture result.active_artifact, then read the same path by artifactId.
5. Mutate the current workspace file after the Run; the Candidate/Artifact page must still equal the recorded markdown bytes. Create a continuation Session in the same project, delete the producer Session, unload the extension, and repeat the Artifact query. This is the producer-absent proof already exercised by lines 64–74 of that test when the dependency is available.
6. Keep the Candidate packet (pre-accept) and Artifact packet (post-accept) as separate wire cases. The reader must not use the candidate’s artifact_text or the surface’s summary as a substitute for the recorded file.

The existing fixture generator at [app/scripts/file-candidate-fixture.mjs](../../app/scripts/file-candidate-fixture.mjs) follows this lifecycle, but currently uses out/memo.txt and Exact file 😀\n. For A1, an evidence-only copy/variant should switch only the synthetic path/content/hash to the Markdown bytes above and retain its ready/unknown/failed/stale/accepted/rejected/unsupported/missing-bytes/producer-absent cases. No application fixture or schema change is required for this plan.

## Reader boundary and parser rules

The narrow reader should be a pure HTTP page assembler followed by the existing markdown(text, {key}) renderer in [app/web/ui-controls.mjs](../../app/web/ui-controls.mjs) lines 150–218. That renderer currently uses GFM marked output plus DOMPurify allowlists; HTTP(S) links receive target="_blank" and rel="noopener noreferrer", while non-HTTP(S) links lose href. The browser baseline records 8/8 renderer/safety cases in [evidence/markdown-review-20260910/baseline/README.md](../../evidence/markdown-review-20260910/baseline/README.md), but that does not establish paged Core loading or block/source mapping.

Load every page before final parse. A later reference definition changes an earlier paragraph from plain text to a link reference, so incremental parsing of a “closed” page can produce a different document than parsing the complete source. The isolated parser spike records this as P06 and records 10/10 behavior probes in [parser-spike/results.json](../../evidence/markdown-review-20260910/parser-spike/results.json). The AST is a derived rendering projection and is not a sanitizer; P10 requires the existing separate sanitizer policy.

Preserve canonical text and bytes. The parser spike demonstrates:

- UTF-16 parser offsets, Unicode code-point Core offsets, and UTF-8 byte offsets diverge (P01).
- A leading BOM changes parser input offsets; strip exactly one BOM only in a parser-input mapping while retaining original text/hash (P02).
- CRLF is part of canonical bytes (P03); do not normalize newlines before digesting or mapping.
- Entities and fenced-code delimiters make node display values different from raw source ranges (P04/P05).
- Combining-character normalization changes code points and bytes (P08); do not NFC-normalize.
- Duplicate block source hashes are equal while positions differ (P07), so content hash alone cannot identify a block.
- GFM table delimiter rows are source syntax outside displayed cell values (P09).

For this A1 slice, rendering may use the existing sanitized Markdown renderer; durable annotations/source ranges are a separate seam. If a future review layer needs a block key, it must include immutable file identity and a source occurrence/range. It must translate parser UTF-16 offsets back to canonical code-point offsets through an explicit mapping that accounts for BOM, surrogate pairs, and raw source bytes. Do not persist mdast position.offset as if it were a Core offset.

## Independent negative oracles

The following should be implemented as independent wire/loader tests. A mocked page source is useful for malformed response cases; the real HTTP fixture should cover server-side scope and integrity cases. Each oracle must assert both the result and that no stale/current workspace content was rendered.

| ID | Probe | Expected result |
|---|---|---|
| A1-N01 | Exact page replay. Return the same manifest/content response twice for the same offset; replay the request after a retry. | HTTP is idempotent and returns the same identity/text. The assembler replaces or ignores the duplicate page and never appends it twice. |
| A1-N02 | Continuation jump. Give page 0 nextOffset:n, then return a page whose offset is not n (or request a manually jumped offset). | Loader rejects the document as a protocol error; it never fills the gap or silently treats the jump as a new document. |
| A1-N03 | Continuation overlap/backtrack. Return a page with an offset below the accepted cursor, or repeat a continuation page with a different body. | Loader rejects; an exact same-request replay may be discarded only when its full identity/body is byte-for-byte equal. |
| A1-N04 | Identity/hash swap. Keep the requested path but alter candidateDigest, bundleDigest, fileDigest, or page text while leaving other fields plausible. | Loader recomputes SHA-256 over complete UTF-8 text and refuses the file; it never renders a hash-mismatched body. |
| A1-N05 | UTF-16 trap. For 😀A, page with offset:0,limit:1 must return 😀 and nextOffset:1; offset 1 must return A. | A code-point cursor is accepted. A client that advances by JS text.length (2 for 😀) fails this oracle. |
| A1-N06 | BOM mapping. Use the seeded leading U+FEFF and inspect the first heading/AST range. | Raw hash/byteLength and source text retain BOM; display does not show an accidental replacement character; any source-range mapper accounts for the one parser-input code point and never slices original text with an unadjusted mdast offset. |
| A1-N07 | CRLF/combining preservation. Replace bytes with LF or NFC-normalized text while leaving a claimed original digest. | Independent digest differs and loader refuses swapped text. Valid rendering keeps CRLF and e\u0301 in canonical source. |
| A1-N08 | Duplicate blocks. Select/mark the first and second identical “Same clause.” blocks in the seeded file. | They remain two occurrences with different canonical code-point ranges; a content hash or normalized text key must not move the first mark to the second. |
| A1-N09 | Cross-Matter scope. Query a valid candidate/artifact ID from another Matter through this Session, or supply both IDs/neither ID. | Server returns 409 BINDING_MISMATCH for cross-Matter ownership and 409 INVALID for wrong ID cardinality; no fallback to a same-named workspace file. |
| A1-N10 | Path mismatch/traversal. Request a non-member path, case-folded path, or ../memo.md. | Query fails (NOT_FOUND or INVALID/binding error according to route); no body is rendered and no path is resolved against current workspace. |
| A1-N11 | Unknown schema. Apply the isolated future-schema mutation used by existing fixture and ask for manifest and content. | Manifest returns only status:"unsupported" metadata with no text; content returns 409 CONTRACT_UNSUPPORTED; no acceptance or Markdown render is offered. |
| A1-N12 | Producer absent. Delete producing Session and unload evidence-memo, then query retained Artifact from a same-project continuation Session. | Surface is read-only/no actions, while exact Artifact page still returns 200 with original identity/text. |
| A1-N13 | Missing/corrupt history. Delete or corrupt immutable history object while a current workspace file still exists. | Query/import fails 409 INTEGRITY_REFUSAL; reader does not fall back to mutable workspace bytes. Existing coverage is [execution-file-continuity.test.mjs](../../app/tests/execution-file-continuity.test.mjs) lines 157–178. |
| A1-N14 | Late response after tab/session change. Hold a page response, switch document reference or generation, then release old response. | Old response is aborted or ignored and cannot overwrite new tab. Reuse generation/AbortController pattern in [app/web/inspector.mjs](../../app/web/inspector.mjs) lines 325–352 and 441–448. |
| A1-N15 | Range/end boundaries. Request offset === codePointLength, offset > codePointLength, limit 0/4001, and manifest limit 0/17. | Exact end yields empty terminal page with nextOffset:null; out-of-range/limit violations fail INVALID; no successful truncated document is rendered. |
| A1-N16 | Surface/page identity mix. Start Candidate load, then accept and request Artifact page using old Candidate cursor or changed path. | Loader clears old transaction and requires fresh identity tuple; it never combines Candidate and Artifact pages into one rendered source. |

## Acceptance slice for the implementation owner

A1 is ready for a non-author review when the owner can show, with the .md HTTP seed:

1. Candidate manifest and paged content render through existing sanitizer with exact full-file hash/byte length.
2. Artifact pages remain exact after workspace mutation, producer Session deletion, and extension unload.
3. All sixteen negative oracles above pass, including malformed-wire cases (replay/jump/hash swap/late response), coordinate cases (UTF-16/BOM/CRLF/combining), duplicate occurrence, scope, unknown schema, and integrity refusal.
4. Loader has no Core write, no parallel file authority, no automatic candidate revision/rebase, and no action/acceptance decision based on a visible page.
5. Evidence records the current baseline and its limit: node --test app/tests/execution-file-candidates.test.mjs app/tests/execution-file-continuity.test.mjs produced 12 Core test passes; the continuity module could not load because @earendil-works/pi-ai is absent in this isolated checkout. Do not install or claim continuity path passed from that run. Existing parser evidence is the recorded 10/10 isolated probe at evidence/markdown-review-20260910/parser-spike/results.json; it is parser behavior evidence, not product acceptance.

