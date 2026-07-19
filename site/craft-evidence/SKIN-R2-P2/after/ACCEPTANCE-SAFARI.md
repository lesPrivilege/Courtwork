# SKIN-R2 P2 · independent Safari exact AFTER

- Capture time: `2026-07-20T00:32:12+08:00`.
- Accepted implementation candidate: `20f9667ac416e966980e5faab71c61e4c2515e9d`.
- Governance parent: `52c61588233f5ed4f5fcf1d6e12fcfd201c6ba14`.
- Browser: Safari `26.5.2` on macOS `26.5.2 (25F84)`.
- DPR: `2`.
- Exact layout viewport: real Safari WebKit iframe `1600×900`, displayed at CSS scale `0.8`.
- Safari title probe: `frame=1600x900 | scale=0.8 | outer=1440x746 | dpr=2`.
- Safari accessibility probe: inner `AXWebArea` description `Courtwork 1600 by 900 exact viewport`, size `1600×900`.
- Runtime state: sample case → `先查看演示` → revision preview → `Compare`.

## Independent finding

The normalized full frame shows the comparison state with the actual CaseRail absent: the only left-edge rail control is the existing `Expand sidebar` control in chrome. The composer shell remains wholly inside the conversation column and ends before the right workface begins; no composer surface crosses into the comparison workface. The complete right edge and bottom edge are present, so this is not a crop that hides overflow.

This evidence was acquired through Safari accessibility actions, not Chromium automation. Safari WebDriver remained unavailable and returned:

> Could not create a session: You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.

Safari Apple Events JavaScript was also unavailable and returned:

> You must enable 'Allow JavaScript from Apple Events' in the Developer section of Safari Settings to use 'do JavaScript'.

Neither setting was changed. Those two paths were not needed for the capture: System Events accessibility was available, exposed the exact inner WebArea and performed the real Safari button presses. The raw frame was captured from Safari's own window layer, excluding unrelated desktop overlays. It contains the full transformed iframe at Retina resolution (`2560×1440`); the delivery frame is normalized once to the source layout size (`1600×900`). It is authoritative for layout and state, but is not claimed as native-scale 1:1 antialiasing evidence.

## Source and artifact hashes

```text
6d6780cd99de4ee80b0bf86e17cd90a8589800ad5f5d4cdbce6ef3e28d37ac80  apps/desktop/src/styles.css
b66f12d02937c006366ba020fd87b8efcce64803730f4d4d118646ee07b82751  apps/desktop/src/App.tsx
9aaf10b8f130cfdbbd7c897a2fb0a884858db78115581decb11d13f63dbd6326  site/craft-evidence/SKIN-R2-P1/after/safari-exact-wrapper.html
335b89c9806b79b80643e1d5317d07c44a7e8940a6fa2e6b60849f90b2cd97c4  acceptance-compare-1600x900-safari-scaled.raw.png
1a21d98a81be9edfedd8c1792bac72269f4f33f963c4fc42a905bc55c8e03046  acceptance-compare-1600x900-safari.png
```
