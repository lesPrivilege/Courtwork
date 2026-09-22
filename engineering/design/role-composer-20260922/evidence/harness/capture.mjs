/* Evidence harness only. Starts the read-only specimen host on a loopback port,
 * drives both alternatives in headless Chrome with a throwaway profile (the CDP
 * driver from the composer-entry packet, imported unchanged), and writes PNGs
 * plus one JSON record of focus, geometry and checks per alternative.
 *   node capture.mjs --out <dir> --profile <scratch> [--port 8964] [--cdp 9364]
 * Keys go through Input.dispatchKeyEvent (Enter/Space carry their text so
 * buttons activate). Viewport width, DPR and color scheme are emulated; that is
 * not native zoom, a screen reader or a coarse pointer. */
import { parseArgs } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { launch } from "../../../../execution/claude-frontend-harness-2026-09-16/evidence/composer-entry-20260921/harness/cdp.mjs";
import { startRoleComposerSpecimen } from "../../specimen/serve.mjs";

const { values } = parseArgs({ options: { out: { type: "string" }, profile: { type: "string" }, port: { type: "string", default: "8964" }, cdp: { type: "string", default: "9364" } } });
await mkdir(values.out, { recursive: true });
const host = await startRoleComposerSpecimen({ port: Number(values.port) });
const page = await launch({ port: Number(values.cdp), profileRoot: values.profile });
const out = (name) => path.join(values.out, name);
const records = {};
let record;

const KEYS = { Enter: [13, "\r"], Escape: [27], Tab: [9], ArrowDown: [40], ArrowUp: [38], Home: [36], End: [35], " ": [32, " "] };
async function key(name, { shift = false } = {}) {
  const [code, text] = KEYS[name];
  const common = { key: name, code: name === " " ? "Space" : name, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 };
  await page.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", ...common, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
  await page.wait(60);
}
const ev = (expression) => page.eval(expression);
const until = async (expression, label, timeout = 8000) => {
  const end = Date.now() + timeout;
  for (;;) {
    if (await ev(`return Boolean(${expression});`)) return;
    if (Date.now() > end) throw new Error(`timed out: ${label}`);
    await page.wait(40);
  }
};
const focus = () => ev(`const a = document.activeElement; if (!a || a === document.body) return "body"; return a.getAttribute("data-testid") || a.getAttribute("data-focus-key") || a.id || a.tagName;`);
const focusOn = (testid) => ev(`const n = document.querySelector('[data-testid="${testid}"]'); if (!n) throw new Error("missing ${testid}"); n.focus(); return true;`);
const draft = () => ev(`const t = document.getElementById("composer-input"); return { value: t.value, start: t.selectionStart, end: t.selectionEnd, materials: [...document.querySelectorAll(".specimen-material")].map(n => n.textContent) };`);
const composerFacts = () => ev(`
  const q = (s) => document.querySelector(s);
  const chip = q('[data-testid="agent-chip"]');
  return {
    chip: chip?.innerText.trim(), chipLabel: chip?.getAttribute("aria-label"),
    notice: q("#composer-notice")?.hidden ? null : q("#composer-notice")?.textContent,
    line: q('[data-testid="agent-line-summary"]')?.textContent ?? null,
    model: q('[data-testid="model-button"]')?.textContent,
    send: { disabled: q("#send-button").disabled, describedBy: q("#send-button").getAttribute("aria-describedby") || null },
    popoverOpen: q("#agent-popover").matches(":popover-open"),
  };`);
const checks = () => ev(`
  return {
    horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
    nullText: /\\bnull\\b|undefined/.test(document.body.innerText),
  };`);
/* Geometry of the composed Composer: the stacked heights, where the thread
   ends, the chip's box and its hit target (the chip's ::after extension is read
   from computed style), text and glyph sizes. */
const geometry = () => ev(`
  const r = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  const q = (s) => document.querySelector(s);
  const chip = q('[data-testid="agent-chip"]');
  const after = chip ? getComputedStyle(chip, "::after") : null;
  const ext = after && after.content !== "none" ? { top: parseFloat(after.top) || 0, bottom: parseFloat(after.bottom) || 0 } : { top: 0, bottom: 0 };
  const label = chip?.querySelector(".button-label");
  const glyph = chip?.querySelector(".ui-icon");
  const box = r(chip);
  return {
    viewport: { w: innerWidth, h: innerHeight },
    composerArea: r(q("#composer-area")), form: r(q("#composer-form")), field: r(q("#composer-input")),
    controls: r(q(".composer-controls")), line: r(q(".agent-line")), details: r(q(".agent-line-details:not([hidden])")),
    thread: r(q(".specimen-thread")),
    chip: box, chipTarget: box && { w: box.w, h: Math.round(box.h - ext.top - ext.bottom) },
    chipText: label && { size: getComputedStyle(label).fontSize, weight: getComputedStyle(label).fontWeight, lineHeight: getComputedStyle(label).lineHeight },
    chipGlyph: r(glyph),
    model: r(q('[data-testid="model-button"]')), send: r(q("#send-button")),
    popover: q("#agent-popover").matches(":popover-open") ? r(q("#agent-popover")) : null,
  };`);
async function step(name, extra = {}) {
  const entry = { name, focus: await focus(), composer: await composerFacts(), checks: await checks(), ...extra };
  record.steps.push(entry);
  return entry;
}
const shot = async (name) => { await page.wait(150); await page.shot(out(name)); };
async function visit(alt, { scenario = "normal", theme = "light", slow = false } = {}) {
  const params = new URLSearchParams({ alt, scenario, theme, ...(slow ? { slow: "1" } : {}) });
  await page.goto(`${host.url}?${params}`);
  if (!slow) await until(`window.__specimen && document.querySelector('[data-testid="agent-chip"]')?.getAttribute("aria-label") !== "Agent: Agent"`, `load ${alt}/${scenario}`);
}
const readyNext = () => until(`window.__specimen.controller.getState().next?.readingStatus === "ready"`, "reading ready");

async function journey(alt) {
  record = records[alt] = { alt, url: host.url, steps: [], geometry: {} };
  const p = `${alt}-`;
  /* ── Desktop light · the journey ──────────────────────────────────── */
  await page.viewport({ width: 1440, height: 900 });
  await visit(alt);
  await readyNext();
  record.draftAtStart = await draft();
  record.geometry.initialDesktop = await geometry();
  await step("1 initial choice (chat default)");
  await shot(`${p}01-initial-desktop-light.png`);

  await focusOn("agent-chip");
  await key("Enter");
  await page.wait(200);
  await step("2 chooser opened with Enter on the Agent control");
  record.geometry.chooserDesktop = await geometry();
  await shot(`${p}02-chooser-open.png`);

  await key("ArrowDown");
  await page.wait(250);
  await step("3 ArrowDown to Coding (A shows its reading before commit)");
  await shot(`${p}03-chooser-coding-active.png`);
  await key("Escape");
  await page.wait(150);
  await step("4 Escape closes without change");

  await key("Enter");
  await page.wait(200);
  await key("End");
  await page.wait(250);
  await key("Enter");
  await page.wait(300);
  await readyNext();
  await step("5 End + Enter commits Attention; focus back on the Agent control");
  record.geometry.afterAttention = await geometry();
  await shot(`${p}04-attention-selected.png`);

  await focusOn("model-button");
  await key("Enter");
  await page.wait(200);
  await step("6 model reading opened from the model control (runtime-owned)");
  await shot(`${p}05-model-reading-hermes.png`);
  await key("Escape");
  await page.wait(150);
  await step("7 Escape returns to the model control");

  if (alt === "b") {
    await focusOn("agent-details-toggle");
    await key("Enter");
    await page.wait(150);
    record.geometry.detailsOpen = await geometry();
    await step("8 Details disclosure opened (permission reading in place)");
    await shot(`${p}06-permission-reading.png`);
    await key("Enter");
    await page.wait(100);
  } else {
    await focusOn("agent-chip");
    await key("Enter");
    await page.wait(250);
    await step("8 chooser reopened; Attention reading is the permission reading");
    await shot(`${p}06-permission-reading.png`);
    await key("Escape");
    await page.wait(150);
  }

  /* Settings visit from the Agent's own entry. */
  if (alt === "a") {
    await focusOn("agent-chip");
    await key("Enter");
    await page.wait(250);
    await key("Tab");
    await step("9 Tab from the list reaches Edit in Settings");
    await key("Enter");
  } else {
    await focusOn("edit-in-settings");
    await key("Enter");
  }
  await until(`document.querySelector('[data-testid="saved-revision"]')`, "settings profile open");
  await page.wait(200);
  await step("10 Settings open on Attention; focus on Back to chat");
  await shot(`${p}07-settings-attention.png`);
  /* Change its runtime to Pi and save through the accepted 06a view. */
  await ev(`const s = document.querySelector('[data-testid="runtime-select"]'); s.value = "rt-pi"; s.dispatchEvent(new Event("change", { bubbles: true })); return true;`);
  await page.wait(150);
  await focusOn("save");
  await key("Enter");
  await until(`document.querySelector('[data-testid="save-receipt"]')?.textContent.includes("3")`, "save receipt r3");
  await step("11 saved revision 3 in Settings", { receipt: await ev(`return document.querySelector('[data-testid="save-receipt"]').textContent`) });
  await shot(`${p}08-settings-saved.png`);
  await focusOn("settings-back");
  await key("Escape");
  await page.wait(300);
  await readyNext();
  const back = await step("12 Escape returns to the chat", { draft: await draft() });
  record.draftUnchanged = JSON.stringify(back.draft) === JSON.stringify(record.draftAtStart);
  await shot(`${p}09-returned-draft-kept.png`);

  /* ── Scenarios at the same viewport ───────────────────────────────── */
  await visit(alt, { scenario: "bound-run" });
  await readyNext();
  await focusOn("agent-chip");
  await key("Enter");
  await page.wait(200);
  await key("End");
  await page.wait(250);
  await shot(`${p}10-bound-run-chooser.png`);
  await key("Enter");
  await page.wait(300);
  await readyNext();
  record.geometry.boundRun = await geometry();
  await step("13 run in flight on Coding r7; Attention proposed for a later run");
  await shot(`${p}11-bound-run-attention.png`);

  await visit(alt, { scenario: "runtime-unavailable" });
  await page.wait(400);
  record.geometry.unavailable = await geometry();
  await step("14 Pi unavailable: Work is blocked");
  await shot(`${p}12-runtime-unavailable.png`);

  await visit(alt, { scenario: "kit-incompatible" });
  await readyNext();
  await ev(`window.__specimen.controller.select("ap-attention"); return true;`);
  await page.wait(300);
  await step("15 Praxis 0.5 no longer declares Hermes: Attention is blocked");
  await shot(`${p}13-kit-incompatible.png`);

  await visit(alt, { scenario: "long-names" });
  await readyNext();
  record.geometry.longNames = await geometry();
  await step("16 long names");
  await shot(`${p}14-long-names.png`);
  await focusOn("agent-chip");
  await key("Enter");
  await page.wait(250);
  await shot(`${p}15-long-names-chooser.png`);
  await key("Escape");

  await visit(alt, { scenario: "list-error" });
  await page.wait(700);
  await step("17 agent list read failed");
  await shot(`${p}16-list-error.png`);
  await focusOn("notice-retry");
  await key("Enter");
  await readyNext();
  await step("18 Retry recovers the list and the default");

  await visit(alt, { slow: true });
  await page.wait(250);
  await step("19 loading (slow replies)");
  await shot(`${p}17-loading.png`);

  /* ── Narrow, dark ─────────────────────────────────────────────────── */
  await page.viewport({ width: 390, height: 844 });
  await visit(alt);
  await readyNext();
  record.geometry.initialNarrow = await geometry();
  await step("20 narrow 390 light");
  await shot(`${p}18-narrow-light.png`);
  await focusOn("agent-chip");
  await key("Enter");
  await page.wait(250);
  record.geometry.chooserNarrow = await geometry();
  await step("21 narrow chooser");
  await shot(`${p}19-narrow-chooser.png`);
  await key("Escape");
  await page.viewport({ width: 390, height: 844, dark: true });
  await visit(alt, { theme: "dark", scenario: "bound-run" });
  await readyNext();
  await step("22 narrow 390 dark, run in flight");
  await shot(`${p}20-narrow-dark-bound.png`);
  await page.viewport({ width: 1440, height: 900, dark: true });
  await visit(alt, { theme: "dark" });
  await readyNext();
  await shot(`${p}21-desktop-dark.png`);
}

try {
  for (const alt of ["a", "b"]) await journey(alt);
} catch (error) {
  records.error = { message: error.message, stack: error.stack };
  await page.shot(out("failure.png")).catch(() => {});
} finally {
  await writeFile(out("record.json"), JSON.stringify(records, null, 2) + "\n");
  await page.close();
  await host.close();
}
if (records.error) { console.error(records.error.message); process.exit(1); }
console.log(`captured to ${values.out}`);
