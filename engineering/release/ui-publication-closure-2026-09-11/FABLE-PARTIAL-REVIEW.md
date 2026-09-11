# FABLE partial review

Date: 2026-09-11. Scope: independent bounded review of the author candidate against Courtwork main.

**Source state.** Main was `cf4ab5604ba5a7319fc35121c818d75f516e79b3` (`main`). The author candidate was `2c7d181c3f6af761b0d4d09b04097a9fce8b0460` (`claude/publication-final-v1`). Its HEAD is a committed Stage 1 product-glyph change; the later Stage 2/3/5 work was dirty in the author checkout. The narrow semantic-test repair is `90d7b653f5f4df63d0a6fb7c22769b3047d2f0e2` (`codex/fable-stage1-testfix-20260911`) and changes only `app/tests/product-semantics.test.mjs`.

**Stage 1 — candidate, with test synchronization required.** The candidate commit contains the Spark, Attention, Chat and Settings glyph assets, registry/generated consumption, vendor sprite, contact sheet and focused tests. The preserved combined candidate run covered `product-icons`, `product-semantics` and `static-web-manifest`: 19 tests, 16 pass, 3 fail. The three failures were the semantic registry fixture's missing domain sources, the stale no-glyph Attention assertion, and the stale text-only navigation assertion; the four icon cases and six static-manifest cases passed. See the preserved [candidate log](../../../evidence/fable-partial-review-20260911/stage1-candidate-combined.log). The narrow repair aligns those semantic assertions with the committed domain registry. The repaired icons + semantics command passed 13/13 (4 icon cases + 9 semantic cases); the parent-side 19-test combination passed 19/19. Treat `90d7b65` as required test synchronization before calling Stage 1 green.

**Stage 2 — partial.** The dirty author changes add the Chat page/wiring and related route work; focused product, page, colour, contrast, interaction, shape, material, figure and document-link checks passed. The implementation uses existing sessions and New chat/sibling routes and has no backend addition. No return package or visual capture set was supplied for this stage.

**Stage 3 — partial.** The dirty changes cover control-accent/unavailable-pair rules and the Paper CTA split; focused checks passed. An independent visual/state matrix and return evidence are still absent.

**Stage 4 — open.** No unified in-product preview lifecycle or evidence was added. The Chat hook's optional `state.preview`/`openPreview` references are not a preview implementation.

**Stage 5 — open.** No F1–F5 architecture-diagram sources/captures, publication media, final hashes or RETURN ZIP were supplied. The dirty Chat carry figure and figure manifest edits do not constitute that package.

**Native-chrome boundary.** The supplied audit recorded 93/93 browser-geometry checks passing at 1440, 1280 and 390 widths across preview shell, 104×64 packet, zero-inset packet, plain URL, `overlay:false` and live updates. It exercised a simulated packet in the running web fixture; it did not exercise AppKit, native hit testing or VoiceOver. The 1440 expanded work-surface path is unverified: at 1024–1679 the source hides the expand button while the view switch is active, so the audit could not click the expanded state.

**Settings reference.** The candidate consumes nine Settings glyph slots, but no RETURN record states which items from `settings-reference-20260911` were adopted or excluded. Preserve the selected constraints: icon slot + label alignment, unified row anatomy and toggle anatomy; exclude category subheadings, blue toggles and the reference code palette. The reference's account, permission and settings values are not Courtwork authority.

**Disposition.** This is a partial engineering review, not product acceptance or publication acceptance. Parent can consume the Stage 1 candidate with `90d7b65`; Stage 2–5 remain open pending their own implementation and evidence gates.
