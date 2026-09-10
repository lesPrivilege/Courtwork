/* Independent PV-FE02 browser review.  Run only against loopback local-fake.
 * This script deliberately lives outside evidence/pv-fe02 so the author's
 * receipt and screenshots remain untouched.  It uses real DOM/Input/CDP
 * events in headless Chromium; it is not a Computer-Use acceptance record.
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, verifyRequestCount } from "../pv-fe02/browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass: Boolean(pass), ...detail });
const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
const api = async (path, init = {}) => {
  const response = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
};
const open = async (section = "models", { width = 1440, height = 900, reducedMotion = "reduce", color = "light" } = {}) => {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-color-scheme", value: color },
    { name: "prefers-reduced-motion", value: reducedMotion },
  ] });
  await cdp("Page.navigate", { url: `${ORIGIN}/?pvfe02ind=${Date.now()}#settings/${section}` });
  await waitFor("window.__V5_UI__?.state.home.data");
  await waitFor(`document.getElementById("settings-${section}")?.getClientRects().length > 0`);
  await sleep(800);
};
const shot = async (name) => writeFile(new URL(`./${name}.png`, import.meta.url), Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));
const helpers = `
  const panel = () => document.getElementById("settings-models");
  const rows = () => [...panel().querySelectorAll(".connection-row")].map((row) => row.textContent);
  const byText = (selector, text) => [...panel().querySelectorAll(selector)].find((n) => n.textContent.trim() === text);
  const setValue = (node, value) => { const proto = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, "value").set.call(node, value); node.dispatchEvent(new Event("input", { bubbles: true })); node.dispatchEvent(new Event("change", { bubbles: true })); };
  const providerSelect = () => panel().querySelector('select[name="provider"]');
  const modelSelect = () => panel().querySelector('select[name="model"]');
  const pathRadio = (id) => panel().querySelector('#connection-path-' + id);
  const probeText = () => panel().querySelector('.connection-probe-result')?.textContent ?? '';
  const probeHidden = () => panel().querySelector('.connection-probe-result')?.hidden ?? true;
  const probeIsFailed = () => panel().querySelector('.connection-probe-result')?.classList.contains('is-failed') ?? false;
  const smokeStatus = () => panel().querySelector('.connection-step-status')?.textContent ?? '';
`;
const run = (body) => ev(`(async () => { ${helpers}\n${body} })()`);

// Success, then the separate Save-only action must not POST verify.
await open("models");
await run(`pathRadio('local').click(); byText('.credential-actions button', 'Save and ask once').click();`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.textContent.startsWith('Answered in')`, 20000);
await sleep(350);
const success = await run(`return { status: probeText(), failed: probeIsFailed(), smoke: smokeStatus(), rows: rows() };`);
record("ind-PVFE2-1", /^Answered in (\d+ ms|[\d.]+ s) · /.test(success.status) && !success.failed && success.smoke === " · Answered" && success.rows.some((t) => t.includes("Answered") && t.includes("fake-model")), success);
await shot("independent-1440-light-success");
const beforeSaveOnly = verifyRequestCount();
await run(`byText('.credential-actions button', 'Save only').click();`);
await sleep(900);
const saveOnly = await run(`return { status: probeText(), hidden: probeHidden() };`);
record("ind-PVFE2-2", verifyRequestCount() === beforeSaveOnly && (saveOnly.hidden || saveOnly.status === ''), { beforeSaveOnly, after: verifyRequestCount(), ...saveOnly });

// Installed custom entry: catalog/local fake connection admits an extra model.
await ev(`document.getElementById("model-settings-button").click()`);
await sleep(300);
await ev(`[...document.getElementById("connection-popover").querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").startsWith("Choose model")).click()`);
await waitFor(`document.querySelector(".model-picker-dialog select")?.options.length > 0`);
await ev(`document.querySelector(".model-picker-custom-toggle").click()`);
await sleep(150);
await ev(`(() => { const d=document.querySelector('.model-picker-dialog'); const i=d.querySelector('.model-picker-custom input[type=text]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'unknown-ghost'); i.dispatchEvent(new Event('input',{bubbles:true})); const s=d.querySelector('.model-picker-custom select'); const local=[...s.options].find(o=>o.textContent==='Local test'); if(local){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,local.value);s.dispatchEvent(new Event('change',{bubbles:true}));} })()`);
const customOpen = await ev(`!document.querySelector('.model-picker-custom').hidden`);
const beforeCustom = verifyRequestCount();
await ev(`[...document.querySelectorAll('.model-picker-custom button')].find((b) => b.textContent === 'Use without asking').click()`);
await waitFor(`document.querySelector('.model-picker-custom .connection-probe-result')?.textContent.includes('Saved and selected')`, 15000);
const custom = await ev(`(() => { const d=document.querySelector('.model-picker-dialog'); return { status:d.querySelector('.model-picker-custom .connection-probe-result').textContent, closed:!d.open, model:document.querySelector('#settings-models select[name=model]')?.value }; })()`);
record("ind-PVFE2-3", customOpen && custom.status.includes("Saved and selected") && custom.closed === false && verifyRequestCount() === beforeCustom, { customOpen, beforeCustom, after: verifyRequestCount(), ...custom });
await ev(`document.querySelector('.model-picker-dialog').close()`);

// Failure receipt and explicit Ask again.
await open("models");
const selected = await run(`return { model:modelSelect().value, path:pathRadio('local').checked };`);
await run(`byText('.credential-actions button', 'Save and ask once').click();`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.classList.contains('is-failed')`, 20000);
await sleep(350);
const failure = await run(`return { status:probeText(), failed:probeIsFailed(), rows:rows() };`);
record("ind-PVFE2-4", selected.model === "unknown-ghost" && failure.failed && failure.status.startsWith("The provider returned HTTP 404") && failure.status.includes("does not exist") && failure.rows.some((t) => t.includes("Last ask failed")), { selected, ...failure });
await shot("independent-1440-light-failure");
const beforeAgain = verifyRequestCount();
await run(`byText('.connection-add button', 'Ask again').click();`);
await waitFor(`document.querySelector('#settings-models .connection-probe-result')?.classList.contains('is-failed')`, 20000);
await sleep(250);
record("ind-PVFE2-5", verifyRequestCount() > beforeAgain, { beforeAgain, after: verifyRequestCount() });

// Visual/accessibility surfaces not covered by author's light-wide run.
await open("models", { width:390, height:844, color:"dark", reducedMotion:"reduce" });
const narrowDark = await run(`return { bodyWidth:document.body.scrollWidth, viewport:innerWidth, bg:getComputedStyle(document.body).backgroundColor, pathLabel:panel().querySelector('.connection-paths')?.getAttribute('aria-label'), labels:[...panel().querySelectorAll('label')].filter(n=>n.textContent.includes('Provider')||n.textContent.includes('Model')).length };`);
record("ind-PVFE2-6", narrowDark.viewport === 390 && narrowDark.bodyWidth <= 390 && narrowDark.bg !== "rgb(255, 255, 255)" && narrowDark.pathLabel === "How this connection reaches a model" && narrowDark.labels >= 2, narrowDark);
await shot("independent-390-dark");
const a11y = await run(`return { statusRole:panel().querySelector('.connection-probe-result')?.getAttribute('role'), pickerLabel:document.getElementById('model-settings-button')?.getAttribute('aria-label'), focusableWithoutName:[...panel().querySelectorAll('button,input,select')].filter(n=>!n.disabled && !(n.getAttribute('aria-label')||n.textContent||n.labels?.[0]?.textContent||'').trim()).length };`);
record("ind-PVFE2-7", a11y.statusRole === "status" && a11y.pickerLabel && a11y.focusableWithoutName === 0, a11y);

// Compatible custom-model scope: unlike catalog extras, the backend requires
// a discover-listed ID.  The synthetic directory (COMPAT_ENDPOINT) reports
// only fake-model; attempting unknown-ghost through the actual picker must
// expose the structured connection_model_not_in_directory refusal.
const compatCreated = await api("/provider-connections", { method: "POST", body: JSON.stringify({
  api: "openai-completions",
  baseUrl: process.env.COMPAT_ENDPOINT,
  apiKey: "fixture-independent-key",
  models: [{ id: "fake-model" }],
}) });
await open("models");
await ev(`document.getElementById("model-settings-button").click()`);
await sleep(300);
await ev(`[...document.getElementById("connection-popover").querySelectorAll("button")].find((b) => (b.getAttribute("aria-label") || "").startsWith("Choose model")).click()`);
await waitFor(`document.querySelector(".model-picker-dialog select")?.options.length > 0`);
await ev(`document.querySelector(".model-picker-custom-toggle").click()`);
await sleep(120);
await ev(`(() => { const d=document.querySelector('.model-picker-dialog'); const i=d.querySelector('.model-picker-custom input[type=text]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'unknown-ghost'); i.dispatchEvent(new Event('input',{bubbles:true})); const s=d.querySelector('.model-picker-custom select'); const option=[...s.options].find(o=>o.textContent.includes('127.0.0.1')); if(option){Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,option.value);s.dispatchEvent(new Event('change',{bubbles:true}));} })()`);
const compatPick = await ev(`(() => { const d=document.querySelector('.model-picker-dialog'); return { options:[...d.querySelector('.model-picker-custom select').options].map(o=>o.textContent), chosen:d.querySelector('.model-picker-custom select').selectedOptions[0]?.textContent || '' }; })()`);
await ev(`[...document.querySelectorAll('.model-picker-custom button')].find((b) => b.textContent === 'Use without asking').click()`);
await waitFor(`document.querySelector('.model-picker-custom .connection-probe-result')?.classList.contains('is-failed')`, 15000);
const compatFailure = await ev(`document.querySelector('.model-picker-custom .connection-probe-result')?.textContent || ''`);
record("ind-PVFE2-8", compatCreated.status === 200 && compatPick.chosen.includes("127.0.0.1") && compatFailure.includes("does not list every selected model"), { compatCreated, compatPick, compatFailure });
await ev(`document.querySelector('.model-picker-dialog').close()`);

await writeFile(new URL("./independent-results.json", import.meta.url), JSON.stringify({ origin:ORIGIN, results }, null, 2));
for (const entry of results) console.log(entry.pass ? "PASS" : "FAIL", entry.id, JSON.stringify(entry));
console.log("failures:", results.filter((r) => !r.pass).map((r) => r.id));
await close();
