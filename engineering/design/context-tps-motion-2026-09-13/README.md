# Context ring / request activity · visual candidate

2026-09-13 · Astra serial author; Luna bounded material/source audit. Base `main@93a8ac49f0a887bff430550441cddfa836690adf`. This directory is an interactive **synthetic design candidate**, not production telemetry wiring or an accepted screenshot baseline. No provider request or product source mutation.

## User decisions implemented

- Context has one ring-only entry at the composer's lower left, opposite Send. Both occupy 32px on desktop / 44px on narrow screens. Accessible name remains; visible capacity text and charts live in the second-level card.
- A compact waveform fills the unfinished bot slot at the left of the assistant activity row, followed by the short phrase. First-level TPS number, Unavailable text, elapsed/token metadata and disclosure arrow are hidden. The glyph remains a named keyboard-accessible detail entry. JP geometry remains imported by the study controller but is visually replaced in this direction.
- Where a running request has no real thinking/TPS projection, a light ambient word carousel with an ellipsis and breathing marks remain. They show activity, not speed. Missing TPS stays `Unavailable`; unknown/disconnected and terminal states stop the fallback. Reduced motion freezes the words and decoration.
- Rich measurement cards use the existing solid raised material, container radius, float shadow, caption/meta roles and focus offset. [Luna's source audit](card-audit.md) explains why the existing glass context overview is not a blanket recipe for chart/detail content. The material decision is to retain `--float`, not add another blur consumer.

## Run the candidate

From the repository root: `python3 -m http.server 8852 --bind 127.0.0.1`; open `/engineering/design/context-tps-motion-2026-09-13/` on that host. [HTML](index.html), [styles](study.css), [interaction controller](study.mjs), [fixtures](fixtures.mjs).

`Current fields` follows the shipped contract with synthetic examples: request estimate and admitted-resource composition have distinct scopes; a declared window is not a current capacity observation. `Token-clock concept` shows hypothetical same-clock capacity and request samples. This switch is study instrumentation, not a proposed product setting. All displayed 28s / 1.5k tokens and timing values are fixtures, never observed from the current user session.

Replay presents eight fixed samples, then stops at the final reading. Pause, scenario/mode change, document hiding and page exit cancel pending replay work. Send only starts this local replay. No network mutation exists.

## Grammar and nearest precedents

| Relationship | Adopted rule / source |
|---|---|
| `context.capacity` | Ring-only first level; composition/number/source second level. Same-scope observed numerator and capacity are required for a filled capacity arc; current estimate mode has an unfilled but visible ring. [Production context/telemetry audit](../frontend-audit-2026-09-13/context-tps-audit.md), `renderContextBar` in [runtime-view.mjs](../../../app/web/runtime-view.mjs), and [telemetry contract](../../../app/docs/request-telemetry.md). These are implemented field precedents, not a production ring. |
| `request.activity` | Bot + rotating ambient words + compact throughput on one line; run state and numeric telemetry have separate sources. Reuse [PresenceView](../agent-presence-2026-09-11/return-v1/src/presence.mjs), its JP geometry, clock and reduced-motion model. This is a prior candidate, not a shipped bot. |
| `popover.inspector` / `material.transient` | One anchored card at a time; Escape returns to the entry, outside click closes, sample selection retains its focus. Existing `.context-popover` in [styles.css](../../../app/web/styles.css) provides geometry and elevation. [Overlay](../home-composition-2026-09-10/disclosure-overlay.md) and [material](../home-composition-2026-09-10/material-grammar.md) retain their boundaries. Production integration should use the shared anchored lifecycle instead of copying this study controller. |
| Motion | Pointer entrance 180ms, exit 120ms, 4px/0.97→1, opacity; interruptions start from current rendered position. Origins follow the entry. Keyboard and reduced motion cut instantly. Sample marks transition in 180ms; number changes fade in 120ms. Words rotate every 3.5s; the seven-mark glyph breathes through staggered scale/opacity over 1.8s without a numeric scale. Synthetic known rates can quicken its visual rhythm; the glyph is not a chart and does not provide a sample reading. |

Existing color roles and SVG icon geometry are reused. No new dependency, backend state, skin or Review authority. The study page's scenic layout and large readout sizes are candidate composition values, not additions to the global token system. The user-directed fallback is a deliberate extension of the earlier static-unmeasured study: visual activity is allowed while measurement remains absent.

## Mature external references

- [Carbon progress usage](https://carbondesignsystem.com/components/progress-bar/usage/): determinate visuals need a known total; informs the unknown capacity boundary, not an imported component.
- [Emil, Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations) and [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips): origin-aware, short feedback and reduced motion. Reused local 120/180ms tokens instead of adding a library.
- User supplied [activity-row reference](evidence/04-user-activity-row.png) informs placement only. Its elapsed time/token figures are not Courtwork observations. The earlier [TPS exploration](../tps-specimen-2026-09-10/reference/README.md) is a reference trail; BE-42 remains the measurement-owner follow-up.

## Verification and status

[Verification](verification.md) records author browser checks and their limits separately from Luna's source audit. Screenshots are candidates. Product integration, real token-clock measurement, native-host / accessibility matrix and independent visual acceptance remain subsequent work. No push or deployment in this slice.

## Phrase and slot refinement · 17:18 input

[User reference](evidence/14-user-unavailable-reference.png) prompted the left-side waveform alternative above. The received [five-word fixture](../agent-presence-2026-09-11/return-v1/fixtures/words.json) is now fully mapped: Thinking…, Pondering…, Musing…, Considering…, Reflecting…. These are local sample phrases; the source's mentioned 185-word list was not received. Current-field fallback retains Working…, Taking a look…, Putting it together…. The 2026-09-13 user authorization allows this nonnumeric running decoration; the historical fixture's stricter fact gate remains preserved in its original source. Terminal labels have no ellipsis; reduced motion stays on the initial word.

This supersedes the earlier bot-plus-TPS-number placement in screenshots 06–11. Latest placement: [12](evidence/12-waveform-slot.png), [13](evidence/13-waveform-details-narrow.png). No product bot implementation is declared complete.

## Product application

User-authorized [production integration](production/README.md) now implements the Chatspace-first projection and reduced Attention variant. Latest placement supersedes this historical candidate: Context ring follows model/effort, immediately before Send/Stop. Candidate source and screenshots remain historical evidence. Real capacity/TPS ownership remains open.
