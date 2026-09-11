// Evidence capture + directed browser checks for return-v1.
// Needs the static server (tools/serve.mjs) and a local Playwright install;
// Playwright is an author tool here, not a dependency of the specimen.
//   PLAYWRIGHT_MODULE="$(npm root -g)/playwright/index.mjs" \
//   node engineering/design/agent-presence-2026-09-11/return-v1/tools/capture.mjs [--port 8893]
// Writes evidence/*.png and evidence/results.json. Candidate images only —
// nothing here is a golden baseline.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { svgMarkup, REST, sample } from "../src/geometry.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const portArg = process.argv.indexOf("--port");
const port = Number(portArg > -1 ? process.argv[portArg + 1] : 8893);
const base = `http://127.0.0.1:${port}/engineering/design/agent-presence-2026-09-11/return-v1/`;
const out = fileURLToPath(new URL("../evidence/", import.meta.url));
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const results = [];
const shots = [];
const record = (id, pass, detail) => results.push({ id, pass, detail });

async function page({ width = 1440, height = 900, scheme = "light", dpr = 1, reducedMotion = "no-preference", forcedColors = "none" } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, colorScheme: scheme, reducedMotion, forcedColors });
  const p = await context.newPage();
  p.on("pageerror", (e) => record("page-error", false, String(e)));
  return p;
}
async function openScene(p, query) {
  await p.goto(`${base}chat.html?${query}`);
  await p.waitForSelector("html[data-ready='true']");
  await p.evaluate(() => document.fonts.ready);
}
async function shot(p, name, opts = {}) {
  const buf = await p.screenshot({ path: join(out, name), ...opts });
  shots.push(name);
  return buf;
}
const composerClip = (p) => p.evaluate(() => {
  const r = document.getElementById("composer-form").getBoundingClientRect();
  return { x: Math.max(0, r.x - 16), y: Math.max(0, r.y - 16), width: r.width + 32, height: r.height + 32 };
});

/* ---- 1 · comparison board, light / dark -------------------------------- */
for (const scheme of ["light", "dark"]) {
  const p = await page({ scheme, dpr: 2 });
  await p.goto(base);
  await p.waitForSelector("html[data-ready='true']");
  await p.evaluate(() => window.specimen.setPlaying(false));
  const box = await p.locator("section[aria-labelledby='h-compare']").boundingBox();
  await shot(p, `compare-board-${scheme}.png`, { clip: box, fullPage: true });
  await p.context().close();
}

/* ---- 2 · thinking keyframes (fixed seed, recommended route) ------------- */
{
  const p = await page({ width: 1000, height: 400, dpr: 2 });
  const times = [0, 325, 650, 975, 1300, 1625, 1950, 2275, 2600];
  const cell = (params, t, material) => `<figure>${svgMarkup("AB", { size: 64, material, params })}<figcaption>${t}</figcaption></figure>`;
  const row = (material) => `<div class="row"><b>${material}</b>${times.map((t) => cell(sample("think", t, { seed: 7 }), `t=${t}`, material)).join("")}</div>`;
  const html = `<style>body{margin:16px;font:11px system-ui;color:#60646c;background:#fdfdfe}.row{display:flex;gap:10px;align-items:center;margin:6px 0}b{width:40px}figure{margin:0;text-align:center;color:#1c2024}figcaption{color:#60646c}:root{--presence-depth:#b9bbc6;--presence-depth-opacity:1;--presence-sheen:#fdfdfe;--presence-sheen-opacity:.28}</style>
    <p>A→B route · explicit thinking · seed 7 · 64 px · one cycle ≈ ${Math.round(2600 * 1.0)} ms (seeded ±4 %)</p>${row("flat")}${row("soft")}
    <div class="row"><b>rest</b>${cell(REST, "rest · A mouth", "flat")}${cell({ ...REST, morph: 1 }, "thinking shape · B mouth", "flat")}</div>`;
  await p.setContent(html);
  await shot(p, "keyframes-thinking.png", { fullPage: true });
  await p.context().close();
}

/* ---- 3 · complete Chat, both placements ---------------------------------- */
const sceneShots = [
  ["line", 1440, "light"], ["line", 1440, "dark"], ["line", 1280, "light"], ["line", 1280, "dark"], ["line", 390, "light"], ["line", 390, "dark"],
  ["corner", 1440, "light"], ["corner", 1440, "dark"], ["corner", 390, "light"],
];
for (const [placement, width, scheme] of sceneShots) {
  const p = await page({ width, height: width < 768 ? 844 : 900, scheme });
  await openScene(p, `placement=${placement}&state=thinking&t=1400`);
  await shot(p, `chat-${placement}-${width}-${scheme}.png`);
  await p.context().close();
}

/* ---- 4 · state contact sheets (composer crop, fixed t) ----------------- */
async function contactSheet(placement, scheme, width) {
  const p = await page({ width, height: 900, scheme, dpr: 2 });
  const tiles = [];
  const states = await (await fetch(`${base}fixtures/states.json`)).json();
  for (const s of states.states) {
    await openScene(p, `placement=${placement}&state=${s.id}&t=1400`);
    const buf = await p.screenshot({ clip: await composerClip(p) });
    tiles.push({ id: s.id, title: s.title, src: `data:image/png;base64,${buf.toString("base64")}` });
  }
  const bg = scheme === "dark" ? "#111113" : "#f0f0f3";
  const fg = scheme === "dark" ? "#b0b4ba" : "#60646c";
  await p.setViewportSize({ width: 1600, height: 900 });
  await p.setContent(`<style>body{margin:16px;background:${bg};color:${fg};font:12px system-ui}main{display:grid;grid-template-columns:repeat(${width < 768 ? 4 : 2},1fr);gap:14px}figure{margin:0}img{width:100%;display:block}figcaption{margin:4px 0}</style>
    <p>${placement} placement · ${scheme} · ${width}px scene · t=1400 ms · seed 7 · synthetic fixture</p>
    <main>${tiles.map((t) => `<figure><figcaption>${t.id} — ${t.title}</figcaption><img src="${t.src}"></figure>`).join("")}</main>`);
  await shot(p, `states-${placement}-${scheme}-${width}.png`, { fullPage: true });
  await p.context().close();
}
await contactSheet("line", "light", 1440);
await contactSheet("corner", "dark", 1440);
await contactSheet("line", "light", 390);

/* ---- 5 · directed behaviour checks -------------------------------------- */
// 5a · sequence check in the tool surface (stale words / timers)
{
  const p = await page();
  await p.goto(base);
  await p.waitForSelector("html[data-ready='true']");
  const r = await p.evaluate(() => window.specimen.runCheck());
  record("sequence-check", r.failed === 0, `${r.total - r.failed}/${r.total} probes`);
  await p.context().close();
}

// 5b · keyboard disclosure: Tab to the trigger, Enter opens, Escape closes, focus returns
for (const placement of ["line", "corner"]) {
  const p = await page();
  await openScene(p, `placement=${placement}&state=tools-concurrent&t=1400`);
  await p.focus("#composer-input");
  await p.keyboard.press("Tab");
  const onTrigger = await p.evaluate(() => document.activeElement?.id === "presence-trigger");
  await p.keyboard.press("Enter");
  const opened = await p.evaluate(() => !document.getElementById("presence-detail").hidden && document.getElementById("presence-trigger").getAttribute("aria-expanded") === "true");
  if (placement === "line") await shot(p, "detail-open-line-1440-light.png", { clip: await p.evaluate(() => { const r = document.querySelector(".composer-area").getBoundingClientRect(); return { x: r.x, y: r.y - 260, width: r.width, height: r.height + 260 }; }) });
  await p.keyboard.press("Escape");
  const closed = await p.evaluate(() => document.getElementById("presence-detail").hidden && document.activeElement?.id === "presence-trigger");
  await p.keyboard.press("Space");
  const reopened = await p.evaluate(() => !document.getElementById("presence-detail").hidden);
  await p.mouse.click(10, 10);
  const outside = await p.evaluate(() => document.getElementById("presence-detail").hidden);
  record(`keyboard-disclosure-${placement}`, onTrigger && opened && closed && reopened && outside, { onTrigger, opened, closedWithFocusBack: closed, spaceReopens: reopened, outsideCloses: outside });
  await p.context().close();
}

// 5c · 200% zoom (1440×900 at 200% = 720×450 CSS px) and 390 with the long tool label:
//      the primary action (Stop during a run, Send otherwise — renderComposer swaps
//      them in place) stays inside the viewport, uncovered, beside the model control.
async function sendClear(p) {
  return p.evaluate(() => {
    const primary = [document.getElementById("send-button"), document.getElementById("stop-button")].find((b) => !b.hidden);
    const send = primary.getBoundingClientRect();
    const model = document.querySelector(".composer-model").getBoundingClientRect();
    const hit = document.elementFromPoint(send.x + send.width / 2, send.y + send.height / 2);
    const trig = document.getElementById("presence-trigger").getBoundingClientRect();
    const overlap = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
    return {
      inViewport: send.right <= innerWidth && send.bottom <= innerHeight && send.left >= 0,
      primary: primary.id,
      notCovered: hit === primary || primary.contains(hit),
      modelVisible: model.width >= 40 && model.right <= innerWidth,
      triggerClearOfControls: !overlap(trig, send) && !overlap(trig, model) || trig.width === 0,
      sendWidth: Math.round(send.width),
    };
  });
}
for (const [label, vp, dpr] of [["zoom200", { width: 720, height: 450 }, 2], ["w390", { width: 390, height: 844 }, 2]]) {
  for (const placement of ["line", "corner"]) {
    for (const state of ["tool-long-label", "idle"]) {
      const p = await page({ ...vp, dpr });
      await openScene(p, `placement=${placement}&state=${state}&t=1400`);
      const r = await sendClear(p);
      record(`layout-${label}-${placement}-${state}`, r.inViewport && r.notCovered && r.modelVisible && r.triggerClearOfControls, r);
      if (state === "tool-long-label" && (placement === "line" || label === "zoom200")) await shot(p, `${label}-${placement}-long-label.png`);
      await p.context().close();
    }
  }
}

// 5d · reduced motion: thinking is static, the word stays “Thinking”, no frame loop
{
  const p = await page({ reducedMotion: "reduce" });
  await openScene(p, "placement=line&state=thinking&t=0");
  const frames = await p.evaluate(() => [300, 1300, 2600, 4000, 7600].map((t) => { window.presenceScene.clock.set(t); const f = window.presenceScene.frame(); return { t, d: document.querySelector(".pr-mouth").getAttribute("d"), text: f.text, animating: f.animating }; }));
  const pass = frames.every((f) => f.d === frames[0].d && f.text === "Thinking" && !f.animating);
  record("reduced-motion-static", pass, frames.map((f) => `${f.t}:${f.text}:${f.animating}`).join(" "));
  await shot(p, "reduced-motion-line-1440-light.png", { clip: await composerClip(p) });
  await p.context().close();
}

// 5e · forced colours: depth layers hidden, mark uses CanvasText
{
  const p = await page({ forcedColors: "active", dpr: 2 });
  await openScene(p, "placement=corner&state=thinking&t=1400&material=soft&size=32");
  const r = await p.evaluate(() => ({
    depthHidden: [...document.querySelectorAll(".pr-depth, .pr-sheen")].every((g) => getComputedStyle(g).display === "none"),
    layers: document.querySelectorAll(".pr-depth").length,
    color: getComputedStyle(document.getElementById("presence-mark")).color,
  }));
  record("forced-colors", r.depthHidden && r.layers > 0, r);
  await shot(p, "forced-colors-corner-soft32.png", { clip: await composerClip(p) });
  await p.context().close();
}

// 5f · depth unsupported → flat; soft requested below 32 → flat
{
  const p = await page({ dpr: 2 });
  await openScene(p, "placement=corner&state=thinking&t=1400&material=soft&size=32&depth=off");
  const off = await p.evaluate(() => [...document.querySelectorAll(".pr-depth, .pr-sheen")].every((g) => getComputedStyle(g).display === "none"));
  await openScene(p, "placement=corner&state=thinking&t=1400&material=soft&size=20");
  const small = await p.evaluate(() => document.querySelector(".presence-svg").dataset.material);
  record("depth-fallback", off && small === "flat", { depthOffHidesLayers: off, soft20Resolves: small });
  await p.context().close();
}

// 5g · no frame loop outside thinking; hidden document stops the clock
{
  const p = await page();
  await openScene(p, "placement=line&state=tool-reading");
  const rafs = await p.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 400)); // let the 180 ms hand-over finish
    let n = 0;
    const raf = window.requestAnimationFrame;
    window.requestAnimationFrame = (cb) => { n++; return raf(cb); };
    await new Promise((r) => setTimeout(r, 2200)); // spans two elapsed-second wake-ups
    window.requestAnimationFrame = raf;
    return n;
  });
  record("no-loop-outside-thinking", rafs === 0, `${rafs} rAF calls in 2.2 s of a held tool fact`);
  await openScene(p, "placement=line&state=thinking");
  const hidden = await p.evaluate(async () => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
    const a = window.presenceScene.clock.now();
    await new Promise((r) => setTimeout(r, 400));
    const b = window.presenceScene.clock.now();
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
    await new Promise((r) => setTimeout(r, 200));
    return { frozen: a === b, resumed: window.presenceScene.clock.now() > b };
  });
  record("hidden-document-pauses", hidden.frozen && hidden.resumed, hidden);
  await p.context().close();
}

// 5h · live region: one announcement per fact change, none for rotated words
{
  const p = await page();
  await openScene(p, "sequence=think-tool-permission-resume-complete&t=0&play=1");
  const log = await p.evaluate(async () => {
    const seen = [];
    const live = document.getElementById("presence-live");
    new MutationObserver(() => live.textContent && seen.push(live.textContent)).observe(live, { childList: true, characterData: true, subtree: true });
    const clock = window.presenceScene.clock;
    for (const t of [3000, 3600, 4300, 6200, 9900, 13400, 14000]) { clock.set(t); await new Promise((r) => setTimeout(r, 30)); }
    return seen;
  });
  const expected = ["ws_read · app/web/composer-field.mjs", "Waiting for your approval", "Thinking", "Work completed"];
  record("live-region", JSON.stringify(log) === JSON.stringify(expected), log);
  await p.context().close();
}

await browser.close();
await writeFile(join(out, "results.json"), JSON.stringify({ base: "synthetic fixtures, seed 7", shots, results }, null, 2) + "\n");
const failed = results.filter((r) => !r.pass);
console.log(`${shots.length} images; ${results.length - failed.length}/${results.length} checks pass`);
for (const f of failed) console.log("FAIL", f.id, JSON.stringify(f.detail));
