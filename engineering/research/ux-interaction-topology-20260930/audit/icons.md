# Icons-in-context audit (observations only, no rulings)

Sonnet explorer, read-only, pinned at main 87e2207; returned in the hand-back message and saved here by the ruling author. Labels: [code] = observed in code; [inf] = inference from code (cascade or layout reasoning); [shot] = needs a real-UI screenshot or computed-style check. ICN-10 and ICN-11 are cascade-derived and need `getComputedStyle`.

## 0. Headline

- 62 glyphs ship: 49 Lucide 1.41.0 (commit bca7e75, per-file sha256 verified against `tools/ui-vendor/lucide`, 0 mismatches) and 13 CourtWork hand-drawn domain glyphs. No donor glyph, no second family, no emoji, no text character standing in for an icon. All 62 are on the 24 grid with fill=none, stroke=currentColor, 2px stroke and round cap/join; palette and key-round carry r=.5 `fill=currentColor` dots (upstream idiom).
- Cross-cutting: `.ui-icon{width:18px;height:18px}` (styles.css:540) beats the `width`/`height` attributes that `icon(name,{size})` sets, so `size` is nominal. Rendered size is decided by scattered selectors, and the design comments disagree about the tiers.

## 1. Inventory

Counts are literal call sites plus registry-driven consumers (`engineering/design/product-semantics/registry.json` → `semantic-controls.mjs`). L = Lucide static, D = CourtWork domain.

| glyph | src | call sites | surfaces |
|---|---|---|---|
| activity | L | 2 (app.mjs:3121, attention-agent-view.mjs:239) | chat flow Execution row, Attention agent row |
| arrow-down | L | 0 (allowlist ui-controls.mjs:49) | none |
| arrow-left | L | 2 literal + nav.back (app.mjs:1722) | sidebar history, Settings runtime back |
| arrow-right | L | 1 (nav.forward) | sidebar history |
| arrow-up | L | 2 (app.mjs:7450, attention-agent-view.mjs:97) | composer Send, Attention Send |
| book-open | L | 1 (settings.skills) | Settings nav |
| chevron-down | L | 4 (agent-chooser-view.mjs:35, app.mjs:2227, 3709, runtime-view.mjs:1138) | composer chip, permission button, sidebar project, runtime row |
| chevron-right | L | 16 (flowRow, home-view×5, app.mjs:2227/3439/3481, attention-view:358, model-effort:95, settings-view:459, runtime views, workspace-view:169) | Home rows, flow rows, sidebar, Settings rows, menus |
| code | L | 1 (settings.developer) | Settings nav |
| copy | L | copyAction ×~14, chat-actions ×3, user-message.mjs:100 | inspector, materials, runtime, markdown, message actions |
| cpu | L | 2 (runtime-management-view.mjs:199, 428) + settings.models | Settings nav, runtime rows |
| database | L | 1 (settings.memory) | Settings nav |
| download | L | 1 (message.download, inert) | file action menu |
| ellipsis | L | menu.more ×3 | sidebar rows, message and file actions |
| external-link | L | 2 (app.mjs:5934 "Sign out"; message.open-with, inert) | account menu, file action menu |
| file-text | L | 6 + toolGlyph + file.object | flow rows, workspace, materials, inspector, Settings preview |
| folder | L | app.mjs:2229; ws_list; workspace.object ×4; message.reveal | sidebar projects, composer chip, tool rows |
| git-branch | L | 1 (message.fork, inert) | message menu |
| house | L | 2 (Home; settings.account) | sidebar, Settings nav |
| key-round | L | 2 (Account row; settings.permissions) | account menu, Settings nav |
| keyboard, palette, sliders-horizontal, database, code, book-open | L | 1 each | Settings nav |
| maximize-2 / minimize-2 | L | 1 (app.mjs:4282) | preview header |
| message-square | L | 2 (home-view.mjs:55; chat-page.mjs:37) | Home and Chat page rows |
| panel-left | L | 1 (app.mjs:7426) | header |
| panel-right | L | 4 (app.mjs:4278, 7429, 7430; presentation-facts.mjs:52) | header, presentation card |
| paperclip | L | 3 (app.mjs:7433, draft-attachments.mjs:7, 37) | composer |
| pause / play | L | message.* (inert); play also check_run | message actions, tool rows |
| pencil-line | L | 1 (chat.rename) | object menu |
| pin, share-2, volume-2, thumbs-up, thumbs-down | L | 1 each (inert) | message actions/menu |
| plug | L | settings.tools + connection.object | Settings |
| plus | L | app.mjs:7424, 2250; chat.create, project.create, material.add | sidebar, menu, workspace |
| puzzle | L | plugin.object | Settings, runtime |
| refresh-cw | L | 19 | Refresh/Retry across Attention, materials, runtime, inspector, workspace |
| rotate-ccw | L | 2 (message.regenerate inert; chat-actions.mjs:126) | message actions |
| search | L | 2 (app.mjs:7452; grep tool) | nav filter, tool rows |
| settings-2 | L | 7 + runtime_* tools | account menu, model cards, Attention, runtime |
| square | L | 2 + message.stop-reading | composer Stop |
| square-pen | L | 3 + message.edit + settings.profile + ws_write | sidebar New chat, account menu, message edit |
| text-align-start | L | 1 | header Chat overview |
| trash | L | 1 (chat.delete) | object menu |
| x | L | 19 + surface.close, filter.clear | close, remove, clear, cancel |
| spark, attention, chat | D | 1 / 3 / 3 | sidebar seats, Attention, Chat page |
| expert, runtime-plugin | D | 0 | none |
| matter | D | 1 (app.mjs:2608) | flow row |
| runtime-tool/-mcp/-skill/-hook/-registry | D | RESOURCE_ICONS (runtime-view.mjs:6, 1153, 1526) | Developer runtime rows |
| runtime-profile | D | agent.profile ×~6 | composer strip, Settings |
| runtime-host-extension | D | 2 (app.mjs:2391, local-extension-view.mjs:35) | plugin rows |

Non-`icon()` marks: contextRing SVG (chat-measurements.mjs:24-45), 7-bar run-activity (styles.css:6346-6361), tab-activity dot/ring/square (styles.css:1875-1899), run-badge and composer-run-hint dots (styles.css:1690, 3357), avatar-mark (identity), contextCache bar (chart).

## 2. Findings

### Glyph

- **ICN-01** [code] All 62 glyphs conform to IC-2/IC-6 (vendor/icons.svg, tools/ui-vendor/courtwork/*.svg, ui-controls.mjs:96-121).
- **ICN-02** [code][shot] Hand-drawn runtime-* and expert/matter/spark/attention/chat: several strokes reach the 1px safe edge with round caps (runtime-mcp `M3 10H2`, runtime-host-extension `M12 4V2`, runtime-plugin pins to 2/22). `glyph-manifest.json` has no bbox measurement for the 8 runtime-* glyphs required by IC-8.
- **ICN-03** [code] palette/key-round fill dots are upstream idiom, not state. No violation.
- **ICN-04** [code] Zero call sites: arrow-down, runtime-plugin, expert. Plugins render `puzzle` although the runtime-plugin provenance note says "not a puzzle piece".
- **ICN-05** [code] Marks outside canonical geometry: contextRing (viewBox 20, stroke 1.4, gradient stroke), run-activity bars as the glyph of an actionable button, 7px tab-activity CSS shapes. Whether IC-6 covers them is ambiguous.
- **ICN-06** [code] No text character fakes an icon; arrows, breadcrumb `›`, keycaps and diff marks appear only as prose or key labels. Compliant with IC-9.
- **ICN-07** [code] Drift: `glyph-manifest.json` lists 49 symbols with a stale spriteSha256; the sprite has 62. The product-icons README says "44 + 5". app.mjs:4294 comment says there is no back glyph, but arrow-left ships.

### Set

- **ICN-10** [code, inf][shot] `size` is inert: styles.css:540-545 sets `.ui-icon` 18×18 over the attributes from `icon()` (default 20; comment "16 row, 18 control, 20 nav", ui-controls.mjs:91-96; CSS comment styles.css:4765-4768 differs; unit test asserts only the attribute, product-icons.test.mjs:60-61). Examples: Chat h1 passes 24 renders 18 (chat-page.mjs:66); facet h2 passes 20 (chat-page.mjs:44); Home Activity chevron passes 14 renders 18 (home-view.mjs:371); project row default 20 renders 16 through overrides (styles.css:2998, 4769).
- **ICN-11** [inf][shot] 14px rules at styles.css:870, 1254, 1305, 2034, 3285, 3292 appear overridden by later 16px rules in 4769-4778; the 14 tier may never render.
- **ICN-12** [code][shot] Composer controls row: paperclip 18; File access is a native `<select>` on Home but a button with Lucide chevron-down 16 in a chat; the model button has no disclosure mark despite aria-haspopup (index.html:352); Stop is an outline `square` at 16 in Send's slot (arrow-up 18).
- **ICN-13** [code][shot] Message actions: assistant row 16 in 32 boxes; file-role row uses the same component at 18. Six assistant controls (read-aloud, stop-reading, like, dislike, regenerate; fork/share/pin in menu) are drawn inert with aria-disabled and opacity .55 (styles.css:3148, 3379). Fine-pointer rows are opacity 0 until hover/focus (styles.css:6270-6279).
- **ICN-14** [code][shot] Sidebar: icon-only back/forward and New chat at 18 beside icon+label Home/seats at 16; project rows carry chevron + folder + hover-only plus; session rows carry no glyph.
- **ICN-15** [code][shot] Settings nav: 13 tabs at 18 vs sidebar navigation at 16. Account = house (same as Home); Profile = square-pen (same as New chat and Edit message); account menu's Account uses key-round, also the Permissions tab.
- **ICN-16** [code][shot] Object menu glyph requested 16 renders 18; the blank spacer renders 16, so labels may misalign by 2px. Account menu: Preferences and Settings both settings-2; Sign out uses external-link.
- **ICN-17** [code][shot] Preview tabs: no type glyph; close `x` 18 in a 24 target (44 on coarse); activity mark is a 7px CSS shape with an sr-only word; `title=` duplicates aria-label; inert `vertical-align`.

### Component

- **ICN-20** [code][shot] Icon/label alignment is flex `align-items:center` everywhere; no baseline alignment, no per-glyph optical offsets; font stack has no CJK family and no `:lang()` rules (styles.css:414-421, `<html lang="en">`). Chrome copy is English, but user data (project, chat, workspace, file, Agent names, account) can be CJK or mixed and sits beside icons. Optical match needs screenshots.
- **ICN-21** [inf][shot] Two-line rows (home-row, chat-row) and wrapping flow-row titles center the glyph on the whole block, not on the title line.
- **ICN-22** [inf][shot] Optional glyphs give ragged title x positions: Home blocks mix glyph/no-glyph rows; `toolGlyph()` returns null for unknown tools and `flowRow` renders no spacer (ui-controls.mjs:143). The object menu already uses a blank spacer.
- **ICN-23** [code] Rendered tiers: icon-only buttons in 28 controls → 18; rows, chips, message actions → 16; Settings tabs → 18; file-role actions → 18; preview close → 18 in 24. VSG micro/compact expects 14–16; the 18 tier comes from WK-13, which predates VSG.
- **ICN-24** [code] One glyph, several meanings: settings-2 (Preferences, Settings, Model & effort, Change model, Add provider, Edit connection, Configure Attention runtime, runtime tools); chevron-right (disclosure and go-to); x (close, remove, clear, cancel regeneration); plus (new project, new chat, add material); square-pen (New chat, edit message, Profile, write tool); external-link (Sign out, Open with); house (Home, Account); key-round (Account, Permissions); paperclip (chat files and draft attachments); refresh-cw (Refresh and Retry).
- **ICN-25** [code] One action, several drawings: Refresh as glyph in ~15 places but text in attention-view.mjs:244; Retry loading icon-only in materials-view.mjs:157, 504, 694 but labelled elsewhere (IC-1 requires visible text); four disclosure mechanisms (JS chevron swap, rotated trailing chevron, rotated leading chevron, ~60 native `<details>` markers); Back as arrow+label vs text-only; copy success by colour only; two user-message action implementations.
- **ICN-26** [code] Every icon-only control has a name (`setAction` throws without one). toggle-nav keeps a static name despite aria-expanded; Open/Hide preview share one glyph; run-activity and context-ring buttons' glyphs do not suggest their meaning; on touch, icon-only controls are identified by glyph alone.

### Page

- **ICN-30** [code][shot] Glyph on every row: sidebar project rows (chevron + folder), trailing chevron on Home rows that are already buttons, file-text on every workspace/material row, domain glyph on every runtime row, all 13 Settings tabs, flow rows.
- **ICN-31** [code][shot] Icons in headings: Chat h1 and facet h2 (chat-page.mjs:44, 66), cpu in an h4 (runtime-management-view.mjs:428), local-extension-view.mjs:35, attention-view.mjs:232.
- **ICN-32** [code][shot] Status by glyph/colour: 7px tab-activity shapes, copy success colour-only, context ring arc with value only in tooltip/popover, like/dislike/pin selection by background tint only, unavailable actions by opacity.
- **ICN-33** [code] Animations respect reduced motion (run-activity.mjs:96-99); dots pulse (styles.css:3366).

## 3. Needs real-UI capture

ICN-02, 10, 11, 12, 14–17, 20–22, 30–32; especially computed `.ui-icon` width for chat h1, Home Activity chevron, object-menu glyph vs spacer, project chevron, Stop; glyph centre vs CJK project and chat names at 11.5–14px; runtime-* density at 16 beside Lucide neighbours.
