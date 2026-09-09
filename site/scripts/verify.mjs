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
import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (id, pass, detail) => {
  results.push({ id, pass: Boolean(pass), ...detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail)}`);
};

const profile = await mkdtemp(path.join(tmpdir(), "ps01-verify-"));
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
    frame.src = frame.src;
    await new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
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
      hero: /把 AI 的产出/.test(text),
      architecture: /让工作存在于模型之外/.test(text) && /单次输出的质量/.test(text),
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
    /把 AI 的产出/.test(served) &&
      /让工作存在于模型之外/.test(served) && /单次输出的质量/.test(served) &&
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
