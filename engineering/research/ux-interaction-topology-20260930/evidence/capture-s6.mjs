// S6 visual evidence · the renamable header title, Edit and resend under a
// failed run, Compact in the context readout, Save beside Use for new runs,
// the Remove key question, and the Runtimes group; 1440×900 and 390×844, light
// and dark, CJK and mixed names.
//
//   node engineering/research/ux-interaction-topology-20260930/evidence/capture-s6.mjs [--data-dir <dir>]
//
// Harness: harness.mjs. A synthetic key on the disposable Host only; the local
// fake provider answers; no model call leaves the machine. Author evidence.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep } from "./harness.mjs";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "captures-s6");
const h = await openHarness({ outDir: OUT_DIR, prefix: "cw-ux-topology-s6-" });
const { call, until, evaluate, waitFor, click, closeAll, variant, shot } = h;

const lease = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "租约审阅 Harborview" }) })).project.id;
const failedTitle = "续期条款核对 · Lease renewal";
const failed = (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId: lease, title: failedTitle }) })).session.id;
const settled = async (sessionId, input) => {
  const run = (await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input, commandId: crypto.randomUUID() }) })).run;
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
};
await settled(failed, "请核对租约的续期窗口，并列出通知期限。");
await settled(failed, "/fixture error");
// A keyed custom connection on the local fake endpoint, put in force through the Host.
const custom = (await call("/provider-connections", { method: "POST", body: JSON.stringify({ api: "openai-completions", baseUrl: h.host.fakeProvider.baseUrl, models: [{ id: "fake-model" }], apiKey: "synthetic-capture-key-not-a-secret" }) })).connection;
const current = await call("/provider-config");
await call("/provider-config", { method: "PUT", body: JSON.stringify({ provider: custom.providerIdentity, model: "fake-model", api: "openai-completions", expectedVersion: current.version }) });

const report = { scenes: [], errors: [] };
const railRow = (title) => `[...document.querySelectorAll('.session-button')].find((b) => b.textContent.includes(${JSON.stringify(title)}))`;
await h.cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await h.cdp("Page.navigate", { url: `${h.origin}/` });
await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.session-button').length > 0`, "the rail");
await sleep(600);
async function toChat() {
  await evaluate(`(location.hash = '', true)`);
  await sleep(200);
  await evaluate(`(${railRow("续期条款核对")}?.click(), true)`);
  await waitFor(`!document.getElementById('composer-area').hidden && Boolean(document.querySelector('.run-resend'))`, "the failed run");
}
async function toModels() {
  await evaluate(`(location.hash = '#settings/models', true)`);
  await waitFor(`Boolean([...document.querySelectorAll('#settings-models button')].find((b) => b.textContent === 'Use for new runs'))`, "Settings › Models");
  await evaluate(`(document.querySelector('[data-focus-key="connection:configure:${custom.id}"]')?.click(), true)`);
  await sleep(300);
}
const scenes = [
  ["chat-failed", async () => { await toChat(); await evaluate(`(document.getElementById('session-title-rename').focus(), true)`); }],
  ["context", async () => {
    await toChat();
    await click(".context-capacity-button");
    await waitFor(`Boolean([...document.querySelectorAll('.chat-measurement-popover button')].find((b) => b.textContent === 'Compact'))`, "Compact");
    await sleep(300);
  }],
  ["models", async () => {
    await toModels();
    await evaluate(`([...document.querySelectorAll('#settings-models button')].find((b) => b.textContent === 'Use for new runs')?.scrollIntoView({ block: 'center' }), true)`);
  }],
  ["remove-key", async () => {
    await toModels();
    await evaluate(`(document.querySelector('#settings-models button[aria-label="Remove saved key"]')?.click(), true)`);
    await waitFor(`!document.querySelector('[aria-label="Confirm removing the key"]')?.hidden`, "the question");
    await evaluate(`(document.querySelector('[aria-label="Confirm removing the key"]').scrollIntoView({ block: 'center' }), true)`);
  }],
  ["runtimes", async () => {
    await evaluate(`(location.hash = '#settings/agents', true)`);
    await waitFor(`!document.getElementById('settings-agents')?.hidden`, "Runtimes");
    await sleep(400);
  }],
];
for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const scheme of ["light", "dark"]) {
    await variant(width, height, scheme);
    for (const [scene, act] of scenes) {
      const name = `${scene}-${width}-${scheme}`;
      try {
        await closeAll();
        await act();
        await shot(name);
        report.scenes.push({ name, header: await evaluate(`({ renameShown: !document.getElementById('session-title-rename').hidden, name: document.getElementById('session-title-rename').getAttribute('aria-label') })`),
          compact: await evaluate(`[...document.querySelectorAll('.chat-measurement-popover .chat-measurement-compact')].map((n) => n.textContent)[0] ?? null`) });
      } catch (error) {
        report.errors.push({ name, error: String(error?.message || error) });
      }
    }
  }
}
await h.writeReport(report);
console.log(JSON.stringify({ scenes: report.scenes.length, errors: report.errors }, null, 2));
await h.close();
