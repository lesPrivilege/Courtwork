# Reader target independent acceptance · 2026-09-29

Astra accepts original Claude b4bfedb/bb550dc. The parent inspected both CSS rules and ran the real headless-Chrome regression independently:1/1, no skip. Author30/30 remains author evidence. No broader repeated suite was needed for two geometry rules.

The parent then used the OpenAI in-app browser on a fresh disposable fake-provider Host, created an actual Markdown workspace file through a normal ws_write Run, and opened it from Chat files into the real Preview reader. This completes the reading-flow check missing from the author's structural fixture.

- [Mouse1440](fine-1440.png): tab close24×24, Version details28px, native marker remains `list-item`. The close glyph/tab/header anatomy is retained. The summary's increase from17.25 to28px is intentional, so the file header is not claimed pixel-identical.
- Touch/coarse media is actually active. [1440 closed](touch-1440-closed.png), [1440 open](touch-1440-open.png), [390 closed](touch-390-closed.png), [390 open](touch-390-open.png): tab close44×44, summary44px; native Enter/Space opens/closes the hash detail and the marker remains. Long hash wraps in the390 view without losing controls or content. [Measured rectangles](measurements.json) retain the actual viewport and control sizes.
- A pointer click3px inside the expanded close control's corner (outside the centered glyph) closes the only tab; Preview has zero tabs and focus returns to Chat files. Direct synthetic touch-event dispatch is not supported by the in-app browser, so this is coarse-media plus actual pointer/keyboard verification, not a physical-touch gesture claim.

The shared CSS also serves recorded artifacts and retained materials, as source and author tests establish; these other full flows were not newly opened. No Safari, screen reader, dark, forced-colour or200% text matrix is claimed. Pointer emulation and viewport overrides were restored and the temporary page closed. The fixture contains only synthetic text and fake-loopback configuration, with no user credential access, paid model or native Hermes execution.

No further correction was required. The remaining narrow Composer labels and answered-question selection/toggle interaction retain their original queue ownership and are not closed by this target-sizing acceptance.
