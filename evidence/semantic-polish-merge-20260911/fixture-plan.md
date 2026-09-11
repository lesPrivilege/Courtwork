# Post-merge screenshot fixture

`capture-fixture.mjs` creates a fresh disposable CourtWork server on port `0`
and records all generated project, session, Matter, Candidate, Attention and
Run IDs in a random `/tmp/courtwork-capture-fixture-*.json` manifest. It does
not capture images or change `site/src/capture-plan.mjs`; the publication batch
remains pending until the final merged product SHA is chosen.

The fixture uses the product's own HTTP routes, Pi run loop and Core-backed
extension actions. Provider execution is the local deterministic
`fake-openai-loopback` with `FAKE_CREDENTIAL_KEY`; no personal account,
external endpoint or paid provider is accessed. Visible Run inputs are normal
natural-language messages. The responder emits only the tool call required by
the real runtime, then answers after the returned tool result.

## Commands

From the Courtwork worktree:

```sh
# Stable state for Home, Spark, Attention, Matter, Review, Artifact,
# Continuity, Models, Integrations and Settings.
node evidence/semantic-polish-merge-20260911/capture-fixture.mjs \
  --active none --seed-only --manifest "$(mktemp -u /tmp/courtwork-fixture.XXXXXX.json)"

# Keep one genuine permission request open for the Approval screenshot.
node evidence/semantic-polish-merge-20260911/capture-fixture.mjs \
  --active approval --manifest "$(mktemp -u /tmp/courtwork-fixture.XXXXXX.json)"

# Keep one genuine slow stream open for the Running screenshot.
node evidence/semantic-polish-merge-20260911/capture-fixture.mjs \
  --active running --manifest "$(mktemp -u /tmp/courtwork-fixture.XXXXXX.json)"
```

The process prints `source_sha`, `origin`, `data_dir` and all IDs as one JSON
line. `--active approval` waits on an actual `permission.open` event and leaves
it unanswered. `--active running` waits until an actual `tool.start` event and
then keeps the provider response streaming slowly. These modes are mutually
exclusive because the service makes all work surfaces read-only while any Run
is active. `--active none` is suitable for stable pages. `--retain` keeps the
temporary data directory after a seed-only run for local inspection.

## State map

| Slot | Manifest state | Product path/evidence |
|---|---|---|
| Home | two real projects with populated sessions | `scenarios.home` |
| Spark | second Matter source replaced at version 2 through `POST /sessions/:id/actions`; derivations queried through `GET /work-derivations` | `scenarios.spark` |
| Attention | typed Core item with valid Matter/source/session/Run references | `attention`, `scenarios.attention` |
| Approval | pending `ws_write` permission, active only in `--active approval` | `scenarios.approval` |
| Artifact | draft Run writes `out/project-cedar-review.md` through `ws_write` | `scenarios.artifact` |
| Matter | inbound NDA binding and source projection | `scenarios.matter` |
| Review | source-backed `se_submit_candidate`, left pending human Review | `scenarios.review` |
| Continuity | second Session bound with `existingMatterId` and `fromSessionId` | `scenarios.continuity` |
| Models | local fake model catalog | `scenarios.models` |
| Integrations | loaded inbound NDA extension catalog | `scenarios.integrations` |
| Settings | configured local fake provider and credential status | `scenarios.settings` |
| Conversation | global Attention conversation using real attention tools | `scenarios.conversation` |
| Running | active slow stream, only in `--active running` | `scenarios.running` |

The generated manifest is runtime evidence for fixture setup, not a screenshot
acceptance record. Final screenshots must be regenerated after clean merge on
one selected SHA, saved as JPEGs from the browser, and separately validated for
the 13-slot light/dark gate.
