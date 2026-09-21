# Composer working-location entry — bounded design ruling

2026-09-21, Astra. User asks for a lighter context card, modest icon/type proportion adjustments and consolidation of Choose project / Connect folder / Choose workspace. This is the next finite 06b frontend task; implementation is not delivered by this record.

## Observed journey

1. [Home](browser/01-home.png): the synthetic candidate at `17f57c0` shows Connect folder above the composer and a separate Project control inside it. Captured in a 591 × 772 browser pane; this is not evidence of the wide-screen Home geometry.
2. [Folder entry](browser/02-folder-card.png): Connect folder opens a card titled Workspace, with an inner bordered container, another Connect folder action and a long explanation. The user must translate among object names before choosing files.
3. [Project entry](browser/03-project-picker.png): Project independently opens No project / named project / New project. The distinction has valid domain meaning, but two distant controls make the start of a task harder to understand.

The user's supplied Codex screenshot (2026-09-21 13:03:07) is a visual reference: shallow context band attached to the composer; modest folder/device/branch glyphs and a consistent text baseline. It does not prove Codex's data model, permission behavior or CW capability. The personal screenshot is not copied into the repository.

## Ruling and owner boundary

Use one visible working-location entry: empty state “Choose work location”; selected state the useful project/folder name. Expanded title “Work location”. These are UI labels, not a new persistent Workspace object. Inside, keep Project (organization, including No project) and Folder (files the Run can read) as separately labelled facts and supported actions. A project choice does not silently bind a folder. A folder choice does not grant edits. Local and branch remain secondary facts only where known; Local is not a permission.

Default context should be a shallow attached band; use CW's existing typography, glyphs, spacing and solid surfaces. Reduce nested card treatment and excessive heading/icon weight; align glyphs optically with text. Do not scale down click targets to match small artwork. Put complete path and source/candidate details behind the same entry, while relevant access consequences and refusal/recovery remain beside their action. Do not remove a necessary distinction just to shorten copy.

Source ownership: existing `workspace-card.mjs`, composer context rendering, project chooser and their existing controllers/styles. Host bind, preparation identity/reconciliation, candidate lifecycle and permission grants keep their current owners. No new backend route, registry, schema, native folder capability or permission default. No Home geometry or Role-first Composer redesign in this slice.

Nearest precedents: existing context strip/project picker/Workspace card, accepted 06b preparation recovery; frontend-contract task-entry/resource dimensions. Consume Design Scout and relevant precedent entries before custom mechanics. Apply UX-01/02/03/06/07/09. Preserve draft/materials, focus/Escape, pending-effect locks, corrected-folder recovery, lost replies, bound root identity and first-send marker retirement.

## Required delivery

One complete journey from unassigned/no-folder → choose project or stay unassigned → select folder → inspect truthful access → prepare without inference → Send, with one obvious entry and no duplicate chooser vocabulary. Show bound/active-candidate states and why a location cannot change; retain Check status/Continue preparing under uncertainty. Existing command owners perform the effects.

Supply before/after screenshots of context band, expanded panel and full Home/Chat at matching wide/narrow viewports; measure glyph/type/spacing using existing tokens. Test the production controller+view with actual preparation recovery counterexamples. Exercise keyboard/Escape/return focus, long paths/names, empty/error/pending states and 200% zoom; explicitly record unexecuted cells. Codex owns independent visual and source acceptance. This registration performs no accessibility conformance audit and claims no implementation acceptance.
