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

## Independent SK-4 focus review

Date: 2026-09-10. This is a bounded review of the five-line settings-exit fix at `a7ff5c86b0c25e12aa31c73b7245d854a7cf41d2` (`fix(settings): restore usable focus after deep-link exit`). It does not self-accept SK-4, Q02, G1–G5, native-host acceptance, or deployment.

Traceability:

- Fixed product was checked in detached worktree `/private/tmp/cw-sk4-focus-fixed-a7ff5c8-20260910`, with `HEAD` verified as `a7ff5c86b0c25e12aa31c73b7245d854a7cf41d2` and no branch checked out.
- Synthetic server data: `/private/tmp/cw-sk4-focus-data-a7ff5c8-20260910`; HTTP `127.0.0.1:19286`; Chrome/CDP `21292`. The server was stopped after the probe.
- Source inspection in the detached worktree showed `closeSettings()` selects `composer-input` for a Home deep link without an attention panel, `session-title` for other views, and treats `document.body` as having no opener before calling the existing focus helper. `node --check app/web/app.mjs` and `git diff --check HEAD^ HEAD` passed.

From the repository root (the browser helper was loaded from the existing evidence harness):

```text
node app/server/index.mjs --data-dir /private/tmp/cw-sk4-focus-data-a7ff5c8-20260910 --port 19286
APP_URL=http://127.0.0.1:19286 WK6_CDP_PORT=21292 node --input-type=module <<'NODE'
// probe: 390px #settings/appearance -> focus Back -> Enter;
// then 1440px Home -> focus/click runtime-setup-button -> Escape
NODE
```

Results: **pass**. At 390px the runtime setup opener was hidden; Back cleared the hash and returned focus to `composer-input`. At 1440px the actual `runtime-setup-button` opener opened settings; Escape cleared the hash and restored focus to that same button. The probe observed zero browser exceptions. No product files or commits were changed.
