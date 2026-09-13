# Verification — Colophon candidate

## XML / SVG validity

- Both SVGs are well-formed XML with a single root `<svg>` element.
- Namespace `xmlns="http://www.w3.org/2000/svg"` declared on the root.
- All elements properly closed: self-closing `<rect … />` and `<path … />`; paired `<g>…</g>` and `<title>…</title>`.
- No processing instructions, CDATA sections, entity references, or deprecated SVG attributes.
- Path data uses only M, H, Q, V, Z commands — no relative or arc segments.

## External resources

**None.** No `<use href>`, `xlink:href`, `<image>`, `<foreignObject>`, `<style>` with `@import` or `url()`, `<script>`, or data URIs. All geometry is inline SVG primitives.

## Embedded fonts / bitmaps / scripts

**None.** No `<text>`, `<tspan>`, `@font-face`, `<font>`, `<image>`, `<script>`, `<foreignObject>`, or `<style>` elements. The mark is text-free geometry with no font dependency.

## Light / dark behaviour

### Monochrome (`colophon-mark.svg`)

All fills are `currentColor`. The mark inherits the host element's CSS `color`:

- Light background + dark `color` → dark mark.
- Dark background + light `color` → light mark.
- No background is drawn; the mark is transparent. The host must ensure sufficient contrast.

### Tritone (`colophon-mark-tritone.svg`)

Fills are fixed hex values (#242d33, #c95e55, #6f7e88):

- Designed for light backgrounds. On dark backgrounds the L-path (#242d33) will have insufficient contrast.
- No dark-mode tritone variant is included; producing one is a separate palette decision.
- Hosts should switch to the monochrome variant on dark backgrounds or provide an inverted tritone.

## `currentColor` behaviour

| Embedding method | `currentColor` resolves to | Notes |
|---|---|---|
| Inline `<svg>` in HTML | Host element's computed CSS `color` | Full control; recommended |
| `<object>` / `<embed>` | Default (typically black) unless styled via the SVG's own stylesheet | Partial control |
| `<img src>` | Black (#000000) | `<img>` does not inherit host CSS; use `alt` for accessible name |
| CSS `background-image` | Black (#000000) | Invisible to assistive technology; provide accessible name separately |

## Keyboard / screen-reader treatment

### Inline `<svg>`

- `role="img"` tells assistive technology to treat the SVG as a single image, not to expose its internal tree.
- `aria-labelledby="colophon-title"` points to the `<title>` element (accessible name: "les Privilege").
- Do **not** add `role="presentation"` or `aria-hidden="true"` unless the mark is purely decorative and the name is provided elsewhere in text.
- The mark is not interactive; do not add `tabindex`. If the mark is wrapped in an interactive element (e.g. a home link), the wrapper provides the focus target.

### `<img>` embedding

```html
<img src="colophon-mark.svg" alt="les Privilege" width="64" height="64">
```

The `alt` attribute provides the accessible name; the SVG's internal `<title>` is not exposed via `<img>`. Set `width`/`height` to prevent layout shift.

### CSS background

The image is invisible to assistive technology. Provide the accessible name through other means (visually hidden text, `aria-label`).

## Size considerations

- viewBox `0 0 64 64` is compatible with 64×64, 32×32, and 16×16 rendering.
- At 16×16: bar 3 (viewBox width 11) renders at ≈ 2.75 px — legible but thin. Below 16×16, consider a simplified two-bar or single-shape fallback.
- At 32×32 and above: all three bars are clearly distinct.
- `translate(4.5 0)` may produce sub-pixel coordinates at some sizes; anti-aliasing handles this without visible artifacts at common sizes (16, 32, 48, 64, 128, 256).

## Colour roles (tritone)

| Element | Hex | Role | Constraint |
|---|---|---|---|
| L-path | #242d33 | Structural dark / primary body | Not for background or surface fill |
| Bar 1 | #c95e55 | Brand identity red | Never error, active, review, permission, diff, or safety state |
| Bar 2 | #6f7e88 | Subordinate grey | Secondary/muted elements |
| Bar 3 | #6f7e88 | Subordinate grey (shared) | Same constraints as bar 2 |

## Scope of this verification

This document covers offline SVG structure, accessibility markup, and known embedding contexts. It does **not** constitute:

- Astra visual review or brand approval
- Independent accessibility audit (WCAG AA/AAA contrast against specific backgrounds)
- Paper integration review
- Product adoption or deployment authorisation
- Legal trademark or IP clearance
- Cross-browser rendering test
