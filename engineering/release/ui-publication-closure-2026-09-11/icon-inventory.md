# Courtwork icon inventory and Claude drawing brief

2026-09-11 · integrated source `codex/ui-publication-integration-20260911` at `1ae17844fce9cc4b45c70787fcf4ddd2b63fec6c`. This is a source inventory and asset brief, not product acceptance, semantic authority, or an implementation order.

## Reading the statuses

- **Implemented reuse**: an existing static Lucide glyph is in the current sprite and has a mapped or observed renderer call. A mapping still does not grant a capability or handler.
- **Selected specimen**: an accepted design direction or local candidate that still needs its own optical, source, accessibility, and non-author review before `canonical`.
- **To draw**: a bounded asset gap with an admitted semantic owner. It enters asset-first design and then front-end integration in the authorized ONE-SHOT candidate; non-author acceptance follows return.
- **Deferred owner**: the owner has not admitted a need for a new glyph or domain identity. Keep the exact text, status, object, and consequence visible.

## Fixed sources and constraints

- The frozen common family is the Lucide 1.41.0 static subset from `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052`; see [`icon-controls.md`](../../design/icon-controls.md) IC-5/6/8 and [`glyph-semantics.md`](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md). Current `app/web/vendor/icons.svg` SHA-256 is `445d4a0ee5ae3d72496dab0ce8c055d786fc08bd58c4df3d4c3dd5534499f6b7` and exposes 35 symbols. The semantic registry is 47 entries, SHA-256 `846e034538f15f452a654fd4311f587741b370bec647c81b2f41517407e8a7cf`; it is presentation-only.
- The original Design return is [`research/se-control-design-return-2026-09-11/README.md`](../../research/se-control-design-return-2026-09-11/README.md): 7 pages / 19 boards, 66 files, archive SHA-256 `c4d33dcc2aa52e4c5e1f51fe9de0dd98c9eccde840f926b1b4e35d2839267313`. Its six source glyphs are `source.tar.gz:return-package/glyphs/{attn-a,attn-b,attn-c,spark-a,spark-b,spark-c}.svg`; relevant boards are `return-package/artboards/{Icons,Settings,Main,ChatSpace,ChatActions}.dc.html`.
- v2 is [`research/se-control-design-return-2026-09-11/v2/README.md`](../../research/se-control-design-return-2026-09-11/v2/README.md), source ZIP SHA-256 `6bbf56adcb964f6405b4900051884020a45a364a9ece3fb0649404f8165c8454`, with `canvas-v2/boards-chat.mjs` SHA-256 `4cb836581ec34d01d5ea3a3bf050b96b0887a9a2ff9492a82e01d4ee9d351e09`. A2 is only a Spark optical candidate; Settings values and all App implementation remain unshipped.
- v3 is [`research/se-control-design-return-2026-09-11/v3/README.md`](../../research/se-control-design-return-2026-09-11/v3/README.md), complete archive SHA-256 `b98c5da078347b9d9aa02d29d64c875a601eeb19f9354338c7c57a020f501132`, with `return-v3/repaired-ab/canvas/boards-chat.mjs` SHA-256 `bd32f9fcb5c4cce16929ea77577b2e9615990ae1f991d25510228ad1930f4481`. P1-2/P2-3 are Pages directions; v3 did not implement an App icon set.
- The Chat source ledger is [`design/chat-product-page-2026-09-11/reference-index.md`](../../design/chat-product-page-2026-09-11/reference-index.md) §fixed sources (product node `8250bac1a30bdcc049a75c145ec1525131b726e6`; current shell blobs and the original/v2/v3 hashes). The nearest implementation grammar is [`agent-interface-2026-09-10/precedents.md`](../../design/agent-interface-2026-09-10/precedents.md): `ui-controls.mjs` `icon`/`action`/`setAction`, `semantic-controls.mjs`, `settingsRow`, model picker, and work-surface tabs.

## Inventory: implemented reuse

| Surface / semantic slots | Existing reuse and evidence |
|---|---|
| Main navigation | `nav.home → house`; `session.new → square-pen`; `chat.create/project.create/material.add → plus` where the object name remains in the label; `surface.close/filter.clear → x`. Actual wiring is in `app/web/app.mjs:6186-6211`; Chat remains a text-labelled button. |
| Header and surface chrome | `chrome.nav.toggle → panel-left`; `panel-right` is reused for Chat overview and work-surface open/close; `chevron-right/chevron-down` disclose; `maximize-2/minimize-2` expand/restore. `app.mjs:3779-3795,6192-6200` preserves labels and `aria-expanded`. The same `panel-right` for two adjacent actions is a known辨识 gap, not a settled new glyph. |
| Work, file, source, and activity rows | `chat.object → message-square`; `project.object/workspace.object → folder`; `file.object → file-text`; `activity.view → activity`; known tool classes reuse `square-pen` (write), `file-text` (read/source), `folder` (list), `search` (grep), `settings-2` (runtime load), or neutral `activity` (unknown). See `product-semantics/raw-consumers.json` and `app/web/{home-view,workspace-view,summary-disclosure}.mjs`. |
| Runtime/connection chrome | `connection.object/mcp.server → plug` is a mapped identity/row treatment; `refresh-cw`, `search`, and `paperclip` are named read/filter/files controls. The glyph only identifies the broad class; the full text supplies provider, target, path, revision, and action. |
| Composer and message actions | `arrow-up` Send, `square` Stop/Cancel run, and the registry `message.*` set: `copy`, `square-pen`, `volume-2`, `square`, `thumbs-up`, `thumbs-down`, `rotate-ccw`, `git-branch`, `share-2`, `pin`, `download`, `external-link`, `folder`, `pause`, `play`, plus `ellipsis` for `menu.more`. `chat-actions.mjs` currently has production handlers only for copy/edit/copy-path/copy-hash; the other mapped actions render truthful unavailable feedback. |

## Inventory: selected specimen and bounded drawing

| Slot | Current disposition | Required next work |
|---|---|---|
| `spark.surface` / Spark identity | **Selected specimen**: Spark A `source → fan-out`; v2 `spark-a2.svg` is optical input only. | **To draw** a revised domain SVG and source for 16/18/20/24; preserve “Spark” text and source/revision/status words. Do not draw a sparkle, progress, or stale-state variant. |
| `attention.agent` / Attention identity | **Selected specimen**: Attention A `streams → ring`; the ring is an Attention-object/judgment metaphor, not an authorization or universal human-intervention mark. | **To draw** a revised domain SVG and source for 16/18/20/24; keep the queue and global assistant distinct in text and placement. |
| Header Chat overview | **Selected direction**, not a selected asset: three-line summary treatment; current `show-run-button` and work-surface button both use `panel-right` (`app/web/app.mjs:6192-6194`). | **To draw only if comparison proves a gap**: a fixed Lucide donor or one local candidate with a named slot. Do not add a third permanent navigation item or silently replace both actions. |

## Inventory: deferred by owner; preserve text

- Settings groups are currently text-only tabs (`app/web/settings-view.mjs:1599-1608`, `app/web/index.html:383-403`, `app/web/styles.css:5177-5203`). The nine slots are all **deferred owner**: `General`, `Appearance`, `Models`, `Tools & Integrations`, `Skills`, `Memory`, `Permissions`, `Keyboard`, `Developer`. No per-group glyph is selected; do not borrow the reference screenshot’s categories or invent setting facts.
- Keep `attention.queue`, `matter.object`, `expert.role`, `model.object`, `reasoning.setting`, `tool.object`, `plugin.object`, `review.open`, `approval.request`, `access.policy`, `history.view`, `trace.view`, `run.object`, `state.unknown`, and `question.request` as text/structure until their owners admit a domain identity. Their current registry rows with `glyphRef: null` or text representation are deliberate.
- `source` references, `current file` versus `recorded version`, status (`current/stale/partial/unknown/error/conflict`), Review/Approval/Access consequence, scope, revision, path, hash, bytes, and producer availability remain words and facts. Never use a glyph, fill, or color to imply authority, acceptance, failure, or capability. Do not create a tool-family set to consume unused `arrow-down` or `external-link`.

## Self-contained Claude drawing brief

Create a deterministic, editable vector candidate package. The three original domain slots are: `spark.surface`, `attention.agent`, and the conditional `chat.overview`. Use one SVG per slot plus a small source/generator file; do not return raster-only art or hand-edit the generated sprite. Every candidate must have a manifest row:

```text
slot; semanticKey; meaning; ownerRef; sourceKind; sourcePath; sourceSha256; license;
sizes; surface; accessibleName; tooltip; visibleTextFallback; status; reviewStatus
```

Use `sourceKind=lucide` only with an actual vendored file path and fixed SHA; use `sourceKind=courtwork-domain` for Spark/Attention self-draws. The source and generated output must be reproducible and parity-checkable. Keep the semantic key separate from the SVG symbol id.

Render each slot at optical sizes **16, 18, 20, and 24 CSS px** on a 24×24 viewBox. Match the admitted grammar: 2px centered stroke, round cap/join, `currentColor`, 1px safe edge, centered optical mass, and neighbor density equal to Lucide at the same slot. 16 is a row glyph, 18 a compact control, 20 navigation, and 24 a review/specimen scale; hit regions stay 32px desktop and 44px narrow/touch, independently of SVG size.

Supply a contact sheet with adjacent Lucide neighbors, text-only fallback, and the header pair in the exact light/dark, monochrome, and forced-colors contexts. SVGs remain `aria-hidden` and unfocusable; labels, accessible names, tooltips, object names, state words, and action consequences stay in the host control. Do not add fill/line variants that turn state into iconography; include reduced-transparency/reduced-motion static behavior where relevant.

Delivery levels: **L0** source SVGs + generator + manifest + contact sheet; **L1** source/hash parity, geometry/neighbor review, 16/18/20/24 light/dark/mono/forced-colors and text fallback evidence; **L2** non-author review and owner disposition. The authorized ONE-SHOT may update the semantic registry, generator and renderer in its implementation stage; L2 remains Astra’s acceptance of the returned candidate, not a new permission gate before implementation.

This inventory supplies source facts to [ONE-SHOT](ONE-SHOT.md), which authorizes asset-first design and same-package Settings/nav/Chat front-end implementation. Do not infer capabilities from drawings, change schema, add unsupported provider identity, or alter the Lucide family. Preserve visible labels and text fallbacks. Candidate implementation and non-author acceptance remain separate facts.

Settings reuse candidates for the actual SETTINGS_GROUPS in settings-view.mjs: General sliders-horizontal, Appearance palette, Models cpu, Tools & Integrations plug, Skills book-open, Memory database, Permissions key-round, Keyboard keyboard, Developer code. These are drawing/reuse candidates, not already accepted mappings; check the vendored subset and source/license before adding any missing source. These name existing categories, not new domain state. Prepare optional roadmap assets with explicit reserved status; do not manufacture live controls to consume them.
