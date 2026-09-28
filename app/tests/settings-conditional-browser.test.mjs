/* MS-R1 · the whole Settings page in real headless Chrome: a row or block a
 * view hides for its own reason stays hidden through search and section
 * switches; search still filters and restores. Skips (and says so) without
 * Chrome; set COURTWORK_CHROME to point at one. */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runSettingsConditionalBrowser } from "../scripts/settings-conditional-browser.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

test("Settings search and section switches never reveal what a view hid", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const { steps } = await runSettingsConditionalBrowser({ chromePath: CHROME });
  const at = (name) => steps.find((entry) => entry.name === name);
  const models = (name) => { const s = at(name); assert.equal(s.section, "settings-models", name); return s; };

  // Local test provider in force: no API key, no compatible-only fields, through search and switches.
  for (const name of ["local-in-force", "search-cleared", "back-to-models"]) {
    const s = models(name);
    assert.equal(s.local, true, name);
    assert.deepEqual([s.apiKey, s.contextWindow, s.effortValues, s.provider, s.model], [false, false, false, true, true], name);
    assert.equal(s.searchMarks, 0, `${name}: no search mark is left behind`);
  }
  assert.equal(at("search-key").apiKey, false, "a match does not reveal a row its owner hid");
  assert.equal(at("general").section, "settings-general");

  // A catalog provider: the key row is there; compatible-only fields are not.
  for (const name of ["deepseek-configured", "deepseek-search-cleared", "deepseek-final"])
    assert.deepEqual([models(name).apiKey, at(name).contextWindow, at(name).effortValues, at(name).model], [true, false, false, true], name);
  assert.equal(at("search-effort").effortValues, false, "searching for a hidden field's words does not reveal it");
  assert.deepEqual([at("search-api-key").apiKey, at("search-api-key").model], [true, false], "search still filters to the match");

  // No Session: the Session block stays hidden through every search.
  assert.ok(steps.every((s) => s.sessionPanel === true), "the Session panel is never revealed without a Session");
});
