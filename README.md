# Fresh Courtwork integration workspace

Runtime Control Plane backend increment: see [the current index](docs/runtime-control/INDEX.md)
for protocol v1, resource adapters, schema 4 upgrade and acceptance. The baseline
notes below describe the import; this backend branch supersedes its backend-freeze
status. Frontend integration remains a separate change.

This is the local **G1/C3 integration workspace**, restored from the independently
reviewed C4-r1 source archive. It is not a release or the canonical replacement
for legacy Courtwork. The executable application is in `app/`.

## Baseline

- Archive: `framework-v9-c4-r1-source.tar.gz`
- SHA-256: `2e1d7718093319317d6370ec5abc140cc33cdcadd954a8bb785eafe942a29b90`
- Frozen application/source members: 52, unchanged at import.
- Backend: Pi AgentSession 0.85.1, with the existing service owning execution.
- Frontend: G2 r2 (`app.mjs` SHA-256 `37fa90e47b5c826c85c11db17ebf73abea45decce9cc3c9d7b8d381f86b40bfb`).

Core deterministic review passed 80 tests and targeted recovery, receipt and
cancellation checks. The G1/C3 frontend functionality has **not** been implemented
in this import. Real DeepSeek use through the UI has **not** been tested.

## Start and stop

Use Node.js >=22.19.0 and Python 3. From `app/`:

```sh
npm ci --ignore-scripts
SE_RUNTIME_DATA_DIR=/absolute/path/outside-this-repository PORT=8805 npm start
```

Use a different persistent data directory for each running instance. Stop with
Ctrl-C. See `app/README.md` for the data layout and execution limitations and
`app/docs/api-v6.md` for the frontend contract. The default provider is a local,
deterministic fake. The user will configure a real key through the C3 UI once
that UI is implemented; keys must not enter chat, Git, screenshots or fixtures.

## Regression

From this repository root, after installing the app dependencies:

```sh
node --test app/tests/*.test.mjs tests/*.test.mjs
```

## Ownership and next change

The frontend owner implements G1 navigation/independent preview tab and the C3
provider, materials, permission, artifacts and recovery surfaces. Backend runtime,
service and store remain frozen unless an evidenced interface gap requires a
separate architecture change. This local Git baseline lets the owner review the
actual increment without overwriting other execution trees.

Repository promotion, a confirmed remote and a release package follow the
self-sufficient integrated candidate. Legacy Courtwork remains frozen. Neither a
local commit nor a passing fake run means takeover-ready or takeover-executed.
