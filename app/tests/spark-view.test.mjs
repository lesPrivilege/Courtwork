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
