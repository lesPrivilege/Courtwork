# AM-B-T2 fixture receipt

Base: `7c07ef6b5a19f0eb2c45b8894ab9911de87ea979`. Writer: Terra. Scope is only
`app/tests/fixtures/async-loop/` and `app/tests/async-fixture.test.mjs`.

The fixture starts a local, synthetic provider in its own Node child process on
`127.0.0.1` with port `0`. Every instance has two versioned, digested documents
and an independent temporary directory. It exposes fixture controls for the
four barriers: launch accepted, execution start, result generation, and receipt
send. No assertion relies on an elapsed-time threshold.

The provider's JSON record is fixture-owned synthetic state, used only to model
an explicit query after its owning process is killed and restarted. It is not a
Courtwork task store, continuation implementation, or product authority.

`node --test tests/async-fixture.test.mjs` covers independent A/B release,
duplicate receipt identity, launch/result acknowledgement loss, disconnect
after a result, both cancel/success orders, launch counts, unknown-job query,
and `SIGKILL` of the provider process followed by a fresh query child after
provider restart. The test does not establish product async behavior; Astra's
A1 service must consume the fixture for that acceptance.
