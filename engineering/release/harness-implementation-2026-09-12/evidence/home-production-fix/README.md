# Home production fix · 2026-09-12

User authorized production code changes after Luna exploration. Astra authored and integrated the narrow fixes from `0fbd898`; no push/deployment or provider Run was performed. The shared main's existing edits remain separate.

## Two distinct failures

1. `e4cdb2d` retains the mounted lower Home band when its projected row/page facts, error/initial-loading state and filter are unchanged. Activity/Attention refreshes and summary observation timestamps no longer detach unchanged navigation buttons. Callbacks always use the latest caller. Changed row data, identity, pagination, errors and filters still render immediately; returning from a chat remounts Home. No deferred facts, synthetic click, pointer capture or general DOM reconciler was introduced. Actual data changes during an in-flight pointer sequence may still replace a target; this patch does not claim to preserve clicks against a removed or changed target.
2. `5634175` corrects the observed narrow-screen layout failure. At 476px, the Modules and totals occupied the available Home height; the former row-only flex scroller collapsed `#message-stream` to 24px. Its row's rectangle extended outside the masked stream, and `elementFromPoint` at the row center returned the totals' `.stat-row`, not the button. Enter worked but mouse could not hit the row. Home now scrolls modules, totals and rows together in `.conversation-body`, with the existing sticky composer retained. Only the max-width 767px Home rules changed; normal Chat and desktop rules remain as before.

The first is the previously reproduced component race; the second supplies direct field evidence for the observed pointer failure. The real GUI continued failing after the first patch alone and succeeded immediately with the second. Neither result warrants the earlier speculative project-cache patch.

## Author verification

- [Home tests](tests.txt): 12/12. Added unchanged-projection/native-node retention, latest callback, changed facts/removal/filter/error and Chat-remount regressions. Tiny DOM tests verify view contracts; they do not simulate physical pointer dispatch.
- [Interaction lint](interaction.txt): pass, 38 files. [Color lint](colors.txt): pass, 43 files; [contrast table](contrast.txt) regenerated. No color, material, motion or token edits.
- Existing GUI at 60324: mouse opens the intended same-project session at 476px, opens a session in another project at 390px, and opens the coding session at 1440px. Each selected heading was checked after navigation. Temporary viewport overrides were reset. No prompts were sent.
- The old local test process was no longer listening when this turn began. Astra started the normal Host against its same dedicated test data and port, preserving configured credentials and completed history; only the service loaded its own credential. Original 8804 was not operated on. This is a local development validation entry, not deployment.

Nearest implemented precedents: `app/web/home-view.mjs::renderHome/workRow` at `0fbd898`, existing `.home-active` narrow layout and sticky composer in `app/web/styles.css`, and [Home composition contract](../../../../design/home-composition-2026-09-10/README.md). Affected grammar: Home navigation target identity and scrolling ownership. Source facts, permission/admission and review ownership remain unchanged. No new visual baseline is accepted merely from these checks; changed-data pointer races and full-product gates retain their own scope.

## Bounded non-author review

Luna independently exercised `e4cdb2d` in Chrome 152 with the real Home component: stable mouse and native Enter activate once each; a response changing only observedAt/loading between down/up keeps the same connected row and dispatches once to the latest callback. A changed-title control still replaces the row and loses that in-flight click, matching the documented boundary.

At exact `5634175`, Luna used actual index.html/CSS/Home renderers with 18 synthetic chats and expanded modules. In 390×844 dark, conversation-body is the sole Home scroll owner (796px client height, 2183px scroll height); the stream wrapper is `flex:0 0 auto; overflow:visible`. Modules end at 387.1px, totals begin at 387.1px and end at 580.7px, first row starts at 636.2px: no overlap. After scrolling to row 11 (scrollTop 891), its center hits its own descendant; the sticky composer textarea remains visible at y604–652 and its center hits TEXTAREA. At 1280×900, candidate and parent stylesheet have equal target geometry and computed flex/overflow/position/min-height.

No material regression found in these bounded checks. Independent headless coverage does not include light, empty, 200% zoom, or 476/1440 cases; author GUI checks cover normal light at 390/476/1440 but not every matrix combination. No new paint/token/motion change was introduced; untested combinations remain untested. Temporary independent browser/server/profile were cleaned up. This is non-author review of the two narrow fixes, not product-wide acceptance.
