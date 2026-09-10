# Independent PV-FE02 frontend review — 2026-09-10

This directory is independent review evidence for fixed commit
`bb2102790567d193dd412e1d4d99b09281b5ad2e` (detached tree
`/private/tmp/cw-pv-frontend-independent-20260910`). It does not modify the
author evidence under `evidence/pv-fe02/`.

## Commands and fixtures

- `npm --prefix app ci --ignore-scripts` — completed; 277 packages, 0 audit vulnerabilities.
- Before dependency installation, the first `npm --prefix app test` attempt reported
  54 file-level failures, all `ERR_MODULE_NOT_FOUND` for the declared `@earendil-works/*`
  packages; this was an environment/setup failure, not a product assertion failure.
- After that isolated install, `npm --prefix app test` — **664/664 pass**.
- `node --test app/tests/models-connections.test.mjs app/tests/provider-connections.test.mjs app/tests/provider-open-admission.test.mjs app/tests/provider-preview.test.mjs app/tests/provider-protocol.test.mjs` — **50/50 pass**.
- `npm --prefix app start -- --data-dir /private/tmp/cw-pv-fe02-data-independent-rerun2-20260910 --port 8921` — isolated runtime, fresh synthetic data directory.
- A separate loopback model-directory fixture on `127.0.0.1:8920/v1` reports only `fake-model`; its key is the synthetic string `fixture-independent-key`.
- `APP_URL=http://127.0.0.1:8921 WK6_CDP_PORT=20111 COMPAT_ENDPOINT=http://127.0.0.1:8920/v1 node evidence/pv-sd-independent-frontend-20260910/independent-checks.mjs` — **8/8 pass**, output is in [`independent-results.json`](./independent-results.json).

The browser script uses real DOM events and network observation in a fresh
headless Chromium instance. It never reads a personal credential store or
calls a real provider. Generated captures are `independent-1440-light-*`,
`independent-390-dark.png`.

## Checks

1. Local endpoint “Save and ask once” produces the success receipt and the
   connection-row `Answered … · fake-model` state.
2. “Save only” leaves the receipt absent and emits no additional `POST …/verify`.
3. The picker’s “Use a model ID that is not listed…” catalog/local route saves
   `unknown-ghost` without asking and leaves its dialog open.
4. The next explicit ask returns the deterministic HTTP 404 receipt and the
   connection row shows `Last ask failed …`.
5. “Ask again” emits a new verify POST.
6. A 390×844 dark emulation has no horizontal overflow; the path fieldset has
   an accessible label and the body is in dark colors.
7. The status result has `role=status`, the model-picker control is named, and
   no enabled model-panel control lacks a discernible name in the inspected DOM.
8. A compatible connection whose synthetic directory lists only `fake-model`
   rejects a picker attempt to save `unknown-ghost` with the exact backend
   message `the model directory does not list every selected model`.

The last check is a boundary, not a failure: catalog/local connections admit
extras through the PV-59 catalog-union route; compatible connections still
require the ID to be present in their own discovered directory. This is the
implemented and documented contract, so this evidence does not broaden it to
arbitrary compatible IDs.

## Limits

This is headless browser evidence, not a real Computer-Use/manual acceptance
session. It covers light-wide behavior, dark narrow geometry, reduced-motion
CSS, named controls, and local-fake HTTP receipts. It does not claim VoiceOver
or NVDA output, touch input, real IME, 200% zoom, real-provider behavior,
multi-connection screenshot density, or product G1–G5 acceptance.
