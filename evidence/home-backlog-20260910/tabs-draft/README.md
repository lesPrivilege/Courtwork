# Unaccepted Preview seats draft

At the user's explicit handoff instruction, Astra stopped Tabs construction and removed these nascent changes from active product files. `unaccepted-preview-seats.patch` targets product **f4f243689385290cca98d4329ba8f8fc9eb761b6**. It is retained for Opus to inspect, not automatically apply. `git apply --check` passed on that base.

The patch sketches a UI-only seat registry: one replaceable transient preview plus explicit kept references, existing full file identity, scope reset, close fallback and a Keep control. The two pure-state tests passed. No browser or complete integration verification was performed, no independent review accepted it, and the new static route was not exercised in the live host.

Before adoption: review stable ordering and keyboard focus after tab DOM replacement (the existing key handler can hold a removed node); inactive-close focus behavior; selected/read identity and stale read cancellation; wide/narrow overflow; reload/session scope and return focus; document versus inspector semantics. Keeping a reading seat is not a backend pin, write, dirty draft or formal acceptance. No multi-document backend contract is claimed.

[Opus handoff](../../../engineering/design/attention-agent-2026-09-10/opus-handoff.md).
