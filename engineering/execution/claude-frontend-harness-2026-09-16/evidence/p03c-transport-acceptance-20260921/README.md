# P03-C transport — final independent acceptance

2026-09-21 · Astra. Accepted source `32f4f8bb754db20b8c0c5c3e44ab4acbc994ca24`, delta from `b69a4b5`, locally merged as `10b2d5229861762976417271713e3ece5ca3e978`. This accepts the finite SDK transport, not production Host selection, a live Agents runtime, remote exactly-once behavior or the next C consumer.

## Disposition in the original transport order

- **R1 adopt, closed:** values of all outgoing headers are reconstructed from explicit caller/transport facts. The transport-local AsyncLocalStorage carries each event request key; the SDK's ambient header values cannot be inherited. Luna's synthetic probe covers create plus three overlapping event requests with reverse release order, including supplied authorization and seven ambient header inputs.
- **R3 adopt, closed:** `has_more:true` without a nonempty service cursor or final item ID raises `malformed_response`. Real adapter reconciliation cannot silently present this incomplete page as complete history. Valid final-item fallback and a complete empty page remain valid.
- **R2 reject, unchanged:** the previous 204-only premise stays rejected. HTTP submission acceptance is not proof of completed effects.
- **D1 accepted unchanged; D2–D4 adjusted and accepted as packet corrections:** a lost create remains unknown with no available lookup/correlation path; persisted tool results are not rerun or automatically resubmitted under an unverified idempotency assumption; the lost 17-second error has no retained diagnostic and sleep timing is only correlation. These remain explicit next-consumer obligations.

## Evidence and limits

[Luna's non-author delta review](cw-p03c-final-review.md), [focused log](cw-p03c-final-review.log) and [independent probe](cw-p03c-final-probe.log): 22/22, exit 0. Astra inspected the exact source delta and reran the same three suites on actual integrated main: [22/22, exit 0](cw-transport-integrated.log). Author 1340/1340 and old-source failing regressions remain [author evidence](../p03c-agents-transport-20260921/README.md), not independent full-suite claims.

The dependency installation followed the merged lock with scripts disabled; SDK 7.15.0 is adopted only for this transport and Pi retains its own version. No real credentials, paid calls, user Host restart, push or deployment. Composer is separately held for its review return. Preservation/removal is recorded in completion.md after verification; no next slice is started by this acceptance.
