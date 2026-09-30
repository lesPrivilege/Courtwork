import { el, action } from "./ui-controls.mjs";
import { connectionLabel, connectionPathOfKind } from "./settings-view.mjs";

/* UX-11 (S2) · the model and effort chooser, drawn from Host facts only: the
 * in-force selection and its reasoning capability (`GET /provider-config`),
 * the installed catalogue (`GET /provider-models`) and the connection registry
 * (`GET /provider-connections`). Choosing among configured models is one
 * disclosure from the composer, in one flat list whose connection is trailing
 * metadata; registering connections and unlisted IDs stays in Settings › Models.
 * The effort track draws exactly the Host's enum plus Provider default;
 * `unknown` and `unsupported` draw no ladder. Both choices are Host-wide: the
 * scope line says so. State, requests and keyboard live in model-chooser.mjs. */

export const PROVIDER_DEFAULT = "__provider_default__";
export const MODEL_SCOPE = "All chats · future runs";

/** What the effort control may offer for this snapshot. Pure. */
export function effortChoices(capability, savedEffort) {
  const values = capability?.kind === "enum" && Array.isArray(capability.values)
    ? capability.values.filter((value) => typeof value === "string" && value)
    : [];
  const saved = typeof savedEffort === "string" && savedEffort ? savedEffort : null;
  const invalidSaved = saved && !values.includes(saved) ? saved : null;
  return {
    selectable: values.length > 0,
    values,
    checked: invalidSaved ? null : saved ?? PROVIDER_DEFAULT,
    invalidSaved,
    kind: capability?.kind === "enum" || capability?.kind === "unsupported" ? capability.kind : "unknown",
    source: typeof capability?.source === "string" ? capability.source : "unknown",
    notice: typeof capability?.notice === "string" ? capability.notice : "",
  };
}

/** The in-force model by the name its chooser row shows: the catalogue's
 * display name when the catalogue is known, else the model ID. The local path
 * is the fake-openai-loopback provider (connectionPathOfKind), as in modelRows. */
export function visibleModelName(config, catalog) {
  if (!config?.model) return "Not selected";
  if (config.provider === "fake-openai-loopback") return "Local test";
  const listed = catalog?.models?.find?.((model) => model.provider === config.provider && model.id === config.model);
  return listed?.name || config.model;
}

/** One row per installed model: display name, its connection as trailing
 * metadata, and whether that connection lacks the key it needs. Pure. */
export function modelRows(catalog, connections, config) {
  const models = Array.isArray(catalog?.models) ? catalog.models : [];
  return models.map((model) => {
    const connection = (connections || []).find((entry) => entry.providerIdentity === model.provider) || null;
    const local = model.provider === "fake-openai-loopback" || connectionPathOfKind(connection) === "local";
    return {
      key: JSON.stringify([model.provider, model.id]),
      provider: model.provider,
      id: model.id,
      api: model.api,
      name: local ? "Local test" : model.name || model.id,
      // The local test connection needs no label: its name already says it.
      meta: local ? "" : `${connection ? connectionLabel(connection) : model.provider}${model.origin === "connection" ? " · added on this connection" : ""}`,
      connectionId: connection?.id ?? null,
      keyMissing: Boolean(connection) && !local && connection.credentialStatus !== "configured",
      inForce: model.provider === config?.provider && model.id === config?.model,
    };
  });
}

/** Case-insensitive subsequence match over name, connection, provider and id. Pure. */
export function matchesQuery(row, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  const hay = `${row.name} ${row.meta} ${row.provider ?? ""} ${row.id}`.toLowerCase();
  let at = 0;
  for (const char of needle) {
    at = hay.indexOf(char, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
}

/** The rows the list shows, in order: models that can run first, then models
 * whose connection has no key. Without a search, each keyless connection is one
 * row that leads to its key, so unusable models do not bury usable ones; a
 * search still finds a keyless model by name. Pure. */
export function visibleRows(rows, query) {
  const matching = rows.filter((row) => matchesQuery(row, query));
  const usable = matching.filter((row) => !row.keyMissing);
  if (String(query || "").trim()) return [...usable, ...matching.filter((row) => row.keyMissing)];
  const keyless = new Map();
  for (const row of matching.filter((entry) => entry.keyMissing)) {
    const group = keyless.get(row.connectionId) ?? { key: JSON.stringify(["connection", row.connectionId]), name: row.meta, meta: "", count: 0, connectionId: row.connectionId, keyMissing: true, inForce: false, group: true };
    group.count += 1;
    group.inForce ||= row.inForce;
    keyless.set(row.connectionId, group);
  }
  return [...usable, ...[...keyless.values()].map((group) => ({ ...group, meta: `${group.count} model${group.count === 1 ? "" : "s"}` }))];
}

export const SEARCH_THRESHOLD = 8;
/** A DOM id per chooser instance and row; keys are JSON, so hex keeps the id a plain token. */
export const optionId = (name, key) => `${name}-option-${Array.from(key, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("")}`;

/* One segment per legal value. Native radios: keyboard, touch and the saved
 * state come from the platform, the thumb from the shared `.segmented` track. */
function segmentedEffort({ choices, name, disabled, onChange }) {
  const options = [[PROVIDER_DEFAULT, "Provider default"], ...choices.values.map((value) => [value, value])];
  const fieldset = el("fieldset", {
    className: "segmented model-effort-segmented",
    attrs: { "aria-label": "Reasoning effort", style: `--segments: ${options.length}` },
  });
  fieldset.disabled = disabled;
  for (const [option, text] of options) {
    const id = `${name}-${option}`;
    const input = el("input", { attrs: { type: "radio", name, id, value: option } });
    input.checked = option === choices.checked;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      void onChange(option === PROVIDER_DEFAULT ? undefined : option);
    });
    fieldset.append(el("label", { className: "segment", attrs: { for: id } }, input, el("span", { text })));
  }
  return fieldset;
}

/**
 * Draw the chooser into `container`. The first call builds a stable skeleton;
 * later calls update it in place, so the list keeps its scroll position, the
 * search keeps an input-method composition, and focus stays where it was.
 * `rows` come from `modelRows`; `activeKey` is the highlighted row; `query`
 * filters when the list is long. `loaded` separates "reading" from "none
 * installed". `frozen` is the notice while a run holds the Host's lock (null
 * otherwise); `feedback` is the latest save line. Handlers are read at event
 * time, so a later call may replace them.
 */
export function renderModelChooser(container, opts) {
  let view = container.modelChooserView;
  if (!view || view.name !== (opts.name ?? "model-effort")) view = container.modelChooserView = buildChooser(container, opts.name ?? "model-effort");
  view.opts = opts;
  updateChooser(view, opts);
  return { header: view.header, listbox: view.listbox, search: view.search, close: view.close };
}

function buildChooser(container, name) {
  const view = { name, opts: null, search: null };
  const call = (key, ...args) => view.opts?.[key]?.(...args);
  view.close = action("x", "Close model and effort", () => call("onClose"));
  view.header = el("div", { className: "section-heading" }, el("h3", { text: "Model & effort" }), view.close);
  view.scope = el("p", { className: "context-meta model-chooser-scope", text: MODEL_SCOPE });
  view.searchSlot = el("div", { className: "model-chooser-search-slot" });
  view.listbox = el("div", { className: "model-listbox", attrs: { role: "listbox", tabindex: "0", id: `${name}-listbox`, "aria-label": "Models" } });
  view.listNote = el("div", { className: "model-chooser-list-note" });
  view.fix = el("div", { className: "model-chooser-fix" });
  view.models = el("section", { className: "context-card model-chooser-models" }, el("h4", { text: "Model" }), view.searchSlot, view.listbox, view.listNote, view.fix);
  view.effort = el("section", { className: "context-card" });
  view.status = el("p", { className: "context-meta model-chooser-status", attrs: { role: "status" } });
  view.manage = el("div", { className: "model-chooser-manage" });
  view.makeSearch = () => {
    const search = el("input", { className: "model-chooser-search", attrs: {
      type: "search", id: `${name}-search`, placeholder: "Find a model", "aria-label": "Find a model", role: "combobox",
      "aria-expanded": "true", "aria-autocomplete": "list", "aria-controls": `${name}-listbox`, autocomplete: "off" } });
    search.addEventListener("input", () => call("onQuery", search.value));
    return search;
  };
  container.replaceChildren(view.header, view.scope, view.models, view.effort, view.status, view.manage);
  return view;
}

function updateChooser(view, { snapshot, rows = [], activeKey = null, query = "", loaded = false, readError = null, frozen = null, busy = false, feedback = null }) {
  const { name } = view;
  const config = snapshot?.config || null;
  if (rows.length > SEARCH_THRESHOLD && !view.search) {
    view.search = view.makeSearch();
    view.searchSlot.replaceChildren(view.search);
  }
  if (view.search && view.search.value !== query) view.search.value = query;

  const shown = visibleRows(rows, query);
  view.listbox.replaceChildren(...shown.map((row) => {
    const option = el("div", {
      className: `model-option${row.key === activeKey ? " is-active" : ""}`,
      attrs: {
        role: "option",
        id: optionId(name, row.key),
        "aria-selected": String(row.inForce),
        ...(row.keyMissing || frozen ? { "aria-disabled": "true" } : {}),
        "data-model-key": row.key,
      },
    },
    el("span", { className: "model-option-name", text: row.name }),
    el("span", { className: "model-option-meta", text: row.keyMissing ? `${row.meta} · No API key` : row.meta }));
    option.addEventListener("mousemove", () => { if (row.key !== view.opts?.activeKey) view.opts?.onHighlight?.(row.key); });
    option.addEventListener("click", () => view.opts?.onCommit?.(row.key));
    return option;
  }));
  const activeId = shown.some((row) => row.key === activeKey) ? optionId(name, activeKey) : null;
  for (const node of [view.listbox, view.search].filter(Boolean)) {
    if (activeId) node.setAttribute("aria-activedescendant", activeId);
    else node.removeAttribute("aria-activedescendant");
  }
  view.listbox.hidden = !shown.length;
  const note = readError
    ? [el("p", { className: "context-meta", attrs: { role: "status" }, text: `Could not read the installed models: ${readError}` }),
      action("refresh-cw", "Retry reading models", () => view.opts?.onRetry?.(), { visible: true, className: "context-row" })]
    : !loaded && !rows.length ? [el("p", { className: "context-meta", text: "Reading installed models…" })]
      : !rows.length ? [el("p", { className: "context-meta", text: "No model is installed yet. Add a provider in Settings › Models." })]
        : !shown.length ? [el("p", { className: "context-meta", text: "No installed model matches." })] : [];
  view.listNote.replaceChildren(...note);

  const active = shown.find((row) => row.key === activeKey);
  if (active?.keyMissing) {
    const connection = active.group ? active.name : active.meta;
    view.fix.replaceChildren(
      el("p", { className: "context-meta", attrs: { role: "status" }, text: active.group ? `${connection} has no API key, so its models cannot run yet.` : `${connection} has no API key, so ${active.name} cannot run yet.` }),
      action("chevron-right", `Add a key for ${connection} in Settings`, () => view.opts?.onConnections?.(active.connectionId), { visible: true, trailing: true, className: "context-row" }));
  } else view.fix.replaceChildren();

  const choices = effortChoices(snapshot?.reasoningCapability, config?.reasoningEffort);
  const effortChildren = [el("h4", { text: `Reasoning effort · ${rows.find((row) => row.inForce)?.name ?? visibleModelName(config)}` })];
  if (choices.selectable) effortChildren.push(segmentedEffort({ choices, name, disabled: Boolean(frozen) || busy, onChange: (value) => view.opts?.onEffort?.(value) }));
  else effortChildren.push(el("p", { className: "model-effort-fixed", text: "Provider default" }));
  if (choices.invalidSaved) effortChildren.push(el("p", { className: "context-meta", text: `Saved value ${choices.invalidSaved} is no longer offered by this model. Choose Provider default or a listed value.` }));
  if (!choices.selectable) effortChildren.push(el("p", { className: "context-meta", text: choices.notice || (choices.kind === "unsupported"
    ? "Selectable reasoning effort is unsupported; the parameter is omitted."
    : "Supported reasoning settings are unknown. Provider default omits the parameter.") }));
  else if (choices.source === "user-declared") effortChildren.push(el("p", { className: "context-meta", text: "Values declared on this connection; provider behavior has not been verified." }));
  view.effort.replaceChildren(...effortChildren);

  view.status.textContent = frozen || feedback || "";
  const connection = snapshot?.connection || null;
  view.manage.replaceChildren(connection
    ? action("chevron-right", "Open Models settings", () => view.opts?.onConnections?.(connection.id), { visible: true, trailing: true, className: "context-row" })
    : action("settings-2", "Add provider", () => view.opts?.onConnections?.(null), { visible: true, className: "context-row" }));
}
