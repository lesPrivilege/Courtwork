import { el, action, flowRow } from "./ui-controls.mjs";
import { renderContextBar } from "./runtime-view.mjs";

/* WK-27: capabilities the backend does not have are drawn nowhere except this
   list. Text rows only — no switch, no button, nothing focusable, so the page
   cannot imply an authority that does not exist. */
export const PLANNED_CAPABILITIES = [
  ["MCP OAuth", "Only unauthenticated Streamable HTTP servers can connect today."],
  ["MCP stdio transport", "Local process servers cannot be launched or supervised."],
  ["Third-party plugin isolation", "Only host-trusted extensions load; there is no sandbox for outside code."],
  ["Memory providers", "No adapter stores or retrieves memory between runs."],
  ["Workflows", "No workflow runner exists to execute a saved sequence."],
  ["Hooks", "No executable hook point exists."],
  ["Registries", "Package resolution and signature checks are not implemented."],
  ["Token counts", "The host reports no token usage, so sizes stay in characters."],
];
export function renderPlanned(container) {
  container.replaceChildren(
    el("p", {
      className: "form-help",
      text: "These belong to the runtime contract but have no host adapter yet. They are listed so their absence is legible, and they carry no controls.",
    }),
    ...PLANNED_CAPABILITIES.map(([title, help]) =>
      el(
        "div",
        { className: "planned-row" },
        el(
          "div",
          { className: "planned-row-text" },
          el("span", { className: "settings-row-title", text: title }),
          el("span", { className: "settings-row-help", text: help }),
        ),
        el("span", { className: "planned-state", text: "Backend pending" }),
      ),
    ),
  );
}
export const permissionLabels = {
  ask: "Ask before writing",
  draft: "Workspace writes allowed",
  read_only: "Read only",
};
/* WK-73 / WK-59 · in the quiet line below the composer the mode shows as one
 * word; the sentence above stays the accessible name and the tooltip, because
 * a permission scope is a consequence and must never be read as a state word
 * alone (IC-1 "text first"). */
export const permissionWords = {
  ask: "Ask",
  draft: "Write",
  read_only: "Read",
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
  { request, onConfig, getSession, onSession, notify, onOpenRuntime, page },
) {
  let snapshot = null,
    catalog = null,
    info = null,
    dirty = false,
    busy = false,
    generation = 0,
    runtimeContext = null;
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
    attrs: { type: "button", "aria-label": "Remove saved key" },
    text: "Remove",
  });
  credential.append(
    el("h4", { text: "API key" }),
    credentialStatus,
    row("Key", "Stored on this device only.", key),
    el("div", { className: "credential-actions" }, keyDelete, keySave),
  );
  container.replaceChildren(form, credential);
  renderPlanned(document.getElementById("planned-capabilities"));
  /* RC-1 / RC-5: Settings keeps two runtime entries — the door into the
     runtime module, and the size of what the next run will actually carry. */
  /* Settings 页的只读节（Data、Runtime › Models）读的是本控制器已经取到的同一份
     快照，不另开一路请求：一个事实一个来源（FN-07 的可失效缓存，不是第二真源）。 */
  function pushToPage() {
    page?.update({
      config: snapshot,
      info,
      session: getSession()?.session || null,
      active: Boolean(getSession()?.active),
    });
  }
  function runtimePanel() {
    const panel = document.getElementById("runtime-control-settings");
    const current = getSession();
    panel.hidden = !current?.session;
    if (!current?.session) return;
    const entry = document.getElementById("runtime-control-entry");
    if (!entry.dataset.wired) {
      entry.dataset.wired = "true";
      entry.append(
        action("settings-2", "Open runtime resources", () => onOpenRuntime?.(), {
          visible: true,
          className: "context-row",
        }),
        el("p", {
          className: "settings-row-help",
          text: "Tools, MCP servers, skills, plugins and instructions, with the scope each value comes from.",
        }),
      );
    }
    renderContextBar(
      document.getElementById("runtime-context-summary"),
      runtimeContext,
    );
  }
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
      el("h4", { className: "settings-block-title", text: "This session" }),
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
      runtimePanel();
      pushToPage();
    },
    async refresh() {
      const own = ++generation;
      error.hidden = true;
      const session = getSession()?.session;
      try {
        const [config, models, runtime, context] = await Promise.all([
          request("/provider-config"),
          request("/provider-models"),
          request("/runtime-info"),
          session
            ? request(
                `/runtime-context?sessionId=${encodeURIComponent(session.id)}`,
              ).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (own !== generation) return;
        snapshot = config;
        catalog = models;
        info = runtime;
        runtimeContext = context;
        onConfig(config);
        if (!dirty) resetFields();
        lock();
        sessionPanel();
        runtimePanel();
        pushToPage();
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

/* ===== WO-WK12 · Settings 页 ===========================================
 * 本段是 Settings 页自己的东西：分组、搜索、外观偏好、用户 skin 校验、快捷键只读表，
 * 以及 Runtime 组留给 WO-WK11 的挂载点。页面的开合、hash 路由、Escape 与焦点归还仍归
 * app.mjs（FN-07：宿主拥有导航与焦点栈），这里只回答「这一页有哪些组、每组画什么」。
 */

export const SETTINGS_GROUPS = [
  { id: "general", title: "General", panel: "settings-general" },
  { id: "appearance", title: "Appearance", panel: "settings-appearance" },
  { id: "keyboard", title: "Keyboard", panel: "settings-keyboard" },
  { id: "runtime", title: "Runtime", panel: "settings-runtime" },
  { id: "developer", title: "Developer", panel: "settings-developer" },
];
export const DEFAULT_SECTION = "general";
export function isSettingsSection(id) {
  return SETTINGS_GROUPS.some((group) => group.id === id);
}

/* WK-78 (4) / FN-11 · 用户 skin 的全部词汇。「更开放」到此为止：一个 Tier S 色阶，
 * 不是一段 CSS。名字必须是既有 token 名 —— 新名字进不了 tier:R 的角色映射，只会是一段
 * 被忽略的声明，却让人以为改了；值必须是 hex（两个 rgb 基底与三个 alpha 除外，它们本来
 * 就不是颜色）。校验规则与 tools/lint-colors.mjs 同源：颜色字面量只许落在 Tier S。 */
export const SKIN_COLOR_TOKENS = [
  "--gray-1", "--gray-2", "--gray-3", "--gray-4", "--gray-5", "--gray-6",
  "--gray-7", "--gray-8", "--gray-9", "--gray-10", "--gray-11", "--gray-12",
  "--accent-3", "--accent-9", "--accent-10", "--accent-11",
  "--danger-3", "--danger-11", "--success-3", "--success-11",
  "--paper", "--float-s", "--frame-s", "--ink-max", "--on-accent-s",
];
export const SKIN_NUMERIC_TOKENS = {
  "--alpha-ink": "triple",
  "--alpha-paper": "triple",
  "--shadow-alpha": "unit",
  "--glass-alpha": "unit",
  "--rim-alpha": "unit",
};
const SKIN_TOKEN_NAMES = new Set([
  ...SKIN_COLOR_TOKENS,
  ...Object.keys(SKIN_NUMERIC_TOKENS),
]);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const TRIPLE = /^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/;
const UNIT = /^(?:0|1|0?\.\d{1,3})$/;
/* 危险形状先于逐行解析拒绝，因为它们说明这不是一个色阶，而是有人在往样式表里塞别的东西。 */
const FORBIDDEN = [
  ["url(", "url( is not a colour"],
  ["expression", "expression is not a colour"],
  ["@", "at-rules such as @import are not accepted"],
  ["</", "markup is not accepted"],
  ["\\", "escapes are not accepted"],
  ["javascript:", "a URL is not a colour"],
];
const SKIN_LIMIT = 8000;

/** 一组粘贴进来的 Tier S token。通过时返回可直接落进样式表的规范化文本；
 *  不通过时逐行返回问题，绝不「尽力而为」地应用一半。 */
export function validateSkinTokens(input) {
  const errors = [];
  const text = typeof input === "string" ? input : "";
  if (!text.trim())
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "Paste a Tier S token set first." }] };
  if (text.length > SKIN_LIMIT)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: `A token set is at most ${SKIN_LIMIT} characters.` }] };
  const lowered = text.toLowerCase();
  for (const [needle, reason] of FORBIDDEN)
    if (lowered.includes(needle))
      errors.push({ line: 0, text: needle, reason });
  if (errors.length) return { ok: false, css: "", values: {}, missing: [], errors };
  /* 注释与外层的一对花括号先去掉，因为最自然的粘贴动作就是整块复制 styles.css 或
     skins/*.css 的一个 :root 块；行号保持不变，报错才指得回原文。 */
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\n]/g, " "),
  );
  const opens = (stripped.match(/\{/g) || []).length;
  const closes = (stripped.match(/\}/g) || []).length;
  if (opens > 1 || closes > 1)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "Paste one block at a time; this text holds more than one." }] };
  if (opens !== closes)
    return { ok: false, css: "", values: {}, missing: [], errors: [{ line: 0, text: "", reason: "The block's braces do not match." }] };
  const body = opens
    ? stripped.slice(stripped.indexOf("{") + 1, stripped.lastIndexOf("}"))
    : stripped;
  const offset = opens ? stripped.slice(0, stripped.indexOf("{")).split("\n").length - 1 : 0;
  const values = {};
  body.split("\n").forEach((rawLine, index) => {
    const lineNumber = offset + index + 1;
    for (const piece of rawLine.split(";")) {
      const declaration = piece.trim();
      if (!declaration) continue;
      const match = /^(--[a-z0-9-]+)\s*:\s*(.+)$/i.exec(declaration);
      if (!match) {
        errors.push({ line: lineNumber, text: declaration, reason: "Not a `--token: value` declaration." });
        continue;
      }
      const [, name, value] = [match[0], match[1].toLowerCase(), match[2].trim()];
      if (!SKIN_TOKEN_NAMES.has(name)) {
        errors.push({ line: lineNumber, text: declaration, reason: `${name} is not a Tier S token name.` });
        continue;
      }
      const kind = SKIN_NUMERIC_TOKENS[name];
      if (!kind) {
        if (!HEX.test(value)) {
          errors.push({ line: lineNumber, text: declaration, reason: "Only a hex colour is accepted here." });
          continue;
        }
      } else if (kind === "triple") {
        const parts = TRIPLE.exec(value);
        if (!parts || parts.slice(1).some((part) => Number(part) > 255)) {
          errors.push({ line: lineNumber, text: declaration, reason: "This token is an r, g, b triple." });
          continue;
        }
      } else if (!UNIT.test(value)) {
        errors.push({ line: lineNumber, text: declaration, reason: "This token is a number between 0 and 1." });
        continue;
      }
      values[name] = value;
    }
  });
  const missing = SKIN_COLOR_TOKENS.filter((name) => !(name in values));
  if (missing.length && !errors.length)
    errors.push({
      line: 0,
      text: "",
      reason: `A skin is a whole scale. Missing: ${missing.join(", ")}.`,
    });
  if (errors.length) return { ok: false, css: "", values, missing, errors };
  const css = Object.entries(values)
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
  return { ok: true, css, values, missing: [], errors: [] };
}

/* WK-78 (5) · 偏好只在本设备。读、写、应用三件事各一处；应用那一份住在 index.html 的
 * 首帧内联脚本里，因为它必须在第一次绘制之前跑完，这里复用同一个函数，不写第二份。 */
const PREFERENCE_DEFAULTS = {
  scheme: "system",
  skin: "slate",
  customSkin: "",
  textSize: "medium",
  codeFont: "",
  motion: "system",
};
const PREFERENCE_VALUES = {
  scheme: ["system", "light", "dark"],
  skin: ["slate", "gray-steel", "custom"],
  textSize: ["small", "medium", "large"],
  motion: ["system", "reduce"],
};
export const CODE_FONT_PATTERN = /^[A-Za-z0-9 ,'"_-]{1,120}$/;
export function readPreferences() {
  const stored = globalThis.__cwPrefs?.value;
  const prefs = { ...PREFERENCE_DEFAULTS };
  if (!stored || typeof stored !== "object") return prefs;
  for (const [name, allowed] of Object.entries(PREFERENCE_VALUES))
    if (allowed.includes(stored[name])) prefs[name] = stored[name];
  if (typeof stored.codeFont === "string" && CODE_FONT_PATTERN.test(stored.codeFont))
    prefs.codeFont = stored.codeFont;
  if (typeof stored.customSkin === "string" && stored.customSkin.length <= SKIN_LIMIT)
    prefs.customSkin = stored.customSkin;
  return prefs;
}
export function writePreferences(prefs) {
  const store = globalThis.__cwPrefs;
  if (!store) return prefs;
  store.value = prefs;
  store.apply(prefs);
  try {
    globalThis.localStorage?.setItem(store.key, JSON.stringify(prefs));
  } catch {
    /* 一个被禁用或写满的浏览器存储不该拦住换宗这件事：本次会话内仍然生效。 */
  }
  return prefs;
}

/* 一行的解剖与既有 settings-row 完全相同：标题 + 一句作用域或后果 + 右侧单一控件。
 * 外面再包一层 entry，是因为 Appearance 的四行下面还挂着一块预览，过滤时它们要一起走。 */
function settingsRow(title, help, control, { id, preview } = {}) {
  const controlId = id || control.id || `settings-${Math.random().toString(36).slice(2, 8)}`;
  if (!control.id) control.id = controlId;
  const labelTag = control.matches?.("fieldset") ? "span" : "label";
  const row = el(
    "div",
    { className: "settings-row" },
    el(
      "div",
      { className: "settings-row-text" },
      el(labelTag, {
        className: "settings-row-title",
        text: title,
        attrs: labelTag === "label" ? { for: control.id } : null,
      }),
      help ? el("span", { className: "settings-row-help", text: help }) : null,
    ),
    el("div", { className: "settings-row-control" }, control),
  );
  return preview ? el("div", { className: "settings-entry" }, row, preview) : row;
}
/** 与 segmentedPermission 同一个控件，只是选项由调用者给：原生 radio、一条轨、
 *  被选中的那格是滑块。段数写进 --segments，滑块宽度才不会被写死成三格。 */
function segmented({ name, label, options, value, onChange }) {
  const fieldset = el("fieldset", {
    className: "segmented",
    attrs: { "aria-label": label },
  });
  fieldset.style.setProperty("--segments", String(options.length));
  for (const [option, text] of options) {
    const id = `${name}-${option}`;
    const input = el("input", { attrs: { type: "radio", name, id, value: option } });
    input.checked = option === value;
    input.addEventListener("change", () => {
      if (input.checked) onChange(option);
    });
    fieldset.append(
      el("label", { className: "segment", attrs: { for: id } }, input, el("span", { text })),
    );
  }
  return fieldset;
}
/* WK-78 (3) · 预览是真实产品片段，不是色卡：一条 Chat Flow 行（同一 flowRow 解剖）
 * 加一段带 diff 的代码块。它不可交互，也不该被读屏再念一遍界面，所以整块 aria-hidden，
 * 由外面那句 "Preview" 承担名字。 */
function appearancePreview() {
  const code = el(
    "div",
    { className: "code-block settings-preview-code" },
    el("div", { className: "code-toolbar" }, el("span", { text: "notice.md" })),
    el(
      "pre",
      { className: "settings-preview-diff" },
      el("code", {}, ...[
        [" ", "## Termination"],
        ["-", "Either party may end this agreement at will."],
        ["+", "Either party may end this agreement on 30 days' notice."],
        [" ", "Notice is effective when received."],
      ].map(([mark, text]) =>
        el("span", {
          className: "diff-line",
          text: `${mark} ${text}\n`,
          attrs: { "data-diff": mark === "+" ? "add" : mark === "-" ? "del" : "same" },
        }),
      )),
    ),
  );
  return el(
    "div",
    { className: "settings-preview" },
    el("span", { className: "settings-preview-label", text: "Preview" }),
    el(
      "div",
      { className: "settings-preview-surface", attrs: { "aria-hidden": "true" } },
      flowRow("div", {
        glyph: "file-text",
        title: "ws_write · notice.md",
        meta: "Completed",
      }),
      code,
    ),
  );
}

/* WK-4 · 已经存在的键，逐条读出来，不发明第二套。「重绑定」没有后端也没有登记表，
 * 所以它是一行 Planned 文字，不是一个按不动的按钮（WK-27）。 */
const SHORTCUTS = [
  ["j · ↓", "Move to the next item in a list — Home's work band, or the pending cards in a session."],
  ["k · ↑", "Move to the previous item in the same list."],
  ["Enter · o", "Open the item that holds the focus. It never answers a request for you."],
  ["Enter", "In the composer, send. Shift + Enter starts a new line instead."],
  ["Escape", "Close the layer on top: the navigation, then the work surface, then this page."],
];
const RUNTIME_MOUNTS = [
  [
    "settings-runtime-composition",
    "Composition",
    "The agent profile a run is composed from, what it depends on, and where it applies. Choosing a profile is not exposing a resource, and neither is a verified Work Expert.",
  ],
  [
    "settings-runtime-instructions",
    "Instructions & context",
    "Instructions, skills, references and prompt templates, each with whether it is injected, listed, loaded on demand, or still a draft.",
  ],
  [
    "settings-runtime-capabilities",
    "Capabilities & connections",
    "Tools, MCP servers and host-trusted plugins. Configured, connected, exposed and permitted are four different states.",
  ],
];

/** Settings 页自己的控制器：分组切换、只过滤本页行的搜索、Appearance 偏好、
 *  Keyboard 只读表、Data 只读事实，以及 Runtime 组留给 WK11 的节位。
 *  页面的开合、hash、Escape 与焦点归还不在这里，在 app.mjs。 */
export function createSettingsPage({ home, onSection, onEditConnection }) {
  const nav = document.getElementById("settings-nav");
  const dropdown = document.getElementById("settings-nav-select");
  const search = document.getElementById("settings-search");
  const searchEmpty = document.getElementById("settings-search-empty");
  const panels = new Map(
    SETTINGS_GROUPS.map((group) => [group.id, document.getElementById(group.panel)]),
  );
  let section = DEFAULT_SECTION;
  let query = "";
  let composing = false;
  let prefs = readPreferences();
  let skinDraft = prefs.skin;
  let latest = { config: null, info: null, session: null, active: false };

  /* ── 导航 ─────────────────────────────────────────────────────────── */
  const tabs = SETTINGS_GROUPS.map((group) => {
    const tab = el("button", {
      className: "settings-tab",
      text: group.title,
      attrs: {
        type: "button",
        role: "tab",
        id: `settings-tab-${group.id}`,
        "aria-controls": group.panel,
        "aria-selected": "false",
        tabindex: "-1",
      },
    });
    tab.addEventListener("click", () => select(group.id, { focusPanel: false }));
    nav.append(tab);
    dropdown.append(el("option", { attrs: { value: group.id }, text: group.title }));
    return tab;
  });
  nav.addEventListener("keydown", (event) => {
    if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const step =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (step) {
      event.preventDefault();
      tabs[(index + step + tabs.length) % tabs.length].focus();
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? tabs[0] : tabs[tabs.length - 1]).focus();
      return;
    }
    /* 手动激活：方向键只移动焦点，Enter 才进节并把焦点交给右列。一个人用方向键
       浏览分组时，不该每按一下就换掉右边的内容。 */
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select(SETTINGS_GROUPS[index].id, { focusPanel: true });
    }
  });
  dropdown.addEventListener("change", (event) => select(event.target.value, { focusPanel: false }));

  /* ── 搜索：只过滤本页的行 ──────────────────────────────────────────── */
  search.addEventListener("compositionstart", () => {
    composing = true;
  });
  search.addEventListener("compositionend", () => {
    composing = false;
    query = search.value.trim().toLowerCase();
    applyFilter();
  });
  search.addEventListener("input", () => {
    /* IME 组合中的中间态不是查询词；此时过滤会把人正在拼的字当成条件。 */
    if (composing) return;
    query = search.value.trim().toLowerCase();
    applyFilter();
  });
  search.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.isComposing) return;
    if (!search.value) return;
    /* 有查询词时 Escape 先清查询，不退出整页：否则一个人想取消筛选，
       结果整页关掉，回到会话。 */
    event.preventDefault();
    event.stopPropagation();
    search.value = "";
    query = "";
    applyFilter();
  });

  function rowText(node) {
    return `${node.textContent || ""}`.replace(/\s+/g, " ").trim().toLowerCase();
  }
  function applyFilter() {
    const rows = (panel) => [
      ...panel.querySelectorAll(".settings-row, .planned-row, .settings-key-row"),
    ];
    if (!query) {
      searchEmpty.hidden = true;
      for (const [id, panel] of panels) {
        panel.hidden = id !== section;
        for (const row of rows(panel)) (row.closest(".settings-entry") || row).hidden = false;
        for (const block of panel.querySelectorAll(".settings-block")) block.hidden = false;
      }
      return;
    }
    let matched = 0;
    for (const [, panel] of panels) {
      let hits = 0;
      for (const row of rows(panel)) {
        const hit = rowText(row).includes(query);
        (row.closest(".settings-entry") || row).hidden = !hit;
        if (hit) hits += 1;
      }
      for (const block of panel.querySelectorAll(".settings-block")) {
        const blockRows = [
          ...block.querySelectorAll(".settings-row, .planned-row, .settings-key-row"),
        ];
        block.hidden = !blockRows.some((row) => rowText(row).includes(query));
      }
      panel.hidden = hits === 0;
      matched += hits;
    }
    searchEmpty.hidden = matched > 0;
    if (!matched) searchEmpty.textContent = `No setting matches “${search.value.trim()}”.`;
  }
  function select(next, { focusPanel = false } = {}) {
    section = isSettingsSection(next) ? next : DEFAULT_SECTION;
    SETTINGS_GROUPS.forEach((group, index) => {
      const chosen = group.id === section;
      tabs[index].setAttribute("aria-selected", chosen ? "true" : "false");
      tabs[index].setAttribute("tabindex", chosen ? "0" : "-1");
      tabs[index].classList.toggle("is-current", chosen);
    });
    dropdown.value = section;
    applyFilter();
    onSection?.(section);
    if (focusPanel) panels.get(section)?.focus();
  }

  /* ── Appearance ───────────────────────────────────────────────────── */
  const appearance = document.getElementById("settings-appearance-rows");
  const skinEditor = el("div", { className: "skin-editor", attrs: { hidden: true } });
  const skinInput = el("textarea", {
    className: "skin-input",
    attrs: {
      rows: "8",
      spellcheck: "false",
      "aria-label": "Tier S token set",
      placeholder: ":root {\n  --gray-1: …;\n  --gray-2: …;\n}",
    },
  });
  const skinErrors = el("div", { className: "skin-errors", attrs: { role: "alert" } });
  const skinState = el("p", { className: "settings-row-help" });
  function savePrefs(change) {
    prefs = writePreferences({ ...prefs, ...change });
    return prefs;
  }
  function renderSkinEditor() {
    skinEditor.hidden = skinDraft !== "custom";
    skinState.textContent =
      prefs.skin === "custom"
        ? "A token set of your own is applied on this device."
        : prefs.customSkin
          ? "A token set is stored but not applied."
          : "No token set has been accepted yet.";
    skinRemove.hidden = !prefs.customSkin;
  }
  const skinApply = el("button", {
    className: "secondary-button",
    attrs: { type: "button" },
    text: "Apply tokens",
  });
  const skinRemove = el("button", {
    className: "quiet-button danger-button",
    attrs: { type: "button" },
    text: "Remove",
  });
  skinApply.addEventListener("click", () => {
    const result = validateSkinTokens(skinInput.value);
    skinErrors.replaceChildren();
    if (!result.ok) {
      /* 逐行指出，然后拒绝。半套色阶比默认更难看懂，所以不「尽力应用」。 */
      skinErrors.append(
        el("p", {
          className: "inline-error",
          text: `The token set was not applied. ${result.errors.length} problem${result.errors.length === 1 ? "" : "s"}:`,
        }),
        el(
          "ul",
          { className: "skin-error-list" },
          ...result.errors.map((problem) =>
            el("li", {
              text: problem.line
                ? `Line ${problem.line}: ${problem.text} — ${problem.reason}`
                : problem.reason,
            }),
          ),
        ),
      );
      return;
    }
    savePrefs({ skin: "custom", customSkin: result.css });
    skinDraft = "custom";
    renderSkinEditor();
    skinErrors.append(
      el("p", { className: "form-help", text: "Applied on this device." }),
    );
  });
  skinRemove.addEventListener("click", () => {
    savePrefs({ skin: "slate", customSkin: "" });
    skinDraft = "slate";
    skinInput.value = "";
    skinErrors.replaceChildren();
    renderAppearance();
  });
  skinEditor.append(
    el("p", {
      className: "settings-row-help",
      text: "Paste one Tier S scale: the existing token names, hex colours only. One set serves both Light and Dark. Nothing else is read from this box — no CSS rule, no URL, no font.",
    }),
    skinInput,
    el("div", { className: "credential-actions" }, skinRemove, skinApply),
    skinState,
    skinErrors,
  );

  const codeFontError = el("p", {
    className: "inline-error",
    attrs: { role: "alert", hidden: true },
  });
  function renderAppearance() {
    const scheme = segmented({
      name: "settings-scheme",
      label: "Scheme",
      options: [["light", "Light"], ["dark", "Dark"], ["system", "System"]],
      value: prefs.scheme,
      onChange: (value) => savePrefs({ scheme: value }),
    });
    const skin = el("select", { attrs: { "aria-label": "Skin" } });
    for (const [value, text] of [
      ["slate", "Slate"],
      ["gray-steel", "Gray steel"],
      ["custom", "Your tokens"],
    ])
      skin.append(el("option", { attrs: { value }, text }));
    skin.value = skinDraft;
    skin.addEventListener("change", () => {
      skinDraft = skin.value;
      if (skinDraft === "custom") {
        /* 已经存过一套就直接回到它；还没有就只是把编辑框露出来，
           在 Apply 通过之前不改变生效的 skin（请求值 ≠ 有效值，FN-14）。 */
        if (prefs.customSkin) savePrefs({ skin: "custom" });
      } else savePrefs({ skin: skinDraft });
      renderSkinEditor();
    });
    const textSize = segmented({
      name: "settings-text-size",
      label: "Text size",
      options: [["small", "Small"], ["medium", "Medium"], ["large", "Large"]],
      value: prefs.textSize,
      onChange: (value) => savePrefs({ textSize: value }),
    });
    const codeFont = el("input", {
      attrs: {
        type: "text",
        "aria-label": "Code font",
        placeholder: "e.g. JetBrains Mono",
        autocomplete: "off",
        spellcheck: "false",
      },
    });
    codeFont.value = prefs.codeFont;
    const commitFont = () => {
      const value = codeFont.value.trim();
      if (value && !CODE_FONT_PATTERN.test(value)) {
        codeFontError.hidden = false;
        codeFontError.textContent =
          "A font family name only: letters, digits, spaces, quotes and commas.";
        return;
      }
      codeFontError.hidden = true;
      savePrefs({ codeFont: value });
    };
    codeFont.addEventListener("change", commitFont);
    codeFont.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        commitFont();
      }
    });
    const motion = segmented({
      name: "settings-motion",
      label: "Reduced motion",
      options: [["system", "Follow system"], ["reduce", "Always reduce"]],
      value: prefs.motion,
      onChange: (value) => savePrefs({ motion: value }),
    });
    appearance.replaceChildren(
      settingsRow(
        "Scheme",
        "Light, dark, or whatever this device is set to. It is kept on this device and never sent to the host.",
        scheme,
        { preview: appearancePreview() },
      ),
      settingsRow(
        "Skin",
        "Swaps the colour scale only. State words, legal actions and what a control does stay exactly as they are.",
        skin,
        { preview: appearancePreview() },
      ),
      skinEditor,
      settingsRow(
        "Text size",
        "Scales every text role together. Hit regions, spacing and keyboard order do not change with it.",
        textSize,
        { preview: appearancePreview() },
      ),
      settingsRow(
        "Code font",
        "A monospaced family already installed on this device. Nothing is downloaded, and an unavailable name falls back to the default stack.",
        codeFont,
        { preview: appearancePreview() },
      ),
      codeFontError,
      settingsRow(
        "Reduced motion",
        "Always reduce stops transitions and animations. Nothing a control does changes with it.",
        motion,
      ),
    );
    renderSkinEditor();
    applyFilter();
  }

  /* ── Keyboard ─────────────────────────────────────────────────────── */
  function renderKeyboard() {
    document.getElementById("settings-keyboard-rows").replaceChildren(
      el("p", {
        className: "settings-row-help",
        text: "The keys this build already answers to. They are the same commands the controls raise, through the same admission.",
      }),
      el(
        "table",
        { className: "settings-table" },
        el("thead", {},
          el("tr", {}, el("th", { text: "Keys" }), el("th", { text: "What it does" })),
        ),
        el("tbody", {},
          ...SHORTCUTS.map(([keys, what]) =>
            el(
              "tr",
              { className: "settings-key-row" },
              el("th", { attrs: { scope: "row" } }, el("kbd", { text: keys })),
              el("td", { text: what }),
            ),
          ),
          el(
            "tr",
            { className: "settings-key-row" },
            el("th", { attrs: { scope: "row" } }, el("span", { text: "Cancel run" })),
            el("td", {
              text: "No key. Cancelling a run is a control in the composer, so it is never one keystroke away by accident.",
            }),
          ),
        ),
      ),
      el(
        "div",
        { className: "planned-row" },
        el(
          "div",
          { className: "planned-row-text" },
          el("span", { className: "settings-row-title", text: "Rebind a key" }),
          el("span", {
            className: "settings-row-help",
            text: "No command registry records which commands may be bound, so a rebinding could not be checked against the admission the command actually has.",
          }),
        ),
        el("span", { className: "planned-state", text: "Planned" }),
      ),
    );
  }

  /* ── General · New sessions 与 Data ───────────────────────────────── */
  function renderNewSessions() {
    const control = segmented({
      name: "settings-new-session-permission",
      label: "File writes for new sessions",
      options: Object.entries(permissionWords),
      value: home.get(),
      onChange: (value) => home.set(value),
    });
    for (const input of control.querySelectorAll("input"))
      input.parentElement.setAttribute("aria-label", permissionLabels[input.value]);
    document.getElementById("settings-new-sessions").replaceChildren(
      el("h4", { className: "settings-block-title", text: "New sessions" }),
      settingsRow(
        "File writes",
        "The value a session starts with. It applies when the session is created; changing it never changes a session that already exists.",
        control,
      ),
    );
  }
  function readOnlyRow(title, help, value) {
    return settingsRow(
      title,
      help,
      el("span", { className: "settings-readout", text: value }),
    );
  }
  function renderData() {
    const info = latest.info;
    document.getElementById("settings-data").replaceChildren(
      el("h4", { className: "settings-block-title", text: "Data" }),
      el("p", {
        className: "settings-row-help",
        text: "Read from the host's own report. Nothing here is editable from the browser.",
      }),
      /* FN-28 · 主机没有报数据目录，就说没有报，不拿 origin 冒充一个路径。
         后端登记见 delivery-wk12 的 BE 请求。 */
      readOnlyRow(
        "Data directory",
        "The runtime does not report its path over the API, so this page cannot state it. It is the --data-dir the host was started with.",
        "Not reported",
      ),
      readOnlyRow("Adapter", "The runtime adapter serving this workspace.", info?.adapterId || "Not loaded"),
      readOnlyRow("Host state", "Whether the host is accepting work.", info?.state || "Not loaded"),
      readOnlyRow(
        "Tools",
        "The tool names this host exposes to a run.",
        (info?.capabilities?.tools || []).join(", ") || "Not loaded",
      ),
    );
  }

  /* ── Runtime 组：Overview 之外的四个意图分组 ──────────────────────── */
  function renderRuntime() {
    document.getElementById("settings-runtime-overview-absent").replaceChildren(
      latest.session
        ? null
        : el("p", {
            className: "settings-row-help",
            text: "A runtime is composed for a session. Open a session to read what its next run would carry.",
          }),
    );
    for (const [id, title, help] of RUNTIME_MOUNTS)
      document.getElementById(id).replaceChildren(
        el("h4", { className: "settings-block-title", text: title }),
        el("p", { className: "settings-row-help", text: help }),
      );
    /* WK-78 (5) · Models 与 General › Connection 是同一份数据，只在 General 编辑。
       这里只读，并给出去那一处的路。 */
    const config = latest.config?.config;
    const rows = [
      ["Provider", "Where model requests are sent.", config ? providerLabels[config.provider] || config.provider : "Not loaded"],
      ["Model", "Used for every new run in this workspace.", config ? (config.provider === "fake-openai-loopback" ? "Fake local model" : config.model || "—") : "Not loaded"],
      ["API format", "Wire format the provider expects.", config?.api || "—"],
      ["Base URL", "Empty means the provider default.", config?.baseUrl || "Provider default"],
      [
        "API key",
        "Stored on this device only; it is never shown.",
        latest.config?.credentialStatus === "configured" ? "Saved" : "Not saved",
      ],
    ];
    document.getElementById("settings-runtime-permissions").replaceChildren(
      el("h4", { className: "settings-block-title", text: "Permissions & environment" }),
      el("p", {
        className: "settings-row-help",
        text: "Policy, model and provider, budgets and sandbox facts belong here. The connection below is the same record General edits — a run freezes the value it was admitted with, and this reading is of the next run, not of one already going.",
      }),
      ...rows.map(([title, help, value]) => readOnlyRow(title, help, value)),
      action("settings-2", "Edit in General", () => onEditConnection?.(), {
        visible: true,
        className: "quiet-button settings-jump",
      }),
    );
  }

  /* 只有 Data 与 Runtime › Models 依赖服务器快照，所以只有它们跟着 update 重画。
   * Appearance、Keyboard 与 New sessions 是本地的，画一次就够：让轮询每秒重建一次
   * 分段控件，会把焦点从人正在用的那个控件上夺走（FN-27 键盘可用性）。 */
  function render() {
    if (!document.getElementById("settings-data").contains(document.activeElement))
      renderData();
    if (!document.getElementById("settings-runtime").contains(document.activeElement))
      renderRuntime();
    syncNewSessions();
    applyFilter();
  }
  function syncNewSessions() {
    const value = home.get();
    for (const input of document.querySelectorAll(
      "#settings-new-sessions input[type=radio]",
    ))
      if (!input.contains(document.activeElement) && document.activeElement !== input)
        input.checked = input.value === value;
  }
  renderAppearance();
  renderKeyboard();
  renderNewSessions();
  select(DEFAULT_SECTION);

  return {
    get section() {
      return section;
    },
    select,
    focusSection: () => panels.get(section)?.focus(),
    resetSearch() {
      if (!search.value) return;
      search.value = "";
      query = "";
      applyFilter();
    },
    update(next) {
      latest = { ...latest, ...next };
      render();
    },
    preferences: () => ({ ...prefs }),
  };
}
