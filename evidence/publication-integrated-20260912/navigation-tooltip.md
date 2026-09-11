# Session navigation tooltip placement

Baseline 004c148a74ea853308c34c560e2a697af258fe9d. Nearest implemented precedent: `app/web/ui-controls.mjs` shared tooltip provider, existing `data-tooltip-side` placement. Affected grammar: hover disclosure placement; session selection owner and tooltip hoverability unchanged.

Astra native in-app browser on isolated synthetic example, 1440×900 dark: after clicking Continue Project Cedar review, its bottom tooltip occupied x48.97–222.03/y413.30–443.05. The next Final review memo row occupied x28–243/y407.30–442.09. Its center was covered; first mouse click hid tooltip without selecting, second click selected. Keyboard selection worked.

Set session rows' tooltip side to right using the shared provider. After reload, Continue tooltip occupied x251–424.06/y373.02–402.77. Consecutive Continue → Final mouse selection succeeds, including with tooltip open. No global pointer-events or timing change. Unit/static and non-author review scopes recorded in main receipt; this is a local native reproduction, not broad accessibility acceptance.
