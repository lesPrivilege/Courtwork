/* Evidence harness only. Starts the read-only Runtimes preview from <app> on a
 * free loopback port, drives the journey in headless Chrome with a throwaway
 * profile (the CDP driver from the composer-entry packet), and writes PNGs plus
 * one JSON interaction record. No Host, no data directory, no provider, no key.
 *   node capture.mjs --app <tree>/app --out <dir> --profile <scratch> [--port 8961]
 * Keys go through the browser's input pipeline (Input.dispatchKeyEvent), not
 * synthetic KeyboardEvents. Viewport width and DPR are emulated; that is not
 * native page zoom. */
import { parseArgs } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "../../composer-entry-20260921/harness/cdp.mjs";

const { values } = parseArgs({ options: { app: { type: "string" }, out: { type: "string" }, profile: { type: "string" }, port: { type: "string", default: "8961" } } });
await mkdir(values.out, { recursive: true });
const { startRuntimeManagementPreview } = await import(pathToFileURL(path.join(values.app, "scripts/runtime-management-preview.mjs")));
const preview = await startRuntimeManagementPreview({ port: Number(values.port) });
const page = await launch({ port: 9361, profileRoot: values.profile });
const record = { url: preview.url, steps: [] };
const out = (name) => path.join(values.out, name);

const KEYS = { Enter: 13, Escape: 27, Tab: 9 };
async function key(name, { shift = false } = {}) {
  const text = name === "Enter" ? "\r" : undefined;
  const common = { key: name, code: name, windowsVirtualKeyCode: KEYS[name], modifiers: shift ? 8 : 0 };
  await page.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", ...common, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
}
const focusKey = () => page.eval(`const a = document.activeElement; return a === document.body ? "body" : (a.getAttribute("data-focus-key") || a.getAttribute("data-testid") || a.tagName);`);
const focusOn = (testid) => page.eval(`const n = document.querySelector('[data-testid="${testid}"]'); if (!n) throw new Error("missing ${testid}"); n.focus(); return n.disabled;`);
const text = (testid) => page.eval(`return document.querySelector('[data-testid="${testid}"]')?.innerText ?? null;`);
const status = () => page.eval(`const n = document.querySelector('[data-testid="command-status"]'); return n ? { status: n.dataset.status, role: n.getAttribute("role"), text: n.innerText } : null;`);
const until = async (expression, label, timeout = 8000) => {
  const end = Date.now() + timeout;
  for (;;) {
    if (await page.eval(`return Boolean(${expression});`)) return;
    if (Date.now() > end) throw new Error(`timed out: ${label}`);
    await page.wait(40);
  }
};
const choose = (selector, value) => page.eval(`const s = document.querySelector('${selector}'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event("change", { bubbles: true })); return s.value;`);
const scenario = async (variant) => {
  await page.eval(`document.querySelector("#reset-preview").click(); return true;`);
  await page.wait(250);
  if (variant !== "normal") await choose("#variant-select", variant);
  await until(`document.querySelector('[data-testid="runtime-list"]')?.getAttribute("aria-busy") === "false"`, `list for ${variant}`);
};
const openRow = async (id) => {
  await focusOn(`row-action:${id}`);
  await key("Enter");
  await until(`document.querySelector('[data-testid="saved-revision"]')`, `open ${id}`);
  await page.wait(80);
};
const press = async (testid) => {
  const disabled = await focusOn(testid);
  if (disabled) throw new Error(`${testid} is disabled`);
  await key("Enter");
};
const overflow = () => page.eval(`const s = document.querySelector(".settings-sections"); return { doc: document.documentElement.scrollWidth - innerWidth, sections: s ? s.scrollWidth - s.clientWidth : null };`);
const step = async (name, extra = {}) => {
  const entry = {
    name, focus: await focusKey(), status: await status(), overflow: await overflow(),
    /* The platform prints "null" for a null child; tiny-dom does not. */
    nullText: await page.eval(`return /\\bnull\\b/.test(document.querySelector("#runtimes-mount").innerText)`),
    /* Whether the focused element is actually visible below the sticky title. */
    focusVisible: await page.eval(`const a = document.activeElement; if (!a || a === document.body) return null; const t = document.querySelector(".settings-section-title").getBoundingClientRect(); const r = a.getBoundingClientRect(); const s = document.querySelector(".settings-sections").getBoundingClientRect(); return r.top >= t.bottom - 1 && r.bottom <= s.bottom + 1;`),
    ...extra,
  };
  record.steps.push(entry);
  return entry;
};
const shot = async (name) => { await page.wait(120); await page.shot(out(name)); };

try {
  /* ── Desktop, light ─────────────────────────────────────────────── */
  await page.viewport({ width: 1440, height: 1500 });
  await page.goto(preview.url);
  await until(`document.querySelector('[data-testid="runtime-row:rt-pi"]')`, "first list");
  await step("list", { rows: await page.eval(`return [...document.querySelectorAll('[data-testid^="runtime-row:"]')].map(n => n.innerText.split("\\n"))`) });
  await shot("01-list-desktop-light.png");

  await openRow("rt-pi");
  await step("open Pi by keyboard");
  const tabOrder = [];
  for (let i = 0; i < 8; i += 1) { await key("Tab"); tabOrder.push(await focusKey()); }
  await step("Tab traversal from Back", { tabOrder });
  await page.eval(`const d = document.querySelector('[data-testid="disclosure:technical"]'); d.open = true; return true;`);
  await shot("02-pi-connected-bound-run.png");
  await press("action:disable");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "confirmed" && /Read back/.test(document.querySelector('[data-testid="command-status"]').innerText)`, "disable receipt");
  await step("disable with bound run", { admission: await text("admission"), disconnectReason: await text("reason:disconnect") });
  await shot("03-pi-disabled-receipt.png");
  await press("back");
  await until(`document.querySelector('[data-testid="runtime-list"]')?.getAttribute("aria-busy") === "false"`, "list after back");
  await step("back to list", { row: await text("runtime-row:rt-pi") });

  await openRow("rt-hermes");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.select(); return true;`);
  await page.send("Input.insertText", { text: "Hermes, desk" });
  await page.eval(`const d = document.querySelector('[data-testid="disclosure:proposal"]'); d.open = true; return true;`);
  await step("Hermes connect proposal and draft", { draft: await text("draft-summary"), nextStep: await text("native-next-step") });
  await shot("04-hermes-connect-proposal.png");
  await page.eval(`document.querySelector("#slow-toggle").click(); return true;`);
  await press("action:connect");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "pending"`, "pending");
  await step("connect pending", { focusWhilePending: await focusKey() });
  await shot("05-hermes-connect-pending.png");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "connect receipt", 15000);
  await page.eval(`document.querySelector("#slow-toggle").click(); return true;`);
  await step("connect confirmed and read back");
  await shot("06-hermes-connected-receipt.png");
  await press("action:disconnect");
  await step("disconnect confirmation opened");
  await shot("07-hermes-disconnect-confirm.png");
  await key("Escape");
  await page.wait(80);
  await step("Escape closes confirmation", { confirmation: await text("disconnect-confirmation") });
  await press("action:disconnect");
  await press("disconnect-confirm");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "disconnect receipt");
  await step("disconnected; history kept", { history: await text("history"), usedBy: await text("used-by") });
  await shot("08-hermes-disconnected-history.png");

  /* ── Recovery ───────────────────────────────────────────────────── */
  await scenario("lost-reply");
  await openRow("rt-pi");
  await press("action:disable");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "unknown"`, "unknown");
  await step("lost reply after commit → unknown", {
    reasons: await page.eval(`return [...document.querySelectorAll('[data-testid^="reason:"]')].map(n => n.dataset.testid + ": " + n.innerText)`),
    disabled: await page.eval(`return [...document.querySelectorAll('[data-testid^="action:"]')].map(n => n.dataset.testid + "=" + n.disabled)`),
    traceBefore: await page.eval(`return globalThis.__runtimeManagementPreview.trace()`),
  });
  await shot("09-lost-reply-unknown.png");
  await press("check-status");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "reconciled");
  await step("Check status settles the same operation", { traceAfter: await page.eval(`return globalThis.__runtimeManagementPreview.trace()`) });
  await shot("10-lost-reply-reconciled.png");

  /* ── Return RM-R1: submitted, unknown, newer draft ────────────────── */
  await scenario("lost-reply");
  await openRow("rt-hermes");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.select(); return true;`);
  await page.send("Input.insertText", { text: "Independent Hermes" });
  await press("action:connect");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "unknown"`, "rm-r1 unknown");
  await step("RM-R1 submitted draft, reply lost", { summary: await text("draft-summary"), status: await text("command-status") });
  await shot("23-rm-r1-submitted-unknown.png");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return true;`);
  await page.send("Input.insertText", { text: ", desk" });
  await page.wait(80);
  await step("RM-R1 newer input while unknown", { summary: await text("draft-summary") });
  await shot("24-rm-r1-newer-draft.png");
  await press("check-status");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "rm-r1 reconciled");
  await step("RM-R1 reconciled", { summary: await text("draft-summary"), trace: await page.eval(`return globalThis.__runtimeManagementPreview.trace().filter(t => t.call === "command" || t.call === "status" || t.effect)`) });

  /* ── Return RM-R2: stale read-back, then a current one ────────────── */
  await scenario("stale-read-back");
  await openRow("rt-pi");
  await press("action:disable");
  await until(`document.querySelector('[data-testid="read-again"]')`, "rm-r2 stale");
  await step("RM-R2 stale read-back locks changes", {
    status: await text("command-status"),
    disabled: await page.eval(`return [...document.querySelectorAll('[data-testid^="action:"]')].map(n => n.dataset.testid + "=" + n.disabled)`),
  });
  await shot("25-rm-r2-stale-read-back.png");
  await press("read-again");
  await until(`/Read back: revision 4/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "rm-r2 current");
  await step("RM-R2 current reading settles it", { status: await text("command-status"), trace: await page.eval(`return globalThis.__runtimeManagementPreview.trace().filter(t => t.call === "command" || t.effect)`) });

  await scenario("stale-revision");
  await openRow("rt-pi");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.select(); return true;`);
  await page.send("Input.insertText", { text: "Pi, lab" });
  await press("action:reconnect");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "conflict"`, "conflict");
  await step("stale revision refused, draft kept", { label: await page.eval(`return document.querySelector('[data-testid="connection-label"]').value`) });
  await shot("11-stale-revision-conflict.png");
  await press("reload");
  await until(`document.querySelector('[data-testid="reload-notice"]')`, "reloaded");
  await step("reloaded beside the draft", { notice: await text("reload-notice"), label: await page.eval(`return document.querySelector('[data-testid="connection-label"]').value`) });
  await shot("12-stale-revision-reloaded.png");

  await scenario("connect-refused");
  await openRow("rt-hermes");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.select(); return true;`);
  await page.send("Input.insertText", { text: "Hermes, desk" });
  await press("action:connect");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "refused"`, "refused");
  await step("connect refused, draft and focus kept", { label: await page.eval(`return document.querySelector('[data-testid="connection-label"]').value`) });
  await shot("13-connect-refused.png");

  await scenario("read-only");
  await openRow("rt-pi");
  await step("host cannot change runtimes", { reasons: await page.eval(`return [...document.querySelectorAll('[data-testid^="reason:"]')].map(n => n.innerText)`) });
  await shot("14-read-only-reasons.png");
  await scenario("normal");
  await openRow("rt-codex");
  await step("unavailable engine", { reason: await text("reason:connect") });
  await shot("15-unavailable-codex.png");

  await scenario("empty");
  await step("empty host", { empty: await text("list-empty") });
  await shot("16-empty.png");
  await scenario("read-error");
  await step("failed read", { error: await text("list-error") });
  await shot("17-read-error.png");

  /* ── Late reply after navigation, in the browser ─────────────────── */
  await scenario("normal");
  await page.eval(`document.querySelector("#slow-toggle").click(); return true;`);
  await openRow("rt-pi");
  await press("action:disable");
  await press("back");
  await until(`document.querySelector('[data-testid="runtime-row:rt-hermes"]') && document.querySelector('[data-testid="runtime-list"]').getAttribute("aria-busy") === "false"`, "list while pending", 15000);
  const rowWhilePending = await text("row-operation:rt-pi");
  await openRow("rt-hermes");
  const hermesBefore = await page.eval(`return document.querySelector("#runtimes-mount").innerText`);
  await page.wait(3600);
  const hermesAfter = await page.eval(`return document.querySelector("#runtimes-mount").innerText`);
  await page.eval(`document.querySelector("#slow-toggle").click(); return true;`);
  await step("late command reply after navigation", { rowWhilePending, hermesUnchanged: hermesBefore === hermesAfter, trace: await page.eval(`return globalThis.__runtimeManagementPreview.trace().filter(t => t.effect)`) });

  /* ── Narrow, long label, dark, 200% emulation ────────────────────── */
  await scenario("normal");
  await page.viewport({ width: 390, height: 1600 });
  await page.wait(200);
  await step("narrow list");
  await shot("18-list-narrow.png");
  await openRow("rt-hermes");
  await page.eval(`const i = document.querySelector('[data-testid="connection-label"]'); i.focus(); i.select(); return true;`);
  await page.send("Input.insertText", { text: "Hermes-on-the-shared-analysis-workstation-in-the-northern-district-office" });
  await press("action:connect");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "narrow connect");
  await step("narrow long label", {});
  await shot("19-hermes-long-label-narrow.png");

  await page.viewport({ width: 1440, height: 1500, dark: true });
  await choose("#theme-select", "dark");
  await scenario("lost-reply");
  await openRow("rt-pi");
  await press("action:disable");
  await until(`document.querySelector('[data-testid="command-status"]')?.dataset.status === "unknown"`, "dark unknown");
  await step("dark unknown");
  await shot("20-dark-unknown.png");
  await press("check-status");
  await until(`/Read back/.test(document.querySelector('[data-testid="command-status"]')?.innerText || "")`, "dark reconciled");
  await shot("21-dark-reconciled.png");

  await page.viewport({ width: 720, height: 900, dpr: 2 });
  await choose("#theme-select", "light");
  await scenario("normal");
  await openRow("rt-pi");
  await step("720 CSS px at DPR 2 (emulated, not native zoom)");
  await shot("22-pi-720-dpr2.png");
} catch (error) {
  record.error = String(error?.stack || error);
  process.exitCode = 1;
} finally {
  await writeFile(out("interaction-record.json"), JSON.stringify(record, null, 2) + "\n");
  await page.close();
  await preview.close();
}
