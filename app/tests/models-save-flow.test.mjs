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

const SYNTHETIC_KEY = "sk-synthetic-models-flow-0000";

async function mountedSettings(h) {
  const byId = new Map();
  document.getElementById = (id) => { if (!byId.has(id)) byId.set(id, document.createElement("div")); return byId.get(id); };
  const container = document.createElement("div");
  const calls = [];
  const notes = [];
  const view = createSettingsView(container, {
    request: async (path, options = {}) => {
      calls.push(`${options.method ?? "GET"} ${path}`);
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
  return { container, form, credential, calls, notes, rowTitled };
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
