# SK-2 · Appearance boundary and compatibility

Base: main `a579929`. Product/test commit: `c415012`. Astra implemented the shared policy, fixed roles and Appearance flow; Luna Explore authored the new policy/static-route tests. Isolated checkout, independent synthetic runtime and Chrome profiles; no personal workspace or credential data, paid provider or deployment.

## Contract / changes

[Skin constitution](../../engineering/design/skin-injection-2026-09-10/skin-constitution.md), [migration order](../../engineering/design/skin-injection-2026-09-10/migration-notes.md), [frontend contract](../../engineering/design/agent-interface-2026-09-10/frontend-contract.md) and [autonomous completion list](../../engineering/design/skin-injection-2026-09-10/autonomous-loop.md).

Nearest implemented precedents: SK-1 fixed Review and local contrast probe (`1d34cec`); WK12 first-frame Appearance application; CC-I PropertyRow (`settingsRow` / `createPreferenceGovernance`). No new component library, domain fact or runtime schema.

`skin-policy.js` is one synchronous, DOM/storage-free policy for both first paint and the settings module. Effective projection version 1 admits the full 21 appearance colors. The legacy reader recognizes 25 colors and the five old numeric material keys, but projection omits danger/success/material keys and reports their names. Unknown semantic keys, arbitrary CSS and non-opaque appearance colors cannot enter the effective stylesheet. The exact new static route is tested; directory fallbacks remain absent.

Review, danger, success, focus and material primitives are now scheme-owned. The legacy steel material aliases resolve from that fixed scheme recipe. Appearance may still change neutral surfaces and ordinary interaction colors; it cannot redefine those fixed roles. The stored string is retained verbatim across loading, switching themes/palettes, and Reset. Apply explicitly saves the entered modern text; Remove explicitly clears it. The editor distinguishes the saved original from an editable draft, offers exact original export and an explicit legacy-to-editable draft action, and lists ignored/invalid values. A storage write failure is labeled session-only with current-token export; reload still sees the previously saved value.

Keeping Advanced open on Reset repairs the formerly hidden Palette focus target; Remove also returns focus to Palette. Existing labels, selection semantics, geometry, spacing, motion and domain actions remain the nearest local patterns.

## Author verification

- [55 tests](tests.log): `node --test app/tests/skin-policy.test.mjs app/tests/settings-preferences.test.mjs app/tests/runtime-workbench.test.mjs app/tests/settings-navigation.test.mjs app/tests/home-presentation.test.mjs app/tests/static-web-manifest.test.mjs`.
- [Policy browser](policy-browser.json), [reproducer](checks-policy.mjs): actual app before-body probe; legacy raw preservation; rejected semantic injection before paint; 18 system/scheme/preset/custom combinations compare all fixed semantic/material roles.
- [Editor browser](editor-browser.json), [reproducer](checks-editor.mjs): exact downloaded original; stored-to-draft conversion; explicit Apply; Reset keeps raw and visible focus; Remove clears raw/returns focus; invalid input does not apply; simulated storage failure remains session-only and reload restores the saved set.
- [Layout browser](layout-browser.json), [reproducer](checks-layout.mjs): real Appearance page and editor at 1440/1280/390 × light/dark with zero horizontal overflow and no missing button names; chosen light/dark fixture has no contrast warnings. [Desktop](editor-light-1440.png), [narrow](editor-dark-390.png), [200% equivalent reflow](editor-zoom-200.png), [forced colors](editor-forced-colors.png). Full Appearance and other matrix screenshots live alongside these; candidate evidence, not replacement goldens. Astra inspected the four linked outputs.
- [Preset contrast report](contrast.md) passes. Color, material and interaction lint pass. No new blur consumer. High-contrast/reduced-transparency media remain usable; the zoom fixture halves CSS viewport and doubles pixel density, rather than claiming a native host zoom shortcut run.

Reproduce with `node app/server/index.mjs --data-dir <independent-synthetic-directory> --port 19248`, then the three check scripts above. The browser helper defaults to that origin and isolated CDP port 21248; use environment overrides to avoid other writers. It cleans up its own temporary profile. Screenshots have unchanged synthetic data per scheme/viewport.

## Independent review / remaining scope

Luna Continuity independently reviewed fixed `c415012`: 36/36 targeted tests and separate parser/browser counterexamples pass; no bounded blocker. Transparent/semantic input falls back before first paint, raw values survive, and valid→invalid application clears stale CSS. The 390 dark and 1440 light Appearance screenshots show no layout blocker. One diagnostic-only quirk was corrected afterward: unparseable input reports sourceFormat `invalid` rather than `legacy`, with empty effective CSS unchanged. No full backend suite rerun is claimed for this frontend/static-route change. RV26's existing full-suite timing failures retain their own record.

SK-3 Dystopia and SK-4 state/material audit plus complete Home/Attention composition checks remain next. This slice does not close the autonomous completion list, G1–G5, native-host acceptance or deployment gates.
