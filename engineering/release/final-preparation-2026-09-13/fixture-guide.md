# Synthetic preview fixture

`synthetic-preview.mjs` seeds one local Courtwork Host for Astra’s final visual inspection. It uses normal Host HTTP routes, Core projections and the deterministic fake loopback provider. It does not launch a browser or take screenshots. Use the same checkout and `sourceSha` from `fixture.json` for the complete capture batch. `sourceSha` records `git rev-parse HEAD`; it does not cover uncommitted source edits, so capture after integration with a clean product worktree.

From the repository root, run it with Node.js 22 or newer. Set a fresh data directory outside Git so the Host state is explicit and retained for review:

```sh
export CW_RELEASE_PREVIEW_DATA_DIR="/tmp/courtwork-release-preview-final-20260914"
node engineering/release/final-preparation-2026-09-13/synthetic-preview.mjs
```

Use a new, empty directory for the clean final seed. The process listens on `127.0.0.1:58410`, falling back to `58411` only when the first port is occupied. Its startup line prints the local URL, data directory, fixture manifest path, and slot count. `fixture.json` lists all 13 routes, state IDs, session and resource IDs, fake-provider status, and the checked-out source SHA. It contains no Host token, auth value, or real credential. Do not start a second Host against the same data directory.

The browser obtains its work token through the local bootstrap flow. Keep the Host process running throughout capture. A version 2 fixture can be reused after a normal Host restart: it retains the same project, sessions, sources, candidate, Matter, Attention item, artifact, and Spark assignment, and creates a fresh pending Approval Run. Earlier fixture versions are deliberately rejected; choose a new empty directory instead. On `Ctrl-C`, the script denies its still-pending synthetic write permission, waits for the Run to settle, closes the Host, and retains the explicitly configured data directory. Remove that directory after review if it is no longer needed; the Host’s private data store contains the fixed local fake-provider marker.

Capture 13 slots in light and dark themes at a native `1440×900` viewport, for 26 screenshots total. Keep the exact same Host data and source SHA across all pairs. Switch themes through the app’s Appearance setting, then return to the route being captured. Start the long-running Run only after the other slots; use the exact `running.prompt` value in the manifest and capture while its status is active. The fake stream runs for about 180 seconds unless stopped through the product UI.

Capture Approval first while its permission request is pending. After the light/dark pair, allow or deny that one synthetic write with the visible product control and wait for the Run to settle before inspecting Work Review. The Host freezes work projections during any active Run: while Approval is waiting, other sessions’ Work Review projections are read-only and advertise no actions. `fixture.json.workReview` records the projection seeded immediately before Approval starts: the candidate is pending, writable, and reviewable. Once Approval settles, reopen Work Review to confirm its normal actions are visible; leave the candidate pending and do not submit a decision. The 180-second stream also occupies the Host’s one-Run lane, so finish its pair last and stop or wait for it before further work.

| Capture slot | Route / visible journey | Seeded state |
| --- | --- | --- |
| `home` | `#` · Home | Project Cedar and a completed delivery-timing response. |
| `spark` | `#` · open **Compare Cedar drafts** | Completed local comparison over two exact retained draft versions; finding is not acceptance. |
| `running` | `#` · open **Delivery plan review** | Start the exact prompt in `fixture.json` just before the pair; capture the active stream. |
| `attention` | `#` · Attention | One synthetic item about the 30-day / 45-day timing difference. |
| `approval` | `#` · open **Approve delivery note** | A real pending permission request for one synthetic workspace write. Capture this first, then resolve it in the UI. |
| `artifact` | `#` · open **Delivery note** | Completed Run with `out/delivery-note.md` and its artifact record. |
| `matter` | `#` · open **Cedar follow-up** | Inbound NDA binding to the shared Project Cedar Matter. |
| `review` | `#` · open **Inbound NDA · Cedar** | Pending synthetic candidate. Reopen after Approval settles; inspect but do not decide. |
| `continuity` | `#` · open **Cedar follow-up** | Same Matter ID as the source Review Session, viewed in a second Session. |
| `models` | `#settings/models` | Local fake model/provider settings. |
| `integrations` | `#settings/tools` | Local extension and tools settings; no external integration is configured. |
| `settings` | `#settings/appearance` | Appearance settings; change theme here through the UI. |
| `conversation` | `#` · Attention conversations | Global Attention conversation with one completed local fake response. |

Each slot’s `stateId`, path, and resource IDs are in `fixture.json`. Use the product navigation to open the named sessions; don’t edit the manifest, database, local storage, or screenshot files to manufacture state. Preserve the same seeded facts across each light/dark pair. Store draft captures outside the repository until source and integration review are complete.

Everything in this fixture is synthetic: the project, messages, source drafts, artifact, inbound NDA, candidate, Matter, Attention item, Spark assignment, and conversation. The fake provider makes no external model call. Inbound NDA rules are preview data, not legal advice. A completed Run is not formal Work acceptance, a pending candidate is not a human decision, and Spark findings do not confer authority. The fixture supports visual inspection only; it does not establish model quality, real provider behavior, native 200% zoom, full screen-reader coverage, or final UI acceptance.
