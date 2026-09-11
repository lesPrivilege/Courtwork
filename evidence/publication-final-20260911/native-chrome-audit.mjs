#!/usr/bin/env node
// Native host chrome audit (ONE-SHOT 2026-09-11 stage 2). Browser geometry only:
// it injects the host packet the web adapter accepts (shell-layout.mjs), then
// checks that no product control's box intersects the protected rectangle
// [0, controlsInsetLeft) × [0, toolbarHeight) in each shell state, that a plain
// URL reserves nothing, and that overlay:false / zero-inset / a 104×64 packet /
// a full-screen-like update behave. It cannot prove AppKit hit testing, dragging
// or VoiceOver; those stay listed as native checks not run here.
//
//   node evidence/publication-final-20260911/native-chrome-audit.mjs --origin http://127.0.0.1:8848 --out <dir>
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const ORIGIN = arg("--origin", "http://127.0.0.1:8848");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19985"));
const OUT = arg("--out", "/tmp/cw-native-chrome-audit");
const SESSION = arg("--session", null); // optional session id for the expanded work-surface state
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (id, pass, detail) => { results.push({ id, pass: Boolean(pass), ...detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail).slice(0, 260)}`); };

const profile = await mkdtemp(path.join(tmpdir(), "cw-chrome-audit-"));
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
let injected = null;
async function load(url, { width = 1440, height = 900, packet = null } = {}) {
  if (injected) { await cdp("Page.removeScriptToEvaluateOnNewDocument", { identifier: injected }); injected = null; }
  if (packet) ({ identifier: injected } = await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `window.__CW_NATIVE_CHROME__ = ${JSON.stringify(packet)};` }));
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Page.navigate", { url });
  for (let i = 0; i < 100; i++) { if (await evaluate("document.readyState === 'complete' && !!document.body.dataset")) break; await sleep(100); }
  await sleep(1200);
}
async function shot(name) { const s = await cdp("Page.captureScreenshot", { format: "png" }); await writeFile(path.join(OUT, `${name}.png`), Buffer.from(s.data, "base64")); }

// The strict test from the source contract: box intersection, all four edges.
const AUDIT = (left, height) => `(()=>{
  const left=${left}, height=${height};
  const controls=[...document.querySelectorAll('button, a[href], input, select, textarea, summary, [role="tab"], [tabindex]:not([tabindex="-1"])')].filter(el=>{const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||el.closest('[hidden]')||el.closest('[inert]'))return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0;});
  const hit=controls.filter(el=>{const r=el.getBoundingClientRect();return r.left<left&&r.right>0&&r.top<height&&r.bottom>0;}).map(el=>({id:el.id||el.className||el.tagName,rect:[Math.round(el.getBoundingClientRect().left),Math.round(el.getBoundingClientRect().top),Math.round(el.getBoundingClientRect().right),Math.round(el.getBoundingClientRect().bottom)]}));
  const root=document.documentElement;
  const header=document.querySelector('.surface-view-switch .surface-header, .app-shell.settings-active .chat-header, .chat-header');
  const dialog=[...document.querySelectorAll('dialog[open]')].map(d=>{const r=d.getBoundingClientRect();return {id:d.id,top:Math.round(r.top),left:Math.round(r.left),right:Math.round(r.right),bottom:Math.round(r.bottom)};});
  return {shell:root.dataset.shell||null,inset:getComputedStyle(root).getPropertyValue('--native-controls-inset').trim(),toolbar:getComputedStyle(root).getPropertyValue('--native-toolbar-height').trim(),controls:controls.length,hit,headerLeft:header?Math.round(header.getBoundingClientRect().left):null,headerPad:header?getComputedStyle(header).paddingLeft:null,classes:document.getElementById('app-shell')?.className||'',dialogs:dialog,viewport:[innerWidth,innerHeight]};
})()`;

const PACKETS = {
  preview: { query: "?shell=desktop", packet: null, left: 80, height: 48, label: "preview fallback ?shell=desktop (80×48)" },
  p104: { query: "", packet: { schemaVersion: 1, platform: "macos", overlay: true, controlsInsetLeft: 104, toolbarHeight: 64 }, left: 104, height: 64, label: "packet 104×64" },
  zero: { query: "", packet: { schemaVersion: 1, platform: "macos", overlay: true, controlsInsetLeft: 0, toolbarHeight: 48 }, left: 0, height: 48, label: "packet zero inset" },
  plain: { query: "", packet: null, left: 0, height: 0, label: "plain URL, no packet" },
  overlayOff: { query: "", packet: { schemaVersion: 1, platform: "macos", overlay: false }, left: 0, height: 0, label: "packet overlay:false" },
};
const STATES = [
  { id: "home", prepare: "" },
  { id: "nav-collapsed", prepare: "document.getElementById('toggle-nav-button')?.click()" },
  { id: "settings", prepare: "location.hash='#settings/general'" },
  { id: "chat-page", prepare: "document.getElementById('chat-button')?.click()" },
  { id: "attention-dialog", prepare: "document.getElementById('attention-button')?.click()" },
  { id: "spark-dialog", prepare: "document.getElementById('spark-button')?.click()" },
  ...(SESSION ? [{ id: "work-surface-expanded", prepare: `location.hash='';` , session: true }] : []),
];

try {
  await mkdir(OUT, { recursive: true });
  for (const width of [1440, 1280, 390]) {
    for (const [pk, p] of Object.entries(PACKETS)) {
      for (const state of STATES) {
        await load(`${ORIGIN}/${p.query}`, { width, height: width === 390 ? 844 : 900, packet: p.packet });
        if (state.session) { await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));for(const p of document.querySelectorAll('[data-nav-key^="project:"]')){if(!document.querySelector('[data-nav-key="session:${SESSION}"]')){p.click();await w(600);}}document.querySelector('[data-nav-key="session:${SESSION}"]')?.click();await w(1800);if(!/surface-cards|surface-open|surface-expanded/.test(document.getElementById('app-shell').className))document.getElementById('show-surface-button')?.click();await w(900);[...document.querySelectorAll('.surface-panel button')].find(b=>/^expand/i.test(b.getAttribute('aria-label')||''))?.click();await w(900);})()`); }
        else if (state.prepare) { await evaluate(state.prepare); await sleep(700); }
        const a = await evaluate(AUDIT(p.left, p.height));
        const expectShell = pk === "preview" || pk === "p104" || pk === "zero";
        const ok = a.hit.length === 0 && (expectShell ? a.shell === "desktop" : a.shell === null) && (pk === "p104" ? a.inset === "104px" && a.toolbar === "64px" : true) && (pk === "plain" || pk === "overlayOff" ? a.inset === "" : true);
        record(`${width}-${pk}-${state.id}`, ok, { packet: p.label, ...a });
        if (width !== 1280 && (pk === "p104" || pk === "preview")) await shot(`${width}-${pk}-${state.id}`);
      }
    }
    // live update: 104×64 → full-screen-like zero inset → overlay off, on Home, without reload
    await load(`${ORIGIN}/`, { width, height: width === 390 ? 844 : 900, packet: PACKETS.p104.packet });
    const seq = [];
    for (const [name, detail] of [["fullscreen", { schemaVersion: 1, platform: "macos", overlay: true, controlsInsetLeft: 0, toolbarHeight: 48 }], ["overlay-off", { schemaVersion: 1, platform: "macos", overlay: false }], ["invalid", { schemaVersion: 1, platform: "macos", overlay: true, controlsInsetLeft: 999, toolbarHeight: 20 }]]) {
      await evaluate(`window.dispatchEvent(new CustomEvent('courtwork:native-chrome',{detail:${JSON.stringify(detail)}}))`); await sleep(200);
      const a = await evaluate(AUDIT(name === "fullscreen" ? 0 : 0, name === "fullscreen" ? 48 : 0));
      seq.push({ name, shell: a.shell, inset: a.inset, toolbar: a.toolbar, hit: a.hit.length });
    }
    const okSeq = seq[0].shell === "desktop" && seq[0].inset === "0px" && seq[1].shell === null && seq[1].inset === "" && seq[2].shell === null && seq[2].inset === "";
    record(`${width}-live-update`, okSeq, { seq });
  }
} finally {
  await writeFile(path.join(OUT, "results.json"), JSON.stringify({ at: new Date().toISOString(), origin: ORIGIN, results }, null, 2) + "\n");
  socket.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true });
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
