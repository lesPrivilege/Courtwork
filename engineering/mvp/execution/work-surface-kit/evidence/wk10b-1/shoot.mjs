/* WO-WK10b 第一段 · same-condition screenshots of the four states this round
 * changed: the Chat Flow rows, the mounted contributed surface, the declared
 * slot whose renderer is not loaded, and the unloaded producer. Two widths,
 * two schemes, plus 200 % zoom and reduced motion.
 *
 *   WK10B_BASE=http://127.0.0.1:8873 WK10B_CDP_PORT=19655 WK10B_TAG=after \
 *     node engineering/mvp/execution/work-surface-kit/evidence/wk10b-1/shoot.mjs
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, viewport } from "./harness.mjs";
import { writeFile } from "node:fs/promises";

const TAG = process.env.WK10B_TAG ? `-${process.env.WK10B_TAG}` : "";
const OUT = new URL("./", import.meta.url).pathname;
const state = "window.__V5_UI__.state";
async function shoot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`${OUT}${name}${TAG}.png`, Buffer.from(data, "base64"));
  console.log("shot", `${name}${TAG}.png`);
}
const openSession = (title) =>
  ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 500));
    const button = [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes(${JSON.stringify(title)}));
    button?.click();
    await new Promise(r => setTimeout(r, 2200));
  })()`);
const openPane = () =>
  ev(`(async () => {
    if (!${state}.surface.open) document.getElementById('show-surface-button').click();
    await new Promise(r => setTimeout(r, 700));
    document.getElementById('surface-preview-tab').click();
    await new Promise(r => setTimeout(r, 1800));
  })()`);

try {
  for (const [scheme, features] of [
    ["light", []],
    ["dark", [{ name: "prefers-color-scheme", value: "dark" }]],
  ]) {
    for (const [label, width, height] of [
      ["1440", 1440, 900],
      ["390", 390, 844],
    ]) {
      await cdp("Emulation.setEmulatedMedia", { features });
      await viewport(width, height, width < 768);
      await cdp("Page.navigate", { url: `${ORIGIN}/` });
      await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
      await openSession("Runtime control");
      await ev(`document.querySelectorAll('.activity-group').forEach(g => g.open = true)`);
      await sleep(700);
      /* The head of the thread carries the answered question and the two
       * decided write requests; the foot carries the failed tool row. */
      await ev(`document.getElementById('message-stream').scrollTop = 0`);
      await sleep(400);
      await shoot(`flow-head-${label}-${scheme}`);
      await ev(`document.getElementById('message-stream').scrollTop = document.getElementById('message-stream').scrollHeight`);
      await sleep(400);
      await shoot(`flow-${label}-${scheme}`);
      await openSession("NDA review");
      await openPane();
      await shoot(`slot-renderer-absent-${label}-${scheme}`);
    }
  }

  /* The mounted contributed surface, and the same session with its producer
   * unloaded — the two states the read-only row exists to tell apart. */
  await cdp("Emulation.setEmulatedMedia", { features: [] });
  await viewport(1440, 900);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
  await openSession("Memo review");
  await openPane();
  await shoot("slot-mounted-1440-light");
  await ev(`(async () => {
    await fetch('/api/v5/extensions/evidence-memo/lifecycle', {
      method: 'POST',
      headers: { 'x-work-token': ${state}.token, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'unload' }),
    });
  })()`);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
  await openSession("Memo review");
  await openPane();
  await shoot("slot-producer-unloaded-1440-light");
  await ev(`(async () => {
    await fetch('/api/v5/extensions/evidence-memo/lifecycle', {
      method: 'POST',
      headers: { 'x-work-token': ${state}.token, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'load' }),
    });
  })()`);

  /* 200 % zoom: the browser's own page zoom, at the emulated CSS width the
   * zoom leaves behind (1440 physical / 2). */
  await viewport(720, 450);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
  await openSession("Runtime control");
  await ev(`document.querySelectorAll('.activity-group').forEach(g => g.open = true)`);
  await sleep(700);
  const zoom = await ev(`({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows: document.querySelectorAll('#message-stream .flow-row').length,
  })`);
  console.log("200% zoom:", JSON.stringify(zoom));
  await shoot("flow-200pct-light");

  /* Reduced motion: nothing left running. */
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await viewport(1440, 900);
  await cdp("Page.navigate", { url: `${ORIGIN}/` });
  await waitFor(`window.__V5_UI__?.state.projects.length > 0`);
  await openSession("Runtime control");
  await sleep(1200);
  const motion = await ev(`(() => ({
    running: [...document.querySelectorAll('*')].filter(n => n.getAnimations && n.getAnimations().some(a => a.playState === 'running')).map(n => n.id || String(n.className)),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }))()`);
  console.log("reduced motion:", JSON.stringify(motion));
  await shoot("flow-1440-reduced-motion");
  await writeFile(new URL(`./viewport${TAG}.json`, import.meta.url), JSON.stringify({ zoom, motion }, null, 2));
} finally {
  await sleep(300);
  await close();
}
