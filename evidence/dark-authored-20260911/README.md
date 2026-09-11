# Dark authored surface correction

User-directed amendment to the cross-theme authored plane from WO-VS-01. Baseline `a01dee89e752111e63012b705ef81350ce518446`; only `app/web/styles.css` changes product behavior. Nearest implemented precedent: the existing composer/Attention composer use L2 `float`; the user bubble had a fixed dark background in both themes and became darker than the dark reading plane.

Dark (explicit and system preference) now maps `authored-surface` to existing `float`, resolving each skin's scale. Light retains the existing dark authored plane. No new scale, glyph, runtime or state authority. Existing forced-colors rule remains later in the cascade. This is an explicit amendment, not a blanket adoption of the external Visual Grammar proposal.

Author CUA uses the existing synthetic source-inspection session at local port64824 after its run completed; historical running screenshots remain immutable. Screenshots are bounded visual evidence, not an independent acceptance claim. Composer already satisfies the requested lighter-depth direction and remains unchanged. Initial post-reload screenshot reached Home and is replaced after reopening the same chat; metrics never treat a missing bubble as verified.

Color/material lints and the existing three-skin contrast report passed. Browser measurements and native before/after images live alongside this receipt. Native VoiceOver, IME, forced-colors emulation, system-theme OS switching and real200% zoom are not exercised by this color-only pass. The existing global report does not itself test the authored-role override; actual rendered colors are measured separately.

The attempted 390px override did not affect the measured tab (`innerWidth` remained1440); its artifact is named `resize-not-applied-1440.jpg` and is excluded from responsive verification. This bounded change has actual1440 light/dark checks only; 1280/390 remain unverified for this amendment. The before/after shell disclosure and scroll differ, so these are local surface comparisons, not pixel-diff goldens.

Follow-up: a fresh connected test tab accepted actual390 and1280 viewports. Native light/dark390 and dark1280 screenshots plus `responsive-metrics.json` now verify the corrected bubble and unchanged composer without document-width overflow. The earlier resize failure remains recorded; light1280, system OS switching and native assistive checks are still unverified.
