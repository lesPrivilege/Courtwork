// Browser check · review N5: what a person typed into "Continue in Matter"
// stays in the form across a read that lands late (answered and failed),
// Cancel + reopen, a Session switch and back, and a page reload.
//
//   node engineering/reviews/first-principles-6692b91-2026-10-01/evidence/binding-draft-browser.mjs --data-dir <disposable dir> [--report <file>]
//
// Harness: engineering/research/ux-interaction-topology-20260930/evidence/harness.mjs
// (a disposable Host on port 0 with the local fake provider, seeded only through
// the app's own API; headless Chrome over CDP). The project-work GET is held in
// the page by wrapping `window.fetch` from this script — no product code knows
// about the delay. Typing goes through CDP `Input.insertText`, so the fields
// receive the platform's own `input` events. Author evidence, not acceptance.
//
// Reports beside this script, each with the source it ran against:
//   binding-draft-browser.baseline.json — the unchanged baseline 6692b91 (7 of 10 checks fail)
//   binding-draft-browser.report.json   — the fix
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openHarness, sleep, sourceIdentity } from "../../../research/ux-interaction-topology-20260930/evidence/harness.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
if (process.argv.indexOf("--data-dir") < 0) throw new Error("pass --data-dir <disposable dir>: this script never picks a data directory for itself");
const argReport = process.argv.indexOf("--report");
const REPORT = argReport > 0 ? path.resolve(process.argv[argReport + 1]) : path.join(HERE, "binding-draft-browser.report.json");

const h = await openHarness({ outDir: path.join(process.argv[process.argv.indexOf("--data-dir") + 1], "captures") });
const { call, until, evaluate, waitFor, cdp } = h;
const report = { origin: "disposable Host, local fake provider", environment: null, extension: null, checks: [], errors: [] };
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  report.checks.push({ name, pass, expected, actual });
  return pass;
};

// Seed: one project with two ordinary chats, each with one settled Run, so the
// shell shows the person's own work and not the example.
const settled = (runId) => until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${runId}`)).run.status), 60000);
const project = (await call("/projects", { method: "POST", body: JSON.stringify({ name: "Harborview lease" }) })).project.id;
const chat = async (title) => {
  const id = (await call("/sessions", { method: "POST", body: JSON.stringify({ projectId: project, title }) })).session.id;
  await settled((await call(`/sessions/${id}/runs`, { method: "POST", body: JSON.stringify({ input: "Summarise the renewal window.", commandId: crypto.randomUUID() }) })).run.id);
  return id;
};
// A catalog extension starts unloaded; load it as Settings' own Load button does.
await call("/extensions/evidence-memo/lifecycle", { method: "POST", body: JSON.stringify({ action: "load" }) });
const first = await chat("Renewal memo");
const second = await chat("Deposit question");

// Hold `GET /projects/:id/work` in the page until this script lets it go.
const HOLD = `(() => {
  if (window.__workRead) return true;
  const original = window.fetch.bind(window);
  const gate = window.__workRead = { mode: null, held: 0, release: null };
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (gate.mode && /\\/projects\\/[^/]+\\/work$/.test(new URL(url, location.href).pathname)) {
      const mode = gate.mode;
      gate.held += 1;
      await new Promise((resolve) => { gate.release = resolve; });
      if (mode === "fail") throw new TypeError("held read failed by the evidence script");
    }
    return original(input, init);
  };
  return true;
})()`;
const PANEL = `document.getElementById("binding-panel")`;
const field = (name) => `${PANEL}.querySelector('[name=${JSON.stringify(name).replaceAll("'", "\\'")}]')`;
const formState = () => evaluate(`(() => {
  const panel = ${PANEL};
  const fields = Object.fromEntries([...panel.querySelectorAll("input, textarea")].map((n) => [n.name, n.value]));
  const active = document.activeElement;
  const inside = panel.contains(active);
  return { open: !panel.hidden, fields, focus: inside ? active.name || active.textContent.trim() : null,
    selection: inside && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null,
    note: panel.querySelector(".section-note")?.textContent ?? null };
})()`);
async function load() {
  await cdp("Page.navigate", { url: `${h.origin}/?check=${Date.now()}` });
  await waitFor(`document.readyState === "complete" && Boolean(document.querySelector('[data-recent-id=${JSON.stringify(first)}]'))`, "the shell");
  await evaluate(HOLD);
  await sleep(300);
}
async function openChat(id) {
  await evaluate(`(document.querySelector('[data-recent-id=${JSON.stringify(id)}]').click(), true)`);
  await waitFor(`document.querySelector('[data-recent-id=${JSON.stringify(id)}]')?.getAttribute("aria-current") === "page"`, `chat ${id}`);
  await sleep(300);
}
// The entry is the extension row's own button in Settings; it closes Settings and opens the form.
const ENTRY = `[...document.querySelectorAll(".extension-row")].find((row) => row.querySelector(".extension-row-title")?.textContent.includes("Evidence Memo"))`;
async function openForm() {
  await waitFor(`Boolean((${ENTRY}) && [...(${ENTRY}).querySelectorAll("button")].some((b) => b.textContent === "Continue in Matter"))`, "the Continue in Matter entry");
  await evaluate(`([...(${ENTRY}).querySelectorAll("button")].find((b) => b.textContent === "Continue in Matter").click(), true)`);
  await waitFor(`!${PANEL}.hidden && Boolean(${field("title")})`, "the form");
}
const type = async (name, text) => {
  await evaluate(`(${field(name)}.focus(), true)`);
  await cdp("Input.insertText", { text });
};
const release = async () => {
  await waitFor(`window.__workRead.held > 0 && Boolean(window.__workRead.release)`, "the held read");
  await evaluate(`(() => { const gate = window.__workRead; gate.mode = null; gate.held = 0; const go = gate.release; gate.release = null; go(); return true; })()`);
};

const TITLE = "Renewal window memo";
const SOURCE = "Clause 14.2: the tenant may renew by written notice\nnot later than 180 days before expiry.";
const EXPECTED = { title: TITLE, sourceText: SOURCE };
const guarded = async (name, act) => { try { await act(); } catch (error) { report.errors.push({ name, error: String(error?.message || error) }); } };

await h.variant(1440, 900, "light");
await load();
report.environment = await evaluate(`({ viewport: { width: innerWidth, height: innerHeight }, devicePixelRatio,
  pointer: matchMedia("(pointer: fine)").matches ? "fine" : matchMedia("(pointer: coarse)").matches ? "coarse" : "none",
  hover: matchMedia("(hover: hover)").matches, rootFontSize: getComputedStyle(document.documentElement).fontSize,
  colorScheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light", userAgent: navigator.userAgent })`);
report.environment.input = "CDP Input.insertText into the focused field; clicks through element.click()";

await guarded("a read that lands late, answered", async () => {
  await openChat(first);
  await evaluate(`(window.__workRead.mode = "answer", true)`);
  await openForm();
  report.extension = await evaluate(`(${PANEL}.querySelector(".binding-panel-note")?.textContent ?? null)`);
  const before = await formState();
  check("the form opens with the first field focused and the read still out", { focus: before.focus, note: before.note }, { focus: "title", note: "Reading the work this project already owns…" });
  await type("title", TITLE);
  await type("sourceText", SOURCE);
  await evaluate(`(${field("sourceText")}.setSelectionRange(7, 11), true)`);
  await release();
  await waitFor(`${PANEL}.querySelector(".section-note")?.textContent !== "Reading the work this project already owns…"`, "the read to land");
  const after = await formState();
  check("after the read lands: every field value", after.fields, EXPECTED);
  check("after the read lands: focus and selection", { focus: after.focus, selection: after.selection }, { focus: "sourceText", selection: [7, 11] });
});

await guarded("Cancel, then reopen", async () => {
  await evaluate(`([...${PANEL}.querySelectorAll("button")].find((b) => b.textContent === "Cancel").click(), true)`);
  check("Cancel closes the form", (await formState()).open, false);
  await openForm();
  check("reopened after Cancel: every field value", (await formState()).fields, EXPECTED);
});

await guarded("another chat and back", async () => {
  await openChat(second);
  await openForm();
  check("another chat's form is its own", (await formState()).fields, { title: "", sourceText: "" });
  await openChat(first);
  await openForm();
  check("back in the first chat: every field value", (await formState()).fields, EXPECTED);
});

await guarded("a page reload", async () => {
  await load();
  await openChat(first);
  await openForm();
  check("after a reload: every field value", (await formState()).fields, EXPECTED);
});

await guarded("a read that lands late, failed", async () => {
  await evaluate(`([...${PANEL}.querySelectorAll("button")].find((b) => b.textContent === "Cancel").click(), true)`);
  await evaluate(`(window.__workRead.mode = "fail", true)`);
  await openForm();
  await type("title", " (rev 2)");
  await release();
  await waitFor(`${PANEL}.querySelector(".section-note")?.textContent !== "Reading the work this project already owns…"`, "the failed read to land");
  const after = await formState();
  check("after the read fails: every field value", after.fields, { title: `${TITLE} (rev 2)`, sourceText: SOURCE });
  check("after the read fails: focus stays in the field being typed", after.focus, "title");
  report.failedReadNote = after.note;
});

report.passed = report.errors.length === 0 && report.checks.every((item) => item.pass);
await writeFile(REPORT, `${JSON.stringify({ source: sourceIdentity(), capturedAt: new Date().toISOString(), ...report }, null, 2)}\n`);
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.map((item) => `${item.pass ? "pass" : "FAIL"} · ${item.name}`), errors: report.errors }, null, 2));
await h.close();
process.exit(report.passed ? 0 : 1);
