# P03-C next dispatch evidence

Astra, 2026-09-21. Actual main `5554560b0b77336a81e76602d016ea2d96f81b36`; P03-B accepted. The active Composer tree `claude-work-location-20260921` is preserved. [Luna's bounded source map](luna-source-map.md) confirms no production Agents transport, no Host required-action consumer and Pi-only stored native locators.

## Astra disposition of the map

Adopt transport first, then the distinct Host consumer. The map's broad file list/schema discussion describes the later consumer, not first-order write permission. Its final “no live transport” wording means no live service invocation/exposure: the first order does implement production transport code against a synthetic wire. Existing normalization/ledger/settlement remains consumed. Its create-ACK/recovery/overlapping-stream findings are source-grounded risks to address in C's Host/recovery consumer; they are not closed by transport acceptance and are not grounds to redo A/B wholesale.

## Narrow first-party recheck

Actually fetched/read on 2026-09-21:

- [Official TypeScript Sessions reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents/subresources/sessions): create/retrieve, events, items and turns are separate methods. The current events.create signature shows `idempotencyKey`. This differs from the pinned 2026-09-15 artifact note, which records `Idempotency-Key`. Treat this as documentation/artifact drift requiring exact version and emitted-header verification; neither spelling is blindly prescribed for a different SDK.
- [Official Functions guide](https://developers.openai.com/api/docs/guides/agents-api/tools/functions): pending `required_actions`, rather than historical call items alone, identify calls requiring results; result submission carries the pending turn/call identity. The application executes the function. This supports retaining Host governance in the later consumer.

These two reads do not establish account access, supported models, current npm artifact integrity, create-request idempotency or live service behavior. No API/credential call was made. Historical source snapshots/pins remain unchanged.
