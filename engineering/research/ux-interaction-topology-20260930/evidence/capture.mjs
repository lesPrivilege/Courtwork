// S2/S3 visual evidence · the model chooser, the file access card, the add-files
// popover and the chat overview at 1440×900 and 390×844, light and dark, with
// CJK and mixed fixture names (rulings.md, "Visual slices capture desktop and
// 390px, light and dark, with CJK fixture names").
//
// Harness: harness.mjs. A disposable data dir, the local fake provider and one
// synthetic DeepSeek key stored on that Host only; no model call is made.
//
//   node engineering/research/ux-interaction-topology-20260930/evidence/capture.mjs [--data-dir <dir>]
//
// Author evidence, not visual or accessibility acceptance.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep } from "./harness.mjs";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "captures");
const { origin: ORIGIN, call, until, cdp, evaluate, waitFor, click, open, closeAll, variant, shot, layout, popoverBox, close } = await openHarness({ outDir: OUT_DIR });

// Seed through the app's own API.
const projectId = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "租约审阅 Harborview" }) })).project.id;
await call("/projects", { method: "POST", body: JSON.stringify({ name: "证据整理" }) });
const chatTitle = "续期条款核对 · Lease renewal";
const sessionId = (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId, title: chatTitle }) })).session.id;
await call("/sessions", { method: "POST", body: JSON.stringify({ projectId, title: "合同红线（待确认）" }) });
{
  const run = (await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input: "请核对租约的续期窗口，并列出通知期限。", commandId: crypto.randomUUID() }) })).run;
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
}
const connections = (await call("/provider-connections")).connections;
const deepseek = connections.find((c) => c.providerIdentity === "deepseek" && c.kind === "catalog");
if (!deepseek) throw new Error("no DeepSeek catalogue connection");
await call("/provider-credential", { method: "PUT", body: JSON.stringify({ connectionId: deepseek.id, apiKey: "synthetic-capture-key-not-a-secret" }) });

const report = { origin: "disposable Host", chat: chatTitle, scenes: [], errors: [] };

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await waitFor(`document.readyState === 'complete' && document.querySelectorAll('.session-button').length > 0`, "the rail");
await sleep(800);
await waitFor(`(() => { const b = [...document.querySelectorAll('.session-button')].find((x) => x.textContent.includes(${JSON.stringify(chatTitle)})); b?.click(); return Boolean(b); })()`, "the chat row");
await waitFor(`!document.getElementById('composer-area').hidden && !document.getElementById('materials-button').hidden`, "the chat composer");

// Put DeepSeek Flash in force through the chooser, so the effort track shows a ladder.
await click("#model-settings-button");
await waitFor(`document.querySelectorAll('#model-popover [role=option]').length > 1`, "model rows");
await evaluate(`([...document.querySelectorAll('#model-popover [role=option]')].find((o) => /flash/i.test(o.textContent) && o.getAttribute('aria-disabled') !== 'true')?.click(), true)`);
await waitFor(`/Saved/.test(document.getElementById('model-popover').textContent)`, "the model save");
await closeAll();

// Add three files once; the refused one keeps the outcomes on reopen.
const pickFiles = `(() => {
  const input = document.querySelector('#chat-files-popover input[type=file]');
  const transfer = new DataTransfer();
  transfer.items.add(new File(['租约续期窗口：到期前 90 日书面通知。'], 'lease-summary.md', { type: 'text/markdown' }));
  transfer.items.add(new File(['Renewal notice: 90 days. 续期通知：90 日。'], 'Harborview 续期条款.md', { type: 'text/markdown' }));
  transfer.items.add(new File(['x'.repeat(1_100_000)], 'evidence-export.txt', { type: 'text/plain' }));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
})()`;
let filesAdded = false;

const scenes = [
  ["chat", async () => {}],
  ["s2-model-chooser", async () => {
    await click("#model-settings-button");
    await waitFor(`${open("model-popover")} && document.querySelectorAll('#model-popover [role=option]').length > 1`, "the chooser");
  }],
  ["s3-file-access-card", async () => {
    await click("#permission-settings-button");
    await waitFor(open("connection-popover"), "the file access card");
  }],
  ["s3-add-files", async () => {
    await click("#materials-button");
    await waitFor(open("chat-files-popover"), "the add-files popover");
    if (!filesAdded) {
      await evaluate(pickFiles);
      await waitFor(`/Saved \\d+ of 3/.test(document.getElementById('chat-files-popover').textContent)`, "the batch outcome");
      filesAdded = true;
    }
  }],
  ["s3-chat-overview", async () => {
    const shown = await evaluate(`!document.getElementById('show-run-button').hidden`);
    if (!shown) throw new Error("Chat overview button hidden");
    await click("#show-run-button");
    await waitFor(`[...document.querySelectorAll(':popover-open, [role=dialog]:not([hidden])')].some((n) => /File access/.test(n.textContent))`, "the overview's File access row");
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
        report.scenes.push({ name, popover: await popoverBox(), agent: await layout(".agent-chip"), paperclip: await layout("#materials-button"), access: await layout("#permission-settings-button"), model: await layout("#model-settings-button") });
      } catch (error) {
        report.errors.push({ name, error: String(error?.message || error) });
      }
    }
  }
}

// Home shares the composer controls: the narrow wrap must not split a row that fits.
await closeAll();
await click("#home-button");
await waitFor(`!document.getElementById('home-composer-context').hidden`, "the Home composer");
for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const scheme of ["light", "dark"]) {
    const name = `home-${width}-${scheme}`;
    try {
      await variant(width, height, scheme);
      await shot(name);
      report.scenes.push({ name, paperclip: await layout("#materials-button"), access: await layout("#home-permission-input"), model: await layout("#model-settings-button"), send: await layout("#send-button") });
    } catch (error) {
      report.errors.push({ name, error: String(error?.message || error) });
    }
  }
}

// Settings › Models, the unlisted model ID entry, at both widths in light and dark.
await closeAll();
await evaluate(`(location.hash = '#settings/models', true)`);
await waitFor(`Boolean(document.querySelector('details.model-id-entry'))`, "Settings › Models");
await evaluate(`(document.querySelector('details.model-id-entry').open = true, true)`);
for (const [width, height] of [[1440, 900], [390, 844]]) {
  for (const scheme of ["light", "dark"]) {
    const name = `s2-settings-model-id-${width}-${scheme}`;
    try {
      await variant(width, height, scheme);
      // Below the sticky section title: end-align the entry's last action so the rows above it stay in view.
      await evaluate(`([...document.querySelectorAll('details.model-id-entry button')].at(-1).scrollIntoView({ block: 'end' }), true)`);
      await shot(name);
      report.scenes.push({ name });
    } catch (error) {
      report.errors.push({ name, error: String(error?.message || error) });
    }
  }
}

await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ scenes: report.scenes.length, errors: report.errors }, null, 2));
await close();
