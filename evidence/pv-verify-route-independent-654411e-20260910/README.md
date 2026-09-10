# Independent PV route/migration recheck (654411e)

This evidence is separate from the original `d387c4a` counterexample. It runs
only against detached commit `654411e2058c3d40abe74751ba6dbe1742133a9e` and
adds no product changes. The fixture uses temporary runtime state and two
loopback servers, blocks every non-loopback provider fetch before network I/O,
and uses synthetic credentials only.

## Reproduction

```sh
node evidence/pv-verify-route-independent-654411e-20260910/independent-fixed-audit.mjs
```

Observed result (exit 0):

- schema11 → schema12: all four pending operations, including markers whose
  connection records are absent, survive upgrade and reopen; the SHA-named
  backup is byte-exact; one explicit finish removes only its own marker.
- Active `catalog-openai`: `gpt-4` and a different catalog model both use the
  configured loopback endpoint, POST `/v1/chat/completions`, and return the
  local 401 as `authentication_failed` with `httpStatus: 401`.
- No external provider request is observed (`externalNetworkAttempts: 0`).
- Inactive `catalog-fake-openai-loopback`: verify reaches its own registered
  fake loopback with `model: fake-model`; it does not add a request to the
  active OpenAI loopback, proving the active identity's override is not
  borrowed.

The independent result is recorded in `result.json`; ephemeral ports and
timestamps are intentionally omitted there. The executable script retains
the full per-run values when reproduced.

## Source and author-test coordinates

- `app/server/service.mjs:1074-1084`: fixed identity-aware selection between
  `#resolveModel({...providerConfig, model:modelId})` for the selected identity
  and the admitted model's own registration for an inactive identity.
- `app/server/service.mjs:1474-1480`: `#resolveModel` applies the configured
  `api` and optional `baseUrl`.
- `app/server/store.mjs:487-505`: schema migration and exact backup.
- Author regressions: `app/tests/provider-verify-route.test.mjs` and
  `app/tests/provider-schema12-pending.test.mjs`, run directly with Node's
  test runner: `2 pass / 0 fail`.
