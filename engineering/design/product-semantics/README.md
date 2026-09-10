# Product semantics · VS-01 candidate

Astra · 2026-09-11 · product baseline `590739f`, integration baseline `57eaa6b`. This is the first implementation of the [P0.5 contract](../../execution/2026-09-11-semantic-polish/semantic-registry-plan.md). Candidate implementation is not independent acceptance.

[registry.json](registry.json) owns presentation mappings only. Runtime/Core contracts linked by `ownerRef` own facts, capabilities and mutations. `capabilityRef: null` means that this entry supplies no capability decision: the existing caller must still enforce its own capability. The registry does not authorize actions. Words are English in this first projection; Pages translations remain in its existing copy source until the VS-05 cross-map is applied.

`node tools/product-semantics.mjs --write` generates [the immutable browser projection](../../../app/web/product-semantics.generated.mjs); the same command without `--write` rejects stale output and absent owner paths. The build references the existing [Lucide source manifest](../../../tools/ui-vendor/lucide/sources.json). No geometry, licence, provider logo or brand asset is duplicated. The independent `brand/` package has no new dependency.

The [facade](../../../app/web/semantic-controls.mjs) resolves a key to a complete accessible name and admitted glyph before delegating to existing `action` / `icon`. First consumers are workspace Add material and Close session overview. Their callbacks, focus paths and visible/control anatomy are unchanged. Closest implemented precedent: [ui-controls](../../../app/web/ui-controls.mjs) `action` / `setAction`; affected grammar: contextual action naming and iconography, with the existing glyph contract's x/plus contextual reuse.

## Ontology decisions

- Chat is the everyday conversation label; Session remains its diagnostic/storage identity. Run remains a particular execution, not the conversation, task or formal result. No global Run→Execution substitution.
- Project is a container; Workspace is a folder binding; Matter is supplied by a domain binding. Expert, Model and Reasoning remain distinct.
- Attention is the persistent assistant. Attention items is the queue label already used by the actual queue screen; Home's queue title will follow it. Inbox is not needed to create a second name for the existing destination.
- Access is standing policy; Approval permits a specific operation; Review reads and judges evidence under its own contract. Neither glyph nor colour grants acceptance.
- Activity describes scoped recorded work; History is earlier object records; Trace is diagnostic execution events. Technical identifiers remain available in details.
- Attention, Spark, Matter and Expert are text-reserved. No permanent glyph has won a collision/optical review. `none` is a deliberate current representation, not proof that custom-symbol research is complete.

## Gate and migration scope

[Six tests](../../../app/tests/product-semantics.test.mjs) cover source/output consistency, single-purpose collisions, invalid geometry, unapproved state substitutions, contextual accessible names, facade handlers, no-icon/Pages projection and raw x/plus regression in the two migrated workspace controls. Shared plus/x are admitted with complete object names. This is an incremental gate, **not a claim of whole-app raw-call enforcement**. Other callsites retain the existing glyph contract while the VS-00 inventory and subsequent slices identify migration targets. State variants are deliberately rejected in schema 1 until an explicit versioned approval rule exists.

Current classifications are mapped presentation candidates. An entry's `reviewStatus` does not constitute domain review or independent product acceptance. `colourRole: inherited` means the existing control/content owns colour; the facade does not add colour or infer status.

Initial-slice author verification (historical): six focused tests pass. The first run exposed the existing TinyDOM helper's read-only dataset snapshot, not a browser failure; the facade uses standard data attributes and the test asserts the actual aria/label anatomy. Browser verification and non-author review remain pending with VS-06.

## Non-author review follow-up

The [fixed 1de7a31 review](../../../evidence/semantic-polish-20260911/registry-independent-review.md) found missing representation enforcement and imprecise owners. The follow-up validates every surface representation, honors Pages text selection even when App has a glyph, requires a checked `ownerAnchor`, and uses the canonical Lucide manifest as the negative-test oracle. Exact workspace render/callback tests are now in the suite (8/8). Anchors point to the existing source definition or endpoint and are evidence locators, not executable authority. The same edit aligns the old session-overview/files/settings labels with the existing Chat vocabulary. Review of this correction remains separate from the original fixed review.

## VS-04/05 migration and gates

The current candidate has 47 semantic entries. Home now uses **Attention items** for the queue; **Continue** retains Chat records, including records without executions. Chat actions use the registry facade, while production capability stays closed to copy/edit/path/hash handlers until the owner supplies a separate lifecycle contract. Attention and Spark navigation use `setSemanticControl` with visible text and no decorative glyph. Questions, approvals, candidate/decision rows and Matter bindings no longer borrow Chat, Activity, Connection or File identity. Default work summaries say Work; exact Run identity remains in disclosed details.

The earlier first-consumer/six-test statements above describe that historical slice. Current enforcement adds:

- [Raw consumers](raw-consumers.json), checked by `node tools/check-semantic-consumers.mjs`: exact lines and counts for the six reviewed glyph families in App modules, including explicit data-identifier exclusions. New or duplicated lines fail. This lexical gate excludes vendor, the static allowlist and the generated registry; it does not claim every dynamic call is statically proven.
- [Copy exceptions](copy-exceptions.json), checked by `node tools/check-product-copy.mjs`: hard-coded `text`, `title` and `aria-label` fields plus App shell HTML text reject the reviewed default Run/Permission/Continue wording. Three disclosed diagnostic fields remain. Verbal “Run tests”, values supplied by users and technical identifiers are outside the prohibition. This is not an all-language/HTML/runtime-error parser.
- [Pages cross-map](pages-map.json), checked by `node tools/check-pages-semantics.mjs` and by the site build: all 13 capture slots and 10 figures point to admitted Pages keys. Source manifests still own provenance/status, translations stay in the existing copy sources, and the map grants no capability or acceptance.

No-icon support extends the existing `setAction` anatomy: absence of a glyph requires visible text. It preserves handlers, selection and focus ownership. The negative tests include same-key record replacement, unsupported production handlers, duplicate raw consumers, unknown Pages mappings and diagnostic/verb copy exceptions.


## Final local candidate receipt

Product f99af46 completes this incremental registry migration and its declared gates. Final suite767/767, source review closures and actual author browser observations are in [the delivery](../../../evidence/semantic-polish-20260911/README.md). The earlier pending review statements above describe their slice timestamps. Native/independent visual and whole-product acceptance are not implied.
