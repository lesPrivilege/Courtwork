# Home composition delivery · 2026-09-10

Astra author/integration owner; Luna bounded non-author source mapping and tests. Product baseline `00b2f2886e04aa7b7facb588d4375a246f3e341d`, isolated branch `codex/home-composition-20260910`. [Design and full input consumption](../../engineering/design/home-composition-2026-09-10/README.md), [Apple/native seam](apple-window-controls.md), [contrast report](contrast.md).

## Implemented

Home now offers project Attention and recorded UTC activity above the composer, with neutral strata and one narrow review-color role. Modules is the new-device default; explicit Simple/collapse preferences remain. Attention has its own read-only master/detail workspace and an explicitly labelled local Assistant prompt preview. Sidebar uses 8 initial real session rows per expanded project and refreshes all expanded projects. The native control reservation sits left of the brand in its existing header, with versioned host geometry; no extra strip or fake traffic lights.

## Verification and attribution

- Astra full Node suite after final behavior fixes: **395/395 pass**, no skips; `npm --prefix app test` (53.24s). `npm --prefix app run smoke` passed with `realProvider: not_run`.
- Luna independently added six tests and ran the earlier combined slice **392/392**; tested malformed date/count/period/pagination/revision packets, old-project/detail races and local-only Assistant prompts. This is bounded non-author verification, not blanket independent acceptance.
- Luna found a Back-to-items loading flag bug. Astra fixed it and added a regression; Home/Attention + native geometry targeted tests **9/9**. Native tests include malformed/out-of-range payloads, dynamic inset, fullscreen zero inset and overlay-off restoration. No native AppKit process was built or accepted here.
- `node --check` on modified JS, `git diff --check`, color governance lint and the expanded light/dark contrast report pass.
- Astra browser inspection used the real local HTTP host, synthetic projects/sessions/runs/Attention, fake loopback provider only. Desktop 1440×900: 820px overview column, both cards before composer, first pending request visible; brand starts x=80, header y=0/h=56, no top strip, no horizontal overflow. Expanded sidebar shows eight NDA rows plus one other-project row, with Show more remaining.
- 390×844: no horizontal overflow, Attention switches list/detail, visible Attention buttons ≥44px, main header toggle begins x=80 in desktop-preview mode. Settings Back to app also begins x=80 at y=0 header. Plain browser receives no reservation.
- Real Attention empty state via Resolved filter; source/basis/relation disclosure shows recorded synthetic references; selection remains neutral; dark mode + reduced-motion inspected. Workspace composer draft survives Attention open/back. Assistant suggestion and preview stay local (independent request-spy regression).
- Earlier real fault-proxy browser checks: same-scope errors retain confirmed Activity/Attention, retries recover focus, delayed 28/84 and old/new project responses cannot overwrite current scope. Pending work remains separate. The proxy targets synthetic data only.

Research findings consumed: invalid DTO guards, source disclosure, unknown-freshness vocabulary, custom-skin review-color ownership, registry contract drift, sidebar refresh seam, and native same-row placement. Old CC-D0-a admission/geometry is explicitly superseded rather than silently rewritten as historical fact. Control/Icon/Sidebar/Selection input disposition is itemized in the design document; icon/Control specimen matrices remain specifications, not completed comparison boards.

## Reproduce

From the repository root, with app dependencies installed:

```sh
npm --prefix app test
npm --prefix app run smoke
node tools/lint-colors.mjs
node tools/contrast-report.mjs
node evidence/home-composition-20260910/preview.mjs
```

The preview chooses an unused loopback port and creates a separate temporary data directory. It prints its URL and synthetic project IDs; it does not read personal credentials or data. It creates two projects, ten sessions, four fixture Runs (one waiting for human input) and four Attention items. `?shell=desktop` is a visual reservation preview only. Remove that query for ordinary browser chrome.

Optional fault injection: set `HOME_UPSTREAM` to the printed origin and run `fault-proxy.mjs`; its default listen port is 8940 and rules path can be set with `HOME_FAULTS`. JSON format: `{ "rules": [{ "path": "/work-activity", "days": 28, "delay": 1000, "fail": true }] }`. Never aim this tool at personal workspace data.

## Boundaries

No automatic acknowledgement, resolution, provider call, external message, deployment, schema migration or native GUI acceptance. This frontend does not close full ATT-FE-01/RT, CC-I, icon-family selection, A2 model evaluation or G1–G5. Main integration does not imply product acceptance. The shared pre-existing `wk98-regression.json` edit is unrelated and preserved.
