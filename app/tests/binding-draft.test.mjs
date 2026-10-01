/* Review N5 · what a person types into "Continue in Matter" is theirs until the
 * Host confirms the binding. The draft owner is app/web/binding-draft.mjs; the
 * panel that uses it lives in app.mjs, which has no DOM harness, so the panel
 * tests run the real function text from app.mjs (as host-fact-projection does)
 * against the real owner, a small DOM and stubbed Host reads. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createBindingDraft, BINDING_DRAFT_STORED_LIMIT } from "../web/binding-draft.mjs";
import { el } from "../web/ui-controls.mjs";
import { withTinyDom, deferred, flush } from "./tiny-dom.mjs";

const src = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
function grab(name, prefix = "function ") {
  const start = src.indexOf(`${prefix}${name}(`);
  assert.ok(start >= 0, `app.mjs defines ${name}`);
  const open = src.indexOf("{", src.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`unbalanced ${name}`);
}
const optional = (name, prefix) => (src.includes(`${prefix ?? "function "}${name}(`) ? grab(name, prefix) : "");

function memoryStorage() {
  const items = new Map();
  return {
    items,
    get length() { return items.size; },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { items.set(key, String(value)); },
    removeItem: (key) => { items.delete(key); },
  };
}
const PREFIX = "test.binding-draft";
const MEMO = { id: "evidence-memo", title: "Evidence Memo", bindingFields: [
  { name: "title", label: "Title", multiline: false, required: true, maxLength: 120 },
  { name: "sourceText", label: "Source text", multiline: true, required: true, maxLength: 100000 },
] };
const NDA = { id: "inbound-nda", title: "Inbound NDA", bindingFields: [...MEMO.bindingFields, { name: "facts", label: "Facts", multiline: true, required: false, maxLength: 20000 }] };

/* The production panel: renderBindingPanel, loadProjectWork and the two
 * helpers they call, with the screen's other owners stubbed. */
function panelHarness(body, { storage, session, extensions = [MEMO, NDA], request }) {
  const panel = document.createElement("div");
  const account = document.createElement("button");
  body.append(panel, account);
  // The platform gives text controls a selection; the small DOM does not.
  const create = document.createElement.bind(document);
  document.createElement = (tag) => {
    const node = create(tag);
    if (tag === "input" || tag === "textarea") {
      node.selectionStart = 0; node.selectionEnd = 0;
      node.setSelectionRange = (start, end) => { node.selectionStart = start; node.selectionEnd = end; };
    }
    return node;
  };
  const state = { extensions, bindingExtensionId: null, activeSessionId: session.id, session, sessionsByProject: new Map(), sessionEpoch: 1,
    projectWork: { projectId: null, extensionId: null, matters: null, error: null } };
  const seen = { toasts: [], failures: [], renders: 0 };
  const bindingDraft = createBindingDraft({ storage: () => storage, prefix: PREFIX });
  const body$ = [grab("existingProjectWork"), grab("continueExistingSegment"), grab("renderBindingPanel"), optional("drawBindingPanel"), grab("loadProjectWork", "async function ")].join("\n");
  const make = new Function("state", "$", "clear", "element", "currentSession", "request", "renderAll", "loadSurface", "loadWorkThread", "showToast", "bindingFailed", "bindingDraft", "flowRow", "semanticPresentation", "shortRef",
    `${body$}; return { renderBindingPanel, loadProjectWork };`);
  const api = make(state, (id) => (id === "binding-panel" ? panel : account), (node) => node.replaceChildren(), el, () => state.session, request,
    () => { seen.renders++; api.renderBindingPanel(); }, async () => {}, async () => {}, (text) => seen.toasts.push(text),
    async (error, refusal) => { seen.failures.push(`${refusal}: ${error.message}`); }, bindingDraft,
    (tag, options) => el(tag, { className: options.className, text: options.title, attrs: options.attrs }), () => ({ glyph: "matter" }), (id) => id);
  const control = (name) => [...panel.querySelectorAll("input"), ...panel.querySelectorAll("textarea")].find((node) => node.getAttribute("name") === name);
  const button = (text) => panel.querySelectorAll("button").find((node) => node.textContent === text);
  const type = (name, text) => { const node = control(name); node.value = text; node.dispatchEvent({ type: "input" }); };
  const values = () => Object.fromEntries([...panel.querySelectorAll("input"), ...panel.querySelectorAll("textarea")].map((node) => [node.getAttribute("name"), node.value]));
  const open = (extension = MEMO) => { state.bindingExtensionId = extension.id; api.renderBindingPanel(); };
  return { ...api, panel, account, state, seen, bindingDraft, control, button, type, values, open };
}
const chat = (id, extra = {}) => ({ id, scope: "project", projectId: "p1", extensionBinding: null, ...extra });
const TYPED = { title: "Renewal window memo", sourceText: "Clause 14.2: the tenant may renew by written notice." };

for (const outcome of ["answered", "failed"]) {
  test(`N5 · a project-work read that lands late (${outcome}) rebuilds the form with every value, the focus and the selection`, () => withTinyDom(async (body) => {
    const read = deferred();
    const h = panelHarness(body, { storage: memoryStorage(), session: chat("s1"), request: async (path) => { assert.equal(path, "/projects/p1/work"); return read.promise; } });
    h.open();
    void h.loadProjectWork("p1", MEMO.id);
    assert.match(h.panel.textContent, /Reading the work this project already owns…/);
    h.type("title", TYPED.title);
    h.type("sourceText", TYPED.sourceText);
    const typedInto = h.control("sourceText");
    typedInto.focus();
    typedInto.setSelectionRange(7, 11);
    if (outcome === "answered") read.resolve({ matters: [{ extensionId: MEMO.id, matter: { id: "matter-1", version: 2 } }] });
    else read.reject(new Error("The local runtime could not be reached."));
    await flush();
    assert.notEqual(h.control("sourceText"), typedInto, "the read settled and the panel was rebuilt");
    assert.match(h.panel.textContent, outcome === "answered" ? /Existing work in this project/ : /The local runtime could not be reached\./);
    assert.deepEqual(h.values(), TYPED, "every field keeps what was typed");
    assert.equal(document.activeElement, h.control("sourceText"), "the keyboard stays in the field");
    assert.deepEqual([h.control("sourceText").selectionStart, h.control("sourceText").selectionEnd], [7, 11]);
  }));
}

test("N5 · any other rebuild keeps the form too; a rebuild while nothing in the form has focus takes no focus", () => withTinyDom(async (body) => {
  const h = panelHarness(body, { storage: memoryStorage(), session: chat("s1"), request: async () => ({ matters: [] }) });
  h.open(NDA);
  h.type("title", "Mutual NDA"); h.type("sourceText", "Each party…"); h.type("facts", "Counterparty: Harborview");
  h.account.focus();
  h.renderBindingPanel(); // renderAll(), loadExtensions(), a provider push
  assert.deepEqual(h.values(), { title: "Mutual NDA", sourceText: "Each party…", facts: "Counterparty: Harborview" });
  assert.equal(document.activeElement, h.account, "focus outside the form is left alone");
  h.button("Continue in Matter").focus();
  h.renderBindingPanel();
  assert.equal(document.activeElement, h.button("Continue in Matter"), "a focused command is found again, not dropped to the page");
}));

test("N5 · Cancel closes and keeps; another chat has its own form; a reload restores from the tab's storage", () => withTinyDom(async (body) => {
  const storage = memoryStorage();
  const h = panelHarness(body, { storage, session: chat("s1"), request: async () => ({ matters: [] }) });
  h.open();
  h.type("title", TYPED.title); h.type("sourceText", TYPED.sourceText);
  h.button("Cancel").click();
  assert.equal(h.panel.hidden, true);
  assert.equal(h.state.bindingExtensionId, null);
  h.open();
  assert.deepEqual(h.values(), TYPED, "closing the panel does not clear the draft");

  h.state.session = chat("s2"); h.state.activeSessionId = "s2";
  h.open();
  assert.deepEqual(h.values(), { title: "", sourceText: "" }, "a draft belongs to one Session");
  h.open(NDA);
  assert.deepEqual(h.values(), { title: "", sourceText: "", facts: "" }, "and to one extension");
  h.state.session = chat("s1"); h.state.activeSessionId = "s1";
  h.open();
  assert.deepEqual(h.values(), TYPED);

  const reloaded = panelHarness(document.createElement("main"), { storage, session: chat("s1"), request: async () => ({ matters: [] }) });
  reloaded.open();
  assert.deepEqual(reloaded.values(), TYPED, "a new page reads the same draft back");
}));

test("N5 · a refused or unknown bind keeps the draft; only the Host's confirmation spends it", () => withTinyDom(async (body) => {
  const storage = memoryStorage();
  let answer = () => { throw Object.assign(new Error("source text is required"), { status: 400 }); };
  const sent = [];
  const h = panelHarness(body, { storage, session: chat("s1"), request: async (path, options) => { sent.push(options.body); return answer(); } });
  h.open();
  h.type("title", TYPED.title); h.type("sourceText", TYPED.sourceText);
  const submit = () => h.panel.querySelector("form").dispatchEvent({ type: "submit" });
  submit(); await flush();
  assert.deepEqual(h.seen.failures, ["Could not create binding: source text is required"]);
  assert.deepEqual(h.values(), TYPED, "a refusal leaves the input to correct");
  h.renderBindingPanel();
  assert.deepEqual(h.values(), TYPED);

  answer = () => { throw Object.assign(new Error("Core did not answer in time"), { status: 503, body: { error: { code: "CORE_TIMEOUT", outcome: "unknown" } } }); };
  submit(); await flush();
  h.renderBindingPanel(); // the Session read that follows shows no binding
  assert.deepEqual(h.values(), TYPED, "an unknown outcome is not a confirmation");

  answer = () => ({ session: chat("s1", { extensionBinding: { extensionId: MEMO.id } }) });
  submit(); await flush();
  assert.deepEqual(sent.at(-1), { extensionId: MEMO.id, input: TYPED }, "the bind carries what the form shows");
  assert.deepEqual(h.bindingDraft.values("s1", MEMO.id), {});
  assert.equal(storage.items.size, 0);
  assert.equal(h.panel.hidden, true);
}));

test("N5 · a Session read that shows the binding ends the draft even when the bind's own reply was lost", () => withTinyDom(async (body) => {
  const storage = memoryStorage();
  const h = panelHarness(body, { storage, session: chat("s1"), request: async () => ({ matters: [] }) });
  h.open();
  h.type("title", TYPED.title);
  h.bindingDraft.set("s1", NDA.id, "title", "kept for the other extension");
  h.state.session = chat("s1", { extensionBinding: { extensionId: MEMO.id } });
  h.renderBindingPanel();
  assert.equal(h.panel.hidden, true);
  assert.deepEqual(h.bindingDraft.values("s1", MEMO.id), {});
  assert.deepEqual(h.bindingDraft.values("s1", NDA.id), { title: "kept for the other extension" }, "only that Session and extension");
}));

test("N5 · the owner: one stored entry per draft, forgotten with its Session, memory-only past the stored limit, never blocked by storage", () => {
  const storage = memoryStorage();
  const draft = createBindingDraft({ storage: () => storage, prefix: PREFIX });
  draft.set("s1", "evidence-memo", "title", "A");
  draft.set("s1", "inbound-nda", "title", "B");
  draft.set("s2", "evidence-memo", "title", "C");
  assert.deepEqual([...storage.items.keys()].sort(), [`${PREFIX}:s1:evidence-memo`, `${PREFIX}:s1:inbound-nda`, `${PREFIX}:s2:evidence-memo`]);
  draft.forgetSession("s1");
  assert.deepEqual([...storage.items.keys()], [`${PREFIX}:s2:evidence-memo`]);
  assert.deepEqual(draft.values("s1", "evidence-memo"), {});
  assert.deepEqual(draft.values("s2", "evidence-memo"), { title: "C" });

  // Emptying every field leaves nothing behind.
  draft.set("s2", "evidence-memo", "title", "");
  assert.equal(storage.items.size, 0);

  // Past the length Home's draft is restored up to, the draft is kept in memory and no stale copy stays stored.
  draft.set("s3", "evidence-memo", "title", "T");
  assert.equal(storage.items.size, 1);
  draft.set("s3", "evidence-memo", "sourceText", "x".repeat(BINDING_DRAFT_STORED_LIMIT));
  assert.equal(storage.items.size, 0, "the smaller, older copy is removed, not left to come back after a reload");
  assert.equal(draft.values("s3", "evidence-memo").sourceText.length, BINDING_DRAFT_STORED_LIMIT);
  assert.deepEqual(createBindingDraft({ storage: () => storage, prefix: PREFIX }).values("s3", "evidence-memo"), {});

  // A store that throws, or is absent, costs persistence only.
  const blocked = createBindingDraft({ storage: () => { throw new Error("SecurityError"); }, prefix: PREFIX });
  blocked.set("s1", "evidence-memo", "title", "still typed");
  assert.deepEqual(blocked.values("s1", "evidence-memo"), { title: "still typed" });
  blocked.forgetSession("s1");
  assert.deepEqual(blocked.values("s1", "evidence-memo"), {});
  // Malformed stored text is ignored.
  storage.setItem(`${PREFIX}:s9:evidence-memo`, "{not json");
  assert.deepEqual(createBindingDraft({ storage: () => storage, prefix: PREFIX }).values("s9", "evidence-memo"), {});
});

test("N5 · app.mjs wiring: one owner in the tab's storage, every rebuild through it, cleared only on confirmation or deletion", () => {
  assert.match(src, /const bindingDraft = createBindingDraft\(\{\s*storage: \(\) => window\.sessionStorage,\s*prefix: `\$\{UI_STORAGE_KEY\}\.binding-draft`,\s*\}\);/);
  assert.match(grab("renderBindingPanel"), /bindingDraft\.keepFocus\(panel, \(\) => drawBindingPanel\(panel\)\)/);
  const draw = grab("drawBindingPanel");
  assert.match(draw, /bindingDraft\.fields\(session\.id, extension\)/);
  assert.doesNotMatch(draw, /element\("(?:textarea|input)"/, "the panel builds no field of its own");
  assert.match(draw, /if \(session\?\.extensionBinding\)\s*bindingDraft\.clear\(session\.id, session\.extensionBinding\.extensionId\);/);
  // Both binds clear on the Host's reply, before the "is this chat still open" return.
  assert.equal((draw.match(/bindingDraft\.clear\(session\.id, extension\.id\);\s*if \(state\.activeSessionId !== session\.id\) return;/g) || []).length, 2);
  assert.equal((src.match(/bindingDraft\.clear\(/g) || []).length, 3, "no other path clears a draft");
  const cancel = draw.slice(draw.indexOf('cancel.addEventListener("click"'), draw.indexOf("actions.append(cancel)"));
  assert.doesNotMatch(cancel, /bindingDraft/, "Cancel closes the form and keeps the draft");
  assert.match(grab("submitDelete", "async function "), /bindingDraft\.forgetSession\(target\.id\);/);
  assert.equal((src.match(/bindingDraft\.forgetSession\(/g) || []).length, 1);
  // Leaving a chat only closes the form.
  assert.doesNotMatch(grab("clearActiveSession"), /bindingDraft/);
});
