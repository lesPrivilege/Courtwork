# SKIN-R2 P3 independent reacceptance evidence

Target: `e4fec988d145dbd97dfde8a5475071fbcd756357`.

This directory contains evidence newly captured by the independent reacceptance
session in a fresh clone. The session launched the repository's fixed fixture in
the real Tauri shell, read the live macOS Accessibility tree, and captured the
application window. It did not reuse the implementation frame or the earlier
acceptance session's frame.

The authoritative rerun independently observed AppleWebKit `605.1.15`, viewport
`1280×720`, DPR `2`, fixture width `385 CSS px`, and support for `allow-end`. The
positive fixture retained the comma on the preceding line and overhung by
`23 CSS px`; the otherwise identical `none` control shifted it down by
`39 CSS px`. The effect therefore reproduced in the authority shell.

Files:

- `tauri-wkwebview-authority.png`: live Tauri window capture, 2784×1664 physical
  pixels, SHA-256 `e25317bfbd361aee132e00165f018ec88a0e25141083949f1983a0fad4aed932`.
- `tauri-wkwebview-authority.json`: system, shell, measurements, source hashes,
  frame hash, capture method, and limitations.

The numeric verdict comes from the fixture's live WKWebView measurements exposed
through Accessibility, not from pixel inference. Chromium has no authority over
this acceptance point.
