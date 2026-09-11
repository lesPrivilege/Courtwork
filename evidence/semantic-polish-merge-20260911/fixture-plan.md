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

## Spark correction on the merged live fixture

The first merged `--active none` seed changed the Spark source from version 1
to version 2 before any Candidate existed. That was a valid source-set change,
but it correctly produced `derivations.total=0` and `stale=0`. The bounded
correction script `capture-fixture-spark-correction.mjs` handles the live
fixture by creating a temporary local OpenAI-compatible connection, running a
natural-language `se_submit_candidate` Run from the Spark session's own source
projection, then restoring the original fake provider config and deleting the
temporary connection. It finally uses the normal versioned `replace_sources`
action to move that same source to version 3.

Provider provenance is intentionally split: the original capture seed and all
unchanged sessions use the catalog `fake-openai-loopback` (`local-fake`), while
the one correction Run uses a temporary local compatible connection (`real`
execution mode pointed at this process's loopback endpoint). No personal or
paid provider is involved, and the temporary connection is removed after the
Run.

Verified against the merged live origin on 2026-09-11: Spark Matter
`matter-4e58aebb-6376-4a7a-b157-ae4f5a92554e` has Candidate
`candidate-60e4b48afeb75a16c65794e5f28a17d8fcf22bc057e3c987c0d9954e8b1422a5`,
source version 3, and `GET /work-derivations` reports `total=1`, `stale=1`,
with `sourceSetChange.fromRevision=2`, `toRevision=3` and a source version
2 → 3 replacement. The corrected `/tmp/courtwork-capture-merged-none.json`
records this result under `spark_correction` and `scenarios.spark`.

## Attention conversation correction

The first global conversation Run was retained as a failed specimen. Its
`attention_projects` and `attention_list` calls succeeded, but the list was
empty because the Attention item had not been disclosed to that Runtime
adapter; the subsequent `attention_inspect` call therefore returned
`NOT_FOUND: Attention unavailable`.

`capture-fixture-conversation-correction.mjs` creates a new global Attention
conversation and starts a natural-language Run that first waits on `ask_user`.
While it is waiting, the script uses the human Attention action contract to
grant that Run's adapter the registry/details/source/relation/event fields for
the existing item. The script then answers the question and verifies real
successful `attention_projects`, `attention_list`, and `attention_inspect`
tool results before the Run completes. It preserves the original failed
session/run IDs under `scenarios.conversationFailedOriginal`.

Provider provenance is explicit: the original seed used catalog
`fake-openai-loopback` (`local-fake`); this correction Run temporarily uses a
local compatible loopback connection (`real-compatible-connection`) and then
restores the catalog fake configuration and deletes the temporary connection.
No personal or paid provider is involved.

The two failed attempts are retained separately: the root-caught initial
attempt is session `508e5bd5-057f-49f1-8494-4c0f2f3751aa`, Run
`1ef5d785-55dd-4cc3-b3c1-c9a6e91d1788`; the intermediate seed attempt is
session `affbad59-b3bc-47cf-a061-82de582b788b`, Run
`b17fcd39-02c9-401d-ae41-98c1a2cd83e6`. Both completed with the same
undisclosed-runtime `attention_inspect` failure and remain historical evidence.
The successful correction is session `b0dc68e1-159f-431d-87bc-047da3175e71`,
Run `d9803621-074a-4f88-8efb-24d787a4175d`, with disclosure revision 2 and all
three Attention tools successful. A portable, path/token-free summary is
recorded in [conversation-correction-proof.json](conversation-correction-proof.json).

## Running correction

The earlier merged running sample called `ws_read` in a new empty workspace,
so its tool result was `file does not exist`; its repetitive response was not
useful capture evidence. `capture-fixture-running-correction.mjs` starts an
independent fresh server at the current source SHA, performs a completed
natural-language Run whose real `ws_write` creates `out/running-context.md`,
then starts a second natural-language Run that successfully calls `ws_list`
before streaming a long response. It waits for `status=running` and
`admissionOpen=true`, leaving the server alive for browser capture. The
stream is sized for roughly two minutes, enough for both light and dark shots.

Run it with a random manifest path immediately before CUA capture:

```sh
node evidence/semantic-polish-merge-20260911/capture-fixture-running-correction.mjs \
  --manifest "$(mktemp -u /tmp/courtwork-running-correction.XXXXXX.json)"
```

The standalone manifest prints its origin, session and active Run IDs. Its
seed and running Run both use the catalog `fake-openai-loopback` (`local-fake`);
the process does not create a compatible connection. The previous failed
running Run remains in the older merged manifest as a separate historical
specimen.
