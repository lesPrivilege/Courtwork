# G4 evidence re-review — candidate `213ef4d55073996cb25cd717dc2905e775d6f560`

Scope was limited to the evidence delta from `34139788b16f60866e4c7abc947f428ccdc1c8f5`. I read the manifest, README, and both added capture scripts; parsed the manifest against the PNG directory; ran `node --check` on both capture scripts, `node --test app/tests/event-weight.test.mjs` (2/2 pass), and `git diff --check`. I did not launch a capture, browser, provider, or credentialed process.

## Verified executed evidence

- `manifest.json` contains 23 cells, 23 unique `file` references, and exactly 23 PNGs; there are no missing or extra files. The accounting is 19 original cells + 3 fixture-pass cells + 1 single-run cell. The new PNG names and facts are present at `manifest.json:834` and `manifest.json:916`.
- The single-run record is internally consistent with `capture-single-run-burst.mjs:135-150,177-264`: one 28-call script, 26 successful attempts (25 `ws_list` plus the approved write), one real `ws_read` ENOENT failure, and one unresolved `ws_write` permission. The manifest records one execution disclosure, 28 tool cards, a 59-byte artifact with a full SHA-256, and `waiting_user` for the final permission. The disclosure's 27 `aria-controls` members are explained by the 26 tool calls plus the resolved allow-history row; this is not a 27th tool call.
- The session-level burst record is also internally consistent with `capture-fixture-cells.mjs:271-305,365-380`: 102 tool cards, 100 successes, one failure, and one pending permission across five runs (`1/32/32/32/3` successful groups). This is a session burst, not a 100-event single Run.
- Both records preserve session identity and the same first visible row after `Page.reload`; the fixture burst retains its pending permission, and the single-run record additionally retains its artifact row and pending card. However, both recorded `scrollTop` values are `0`; this establishes reload reconstruction from the top of the thread only. It does not establish preservation of a non-zero reading position or an interior scroll anchor.

## Concrete reproducibility findings

1. **Default capture startup is broken in both added scripts.** Each imports `tmpdir` from `node:os` but evaluates `path.join(os.tmpdir(), ...)` at module initialization: `capture-fixture-cells.mjs:17,27` and `capture-single-run-burst.mjs:15,23`. With `G4C_SCRATCH` unset this raises an undefined-`os` runtime error before the server or browser starts. `node --check` cannot detect that undeclared runtime identifier. Setting `G4C_SCRATCH` bypasses the expression, but the documented default reproduction path is broken. Minimal fix: call the imported `tmpdir()` or import the `os` namespace. No capture was rerun here.

2. **Source provenance is prose-only and partly dirty-tree based.** The manifest's pass environment sections at `manifest.json:1237-1254` record browser, ports, and scratch paths, but no source commit, dirty-tree digest, or source-file hashes. README lines 18-50 say the original 19 cells came from the working tree that became `3413978`, while the fixture pass reported HEAD `3413978` with five tracked source/test files already uncommitted and later committed in `213ef4d`. A commit hash alone therefore cannot reproduce the fixture pass's exact app bytes. The single-run environment likewise has no source pin. Treat the source identity as author-attested by the README/current commit, not machine-pinned evidence. A small closure is to record each pass's HEAD plus a dirty-tree/source-file digest; this report does not prescribe a broader evidence framework.

## Open scope

The manifest and README correctly keep the single Run with >=100 tool events not executed (`manifest.json:1007`; README:197). The 2/2 `event-weight` test is synthetic coverage only. Native 200% zoom, forced colors, screen reader, Usage dialog, markdown reader, and long-content Chat remain unexecuted. This review does not waive those cells or confer G4 acceptance.

**Recommendation:** retain the 23-cell packet as bounded candidate evidence with exact PNG parity and internally consistent executed facts. Keep the default-script defect and source-snapshot gap as concrete blockers to claiming a reproducible capture procedure; preserve the listed matrix residuals for Astra's final scope decision.
