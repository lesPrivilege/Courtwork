# Independent Pages review

Worktree: `<isolated-pages-checkout>`
Preview: `http://127.0.0.1:8941/Courtwork/`
CDP: port `19993`, independent ephemeral Chrome profile
Source snapshot: `9e5384fcabdac432259b3ffab7928251bea49859`

Bounded functional/source checks: **10/10 passed**.

## Evidence

- Independent browser verification: 17/17 checks passed on CDP port 19993, including same-origin requests, eight-step keyboard traversal, replay refusal, seven anatomy links, three pricing tabs/cards, reduced-motion/transparency, no-JS fallback, contrast, and 1440/390/200% overflow checks.
- Assume-unchanged probe: `release({capture:true})` exited 1 and named `app/web/styles.css` after an ignored-index mutation in a disposable worktree.
- Recorded source probe: valid identity/digest/quote passed; wrong candidate/source/version and tampered text/digest/quote all returned null.
- Pricing source uses three SVG diagram functions and product font tokens (`--font-mono`, `--text-body`); material and local-link checks pass.

## Workflow observation

- The current checkout capture command reports product drift beyond `release.json` source `9e5384f` (exact paths are in the JSON). This is the expected capture guard behavior; captures need an isolated checkout of the declared snapshot. It did not invalidate the pinned static-page/browser checks above.

Raw JSON: `evidence/pages-first-edition-20260910/independent-review.json`
