/* UX-11 (S2) · the composer's model and effort chooser (model-effort.mjs renders,
 * model-chooser.mjs owns state and requests). The effort-track claims of the
 * former 05 card carry over unchanged; the model list replaces the modal picker. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { withTinyDom, press } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;

const snapshotOf = ({ effort, capability, connection = { id: "conn-1", kind: "compatible", baseUrl: "https://api.example.test/v1", api: "openai-completions", providerIdentity: "conn-1" }, model = "gpt-x" }) => ({
  version: 7,
  config: { provider: connection?.providerIdentity ?? "openai", model, api: "openai-completions", ...(effort ? { reasoningEffort: effort } : {}) },
  reasoningCapability: capability,
  connection,
});
const ENUM_A = { kind: "enum", source: "runtime-catalog", values: ["low", "medium", "high"], notice: "" };
const ENUM_B = { kind: "enum", source: "user-declared", values: ["off", "high"], notice: "Settings declared for this connection; provider behavior has not been verified." };
const noop = () => {};
const handlers = { onClose: noop, onQuery: noop, onHighlight: noop, onCommit: noop, onEffort: noop, onConnections: noop, onRetry: noop };

function segmentsOf(container) {
  const fieldset = container.querySelector('fieldset[aria-label="Reasoning effort"]');
  const inputs = fieldset ? fieldset.querySelectorAll("input") : [];
  return { fieldset, inputs, labels: inputs.map((input) => input.getAttribute("value")) };
}
const texts = (container, selector) => container.querySelectorAll(selector).map((node) => node.textContent);
const buttonNamed = (container, label) => container.querySelectorAll("button").find((node) => node.getAttribute("aria-label") === label || node.textContent === label);

const REGISTRY = [
  { id: "conn-1", kind: "compatible", providerIdentity: "conn-1", baseUrl: "https://api.example.test/v1", api: "openai-completions", credentialStatus: "configured", models: [] },
  { id: "catalog-openai", kind: "catalog", providerIdentity: "openai", api: "openai-responses", credentialStatus: "not_configured", models: [] },
  { id: "catalog-fake-openai-loopback", kind: "catalog", providerIdentity: "fake-openai-loopback", api: "openai-completions", credentialStatus: "not_configured", models: [] },
];
const CATALOG = {
  version: 7,
  models: [
    { provider: "conn-1", id: "gpt-x", name: "GPT X", api: "openai-completions", reasoningCapability: ENUM_A },
    { provider: "conn-1", id: "gpt-y", name: "GPT Y", api: "openai-completions", reasoningCapability: { kind: "enum", values: ["high"] } },
    { provider: "conn-1", id: "gpt-z", name: "GPT Z", api: "openai-completions", reasoningCapability: { kind: "enum", values: ["low"] } },
    { provider: "openai", id: "gpt-5", name: "GPT-5", api: "openai-responses" },
    { provider: "openai", id: "gpt-5-mini", name: "GPT-5 mini", api: "openai-responses" },
    { provider: "fake-openai-loopback", id: "fake-model", name: "Fake", api: "openai-completions" },
  ],
};

test("S2 · rows: flat list, connection as trailing label, local needs no label or key, keyless connections grouped unless searching", async () => {
  await withTinyDom(async () => {
    const { modelRows, visibleRows, matchesQuery } = await import("../web/model-effort.mjs");
    const rows = modelRows(CATALOG, REGISTRY, { provider: "conn-1", model: "gpt-x" });
    const x = rows.find((row) => row.id === "gpt-x");
    assert.equal(x.meta, "api.example.test");
    assert.equal(x.inForce, true);
    assert.equal(x.keyMissing, false);
    const local = rows.find((row) => row.id === "fake-model");
    assert.equal(local.name, "Local test");
    assert.equal(local.meta, "", "the local row needs no connection label");
    assert.equal(local.keyMissing, false, "the local connection needs no key");
    assert.equal(rows.find((row) => row.id === "gpt-5").keyMissing, true);

    const shown = visibleRows(rows, "");
    assert.deepEqual(shown.map((row) => row.name), ["GPT X", "GPT Y", "GPT Z", "Local test", "OpenAI"], "usable first; one row per keyless connection");
    assert.equal(shown.at(-1).meta, "2 models");
    assert.equal(shown.at(-1).group, true);
    const searched = visibleRows(rows, "5 mini");
    assert.deepEqual(searched.map((row) => row.id), ["gpt-5-mini"], "a search finds a keyless model by name");
    assert.equal(matchesQuery({ name: "GPT X", meta: "api.example.test", provider: "conn-1", id: "gpt-x" }, "conn"), true, "the provider identity stays searchable");
  });
});

test("S2 · the chooser states its scope, marks the in-force model, disables keyless rows and gives their fix", async () => {
  await withTinyDom(async () => {
    const { modelRows, renderModelChooser, optionId } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const rows = modelRows(CATALOG, REGISTRY, { provider: "conn-1", model: "gpt-x" });
    const landed = [];
    const openai = JSON.stringify(["connection", "catalog-openai"]);
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ capability: ENUM_A }), rows, activeKey: openai, onConnections: (id) => landed.push(id) });
    assert.ok(texts(container, ".model-chooser-scope").includes("All chats · future runs"), "scope is stated once for model and effort");
    const listbox = container.querySelector('[role="listbox"]');
    assert.equal(listbox.getAttribute("aria-activedescendant"), optionId("model-effort", openai));
    const options = container.querySelectorAll('[role="option"]');
    assert.equal(options.find((node) => node.textContent.startsWith("GPT X")).getAttribute("aria-selected"), "true");
    assert.equal(options.find((node) => node.textContent.startsWith("OpenAI")).getAttribute("aria-disabled"), "true");
    assert.match(container.textContent, /OpenAI has no API key, so its models cannot run yet\./);
    const fix = buttonNamed(container, "Add a key for OpenAI in Settings");
    await fix.dispatchEvent({ type: "click", target: fix });
    assert.deepEqual(landed, ["catalog-openai"]);
    assert.equal(container.querySelector('input[type="search"]'), null, "six models need no search");
    assert.equal(container.textContent.includes("Change model"), false, "no second dialog one row away");
  });
});

test("05 · two enumerations draw two different tracks; Provider default is a segment, not the lowest value", async () => {
  await withTinyDom(async () => {
    const { renderModelChooser } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: "medium", capability: ENUM_A }) });
    const a = segmentsOf(container);
    assert.deepEqual(a.labels, ["__provider_default__", "low", "medium", "high"]);
    assert.equal(a.fieldset.getAttribute("style"), "--segments: 4");
    assert.equal(a.inputs.find((input) => input.checked)?.getAttribute("value"), "medium");

    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: undefined, capability: ENUM_B }) });
    const b = segmentsOf(container);
    assert.deepEqual(b.labels, ["__provider_default__", "off", "high"]);
    assert.equal(b.inputs.find((input) => input.checked)?.getAttribute("value"), "__provider_default__", "no saved effort means Provider default is the checked segment");
    assert.ok(texts(container, "p").some((line) => line.startsWith("Values declared on this connection")), "user-declared provenance is said, not shown as verified");
  });
});

test("05 · unknown and unsupported draw no ladder; an invalid saved value is named and leaves no segment checked", async () => {
  await withTinyDom(async () => {
    const { renderModelChooser } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    for (const capability of [{ kind: "unknown", source: "unknown", values: [], notice: "Supported reasoning settings are unknown. Provider default omits the parameter." }, { kind: "unsupported", source: "runtime-catalog", values: [], notice: "" }]) {
      renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ capability }) });
      assert.equal(segmentsOf(container).fieldset, null, `${capability.kind} draws no segments`);
      assert.equal(container.querySelector(".model-effort-fixed")?.textContent, "Provider default");
    }
    assert.ok(texts(container, "p").some((line) => line.includes("unsupported")));

    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: "max", capability: ENUM_A }) });
    const invalid = segmentsOf(container);
    assert.deepEqual(invalid.labels, ["__provider_default__", "low", "medium", "high"], "the stale value is not drawn as a segment");
    assert.equal(invalid.inputs.some((input) => input.checked), false);
    assert.ok(texts(container, "p").some((line) => line.startsWith("Saved value max is no longer offered")));
  });
});

test("05 · a segment change reports the exact value (undefined for Provider default); a run lock or a save disables the track", async () => {
  await withTinyDom(async () => {
    const { renderModelChooser } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const chosen = [];
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), onEffort: (value) => { chosen.push(value); } });
    const { inputs } = segmentsOf(container);
    const high = inputs.find((input) => input.getAttribute("value") === "high");
    high.checked = true; await high.dispatchEvent({ type: "change", target: high });
    const dflt = inputs.find((input) => input.getAttribute("value") === "__provider_default__");
    dflt.checked = true; await dflt.dispatchEvent({ type: "change", target: dflt });
    assert.deepEqual(chosen, ["high", undefined]);

    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), frozen: "Available after this run ends." });
    assert.equal(segmentsOf(container).fieldset.disabled, true);
    assert.ok(texts(container, '[role="status"]').includes("Available after this run ends."));

    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ effort: "low", capability: ENUM_A }), busy: true, feedback: "Saving…" });
    assert.equal(segmentsOf(container).fieldset.disabled, true);
    assert.ok(texts(container, '[role="status"]').includes("Saving…"));
  });
});

test("05 · the Models row lands on the in-force connection, or on Add provider without one", async () => {
  await withTinyDom(async () => {
    const { renderModelChooser } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const landed = [];
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ capability: ENUM_A }), onConnections: (id) => landed.push(id) });
    const row = buttonNamed(container, "Open Models settings");
    assert.equal(row.children.at(-1).tagName, "svg", "the chevron trails the label");
    await row.dispatchEvent({ type: "click", target: row });
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ capability: ENUM_A, connection: null }), onConnections: (id) => landed.push(id) });
    const add = buttonNamed(container, "Add provider");
    await add.dispatchEvent({ type: "click", target: add });
    assert.deepEqual(landed, ["conn-1", null]);
  });
});

/* A popover node the controller can open: tiny-dom has no Popover API. */
function popoverNode() {
  const node = document.createElement("div");
  node.setAttribute("id", "model-popover");
  let open = false;
  node.showPopover = () => { open = true; };
  node.hidePopover = () => { open = false; };
  const matches = node.matches.bind(node);
  node.matches = (selector) => (selector === ":popover-open" ? open : matches(selector));

  return node;
}
function hostDouble({ config = { provider: "conn-1", model: "gpt-x", api: "openai-completions", reasoningEffort: "high" }, refuse = null } = {}) {
  const puts = [];
  let snapshot = { version: 7, config, reasoningCapability: ENUM_A, connection: REGISTRY[0] };
  const request = async (path, options = {}) => {
    if (path === "/provider-config" && options.method === "PUT") {
      puts.push(options.body);
      if (refuse) throw refuse;
      snapshot = { ...snapshot, version: snapshot.version + 1, config: Object.fromEntries(Object.entries(options.body).filter(([key]) => key !== "expectedVersion")) };
      return snapshot;
    }
    if (path === "/provider-config") return snapshot;
    if (path === "/provider-models") return CATALOG;
    if (path === "/provider-connections") return { connections: REGISTRY };
    throw new Error(`unexpected ${path}`);
  };
  return { puts, request, get snapshot() { return snapshot; } };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function openChooser(host, { ownRunBusy = () => false } = {}) {
  const { createModelChooser } = await import("../web/model-chooser.mjs");
  let state = host.snapshot;
  const popover = popoverNode();
  const chip = document.createElement("button");
  const landed = [];
  const chooser = createModelChooser({ popover, name: "t", request: host.request, getSnapshot: () => state, onSnapshot: (value) => { state = value; }, ownRunBusy, onConnections: (id) => landed.push(id) });
  chooser.open(chip);
  await tick(); await tick();
  const option = (name) => popover.querySelectorAll('[role="option"]').find((node) => node.querySelector(".model-option-name").textContent === name);
  const commit = async (name) => { await option(name).dispatchEvent({ type: "click", target: option(name) }); await tick(); };
  return { chooser, popover, chip, landed, option, commit, state: () => state };
}

test("S2 · committing a model keeps the requested effort when offered, says when it is dropped, and stays open for the effort", async () => {
  await withTinyDom(async () => {
    const host = hostDouble();
    const { popover, commit, state } = await openChooser(host);
    await commit("GPT Y");
    assert.equal(host.puts.at(-1).model, "gpt-y");
    assert.equal(host.puts.at(-1).reasoningEffort, "high", "GPT Y offers high, so it is kept");
    assert.equal(host.puts.at(-1).expectedVersion, 7, "the save carries the snapshot's version");
    assert.equal(state().config.model, "gpt-y");
    assert.equal(popover.matches(":popover-open"), true, "open, so the new model's effort is one step away");
    await commit("GPT Z");
    assert.equal(host.puts.at(-1).reasoningEffort, undefined);
    assert.equal(popover.querySelector(".model-chooser-status").textContent, "Saved · GPT Z. It does not offer high; Provider default is used · all chats · future runs");
  });
});

test("S2 · a keyless row, a run in this chat, and a run elsewhere each refuse without pretending", async () => {
  await withTinyDom(async () => {
    const host = hostDouble();
    const { popover, commit } = await openChooser(host);
    await commit("OpenAI");
    assert.equal(host.puts.length, 0, "a keyless connection is not committed");
    assert.match(popover.textContent, /OpenAI has no API key/);

    const ownHost = hostDouble();
    const own = await openChooser(ownHost, { ownRunBusy: () => true });
    await own.commit("GPT Y");
    assert.equal(ownHost.puts.length, 0);
    assert.equal(own.popover.querySelector(".model-chooser-status").textContent, "Available after this run ends.");

    const refused = Object.assign(new Error("provider config is frozen during a run"), { status: 409, body: { error: { code: "active_run" } } });
    const elsewhere = hostDouble({ refuse: refused });
    const other = await openChooser(elsewhere);
    await other.commit("GPT Y");
    assert.equal(elsewhere.puts.length, 1);
    assert.equal(other.popover.querySelector(".model-chooser-status").textContent, "Another chat is running. Available when it ends.");
  });
});

test("S2 · keyboard: arrows move, Enter commits, Escape closes and returns focus to the opener", async () => {
  await withTinyDom(async () => {
    const host = hostDouble();
    const { popover, chip } = await openChooser(host);
    const listbox = () => popover.querySelector('[role="listbox"]');
    listbox().focus();
    press(listbox(), "ArrowDown");
    assert.match(popover.querySelector(".model-option.is-active").textContent, /^GPT Y/);
    press(listbox(), "Enter");
    await tick();
    assert.equal(host.puts.at(-1).model, "gpt-y");
    press(popover, "Escape");
    assert.equal(popover.matches(":popover-open"), false);
    assert.equal(document.activeElement, chip);
  });
});

test("S2 · app wiring: one chooser per surface; the composer chip, /model and Attention open it; no modal picker remains", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const server = readFileSync(`${root}app/server/index.mjs`, "utf8");
  const attention = readFileSync(`${root}app/web/attention-agent-view.mjs`, "utf8");
  assert.match(html, /id="model-settings-button"[^>]*aria-controls="model-popover"/s);
  assert.match(html, /id="model-popover"\s+class="context-popover connection-popover model-popover"\s+popover="auto"\s+role="dialog"/);
  assert.match(app, /\$\("model-settings-button"\)\.addEventListener\("click", \(event\) => modelChooser\.open\(event\.currentTarget\)\);/);
  assert.match(app, /modelChooser = createModelChooser\(\{\s*popover: \$\("model-popover"\)/);
  assert.match(app, /\$\("attention-agent-dialog"\)\.append\(attentionModelPopover\);/, "the Attention chooser lives inside its modal dialog");
  assert.match(app, /onChooseModel: \(anchor\) => attentionModelChooser\.open\(anchor\)/);
  assert.match(attention, /onChooseModel\?\.\(modelChoice\)/);
  assert.match(app, /onConnections: \(connectionId, trigger\) => openSettings\("models", \{ trigger, connectionId \}\)/);
  assert.match(app, /if \(connectionId !== undefined\) void settingsView\.locateConnection\(connectionId\);/);
  assert.match(app, /icon\("chevron-down", \{ size: 16 \}\)/, "the chip carries a disclosure mark, not a gear");
  assert.doesNotMatch(app, /createModelPicker|modelPicker/);
  assert.match(server, /"model-chooser\.mjs", "model-id-entry\.mjs", "model-effort\.mjs"/, "the Host serves the chooser modules");
  assert.doesNotMatch(server, /"model-picker\.mjs"/);
});

test("S2 review · a save survives reopening the chooser, and busy always clears", async () => {
  await withTinyDom(async () => {
    const host = hostDouble();
    let release;
    const held = new Promise((resolve) => { release = resolve; });
    const request = async (path, options = {}) => {
      if (path === "/provider-config" && options.method === "PUT") { await held; return host.request(path, options); }
      return host.request(path, options);
    };
    const { popover, chooser, chip, option, state } = await openChooser({ ...host, request });
    const click = option("GPT Y");
    click.dispatchEvent({ type: "click", target: click });
    await tick();
    chooser.close(); chooser.open(chip); await tick(); await tick();
    release(); await tick(); await tick();
    assert.equal(state().config.model, "gpt-y", "the Host's receipt is applied");
    const again = option("GPT Z");
    await again.dispatchEvent({ type: "click", target: again }); await tick(); await tick();
    assert.equal(host.puts.at(-1).model, "gpt-z", "the chooser is not left busy");
    assert.equal(popover.matches(":popover-open"), true);
  });
});

test("S2 review · on a custom endpoint the kept effort is dropped, because the Host has no ladder there", async () => {
  await withTinyDom(async () => {
    const host = hostDouble({ config: { provider: "conn-1", model: "gpt-x", api: "openai-completions", baseUrl: "https://custom.example.test/v1", reasoningEffort: "high" } });
    const { popover, commit } = await openChooser(host);
    await commit("GPT Y");
    assert.equal(Object.hasOwn(host.puts.at(-1), "reasoningEffort"), false);
    assert.equal(host.puts.at(-1).baseUrl, "https://custom.example.test/v1", "same provider keeps its endpoint");
    assert.match(popover.querySelector(".model-chooser-status").textContent, /It does not offer high/);
  });
});

test("S2 review · redraws keep the same list and search nodes; ids differ per instance; empty and failed reads say so", async () => {
  await withTinyDom(async () => {
    const { renderModelChooser, modelRows, optionId } = await import("../web/model-effort.mjs");
    const container = document.createElement("div");
    const many = { version: 7, models: Array.from({ length: 10 }, (_, i) => ({ provider: "conn-1", id: `m${i}`, name: `Model ${i}`, api: "openai-completions" })) };
    const rows = modelRows(many, REGISTRY, { provider: "conn-1", model: "m0" });
    const first = renderModelChooser(container, { ...handlers, name: "a", loaded: true, snapshot: snapshotOf({ capability: ENUM_A }), rows, activeKey: rows[0].key });
    const second = renderModelChooser(container, { ...handlers, name: "a", loaded: true, snapshot: snapshotOf({ capability: ENUM_A }), rows, activeKey: rows[3].key, query: "" });
    assert.equal(first.listbox, second.listbox, "the listbox node persists, so its scroll position does");
    assert.ok(first.search && first.search === second.search, "the search node persists, so a composition is not interrupted");
    assert.equal(second.search.getAttribute("role"), "combobox");
    assert.equal(second.search.getAttribute("aria-activedescendant"), optionId("a", rows[3].key));
    assert.notEqual(optionId("a", rows[0].key), optionId("b", rows[0].key));

    const empty = document.createElement("div");
    renderModelChooser(empty, { ...handlers, loaded: true, snapshot: snapshotOf({ capability: ENUM_A }), rows: [] });
    assert.match(empty.textContent, /No model is installed yet/);
    const reading = document.createElement("div");
    renderModelChooser(reading, { ...handlers, loaded: false, snapshot: snapshotOf({ capability: ENUM_A }), rows: [] });
    assert.match(reading.textContent, /Reading installed models/);

    const failing = hostDouble();
    const request = async (path, options) => (path === "/provider-connections" ? Promise.reject(new Error("registry unavailable")) : failing.request(path, options));
    const { popover } = await openChooser({ ...failing, request });
    assert.match(popover.textContent, /Could not read the installed models: registry unavailable/, "without the registry no row can claim it runs");
    assert.equal(popover.querySelectorAll('[role="option"]').length, 0);
  });
});

test("S2 review · search: Enter picks the top match, not the in-force row; an IME confirmation does not commit", async () => {
  await withTinyDom(async () => {
    const host = hostDouble();
    const many = { version: 7, models: [...CATALOG.models, ...Array.from({ length: 6 }, (_, i) => ({ provider: "conn-1", id: `extra-${i}`, name: `Extra ${i}`, api: "openai-completions" }))] };
    const request = async (path, options) => (path === "/provider-models" ? many : host.request(path, options));
    const { popover } = await openChooser({ ...host, request });
    const search = popover.querySelector('input[type="search"]');
    search.value = "gpt z";
    search.dispatchEvent({ type: "input", target: search });
    search.dispatchEvent({ type: "keydown", key: "Enter", isComposing: true, target: search });
    await tick();
    assert.equal(host.puts.length, 0, "confirming a composition is not a commit");
    search.dispatchEvent({ type: "keydown", key: "Enter", target: search });
    await tick();
    assert.equal(host.puts.at(-1).model, "gpt-z");
  });
});

test("S2 evidence · the chip and the effort heading name the model as its row does, with the ID only when the catalogue does not list it", async () => {
  await withTinyDom(async () => {
    const { modelRows, renderModelChooser, visibleModelName } = await import("../web/model-effort.mjs");
    assert.equal(visibleModelName({ provider: "conn-1", model: "gpt-x" }, CATALOG), "GPT X");
    assert.equal(visibleModelName({ provider: "conn-1", model: "gpt-unlisted" }, CATALOG), "gpt-unlisted");
    assert.equal(visibleModelName({ provider: "conn-1", model: "gpt-x" }), "gpt-x", "before the catalogue is read");
    assert.equal(visibleModelName({ provider: "fake-openai-loopback", model: "fake-model" }, CATALOG), "Local test");
    const container = document.createElement("div");
    const rows = modelRows(CATALOG, REGISTRY, { provider: "conn-1", model: "gpt-x" });
    renderModelChooser(container, { ...handlers, snapshot: snapshotOf({ capability: ENUM_A }), rows, loaded: true });
    assert.ok(texts(container, "h4").includes("Reasoning effort · GPT X"));
    const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
    assert.match(app, /visibleModelName\(config, state\.modelCatalog\)/, "the composer chip reads the catalogue name");
    assert.match(app, /onCatalog: keepModelCatalog/, "each chooser hands its catalogue read to the chip");
  });
});

test("S2 evidence · on a phone the composer controls wrap to a second row instead of cutting each label to a letter", () => {
  const css = readFileSync(`${root}app/web/styles.css`, "utf8");
  const narrow = [...css.matchAll(/@media \(max-width: 767px\) \{([\s\S]*?)\n\}/g)].map((match) => match[1]).join("\n");
  assert.match(narrow, /\.composer-form \.composer-controls \{ flex-wrap: wrap;/);
  assert.match(css, /\.composer-form \.composer-controls \{ flex-wrap: nowrap; \}/, "wider layouts keep one row");
});
