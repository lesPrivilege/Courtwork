# Markdown Review Surface: seam review and bounded slice

This is a read-only seam review for the Markdown Review Surface proposal. It does
not add a product dependency, persistence table, renderer route, or UI state. The
working tree was `codex/markdown-review-architecture` at `1f437a98`; the source
checkout was inspected before writing this note. The isolated parser experiment
is evidence only: `node probe.mjs` in
[`evidence/markdown-review-20260910/parser-spike`](../../../evidence/markdown-review-20260910/parser-spike)
passes `10/10` with `remark-parse 11.0.0`, `remark-gfm 4.0.1`, and `unified
11.0.5`.

## What can be reused now

The current product already has separate helpers for rendering, projection,
immutable history, and formal work state. A Markdown Review Surface should join
them through read-only adapters rather than make the renderer a second state
owner.

| Seam | Existing fact | Safe reuse boundary |
|---|---|---|
| Chat Markdown | [`app/web/ui-controls.mjs:150-218`](../../../app/web/ui-controls.mjs) exports `markdown(text, {key})`. It parses GFM with `marked`, sanitizes through `DOMPurify` with an explicit tag/attribute allowlist, keeps only `http(s)` links, adds copy controls to code blocks, and wraps tables for keyboard scrolling. | Keep this as the Chat display primitive. A document reader may share its tag policy and code/table controls, but it needs a source-map-aware derived tree; `markdown()` itself has no source identity or annotation contract. |
| Chat event projection | [`app/web/thread-projection.mjs:1-130`](../../../app/web/thread-projection.mjs) normalizes user/assistant/tool/question/permission/artifact/run events. Assistant rows are grouped by `runId` and stream segment; [`app/web/app.mjs:2475-2594`](../../../app/web/app.mjs) renders the projected rows and calls `markdown()` for assistant text at `2331-2335`. | Treat message text as a transient projection. A stream update may re-render the message DOM; annotations must bind to a revision/source identity, never to a transient DOM node or row index. |
| Recorded file reader | [`app/web/inspector.mjs:309-440`](../../../app/web/inspector.mjs) validates `{path,kind,runId,sha256}`, reads current or recorded bytes, uses Markdown only for `.md` files below 200,000 JS characters, and labels current-versus-recorded hash differences. The reading note explicitly says that acceptance is not recorded there. | This is the existing read-only preview seam. Preserve its distinction between current workspace text and recorded bytes; do not use the inspector as the source of Decision state. |
| Runtime file history | [`app/runtime/artifact-history.mjs:6-175`](../../../app/runtime/artifact-history.mjs) stores exact `Buffer` bytes in a per-session Git bare repository addressed by a content SHA-256 ref. Reads verify ref, object type, recorded byte count, returned byte count, and digest; saves are serialized per session. | Reuse only as recorded runtime-byte storage. It is explicitly not a second artifact database and it has no Candidate/Decision semantics. Resolve permission through the existing run artifact record and service route. |
| Core work projection | [`app/core/owner.mjs:22-106`](../../../app/core/owner.mjs) provides `candidateBasis`, `workProjection`, and `compileWorkContext`. The projection carries candidate, artifact, source, decision, action, and read-only facts; context carries artifact identity/digest/length and points to paged `se_read_artifact`. | A reader receives a Work projection and uses the supplied artifact/source identity. It must not infer authority from a rendered block, a completion badge, or a visible control. |
| Domain review packet | [`app/web/surface-modules.mjs:636-751`](../../../app/web/surface-modules.mjs) decodes known review payloads, leaves unknown domain schemas as text-only envelope content, and treats advertised `humanActions` descriptors as the only executable action source. [`surface-modules.mjs:774-847`](../../../app/web/surface-modules.mjs) shows source refs and asks the host to read historical bytes. | Use the same packet normalization and host `onReadSource`/dispatch callbacks. Do not add a generic finding table or make field names imply a domain contract. |
| Renderer host | [`app/web/app.mjs:4256-4438`](../../../app/web/app.mjs) exposes a closed `source`/`request` query table, session/epoch guards, receipt re-reads, and refresh-after-refusal. [`app/web/app.mjs:4574-4669`](../../../app/web/app.mjs) mounts only an admitted local extension module and falls back to read-only content on absence/failure. | A contributed Markdown reviewer gets typed, bounded read/query/dispatch callbacks. It must not fetch arbitrary URLs, choose a host route, write local storage, or claim a committed result. |

The existing implementation therefore supports two readers with different
lifecycle assumptions: Chat text is an event projection, while an artifact or
source is a revisioned byte set. Shared typography and sanitization are useful;
shared lifecycle state is not.

## Artifact, Candidate, and Decision facts

The formal Work contract already supplies the history and acceptance invariants:

* `ArtifactHistory.read(sessionId, digest, bytes)` and `.save(...)` use exact
  UTF-8 bytes and return explicit `history_unavailable` or
  `artifact_integrity_failed` errors. The storage tests cover two versions that
  remain readable after current-file deletion, cross-session denial, GC, and
  metadata byte mismatches ([`app/tests/artifact-history.test.mjs:81-129`](../../../app/tests/artifact-history.test.mjs),
  [`app/tests/artifact-history-storage.test.mjs:13-28`](../../../app/tests/artifact-history-storage.test.mjs)).
* Core candidate evidence is `{source_id, source_version, start, end, quote,
  digest}` ([`app/core/core.py:98-165`](../../../app/core/core.py)). A Candidate
  payload is immutable after save; a duplicate ID with changed canonical payload
  is an `IDEMPOTENCY_CONFLICT` ([`app/core/core.py:442-486`](../../../app/core/core.py)).
* `revise_candidate` creates a new candidate with `supersedes` and human-revision
  provenance while leaving the parent and its decisions intact
  ([`app/core/bridge.py:877-893`](../../../app/core/bridge.py)). The file-memo
  contract is deliberately different: generic revision is refused and a new
  recorded Run is required ([`app/core/bridge.py:877-880`](../../../app/core/bridge.py)).
* `historical_source` resolves the source membership at the parent Candidate's
  frozen source revision ([`app/core/bridge.py:898-903`](../../../app/core/bridge.py)).
  A reviewer must therefore read an old quote through that identity, never by
  asking for the Matter's current source and hoping it is equivalent.
* `decide` requires a trusted capability, checks Matter/Candidate binding, status,
  base/source/contract CAS, evidence digest and quote, then writes Artifact,
  Decision, audit, state version, and idempotency receipt in one transaction
  ([`app/core/core.py:635-655`](../../../app/core/core.py),
  [`app/core/core.py:778-867`](../../../app/core/core.py)). A visible `Accept`
  label cannot substitute for these checks.
* The frontend already keeps the same boundary: `candidateActions()` accepts
  only known schema-version-1 action descriptors whose `candidate_id.const`
  matches the candidate ([`app/web/surface-modules.mjs:717-751`](../../../app/web/surface-modules.mjs));
  the NDA renderer retains a request identity for an unacknowledged retry and
  does not announce success before the host receipt
  ([`app/extensions/inbound-nda/renderer.mjs:35-45`](../../../app/extensions/inbound-nda/renderer.mjs),
  `140-184`).

These facts imply a useful identity split for any reader adapter:

```text
ArtifactRef = { artifactId, candidateId, contentDigest, lengthCodePoints,
                acceptedVersion? }
SourceRef   = { candidateId, sourceId, sourceVersion, digest }
FileRef     = { sessionId, path, kind, sha256, runId? }
```

The names above describe the existing shapes, not a proposed database schema.
An adapter should preserve the original ref and kind instead of collapsing all
three into a path or a generic `documentId`.

## CC-W is the existing document-shell seam

CC-W deliberately has one active document instance. `state.surface.fileRef` is
the presence bit; there is no document array, map, or position table
([`app/web/app.mjs:3435-3454`](../../../app/web/app.mjs)). The display key is
`sessionId + path + kind + sha256 + runId`; a new reader must retain those fields
and must not introduce a second tab ledger.

The close path clears the ref, returns to the compact rail, and restores focus by
the opener's stable `data-focus-key` ([`app/web/app.mjs:3472-3492`](../../../app/web/app.mjs)).
The layout has three distinct modes: three-pane at `>=1680`, an in-main-area
view switch at `1024-1679`, and a modal sheet below `1024`
([`app/web/app.mjs:3595-3659`](../../../app/web/app.mjs)). In the middle mode,
the chat DOM stays mounted for scroll/draft retention but is both `hidden` and
`inert` in the accessibility tree ([`app/web/app.mjs:3646-3653`](../../../app/web/app.mjs));
there is no scrim for this view switch. Activity is a status word plus a
shape, including `Unknown`, rather than a color-only signal
([`app/web/app.mjs:3494-3521`](../../../app/web/app.mjs)).

The host surface callbacks are read/open/refresh/load operations
([`app/web/app.mjs:3824-3847`](../../../app/web/app.mjs)). The surface slot is a
closed table with a read-only-row fallback, and a declaration alone does not
mount a renderer ([`app/web/surface-modules.mjs:488-515`](../../../app/web/surface-modules.mjs)).
Late reads/actions are rejected by epoch and identity guards; a refused action
reloads authoritative state and preserves the renderer's draft
([`app/web/app.mjs:4370-4438`](../../../app/web/app.mjs)). These are the right
places for a Markdown reader to mount, but they do not authorize a new document
state model.

## Coordinate traps: bytes, parser offsets, and visible selection

The canonical content identity is the original UTF-8 byte digest. Core documents
this explicitly and verifies source quotes by Python string slicing
([`docs/work-core/contract.md:48-58`](../../../docs/work-core/contract.md),
[`app/core/core.py:98-113`](../../../app/core/core.py),
[`app/core/core.py:635-655`](../../../app/core/core.py)). Core artifact pages use
Unicode code-point offsets (`lengthCodePoints`, `offset`, `end`), not UTF-8 byte
offsets and not JavaScript string indexes ([`app/core/bridge.py:773-798`](../../../app/core/bridge.py)).

The parser spike gives reproducible counterexamples:

| Probe | Observation | Consequence |
|---|---|---|
| `P01-utf16-is-not-codepoints` | For `😀 **中文**`, the parser range begins at JS offset `5`; the prefix is `4` code points and `7` UTF-8 bytes. | Never send `node.position.*` or `String.length` directly to Core. |
| `P02-bom-naive-source-slice-is-wrong` | A leading BOM makes a naive slice return a space plus a lone surrogate; parsing BOM-stripped input and explicitly adding the BOM displacement recovers `测试😀`. | Keep the original bytes/digest and an explicit parser-input displacement map. |
| `P03-crlf-source-is-not-normalized` | The raw paragraph contains `\r\n`; hashing CRLF and LF-normalized text gives different digests. | Preserve newline bytes. Do not normalize before digest or source ranges. |
| `P04-entity-node-range-is-not-character-map` | `A &amp; B` has node value `A & B` while its source range covers the raw entity spelling. | A rendered text selection cannot be used as a raw-source slice without a mapping. |
| `P05-code-delimiters-are-not-display-text` | A fenced code node's value is `const x = 1;`, while its source range includes the fence and language marker. | Code display coordinates and Markdown source coordinates are different spaces. |
| `P06-later-definition-changes-earlier-semantics` | The same prefix parses as plain text before a reference definition and as `linkReference` after the later definition is added. | Streaming/partial parses must be treated as provisional until the revision settles. |
| `P07-content-hash-does-not-identify-duplicate-block` | Two equal `Same clause.` blocks have the same content digest but offsets `0` and `14`. | Content hash alone cannot identify an annotation target; include occurrence/range and revision. |
| `P08-no-unicode-normalization-of-canonical-bytes` | `e\u0301` and NFC `é` have different digests and code-point lengths. | Do not normalize persisted source as a convenience. |
| `P09-gfm-table-has-syntax-outside-cell-text` | A table cell value omits the delimiter row while the table source range includes it. | Table-cell visible text is not a direct source range for the whole table. |
| `P10-ast-is-not-sanitization` | `<script>` parses as an HTML node. | AST parsing and executable-output policy remain separate; sanitize at render. |

The NDA adapter demonstrates the necessary conversion at an existing trust
boundary: it finds text with JS UTF-16 `indexOf`, converts both ends to code
point indexes, then verifies the quote and digest using code-point slicing
([`app/domains/inbound-nda/index.mjs:108-135`](../../../app/domains/inbound-nda/index.mjs),
`165-187`). The Core tests use `Array.from(text).length` for an emoji-bearing
anchor ([`app/tests/work-core.test.mjs:9-24`](../../../app/tests/work-core.test.mjs)).
Attention source pages use the same Python code-point convention and verify the
complete retained bytes before slicing ([`docs/work-core/attention.md:69-80`](../../../docs/work-core/attention.md),
[`app/core/attention.py:373-380`](../../../app/core/attention.py)).

Visible coordinates are a third space. DOM `Range` offsets count text nodes in
the sanitized/rendered tree; CSS layout supplies pixels; neither represents the
canonical Markdown source. Entity decoding, fence removal, whitespace layout,
line wrapping, tables, and annotations can all change the visible tree without
changing source bytes. A persistent anchor must therefore carry the canonical
revision identity and source range. A visible DOM range may be an ephemeral
selection used to propose an anchor, but it must be converted before persistence.

## Suggested derived contracts (no persistence decision implied)

The smallest reusable pure boundary can be expressed as four functions. These
are implementation guidance for the owning frontend/domain agent, not a request
to add these names verbatim:

```text
parseMarkdownRevision({ text, digest, parserVersion })
  -> { blocks, sourceMap, parserInputDisplacement, warnings }

renderMarkdownRevision({ parsed, mode: "chat" | "document", key })
  -> DOM subtree with sanitized semantic HTML and block identity hooks

resolveReviewAnchor({ revision, anchor })
  -> { state: "exact" | "candidate" | "ambiguous" | "orphan" | "unavailable",
       range?, candidates?, reason? }

readRevision(ref, host)
  -> immutable text + digest/length identity, or an explicit unavailable/
     integrity/binding error
```

The derived parser result should include, at minimum, block type, source start
and end, raw source spelling, and an occurrence-qualified `blockId`. A practical
block ID can be derived from revision digest + source range + node kind + sibling
occurrence; it is a view key, not a Core authority. Keep the parser's native
UTF-16 positions private to the source map and expose canonical code-point ranges
to the review layer only after an explicit conversion map handles BOM, surrogate
pairs, CRLF, and entity/fence boundaries.

For exploration only, the reader can use an additive view DTO shaped like this
while the formal contract is being designed:

```text
ReviewAnchor {
  revision: ArtifactRef | SourceRef
  blockId?
  range: { start, end, unit: "codepoint" }
  exact
  prefix?
  suffix?
  locator: "exact" | "candidate" | "ambiguous" | "orphan" | "unavailable"
}
```

This view DTO is **not an adopted sidecar persistence design**. Astra's
architecture sets the formal writable annotation state in Core, in the same
owner/transaction boundary as the file Candidate/Artifact. The existing Core
evidence shape remains formal acceptance evidence. The eventual Core annotation
record may carry block/quote context, but it must not rewrite a Candidate,
promote a fuzzy match to evidence, or silently move an annotation after a
revision. For the first slice, `exact` requires digest, source identity, and
canonical quote/range to agree. A later revision is `candidate`, `ambiguous`,
`orphan`, or `unavailable` until the formal action confirms a new binding. A
content hash without a revision/range is insufficient, and a DOM selector/line
number is not a durable anchor. The `resolveReviewAnchor` name and enum above
are exploratory reader terminology, not a new public API.

## Minimal vertical slice that fits current owners

1. **Read one immutable revision.** Start from an existing recorded Artifact or
   historical Source ref. Use the existing `se_read_artifact` page contract or
   `work-query?kind=source`; keep the response's digest, version, and code-point
   length. Do not dereference a path or fetch a URL from Markdown text.
2. **Parse as a derived view.** Run the isolated parser behind a frontend-owned
   adapter, preserving exact source text and digest. Build block/source maps and
   explicit unit conversion. Keep the current `markdown()` path unchanged for
   Chat until this reader has its own tests.
3. **Mount in the existing CC-W document tab.** Use the existing `fileRef` key,
   tab close/focus behavior, responsive hidden/inert rules, and renderer fallback.
   The first document view is read-only: show revision identity, findings and
   source quotes; do not add a second tab array or local review database.
4. **Display existing review facts.** Consume `workPacket()`/`candidate.review`
   for known domain findings and the host's historical source query. Unknown
   domain versions remain an envelope/text view. Render Attention only as a
   separately fetched, policy-filtered summary after the ATT-FE owner schedules
   it; do not make every highlight an Attention object.
5. **Expose actions only from descriptors.** If a `decide` or
   `revise_candidate` descriptor is advertised, dispatch through the existing
   typed host callback and refresh after a refusal. A reader with no descriptor
   remains read-only. Do not make a comment/selection button imply a Core
   Decision.
6. **Defer the expensive surface.** Streaming block settling, semantic prose
   diff, fuzzy rebase, cross-document discussion, and Office/PDF/DOCX export
   should remain later slices. They require separate acceptance fixtures and
   should not be smuggled into the first renderer contract.

Ownership remains narrow: the frontend single writer owns the reader/tab
presentation; Core/Astra owns Candidate, Artifact, source membership and
Decision semantics; the NDA adapter owns NDA rule verification; Attention/Core
owns Attention lifecycle and disclosure; the host owns renderer loading,
queries, action dispatch, and epoch/generation guards. No layer gains authority
because it can display a control.

## Acceptance counterexamples

These are concrete negative cases the first implementation must preserve. They
are also useful as independent fixture names for a later bounded PR.

| Case | Required result |
|---|---|
| A source begins with `😀`, and the frontend sends a parser offset directly to Core. | Reject or convert explicitly; never resolve a quote at a UTF-16/byte offset as if it were a code-point offset. |
| `A &amp; B`, a fenced code block, a GFM table, or a soft-wrapped paragraph is selected in the rendered tree. | The reader shows a source-aware anchor or reports unavailable mapping; it never slices raw bytes from `textContent` blindly. |
| A leading BOM, CRLF, or combining sequence is present. | Digest and original bytes remain unchanged; parser displacement/newline/normalization differences are visible to the mapper. |
| Two identical clauses occur in one revision. | The anchor distinguishes occurrence/range/block; content hash alone cannot select the second clause. |
| A later reference definition changes an earlier stream prefix. | A provisional stream block is re-parsed or marked provisional; no settled annotation is silently retained against the changed AST. |
| A source is replaced after a Candidate was saved. | The old candidate reads its historical source membership; the current source is not substituted and old acceptance is not rewritten. |
| A pending Candidate has stale base/source/contract facts, or an accepted Candidate is revised. | `workProjection()` advertises `decide` only for a pending Candidate whose `candidateBasis.current` is true. A supported non-file parent may still receive its separately advertised `revise_candidate` descriptor at the current Matter version; file-profile Candidates do not receive generic revision and require a new recorded Run. Each descriptor is independently checked by the server, and any accepted revision creates a new Candidate with `supersedes` while old Decision/Artifact history remains intact. |
| The same decision request loses its acknowledgement. | Retry the same request identity/content and display only the returned receipt; changed content conflicts and is not auto-replayed. |
| A renderer is absent, unloaded, or declares an unknown domain schema. | Keep the read-only fallback/envelope. A slot declaration or hidden button does not create an executable surface. |
| A work query returns after the user changes session or closes the tab. | Epoch/identity guards discard the response; the next session/tab cannot receive stale source bytes. |
| CC-W is in the 1024–1679 view-switch mode. | Chat remains mounted for retention but is `hidden` and `inert`; no scrim or hidden focus target is left active. |
| Attention action is repeated with the same request ID, then repeated with changed content or a stale revision. | Identical content returns the original receipt without another event; changed content conflicts; stale revision creates no partial event. |
| A Markdown AST contains raw HTML or a model-produced URL. | The separate render policy sanitizes it; AST presence never grants executable HTML, navigation authority, or an external fetch. |

The current test/evidence commands that substantiate the existing seams are:

```text
node evidence/markdown-review-20260910/parser-spike/probe.mjs
node --test app/tests/work-core.test.mjs app/tests/work-artifact-read.test.mjs
node --test app/tests/work-surface-tabs.test.mjs
node --test app/tests/artifact-history.test.mjs app/tests/artifact-history-storage.test.mjs
```

The first command is the only new parser evidence in this note. The other
commands are existing project tests; a future renderer PR should run them plus
its own independent Markdown torture fixture and report author/independent
reviewer attribution separately.

## Bounded cross-review of Astra's architecture and work orders

I independently read [`architecture.md`](architecture.md) and
[`work-orders.md`](work-orders.md) after the seam review. Their first writable
annotation boundary is compatible with the current ownership model **provided
the A2 DTO and migration are still frozen by Astra before any consumer is
implemented**:

* The target is restricted to a Core `se-file-memo-v1` file Candidate/Artifact;
  recorded-file preview remains read-only. This matches the existing file
  bundle tables, where complete UTF-8 BLOBs, manifest/bundle digest, basis, and
  verification are committed in Core rather than inferred from a mutable
  workspace or an HTTP preview ([`docs/work-core/contract.md:75-95`](../../../docs/work-core/contract.md),
  [`app/core/file_candidates.py:15-28`](../../../app/core/file_candidates.py)).
* A2 keeping the review domain in the same Core SQLite transaction owner is the
  right boundary for actor/scope, CAS, idempotency, receipts, and migration.
  The transaction must read/recheck Core file membership and digest inside the
  write path; it cannot make a cross-store atomicity claim over the per-session
  `ArtifactHistory` Git repository. Parsing and diff may happen before the
  transaction, as the architecture says, but the commit must revalidate the
  identity and expected review revision.
* `review_revision`/annotation revision and `Matter.version`/formal output
  version are correctly separate. `create`, `reply`, `resolve`, `reopen`, and
  `confirm_reanchor` may append review rows/events and advance only the review
  CAS. They must not update `matter.version`, `active_artifact`, Candidate
  status, obligations, Decision, or Artifact content. A `resolve` is therefore
  not a formal `decide`, and a resolved annotation may later have locator state
  `orphan` on a new document revision.
* The raw/source range and displayed/projection range are correctly treated as
  separate coordinate spaces. The server should accept only the canonical raw
  half-open code-point range and exact quote/digest for the fixed revision;
  `block_id`, parser offsets, CSS pixels, DOM `Range`, and visible text are
  lookup/context data, never authority. The parser/profile and projection
  versions need to remain alongside the derived map so a renderer replacement
  cannot reinterpret an old raw anchor silently.
* The two status dimensions are sound: disposition (`open|resolved`) and
  locator (`exact|candidate|ambiguous|orphan|unavailable`) must remain separate
  from Core Candidate status, NDA finding status, and Attention status. A
  locator candidate requires explicit confirmation; duplicate matches remain
  ambiguous, and unavailable history is not evidence of deletion.

Two contract seams need to be made explicit before A2 is consumed by a writer:

1. **A2/A3 `confirm_reanchor` sequencing.** `work-orders.md` lists
   `confirm_reanchor` in A2's transaction acceptance while A3 owns revision
   matching and candidate generation. A2 must either accept a fully specified,
   server-checkable candidate produced by a prior bounded read, or defer the
   action until A3 supplies that candidate packet. It must not perform fuzzy
   search, choose the first quote match, or upgrade a model/heading suggestion
   inside the write transaction. The confirmed action should append a new
   binding and retain the original anchor; it must not rewrite the old one.
2. **File action versioning.** Existing file-profile `decide` descriptors are
   action schema version 2 and require `fileCapabilityVersion:1`; generic
   `revise_candidate` is forbidden for file candidates
   ([`docs/work-core/contract.md:89-95`](../../../docs/work-core/contract.md)).
   Review commands must have their own explicit action/schema version and
   capability fields, or be exposed by a new review service contract. They
   cannot be smuggled into the old `decide` payload, inherited from the NDA
   renderer, or made executable merely because a button is visible. Unknown
   review action versions must remain non-executable, as with existing Work
   actions.

### A2 versus existing Core versions

There is a concrete collision risk if “review revision” is implemented by
reusing any existing Work version field:

* `matter.version` is the formal Work/Candidate CAS version. Candidate
  `base_version` is compared to it in `Store._check_cas()` and it advances as
  part of a `decide` transaction ([`app/core/core.py:604-612`](../../../app/core/core.py),
  [`app/core/core.py:778-867`](../../../app/core/core.py)). A comment, reply,
  resolve, reopen, or re-anchor confirmation must never increment it, update a
  Candidate's base, or make an existing Candidate stale as a side effect.
* `stateVersion` in the current Work projection is the Core snapshot digest,
  while `compileWorkContext.provenance.stateVersion` carries Matter version
  metadata ([`app/core/owner.mjs:70-106`](../../../app/core/owner.mjs)). Neither
  is a substitute for an annotation CAS. A2 should expose an explicit review
  revision from its own review row/aggregate and use that in review action
  `expected_revision`. If review rows are later included in a broader snapshot
  digest, the contract must still keep the explicit review revision because a
  digest change alone does not identify which review command is stale.
* Existing Core `request_result`/`query_request` is shaped around formal
  Matter decisions. Review receipts need a separate typed namespace/table (or
  an explicitly versioned composite key) so a review `request_id` cannot collide
  with a `decide` request or be misread as a Matter decision receipt. Same Core
  owner and SQLite transaction does not require the two request domains to
  share a row shape.
* `Attention` already has its own `(project_id, attention_id)` and revision /
  event / receipt domain ([`docs/work-core/attention.md:13-23`](../../../docs/work-core/attention.md),
  `37-53`). A review revision must remain independent of both Attention
  revision and Matter version; displaying or resolving an annotation cannot
  update Attention status.

The safe A2 invariant is therefore: **one Core transaction, three explicit
version domains**—Matter/Candidate output version, review aggregate revision,
and (where displayed) Attention revision. The transaction may atomically commit
the review event and receipt with its own CAS, but it must leave the formal Work
version and Decision rows untouched unless a separate, explicit `decide` action
is dispatched.

The following negative cases should be in the A2/A3 handoff and are sufficient
to catch the seam errors without broadening the product slice:

| Counterexample | Required boundary result |
|---|---|
| A comment names a valid path/hash from another Matter or project. | Core returns binding/unavailable refusal; matching bytes alone do not grant scope. |
| A block comment is submitted with a DOM/UTF-16 offset, or with a quote that differs after `&amp;`, BOM, CRLF, or combining-character handling. | Reject as coordinate/integrity invalid; no review event is written. |
| Two identical blocks yield two possible re-anchor locations. | Locator stays `ambiguous`; `confirm_reanchor` cannot choose one without an explicit candidate identity. |
| A unique match is found after a new revision. | Locator is `candidate`, not `exact`; explicit confirmation appends a new binding and preserves the historical anchor. |
| `resolve` is sent for an annotation on Matter version 7. | Only review state/revision changes; Matter version, Candidate, Artifact, Decision, and obligations are byte-for-byte unchanged. |
| A concurrent reply changes the review revision, or the same request ID is retried with another target/revision. | CAS/idempotency refusal with no partial event; the original request receipt remains queryable. |
| A renderer is unloaded/replaced after an annotation was saved. | Core history remains readable through the fallback; renderer lifecycle cannot delete or reinterpret the annotation. |
| A client presents an old file action descriptor for a review command. | Capability/schema mismatch is refused; no old `decide` or generic revision path is reused. |

These points are cross-review findings only. No change was made to
`architecture.md` or `work-orders.md`, and the parser `10/10` result remains an
isolated behavior probe rather than product acceptance.
