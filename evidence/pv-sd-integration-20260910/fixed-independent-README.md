# Independent Spark race verification

The original SD-01 tree `6b6257937e2dff0bcf46f9a31f40184ee95c57b3` was
driven with a fresh loopback server and real headless Chrome/CDP.  Its
independent red counterexamples were:

- scenario selection while a delayed live probe was pending dropped the valid
  live result and left the new sample visible;
- close/reopen while a delayed sample `json()` was pending resurrected sample
  state; and
- Hide sample data during that pending sample body also allowed resurrection.

The same headless Chrome/CDP driver (separate from actual Computer Use) was
then run against this tree at
`dc3068b30a16fe06f10a62c812c1e44e994cbe2f`, with a fresh data directory and
separate port/CDP session:

```sh
APP_URL=http://127.0.0.1:8949 SD01_CDP_PORT=19949 SD_EXPECT_FIXED=1 \
SD_EXPECTED_SHA=dc3068b30a16fe06f10a62c812c1e44e994cbe2f \
SD_INDEPENDENT_OUTPUT=evidence/pv-sd-integration-20260910/fixed-dc3068b-checks.json \
node evidence/pv-sd-independent-spark-20260910/checks.mjs
```

Result: all 15 independent checks passed at the exact `dc3068b` tree; the
captured result is `fixed-dc3068b-checks.json`.  The later product commit
`654411e2058c3d40abe74751ba6dbe1742133a9e` has no diff from `dc3068b` in the
Spark implementation, so the same result applies to that product commit's
Spark files.  The checks include both delayed sample
fences, scenario control disabled during a live probe, Hide sample data while
the sample body is pending, Hide sample data while a live probe is pending,
and five static routes with byte identity, JSON content type, traversal
rejection, and POST rejection.  The `/work-derivations` payloads were
transport-only synthetic fixtures because this baseline has no BE-41 source;
all static files and normal page/API traffic were real loopback requests.

`fixed-independent-checks.json` is retained as an intermediate driver run;
its hard-coded source label was not updated. It is not used for fixed-SHA
acceptance. The separately repeated `fixed-dc3068b-checks.json` above carries
the explicit fixed source SHA and is the acceptance record.
