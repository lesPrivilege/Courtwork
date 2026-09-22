/* 06E-R1 browser recheck, alternative A only. Same driver and host as
 * harness/capture.mjs; real CDP keys. Writes PNGs + record.json.
 *   node r1/capture.mjs --out <dir> --profile <scratch> [--port 8966] [--cdp 9366] */
import { parseArgs } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { launch } from "../../../../execution/claude-frontend-harness-2026-09-16/evidence/composer-entry-20260921/harness/cdp.mjs";
import { startRoleComposerSpecimen } from "../../specimen/serve.mjs";

const { values } = parseArgs({ options: { out: { type: "string" }, profile: { type: "string" }, port: { type: "string", default: "8966" }, cdp: { type: "string", default: "9366" } } });
await mkdir(values.out, { recursive: true });
const host = await startRoleComposerSpecimen({ port: Number(values.port) });
const page = await launch({ port: Number(values.cdp), profileRoot: values.profile });
const out = (n) => path.join(values.out, n);
const KEYS = { Enter: [13, "\r"], Escape: [27], Tab: [9], End: [35] };
async function key(name) {
  const [code, text] = KEYS[name];
  const common = { key: name, code: name, windowsVirtualKeyCode: code };
  await page.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", ...common, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
  await page.wait(80);
}
const ev = (e) => page.eval(e);
const until = async (e, label) => { const end = Date.now() + 8000; for (;;) { if (await ev(`return Boolean(${e});`)) return; if (Date.now() > end) throw new Error(`timed out: ${label}`); await page.wait(40); } };
const ready = () => until(`window.__specimen?.controller.getState().next?.readingStatus === "ready"`, "ready");
const facts = () => ev(`const q=(s)=>document.querySelector(s); const t=q("#composer-input"); return {
  focus: document.activeElement?.getAttribute("data-testid") || document.activeElement?.tagName,
  chip: q('[data-testid="agent-chip"]').innerText.trim(), notice: q("#composer-notice").hidden ? null : q("#composer-notice").textContent,
  kits: q('[data-reading="kits"]')?.textContent ?? null, send: { disabled: q("#send-button").disabled },
  draft: { value: t.value, start: t.selectionStart, end: t.selectionEnd }, materials: [...document.querySelectorAll(".specimen-material")].map(n=>n.textContent),
  overflow: document.documentElement.scrollWidth - innerWidth };`);
const record = { url: host.url, steps: [] };
const step = async (name, extra = {}) => record.steps.push({ name, ...(await facts()), ...extra });
async function chooseAttention(scenario, shotName) {
  await page.goto(`${host.url}?alt=a&scenario=${scenario}`);
  await ready();
  await ev(`document.querySelector('[data-testid="agent-chip"]').focus(); return 1;`);
  await key("Enter"); await page.wait(200); await key("End"); await page.wait(300);
  await page.shot(out(`${shotName}-chooser.png`));
  await step(`${scenario}: Attention previewed in chooser`);
  await key("Enter"); await page.wait(300); await ready();
  await step(`${scenario}: Attention selected`);
  await page.shot(out(`${shotName}-selected.png`));
}
try {
  await page.viewport({ width: 1440, height: 900 });
  await chooseAttention("normal", "01-normal");
  await chooseAttention("kit-undeclared", "02-undeclared");
  // Settings reads the same pair the same way, then Escape returns.
  await ev(`document.querySelector('[data-testid="agent-chip"]').focus(); return 1;`);
  await key("Enter"); await page.wait(250); await key("Tab"); await key("Enter");
  await until(`document.querySelector('[data-testid="saved-revision"]')`, "settings");
  await page.wait(200);
  await step("kit-undeclared: Settings on Attention", { settingsKit: await ev(`return document.querySelector('[data-testid="kit-unchecked:kit-praxis"]')?.textContent ?? null`), settingsBlocker: await ev(`return document.querySelector('[data-testid="save-blocker"]')?.textContent ?? null`) });
  await page.shot(out("03-undeclared-settings.png"));
  await key("Escape"); await page.wait(300); await ready();
  await step("kit-undeclared: Escape back to the chat");
  await page.shot(out("04-undeclared-return.png"));
  await chooseAttention("kit-stale-evidence", "05-stale-evidence");
  await chooseAttention("kit-unsupported", "06-unsupported");
  await chooseAttention("bound-run", "07-bound-run");
} catch (error) { record.error = error.message; await page.shot(out("failure.png")).catch(() => {}); }
finally { await writeFile(out("record.json"), JSON.stringify(record, null, 2) + "\n"); await page.close(); await host.close(); }
if (record.error) { console.error(record.error); process.exit(1); }
console.log("ok");
