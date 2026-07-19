# SKIN-R2 P4 independent reacceptance shell check

Target: `962c51338dafa315447beeb8da2956ae5a3a4e0b`.

This evidence was captured by the second independent P4 acceptance session
from a fresh clone. The session started the target in the real Tauri WKWebView
against an isolated Vite server on port `19512`, opened Settings through the
live command palette, selected Appearance through the macOS Accessibility
tree, and captured the live CGWindow. Both processes were stopped afterwards
and the port was released.

macOS was in Dark appearance. The live Settings surface displayed `Theme mode:
System` while the shell resolved to the dark palette. The independent browser
path separately asserted that the document root exposes `data-theme="dark"`
and no `data-theme-mode`; the true-shell screenshot confirms that the same
resolved palette and System setting are consumed by WKWebView.

The screenshot SHA-256 is identical to the first independent acceptance frame.
`git diff f8d10b5..962c513` is empty for `tokens.json`, `styles.css`, and the
settings implementation, so the previously recalculated hairline, strong,
focus, and disabled values remain directly applicable. The repair changes only
the drift guard and its tests, not the approved consumption values.

Files:

- `tauri-dark-settings.png`: 3424x2024 physical px; SHA-256
  `4da29f197fdb785bb1d250a82e1f1acbb3b5544ce1ea635f4d4b9dc2e84c55da`.
- `tauri-shell-check.json`: target, system, runtime, isolated port, AX
  observations, byte-equivalence finding, and process cleanup.
