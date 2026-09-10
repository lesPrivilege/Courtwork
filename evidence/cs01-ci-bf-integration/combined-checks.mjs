/* CS-01 × CI-B/F integration · combined composer checks over raw CDP (the same
 * no-dependency approach as work-surface-kit/evidence/wk11/shots.mjs).
 *
 *   node app/server/index.mjs --port 8934 --data-dir <seeded dir>   # one project, chats "Clause 14 indemnity" + "Rent review"
 *   node evidence/cs01-ci-bf-integration/combined-checks.mjs
 *
 * Writes checks.json next to this file. Two hosts are simulated in headless
 * Chrome, which renders frames (so ResizeObservers fire, unlike a hidden pane):
 *   native   — the engine's own `field-sizing`;
 *   fallback — `CSS.supports('field-sizing', …)` answers false before the app
 *              loads and the property is forced off, so the app installs its own
 *              composer-field.mjs sizer and must refit on every variant switch.
 * Text is entered with Input.insertText (real input events). */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP = Number(process.env.CI_CDP_PORT || 19734);
const APP = process.env.APP_URL || "http://127.0.0.1:8934/";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LONG = "Carve-out wording to review in detail. ".repeat(40);

const FALLBACK_HOST = `(() => {
  const supports = CSS.supports.bind(CSS);
  CSS.supports = (a, b) => (String(a).includes("field-sizing") ? false : b === undefined ? supports(a) : supports(a, b));
  document.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = "#composer-input { field-sizing: fixed !important; }";
    document.head.append(s);
  });
})();`;

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${CDP}`, "--user-data-dir=/private/tmp/se-cs01-integration-chrome", "--no-first-run", "--hide-scrollbars", "about:blank"]);
chrome.stderr.on("data", () => {});

async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const t = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: "PUT" })).json();
      if (t.webSocketDebuggerUrl) return t;
    } catch { await sleep(250); }
  }
  throw new Error("chrome did not start");
}
function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  });
  return { ready, send: (method, params = {}) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, { resolve, reject }); ws.send(JSON.stringify({ id: n, method, params })); }), close: () => ws.close() };
}

const results = [];
const record = (id, pass, data) => { results.push({ id, pass, ...data }); console.log(pass ? "PASS" : "FAIL", id, JSON.stringify(data)); };

async function session(host, { width = 1280, height = 800, textSize = "medium" } = {}) {
  const cdp = connect((await target()).webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  if (host === "fallback") await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: FALLBACK_HOST });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const evaluate = async (expression) => {
    const r = await cdp.send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result.value;
  };
  await cdp.send("Page.navigate", { url: APP });
  for (let i = 0; i < 80 && !(await evaluate("return !!document.querySelector('.sidebar') && document.readyState === 'complete'").catch(() => false)); i++) await sleep(150);
  await sleep(600);
  // Device preferences live in this profile's storage: set them through the UI.
  await evaluate(`location.hash = '#settings/appearance'; await new Promise(r => setTimeout(r, 400));
    document.querySelector('input[name=settings-text-size][value=${textSize}]')?.click();
    document.querySelector('input[name=settings-home-layout][value=simple]')?.click();
    location.hash = ''; await new Promise(r => setTimeout(r, 400)); return true;`);
  const go = (name) => evaluate(`[...document.querySelectorAll('button, a, li, [role=button]')].find(n => n.textContent.trim() === ${JSON.stringify(name)})?.click(); await new Promise(r => setTimeout(r, 500)); return document.getElementById('session-title-text').textContent;`);
  const clear = () => evaluate(`const ta = document.getElementById('composer-input'); ta.focus(); ta.select(); document.execCommand('delete'); await new Promise(r => setTimeout(r, 300)); return true;`);
  const type = async (text) => { await evaluate(`document.getElementById('composer-input').focus(); return true;`); await cdp.send("Input.insertText", { text }); await sleep(350); };
  const measure = () => evaluate(`const ta = document.getElementById('composer-input'); const f = document.getElementById('composer-form').getBoundingClientRect(); const b = document.getElementById('conversation-body').getBoundingClientRect(); const cs = getComputedStyle(ta);
    return { view: document.getElementById('session-title-text').textContent, ta: +ta.getBoundingClientRect().height.toFixed(1), minH: +parseFloat(cs.minHeight).toFixed(1), maxH: cs.maxHeight, fieldSizing: cs.fieldSizing, inlineHeight: ta.style.height || null, scrolls: ta.scrollHeight > ta.clientHeight, formTop: Math.round(f.top), centre: +((f.top + f.height / 2 - b.top) / b.height).toFixed(3) };`);
  return { cdp, evaluate, go, clear, type, measure };
}

for (const host of ["native", "fallback"]) {
  const s = await session(host);
  await s.go("Home"); await s.clear();
  const homeEmpty = await s.measure();
  record(`${host}/home-empty-anchor`, homeEmpty.ta === 96 && homeEmpty.centre >= 0.55, homeEmpty);
  await s.type(LONG);
  const homeCapped = await s.measure();
  record(`${host}/home-cap-160-top-fixed`, homeCapped.ta === 160 && homeCapped.scrolls && homeCapped.formTop === homeEmpty.formTop, homeCapped);
  // Variant switch with a capped Home draft: the chat field must start at its own minimum.
  await s.go("Clause 14 indemnity"); await s.clear();
  const chatEmpty = await s.measure();
  record(`${host}/chat-empty-two-lines-after-home`, Math.abs(chatEmpty.ta - chatEmpty.minH) < 1, chatEmpty);
  // Five-plus lines in the 648 column: two lines would still sit on the two-line minimum.
  await s.type("Compare clause 14 against our standard indemnity position and list every carve-out that shifts risk to the tenant. Say which ones conflict with the insurance schedule in annex C and propose replacement wording for each conflict, keeping the landlord negligence carve-out but capping it at the insured amount. Also flag anything that survives termination or assignment, and note whether the indemnity is expressed to be a continuing obligation after the tenant has vacated.");
  const chatGrown = await s.measure();
  record(`${host}/chat-grows`, chatGrown.ta > chatEmpty.ta && chatGrown.ta < 180, chatGrown);
  await s.type(LONG);
  const chatCapped = await s.measure();
  record(`${host}/chat-cap-180`, chatCapped.ta === 180 && chatCapped.scrolls, chatCapped);
  await s.clear();
  // Back to Home: its draft is restored by renderComposer, which must refit it.
  await s.go("Home");
  const homeRestored = await s.measure();
  record(`${host}/home-draft-restored-refit`, homeRestored.ta === 160 && homeRestored.formTop === homeEmpty.formTop, homeRestored);
  await s.clear();
  s.cdp.close();
}

// Large text in a rendering browser: the Home anchor must re-measure by itself.
{
  const s = await session("native", { textSize: "large" });
  await s.go("Home"); await s.clear(); await sleep(400);
  const homeLarge = await s.measure();
  record("large-text/home-anchor", homeLarge.centre >= 0.55, homeLarge);
  await s.go("Clause 14 indemnity"); await s.clear();
  const chatLarge = await s.measure();
  record("large-text/chat-two-lines-scale", Math.abs(chatLarge.ta - chatLarge.minH) < 1 && chatLarge.minH > 54.2, chatLarge);
  await s.type(LONG);
  const chatLargeCapped = await s.measure();
  record("large-text/chat-cap-180", chatLargeCapped.ta === 180 && chatLargeCapped.scrolls, chatLargeCapped);
  await s.clear();
  await s.evaluate(`location.hash = '#settings/appearance'; await new Promise(r => setTimeout(r, 400)); document.querySelector('input[name=settings-text-size][value=medium]')?.click(); location.hash = ''; return true;`);
  s.cdp.close();
}

await writeFile(path.join(HERE, "checks.json"), JSON.stringify({ app: APP, capturedWith: "headless Chrome via CDP, 1280×800, Home layout Simple", results }, null, 2) + "\n");
chrome.kill();
const failed = results.filter((r) => !r.pass).length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
