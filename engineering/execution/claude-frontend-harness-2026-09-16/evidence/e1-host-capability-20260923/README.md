# E1 Host capability · author record

2026-09-23 · Sol implementation record. Baseline `354a3b5e8ba09558e096baa6b03c3f77b50e52c3`; branch `codex/e1-host-capability-20260923`. Architecture/integration remains with Astra; the original Claude writer retains `app/web` and the Role-first Composer tree. This record does not claim independent acceptance.

## Responsibility and boundary before product edits

Affected responsibility: the Runtime Control snapshot's compatibility projection, owned by `app/runtime/control-plane.mjs`, and its existing typed consumer contract. The actual `POST /sessions/:id/runs` stale-selection guard already belongs to the accepted Host admission path; this change only advertises that implemented behavior explicitly to authenticated snapshot consumers.

Nearest precedent: `compatibility.hotSwap: 'between-runs'` advertises an implemented Runtime Control behavior, while the E1 pinned contract requires clients to submit `{revision,profileId,sourceHash}` and handle `runtime_selection_conflict`. The new exact flag is `compatibility.runtimeSelection: 'expectation-v1'`.

Change boundary: add the explicit snapshot flag and narrow type, then verify through the actual authenticated GET plus the existing admission race. Do not infer support from protocol/config versions. Do not add a registry, schema field, admission rule, static-module allowlist, endpoint, `server/index.mjs` change or frontend code. `sessionScope.kind` must remain the actual Session scope. Original-command replay remains authoritative before a newer expectation is checked, and a stale new command must create no Run or provider request.

Verification evidence and final source identity are appended after implementation.

## Author delivery

The Runtime Control snapshot now advertises exactly `compatibility.runtimeSelection: 'expectation-v1'`. The typed snapshot contract requires that literal. No version inference, registry, schema, admission or receipt behavior changed.

Focused command from `app/`:

```text
node --test tests/kit-run-binding.test.mjs tests/control-plane.test.mjs
```

Result: **41 passed, 0 failed**, exit 0. The authenticated E1 test asserts the advertised flag and the unchanged project `sessionScope`; after changing the selected profile source, the old expectation receives `409 runtime_selection_conflict` with no additional Run or provider request. Replaying the already admitted command still returns its original Run, with one total Run/provider request. The adjacent Runtime Control suite preserves existing snapshot, CAS, restart, admission and permission behavior.

`node --check app/runtime/control-plane.mjs` and `git diff --check` pass. The first attempt failed before test loading because this isolated tree had no `node_modules` and the temporary symlink command used an incorrect relative target. The permitted link was then created at `app/node_modules`, the tests passed, and the link was removed before handoff.

Final source SHA-256 before commit:

- `app/runtime/control-plane.mjs`: `27ab61865ce55fc851935d69a8bb9fb1319e24feda0c2e2ace1d2144353155c2`
- `app/runtime/control-contract.d.ts`: `51de7b1ff44a35ba1004eac0b14d7fc8aa89411f0a3796d06434a950cf0ff0cb`
- `app/tests/kit-run-binding.test.mjs`: `a22f587f17cf2a1b9dbc7ba8f596528e675336b0d700db1bb42112c11119acde`

Writer released for Luna non-author review and Astra integration. No merge, push, cleanup, browser/provider use or user-service operation was performed.
