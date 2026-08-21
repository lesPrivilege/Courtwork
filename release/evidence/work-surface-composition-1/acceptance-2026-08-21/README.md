# WORK-SURFACE-COMPOSITION-1 acceptance evidence

This directory is an independent acceptance capture for target
`d21aa6d062b32052507f6b96ea7bf8da0eccb602`.

- Clone: `/private/tmp/work-surface-composition-1-acceptance-Ojf5dh/repo`
- Branch: `acceptance/work-surface-composition-1-2026-08-21`
- Harness: scripted `browser-pi-lane`
- Fresh application port: `18741` (`reuseExistingServer=false`)
- Fixture: `acceptance-write-script`, logical path `纪要.md`, SHA-256
  `e80ddeb170a3513e335ada586bec6f0068e8be8c66ab0845b38ec541edb888ba`
- Capture set: 31 PNGs covering light 1180/1440/1600, dark 1440, and light
  390 viewports; each state has normal and text-mask captures.
- The light 1440 succeeded state additionally has a 10% squint at 144x90.
- `capture-script.mjs` asserts horizontal geometry and the 390 smoke targets;
  `manifest.json` is the machine-readable index.

Visual review used `view_image` on light 1440 running/proposal/succeeded, dark
1440 succeeded, light 390 proposal/succeeded, and the light 1440 text-mask and
squint. The observed order is matter → task → work/result; proposal is the
only raised decision block; the succeeded state has one draft-index entry and
no `pi-open-from-card`; no horizontal overflow was observed.

The independent Pi DOM gate is green (17/17), but the complete Pi E2E file is
not green (8/13): five legacy assertions require `pi-drafts-empty` for
non-session-terminal prompt outcomes, contrary to this ticket's explicit
non-terminal no-draft contract. The acceptance verdict is therefore **FAIL /
REJECT** pending resolution of that test-contract drift.
