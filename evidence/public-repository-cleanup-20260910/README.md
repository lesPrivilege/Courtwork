# Public repository cleanup · 2026-09-10

User scope: Luna explores directory structure and public reference/privacy material; organize source and indexes, and show architecture in README. Integration baseline: `00b2f2886e04aa7b7facb588d4375a246f3e341d`. Product snapshot for the existing Pages remains `9e5384fcabdac432259b3ffab7928251bea49859`.

## Changes and ownership

Astra owns integration, architecture navigation, README, generated-file separation and the public specimen projection. Luna independently explored structure and privacy, and authored the missing evidence/engineering indexes. Astra reviewed those indexes against the actual directories and link checker. Luna’s [document-path cleanup](document-path-review.json) and final independent build check are separately recorded below; neither author's own checks constitute independent acceptance of their work.

- `site/dist/` and generated specimen vendor/HTML/copy/manifest files are ignored and rebuilt. Brand SVG exports and licensed product vendor assets remain distribution inputs.
- Root README includes the Host/Pi/adapter/Core/store architecture and directory map. Docs, app docs, engineering boundaries, benchmarks, tools and every first-level evidence packet have navigation entries. Three existing relative links and an installed-dependency citation were repaired.
- Eight original desktop reference images were removed from the current tree. [Source metadata](../../engineering/design/attention-surface-2026-09-09/sources.json) retains IDs, byte sizes and hashes. Two already absent references remain metadata-only.
- The old 172130e specimen is removed from the current tree; [its provenance index](../publishing-surface-2026-09-09/README.md) retains the frozen commit, original path and hash. Existing historical Git bytes are not rewritten.
- Current specimen changes only nine machine-local path fields, and its capture receipt omits the data-directory path. [Exact transformation receipt](specimen-redaction.json) binds the original and public hashes. This is a public projection of the existing recording, not a fresh capture. IDs, event order, decisions, content and source SHA remain unchanged.
- Two existing evidence files received path-only portable redaction. Original bytes remain at the integration baseline: `evidence/home-composer-independent/home-composer-counterexamples.before-fix.txt` SHA-256 `056b9021c8c2124e4112fc04557f9a18f7be18a074a10bb2f9afb6ccdc502215`; `evidence/main-cutover-20260908/verification.json` SHA-256 `f633c0567b7130061c5e7af01cb45f1b59b6d62167d3b2c4ca16d5a7cf4d365f`. Validation results were not changed or rerun by those redactions.

## Validation

- Before privacy projection, deletion/rebuild of generated files reproduced all 46 output hashes exactly.
- Public projection tests: 3/3, including unchanged source, idempotence, unexpected-content refusal and injected Unix/Windows path rejection.
- Real browser verification after projection: 17/17; eight specimen steps, source identity/refusal, keyboard, no foreign requests, no-JS, preference fallbacks, contrast and viewport/zoom checks.
- Repository documentation checker verifies Git source targets rather than ignored files left on disk; Pages build rejects machine-absolute paths in publishable text. Both checks are included in CI.
- Luna non-author verification of Astra implementation at `21380a44daf916585a438d7ed71e0b2d80330805`: clean detached checkout, generated paths absent before build, 46/46 output hashes identical across two builds, documentation 2,368 references and site 27 references valid, material check and 3/3 projection tests passed, no machine-local paths in public output, 40 brand SVG exports retained. [Independent receipt](independent-verification.json). This does not independently accept Luna’s own navigation files; Astra reviewed those separately.
- [Browser assertions](browser-verification.json) record the 17/17 author run; later documentation-only redactions do not change the published inputs.

## Scope

No product code or data schema changed, no personal runtime directory was opened/upgraded, and no real provider ran. This removes identified private references from current source and publication; it does not purge old Git commits. Existing frozen archives and provenance remain historical sources. Product acceptance gates and the deferred brand direction are unchanged.

Final documentation handoff: the observed Markdown delta included 119 files (including parent edits), removing 84 user-root and 160 actual-worktree path occurrences. Generic fixture paths and historical SHA references remain. Astra reviewed the change scope, source-index semantics, original hash provenance and final relative-link checks; no actual user-root path remains in tracked text, excluding deliberately synthetic test strings.

## Publication

The authorized Pages update succeeded in [workflow run 34383995556](https://github.com/lesPrivilege/Courtwork/actions/runs/34383995556), deploying `cd2a5b889150f2bff7d6e0ef49074b7df6464967`. [Live verification](live-verification.json) binds the exact manifest and HTTP 200 byte matches for the page, public specimen and capture receipt. Product source remains `9e5384f`; page input digest is `186079ffa65e29a5f68956ad68522a47b95f9f81155e4a17c5fad60976ecdc4f`.
