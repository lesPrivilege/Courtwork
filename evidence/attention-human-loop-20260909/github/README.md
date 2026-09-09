# HL-T2 synthetic GitHub notification fixture receipt

This offline fixture provides scripted responses for conditional polling, exact `Last-Modified` round trips, `304`, changing `X-Poll-Interval`, pagination, a changed reason and PR HEAD for the same thread, an unknown reason, participating filtering, unsupported tokens, revocation, and rate limiting.

Run from `app`: `node --test tests/attention-github-fixture.test.mjs`.

The expected fields describe host obligations only: retain a prior snapshot after `304`, preserve unknown reasons, keep changed-thread versions distinct, and do not derive resolution from an absent notification. It does not query GitHub, store snapshots, schedule polling, or authorize any provider action.
