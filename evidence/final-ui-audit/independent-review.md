# Independent UI review

Reviewed the frozen candidate at `05c6947` together with the current five-file UI source snapshot. This receipt records independent checks only; it does not certify real-provider behavior, screen-reader support, browser zoom, or product takeover.

## Checks

- `node --test evidence/home-composer-independent/home-composer-counterexamples.mjs`: **10/10 passed**.
- `node --test evidence/ui-maturity/surface-counterexamples.mjs evidence/ui-maturity/message-edit-counterexamples.mjs evidence/ui-maturity/run-receipt-counterexamples.mjs evidence/migration-independent/permission-setting-counterexample.mjs`: **20/20 passed** (surface 9, message/edit 4, run receipt 5, focused permission 2).
- `node --check app/web/app.mjs` and `node --check app/web/home-view.mjs`: passed.
- `git diff --check`: passed.

The six copy and presentation corrections were reviewed against `engineering/design/ui-composition-standard.md`: creation controls use “New project”, the run control uses “Session overview”, message edit uses quiet “Cancel”, the run-history dialog has a 20px dialog heading, permission labels are consistent, and the connection submit action is the primary action. The current source keeps waiting copy static, limits ledger shimmer to running rows, and preserves Home/session draft ownership. No behavioral blocker was found in the reviewed scope.

The credential action DOM order at `app/web/settings-view.mjs:216` is `Remove saved key`, then `Save key`, which matches the visual danger-left/primary-right layout. Keyboard focus therefore reaches the destructive action first. This is a **P2 accessibility follow-up**, not a failing regression in the executed tests; the intended keyboard order should be confirmed if the credential card is exposed to keyboard users.

## Reviewed source fingerprints

These are full SHA-256 hashes of the five source files reviewed:

```text
app/web/app.mjs          08d818c8ffe417f9820b7e71961b2f6d3e4ea051a41663b3a0385a7c3f06ade2
app/web/home-view.mjs    db9c5179a22b331f959ca0e2cd4cecabbdf991d3a184225b731d8061ec1b2197
app/web/index.html       af72d43283e129499d4b994e4a00d02a58582c416298e4fafb00eb0fb458d30f
app/web/settings-view.mjs 540ce9f0f4cadcf5815cdf238b3aae8a9da86dbb34c951697d64805bffd9e68f
app/web/styles.css       5a9b7c0ba2e8635bde51ebf5cd4ec2615d60a8573a8a9b91e904ba7df7a2a26d
```

