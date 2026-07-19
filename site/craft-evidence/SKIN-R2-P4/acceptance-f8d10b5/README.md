# SKIN-R2 P4 independent acceptance evidence

Target: `f8d10b59eb3167fd36e0d65985ca638924953b85`.

This directory was created by the independent P4 acceptance session from a
fresh clone. It does not reuse the implementation screenshots. The session
launched the target in the real Tauri WKWebView while macOS was in Dark
appearance, navigated to Settings through the live command palette, selected
the Appearance panel, and captured the live CGWindow.

The welcome frame shows the resolved dark shell and its disabled navigation;
the Settings frame puts the focus, strong, hairline, and disabled slots in one
real-shell view. The visible focus ring is clear, strong and hairline remain
separate structural levels, and disabled text remains recognizable without
carrying unique information. Independent WCAG calculations from the target
tokens reproduce the implementation record, including focus at `4.5006:1` on
the raised surface.

The true-shell result is valid but does not release P4. Independent mutation
testing found that the target guard accepts both a dark root layout variable
(`--content-measure`) and a wrong dark token indirection (`--bg-app` mapped to
`var(--text-primary)`). Those failures are recorded in `apps/desktop/ACCEPTANCE.md`.

Files:

- `tauri-dark-welcome.png`: SHA-256 `2fbdaf2d50f4412f96ad9408fb9f147501f6ff7e61d8bba8834d8bd2f8cbee22`.
- `tauri-dark-settings.png`: SHA-256 `4da29f197fdb785bb1d250a82e1f1acbb3b5544ce1ea635f4d4b9dc2e84c55da`.
- `tauri-dark-slots.json`: system, runtime, hashes, independently recalculated
  slot ratios, observations, decision, and limitations.
