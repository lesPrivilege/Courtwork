/* Evidence harness only. CE-R1: open Work location while a plain Home Send is
 * still in flight, at each point gate-proxy.mjs holds, and record what the
 * panel lets the person do. Every enabled location mutation is then pressed,
 * so a race is shown by its effect at the Host, not only by a control's state.
 *   node race.mjs --url http://127.0.0.1:8953 --gate http://127.0.0.1:8953 --out <dir> --folder <abs> --profile <dir> */
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { launch } from "./cdp.mjs";

const { values } = parseArgs({ options: { url: { type: "string" }, gate: { type: "string" }, out: { type: "string" }, folder: { type: "string" }, profile: { type: "string" }, mode: { type: "string", default: "race" } } });
const out = (name) => path.join(values.out, name);
const page = await launch({ port: 9334, profileRoot: values.profile });
const log = { steps: [] };
const gateState = async () => (await fetch(`${values.gate}/__gate`)).json();
const release = (name) => fetch(`${values.gate}/__gate/release/${name}`, { method: "POST" });
async function until(pred, label, ms = 15000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await pred()) return; await page.wait(100); }
  throw new Error(`timed out waiting for ${label}`);
}
const MUTATIONS = ["open", "path-summary", "connect", "remove", "recent", "change-folder", "disconnect", "start-edits", "stop-edits", "project-new"];
const panelControls = () => page.eval(`
  const p = document.querySelector('#workspace-popover');
  if (!p.matches(':popover-open')) return null;
  return {
    busyText: [...p.querySelectorAll('.context-meta')].map(n => n.textContent.trim()).filter(t => /cannot change|being started|being sent|not known yet|Preparing/.test(t)),
    controls: [...p.querySelectorAll('[data-repository-field]')].map(n => ({ field: n.getAttribute('data-repository-field'), text: (n.textContent || '').trim().slice(0, 40), disabled: !!n.disabled })),
  };`);
const openPanel = async () => {
  await page.eval(`const p = document.querySelector('#workspace-popover'); if (p.matches(':popover-open')) p.hidePopover(); return true;`);
  await page.eval(`document.querySelector('#workspace-chip').click(); return true;`);
  await page.wait(500);
};
/* Press every enabled mutating control once. A control that opens a chooser
 * (open/path) is pressed but the folder dialog path is not followed. */
const pressEnabled = () => page.eval(`
  const p = document.querySelector('#workspace-popover'); const pressed = [];
  const skip = new Set(['path', 'roles-summary', 'review']);
  for (const n of [...p.querySelectorAll('[data-repository-field]')]) {
    const f = n.getAttribute('data-repository-field');
    if (skip.has(f) || n.disabled) continue;
    if (!${JSON.stringify(MUTATIONS)}.includes(f) && !f.startsWith('project:')) continue;
    pressed.push(f);
    if (f === 'open') continue; // opens the Host's native dialog; its availability is the finding
    n.click();
  }
  return pressed;`);

async function checkpoint(name) {
  await openPanel();
  const state = await panelControls();
  await page.shot(out(`race-${name}.png`));
  const pressed = await pressEnabled();
  await page.wait(800);
  const after = await page.eval(`return { homeRepositoryPath: window.__V5_UI__?.state?.homeRepositoryPath ?? null, homeProjectId: window.__V5_UI__?.state?.homeProjectId ?? null };`).catch(() => null);
  log.steps.push({ name, gate: await gateState(), ...state, pressedEnabled: pressed, after });
}

/* Recovery: a Send whose bind the Host refuses has ended, so it holds nothing.
 * The panel must be usable again on the same chat, and a second Send must go
 * into that chat with the corrected folder. No gate is held in this mode. */
async function recovery() {
  const refused = values.folder + "-does-not-exist";
  const releaseLoop = setInterval(async () => { try { const g = await gateState(); for (const k of Object.keys(g)) if (g[k].waiting) await release(k); } catch {} }, 100);
  try {
    await page.viewport({ width: 1440, height: 900 });
    await page.goto(values.url);
    await page.eval(`localStorage.clear(); sessionStorage.clear(); return true;`);
    await page.goto(values.url);
    await openPanel();
    await page.eval(`document.querySelector('[data-repository-field="path-summary"]').click(); return true;`); await page.wait(200);
    await page.eval(`const i = document.querySelector('[data-repository-field="path"]'); i.value = ${JSON.stringify(refused)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-repository-field="connect"]').click(); return true;`);
    await page.wait(600);
    await page.eval(`document.querySelector('#workspace-popover').hidePopover(); const t = document.querySelector('#composer-input'); t.focus(); t.value = 'Recovery probe.'; t.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#send-button').click(); return true;`);
    await until(() => page.eval(`const s = document.querySelector('#home-start-status'); return !s.hidden && /Could not start/.test(s.textContent);`), "the refusal is reported");
    log.refusal = await page.eval(`return document.querySelector('#home-start-status').textContent.trim();`);
    await openPanel();
    const state = await panelControls();
    await page.shot(out("recovery-1-after-refusal.png"));
    log.steps.push({ name: "1-after-refusal", ...state });
    await page.eval(`const s = document.querySelector('[data-repository-field="path-summary"]'); if (s && !s.closest('details').open) s.click(); return true;`); await page.wait(200);
    await page.eval(`const i = document.querySelector('[data-repository-field="path"]'); i.value = ${JSON.stringify(values.folder)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-repository-field="connect"]').click(); return true;`);
    await page.wait(1500);
    log.steps.push({ name: "2-after-correction", ...(await panelControls()) });
    await page.shot(out("recovery-2-corrected.png"));
    await page.eval(`document.querySelector('#workspace-popover').hidePopover(); document.querySelector('#send-button').click(); return true;`);
    await page.wait(4000);
    log.final = await page.eval(`
      const ui = window.__V5_UI__, id = ui.state.activeSessionId;
      const detail = id ? await ui.request('/sessions/' + encodeURIComponent(id)) : null;
      const s = detail?.session;
      return { view: document.body.className.match(/home-active/) ? 'home' : 'chat',
        host: s ? { bindingStatus: s.repositoryBinding?.status ?? null, bindingRevision: s.repositoryBindingRevision, rootPath: s.repositoryBinding?.rootPath ?? null, runs: (detail.runs || []).map(r => r.status) } : null };`);
  } finally { clearInterval(releaseLoop); }
}

try {
  if (values.mode === "recovery") { await recovery(); throw null; }
  await page.viewport({ width: 1440, height: 900 });
  await page.goto(values.url);
  await page.eval(`localStorage.clear(); sessionStorage.clear(); return true;`);
  await page.goto(values.url);
  // Stage a folder through the panel's path field.
  await openPanel();
  await page.eval(`document.querySelector('[data-repository-field="path-summary"]').click(); return true;`); await page.wait(200);
  await page.eval(`const i = document.querySelector('[data-repository-field="path"]'); i.value = ${JSON.stringify(values.folder)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-repository-field="connect"]').click(); return true;`);
  await page.wait(800);
  await page.eval(`document.querySelector('#workspace-popover').hidePopover(); return true;`);
  // Plain Send.
  await page.eval(`const t = document.querySelector('#composer-input'); t.focus(); t.value = 'Race probe: summarise the README.'; t.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#send-button').click(); return true;`);

  await until(async () => (await gateState()).bind.waiting, "bind held");
  await checkpoint("1-after-create-before-bind");
  await release("bind");
  await until(async () => (await gateState()).draft.waiting, "draft held");
  await checkpoint("2-bound-before-admission");
  await release("draft");
  await until(async () => (await gateState()).run.waiting, "run held", 20000);
  await checkpoint("3-run-admission-in-flight");
  await release("run");
  await page.wait(4000);
  log.final = await page.eval(`
    const ui = window.__V5_UI__, id = ui.state.activeSessionId;
    const detail = id ? await ui.request('/sessions/' + encodeURIComponent(id)) : null;
    const s = detail?.session;
    return { view: document.body.className.match(/home-active/) ? 'home' : 'chat', stripHidden: document.querySelector('#composer-context-strip').hidden,
      host: s ? { bindingStatus: s.repositoryBinding?.status ?? null, bindingRevision: s.repositoryBindingRevision, rootPath: s.repositoryBinding?.rootPath ?? null,
        candidateRevision: s.repositoryCandidateRevision, candidate: s.repositoryCandidate?.status ?? null, runs: (detail.runs || []).map(r => r.status) } : null };`);
  await page.shot(out("race-4-after-release.png"));
} catch (error) {
  if (error !== null) log.error = String(error.stack || error);
} finally {
  await writeFile(out(values.mode === "recovery" ? "recovery.json" : "race.json"), JSON.stringify(log, null, 2));
  await page.close();
}
