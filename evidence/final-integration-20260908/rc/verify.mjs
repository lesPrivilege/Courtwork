/* WO-RC · runs every in-page suite against the real app and writes the results.
 *
 *   node evidence/rc/verify.mjs           # app on 8850, MCP fixture on 8851
 *
 * The suites themselves (runtime-ui-checks / -counterexamples / -viewport) are
 * plain page scripts; this file only supplies a browser, the emulated media and
 * the file writing, so the same assertions can also be pasted into a real
 * browser by hand.
 */
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.RC_CDP_PORT || 19644);
const APP = process.env.RC_APP || "http://127.0.0.1:8850/";
const OUT = path.dirname(new URL(import.meta.url).pathname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  "--user-data-dir=/private/tmp/cw-final-integration-rc-chrome",
  "--no-first-run",
  "--hide-scrollbars",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

async function open(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const target = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
          method: "PUT",
        })
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

const source = async (name) => readFile(path.join(OUT, name), "utf8");
// A fresh profile lands on Home with the project group collapsed; the suites
// expect an open session, so the Continue row is clicked first.
const OPEN_SESSION = `
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  if (!document.querySelector('.session-button.active')) {
    (document.querySelector('.home-row') || document.querySelector('.session-button'))?.click();
    await wait(1800);
  }
  return document.querySelector('.session-button.active') ? 'ok' : 'no session';
`;

async function run(viewport, media, file, call) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 768,
  });
  await cdp.send("Emulation.setEmulatedMedia", { features: media });
  await cdp.send("Page.navigate", { url: APP });
  await sleep(2500);
  const opened = await cdp.send("Runtime.evaluate", {
    expression: `(async () => {${OPEN_SESSION}})()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (opened.result.value !== "ok") throw new Error(`session did not open: ${JSON.stringify(opened)}`);
  const script = await source(file);
  const result = await cdp.send("Runtime.evaluate", {
    expression: `(async () => { ${script}\n; return await ${call}; })()`,
    awaitPromise: true,
    returnByValue: true,
    timeout: 180000,
  });
  if (result.exceptionDetails)
    throw new Error(`${file}: ${JSON.stringify(result.exceptionDetails).slice(0, 400)}`);
  return result.result.value;
}

const light = [{ name: "prefers-color-scheme", value: "light" }];
const dark = [{ name: "prefers-color-scheme", value: "dark" }];
const reduced = [
  { name: "prefers-color-scheme", value: "light" },
  { name: "prefers-reduced-motion", value: "reduce" },
];

const contract = await run({ width: 1440, height: 900 }, light, "runtime-ui-checks.mjs", "runChecks()");
await writeFile(
  path.join(OUT, "runtime-ui-checks.json"),
  JSON.stringify(
    { app: APP, viewport: "1440x900", media: "light", results: contract.results },
    null,
    2,
  ),
);

if (process.env.RC_ONLY === "contract") {
  console.log(JSON.stringify({ contract: `${contract.results.filter(r => r.pass).length}/${contract.results.length}`, failures: contract.results.filter(r => !r.pass) }, null, 2));
  cdp.close(); chrome.kill(); process.exit(contract.results.every(r => r.pass) ? 0 : 1);
}

const counter = await run(
  { width: 1440, height: 900 },
  light,
  "runtime-ui-counterexamples.mjs",
  "runCounterexamples()",
);
await writeFile(
  path.join(OUT, "runtime-ui-counterexamples.json"),
  JSON.stringify(
    { app: APP, viewport: "1440x900", media: "light", results: counter.results },
    null,
    2,
  ),
);

const viewport = [];
for (const [label, size, media, mediaName] of [
  ["1440", { width: 1440, height: 900 }, light, "light"],
  ["1440", { width: 1440, height: 900 }, dark, "dark"],
  ["1440", { width: 1440, height: 900 }, reduced, "light + reduced motion"],
  ["390", { width: 390, height: 844 }, light, "light"],
  ["390", { width: 390, height: 844 }, dark, "dark"],
  ["390", { width: 390, height: 844 }, reduced, "light + reduced motion"],
]) {
  const rows = await run(size, media, "runtime-ui-viewport.mjs", `runViewportChecks(${JSON.stringify(label)})`);
  viewport.push(...rows.map((row) => ({ ...row, media: mediaName })));
}
await writeFile(
  path.join(OUT, "runtime-ui-viewport.json"),
  JSON.stringify({ app: APP, results: viewport }, null, 2),
);

const all = [...contract.results, ...counter.results, ...viewport];
console.log(
  JSON.stringify(
    {
      contract: `${contract.results.filter((r) => r.pass).length}/${contract.results.length}`,
      counterexamples: `${counter.results.filter((r) => r.pass).length}/${counter.results.length}`,
      viewport: `${viewport.filter((r) => r.pass).length}/${viewport.length}`,
      failures: all.filter((r) => !r.pass),
    },
    null,
    2,
  ),
);
cdp.close();
chrome.kill();
process.exit(all.every((r) => r.pass) ? 0 : 1);
