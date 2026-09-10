/*
 * Independent SD-01 verification.  This is deliberately a new scenario
 * driver, not a rerun of evidence/sd-01/checks.mjs: the assertions below
 * exercise the same rendered surface with separate project IDs, timing and
 * transport scripts.  The CDP transport helper is the existing, dependency-
 * free real-Chrome harness; all non-work-derivations requests reach the real
 * server.
 */
import { cdp, evaluate, waitFor, close, ORIGIN, sleep } from "../sd-01/browser.mjs";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const checks = [];
const record = (id, pass, detail = {}) => checks.push({ id, pass: Boolean(pass), ...detail });
const json = (value) => JSON.stringify(value);

const bootRes = await fetch(`${ORIGIN}/api/v5/bootstrap`);
const boot = await bootRes.json();
const token = boot.sessionToken;
const api = async (method, route, body) => {
  const response = await fetch(`${ORIGIN}/api/v5${route}`, {
    method,
    headers: { "content-type": "application/json", "x-work-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const projectA = (await api("POST", "/projects", { name: "SD independent A" })).body.project;
const projectB = (await api("POST", "/projects", { name: "SD independent B" })).body.project;
const dialogText = () => evaluate("document.querySelector('dialog.spark-dialog')?.textContent || ''");
const clickText = async (text) => evaluate(`(() => {
  const node = [...document.querySelectorAll('dialog.spark-dialog button')]
    .find((button) => button.textContent.trim() === ${json(text)});
  if (!node) throw new Error('missing Spark button: ' + ${json(text)});
  node.click(); return true;
})()`);
const setSelect = async (label, value) => evaluate(`(() => {
  const node = document.querySelector('dialog.spark-dialog select[aria-label=' + JSON.stringify(${json(label)}) + ']');
  if (!node) throw new Error('missing Spark select: ' + ${json(label)});
  const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  set.call(node, ${json(value)});
  node.dispatchEvent(new Event('change', { bubbles: true }));
  return node.value;
})()`);
const hasButton = (text) => evaluate(`Boolean([...document.querySelectorAll('dialog.spark-dialog button')]
  .find((button) => button.textContent.trim() === ${json(text)}))`);
const setMode = (mode, payload = null) => evaluate(`window.__sdIndependent = ${json({ mode, payload })}`);
const openSpark = async () => {
  await evaluate("document.querySelector('dialog.spark-dialog')?.close()");
  await sleep(80);
  await evaluate("document.querySelector('#spark-button').click()");
  await waitFor("document.querySelector('dialog.spark-dialog')?.open");
};

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
await cdp("Page.navigate", { url: ORIGIN });
await waitFor("window.__V5_UI__?.state.projects?.length >= 2");
await sleep(250);

/* Only the absent BE-41 route is scripted.  Static sample routes, bootstrap,
 * projects, and the page itself are all real loopback server traffic. */
await evaluate(`(() => {
  window.__sdIndependent = { mode: 'real', payload: null };
  window.__sdIndependentEvents = [];
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes('/web/samples/spark-derivations/') && window.__sdIndependent.mode === 'slow-sample') {
      const real = await original(input, init);
      const body = await real.text();
      return { ok: real.ok, status: real.status, json: () => {
        window.__sdIndependentEvents.push('slow-sample-json');
        return new Promise((resolve) => setTimeout(() => { window.__sdIndependentEvents.push('slow-sample-resolved'); resolve(JSON.parse(body)); }, 700));
      } };
    }
    if (url.includes('/api/v5/work-derivations')) {
      const script = window.__sdIndependent;
      if (script.mode === 'payload' || script.mode === 'delay-payload')
        return new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify(script.payload), {
          status: 200, headers: { 'content-type': 'application/json' },
        })), script.mode === 'delay-payload' ? 700 : 0));
      if (script.mode === '404') return new Response('{}', { status: 404 });
      if (script.mode === '503') return new Response(JSON.stringify({ error: { message: 'Synthetic independent maintenance failure' } }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    return original(input, init);
  };
})()`);

try {
  // 1. The real backend's absent source is the only entry point to samples.
  await setMode("real");
  await openSpark();
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  record("SDI-1", await hasButton("Show sample data"), { text: (await dialogText()).slice(0, 160) });

  // 2. Entry is read-only and uses the existing Overview renderer.
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  const sampleTag = await evaluate("document.querySelectorAll('dialog.spark-dialog .spark-sample-label').length");
  const matterTag = await evaluate("document.querySelector('dialog.spark-dialog .spark-matter-open')?.tagName");
  const openBefore = await evaluate("document.querySelector('dialog.spark-dialog')?.open");
  await evaluate("document.querySelector('dialog.spark-dialog .spark-matter-open')?.click()");
  const openAfter = await evaluate("document.querySelector('dialog.spark-dialog')?.open");
  record("SDI-2", sampleTag === 1 && matterTag === "SPAN" && openBefore && openAfter, { sampleTag, matterTag, openBefore, openAfter });

  // 3. Independently load all five real static fixture routes through the UI.
  const markers = {
    quiet: "no prompt is generated",
    empty: "No Matters in this project",
    partial: "Unavailable · contract_unsupported",
    truncated: "37 stale of 50",
    stale: "2 stale of 5",
  };
  const loaded = {};
  for (const [scenario, marker] of Object.entries(markers)) {
    await setSelect("Sample scenario", scenario);
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent || '').toLowerCase().includes(${json(marker.toLowerCase())})`);
    loaded[scenario] = true;
  }
  record("SDI-3", Object.keys(loaded).length === 5, { loaded: Object.keys(loaded) });

  // 4. A valid non-empty result wins; sample and live never co-render.
  const activeProject = await evaluate("document.querySelector('dialog.spark-dialog select[aria-label=\"Spark project\"]')?.value");
  const livePayload = {
    schemaVersion: 1, asOf: new Date().toISOString(), scopeRef: `project:${activeProject}`,
    coverage: { matters: "complete", reason: null }, page: { limit: 25, offset: 0, total: 1 },
    matters: [{ matterId: "independent-live", title: "Independent live matter", extensionId: "inbound-nda", version: 1,
      sourceVersion: 2, snapshotRef: "independent-live-snapshot", availability: "observed", reason: null,
      derivations: { total: 1, current: 0, stale: 1, byStatus: [{ status: "pending", current: 0, stale: 1 }] },
      staleRefs: [{ candidateId: "independent-candidate", status: "pending", candidateSourceVersion: 1, matterSourceVersion: 2, supersedes: null }],
      staleRefsTruncated: false, sourceSetChange: null }],
  };
  await setMode("payload", livePayload);
  await clickText("Check for a source again");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Independent live matter')");
  record("SDI-4", !(await dialogText()).includes("Sample data") && !(await hasButton("Show sample data")), { text: (await dialogText()).slice(0, 180) });

  // 5. Empty live is still live, while 404 preserves an already visible sample.
  await setMode("404");
  await clickText("Refresh");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  const emptyPayload = { schemaVersion: 1, asOf: new Date().toISOString(), scopeRef: `project:${activeProject}`,
    coverage: { matters: "complete", reason: null }, page: { limit: 25, offset: 0, total: 0 }, matters: [] };
  await setMode("payload", emptyPayload);
  await clickText("Check for a source again");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No Matters in this project')");
  const emptyText = await dialogText();
  record("SDI-5", !emptyText.includes("Sample data") && !emptyText.includes("Show sample data"), { text: emptyText.slice(0, 160) });
  await setMode("404");
  await clickText("Refresh");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  await clickText("Check for a source again");
  await sleep(250);
  const preserved = await dialogText();
  record("SDI-6", preserved.includes("Sample data") && preserved.includes("Behind the current source set"), { text: preserved.slice(0, 180) });

  // 6. Any non-404 error drops sample and routes to the existing error branch.
  await setMode("503");
  await clickText("Check for a source again");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Synthetic independent maintenance failure')");
  const errorText = await dialogText();
  record("SDI-7", !errorText.includes("Sample data") && !errorText.includes("Show sample data"), { text: errorText.slice(0, 180) });

  // 7. Project switch increments the generation and discards sample before probing.
  await setMode("404");
  await clickText("Retry");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  await setSelect("Spark project", projectB.id);
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  const switched = await dialogText();
  record("SDI-8", !switched.includes("Sample data") && switched.includes("No source yet"), { text: switched.slice(0, 180) });

  // 8. Delayed old response cannot overwrite the newer project generation.
  await setSelect("Spark project", projectA.id);
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  const stalePayload = { ...livePayload, scopeRef: `project:${projectA.id}` };
  await setMode("delay-payload", stalePayload);
  await clickText("Check for a source again");
  await sleep(80);
  // The delayed response belongs to project A; make the subsequent project-B
  // read a genuine 404 so the generation fence is the only protection.
  await setMode("404");
  await setSelect("Spark project", projectB.id);
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await sleep(900);
  const raceText = await dialogText();
  record("SDI-9", raceText.includes("No source yet") && !raceText.includes("Independent live matter"), { text: raceText.slice(0, 180) });

  // 9a. Slow sample response across a project switch.  The contract requires
  // an old sample body to be ignored after its generation is invalidated.
  // This is intentionally a red test if the post-json generation check is
  // absent: loadSample currently checks `own` before, but not after, await
  // res.json() (spark-view.mjs:135-141).
  await openSpark();
  await setMode("404");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await setMode("slow-sample");
  await clickText("Show sample data");
  await waitFor("window.__sdIndependentEvents.includes('slow-sample-json')");
  await setMode("404");
  await setSelect("Spark project", projectB.id);
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await sleep(900);
  const slowSampleText = await dialogText();
  record("SDI-10", !slowSampleText.includes("Sample data") && slowSampleText.includes("No source yet"), { text: slowSampleText.slice(0, 220), events: await evaluate("window.__sdIndependentEvents"), expectedOnFailure: "post-json generation fence" });

  // 9b. Scenario selection while a live probe is pending must not consume
  // the valid live result.  This is another red test if loadSample's
  // generation invalidation cancels a live load without a shared settlement.
  await openSpark();
  await setMode("404");
  // Closing/reopening preserves the closure's sample state by design; this
  // run starts the next counterexample from the real unimplemented state.
  if ((await dialogText()).includes("Sample data")) await clickText("Hide sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  await setMode("delay-payload", livePayload);
  await clickText("Check for a source again");
  await sleep(80);
  await setSelect("Sample scenario", "quiet");
  const scenarioDisabled = await evaluate("Boolean(document.querySelector('dialog.spark-dialog select[aria-label=\"Sample scenario\"]')?.disabled)");
  if (process.env.SD_EXPECT_FIXED === "1") {
    // Fixed tree: the control is disabled while the live probe is pending,
    // so the programmatic dispatch above must not supersede the live load.
    await sleep(900);
  } else {
    await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').toLowerCase().includes('no prompt is generated')");
    await sleep(900);
  }
  const scenarioRaceText = await dialogText();
  record("SDI-11", scenarioRaceText.includes("Independent live matter") && !scenarioRaceText.includes("Sample data") && (process.env.SD_EXPECT_FIXED !== "1" || scenarioDisabled), { text: scenarioRaceText.slice(0, 220), scenarioDisabled, expectedOnFailure: "live result remains authoritative during scenario fetch" });

  // 9c. Closing while a slow sample body is pending must invalidate it too;
  // otherwise it can be resurrected on the next open because the 404 probe
  // intentionally preserves sample state.
  await setMode("404");
  await openSpark();
  if ((await dialogText()).includes("Sample data")) await clickText("Hide sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await setMode("slow-sample");
  await clickText("Show sample data");
  await waitFor("window.__sdIndependentEvents.filter((event) => event === 'slow-sample-json').length >= 2");
  await setMode("404");
  await evaluate("document.querySelector('dialog.spark-dialog')?.close()");
  await sleep(900);
  await evaluate("document.querySelector('#spark-button').click()");
  await waitFor("document.querySelector('dialog.spark-dialog')?.open");
  await sleep(250);
  const closeRaceText = await dialogText();
  record("SDI-12", !closeRaceText.includes("Sample data") && closeRaceText.includes("No source yet"), { text: closeRaceText.slice(0, 220), events: await evaluate("window.__sdIndependentEvents"), expectedOnFailure: "close generation fence" });

  // 9d. Hiding during the slow sample body must invalidate only that sample
  // read.  The old tree has no sample-generation bump here and should fail;
  // the fixed tree must remain unimplemented after the body resolves.
  await setMode("404");
  if ((await dialogText()).includes("Sample data")) await clickText("Hide sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  await setMode("slow-sample");
  // Keep the existing sample visible while the next scenario's body is slow;
  // that is the real user path on which Hide sample data is available.
  await setSelect("Sample scenario", "quiet");
  await waitFor("window.__sdIndependentEvents.filter((event) => event === 'slow-sample-json').length >= 3");
  await clickText("Hide sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await sleep(900);
  const hideSampleText = await dialogText();
  record("SDI-13", !hideSampleText.includes("Sample data") && hideSampleText.includes("No source yet"), { text: hideSampleText.slice(0, 220), events: await evaluate("window.__sdIndependentEvents"), expectedOnFailure: "hide sample body fence" });

  // 9e. Hiding during a live probe must not cancel or lose that live result.
  await setMode("404");
  if (!(await dialogText()).includes("Sample data")) await clickText("Refresh");
  else await clickText("Hide sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('No source yet')");
  await clickText("Show sample data");
  await waitFor("(document.querySelector('dialog.spark-dialog')?.textContent || '').includes('Sample data')");
  await setMode("delay-payload", livePayload);
  await clickText("Check for a source again");
  await sleep(80);
  await clickText("Hide sample data");
  await sleep(900);
  const hideLiveText = await dialogText();
  record("SDI-14", hideLiveText.includes("Independent live matter") && !hideLiveText.includes("Sample data"), { text: hideLiveText.slice(0, 220), expectedOnFailure: "hide must not cancel live probe" });

  // 10. Static allowlist is exact, byte-preserving, and GET-only.
  const appRoot = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
  const fixtureRoot = path.join(appRoot, "app/web/samples/spark-derivations");
  const staticResults = [];
  for (const name of ["stale", "quiet", "empty", "partial", "truncated"]) {
    const disk = await readFile(path.join(fixtureRoot, `${name}.json`));
    const response = await fetch(`${ORIGIN}/web/samples/spark-derivations/${name}.json`);
    const wire = Buffer.from(await response.arrayBuffer());
    staticResults.push({ name, status: response.status, type: response.headers.get("content-type"), sameBytes: wire.equals(disk), sha256: createHash("sha256").update(wire).digest("hex") });
  }
  const unknown = await fetch(`${ORIGIN}/web/samples/spark-derivations/unknown.json`);
  const traversal = await fetch(`${ORIGIN}/web/samples/spark-derivations/%2e%2e/%2e%2e/server/index.mjs`);
  const method = await fetch(`${ORIGIN}/web/samples/spark-derivations/stale.json`, { method: "POST" });
  const staticPass = staticResults.every((r) => r.status === 200 && /^application\/json; charset=utf-8/.test(r.type ?? "") && r.sameBytes)
    && unknown.status === 404 && traversal.status === 404 && method.status === 404;
  record("SDI-15", staticPass, { staticResults, unknown: unknown.status, traversal: traversal.status, post: method.status });

  const result = { base: ORIGIN, fixedSha: process.env.SD_EXPECTED_SHA || "6b6257937e2dff0bcf46f9a31f40184ee95c57b3", projects: { a: projectA.id, b: projectB.id }, checks, pass: checks.every((check) => check.pass) };
  await writeFile(process.env.SD_INDEPENDENT_OUTPUT || new URL("./checks.json", import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await close();
}
