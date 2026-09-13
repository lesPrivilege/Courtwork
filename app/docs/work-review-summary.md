# Bound Core Review summary

`GET /api/v5/sessions/:id/review-summary` is an authenticated human read. It is separate from the Host session inventory at `/work-summary`.

The response contains `schemaVersion: 1`, `sessionId`, `extensionId`, `status`, and `summary`. `unbound` and `unavailable` have a null summary; absent sessions return 404, while Core/adapter failures remain HTTP errors. No failure becomes zero pending candidates.

An `available` summary contains only `matterId`, `title`, `version`, `sourceVersion`, `contractVersion`, `stateVersion`, `readOnly`, `pendingCount`, `stalePendingCount`, `reviewableCount`, and `acceptedArtifactId`. Candidate/source/artifact bodies, decision payloads and action schemas are not returned. The service uses the existing surface projection, including Work adapter domain restrictions and Host lifecycle/active-Run restrictions, then applies the pure Core-owner summary function. No new state, schema migration or pending-work store is created.

`pendingCount` counts Core candidates whose status is pending; `stalePendingCount` counts those whose base/source/contract basis differs from the same snapshot's Matter. `reviewableCount` counts pending candidates with an advertised `decide` descriptor on a writable projection. It does not mean accept is available: a domain can advertise only reject/request-evidence. An accepted artifact ID identifies the current Core artifact and does not claim that every pending candidate is resolved or its source basis is current.

The summary is an observation at `stateVersion`, not an action precondition or authority. Opening review obtains the current full surface. Existing action actor checks, generation checks, Core CAS and idempotency apply unchanged; the summary has no mutation endpoint. Changes after a read can make it stale, including changes through another Session bound to the same Matter. Clients must re-read on relevant lifecycle/Run completion, action result or refusal, Session/binding change, explicit refresh and foreground return. Read errors and in-progress refresh must not present a previous count as current.

[Release intake](../../engineering/release/review-intake-2026-09-13/README.md) owns the G2/G3 consumption scope. This endpoint does not make Run completion a formal work decision or establish independent product acceptance.
