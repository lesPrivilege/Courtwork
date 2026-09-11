#!/usr/bin/env node
// Photographs each Spark / Attention direction inside the product's real
// navigation (the running app, its sidebar, Chat and the generic Lucide seats),
// light and dark, at 1× and 2×. The glyphs are swapped in the live DOM only —
// the served sprite is untouched — so what is shown is the actual nav CSS, hit
// regions, type and colour roles at the size the nav really uses (16px).
//
//   node engineering/design/product-icons-2026-09-11/atmosphere-20260911/capture-nav.mjs --origin http://127.0.0.1:8848
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const ORIGIN = arg("--origin", "http://127.0.0.1:8848");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19987"));
const OUT = path.join(here, "nav");
const INTEGRATED = process.argv.includes("--integrated"); // photograph the served sprite as-is, no DOM swap
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const inner = (svg) => svg.replace(/^[\s\S]*?>\s*(?=<)/, "").replace(/<\/svg>\s*$/, "").trim();
const directions = {};
for (const dir of (await readdir(path.join(here, "directions"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
  directions[dir] = { spark: inner(await readFile(path.join(here, "directions", dir, "spark.svg"), "utf8")), attention: inner(await readFile(path.join(here, "directions", dir, "attention.svg"), "utf8")) };
}

const profile = await mkdtemp(path.join(tmpdir(), "cw-atmosphere-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 120 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); } }
if (!version) { chrome.kill(); throw new Error("no debugging port"); }
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sid) => new Promise((resolve, reject) => { const id = ++messageId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable");
const evaluate = async (expression) => { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? "")); return result.value; };

const CLIP = `(()=>{const r=document.querySelector('.sidebar').getBoundingClientRect();const last=document.getElementById('spark-button').getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(last.bottom-r.top)+12};})()`;
const SWAP = (name, d) => `(()=>{
  let host=document.getElementById('atmosphere-symbols');
  if(!host){host=document.createElementNS('http://www.w3.org/2000/svg','svg');host.id='atmosphere-symbols';host.setAttribute('hidden','');host.style.display='none';document.body.append(host);}
  host.innerHTML=${JSON.stringify(`<symbol id="atm-spark" viewBox="0 0 24 24">${d.spark}</symbol><symbol id="atm-attention" viewBox="0 0 24 24">${d.attention}</symbol>`)};
  for(const [id,sym] of [['spark-button','atm-spark'],['attention-button','atm-attention']]){const use=document.querySelector('#'+id+' use');if(use){use.setAttribute('href','#'+sym);use.setAttribute('xlink:href','#'+sym);}}
  const r=document.querySelector('.sidebar').getBoundingClientRect();const last=document.getElementById('spark-button').getBoundingClientRect();
  return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(last.bottom-r.top)+12};
})()`;

try {
  await mkdir(OUT, { recursive: true });
  const manifest = [];
  for (const theme of ["light", "dark"]) {
    for (const dpr of [1, 2]) {
      await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: dpr, mobile: false });
      await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
      await cdp("Page.navigate", { url: `${ORIGIN}/` });
      for (let i = 0; i < 100; i++) { if (await evaluate("document.readyState === 'complete' && !!document.getElementById('spark-button')")) break; await sleep(100); }
      await sleep(1500);
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`); await sleep(300);
      for (const [name, d] of INTEGRATED ? [["integrated", null]] : Object.entries(directions)) {
        const clip = await evaluate(d ? SWAP(name, d) : CLIP);
        await sleep(250);
        const shot = await cdp("Page.captureScreenshot", { format: "png", clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 } });
        const file = `nav-${name}-${theme}-${dpr}x.png`;
        await writeFile(path.join(OUT, file), Buffer.from(shot.data, "base64"));
        manifest.push({ file, direction: name, theme, dpr, clip });
        console.log(`wrote ${file}`);
      }
    }
  }
  await writeFile(path.join(OUT, INTEGRATED ? "integrated-manifest.json" : "manifest.json"), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), note: INTEGRATED ? "Real navigation served from the built sprite after integration; no DOM swap." : "Real navigation, glyphs swapped in the live DOM; served sprite untouched. 16px nav glyph, 32px hit region.", shots: manifest }, null, 2) + "\n");
} finally {
  socket.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true });
}
