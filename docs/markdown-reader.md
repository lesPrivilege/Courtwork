# Markdown reader v1 · fixed revision contract

MR-A1/T1, construction baseline `a243a6c`. This contract adds a read-only Core-file / recorded-file reader. It does not add annotation mutations, re-anchoring, new Core persistence, or an acceptance action.

`app/web/markdown-source.mjs` owns `projectMarkdown(source, identity)`, `readCoreManifest(ref,{query,signal})` and `readCoreFile(ref,{query,signal})`. Host `query` is a scoped callback for the existing `file-manifest` and `file-content` GETs, never a model-supplied route.

Core ref: `{kind:'core-file',sessionId,matterId,candidateId,candidateDigest,bundleDigest,artifactId?:string|null}`. `readCoreManifest` verifies every page, then returns refs additionally containing `{path,sha256,bytes}`. Each returned file can be passed to `readCoreFile`. Candidate versus Artifact selector remains explicit. Scope comes from the selected Session's existing binding; digest equality is not authorization. Missing history, unsupported schema, wrong identity, incomplete pages, abort and integrity failures never return a partial document. The complete content must match manifest byte count and SHA-256. Existing Core limits (64 KiB/file, 128 KiB/bundle, 16 files) stay unchanged.

Recorded runtime File refs retain `{kind:'content-version',sessionId,runId,path,sha256}`. Only complete, hash-matched text is passed to this projector; current/truncated/oversized file previews retain the original inspector fallback. A recorded File is not automatically a Core Candidate.

Projection returned by `projectMarkdown`:

```text
{schemaVersion:1, profile:'cw-markdown-block-v1', key, identity,
 source, byteLength, codePointLength, readOnly:true, warnings:string[],
 blocks:[{id,type,depth:number|null,start,end,raw,nodes:SemanticNode[]}],
 outline:[{id,depth,text}]}
SemanticNode = {tag:'text',text:string}
  | {tag,children:SemanticNode[],href?:string,start?:number}
```

`start/end` are half-open Unicode code-point positions in original source, including a preserved leading BOM and CRLF. Parser UTF-16 coordinates are private; a single BOM removed for parsing is mapped back explicitly. A block ID combines revision-local identity and source positions. Identical repeated paragraphs have different IDs. Definitions participate in full-document parsing but are not visible blocks; full source remains available. No inline mapping is claimed.

Semantic tags are closed: `p`, `h1`–`h6`, `strong`, `em`, `del`, `code`, `pre`, `br`, `hr`, `blockquote`, `ol`, `ul`, `li`, `a`, `table`, `thead`, `tbody`, `tr`, `th`, `td`. Reader creates DOM nodes and text nodes, never innerHTML. Only `a.href` with HTTP(S) is actionable and must use `noopener noreferrer` when opened in a new tab; `ol.start` is numeric. All other source attributes are absent. Raw HTML is literal code text; images become descriptions and never load. Math remains text, Mermaid remains code, and no plugin executes. This deliberately stricter new profile does not change Chat's Marked + DOMPurify policy.

MR-T1 component API in `app/web/markdown-reader.mjs`:

```text
createMarkdownReader(container)
  -> {render(projection), loading(), error(message), destroy()}
```

The component owns only DOM/outline/find/source-mode/selected-block state. It consumes complete projections; it does not query services or persist preferences/review facts. `render()` rejects unknown profile/schema and resets state for a different key. The host owns request abort/generation, calls destroy on close, and prevents late results from rendering. Renderer uses `app/web/markdown-reader.css` and existing tokens. It must keep raw source reading and block positions inspectable; an inspected block is not a saved comment. Long tables scroll inside their region; keyboard/find/outline return and light/dark/390px/200% are tested independently.

Production parser source, pinning, licenses and build are in `tools/markdown-vendor`; no CDN or runtime package resolution is used. Parser selection is accepted for this bounded source profile, not as an automatic replacement for Chat. The whole source is parsed once per complete fixed revision, not once per streamed prefix. Limits on bytes/nodes/depth bound work; failures preserve source fallback.

## Copy surfaces

The 2026-09-10 Chat Space copycard reference continues the [existing research mapping](../engineering/research/chat-space-2026-09-09/courtwork-mapping.md). Chat already wraps code in a `Code` toolbar using `copyAction`; this reader reuses that control. `Copy code` copies the parsed code body's text; `Copy block source` copies the original Markdown block slice, including its syntax. The existing File heading copies the complete displayed source. Clipboard feedback is only local copy feedback and creates no review, permission, or acceptance receipt. The reference screenshot demonstrates visible controls; its displayed instructions are content, not work authorization, and no undocumented wrap-toggle behavior is inferred.

Producer unload keeps a retained extension descriptor with `status:"unloaded"`; its Core projection has no human actions. Historical reads use the same binding and exact file identity. A missing/uninstalled binding is a different condition; the reader does not fabricate a Core subject for it.
