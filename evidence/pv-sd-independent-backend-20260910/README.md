# Independent PV backend probes (2026-09-10)

This directory contains a provider-free counterexample and migration recheck
for the PV integration tree. The fixture imports each checkout by an explicit
`app` root, creates only temporary state/loopback servers, blocks every
non-loopback provider request, and removes its temporary data on exit. It does
not use credentials or a paid provider.

## Reproduction

From this worktree (`bb2102790567d193dd412e1d4d99b09281b5ad2e`):

```sh
BB_APP_ROOT=/private/tmp/cw-pv-backend-independent-20260910/app \
FIXED_APP_ROOT=/private/tmp/cw-pv-sd-integration-20260910/app \
node evidence/pv-sd-independent-backend-20260910/independent-backend-audit.mjs
```

The script exits zero only when the expected matrix is observed:

| Checkout | Schema11 → 12 pending fence | Verify configured-route probe |
| --- | --- | --- |
| `bb21027` | **FAIL**: all four markers (including missing-record markers) become `[]`; exact backup still matches, but reopen and one-finish semantics are lost | **FAIL**: configured loopback is unused; the blocked target is `https://api.openai.com/v1/responses` |
| `792174c` | **PASS**: all four markers survive upgrade and reopen; explicit finish removes exactly one; exact backup matches | **FAIL remains**: same external target is attempted and local hit count is zero |

The route fixture configures `catalog-openai` with model `gpt-4`, API
`openai-completions`, and a synthetic loopback `baseUrl`. It records loopback
requests and replaces global `fetch` so any native catalog endpoint is blocked
before network I/O. On both trees the verify receipt reports `unreachable`,
with no local request and one blocked native Responses URL. This is the
independent reproduction of the still-open routing issue, separate from the
schema migration fix.

## Source coordinates

- `app/server/store.mjs:487-505` is the schema migration. At `bb21027`, line
  495 assigns `providerConfigurationPending: []`; `792174c` changes this to
  preserve the parsed schema11 array.
- `app/server/service.mjs:1067-1142` is verify. At `:1077` it resolves via
  `#admissibleModel` and at `:1107` passes that native model to
  `modelRuntime.complete`; it does not call `#resolveModel`.
- `app/server/service.mjs:1468-1473` shows `#resolveModel` applying the
  selected `api` and `baseUrl`; `app/server/service.mjs:1703` uses it for Run.

The migration probe is intentionally independent of the author test added in
`792174c`: it builds a schema12 state, downgrades only the versioned shape,
and checks exact bytes, upgrade state, reopen state, and an explicit finish.
