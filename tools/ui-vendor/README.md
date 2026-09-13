# Pinned local UI assets

Runtime assets are committed under `app/web/vendor`; the app has no CDN dependency. Rebuild from the exact npm lock and original Lucide paths:

```sh
npm ci --prefix tools/ui-vendor
node tools/ui-vendor/build.mjs
```

`lucide/sources.json` pins upstream commit and per-file hashes. `app/web/vendor/manifest.json` records npm integrity, output hashes, licenses and adaptations. Icon geometry is not redrawn; only packaged as native SVG symbols. Floating DOM is bundled as local ESM. Marked and DOMPurify distribution files are copied unchanged. Changing a pin requires rebuilding and reviewing the generated manifest.

`node tools/ui-vendor/build.mjs --icons-only` rebuilds the sprite and immutable
`icon-data.generated.mjs` from those same SVG files without npm or esbuild.
The app's `icon()` renders the generated shapes directly so newly opened controls
keep their glyphs after the Host disconnects. The sprite remains a provenance and
contact-sheet output. Unsupported shape tags or attributes fail generation;
extending that vocabulary requires reviewing the new pinned source.
