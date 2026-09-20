# GUI G3/G4 style and evidence review

Candidate: detached HEAD fc6eccf4fa29a34edebd17f524cc9b59437f4a46, based on 72c91a2. The G3 implementation commit fc8dd6182bb990fba8d383508ccdd4e902ef0867 is the candidate's parent, so the packet's captured app source is the immediate parent snapshot. Review was read/test only; no provider, credentials, browser capture, app server, or full suite was run.

## Checks

- node tools/lint-spacing.mjs: pass (4 CSS files).
- Focused tests spacing-governance, home-presentation, and event-weight: 19/19 pass.
- The manifest has 19 cells, 19 PNG references, all 19 files exist, and there are no unreferenced PNGs at this candidate. Two non-executed cells are explicitly recorded: Waiting/approval and live event burst.
- The capture script and manifest agree on the present cell/file set. Reproduction depends on the documented external app server and Chrome setup (evidence/gui-grammar-20260920/capture.mjs:16-18; packet README:19-35); no capture was rerun here.

## Findings and dispositions

1. **G4 packet metadata and fixture labeling need correction.** The owner record says “19 executed cells and 18 viewport PNGs” (engineering/execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md:248-253), while the pinned packet's table and manifest contain 19 screenshot cells/files (evidence/gui-grammar-20260920/README.md:49-73; manifest.json:2-990). There is no missing PNG at this SHA. More materially, the capture script screenshots the supposed empty cell immediately after navigation and only then checks/clicks the preview offer (capture.mjs:157-175). A parallel IAB check found the first visit can auto-open the example, so the “empty, example not shown” label needs an explicit precondition or recapture. Correct the owner count to 19 and record the actual fixture state before relying on the empty baseline.

2. **Native 200% zoom is described inconsistently.** The convergence record lists native 200% zoom as an executed presentation axis (gui-grammar-convergence-20260919.md:31,240-246), while its G4 candidate section marks native zoom unexecuted (:255-258). The packet correctly says only a CSS-equivalent 720x450 @2x cell was captured and native zoom was unavailable (evidence/gui-grammar-20260920/README.md:61,104-107). Adjust the governing matrix/claim to “unexecuted; CSS-equivalent substitute recorded.” Do not count this as browser-zoom or WCAG evidence.

3. **G3 visual-coverage text overclaims G4.** The G3 check says Chat long content, Usage dialog, Spark, and markdown reader were not compared visually and that G4 covers them (gui-grammar-convergence-20260919.md:234). The packet has ordinary Chat cells and Spark, but no Usage or markdown-reader cell (evidence/gui-grammar-20260920/README.md:62-69); capture.mjs:420-489 only drives Chat, Attention, and Spark. Correct the record to list absent surfaces as unexecuted, or add separately identified captures. Normal Chat evidence does not establish long-content coverage.

4. **The spacing gate has three enforceability holes.** lint-spacing.mjs:209-235 only parses declarations ending in a semicolon, so a final padding: 7px without one is invisible. Lines 197-201 accept any var(--space-...) or var(--text-...), including undefined token names. Lines 228-230 match exceptions by selector and value only, so a registration justified for .project-toggle padding also permits .project-toggle { margin: 6px; }. Existing tests (app/tests/spacing-governance.test.mjs:37-66) do not cover these cases. A temporary probe containing all three returned exit 0. Add negative tests and either resolve token definitions/property scope or explicitly narrow the contract before treating this as a complete governance gate.

5. **Narrow-layout overlap remains a reviewer-owned residual.** The packet records composer/block rectangle intersections at 390x844 and 720x450 @2x, and says scrolling was not exercised (evidence/gui-grammar-20260920/README.md:54,61,144-158). A parallel IAB check confirms that scrolling can bring Activity fully above the docked composer at 390, but that result is absent from the committed packet. G3 also deliberately snaps values such as nav-filter padding from 7/30 to token values 8/32 (app/web/styles.css:335-341,804-810) and Home section spacing from 28 to 32 (:1128-1142). Preserve the overlap and snap-impact checks as explicit G4 review evidence; update the packet if the scroll result is relied upon. Do not convert either observation into a product pass/fail claim without the stated coverage.

## Recommendation

The packet is internally 19-cell/19-PNG consistent, but its owner metadata, empty-fixture precondition, native-zoom wording, and surface-coverage claim need correction. Hold G3 completion as a fully enforceable token gate until the parser, undefined-token, and property-scoped exception cases are covered or deliberately contracted. This is a bounded G3/G4 recommendation only; it is not broad GUI or product acceptance.
