# HL-T1 synthetic Gmail fixture receipt

This directory records the offline fixture only. `app/tests/fixtures/attention-ingest/gmail/scripted-gmail.mjs` exposes ordered provider-like responses for duplicate/out-of-order push and paged history, interrupted pagination, history gap, expired watch/failed renewal, account mismatch, and revoked access. It stores no cursor and creates no observations.

Run from `app`: `node --test tests/attention-gmail-fixture.test.mjs`.

The fixture demonstrates host obligations through expected scenario facts: a caller must not advance a cursor before all pages complete, must retain a history gap, and must reconcile after failed watch renewal. It is not a Gmail adapter, OAuth implementation, scheduler, provider integration, or product ingest acceptance.
