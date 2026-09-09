# Pages publishing-surface continuity evidence

2026-09-09 packet, continued on 2026-09-10. This directory stores continuity recordings and the test log consumed by the Pages publishing candidate. The current publication identity is declared by [`site/release.json`](../../site/release.json); the first-edition narrative is in [`pages-first-edition-20260910`](../pages-first-edition-20260910/README.md).

## Current continuity input

The `continuity-9e5384f.json` recording and its `.attempts.json`/`.journal.jsonl` sidecars are the current 9e5384f publication inputs. `tests.log` records the associated repository test run. The files retain their own bytes and hashes; this README does not restate a test count as a product acceptance claim.

## Historical continuity input

The `continuity-172130e.json` recording and its sidecars are retained historical material from the prior publication snapshot. The older specimen recording formerly at `site/specimen/172130e.json` has SHA-256 `77a496f01accc507689e55463bd810af1268ce4fb89a24d4dc53626bc076c3e0`; its original bytes remain at frozen Git commit `00b2f2886e04aa7b7facb588d4375a246f3e341d`, path `site/specimen/172130e.json`. The current tree retains only this provenance index because the recording contained machine-local paths. The current public recording is a path-redacted projection of the 9e5384f capture; see [redaction receipt](../public-repository-cleanup-20260910/specimen-redaction.json). This is not a new product capture.

This packet is evidence for the publishing surface and continuity inputs only. It does not imply deployment, product acceptance, or live-provider capability. Build and deployment boundaries remain in [`site/README.md`](../../site/README.md) and the Pages workflow.
