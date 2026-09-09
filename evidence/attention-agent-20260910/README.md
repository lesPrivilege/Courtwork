# Attention global agent · 2026-09-10

Astra author implementation from `444f80d`, incorporating main `405ad76906516e51ad7ea2a513d0e9f3ea3376f9`. [Architecture and scope](../../engineering/design/attention-agent-2026-09-10/README.md), [runtime contract](../../app/docs/attention-agent.md).

Delivered: one global Attention role with multiple conversations, explicit RuntimeStore6 global/project scope and validated 3/4/5 migration, existing Session/Run execution, progressive retained-message memory, explicitly targeted project Attention reads, shared Runtime profile packaging and native modal conversation UI. Latest user visual direction: single-line rounded rectangular composer with matching rounded square send/stop buttons. Enter sends, IME composition does not. Existing work and unsent in-page drafts survive closing the panel.

## Author verification

- [Full suite](tests.log): 418/418 passed, including four new global/identity/memory/migration/retry tests.
- [Focused final regression](regression.log): 6/6 passed, adding close-during-send and late-history/draft interleaving to the same suite. Full suite predates these two test-only additions and final explanatory copy edits.
- [Smoke](smoke.log): public runtime read/write, versioned artifact, close/reopen and continuation passed with local-fake.
- Color and material lints passed. No paid provider was called.
- Live local browser, independent synthetic data: underlying Home draft retained; open/close modal; backend conversation selection; real scripted attention_projects and ask_user flow; answered question produced completed Run; active Run disallows a second send; one-line Enter send; Runtime entry; Attention scope; save a profile without selecting; explicit selection moved revision 1→2 and removed ws_write from exposure. Narrow viewport composer and matching buttons visually inspected. These are manual browser observations, not an automated visual suite or native AppKit acceptance.

## Non-author evidence and limits

Existing Luna agents performed bounded read-only checks: backend 12/12 existing targeted tests, frontend 10/10 plus synthetic delayed-choice and receipt-retry checks; profile CAS/scope/capability ceilings reviewed. Their reports did not provide retained standalone artifacts, so they are supporting observations, not independent acceptance of this complete delivery. Backend requested dedicated new-global coverage; the author added the four tests above. Frontend flagged writes finishing after close: authorized sends intentionally retain their receipt in the controller; closing only stops view polling, and regression verifies reopen. Late Configure navigation uses an opening epoch to prevent a closed panel navigating later.

Real provider, broad connector authentication/email/GitHub/meetings, synthesized memory writeback, Expert delegation, formal Attention maintenance actions, native host and G1–G5 remain open. RuntimeStore6 was exercised only with independent synthetic data; do not share upgraded data with older hosts. No deployment or external messages.
