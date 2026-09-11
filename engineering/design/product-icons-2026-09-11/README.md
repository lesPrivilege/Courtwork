# Product glyph set · 2026-09-11

2026-09-12：[Matter Open record](../sidebar-product-model-2026-09-12/MATTER.md)新增第五枚domain glyph，消费于已有Matter续接行，Project仍为folder。

2026-09-12：[Expert Quiet profile](../sidebar-product-model-2026-09-12/EXPERT.md)按用户授权新增第四枚domain glyph，仅接App静态planned身份行；后端能力不变。

2026-09-11后续：[用户形象反馈与最新裁定](../../release/ui-publication-closure-2026-09-11/icon-atmosphere-20260911/README.md)将Spark/Attention原造型记为临时实现。三组成对方向、并列表与推荐见 [atmosphere-20260911/README.md](atmosphere-20260911/README.md)；已接入方向A（Strike · Awake），原两枚 SVG 保留在 `atmosphere-20260911/directions/current/`，下文来源记录随之更新。

Stage 1 of the [final Claude Design ONE-SHOT](../../release/ui-publication-closure-2026-09-11/ONE-SHOT.md). One sprite, one geometry contract, one registry: the Lucide 1.41.0 static subset (IC-5/IC-8, unchanged family) plus five CourtWork domain glyphs, consumed through `tools/product-semantics.mjs` and `app/web/semantic-controls.mjs`. This is an author candidate; non-author review and owner disposition (inventory level L2) remain Astra's.

## Sources and regeneration

| Set | Source of truth | Generated output |
|---|---|---|
| Lucide subset (44 files) | `tools/ui-vendor/lucide/*.svg`, pinned by `lucide/sources.json` (commit `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052`, per-file sha256) | `app/web/vendor/icons.svg` symbols |
| CourtWork domain (5 files) | `tools/ui-vendor/courtwork/{spark,attention,chat,expert,matter}.svg`, `courtwork/sources.json` (sha256, origin, MIT) | same sprite, same symbol grammar |
| Semantic mapping | `engineering/design/product-semantics/registry.json` (58 entries) | `app/web/product-semantics.generated.mjs` via `node tools/product-semantics.mjs --write` |
| Contact sheet + glyph manifest | `node tools/ui-vendor/contact-sheet.mjs` | `contact-sheet.html`, `glyph-manifest.json` (this directory) |

```sh
node tools/ui-vendor/build.mjs --icons-only     # sprite, LICENSES.txt and vendor manifest; no esbuild needed
node tools/product-semantics.mjs --write        # regenerate the semantic projection after editing the registry
node tools/ui-vendor/contact-sheet.mjs          # contact sheet at 16/18/20/24, light/dark/mono/forced
node --test app/tests/product-icons.test.mjs    # sprite ⊇ registry ⊇ ui-controls allowlist, hashes, geometry
```

`app/tests/product-icons.test.mjs` fails if a registry glyph is missing from the sprite or from the `ui-controls.mjs` allowlist, if any pinned file hash drifts, or if a domain glyph leaves the 24-grid / 2px / round / currentColor contract — so regeneration cannot silently drop a glyph.

## Manifest (slot; semanticKey; meaning; owner; source; sizes; surface; accessible name; status)

| slot | semanticKey | meaning | ownerRef | sourceKind · path · sha256 | sizes | surface | accessible name / visible text | status |
|---|---|---|---|---|---|---|---|---|
| Spark seat | `spark.surface` | Spark identity: a struck spark leaving up-right (atmosphere direction A, 2026-09-11; replaces source → fan-out) | `engineering/design/spark-surface-2026-09-10/be41-dto.md` | courtwork-domain · `tools/ui-vendor/courtwork/spark.svg` · see `courtwork/sources.json` | 20 nav (16/18/24 on sheet) | app sidebar | Spark (visible text kept) | mapped · candidate |
| Attention seat | `attention.agent` | Attention identity: an eye just opened, upper lid and pupil (atmosphere direction A, 2026-09-11; replaces streams → ring) | `app/docs/attention-agent.md` | courtwork-domain · `courtwork/attention.svg` | 20 | app sidebar | Attention | mapped · candidate |
| Chat seat / page | `chat.surface` | Chat page: a conversation with a fragment carried out of it | `engineering/design/chat-product-page-2026-09-11/DECISION.md` | courtwork-domain · `courtwork/chat.svg` | 20 | app sidebar, Chat page | Chat | mapped · candidate |
| Chat overview (header) | `chat.overview` | three-line summary beside the stream | `docs/interface-components.md` §Chat composition | lucide · `lucide/text-align-start.svg` · `db38ff88…` | 20 | app header | Chat overview | mapped · resolves the double `panel-right` gap; work-surface entry keeps `panel-right` |
| Settings · General | `settings.general` | category | `docs/interface-components.md` §Settings | lucide · `sliders-horizontal.svg` · `e43a00e5…` | 18 | Settings nav | General | mapped |
| Settings · Appearance | `settings.appearance` | category | same | lucide · `palette.svg` · `8e7d3fde…` | 18 | Settings nav | Appearance | mapped |
| Settings · Models | `settings.models` | category | same | lucide · `cpu.svg` · `ec83bb69…` | 18 | Settings nav | Models | mapped |
| Settings · Tools & Integrations | `settings.tools` | category | same | lucide · `plug.svg` (existing, multi-purpose with connection.object / mcp.server) | 18 | Settings nav | Tools & Integrations | mapped |
| Settings · Skills | `settings.skills` | category | same | lucide · `book-open.svg` · `9b9bed0f…` | 18 | Settings nav | Skills | mapped |
| Settings · Memory | `settings.memory` | category | same | lucide · `database.svg` · `471eb14b…` | 18 | Settings nav | Memory | mapped |
| Settings · Permissions | `settings.permissions` | category | same | lucide · `key-round.svg` · `f8cdea84…` | 18 | Settings nav | Permissions | mapped |
| Settings · Keyboard | `settings.keyboard` | category | same | lucide · `keyboard.svg` · `f509925c…` | 18 | Settings nav | Keyboard | mapped |
| Settings · Developer | `settings.developer` | category | same | lucide · `code.svg` · `83235d4a…` | 18 | Settings nav | Developer | mapped |

Full hashes are in `tools/ui-vendor/lucide/sources.json`, `tools/ui-vendor/courtwork/sources.json` and `glyph-manifest.json`. License: Lucide ISC (with the Feather MIT notice) in `app/web/vendor/LICENSES.txt`; CourtWork domain glyphs MIT under the repository LICENSE.

## Rules kept

- Glyphs are `aria-hidden` and unfocusable; labels, accessible names, tooltips, object names, state words and consequences stay in the host control. Spark / Attention / Chat keep their visible text in the sidebar (`setSemanticControl(…, { visible: true })`).
- No state is drawn into iconography; no fill/line variants; no Settings facts are invented — each Settings glyph names an existing group of `SETTINGS_GROUPS`.
- Hit regions stay 32px desktop / 44px narrow from `--control`, independent of the 16/18/20/24 glyph size.
- Text-reserved keys (`attention.queue`, `matter.object`, `review.open`, `approval.request`, …) stay text.
- `plug` is shared by Tools & Integrations, Connection and MCP server as a multi-purpose glyph; the name beside it supplies the object.

## Consumption ledger (product buttons, header, sidebar, menus)

| Consumer | Before | After |
|---|---|---|
| Sidebar `#chat-button` | text only | `chat` glyph + "Chat" |
| Sidebar `#attention-button` | text only | `attention` glyph + "Attention" |
| Sidebar `#spark-button` | text only | `spark` glyph + "Spark" |
| Header `#show-run-button` (Chat overview) | `panel-right` (same as work surface) | `text-align-start` |
| Header `#show-surface-button` / `#close-surface-button` | `panel-right` | unchanged |
| Settings group tabs ×9 | text only | 18px glyph slot + label; hover / current / disabled colour one rule |
| Menus (`menu.more`), message actions, composer, rows | unchanged | unchanged |

Roadmap reservation: none of the new glyphs creates a control that does not exist; the Chat page (stage 2) consumes `chat.surface` for its own identity.
