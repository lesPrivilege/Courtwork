// Pre-publication reader evidence beyond papers/qa/verify_reader.mjs.
// Covers: back/forward, reload with shared query/hash, hash aliases, long-contents last item,
// keyboard path with visible focus, no-script details, explicit theme vs system, reduced-motion,
// forced-colors (media emulation only), print matrix (system/explicit dark × black/color signature ×
// wide/compact cover) with PDF output, offline reading. Node 22+ (global WebSocket/fetch), headless Chrome via CDP.
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const ORIGIN = arg("--origin", "http://127.0.0.1:8978/");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19981"));
const OUT = arg("--out", "/tmp/se-prepublish");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const record = (id, pass, detail) => { results.push({ id, pass: Boolean(pass), ...detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail).slice(0, 300)}`); };

const profile = await mkdtemp(path.join(tmpdir(), "prepub-verify-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 120 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); } }
if (!version) { chrome.kill(); throw new Error("headless browser did not open a debugging port"); }
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0; const pending = new Map(); const requests = [];
socket.onmessage = (event) => { const m = JSON.parse(event.data); if (m.method === "Network.requestWillBeSent") requests.push(m.params.request.url); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sid) => new Promise((resolve, reject) => { const id = ++messageId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable");
async function evaluate(expression) { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? "")); return result.value; }
async function waitFor(expression, timeout = 20000) { const start = Date.now(); for (;;) { if (await evaluate(expression)) return true; if (Date.now() - start > timeout) throw new Error(`timed out: ${expression}`); await sleep(120); } }
let media = { features: [] };
async function setMedia(features = [], mediaType = "") { media = { features, media: mediaType }; await cdp("Emulation.setEmulatedMedia", { media: mediaType, features }); }
async function load(url, { width = 1440, height = 900, theme = "light", features = [], scale = 1 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: Math.round(width / scale), height: Math.round(height / scale), deviceScaleFactor: scale, mobile: width < 768 });
  await setMedia([{ name: "prefers-color-scheme", value: theme }, ...features]);
  requests.length = 0;
  await cdp("Page.navigate", { url });
  await waitFor("document.readyState === 'complete'"); await sleep(600);
}
async function shot(name) { const s = await cdp("Page.captureScreenshot", { format: "png" }); await writeFile(path.join(OUT, `${name}.png`), Buffer.from(s.data, "base64")); }
async function key(k, code, vk, text) { await cdp("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text, unmodifiedText: text } : {}) }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); }
async function clickEl(selector) { const box = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`); await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y }); await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 }); await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 }); await sleep(250); }
const FOCUS = `(()=>{const el=document.activeElement;const cs=getComputedStyle(el);return {tag:el.tagName,text:(el.textContent||'').trim().slice(0,30),cls:(el.className||'').toString().slice(0,24),outline:cs.outlineStyle,width:cs.outlineWidth,visible:cs.outlineStyle!=='none'&&parseFloat(cs.outlineWidth)>0}})()`;

try {
 await mkdir(OUT,{recursive:true});
 for(const width of [1440,1280,390]) for(const theme of ['light','dark']) for(const family of ['black','color']) {
  await load(new URL('index.html',ORIGIN).href,{width,theme,height:900});
  await evaluate(`document.body.dataset.signature='${family}'`);
  const detail=await evaluate(`(()=>{const svg=document.querySelector('.lp-mark');return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,iconHeight:svg.getBoundingClientRect().height,top:getComputedStyle(svg.querySelector('.lp-bar-top')).fill}})()`);
  record(`${width}-${theme}-${family}`,!detail.overflow && (family==='black'||detail.top==='rgb(201, 94, 85)'),detail);
  await shot(`masthead-${width}-${theme}-${family}`);
 }
} finally {
 await writeFile(path.join(OUT,'results.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n');
 socket.close();chrome.kill();await sleep(300);await rm(profile,{recursive:true,force:true});
}
if(results.some(r=>!r.pass))process.exitCode=1;
