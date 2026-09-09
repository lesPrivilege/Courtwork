import { el, action, flowRow } from "./ui-controls.mjs";

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
/* WK-91 · MCP servers 与 provider 走同一形态：Add → Configure → Test →
 * Review permissions → Save / Enable → Advanced。这里只写这条路上每一步今天落在
 * 哪里；没有注册端点的两步说明它们缺什么，不画按钮。Enable / Advanced 与权限复核
 * 都已经在下面的 Tools, MCP servers and plugins 块里，本块不复制它们。 */
export const MCP_INTAKE_STEPS = [
  ["Add", "Not available yet: a server arrives with the runtime configuration this build imports; there is no form here that registers a new one."],
  ["Configure", "Not available yet: endpoint and transport come from that same imported configuration."],
  ["Test connection", "Not available yet: the model-connection probe reads an OpenAI-compatible model directory. An MCP server speaks a different protocol, and there is no endpoint here that probes one."],
  ["Review permissions", "Below: each server and the tools it declares carry their source, scope and the rule that decided them."],
  ["Enable", "Below: Connect, Disconnect and Restart act on a declared server."],
  ["Advanced", "Below: transport, configuration hash and the tools a server exposes."],
];
export function renderIntegrationsIntake(container) {
  if (!container) return;
  container.replaceChildren(
    el("h4", { className: "settings-block-title", text: "Adding an MCP server" }),
    el("p", {
      className: "form-help",
      text: "A connection follows the same six steps as a model connection. Three of them have somewhere to happen today and three do not; this list says which is which rather than offering a control that cannot act.",
    }),
    el(
      "ol",
      { className: "connection-flow" },
      ...MCP_INTAKE_STEPS.map(([title, note]) =>
        el(
          "li",
          {
            className: note.startsWith("Not available yet")
              ? "connection-step is-pending"
              : "connection-step",
          },
          el("span", { className: "connection-step-name", text: title }),
          el("span", { className: "connection-step-note", text: note }),
        ),
      ),
    ),
  );
}

/* WK-89 · 文件模式是 File access，不是 permission：permission 适合持久策略，
   一次动作是 Approval。三档说的是后果本身，不是内部枚举。 */
export const permissionLabels = {
  ask: "Ask before editing",
  draft: "Allow edits",
  read_only: "Read only",
};
/* WK-94 · the one-word form (`Ask` / `Write` / `Read`) is retired with its
 * export: `File writes  Ask` said the same fact twice and said neither half
 * completely. Every caller now uses the whole sentence, and the control carries
 * a disclosure caret instead of a second label. */
export const providerLabels = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  "fake-openai-loopback": "Local test",
};
/* WK-91 · Add provider 的三条 happy path。`providers` 是后端目录的闭集
 * （`ALLOWED_PROVIDER_IDS`）在前端的投影：provider ID 由目录给，前端不生成也不发明。
 * `endpoint` 说的是这条路径里端点归谁决定 —— 这正是三条路径唯一真正的差别。 */
export const CONNECTION_PATHS = [
  {
    id: "catalog",
    title: "Catalog provider",
    providers: ["openai", "deepseek"],
    endpoint: "provider",
    help: "A provider this build already knows. Add an API key and choose a model; the endpoint is the provider's own.",
  },
  {
    id: "compatible",
    title: "Compatible endpoint",
    providers: ["openai", "deepseek"],
    endpoint: "required",
    help: "An endpoint that speaks one of the formats below. Give its Base URL under Advanced and an API key; the provider identity above decides which model catalogue applies.",
  },
  {
    id: "local",
    title: "Local endpoint",
    providers: ["fake-openai-loopback"],
    endpoint: "host",
    help: "The local test endpoint this build runs itself. It takes no key and its address is fixed by the host.",
  },
];
/* 统一流程的五步。WK-108 · BE-17 / BE-18 交付后，Test connection 与对未保存表单的
 * Fetch models 各自成为一个控件（`probe`），但它们只对一条**在表单里写得出 Base URL**
 * 的路径成立：目录身份的端点归 provider，本地端点由宿主固定，两者都没有可送出的
 * `baseUrl`。所以这两步的说明分两半写：这条路上它做什么，以及它做完之后**还没有**
 * 证明什么 —— 探测成功只说明那个目录接受了这次请求。 */
export const CONNECTION_STEPS = [
  { id: "configure", title: "Configure", available: true, note: "Choose the provider and the endpoint." },
  {
    id: "test",
    title: "Test connection",
    available: true,
    probe: "test",
    note: "Sends one request to the model directory at the Base URL below. It reports whether that directory accepted the request; it does not check that a key is valid or that a model can answer.",
  },
  {
    id: "fetch",
    title: "Fetch models",
    available: true,
    probe: "discover",
    note: "Reads the model IDs that same directory reports. They are shown as reported and are not added to the Model list below, which stays the installed catalogue.",
  },
  { id: "choose", title: "Choose a model", available: true, note: "From the catalogue for the provider above." },
  { id: "save", title: "Save connection", available: true, note: "Endpoint and model are saved here; the API key is saved separately." },
];
/* WK-108 · 只有一条路径在表单里持有显式 Base URL；另外两条没有可送出的端点，
 * 两个探测控件因此不出现在它们身上（不是禁用一个按不动的按钮）。 */
export const PROBE_PATHS = new Set(["compatible"]);
export function probeAvailableFor(pathId) {
  return PROBE_PATHS.has(pathId);
}
/* 说明为什么这条路径上没有那两个控件。说的是端点归谁，不是"暂不支持"。 */
export const PROBE_ABSENT_NOTE = {
  catalog: "The two probe steps need an endpoint written in this form. On this path the endpoint is the provider's own, so there is nothing here to probe.",
  local: "The two probe steps need an endpoint written in this form. On this path the address is fixed by the host, so there is nothing here to probe.",
};
export const PROBE_PROTOCOL = "openai-compatible";
/* WK-108 · 请求体逐字按 `app/docs/runtime-foundation.md`：`protocol` 与 `baseUrl`
 * 必填，`apiKey` 可选且为空时**省略字段**（不是送空串）。没有自定义 header，没有
 * 任何未登记字段 —— 后端会拒绝它们，而前端也没有理由发明一个。 */
export function providerProbeRequest({ baseUrl, apiKey } = {}) {
  const url = typeof baseUrl === "string" ? baseUrl.trim() : "";
  if (!url) return null;
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  return { protocol: PROBE_PROTOCOL, baseUrl: url, ...(key ? { apiKey: key } : {}) };
}
export const PROBE_ENDPOINT = {
  test: "/provider-connection/test",
  discover: "/provider-models/discover",
};
/* 结果映射。后端的 `status` 与 `message` 原样呈现：`ok` 不被改写成"已验证 / 可推理 /
 * 已配置"，失败也不被改写成一句更好听的话。前端只加两件后端没说而读者要知道的事：
 * 这一行属于哪一步，以及目录报了几个模型。模型 ID 是不可信显示数据。 */
export function probeReading(result, operation) {
  if (!result || typeof result !== "object")
    return { operation, ok: false, status: "no_result", message: "The host returned no probe result.", models: [], count: 0 };
  const status = typeof result.status === "string" ? result.status : "no_status";
  const message = typeof result.message === "string" ? result.message : "";
  const models = Array.isArray(result.models)
    ? result.models.map((m) => (typeof m?.id === "string" ? m.id : null)).filter(Boolean)
    : [];
  return {
    operation: typeof result.operation === "string" ? result.operation : operation,
    ok: status === "ok",
    status,
    message,
    models,
    count: models.length,
  };
}
/* 一行结果的可见文字。状态词在前，后端原话在后；两者都不被改写。 */
export function probeLine(reading) {
  return reading.message ? `${reading.status} · ${reading.message}` : reading.status;
}
/* `discover` 成功时的第二行。它说的是"目录报告了几个"，不是"你有几个可用模型"。 */
export function probeCatalogueLine(reading) {
  if (reading.operation !== "discover" || !reading.ok) return null;
  return reading.count === 1
    ? "The directory reports 1 model. It is listed as reported, and is not added to the Model list or saved."
    : `The directory reports ${reading.count} models. They are listed as reported, and are not added to the Model list or saved.`;
}
/** 路径由已保存的事实反推，不另存一个"用户当时选了哪条"的第二真源。 */
export function connectionPathOf(config) {
  if (!config) return "catalog";
  if (config.provider === "fake-openai-loopback") return "local";
  return config.baseUrl ? "compatible" : "catalog";
}
/** Connections 列表的一行。后端只持有一条生效连接，所以列表只有一行；
 * 其余目录身份是 Add provider 里的选项，不是连接 —— 把它们画成连接会让
 * 界面替后端宣布一个它没有的注册表。 */
export function connectionRows({ config, credentialStatus } = {}) {
  if (!config) return [];
  const provider = config.provider;
  const path = connectionPathOf(config);
  return [
    {
      id: provider,
      name: providerLabels[provider] || provider,
      provider: providerLabels[provider] || provider,
      path,
      model: provider === "fake-openai-loopback" ? "Local deterministic model" : config.model,
      endpoint:
        path === "local"
          ? "Local endpoint fixed by the host"
          : config.baseUrl || "Provider default endpoint",
      credential:
        path === "local"
          ? "No key needed"
          : credentialStatus === "configured"
            ? "API key saved"
            : "No API key saved",
      inForce: true,
    },
  ];
}

const permissionHelp = {
  ask: "Each edit asks first. Approving one edit never accepts the result.",
  draft: "The agent may edit files inside this chat's workspace without asking.",
  read_only: "Materials can be read; nothing is written.",
};
/** Native radios styled as one segmented control. `onChange(value)` may
 * return a promise; the control is disabled until it settles. `disabled` may
 * be a getter so a run starting during a request keeps the control locked. */
export function segmentedPermission({
  value,
  disabled = false,
  name,
  label = "File access for this chat",
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
        el("h4", { text: "File access · this chat" }),
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
  { request, onConfig, getSession, onSession, notify, onRuntimeEnvironment, page },
) {
  let snapshot = null,
    catalog = null,
    info = null,
    dirty = false,
    busy = false,
    generation = 0;
  const form = el("form", { className: "settings-form" });
  const list = el("div", { className: "connection-list" });
  const provider = el("select", {
    attrs: { name: "provider", "aria-label": "Provider" },
  });
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
  const label = (name_, input) => el("label", { text: name_ }, input);
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
  /* WK-91 · 三条 happy path 不是三个表单，是同一个表单的三个入口：选哪一条，只决定
     哪些字段先出现、端点由谁决定。Provider ID 由后端目录给（闭集），用户填的是
     display name。 */
  const pathFieldset = el("fieldset", {
    className: "segmented connection-paths",
    attrs: { "aria-label": "How this connection reaches a model" },
  });
  for (const entry of CONNECTION_PATHS) {
    const id = `connection-path-${entry.id}`;
    const input = el("input", {
      attrs: { type: "radio", name: "connection-path", id, value: entry.id },
    });
    input.checked = entry.id === "catalog";
    input.addEventListener("change", () => {
      if (!input.checked) return;
      dirty = true;
      applyPath(entry.id);
    });
    pathFieldset.append(
      el("label", { className: "segment", attrs: { for: id } }, input, el("span", { text: entry.title })),
    );
  }
  const pathHelp = el("p", { className: "form-help" });
  /* 统一流程写在界面上，未交付的两步标注为未交付而不是画一个按钮：
     一个按不动的按钮和一句"还没有"说的是同一件事，但前者先许诺再收回。 */
  const flow = el("ol", { className: "connection-flow" });
  /* WK-108 · 两个探测控件与它们的结果。结果区是一个 `role="status"` 的块，不是 toast：
   * 读者要能回头再读一次它说了什么，而它说的是后端原话。 */
  const probeButtons = new Map();
  const probeStatus = el("p", {
    className: "connection-probe-result",
    attrs: { role: "status", hidden: true },
  });
  const probeCatalogue = el("p", { className: "form-help", attrs: { hidden: true } });
  const probeModels = el("ul", { className: "connection-probe-models", attrs: { hidden: true } });
  const probeNote = el("p", { className: "form-help", attrs: { hidden: true } });
  let probeBusy = false, probeRevision = 0;
  function renderProbeResult(reading) {
    probeStatus.hidden = false;
    probeStatus.textContent = probeLine(reading);
    probeStatus.classList.toggle("is-failed", !reading.ok);
    const catalogue = probeCatalogueLine(reading);
    probeCatalogue.hidden = !catalogue;
    probeCatalogue.textContent = catalogue || "";
    probeModels.hidden = !reading.models.length;
    probeModels.replaceChildren(
      ...reading.models.map((id) =>
        el("li", { className: "connection-probe-model", text: id }),
      ),
    );
  }
  function clearProbeResult() {
    // Any changed form invalidates responses still in flight for its old values.
    probeRevision += 1;
    probeStatus.hidden = true;
    probeStatus.textContent = "";
    probeStatus.classList.remove("is-failed");
    probeCatalogue.hidden = true;
    probeModels.hidden = true;
    probeModels.replaceChildren();
  }
  async function runProbe(operation, button) {
    const body = providerProbeRequest({ baseUrl: baseUrl.value, apiKey: key.value });
    if (!body || probeBusy) return;
    probeBusy = true;
    lock();
    button.dataset.pending = "true";
    clearProbeResult();
    const requestedRevision = probeRevision;
    probeStatus.hidden = false;
    probeStatus.textContent = "Probing…";
    try {
      const result = await request(PROBE_ENDPOINT[operation], { method: "POST", body });
      if (requestedRevision !== probeRevision) return;
      renderProbeResult(probeReading(result, operation));
    } catch (err) {
      if (requestedRevision !== probeRevision) return;
      /* 传输层或 4xx 的失败不是一次完成的探测；它按 host 的原话报，不冒充一个
       * `status`。 */
      probeStatus.hidden = false;
      probeStatus.classList.add("is-failed");
      probeStatus.textContent =
        err.message || "The host could not run this probe.";
    } finally {
      delete button.dataset.pending;
      probeBusy = false;
      lock();
    }
  }
  function renderFlow() {
    const path = activePath();
    const probes = probeAvailableFor(path);
    probeButtons.clear();
    flow.replaceChildren();
    for (const step of CONNECTION_STEPS) {
      const usable = step.probe ? probes : step.available;
      const item = el(
        "li",
        { className: usable ? "connection-step" : "connection-step is-pending" },
        el("span", { className: "connection-step-name", text: step.title }),
        el("span", { className: "connection-step-note", text: step.note }),
      );
      if (step.probe && probes) {
        const button = el("button", {
          className: "secondary-button connection-step-action",
          attrs: { type: "button", "data-focus-key": `connection:${step.probe}` },
          text: step.title,
        });
        button.addEventListener("click", () => void runProbe(step.probe, button));
        probeButtons.set(step.probe, button);
        item.append(button);
      }
      flow.append(item);
    }
    probeNote.hidden = probes;
    probeNote.textContent = probes ? "" : PROBE_ABSENT_NOTE[path] || "";
    if (!probes) clearProbeResult();
  }
  const advanced = el(
    "details",
    { className: "settings-advanced" },
    el("summary", { text: "Advanced" }),
    row("API format", "Wire format the provider expects.", api),
    row("Base URL", "Leave empty for the provider default.", baseUrl),
    el("p", {
      className: "form-help",
      text: "Custom headers and provider compatibility quirks are not configurable here yet; this connection sends the format above and nothing else.",
    }),
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
  const addProvider = el(
    "details",
    { className: "settings-advanced connection-add" },
    el("summary", { text: "Add provider" }),
    pathFieldset,
    pathHelp,
    flow,
    probeNote,
    probeStatus,
    probeCatalogue,
    probeModels,
  );
  form.append(
    addProvider,
    row("Provider", "Where model requests are sent.", provider),
    row("Model", "Used for every chat you start next. Chats already open keep the model they were bound to.", model),
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
  container.replaceChildren(list, form, credential);
  renderFlow();
  renderPlanned(document.getElementById("planned-capabilities"));
  renderIntegrationsIntake(document.getElementById("settings-integrations-intake"));
  /* Settings 页的只读节读的是本控制器已经取到的同一份快照，不另开一路请求：
     一个事实一个来源（FN-07 的可失效缓存，不是第二真源）。Runtime 组的五个块由
     WO-WK11 的 Workbench 控制器拥有，这里只把连接快照转给它，供 Models 只读行使用。 */
  function pushToPage() {
    page?.update({
      config: snapshot,
      info,
      session: getSession()?.session || null,
      active: Boolean(getSession()?.active),
    });
    onRuntimeEnvironment?.({ config: snapshot, info });
  }
  /* 一行一条连接：名字与它的四个事实（provider、端点、模型、凭据），外加它是不是
     生效的那一条。Configure 不是第二个编辑入口，它把下面同一个表单对准这一行。 */
  function renderConnections() {
    const rows = connectionRows({
      config: snapshot?.config,
      credentialStatus: snapshot?.credentialStatus,
    });
    if (!rows.length) {
      list.replaceChildren(
        el("p", { className: "form-help", text: "No connection is loaded yet." }),
      );
      return;
    }
    list.replaceChildren(
      ...rows.map((entry) =>
        el(
          "div",
          { className: "connection-row", attrs: { "data-connection": entry.id } },
          el(
            "div",
            { className: "connection-row-text" },
            el(
              "span",
              { className: "connection-row-title" },
              el("span", { text: entry.name }),
              entry.inForce
                ? el("span", { className: "connection-row-badge", text: "In force" })
                : null,
            ),
            el("span", {
              className: "settings-row-help",
              text: `${entry.provider} · ${entry.model} · ${entry.endpoint} · ${entry.credential}`,
            }),
          ),
          el("div", { className: "connection-row-control" }, configureButton()),
        ),
      ),
    );
  }
  function configureButton() {
    const button = el("button", {
      className: "text-button",
      attrs: { type: "button", "data-focus-key": "connection:configure" },
      text: "Configure",
    });
    button.addEventListener("click", () => {
      addProvider.open = false;
      provider.focus();
    });
    return button;
  }
  function activePath() {
    return (
      [...pathFieldset.querySelectorAll("input")].find((input) => input.checked)?.value ||
      "catalog"
    );
  }
  function selectPath(id) {
    for (const input of pathFieldset.querySelectorAll("input")) input.checked = input.value === id;
  }
  /* 一条路径只决定两件事：哪些 provider 身份可选，端点归谁。别的字段不随路径改动，
     因为它们在三条路径里说的是同一件事。 */
  function applyPath(id, preferred) {
    const entry = CONNECTION_PATHS.find((path) => path.id === id) || CONNECTION_PATHS[0];
    pathHelp.textContent = entry.help;
    const allowed = entry.providers;
    provider.replaceChildren();
    for (const value of allowed)
      provider.append(
        el("option", { attrs: { value }, text: providerLabels[value] || value }),
      );
    provider.value = allowed.includes(preferred || provider.value)
      ? preferred || provider.value
      : allowed[0];
    baseUrl.disabled = entry.endpoint === "host";
    baseUrl.placeholder =
      entry.endpoint === "host"
        ? "Fixed by the host"
        : entry.endpoint === "required"
          ? "https://host/v1"
          : "Provider default";
    if (entry.endpoint === "host") baseUrl.value = "";
    if (entry.endpoint === "required") advanced.open = true;
    clearProbeResult();
    renderFlow();
    fillModels(snapshot?.config?.model);
    lock();
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
    const path = CONNECTION_PATHS.find((entry) => entry.id === activePath());
    const endpointMissing = path?.endpoint === "required" && !baseUrl.value.trim();
    save.disabled = busy || active || !catalog || !model.value || endpointMissing;
    if (path?.endpoint === "host") baseUrl.disabled = true;
    /* 探测按钮与保存按钮受同一把锁：busy / active Run 时全部锁定（沿既有 `lock()`）。
     * 除此之外它只多一个条件 —— 没有 Base URL 就没有可探测的目录。 */
    const probable = Boolean(providerProbeRequest({ baseUrl: baseUrl.value }));
    for (const button of probeButtons.values())
      button.disabled = busy || active || probeBusy || !probable;
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
    selectPath(connectionPathOf(snapshot.config));
    applyPath(connectionPathOf(snapshot.config), snapshot.config.provider);
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
    clearProbeResult();
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
    /* 上一次探测说的是上一个地址。地址一改，那句话就不再是关于屏幕上这条连接的
     * 陈述，所以它离开，而不是留在那里被当成新地址的结论。 */
    clearProbeResult();
    lock();
  });
  key.addEventListener("input", () => {
    clearProbeResult();
    lock();
  });
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
      renderConnections();
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
      renderConnections();
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
      renderConnections();
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
      el("h4", { className: "settings-block-title", text: "This chat" }),
      el(
        "div",
        { className: "settings-row" },
        el(
          "div",
          { className: "settings-row-text" },
          el("span", { className: "settings-row-title", text: "File access" }),
          el("span", {
            className: "settings-row-help",
            text: current.active
              ? "Available after this run ends."
              : "Applies to this chat. Approving one edit authorizes that exact write; it does not accept the result.",
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
      renderConnections();
      sessionPanel();
      pushToPage();
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
        renderConnections();
        sessionPanel();
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

/* WK-90 · 组按用户任务命名。`Runtime` 不再是顶层组：它是架构词，落在 Developer 里
   （语义审查 §1）。旧的 `#settings/runtime` 深链因此不再解析，按「不保留向后兼容」
   落回 General，而不是加一层重定向。 */
export const SETTINGS_GROUPS = [
  { id: "general", title: "General", panel: "settings-general" },
  { id: "appearance", title: "Appearance", panel: "settings-appearance" },
  { id: "models", title: "Models", panel: "settings-models" },
  { id: "tools", title: "Tools & Integrations", panel: "settings-tools" },
  { id: "skills", title: "Skills", panel: "settings-skills" },
  { id: "memory", title: "Memory", panel: "settings-memory" },
  { id: "permissions", title: "Permissions", panel: "settings-permissions" },
  { id: "keyboard", title: "Keyboard", panel: "settings-keyboard" },
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

/* WK-87 (b) · 用户 skin 接受前的对比度警告。对照对与门槛逐条取自
 * tools/contrast-report.mjs（同一组角色 × 底面 × 门槛）；那份工具是 node 侧的构建检查，
 * 这里是浏览器侧的同一次计算，两处若要改必须一起改。做法上不重写解析器：把候选 tier:S
 * token 挂在一个探针元素上，让浏览器按它自己的替换规则解出 tier:R 的角色值，所以这里
 * 没有第二份 S→R 映射，也就没有漂移的余地。
 * 裁定是「警告，不阻止」（WK-87 (b)）：低于门槛的 skin 仍然接受，只是把哪一对、差多少
 * 说清楚 —— 一个人有权用自己的色阶，但不该在不知情的情况下用。 */
export const CONTRAST_PAIRS = [
  ["ink", "panel", 4.5], ["ink", "float", 4.5], ["ink", "frame", 4.5],
  ["muted-strong", "frame", 4.5], ["muted-strong", "panel", 4.5], ["muted-strong", "float", 4.5],
  ["muted", "panel", 3], ["accent-ink", "panel", 4.5], ["accent-ink", "float", 4.5],
  ["on-accent", "accent", 4.5], ["on-accent", "accent-strong", 4.5],
  ["danger", "panel", 4.5], ["success", "panel", 4.5],
  ["focus", "panel", 3], ["focus", "float", 3],
  ["ink", "hover", 4.5], ["ink", "selected", 4.5], ["ink", "accent-soft", 4.5],
  ["danger", "danger-soft", 4.5],
];
function hexChannels(value) {
  const text = String(value || "").trim();
  if (!/^#/.test(text)) return null;
  let body = text.slice(1);
  if (body.length === 3) body = [...body].map((digit) => digit + digit).join("");
  if (body.length === 8) body = body.slice(0, 6);
  if (body.length !== 6 || !/^[0-9a-f]{6}$/i.test(body)) return null;
  return [0, 2, 4].map((index) => parseInt(body.slice(index, index + 2), 16));
}
function relativeLuminance([r, g, b]) {
  const channel = (raw) => {
    const value = raw / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
export function contrastRatio(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}
/** Resolve the tier:R roles a candidate tier:S set produces, then measure the
 *  same pairs the build-time report measures. Returns the pairs below their
 *  threshold; an empty array means every pair the report checks is met. */
export function skinContrastWarnings(values, { probeHost = globalThis.document?.body } = {}) {
  if (!probeHost) return [];
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
  for (const [name, value] of Object.entries(values || {}))
    probe.style.setProperty(name, value);
  probeHost.append(probe);
  try {
    const computed = getComputedStyle(probe);
    const role = (name) => hexChannels(computed.getPropertyValue(`--${name}`));
    const problems = [];
    for (const [foreground, background, minimum] of CONTRAST_PAIRS) {
      const a = role(foreground);
      const b = role(background);
      if (!a || !b) continue;
      const ratio = contrastRatio(a, b);
      if (ratio < minimum)
        problems.push({ foreground, background, ratio, minimum });
    }
    return problems;
  } finally {
    probe.remove();
  }
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
 * WK-87 (a) 之后预览只有一块、住在组顶，所以行不再需要外面那层 entry 包装。 */
function settingsRow(title, help, control, { id } = {}) {
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
  return row;
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
/* WK-78 (3) / WK-87 (a) · 预览是真实产品片段，不是色卡：一条 Chat Flow 行（同一 flowRow
 * 解剖）加一段带 diff 的代码块。它不可交互，也不该被读屏再念一遍界面，所以整块 aria-hidden，
 * 由外面那句 "Preview" 承担名字。
 * WK-87 (a)：四行共用组顶这一块。四份一模一样的预览各自跟在一行下面时，人要在四处之间
 * 来回比对同一件事；一块放在最上面，改宗、改 skin、改字号、改代码字体都在同一处看见结果，
 * 消融掉的只是重复，不是任何判断。 */
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
  ["j · ↓", "Move to the next item in a list — Home's work modules, or the pending cards in a chat."],
  ["k · ↑", "Move to the previous item in the same list."],
  ["Enter · o", "Open the item that holds the focus. It never answers a request for you."],
  ["Enter", "In the composer, send. Shift + Enter starts a new line instead."],
  ["Escape", "Close the layer on top: the navigation, then the work surface, then this page."],
];
/** Settings 页自己的控制器：分组切换、只过滤本页行的搜索、Appearance 偏好、
 *  Keyboard 只读表、Data 只读事实，以及 Runtime 组留给 WK11 的节位。
 *  页面的开合、hash、Escape 与焦点归还不在这里，在 app.mjs。 */
export function createSettingsPage({ home, onSection, onEditConnection, onOpenRuntimeResource }) {
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
    /* WO-WK11 · in the Runtime group the search is also the resource finder:
       Enter opens the one resource still showing. Opening means expanding the
       row and reading its recorded source — it installs nothing and applies
       nothing. With no query, or more than one match, Enter does nothing. */
    if (event.key === "Enter" && !event.isComposing && query) {
      /* WK-90 · the runtime's own rows are spread over four groups now, so the
         finder looks across the whole page rather than in one panel. Enter
         still opens only when exactly one resource row is left standing. */
      const matches = [
        ...document.querySelectorAll(
          ".settings-section:not([hidden]) .runtime-row:not([hidden])",
        ),
      ].filter((row) => !row.closest(".runtime-row.is-child[hidden]"));
      if (matches.length === 1) {
        event.preventDefault();
        onOpenRuntimeResource?.(matches[0].dataset.resource);
      }
      return;
    }
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
  /* WO-WK11 · the Runtime group's own objects are rows of this page too, so one
     search finds a setting and a runtime resource alike. A resource row carries
     its title, id, kind, source word and admission word in its text, which is
     exactly what someone types looking for it. */
  const ROW_SELECTOR =
    ".settings-row, .planned-row, .settings-key-row, .runtime-row, .runtime-context-row, .runtime-inventory-row";
  function applyFilter() {
    const rows = (panel) => [...panel.querySelectorAll(ROW_SELECTOR)];
    if (!query) {
      searchEmpty.hidden = true;
      for (const [id, panel] of panels) {
        panel.hidden = id !== section;
        for (const row of rows(panel)) row.hidden = false;
        for (const block of panel.querySelectorAll(".settings-block")) block.hidden = false;
      }
      return;
    }
    let matched = 0;
    for (const [, panel] of panels) {
      let hits = 0;
      for (const row of rows(panel)) {
        const hit = rowText(row).includes(query);
        row.hidden = !hit;
        if (hit) hits += 1;
      }
      for (const block of panel.querySelectorAll(".settings-block")) {
        const blockRows = [...block.querySelectorAll(ROW_SELECTOR)];
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
    /* WK-87 (b) · 对比度是警告不是门。先接受，再把低于门槛的对照对逐条说清楚：
       拒绝一套合法的 Tier S 色阶会把「你的 token」变成「我们批准的 token」。 */
    savePrefs({ skin: "custom", customSkin: result.css });
    skinDraft = "custom";
    renderSkinEditor();
    const problems = skinContrastWarnings(result.values);
    skinErrors.append(
      el("p", { className: "form-help", text: "Applied on this device." }),
    );
    if (problems.length)
      skinErrors.append(
        el("p", {
          className: "settings-row-help",
          attrs: { "data-contrast-warning": String(problems.length) },
          text: `Applied, with ${problems.length} contrast ${problems.length === 1 ? "pair" : "pairs"} below the threshold this build checks. Text in these roles may be hard to read; nothing else about the interface changes.`,
        }),
        el(
          "ul",
          { className: "skin-error-list" },
          ...problems.map((problem) =>
            el("li", {
              text: `${problem.foreground} on ${problem.background}: ${problem.ratio.toFixed(2)}:1, below ${problem.minimum}:1.`,
            }),
          ),
        ),
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
      label: "Theme",
      options: [["light", "Light"], ["dark", "Dark"], ["system", "System"]],
      value: prefs.scheme,
      onChange: (value) => savePrefs({ scheme: value }),
    });
    /* WK-89 · `Skin` 退役：它不是成熟软件的 IA 词。同一件事叫 Palette，并且退到
       Advanced 里 —— 换色阶是少数人做的事，不该与 Theme 争第一层注意力。存储键与
       `data-skin` 属性不变：那是实现，不是用户词。 */
    const skin = el("select", { attrs: { "aria-label": "Palette" } });
    for (const [value, text] of [
      ["slate", "Slate"],
      ["gray-steel", "Gray steel"],
      ["custom", "Custom tokens"],
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
    const advanced = el(
      "details",
      { className: "settings-advanced" },
      el("summary", { text: "Advanced" }),
      settingsRow(
        "Palette",
        "Swaps the colour scale only. State words, legal actions and what a control does stay exactly as they are.",
        skin,
      ),
      skinEditor,
    );
    advanced.open = prefs.skin !== "slate";
    appearance.replaceChildren(
      appearancePreview(),
      settingsRow(
        "Theme",
        "Light, dark, or whatever this device is set to. It is kept on this device and never sent to the host.",
        scheme,
      ),
      settingsRow(
        "Text size",
        "Scales every text role together. Hit regions, spacing and keyboard order do not change with it.",
        textSize,
      ),
      settingsRow(
        "Code font",
        "A monospaced family already installed on this device. Nothing is downloaded, and an unavailable name falls back to the default stack.",
        codeFont,
      ),
      codeFontError,
      settingsRow(
        "Reduced motion",
        "Always reduce stops transitions and animations. Nothing a control does changes with it.",
        motion,
      ),
      advanced,
    );
    renderSkinEditor();
    applyFilter();
  }

  /* ── Memory ───────────────────────────────────────────────────────
   * WK-90 / WK-92 · 一句用户世界的句子，没有控件。没有 memory adapter（BE-19）之前，
   * 这里画任何开关都会声明一个不存在的能力（WK-27 / FN-28）；说清楚现在是什么，
   * 比留一个按不动的开关诚实。Planned 行仍在 Developer 里逐条登记。 */
  function renderMemory() {
    document.getElementById("settings-memory-rows").replaceChildren(
      /* WK-92 / 语义审查 §4 · 一句能力边界，用契约里的词说：Matter memory 与
       * Global memory 今天都没有适配器（BE-19），所以这一节没有可读、可编辑或可
       * 删除的条目。Sources 不是 Memory —— 它们是这个 Chat 或 Work 能读到的文件，
       * 归 Skills 与项目管，混为一谈会让"关掉记忆"读成"看不见文件"。 */
      el("p", {
        className: "settings-row-help",
        text: "Nothing is remembered between chats. Matter memory and global memory have no adapter in this build, so a Chat or a Work reads only its own messages and the sources its project carries; there is no stored memory here to review, export or delete. Sources are files, not memory: they are configured under Skills and in the project itself, and they stay readable whatever this section later says.",
      }),
      /* WK-92 · Temporary chat 待 BE-20：一行说明，零控件。画一个开关会许诺一个
       * 今天不存在的第二种会话。 */
      el("p", {
        className: "settings-row-help",
        text: "Temporary chat — a chat that neither reads nor writes durable memory — has no host support yet, so there is no control for it here. With nothing remembered between chats, every chat in this build already behaves that way.",
      }),
    );
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
      label: "File access for new chats",
      options: Object.entries(permissionLabels),
      value: home.get(),
      onChange: (value) => home.set(value),
    });
    for (const input of control.querySelectorAll("input"))
      input.parentElement.setAttribute("aria-label", permissionLabels[input.value]);
    document.getElementById("settings-new-sessions").replaceChildren(
      el("h4", { className: "settings-block-title", text: "New chats" }),
      settingsRow(
        "File access",
        "The value a chat starts with. It applies when the chat is created; changing it never changes a chat that already exists.",
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

  /* 只有 Data 依赖服务器快照，所以只有它跟着 update 重画。Appearance、Keyboard 与
   * New sessions 是本地的，画一次就够：让轮询每秒重建一次分段控件，会把焦点从人正在
   * 用的那个控件上夺走（FN-27 键盘可用性）。Runtime 组由 WO-WK11 的 Workbench 自己
   * 重画，这一页只在它重画之后重跑一次过滤。 */
  function render() {
    if (!document.getElementById("settings-data").contains(document.activeElement))
      renderData();
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
  renderMemory();
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
    /* The Workbench rebuilds its own DOM; the page re-applies its one filter
       afterwards so a query survives a snapshot arriving. */
    refilter: applyFilter,
    focusSearch() {
      search.focus();
      search.select?.();
    },
    update(next) {
      latest = { ...latest, ...next };
      render();
    },
    preferences: () => ({ ...prefs }),
  };
}
