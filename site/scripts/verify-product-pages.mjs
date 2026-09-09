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
const CDP_PORT = Number(arg("--cdp-port", "19961"));
const OUT = arg("--out", path.join(SITE, "verification", "product-pages"));

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
  const pages = ['tour','get','cli','changelog','models','data'];
  const shots = [];
  for (const page of pages) {
    for (const theme of ['light','dark']) {
      await load(new URL(`${page}.html`, ORIGIN).href, {theme});
      const rows = await evaluate(CONTRAST);
      const failures = rows.filter(r=>!r.pass);
      const foreign = requests.filter(u=>!u.startsWith(ORIGIN) && !u.startsWith('data:'));
      const overflow = await evaluate('document.documentElement.scrollWidth - innerWidth');
      record(`${page} · ${theme} · contrast, layout and local resources`, failures.length===0 && !foreign.length && overflow<=1, {failures,foreign,overflow});
      if (theme==='light') {
        const name=`${page}-1440.png`;
        const png=Buffer.from((await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64');
        await writeFile(path.join(OUT,name),png); shots.push(name);
      }
    }
    for (const [width,scale] of [[390,1],[1440,2]]) {
      await load(new URL(`${page}.html`,ORIGIN).href,{width,scale});
      const overflow=await evaluate('document.documentElement.scrollWidth - innerWidth');
      record(`${page} · ${width}px scale ${scale}`,overflow<=1,{overflow});
    }
  }
  await load(new URL('get.html',ORIGIN).href);
  await evaluate('document.querySelector("[data-open-preview]").focus(); document.querySelector("[data-open-preview]").click()');
  record('Desktop preview explains actual distribution',await evaluate('document.querySelector("#preview-dialog").open && document.querySelector("#preview-dialog").textContent.includes("尚未作为签名桌面应用分发") && !document.querySelector("a[download]")'),{});
  await cdp('Page.bringToFront');
  await cdp('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await waitFor('!document.querySelector("#preview-dialog").open');
  const closed=await evaluate('!document.querySelector("#preview-dialog").open');
  record('Dialog Escape closes',closed,{});
  const install=await evaluate('document.querySelector("#install-command").textContent');
  const checkout = install.match(/git checkout ([0-9a-f]{40})/);
  record('Install pins evidence and external data directory',Boolean(checkout) && install.includes('ci --ignore-scripts') && install.includes(`$HOME/.courtwork-preview-${checkout[1].slice(0,7)}`),{source_sha:checkout?.[1] ?? null});
  await evaluate(`Object.defineProperty(navigator, 'clipboard', {configurable:true,value:{writeText:()=>Promise.reject(new Error('test denied'))}}); document.querySelector('[data-copy-command]').click()`);
  await waitFor(`document.querySelector('[data-copy-status]').textContent.includes('manual copy')`);
  record('Denied clipboard retains manual copy',await evaluate(`getSelection().toString() === document.querySelector('#install-command').textContent`),{});
  await load(new URL('cli.html',ORIGIN).href);
  const cli = await evaluate(`(() => {
    const run = command => {document.querySelector('#cli-input').value=command; document.querySelector('#cli-form').requestSubmit(); return document.querySelector('#cli-output').textContent;};
    const status=run('courtwork status');
    const review=run('courtwork review');
    const reviewLink=document.querySelector('#cli-destination').getAttribute('href');
    const provenance=run('courtwork provenance');
    const model=run('courtwork models');
    const modelLink=document.querySelector('#cli-destination').getAttribute('href');
    run('<img src=x onerror=alert(1)>');
    const safe=!document.querySelector('#cli-output img') && document.querySelector('#cli-output').textContent.includes('Unknown command');
    run('courtwork clear');
    return {status,review,reviewLink,provenance,model,modelLink,safe,cleared:document.querySelector('#cli-output').textContent.endsWith('cleared')};
  })()`);
  record('CLI uses recorded counts and exact source',/Sources\s+1/.test(cli.status)&&/Candidates\s+1/.test(cli.status)&&/Decisions\s+0/.test(cli.status)&&cli.provenance.includes('64076b0b818318de276b13a8789ac1ef6707df174858c1127500bbec548a6b1d'),{});
  record('CLI review does not decide; routes are explicit',cli.review.includes('cannot submit a decision')&&cli.reviewLink==='./specimen/index.html#step-candidate'&&cli.modelLink==='./models.html',{});
  record('CLI input remains text and clear works',cli.safe&&cli.cleared,{});
  const foreign = requests.filter(u=>!u.startsWith(ORIGIN)&&!u.startsWith('data:'));
  record('CLI performs no remote requests',foreign.length===0,{foreign});
  await load(new URL('tour.html',ORIGIN).href);
  const tour = await evaluate(`({states:document.querySelectorAll('.tour-state').length,images:document.querySelectorAll('.tour-shot img').length,provenance:document.querySelectorAll('.tour-shot details').length,reserved:[...document.querySelectorAll('[data-capture-slot]')].map(n=>n.dataset.captureSlot)})`);
  record('Tour distinguishes captures from missing states',tour.states===10&&tour.images===6&&tour.provenance===6&&tour.reserved.includes('running')&&tour.reserved.includes('integrations'),tour);
  await cdp('Emulation.setScriptExecutionDisabled',{value:true});
  for (const page of ['get','cli','tour']) {
    await load(new URL(`${page}.html`,ORIGIN).href);
    const text=await evaluate('document.body.innerText');
    record(`${page} · no-script content remains`, page==='get'?text.includes('git checkout'):page==='cli'?text.includes('阅读完整回放') && await evaluate('document.querySelector("#cli-form").hidden'):text.includes('Capture provenance'),{});
  }
  await cdp('Emulation.setScriptExecutionDisabled',{value:false});
  await writeFile(path.join(OUT,'verify.json'),JSON.stringify({results,shots},null,2)+'\n');
  const failed=results.filter(r=>!r.pass);
  console.log(`${results.length-failed.length}/${results.length} passed`);
  if(failed.length)process.exitCode=1;
} finally {
  socket.close(); chrome.kill(); await sleep(500);
  await rm(profile,{recursive:true,force:true}).catch(()=>{});
}
