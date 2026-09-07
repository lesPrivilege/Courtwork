import { el, icon, action, copyAction } from "./ui-controls.mjs";

/* The runtime content module (RC-1): one surface kind beside workspace / run /
   file. It projects the authoritative control-plane snapshot and never
   synthesizes authority — every value on screen comes from the last snapshot
   the server returned, and every mutation replaces the whole snapshot. */

const SCOPE_ORDER = ["user", "workspace", "session"];
const SCOPE_LABELS = { user: "user", workspace: "workspace", session: "session" };
const SCOPE_TAB_LABELS = { user: "User", workspace: "Workspace", session: "Session" };
export const PRECEDENCE_SENTENCE =
  "Session overrides workspace, and workspace overrides user. A narrower scope cannot loosen a deny or ask that a wider one set.";
export const CHARACTER_NOTE = "characters, not tokens";
const KIND_GROUPS = [
  ["tool", "Tools"],
  ["mcp_server", "MCP servers"],
  ["skill", "Skills"],
  ["plugin", "Plugins"],
  ["instruction", "Instructions"],
  ["prompt_template", "Prompt templates"],
  ["reference", "References"],
  ["agent_profile", "Agent profiles"],
];
const KIND_NOTES = {
  mcp_server:
    "A configured server, a connected server and an exposed capability are three different states. Connecting one grants the model nothing on its own.",
  prompt_template:
    "A template is invoked by you and returns a draft. It is not offered to the model and starts no run.",
  agent_profile:
    "Selecting a profile is a different act from exposing a resource: a profile filters and restricts, and it can never grant authority the host does not already hold. Selection is made where the profile is chosen, not with these switches.",
  skill:
    "A skill contributes its name and description to the catalog; its body loads only when the agent asks for it.",
};
const KIND_LABELS = {
  tool: "Tool",
  mcp_server: "MCP server",
  skill: "Skill",
  plugin: "Plugin",
  instruction: "Instruction",
  prompt_template: "Prompt template",
  reference: "Reference",
  agent_profile: "Agent profile",
  memory_provider: "Memory provider",
  workflow: "Workflow",
  hook: "Hook",
  registry: "Registry",
  provider: "Provider",
  model: "Model",
  permission_policy: "Permission policy",
  secret: "Secret",
  sandbox: "Sandbox",
  session_context: "Session context",
};
const EFFECT_LABELS = { allow: "allow", ask: "ask", deny: "deny" };
const SOURCE_LABELS = {
  builtin: "builtin",
  "local-config": "local config",
  remote: "remote",
};

export function scopeRank(scope) {
  return SCOPE_ORDER.indexOf(scope?.type);
}
export function sameScope(a, b) {
  return Boolean(a && b && a.type === b.type && a.id === b.id);
}
/** What the recorded provenance chain alone would produce. It is compared with
 * the authoritative `exposed`, never substituted for it: where the two differ,
 * something outside the chain (an MCP server gate) is deciding the value. */
export function provenanceValue(resource) {
  const winner = (resource.provenance || []).at(-1);
  return winner ? Boolean(winner.value) : Boolean(resource.defaultExposed);
}
export function overrideAt(resource, scope) {
  return (resource.provenance || []).some(
    (entry) => sameScope(entry.scope, scope) && entry.reason !== "source default",
  );
}
/** What "inherit" would fall back to: the nearest layer outside this one that
 * still states a value, otherwise the resource's own source default. */
export function inheritSource(resource, rank) {
  const outer = (resource.provenance || [])
    .filter((entry) => scopeRank(entry.scope) < rank && scopeRank(entry.scope) >= 0)
    .at(-1);
  return outer ? SCOPE_LABELS[outer.scope.type] : null;
}
export function provenanceSentence(resource) {
  const winner = (resource.provenance || []).at(-1);
  if (!winner) return "Exposure: from the source default.";
  const where = SCOPE_LABELS[winner.scope.type] || winner.scope.type;
  return winner.reason === "source default"
    ? "Exposure: the source default."
    : `Exposure: from ${where} · your ${where} override.`;
}
/** RC-6: configured / connected / exposed / error are separate facts, so the
 * row states each one rather than collapsing them into a single status word. */
export function mcpStateWords(resource) {
  if (resource.health === "error") return ["error"];
  const words = ["configured"];
  if (resource.running === true) words.push("connected");
  if (resource.exposed === true) words.push("exposed");
  return words;
}
function shortHash(value) {
  return typeof value === "string" && value.length > 12 ? value.slice(0, 12) : value;
}
function sourceWord(source) {
  return SOURCE_LABELS[source?.type] || source?.type || "unknown";
}

export function createRuntimeView(
  container,
  { request, getSessionId, notify, onDraft },
) {
  let snapshot = null,
    error = null,
    scopeType = null,
    busy = false,
    generation = 0,
    controller = null,
    sessionId = null,
    frozenByServer = false,
    unknownEffect = null,
    draft = null,
    inspected = null;
  const open = new Set();

  function writableScopes() {
    return (snapshot?.scopes || []).filter((scope) => scopeRank(scope) >= 0);
  }
  function activeScope() {
    const scopes = writableScopes();
    return (
      scopes.find((scope) => scope.type === scopeType) || scopes.at(-1) || null
    );
  }
  function frozen() {
    return Boolean(frozenByServer || (snapshot?.activeRuns || 0) > 0);
  }

  async function read({ quiet = false } = {}) {
    const own = ++generation;
    const id = getSessionId();
    controller?.abort();
    controller = new AbortController();
    sessionId = id;
    if (!quiet && !snapshot) render();
    try {
      const result = await request(
        `/runtime-control${id ? `?sessionId=${encodeURIComponent(id)}` : ""}`,
        { signal: controller.signal },
      );
      if (own !== generation) return;
      snapshot = result;
      error = null;
      if (!snapshot.activeRuns) frozenByServer = false;
      render();
    } catch (err) {
      if (own !== generation || err.name === "AbortError") return;
      error = err;
      render();
    }
  }

  /** Every mutation is a CAS against the server's own revision, and the reply
   * replaces the snapshot outright. 409 is authoritative (RC-4). */
  async function submit(body, { path = "/runtime-control", method = "PUT" } = {}) {
    if (busy || frozen()) return false;
    busy = true;
    render();
    const id = sessionId;
    const query = id ? `?sessionId=${encodeURIComponent(id)}` : "";
    try {
      const result = await request(`${path}${query}`, {
        method,
        body: { ...body, revision: snapshot.revision },
      });
      snapshot = result;
      error = null;
      draft = null;
      frozenByServer = Boolean(result.activeRuns);
      return true;
    } catch (err) {
      const code = err.body?.error?.code;
      if (code === "active_run") {
        frozenByServer = true;
        await read({ quiet: true });
      } else if (code === "runtime_conflict") {
        // Keep the unsent edit as a draft and refresh; never resend it.
        draft = { body, path, method, at: new Date() };
        await read({ quiet: true });
      } else if (code === "mcp_effect_unknown" || code === "unknown_effect") {
        unknownEffect = err.message;
      } else error = err;
      return false;
    } finally {
      busy = false;
      render();
    }
  }

  async function setExposure(resource, exposed) {
    const scope = activeScope();
    if (!scope) return;
    await submit({
      operation: "exposure",
      id: resource.id,
      scope,
      exposed,
    });
  }
  async function lifecycle(resource, act) {
    await submit(
      { action: act },
      { path: `/mcp/${encodeURIComponent(resource.id)}/lifecycle`, method: "POST" },
    );
  }
  async function useAsDraft(resource) {
    if (busy) return;
    busy = true;
    render();
    try {
      const id = sessionId;
      const result = await request(
        `/runtime-resources/${encodeURIComponent(resource.id)}/invoke${id ? `?sessionId=${encodeURIComponent(id)}` : ""}`,
        { method: "POST", body: {} },
      );
      // RC-7: the reply is a draft disposition, never a command.
      if (result.disposition !== "draft-only")
        throw new Error("This template did not return a draft.");
      onDraft(result.text, resource.title);
    } catch (err) {
      error = err;
    } finally {
      busy = false;
      render();
    }
  }
  async function inspectSource(resource) {
    if (inspected?.id === resource.id) {
      inspected = null;
      render();
      return;
    }
    inspected = { id: resource.id, loading: true };
    render();
    const own = ++generation;
    try {
      const id = sessionId;
      const result = await request(
        `/runtime-resources/${encodeURIComponent(resource.id)}${id ? `?sessionId=${encodeURIComponent(id)}` : ""}`,
      );
      if (own !== generation || inspected?.id !== resource.id) return;
      inspected = { id: resource.id, ...result };
    } catch (err) {
      if (inspected?.id === resource.id)
        inspected = { id: resource.id, error: err.message };
    } finally {
      render();
    }
  }

  function scopeTabs() {
    const list = el("div", {
      className: "runtime-scopes",
      attrs: { role: "tablist", "aria-label": "Configuration scope" },
    });
    const scopes = writableScopes();
    const current = activeScope();
    for (const scope of scopes) {
      const selected = sameScope(scope, current);
      const tab = el("button", {
        className: "runtime-scope-tab",
        text: SCOPE_TAB_LABELS[scope.type],
        attrs: {
          type: "button",
          role: "tab",
          "aria-selected": String(selected),
          tabindex: selected ? 0 : -1,
          "data-scope": scope.type,
          "data-focus-key": `scope:${scope.type}`,
        },
      });
      tab.addEventListener("click", () => {
        scopeType = scope.type;
        render();
        container
          .querySelector(`.runtime-scope-tab[data-scope="${scope.type}"]`)
          ?.focus();
      });
      list.append(tab);
    }
    list.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...list.querySelectorAll("button")];
      const index = tabs.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next =
        event.key === "Home"
          ? tabs[0]
          : event.key === "End"
            ? tabs.at(-1)
            : tabs[
                (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                  tabs.length
              ];
      next.click();
    });
    return list;
  }

  function dimension(label, value) {
    return el(
      "div",
      { className: "runtime-dimension" },
      el("span", { className: "runtime-dimension-label", text: label }),
      typeof value === "string"
        ? el("span", { className: "runtime-dimension-value", text: value })
        : value,
    );
  }

  function exposureCell(resource, scope) {
    const configurable = resource.configurable && scope && !frozen();
    // The authoritative effective value, never a value the page reconstructs.
    const value = Boolean(resource.exposed);
    const id = `rc-switch-${resource.id.replace(/[^a-z0-9]+/gi, "-")}`;
    const input = el("input", {
      attrs: {
        type: "checkbox",
        role: "switch",
        id,
        "data-focus-key": `switch:${resource.id}`,
        "aria-label": `Expose ${resource.title} to the model`,
      },
    });
    input.checked = value;
    input.disabled = !configurable || busy;
    input.addEventListener("change", () => {
      void setExposure(resource, input.checked);
    });
    return dimension(
      "Exposed",
      el(
        "span",
        { className: "runtime-switch" },
        input,
        el("label", {
          className: "runtime-switch-text",
          text: value ? "Exposed" : "Not exposed",
          attrs: { for: id },
        }),
      ),
    );
  }

  /** RC-2: inherit is the removal of this layer's override, offered as a text
   * line. There is no third switch position. One line explains where the value
   * came from; a second appears only when there is an override to remove. */
  function exposureLines(resource, scope) {
    const lines = [
      el("p", {
        className: "runtime-provenance",
        text: provenanceSentence(resource),
      }),
    ];
    // The recorded chain does not carry an MCP server's gate, so where the two
    // disagree the row names the fact that actually decided the value.
    if (provenanceValue(resource) !== Boolean(resource.exposed)) {
      const server = resource.mcp
        ? (snapshot.resources || []).find((item) => item.id === resource.mcp.serverId)
        : null;
      lines.push(
        el("p", {
          className: "runtime-provenance",
          text:
            server && !server.exposed
              ? `Its server "${server.title}" is not exposed, so this remote tool is not exposed either.`
              : `The host reports it as ${resource.exposed ? "exposed" : "not exposed"}, which the scope chain above does not explain. The host's value is the one in force.`,
        }),
      );
      return lines;
    }
    if (!scope || !resource.configurable) {
      lines.push(
        el("p", {
          className: "runtime-provenance",
          text: "Exposure is not configurable here; the service that owns this kind decides it.",
        }),
      );
      return lines;
    }
    if (!overrideAt(resource, scope)) {
      lines[0].textContent = `${lines[0].textContent} The switch overrides it for ${scope.type === "session" ? "this session" : `this ${SCOPE_LABELS[scope.type]}`}.`;
      return lines;
    }
    const from = inheritSource(resource, scopeRank(scope));
    const button = el("button", {
      className: "text-button runtime-inherit",
      text: from ? `Inherit the ${from} setting` : "Inherit the source default",
      attrs: { type: "button", "data-focus-key": `inherit:${resource.id}` },
    });
    button.disabled = busy || frozen();
    button.addEventListener("click", () => void setExposure(resource, null));
    lines.push(button);
    return lines;
  }

  function permissionDetail(resource) {
    const permission = resource.permission;
    if (!permission) return null;
    const dl = el("dl", { className: "data-list" });
    dl.append(
      el("dt", { text: "Effect" }),
      el("dd", {}, el("span", { text: EFFECT_LABELS[permission.effect] || permission.effect })),
    );
    for (const [index, step] of (permission.trace || []).entries()) {
      const source =
        typeof step.source === "string"
          ? step.source
          : `${step.source?.type || "scope"} · ${step.source?.id || ""}`.trim();
      const detail = [step.action, step.resource].filter(Boolean).join(" on ");
      dl.append(
        el("dt", { text: `Step ${index + 1} · ${source}` }),
        el(
          "dd",
          {},
          el("span", { text: detail ? `${step.effect} — ${detail}` : step.effect }),
        ),
      );
    }
    return el(
      "section",
      { className: "runtime-detail-block" },
      el("h5", { text: "Permission" }),
      dl,
      el("p", {
        className: "form-help",
        text: permission.resourceSpecific
          ? "The effect depends on the exact path or argument. The executor re-checks each call."
          : "The executor re-checks this against the bound policy on every call.",
      }),
    );
  }

  function sourceDetail(resource) {
    const dl = el("dl", { className: "data-list" });
    const rows = [
      ["Kind", KIND_LABELS[resource.kind] || resource.kind],
      ["Source", sourceWord(resource.source)],
      ["URI", resource.source?.uri],
      ["Version", resource.source?.version],
      ["Owning scope", `${resource.scope?.type} · ${resource.scope?.id}`],
      ["Activation", resource.activation],
      ["Health", resource.health],
      ["Default exposure", resource.defaultExposed ? "exposed" : "not exposed"],
      [
        "Size",
        Number.isFinite(resource.characters)
          ? `${resource.characters.toLocaleString()} ${CHARACTER_NOTE}`
          : null,
      ],
    ];
    for (const [label, value] of rows)
      if (value !== null && value !== undefined)
        dl.append(el("dt", { text: label }), el("dd", {}, el("span", { text: String(value) })));
    if (resource.kind === "agent_profile" && snapshot?.composition?.id === resource.id) {
      const composition = snapshot.composition;
      dl.append(
        el("dt", { text: "Selected" }),
        el("dd", {}, el("span", { text: `yes · ${composition.status}` })),
      );
      if (composition.uiSlots?.length)
        dl.append(
          el("dt", { text: "UI slots" }),
          el(
            "dd",
            {},
            el("span", {
              text: `${composition.uiSlots.join(", ")} — declared, not executed`,
            }),
          ),
        );
      if (composition.missing?.length)
        dl.append(
          el("dt", { text: "Missing" }),
          el("dd", {}, el("span", { text: composition.missing.join(", ") })),
        );
    }
    if (resource.source?.hash)
      dl.append(
        el("dt", { text: "Hash" }),
        el(
          "dd",
          {},
          el("code", { text: shortHash(resource.source.hash) }),
          copyAction(resource.source.hash, "Copy source hash", `hash:${resource.id}`),
        ),
      );
    return el(
      "section",
      { className: "runtime-detail-block" },
      el("h5", { text: "Source" }),
      dl,
    );
  }

  /** RC-8: the source inspector is a local-user administration capability. It
   * reads the recorded source and its hash in File-inspector semantics, and it
   * is explicitly not model access. */
  function sourceInspector(resource) {
    if (inspected?.id !== resource.id) return null;
    const body = el("div", { className: "runtime-source" });
    body.append(
      el(
        "div",
        { className: "file-heading" },
        el("h5", { text: resource.title }),
        el("span", {
          className: "file-kind",
          text: `Recorded source · ${sourceWord(resource.source)}`,
        }),
      ),
    );
    if (resource.source?.hash)
      body.append(
        el(
          "div",
          { className: "version-line" },
          el("code", { text: shortHash(resource.source.hash) }),
          copyAction(
            resource.source.hash,
            "Copy recorded source hash",
            `source-hash:${resource.id}`,
          ),
        ),
      );
    if (!resource.exposed)
      body.append(
        el("p", {
          className: "runtime-note",
          text: "The model is not authorized to read this. You are reading it as the local administrator.",
        }),
      );
    if (inspected.loading)
      body.append(el("p", { className: "form-help", text: "Loading source…" }));
    else if (inspected.error)
      body.append(el("p", { className: "inline-error", text: inspected.error }));
    else if (typeof inspected.content === "string")
      body.append(
        el("div", { className: "file-document" }, el("pre", { className: "file-text", text: inspected.content })),
      );
    else
      body.append(
        el("p", {
          className: "form-help",
          text: "This resource has no imported source. Its descriptor comes from the host.",
        }),
      );
    return body;
  }

  function rowActions(resource) {
    const bar = el("div", { className: "runtime-row-actions" });
    if (resource.kind === "prompt_template") {
      const button = el("button", {
        className: "text-button",
        text: "Use as draft",
        attrs: { type: "button", "data-focus-key": `draft:${resource.id}` },
      });
      button.disabled = busy;
      button.addEventListener("click", () => void useAsDraft(resource));
      bar.append(button);
      bar.append(
        el("span", {
          className: "runtime-action-note",
          text: "Fills the composer. Nothing is sent.",
        }),
      );
    }
    if (resource.source?.type !== "builtin" || resource.kind === "instruction") {
      const button = el("button", {
        className: "text-button",
        text: inspected?.id === resource.id ? "Hide source" : "View source",
        attrs: { type: "button", "data-focus-key": `source:${resource.id}` },
      });
      button.addEventListener("click", () => void inspectSource(resource));
      bar.append(button);
    }
    return bar.childNodes.length ? bar : null;
  }

  function resourceRow(resource, { child = false } = {}) {
    const scope = activeScope();
    const detailId = `rc-detail-${resource.id.replace(/[^a-z0-9]+/gi, "-")}`;
    const expanded = open.has(resource.id);
    const chevron = icon(expanded ? "chevron-down" : "chevron-right");
    const title = el(
      "button",
      {
        className: "runtime-row-title",
        attrs: {
          type: "button",
          "aria-expanded": String(expanded),
          "aria-controls": detailId,
          "data-focus-key": `row:${resource.id}`,
        },
      },
      chevron,
      el("span", { className: "runtime-row-name", text: resource.title }),
      el("span", {
        className: "runtime-row-tag",
        text: sourceWord(resource.source),
      }),
      // A remote capability carries the hash of the config it came from; a
      // local child row (an extension's tool) has no remote identity to show.
      child && resource.source?.type === "remote"
        ? el("code", {
            className: "runtime-row-hash",
            text: shortHash(resource.source.hash || resource.mcp?.configHash),
          })
        : null,
    );
    title.addEventListener("click", () => {
      if (open.has(resource.id)) open.delete(resource.id);
      else open.add(resource.id);
      render();
    });
    const dimensions = el(
      "div",
      { className: "runtime-dimensions" },
      dimension("Installed", resource.installed ? "Yes" : "No"),
      dimension(
        resource.kind === "mcp_server" ? "Connected" : "Running",
        resource.running === null ? "n/a" : resource.running ? "Yes" : "No",
      ),
      exposureCell(resource, scope),
      dimension(
        "Permitted",
        resource.permission
          ? EFFECT_LABELS[resource.permission.effect] || resource.permission.effect
          : "n/a",
      ),
    );
    const row = el(
      "div",
      {
        className: `runtime-row${child ? " is-child" : ""}`,
        attrs: { "data-resource": resource.id, "data-kind": resource.kind },
      },
      title,
      dimensions,
      ...exposureLines(resource, scope),
    );
    if (resource.kind === "mcp_server") row.append(mcpStateLine(resource));
    const detail = el("div", {
      className: "runtime-detail",
      attrs: { id: detailId, hidden: expanded ? null : "" },
    });
    if (expanded) {
      if (resource.description)
        detail.append(el("p", { className: "runtime-description", text: resource.description }));
      detail.append(permissionDetail(resource), sourceDetail(resource));
      if (Array.isArray(resource.diagnostics) && resource.diagnostics.length)
        detail.append(
          el(
            "section",
            { className: "runtime-detail-block" },
            el("h5", { text: "Diagnostics" }),
            ...resource.diagnostics.map((line) =>
              el("p", { className: "inline-error", text: String(line) }),
            ),
          ),
        );
      detail.append(rowActions(resource), sourceInspector(resource));
    }
    row.append(detail);
    return row;
  }

  function mcpStateLine(resource) {
    const line = el("p", { className: "runtime-mcp-state" });
    line.append(
      el("span", { className: "runtime-dimension-label", text: "State" }),
      el("span", {
        text: mcpStateWords(resource).join(" · "),
        attrs: { "data-mcp-state": mcpStateWords(resource).join(" ") },
      }),
    );
    const bar = el("div", { className: "runtime-row-actions" });
    for (const [act, label] of [
      ["connect", "Connect"],
      ["disconnect", "Disconnect"],
      ["restart", "Restart"],
    ]) {
      const button = el("button", {
        className: "text-button",
        text: label,
        attrs: { type: "button", "data-focus-key": `mcp:${resource.id}:${act}` },
      });
      button.disabled = busy || frozen();
      button.addEventListener("click", () => void lifecycle(resource, act));
      bar.append(button);
    }
    return el("div", { className: "runtime-mcp-line" }, line, bar);
  }

  function catalog() {
    const resources = snapshot.resources || [];
    const children = new Map();
    for (const resource of resources) {
      const parent = resource.mcp?.serverId || resource.parent;
      if (!parent) continue;
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(resource);
    }
    const claimed = new Set([...children.values()].flat().map((r) => r.id));
    const sections = [];
    const seen = new Set();
    for (const [kind, label] of KIND_GROUPS) {
      const group = resources.filter(
        (resource) => resource.kind === kind && !claimed.has(resource.id),
      );
      for (const resource of group) seen.add(resource.id);
      if (!group.length) continue;
      const section = el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": kind } },
        el("h4", { text: `${label} · ${group.length}` }),
        KIND_NOTES[kind]
          ? el("p", { className: "form-help", text: KIND_NOTES[kind] })
          : null,
      );
      for (const resource of group) {
        section.append(resourceRow(resource));
        for (const remote of children.get(resource.id) || []) {
          seen.add(remote.id);
          section.append(resourceRow(remote, { child: true }));
        }
      }
      sections.push(section);
    }
    const rest = resources.filter(
      (resource) => !seen.has(resource.id) && !claimed.has(resource.id),
    );
    if (rest.length) {
      const section = el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": "host" } },
        el("h4", { text: `Host projections · ${rest.length}` }),
        el("p", {
          className: "form-help",
          text: "These are read here and configured by the service that owns them.",
        }),
      );
      for (const resource of rest) section.append(resourceRow(resource));
      sections.push(section);
    }
    const missing = (snapshot.kinds || []).filter(
      (entry) => entry.support !== "available",
    );
    if (missing.length)
      sections.push(
        el(
          "section",
          { className: "runtime-kind", attrs: { "data-kind": "unsupported" } },
          el("h4", { text: "Not available in this host" }),
          el("p", {
            className: "form-help",
            text: `${missing
              .map((entry) => KIND_LABELS[entry.kind] || entry.kind)
              .join(", ")} — an adapter is required before any of these can be configured.`,
          }),
        ),
      );
    return sections;
  }

  function banners() {
    const list = [];
    if (frozen())
      list.push(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "status", "data-banner": "active-run" },
          text: "A run is active. Changes can be submitted after it ends.",
        }),
      );
    if (unknownEffect)
      list.push(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "alert", "data-banner": "unknown-effect" },
          text: `The remote effect is unknown: ${unknownEffect} Reconcile before sending another command.`,
        }),
      );
    if (draft) {
      const banner = el("div", {
        className: "runtime-banner",
        attrs: { role: "status", "data-banner": "conflict-draft" },
      });
      banner.append(
        el("p", {
          text: "The runtime changed while you were editing. Your change was not applied and is kept here as a draft.",
        }),
        el("p", { className: "runtime-draft-summary", text: describeDraft(draft) }),
      );
      const bar = el("div", { className: "runtime-row-actions" });
      const again = el("button", {
        className: "text-button",
        text: "Submit this change",
        attrs: { type: "button", "data-focus-key": "draft:submit" },
      });
      again.disabled = busy || frozen();
      again.addEventListener("click", () => {
        const pending = draft;
        draft = null;
        void submit(pending.body, { path: pending.path, method: pending.method });
      });
      const discard = el("button", {
        className: "text-button",
        text: "Discard the draft",
        attrs: { type: "button", "data-focus-key": "draft:discard" },
      });
      discard.addEventListener("click", () => {
        draft = null;
        render();
      });
      bar.append(again, discard);
      banner.append(bar);
      list.push(banner);
    }
    return list;
  }

  function describeDraft(entry) {
    const body = entry.body || {};
    if (body.operation === "exposure")
      return `${body.id} · ${body.exposed === null ? "inherit" : body.exposed ? "expose" : "do not expose"} at ${body.scope?.type}.`;
    if (body.action) return `${entry.path.split("/")[2]} · ${body.action}.`;
    return body.operation || "pending change";
  }

  function render() {
    const focusKey = document.activeElement?.dataset?.focusKey;
    const scroll = container.scrollTop;
    container.replaceChildren();
    if (error && !snapshot) {
      container.append(
        el("p", { className: "inline-error", text: error.message }),
        action("refresh-cw", "Retry loading the runtime", () => void read(), {
          visible: true,
        }),
      );
      return;
    }
    if (!snapshot) {
      container.append(
        el("p", { className: "form-help", text: "Loading the runtime…" }),
      );
      return;
    }
    const head = el(
      "div",
      { className: "runtime-head" },
      el(
        "div",
        { className: "section-heading" },
        el("h3", { text: "Runtime" }),
        action("refresh-cw", "Refresh the runtime snapshot", () => void read()),
      ),
      el("p", {
        className: "runtime-precedence",
        attrs: { id: "runtime-precedence" },
        text: PRECEDENCE_SENTENCE,
      }),
    );
    container.append(head, ...banners(), scopeTabs());
    if (error)
      container.append(el("p", { className: "inline-error", text: error.message }));
    const scope = activeScope();
    const composition = snapshot.composition;
    container.append(
      el("p", {
        className: "runtime-scope-note",
        text: scope
          ? `Editing the ${SCOPE_LABELS[scope.type]} layer · ${scope.id}. Revision ${snapshot.revision}.`
          : `No writable scope. Revision ${snapshot.revision}.`,
      }),
      composition
        ? el("p", {
            className: "runtime-scope-note",
            attrs: { "data-composition": composition.status },
            text: `Selected profile ${composition.id} · ${composition.status}${composition.missing?.length ? ` · missing ${composition.missing.join(", ")}` : ""}. Adapter ${snapshot.adapterId}.`,
          })
        : null,
    );
    const body = el("div", { className: "runtime-catalog" }, ...catalog());
    // Read-only, not unreadable: a frozen module still opens every explanation,
    // trace and source; only the controls that would submit a change are off.
    if (frozen()) body.setAttribute("data-frozen", "true");
    container.append(body);
    container.scrollTop = scroll;
    if (focusKey && document.activeElement === document.body)
      container
        .querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)
        ?.focus();
  }

  return {
    load() {
      if (getSessionId() !== sessionId) {
        snapshot = null;
        draft = null;
        unknownEffect = null;
        inspected = null;
        open.clear();
        scopeType = null;
      }
      return read();
    },
    refresh() {
      if (snapshot) return read({ quiet: true });
      return Promise.resolve();
    },
    pause() {
      generation++;
      controller?.abort();
      controller = null;
    },
  };
}

/* RC-5 / intake §6: the effective-next-run context, one proportion bar bucketed
   by kind plus one character row per bucket. There is no maximum in the
   contract, so no percentage-of-limit, free space or quota line is drawn, and
   the buckets are separated by grey lightness with a text label rather than by
   hue. */
export function renderContextBar(container, payload) {
  container.replaceChildren();
  if (!payload) {
    container.append(
      el("p", { className: "form-help", text: "The next-run context is not loaded." }),
    );
    return;
  }
  const items = payload.context || [];
  // Only `instructions` admission actually enters the next run's prompt. A
  // catalog-only body waits for runtime_load and a user-invoked template never
  // reaches the model at all, so neither one is counted into the bar.
  const buckets = new Map();
  for (const item of items) {
    const key = item.kind;
    if (!buckets.has(key))
      buckets.set(key, { kind: key, characters: 0, deferred: 0, admission: null });
    const bucket = buckets.get(key);
    if (item.admission === "instructions") bucket.characters += item.characters || 0;
    else {
      bucket.deferred += 1;
      bucket.admission = item.admission;
    }
  }
  const admitted = [...buckets.values()].filter((bucket) => bucket.characters > 0);
  const deferred = [...buckets.values()].filter((bucket) => !bucket.characters);
  const total = admitted.reduce((sum, bucket) => sum + bucket.characters, 0);
  container.append(
    el(
      "div",
      { className: "section-heading" },
      el("h4", { text: "Next run · context" }),
    ),
  );
  if (!items.length) {
    container.append(
      el("p", {
        className: "form-help",
        text: "Nothing is admitted into the next run beyond the session's own history.",
      }),
    );
    return;
  }
  const bar = el("div", {
    className: "context-bar",
    attrs: {
      role: "img",
      "aria-label": `Next-run context by kind, ${total.toLocaleString()} ${CHARACTER_NOTE}`,
    },
  });
  admitted.sort((a, b) => b.characters - a.characters);
  for (const [index, bucket] of admitted.entries()) {
    const segment = el("span", {
      className: "context-bar-segment",
      attrs: { "data-bucket": bucket.kind, "data-step": String(Math.min(index, 4)) },
    });
    segment.style.flexGrow = String(bucket.characters);
    bar.append(segment);
  }
  if (admitted.length) container.append(bar);
  const list = el("dl", { className: "data-list context-characters" });
  for (const bucket of admitted)
    list.append(
      el("dt", { text: KIND_LABELS[bucket.kind] || bucket.kind }),
      el(
        "dd",
        {},
        el("span", {
          text: `${bucket.characters.toLocaleString()} characters${bucket.deferred ? ` · ${bucket.deferred} deferred` : ""}`,
        }),
      ),
    );
  for (const bucket of deferred)
    list.append(
      el("dt", {
        text: `${KIND_LABELS[bucket.kind] || bucket.kind} · ${bucket.admission === "user-invoked" ? "user-invoked" : "deferred"}`,
      }),
      el("dd", {}, el("span", { text: "—" })),
    );
  container.append(list);
  container.append(
    el("p", {
      className: "form-help context-character-note",
      text: `Sizes are measured in ${CHARACTER_NOTE}. A deferred kind is catalogued for the run and loads its body only when the agent asks for it; a user-invoked kind never reaches the model on its own. Both are listed with a dash and left out of the bar.`,
    }),
  );
  if (payload.tokenUsage !== null && payload.tokenUsage !== undefined)
    container.append(
      el("p", { className: "form-help", text: "Token usage is reported by the host." }),
    );
  const composition = payload.composition;
  if (composition)
    container.append(
      el("p", {
        className: "form-help",
        text: `Profile ${composition.id} · ${composition.status}${composition.missing?.length ? ` · missing ${composition.missing.join(", ")}` : ""}.`,
      }),
    );
}

/* RC-5: the recorded-run half. It reads the binding a Run was actually created
   with plus the explicit load events, inside the existing Run inspector. */
export function renderRecordedContext(payload) {
  if (!payload) return null;
  const section = el(
    "details",
    {
      className: "inspector-section",
      attrs: { "data-section": "runtime-context" },
    },
    el("summary", { text: "Runtime context · recorded" }),
  );
  if (payload.legacyWithoutControlSnapshot) {
    section.append(
      el("p", {
        className: "form-help",
        text: "This run was created before the control plane recorded bindings. No runtime binding exists for it.",
      }),
    );
    return section;
  }
  const binding = payload.binding;
  const dl = el("dl", { className: "data-list" });
  const rows = [
    ["Bound revision", binding ? String(binding.revision) : null],
    ["Resources", binding ? String(binding.resources?.length ?? 0) : null],
    ["Profile", binding?.composition?.id],
    ["Profile status", binding?.composition?.status],
    ["Policy scopes", binding ? String(binding.policies?.length ?? 0) : null],
  ];
  for (const [label, value] of rows)
    if (value !== null && value !== undefined)
      dl.append(el("dt", { text: label }), el("dd", {}, el("span", { text: value })));
  if (binding?.hash)
    dl.append(
      el("dt", { text: "Binding hash" }),
      el(
        "dd",
        {},
        el("code", { text: shortHash(binding.hash) }),
        copyAction(binding.hash, "Copy binding hash", `binding:${payload.runId}`),
      ),
    );
  section.append(dl);
  if (!binding)
    section.append(
      el("p", {
        className: "form-help",
        text: "No runtime binding was recorded for this run.",
      }),
    );
  const loaded = payload.loaded || [];
  section.append(
    el("h4", { text: `Explicit loads · ${loaded.length}` }),
    loaded.length
      ? el(
          "div",
          { className: "runtime-loaded" },
          ...loaded.map((entry) =>
            el(
              "p",
              { className: "runtime-loaded-row" },
              el("code", { text: `#${entry.seq}` }),
              el("span", { text: entry.id }),
              el("span", {
                className: "runtime-dimension-label",
                text: `${(entry.characters || 0).toLocaleString()} characters`,
              }),
            ),
          ),
        )
      : el("p", {
          className: "form-help",
          text: "This run loaded no skill or reference body.",
        }),
  );
  // The same rule the next-run bar uses: only `instructions` admission is
  // measured, so the two halves of the context are counted the same way.
  const admitted = (binding?.context || []).reduce(
    (sum, item) => sum + (item.admission === "instructions" ? item.characters || 0 : 0),
    0,
  );
  if (binding)
    section.append(
      el("p", {
        className: "form-help",
        text: `The bound context measured ${admitted.toLocaleString()} ${CHARACTER_NOTE}. Later edits do not change this record.`,
      }),
    );
  return section;
}
