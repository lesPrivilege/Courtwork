import "./skin-policy.js";
import { el, action, flowRow } from "./ui-controls.mjs";
import { renderDiff } from "./diff-view.mjs";
import { DIFF_PREVIEW } from "./diff-fixture.mjs";
import { effortSelectable, projectProviderConfig, supportedEffortsOf } from "./provider-config.mjs";
export { PROVIDER_CONFIG_FIELDS, effortSelectable, projectProviderConfig, supportedEffortsOf } from "./provider-config.mjs";

/* WK-27: capabilities the backend does not have are drawn nowhere except this
   list. Text rows only — no switch, no button, nothing focusable, so the page
   cannot imply an authority that does not exist. */
export const PLANNED_CAPABILITIES = [
  ["MCP OAuth", "Only unauthenticated Streamable HTTP servers can connect today."],
  ["MCP stdio transport", "Local process servers cannot be launched or supervised."],
  ["Third-party plugin isolation", "Only host-trusted extensions load; there is no sandbox for outside code."],
  ["Memory providers", "Attention reads retained conversation messages. External and derived providers remain pending."],
  ["Workflows", "No workflow runner exists to execute a saved sequence."],
  ["Hooks", "No executable hook point exists."],
  ["Registries", "Package resolution and signature checks are not implemented."],
  ["Per-source token counts", "Usage is reported in the work inspector. Individual context-source sizes remain character counts."],
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
      text: "Servers are added through host configuration. Manage imported servers below.",
    }),
    el(
      "details",
      { className: "connection-flow" },
      el("summary", { text: "Setup steps and current limits" }),
      ...MCP_INTAKE_STEPS.map(([title, note]) =>
        el(
          "div",
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
    /* PV-24 · 这条路径不再借用一个目录身份：它保存的是宿主自己登记的一条连接，
     * 身份、端点、凭据与模型列表都是这条连接自己的。Fetch models 报来的 ID 因此
     * 真的成为它的模型目录 —— 能选中、能保存、能执行。 */
    id: "compatible",
    title: "Compatible endpoint",
    providers: [],
    endpoint: "required",
    help: "An endpoint that speaks one of the formats below. Give its Base URL under Advanced and an API key, then Fetch models: the IDs that directory reports become this connection's model list.",
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
    /* PV-63 · Base URL 与 key 齐备时这一步自动跑一次（去抖，失焦立即跑）；这个
     * 按钮留作手动重跑，文案改一个字不再叫"Fetch"，说明它现在是第二次做同一
     * 件事，不是第一次。 */
    buttonLabel: "Refresh models",
    available: true,
    probe: "discover",
    note: "Reads the model IDs that same directory reports. On this path they become the Model list for this connection when you save it; reading them does not check that any of them can answer. With a Base URL and a key entered, this runs on its own; the button here reruns it by hand.",
  },
  { id: "choose", title: "Choose a model", available: true, note: "From the catalogue for the provider above." },
  { id: "save", title: "Save connection", available: true, note: "Endpoint and model are saved here. On this path the key is sent with the connection so its directory can be checked with the key that will be used." },
  /* PV-73（修正 PV-41 的字形前提）· 钉住的雪碧图没有 check 字形；完成态由字
   * 承担，步名后接灰字状态词 "· Answered"，与 Run 终态词同一做法。 */
  {
    id: "smoke",
    title: "Ask the model once",
    available: true,
    note: "Sends one short prompt with the saved key and the selected model, and shows the first line of the answer. It shows that this model answers now; it is not a check of any other model on this connection.",
  },
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
  /* PV-24 · 这句话变了，因为事实变了：报来的 ID 现在是这条连接的模型列表，保存
   * 之后可以选中并执行。它仍然只说目录报了什么，不说它们能回答。 */
  return reading.count === 1
    ? "The directory reports 1 model. It becomes this connection's model list when you save; the directory reporting it is not a check that it can answer."
    : `The directory reports ${reading.count} models. They become this connection's model list when you save; the directory reporting them is not a check that any can answer.`;
}
/** 一条连接走的是哪条路径。`connectionPathOf` 的单条推断（从 `providerConfig`
 * 的 `baseUrl` 反推唯一那条连接）已退役：路径现在是连接记录自己的 `kind` 与身份
 * 说的，不是从一份全局配置里猜的。 */
export function connectionPathOfKind(connection) {
  if (!connection) return "catalog";
  if (connection.kind === "compatible") return "compatible";
  return connection.providerIdentity === "fake-openai-loopback" ? "local" : "catalog";
}

/** 用户连接没有显示名字段 —— 后端不存一个，前端也不发明一个。它的名字就是它的
 * 端点主机名；解析不出主机名时原样显示端点。 */
export function connectionLabel(connection) {
  if (!connection) return "";
  if (connection.kind !== "compatible")
    return providerLabels[connection.providerIdentity] || connection.providerIdentity;
  try {
    return new URL(connection.baseUrl).host;
  } catch {
    return connection.baseUrl || connection.id;
  }
}

/** 一个模型的窗口读数。后端给三个来源（`catalog` / `user` / `unknown`），这里
 * 逐个如实说出来，不猜值也不套用同名模型的目录值（PV-27 / PV-30）。 */
export function contextWindowReading(entry) {
  const source = entry?.contextWindowSource;
  if (Number.isSafeInteger(entry?.contextWindow))
    return source === "user"
      ? `Context window: ${entry.contextWindow.toLocaleString()} tokens, from your entry.`
      : `Context window: ${entry.contextWindow.toLocaleString()} tokens.`;
  return "Context window: unknown.";
}

/** Connections 列表。后端现在持有一份连接注册表（`GET /provider-connections`），
 * 所以这里画的是它报的每一条，不再是"生效的那一条"。今日目录连接三条、用户连接
 * 零或多条，都走同一行结构；只有一条时仍是一行，但结构不再假设单数。 */
export function connectionRows({ connections, config } = {}) {
  if (!Array.isArray(connections)) return [];
  return connections.map((connection) => {
    const path = connectionPathOfKind(connection);
    const unknownWindows = connection.models.filter(
      (entry) => entry.contextWindowSource === "unknown",
    ).length;
    return {
      id: connection.id,
      connectionId: connection.id,
      providerIdentity: connection.providerIdentity,
      kind: connection.kind,
      name: connectionLabel(connection),
      path,
      api: connection.api,
      endpoint:
        path === "local"
          ? "Local endpoint fixed by the host"
          : connection.baseUrl || "Provider default endpoint",
      credential:
        path === "local"
          ? "No key needed"
          : connection.credentialStatus === "configured"
            ? "API key saved"
            : "No API key saved",
      models: connection.models.map((entry) => entry.id),
      unknownWindows,
      inForce: Boolean(config) && config.provider === connection.providerIdentity,
      /* PV-42 · 每条连接自己的最近回执，直接来自后端；绑定失配时后端已经把它
         收回成 null，前端不缓存、不补一句。 */
      verificationLine: connectionRowVerificationLine(connection.lastVerification),
      verificationFailed: Boolean(connection.lastVerification) && connection.lastVerification.status !== "ok",
      /* 项 8 · configurationStatus 非 ready 时这一行降级：同一 form-help 槽写
         后端登记的那句，选用动作不可用。`ready` 不写、不占位。 */
      degraded: Boolean(connection.configurationStatus) && connection.configurationStatus !== "ready",
    };
  });
}

/* PV-34 / PV-46 · 保存失败的三类。判据全部来自后端：两类由探测枚举 `error.status`
 * 表达，第三类由服务层错误码 `connection_model_not_in_directory` 表达。前端不看
 * 报文正文、不做正则、不重新归类 —— 它只负责把后端已经分好的那一类说成一句人话，
 * 并把后端原话与枚举值一并留在屏幕上。 */
export const CONNECTION_SAVE_FAILURES = Object.freeze({
  connection_authentication_failed:
    "Authentication failed: that directory rejected this API key.",
  connection_directory_unavailable:
    "The model directory could not be read at this Base URL.",
  connection_model_not_in_directory:
    "That directory does not list the selected model.",
});
export function connectionSaveError(error) {
  const detail = error?.body?.error;
  const headline = CONNECTION_SAVE_FAILURES[detail?.code];
  if (!headline) return error?.message || "The connection could not be saved.";
  const parts = [headline];
  if (Array.isArray(detail.models) && detail.models.length)
    parts.push(`Not listed: ${detail.models.join(", ")}.`);
  if (typeof detail.message === "string" && detail.message) parts.push(detail.message);
  if (typeof detail.status === "string" && detail.status) parts.push(`(${detail.status})`);
  return parts.join(" ");
}

/* PV-64 · 接入回执的六态映射。只有五类登记了一句文案；`model_not_found` 不可达
 * （BE03 §5.2）不出现在这里；`unknown` 没有登记文案，只转述后端原话（PV-62 ①：
 * 不得为未结构化的信号正则出精度）。 */
export const VERIFY_STATUS_HEADLINES = Object.freeze({
  authentication_failed: "The provider rejected the key",
  timeout: "No answer within the time limit",
  unreachable: "The endpoint could not be reached",
  malformed_response: "The provider answered in a shape this host cannot read",
});
/** `http_error` 的登记文案要带上后端给的真实状态码（PV-84 的 `httpStatus`），
 * 所以它不是一句静态常量，单独算一次。 */
export function verifyHeadline(receipt) {
  if (receipt.status === "http_error") return `The provider returned HTTP ${receipt.httpStatus}`;
  return VERIFY_STATUS_HEADLINES[receipt.status] || null;
}
/** 失败态一行：`<登记文案> · <message 原话>`；`unknown` 没有登记文案，只写原话。 */
export function verifyFailureLine(receipt) {
  const headline = verifyHeadline(receipt);
  return headline ? `${headline} · ${receipt.message}` : receipt.message;
}
/** 本地时间，HH:MM——与既有 Run 状态词同一粒度，不带秒。 */
export function localTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
/** 成功态第一行：耗时 + 模型自己回的那一句（PV-40）。 */
export function verifySuccessLine(receipt) {
  /* PV-64 修型（Fable）· 一秒以内写毫秒："0.0 s" 是一个把真值抹掉的数字。 */
  const elapsed = receipt.latencyMs < 1000 ? `${receipt.latencyMs} ms` : `${(receipt.latencyMs / 1000).toFixed(1)} s`;
  return `Answered in ${elapsed} · ${receipt.replyFirstLine ?? ""}`;
}
/** 成功态第二行：模型、连接、凭据来源档、检查时刻——都是后端原话或原值。 */
export function verifyDetailLine(receipt, connectionLabelText) {
  return `${receipt.model} on ${connectionLabelText} · key from ${receipt.credentialSource} · ${localTime(receipt.checkedAt)}`;
}
/** 连接列表行的最近回执一行（PV-42）：成功写 "Answered HH:MM · model"，失败写
 * "Last ask failed HH:MM · <登记文案>"（不带原话——这一行比回执块短一截）。
 * `null`（未验证过，或绑定已失配）不占位。 */
export function connectionRowVerificationLine(receipt) {
  if (!receipt) return null;
  if (receipt.status === "ok") return `Answered ${localTime(receipt.checkedAt)} · ${receipt.model}`;
  return `Last ask failed ${localTime(receipt.checkedAt)} · ${verifyHeadline(receipt) || receipt.message}`;
}
/** `configurationStatus` 非 `ready` 时的登记文案，逐字取自
 * `app/server/service.mjs` 的 `#requireReadyConnection`（`configuration_incomplete`
 * 的 message）——前端不发明第二句话说同一件事（PV-83 一类的"不越权造真相"）。 */
export const CONFIGURATION_INCOMPLETE_MESSAGE =
  "provider configuration is unavailable; repeat the incomplete operation or remove the compatible connection";

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
  { config, session, active, onClose, onChangeConnection, onChooseModel, onPermission, measurements },
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
      { className: "context-card" },
      el("h4", { text: "Model & connection" }),
      el(
        "dl",
        { className: "data-list" },
        el("dt", { text: "Provider" }),
        el("dd", { text: providerName }),
        el("dt", { text: "Model" }),
        el("dd", { text: modelName }),
      ),
      onChooseModel ? action("settings-2", "Choose model & effort", onChooseModel, { visible:true, className:"context-row" }) : null,
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
        { className: "context-card" },
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
  container.replaceChildren(header, ...groups, ...(measurements ? [measurements] : []));
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
    generation = 0,
    /* 后端的连接注册表（`GET /provider-connections`）。列表、表单与凭据都读它，
       不再从一份全局 providerConfig 里反推唯一那条连接。 */
    connections = [],
    /* 最近一次 discover 报来的模型 ID。它属于此刻表单里的那个端点：端点、格式或
       key 一改，它就不再是关于屏幕上这条连接的陈述，随探测结果一起作废。 */
    discovered = [];
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
  /* PV-30 · 可选的窗口值。留空就是"不知道"，宿主不会替它猜一个；填了它，后端把
     来源记成 `user`，界面也照这么说。 */
  const contextWindow = el("input", {
    attrs: { type: "number", name: "contextWindow", min: "4", step: "1", placeholder: "unknown", autocomplete: "off" },
  });
  /* PV-61 · reasoning 三态的表单落点：不勾且从未碰过 = null（未声明），勾 = true，
   * 碰过之后取消勾选 = false（显式声明关）。一次只对表单当前选中的那个模型生效——
   * 与 `contextWindow` 同一处理办法（`saveCompatibleConnection` 的既有 per-model
   * 携带规则），不是一张可编辑的全表。`reasoningTouched` 只在"选中的模型换了"那几处
   * 复位（`syncReasoningCheckbox`），不在 `lock()`/`renderModelCapability` 这类
   * 每次按键都跑的地方复位，否则勾选会在下一次无关输入时被静默丢弃。 */
  const reasoningCheckbox = el("input", { attrs: { type: "checkbox", name: "reasoning" } });
  let reasoningTouched = false;
  reasoningCheckbox.addEventListener("change", () => {
    reasoningTouched = true;
    dirty = true;
    clearVerifyReceipt();
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
  /* PV-40/64 · 冒烟回执的第二行（模型/连接/凭据来源档/时间）与"Ask again"，
   * 长在同一个 `probeStatus` 块旁边，不是新的提示物。 */
  const probeDetail = el("p", { className: "form-help", attrs: { hidden: true } });
  const probeAskAgain = el("button", {
    className: "text-button",
    attrs: { type: "button", hidden: true },
    text: "Ask again",
  });
  let probeBusy = false, probeRevision = 0;
  /* 表单当前会话里最近一次冒烟的回执（不是后端持久化的那份——那份在
     `connection.lastVerification`，驱动的是连接列表行）；驱动 `probeStatus` 块与
     阶梯上 smoke 步的 "· Answered" 状态词。任一表单字段变化即随 `clearProbeResult`
     一起作废（PV-42 同源规则的表单内版本）。 */
  let lastReceipt = null;
  let verifyTarget = null; // { connectionId, model } · "Ask again" 重放用
  let smokeStatusSpan = null; // 当前渲染的 smoke 步名字节点，供状态词直接写入
  function updateSmokeStatus() {
    if (smokeStatusSpan) smokeStatusSpan.textContent = lastReceipt?.status === "ok" ? " · Answered" : "";
  }
  function renderProbeResult(reading) {
    probeStatus.hidden = false;
    probeStatus.classList.remove("is-asking");
    probeStatus.dataset.kind = "probe";
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
    /* PV-24 · 这是"发现"与"能用"之间那一步：报来的 ID 进入 Model 列表，保存时随
     * 这条连接一起存下，因而可被选中、保存与执行。它们的窗口仍然是 unknown。 */
    if (reading.operation === "discover" && reading.ok) {
      discovered = reading.models;
      fillModels(model.value || discovered[0]);
      lock();
    }
  }
  function clearProbeResult() {
    // Any changed form invalidates responses still in flight for its old values.
    probeRevision += 1;
    probeStatus.hidden = true;
    probeStatus.textContent = "";
    probeStatus.classList.remove("is-failed", "is-asking", "is-arrived");
    delete probeStatus.dataset.kind;
    probeCatalogue.hidden = true;
    probeModels.hidden = true;
    probeModels.replaceChildren();
    discovered = [];
    clearVerifyReceipt();
  }
  /* PV-42（表单内版本）· 一改表单，冒烟回执随之消失；阶梯的 "· Answered" 一起
   * 收回。窄于 `clearProbeResult`：不碰 discover/test 探测的结果与 `discovered`
   * 列表（模型下拉切一次选项不该把还没保存的、刚发现来的 ID 悄悄丢掉）——只有
   * `probeStatus` 里此刻显示的确实是一份回执（`dataset.kind==="verify"`）时才
   * 一并收回那一行，避免留下一句配不上 detail/Ask again 的孤立回执文字。 */
  function clearVerifyReceipt() {
    lastReceipt = null;
    verifyTarget = null;
    updateSmokeStatus();
    if (probeStatus.dataset.kind === "verify") {
      probeStatus.hidden = true;
      probeStatus.textContent = "";
      probeStatus.classList.remove("is-failed", "is-asking", "is-arrived");
      delete probeStatus.dataset.kind;
    }
    probeDetail.hidden = true;
    probeDetail.textContent = "";
    probeAskAgain.hidden = true;
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
    probeStatus.dataset.kind = "probe";
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
  /* PV-64 · 回执一次性到达：同一帧加 `is-arrived`（样式是它的起点：透明 + 4px
   * 位移），下一帧移除，交给既有的 `--duration`/`--ease-out` 过渡把它带回原位。
   * `prefers-reduced-motion: reduce` 下由 styles.css 既有的全局强制关闭覆盖，
   * 这里不重复判断。 */
  function triggerArrive() {
    probeStatus.classList.add("is-arrived");
    void probeStatus.offsetWidth; // 强制回流，确保起点样式先被提交一帧
    requestAnimationFrame(() => probeStatus.classList.remove("is-arrived"));
  }
  /* PV-40/62/64 · 冒烟回执渲染。成功态两行（耗时+首句、模型/连接/凭据来源档/
   * 时间），失败态一行（登记文案 · 原话），都不着色，只有失败借 `.is-failed`
   * 走既有 `--danger`。"Ask again" 显式重放同一个 {connectionId, model}。 */
  function renderVerifyReceipt(receipt, connectionLabelText) {
    probeStatus.hidden = false;
    probeStatus.classList.remove("is-asking");
    probeStatus.dataset.kind = "verify";
    if (receipt.status === "ok") {
      probeStatus.classList.remove("is-failed");
      probeStatus.textContent = verifySuccessLine(receipt);
      probeDetail.hidden = false;
      probeDetail.textContent = verifyDetailLine(receipt, connectionLabelText);
    } else {
      probeStatus.classList.add("is-failed");
      probeStatus.textContent = verifyFailureLine(receipt);
      probeDetail.hidden = true;
      probeDetail.textContent = "";
    }
    probeAskAgain.hidden = false;
    lastReceipt = receipt;
    updateSmokeStatus();
    triggerArrive();
  }
  /* PV-38/63 · 冒烟只随一次已告知的显式动作执行：调用方只有 "Save and ask once"
   * 的提交处理器、model-picker 的 "Use and ask once"（经 onSaved 的返回值间接不
   * 触碰这里）与这里自己的 "Ask again"。没有任何 input/change 监听调用它。 */
  async function runVerify(connectionId, modelId, connectionLabelText) {
    if (probeBusy) return;
    probeBusy = true;
    addProvider.open = true; // 回执长在这个块上；块要看得见回执才有意义
    lock();
    probeCatalogue.hidden = true;
    probeModels.hidden = true;
    probeModels.replaceChildren();
    probeStatus.hidden = false;
    probeStatus.classList.remove("is-failed", "is-arrived");
    probeStatus.classList.add("is-asking");
    probeStatus.dataset.kind = "verify";
    probeStatus.textContent = "Asking the model…";
    probeDetail.hidden = true;
    probeAskAgain.hidden = true;
    verifyTarget = { connectionId, model: modelId, connectionLabelText };
    const requestedRevision = ++probeRevision;
    try {
      const receipt = await request(`/provider-connections/${encodeURIComponent(connectionId)}/verify`, {
        method: "POST",
        body: { model: modelId },
      });
      if (requestedRevision !== probeRevision) return;
      renderVerifyReceipt(receipt, connectionLabelText);
      /* PV-42 · 回执已经持久化在后端（`providerVerifications`），连接列表行读的
       * 是同一份 `GET /provider-connections`。这里重取一次，"Answered …" /
       * "Last ask failed …" 才会出现在那一行上，而不是只停在这个块里。 */
      await reloadConnections();
      renderConnections();
    } catch (err) {
      if (requestedRevision !== probeRevision) return;
      // 请求本身被拒（不可准入 / 无凭据 / 活动 run）：这不是一份回执，六态映射
      // 不适用；原样转述 host 的话（PV-34/46 同一条原则）。
      probeStatus.classList.remove("is-asking");
      probeStatus.classList.add("is-failed");
      probeStatus.dataset.kind = "verify";
      probeStatus.textContent = err.message || "The host could not run this check.";
      probeAskAgain.hidden = false;
      lastReceipt = null;
      updateSmokeStatus();
      triggerArrive();
    } finally {
      probeBusy = false;
      lock();
    }
  }
  probeAskAgain.addEventListener("click", () => {
    if (!verifyTarget) return;
    void runVerify(verifyTarget.connectionId, verifyTarget.model, verifyTarget.connectionLabelText);
  });
  function renderFlow() {
    const path = activePath();
    const probes = probeAvailableFor(path);
    probeButtons.clear();
    smokeStatusSpan = null;
    flow.replaceChildren();
    for (const step of CONNECTION_STEPS) {
      const usable = step.probe ? probes : step.available;
      const nameSpan = el("span", { className: "connection-step-name", text: step.title });
      if (step.id === "smoke") {
        smokeStatusSpan = el("span", { className: "connection-step-status" });
        nameSpan.append(smokeStatusSpan);
      }
      const item = el(
        "li",
        { className: usable ? "connection-step" : "connection-step is-pending" },
        nameSpan,
        el("span", { className: "connection-step-note", text: step.note }),
      );
      if (step.probe && probes) {
        const button = el("button", {
          className: "secondary-button connection-step-action",
          attrs: { type: "button", "data-focus-key": `connection:${step.probe}` },
          text: step.buttonLabel || step.title,
        });
        button.addEventListener("click", () => void runProbe(step.probe, button));
        probeButtons.set(step.probe, button);
        item.append(button);
      }
      flow.append(item);
    }
    updateSmokeStatus();
    probeNote.hidden = probes;
    probeNote.textContent = probes ? "" : PROBE_ABSENT_NOTE[path] || "";
    if (!probes) clearProbeResult();
  }
  const contextWindowRow = row(
    "Context window",
    "Optional. Tokens this endpoint accepts for the selected model. Leave it empty if you do not know: the host will not guess a window, and compaction stays off until one is known.",
    contextWindow,
  );
  /* PV-61 · 只对兼容路径出现，只作用于表单当前选中的那个模型——与上面的窗口行
   * 同一处理办法（见 `contextWindow` 的注释）。目录原生行没有这一行：那是目录
   * 自己的事实，不是用户能声明的。 */
  const reasoningRow = row(
    "Offers reasoning effort",
    "Optional. Declares whether this model accepts a reasoning effort level on this connection. Leave it unchanged if you do not know either way.",
    reasoningCheckbox,
  );
  const advanced = el(
    "details",
    { className: "settings-advanced" },
    el("summary", { text: "Advanced" }),
    row("API format", "Wire format the provider expects.", api),
    row("Base URL", "Leave empty for the provider default.", baseUrl),
    contextWindowRow,
    reasoningRow,
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
  /* PV-63（修订 PV-38）· 保存即询问。主动作发一次已告知的冒烟；次动作只保存。
   * 两个都是 `type="submit"`：谁被点了由 `event.submitter` 读出，不是两个表单。 */
  const save = el("button", {
    className: "primary-button",
    attrs: { type: "submit" },
    text: "Save and ask once",
  });
  const saveOnly = el("button", {
    className: "secondary-button",
    attrs: { type: "submit" },
    text: "Save only",
  });
  const saveHelp = el("p", {
    className: "form-help",
    text: "Saving sends one short prompt to the selected model so you can see it answer. Nothing else is sent.",
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
    probeDetail,
    probeAskAgain,
    probeCatalogue,
    probeModels,
  );
  /* PV-27 · 选中模型的能力读数。未知就写 unknown，不写一个宿主编的数。 */
  const modelCapability = el("p", { className: "form-help" });
  form.append(
    addProvider,
    row("Provider", "Where model requests are sent.", provider),
    row("Model", "Used for every chat you start next. Chats already open keep the model they were bound to.", model),
    modelCapability,
    advanced,
    status,
    error,
    el("div", { className: "credential-actions" }, save, saveOnly),
    saveHelp,
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
    onRuntimeEnvironment?.({ config: snapshot, info, catalog });
  }
  /* 一行一条连接。行的来源是后端的连接注册表，不是"生效的那一条"反推出来的单数：
     今日目录连接三条、用户连接零或多条，都走同一行结构。Configure 不是第二个编辑
     入口，它把下面同一个表单对准这一行。 */
  function renderConnections() {
    const rows = connectionRows({ connections, config: snapshot?.config });
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
              text: `${entry.endpoint} · ${entry.api} · ${entry.credential} · ${modelSummary(entry)}`,
            }),
            /* PV-30 · 未知窗口意味着压缩是关着的。生效的那条连接由后端给出这句
               原话（`capability.notice`），逐字呈现；其余连接后端今日不为它们
               计算 capability，所以只说窗口未知，不替后端造那句话。 */
            entry.inForce && snapshot?.capability?.notice
              ? el("span", { className: "settings-row-help", text: snapshot.capability.notice })
              : null,
            /* 项 8 · configurationStatus 非 ready 时这一行说后端登记的那句，
               盖过（不叠加）项 5 的回执行——一条连接不能同时说"恢复中"又说
               "刚回答过"，前者更要紧。 */
            entry.degraded
              ? el("span", { className: "settings-row-help", text: CONFIGURATION_INCOMPLETE_MESSAGE })
              : entry.verificationLine
                ? el("span", {
                    className: entry.verificationFailed
                      ? "connection-row-verification is-failed"
                      : "connection-row-verification",
                    text: entry.verificationLine,
                  })
                : null,
          ),
          el("div", { className: "connection-row-control" }, configureButton(entry)),
        ),
      ),
    );
  }
  function modelSummary(entry) {
    if (!entry.models.length) return "No models saved on it";
    const count = `${entry.models.length} model${entry.models.length === 1 ? "" : "s"}`;
    return entry.unknownWindows
      ? `${count}, ${entry.unknownWindows} with an unknown context window`
      : count;
  }
  function configureButton(entry) {
    const button = el("button", {
      className: "text-button",
      attrs: { type: "button", "data-focus-key": `connection:configure:${entry.id}` },
      text: "Configure",
    });
    // 项 8 · 恢复中/不可用的连接：这一行唯一的动作（选用它）不可用。
    button.disabled = entry.degraded;
    button.addEventListener("click", () => {
      selectPath(entry.path);
      applyPath(entry.path, entry.path === "compatible" ? entry.connectionId : entry.providerIdentity);
      addProvider.open = entry.path === "compatible";
      provider.focus();
    });
    return button;
  }
  function connectionById(id) {
    return connections.find((connection) => connection.id === id) || null;
  }
  function connectionByIdentity(identity) {
    return connections.find((connection) => connection.providerIdentity === identity) || null;
  }
  /* 表单此刻对准的那条连接。兼容路径上 `provider` 的值是连接 id（空串 = 一条还没
     存在的新端点）；另外两条路径上它是目录身份。凭据端点收的是连接 id，所以这里
     从注册表里查出来，不在前端拼 `catalog-…` —— 那个 id 的构造规则归后端。 */
  function selectedConnection() {
    return activePath() === "compatible"
      ? connectionById(provider.value)
      : connectionByIdentity(provider.value);
  }
  function userConnections() {
    return connections.filter((connection) => connection.kind === "compatible");
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
  /* 一条路径决定两件事：`Provider` 那一栏列的是什么身份，以及端点归谁。目录与
     本地两条路径列的是目录身份；兼容路径列的是**这台宿主已经登记的连接**（外加
     一条"新端点"），因为在那条路上身份就是连接本身，不借用任何目录身份。 */
  function applyPath(id, preferred) {
    const entry = CONNECTION_PATHS.find((path) => path.id === id) || CONNECTION_PATHS[0];
    pathHelp.textContent = entry.help;
    provider.replaceChildren();
    if (id === "compatible") {
      provider.append(el("option", { attrs: { value: "" }, text: "New endpoint…" }));
      for (const connection of userConnections())
        provider.append(
          el("option", { attrs: { value: connection.id }, text: connectionLabel(connection) }),
        );
      provider.value = connectionById(preferred) ? preferred : "";
    } else {
      const allowed = entry.providers;
      for (const value of allowed)
        provider.append(
          el("option", { attrs: { value }, text: providerLabels[value] || value }),
        );
      provider.value = allowed.includes(preferred || provider.value)
        ? preferred || provider.value
        : allowed[0];
    }
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
    if (id === "compatible") {
      const connection = connectionById(provider.value);
      baseUrl.value = connection?.baseUrl || "";
      contextWindow.value = "";
    }
    renderFlow();
    fillModels(id === "compatible" ? undefined : snapshot?.config?.model);
    lock();
  }
  /* 兼容路径上"可选的模型"是两件事的并集：这条连接已经存下的模型，以及刚刚
     discover 报来的、保存时会随它一起存下的模型。窗口读数逐条来自后端的
     `contextWindowSource`，发现来的还没存过，因而是 unknown。 */
  function compatibleModelEntries() {
    const connection = connectionById(provider.value);
    const entries = (connection?.models || []).map((entry) => ({
      id: entry.id,
      contextWindow: entry.contextWindow ?? null,
      contextWindowSource: entry.contextWindowSource,
      reasoning: entry.reasoning ?? null,
    }));
    const known = new Set(entries.map((entry) => entry.id));
    for (const id of discovered)
      if (!known.has(id)) entries.push({ id, contextWindow: null, contextWindowSource: "unknown", reasoning: null });
    return entries;
  }
  /* PV-61 · 重新对准表单当前选中的模型：复位"碰过没碰过"，并把复选框设成这条
     模型此刻存下的值（`null`/`false` 都显示为未勾，区别只在 `reasoningTouched`
     之后是否会被当成一次显式声明）。只在"选中的模型换了"的那几处调用。 */
  function syncReasoningCheckbox() {
    reasoningTouched = false;
    const compatible = activePath() === "compatible";
    const entry = compatible ? compatibleModelEntries().find((candidate) => candidate.id === model.value) : null;
    reasoningCheckbox.checked = entry?.reasoning === true;
  }
  function availableModels() {
    return (catalog?.models || []).filter((m) => m.provider === provider.value);
  }
  function fillModels(preferred) {
    model.replaceChildren();
    const compatible = activePath() === "compatible";
    const entries = compatible
      ? compatibleModelEntries()
      : availableModels();
    if (
      !compatible &&
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
    if (entries.some((entry) => entry.id === preferred)) model.value = preferred;
    fillApis();
    renderModelCapability();
    syncReasoningCheckbox();
  }
  /* 选中模型的窗口与档位读数。两者都只说目录/连接实际报了什么：窗口未报就是
     unknown，目录没声明多于一档就只有 Off，且不出一个只有一项的下拉（PV-27）。 */
  function renderModelCapability() {
    if (!model.value) {
      modelCapability.textContent = "";
      return;
    }
    const compatible = activePath() === "compatible";
    const entry = compatible
      ? compatibleModelEntries().find((candidate) => candidate.id === model.value)
      : (() => {
          const catalogEntry = availableModels().find((candidate) => candidate.id === model.value);
          return catalogEntry
            ? { contextWindow: catalogEntry.contextWindow ?? null, contextWindowSource: Number.isSafeInteger(catalogEntry.contextWindow) ? "catalog" : "unknown" }
            : null;
        })();
    const identity = compatible ? connectionById(provider.value)?.providerIdentity : provider.value;
    const supported = identity ? supportedEffortsOf(catalog, identity, model.value) : null;
    const effort = supported === null
      ? "Reasoning effort: Off. The catalogue reports no levels for this model."
      : effortSelectable(supported)
        ? `Reasoning effort: ${supported.join(", ")}.`
        : "Reasoning effort: Off. This catalogue declares no levels for this model.";
    const window_ = contextWindowReading(entry);
    modelCapability.textContent = entry?.contextWindow == null
      ? `${window_} Compaction stays off for it. ${effort}`
      : `${window_} ${effort}`;
  }
  function fillApis(preferred) {
    api.replaceChildren();
    const formats =
      activePath() !== "compatible" && provider.value === "fake-openai-loopback"
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
    const connection = activePath() === "compatible" ? connectionById(provider.value) : null;
    const selected = availableModels().find((m) => m.id === model.value);
    api.value = formats.includes(preferred)
      ? preferred
      : connection?.api || selected?.api || "openai-completions";
  }
  function lock() {
    const active = Boolean(info?.activeRuns) || Boolean(getSession()?.active);
    for (const node of form.querySelectorAll("input,select,button"))
      node.disabled = busy || active;
    const pathId = activePath();
    const path = CONNECTION_PATHS.find((entry) => entry.id === pathId);
    const endpointMissing = path?.endpoint === "required" && !baseUrl.value.trim();
    save.disabled = saveOnly.disabled = busy || active || !catalog || !model.value || endpointMissing;
    if (path?.endpoint === "host") baseUrl.disabled = true;
    // 窗口值与 reasoning 声明只在兼容路径上有可写之处：目录连接的这两样由目录/
    // 连接自己的原生行给出，用户改不了它们。
    contextWindowRow.hidden = pathId !== "compatible";
    contextWindow.disabled = busy || active || pathId !== "compatible";
    reasoningRow.hidden = pathId !== "compatible";
    reasoningCheckbox.disabled = busy || active || pathId !== "compatible";
    /* 探测按钮与保存按钮受同一把锁：busy / active Run 时全部锁定（沿既有 `lock()`）。
     * 除此之外它只多一个条件 —— 没有 Base URL 就没有可探测的目录。 */
    const probable = Boolean(providerProbeRequest({ baseUrl: baseUrl.value }));
    for (const button of probeButtons.values())
      button.disabled = busy || active || probeBusy || !probable;
    probeAskAgain.disabled = busy || active || probeBusy;
    const target = selectedConnection();
    keySave.disabled = busy || active || !key.value.trim();
    keyDelete.disabled = busy || active || target?.credentialStatus !== "configured";
    key.disabled = busy || active;
    credential.hidden = pathId === "local";
    credentialStatus.textContent = !target
      ? "This endpoint is not saved yet. Its key travels with the connection when you save it."
      : target.credentialStatus === "configured"
        ? "A key is saved on this device for this connection. It is never shown here."
        : "No key is saved for this connection.";
    status.textContent = active
      ? "A run is active. Connection and permission changes are available after it ends."
      : pathId === "local"
        ? "Uses a deterministic local test provider. No external model request."
        : "Saved locally. A model call happens only when you send an instruction.";
    renderModelCapability();
  }
  function resetFields() {
    if (!snapshot) return;
    const connection = connectionByIdentity(snapshot.config.provider);
    const pathId = connectionPathOfKind(connection);
    selectPath(pathId);
    applyPath(pathId, pathId === "compatible" ? connection?.id : snapshot.config.provider);
    if (pathId !== "compatible") provider.value = snapshot.config.provider;
    fillModels(snapshot.config.model);
    fillApis(snapshot.config.api);
    baseUrl.value = (pathId === "compatible" ? connection?.baseUrl : snapshot.config.baseUrl) || "";
    contextWindow.value = "";
    dirty = false;
    lock();
  }
  provider.addEventListener("change", () => {
    dirty = true;
    key.value = "";
    clearProbeResult();
    /* 兼容路径上换的是"哪条连接"，端点与格式随它走：上一条连接的地址不是关于
       这一条的陈述。 */
    if (activePath() === "compatible") {
      const connection = connectionById(provider.value);
      baseUrl.value = connection?.baseUrl || "";
      contextWindow.value = "";
      fillApis(connection?.api);
    }
    fillModels();
    lock();
  });
  model.addEventListener("change", () => {
    dirty = true;
    contextWindow.value = "";
    // 换了模型，回执说的就不再是屏幕上这一个了（PV-42 表单内版本）。
    clearVerifyReceipt();
    fillApis();
    syncReasoningCheckbox();
    lock();
  });
  api.addEventListener("change", () => {
    dirty = true;
    clearVerifyReceipt();
  });
  contextWindow.addEventListener("input", () => {
    dirty = true;
    clearVerifyReceipt();
    lock();
  });
  /* PV-63 · Base URL 与 key 齐备时自动重跑一次 discover（只读、去抖）；失焦立即跑，
   * 输入中按 600 ms 停顿跑。这两个监听器只安排一次自动探测，不直接发请求 —— 真正
   * 发请求的仍是既有 `runProbe("discover", …)`，走同一份去抖 revision 与锁。 */
  let autoDiscoverTimer = null;
  function scheduleAutoDiscover(delay) {
    clearTimeout(autoDiscoverTimer);
    if (activePath() !== "compatible") return;
    if (!providerProbeRequest({ baseUrl: baseUrl.value })) return;
    autoDiscoverTimer = setTimeout(() => {
      const button = probeButtons.get("discover");
      if (button && !button.disabled) void runProbe("discover", button);
    }, delay);
  }
  baseUrl.addEventListener("input", () => {
    dirty = true;
    /* 上一次探测说的是上一个地址。地址一改，那句话就不再是关于屏幕上这条连接的
     * 陈述，所以它离开，而不是留在那里被当成新地址的结论。 */
    clearProbeResult();
    lock();
    scheduleAutoDiscover(600);
  });
  baseUrl.addEventListener("blur", () => scheduleAutoDiscover(0));
  key.addEventListener("input", () => {
    clearProbeResult();
    lock();
    // 带 key 的发现结果才是保存时会核的那份（PV-63）：key 一改也重跑一次。
    scheduleAutoDiscover(600);
  });
  key.addEventListener("blur", () => scheduleAutoDiscover(0));
  function fail(err) {
    error.hidden = false;
    error.textContent = connectionSaveError(err);
  }
  async function reloadConnections() {
    connections = (await request("/provider-connections")).connections || [];
  }
  function contextWindowValue() {
    const raw = contextWindow.value.trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 4 ? parsed : null;
  }
  /* 兼容路径的保存是两步，因为后端有两件事：先把这条连接登记下来（端点、格式、
     模型列表、以及要用的那把 key —— 后端拿它去探一次目录，三类失败在那里分开），
     再把它选为生效配置。两步都成功才算保存成功；第一步失败时不会留下一条选中了
     但没登记的配置。 */
  async function saveCompatibleConnection() {
    const chosen = model.value;
    const window_ = contextWindowValue();
    // PV-61 · reasoning 一次只对表单当前选中的模型生效，同一处理办法照搬 window_。
    const reasoningOverride = reasoningTouched ? reasoningCheckbox.checked : undefined;
    const models = compatibleModelEntries().map((entry) => {
      const value = entry.id === chosen ? window_ : entry.contextWindow;
      const reasoning = entry.id === chosen && reasoningOverride !== undefined ? reasoningOverride : entry.reasoning;
      return {
        id: entry.id,
        ...(Number.isSafeInteger(value) ? { contextWindow: value } : {}),
        ...(reasoning !== null && reasoning !== undefined ? { reasoning } : {}),
      };
    });
    const body = {
      api: api.value,
      baseUrl: baseUrl.value.trim(),
      models,
      ...(key.value.trim() ? { apiKey: key.value.trim() } : {}),
    };
    const existing = provider.value;
    const result = existing
      ? await request(`/provider-connections/${encodeURIComponent(existing)}`, { method: "PUT", body })
      : await request("/provider-connections", { method: "POST", body });
    const connection = result.connection;
    // 这条连接的模型此刻才进入已安装目录，所以先重取目录，投影才核得出档位。
    catalog = await request("/provider-models");
    await reloadConnections();
    return request("/provider-config", {
      method: "PUT",
      body: projectProviderConfig(
        snapshot?.config,
        { provider: connection.providerIdentity, model: chosen, api: connection.api, baseUrl: undefined },
        catalog,
      ),
    });
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    // PV-63（修订 PV-38）· 哪个按钮被点了，读 `event.submitter`——两个都是
    // `type="submit"`，不是两个表单。冒烟只在这一次已告知的显式点击后发生。
    const askOnce = event.submitter === save;
    busy = true;
    lock();
    error.hidden = true;
    try {
      if (activePath() === "compatible") {
        snapshot = await saveCompatibleConnection();
      } else {
        /* PV-M-1 · 请求体由同一处投影装配。本处只说明这张表单改了什么；它没有
           提到的 `reasoningEffort` 由快照带过去，于是保存连接不再静默清掉模型
           选择器里选好的档位。 */
        snapshot = await request("/provider-config", {
          method: "PUT",
          body: projectProviderConfig(
            snapshot?.config,
            {
              provider: provider.value,
              model: model.value,
              api: api.value,
              baseUrl: baseUrl.value.trim() || null,
            },
            catalog,
          ),
        });
        await reloadConnections();
      }
      onConfig(snapshot);
      dirty = false;
      key.value = "";
      resetFields();
      renderConnections();
      notify("Connection saved.");
      // PV-63/64 · 保存已经成功；询问是它之后的独立一步，失败不回滚保存
      // （runVerify 自己的 catch 已经把这一点体现为回执块里的一句话，不是
      // 这里的 `error`）。已成功的步不回滚：连接保持已保存。
      if (askOnce) {
        const target = connectionByIdentity(snapshot.config.provider);
        if (target) void runVerify(target.id, snapshot.config.model, connectionLabel(target));
      }
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
    const target = selectedConnection();
    if (!target) {
      fail(new Error("Save this connection first. The key for a new endpoint is sent with it."));
      return;
    }
    if (dirty) {
      fail(new Error("Save this connection before adding its key."));
      return;
    }
    busy = true;
    lock();
    error.hidden = true;
    const value = key.value;
    key.value = "";
    try {
      // 凭据的作用域是一条连接，不是一个 provider 身份：键就是连接 id（PV-32）。
      await request("/provider-credential", {
        method: "PUT",
        body: { connectionId: target.id, apiKey: value },
      });
      snapshot = await request("/provider-config");
      await reloadConnections();
      onConfig(snapshot);
      renderConnections();
      lock();
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
    const target = selectedConnection();
    if (!target) return;
    busy = true;
    lock();
    error.hidden = true;
    try {
      await request("/provider-credential", {
        method: "DELETE",
        body: { connectionId: target.id },
      });
      key.value = "";
      snapshot = await request("/provider-config");
      await reloadConnections();
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
        const [config, models, runtime, registry] = await Promise.all([
          request("/provider-config"),
          request("/provider-models"),
          request("/runtime-info"),
          request("/provider-connections"),
        ]);
        if (own !== generation) return;
        snapshot = config;
        catalog = models;
        info = runtime;
        connections = registry.connections || [];
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

// One synchronous policy also runs before the first paint in index.html.
export const { SKIN_COLOR_TOKENS, validateSkinTokens, validateLegacySkinTokens,
  projectSkin, SKIN_POLICY_VERSION, SKIN_LIMIT, SKIN_PRESETS, SKIN_CHOICES, resolveSkinPreference } = globalThis.__cwSkinPolicy;
export const SKIN_NUMERIC_TOKENS = globalThis.__cwSkinPolicy.LEGACY_SKIN_NUMERIC_TOKENS;

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
  ["attention-review", "panel", 4.5], ["attention-review", "float", 4.5],
  ["attention-review", "panel-muted", 4.5], ["attention-review", "hover", 4.5],
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
  probe.className = "skin-contrast-probe";
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;";
  for (const [name, value] of Object.entries(values || {}))
    if (SKIN_COLOR_TOKENS.includes(name)) probe.style.setProperty(name, value);
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
export const PREFERENCE_DEFAULTS = {
  scheme: "system",
  skin: "slate",
  customSkin: "",
  textSize: "medium",
  codeFont: "",
  motion: "system",
  /* CC-D0-a (WK-114 ②) · Home 的版面是一个本设备偏好，不是一个新首页：Modules 默认展示已接入的数据卡；既有 Simple 选择保持，沿旧几何。
     `homeModuleBand` 是那条带的折叠状态，与显隐同一条通道（WK-114 ⑥）。 */
  homeLayout: "modules",
  homeModuleBand: "expanded",
};
const PREFERENCE_VALUES = {
  scheme: ["system", "light", "dark"],
  skin: SKIN_CHOICES,
  textSize: ["small", "medium", "large"],
  motion: ["system", "reduce"],
  homeLayout: ["simple", "modules"],
  homeModuleBand: ["expanded", "collapsed"],
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
  if (typeof stored.customSkin === "string")
    prefs.customSkin = stored.customSkin;
  return prefs;
}
/* CC-I 第一片（WK-150 / WK-143 / WK-149 (c)）· 一行偏好比一行设置多出的那件事：
 * 它现在是什么、本来是什么、是谁把它改成现在这样的。判定只有这一处，且只能是
 * **生效值与 owner 默认值的字面比较**——不作 UI 侧推断，也不看草稿。
 *
 * 词表今日是闭集，只有两个词。没有组织策略、没有继承链、没有 Expert policy：
 * 本设备偏好的 owner 只有这台设备自己，造第三个来源词就是投影创造事实
 * （WK-139 (c)）。第三个词要等真有一个 owner 事实。 */
export const PROVENANCE_WORDS = ["Default", "Changed on this device"];
export function preferenceProvenance(prefs, property) {
  if (!prefs || !Object.hasOwn(PREFERENCE_DEFAULTS, property)) return null;
  return prefs[property] === PREFERENCE_DEFAULTS[property]
    ? PROVENANCE_WORDS[0]
    : PROVENANCE_WORDS[1];
}

export function writePreferences(prefs) {
  const store = globalThis.__cwPrefs;
  if (!store) return prefs;
  store.value = prefs;
  store.apply(prefs);
  try {
    if (!globalThis.localStorage) throw new Error("Browser storage unavailable");
    globalThis.localStorage.setItem(store.key, JSON.stringify(prefs));
    store.storageError = false;
  } catch {
    // The current projection still applies; never claim reload persistence.
    store.storageError = true;
  }
  return prefs;
}

/* CC-I 第一片（WK-150）· 有 owner 默认值的行把自己的刷新与聚焦登记在这里。
 * 每次重画 Appearance 都从空表开始：行是新的 DOM，旧的引用不该被留住。
 *
 * 为什么分成 sync 与 reset 两条路：普通的改值（拨一格 segmented、提交一次
 * Code font）只更新那一行的脚，**不重画控件** —— 每次重建分段控件都会把焦点从人正
 * 在用的那个控件上夺走（本文件下面 render() 的同一条 FN-27）。复位不同：控件显示的
 * 值由 prefs 生成，所以只有整块重画才能让 select 与 radio 跟上事实；重画之后再把焦
 * 点显式放回同一行的控件上，不让它掉回 body。
 *
 * 复位走 `apply` 这一条既有的保存通道（`savePrefs` → `writePreferences`），不绕过
 * 闭集校验，也不自己碰 `cw:prefs`。 */
export function createPreferenceGovernance({ read, apply, rerender, status }) {
  let rows = [];
  return {
    get rows() {
      return rows;
    },
    begin() {
      rows = [];
    },
    register(row) {
      rows.push(row);
    },
    sync() {
      /* 任何一次改值都作废上一条复位回执：那句话说的是上一个动作。 */
      status.textContent = "";
      const prefs = read();
      for (const row of rows) row.sync(prefs);
    },
    reset(property, title) {
      if (!Object.hasOwn(PREFERENCE_DEFAULTS, property)) return;
      apply(property, PREFERENCE_DEFAULTS[property]);
      rerender();
      rows.find((row) => row.property === property)?.focus();
      /* 复用页面既有的 role="status" 机制，不新造 toast。 */
      status.textContent = `${title} reset to default.`;
    },
  };
}

/* CC-I 第一片（WK-150）· 一行偏好的脚：provenance 一个词，右边是复位。
 *
 * modified 不另画一个色点：provenance 那个词本身就是指示器（WK-140 §4 "不得只靠
 * 颜色"），整行也不因为 modified 换背景或加边框——材质表达层次不表达状态（FN-28）。
 * 复位在默认态**不呈现**而不是呈现为不可用：一个按不动的按钮要人先按一次才知道它
 * 不该被按，而 `Default` 这个词已经把"现在就是默认"说完了（与 WK-27 "没有能力就不
 * 画控件"同一条）。脚的高度用 `--control` 钉死，所以出现与消失都不挪动下面的行。 */
function propertyFoot(title, property, prefs, controlId, onReset) {
  const provenanceId = `${controlId}-provenance`;
  const provenance = el("span", {
    className: "property-provenance",
    attrs: { id: provenanceId },
  });
  const reset = el("button", {
    className: "text-button property-reset",
    text: "Reset",
    /* 光秃秃的 `Reset` 在一列六行里彼此无法分辨：可达名字带上属性名，
       可见文字仍是 `Reset` 且是名字的前缀（label-in-name）。 */
    attrs: { type: "button", "aria-label": `Reset ${title} to default` },
  });
  /* 复位是可逆的低风险操作，不加确认对话框（WK-122 undo over confirmation；
     WK-140 `high-risk ≠ confirm dialog` 的反面：低风险更不该有）。 */
  reset.addEventListener("click", () => onReset?.(property, title));
  const foot = el("div", { className: "property-foot" }, provenance, reset);
  const sync = (current) => {
    const word = preferenceProvenance(current, property);
    provenance.textContent = word;
    const modified = word !== PROVENANCE_WORDS[0];
    reset.hidden = !modified;
    foot.setAttribute("data-modified", String(modified));
  };
  sync(prefs);
  return { foot, sync, provenanceId };
}

/* 一行的解剖与既有 settings-row 完全相同：标题 + 一句作用域或后果 + 右侧单一控件。
 * WK-87 (a) 之后预览只有一块、住在组顶，所以行不再需要外面那层 entry 包装。
 *
 * CC-I 第一片（WK-150）· 只多一个可选的 `property`：它是 `PREFERENCE_DEFAULTS` 里的
 * 一个键，也就是"这一行有一个 owner 默认值"。给了它，这一行长出 modified /
 * reset / provenance 三件；不给（服务器背书的设置、只读行、纯导航行）**一个字都不
 * 多**——没有 owner 默认值就没有 provenance，这是"投影不得创造事实"（WK-139 (c)）
 * 在这一片的形态。`governance` 是页面那一份注册台，行只把自己的刷新与聚焦交上去，
 * 不去持有 prefs，也不自己写存储。 */
export function settingsRow(title, help, control, { id, property, prefs, governance } = {}) {
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
  if (!property || !Object.hasOwn(PREFERENCE_DEFAULTS, property)) return row;
  const { foot, sync, provenanceId } = propertyFoot(
    title,
    property,
    prefs,
    control.id,
    governance?.reset,
  );
  row.setAttribute("data-property", property);
  /* provenance 要被读屏听见，所以挂在控件上，而不是留一段孤立的文字。 */
  control.setAttribute("aria-describedby", provenanceId);
  row.append(foot);
  governance?.register({
    property,
    sync,
    /* fieldset 本身不可聚焦：分段控件的落点是被选中的那个 radio，也就是复位之后
       默认值所在的那一格。行若住在 Advanced 里，先把那层 details 打开，否则焦点会
       落进一个看不见的控件（FN-27）。 */
    focus() {
      const details = row.closest?.("details");
      if (details) details.open = true;
      const target = control.matches?.("fieldset")
        ? control.querySelector("input:checked") || control.querySelector("input")
        : control;
      target?.focus?.();
    },
  });
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
  /* One fixed sample rendered by the shared diff renderer (diff-view.mjs), so
   * the preview shows the same change language every theme and skin will use.
   * It is a display sample: no file-diff request, no recorded artifact and no
   * decision stand behind it. */
  const code = el(
    "div",
    { className: "code-block settings-preview-code" },
    el("div", { className: "code-toolbar" }, el("span", { text: DIFF_PREVIEW.file })),
    renderDiff(DIFF_PREVIEW.lines, { label: DIFF_PREVIEW.label }),
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
        title: `ws_write · ${DIFF_PREVIEW.file}`,
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
export function createSettingsPage({ home, onSection, onEditConnection, onOpenRuntimeResource, onHomeLayout }) {
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
      "aria-label": "Appearance token set",
      placeholder: ":root {\n  --gray-1: …;\n  --gray-2: …;\n}",
    },
  });
  skinInput.value = prefs.customSkin;
  const skinErrors = el("div", { className: "skin-errors", attrs: { role: "alert" } });
  const skinState = el("p", { className: "settings-row-help", attrs: { role: "status" } });
  const skinCompatibility = el("div", { className: "settings-row-help" });
  const storageStatus = el("p", { className: "settings-row-help", attrs: { role: "status" } });
  const skinDraftState = el("p", { className: "settings-row-help", attrs: { role: "status" } });
  const effectivePrefs = () => ({ ...prefs, skin: resolveSkinPreference(prefs).effective });
  skinInput.addEventListener("input", () => {
    skinDraftState.textContent = skinInput.value === prefs.customSkin ? "" : "Draft changes are not applied.";
    skinErrors.replaceChildren();
  });
  /* CC-I 第一片（WK-150）· 复位后的一句回执。沿用页面上探测结果那一处已有的
     `role="status"` 机制（本文件 413 行），不新造 toast：它是一条状态，不是一个决定
     （FN-26 的分工）。文字在重画之后才写，读屏才会念到新插入的那一句。 */
  const appearanceStatus = el("p", {
    className: "settings-row-help settings-appearance-status",
    attrs: { role: "status" },
  });
  const governance = createPreferenceGovernance({
    read: effectivePrefs,
    apply(property, value) {
      savePrefs({ [property]: value });
      /* Palette 的草稿与生效值是两条（FN-14 请求值 ≠ 有效值）：复位生效值时草稿
         一并回到默认，否则 select 还停在 Custom tokens 上，界面比事实更旧。
         存着的那套 token 不动 —— 复位是把这一项还原成它的默认值，不是删数据；
         删是编辑器里那个 Remove。 */
      if (property === "skin") skinDraft = value;
    },
    rerender: () => renderAppearance(),
    status: appearanceStatus,
  });
  function savePrefs(change) {
    prefs = writePreferences({ ...prefs, ...change });
    /* Home 的版面偏好在 Settings 里改，在 Home 上生效：这里只回执改了什么，
       由 app 决定重画哪一块，Settings 不去碰 Home 的 DOM。 */
    if (Object.hasOwn(change, "homeLayout") || Object.hasOwn(change, "homeModuleBand"))
      onHomeLayout?.(prefs);
    governance.sync();
    renderSkinEditor();
    return prefs;
  }
  function renderSkinEditor() {
    skinEditor.hidden = skinDraft !== "custom";
    const sessionOnly = Boolean(globalThis.__cwPrefs?.storageError);
    storageStatus.hidden = !sessionOnly;
    storageStatus.textContent = sessionOnly ? "Applied for this session only. Browser storage could not be updated; reload will restore the previously saved preferences." : "";
    skinExport.textContent = sessionOnly ? "Export current tokens" : "Export stored tokens";
    const projected = projectSkin(prefs.customSkin);
    const applied = prefs.skin === "custom" && projected.ok;
    skinState.textContent = applied
      ? sessionOnly ? "Your appearance colours are applied for this session only." : "Your appearance colours are applied on this device."
      : prefs.customSkin
        ? prefs.skin === "custom" ? "The stored set cannot be applied. Slate is active; your original is retained." : "A token set is stored but not applied."
        : "No token set is stored. Slate remains active until you apply a valid set.";
    skinRemove.hidden = skinExport.hidden = !prefs.customSkin;
    skinEditable.hidden = !projected.ok || !projected.ignored.length;
    skinCompatibility.replaceChildren();
    if (prefs.customSkin && !projected.ok)
      skinCompatibility.append(el("p", { text: projected.errors.map(error => error.reason).join(" ") }));
    if (projected.ok && projected.ignored.length)
      skinCompatibility.append(el("p", { text: `Stored but not applied: ${projected.ignored.join(", ")}. Status colours, focus and materials follow the theme. Export keeps the original set.` }));
    if (applied) {
      const problems = skinContrastWarnings(projected.values);
      if (problems.length) skinCompatibility.append(
        el("p", { attrs: { "data-contrast-warning": String(problems.length) }, text: `${problems.length} contrast pairs are below the readable threshold in this theme. Colours remain applied.` }),
        el("ul", { className: "skin-error-list" }, ...problems.map(problem => el("li", {
          text: `${problem.foreground} on ${problem.background}: ${problem.ratio.toFixed(2)}:1, below ${problem.minimum}:1.`,
        }))),
      );
    }
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
    // Preserve exactly what was explicitly applied; the resolver owns effective CSS.
    savePrefs({ skin: "custom", customSkin: skinInput.value });
    skinDraft = "custom";
    skinDraftState.textContent = "";
    renderSkinEditor();
  });
  const skinExport = el("button", { className: "quiet-button", attrs: { type: "button" }, text: "Export stored tokens" });
  skinExport.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([prefs.customSkin], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "courtwork-stored-palette.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const skinEditable = el("button", { className: "quiet-button", attrs: { type: "button" }, text: "Edit appearance colours" });
  skinEditable.addEventListener("click", () => {
    const projected = projectSkin(prefs.customSkin);
    if (!projected.ok) return;
    skinInput.value = projected.css.replaceAll("; ", ";\n");
    skinDraftState.textContent = "Editable colours loaded as a draft. Your stored original is unchanged until you apply.";
    skinErrors.replaceChildren();
    skinInput.focus();
  });
  skinRemove.addEventListener("click", () => {
    savePrefs({ skin: "slate", customSkin: "" });
    skinDraft = "slate";
    skinInput.value = "";
    skinDraftState.textContent = "";
    skinErrors.replaceChildren();
    renderAppearance();
    appearance.querySelector('[aria-label="Palette"]')?.focus();
  });
  skinEditor.append(
    el("p", {
      className: "settings-row-help",
      text: "Paste a complete appearance scale using opaque hex colours: gray 1–12, accent 3/9/10/11, paper, float-s, frame-s, ink-max and on-accent-s. One set serves Light and Dark. Status colours, focus and materials are controlled by the theme.",
    }),
    skinInput,
    el("div", { className: "credential-actions" }, skinRemove, skinExport, skinEditable, skinApply),
    skinState,
    skinDraftState,
    skinCompatibility,
    skinErrors,
  );

  const codeFontError = el("p", {
    className: "inline-error",
    attrs: { role: "alert", hidden: true },
  });
  function renderAppearance() {
    const wasAdvancedOpen = appearance.querySelector(".settings-advanced")?.open ?? (prefs.skin !== "slate");
    governance.begin();
    /* 一个调用点只多一个词。有 owner 默认值的行写 `governed("scheme")`，没有的
       行什么都不写——加一行 provenance 不该逼着改十处调用（本片的缝就切在这里）。 */
    const governed = (property) => ({ property, prefs: effectivePrefs(), governance });
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
      ...SKIN_PRESETS.map(({ id, label }) => [id, label]),
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
    /* WK-129 (b) · 两值的闭集偏好用 segmented，不用 select：段数少、两个选项都
       该同时可见。它与 Theme / Text size / Reduced motion 是同一个控件。 */
    const homeLayout = segmented({
      name: "settings-home-layout",
      label: "Home layout",
      options: [["simple", "Simple"], ["modules", "Modules"]],
      value: prefs.homeLayout,
      onChange: (value) => savePrefs({ homeLayout: value }),
    });
    const advanced = el(
      "details",
      { className: "settings-advanced" },
      el("summary", { text: "Advanced" }),
      settingsRow(
        "Palette",
        "Swaps the colour scale only. State words, legal actions and what a control does stay exactly as they are.",
        skin,
        governed("skin"),
      ),
      skinEditor,
    );
    advanced.open = wasAdvancedOpen;
    appearance.replaceChildren(
      appearancePreview(),
      storageStatus,
      settingsRow(
        "Theme",
        "Light, dark, or whatever this device is set to. It is kept on this device and never sent to the host.",
        scheme,
        governed("scheme"),
      ),
      settingsRow(
        "Text size",
        "Scales every text role together. Hit regions, spacing and keyboard order do not change with it.",
        textSize,
        governed("textSize"),
      ),
      settingsRow(
        "Code font",
        "A monospaced family already installed on this device. Nothing is downloaded, and an unavailable name falls back to the default stack.",
        codeFont,
        governed("codeFont"),
      ),
      codeFontError,
      settingsRow(
        "Reduced motion",
        "Always reduce stops transitions and animations. Nothing a control does changes with it.",
        motion,
        governed("motion"),
      ),
      settingsRow(
        "Home layout",
        "Modules shows project attention and recorded activity above the composer. Simple keeps a quieter starting page.",
        homeLayout,
        governed("homeLayout"),
      ),
      advanced,
      appearanceStatus,
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
            el("th", { attrs: { scope: "row" } }, el("span", { text: "Stop working" })),
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
        "Used when a chat is created. Existing chats keep their file access.",
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
    const mount = document.getElementById("settings-data");
    const open = mount.querySelector('details')?.open || false;
    const details = el('details', { className: 'settings-host-details' },
      el('summary', { text: 'Host details' }),
      readOnlyRow("Data directory", "The host does not report its data directory.", "Not reported"),
      readOnlyRow("Adapter", "Serves this workspace.", info?.adapterId || "Not loaded"),
      readOnlyRow("Host state", "Whether the host is accepting work.", info?.state || "Not loaded"),
      readOnlyRow("Tools", "Tools exposed by this host.", (info?.capabilities?.tools || []).join(", ") || "Not loaded"),
    );
    details.open = open;
    mount.replaceChildren(el("h4", { className: "settings-block-title", text: "Data" }), details);
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
  // This page is created once for the document. Refresh only diagnostics when
  // the system scheme changes, preserving the editor draft and keyboard focus.
  globalThis.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (prefs.scheme === "system") renderSkinEditor();
  });
  renderKeyboard();
  renderMemory();
  renderNewSessions();
  select(DEFAULT_SECTION);

  return {
    get section() {
      return section;
    },
    select,
    /* Home 折叠那条带时写的是同一条偏好通道。Settings 的 Appearance 行只在下次
       重画时读它，所以这里不重画 Settings：折叠不是 Appearance 上的一个控件。 */
    setHomeModuleBand(value) {
      prefs = writePreferences({ ...prefs, homeModuleBand: value });
    },
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
