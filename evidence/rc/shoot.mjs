/* WO-RC · screenshot capture. Drives the real app in headless Chrome over CDP
 * and writes PNGs beside this file. The same page and the same controls the
 * Browser pane checks used; only the capture is automated. */
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;
const APP = process.env.RC_APP || "http://127.0.0.1:8850/";
const OUT = path.dirname(new URL(import.meta.url).pathname);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/private/tmp/rc-chrome-profile",
  "--no-first-run",
  "--hide-scrollbars",
  "--force-device-scale-factor=2",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

async function target(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
      if (list.webSocketDebuggerUrl) return list;
    } catch {
      await sleep(250);
    }
  }
  throw new Error("chrome did not start");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  const ready = new Promise((resolve) => ws.addEventListener("open", resolve));
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });
  return {
    ready,
    send(method, params = {}) {
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) =>
        pending.set(messageId, { resolve, reject }),
      );
    },
    close: () => ws.close(),
  };
}

const shots = [
  { name: "runtime-module-1440-light", width: 1440, height: 900, dark: false, view: "runtime" },
  { name: "runtime-module-1440-dark", width: 1440, height: 900, dark: true, view: "runtime" },
  { name: "runtime-module-390-light", width: 390, height: 844, dark: false, view: "runtime" },
  { name: "runtime-module-390-dark", width: 390, height: 844, dark: true, view: "runtime" },
  { name: "runtime-mcp-1440-light", width: 1440, height: 900, dark: false, view: "mcp" },
  { name: "settings-context-1440-light", width: 1440, height: 900, dark: false, view: "settings" },
  { name: "settings-context-1440-dark", width: 1440, height: 900, dark: true, view: "settings" },
  { name: "settings-context-390-light", width: 390, height: 844, dark: false, view: "settings" },
  { name: "settings-context-390-dark", width: 390, height: 844, dark: true, view: "settings" },
  { name: "settings-planned-1440-light", width: 1440, height: 900, dark: false, view: "planned" },
  { name: "run-recorded-context-1440-light", width: 1440, height: 900, dark: false, view: "run" },
];

// A fresh browser profile starts on Home with the project group collapsed, so
// the session is opened through the Continue row the product itself offers.
const openSession = `
    const wait = (ms) => new Promise(r=>setTimeout(r,ms));
    if (!document.querySelector('.session-button.active')) {
      const row = document.querySelector('.home-row');
      if (row) row.click();
      else document.querySelector('.session-button')?.click();
    }
    await wait(1600);
    if (!document.querySelector('.session-button.active'))
      throw new Error('no session opened');
`;
const scripts = {
  runtime: `
${openSession}
    document.getElementById('surface-runtime-tab').click();
    await new Promise(r=>setTimeout(r,1500));
    'ok'`,
  mcp: `
${openSession}
    document.getElementById('surface-runtime-tab').click();
    await new Promise(r=>setTimeout(r,1500));
    const row = document.querySelector(".runtime-row[data-kind='mcp_server']");
    row.scrollIntoView({block:'start'});
    await new Promise(r=>setTimeout(r,400));
    'ok'`,
  settings: `
${openSession}
    document.getElementById('runtime-setup-button').click();
    await new Promise(r=>setTimeout(r,1400));
    document.getElementById('runtime-control-settings').scrollIntoView({block:'center'});
    await new Promise(r=>setTimeout(r,400));
    'ok'`,
  planned: `
${openSession}
    document.getElementById('runtime-setup-button').click();
    await new Promise(r=>setTimeout(r,1400));
    const d = document.getElementById('planned-capabilities').closest('details');
    d.open = true;
    await new Promise(r=>setTimeout(r,300));
    d.scrollIntoView({block:'center'});
    await new Promise(r=>setTimeout(r,400));
    'ok'`,
  run: `
${openSession}
    const inspect = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Inspect this run',
    );
    inspect?.click();
    await wait(2000);
    const section = document.querySelector("[data-section='runtime-context']");
    if (section) {
      section.open = true;
      await wait(400);
      section.scrollIntoView({ block: 'center' });
    }
    await wait(400);
    section ? 'ok' : 'no recorded-run section found'`,
};

const info = await target(APP);
const cdp = connect(info.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
const report = [];
for (const shot of shots) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: 2,
    mobile: shot.width < 768,
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: shot.dark ? "dark" : "light" }],
  });
  await cdp.send("Page.navigate", { url: APP });
  await sleep(2200);
  const result = await cdp.send("Runtime.evaluate", {
    expression: `(async () => {${scripts[shot.view]}})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  await sleep(500);
  const png = await cdp.send("Page.captureScreenshot", { format: "png" });
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `${shot.name}.png`), Buffer.from(png.data, "base64"));
  report.push({ name: shot.name, state: result.result?.value ?? result.result?.description });
}
console.log(JSON.stringify(report, null, 2));
cdp.close();
chrome.kill();
process.exit(0);
