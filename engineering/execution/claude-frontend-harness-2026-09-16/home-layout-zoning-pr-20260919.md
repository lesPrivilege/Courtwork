# Home layout zoning PR registration

2026-09-19 · User-requested follow-up to product slice P. This is a registered PR contract only: no product code, screenshot baseline, implementation order, deployment or visual acceptance is claimed.

## Outcome and owner

Home's variable slogan/greeting must not determine the alignment geometry of the Home cards. The Modules composition will have explicit zones so later copy changes can wrap or grow without making the Attention and Activity cards drift or lose their shared top alignment. The `Show modules` / `Hide modules` disclosure control will be recomposed as band chrome, outside both the slogan zone and the card grid.

Owner remains **P / Home composition**. Greeting text and identity facts remain owned by Profile and `home-greeting.mjs`; Attention and Activity data remain owned by their existing services/projections. This PR changes placement and layout only. It does not add a slogan store, card state, module registry, service route or schema.

## Change boundary

| Item | Contract |
|---|---|
| Stable zones | Separate (1) band chrome/disclosure, (2) identity/slogan content and optional Example context, and (3) the card grid. Variable text may change the slogan zone's own height but must not become a spacer or baseline for either card |
| Card alignment | Attention and Activity align from the card grid's own start line at the applicable two-column breakpoint. Their shared alignment is independent of greeting length, date text, locale, Profile address and Example copy |
| Narrow layout | At the one-column breakpoint, preserve semantic order and normal document flow; long slogan/Example text may wrap without overlap, horizontal overflow or detached controls |
| Disclosure control | `Show modules` / `Hide modules` remains the native `details` summary and retains its accessible name, tooltip, focus identity, keyboard activation and collapse preference. Reposition it into the band chrome/header zone; do not overlay it on the slogan, place it inside a card, or use absolute positioning whose anchor moves with copy |
| Collapse continuity | Collapsing and expanding keeps the existing preference owner, returns focus to the disclosure control, preserves the composer relationship and does not invent animation state or delay the semantic open/closed state |

## Existing responsibility and precedent

- Affected responsibility: `app/web/home-view.mjs::renderHomeModuleBand` and its Home-only layout rules in `app/web/styles.css`; `app.mjs` remains responsible only for projecting the existing greeting and Example node into Home.
- Nearest implemented precedent: slice P's Modules composition (`home-masthead`, `home-primary-stack`, Attention and Activity), the existing native `details`/`summary` disclosure, and the Home composition precedent indexed in `engineering/design/agent-interface-2026-09-10/precedents.md`.
- Affected grammar: UX-02 (necessary context remains available), UX-03 (Disclosure stays a disclosure), UX-07 (spacing and alignment express stable relationships). The frontend continuity requirements for focus, narrow layout and adjacent complete-scene checks apply.
- Intentional change: the 2026-09-16 workaround that vertically centered the greeting line against Activity's title row is superseded for this follow-up. The cards, not the slogan, own the card-alignment reference.
- Kept relationships: greeting is unframed identity text, not a card; Example remains context, not a module; Attention/Activity facts and actions do not change; Simple Home remains outside this Modules-only layout change unless shared markup requires a no-regression adjustment.

## Exit evidence

Implementation must record the exact DOM/grid change and verify at least:

1. fixed synthetic Attention/Activity data with short, long and wrapping slogan/Profile address/Example copy;
2. two-column Home at 1440 and 1280, plus the one-column breakpoint and 390 px;
3. light and dark, keyboard activation, Escape/focus continuity where applicable, 200% zoom, and reduced motion for the existing collapse transition;
4. card top alignment measured from the card containers, not from text baselines; no overlap or horizontal overflow;
5. collapsed and expanded states across refresh, with the composer and lower Home content not drifting unexpectedly;
6. targeted Home greeting/presentation/preferences tests, interaction and material/layout lint as applicable, and one adjacent Simple Home no-regression check.

The implementing author supplies candidate evidence; a non-author review decides visual/layout acceptance. This registration does not reorder the existing 00–13 queue; schedule it with the next Home/Chat polish or cross-surface UX pass unless the user explicitly promotes it.
