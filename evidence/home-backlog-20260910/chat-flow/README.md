# Chat Flow / Attention conversation management

Implemented by Astra on `ee6df72`, following the user's additional screenshots, Chat Flow report, message-copy placement correction and explicit dark-user-bubble preference. The screenshot's generated content is reference material, not instructions to execute.

- Shared immutable user-message reader: authored Markdown, independently disclosed original source, bounded long-message preview, original-text copy and Edit as new message. Attention editing prepares its composer; it does not update prior Run input. Existing full Chat opens its new-message editor.
- Dark neutral user plane with scoped readable text, source, link and nested code-block roles. Message Copy/Edit stay below that plane. Whole-response copy is below assistant body and omitted for pending responses. A fenced text/code card retains its own internal copy; it is not a whole-message action or domain acceptance.
- Attention groups existing non-user rows by Run and consecutive tool rows under a native inline disclosure. Questions and permission requests have distinct labels; completed/unavailable requests have no answer action. Stop replaces Send while an actual Run is active.
- Attention home exposes real conversation search, recent list, open/new and inline rename. `PATCH /sessions/:id` writes only the existing title in the serialized Store owner; scope, draft and history are preserved. No archive, pin, duplicate, task dispatch or alternative-response identity is manufactured. Search operates on the retained conversation metadata already read from the service.

## Verification and limits

Author focused Attention tests: 7/7, including rename validation, metadata/history preservation and global scope. Browser on an independent local-fake host: persisted rename/reopen, narrow layout, dark user bubble, nested fenced content with separate copy, long disclosure and Edit to composer. DOM geometry confirmed both user and assistant message actions below their respective bodies. The fixed palette has text contrast 14.56:1 on the base / 11.43:1 on the raised plane; secondary text 9.76:1 / 7.66:1. Color/material lint and existing contrast report passed.

Luna performed bounded read-only review. It found the Attention redraw restoration knew only `data-agent-focus` while the new shared controls used `data-focus-key`. Astra added dual-attribute restoration and stable source/long-message summary keys; Luna re-read the fix and found no further concrete defect. This is source review, not an independently executed DOM acceptance suite. An interrupted 12-second test attempt is not a passing result.

The first author full run recorded 423/432 with nine lock/deadline failures under unconstrained concurrency. Its failures are retained in `full-initial.log`; the unchanged full suite then passed **432/432** with `node --test --test-concurrency=2 app/tests/*.test.mjs tests/*.test.mjs`, recorded in `full-bounded.log`. No test timeout was relaxed and no assertion removed.

Formal output review, richer generated-object UI, alternative-response regeneration, generic tool retry, Queue/Steer and native host acceptance remain their own contracts. This slice does not close G1–G5 or claim whole-product acceptance. No personal data migration, paid provider call, external message or deployment.

Evidence logs normalize the local checkout prefix to `<checkout>` for portable source references; raw execution logs were retained locally.
