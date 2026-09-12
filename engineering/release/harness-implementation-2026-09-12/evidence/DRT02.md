# DRT-02 · DeepSeek protocol and GUI evidence

Uses the actual locked Pi 0.85.1 SDK and Host service with `deepseek` / `openai-completions`, installed catalog model `deepseek-v4-flash`, reasoning effort `high`, and a loopback endpoint. `SYNTHETIC_DEEPSEEK_KEY` is a fake fixture value. This proves local protocol wiring, not live model availability, quality, latency or billing.

[Four-case output](drt02-tests.txt) passes. The normal case spans six wire requests: streamed text, a denied workspace write, an approved exact write, and a new Run after reopening the same native session. Assertions cover every previous assistant `reasoning_content` value (including plain-text turns), matching tool-call IDs, native session identity, provider/model/effort snapshot, denial with no file, and the approved file's exact bytes. Private protocol metadata does not appear in public events. Other cases exercise explicit HTTP 400, cancellation and absent metadata, with no fallback model and no artifact.

The absent-metadata case observes the SDK supplying an empty `reasoning_content`; the loopback then rejects the subsequent request with 400. It is an upstream synthetic rejection, not a local preflight check. No adapter patch is justified by this successful replay probe alone. [DeepSeek's thinking-mode documentation](https://api-docs.deepseek.com/guides/thinking_mode/) was consulted on 2026-09-12 for the prior-turn protocol requirement; the live endpoint still needs a separate trace.

Reproduce: `node --test app/tests/drt02-deepseek.test.mjs`. The reusable fixture is `app/tests/fixtures/deepseek-loopback.mjs`; interactive synthetic mode is `node app/scripts/harness-node1-fixture.mjs` (prints fresh local URL, independent data and ports, no real provider).

## Observed GUI path

Astra used the in-app browser against the synthetic Host on 2026-09-12, session `862c2cd1-4be4-46ec-94d5-ca19ecf14f14`, at a 476px-wide viewport. Three prompts exercised ordinary completion, Deny, then Approve. Browser accessibility state and visible screenshots confirmed:

1. First reply `Reply 1: complete.` and actual Completed state.
2. Pending write card showed `out/deepseek.md`, 67 B, exact content and separate Deny/Approve buttons. Deny produced `Runtime action was denied by the user`, `Write denied`, then `Reply 3: complete.`.
3. A fresh approval card led to `Write approved`, a Recorded version file link and `Reply 5: complete.`. Opening the recorded file displayed the exact 67-byte fixture content and the statement that review acceptance is not recorded here.
4. Model picker showed installed DeepSeek V4 Flash and `high`, with custom endpoint disclosed. Saving for future runs returned to the conversation; browser refresh shortcut retained all three runs and the file entry. Automated service restart/history proof is in the test, not inferred from this shortcut.

Nearest implemented precedents: `app/web/model-picker.mjs` / settings provider projection, chat's exact-write permission card, and workspace recorded-version reader, as indexed by the active frontend contract. Affected grammar: normal Chat, Model & effort overlay, permission waiting/denied/approved, recorded file provenance. No skin or UI source was changed. The synthetic stream is intentionally fast; screenshots prove rendered output and states, while incremental deltas are asserted at the service/wire layer. These observations do not constitute a general accessibility or responsive audit.

## Serial gate still open

P00 intake and the P01/P02/P02b implementation have evidence; DRT-02 synthetic/GUI coverage is available. Node 1 still requires a real DeepSeek+Pi GUI run with user-configured credentials and authorized provider use. Only after that bounded review may Node 2 (genuine runtime replacement) begin; Node 3 remains later. The live plan is ordinary reply, same-chat continuity, Deny/Approve exact workspace write, file reading and one reopen/stop observation as applicable. Existing frontend validation prompts remain reusable. No personal credential store is inspected or copied.

## Non-author follow-up

Luna independently inspected this three-file synthetic fixture and ran 4/4 tests successfully, without edits or live calls. It confirmed the installed catalog and SDK DeepSeek compatibility options. Limits retained: DRT reopening is graceful close/reopen, not crash recovery; cancellation checks cancelled/no-artifact but does not assert that the loopback observed socket closure. The separate MCP SIGKILL test does not extend these DeepSeek claims.
