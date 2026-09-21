# P03-B Pi Runtime Port — independent acceptance

2026-09-21. Astra accepts source `c2be5945b2a8eecd3e5213c0a345b7b1d00e2943` on base `172118a`. Local product merge: `e2eaf6df30ba0541a8b43254c062335a9c8ff0ce`, onto main `3bf1e0b`. The frontend footer/Composer records and backend source merge without conflict.

## Evidence

- [Luna independent review](luna-review.md): six port tests 6/6, then bounded adjacent suites 56/56 (including those six), both exit 0. Covers admission/receipt ordering, single native journal across retries/continuations, old journal append, cancellation/late observations, steering and compaction/recovery. These counts are overlapping, not 62 unique tests.
- [Astra independent full suite](full-suite.log): `npm test` on the exact source candidate, **1326/1326, exit 0**, 252.7 seconds. Raw unfiltered log retained. No new test-only implementation was substituted.
- [Actual integrated-main smoke](integrated-smoke.log): `npm run smoke`, **exit 0**, including close/reopen and session continuation. This is integrated-main smoke, not an assertion that the candidate's full-suite count includes the independently merged frontend tests.
- Candidate whole-delta whitespace check passes; source tree clean and writer explicitly released. Product files match the reviewed candidate after integration.

## Architecture and scope

[All five author decisions](architecture-disposition.md) are disposed of in the original P03-B scope: adopt explicit composition-root injection, truthful pre-admission capability refusal, internal wrapped steering, current Host observation vocabulary and unchanged Provider-plane ownership. Native AgentSession cleanup remains in the existing loop's disposal paths. The port owns native journal/execution; Host retains admission, status, credentials, governed tools, effects/checks, recovery arbitration and Core decisions.

This accepts the **minimal Pi extraction**, not a fully runtime-neutral Host or a second runtime. Current Pi options/outcome types and provider helpers remain real coupling for the next consumer to address. recover/tool-result submission remain unsupported by this port; no new HTTP steering or recovery route is implied. Journal format/path/locator, adapter identity, schema and dependencies are unchanged. P03-C–F and local CLI/hook/credential-management capabilities remain unstarted by this review.

Author historical failures remain recorded. Our clean independent run does not identify the two missing author failure messages or prove their cause. Sonnet's 26 calls over a 20-call preflight budget are a recorded process deviation; future explorations stop at the bound.

All verification used isolated synthetic fixtures and loopback providers. No personal key/config reads, paid provider or browser/computer-use trial. User 8787/8899 retain their existing processes; this acceptance does not assert that the user's already-running Host has reloaded the new backend. Existing visual/accessibility residuals remain with their owners. No push, deployment or next core slice was started.

[Local merge and preservation cleanup completed](completion.md).
