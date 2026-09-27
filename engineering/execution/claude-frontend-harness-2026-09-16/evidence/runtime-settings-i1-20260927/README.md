# 06c production I1 · Settings → Agents → Runtimes · author delivery — 2026-09-27

Author: Claude (Opus 5.5), the queued 06c frontend owner. Branch `claude/runtime-settings-i1-20260927` from main `12799ff`. This is **author evidence**. It is not independent, visual, accessibility or combined acceptance.

Commits:
- `a6e07f8` · the product change and its tests;
- the harness/docs commit that adds this README: geometry capture in the browser script, this evidence and the owner record.

## What the page does

**Settings → Agents → Runtimes** reads `executionRuntimes` from the authenticated `GET /api/v5/runtime-info`, with no `sessionId`, in the same pass as the rest of Settings, and again on **Refresh**.

- **List.** One row per runtime: its name, `Host default` where it applies, `Configured` or `Unavailable`, `live status not checked`, and the Host's reason on an unavailable row. Each row has one **Details** action.
- **Detail.** It keeps five facts apart:
  - configuration (`configured`);
  - owner (Host configuration, read only);
  - availability, with the Host's reason;
  - live status, always "Not checked";
  - Host default.

  Declared operations are listed with the Host's reasons. When `capabilities` is null the page says it is not reported; it does not invent any. The runtime id, configured revision, fingerprint and reason code sit behind **Technical detail**.
- **Controls.** Back and Refresh only.

Kept from the accepted synthetic 06c journey:
- while a refresh is out, the previous reading stays and is named as the previous reading;
- a failed read stays apart from an empty list, and keeps the last good reading;
- only the newest read lands, and no reply navigates;
- Details puts focus on Back, and Back returns focus to the row left from;
- a re-render keeps the focused control and any open disclosure.

A Host without the inventory (older than I1, or `schemaVersion` ≠ 1) is a failed read with "This Host did not report its execution runtimes.", not an empty list.

Before this change, on main `12799ff`, production Settings had no Agents group: `#settings/agents` fell back to General, and `executionRuntimes` had no consumer.

## Real browser, real Host, before any Session

Command, disposable Host with fake provider and a fresh data directory:

```sh
node app/scripts/runtime-inventory-browser.mjs --out <dir>
```

The run uses HeadlessChrome 153 and CDP keyboard events. The app bootstraps its own token. Raw data: [`browser/record.json`](browser/record.json).

| Check | Result |
| --- | --- |
| Deep link `#settings/agents` before any Session | Agents tab selected; rows `Pi · Host default · Configured · live status not checked` and `Agents API · Unavailable · live status not checked · This execution runtime is not configured on this Host.` |
| Requests | Every inventory read is `GET /api/v5/runtime-info` with the work token and no `sessionId`. Opening Settings issues two (see Limits). |
| Host side effects | Sessions 0 → 0; `runtime-state.json` digest unchanged across the whole run |
| Keyboard: Refresh → Tab → Enter | Focus on the Pi row's Details, then on Back in the detail |
| Keyboard: Back (Enter) | Focus returns to the Pi row |
| Controls present | List: Refresh plus one Details per row. Detail: Back and Refresh. No mutation control |
| Refresh while the read fails (CDP `Fetch.failRequest`) | `The local runtime could not be reached. The rows below are the last reading that succeeded.`; both rows kept; focus stays on Refresh |
| Refresh again, request allowed | Error cleared, reading `ready`, focus on Refresh |
| 390×844 CSS px (DPR 2) dark and light, list and detail with Technical detail open; 1440 with Technical detail open | Page scroll width equals the viewport; no element wider than the panel; the 64-hex fingerprint wraps |
| Escape from a detail, then `#settings/agents` again | Settings closes (hash cleared); returning shows the same runtime's detail |

Screenshots in [`browser/`](browser/):
- `list-1440-light`, `detail-1440-light`, `detail-technical-1440-light`, `detail-1440-dark`;
- `refresh-failed-1440-light`;
- `list-390-dark`, `detail-390-dark`, `detail-390-light`.

### Visual/spatial mapping (measured, `record.json` `geometry`)

- **Role.** The list, Back and Refresh are workbench chrome. The detail facts are a reading readout in the existing `.data-list` / `.settings-block` anatomy, with the synthetic detail's `--settings-group-gap: var(--space-4)` rhythm. No new token, colour, radius, shadow or glyph.
- **Targets, fine pointer at 1440.** Refresh is 28×28 and Back 87×28; Details is 30 tall. **At 390** (mobile emulation) the existing coarse fallback gives 44 for Refresh, Back and Details.
- **Type.** Row title 14/21 (500), row help 11.5/16.7, block title 13/19.5 (500), detail terms and values 11.5/17.25. The detail values use the existing `.data-list` role, the same one the accepted synthetic detail and Developer › Runtime info use; they are not on the 15px reading role. **This is left for parent disposition, not changed here.**
- **Placement.** First content begins 209 px from the top at 1440 on the list and 185 px on the detail.
- **Group glyph.** The Agents group uses the `agent.profile` glyph, following the `plugins → plugin.object` object-glyph precedent. The registry has no free, fitting category glyph.

## Tests

| Command | Result |
| --- | --- |
| `node --test tests/runtime-inventory-settings.test.mjs` (production controller and view under tiny-dom; plus one real-Host read through the controller) | 12/12 |
| `node --test tests/runtime-inventory-browser.test.mjs` (the browser run above, asserted) | 1/1 |
| Targeted, [`targeted-tests.log`](targeted-tests.log): the two above, Settings preferences/navigation/plugins, product icons, runtime-intake retry, the accepted synthetic `runtime-management`, and Sol's backend `runtime-inventory` | 105/105 |
| Full `npm --prefix app test`, [`full-suite.log`](full-suite.log), on the tree committed as `a6e07f8` | **1738/1738**, exit 0 |
| `npm --prefix app run smoke`, [`smoke.log`](smoke.log) | exit 0, real provider `not_run` |
| Lints, [`lints.log`](lints.log): `lint-colors`, `lint-interaction`, `lint-materials`, `lint-shapes`, `lint-spacing`, `check-product-copy`, `check-semantic-consumers`, `product-semantics` | all exit 0 |
| `node tools/check-doc-links.mjs`, [`doc-links.log`](doc-links.log) | exit 0, no problems |

Pinned assertions updated, with reasons:
- `settings-preferences.test.mjs`: the closed group list gains `agents`;
- `product-icons.test.mjs`: the tab glyph expression is now the `GROUP_OBJECT_GLYPHS` map, which the test pins;
- `raw-consumers.json` records the new Refresh as a named read.

## Not covered by the author

- 1280 px.
- Native 200% zoom and text-spacing overrides.
- Forced colours.
- Screen reader announcement of the `role="status"` reading line and the `role="alert"` error.
- A long, unknown runtime id at 390 px (only the 64-hex fingerprint was exercised).
- A managed runtime that is configured (the loopback fixture) in the browser. The controller/view case with an unknown id and operation stands in for it.
- The user's own Host 8787 or any live provider.

Computer-use visual inspection stays on the OpenAI route.

## Limits and decisions for the parent

1. **New Settings group.** Production had no Agents group; this adds it, following the 2026-09-20 IA ruling, holding only Runtimes. Agent profiles are not moved. Astra may place it otherwise.
2. **Two `runtime-info` reads on Settings open.** Models' existing readout reads it, and the inventory reads it again. This keeps a failed inventory read local to its block. Sharing one read would couple the two blocks' failure states, and is left as an option.
3. **Detail value type size.** See the visual mapping above.
4. **Names.** `Pi` and `Agents API` are presentation names for two known ids; any other id is shown verbatim.
