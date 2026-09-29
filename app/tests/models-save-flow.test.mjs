/* UX 2026-09-28 · Models save flow, on a real disposable Host through the
 * shipped settings view: Provider → API key → Model in reading order; the key
 * keeps its own form, receipt and error beside it; the model/connection save
 * keeps its explicit "Save and ask once" and "Save only"; no status line
 * restates the call consequence. Synthetic key only. */
import assert from "node:assert/strict";
import test from "node:test";
import { rm } from "node:fs/promises";
import { boot } from "./helpers.mjs";
import { withTinyDom } from "./tiny-dom.mjs";
import { createSettingsView } from "../web/settings-view.mjs";
import { FAKE_MODEL_ID } from "../runtime/pi-session-runtime.mjs";

const SYNTHETIC_KEY = "sk-synthetic-models-flow-0000";

async function mountedSettings(h, { hold } = {}) {
  const byId = new Map();
  document.getElementById = (id) => { if (!byId.has(id)) byId.set(id, document.createElement("div")); return byId.get(id); };
  const container = document.createElement("div");
  const calls = [];
  const notes = [];
  const view = createSettingsView(container, {
    request: async (path, options = {}) => {
      calls.push(`${options.method ?? "GET"} ${path}`);
      const held = hold?.(path, options);
      if (held) return held;
      const response = await h.api(options.method ?? "GET", path, options.body);
      if (response.status >= 400) throw Object.assign(new Error(response.json?.error?.message ?? "request failed"), { status: response.status, code: response.json?.error?.code });
      return response.json;
    },
    onConfig() {}, getSession: () => null, onSession() {}, notify: (text) => notes.push(text), onRuntimeEnvironment() {}, page: null,
  });
  // Browsers reflect an input's value attribute into `.value`; tiny-dom does
  // not, and the connection-path radios are read by `.value`.
  for (const input of container.querySelectorAll("input")) if (input.hasAttribute("value") && !input.value) input.value = input.getAttribute("value");
  await view.refresh();
  const form = container.querySelector("form.settings-form");
  const credential = container.querySelector("form.credential-form");
  const rowTitled = (title) => form.querySelectorAll(".settings-row").find(row => row.querySelector(".settings-row-title")?.textContent === title);
  return { view, container, form, credential, calls, notes, rowTitled };
}

test("Models: Provider, API key, Model in reading order; the key saves through its own form with its own receipt", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const { container, form, credential, calls, notes, rowTitled } = await mountedSettings(h);
    const rows = form.children;
    const [providerRow, keyRow, modelRow] = ["Provider", "API key", "Model"].map(rowTitled);
    assert.ok(providerRow && keyRow && modelRow);
    assert.ok(rows.indexOf(providerRow) < rows.indexOf(keyRow) && rows.indexOf(keyRow) < rows.indexOf(modelRow), "Provider → API key → Model");
    assert.equal(container.querySelectorAll("h4").some(node => node.textContent === "API key"), false, "no second API key heading");

    // The Host's in-force connection is the local test provider: no key to give.
    assert.equal(keyRow.hidden, true);
    const status = form.querySelector('p.form-help[role="status"]');
    assert.match(status.textContent, /deterministic local test provider/);

    // Configure DeepSeek (a saved catalog connection with no key yet).
    const configure = container.querySelector('[data-focus-key="connection:configure:catalog-deepseek"]');
    configure.dispatchEvent({ type: "click", target: configure });
    const key = keyRow.querySelector('input[type="password"]');
    const saveKey = keyRow.querySelectorAll("button").find(node => node.textContent === "Save key");
    assert.equal(keyRow.hidden, false);
    assert.equal(key.getAttribute("form"), credential.getAttribute("id"), "the key belongs to the credential form");
    assert.equal(saveKey.getAttribute("form"), credential.getAttribute("id"));
    assert.equal(keyRow.querySelector(".settings-row-help").textContent, "No key saved for this connection. Keys stay on this device.");
    assert.equal(status.hidden, true, "no status line restates the call consequence");
    assert.match(form.textContent, /Save and ask once sends one short prompt to the selected model\. Nothing else is sent\./);
    assert.deepEqual(form.querySelectorAll('button[type="submit"]').filter(node => !node.getAttribute("form")).map(node => node.textContent), ["Save and ask once", "Save only"]);

    key.value = SYNTHETIC_KEY;
    calls.length = 0;
    await credential.dispatchEvent({ type: "submit" });
    // dispatchEvent does not await the async handler: wait for its outcome,
    // not for a fixed time, which a loaded machine outlasts.
    for (let tries = 0; tries < 100 && notes.at(-1) !== "API key saved."; tries++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(calls.includes("PUT /provider-credential"), JSON.stringify(calls));
    assert.equal(calls.some(call => call.startsWith("PUT /provider-config")), false, "saving the key does not save the model");
    assert.deepEqual(notes.at(-1), "API key saved.");
    assert.equal(key.value, "");
    assert.equal(keyRow.querySelector(".settings-row-help").textContent, "Saved on this device for this connection. It is never shown here.");
    const stored = (await h.api("GET", "/provider-connections")).json.connections.find(entry => entry.id === "catalog-deepseek");
    assert.equal(stored.credentialStatus, "configured");
    assert.equal(JSON.stringify((await h.api("GET", "/provider-config")).json).includes(SYNTHETIC_KEY), false, "the key is never read back");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("Models: a key for an unsaved change fails beside the key; a new endpoint's key goes with its connection", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const { container, form, credential, rowTitled } = await mountedSettings(h);
    const configure = container.querySelector('[data-focus-key="connection:configure:catalog-deepseek"]');
    configure.dispatchEvent({ type: "click", target: configure });
    const keyRow = rowTitled("API key");
    const model = rowTitled("Model").querySelector("select");
    model.dispatchEvent({ type: "change", target: model }); // an unsaved change to this connection
    keyRow.querySelector('input[type="password"]').value = SYNTHETIC_KEY;
    await credential.dispatchEvent({ type: "submit" });
    const keyError = keyRow.querySelector(".inline-error");
    assert.equal(keyError.hidden, false);
    assert.equal(keyError.textContent, "Save this connection before adding its key.");
    const formError = form.children.find(node => node.classList?.contains("inline-error") && !keyRow.contains(node));
    assert.notEqual(formError?.hidden, false, "the model/connection error line stays quiet");
    assert.equal((await h.api("GET", "/provider-connections")).json.connections.find(entry => entry.id === "catalog-deepseek").credentialStatus, "not_configured");

    // A new compatible endpoint has no saved connection to hold a key yet.
    const compatible = form.querySelector('input[value="compatible"]');
    compatible.checked = true;
    compatible.dispatchEvent({ type: "change", target: compatible });
    assert.equal(keyRow.hidden, false);
    assert.equal(keyRow.querySelector(".settings-row-help").textContent, "Sent with this connection when you save it.");
    assert.equal(keyRow.querySelector(".credential-actions").hidden, true, "no separate key action before the connection exists");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("connection card: the Models destination is named for where it goes and opens nothing else", () => withTinyDom(async () => {
  const { renderConnectionCard } = await import("../web/settings-view.mjs");
  const popover = document.createElement("div");
  const opened = [];
  renderConnectionCard(popover, {
    config: { provider: "fake-openai-loopback", model: "fake-model" }, session: null, active: false,
    onClose() {}, onChangeConnection: () => opened.push("models"), onChooseModel: null, onPermission() {}, measurements: null,
  });
  const row = popover.querySelectorAll("button").find(node => node.getAttribute("aria-label") === "Open Models settings");
  assert.ok(row, "the row names its destination");
  assert.equal(row.children.at(-1).tagName, "svg", "the rows' trailing chevron marks a destination");
  assert.equal(popover.querySelectorAll("button").some(node => node.getAttribute("aria-label") === "Connections"), false);
  assert.equal(popover.querySelectorAll("form,input,select").length, 0, "no second connection form here");
  row.dispatchEvent({ type: "click", target: row });
  assert.deepEqual(opened, ["models"]);
}));

const configure = (container, id) => { const button = container.querySelector(`[data-focus-key="connection:configure:${id}"]`); button.dispatchEvent({ type: "click", target: button }); };
const keyErrorOf = (keyRow) => keyRow.querySelector(".inline-error");
async function unsavedChangeKeyError({ container, credential, rowTitled }) {
  configure(container, "catalog-deepseek");
  const keyRow = rowTitled("API key");
  const model = rowTitled("Model").querySelector("select");
  model.dispatchEvent({ type: "change", target: model });
  keyRow.querySelector('input[type="password"]').value = SYNTHETIC_KEY;
  await credential.dispatchEvent({ type: "submit" });
  assert.equal(keyErrorOf(keyRow).hidden, false);
  assert.equal(keyErrorOf(keyRow).textContent, "Save this connection before adding its key.");
  return keyRow;
}

test("MS-R2 · a key error belongs to its connection: another target retires it; an unresolved one stays; saving resolves it", () => withTinyDom(async () => {
  const h = await boot();
  try {
    // Parent's case: a saved loopback-compatible connection with no key.
    const made = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }] });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const compatibleId = made.json.connection.id;
    const page = await mountedSettings(h);
    const { container, credential, form, rowTitled } = page;
    const keyRow = rowTitled("API key");
    const key = keyRow.querySelector('input[type="password"]');
    const unsavedCompatibleKey = async () => {
      configure(container, compatibleId);
      const api = form.querySelector('select[name="api"]');
      api.dispatchEvent({ type: "change", target: api }); // an unsaved change to this connection
      key.value = SYNTHETIC_KEY;
      await credential.dispatchEvent({ type: "submit" }); // Enter in the key submits this form
      assert.equal(keyErrorOf(keyRow).hidden, false);
      assert.equal(keyErrorOf(keyRow).textContent, "Save this connection before adding its key.");
    };

    await unsavedCompatibleKey();
    configure(container, "catalog-deepseek");
    assert.equal(keyErrorOf(keyRow).hidden, true, "Configure another connection retires the old target's error");
    assert.equal(keyErrorOf(keyRow).textContent, "");
    assert.equal(key.value, "", "a key typed for the old target is not left for the new one");
    // Choosing a path is also an explicit target switch.
    key.value = SYNTHETIC_KEY;
    const compatiblePath = form.querySelector('input[value="compatible"]');
    compatiblePath.checked = true;
    compatiblePath.dispatchEvent({ type: "change", target: compatiblePath });
    assert.equal(key.value, "", "a path change clears the typed key too");

    // Choosing another provider in the form retires it as well.
    await unsavedChangeKeyError(page);
    const provider = rowTitled("Provider").querySelector("select");
    provider.value = "openai";
    provider.dispatchEvent({ type: "change", target: provider });
    assert.equal(keyErrorOf(keyRow).hidden, true, "a provider change retires it");

    // Same target, still unsaved: the error is real and stays; a new attempt says it again.
    await unsavedCompatibleKey();
    key.value = SYNTHETIC_KEY + "-again";
    key.dispatchEvent({ type: "input", target: key });
    assert.equal(keyErrorOf(keyRow).hidden, false, "typing does not hide an unresolved error");
    await credential.dispatchEvent({ type: "submit" });
    assert.equal(keyErrorOf(keyRow).textContent, "Save this connection before adding its key.");

    // Resolution is what the message asks: save the connection ("Save only",
    // no model call), then the key saves and no error remains.
    const saveOnly = form.querySelectorAll("button").find(node => node.textContent === "Save only");
    await form.dispatchEvent({ type: "submit", submitter: saveOnly });
    // Saving a connection is five sequential Host requests; wait for the
    // outcome rather than a fixed 50 ms (MS-R2 failed under load).
    for (let tries = 0; tries < 100 && page.notes.at(-1) !== "Connection saved."; tries++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(page.notes.at(-1), "Connection saved.");
    assert.equal(keyErrorOf(keyRow).hidden, true, "the saved connection retires the unsaved-change error");
    configure(container, compatibleId);
    key.value = SYNTHETIC_KEY;
    await credential.dispatchEvent({ type: "submit" });
    for (let tries = 0; tries < 100 && page.notes.at(-1) !== "API key saved."; tries++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(keyErrorOf(keyRow).hidden, true, keyErrorOf(keyRow).textContent);
    assert.equal(page.notes.at(-1), "API key saved.", JSON.stringify(page.calls.slice(-6)));
    assert.equal((await h.api("GET", "/provider-connections")).json.connections.find(entry => entry.id === compatibleId).credentialStatus, "configured");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("MS-R2 · a key reply for an earlier target never lands on the current one; the current target's own failure still shows", () => withTinyDom(async () => {
  const h = await boot();
  let reject;
  let holdNext = true;
  try {
    const page = await mountedSettings(h, { hold: (path, options) => {
      if (path !== "/provider-credential" || options.method !== "PUT" || !holdNext) return null;
      holdNext = false;
      return new Promise((_, no) => { reject = no; });
    } });
    const { container, credential, rowTitled } = page;
    configure(container, "catalog-deepseek");
    const keyRow = rowTitled("API key");
    keyRow.querySelector('input[type="password"]').value = SYNTHETIC_KEY;
    const saving = credential.dispatchEvent({ type: "submit" });
    await new Promise(resolve => setTimeout(resolve, 20));
    configure(container, "catalog-openai"); // the reader moves on while DeepSeek's key is in flight
    reject(Object.assign(new Error("The Host refused this key."), { status: 400 }));
    await saving;
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(keyErrorOf(keyRow).hidden, true, "DeepSeek's late failure is not shown on OpenAI");

    // A failure for the target on screen is still reported.
    const model = rowTitled("Model").querySelector("select");
    model.dispatchEvent({ type: "change", target: model });
    keyRow.querySelector('input[type="password"]').value = SYNTHETIC_KEY;
    await credential.dispatchEvent({ type: "submit" });
    assert.equal(keyErrorOf(keyRow).hidden, false);
    assert.equal(keyErrorOf(keyRow).textContent, "Save this connection before adding its key.");
  } finally { reject?.(new Error("cleanup")); await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("MS-R2 · a background refresh of the same target keeps the typed key and a current failure", () => withTinyDom(async () => {
  const h = await boot();
  let refuseOnce = true;
  try {
    const page = await mountedSettings(h, { hold: (path, options) => {
      if (path !== "/provider-credential" || options.method !== "PUT" || !refuseOnce) return null;
      refuseOnce = false;
      return Promise.reject(Object.assign(new Error("The Host refused this key."), { status: 400 }));
    } });
    const made = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }] });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    await page.view.refresh();
    const { view, container, credential, form, rowTitled } = page;
    // Put the synthetic loopback connection in force, so a refresh re-aims the
    // form at the same target rather than at another connection.
    configure(container, made.json.connection.id);
    const saveOnly = form.querySelectorAll("button").find(node => node.textContent === "Save only");
    await form.dispatchEvent({ type: "submit", submitter: saveOnly });
    for (let tries = 0; tries < 100 && page.notes.at(-1) !== "Connection saved."; tries++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(page.notes.at(-1), "Connection saved.");
    const keyRow = rowTitled("API key");
    const key = keyRow.querySelector('input[type="password"]');
    key.value = SYNTHETIC_KEY;
    await credential.dispatchEvent({ type: "submit" });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(keyErrorOf(keyRow).hidden, false, "the current target's own failure is shown");
    const failure = keyErrorOf(keyRow).textContent;
    assert.ok(failure);

    key.value = SYNTHETIC_KEY + "-retyped";
    await view.refresh(); // e.g. Settings re-read while the reader is on this connection
    assert.equal(key.value, SYNTHETIC_KEY + "-retyped", "a refresh does not clear what the reader is typing");
    assert.equal(keyErrorOf(keyRow).hidden, false, "nor a failure that still applies to this target");
    assert.equal(keyErrorOf(keyRow).textContent, failure);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));
