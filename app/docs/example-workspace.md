# The example workspace

Stage 4 of the [final Claude Design ONE-SHOT](../../engineering/release/ui-publication-closure-2026-09-11/ONE-SHOT.md). One synthetic story, shown through the product's own projections, until real work exists.

## What it is

- **A projection layer, not a runtime.** `app/web/preview-layer.mjs` sits under `request()` in `app.mjs`. While it is active it answers the work-data reads the surfaces make (`/projects`, `/sessions…`, `/runs…`, `/work-*`, `/attention…`, `/coordination…`) from one recorded sample file, and refuses any write aimed at an example object with one sentence. Host facts (`/bootstrap`, provider, runtime, extensions, usage) are never answered by it. Core, schema, the server and the data directory are untouched.
- **One story.** `app/web/samples/preview/responses.json` is recorded by `app/scripts/record-preview.mjs` from the canonical capture fixture (`evidence/semantic-polish-merge-20260911/capture-fixture.mjs`, `--active none --seed-only --retain`): two projects, project chats and retained Attention conversations, one attention item, one Spark derivation set, a local deterministic answer. `manifest.json` beside it carries the sha256, entry count and the fixture's source commit. The same fixture is the one the Pages media are captured from.
- **Marked, everywhere.** The title band carries the word *Example*; Home opens with one sentence and two ways out; the story's project rows carry an *Example* tag; the composer's project choice never lists an example project.

## Entry, exit, reopening

| Situation | What happens |
|---|---|
| No projects, nothing remembered on this device | the example is entered automatically after the first project read |
| Existing projects | nothing automatic; *See the example workspace* on the Chat page opens it beside the person's own projects |
| *Close the example* / *Start with your own work* on Home | the layer leaves; `off` is remembered on the device; Home offers the example again while there are no projects |
| First **admitted** real run (2xx run receipt in a chat of the person's own) | the layer leaves for good; `established` is remembered; the Chat page keeps the reopen entry |
| HTTP admission rejection or a missing/mismatched receipt | nothing changes; the example stays until a matching run is admitted |
| Provider failure after a matching 2xx receipt | real work was admitted; the example stays closed and the failed run remains real history |
| No local runtime | the page is not served; there is nothing to enter |

While the example is active, Home totals and activity use the real endpoints whenever real projects exist. With no real projects, those modules show the marked example story. Example IDs in mutation payloads are refused as well as IDs in the URL; mentioning an example in ordinary prompt text is not a write to it.

The memory is one word in `localStorage` under `schema-engineering.preview.v1` (`off` or `established`); a blocked storage reads as nothing remembered.

## What the example cannot do

Run, answer permissions, edit drafts (a draft typed in an example chat is kept in the page and never sent), rebuild Spark derivations, or change Attention. The toast says so in one sentence and the input is left as typed. Creating a project or a chat of one's own is real and allowed while the example is open.

## Regenerating and checking

```sh
node evidence/semantic-polish-merge-20260911/capture-fixture.mjs --active none --seed-only --retain --manifest fixture.json
node app/server/index.mjs --data-dir <data_dir from fixture.json> --port 8848
node app/scripts/record-preview.mjs --origin http://127.0.0.1:8848 --fixture fixture.json
node --test app/tests/preview-layer.test.mjs
node evidence/publication-final-20260911/preview-audit.mjs --existing http://127.0.0.1:8848 --out <dir>   # headless Chrome: new user, leave/reopen, real handoff, existing data, start failure
```
