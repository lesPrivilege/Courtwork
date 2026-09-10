import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:19247";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.WK6_CDP_PORT ?? 21247);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk6-interaction-"));
const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--window-size=1440,900", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 80 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { child.kill(); throw new Error("headless browser did not open a debugging port"); }
const observations = { responses: [], exceptions: [] };
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Network.responseReceived") { const r=message.params.response; observations.responses.push({url:r.url,status:r.status,mime:r.mimeType}); }
  if (message.method === "Runtime.exceptionThrown") observations.exceptions.push(message.params.exceptionDetails);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}, sid) => new Promise((resolve, reject) => {
  const id = ++messageId; pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Input.enable").catch(() => {});
async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
  return result.value;
}

try {
  await cdp("Page.navigate", {url: ORIGIN + "/styles.css"});
  await new Promise(r => setTimeout(r, 300));
  await evaluate(`document.head.innerHTML='<link rel="stylesheet" href="/styles.css">'; document.body.innerHTML='<span class="home-attention-state is-review">Needs you</span><span class="attention-detail-state is-review">Needs you</span><span class="home-attention-state">Resolved</span>';`);
  await new Promise(r => setTimeout(r, 300));
  const results=[];
  for (const system of ['light','dark']) {
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:system}]});
    for (const theme of ['light','dark','system']) for(const skin of ['slate','gray-steel','custom']) {
      results.push(await evaluate(`(() => {
        const root=document.documentElement; root.dataset.theme=${JSON.stringify(theme)}; root.dataset.skin=${JSON.stringify(skin)};
        let custom=document.getElementById('custom'); if(!custom){custom=document.createElement('style');custom.id='custom';document.head.append(custom);}
        custom.textContent=${JSON.stringify(skin==='custom' ? ':root { --accent-11: #0055ff; --paper: #ffffff; --float-s: #ffffff; }' : '')};
        return {system:${JSON.stringify(system)},theme:${JSON.stringify(theme)},skin:${JSON.stringify(skin)}, colors:[...document.querySelectorAll('span')].map(x=>getComputedStyle(x).color)};
      })()`));
    }
  }
  for(const r of results){const dark=r.theme==='dark'||r.theme==='system'&&r.system==='dark';const expected=dark?'rgb(239, 170, 164)':'rgb(174, 54, 48)';if(r.colors[0]!==expected||r.colors[1]!==expected||r.colors[2]===expected)throw Error(JSON.stringify(r));}
  const warning=await evaluate(`(async()=>{
    document.documentElement.dataset.theme='light';document.documentElement.dataset.skin='slate';document.getElementById('custom').textContent='';
    const {skinContrastWarnings}=await import('/settings-view.mjs');
    const before=document.documentElement.outerHTML;
    const warnings=skinContrastWarnings({'--paper':'#ae3630','--float-s':'#ae3630'}).filter(x=>x.foreground==='attention-review');
    if(warnings.length!==2||warnings.some(x=>x.ratio!==1))throw Error(JSON.stringify(warnings));
    return {warnings,probeRemoved:!document.querySelector('.skin-contrast-probe'),rootUnchanged:before===document.documentElement.outerHTML};
  })()`);
  if(!warning.probeRemoved||!warning.rootUnchanged)throw Error('probe leaked');
  console.log(JSON.stringify({pass:true,scenarios:results,warning},null,2));
} finally { socket.close(); child.kill(); await new Promise(r=>child.once('exit',r)); await rm(profile,{recursive:true,force:true}); }
