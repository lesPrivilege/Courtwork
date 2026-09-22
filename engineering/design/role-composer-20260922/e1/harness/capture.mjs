/* Evidence harness only. Two parts, real CDP keys, throwaway Chrome profile:
 *   A. the product page on a real Host (start-host.mjs, started here from
 *      --host-app, a scratch copy whose server allowlist carries the two E1
 *      modules — see ../backend-requests.md R-1), Local test provider;
 *   B. the opt-in synthetic preview (app/scripts/agent-choice-preview.mjs) for
 *      the held states a Host does not produce on demand.
 *   node capture.mjs --host-app <scratch>/app --app <tree>/app --out <dir> --profile <dir> --data <dir>
 * Writes PNGs and record.json. Emulated viewports; not native zoom/AT. */
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launch } from "../../../../execution/claude-frontend-harness-2026-09-16/evidence/composer-entry-20260921/harness/cdp.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: { "host-app": { type: "string" }, app: { type: "string" }, out: { type: "string" }, profile: { type: "string" }, data: { type: "string" }, port: { type: "string", default: "8969" }, "preview-port": { type: "string", default: "8970" }, cdp: { type: "string", default: "9369" } } });
await mkdir(values.out, { recursive: true });
const out = (n) => path.join(values.out, n);
const record = { host: null, steps: [], preview: [] };
/* The Host runs from --host-app, now the frontend tree itself (K3 merged, the
   two static entries present). */

/* ── Start the real Host (child) and the preview (in process) ───────── */
const child = spawn(process.execPath, [path.join(here, "start-host.mjs"), "--app", values["host-app"], "--data", values.data, "--port", values.port], { stdio: ["ignore", "pipe", "inherit"] });
const hostInfo = await new Promise((resolve, reject) => {
  let buf = "";
  child.stdout.on("data", (d) => { buf += d; const line = buf.split("\n").find((l) => l.startsWith("{")); if (line) resolve(JSON.parse(line)); });
  child.on("exit", (code) => reject(new Error(`host exited ${code}`)));
});
record.host = hostInfo;
const { startAgentChoicePreview } = await import(pathToFileURL(path.join(values.app, "scripts/agent-choice-preview.mjs")));
const preview = await startAgentChoicePreview({ port: Number(values["preview-port"]) });
const page = await launch({ port: Number(values.cdp), profileRoot: values.profile });

const KEYS = { Enter: [13, "\r"], Escape: [27], Tab: [9], ArrowDown: [40], ArrowUp: [38], End: [35], Home: [36] };
async function key(name, { shift = false } = {}) {
  const [code, text] = KEYS[name];
  const common = { key: name, code: name, windowsVirtualKeyCode: code, modifiers: shift ? 8 : 0 };
  await page.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", ...common, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...common });
  await page.wait(90);
}
const ev = (e) => page.eval(e);
const until = async (e, label, timeout = 10000) => { const end = Date.now() + timeout; for (;;) { if (await ev(`return Boolean(${e});`)) return; if (Date.now() > end) throw new Error(`timed out: ${label}`); await page.wait(50); } };
const focusOn = (sel) => ev(`const sel = ${JSON.stringify(sel)}; const n = document.querySelector(sel); if (!n) throw new Error("missing " + sel); n.focus(); return true;`);
const facts = () => ev(`const q = (s) => document.querySelector(s); const t = q("#composer-input"); const a = document.activeElement;
  return { focus: a === document.body ? "body" : (a.id || a.dataset?.testid || a.tagName), chip: q("#agent-chip")?.hidden ? "(hidden)" : q("#agent-chip")?.innerText.trim() ?? null,
    notice: q("#agent-notice")?.hidden === false ? q("#agent-notice").textContent : null, actions: [...document.querySelectorAll(".agent-notice-actions button")].map((b) => b.textContent),
    send: { disabled: q("#send-button")?.disabled ?? null, describedBy: q("#send-button")?.getAttribute("aria-describedby") ?? null },
    popover: q("#agent-popover")?.matches(":popover-open") ?? false, draft: t && { value: t.value, start: t.selectionStart, end: t.selectionEnd },
    overflow: document.documentElement.scrollWidth - innerWidth, nullText: /\\bnull\\b|undefined/.test(document.body.innerText) };`);
const step = async (name, extra = {}) => { const entry = { name, ...(await facts()), ...extra }; record.steps.push(entry); return entry; };
const shot = async (name) => { await page.wait(150); await page.shot(out(name)); };
const api = (method, p, body) => ev(`const b = await (await fetch("/api/v5/bootstrap")).json(); const r = await fetch("/api/v5${p}", { method: ${JSON.stringify(method)}, headers: { "content-type": "application/json", "x-work-token": b.sessionToken }, ${body ? `body: ${JSON.stringify(JSON.stringify(body))},` : ""} }); return { status: r.status, body: await r.json().catch(() => null) };`);
const sid = hostInfo.sessionId;
const hostSnapshot = async () => (await api("GET", `/runtime-control?sessionId=${sid}`)).body;

try {
  /* ── A. Real Host (this tree: K3 + the two static entries) ───────── */
  await page.viewport({ width: 1440, height: 900 });
  await page.goto(hostInfo.url + "/");
  await until(`[...document.querySelectorAll("button")].some((n) => n.textContent.includes("Agent choice check") && n.getClientRects().length)`, "recent chat");
  /* Page-side error log from here on (console.error, errors, rejections). */
  await ev(`window.__errors = []; const e = console.error.bind(console); console.error = (...a) => { window.__errors.push(a.map(String).join(" ")); e(...a); }; addEventListener("error", (x) => window.__errors.push("error: " + x.message)); addEventListener("unhandledrejection", (x) => window.__errors.push("rejection: " + (x.reason?.message || x.reason))); return 1;`);
  const reads = () => ev(`return performance.getEntriesByType("resource").filter((r) => r.name.includes("/api/v5/runtime-control?")).length`);
  await step("A0 Home: no Session, no Agent control");
  await ev(`[...document.querySelectorAll("button")].find((n) => n.textContent.includes("Agent choice check") && n.getClientRects().length).click(); return 1;`);
  await until(`document.querySelector("#agent-chip") && !document.querySelector("#agent-chip").hidden && document.querySelector("#agent-chip").innerText.trim() === "General"`, "chip General");
  await ev(`const t = document.querySelector("#composer-input"); t.focus(); t.value = "Review the Kit handoff."; t.dispatchEvent(new Event("input", { bubbles: true })); t.setSelectionRange(7, 7); return 1;`);
  const draftAtStart = (await facts()).draft;
  await step("A1 project Chat inherits General; draft typed, caret 7", { capability: hostInfo.capability });
  await shot("a1-chat-general.png");

  const before = await hostSnapshot();
  await focusOn("#agent-chip"); await key("Enter"); await page.wait(400);
  await step("A2 Enter opens the chooser; listbox focused");
  await key("Home"); await key("ArrowDown"); await key("ArrowDown"); await page.wait(600);
  await step("A3 previews Kit reviewer before commit", { reading: await ev(`return [...document.querySelectorAll("[data-reading]")].map((n) => n.dataset.reading + ": " + n.textContent)`) });
  await shot("a3-chooser-kit-preview.png");
  await key("Escape"); await page.wait(300);
  const afterEscape = await hostSnapshot();
  await step("A4 Escape: no write, focus back on the control", { revisionBefore: before.revision, revisionAfter: afterEscape.revision });

  await key("Enter"); await page.wait(300); await key("Home"); await key("ArrowDown"); await key("ArrowDown"); await page.wait(300); await key("Enter");
  await until(`document.querySelector("#agent-chip").innerText.trim() === "Kit reviewer" && !document.querySelector("#agent-notice").textContent`, "Kit reviewer applied");
  const applied = await hostSnapshot();
  await step("A5 Enter commits Kit reviewer: one session-scope write", { revision: applied.revision, sessionSelection: applied.profileSelections.find((p) => p.scope.type === "session")?.id, composition: { id: applied.composition.id, schemaVersion: applied.composition.schemaVersion, kits: (applied.composition.kits || []).map((k) => k.descriptor.id) } });

  await key("Enter"); await page.wait(400); await key("Tab"); await page.wait(100);
  await step("A6 Tab reaches View Kit reviewer source in Settings", { label: await ev(`return document.activeElement.textContent`) });
  await key("Enter");
  await until(`!document.querySelector("#settings-page").hidden`, "settings open");
  await until(`document.activeElement?.closest?.("[data-resource]")?.dataset.resource === "local:e1-kit-reviewer"`, "first visit lands on the profile row", 8000).catch(() => {});
  await step("A7 first Settings visit: the profile row is the destination", { hash: await ev(`return location.hash`), focusResource: await ev(`return document.activeElement?.closest?.("[data-resource]")?.dataset.resource ?? null`), sourceShown: await ev(`return document.querySelector("#settings-page").innerText.includes("kit:e1-review")`) });
  await shot("a7-settings-first-visit.png");
  await key("Escape");
  await until(`document.querySelector("#settings-page").hidden`, "settings closed");
  await page.wait(500);
  const back = await step("A8 Escape back: focus on the control, draft and caret unchanged");
  record.draftUnchanged = JSON.stringify(back.draft) === JSON.stringify(draftAtStart);
  await shot("a8-returned.png");

  const readsBeforeSend = await reads();
  await focusOn("#send-button"); await key("Enter");
  await until(`[...document.querySelectorAll("#message-stream *")].some((n) => /SIMULATED/.test(n.textContent))`, "reply");
  await until(`!document.querySelector("#send-button").hidden && document.querySelector("#cancel-run-button").hidden`, "terminal UI: Send back, Stop gone", 15000);
  await page.wait(3000);
  const session = (await api("GET", `/sessions/${sid}`)).body;
  const run = (session.runs || []).at(-1);
  const context = (await api("GET", `/runtime-context?sessionId=${sid}&runId=${run.id}`)).body;
  await step("A9 Send → terminal: Send restored once, no recursion, no reconnect, clean console", {
    run: { id: run.id, status: run.status }, runs: (session.runs || []).length,
    bound: { id: context.binding?.composition?.id, revision: context.binding?.revision, kits: context.kitBinding?.kits?.map((k) => k.id), compatibility: context.kitBinding?.compatibility?.status, policy: context.kitBinding?.policy },
    controlReadsAfterSend: (await reads()) - readsBeforeSend,
    reconnectBanner: await ev(`return /Connection lost|Reconnecting/.test(document.body.innerText)`),
    errors: await ev(`return window.__errors`),
    working: await ev(`return /Working for/.test(document.querySelector("#composer-area").innerText)`),
  });
  await shot("a9-run-terminal.png");

  /* Stale selection: another writer changes this chat's selection. */
  const snap = await hostSnapshot();
  const external = await api("PUT", `/runtime-control?sessionId=${sid}`, { revision: snap.revision, operation: "profile", scope: { type: "session", id: sid }, id: "local:e1-drafter" });
  await ev(`const t = document.querySelector("#composer-input"); t.focus(); t.value = "Second draft after an outside change."; t.dispatchEvent(new Event("input", { bubbles: true })); return 1;`);
  await focusOn("#send-button"); await key("Enter");
  await until(`document.querySelector("#agent-chip").innerText.trim() === "Drafter"`, "effective agent re-read after refusal", 10000);
  await page.wait(800);
  const after = (await api("GET", `/sessions/${sid}`)).body;
  await step("A10 stale Send refused by the Host; effective agent re-read; draft kept; no new Run", { externalStatus: external.status, runs: (after.runs || []).length, feedback: await ev(`return document.querySelector("#composer-area").innerText.split(String.fromCharCode(10)).find((l) => /changed|selection|conflict|not sent/i.test(l)) ?? null`) });
  await shot("a10-stale-refused.png");

  await page.viewport({ width: 390, height: 844, dark: true });
  await ev(`document.documentElement.dataset.theme = "dark"; return 1;`);
  await page.wait(300);
  await focusOn("#agent-chip"); await key("Enter"); await page.wait(500);
  await step("A11 390 dark: chooser");
  await shot("a11-narrow-dark-chooser.png");
  await key("Escape");
  await page.viewport({ width: 1440, height: 900 });
  await ev(`document.documentElement.dataset.theme = "light"; document.querySelector("#attention-button")?.click(); return 1;`);
  await page.wait(1200);
  await step("A12 Attention agent sheet open: the Agent control is not part of it", { insideAttentionSurface: await ev(`const chip = document.querySelector("#agent-chip"); const surface = document.querySelector("dialog[open], [aria-modal='true']"); return surface ? surface.contains(chip) : null;`) });
  record.errors = await ev(`return window.__errors`);

  /* ── B. Preview held states ───────────────────────────────────────── */
  for (const scenario of ["active-run", "lost-reply", "refused", "missing-resource", "read-error"]) {
    await page.goto(`${preview.url}?scenario=${scenario}`);
    await page.wait(600);
    if (scenario !== "read-error") {
      await focusOn("#agent-chip"); await key("Enter"); await page.wait(400); await key("End"); await page.wait(300); await key("Enter");
      await page.wait(1600);
    }
    const f = await facts();
    record.preview.push({ scenario, ...f, trace: await ev(`return [...document.querySelectorAll("#trace li")].map((l) => l.textContent)`) });
    await shot(`b-${scenario}.png`);
  }
  await page.goto(`${preview.url}?scenario=conflict`);
  await page.wait(600);
  await focusOn("#agent-chip"); await key("Enter"); await page.wait(400); await key("Home"); await page.wait(300); await key("ArrowDown"); await page.wait(200); await key("Enter");
  await page.wait(1600);
  const conflict = await facts();
  await shot("b-conflict.png");
  await focusOn('[data-testid="agent-apply-again"]'); await key("Enter");
  await page.wait(1600);
  record.preview.push({ scenario: "conflict", held: conflict, afterSelectAgain: await facts(), trace: await ev(`return [...document.querySelectorAll("#trace li")].map((l) => l.textContent)`) });
  await page.goto(`${preview.url}?scenario=normal&slow=1`);
  await page.wait(300);
  record.preview.push({ scenario: "loading", ...(await facts()) });
  await shot("b-loading.png");
} catch (error) {
  record.error = error.message;
  await page.shot(out("failure.png")).catch(() => {});
} finally {
  await writeFile(out("record.json"), JSON.stringify(record, null, 2) + "\n");
  await page.close(); await preview.close(); child.kill();
}
if (record.error) { console.error(record.error); process.exit(1); }
console.log("ok");
