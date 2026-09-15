import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { withTinyDom } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;

const snapshotOf = ({ effort, capability, connection = { id: "conn-1", kind: "compatible", baseUrl: "https://api.example.test/v1", api: "openai-completions", providerIdentity: "conn-1" }, credentialStatus = "configured" }) => ({
  version: 7,
  config: { provider: connection?.providerIdentity ?? "openai", model: "gpt-x", api: "openai-completions", ...(effort ? { reasoningEffort: effort } : {}) },
  reasoningCapability: capability,
  connection,
  credentialStatus,
});
const ENUM_A = { kind: "enum", source: "runtime-catalog", values: ["low", "medium", "high"], notice: "" };
const ENUM_B = { kind: "enum", source: "user-declared", values: ["off", "high"], notice: "Settings declared for this connection; provider behavior has not been verified." };

function segmentsOf(container) {
  const fieldset = container.querySelector('fieldset[aria-label="Reasoning effort"]');
  const inputs = fieldset ? fieldset.querySelectorAll("input") : [];
  return { fieldset, inputs, labels: inputs.map((input) => input.getAttribute("value")) };
}
function statusLines(container) {
  return container.querySelectorAll('[role="status"]').map((node) => node.textContent);
}
const buttonNamed = (container, text) => container.querySelectorAll("button").find((node) => node.textContent === text);

test("05 · effortChoices offers exactly the Host's enum plus Provider default, and nothing for unknown/unsupported", async () => {
  const { effortChoices, PROVIDER_DEFAULT } = await import("../web/model-effort.mjs");
  assert.deepEqual(effortChoices(ENUM_A, undefined), { selectable: true, values: ["low", "medium", "high"], checked: PROVIDER_DEFAULT, invalidSaved: null, kind: "enum", source: "runtime-catalog", notice: "" });
  assert.equal(effortChoices(ENUM_B, "high").checked, "high");
  assert.deepEqual(effortChoices(ENUM_B, "medium"), { selectable: true, values: ["off", "high"], checked: null, invalidSaved: "medium", kind: "enum", source: "user-declared", notice: ENUM_B.notice });
  assert.equal(effortChoices({ kind: "unknown", source: "unknown", values: [] }, undefined).selectable, false);
  assert.equal(effortChoices({ kind: "unsupported", source: "runtime-catalog", values: [] }, undefined).selectable, false);
  assert.equal(effortChoices({ kind: "enum", values: ["low"] }, "low").checked, "low", "a single explicit value is still a choice next to Provider default");
  assert.equal(effortChoices(null, undefined).kind, "unknown");
});

test("05 · two enumerations draw two different tracks; Provider default is a segment, not the lowest value", async () => {
  await withTinyDom(async () => {
    const { renderModelEffortCard } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: "medium", capability: ENUM_A }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    const a = segmentsOf(container);
    assert.deepEqual(a.labels, ["__provider_default__", "low", "medium", "high"]);
    assert.equal(a.fieldset.getAttribute("style"), "--segments: 4");
    assert.equal(a.inputs.find((input) => input.checked)?.getAttribute("value"), "medium");
    assert.ok(statusLines(container).includes("All chats · future runs"), "scope is stated on the card");

    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: undefined, capability: ENUM_B }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    const b = segmentsOf(container);
    assert.deepEqual(b.labels, ["__provider_default__", "off", "high"]);
    assert.equal(b.inputs.find((input) => input.checked)?.getAttribute("value"), "__provider_default__", "no saved effort means Provider default is the checked segment");
    assert.ok(statusLines(container).some((line) => line.startsWith("Values declared on this connection")), "user-declared provenance is said, not shown as verified");
  });
});

test("05 · unknown and unsupported draw no ladder; an invalid saved value is named and leaves no segment checked", async () => {
  await withTinyDom(async () => {
    const { renderModelEffortCard } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    for (const capability of [{ kind: "unknown", source: "unknown", values: [], notice: "Supported reasoning settings are unknown. Provider default omits the parameter." }, { kind: "unsupported", source: "runtime-catalog", values: [], notice: "" }]) {
      renderModelEffortCard(container, { snapshot: snapshotOf({ effort: undefined, capability }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
      assert.equal(segmentsOf(container).fieldset, null, `${capability.kind} draws no segments`);
      assert.equal(container.querySelector(".model-effort-fixed")?.textContent, "Provider default");
    }
    assert.ok(statusLines(container).some((line) => line.includes("unsupported")));

    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: "max", capability: ENUM_A }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    const invalid = segmentsOf(container);
    assert.deepEqual(invalid.labels, ["__provider_default__", "low", "medium", "high"], "the stale value is not drawn as a segment");
    assert.equal(invalid.inputs.some((input) => input.checked), false);
    assert.ok(statusLines(container).some((line) => line.startsWith("Saved value max is no longer offered")));
  });
});

test("05 · a segment change reports the exact value (undefined for Provider default); an active Run disables the track", async () => {
  await withTinyDom(async () => {
    const { renderModelEffortCard } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const chosen = [];
    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort: (value) => { chosen.push(value); } });
    const { inputs } = segmentsOf(container);
    const high = inputs.find((input) => input.getAttribute("value") === "high");
    high.checked = true; await high.dispatchEvent({ type: "change", target: high });
    const dflt = inputs.find((input) => input.getAttribute("value") === "__provider_default__");
    dflt.checked = true; await dflt.dispatchEvent({ type: "change", target: dflt });
    assert.deepEqual(chosen, ["high", undefined]);

    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), active: true, onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    assert.equal(segmentsOf(container).fieldset.disabled, true);
    assert.ok(statusLines(container).includes("Available after this run ends."));

    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), busy: true, feedback: "Saving…", onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    assert.equal(segmentsOf(container).fieldset.disabled, true);
    assert.ok(statusLines(container).includes("Saving…"));
  });
});

test("05 · the card names the connection, says when it has no key, and its row lands on that connection or on Add provider", async () => {
  await withTinyDom(async () => {
    const { renderModelEffortCard } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const landed = [];
    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: undefined, capability: ENUM_A, credentialStatus: "not_configured" }), onClose() {}, onChangeModel() {}, onConnections: (id) => landed.push(id), onEffort() {} });
    const text = container.textContent;
    assert.ok(text.includes("api.example.test · openai-completions"), "the connection is named by its host, as in Settings");
    assert.ok(text.includes("No API key on this connection."));
    const row = buttonNamed(container, "Connections");
    await row.dispatchEvent({ type: "click", target: row });
    assert.deepEqual(landed, ["conn-1"]);

    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: undefined, capability: ENUM_A, connection: null }), onClose() {}, onChangeModel() {}, onConnections: (id) => landed.push(id), onEffort() {} });
    assert.ok(container.textContent.includes("No connection"));
    const add = buttonNamed(container, "Add provider");
    await add.dispatchEvent({ type: "click", target: add });
    assert.deepEqual(landed, ["conn-1", null]);

    const local = { id: "conn-local", kind: "catalog", providerIdentity: "fake-openai-loopback", api: "openai-completions" };
    renderModelEffortCard(container, { snapshot: snapshotOf({ effort: undefined, capability: { kind: "unsupported", values: [] }, connection: local, credentialStatus: "not_configured" }), onClose() {}, onChangeModel() {}, onConnections() {}, onEffort() {} });
    assert.equal(container.textContent.includes("No API key"), false, "the local connection needs no key");
    assert.equal(container.querySelector(".model-effort-name")?.textContent, "Local test");
  });
});

test("05 · app wiring: the composer control opens the card, saves with the snapshot version, drops stale receipts, and lands Settings on the connection", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const server = readFileSync(`${root}app/server/index.mjs`, "utf8");
  const css = readFileSync(`${root}app/web/styles.css`, "utf8");
  assert.match(html, /id="model-settings-button"[^>]*aria-controls="model-popover"/s, "the control names the card, not the dialog");
  assert.match(html, /id="model-popover"\s+class="context-popover connection-popover model-popover"\s+popover="auto"/);
  assert.match(app, /\$\("model-settings-button"\)\.addEventListener\("click", \(event\) => openModelCard\(event\.currentTarget\)\)/);
  assert.match(app, /onChangeModel: \(\) => \{ popover\.hidePopover\(\); void modelPicker\.open\(\); \}/, "the full dialog stays one row away");
  assert.match(app, /expectedVersion: snapshot\.version/, "a save carries the version of the snapshot it was chosen from");
  assert.match(app, /const own = \+\+modelCardEpoch;[\s\S]*?if \(own !== modelCardEpoch\) return;\s*state\.providerConfig = result;/, "a receipt older than the latest choice is dropped");
  assert.match(app, /reasoningCapability: snapshot\.reasoningCapability \}\] \};\s*const body = \{ \.\.\.projectProviderConfig\(config, \{ reasoningEffort: effort \}, catalog\)/, "the projection is fed only the Host's capability for the in-force selection");
  assert.match(app, /error\.code === "active_run"\) modelCardFeedback = "Available after this run ends\."/);
  assert.match(app, /openSettings\("models", \{ trigger, connectionId \}\)/);
  assert.match(app, /if \(connectionId !== undefined\) void settingsView\.locateConnection\(connectionId\);/);
  assert.match(app, /placement: "top-end" \}\);\s*\$\("model-settings-button"\)\.setAttribute\("aria-expanded", String\(open\)\)/);
  assert.match(server, /"model-effort\.mjs"/, "the Host serves the card module");
  assert.match(css, /\.segmented:has\(\.segment:nth-child\(8\) input:checked\)::before/, "the thumb follows up to eight segments");
});
