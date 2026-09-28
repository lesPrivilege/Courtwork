/* Reader coarse targets (06d / F2): the Preview tab close and the shared
 * Version details summary on the shipped CSS in real headless Chrome, fine and
 * emulated coarse. Skips (and says so) without Chrome. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runReaderTargetsBrowser } from "../scripts/reader-targets-browser.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("reader targets: tab close 24 fine / 44 coarse; Version details a control-height target with its marker", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const { fine, coarse } = await runReaderTargetsBrowser({ chromePath: CHROME });
  assert.deepEqual([fine.coarse, coarse.coarse], [false, true]);
  assert.deepEqual(fine.tabClose, { w: 24, h: 24 }, "the fine micro target is kept");
  assert.ok(coarse.tabClose.w >= 44 && coarse.tabClose.h >= 44, "coarse tab close is at least 44×44");
  assert.deepEqual(coarse.glyph, fine.glyph, "the glyph does not grow with the hit target");
  assert.equal(coarse.tabCloseName, "Close out/reader-measurements.md");
  assert.ok(fine.versionSummary.h >= 24, "fine summary meets the 24px minimum");
  assert.ok(coarse.versionSummary.h >= 44, "coarse summary is at least 44 tall");
  assert.deepEqual([fine.summaryMarker, coarse.summaryMarker], ["list-item", "list-item"], "the native disclosure marker stays");
});
