/* WO-SD-01 · Spark sample data · browser assertions and screenshots.
 *
 * Real headless Chromium (browser.mjs) driving the real, running server
 * (app/server/index.mjs, port 8919) and its real, unmodified static
 * allowlist — the five sample JSON files are served exactly as they sit on
 * disk (SD-18). BE-41 is genuinely not implemented on this baseline, so
 * every `/work-derivations` probe really does 404 unless this script's
 * fetch shim intercepts it.
 *
 * One synthetic hand, in the transport only, disclosed here (same shape as
 * evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910
 * /browser-checks.mjs and evidence/att-fe01/README.md's "合成手段两处，都在
 * 传输，不在答案"): the page's own window.fetch is wrapped so that calls to
 * `/api/v5/work-derivations` can be told to return a scripted body (a valid
 * non-empty live page, a valid empty live page, or a 404) instead of the
 * real 404 the real backend gives. This is the only way to exercise SD-2's
 * "any valid live payload wins" rule before BE-41 exists. Every other
 * request — bootstrap, projects, and both static routes under test — goes
 * to the real server untouched. The five *.json files themselves are read
 * over real HTTP from the real static allowlist, never injected.
 *
 *   SD01-1  entry text action appears only in the unimplemented state
 *   SD01-2  "Show sample data" enters sample: header label "Sample data"
 *           exactly once, stale scenario renders through the live render path
 *   SD01-3  scenario select renders all five fixtures, each distinctly
 *   SD01-4  sample matter titles are inert text; no navigation out of Spark
 *   SD01-5  "Check for a source again" + valid non-empty live payload atomically
 *           switches to live and drops sample
 *   SD01-6  "Check for a source again" + valid EMPTY live payload also wins and
 *           drops sample (SD-3: empty is still live)
 *   SD01-7  "Check for a source again" + 404 leaves sample state exactly as it was
 *   SD01-8  switching projects clears sample state
 *   SD01-9  the five sample JSON files really are served, over real HTTP, by the
 *           real static allowlist (independent of the node:test check)
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass: Boolean(pass), ...detail });

const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const api = async (path, init = {}) => {
  const res = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

const projectA = (await api("/projects", { method: "POST", body: JSON.stringify({ name: "Spark sample project A" }) })).body.project;
const projectB = (await api("/projects", { method: "POST", body: JSON.stringify({ name: "Spark sample project B" }) })).body.project;

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
await cdp("Page.navigate", { url: ORIGIN });
await waitFor(`window.__V5_UI__?.state.projects?.length >= 2`);
await sleep(400);

const dialogText = () => ev(`document.querySelector('dialog.spark-dialog')?.textContent || ''`);
const dialogOpen = () => ev(`Boolean(document.querySelector('dialog.spark-dialog')?.open)`);
const click = (selector) => ev(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if(!n) throw new Error('missing '+${JSON.stringify(selector)}); n.click(); return true; })()`);
// `root` is a container selector; this searches its descendant <button>s for
// an exact text match (Spark's text actions are always plain buttons).
const clickText = (root, text) => ev(`(() => { const n = [...document.querySelectorAll(${JSON.stringify(root)} + ' button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}); if(!n) throw new Error('no button with text '+${JSON.stringify(text)}); n.click(); return true; })()`);
const setSelect = (selector, value) => ev(`(() => {
  const n = document.querySelector(${JSON.stringify(selector)});
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(n, ${JSON.stringify(value)});
  n.dispatchEvent(new Event('change', { bubbles: true }));
  return n.value;
})()`);
const screenshot = async (name) => { const { data } = await cdp("Page.captureScreenshot", { format: "png" }); await writeFile(new URL(`./${name}`, import.meta.url), Buffer.from(data, "base64")); };
const openSpark = async () => { await clickText("dialog.spark-dialog", "Close Spark").catch(() => {}); await sleep(80); await click("#spark-button"); await waitFor(`document.querySelector('dialog.spark-dialog')?.open`); };

/* Install the /work-derivations shim. Every other request passes through. */
await ev(`(() => {
  window.__sd01Mode = 'real';       // 'real' | 'payload' | '404'
  window.__sd01Payload = null;
  window.__sd01Requests = [];
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/api/v5/work-derivations')) {
      window.__sd01Requests.push(url);
      if (window.__sd01Mode === 'payload') return new Response(JSON.stringify(window.__sd01Payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (window.__sd01Mode === '404') return new Response(JSON.stringify({ error: { code: 'not_found', message: 'work-derivations not found' } }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      if (window.__sd01Mode === '500') return new Response(JSON.stringify({ error: { code: 'synthetic_failure', message: 'Synthetic maintenance read failed' } }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      // 'real': fall through to the genuinely-unimplemented backend.
    }
    return orig(input, init);
  };
})()`);

try {
  // ---------------------------------------------------------------- SD01-1
  await openSpark();
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('No source yet')`);
  {
    const text = await dialogText();
    const hasEntry = await ev(`Boolean([...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent.trim()==='Show sample data'))`);
    record("SD01-1", /No source yet/.test(text) && hasEntry, { text: text.slice(0, 200) });
  }
  await screenshot("no-entry-before-check.png"); // not one of the two required shots; sanity only

  // ---------------------------------------------------------------- SD01-2
  await clickText("dialog.spark-dialog", "Show sample data");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Behind the current source set')`);
  {
    const text = await dialogText();
    const labelCount = (text.match(/Sample data/g) || []).length;
    const hasSelect = await ev(`Boolean(document.querySelector('dialog.spark-dialog select[aria-label="Sample scenario"]'))`);
    const selectValue = await ev(`document.querySelector('dialog.spark-dialog select[aria-label="Sample scenario"]')?.value`);
    record("SD01-2", labelCount === 1 && hasSelect && selectValue === "stale" && /Behind the current source set/.test(text) && /Up to date/.test(text), { labelCount, selectValue, text: text.slice(0, 300) });
  }
  await screenshot("spark-sample-stale-1440-light.png"); // required shot 1/2

  // ---------------------------------------------------------------- SD01-3
  {
    const perScenario = {};
    // One distinguishing, scenario-unique substring each — visible on the
    // default Overview tab (the truncation sentence itself is Activity-only,
    // per EX-SD1 §②'s table, so it is not usable as an Overview marker).
    const expect = {
      stale: /2 stale of 5/,
      quiet: /no prompt is generated/i,
      empty: /No Matters/,
      partial: /Unavailable · contract_unsupported/,
      truncated: /37 stale of 50/,
    };
    for (const scenario of ["quiet", "empty", "partial", "truncated", "stale"]) {
      await setSelect('dialog.spark-dialog select[aria-label="Sample scenario"]', scenario);
      await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').match(${expect[scenario].toString()})`);
      perScenario[scenario] = await dialogText();
    }
    const allMatch = Object.entries(expect).every(([name, re]) => re.test(perScenario[name]));
    record("SD01-3", allMatch, { checked: Object.keys(expect) });
  }

  // ---------------------------------------------------------------- SD01-4
  {
    await setSelect('dialog.spark-dialog select[aria-label="Sample scenario"]', "stale");
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Behind the current source set')`);
    const before = await ev(`({open: document.querySelector('dialog.spark-dialog')?.open, url: location.href})`);
    const rowIsSpan = await ev(`(() => { const n = document.querySelector('dialog.spark-dialog .spark-matter-open'); return n ? n.tagName : null; })()`);
    await click("dialog.spark-dialog .spark-matter-open");
    await sleep(300);
    const after = await ev(`({open: document.querySelector('dialog.spark-dialog')?.open, url: location.href})`);
    record("SD01-4", rowIsSpan === "SPAN" && before.open === true && after.open === true && before.url === after.url, { rowIsSpan, before, after });
  }

  // ---------------------------------------------------------------- SD01-5 (non-empty live wins)
  {
    // Spark defaults to `projects[0]` from the host's own list — read the
    // actually-selected project back rather than assuming insertion order.
    const activeProjectId = await ev(`document.querySelector('dialog.spark-dialog select[aria-label="Spark project"]')?.value`);
    const nonEmptyPayload = {
      schemaVersion: 1, asOf: new Date().toISOString(), scopeRef: `project:${activeProjectId}`,
      coverage: { matters: "complete", reason: null }, page: { limit: 25, offset: 0, total: 1 },
      matters: [{
        matterId: "live-m-1", title: "Live Matter", extensionId: "inbound-nda", version: 1, sourceVersion: 2,
        snapshotRef: "core-state:live-check", availability: "observed", reason: null,
        derivations: { total: 1, current: 0, stale: 1, byStatus: [{ status: "pending", current: 0, stale: 1 }] },
        staleRefs: [{ candidateId: "c-live", status: "pending", candidateSourceVersion: 1, matterSourceVersion: 2, supersedes: null }],
        staleRefsTruncated: false, sourceSetChange: null,
      }],
    };
    await ev(`window.__sd01Mode='payload'; window.__sd01Payload=${JSON.stringify(nonEmptyPayload)};`);
    await clickText("dialog.spark-dialog", "Check for a source again");
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Live Matter')`);
    const text = await dialogText();
    const hasEntry = await ev(`Boolean([...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent.trim()==='Show sample data'))`);
    record("SD01-5", /Live Matter/.test(text) && !/Sample data/.test(text) && !hasEntry, { text: text.slice(0, 300), hasEntry });
  }

  // Return to sample for the next two checks.
  await ev(`window.__sd01Mode='404';`);
  await clickText("dialog.spark-dialog", "Refresh");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('No source yet')`);
  await clickText("dialog.spark-dialog", "Show sample data");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Behind the current source set')`);

  // ---------------------------------------------------------------- SD01-6 (empty live wins)
  {
    const activeProjectId = await ev(`document.querySelector('dialog.spark-dialog select[aria-label="Spark project"]')?.value`);
    const emptyPayload = {
      schemaVersion: 1, asOf: new Date().toISOString(), scopeRef: `project:${activeProjectId}`,
      coverage: { matters: "complete", reason: null }, page: { limit: 25, offset: 0, total: 0 }, matters: [],
    };
    await ev(`window.__sd01Mode='payload'; window.__sd01Payload=${JSON.stringify(emptyPayload)};`);
    await clickText("dialog.spark-dialog", "Check for a source again");
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes("No Matters in this project")`);
    const text = await dialogText();
    record("SD01-6", /No Matters in this project/.test(text) && !/Sample data/.test(text), { text: text.slice(0, 300) });
  }
  await screenshot("spark-live-empty-1440-light.png"); // required shot 2/2

  // Return to sample for the 404-stays-in-sample check.
  await ev(`window.__sd01Mode='404';`);
  await clickText("dialog.spark-dialog", "Refresh");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('No source yet')`);
  await clickText("dialog.spark-dialog", "Show sample data");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Behind the current source set')`);

  // ---------------------------------------------------------------- SD01-7 (404 stays in sample)
  {
    await ev(`window.__sd01Mode='404'; window.__sd01Requests=[];`);
    await clickText("dialog.spark-dialog", "Check for a source again");
    await waitFor(`window.__sd01Requests.length >= 1`);
    await sleep(500);
    const text = await dialogText();
    record("SD01-7", /Sample data/.test(text) && /Behind the current source set/.test(text), { text: text.slice(0, 300) });
  }

  // ---------------------------------------------------------------- SD01-10 (a non-404 error drops sample and shows the existing error copy, not the entry)
  // Still in sample from SD01-7 (project A, scenario stale) — no need to re-enter.
  {
    await ev(`window.__sd01Mode='500';`);
    await clickText("dialog.spark-dialog", "Check for a source again");
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Synthetic maintenance read failed')`);
    const text = await dialogText();
    const hasEntry = await ev(`Boolean([...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent.trim()==='Show sample data'))`);
    record("SD01-10", /Synthetic maintenance read failed/.test(text) && !/Sample data/.test(text) && !hasEntry, { text: text.slice(0, 300), hasEntry });
  }

  // Return to sample once more (project A) so SD01-8 tests an actual switch out of sample.
  await ev(`window.__sd01Mode='404';`);
  await clickText("dialog.spark-dialog", "Retry");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('No source yet')`);
  await clickText("dialog.spark-dialog", "Show sample data");
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Behind the current source set')`);

  // ---------------------------------------------------------------- SD01-8 (project switch clears sample)
  {
    await setSelect('dialog.spark-dialog select[aria-label="Spark project"]', projectB.id);
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('No source yet')`);
    const text = await dialogText();
    record("SD01-8", /No source yet/.test(text) && !/Sample data/.test(text), { text: text.slice(0, 300) });
  }

  // ---------------------------------------------------------------- SD01-9 (real static route, real HTTP, independent of node:test)
  {
    const statics = await Promise.all(["stale", "quiet", "empty", "partial", "truncated"].map(async (name) => {
      const res = await fetch(`${ORIGIN}/web/samples/spark-derivations/${name}.json`);
      return { name, status: res.status, type: res.headers.get("content-type") };
    }));
    const ok = statics.every((s) => s.status === 200 && /^application\/json; charset=utf-8/.test(s.type ?? ""));
    record("SD01-9", ok, { statics });
  }

  const final = {
    base: ORIGIN,
    projects: { a: projectA.id, b: projectB.id },
    checks: results,
    pass: results.every((r) => r.pass),
  };
  await writeFile(new URL("./checks.json", import.meta.url), JSON.stringify(final, null, 2));
  console.log(JSON.stringify(final, null, 2));
  if (!final.pass) process.exitCode = 1;
} finally {
  await close();
}
