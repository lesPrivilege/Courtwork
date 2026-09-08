/* WO-WK13 · the startups FE-T01 and FE-T12 name, each against a server holding
 * only that state: a Home with no project and no session, a session with no
 * extension binding, and a page whose set is truncated by the server itself. */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";
const STAGE = process.env.WK13_STAGE ?? "empty";
const results = [];
const check = (name, pass, actual) => {
  results.push({ stage: STAGE, name, pass, actual });
  console.log(pass ? "PASS" : "FAIL", name);
};
const S = "window.__V5_UI__.state";
const shot = async (name) =>
  writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
  await cdp("Page.navigate", { url: ORIGIN });
  await waitFor(`window.__V5_UI__?.state.home.data`);
  await sleep(600);

  if (STAGE === "empty") {
    const view = await ev(`(()=>({
      tiles:[...document.querySelectorAll('.home-stat')].map(n=>n.querySelector('.stat-value').textContent),
      sections:[...document.querySelectorAll('.home-section h3')].map(n=>n.textContent),
      help:[...document.querySelectorAll('.home-view .form-help')].map(n=>n.textContent),
      notice:document.querySelector('.inline-notice')!==null,
      empty:document.getElementById('app-shell').classList.contains('home-empty'),
      planned:document.querySelector('.home-planned')?.textContent||null,
      matter:/matter/i.test(document.getElementById('conversation-body').innerText),
      composer:!document.getElementById('composer-area').hidden,
      status:document.getElementById('home-start-status')?.textContent||null,
    }))()`);
    check("FE-T01 · no data · the counts are a confirmed 0 and no failure is claimed",
      view.tiles.join("/") === "0/0/0" && !view.notice, view);
    check("FE-T01 · no data · one condition sentence, and plain exploration is still usable",
      view.sections.length === 1 && view.sections[0] === "In progress" &&
        view.help.includes("Your sessions will appear here.") && view.composer, view);
    check("FE-T01 · nothing on an unbound Home is called a Matter", view.matter === false, view.status);
    check("the planned day reading stands in the empty state too", /Backend pending/.test(view.planned || ""), view.planned);
    await shot("home-empty-1440-light");
  }

  if (STAGE === "rows") {
    /* A session with no extension binding: the plain reading must work, and the
     * absence must not be worded as an empty domain object (FN-04 / FN-06). */
    await ev(`document.querySelector('.home-row').click()`);
    await waitFor(`${S}.view === 'session'`);
    await sleep(800);
    const session = await ev(`(()=>({
      binding:${S}.session?.extensionBinding ?? null,
      matter:/matter/i.test(document.getElementById('conversation-body').innerText),
      composer:!document.getElementById('composer-input').disabled,
      band:document.getElementById('home-top-band').hidden,
    }))()`);
    check("FE-T01 · no binding · the session reads and writes without one, and is not called an empty Matter",
      session.binding === null && session.matter === false && session.composer, session);
    check("the totals band belongs to Home only", session.band === true, session.band);
    await shot("session-unbound-1440-light");
  }

  if (STAGE === "truncate") {
    const page = await ev(`(()=>{
      const section=[...document.querySelectorAll('.home-section')].find(s=>s.querySelector('h3').textContent==='In progress');
      return {
        total:section.querySelector('.count-badge').textContent,
        rows:section.querySelectorAll('.home-row').length,
        notes:[...section.querySelectorAll('.form-help')].map(n=>n.textContent),
        more:[...section.querySelectorAll('.text-button')].map(n=>n.textContent),
        tile:document.querySelector('.home-stat[data-set="sessionCandidates"] .stat-value').textContent,
        closed:/that is all|that's all|no more/i.test(section.innerText),
      };
    })()`);
    check("FE-T12 · a truncated page says how much is not shown and never says the list is complete",
      Number(page.total) > page.rows && page.notes.some((n) => /Some items are outside this page/.test(n)) && page.more.includes("Load more") && !page.closed,
      page);
    check("FE-T12 · the tile states the server's total, not the page length",
      page.tile === page.total && Number(page.tile) > page.rows, { tile: page.tile, rows: page.rows });
    await shot("home-truncated-1440-light");
  }
} catch (error) {
  results.push({ stage: STAGE, name: "exception", pass: false, actual: error.stack });
  process.exitCode = 1;
} finally {
  await writeFile(new URL(`./home-states-${STAGE}.json`, import.meta.url), JSON.stringify(results, null, 2));
  await close();
}
const failed = results.filter((r) => !r.pass);
console.error(failed.length ? `FAIL ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`);
if (failed.length) process.exitCode = 1;
