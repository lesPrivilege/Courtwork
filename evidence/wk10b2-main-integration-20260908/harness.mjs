/* WO-WK10b 第二段 · the CDP harness (copied from wk10b-1) the earlier rounds used (evidence/wk6,
 * evidence/wk10a-r2, evidence/final-integration-20260908), copied here so this
 * round's checks run against its own server and its own CDP port and never
 * disturb another round's evidence.
 *
 *   WK10B2_BASE=http://127.0.0.1:8874 WK10B2_CDP_PORT=19660 node <script>
 */
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const ORIGIN = process.env.WK10B2_BASE ?? "http://127.0.0.1:8874";
const CHROME =
  process.env.CHROME_BIN ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK10B2_CDP_PORT ?? 19660);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk10b2-"));
const child = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-color-profile=srgb",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] },
);
let version = null;
for (let i = 0; i < 80 && !version; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  } catch {
    await sleep(150);
  }
}
if (!version) {
  child.kill();
  throw new Error("headless browser did not open a debugging port");
}
export const observations = { responses: [], exceptions: [] };
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  socket.onopen = res;
  socket.onerror = rej;
});
let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Network.responseReceived")
    observations.responses.push({
      url: message.params.response.url,
      status: message.params.response.status,
    });
  if (message.method === "Runtime.exceptionThrown")
    observations.exceptions.push(
      message.params.exceptionDetails?.exception?.description ||
        message.params.exceptionDetails?.text,
    );
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? reject(new Error(JSON.stringify(message.error)))
      : resolve(message.result);
  }
};
const send = (method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
});
export const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Input.enable").catch(() => {});
export async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails)
    throw new Error(
      exceptionDetails.text +
        " " +
        (exceptionDetails.exception?.description ?? ""),
    );
  return result.value;
}
export async function waitFor(expression, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await evaluate(expression);
    if (value) return value;
    await sleep(120);
  }
  throw new Error("Timed out: " + expression);
}
export async function viewport(width, height, mobile = false) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}
export async function close() {
  socket.close();
  child.kill();
}
