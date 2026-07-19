# SKIN-R2 P1 exact-frame evidence

- Capture time: `2026-07-19T22:25:32+08:00`
- Repository baseline: `main@27990dd498fb13a4f6c913284fc81039e70ab0e0`
- App route: `http://127.0.0.1:18832/`
- Browser: Safari `26.5.2` on macOS `26.5.2 (25F84)`
- Display: built-in Retina, hardware `2560×1664`; current logical desktop `1470×956`
- Runtime state: sample case `临江精铸 诉 起云智能 设备采购合同纠纷`, phase 2 contract review, revision preview, `R03` selected with evidence expanded.
- Entry actions: `Get started with the sample case` → `先查看演示`.

## 1280×720

This is a direct, unscaled top-level Safari viewport.

- Safari window bounds: `0,33,1280,866`.
- Accessibility `AXWebArea`: position `0,146`, size `1280×720`.
- Capture rectangle: `0,146,1280,720` logical points.
- Retina raw file: `1280x720.raw.png`, `2560×1440` physical pixels.
- Backing/device scale: `2`; independently reproduced in the same Safari session by the fixture title probe (`dpr=2`).
- Delivery file: `1280x720.png`, normalized one image pixel per CSS point.

## 2400×1000

The built-in display cannot expose a top-level `2400×1000` Safari viewport without vertical clipping. The evidence therefore uses a real Safari WebKit iframe whose layout viewport is fixed to `2400×1000`, then scales the entire frame to fit the display. This is not a clipped oversized window.

- Repro fixture: `safari-2400x1000-wrapper.html`.
- Iframe CSS and element dimensions: `2400×1000`, border `0`.
- Safari accessibility inner `AXWebArea`: description `Courtwork 2400 by 1000 exact viewport`, size `2400×1000`.
- Safari title probe: `frame=2400x1000 | outer=1470x769 | dpr=2`.
- Visual scale: `0.58`; complete visible frame: `1392×580` logical points.
- Retina raw file: `2400x1000-scaled.raw.png`, `2784×1160` physical pixels (`2400×1000 × 0.58 × 2`).
- Delivery file: `2400x1000.png`, normalized from the complete raw frame to `2400×1000`.

The layout viewport is exact and no surface edge is omitted. The normalized `2400×1000` image has passed through Safari's CSS scale and one resampling step, so it is valid for layout, line hierarchy, state and full-frame review, but it must not be presented as native-scale 1:1 antialiasing evidence. A native unscaled top-level 2400×1000 Safari screenshot remains impossible on the attached display unless Safari remote automation, a larger display, or another true WKWebView capture surface becomes available.

## SHA-256

```text
02de14a8571733da264a4b8058eddf7941f3e76cb84815721b448e2d4e793869  1280x720.raw.png
c17cb8f9ad2a474c9f38f54b4e6ca5b2a1038bad186d95ad7f664823d4398955  1280x720.png
deb81bc11b44a6739615b6435d3b2b33bf2e1f1b478baa51d39c5eb5a7a41e56  2400x1000-scaled.raw.png
b2be98d7209fe19ddaadb21f0e814bc575e1b80b5ab28b97c5ef4ad7622d3303  2400x1000.png
9f22a2f71d4c0e5b971126f782a769621c5afb11ec86c0915c1ceca1a7cb5419  safari-2400x1000-wrapper.html
```

The wrapper's outer canvas is `transparent`: it is outside the iframe capture surface and avoids introducing an ungoverned raw colour into the repository. This does not change the fixed iframe dimensions, scale, application pixels or delivered frame hashes.

## Environment constraints observed

- In-app Browser discovery returned no browser instance.
- Safari WebDriver reported that `Allow remote automation` is disabled.
- Safari Apple Events JavaScript reported that `Allow JavaScript from Apple Events` is disabled.
- No Safari preference or security setting was changed.
