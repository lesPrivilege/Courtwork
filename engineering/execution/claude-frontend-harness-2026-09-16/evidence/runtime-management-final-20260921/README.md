# 06c Runtime management — final frontend acceptance

2026-09-21 · Astra. Accepted source `5f892137850229cd920f29ecc8dfcc895ccb4b48`, delta over `84faff9`, integrated locally as `4a3ac9e74c38cd4a540bbd5efc7d0a219ca9effa`. This accepts the explicit synthetic frontend journey and its controller semantics, not a production runtime-management API, credential store or real local-agent integration.

## Original returns disposed

- **RM-R1 adopt, closed:** submitted pending/unknown values are named as submitted and uncertain; newer unsent input is separate. Neither an unresolved command nor a status check is described as definitely unapplied.
- **RM-R2 adopt with the original Astra adjustment, closed:** a read must identify the same runtime, agree on the connection at the receipt's revision, or be a legitimately newer revision. Stale/inconsistent/failed/deferred reads remain locked, with Read again available. A newer state preserves the original receipt; rereading does not resend the command.
- **RM-C1 adjust, closed for this proposed contract/fixture:** not-applied is an authoritative final negative; inconclusive/pending/unrecognized answers remain unknown. The synthetic owner fences the operation ID against a late request. Production durable storage and lookup remain proposed owner work.

## Independent evidence

[Luna's bounded delta review](cw-rm-final-delta.md) and [test log](cw-rm-final-delta.log): **34/34, exit 0**. [Actual integrated main](integrated-tests.log): **75/75, exit 0** across Runtime management, Agent profiles, coding-entry and static-manifest suites. Product app bytes match the reviewed candidate. The only merge conflict was append-only author/reviewer sections of order 06c; both were retained. Author full 1386/1386 remains separately attributed in the [author packet](../runtime-management-20260921/README.md); no unnecessary independent full rerun.

Astra ran OpenAI in-app browser against a separately started read-only synthetic preview at 8975:

1. Connect Hermes with a stale read-back: [receipt revision 7 versus reading revision 6](01-stale.dom.txt), [screenshot](01-stale.png). The page explicitly rejects the old reading as confirmation and keeps mutations disabled.
2. Read again obtains [revision 7 and the same connection](02-current.dom.txt), preserving the original receipt and restoring actions.
3. Reconnect with a lost reply: [submitted value remains uncertain](03-unknown.dom.txt). Typing afterwards yields [separate newer unsent draft](04-newer-draft.dom.txt).
4. Check status yields [confirmed revision 8 with the original submitted connection name, while newer input remains unsaved](05-reconciled.dom.txt).

The prior [full-journey review](../runtime-management-review-20260921/README.md) retains its bound-Run, disconnect/history, Escape, refusal-focus and narrow/dark evidence on `84faff9`; it is not relabelled as a new full browser pass on `5f89213`. Native zoom, reader, forced colors, Safari, touch, real multi-tab/restart and production adapters remain unexecuted. No real provider, browser profile or secret was used. The temporary preview and browser tab were stopped; user services were not restarted.

## Follow-through

The existing 06a optional-note defect and CE-F2 initial focus remain independently scoped in [06d](../../06d-surface-continuity-20260921.md), now combined with the user's requested [Preview/Browser reference intake](../../../../research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md). Source/behavior acceptance is separate from that future prototype. No next author process is launched automatically. [Integration and preservation completion](completion.md).
