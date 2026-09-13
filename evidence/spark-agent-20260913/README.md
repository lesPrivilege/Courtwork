# Spark Agent · implementation evidence

2026-09-13 · Astra author evidence, isolated from the active UI checkout. Base `2d1ab6816e3dedcd613fee80a35bc61b2067d106`; candidate implementation is described in [the contract](../../app/docs/spark-agent.md). No paid provider, deployment, Paper amendment or formal release acceptance is included.

## Scope and nearest precedents

The Host implements a stable preset Agent, assignments, exact source discovery, isolated attempts, restricted tools, immutable notes/findings, explicit project/session mounts and machine consumption. RuntimeStore owns control records; Intake/ArtifactHistory retain source and derived bytes; original Core/Thread owners remain unchanged. See [architecture ruling](../../engineering/research/architecture-node-2026-09-13/workspace-substrate.md) and [external extension disposition](../../engineering/research/spark-explore-2026-09-13/extension-ruling.md).

UI baseline: existing `renderSurfaceRail` in `app/web/app.mjs`, `.rail-card`/`.rail-strip`, Spark/Usage `.observation-dialog-body`, Files exact-version reader and Run stop/unknown state. The new card is composed into the existing right-side surface, avoiding another overlapping column. The independent Spark entry and card share one controller and the same Host assignments. Grammar changes are object entry, exact source selection, native dialog disclosure and lifecycle/mount actions; no new animation, icon family, formal Review state or authority is introduced.

Default card: preset identity and recent assignment status. Task detail: brief, actual status, findings and source/note expansion. Execution identity, model configuration, budget and consumer receipts stay under disclosure. Historical/exact source versions and source coverage remain visible when relevant to choosing or consuming data. Source maintenance stays a separate existing entry.

## Verification record

Spark source is fixed at `1d691c5c6ae82825639a08d47fedfd286cab3a85`; the final backend is unchanged from `52c486c`. The retained [synthetic Host](synthetic-host.mjs) uses the normal HTTP, RuntimeStore, Pi loop and UI, with a deterministic fake provider and new temporary data. [Browser checks](browser-check.mjs) exercise the actual application. Unit/integration tests live in `app/tests/subagents.test.mjs` and `app/tests/subagent-migration.test.mjs`.

Author checks do not constitute independent acceptance. Browser screenshots are candidates, not replacement accepted baselines. Real-provider S4 coding, human review of a resulting diff, full release media and G1–G5 remain outside this slice's claimed evidence. Paper remains its separate user-reviewed doctrine source.

## Final checks and limits

- [Full combination](checks/product-52c486c.log): Node 22.19.0, 999/999, deterministic runtime smoke and documentation links passed. Started at `52c486c`; the later changes were confined to UI refresh facts/glyphs and one additional assertion/semantic ledger entry. No backend changed during or after this run. The final `1d691c5` change only wraps the shared visible source labels at 390px; author browser verification and interaction/shape lint cover it.
- [Last focused check](checks/followup-d4a3153.log): 16/16 against `d4a3153`, including real SIGKILL recovery, archive refusal/persisted corruption, budget cap and semantic consumers. The broader run is not relabeled as an exact full run of this later UI commit.
- Color, material, interaction, shape and contrast checks passed; logs are in [checks](checks/lint-interaction.log). These lint checks are bounded, not proof of complete accessibility.
- [Luna review](luna-audit.md) separates non-author source/focused tests from Astra corrections and browser observation. Its findings led to exact source/freshness disclosure, unknown archive/cancel fencing, labeled execution fields and shared card anatomy.

[Earlier browser automation](browser/results.json) recorded 18 passing synthetic checks (two exact sources, one child, source/note expansion, mounts/revocation, both entrances, receipt retry, themes, widths, keyboard and forced-colors). It belongs to the earlier candidate; its script and captures are preserved rather than silently rewritten as final-source evidence. The initial failed capture/log is under [debug](debug/earlier-browser-failure.json). The `11d6081` full-run failure was the unregistered Run activity literal, fixed in the semantic ledger; [original failure log](debug/product-11d6081-semantic-registry-failure.log) remains.

The Codex in-app browser then checked the [compact strip correction](strip-review/README.md), lost response followed by reload/recovery with exactly one assignment/attempt ([receipt](final-browser/recovery-receipt.json)), long unbroken text at 390 CSSpx (332px client/scroll width after correction), live task-state updates, labeled execution data, SVG controls and light/dark adjacent Chat surfaces. Final captures are indexed in [browser scope](final-browser/README.md). The synthetic Host was started from `11d6081`; static UI was reloaded from the later commits as labeled. Backend archive/recovery corrections were verified by the final real-process tests, not claimed as exercised on that older running Host.

Native 200% zoom and screen-reader interoperability were not tested. Earlier forced-colors evidence is limited to its candidate. No real provider was called in this Spark slice; separate prior release dogfooding evidence is not repurposed as Spark validation. The UI remains an author candidate for user inspection; it does not change formal acceptance.

## Concurrent main integration

Main advanced from the initial base to `6bb58cd` with Settings/Plugin management while Spark was being checked. The active UI checkout was left intact. The Spark worktree merged that main delivery as `83df385`; the only textual conflict was the append-only semantic-consumer ledger, resolved by preserving both registered sets (53 consumers). `app/web/app.mjs` merged its distinct changes automatically. [Exact merged-source combination](checks/product-83df385.log) passed 1002/1002, runtime smoke and 6,879 documentation links on Node 22.19.0; all five UI checks also passed. No production changes followed that run. Local-main preservation is recorded separately after the transition.
