# SKIN-R2 P1 computer-use AFTER evidence

- Capture time: `2026-07-19T22:58:33+08:00`
- Repository HEAD during capture: `f6f294857827524bd203f8dd11ab007f72c05f96`
- Capture subject: the shared worktree's uncommitted P1 CSS consumption implementation.
- Source fingerprint at capture: `apps/desktop/src/styles.css` SHA-256 `1099f76889dc13a364da5ef6b3e12830f6d766dc32e5a0166c7ac7c82bf51f14`.
- Inner app origin: `http://127.0.0.1:18835/`
- Browser: Safari `26.5.2` on macOS `26.5.2 (25F84)`.
- DPR: `2`, reported by the Safari fixture title probe and cross-checked by Retina screenshot pixels divided by logical capture points.
- Display: built-in Retina; hardware `2560×1664`, logical desktop `1470×956`.

## Frames

### RiskList / revision · 1280×720

- File: `risklist-1280x720.png`; Retina original: `risklist-1280x720.raw.png`.
- Direct, unscaled top-level Safari viewport.
- Safari `AXWebArea`: position `0,146`, size `1280×720`.
- State: sample case → phase 2 contract review → revision preview → `R03` selected and evidence expanded.
- Full viewport captured; zero surface clipping.

### RiskList / revision · 2400×1000

- File: `risklist-2400x1000.png`; Retina original: `risklist-2400x1000-scaled.raw.png`.
- Exact Safari WebKit iframe viewport `2400×1000`; complete frame displayed at scale `0.58`.
- Inner accessibility web area: `Courtwork 2400 by 1000 exact viewport`, size `2400×1000`.
- Visible frame: `1392×580` logical points; raw capture `2784×1160` physical pixels; zero clipping.
- State matches the 1280 frame.
- The normalized delivery image is valid for layout, line hierarchy and state review, but is not native-scale antialiasing evidence.

### Settings · 1440×900

- File: `settings-1440x900.png`; Retina original: `settings-1440x900-scaled.raw.png`.
- Exact iframe viewport `1440×900`, scale `0.8`, full transformed frame `1152×720` logical points.
- Route/state: welcome → user menu → `Settings & updates` → Model.
- M05 evidence: the Settings total header keeps its full double-line hierarchy.

### Visualization Gallery · 1440×900

- File: `gallery-1440x900.png`; Retina original: `gallery-1440x900-scaled.raw.png`.
- Inner route: `http://127.0.0.1:18835/visual-gallery.html`.
- Exact iframe viewport `1440×900`, scale `0.8`; full viewport captured.
- M06 evidence: gallery total header keeps its full double-line hierarchy; specimen boundaries use the reduced minor-line treatment.
- The gallery document is taller than one viewport (`AXWebArea` document height `1149`); the capture is the complete exact `1440×900` viewport, not a full-page scroll stitch.

### Session history · 1440×900

- File: `session-history-1440x900.png`; Retina original: `session-history-1440x900-scaled.raw.png`.
- Exact iframe viewport `1440×900`, scale `0.8`.
- Route/state: welcome → Chat → 历史会话 (empty state).
- M04 evidence: `.session-history-head` is a single minor rule.

### Compare / pane · 1600×900

- File: `compare-1600x900.png`; Retina original: `compare-1600x900-scaled.raw.png`.
- Exact iframe viewport `1600×900`, scale `0.8`; full transformed frame `1280×720` logical points.
- State: sample case → phase 2 contract review → revision preview → Compare, with draft pane visible.
- M02 evidence: `.pane-head` uses a single minor rule while the total workspace header remains hierarchical.

## Capture method and limitation

The built-in display cannot expose top-level `1440×900`, `1600×900` or `2400×1000` Safari content viewports without clipping. Those frames therefore use the reproducible `safari-exact-wrapper.html`: the iframe itself has the exact requested layout viewport, while CSS scaling makes every edge visible on the physical display. The raw capture contains the entire transformed frame; the delivery image is resampled to one image pixel per source CSS point.

No capture is presented as native AA evidence except the direct 1280×720 top-level frame. No Safari preference or security setting was changed. No repository file was changed by this evidence session.

## SHA-256

```text
20592c9538dda56bd92641a167c79cbbdb1250f394fc02b3671af2874a892e22  risklist-1280x720.raw.png
8076321825e844944cc4b0a51a980c41d749030dc1b861c5eadd6abbb76e4292  risklist-1280x720.png
e3635d0086cfdae8f0915123f92b9d4f013e3777587d760cd92333645990db65  risklist-2400x1000-scaled.raw.png
ad3b2497b595b756284ddf7f118a34edc3e49d8a3ab4f83653d7887167bcf6a1  risklist-2400x1000.png
dee3e28871f7077f2a5ac0c25852b4d8d70b196b8667cf8dd15a6497fa2ff41d  settings-1440x900-scaled.raw.png
c0606efe2ca5882b5f47be1872befd712d9a290d12e056fc3ff0a22a576f9e55  settings-1440x900.png
803313254547c7f655da0768e00bb9124a240f2a95c2a2d86adc5d38ac582649  gallery-1440x900-scaled.raw.png
bd807160b317ee29fb4011d6fc500c83123bf5f01b81ad34bb097ce390cae663  gallery-1440x900.png
670ef865b53c99393e601d63d2ee9616515d94d8b139866b500b3569c0a07f1f  session-history-1440x900-scaled.raw.png
b044602d13e4b7897802de667f398d4afb8a8eca477331fce5a3b9b5575e803a  session-history-1440x900.png
bf43f2b39cd3d8f224ea455988f6adfc8c7268e0933e37fa8d0404519e96594d  compare-1600x900-scaled.raw.png
7c55a23b386f77929f0062d1c8e1b49332dde4fdcb7d6c377c13b9922fc26d19  compare-1600x900.png
9aaf10b8f130cfdbbd7c897a2fb0a884858db78115581decb11d13f63dbd6326  safari-exact-wrapper.html
```

After capture, the wrapper's outer canvas (outside the captured iframe) was changed from a raw colour to `transparent` so the evidence fixture itself remains inside repository colour governance. The iframe size, scale, application pixels and every delivered frame hash are unchanged.
