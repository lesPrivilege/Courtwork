/* WO-WK11 · same-condition screenshots, one per intent group, plus the ablation
 * pairs. Every shot is taken on the same session, the same snapshot revision and
 * the same viewport; an ablation shot removes exactly one element by a CSS rule
 * injected for that shot only, so the two images differ in one thing.
 *
 *   node .../wk11/shots.mjs           # app on 8883, CDP 19712
 */
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.WK11_CDP_PORT || 19712);
const APP = process.env.APP_URL || "http://127.0.0.1:8883/";
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), "shots");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/private/tmp/se-agent-wk11-chrome-shots",
  "--no-first-run",
  "--hide-scrollbars",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

async function open(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const target = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })
      ).json();
      if (target.webSocketDebuggerUrl) return target;
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
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
  return {
    ready,
    send(method, params = {}) {
      const messageId = ++id;
      ws.send(JSON.stringify({ id: messageId, method, params }));
      return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

const target = await open(APP);
const cdp = connect(target.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");

const evaluate = async (expression) => {
  const result = await cdp.send("Runtime.evaluate", {
    expression: `(async () => {${expression}})()`,
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 300));
  return result.result.value;
};

const OPEN = `
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  await wait(1500);
  const wanted = 'Runtime control';
  if (!(document.querySelector('.session-button.active')?.textContent || '').includes(wanted)) {
    [...document.querySelectorAll('.session-button, .home-row')]
      .find(n => (n.textContent || '').includes(wanted))?.click();
    await wait(2200);
  }
  location.hash = '#settings/runtime';
  await wait(2400);
  return document.getElementById('settings-runtime').hidden === false ? 'ok' : 'not open';
`;

async function shot(name, { width = 1440, height = 900, scheme = "light", ablate = null, before = "" } = {}) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: scheme }],
  });
  await cdp.send("Page.navigate", { url: APP });
  await sleep(2200);
  const opened = await evaluate(OPEN);
  if (opened !== "ok") throw new Error(`${name}: ${opened}`);
  if (ablate)
    await evaluate(`
      const style = document.createElement('style');
      style.id = 'wk11-ablation';
      style.textContent = ${JSON.stringify(ablate)};
      document.head.append(style);
      return 'ablated';
    `);
  if (before) await evaluate(before);
  await sleep(500);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  return name;
}

const scrollTo = (mount) => `
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  document.querySelector('[data-wk11-mount="${mount}"]').scrollIntoView({block:'start'});
  await wait(400);
  return 'scrolled';
`;

const written = [];
// One shot per intent group, same session, same revision, same viewport.
for (const mount of ["overview", "composition", "instructions-and-context", "capabilities-and-connections", "permissions-and-environment"])
  written.push(await shot(`group-${mount}`, { before: scrollTo(mount) }));

// The Inventory half of Capabilities, and the group in dark and at 390.
written.push(await shot("capabilities-inventory", {
  before: `
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    document.querySelector('[data-subtab="inventory"]').click();
    await wait(500);
    document.querySelector('[data-wk11-mount="capabilities-and-connections"]').scrollIntoView({block:'start'});
    await wait(400);
    return 'inventory';
  `,
}));
written.push(await shot("group-overview-dark", { scheme: "dark", before: scrollTo("overview") }));
written.push(await shot("group-overview-390", { width: 390, height: 844, before: scrollTo("overview") }));
written.push(await shot("group-permissions-390", { width: 390, height: 844, before: scrollTo("permissions-and-environment") }));

// The four layers of one item, open.
const openRow = `
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const row = document.querySelector('[data-resource="tool:ws_write"]');
  row.querySelector('.runtime-row-title').click();
  await wait(600);
  document.querySelector('[data-resource="tool:ws_write"]').scrollIntoView({block:'start'});
  await wait(400);
  return 'open';
`;
written.push(await shot("layers-open", { before: openRow }));

/* ---- ablations: one element removed, everything else identical -------- */
const ablations = [
  ["ablate-layers", ".runtime-layers, [data-layers] { display: none !important; }", openRow],
  ["ablate-attention", ".runtime-attention { display: none !important; }", scrollTo("overview")],
  ["ablate-admission-tags", ".runtime-row-tag[data-admission] { display: none !important; }", scrollTo("instructions-and-context")],
  ["ablate-context-inspector", "[data-inspector='context'] { display: none !important; }", scrollTo("instructions-and-context")],
  ["ablate-provenance", ".runtime-provenance { display: none !important; }", scrollTo("capabilities-and-connections")],
  ["ablate-dimensions", ".runtime-dimensions { display: none !important; }", scrollTo("capabilities-and-connections")],
  ["ablate-inventory-tab", ".runtime-subtabs { display: none !important; }", scrollTo("capabilities-and-connections")],
  ["ablate-other-layers", ".runtime-policy .runtime-detail-block { display: none !important; }", scrollTo("permissions-and-environment")],
  ["ablate-planned", "[data-kind='unsupported'] { display: none !important; }", scrollTo("instructions-and-context")],
  ["ablate-bindings", ".runtime-bindings { display: none !important; }", scrollTo("overview")],
  ["ablate-kind-chips", ".runtime-chips { display: none !important; }", scrollTo("instructions-and-context")],
];
for (const [name, css, before] of ablations) written.push(await shot(name, { ablate: css, before }));

console.log(JSON.stringify({ app: APP, shots: written }, null, 2));
cdp.close();
chrome.kill();
