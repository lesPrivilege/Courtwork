import { el, action } from "./ui-controls.mjs";
export const permissionLabels = {
  ask: "Ask before writing",
  draft: "Workspace writes allowed",
  read_only: "Read only",
};
export const providerLabels = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  "fake-openai-loopback": "Local test",
};
const permissionHelp = {
  ask: "Each write asks first. Allowing one write never accepts the result.",
  draft: "The agent may write inside this session's workspace without asking.",
  read_only: "Materials can be read; nothing is written.",
};
/** Native radios styled as one segmented control. `onChange(value)` may
 * return a promise; the control is disabled until it settles. `disabled` may
 * be a getter so a run starting during a request keeps the control locked. */
export function segmentedPermission({
  value,
  disabled = false,
  name,
  label = "Session file writes",
  onChange,
}) {
  const fieldset = el("fieldset", {
    className: "segmented",
    attrs: { "aria-label": label },
  });
  fieldset.disabled = typeof disabled === "function" ? disabled() : disabled;
  for (const [option, text] of Object.entries(permissionLabels)) {
    const id = `${name}-${option}`;
    const input = el("input", {
      attrs: { type: "radio", name, id, value: option },
    });
    input.checked = option === value;
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      fieldset.disabled = true;
      try {
        await onChange(option);
      } finally {
        if (fieldset.isConnected)
          fieldset.disabled = typeof disabled === "function" ? disabled() : disabled;
      }
    });
    fieldset.append(
      el("label", { className: "segment", attrs: { for: id } }, input, el("span", { text })),
    );
  }
  return fieldset;
}
/** The secondary card behind the connection badge and the composer chips:
 * read the current connection, change file writes in place, or jump to Settings. */
export function renderConnectionCard(
  container,
  { config, session, active, onClose, onChangeConnection, onPermission },
) {
  const header = el(
    "div",
    { className: "section-heading" },
    el("h3", { text: "Connection" }),
    action("x", "Close connection card", onClose),
  );
  const providerName = config
    ? providerLabels[config.provider] || config.provider
    : "Not loaded";
  const modelName = config
    ? config.provider === "fake-openai-loopback"
      ? "Fake local model"
      : config.model
    : "—";
  const groups = [
    el(
      "section",
      { className: "context-group" },
      el("h4", { text: "Model & connection" }),
      el(
        "dl",
        { className: "data-list" },
        el("dt", { text: "Provider" }),
        el("dd", { text: providerName }),
        el("dt", { text: "Model" }),
        el("dd", { text: modelName }),
      ),
      action("settings-2", "Change connection", onChangeConnection, {
        visible: true,
        className: "context-row",
      }),
    ),
  ];
  if (session) {
    const mode = session.permissionMode || "draft";
    groups.push(
      el(
        "section",
        { className: "context-group" },
        el("h4", { text: "File writes · this session" }),
        segmentedPermission({
          value: mode,
          disabled: active,
          name: "card-permission",
          onChange: onPermission,
        }),
        el("p", {
          className: "context-meta",
          text: active
            ? "Available after this run ends."
            : permissionHelp[mode],
        }),
      ),
    );
  }
  container.replaceChildren(header, ...groups);
  return header;
}
export function createSettingsView(
  container,
  { request, onConfig, getSession, onSession, notify },
) {
  let snapshot = null,
    catalog = null,
    info = null,
    dirty = false,
    busy = false,
    generation = 0;
  const form = el("form", { className: "settings-form" });
  const provider = el("select", {
    attrs: { name: "provider", "aria-label": "Provider" },
  });
  for (const [value, label] of Object.entries(providerLabels))
    provider.append(el("option", { attrs: { value }, text: label }));
  const model = el("select", {
    attrs: { name: "model", "aria-label": "Model" },
  });
  const api = el("select", {
    attrs: { name: "api", "aria-label": "API format" },
  });
  const baseUrl = el("input", {
    attrs: {
      type: "url",
      name: "baseUrl",
      placeholder: "Provider default",
      autocomplete: "off",
    },
  });
  const label = (name, input) => el("label", { text: name }, input);
  // One row = what it is and what it means on the left, the control on the right.
  let rowSeq = 0;
  const row = (title, help, control) => {
    const id = control.id || `settings-control-${++rowSeq}`;
    control.id = id;
    return el(
      "div",
      { className: "settings-row" },
      el(
        "div",
        { className: "settings-row-text" },
        el("label", { className: "settings-row-title", text: title, attrs: { for: id } }),
        help ? el("span", { className: "settings-row-help", text: help }) : null,
      ),
      el("div", { className: "settings-row-control" }, control),
    );
  };
  const advanced = el(
    "details",
    { className: "settings-advanced" },
    el("summary", { text: "Connection options" }),
    row("API format", "Wire format the provider expects.", api),
    row("Base URL", "Leave empty for the provider default.", baseUrl),
  );
  const status = el("p", { className: "form-help", attrs: { role: "status" } });
  const error = el("p", {
    className: "inline-error",
    attrs: { role: "alert", hidden: true },
  });
  const save = el("button", {
    className: "primary-button",
    attrs: { type: "submit" },
    text: "Save connection",
  });
  form.append(
    row("Provider", "Where model requests are sent.", provider),
    row("Model", "Used for every new run in this workspace.", model),
    advanced,
    status,
    error,
    save,
  );
  const credential = el("form", { className: "credential-form" });
  const credentialStatus = el("p", { className: "form-help" });
  const key = el("input", {
    attrs: {
      type: "password",
      autocomplete: "new-password",
      "aria-label": "API key",
      placeholder: "Enter an API key",
      spellcheck: "false",
    },
  });
  const keySave = el("button", {
    className: "secondary-button",
    attrs: { type: "submit" },
    text: "Save key",
  });
  const keyDelete = el("button", {
    className: "quiet-button danger-button",
    attrs: { type: "button" },
    text: "Remove saved key",
  });
  credential.append(
    el("h4", { text: "API key" }),
    credentialStatus,
    row("Key", "Stored on this device only.", key),
    el("div", { className: "credential-actions" }, keyDelete, keySave),
  );
  container.replaceChildren(form, credential);
  function availableModels() {
    return (catalog?.models || []).filter((m) => m.provider === provider.value);
  }
  function fillModels(preferred) {
    model.replaceChildren();
    const entries = availableModels();
    if (
      provider.value === "fake-openai-loopback" &&
      !entries.some((entry) => entry.id === "fake-model")
    )
      entries.push({ id: "fake-model", name: "Local deterministic model" });
    for (const entry of entries)
      model.append(
        el("option", {
          attrs: { value: entry.id },
          text: entry.name || entry.id,
        }),
      );
    if (entries.some((entry) => entry.id === preferred))
      model.value = preferred;
    fillApis();
  }
  function fillApis(preferred) {
    api.replaceChildren();
    const formats =
      provider.value === "fake-openai-loopback"
        ? ["openai-completions"]
        : ["openai-completions", "openai-responses"];
    for (const format of formats)
      api.append(
        el("option", {
          attrs: { value: format },
          text:
            format === "openai-responses" ? "Responses" : "Chat Completions",
        }),
      );
    const selected = availableModels().find((m) => m.id === model.value);
    api.value = formats.includes(preferred)
      ? preferred
      : selected?.api || "openai-completions";
  }
  function lock() {
    const active = Boolean(info?.activeRuns) || Boolean(getSession()?.active);
    for (const node of form.querySelectorAll("input,select,button"))
      node.disabled = busy || active;
    save.disabled = busy || active || !catalog || !model.value;
    keySave.disabled = busy || active || !key.value.trim();
    keyDelete.disabled =
      busy || active || snapshot?.credentialStatus !== "configured";
    key.disabled = busy || active;
    credential.hidden = provider.value === "fake-openai-loopback";
    credentialStatus.textContent =
      snapshot?.config?.provider === provider.value &&
      snapshot?.credentialStatus === "configured"
        ? "A key is saved on this device. It is never shown here."
        : "No key is saved for the selected connection.";
    status.textContent = active
      ? "A run is active. Connection and permission changes are available after it ends."
      : provider.value === "fake-openai-loopback"
        ? "Uses a deterministic local test provider. No external model request."
        : "Saved locally. A model call happens only when you send an instruction.";
  }
  function resetFields() {
    if (!snapshot) return;
    provider.value = snapshot.config.provider;
    fillModels(snapshot.config.model);
    fillApis(snapshot.config.api);
    baseUrl.value = snapshot.config.baseUrl || "";
    dirty = false;
    lock();
  }
  provider.addEventListener("change", () => {
    dirty = true;
    key.value = "";
    fillModels();
    lock();
  });
  model.addEventListener("change", () => {
    dirty = true;
    fillApis();
    lock();
  });
  api.addEventListener("change", () => {
    dirty = true;
  });
  baseUrl.addEventListener("input", () => {
    dirty = true;
  });
  key.addEventListener("input", lock);
  function fail(err) {
    error.hidden = false;
    error.textContent = err.message || "The setting could not be saved.";
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    lock();
    error.hidden = true;
    const body = {
      provider: provider.value,
      model: model.value,
      api: api.value,
      ...(baseUrl.value.trim() ? { baseUrl: baseUrl.value.trim() } : {}),
    };
    try {
      snapshot = await request("/provider-config", { method: "PUT", body });
      onConfig(snapshot);
      dirty = false;
      key.value = "";
      notify("Connection saved.");
    } catch (err) {
      fail(err);
    } finally {
      busy = false;
      lock();
    }
  });
  credential.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !key.value.trim()) return;
    if (dirty || provider.value !== snapshot?.config?.provider) {
      fail(new Error("Save this connection before adding its key."));
      return;
    }
    busy = true;
    lock();
    error.hidden = true;
    const value = key.value;
    key.value = "";
    try {
      await request("/provider-credential", {
        method: "PUT",
        body: { provider: provider.value, apiKey: value },
      });
      snapshot = await request("/provider-config");
      onConfig(snapshot);
      notify("API key saved.");
    } catch (err) {
      fail(err);
    } finally {
      busy = false;
      lock();
    }
  });
  keyDelete.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    lock();
    error.hidden = true;
    try {
      await request("/provider-credential", {
        method: "DELETE",
        body: { provider: snapshot.config.provider },
      });
      key.value = "";
      snapshot = await request("/provider-config");
      onConfig(snapshot);
      notify("Saved key removed.");
    } catch (err) {
      fail(err);
    } finally {
      busy = false;
      lock();
    }
  });
  function syncSessionPermission(control, sessionId) {
    if (!control) return;
    const latest = getSession();
    const sameSession = latest?.session?.id === sessionId;
    const pending = control.dataset.pending === "true";
    control.disabled = !sameSession || Boolean(latest.active) || pending;
    if (sameSession && !pending) {
      const value = latest.session.permissionMode || "draft";
      for (const input of control.querySelectorAll("input"))
        input.checked = input.value === value;
    }
  }
  function sessionPanel() {
    const panel = document.getElementById("session-settings");
    const current = getSession();
    panel.hidden = !current?.session;
    if (!current?.session) return;
    const session = current.session;
    if (
      panel.dataset.session === session.id &&
      panel.contains(document.activeElement)
    ) {
      syncSessionPermission(panel.querySelector("fieldset"), session.id);
      return;
    }
    panel.dataset.session = session.id;
    const modeError = el("p", {
      className: "inline-error",
      attrs: { role: "alert" },
    });
    const mode = segmentedPermission({
      value: session.permissionMode || "draft",
      disabled: () => {
        const latest = getSession();
        return latest?.session?.id !== session.id || Boolean(latest.active);
      },
      name: "settings-permission",
      onChange: async (value) => {
        mode.dataset.pending = "true";
        modeError.textContent = "";
        try {
          const result = await request(
            `/sessions/${encodeURIComponent(session.id)}/permission-mode`,
            { method: "PUT", body: { permissionMode: value } },
          );
          onSession(result.session, session.id);
        } catch (err) {
          modeError.textContent = err.message;
        } finally {
          mode.dataset.pending = "false";
          syncSessionPermission(mode, session.id);
        }
      },
    });
    panel.replaceChildren(
      el("h3", { text: "This session" }),
      el(
        "div",
        { className: "settings-row" },
        el(
          "div",
          { className: "settings-row-text" },
          el("span", { className: "settings-row-title", text: "File writes" }),
          el("span", {
            className: "settings-row-help",
            text: current.active
              ? "Available after this run ends."
              : "Applies to this session. Asking authorizes one exact write; it does not accept the result.",
          }),
        ),
        el("div", { className: "settings-row-control" }, mode),
      ),
      modeError,
    );
  }
  return {
    update(config) {
      snapshot = config;
      if (snapshot && !dirty && !busy && !form.contains(document.activeElement))
        resetFields();
      lock();
      sessionPanel();
    },
    async refresh() {
      const own = ++generation;
      error.hidden = true;
      try {
        const [config, models, runtime] = await Promise.all([
          request("/provider-config"),
          request("/provider-models"),
          request("/runtime-info"),
        ]);
        if (own !== generation) return;
        snapshot = config;
        catalog = models;
        info = runtime;
        onConfig(config);
        if (!dirty) resetFields();
        lock();
        sessionPanel();
        const debug = document.getElementById("runtime-info");
        debug.replaceChildren();
        const dl = el("dl", { className: "data-list" });
        for (const [name, value] of [
          ["Adapter", runtime.adapterId],
          ["Host", runtime.state],
          ["Tools", (runtime.capabilities?.tools || []).join(", ")],
        ])
          dl.append(
            el("dt", { text: name }),
            el("dd", {
              text: typeof value === "string" ? value : JSON.stringify(value),
            }),
          );
        debug.append(dl);
      } catch (err) {
        if (own === generation) fail(err);
      }
    },
    close() {
      generation++;
      key.value = "";
      dirty = false;
      error.hidden = true;
      if (snapshot) resetFields();
    },
  };
}
