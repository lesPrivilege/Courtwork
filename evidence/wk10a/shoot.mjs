/* WO-WK10a · screenshots of the three states this work order changed, at 1440
 * and 390, in both schemes. Same CDP harness as dom-assertions.mjs; every state
 * is reached through the product's own controls.
 *
 *   WK10A_BASE=http://127.0.0.1:8855 node evidence/wk10a/shoot.mjs
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.WK10A_BASE ?? "http://127.0.0.1:8855";
const CHROME =
  process.env.CHROME_BIN ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK10A_CDP_PORT ?? 9342);
const OUT = new URL("./", import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk10a-shoot-"));
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
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  socket.onopen = res;
  socket.onerror = rej;
});
let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
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
const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable");
await cdp("Runtime.enable");
const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text);
  return result.value;
};
const shoot = async (name) => {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(name);
};
const openSession = () =>
  evaluate(`(async () => {
    if (!document.querySelector('#project-list .session-button')) {
      document.querySelector('#project-list .project-toggle')?.click();
      await new Promise(r => setTimeout(r, 600));
    }
    document.querySelector('#project-list .session-button')?.click();
    await new Promise(r => setTimeout(r, 1600));
  })()`);

/* One run through the product's own composer, so the Run module has facts.
 * The host reports capabilities.mode = "local-fake"; no real provider is used. */
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
await evaluate(`(async () => {
  if (document.querySelectorAll('#message-stream .message-row, #message-stream > *').length > 1) return;
  const input = document.getElementById('composer-input');
  input.value = 'Rebuild the exhibit index from the materials folder.';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  document.getElementById('composer-form').requestSubmit();
  await new Promise(r => setTimeout(r, 6000));
})()`);

for (const [scheme, media] of [
  ["light", []],
  ["dark", [{ name: "prefers-color-scheme", value: "dark" }]],
]) {
  for (const [label, width, height] of [
    ["1440", 1440, 900],
    ["390", 390, 844],
  ]) {
    await cdp("Emulation.setEmulatedMedia", { features: media });
    await cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await cdp("Page.navigate", { url: `${ORIGIN}/` });
    await sleep(2600);
    await shoot(`home-${label}-${scheme}`);
    await openSession();
    await evaluate(`(async () => {
      const inspect = [...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '') === 'Inspect this run');
      if (inspect) { inspect.click(); await new Promise(r => setTimeout(r, 1500));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      } else { document.getElementById('show-surface-button').click(); }
      await new Promise(r => setTimeout(r, 1400));
    })()`);
    await shoot(`session-collapsed-${label}-${scheme}`);
    await evaluate(`(async () => {
      document.querySelector('[data-module="preview"] .rail-open')?.click();
      await new Promise(r => setTimeout(r, 1400));
    })()`);
    await shoot(`session-expanded-${label}-${scheme}`);
  }
}

/* Reduced motion, once: no residue, no animation left running. */
await cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.navigate", { url: `${ORIGIN}/` });

await sleep(2600);
await openSession();
await evaluate(
  `(async () => { document.getElementById('show-surface-button').click(); await new Promise(r => setTimeout(r, 1400)); })()`,
);
const motion = await evaluate(`(() => {
  const running = [...document.querySelectorAll('*')]
    .filter(n => n.getAnimations && n.getAnimations().some(a => a.playState === 'running'))
    .map(n => n.id || n.className);
  return { running, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
})()`);
console.log("reduced motion:", JSON.stringify(motion));
await shoot("session-collapsed-1440-reduced-motion");

socket.close();
child.kill();
