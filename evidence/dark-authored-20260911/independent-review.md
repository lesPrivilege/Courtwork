# Independent review · dark authored surface amendment

Date: 2026-09-11 (Asia/Singapore). Reviewer: Luna Continuity. This is an independent bounded review; it does not self-accept the product, close WO-VS-01, certify native accessibility, or authorize merge, deployment, or release.

## Result

**Pass for the reviewed amendment; no blocking finding.** The fixed product commit `5e3a504177e8d5c84471fb73c41388ea9de9952e` changes only the authored-surface role in `app/web/styles.css`. Explicit dark and system-dark selectors resolve `--authored-surface` to the existing `--float` role; light keeps the existing authored dark plane. The later forced-colors rule resolves the message to `Canvas`/`CanvasText`, preserving the accessibility override.

## Source and cascade checks

- `app/web/styles.css:5907-5927` keeps the S→R→U split, maps the dark authored surface to `var(--float)`, and scopes the dependent message content tokens locally. No runtime, state, glyph, composer, or authority path changed in `5e3a504`.
- `:root[data-theme="dark"]` applies for explicit dark. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) ... }` applies for system dark while leaving an explicit light choice out. Both selectors are after the base authored role and use the existing dynamic `--float` role, so the skin’s established L2 value is consumed.
- `app/web/styles.css:5928-5931` is later in the cascade and directly sets the authored content to `Canvas`/`CanvasText` under forced colors, including nested Markdown, links, and summaries. This override is structurally preserved.

## Evidence

The recorded browser measurements show the expected rendered colors:

| Mode | Reading plane | Authored message | Composer | Text contrast on authored message |
|---|---|---|---|---:|
| dark, 1440 | `rgb(34, 38, 39)` | `rgb(46, 51, 53)` | `rgb(46, 51, 53)` | 11.91:1 |
| light, 1440 | `rgb(244, 245, 246)` | `rgb(32, 36, 38)` | `rgb(255, 255, 255)` | 14.56:1 |
| dark, 390 supplemental capture | `rgb(34, 38, 39)` | `rgb(46, 51, 53)` | `rgb(46, 51, 53)` | same rendered values |

The 1440 before/after images show the dark authored bubble moving onto the same raised plane as the composer while the reading plane stays darker. The supplemental 1280 and 390 dark captures preserve that depth relationship at narrower widths. The 1440 and supplemental 390 light captures preserve the existing dark authored bubble on the light reading surface. These are visual checks, not pixel-diff goldens; the shell disclosure and scroll position differ between before and after captures.

Commands run against the fixed tree:

```text
node tools/lint-colors.mjs       # ok
node tools/lint-materials.mjs    # ok
node tools/contrast-report.mjs   # shipped role report passes
npm test                         # 767 pass, 0 fail, 0 cancelled, 0 skipped
```

The supplied rendered-contrast record reports dark authored text at 11.91:1 and light authored text at 14.56:1. No source-level selector conflict was found in the reviewed evidence.

## Limits and follow-up

This review covers source/cascade behavior and the available synthetic browser captures at 1440, 1280, and 390. It does not claim native VoiceOver, IME, forced-colors emulation, OS theme switching, real browser 200% zoom, or real provider behavior. The added 1280/390 captures and responsive metric file were supplemental uncommitted evidence in the review checkout; they are not part of fixed commit `5e3a504`. `git diff --check 5e3a504^ 5e3a504` reports one trailing blank line at EOF in the amendment’s existing `contrast-report.md`, which is evidence hygiene only.
