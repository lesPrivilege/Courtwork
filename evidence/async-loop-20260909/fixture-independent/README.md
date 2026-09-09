# Independent AM-B-T2 review

Reviewer: Luna, non-author. This directory is an independent review artifact;
it does not alter the Terra T2 source, the Courtwork product, or the author
fixture/test. The historical Terra source reviewed here is
`/private/tmp/cw-terra-async-fixture` at
`0c5db70cf7544a7a754d9ed72c7a5370e85c646a` (Terra author). Its self-test
passed 5/5, but that result is not an independent product acceptance. Terra's
repair is `95f118db8870a2e8be330f10bac31b4e6d6f89a3`; its self-test passes 7/7.

Run against the pinned source tree:

```sh
node evidence/async-loop-20260909/fixture-independent/verify.mjs \
  /private/tmp/cw-terra-async-fixture
```

For the repaired source, use `--expect-fixed`:

```sh
node evidence/async-loop-20260909/fixture-independent/verify.mjs \
  /private/tmp/cw-terra-async-fixture-fixed-review --expect-fixed
```

The script records three independent observations:

1. `sha256Utf8` equals SHA-256 over `Buffer.from(content, "utf8")` for both
   NFC `Café\n` and NFD `Café\n`. Their digests differ. Sending NFD content
   with the NFC digest is rejected with HTTP 400; sending the matching NFD
   digest is accepted and persisted. This verifies exact UTF-8 bytes and
   explicitly demonstrates that visual/text normalization is not performed.
2. On the historical SHA, a valid first launch for document A followed by a
   valid retry with the same `jobId` but document B and different input is
   accepted as HTTP 202, increments `launchCount` to 2, and returns/stores the
   first A record. This is an independent counterexample to an unqualified
   claim that same-job retries are idempotency-checked. On the repaired SHA with
   `--expect-fixed`, the same request receives HTTP 409
   `job_identity_conflict` and the launch count remains 1.
3. The real provider child is advanced into a persisted `executing` state,
   killed with `SIGKILL`, and replaced by a fresh child. The fresh query reports
   `executing`, `result: null`, and `launchCount: 1`. This proves a genuine
   execution-window child kill and no implicit relaunch in the fixture. Terra's
   original T2 test kills after `launchAccepted` (before execution), while this
   script checks the stronger execution window.

The repaired SHA serializes atomic state writes and opens each durable barrier
after persistence. The execution-window kill remains an explicit fresh-child
query rather than an automatic resume claim. This script is a non-author
review; it does not accept the product implementation.
