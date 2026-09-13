# Runtime hierarchy candidate — Luna source review

2026-09-13 · Non-author review of the isolated Runtime detail-reader source diff. This is a code-and-evidence review, not visual acceptance or a full accessibility claim.

## Reviewed snapshot

- Branch: `codex/runtime-inspector-hierarchy-20260913`
- Base: `e9a1c057b61b405459a62456f9bf4b8534fb4235`
- Reviewed source files: [`runtime-view.mjs`](../../../../app/web/runtime-view.mjs) and [`styles.css`](../../../../app/web/styles.css)
- SHA-256 of `git diff HEAD -- app/web/runtime-view.mjs app/web/styles.css`: `7a7b3840ba79e0ea07dbd255d0334642ce62f95d53acfa3eabdb83eeec33d0b0`
- Author-added test file: [`runtime-detail-reading.test.mjs`](../../../../app/tests/runtime-detail-reading.test.mjs), SHA-256 `bde2c55df3b9f16efa0c8336882f814178badd644ed2575f0c0679cc3f1054fd`

**Result:** the final source diff passes this bounded review for the Runtime hierarchy slice. The detail stays attached to its resource row, gains one solid bounded reading surface, preserves its own scroll position and focus through re-render, and lets long recorded source use that same scrollport. The resource title and status facts remain outside the reader. The surface stays under the existing `.settings-sections` scroll owner. The scoped review does not accept the candidate visually; Astra's browser evidence and the user's eye-review remain separate.

## Contract and behavior

The nearest implemented reading precedent is the existing recorded-file reader in [`inspector.mjs`](../../../../app/web/inspector.mjs), alongside Runtime's existing resource-row disclosure. The precedent index's `popover.inspector` entry points to that reader while limiting its canonical status to current connection/context popovers and tooltips; this change remains an inline resource detail and does not introduce a general overlay or modal. The affected grammar is the existing Runtime object row → bounded detail → source/permission evidence hierarchy, consistent with [the IA-2 hierarchy registration](../hierarchy-polish-registration.md): solid inspector, object facts and controls stay with their owner, and the UI adds no authority.

The detail is a named, keyboard-focusable `group`, with its accessible name tied to the row title and an inset `:focus-visible` outline. `render()` saves each detail's `scrollTop` and `scrollLeft`, restores them after replacing that mount, then restores focus without scrolling the outer page when focus belonged to the detail. Resource-derived DOM IDs now use `encodeURIComponent`, keeping detail/trigger/switch associations distinct for accepted IDs containing punctuation. Normal scroll chaining remains enabled at the inner reader's edge. Recorded source text shares the detail reader rather than adding another vertical scrollport.

Authority checks found no changed grant or mutation path. “View source” retains its existing source-kind gate and authenticated read path. The source inspector still says that an unexposed resource is being read by the local administrator, not the model. “Explain permission” still requires `resource.action` and shows the advisory evaluator result; it does not apply a policy or grant access. “Use as draft” keeps its draft-only disposition and “Nothing is sent” note. Row dimensions and existing parent-child labels/gates remain in the outer Runtime row and current owner.

## Findings fixed before this pass

1. With a long source already open, the permission explanation could be appended after the entire source body and land below the bounded reader's first view. The final order is actions → explanation → source → descriptor/permission evidence. The new fourth regression test opens long source, requests the explanation, and verifies the explanation precedes the source text.
2. The former sanitizer for resource-derived IDs collapsed distinct valid local IDs such as `local:ref.alpha` and `local:ref_alpha` to the same string. Runtime's validator permits `[a-z0-9._-]` in local IDs and rejects only duplicate raw IDs ([`control-plane.mjs`](../../../../app/runtime/control-plane.mjs)). The scroll-position map and ARIA references therefore could collide. The final diff uses encoded IDs for detail and switch relationships; the fifth regression test checks unique IDs, `aria-controls`/`aria-labelledby`, and independent restored positions for the two IDs.

## Verification

I independently ran the focused Runtime/permission suite, including the five new reading tests:

```text
node --test app/tests/runtime-detail-reading.test.mjs app/tests/runtime-workbench.test.mjs app/tests/runtime-source-service.test.mjs app/tests/runtime.test.mjs app/tests/runtime-projection.test.mjs app/tests/permission.test.mjs app/tests/permission-cas.test.mjs
32 tests passed, 0 failed
```

`node tools/lint-colors.mjs`, `node tools/contrast-report.mjs`, `node tools/lint-materials.mjs`, `node tools/lint-shapes.mjs`, and `node tools/lint-interaction.mjs` completed successfully. `node --check app/web/runtime-view.mjs` and `git diff --check HEAD` also passed. `node tools/check-doc-links.mjs` passed (1206 documents, 6642 links).

The author supplied screenshots and browser evidence in this directory (including 1440px Runtime detail/source states and a 390px dark large-text source state) and reports final Runtime 27/27 plus adjacent Settings 35/35 checks. Those remain author evidence; I did not independently rerun the browser path or visually accept the screenshots. The focused unit tests model scroll and focus restoration but do not establish native scroll chaining, screen-reader announcements, 200% zoom, or forced-colors behavior.

## Follow-up boundary

`inspectSource()` and `explainPermission()` still share the controller's `generation` counter. If Explain is requested while a source read is pending, the older source response can be ignored by the generation guard while `inspected.loading` remains set. This request-coordination behavior predates the detail-reader diff; I did not expand this slice into a lifecycle rewrite. Track it separately and add a concurrent source/Explain test if that path is addressed.
