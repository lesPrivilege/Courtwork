# Settings resource-management grammar audit · 2026-09-13

Luna non-author review of the Plugins Settings group and shared Context intake against Tools & Integrations, Skills, and Developer. The comparison baseline is `c1bdaa9`. The parent author captured steps 1–5 at 1280×720 in light theme on `127.0.0.1:8847?updated=6bb58cd`, then captured follow-up steps 6–10 at 1280×720 in the synthetic iAB while exercising Context intake and the Plugin editor focus fix. Step 11 was captured at 1280×720 in light theme after the prose typography correction. Luna inspected the saved files before drawing conclusions. The Plugin list and local extension are synthetic. No path was entered and no package was registered.

The comparison uses the existing [frontend continuity contract](../../agent-interface-2026-09-10/frontend-contract.md), [UI composition standard](../../ui-composition-standard.md#信息预算与跨面编排2026-09-13), [copy audit convention](../../copy-convention.md#信息架构审计标记2026-09-13), [component contract](../../../../docs/interface-components.md#settings), and the delivered [Settings container](../../frontend-audit-2026-09-13/hierarchy-polish/README.md) and [Runtime reading area](../../frontend-audit-2026-09-13/runtime-hierarchy/README.md). The new group reuses the shared `.settings-sections` panel and flat `.settings-block` separators. `renderPlugins()` uses the existing `resourceRow()` anatomy for installed/running/exposed/permitted facts, then native `details` for provided resources and host lifecycle. Its screen hierarchy is page title `Plugins` → block title `Installed plugins` → object rows, the same page/block/object level used by the neighboring groups. The puzzle glyph identifies Plugins while Models retains its CPU glyph.

## Captured steps

1. **Plugins — healthy.** The header, installed-plugin list, four fact columns, resource disclosures, permissions link, and host-management disclosure use the shared Settings hierarchy. The page is sparse because it contains package objects rather than an explanatory form; visible state labels and the two destination links make that density appropriate. No visual grammar or copy change is warranted from this screen. Screenshot-only accessibility limits apply.

   ![Step 1 — Plugins](01-plugins.png)

2. **Tools & Integrations — healthy comparison.** The MCP intake, capability title/helper, scope strip, Configurable/Inventory tabs, and resource rows provide the old-section reference. Their section-level title/helper differs in length from Plugins because it explains MCP setup and policy; Plugins’ state-first package rows do not need a duplicate helper paragraph. The bottom row is clipped by the scroll viewport and remains in the content panel. Screenshot-only accessibility limits apply.

   ![Step 2 — Tools & Integrations](02-tools.png)

3. **Skills — healthy comparison.** The longer helper sentence explains four different admissions that matter to this group; it is correctly more detailed than the Plugins block. The group title, scope strip, empty result, inspector heading, and native disclosure stay on the same type and separator system. No local vocabulary drift found in the captured state. Screenshot-only accessibility limits apply.

   ![Step 3 — Skills](03-skills.png)

4. **Developer — healthy comparison.** `Runtime`, `Overview`, scope details, and runtime facts form the expected block/sub-block hierarchy. The host-trust and sandbox limitation appears in Developer, where the host operation belongs; lifecycle is not pulled into the Plugins status rows. Deeper Runtime and extension content extends below this captured viewport. Screenshot-only accessibility limits apply.

   ![Step 4 — Developer](04-developer.png)

5. **Host Extensions intake — healthy form hierarchy; one observed exit-focus blocker.** The form and its host-scope/manifest instructions sit under `Developer › Host Extensions`, consistent with the settings form and technology-detail layers. The captured state shows the editor open. When the parent author closed it, focus fell to `AXWebArea`, leaving no focused return point; that close observation is author-run behavior evidence, not a screenshot of the closed state. The candidate patch restores focus to the collapsed Add local Plugin toggle when the rerender removes the focused close toggle. Luna inspected that narrow source change and ran `node --test app/tests/local-extension-view.test.mjs`: 2/2 passed, including close and a subsequent collapsed rerender. This verifies the bounded DOM-replacement case; it is not a full screen-reader or browser accessibility pass.

   ![Step 5 — Host Extensions intake](05-host-extension-intake.png)

6. **Context intake — healthy preview hierarchy.** The Instruction editor keeps the type, scope, name, content, identity disclosure, configuration preview, and save action in the established form sequence. This author capture shows the pre-fix candidate, where the prose example's content textarea is monospaced; the current CSS correction is source-verified below.

   ![Step 6 — Instruction preview](06-instruction-preview.png)

7. **Context resource search — healthy object-row reuse.** The filtered Instruction result uses the existing resource-row facts and selection treatment, so the shared resource type joins the current list grammar instead of introducing a separate card or status vocabulary.

   ![Step 7 — Resource search](07-resource-search.png)

8. **Context resource edit — healthy form reuse.** Editing keeps the resource type fixed and follows the same scope, name, content, identity, and action order as intake. Focus is visibly placed on the name field in this capture.

   ![Step 8 — Resource edit](08-resource-edit.png)

9. **Context resource type change — focus retained.** Changing Skill to Reference leaves focus on the type selector through the rerender, preserving keyboard continuity while the selected form changes.

   ![Step 9 — Resource type focus](09-resource-type-focus.png)

10. **Local Plugin editor close — focus return visible.** The follow-up capture shows focus restored to `Add local Plugin` after the editor closes, resolving the earlier exit-focus observation for this candidate. The targeted DOM test remains 2/2 passing; neither evidence source is a full assistive-technology audit.

   ![Step 10 — Local editor focus restored](10-local-editor-focus-fixed.png)

11. **Instruction prose typography — corrected and visually confirmed.** With the latest source, English and Chinese prose in the freeform Instruction field use the ordinary interface font. The intake's type, scope, name, and content sequence stays consistent with the earlier capture, and the empty draft has not been saved.

   ![Step 11 — Instruction prose face](11-resource-prose.png)

## Action items

1. **Resolved in the current candidate:** Focus restoration in [local-extension-view.mjs](../../../../app/web/local-extension-view.mjs#L14) returns to the collapsed toggle that initiated the disclosure. The follow-up author capture shows focus on `Add local Plugin`, and [local-extension-view.test.mjs](../../../../app/tests/local-extension-view.test.mjs#L26) passes 2/2. This covers the observed rerender case only.

2. **Polish, source-only; addressed in the author’s current candidate:** The MCP Inventory empty state said “No package is installed.” in [runtime-view.mjs](../../../../app/web/runtime-view.mjs#L2021), although nearby copy calls these “Configured MCP servers” and the new group reserves “Plugins” for plugin packages. The parent author has changed it to “No MCP server is configured.” That wording fits the section and the observed resource fact. The captured Tools screenshot is on Configurable, so this was a source finding rather than a visual observation.

3. **Polish, resolved in the current candidate:** Step 6 exposed that `.runtime-intake-field textarea` applied the mono face to freeform Instruction prose. Current [styles.css](../../../../app/web/styles.css#L6676) inherits the established body face for intake textareas and scopes mono to `.runtime-intake[data-intake="skill"] textarea` on line 6677. This preserves the machine-text treatment for `SKILL.md` while fixing Context prose, consistent with the [composition standard](../../ui-composition-standard.md#L142). Step 6 records the pre-fix display; step 11 visually confirms the updated English and Chinese prose.

No blocking hierarchy, density, spacing, icon, or visible wording issue remains in the captured candidate. The screenshot set covers only 1280×720 light mode and the listed populated/empty views. This audit did not independently check dark mode, narrow layouts, 200% zoom, forced colors, screen-reader output, loading/error states, or the MCP Inventory tab. It does not make a full accessibility or Release acceptance claim.
