# AM-B-T2 fixture receipt

Base: `7c07ef6b5a19f0eb2c45b8894ab9911de87ea979`. Writer: Terra. Scope is only
`app/tests/fixtures/async-loop/` and `app/tests/async-fixture.test.mjs`.

The fixture starts a local, synthetic provider in its own Node child process on
`127.0.0.1` with port `0`. Every instance has two versioned documents with
small exact UTF-8 content and a real lowercase `sha256:` digest; request inputs
also carry and are validated against a real SHA-256 digest of their exact UTF-8
content. Results return the exact immutable document content and provenance.
Each instance has an independent temporary directory.
It exposes fixture controls for the
four barriers: launch accepted, execution start, result generation, and receipt
send. No assertion relies on an elapsed-time threshold.

Fixture persistence is a single serialized writer that publishes JSON only by
atomic temp-file rename. Each durable barrier opens only after its associated
synthetic record is published; concurrent launches are separately checked
across a provider SIGKILL/restart.

A repeated launch is an observable attempt only when its document provenance
and input version, digest, and exact content equal the retained immutable
request. A changed request receives explicit `409 job_identity_conflict` and
does not increment the launch count.

The provider's JSON record is fixture-owned synthetic state, used only to model
an explicit query after its owning process is killed and restarted. It is not a
Courtwork task store, continuation implementation, or product authority.

`node --test tests/async-fixture.test.mjs` covers independent A/B release,
duplicate receipt identity, launch/result acknowledgement loss, disconnect
after a result, both cancel/success orders, launch counts, unknown-job query,
and `SIGKILL` of the provider process followed by a fresh query child after
provider restart. It also kills the provider after launch but before execution,
then proves its accepted record and one launch count are retained after restart;
the fixture does not claim to resume that job automatically. The test does not
establish product async behavior; Astra's
A1 service must consume the fixture for that acceptance.
