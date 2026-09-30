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
    assert.match(form.textContent, /Save and ask once sends one short prompt to the selected model\. Saving never changes the model new runs use; Use for new runs does, in all chats\./);
    assert.deepEqual(form.querySelectorAll('button[type="submit"]').filter(node => !node.getAttribute("form")).map(node => node.textContent), ["Save and ask once", "Save only"]);

    key.value = SYNTHETIC_KEY;
    calls.length = 0;
    await credential.dispatchEvent({ type: "submit" });
    await new Promise(resolve => setTimeout(resolve, 50));
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
    for (let tries = 0; tries < 100 && page.notes.at(-1) !== "Connection saved."; tries++) await new Promise(resolve => setTimeout(resolve, 20));
    // SET-03 (S6) · saving a connection that is not in force leaves the model in force.
    assert.equal(page.notes.at(-1), "Connection saved. New runs keep the model in force until you choose Use for new runs.", JSON.stringify(page.calls.slice(-8)));
    assert.ok(!page.calls.includes("PUT /provider-config"), "saving a connection writes no provider config");
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
    // form at the same target rather than at another connection. Saving no
    // longer selects (SET-03, S6), so it is selected through the Host's route.
    const current = (await h.api("GET", "/provider-config")).json;
    const selected = await h.api("PUT", "/provider-config", { provider: made.json.connection.providerIdentity, model: FAKE_MODEL_ID, api: "openai-completions", expectedVersion: current.version });
    assert.equal(selected.status, 200, JSON.stringify(selected.json));
    await view.refresh();
    configure(container, made.json.connection.id);
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

test("UX-11 S1 · a key typed for a catalogue provider is stored when the connection is saved, not dropped", () => withTinyDom(async () => {
  const h = await boot();
  try {
    // This Host installs no DeepSeek models, so its config receipt is held; the
    // credential still goes to the real Host.
    const hold = (path, options) => path === "/provider-config" && options.method === "PUT"
      ? { version: 99, config: { provider: options.body.provider, model: options.body.model, api: options.body.api } } : null;
    const { container, form, calls, notes, rowTitled } = await mountedSettings(h, { hold });
    const configure = container.querySelector('[data-focus-key="connection:configure:catalog-deepseek"]');
    configure.dispatchEvent({ type: "click", target: configure });
    const keyRow = rowTitled("API key");
    const key = keyRow.querySelector('input[type="password"]');
    key.value = SYNTHETIC_KEY;
    const saveOnly = form.querySelectorAll('button[type="submit"]').find(node => node.textContent === "Save only");
    calls.length = 0;
    await form.dispatchEvent({ type: "submit", submitter: saveOnly });
    await new Promise(resolve => setTimeout(resolve, 80));
    // V5 acceptance (S6) · saving credentials keeps the selected model.
    assert.ok(!calls.includes("PUT /provider-config"), JSON.stringify(calls));
    assert.ok(calls.includes("PUT /provider-credential"), "the typed key goes to the saved connection's credential " + JSON.stringify(calls) + " " + JSON.stringify(notes) + " " + form.textContent.slice(-300));
    assert.equal(key.value, "", "a stored key leaves its field");
    assert.equal(notes.at(-1), "Connection saved. New runs keep the model in force until you choose Use for new runs.");
    const stored = (await h.api("GET", "/provider-connections")).json.connections.find(entry => entry.id === "catalog-deepseek");
    assert.equal(stored.credentialStatus, "configured");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("UX-11 S1 · a key that cannot be stored stays in its field with the error beside it; the connection stays saved", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const hold = (path, options) => {
      if (path === "/provider-config" && options.method === "PUT")
        return { version: 99, config: { provider: options.body.provider, model: options.body.model, api: options.body.api } };
      if (path === "/provider-credential") throw Object.assign(new Error("The credential store is unavailable."), { status: 503 });
      return null;
    };
    const { container, form, notes, rowTitled } = await mountedSettings(h, { hold });
    const configure = container.querySelector('[data-focus-key="connection:configure:catalog-deepseek"]');
    configure.dispatchEvent({ type: "click", target: configure });
    const keyRow = rowTitled("API key");
    const key = keyRow.querySelector('input[type="password"]');
    key.value = SYNTHETIC_KEY;
    const saveOnly = form.querySelectorAll('button[type="submit"]').find(node => node.textContent === "Save only");
    await form.dispatchEvent({ type: "submit", submitter: saveOnly });
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(key.value, SYNTHETIC_KEY, "the typed key is not lost");
    const keyError = keyRow.querySelector(".inline-error");
    assert.equal(keyError.hidden, false);
    assert.match(keyError.textContent, /credential store is unavailable/);
    assert.equal(notes.at(-1), "Connection saved. New runs keep the model in force until you choose Use for new runs.", "the connection save itself succeeded");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("S6 · SET-03/V5 · saving a keyed connection keeps the model in force; Use for new runs makes it the default", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const made = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }], apiKey: SYNTHETIC_KEY });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const before = (await h.api("GET", "/provider-config")).json.config;
    const page = await mountedSettings(h);
    configure(page.container, made.json.connection.id);
    const saveOnly = page.form.querySelectorAll("button").find((node) => node.textContent === "Save only");
    page.calls.length = 0;
    await page.form.dispatchEvent({ type: "submit", submitter: saveOnly });
    for (let tries = 0; tries < 100 && !page.notes.length; tries++) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(!page.calls.includes("PUT /provider-config"), JSON.stringify(page.calls));
    assert.deepEqual((await h.api("GET", "/provider-config")).json.config, before, "saving credentials or a custom provider keeps the selected model");

    const use = page.form.querySelectorAll("button").find((node) => node.textContent === "Use for new runs");
    assert.equal(use.disabled, false, "the saved, keyed connection can be made the default");
    page.calls.length = 0;
    await use.dispatchEvent({ type: "click", target: use });
    for (let tries = 0; tries < 100 && !page.calls.includes("PUT /provider-config"); tries++) await new Promise((resolve) => setTimeout(resolve, 20));
    await new Promise((resolve) => setTimeout(resolve, 40));
    const after = (await h.api("GET", "/provider-config")).json.config;
    assert.equal(after.provider, made.json.connection.providerIdentity);
    assert.equal(after.model, FAKE_MODEL_ID);
    assert.equal(use.disabled, true, "nothing left to switch to once it is in force");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("S6 · SET-09 · removing the key the connection in force runs on is asked once and names the consequence", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const made = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }], apiKey: SYNTHETIC_KEY });
    const current = (await h.api("GET", "/provider-config")).json;
    const selected = await h.api("PUT", "/provider-config", { provider: made.json.connection.providerIdentity, model: FAKE_MODEL_ID, api: "openai-completions", expectedVersion: current.version });
    assert.equal(selected.status, 200, JSON.stringify(selected.json));
    const page = await mountedSettings(h);
    configure(page.container, made.json.connection.id);
    const keyRow = page.rowTitled("API key");
    const remove = keyRow.querySelector('button[aria-label="Remove saved key"]');
    const confirm = keyRow.querySelector('[aria-label="Confirm removing the key"]');
    page.calls.length = 0;
    await remove.dispatchEvent({ type: "click", target: remove });
    assert.equal(confirm.hidden, false, "asked before removing");
    assert.match(confirm.textContent, /every next run in all chats fails until a key is saved again/);
    assert.ok(!page.calls.some((call) => call.startsWith("DELETE")), "nothing removed yet");
    const cancel = confirm.querySelectorAll("button").find((node) => node.textContent === "Cancel");
    await cancel.dispatchEvent({ type: "click", target: cancel });
    assert.equal(confirm.hidden, true);
    assert.ok(!page.calls.some((call) => call.startsWith("DELETE")), "Cancel removes nothing");
    await remove.dispatchEvent({ type: "click", target: remove });
    const confirmRemove = confirm.querySelectorAll("button").find((node) => node.textContent === "Remove key");
    await confirmRemove.dispatchEvent({ type: "click", target: confirmRemove });
    for (let tries = 0; tries < 100 && !page.notes.includes("Saved key removed."); tries++) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.ok(page.calls.includes("DELETE /provider-credential"));
    const stored = (await h.api("GET", "/provider-connections")).json.connections.find((entry) => entry.id === made.json.connection.id);
    assert.notEqual(stored.credentialStatus, "configured");
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));

test("S6 review · saving a new endpoint for the connection in force carries it into the configuration, model unchanged", () => withTinyDom(async () => {
  const h = await boot();
  try {
    const made = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, models: [{ id: FAKE_MODEL_ID }], apiKey: SYNTHETIC_KEY });
    const current = (await h.api("GET", "/provider-config")).json;
    await h.api("PUT", "/provider-config", { provider: made.json.connection.providerIdentity, model: FAKE_MODEL_ID, api: "openai-completions", expectedVersion: current.version });
    const page = await mountedSettings(h);
    configure(page.container, made.json.connection.id);
    const baseUrl = page.rowTitled("Base URL").querySelector("input");
    // The same fake server under another name: reachable (the Host checks its directory), yet a new endpoint.
    const moved = h.runtime.fakeProvider.baseUrl.replace("127.0.0.1", "localhost");
    baseUrl.value = moved;
    await baseUrl.dispatchEvent({ type: "input", target: baseUrl });
    const saveOnly = page.form.querySelectorAll("button").find((node) => node.textContent === "Save only");
    await page.form.dispatchEvent({ type: "submit", submitter: saveOnly });
    for (let tries = 0; tries < 100 && !page.notes.length; tries++) await new Promise((resolve) => setTimeout(resolve, 20));
    const connection = (await h.api("GET", "/provider-connections")).json.connections.find((entry) => entry.id === made.json.connection.id);
    const config = (await h.api("GET", "/provider-config")).json.config;
    assert.equal(connection.baseUrl, moved, `the connection took the new endpoint: ${JSON.stringify(page.notes)}`);
    assert.equal(config.baseUrl, moved, "the Host admits a run only on a matching endpoint");
    assert.equal(config.model, FAKE_MODEL_ID, "the model in force is unchanged");
    assert.equal(config.provider, made.json.connection.providerIdentity);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
}));
