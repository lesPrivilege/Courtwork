# Optional workspace Chat · BE-23 / DWB-05

Implemented from baseline `4cf5ed9ebdaf1894ebae039cd69a0227e6991db3` on the isolated `codex/projectless-chat-20260913` branch. This is author verification, not independent acceptance or closure of the existing Release gates. No paid provider run, push or deployment belongs to this slice.

## Delivered behavior

Projects and Recent are peer sidebar sections, Projects above Recent. Recent includes all ordinary chats, including unassigned chats; Attention keeps its own history. Home starts without mandatory Project or title entry. Optional workspace and draft attachments are independent controls. Attention receives attachments only. Session ID restores existing conversations and reconciles lost creation receipts; material commands retain their identity through lost upload responses.

The [runtime and UI contract](../../app/docs/projectless-chat.md) specifies schema 14, user/Session configuration isolation, managed workspaces, project-only Matter/async capabilities and attachment limits. The [onboarding decision](../../engineering/research/deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md) records the user direction.

## Evidence

- [Browser checks](browser/checks.json): 15 checks; real local UI with a synthetic adapter and isolated data. [Recovery checks](recovery-browser/checks.json): 7 checks covering lost create/upload receipts, exact identities, reload, failed Recent reads, long names, forced colors, reduced motion and narrow sidebar order.
- [Home 1440 light](browser/home-light-1440.png), [390 dark chooser](browser/chooser-dark-390.png), [390 sidebar](recovery-browser/sidebar-390.png), [forced colors](recovery-browser/forced-colors-reduced-motion.png). Light/dark 1440, 1280 and 390 screenshots are retained in `browser/`. 720 CSS-pixel reflow approximates the width of 1440 at 200%; native browser 200% zoom was not executed.
- [Schema compatibility](schema-compat.json), reproduced by [script](schema-compat.mjs): actual baseline v13 host writes synthetic state, current host preserves all state except schema version, byte-exact backup retained, old host rejects upgraded bytes without mutation, separate backup restoration opens with old host. No personal runtime data used.
- [Earlier full regression](full-before-focus.log): 961/961 before the final focus-preserving changes; [attachment tests](focus-targeted-final.log): 3/3 after those changes. Final fixed-source regression is recorded below when complete.
- Initial/second full runs and earlier targeted/browser logs preserve failures and fixes; they are not passing final evidence. The initial suite was interrupted after a fixture-incompatible workspace assertion; the second had three failures subsequently corrected. Earlier recovery failure artifacts are under `debug/`.

## UI precedent and scope

Nearest implemented precedents: Home draft/admission in `app/web/app.mjs`, retained material commands in `app/web/materials-view.mjs`, native `anchorPopover` in `app/web/ui-controls.mjs`, and existing Project sidebar rows. Affected grammar: composer organization, peer sidebar collections, native anchored overlays and focus return. Final screenshots were visually inspected. Core Review projections and formal decision authority retain their existing owners.

The browser harness uses a separate synthetic host and ports/data; it does not operate the earlier real-model candidate. This slice does not provide external-folder connection, post-creation project relocation, binary attachments or native zoom certification.

## Final fixed-source result

Source `b81403c` is identified by its full SHA in [source identity](source-identity.json). [Node 22 product check](product-final-node22.log) passed **964/964**, deterministic runtime smoke and 6,649 documentation links (exit 0). Four interface lints passed: [colors](lint-colors.log), [materials](lint-materials.log), [interaction](lint-interaction.log), [shapes](lint-shapes.log); [contrast results](contrast.log) are retained. No production source changed after this run. [Evidence hashes](manifest.json) cover all delivery files other than the manifest itself.
