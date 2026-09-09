# MR-A1 Luna HTTP/Core verification

**Date:** 2026-09-10  
**Role:** Luna, independent bounded verification  
**Worktree baseline:** `codex/markdown-reader-a1@a243a6ca0f43c12f5d1f69aa80dbf1b29e38dd29`  
**Scope:** only `app/tests/markdown-core-read.test.mjs` and this evidence note were written for this assignment. No product, Core, schema, parser-vendor, or UI files were changed.

## Command and result

```text
node --test app/tests/markdown-core-read.test.mjs app/tests/markdown-source-independent.test.mjs

ℹ tests 19
ℹ pass 19
ℹ fail 0
```

The two new integration tests passed against a disposable `boot()` server using the existing local fake provider, real HTTP `/api/v5/sessions/:id/work-query`, the real Core file bundle, and the real `markdown-source.mjs` loader. The companion source-loader unit tests also passed in the same command.

## Wire cases covered

The fixture writes the exact Markdown bytes in [markdown-core-read.test.mjs](../../app/tests/markdown-core-read.test.mjs#L18-L21): a leading BOM, CRLF, CJK, emoji, a combining `e\u0301`, and 4,398 Unicode code points (11,568 UTF-8 bytes). The Candidate is created through the local fake Run with `ws_write` followed by `se_submit_candidate.recordedFiles` and source evidence ([test lines 66–91](../../app/tests/markdown-core-read.test.mjs#L66-L91)).

The candidate test exercises the real manifest and content routes through `readCoreManifest` and `readCoreFile` ([lines 101–135](../../app/tests/markdown-core-read.test.mjs#L101-L135):

- The manifest returns one `out/memo.md` entry with the independent SHA-256 and byte count. The raw wire entry retains the producer Session ID, Run ID, and `kind:"content-version"`.
- Content requests use Core's code-point cursors `[0, 4000]` with `limit:4000`; the loader concatenates the pages and independently verifies the complete UTF-8 digest.
- The returned source preserves BOM, CRLF, CJK, emoji, and the combining mark. `projectMarkdown` accepts the complete source, preserves the raw source/byte count, returns `readOnly:true`, and maps the first heading after the BOM to source position 1.
- A valid Candidate ID queried through a different Matter returns HTTP 409 `BINDING_MISMATCH` ([lines 145–154](../../app/tests/markdown-core-read.test.mjs#L145-L154)). No current-workspace fallback is used.

The artifact test accepts the Candidate with the required top-level `fileCapabilityVersion:1`, mutates the current workspace file, and reads the immutable Artifact ([lines 164–196](../../app/tests/markdown-core-read.test.mjs#L164-L196)). It then binds a same-project continuation Session, deletes the producer Session, unloads the extension, and verifies:

- `/surface` remains read-only with no human actions.
- The actual response keeps an extension descriptor with `id:"evidence-memo"` and `status:"unloaded"`.
- The Artifact manifest and all content pages still return the original 4,398-code-point Markdown bytes ([lines 198–224](../../app/tests/markdown-core-read.test.mjs#L198-L224)).

## Contract mismatch to resolve

The A1 plan describes producer absence as `surface.extension === null`. The actual service response after lifecycle unload retains the descriptor and changes its status to `"unloaded"`; the projection is still read-only and `humanActions` is empty. The integration test records the observed wire shape rather than asserting `null`. The plan/contract should be updated or the service shape deliberately changed by the architecture owner; this verification does not choose between them.

## Limits

This verifies the real HTTP candidate/artifact read path, code-point pagination, source integrity, Matter ownership, workspace mutation resistance, and producer-absent continuation. It does not add malformed-page fault injection, unknown-schema coverage, missing/corrupt history, diff, or UI/browser acceptance; those remain separate seams. No external provider, credential store, network service, or commit was used.
