# Independent registry review · fixed candidate `1de7a31`

Review date: 2026-09-11. The review target is the fixed candidate commit
`1de7a31b41e404fa119da37fe85b3d3f7112770a` at the worktree HEAD. The unrelated
working-tree edits in `app/web/inspector.mjs`, `styles.css`,
`telemetry-view.mjs`, `usage-projection.mjs`, `usage-view.mjs`,
`tools/lint-colors.mjs`, and the existing evidence fixtures were excluded.
This is a bounded non-author review of the registry, generator, negative tests,
and the two migrated workspace consumers. It makes no browser, visual, or
whole-app acceptance claim.

## Contract comparison

The P0.5 plan requires a machine-readable semantic mapping with an owner
reference, canonical/contextual names, symbol and admission classes, surface
and glyph policy, representation references, state variants, capability
references, interaction/tooltip rules, and review/evidence status
([semantic-registry-plan.md:26-40](../../engineering/execution/2026-09-11-semantic-polish/semantic-registry-plan.md)).
It also keeps capability and mutation authority in Runtime/Core, requires an
adapter above the existing renderer, and calls for incremental consumer
migration ([semantic-registry-plan.md:28-34](../../engineering/execution/2026-09-11-semantic-polish/semantic-registry-plan.md),
[semantic-registry-plan.md:57-63](../../engineering/execution/2026-09-11-semantic-polish/semantic-registry-plan.md)).

The candidate has 27 entries. Each current entry contains the listed data
fields, uses English `words` and `accessibleName` templates, and has no state
variant. `capabilityRef` is `null` for all 27 entries, so the registry does not
make an authorization decision. The reserved `attention.agent`,
`spark.surface`, `matter.object`, and `expert.role` entries deliberately use
text and no glyph. Existing Lucide source names are referenced; no new SVG or
brand dependency is added.

The owner-path check found 27/27 paths present. This is useful source evidence,
but it is only a filesystem check: 13 entries point to the broad
`app/docs/api-v6.md`, four to `app/docs/request-telemetry.md`, and three to
`docs/work-core/contract.md`. The registry has no function, endpoint, or
owner-kind anchor from which an independent reviewer can confirm that each
action/object maps to the exact fact or capability owner. Keep the mapping
classified as presentation evidence pending those precise anchors; this does
not turn the current `null` capability references into authorization.

## Generator and adapter evidence

`tools/product-semantics.mjs:5-24` checks schema version, key syntax and
duplicates, required scalar fields, symbol/admission classes, English names,
surfaces, glyph policy/reference, capability-reference scalar shape,
non-empty state variants, and single-purpose glyph collisions. The generator
at `:26-27` emits the registry as a recursively frozen browser projection.
`checkRegistry` at `:29-39` reads the canonical Lucide source manifest,
checks owner paths, and rejects a stale generated file when run without
`--write`. The server exposes both generated modules at
`app/server/index.mjs:26`.

The facade at `app/web/semantic-controls.mjs:4-24` delegates to the existing
`action` and `icon` primitives, preserves the caller callback, and adds only a
semantic data attribute. `workspace-view.mjs:56-60` migrates Add material to
`material.add`; `:78-83` migrates Close session overview to `surface.close`
with its required target. The direct TinyDOM exercise below observed
`Add material` / `material.add` and `Close session overview` /
`surface.close`, and each callback fired once. No focus or control anatomy was
changed by the diff.

## Checks run

| Check | Result |
|---|---|
| `node tools/product-semantics.mjs` | pass: `{"entries":27,"generated":false}` |
| `node --test app/tests/product-semantics.test.mjs` | pass: 6/6 |
| owner-path enumeration against `registry.json` | pass: 27/27 paths present |
| ephemeral TinyDOM render of both migrated views | pass: labels, semantic keys, and callbacks observed |

The focused tests cover source/output agreement, a contextual collision, an
unknown glyph and state-variant rejection, contextual names, one generic
facade button, and source-level presence of the two migrated keys
([product-semantics.test.mjs:8-45](../../app/tests/product-semantics.test.mjs)).

## Findings and bounded follow-ups

1. **Representation coverage is not enforced.** P0.5 names
   `representationRefs` as a minimum field and allows App and Pages to use
   the same meaning with different forms. The validator never requires or
   validates `representations`, its values, or coverage of every allowed
   surface. A mutation deleting both `representations` and `stateVariants`
   returns `[]`; `{app: "bogus"}` also returns `[]` (reproduced through the
   exported `validateRegistry`). More directly,
   `semanticPresentation("chat.object", {surface: "pages"})` returns glyph
   `message-square` while that entry declares `representations.pages: "text"`.
   The current two consumers are App-only, so this is a latent P0.5 gap that
   must be closed before a Pages consumer or cross-surface parity claim.

2. **Owner validation is existence-only.** `checkRegistry` uses `access()` on
   `path.join(root, ownerRef)` and does not validate a repository-relative file,
   an owner kind, a source coordinate, or a capability/predicate target. The
   current paths exist and the README correctly says the registry is
   presentation-only, but the check cannot establish the P0.5 owner mapping
   beyond path presence. Add exact owner anchors or retain an explicit pending
   classification before treating entries as authority-linked.

3. **Negative-test oracle is narrower than the generator oracle.** The test
   builds its glyph set from the generated registry itself
   (`product-semantics.test.mjs:8`) and mutates the in-memory object. It does
   not negative-test the canonical Lucide source manifest or owner-path check;
   the positive `checkRegistry()` test covers the current file only. The
   current rejection cases are useful, but a future test should use the
   canonical manifest for its glyph set and exercise malformed owner and
   representation records.

4. **The two consumer assertions are source-level.** The final test checks
   `workspace-view.mjs` for semantic call strings rather than rendering
   `renderWorkspaceFilesView` and `renderSessionOverview`. The manual TinyDOM
   run supplied behavior evidence for this review; add those calls to the
   focused suite if the candidate is extended. Other raw glyph callsites remain
   outside this incremental slice, as the candidate README states.

## Review disposition

The fixed candidate is internally consistent for the bounded App slice and
passes the focused checks above. Record it as **reviewed with follow-ups**,
with Pages representation enforcement and precise owner mapping still pending.
The candidate's own statement that browser verification and non-author review
were pending is now supplemented by this source-level review only; no visual
or product acceptance is inferred.

## Follow-up verification · fixed `272a2f1`

Review date: 2026-09-11. This follow-up checks
`272a2f142e4acaee0ba8d92d3a5bc284965487b9` against the four findings above;
the original review text remains unchanged. The unrelated working-tree edits
listed at the top of this file remain excluded.

The first finding is addressed at the bounded adapter boundary. The validator
now requires a `representations` object with a `text` or `glyph` entry for
every allowed surface, and rejects a glyph representation without a glyph
reference (`tools/product-semantics.mjs:21`). The facade now returns a glyph
only when the selected surface declares `glyph`
(`app/web/semantic-controls.mjs:4-11`). The new negative test confirms that
`chat.object` on Pages has `glyph: null` and that missing/invalid
representations fail (`app/tests/product-semantics.test.mjs:48-53`).

The second finding is addressed to the evidence level promised by this slice.
Every current entry now has a checked `ownerAnchor`; the owner-path validator
rejects absolute or traversal paths, and `checkRegistry` reads each owner file
and requires its anchor (`tools/product-semantics.mjs:12-22,31-38`). A direct
enumeration found 27/27 anchors present. The exact anchors include
`POST /api/v5/sessions` for `chat.create`, `async createProject(name)` for
both project entries, and the `tool`, `plugin`, and `mcp_server` rows in the
runtime-control index. These anchors are source locators, not executable
authority; capability references remain `null` and Runtime/Core still owns
facts and mutations.

The third finding is addressed by deriving the test oracle from the canonical
Lucide source manifest (`app/tests/product-semantics.test.mjs:8-9`) and by
testing malformed owner and representation data in the new negative case.
The fourth finding is addressed by the new direct render test: both
`renderWorkspaceFilesView` and `renderSessionOverview` are imported and driven
with TinyDOM, and the `material.add` and `surface.close` callbacks fire once
with their expected semantic labels (`app/tests/product-semantics.test.mjs:54-62`).
The follow-up also aligns the overview's visible Chat terminology with the
existing Chat vocabulary while retaining the same control callbacks and
layout path.

Follow-up checks passed:

| Check | Result |
|---|---|
| `node tools/product-semantics.mjs` | pass: `{"entries":27,"generated":false}` |
| `node --test app/tests/product-semantics.test.mjs` | pass: 8/8 |
| owner-anchor enumeration | pass: 27/27 source anchors present |

Disposition: findings 1–4 are closed for the bounded registry/App slice.
Browser, visual, Pages build consumption, and whole-app raw-call enforcement
remain outside this source review and are still unverified.
