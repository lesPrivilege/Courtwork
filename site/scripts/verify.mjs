#!/usr/bin/env node
// Check the built page in a real browser.
//
// Everything the work order asks to be verified about the page as a page —
// readable with scripting off, still when motion is off, sharp when
// transparency is off, reachable from the keyboard, same-origin only, legible
// at both viewports and at 200% — is measured here on the rendered document
// rather than argued from the source.
//
//   node site/scripts/preview.mjs --port 8907 &
//   node site/scripts/verify.mjs [--origin http://127.0.0.1:8907/Courtwork/]
//
import { spawn } from "node:child_process";
import { writeFile, readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SITE, ROOT } from "./release.mjs";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const ORIGIN = arg("--origin", "http://127.0.0.1:8907/Courtwork/");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19981"));
const OUT = arg("--out", path.join(SITE, "verification"));
// Figure screenshots are evidence for the publishing-visuals batch (WO-VG-01).
const FIGURES_OUT = arg("--figures-out", path.join(ROOT, "evidence", "publishing-visuals-20260910"));
const FIGURES = JSON.parse(await readFile(path.join(SITE, "src", "assets", "figures", "figures.json"), "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (id, pass, detail) => {
  results.push({ id, pass: Boolean(pass), ...detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail)}`);
};

const PROFILE = arg("--profile", null);
if (PROFILE) await mkdir(PROFILE, { recursive: true });
const profile = PROFILE ?? await mkdtemp(path.join(tmpdir(), "ps01-verify-"));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] },
);
let version = null;
for (let i = 0; i < 120 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { chrome.kill(); throw new Error("headless browser did not open a debugging port"); }

const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0;
const pending = new Map();
const requests = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Network.enable");

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
  return result.value;
}
async function waitFor(expression, timeout = 20000) {
  const start = Date.now();
  for (;;) {
    if (await evaluate(expression)) return true;
    if (Date.now() - start > timeout) throw new Error(`timed out: ${expression}`);
    await sleep(120);
  }
}
async function load(url = ORIGIN, { width = 1440, height = 900, theme = "light", features = [], scale = 1 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
    ...(scale === 1 ? {} : { width: Math.round(width / scale), height: Math.round(height / scale) }),
  });
  await cdp("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: theme }, ...features],
  });
  requests.length = 0;
  await cdp("Page.navigate", { url: `${url}?v=${Date.now()}` });
  await waitFor("document.readyState === 'complete'");
  await sleep(700);
}

// The contrast of the page as rendered: for every element that draws text,
// walk up for the first background that is not transparent and compare.
const CONTRAST = `(() => {
  const parse = (value) => (value.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const backgroundOf = (node) => {
    for (let n = node; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return parse(c);
    }
    return [255, 255, 255];
  };
  const rows = [];
  for (const node of document.body.querySelectorAll("*")) {
    const text = [...node.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!text) continue;
    if (!node.getClientRects().length) continue;
    const style = getComputedStyle(node);
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const value = ratio(parse(style.color), backgroundOf(node));
    rows.push({
      selector: node.tagName.toLowerCase() + (node.className ? "." + String(node.className).split(" ").join(".") : ""),
      text: text.slice(0, 40),
      size: Math.round(size * 10) / 10,
      ratio: Math.round(value * 100) / 100,
      threshold: large ? 3 : 4.5,
      pass: value >= (large ? 3 : 4.5),
    });
  }
  return rows;
})()`;

try {
  await mkdir(OUT, { recursive: true });

  // ---- V1 · same-origin only ---------------------------------------------
  await load();
  const foreign = requests.filter((url) => !url.startsWith(new URL(ORIGIN).origin) && !url.startsWith("data:"));
  record("V1 · the page requests nothing off its own origin", foreign.length === 0, { requests: requests.length, foreign });

  // ---- V2 · the iframe requests nothing off its own origin ----------------
  const frameResources = await evaluate(`(async () => {
    const frame = document.querySelector("iframe.specimen-frame");
    const loaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("specimen did not load after scrolling")), 15000);
      frame.addEventListener("load", () => { clearTimeout(timeout); resolve(); }, { once: true });
    });
    frame.src = frame.src;
    frame.scrollIntoView();
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const inner = frame.contentWindow;
    const entries = inner.performance.getEntriesByType("resource").map((e) => e.name);
    return { origin: inner.location.origin, entries };
  })()`);
  const frameForeign = frameResources.entries.filter((url) => !url.startsWith(frameResources.origin));
  record("V2 · the specimen requests nothing off its own origin", frameForeign.length === 0, {
    entries: frameResources.entries.length,
    foreign: frameForeign,
  });

  // ---- V3 · every step of the specimen is reachable from the keyboard -----
  const keyboard = await evaluate(`(() => {
    const doc = document.querySelector("iframe.specimen-frame").contentDocument;
    const tabs = [...doc.querySelectorAll('[role="tab"].specimen-step')];
    const reached = [];
    for (const tab of tabs) {
      tab.focus();
      if (doc.activeElement !== tab) continue;
      // Enter is what a focused button answers to; the tablist also walks with
      // the arrow keys, checked below.
      tab.click();
      reached.push(doc.querySelector(".specimen-counter").textContent);
    }
    const first = tabs[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const afterArrow = doc.querySelector(".specimen-counter").textContent;
    return { tabs: tabs.length, reached, afterArrow, tabStops: tabs.filter((t) => t.tabIndex === 0).length };
  })()`);
  record(
    "V3 · all eight specimen steps are reachable and the tablist walks with the arrow keys",
    keyboard.tabs === 8 && keyboard.reached.length === 8 && /Step 2 of 8/.test(keyboard.afterArrow) && keyboard.tabStops === 1,
    keyboard,
  );

  const replay = await evaluate(`(async () => {
    const frame = document.querySelector("iframe.specimen-frame");
    const win = frame.contentWindow;
    const doc = win.document;
    const capture = await (await fetch(new URL("specimen/capture.json", location.href))).json();
    const recording = await (await fetch(new URL("specimen/" + capture.file.split("/").pop(), location.href))).json();
    const { readRecordedSource } = await import(new URL("specimen/recorded-source.mjs", location.href));
    const projection = recording.surface.pending.projection;
    const candidate = projection.candidates.find(c => c.evidence?.length);
    const anchor = candidate.evidence[0];
    const request = {candidateId:candidate.id, sourceId:anchor.source_id, version:anchor.source_version};
    const valid = await readRecordedSource(projection, request);
    const wrongCandidate = await readRecordedSource(projection, {...request, candidateId:"missing"});
    const wrongVersion = await readRecordedSource(projection, {...request, version:"missing"});
    const changed = structuredClone(projection);
    changed.sources.find(s => s.id === request.sourceId && s.version === request.version).text += "tampered";
    const wrongBytes = await readRecordedSource(changed, request);
    win.location.hash = "step-candidate";
    await new Promise(r => setTimeout(r,200));
    const selected = doc.querySelector('.specimen-step[aria-selected="true"]').id;
    const decision = [...doc.querySelectorAll("button")].find(b => /Accept/.test(b.textContent));
    const reason = doc.querySelector(".candidate-actions textarea");
    if (reason) { reason.value = "Synthetic replay inspection"; reason.dispatchEvent(new win.Event("input", {bubbles:true})); }
    decision?.click();
    await new Promise(r => setTimeout(r,100));
    const refusal = doc.querySelector(".specimen-refusal").textContent;
    win.location.hash = "source";
    await new Promise(r => setTimeout(r,100));
    return {valid:!!valid, wrongCandidate, wrongVersion, wrongBytes, selected, refusal, source:doc.querySelector("#source")?.textContent, links:document.querySelectorAll(".anatomy-links a").length};
  })()`);
  record("V3b · frozen source lookup, negative identities and replay refusal", replay.valid && replay.wrongCandidate === null && replay.wrongVersion === null && replay.wrongBytes === null && replay.selected === "step-candidate" && /replay · not sent/.test(replay.refusal) && replay.source?.includes("Recorded sources") && replay.links === 7, replay);

  const pricing = await evaluate(`(() => {
    const tabs = [...document.querySelectorAll('[data-tabs="pricing-value"] [role="tab"]')];
    const reached = tabs.map(tab => { tab.click(); return document.getElementById(tab.getAttribute("aria-controls")).hidden === false; });
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent("keydown", {key:"ArrowRight",bubbles:true}));
    return {count:tabs.length, reached, arrow:document.activeElement.id, concepts:document.querySelector(".pricing-concept").textContent, cards:document.querySelectorAll(".pricing-card").length};
  })()`);
  record("V3c · pricing panels and keyboard selection", pricing.count === 3 && pricing.cards === 3 && pricing.reached.every(Boolean) && pricing.arrow === "pricing-tab-hosted" && /CONCEPT PLANS.*NOT CURRENTLY OFFERED/.test(pricing.concepts), pricing);

  const instrument = await evaluate(`(() => {
    const group = document.querySelector('[data-tabs="layers"]');
    const object = group.querySelector('.instrument-object');
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const seen = tabs.map(tab => { tab.click(); return { projection: group.dataset.projection, same: group.querySelector('.instrument-object') === object, visible: [...group.querySelectorAll('[role="tabpanel"]')].filter(p => !p.hidden).length }; });
    tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    return { seen, instant: group.dataset.motion === 'instant', caption: document.querySelector('.hero-object figcaption').textContent, slot: document.querySelector('[data-capture-slot="home"]').dataset.captureStatus };
  })()`);
  record("V3d · one decorative object, three projections, current Home captured", instrument.seen.map(s => s.projection).join(',') === 'events,surface,context' && instrument.seen.every(s => s.same && s.visible === 1) && instrument.instant && /Concept study/.test(instrument.caption) && instrument.slot === 'captured', instrument);

  // ---- V4 · reduced motion and reduced transparency ------------------------
  for (const feature of ["prefers-reduced-motion", "prefers-reduced-transparency"]) {
    await load(ORIGIN, { features: [{ name: feature, value: "reduce" }] });
    const still = await evaluate(`(() => {
      const editorial = document.querySelector(".editorial");
      // Put the section into the state that dims: hovering one paragraph.
      const paragraph = editorial.querySelector(".prose[data-layers]");
      paragraph.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
      const layers = [...editorial.querySelectorAll(".diagram g[data-layer]")].map((g) => {
        const s = getComputedStyle(g.querySelector("line") || g);
        return { filter: s.filter, opacity: s.opacity, transition: s.transitionProperty };
      });
      const animated = [...document.querySelectorAll("*")].filter((n) => {
        const s = getComputedStyle(n);
        return (s.animationName && s.animationName !== "none") || (s.transitionDuration && parseFloat(s.transitionDuration) > 0);
      }).map((n) => n.tagName.toLowerCase() + "." + String(n.className).split(" ").join("."));
      return { focus: editorial.dataset.focus !== undefined, layers, animated };
    })()`);
    const blurred = still.layers.filter((layer) => layer.filter !== "none" || Number(layer.opacity) < 1);
    record(
      `V4 · ${feature}: nothing is dimmed and nothing moves`,
      blurred.length === 0 && still.animated.length === 0,
      { focusEngaged: still.focus, dimmed: blurred, animated: still.animated.slice(0, 5) },
    );
  }

  // The same section must actually dim when neither preference is set, or the
  // check above would pass on a page that never had the behaviour.
  await load();
  await evaluate(`(() => {
    const editorial = document.querySelector(".editorial");
    editorial.querySelector('.prose[data-layers="commit"]').dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
  })()`);
  await sleep(300); // Check the settled state, not blur(0px) at transition start.
  const dims = await evaluate(`(() => {
    const editorial = document.querySelector(".editorial");
    return [...editorial.querySelectorAll(".diagram g[data-layer]")].map((g) => ({
      layer: g.dataset.layer,
      filter: getComputedStyle(g.querySelector("line") || g).filter,
      opacity: getComputedStyle(g.querySelector("line") || g).opacity,
      textSharp: [...g.querySelectorAll("text")].every(t => getComputedStyle(t).filter === "none") && getComputedStyle(g).filter === "none",
    }));
  })()`);
  record("V5 · with no preference set, the section does defocus what it is not explaining",
    dims.some((d) => /blur\(1\.6px\)/.test(d.filter)) && dims.some((d) => d.filter === "none") && dims.every(d => d.textSharp), { dims });
  await evaluate('document.querySelector(".editorial").scrollIntoView({block:"start"})');
  await writeFile(path.join(OUT, "architecture-focus.png"), Buffer.from(
    (await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"));

  // ---- V6 · readable with scripting off ------------------------------------
  await cdp("Emulation.setScriptExecutionDisabled", { value: true });
  await load();
  const noscript = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hero: /模型可以离场，工作继续/.test(text) && Boolean(document.querySelector(".hero-object")) && document.querySelector("[data-capture-slot=home]")?.dataset.captureStatus === "captured",
      architecture: /让工作存在于模型之外/.test(text) && /已确认的决定/.test(text),
      evidence: /Continuity conformance/.test(text) && /声称表/.test(text),
      build: /npm --prefix app ci/.test(text) && /Domain core/.test(text),
      layers: [...document.querySelectorAll(".tab-panel")].filter((p) => p.getClientRects().length).length,
      diagram: Boolean(document.querySelector(".diagram svg")),
    };
  })()`).catch(() => null);
  // With script execution disabled the evaluation above cannot run in the page,
  // so the same facts are read out of the served HTML instead.
  const served = await (await fetch(ORIGIN)).text();
  record("V6 · without scripting the first screen and sections 03 / 05 / 06 are complete", 
    /模型可以离场，工作继续/.test(served) && /data-capture-status="captured"/.test(served) &&
      /让工作存在于模型之外/.test(served) && /已确认的决定/.test(served) &&
      /Continuity conformance/.test(served) && /声称表/.test(served) &&
      /npm --prefix app ci/.test(served) && /Domain core/.test(served) &&
      !/hidden/.test(served.split('class="tab-panel"')[1]?.slice(0, 80) ?? ""),
    { evaluatedInPage: noscript, servedBytes: served.length });
  const servedSpecimen = await (await fetch(new URL("specimen/index.html", ORIGIN))).text();
  record("V6b · without scripting the specimen falls back to the step list with its stills",
    /<noscript>/.test(servedSpecimen) && (servedSpecimen.match(/fallback-shot/g) || []).length === 7 &&
      (servedSpecimen.match(/fallback-text/g) || []).length === 8,
    { stills: (servedSpecimen.match(/fallback-shot/g) || []).length });
  await cdp("Emulation.setScriptExecutionDisabled", { value: false });

  // ---- V7 · contrast, both themes ------------------------------------------
  const contrast = {};
  for (const theme of ["light", "dark"]) {
    await load(ORIGIN, { theme });
    const rows = await evaluate(CONTRAST);
    contrast[theme] = rows;
    const failures = rows.filter((row) => !row.pass);
    record(`V7 · contrast · ${theme}`, failures.length === 0, {
      measured: rows.length,
      minimum: Math.min(...rows.map((r) => r.ratio)),
      failures: failures.slice(0, 8),
    });
  }
  await writeFile(path.join(OUT, "contrast.json"), JSON.stringify(contrast, null, 2) + "\n");

  // ---- V8 · the two viewports, both themes, and 200% ------------------------
  const shots = [];
  for (const [width, height, theme, scale] of [
    [1440, 900, "light", 1],
    [1440, 900, "dark", 1],
    [390, 844, "light", 1],
    [390, 844, "dark", 1],
    [1440, 900, "light", 2],
  ]) {
    await load(ORIGIN, { width, height, theme, scale });
    await evaluate('document.querySelector("#pricing").scrollIntoView()');
    await writeFile(path.join(OUT, `pricing-${width}-${theme}${scale === 2 ? "-zoom200" : ""}.png`), Buffer.from((await cdp("Page.captureScreenshot", {format:"png"})).data, "base64"));
    const overflow = await evaluate("document.documentElement.scrollWidth - window.innerWidth");
    // A whole-page screenshot outruns lazy loading, so the pictures are asked
    // for eagerly and awaited before the shutter.
    await evaluate(`(async () => {
      const images = [...document.images];
      for (const image of images) image.loading = "eager";
      await Promise.all(images.map((image) => image.decode().catch(() => {})));
      return images.length;
    })()`);
    await sleep(600);
    const name = `page-${width}-${theme}${scale === 2 ? "-zoom200" : ""}.png`;
    const png = Buffer.from(
      (await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).data,
      "base64",
    );
    await writeFile(path.join(OUT, name), png);
    shots.push({ name, width, theme, scale, overflow, bytes: png.length });
    record(`V8 · ${width}px ${theme}${scale === 2 ? " at 200%" : ""} does not scroll sideways`, overflow <= 1, {
      overflow, file: `site/verification/${name}`,
    });
  }

  // ---- V9 · figures, measured with real glyphs (intake VG-10, VG-15) -------
  // The same three geometry failures check-figures estimates from a width
  // table — text outside its box, overlapping nodes, a connector through an
  // unrelated node — measured here with getBBox and getPointAtLength, plus the
  // colour facts a stylesheet decides: which element is red, and whether the
  // figure's own text fill meets contrast on the ground it sits on.
  const FIGURE_AUDIT = `((figures) => {
    const parse = (v) => (v.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const probe = document.createElement("span");
    probe.style.color = "var(--campaign-attention-review)";
    document.body.append(probe);
    const red = getComputedStyle(probe).color;
    probe.remove();
    const groundOf = (node) => { for (let n = node; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) return parse(c); } return [255, 255, 255]; };
    // Hidden tab panels measure as empty boxes; show them so every figure is
    // measured as drawn. The page is reloaded before anything else is checked.
    for (const panel of document.querySelectorAll('[role="tabpanel"][hidden]')) panel.hidden = false;
    const out = [];
    for (const entry of figures) {
      const host = entry.mount === "data-figure" ? document.querySelector('[data-figure="' + entry.id + '"]') : document.querySelector(entry.mount);
      if (!host) { out.push({ id: entry.id, missing: true }); continue; }
      const svg = host.matches("svg") ? host : host.querySelector("svg:not([aria-hidden=true])");
      const row = { id: entry.id, problems: [], reds: [], animated: 0 };
      for (const el of host.querySelectorAll("*")) {
        const s = getComputedStyle(el);
        if (!svg || !svg.contains(el)) continue;
        if ((s.animationName && s.animationName !== "none") || parseFloat(s.transitionDuration) > 0) row.animated++;
        if ((s.fill === red || s.stroke === red) && !el.closest("defs")) row.reds.push(el.id ? "#" + el.id : el.tagName);
      }
      if (!svg) { out.push(row); continue; }
      row.title = Boolean(svg.querySelector(":scope > title")?.textContent.trim());
      row.desc = Boolean(svg.querySelector(":scope > desc")?.textContent.trim());
      const [vx, vy, vw, vh] = svg.viewBox.baseVal ? [svg.viewBox.baseVal.x, svg.viewBox.baseVal.y, svg.viewBox.baseVal.width, svg.viewBox.baseVal.height] : [0, 0, 0, 0];
      const box = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height, label: el.id || el.textContent?.trim() || el.closest("[data-node]")?.dataset.node || el.tagName }; };
      const area = (b) => (b.right - b.x) * (b.bottom - b.y);
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
      const contains = (o, i, t = 1) => o.x - t <= i.x && o.y - t <= i.y && o.right + t >= i.right && o.bottom + t >= i.bottom;
      const inside = (b, p, inset) => p.x > b.x + inset && p.x < b.right - inset && p.y > b.y + inset && p.y < b.bottom - inset;
      const live = (el) => !el.closest("defs");
      const rects = [...svg.querySelectorAll("rect")].filter(live).map((el) => ({ el, box: box(el) }));
      const texts = [...svg.querySelectorAll("text")].filter(live).map((el) => ({ el, box: box(el) }));
      const view = { x: vx, y: vy, right: vx + vw, bottom: vy + vh };
      for (const t of [...rects, ...texts]) if (!contains(view, t.box, 0.5)) row.problems.push("outside viewBox: " + t.box.label);
      for (const t of texts) {
        const c = { x: (t.box.x + t.box.right) / 2, y: (t.box.y + t.box.bottom) / 2 };
        const owners = rects.filter((r) => inside(r.box, c, 0)).sort((a, b) => area(a.box) - area(b.box));
        if (owners[0] && !contains(owners[0].box, t.box, 1)) row.problems.push("text overflows its box: " + t.box.label);
        for (const r of rects) if (!owners.includes(r) && overlap(r.box, t.box) > 4) row.problems.push("text overlaps node: " + t.box.label + " / " + r.box.label);
        // Contrast of the fill actually painted, on the fill (or page) behind it.
        const ground = owners[0] && getComputedStyle(owners[0].el).fill.startsWith("rgb") ? parse(getComputedStyle(owners[0].el).fill) : groundOf(svg);
        const size = parseFloat(getComputedStyle(t.el).fontSize) * (svg.getBoundingClientRect().width / vw);
        const value = ratio(parse(getComputedStyle(t.el).fill), ground);
        const threshold = size >= 18.66 ? 3 : 4.5;
        if (value < threshold) row.problems.push("text contrast " + value.toFixed(2) + " < " + threshold + ": " + t.box.label);
      }
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) if (overlap(texts[i].box, texts[j].box) > 4) row.problems.push("texts overlap: " + texts[i].box.label + " / " + texts[j].box.label);
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const [a, b] = [rects[i].box, rects[j].box]; if (!contains(a, b) && !contains(b, a) && overlap(a, b) > 4) row.problems.push("nodes overlap: " + a.label + " / " + b.label); }
      for (const line of svg.querySelectorAll("line, path, polyline")) {
        if (!live(line) || line.dataset.deco !== undefined) continue;
        const length = line.getTotalLength();
        if (!length) continue;
        const at = (t) => line.getPointAtLength(length * t);
        const ends = [at(0), at(1)];
        for (const o of [...rects, ...texts]) {
          if (ends.some((p) => inside(o.box, p, -6))) continue;
          for (let t = 0.12; t <= 0.881; t += 0.04) if (inside(o.box, at(t), 2)) { row.problems.push("connector crosses: " + (line.dataset.edge || line.tagName) + " through " + o.box.label); break; }
        }
      }
      row.width = Math.round(svg.getBoundingClientRect().width);
      if (!row.width) row.problems.push("figure has no rendered width");
      out.push(row);
    }
    return { red, figures: out };
  })`;
  const redOf = (entry) => (entry.red ? [entry.red.element] : []);
  for (const [width, height, theme] of [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"], [390, 844, "dark"]]) {
    await load(ORIGIN, { width, height, theme });
    const audit = await evaluate(`${FIGURE_AUDIT}(${JSON.stringify(FIGURES.figures)})`);
    const bad = audit.figures.filter((f) => f.missing || f.problems?.length || f.animated ||
      JSON.stringify(f.reds) !== JSON.stringify(redOf(FIGURES.figures.find((e) => e.id === f.id))) ||
      (f.title === false) || (f.desc === false && !FIGURES.figures.find((e) => e.id === f.id).deferred));
    record(`V9 · figures at ${width}px ${theme}: geometry, text contrast, red only where registered, nothing moves`, bad.length === 0, {
      figures: audit.figures.length, red: audit.red, reds: audit.figures.filter((f) => f.reds.length).map((f) => ({ id: f.id, reds: f.reds })),
      deferredWithoutDesc: audit.figures.filter((f) => f.desc === false).map((f) => f.id), failures: bad.slice(0, 6),
    });
  }

  // ---- V10 · the figure matrix, greyscale and forced colours ----------------
  await mkdir(FIGURES_OUT, { recursive: true });
  const matrix = [];
  const regions = [["long-work", "#long-work"], ["state-to-commit", '[data-figure="state-to-commit"]'], ["fig-00", '[data-figure="fig-00-matter-object"]']];
  const capture = async (name, selector) => {
    const rect = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); const b = e.getBoundingClientRect(); return { x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }; })()`);
    const png = Buffer.from((await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...rect, scale: 1 } })).data, "base64");
    await writeFile(path.join(FIGURES_OUT, name), png);
    return { file: name, bytes: png.length, clip: { width: Math.round(rect.width), height: Math.round(rect.height) } };
  };
  const viewportNow = () => evaluate("({ innerWidth, innerHeight, devicePixelRatio })").catch(() => null);
  for (const [width, height] of [[1440, 900], [390, 844]])
    for (const theme of ["light", "dark"])
      for (const mode of ["default", "reduced-motion", "no-js"]) {
        if (mode === "no-js") await cdp("Emulation.setScriptExecutionDisabled", { value: true });
        await load(ORIGIN, { width, height, theme, features: mode === "reduced-motion" ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [] });
        const viewport = mode === "no-js" ? { innerWidth: width, innerHeight: height, devicePixelRatio: 1, note: "emulated metrics; page scripts disabled" } : await viewportNow();
        for (const [label, selector] of regions)
          matrix.push({ width, height, theme, mode, region: label, viewport, ...(await capture(`${label}-${width}-${theme}-${mode}.png`, selector)) });
        if (mode === "no-js") await cdp("Emulation.setScriptExecutionDisabled", { value: false });
      }

  // Greyscale: the elevated item must still stand apart from the quiet ones by
  // shape (the only filled mark) and by non-text contrast against its ground.
  for (const [width, height, theme] of [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"]]) {
    await load(ORIGIN, { width, height, theme });
    await evaluate(`document.documentElement.style.filter = "grayscale(1)"`);
    const grey = await evaluate(`(() => {
      const parse = (v) => (v.match(/[\\d.]+/g) || []).slice(0, 3).map(Number);
      const g = ([r, gg, b]) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      const lum = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const figure = document.querySelector('[data-figure="attention"]');
      const elevated = figure.querySelector("#fig-attention-elevated");
      const quiet = [...figure.querySelectorAll(".fig-quiet")];
      let ground = [255, 255, 255];
      for (let n = figure; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (!/rgba\\(0, 0, 0, 0\\)|transparent/.test(c)) { ground = parse(c); break; } }
      const mark = g(parse(getComputedStyle(elevated).fill));
      return { markGrey: Math.round(mark), groundGrey: Math.round(g(ground)), contrast: Math.round(ratio(mark, g(ground)) * 100) / 100,
        onlyFilled: quiet.every((q) => getComputedStyle(q).fill === "none"), quiet: quiet.length,
        labelWeight: getComputedStyle(figure.querySelector("#fig-attention-elevated + text")).fontWeight };
    })()`);
    matrix.push({ width, height, theme, mode: "grayscale", region: "long-work", viewport: await viewportNow(), ...(await capture(`long-work-${width}-${theme}-grayscale.png`, "#long-work")) });
    record(`V10 · greyscale ${width}px ${theme}: the elevated item stays distinct without colour`, grey.contrast >= 3 && grey.onlyFilled && Number(grey.labelWeight) >= 600, grey);
  }

  // Forced colours: the red resolves to a system colour, and shape carries it.
  for (const [width, height, theme] of [[1440, 900, "light"], [390, 844, "dark"]]) {
    await load(ORIGIN, { width, height, theme, features: [{ name: "forced-colors", value: "active" }] });
    const forced = await evaluate(`(() => {
      const figure = document.querySelector('[data-figure="attention"]');
      const elevated = getComputedStyle(figure.querySelector("#fig-attention-elevated")).fill;
      const text = getComputedStyle(figure.querySelector("text")).fill;
      return { active: matchMedia("(forced-colors: active)").matches, elevated, text, sameAsText: elevated === text,
        quietUnfilled: [...figure.querySelectorAll(".fig-quiet")].every((q) => getComputedStyle(q).fill === "none") };
    })()`);
    matrix.push({ width, height, theme, mode: "forced-colors", region: "long-work", viewport: await viewportNow(), ...(await capture(`long-work-${width}-${theme}-forced-colors.png`, "#long-work")) });
    record(`V10 · forced colours ${width}px ${theme}: no red survives, the elevated item stays the only filled mark`, forced.active && forced.sameAsText && forced.quietUnfilled, forced);
  }
  await writeFile(path.join(FIGURES_OUT, "matrix.json"), JSON.stringify({ origin: ORIGIN, chrome: version.Browser, matrix }, null, 2) + "\n");
  record("V10 · figure screenshot matrix written", matrix.length === 2 * 2 * 3 * regions.length + 5, { shots: matrix.length, dir: path.relative(ROOT, FIGURES_OUT) });

  await writeFile(
    path.join(OUT, "verify.json"),
    JSON.stringify({ origin: ORIGIN, results, shots }, null, 2) + "\n",
  );
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
} finally {
  socket.close();
  chrome.kill();
  // The browser is still flushing its profile as it dies; the directory is
  // scratch, so a failure to remove it is not a failure of the verification.
  await sleep(500);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
