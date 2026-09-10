# VS-00 six-glyph consumer inventory

Initial prose inventory recorded 2026-09-11 at `22a20731ecc6631e143629eb5118ed60c52f9823` and the candidate [product semantic registry](../../../design/product-semantics/registry.json). The machine ledger is [glyph-consumers.json](./glyph-consumers.json). This is source evidence for migration planning; it does not change product code, choose a new glyph, or confer acceptance.

The scan covers literal glyph arguments and dynamic returns reaching `icon`, `action`, `setAction`, or `flowRow` in `app/web`, excluding vendor bundles and the generated registry projection. It records 48 raw consumer records. The same literal can be used by more than one branch, so each record names its function and intent. An exact scan of `site/src` found zero of these six Lucide names. Pages uses text, inline geometry, and registered figures instead: [page.mjs](../../../../site/src/page.mjs), [figures.json](../../../../site/src/assets/figures/figures.json), and the brand SVG in [page.mjs](../../../../site/src/page.mjs) (see the coordinates in the JSON ledger).

`keep` means the current call has a direct registry mapping or the existing named-read action contract is unambiguous. `adapt` means preserve the owner, text, and handler while routing the representation through an explicit semantic key or owner decision. `remove` means remove a decorative or identity cue whose text already carries the fact and whose current glyph creates a collision. These are proposed source dispositions only.

| glyph | registry mapping in current worktree | records | disposition focus |
|---|---|---:|---|
| `message-square` | `chat.object` (single-purpose) | 6 | Keep Home `sessionCandidates`; remove Home pending, empty Attention, and global Attention uses; adapt Question rows. |
| `activity` | `activity.view` (single-purpose) | 8 | Keep Home Activity and the Chat Flow Activity group; adapt Run, Chat overview, latest Run, and local Approval uses. |
| `plug` | `connection.object`, `mcp.server` (multi-purpose) | 3 | Adapt binding, extension producer, and resolved remote Approval uses; none is a generic Tool marker. |
| `folder` | `project.object`, `workspace.object`, `message.reveal` (multi-purpose) | 6 | Keep Project and Workspace module identities; adapt tool-list, Chat files, and packet-facts disclosures. |
| `file-text` | no registry entry | 14 | Adapt file, artifact, Review, decision, and Settings preview rows; remove the empty Attention detail decoration. |
| `refresh-cw` | no registry entry | 11 | Keep named read/retry actions; remove its use as Spark identity at `app.mjs:6166`. |

The four collision findings needing governance attention are:

- **Chat / Attention:** `home-view.mjs:48-52,401-428` maps both pending requests and Continue chats to `message-square`; `app.mjs:6165` uses it for the persistent Attention assistant. The registry makes Chat single-purpose and reserves `attention.agent`/`attention.queue` as text.
- **Spark / refresh:** `app.mjs:6166` labels a `refresh-cw` button “Spark”. The same glyph is sound for the named reads at `app.mjs:6153,6160`, `runtime-view.mjs:1370,1380`, `workspace-view.mjs:13`, and the other listed retries.
- **Approval / Chat and remote service:** Question rows at `app.mjs:2777,2816` inherit the older Chat Flow `message-square` precedent without a current question key. `thread-projection.mjs:187` returns `plug` for a remote resolved Approval and `activity` for a local one; exact Approval scope and target text must stay primary.
- **Run / Activity:** `surface-modules.mjs:131`, `summary-disclosure.mjs:198`, `workspace-view.mjs:111`, and `app.mjs:6155` use `activity` for Run or Chat overview. `app.mjs:2697` and `home-view.mjs:195` are the legitimate scoped Activity precedents.

The canonical predecessor remains [glyph-semantics.md](../../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md): it intentionally admits several older `activity`, `message-square`, `plug`, `folder`, and `file-text` contexts. The current registry narrows identity mappings, so those older callsites stay in the ledger as explicit migration candidates. `ui-controls.mjs:25-61` is only the static allowlist; generated registry data, CSS class names, activity state/slot identifiers, brand SVG, and Pages figure SVGs are recorded as exclusions in the JSON.

Verification after writing: parse the JSON, re-run the two scan commands recorded in its `scan` object, check every source coordinate against the current worktree, and run `node tools/check-doc-links.mjs`. No product tests or browser verification are claimed here.


Final receipt clarification: the machine ledger was subsequently refreshed at `e65cac1` with file hashes (see its baseline object); the initial prose above retains the earlier 48-record migration analysis. The final gate has a separate 38-line literal-consumer scope in [raw-consumers.json](../../../design/product-semantics/raw-consumers.json). These counts have different units and must not be compared as a percentage reduction. Final dispositions and verification are in [coverage](../coverage.md).
