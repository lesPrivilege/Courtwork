# Independent SK-3 review · Dystopia preset

Date: 2026-09-10. Reviewer: Luna Continuity. This is an independent bounded review; it does not self-accept the product or close SK-4, G1–G5, native-host acceptance, or deployment.

## Traceability

- Product checkout: `/private/tmp/cw-dystopia-20260910`
- SK-3 fixed product commit reviewed: `7f92f6961cfd3a0d792fdde6bd711a919173ab98` (`feat(appearance): add governed Dystopia preset`)
- Follow-up diagnostic fix also rerun: `b7831b58e7ddb173d574d586ef01f6c37f8c37ca` (`fix(appearance): refresh contrast diagnostics on system theme change`)
- Independent browser data directory: `/private/tmp/cw-dystopia-independent-data-20260910-b`
- Independent HTTP server: `127.0.0.1:19284`
- Independent Chrome/CDP port: `21287` for the follow-up diagnostic; SK-3 matrix probes used `21283`, `21284`, and `21285` with the same isolated server family before the follow-up rerun.
- No product files were edited. The checkout retained its pre-existing untracked `app/node_modules` and `evidence/dystopia-sk3-20260910/` state.

## Commands and results

From `/private/tmp/cw-dystopia-20260910`:

```text
node --test app/tests/skin-presets.test.mjs app/tests/settings-preferences.test.mjs app/tests/settings-navigation.test.mjs app/tests/static-web-manifest.test.mjs
```

Result: **40/40 pass**.

```text
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/lint-interaction.mjs
node tools/contrast-report.mjs
node --check app/web/skin-policy.js
node --check app/web/settings-view.mjs
git diff --check 428d1a7..HEAD
```

All passed. The contrast report resolved the shipped Dystopia blocks and passed light/dark Review pairs, including `panel-muted` and `hover`.

The independent browser probes used the server command below with synthetic data only:

```text
node app/server/index.mjs --data-dir /private/tmp/cw-dystopia-independent-data-20260910-b --port 19284
```

They verified:

- the single registry exposes exactly `slate`, `gray-steel`, `dystopia`, and `custom`;
- Dystopia first paint resolves correctly for light/dark/system across emulated light and dark OS themes;
- fixed Review, danger, success, focus, alpha, blur, and control geometry remain identical across all 18 system/scheme/skin combinations;
- unknown skin values fall back to Slate;
- default Slate panel values remain unchanged;
- Dystopia actual browser contrast passes every shipped pair. Review ratios were light `5.48`, `6.00`, `5.09`, `4.85` and dark `7.54`, `6.46`, `8.71`, `6.37` for panel, float, panel-muted, and hover respectively.

The follow-up browser check was run independently with:

```text
APP_URL=http://127.0.0.1:19284 WK6_CDP_PORT=21286 node evidence/dystopia-sk3-20260910/checks-theme.mjs
```

It passed. A separate direct rerun on CDP port `21287` confirmed the same system-theme diagnostic refresh: light custom warnings changed from **7** to dark **11**, while an unsaved draft marker and `skin-input` focus remained intact. No browser exceptions were observed.

## Bounded conclusion

No SK-3 blocker was found. The preset is closed to the permitted 21 opaque appearance tokens, changes only neutral/appearance roles, follows the shared scheme/first-paint path, leaves fixed semantic/material roles unchanged, and keeps Slate behavior intact. The system-theme diagnostic follow-up is recorded separately from the Dystopia preset result.
