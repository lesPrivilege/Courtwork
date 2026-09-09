# Current-main product-page media

2026-09-10；这是六个 Pages 入口使用的独立产品截图回执。页面事实和源码链接固定到当前 main `774a3bd073bc1845d9bacde22da657b44df673d1`；旧的离线 specimen 仍由 `site/release.json` 固定到 `9e5384f`，两套证据不混用。

## Capture

媒体在当前 main 的隔离 checkout 中，由独立合成数据目录和本地 deterministic provider 录制：

```sh
node site/scripts/capture-media.mjs \
  --origin http://127.0.0.1:8966 \
  --source-sha 774a3bd073bc1845d9bacde22da657b44df673d1 \
  --media-dir media/main \
  --cdp-port 19972
```

The resulting receipt is [site/media/main/manifest.json](../../site/media/main/manifest.json). It contains 12 PNGs: six UI states, with light/dark variants where the state supports both themes, plus the 390px Home and review captures. Every record carries the full source SHA, setup, limitation, byte count, and SHA-256.

The six page images deliberately cover Home, approval attention, answered question, file preview, Continue in Work, review pending, and Models configuration. Tour still keeps running, matter replay, integrations, and the remaining Settings states visibly reserved; an image is never used to claim a state that was not captured.

## Verification

Build and page checks were run from the same isolated checkout:

```sh
node site/build.mjs
node site/scripts/check-links.mjs
node site/scripts/check-material.mjs
node tools/check-doc-links.mjs
node site/scripts/verify.mjs --origin http://127.0.0.1:8967/Courtwork/
node site/scripts/verify-product-pages.mjs \
  --origin http://127.0.0.1:8967/Courtwork/ \
  --out site/verification/product-pages-main-20260910
```

Results: homepage `18/18`, product pages `36/36`, links/material/docs checks passed. The browser run covered six pages in light and dark themes, 390px, 1440px, and 200% scale; all reported zero horizontal overflow and no foreign requests. The generated per-page screenshots and JSON receipt are retained under [site/verification/product-pages-main-20260910](../../site/verification/product-pages-main-20260910/).
