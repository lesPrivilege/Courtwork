/* WO-SP1-FE · Spark's view module owns DOM and fetching, not shape — that is
 * `spark-projection.mjs`, already covered in `spark-projection.test.mjs`.
 * There is no DOM harness in this repository for `app/web/*-view.mjs`
 * modules (see `coordination-view.test.mjs`), so this file follows the same
 * convention: source-visible regression checks for the hard limits WO-SP1-FE
 * puts on this slice, plus the static-allowlist note the WO itself defers to
 * Astra (recorded as a known gap here, not asserted true).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const viewSource = readFileSync(`${root}web/spark-view.mjs`, "utf8");
const projectionSource = readFileSync(`${root}web/spark-projection.mjs`, "utf8");
const serverSource = readFileSync(`${root}server/index.mjs`, "utf8");
const appSource = readFileSync(`${root}web/app.mjs`, "utf8");

/* The signature gained `getProjects` in Astra's integration patch: Spark reads
 * the host's already-loaded project list instead of re-fetching /projects, the
 * same seam createUsageView uses. The assertion still pins the shape so a
 * future edit cannot quietly reintroduce a second, independently-fetched
 * project list that could disagree with the shell's. */
test("SP1-FE · createSparkView keeps the frozen constructor signature", () => {
  assert.match(viewSource, /export function createSparkView\(\{\s*request,\s*getProjects,\s*onOpenMatter\s*\}\)/);
  assert.doesNotMatch(viewSource, /request\(\s*['"`]\/projects/);
});

test("SP1-FE · a projection module fetches nothing, writes nothing, reads no clock", () => {
  // Same check `coordination-view.test.mjs` runs on its own projection file;
  // comments are stripped first so a rule stated in prose can't fake the gate.
  const code = projectionSource.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  for (const forbidden of ["fetch(", "Date.now(", "request(", "localStorage", "document.", "createElement"])
    assert.equal(code.includes(forbidden), false, forbidden);
});

test("SP1-FE · Spark makes no request path containing 'attention' — it resolves, creates or edits no Attention item", () => {
  // Comments are stripped first: the header comment names the SP-11 rule in
  // prose ("Spark does not create, resolve or otherwise touch Attention
  // items"), which must not be mistaken for the code satisfying it.
  const code = viewSource.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  assert.equal(/attention/i.test(code), false);
});

test("SP1-FE · Spark writes nothing: no POST/PUT/PATCH/DELETE method anywhere in the view", () => {
  assert.doesNotMatch(viewSource, /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/);
});

test("SP1-FE · no Spark-private persistence: no localStorage, sessionStorage or IndexedDB", () => {
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB"])
    assert.equal(viewSource.includes(forbidden), false, forbidden);
});

test("SP1-FE · Spark introduces no new dependency: only relative app/web imports", () => {
  const specifiers = [...viewSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0);
  for (const specifier of specifiers) assert.match(specifier, /^\.\//, `${specifier} is not a relative app/web import`);
});

test("SP1-FE · a 404 is read as unimplemented, never rendered as zero maintenance items", () => {
  assert.match(viewSource, /status === 404/);
  assert.match(viewSource, /unimplemented/);
});

test("SP1-FE · Unavailable is stated in words, not shown as a bare number", () => {
  assert.match(viewSource, /Unavailable/);
});

test("SP1-FE · pagination carries the prior snapshotRef and can be rejected", () => {
  assert.match(viewSource, /expectSnapshot/);
  assert.match(viewSource, /sameSnapshot/);
});

test("SP1-FE · row navigation calls the host's onOpenMatter and opens no dialog/session of its own", () => {
  assert.match(viewSource, /onOpenMatter\(matter\.matterId, projectId\)/);
  assert.doesNotMatch(viewSource, /new URL\(.*sessions/);
});

/* ---- Known gap, recorded rather than silently assumed away (WO-SP1-FE
 * §交付: "静态准入由 Astra 登记"). Astra's follow-up has landed, so this now
 * asserts presence: both modules must stay in the allowlist array, or /web
 * serves them as a silent 404 with no build or test error anywhere else.
 * static-web-manifest.test.mjs makes the same check mechanically for every
 * module; this one names the two Spark files so a regression here reads as
 * a Spark regression. */
test("SP1-FE · static allowlist: spark-view.mjs / spark-projection.mjs are registered", () => {
  const allowlist = serverSource.slice(serverSource.indexOf("for (const name of ["), serverSource.indexOf('STATIC.set("/web/vendor/icons.svg"'));
  const registered = ["spark-view.mjs", "spark-projection.mjs"].filter((name) => new RegExp(`"${name}"`).test(allowlist));
  assert.deepEqual(registered, ["spark-view.mjs", "spark-projection.mjs"], "both Spark modules must be in the /web static allowlist");
});

test("SP1-FE · app.mjs wires the sidebar entry without touching the static allowlist array itself", () => {
  assert.match(appSource, /createSparkView/);
  assert.match(appSource, /spark-button/);
});

/* ---- WO-SD-01 · sample data. There is still no DOM harness for *-view.mjs
 * modules (see the file header), so — matching every test above — these are
 * source-visible regression checks pinning the control-flow properties the
 * work order names as hard requirements. The behavioural claims (what a real
 * click sequence actually renders) are verified against a real headless
 * Chromium instance in evidence/sd-01/ (checks.mjs), not here. ---- */

test("SD-01 · createSparkView keeps the frozen constructor signature — sample introduces no new dependency, no new parameter", () => {
  assert.match(viewSource, /export function createSparkView\(\{\s*request,\s*getProjects,\s*onOpenMatter\s*\}\)/);
  const specifiers = [...viewSource.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const specifier of specifiers) assert.match(specifier, /^\.\//, `${specifier} is not a relative app/web import`);
});

test("SD-01 · the sample fetch reads the static sample route, never /work-derivations", () => {
  assert.match(viewSource, /fetch\(`\/web\/samples\/spark-derivations\/\$\{scenario\}\.json`/);
});

test("SD-01 · 'Show sample data' appears exactly once as code (comments stripped), inside the unimplemented branch, and nowhere else", () => {
  const code = viewSource.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const matches = [...code.matchAll(/Show sample data/g)];
  assert.equal(matches.length, 1, "the entry action must be a single text action, not duplicated per state");
  const unimplementedAt = viewSource.indexOf("No source yet. This runtime has no maintenance source connected here.");
  const entryAt = viewSource.indexOf("panel.append(button('Show sample data'");
  const nextBranchAt = viewSource.indexOf("if (rejected)");
  assert.ok(unimplementedAt >= 0 && entryAt > unimplementedAt && entryAt < nextBranchAt,
    "'Show sample data' must render immediately after the unimplemented sentence, before any other state branch");
});

test("SD-01 · the sample header label 'Sample data' appears exactly once in the source (one row, no per-card label, no colour class, no icon() call)", () => {
  const matches = [...viewSource.matchAll(/text:\s*'Sample data'/g)];
  assert.equal(matches.length, 1);
  const barSource = viewSource.slice(viewSource.indexOf("function sampleBar"), viewSource.indexOf("function render()"));
  assert.doesNotMatch(barSource, /action\(/, "the sample label must not be built through the icon-bearing action() helper");
});

test("SD-01 · the scenario select is a single control offering exactly the five frozen fixtures, defaulting to stale", () => {
  assert.match(viewSource, /aria-label':\s*'Sample scenario'/);
  assert.match(viewSource, /SAMPLE_SCENARIOS = \['stale', 'quiet', 'empty', 'partial', 'truncated'\]/);
  assert.match(viewSource, /sampleScenario = 'stale'/);
});

test("SD-01 · exit and re-probe copy match SD-17 exactly: 'Hide sample data', 'Check for a source again'", () => {
  assert.match(viewSource, /'Hide sample data'/);
  assert.match(viewSource, /'Check for a source again'/);
  // The word "Preview" is reserved by Appearance's live preview (EX-SD1 §④); sample copy must not reuse it.
  const sampleRegion = viewSource.slice(viewSource.indexOf("function sampleBar"), viewSource.indexOf("function render()"));
  assert.doesNotMatch(sampleRegion, /Preview/);
});

test("SD-01 · sample rows are read-only: matterRow and the Activity section heading both branch on readOnly before ever calling onOpenMatter", () => {
  assert.match(viewSource, /readOnly\s*\?\s*\n?\s*el\('span', \{ className: 'spark-matter-open', text: matter\.title \}\)\s*\n?\s*:\s*button\(matter\.title, \(\) => \{ dialog\.close\(\); onOpenMatter/);
  // Two call sites: matterRow (Overview) and the Activity section heading.
  const readOnlyBranches = [...viewSource.matchAll(/readOnly\s*\?/g)];
  assert.ok(readOnlyBranches.length >= 2, "expected a readOnly branch in both matterRow and renderActivity's section heading");
});

test("SD-01 · sample state is discarded on any valid live payload (including empty) and on any non-404 error, but survives a 404", () => {
  const loadSource = viewSource.slice(viewSource.indexOf("async function load("), viewSource.indexOf("async function loadSample("));
  // Success branch (the `else` of the rejected-snapshot check) clears sample.
  const successBranch = loadSource.slice(loadSource.indexOf("} else {"), loadSource.indexOf("}\n    } catch"));
  assert.match(successBranch, /sample = false; sampleData = null;/);
  // The 404 branch must NOT clear sample; the non-404 branch must.
  const catchBranch = loadSource.slice(loadSource.indexOf("} catch (e) {"));
  const fourOhFourBranch = catchBranch.slice(catchBranch.indexOf("e.status === 404"), catchBranch.indexOf("} else {"));
  assert.doesNotMatch(fourOhFourBranch, /sample = false/);
  const otherErrorBranch = catchBranch.slice(catchBranch.indexOf("} else {"), catchBranch.indexOf("} finally"));
  assert.match(otherErrorBranch, /sample = false; sampleData = null;/);
});

test("SD-01 · sample never issues its own /work-derivations request: only load() (via request()) reaches that endpoint", () => {
  const loadSampleSource = viewSource.slice(viewSource.indexOf("async function loadSample("), viewSource.indexOf("function matterRow("));
  assert.doesNotMatch(loadSampleSource, /work-derivations/);
  assert.doesNotMatch(loadSampleSource, /\brequest\(/);
});

test("SD-01 · switching projects clears sample state before the live probe fires", () => {
  const changeHandler = viewSource.slice(viewSource.indexOf("select.addEventListener('change', () => {\n        projectId"), viewSource.indexOf("controls.append(select);\n    }\n    if (!sample)"));
  assert.match(changeHandler, /sample = false; sampleData = null;/);
  assert.match(changeHandler, /void load\(0\);/);
});

test("SD-01 · sample state is checked before every other render branch and returns before the pager can run", () => {
  const contentsSource = viewSource.slice(viewSource.indexOf("function renderContents()"));
  const sampleCheckAt = contentsSource.indexOf("if (sample && sampleData)");
  const loadingCheckAt = contentsSource.indexOf("if (loading)");
  const pagerAt = contentsSource.indexOf("data.page.total > data.page.limit");
  assert.ok(sampleCheckAt >= 0 && sampleCheckAt < loadingCheckAt && loadingCheckAt < pagerAt);
  const sampleBranch = contentsSource.slice(sampleCheckAt, loadingCheckAt);
  assert.match(sampleBranch, /return;/, "the sample branch must return before reaching loading/unimplemented/error/pager");
  assert.doesNotMatch(sampleBranch, /page\.total/);
});

test("SD-01 · sample rendering reuses renderOverview/renderActivity — no second renderer for sample data", () => {
  const sampleBranch = viewSource.slice(viewSource.indexOf("if (sample && sampleData) {"), viewSource.indexOf("if (loading) panel.append"));
  assert.match(sampleBranch, /renderOverview\(panel, sampleData, \{ readOnly: true \}\)/);
  assert.match(sampleBranch, /renderActivity\(panel, sampleData, \{ readOnly: true \}\)/);
});

test("SD-01 · styles.css gained only additions for the sample row: one new class, --muted-strong, no new colour token", () => {
  const cssSource = readFileSync(`${root}web/styles.css`, "utf8");
  assert.match(cssSource, /\.spark-sample-label\s*\{[^}]*color:var\(--muted-strong\)[^}]*\}/);
});

test("SD-01 · the static allowlist registers the five sample JSON files as one loop, with the JSON content type", () => {
  assert.match(serverSource, /for \(const name of \["stale", "quiet", "empty", "partial", "truncated"\]\) STATIC\.set\(`\/web\/samples\/spark-derivations\/\$\{name\}\.json`/);
  assert.match(serverSource, /type:"application\/json; charset=utf-8"/);
});
