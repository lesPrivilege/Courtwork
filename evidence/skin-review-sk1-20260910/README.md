# SK-1 · Fixed Review semantic role

Astra implementation on isolated `codex/skin-review-decoupling-20260910`, from main `82c60360704fd79ad7d5b80f47372f2cfe230d1a`; interface continuity `3a6133686014973f62fcf58e71e779af36616876` merged as `6c04c78` before product changes. Shared checkout and unrelated pending evidence preserved.

## Contract and nearest precedent

[Frontend contract](../../engineering/design/agent-interface-2026-09-10/frontend-contract.md), [skin migration slices](../../engineering/design/skin-injection-2026-09-10/migration-notes.md); local precedents are `home-attention-state`, `attention-detail-state`, the existing scheme Review foreground, and Appearance `skinContrastWarnings`.

Review is fixed by scheme across slate/gray-steel/valid custom appearance tokens. Only `needs_you` receives Review in Home registry/selected detail and Attention registry/detail. Waiting, investigating, resolved retain labels without Review; malformed unknown states remain rejected by the existing adapter. No attention state, acceptance authority, provider request, runtime schema or stored preference changes.

The candidate contrast probe now re-resolves the existing role declaration on itself. CSS custom properties inherited from the root were already computed, so changing only scale tokens on the old probe did not measure candidate backgrounds. This shares the actual role mapping without mutating the active root or duplicating it in JavaScript.

## Author verification

- [39 targeted tests](tests.log): `node --test app/tests/home-presentation.test.mjs app/tests/settings-preferences.test.mjs app/tests/runtime-workbench.test.mjs`. Includes actual Home/Attention renderers, state counterexamples and warning/report pair parity.
- [Chromium computed evidence](browser.json), reproducible [script](browser.mjs): serve `app/web` at `http://127.0.0.1:19247`, then `node evidence/skin-review-sk1-20260910/browser.mjs`. Uses an isolated temporary Chrome profile and synthetic DOM; no personal data/runtime host. Eighteen light/dark/system × slate/steel/custom × system light/dark combinations verify both status selectors; resolved control stays neutral. Candidate panel/float equal to fixed Review produces two 1:1 warnings; probe removal and unchanged root verified. This is targeted CSS/module evidence, not a full product journey or screenshot acceptance.
- [Preset contrast report](contrast.md): all declared pairs pass, including fixed Review × panel/float in both presets and schemes. `node tools/lint-colors.mjs`, `node tools/lint-materials.mjs`, `node tools/lint-interaction.mjs` pass.

## Boundaries and continuation

SK-2 remains open: first-frame legacy CSS parser and full old token permissions have not yet gained the versioned effective projection, ignored-key provenance, or export UI. This slice guarantees separation from legal appearance/accent tokens; it does not claim hostile legacy CSS cannot directly name semantic roles. Preserve original custom data during that next migration. Dystopia preset, new material consumers and Pages proposals are later slices. No deployment or G1–G5 acceptance.

Independent review is recorded separately below; author checks do not constitute independent product acceptance.

## Independent review and integration

Luna Explore independently reproduced the old-probe inheritance failure and corrected-probe behavior in Chromium on the SK-1 working diff before `1d34cec`: light/dark × custom/gray-steel keep Review `#ae3630` / `#efaaa4`; an intentionally matching candidate background produces 1:1 in light and 3.251:1 in dark. No SK-1 blocker found. This is bounded independent verification, not product acceptance.

While preparing main integration, RV26 completed its own main merge `f3fec8a8274150d256d4e332930ff121226b8226`. It was merged here as `473fa54f1914f70dfd9041e4c048b80ff7dc38a1`; there is zero diff from `1d34cec` in `app/web`, the SK-1 test and contrast tool. Both current-status sections are preserved; combined documentation check passes (694 documents / 3236 links). RV26's separately recorded full-suite timing failures are not relabeled green by this frontend slice.
