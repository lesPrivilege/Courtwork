# Harness Core + Fable clean main integration · 2026-09-08

User requested a clean merged main before Fable dispatches Opus. Inputs are main `8023e1bfda89ddad8fbf59d96f22a9f6bc40fed7`, Harness Core `d6247a8e27dc512a00fd113c9fec9835d24d6594` (tested code `133269184468f1adf3b38acfc59091818daeb8e8`), and Fable `claude/fable-settings` `99a9279868166c94e99fc2e396be551ef1fe3e53`.

The two no-fast-forward merges produce `d60134ffd59ca09b35be83a69d2743314ff75b06`. Only `engineering/current.md` conflicted: resolved by preserving main's Paper9.6 adoption and existing delivery facts, replacing obsolete queued/in-progress Core entries with the fixed delivery, and recording the frontend sequence. `git diff 1332691 -- app tests` is empty; the integration introduces no product code changes. Paper9.6 and MIT remain byte-identical to prior main. Core's original9.3 evidence stays historical and is not relabeled as9.6 verification.

Subsequent documentation corrections reconcile stale immediate-start/WK11 wording with WK-83 and the agreed sequence. One concrete consumer mismatch is explicit: the current packet declares `action:"decide"` with allowed decisions in its payload schema enum; `revise_candidate` is a supported API but is not yet advertised in `humanActions`. Astra must add that declaration and fixture before WK10b second-segment revision UI ships. Renderer manifest/allowlist additions likewise follow the concrete frontend module request. Neither blocks WK10b first segment; the frontend must not invent permissions.

Front-end sequence from this merged main: **WK10b first segment → WK10b second segment → WK13 → WK12 → WK11**. Each starts after the preceding shared-file delivery has merged. No old prebuilt WK10b tree is a start point. Use the final main SHA accompanying this receipt; documentation-only descendants retain tested product bytes.

Verification and independent review are recorded below. Synthetic temporary data and loopback only; no credentials, paid providers, deployment, or public G1–G5 acceptance. The isolated integration worktree does not replace the sole persistent `Courtwork` folder. Historical delivery evidence is in [Harness Core](../harness-core-20260908/README.md); [current](../../engineering/current.md) remains authoritative.

## Actual checks

At merged product tree `d60134f`: `npm --prefix app ci` succeeds from the existing lockfile ([log](install.log)); `npm --prefix app test` **170/170 pass** ([log](tests.log)); `npm --prefix app run smoke` **pass** ([log](smoke.log)). No product files changed after those runs. `git diff 1332691 -- app tests` is empty, and both delivered heads are ancestors of the merged tree. [Independent integration check](independent.md) is separate from these author-run checks.
