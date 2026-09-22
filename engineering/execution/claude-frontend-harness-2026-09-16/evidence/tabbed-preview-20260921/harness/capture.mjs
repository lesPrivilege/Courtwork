/* Evidence harness only — not product code. Drives the real page served by
 * start.mjs in headless Chrome (throwaway profile, never the user's) with real
 * CDP mouse and key input, writes PNGs, DOM/focus measurements and a list of
 * checks. Exit code 1 when any check fails.
 *
 *   node capture.mjs --url http://127.0.0.1:8963 --part tabs|location --variant before|after --out <dir> --folder <abs> --profile <dir>
 *
 * `tabs`      06d B journey: open → second object → switch → close one →
 *             hide/Chat → reopen the same object, late reads after switch and
 *             close, crossed Work, expand/restore (1920), narrow sheet (390),
 *             dark, long identities, keyboard/Escape.
 * `location`  06d A2 / CE-F2: where the Work location panel starts, per state
 *             and width, on the tree named by the Host (before or after). */
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { launch } from "../../composer-entry-20260921/harness/cdp.mjs";

const { values } = parseArgs({ options: { url: { type: "string" }, part: { type: "string" }, variant: { type: "string" }, out: { type: "string" }, folder: { type: "string" }, profile: { type: "string" }, port: { type: "string" } } });
const out = (name) => path.join(values.out, name);
const page = await launch({ profileRoot: values.profile, port: Number(values.port || 9341) });
const log = {};
const checks = [];
const check = (name, pass, detail = null) => { checks.push({ name, pass: Boolean(pass), detail }); if (!pass) console.error(`FAIL ${name} ${JSON.stringify(detail)}`); };

const wait = (ms) => page.wait(ms);
const js = (body) => page.eval(body);
/* Real input: the browser decides focus on mousedown, as a person's click. */
async function clickAt(expression, label = expression) {
  const box = await js(`const n = (${expression}); if (!n) return null; n.scrollIntoView({ block: "center", inline: "nearest" }); const r = n.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };`);
  if (!box) throw new Error(`nothing to click: ${label}`);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
    await page.send("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: type === "mouseMoved" ? 0 : 1 });
}
const click = (selector) => clickAt(`document.querySelector(${JSON.stringify(selector)})`, selector);
const clickText = (scope, text) => clickAt(`[...document.querySelectorAll(${JSON.stringify(scope)})].find((n) => n.textContent.trim().startsWith(${JSON.stringify(text)}))`, `${scope} ~ ${text}`);
const KEYS = { Escape: 27, Enter: 13, ArrowLeft: 37, ArrowRight: 39, Delete: 46, Tab: 9, Home: 36, End: 35 };
async function key(name, { shift = false } = {}) {
  const text = name === "Enter" ? "\r" : undefined;
  const modifiers = shift ? 8 : 0;
  await page.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: name, code: name, windowsVirtualKeyCode: KEYS[name], modifiers, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key: name, code: name, windowsVirtualKeyCode: KEYS[name], modifiers });
}
const typeText = (text) => page.send("Input.insertText", { text });
const focused = () => js(`const a = document.activeElement; if (!a || a === document.body) return { tag: a?.tagName ?? null }; const r = a.getBoundingClientRect(); return { tag: a.tagName, id: a.id || null, field: a.getAttribute("data-repository-field"), label: (a.getAttribute("aria-label") || a.textContent || a.value || "").trim().slice(0, 90), focusKey: a.dataset?.focusKey ?? null, visible: r.width > 0 && r.bottom > 0 && r.top < innerHeight };`);
const tabs = () => js(`return [...document.querySelectorAll("#surface-tabs .surface-tab-select")].map((t) => ({ label: t.getAttribute("aria-label"), selected: t.getAttribute("aria-selected") === "true", name: t.querySelector(".surface-tab-name")?.textContent ?? null, meta: t.querySelector(".surface-tab-meta")?.textContent ?? null, clipped: (() => { const n = t.querySelector(".surface-tab-name"); return n ? n.scrollWidth > n.clientWidth : null; })() }));`);
const pane = () => js(`const p = document.querySelector("#surface-panel"); const shell = document.querySelector("#app-shell"); const body = document.querySelector("#conversation-body"); return { open: !p.hidden, modal: p.getAttribute("aria-modal") === "true", threePane: p.classList.contains("is-three-pane"), viewSwitch: p.classList.contains("is-view-switch"), maximized: document.querySelector("#surface-expand-button").getAttribute("aria-expanded") === "true", expandHidden: document.querySelector("#surface-expand-button").hidden, expandLabel: document.querySelector("#surface-expand-button").getAttribute("aria-label"), chatHidden: body.hidden, chatInert: body.inert, showButtonHidden: document.querySelector("#show-surface-button").hidden, title: document.querySelector("#surface-title").textContent };`);
const scrollOf = (selector) => js(`return Math.round(document.querySelector(${JSON.stringify(selector)}).scrollTop);`);
const text = (selector, n = 160) => js(`return (document.querySelector(${JSON.stringify(selector)})?.innerText ?? "").slice(0, ${n});`);
const errors = [];
await page.send("Runtime.enable");
page.send("Log.enable").catch(() => {});

async function fresh({ width, height, dark = false, clear = true }) {
  await page.viewport({ width, height, dark });
  await page.goto(values.url);
  if (clear) { await js(`localStorage.clear(); sessionStorage.clear(); return true;`); await page.goto(values.url); }
  await js(`window.__errors = []; addEventListener("error", (e) => window.__errors.push(String(e.message))); addEventListener("unhandledrejection", (e) => window.__errors.push(String(e.reason?.message || e.reason))); return true;`);
  await wait(800);
}
const pageErrors = async (where) => { const list = await js(`return window.__errors || [];`); if (list.length) errors.push({ where, list }); return list; };
const openWork = async (title) => {
  // Below 1024 the navigation is a drawer: open it the way a person would.
  if (await js(`return document.querySelector("#navigation-panel").inert;`)) { await click("#toggle-nav-button"); await wait(500); }
  await clickAt(`[...document.querySelectorAll("#project-list button, .recent-section button, nav button")].find((b) => b.textContent.trim() === ${JSON.stringify(title)})`, title); await wait(1500); };
const goHome = async () => { await clickAt(`document.querySelector("#home-button") || [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Home")`, "Home"); await wait(1000); };

/* Late reads: every recorded-file read is held until released, unless allowed. */
/* The Chat rows for recorded versions of one path, in thread order. */
const briefRow = (n) => `[...document.querySelectorAll(".artifact-thread-row")].filter((b) => b.textContent.includes("out/brief.md"))[${n}]`;
const holdFiles = () => js(`window.__held = []; window.__allow = false; if (!window.__origFetch) window.__origFetch = window.fetch; const orig = window.__origFetch; window.fetch = (u, o) => { const s = String(u); if (s.includes("artifacts/file") && !window.__allow) return new Promise((resolve, reject) => { window.__held.push({ url: s, go: () => orig(u, o).then(resolve, reject) }); }); return orig(u, o); }; return true;`);
const releaseFiles = () => js(`const n = window.__held.length; window.__held.splice(0).forEach((h) => h.go()); return n;`);
const unhold = () => js(`if (window.__origFetch) window.fetch = window.__origFetch; return true;`);

async function tabsJourney() {
  /* ── desktop 1440 × 900, light: B, the view switch ── */
  await fresh({ width: 1440, height: 900 });
  await openWork("Parcel brief review");
  const shas = await js(`return [...document.querySelectorAll(".artifact-thread-row")].length;`);
  log.artifactRows = shas;
  check("fixture: Work A has two recorded versions of out/brief.md in Chat", shas >= 2, shas);

  // T0 · the header entry with nothing open opens this Work's Workspace.
  await click("#show-surface-button"); await wait(900);
  log.t0 = { tabs: await tabs(), pane: await pane(), focus: await focused(), content: await text("#surface-content") };
  check("T0 header entry opens the Workspace of this Work", log.t0.tabs.length === 1 && log.t0.tabs[0].name === "Workspace" && log.t0.tabs[0].selected, log.t0.tabs);
  check("T0 keyboard lands on the selected tab", log.t0.focus.label?.startsWith("Workspace"), log.t0.focus);
  check("T0 pane is named Preview; B is a view switch with the chat hidden+inert", log.t0.pane.title === "Preview" && log.t0.pane.viewSwitch && log.t0.pane.chatHidden && log.t0.pane.chatInert, log.t0.pane);
  await page.shot(out("tabs-00-workspace-1440.png"));
  // A current file with a long name, from the Workspace tree.
  const longRow = await js(`const b = [...document.querySelectorAll("#surface-content button")].find((n) => n.textContent.includes("a-deliberately-long")); return b ? b.textContent.trim() : [...document.querySelectorAll("#surface-content button")].map((n) => n.textContent.trim()).join(" | ");`);
  log.t0.longRow = longRow;
  if (longRow.includes("a-deliberately-long")) {
    await clickText("#surface-content button", longRow); await wait(900);
    log.t0b = { tabs: await tabs(), focus: await focused() };
    const long = log.t0b.tabs.find((t) => t.label.includes("a-deliberately-long"));
    check("T0b a long current-file identity: name truncated on the tab, full path in its accessible name, reading word 'Current'", long && long.clipped && long.meta === "Current" && long.label.startsWith("out/a-deliberately-long"), long);
    await page.shot(out("tabs-00b-long-identity-1440.png"));
    await page.shot(out("tabs-00b-strip-1440.png"), { selector: ".surface-header", pad: 0 });
  } else check("T0b the long-named file is listed in the Workspace tree", false, longRow);
  await click("#surface-back-button"); await wait(500);
  log.t0c = { pane: await pane(), focus: await focused() };
  check("T0c ← Chat hides the pane and returns the keyboard to what opened it", !log.t0c.pane.open && log.t0c.focus.id === "show-surface-button", log.t0c);

  // T1 · a real object from Chat: recorded version 1 of out/brief.md.
  await clickAt(briefRow(0), "artifact row 1"); await wait(1000);
  log.t1 = { tabs: await tabs(), pane: await pane(), focus: await focused(), file: await text("#file-content", 80) };
  const v1 = log.t1.tabs.at(-1);
  check("T1 opening a recorded file activates its own tab directly (no card layer)", log.t1.pane.open && v1.selected && v1.meta?.startsWith("Recorded ") && log.t1.tabs.length === 3, log.t1.tabs);
  check("T1 the reader states its reading and version (provenance kept)", /Recorded version/.test(log.t1.file) && /out\/brief\.md/.test(log.t1.file), log.t1.file);
  await js(`document.querySelector("#file-content").scrollTop = 1200; return true;`); await wait(200);
  log.t1.reading = await scrollOf("#file-content");
  await page.shot(out("tabs-01-open-file-1440.png"));

  // T2 · back to Chat, write a draft, leave the thread somewhere.
  await click("#surface-back-button"); await wait(500);
  log.t2 = { focus: await focused() };
  check("T2 ← Chat returns the keyboard to the Chat row that opened Preview", log.t2.focus.label?.includes("out/brief.md") || log.t2.focus.focusKey !== null, log.t2.focus);
  await click("#composer-input"); await typeText("Draft kept while Preview works"); await wait(300);
  // Leave the thread where the next click will be made, then measure it there.
  await js(`document.querySelector(".presentation-open").scrollIntoView({ block: "center" }); return true;`); await wait(300);
  log.t2.draft = await js(`return document.querySelector("#composer-input").value;`);
  log.t2.thread = await scrollOf("#message-stream");

  // T3 · a second object: the recorded presentation.
  await click(".presentation-open"); await wait(900);
  log.t3 = { tabs: await tabs(), pane: await pane(), focus: await focused(), content: await text("#presentation-content", 100) };
  check("T3 the presentation opens as a second tab with its revision", log.t3.tabs.length === 4 && log.t3.tabs.at(-1).selected && log.t3.tabs.at(-1).meta === "revision 1", log.t3.tabs);
  await page.shot(out("tabs-02-second-object-1440.png"));

  // T4 · switch back with the keyboard; the reading position is where it was left.
  await key("ArrowLeft"); await wait(1200);
  log.t4 = { tabs: await tabs(), focus: await focused(), reading: await scrollOf("#file-content") };
  check("T4 ArrowLeft selects the file tab and keeps the keyboard on the strip", log.t4.tabs[2].selected && log.t4.focus.label?.startsWith("out/brief.md"), log.t4);
  check("T4 the file's reading position comes back", Math.abs(log.t4.reading - log.t1.reading) <= 2, { before: log.t1.reading, after: log.t4.reading });
  await page.shot(out("tabs-03-switch-1440.png"));

  // T5 · close one (the presentation, not selected) with its own close target.
  await clickAt(`[...document.querySelectorAll("#surface-tabs [data-preview-tab]")].find((w) => w.textContent.includes("Parcel facts")).querySelector(".surface-tab-close")`, "close presentation"); await wait(600);
  log.t5 = { tabs: await tabs(), focus: await focused() };
  check("T5 closing an unselected tab removes only it and keeps the selection", log.t5.tabs.length === 3 && log.t5.tabs[2].selected && !log.t5.tabs.some((t) => t.label.includes("Parcel facts")), log.t5.tabs);
  await page.shot(out("tabs-04-closed-one-1440.png"));

  // T6 · Escape hides Preview; the draft and the thread position are intact.
  await key("Escape"); await wait(600);
  log.t6 = { pane: await pane(), focus: await focused(), draft: await js(`return document.querySelector("#composer-input").value;`), thread: await scrollOf("#message-stream") };
  check("T6 Escape hides Preview", !log.t6.pane.open, log.t6.pane);
  check("T6 the composer draft is untouched", log.t6.draft === log.t2.draft, { was: log.t2.draft, now: log.t6.draft });
  check("T6 the thread reading position comes back", Math.abs(log.t6.thread - log.t2.thread) <= 2, { was: log.t2.thread, now: log.t6.thread });

  // T7 · reopen the same object from Chat: its tab, not a copy, at its reading.
  await clickAt(briefRow(0), "artifact row 1 again"); await wait(1200);
  log.t7 = { tabs: await tabs(), reading: await scrollOf("#file-content") };
  check("T7 reopening the same object reselects its tab (no duplicate)", log.t7.tabs.length === 3 && log.t7.tabs.filter((t) => t.label === v1.label).length === 1 && log.t7.tabs[2].selected, log.t7.tabs);
  check("T7 and it opens where it was being read", Math.abs(log.t7.reading - log.t1.reading) <= 2, log.t7.reading);
  await page.shot(out("tabs-05-reopen-1440.png"));

  // T8 · a late read after a switch: version 2's read is held; switch to v1; release.
  await click("#surface-back-button"); await wait(400);
  log.t8 = {};
  await holdFiles();
  await clickAt(briefRow(1), "artifact row 2"); await wait(600);
  log.t8.opened = { tabs: await tabs(), file: await text("#file-content", 60), held: await js(`return window.__held.map((h) => h.url.replace(/^.*artifacts\\/file\\?/, ""));`) };
  check("T8 version 2 opens as its own tab and is still reading", log.t8.opened.tabs.length === 4 && log.t8.opened.tabs[3].selected && /Loading file/.test(log.t8.opened.file), log.t8.opened);
  await js(`window.__allow = true; return true;`);
  await key("ArrowLeft"); await wait(1200);
  await releaseFiles(); await wait(1200);
  log.t8.after = { tabs: await tabs(), file: await text("#file-content", 2000) };
  check("T8 a late answer for the tab switched away from does not paint over the selected one", log.t8.after.tabs[2].selected && /version 1/.test(log.t8.after.file) && !/version 2/.test(log.t8.after.file), log.t8.after);

  // T9 · a late read after a close: select v2 with its read held, close it, release.
  await js(`window.__allow = false; return true;`);
  await key("ArrowRight"); await wait(600);
  log.t9 = { before: { tabs: await tabs(), file: await text("#file-content", 60) } };
  await key("Delete"); await wait(600);
  log.t9.closed = { tabs: await tabs(), focus: await focused() };
  await js(`window.__allow = true; return true;`); await releaseFiles(); await wait(1500);
  log.t9.after = { tabs: await tabs(), file: await text("#file-content", 2000), focus: await focused() };
  check("T9 Delete closes the selected tab; its left neighbour takes over", log.t9.closed.tabs.length === 3 && log.t9.closed.tabs[2].selected && log.t9.closed.focus.label?.startsWith("out/brief.md"), log.t9.closed);
  check("T9 the closed tab's late answer does not recreate it or paint", log.t9.after.tabs.length === 3 && !log.t9.after.tabs.some((t) => t.label === log.t8.opened.tabs[3].label) && /version 1/.test(log.t9.after.file), log.t9.after);
  await unhold();

  // T10 · crossed Work.
  const aTabs = await tabs();
  await openWork("Quarterly ledger check");
  log.t10 = { pane: await pane(), tabsDom: await tabs() };
  check("T10 entering Work B shows no Preview and none of A's tabs", !log.t10.pane.open && log.t10.tabsDom.length === 0, log.t10);
  await click("#show-surface-button"); await wait(900);
  log.t10.b = { tabs: await tabs() };
  check("T10 B's Preview opens on B's own Workspace only", log.t10.b.tabs.length === 1 && log.t10.b.tabs[0].label.includes("Quarterly ledger check"), log.t10.b.tabs);
  await page.shot(out("tabs-06-work-b-1440.png"));
  await openWork("Parcel brief review");
  log.t10.aDraft = await js(`return document.querySelector("#composer-input").value;`);
  await click("#show-surface-button"); await wait(1200);
  log.t10.a = { tabs: await tabs(), reading: await scrollOf("#file-content") };
  check("T10 back in A, its tabs, selection and reading position are A's", JSON.stringify(log.t10.a.tabs.map((t) => t.label)) === JSON.stringify(aTabs.map((t) => t.label)) && log.t10.a.tabs[2].selected && Math.abs(log.t10.a.reading - log.t1.reading) <= 2, log.t10.a);
  check("T10 A's draft is still A's", log.t10.aDraft === log.t2.draft, log.t10.aDraft);

  // T11 · a page over Preview: Settings hides it; coming back, the set is intact.
  await js(`location.hash = "#settings"; return true;`); await wait(900);
  log.t11 = { settings: await pane() };
  await key("Escape"); await wait(800);
  log.t11.back = { pane: await pane() };
  await click("#show-surface-button"); await wait(1000);
  log.t11.reopen = { tabs: await tabs() };
  check("T11 Settings hides Preview; back in the chat its tabs are intact", !log.t11.settings.open && !log.t11.back.pane.open && JSON.stringify(log.t11.reopen.tabs.map((t) => t.label)) === JSON.stringify(log.t10.a.tabs.map((t) => t.label)), log.t11);
  await pageErrors("tabs-1440");

  /* ── 1920 × 1080: C, three panes; expand / restore ── */
  await fresh({ width: 1920, height: 1080, clear: false });
  await openWork("Parcel brief review");
  await clickAt(briefRow(0), "row 1 @1920"); await wait(1000);
  log.w1 = { pane: await pane(), tabs: await tabs() };
  check("W1 at 1920 Preview is a third column beside the chat", log.w1.pane.threePane && !log.w1.pane.chatHidden && !log.w1.pane.expandHidden && log.w1.pane.expandLabel === "Expand preview", log.w1.pane);
  await page.shot(out("tabs-07-three-pane-1920.png"));
  await click("#surface-expand-button"); await wait(600);
  log.w2 = { pane: await pane(), focus: await focused() };
  check("W2 Expand gives Preview the main area; the button says Restore", log.w2.pane.maximized && !log.w2.pane.threePane && log.w2.pane.chatHidden && log.w2.pane.expandLabel === "Restore preview", log.w2);
  await page.shot(out("tabs-08-expanded-1920.png"));
  await key("Escape"); await wait(600);
  log.w3 = { pane: await pane(), tabs: await tabs() };
  check("W3 the first Escape restores the layout and keeps the same tab", log.w3.pane.open && log.w3.pane.threePane && !log.w3.pane.maximized && JSON.stringify(log.w3.tabs) === JSON.stringify(log.w1.tabs), log.w3);
  await key("Escape"); await wait(600);
  log.w4 = { pane: await pane(), focus: await focused() };
  check("W4 the next Escape hides Preview", !log.w4.pane.open, log.w4);
  await pageErrors("tabs-1920");

  /* ── 390 × 844: the sheet ── */
  await fresh({ width: 390, height: 844, clear: false });
  await wait(800);
  await clickAt(briefRow(0), "row 1 @390"); await wait(1000);
  log.n1 = { pane: await pane(), tabs: await tabs(), focus: await focused() };
  check("N1 at 390 Preview is a modal sheet with its tab strip", log.n1.pane.open && log.n1.pane.modal && log.n1.tabs.length >= 1 && log.n1.focus.label?.startsWith("out/brief.md"), log.n1);
  await page.shot(out("tabs-09-sheet-390.png"));
  await key("Escape"); await wait(600);
  log.n2 = { pane: await pane(), focus: await focused() };
  check("N2 Escape closes the sheet and returns the keyboard to the Chat row", !log.n2.pane.open && (log.n2.focus.label?.includes("out/brief.md") || log.n2.focus.focusKey), log.n2);
  await pageErrors("tabs-390");

  /* ── dark ── */
  await fresh({ width: 1440, height: 900, dark: true, clear: false });
  await clickAt(briefRow(1), "row 2 dark"); await wait(1000);
  await click("#surface-back-button"); await wait(400);
  await click(".presentation-open"); await wait(900);
  log.d1 = { tabs: await tabs() };
  await page.shot(out("tabs-10-dark-1440.png"));
  await pageErrors("tabs-dark");
}

async function locationJourney() {
  const panel = () => js(`const p = document.querySelector("#workspace-popover"); if (!p.matches(":popover-open")) return { open: false }; const r = p.getBoundingClientRect(); const title = p.querySelector("h3"); const close = p.querySelector(".section-heading button"); const inView = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return b.top >= r.top - 0.5 && b.bottom <= r.top + p.clientHeight + 0.5; }; const a = document.activeElement; return { open: true, scrollTop: Math.round(p.scrollTop * 10) / 10, clientHeight: p.clientHeight, scrollHeight: p.scrollHeight, titleInView: inView(title), closeInView: inView(close), identity: [...p.querySelectorAll(".location-value, .repository-root, code")].map((n) => n.textContent.trim()).filter(Boolean).slice(0, 3), focus: a && p.contains(a) ? { field: a.getAttribute("data-repository-field"), label: (a.getAttribute("aria-label") || a.textContent).trim().slice(0, 60), inView: inView(a), disabled: a.disabled } : { outside: a?.id || a?.tagName }, locked: [...p.querySelectorAll("button:disabled")].map((b) => b.getAttribute("data-repository-field")).filter(Boolean) };`);
  const reopen = async () => { if (await js(`return document.querySelector("#workspace-popover").matches(":popover-open");`)) { await key("Escape"); await wait(300); } await click("#workspace-chip"); await wait(700); };
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const w = `${width}`;
    await fresh({ width, height });
    // L1 · a fresh Home: the project is the first decision.
    await click("#workspace-chip"); await wait(700);
    log[`l1-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l1-home-${w}.png`));
    // L2 · stage the long folder, then reopen.
    await js(`document.querySelector('[data-repository-field="path-summary"]')?.click(); return true;`); await wait(200);
    await click('[data-repository-field="path"]'); await typeText(values.folder);
    await click('[data-repository-field="connect"]'); await wait(1200);
    await reopen();
    log[`l2-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l2-staged-${w}.png`));
    // Escape returns to the entry; a deliberate click elsewhere keeps that focus.
    await key("Escape"); await wait(300);
    log[`l2-escape-${w}`] = await focused();
    await click("#workspace-chip"); await wait(600);
    await click("#composer-input"); await wait(400);
    log[`l2-outside-${w}`] = { focus: await focused(), open: await js(`return document.querySelector("#workspace-popover").matches(":popover-open");`) };
    // L3 · preparing: the create is held while the panel is reopened.
    await js(`window.__held = []; const orig = window.fetch; window.__origFetch = orig; window.fetch = (u, o) => { const s = String(u); if (s.endsWith("/sessions") && (o?.method || "GET") === "POST" && !window.__allow) return new Promise((resolve, reject) => { window.__held.push({ go: () => orig(u, o).then(resolve, reject), fail: () => reject(new TypeError("Failed to fetch")) }); }); return orig(u, o); }; return true;`);
    await reopen();
    await click('[data-repository-field="start-edits"]'); await wait(700);
    await reopen();
    log[`l3-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l3-preparing-${w}.png`));
    await js(`window.__allow = true; window.__held.splice(0).forEach((h) => h.go()); return true;`); await wait(3500);
    // L4 · prepared: bound folder and private candidate — the reported case.
    await reopen();
    log[`l4-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l4-prepared-${w}.png`));
    await key("Escape"); await wait(300);
    log[`l4-escape-${w}`] = await focused();
    // L5 · unknown: a fresh Home whose create reply is lost.
    await js(`sessionStorage.clear(); if (window.__origFetch) window.fetch = window.__origFetch; return true;`);
    await fresh({ width, height, clear: false });
    await js(`sessionStorage.clear(); return true;`); await page.goto(values.url); await wait(900);
    await click("#workspace-chip"); await wait(600);
    await js(`document.querySelector('[data-repository-field="path-summary"]')?.click(); return true;`); await wait(200);
    await click('[data-repository-field="path"]'); await typeText(values.folder);
    await click('[data-repository-field="connect"]'); await wait(1200);
    await js(`window.__held = []; const orig = window.fetch; window.__origFetch = orig; window.fetch = (u, o) => { const s = String(u); if (s.endsWith("/sessions") && (o?.method || "GET") === "POST") return Promise.reject(new TypeError("Failed to fetch")); return orig(u, o); }; return true;`);
    await reopen();
    await click('[data-repository-field="start-edits"]'); await wait(1500);
    await reopen();
    log[`l5-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l5-unknown-${w}.png`));
    await js(`if (window.__origFetch) window.fetch = window.__origFetch; sessionStorage.clear(); return true;`);
    // L6 · a chat bound through the Host; L7 · a chat with no folder.
    await page.goto(values.url); await wait(900);
    await openWork("Bound location check");
    await click("#workspace-chip"); await wait(800);
    log[`l6-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l6-bound-${w}.png`));
    await key("Escape"); await wait(300);
    await openWork("Unbound location check");
    await click("#workspace-chip"); await wait(800);
    log[`l7-${w}`] = await panel();
    await page.shot(out(`location-${values.variant}-l7-unbound-${w}.png`));
    await key("Escape"); await wait(300);
    await pageErrors(`location-${w}`);
  }
  if (values.variant === "after") {
    for (const w of ["1440", "390"]) {
      check(`L1 ${w} fresh Home starts on the chosen project`, log[`l1-${w}`].focus.field === "project:none" && log[`l1-${w}`].titleInView, log[`l1-${w}`]);
      for (const state of ["l2", "l3", "l4", "l5", "l6"]) {
        const reading = log[`${state}-${w}`];
        check(`${state.toUpperCase()} ${w} starts at the top: Close focused, title and Close in view, not scrolled`, reading.open && reading.focus.field === "close" && reading.titleInView && reading.closeInView && reading.scrollTop === 0, reading);
      }
      check(`L3 ${w} preparing: location mutations locked`, log[`l3-${w}`].locked.includes("remove") || log[`l3-${w}`].locked.includes("disconnect"), log[`l3-${w}`].locked);
      check(`L7 ${w} unbound chat starts on Connect folder when it is in view, else Close`, ["open", "close"].includes(log[`l7-${w}`].focus.field) && log[`l7-${w}`].titleInView, log[`l7-${w}`]);
      check(`L2 ${w} Escape returns to the Work location entry`, log[`l2-escape-${w}`].id === "workspace-chip", log[`l2-escape-${w}`]);
      check(`L2 ${w} a deliberate click elsewhere keeps its own focus`, log[`l2-outside-${w}`].focus.id === "composer-input", log[`l2-outside-${w}`]);
    }
  }
}

/* `launcher` (before tree only): the right-side card rows this slice replaces,
 * and the expanded surface one of them led into — for the record's before. */
async function launcherBefore() {
  await fresh({ width: 1440, height: 900 });
  await openWork("Parcel brief review");
  await click("#show-surface-button"); await wait(900);
  log.cards = await js(`return [...document.querySelectorAll("#surface-rail section, #surface-rail .rail-card, #surface-rail details")].map((n) => n.getAttribute("aria-label") || n.querySelector("h3, summary")?.textContent?.trim()).filter(Boolean);`);
  await page.shot(out("launcher-before-01-cards-1440.png"));
  await clickAt(briefRow(0), "row 1"); await wait(1000);
  log.expanded = { tabs: await js(`return [...document.querySelectorAll("#surface-tabs [role=tab]")].filter((t) => !t.hidden && !t.closest("[hidden]")).map((t) => t.textContent.trim());`) };
  await page.shot(out("launcher-before-02-expanded-1440.png"));
  await clickAt(briefRow(1), "row 2"); await wait(1000);
  log.secondVersion = { tabs: await js(`return [...document.querySelectorAll("#surface-tabs [role=tab]")].filter((t) => !t.hidden && !t.closest("[hidden]")).map((t) => (t.getAttribute("aria-label") || t.textContent).trim());`) };
  check("before: a second recorded version replaces the first in the single document tab", log.secondVersion.tabs.filter((t) => t.includes("brief.md")).length === 1, log.secondVersion);
  await page.shot(out("launcher-before-03-second-version-replaces-1440.png"));
}

/* `workspace-close` · PV-R1: a closed Workspace tab accepts none of its
 * outstanding reads. The page's own fetch is wrapped so the Workspace reads
 * (/surface and /workspace) are held; each records whether its signal was
 * aborted when it is let go, and the real fetch then runs with that signal. */
async function workspaceClose() {
  const hold = () => js(`window.__held = []; if (!window.__origFetch) window.__origFetch = window.fetch; const orig = window.__origFetch; window.fetch = (u, o) => { const s = String(u); const bare = s.split("?")[0]; if (!window.__allow && bare.includes("/sessions/") && (bare.endsWith("/surface") || bare.endsWith("/workspace"))) return new Promise((resolve, reject) => { window.__held.push({ url: s.replace(location.origin, ""), go: () => { const aborted = Boolean(o?.signal?.aborted); window.__released.push({ url: s.replace(location.origin, "").split("?")[0].split("/").pop(), aborted }); return orig(u, o).then(resolve, reject); } }); }); return orig(u, o); }; window.__released = window.__released || []; window.__allow = false; return true;`);
  const release = () => js(`const n = window.__held.length; window.__allow = true; window.__held.splice(0).forEach((h) => h.go()); return n;`);
  const surfaceState = () => js(`const s = window.__V5_UI__.state.surface; return { info: s.info !== null, workspace: s.workspace !== null, context: s.context !== null, surfaceContent: document.querySelector("#surface-content").innerText.slice(0, 400) };`);
  await fresh({ width: 1440, height: 900 });
  await openWork("Parcel brief review");

  // R1 · open Workspace with its reads held, close it, then let the reads go.
  await hold();
  await click("#show-surface-button"); await wait(700);
  log.r1 = { opened: { tabs: await tabs(), held: await js(`return window.__held.map((h) => h.url.split("/sessions/")[1]?.split("/")[1]);`) } };
  await clickAt(`document.querySelector("#surface-tabs .surface-tab-close")`, "close Workspace"); await wait(500);
  log.r1.closed = { pane: await pane(), tabs: await tabs() };
  const n1 = await release(); await wait(1500);
  log.r1.after = { released: n1, reads: await js(`return window.__released.splice(0);`), state: await surfaceState(), pane: await pane(), tabs: await tabs() };
  check("R1 Workspace reads were outstanding when its tab closed", log.r1.opened.held.length >= 1 && !log.r1.closed.pane.open && log.r1.closed.tabs.length === 0, log.r1.opened);
  check("R1 the closed tab's surface read was aborted, not left live", log.r1.after.reads.some((r) => r.url === "surface") && log.r1.after.reads.filter((r) => r.url === "surface").every((r) => r.aborted), log.r1.after.reads);
  check("R1 its late answers left no Workspace state and no tab", !log.r1.after.state.info && !log.r1.after.state.workspace && !log.r1.after.state.context && !log.r1.after.pane.open && log.r1.after.tabs.length === 0, log.r1.after);

  // R2 · open Workspace (held), switch to a file, close the inactive Workspace tab.
  await hold();
  await click("#show-surface-button"); await wait(700);
  await click("#surface-back-button"); await wait(400);
  await clickAt(briefRow(0), "row v1"); await wait(1200);
  log.r2 = { opened: { tabs: await tabs(), held: await js(`return window.__held.length;`) } };
  await clickAt(`[...document.querySelectorAll("#surface-tabs [data-preview-tab]")].find((w) => w.textContent.includes("Workspace")).querySelector(".surface-tab-close")`, "close inactive Workspace"); await wait(500);
  const n2 = await release(); await wait(1500);
  log.r2.after = { released: n2, reads: await js(`return window.__released.splice(0);`), state: await surfaceState(), tabs: await tabs(), file: await text("#file-content", 2000), focus: await focused() };
  check("R2 closing the inactive Workspace leaves the selected file tab selected and readable", log.r2.after.tabs.length === 1 && log.r2.after.tabs[0].selected && /version 1/.test(log.r2.after.file), log.r2.after.tabs);
  check("R2 the inactive closed tab's surface read was aborted and left no state", log.r2.after.reads.some((r) => r.url === "surface") && log.r2.after.reads.filter((r) => r.url === "surface").every((r) => r.aborted) && !log.r2.after.state.info && !log.r2.after.state.workspace && !log.r2.after.state.context, log.r2.after);

  // R3 · reopening admits a new read and works.
  await key("Delete"); await wait(600);   // close the file tab too: Preview hides
  await click("#show-surface-button"); await wait(1500);
  log.r3 = { tabs: await tabs(), state: await surfaceState(), reads: await js(`return window.__released.splice(0);`) };
  check("R3 reopening Workspace reads again and shows its files", log.r3.tabs.length === 1 && log.r3.tabs[0].name === "Workspace" && log.r3.state.info && /brief\.md/.test(log.r3.state.surfaceContent), log.r3);
  await page.shot(out("workspace-close-r3-reopened-1440.png"));
  await pageErrors("workspace-close");
}

try {
  if (values.part === "workspace-close") await workspaceClose();
  else if (values.part === "tabs") await tabsJourney();
  else if (values.part === "launcher") await launcherBefore();
  else await locationJourney();
} catch (error) {
  check(`journey ran to the end`, false, String(error?.stack || error));
} finally {
  if (errors.length) check("no uncaught page errors", false, errors);
  else check("no uncaught page errors", true);
  await writeFile(out(`${values.part}-${values.variant}-measurements.json`), JSON.stringify(log, null, 2) + "\n");
  await writeFile(out(`${values.part}-${values.variant}-checks.json`), JSON.stringify(checks, null, 2) + "\n");
  await page.close();
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`${values.part}/${values.variant}: ${checks.length - failed}/${checks.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}
