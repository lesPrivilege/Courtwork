// WK6 capture: drives a headless Chromium over CDP with Node's built-in
// WebSocket. No package is installed and no project dependency is added; the
// browser binary is whatever CHROME_BIN points at.
import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const BASE = process.env.WK6_BASE ?? "http://127.0.0.1:8853/";
const OUT = new URL("./", import.meta.url).pathname;
const CHROME = process.env.CHROME_BIN ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK6_CDP_PORT ?? 9333);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const profile = await mkdtemp(path.join(tmpdir(), "wk6-chrome-"));
const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--force-color-profile=srgb", "--window-size=1440,900", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });

let version = null;
for (let i = 0; i < 80 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { child.kill(); throw new Error("headless browser did not open a debugging port"); }

const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++messageId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const call = (method, params) => send(method, params, sessionId);
await call("Page.enable");
await call("Runtime.enable");

async function shot({ name, width, height, reduced = false, before = null, probe = null }) {
  await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile: false });
  await call("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" },
    ],
  });
  await call("Page.navigate", { url: BASE });
  await sleep(2200);
  if (before) { await call("Runtime.evaluate", { expression: before, awaitPromise: true }); await sleep(700); }
  const { data } = await call("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  const { result } = await call("Runtime.evaluate", {
    expression: probe ?? process.env.WK6_PROBE ?? "1",
    returnByValue: true,
    awaitPromise: true,
  });
  return result.value;
}

const shots = JSON.parse(process.env.WK6_SHOTS ?? "[]");
const report = {};
for (const spec of shots) report[spec.name] = await shot(spec);
console.log(JSON.stringify(report, null, 1));
socket.close();
child.kill();
await rm(profile, { recursive: true, force: true });
