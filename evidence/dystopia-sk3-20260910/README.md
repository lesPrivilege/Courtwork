# SK-3 / SK-4 · Dystopia and live appearance verification

Product commits: `7f92f69` (preset), `b7831b5` (system-theme diagnostics) and `a7ff5c8` (Settings deep-link return focus), following SK-2 `428d1a7`. Astra is the author; independent review is recorded separately below. Integration is pending other main-line work and does not follow from this branch receipt.

Dystopia is an authored cool neutral appearance palette, not an imported external theme. Its exact light/dark values are frozen in `7f92f69:app/web/styles.css`; all three selectors contain only the 21 version-1 appearance tokens. The same dark values serve explicit dark and system dark. It uses the existing surface hierarchy and monochrome interaction accent. Review, danger, success, focus, material, geometry and motion remain scheme-owned. Slate remains the default.

A single closed registry and resolver now serve startup and Settings. The contrast report reads the shipped preset blocks instead of an unused Gray steel source copy. Review is measured on the additional panel-muted and hover backgrounds used by real Home/Attention rows.

SK-4 found a concrete diagnostic defect: changing the OS scheme updated CSS but left custom-token contrast results stale (7 reported versus 11 actual pairs in the synthetic counterexample). A document-lifetime media listener refreshes only editor diagnostics when the preference is System, keeping draft text and keyboard focus. [Before](theme-live-before.json), [after](theme-live.json), [reproducer](checks-theme.mjs).

Settings keyboard verification also found that deep-link exit retained a non-focusable body opener and then attempted to focus the hidden Home title. `a7ff5c8` selects the visible Home composer fallback; other views keep the title fallback, and a visible original opener retains focus. The Settings browser checks cover Back from a deep link and Escape from the real desktop Settings button.

## Author evidence

- [57 targeted tests](tests.log): skin policy/presets, preferences, runtime workbench, Settings navigation, Home presentation and exact static routes.
- [Preset browser matrix](presets-browser.json), [reproducer](checks-presets.mjs): 18 system/scheme/preset combinations; fixed semantic/material values and Palette geometry match; selected Dystopia persists before first body; unknown choices fall back through the closed resolver.
- [Contrast table](contrast.md): all three shipped presets, light/dark, pass the registered pairs. Color/material/interaction lint pass. No new blur consumer.
- [Settings matrix](settings-browser.json), [reproducer](checks-settings.mjs): General, Appearance, Models and Keyboard at 1440/1280/390 in light/dark; no document overflow or panel clipping. Theme/preset preferences are saved and reloaded for each scenario. Includes keyboard Tab, Enter on Back to app, 200% equivalent reflow and forced-colors/reduced-transparency/reduced-motion. Native host zoom is not claimed. Astra inspected desktop Appearance, narrow dark Appearance/Models, zoom and forced-colors outputs.
- [Home/Attention surfaces](checks-surfaces.json), [reproducer](checks-surfaces.mjs): Luna executed 35/35 checks using real authenticated API records in all five states. Slate/Dystopia × light/dark × 1440/1280/390 has no horizontal overflow; only needs_you carries Review. Typed needs_you → resolved removes the marker, empty projects remain empty, and blocked loads show failure/retry without discarding records. 28 screenshots retained; Astra inspected desktop Home and narrow long Attention detail.
- [Material matrix](material-browser.json), [reproducer](checks-material.mjs): the existing DOM consumers resolve blur normally and no blur under reduced-transparency/forced-colors across all three presets and both schemes. Reduced-transparency uses opaque float. This checks computed existing elements, not a fabricated visible runtime state.
- SK-2's [original preservation, invalid input, storage failure and editor layout evidence](../skin-boundary-sk2-20260910/README.md) remains applicable; this slice does not replace those counterexamples.

The two existing blur consumers are `.jump-latest-button` and `.context-popover`; their reduced-transparency and forced-colors rules remove blur and use solid `--float`, with a CSS unsupported-blur fallback. No additional material consumer or domain status is introduced. Runtime/API state remains owned by its existing contracts.

Reproduce against an independent synthetic host on port 19249. Scripts accept `APP_URL` and `WK6_CDP_PORT`; each starts and cleans its own disposable browser profile. Do not use personal data or paid providers.

## Independent review and integration

Luna independently reviewed fixed `7f92f69` and `b7831b5`: 40/40 tests, an independent first-frame/mode/contrast browser matrix and the live diagnostic counterexample pass, with no bounded blocker. [Independent report](independent-review.md). Final return-focus follow-up review and main integration remain pending. FE-05a → FE-05 → ATT-FE-01 → CC-I, RV26, G1–G5 and Pages deployment keep their separate scope.
