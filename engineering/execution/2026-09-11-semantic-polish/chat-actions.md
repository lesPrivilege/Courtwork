# VS-04 · Chat actions candidate

Baseline `8094d1f`; Astra is the author. This is a frontend candidate, not independent acceptance. Scoped donor `2361a837c23433cc582a386d594dac9a488f377c` contributes the action renderer, production handler adapter, Chat/Attention/file wiring and eleven canonical Lucide sources. The unrelated WIP documentation and old screenshots are not imported as current evidence.

## Reuse and changed grammar

Nearest implemented precedents are `renderUserMessage`, `action`/`setAction`/`anchorPopover`/`installTooltips`, immutable Edit-as-new-message and the native popover. ADAPT the archived renderer; REUSE existing exact-text clipboard and composer draft handlers; REJECT browser speech, optimistic local feedback persistence, endpoint guessing or external UI libraries. Message identity is captured with session/opening epoch, projection and original bytes. A stream repaint cannot apply an old async result to its replacement. The renderer owns transient focus and display only.

User messages show Copy/Edit and More; assistant responses show Copy/Read aloud/Like/Dislike/Regenerate and More; file versions show a compact More menu. Fork, Share and Pin are distinct menu intents. Streaming allows current-text Copy and explains unavailable remaining actions. Unavailable production controls remain focusable to explain their reason, with `aria-disabled`; no missing capability reports success. Menu arrows/Home/End, Escape and focus return follow the existing control grammar. Feedback serializes the inverse pair; failures preserve the previous selection. Regenerate asks explicitly before a synthetic attempt.

`app/tests/fixtures/chat-actions/` uses the same renderer with a separate synthetic adapter. Its standalone server is `evidence/semantic-polish-20260911/chat-demo-server.mjs`; it serves static GETs only and has no API proxy. The fixture is not on the production static allowlist. Light/dark, response length/streaming and success/busy/error/unavailable are controllable; hover/focus are native pointer/keyboard states. All outcomes explicitly say Demo. No clipboard, speech, external link or Run is created by this adapter.

## Intent seams

These are presentation intents, not domain objects or new backend endpoints. Existing gap keys retain their owner in [the user ruling](../../design/chat-controls-2026-09-10/fake-ui-first/README.md).

| Intent / consumer | Identity and input → result | Lifecycle and capability boundary |
|---|---|---|
| Copy / message | Captured exact text bytes → clipboard completion | Existing browser handler; failure remains failure, no persistence or permission expansion. |
| Edit / authored message | Captured user text + current chat → composer draft | Existing editor, no original rewrite or implicit send. Attention retains busy/command predicate. |
| Read aloud / response · IC2-G01 | Message text/version + play/pause/resume → playback state | Separate stop/abort; production host lifecycle/capability unresolved. No audio service inferred. |
| Like / Dislike · IC2-G02 | Session/Run/projection + previous selection → like/dislike/null | Mutual exclusion, serialized pair and error rollback demonstrated. Durable owner, idempotency and authorization remain gaps. |
| Regenerate · IC2-G03 | Original response and input/configuration scope → a new attempt | Confirmation and busy/error demonstrated; original preserved. Production attempt/effect boundary remains unresolved. |
| Fork · IC2-G04 | Message boundary + history/material references → destination chat | Synthetic location only; production history ownership and authorization remain unresolved. |
| Share · IC2-G05 | Message range/version → access-controlled publication | Synthetic status only; redaction, expiry/revocation and publishing owner unresolved. No external call. |
| Pin · IC2-G06 | Individual message + current pin → boolean | Synthetic reversible selection; durable scope/order owner unresolved. Not chat pinning. |
| File menu | Session/Run/path/hash → clipboard or host file operation | Copy path/hash use existing clipboard. Save/Open-with/Reveal require an explicit handler; no current-version substitution. |

Behaviour evidence: `app/tests/chat-actions.test.mjs` covers production admission/exact bytes, feedback exclusivity/reversal/failure, duplicate suppression, detached result isolation, streaming restrictions, explicit regenerate and synthetic playback. Browser evidence is recorded separately under `evidence/semantic-polish-20260911/`; author screenshots are candidates. G01–G06 are not closed by this frontend work.
