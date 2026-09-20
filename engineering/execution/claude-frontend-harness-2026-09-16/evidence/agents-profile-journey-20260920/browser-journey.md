# Agent profile journey · browser evidence

Author: Claude (this slice's writer). Base `95ed9cfb068300d154dca9643bf754beebe1d295`.
Preview served by `node app/scripts/agent-profiles-preview.mjs` on `127.0.0.1:8899`, driven in the
Claude Code in-app browser. **Not** an OpenAI computer-use agent — see the limits section of the
[delivery record](../../06a-agents-profile-journey-20260920.md).

All readings below are synthetic. No provider, host, credential or product data was touched.

## How to reproduce

```bash
CW_SPECIMEN_PORT=8899 node app/scripts/agent-profiles-preview.mjs
```

Then in the page: pick a Scenario, open a row, change Role / Kits / Runtime, Save. `Slow replies`
multiplies the adapter's delay by six so the in-flight states can be read. `Reset preview` returns
the synthetic records to their seed.

Every state below was produced by that sequence and read back from
`#agent-profiles-mount` (`innerText`). Excerpts are verbatim.

## Required interactive cases

| Case | How it was reached | Verbatim excerpt from the rendered panel |
|---|---|---|
| Empty list | Scenario `No agent profiles` | `No agent profile is configured on this host yet. An agent appears here once one is installed or created.` |
| Loaded list | Scenario `Normal` | `Attention · Kits: Attention triage, Praxis · Hermes` / `A run is using revision 7 now.` |
| Loaded profile | Open `Attention` | `Saved revision 2 · 9/18/2026, 2:40:00 AM` · `Model owner: Hermes · its own settings` |
| Dirty draft | Tick `Coding review` | `Requested: Kits Attention triage, Praxis, Coding review. Effective is still what revision 2 holds.` |
| Incompatible Kit / runtime | Same draft, runtime still Hermes | `Not supported on Hermes. It needs to read the connected repository, write a private candidate edit and run the project's fixed check.` and, in Permission scope, `Not supported by Hermes · asked for by Coding review` (three lines). Save is unavailable with `Coding review is not supported on Hermes. Remove the Kit or choose a runtime that supports it.` |
| Saving | Runtime → `Pi`, press Save | `Saving…` on the button and in the status line; Role, Kits and Runtime stay readable |
| Confirmed revision | after the reply | `Saved. This host confirmed revision 3; it applies to the next run.` and the header moves to `Saved revision 3 · 9/20/2026, 8:00:00 PM` |
| Return to list position | `Agent profiles` (back) | Row reads `Attention · Kits: Attention triage, Praxis, Coding review · Pi`; keyboard focus lands on that row's own action (`data-focus-key="row:ap-attention"`, verified through `document.activeElement`) |
| Failed save, draft retained | Scenario `Save fails`, change Role, Save | `The host did not accept the change. Nothing was saved, and your draft is kept here.` with `Requested: role Coding. Effective is still what revision 4 holds.` still present and Save still offered |
| Stale revision / conflict | Scenario `Saved elsewhere first`, change Role, Save | `This profile was saved elsewhere and is now at revision 5. Your draft was composed against revision 4; nothing was overwritten.` Save becomes unavailable; `Reload saved profile` appears |
| Recovery from the conflict | press `Reload saved profile` | `Reloaded revision 5, saved elsewhere. Your draft is unchanged and still not applied; review it against these values before saving.` The draft summary then names all three differences against the *other writer's* values: `Requested: role Coding; no Kit; runtime Pi. Effective is still what revision 5 holds.` |
| Runtime unavailable (list) | Scenario `Pi unavailable` | `Coding · Kits: Coding review · Pi · unavailable` and the row's action becomes `Why is Pi unavailable?` |
| Runtime unavailable (detail) | press that action | `Available for new work — No. The Pi process is not running on this device.` |
| Active-run binding frozen | Scenario `Normal`, open `Coding` | Header: `Saved revision 7 · 9/19/2026, 10:05:00 PM · a run is bound to revision 7`. Banner: `A run is active. This group is read only until it ends. An edit you make now is kept here as a draft; it is not applied, and it will not apply itself later.` Role, Kits and Runtime controls are `disabled`; Save is unavailable. |
| Runtime-native model ownership | open `Attention` (Hermes) | `Hermes chooses its own model. CourtWork reads that choice and does not set it.` |
| CourtWork model ownership and scope | switch runtime to `Pi` | `Where that comes from: Models · All chats · future runs` and `Requested by this agent: Nothing — this agent makes no model request.` |

Out-of-order replies (a late open landing on another profile, a late save landing on a newer draft
or on a profile you have left) are not reachable by hand and are covered by
`app/tests/agent-profiles-specimen.test.mjs` with gated adapter replies.

## Keyboard, focus and layout

- **Tab order** from the back control, read from `document.activeElement` after each real `Tab`:
  `back → role → kit:kit-coding → kit:kit-praxis → kit:kit-attention → runtime → runtime-detail →
  discard`. It matches the visual order; the disabled Save is skipped.
- **Focus survives re-render.** Changing the Role `select` and toggling a Kit checkbox each leave
  focus on the same control (`data-focus-key` of `document.activeElement` unchanged), which is the
  reason the panel restores focus by key rather than rebuilding blindly.
- **Overlay focus.** Opening the runtime detail puts focus on `Close runtime detail`, and a reply
  arriving while it is open does not drop focus to `body`. Closing it returns focus to the
  `Runtime detail` control that opened it — verified after the panel had re-rendered underneath,
  which is why the way back is held as a key and not as a node.
- **Escape: not executed.** The automated Escape key in this browser pane does not reach the page's
  close request. A bare control `<dialog>` created on the same page behaved identically, so this is
  the harness, not the surface. Escape-to-close is the native `<dialog>`/`showModal()` behaviour and
  the `close` handler that returns focus was exercised through the close button. It needs a human or
  a different driver to confirm.
- **Light and dark** both read correctly (`Appearance` switch); no colour literal is introduced and
  `node tools/lint-colors.mjs` passes.
- **Widths.** At 1280×900 the two-column Settings anatomy holds. At 390×844 the product's own
  ≤1023px rules take over: the group tablist becomes the group `select`, rows stack, and
  `document.documentElement.scrollWidth === clientWidth === 390` — no horizontal page scroll.
- **200% zoom equivalent** (viewport halved to 640×450): `scrollWidth === clientWidth === 640` and
  the panel's own scroller reports no horizontal overflow; content reflows into the document flow
  and is not clipped. Real browser zoom at 200% was not exercised separately.
- **Long text.** The longest synthetic strings — the incompatibility sentence, the conflict sentence
  and the runtime management note — wrap without clipping at 390px. Labels longer than the fixture's
  own were not tested.
