import { el, icon, action, copyAction } from "./ui-controls.mjs";

/* WO-WK11 · the Runtime Workbench. One controller owns the authoritative
   control-plane snapshot and renders it into the five intent groups of the
   Settings page (frontend-layering-spec §3.1). It never synthesizes authority:
   every value on screen comes from the last snapshot the server returned, every
   mutation replaces the whole snapshot, and the only state this module keeps of
   its own is a set of local drafts plus the request epoch that discards a late
   reply (FN-07 / FN-24). */

const SCOPE_ORDER = ["user", "workspace", "session"];
const SCOPE_LABELS = { user: "user", workspace: "workspace", session: "session" };
const SCOPE_TAB_LABELS = { user: "User", workspace: "Workspace", session: "Session" };
export const PRECEDENCE_SENTENCE =
  "Session overrides workspace, and workspace overrides user. A narrower scope cannot loosen a deny or ask that a wider one set.";
export const CHARACTER_NOTE = "characters, not tokens";
/* FN-16 · while a run holds the runtime there is no persistent pending-change
   protocol behind this page, so the sentence says what is true and nothing
   more. "Queued" and "applies when the run ends" are both forbidden here. */
export const ACTIVE_RUN_SENTENCE =
  "A run is active. This group is read only until it ends. An edit you make now is kept here as a draft; it is not applied, and it will not apply itself later.";
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
    "Selecting a profile is a different act from exposing a resource: a profile filters and restricts, and it can never grant authority the host does not already hold. These rows are the profiles themselves — the selection is the control above, and none of them has a switch.",
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
  session_context: "Chat context",
};
const KIND_PLURALS = {
  tool: "Tools",
  mcp_server: "MCP servers",
  skill: "Skills",
  plugin: "Plugins",
  instruction: "Instructions",
  prompt_template: "Prompt templates",
  reference: "References",
  agent_profile: "Agent profiles",
};
/* frontend-layering-spec §3.1 · the one distinction each group must explain. */
const ADMISSION_WORDS = {
  instructions: "injected",
  "catalog-only": "listed",
  "user-invoked": "draft only",
};
const ADMISSION_SENTENCES = {
  instructions: "Its text is injected into every run of this chat.",
  "catalog-only":
    "Its name and description are listed in the catalog; the body loads only when the agent asks for it.",
  "user-invoked":
    "It contributes nothing automatically. You invoke it and it returns a draft.",
};
const EFFECT_LABELS = { allow: "allow", ask: "ask", deny: "deny" };
const SOURCE_LABELS = {
  builtin: "builtin",
  "local-config": "local config",
  remote: "remote",
};
/* WK-27 · kinds the contract names and this host has no adapter for. They are
   text rows with no interactive descendant, so the page cannot imply an
   authority that does not exist. The backend request that would put a control
   back is named beside each one. */
const PLANNED_ROWS = [
  ["memory_provider", "Memory providers", "No adapter stores or retrieves memory between runs.", "BE-11"],
  ["workflow", "Workflows", "No workflow runner exists to execute a saved sequence.", "BE-11"],
  ["hook", "Hooks", "No executable hook point exists.", "BE-11"],
  ["registry", "Registries", "Package resolution and signature checks are not implemented.", "BE-11"],
];

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
    (entry) => sameScope(entry.scope, scope) && entry.reason === "explicit override",
  );
}
/** What "inherit" would fall back to: the nearest layer outside this one that
 * still states a value, otherwise the resource's own source default. */
export function inheritSource(resource, rank) {
  const outer = (resource.provenance || [])
    .filter((entry) => ["source default", "explicit override"].includes(entry.reason) && scopeRank(entry.scope) < rank && scopeRank(entry.scope) >= 0)
    .at(-1);
  return outer ? SCOPE_LABELS[outer.scope.type] : null;
}
export function provenanceSentence(resource, resources = []) {
  const winner = (resource.provenance || []).at(-1);
  if (!winner) return "Exposure: from the source default.";
  if (winner.parentId) {
    const parent = resources.find((item) => item.id === winner.parentId);
    return `Exposure: ${parent?.title || "the parent resource"} is ${winner.reason === "parent not running" ? "not running" : "not exposed"}.`;
  }
  if (winner.reason === "profile capability ceiling") return "Exposure: limited by the selected profile.";
  if (winner.reason === "context loader is not exposed") return "Exposure: the context loader is not exposed.";
  if (winner.reason === "profile selection") return "Exposure: determined by the selected profile.";
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
/** The Attention list of the Overview: the facts that are not "healthy, quiet
 * and permitted". Nothing here is inferred — each entry names the snapshot
 * field it came from, and an empty list is stated rather than hidden. */
export function attentionItems(snapshot) {
  const items = [];
  if (!snapshot) return items;
  const resources = snapshot.resources || [];
  for (const resource of resources) {
    if (resource.health !== "healthy")
      items.push({
        id: `health:${resource.id}`,
        text: `${resource.title} reports health ${resource.health}.`,
        target: resource.id,
      });
    for (const line of resource.diagnostics || [])
      items.push({ id: `diag:${resource.id}`, text: `${resource.title}: ${line}`, target: resource.id });
  }
  const asking = resources.filter(
    (resource) => resource.exposed && resource.permission?.effect === "ask",
  );
  if (asking.length)
    items.push({
      id: "permission:ask",
      text: `${asking.length} exposed ${asking.length === 1 ? "capability stops" : "capabilities stop"} and asks you before each call: ${asking.map((r) => r.title).join(", ")}.`,
      target: asking[0].id,
    });
  for (const plugin of resources.filter((resource) => resource.kind === "plugin")) {
    if (plugin.trust && plugin.trust !== "host-trusted")
      items.push({
        id: `trust:${plugin.id}`,
        text: `${plugin.title} is not host-trusted (${plugin.trust}).`,
        target: plugin.id,
      });
    const declared = Array.isArray(plugin.capabilities) ? plugin.capabilities : [];
    const absent = declared.filter(
      (name) => !resources.some((resource) => resource.id === name || resource.id === `tool:${name.replace(/^tool:/, "")}`),
    );
    if (absent.length)
      items.push({
        id: `missing:${plugin.id}`,
        text: `${plugin.title} declares ${absent.join(", ")}, which this host does not report.`,
        target: plugin.id,
      });
  }
  const composition = snapshot.composition;
  if (composition && composition.status !== "compatible")
    items.push({
      id: "composition:status",
      text: `The selected profile ${composition.id} is ${composition.status}${composition.missing?.length ? `; missing ${composition.missing.join(", ")}` : ""}.`,
      target: composition.id,
    });
  else if (composition?.missing?.length)
    items.push({
      id: "composition:missing",
      text: `The selected profile is missing ${composition.missing.join(", ")}.`,
      target: composition.id,
    });
  return items;
}
function shortHash(value) {
  return typeof value === "string" && value.length > 12 ? value.slice(0, 12) : value;
}
function sourceWord(source) {
  return SOURCE_LABELS[source?.type] || source?.type || "unknown";
}
function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
function scopeKey(scope) {
  return scope ? `${scope.type}:${scope.id}` : "none";
}
function sameRules(a, b) {
  return JSON.stringify(a || []) === JSON.stringify(b || []);
}

/** The Workbench controller. `mounts` are the five Settings blocks named in
 * frontend-layering-spec §3.1; the host owns the page, this module owns what is
 * inside those five blocks. */
export function createRuntimeView(
  mounts,
  { request, getSessionId, notify, onDraft, getRuns, getBinding, loadBinding, onEditConnection, onRendered },
) {
  let snapshot = null,
    context = null,
    error = null,
    contextError = null,
    scopeType = null,
    busy = false,
    generation = 0,
    controller = null,
    sessionId = null,
    frozenByServer = false,
    unknownEffect = null,
    inspected = null,
    policyDraft = null,
    explanation = null,
    boundRunId = null,
    capabilitiesTab = "configurable",
    pendingFocus = null,
    environment = { config: null, info: null };
  /* FN-14 "Requested" · a change the user asked for in the selected scope that
     the server has not accepted. Keyed by object and scope so two edits never
     overwrite each other, and never resent on their own (FN-19). */
  const drafts = new Map();
  const open = new Set();
  const filters = new Map();

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
  function resourceById(id) {
    return (snapshot?.resources || []).find((resource) => resource.id === id) || null;
  }
  function draftFor(key) {
    return drafts.get(key) || null;
  }
  function rememberDraft(key, entry) {
    drafts.set(key, { key, at: new Date(), ...entry });
  }

  async function read({ quiet = false, polling = false } = {}) {
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
      render({ polling });
      await readContext(own, polling);
    } catch (err) {
      if (own !== generation || err.name === "AbortError") return;
      error = err;
      render({ polling });
    }
  }

  /* The next-run admission catalog. It is a second endpoint but not a second
     authority: it answers "what will the next run carry", which the control
     snapshot does not state. A failure here leaves the rest readable. */
  async function readContext(own = generation, polling = false) {
    const id = sessionId;
    if (!id) {
      context = null;
      return;
    }
    try {
      const payload = await request(
        `/runtime-context?sessionId=${encodeURIComponent(id)}`,
      );
      if (own !== generation) return;
      context = payload;
      contextError = null;
    } catch (err) {
      if (own !== generation) return;
      context = null;
      contextError = err;
    }
    render({ polling });
  }

  /** Every mutation is a CAS against the server's own revision, and the reply
   * replaces the snapshot outright. 409 is authoritative (RC-4). */
  async function submit(body, { path = "/runtime-control", method = "PUT", key, label } = {}) {
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
      if (key) drafts.delete(key);
      frozenByServer = Boolean(result.activeRuns);
      void readContext(generation);
      return true;
    } catch (err) {
      const code = err.body?.error?.code;
      if (code === "active_run") {
        /* FN-16 · the edit is not applied and is not queued. It is kept where
           the user can still see and resubmit it by hand. */
        frozenByServer = true;
        if (key) rememberDraft(key, { body, path, method, label, reason: "active-run" });
        await read({ quiet: true });
      } else if (code === "runtime_conflict") {
        // Keep the unsent edit as a draft and refresh; never resend it.
        if (key) rememberDraft(key, { body, path, method, label, reason: "conflict" });
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
    await submit(
      { operation: "exposure", id: resource.id, scope, exposed },
      {
        key: `exposure:${resource.id}:${scopeKey(scope)}`,
        label: `${resource.title} · ${exposed === null ? "inherit" : exposed ? "expose" : "do not expose"} at ${scope.type}`,
      },
    );
  }
  /* RC B-8 / contract `operation: 'profile'` · selecting a composition. The
     scope is one of the server's own configurable scopes; no outer scope is
     invented, and `null` means "inherit whatever the wider layer selected". */
  async function selectProfile(id) {
    const scope = activeScope();
    if (!scope) return;
    await submit(
      { operation: "profile", id, scope },
      {
        key: `profile:${scopeKey(scope)}`,
        label: `Profile ${id === null ? "inherited" : id} at ${scope.type}`,
      },
    );
  }
  /* RC B-9 / contract `operation: 'policy'` · the rule list of one scope is
     replaced wholesale. The page never computes an effective effect of its
     own: it submits rules and re-reads what the server made of them. */
  async function savePolicy() {
    const scope = activeScope();
    if (!scope || !policyDraft) return;
    const rules = policyDraft.rules
      .filter((rule) => rule.action.trim() && rule.resource.trim())
      .map((rule) => ({
        action: rule.action.trim(),
        resource: rule.resource.trim(),
        effect: rule.effect,
      }));
    const done = await submit(
      { operation: "policy", scope, rules },
      { key: `policy:${scopeKey(scope)}`, label: `Policy rules at ${scope.type}` },
    );
    if (done) {
      policyDraft = null;
      notify?.("Policy saved.");
    }
  }
  async function lifecycle(resource, act) {
    await submit(
      { action: act },
      {
        path: `/mcp/${encodeURIComponent(resource.id)}/lifecycle`,
        method: "POST",
        key: `mcp:${resource.id}`,
        label: `${resource.title} · ${act}`,
      },
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
  async function inspectSource(resource, { force = false } = {}) {
    if (!force && inspected?.id === resource.id) {
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
  /* Read-only permission explanation. `advisory: true` in the reply is the
     contract saying the executor re-checks every call; the page repeats that
     rather than presenting the answer as a grant. */
  async function explainPermission(resourceId, path) {
    if (!resourceId) return;
    explanation = { resourceId, resource: path, loading: true };
    render();
    const own = ++generation;
    try {
      const id = sessionId;
      const result = await request(
        `/runtime-permissions/evaluate${id ? `?sessionId=${encodeURIComponent(id)}` : ""}`,
        {
          method: "POST",
          body: { resourceId, ...(path ? { resource: path } : {}) },
        },
      );
      if (own !== generation) return;
      explanation = { resourceId, resource: path, ...result };
    } catch (err) {
      explanation = { resourceId, resource: path, error: err.message };
    } finally {
      render();
    }
  }

  /* ── shared pieces ─────────────────────────────────────────────────── */

  /* WK-90 · the scope strip used to sit once, at the head of one Runtime group.
     The five intent blocks now live in five Settings groups, and four of them
     carry editable layers — a policy list, an exposure switch, a profile — so a
     group that can be edited has to say which layer is being edited. This is
     the same control, not a second one: it reads and writes the controller's
     one `scopeType`, so choosing a layer in Permissions is the same choice
     Developer › Runtime shows. Only the primary instance carries the id the
     acceptance suite anchors on; the others are the same strip repeated. */
  function scopeStrip({ primary = false, where = "overview" } = {}) {
    if (!snapshot) return [];
    const scope = activeScope();
    return [
      el("p", {
        className: "runtime-precedence",
        attrs: primary ? { id: "runtime-precedence" } : {},
        text: PRECEDENCE_SENTENCE,
      }),
      scopeTabs(where),
      el("p", {
        className: "runtime-scope-note",
        text: scope
          ? `Editing the ${SCOPE_LABELS[scope.type]} layer · ${scope.id}. Revision ${snapshot.revision}.`
          : `No writable scope. Revision ${snapshot.revision}.`,
      }),
    ];
  }

  function scopeTabs(where = "overview") {
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
          /* One key per instance: the strip is repeated in every group that can
             be edited, and focus must come back to the strip the person used,
             not to the first one in the document (FN-27). */
          "data-focus-key": `scope:${where}:${scope.type}`,
        },
      });
      tab.addEventListener("click", () => {
        scopeType = scope.type;
        policyDraft = null;
        render();
        mounts[where]
          ?.querySelector(`.runtime-scope-tab[data-scope="${scope.type}"]`)
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
    input.disabled = !configurable || busy || hasParentGate(resource);
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
        text: provenanceSentence(resource, snapshot.resources),
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
    if (hasParentGate(resource)) lines.push(el("p", {
      className: "runtime-provenance",
      text: "Expose and connect the parent resource before changing this tool's exposure.",
    }));
    /* A profile ceiling is not this layer's override and the switch cannot lift
       it: the server records the request and the profile still decides. Saying
       "the switch overrides it" here would promise an effect the snapshot has
       already refused (FN-14, FE-T03). */
    const gate = (resource.provenance || []).at(-1)?.reason;
    const ceiling = ["profile capability ceiling", "profile selection", "context loader is not exposed"].includes(gate);
    if (ceiling)
      lines.push(
        el("p", {
          className: "runtime-provenance",
          attrs: { "data-ceiling": gate },
          text: "The switch records your request for this scope. The selected profile still decides the value in force, so the request can be stored and stay without effect.",
        }),
      );
    if (!overrideAt(resource, scope)) {
      if (!hasParentGate(resource) && !ceiling)
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

  /* FN-14 · the four layers of one configurable item. They are four different
     questions and are never merged: what the bytes are, what you asked for,
     what the server will use next, and what a finished run actually froze.
     The page computes none of them — each cell names where its value came
     from, and an absent layer says it is absent. */
  function layerBlock(resource, scope) {
    const dl = el("dl", { className: "data-list runtime-layers" });
    const add = (term, value, note) =>
      dl.append(
        el("dt", { text: term }),
        el(
          "dd",
          {},
          typeof value === "string" ? el("span", { text: value }) : value,
          note ? el("span", { className: "runtime-layer-note", text: note }) : null,
        ),
      );
    const source = resource.source || {};
    add(
      "Source",
      `${sourceWord(source)}${source.version ? ` · ${source.version}` : ""}${source.uri ? ` · ${source.uri}` : ""}`,
      source.hash ? `hash ${shortHash(source.hash)}` : "no hash recorded",
    );
    /* Requested is either an unsent draft or a stored override this layer
       states. A stored override is not the same as the effective value: when
       something outside the chain still decides (a profile ceiling, a parent
       gate), the note says the request was recorded and did not win. */
    const draft = draftFor(`exposure:${resource.id}:${scopeKey(scope)}`);
    const override = scope
      ? (resource.provenance || []).find(
          (entry) => sameScope(entry.scope, scope) && entry.reason === "explicit override",
        )
      : null;
    const decided = (resource.provenance || []).at(-1);
    const outranked = Boolean(override && decided && decided !== override);
    add(
      "Requested",
      draft
        ? `${draft.label} — not in effect`
        : override
          ? `${override.value ? "Exposed" : "Not exposed"} — your ${SCOPE_LABELS[scope.type]} override, recorded`
          : `Nothing requested in the ${scope ? SCOPE_LABELS[scope.type] : "current"} layer.`,
      draft
        ? draft.reason === "active-run"
          ? "a run was active, so the server did not take it"
          : "the revision moved, so the server did not take it"
        : outranked
          ? `recorded, and outranked by ${decided.reason}`
          : null,
    );
    add(
      "Effective",
      resource.exposed ? "Exposed to the next run" : "Not exposed to the next run",
      `server revision ${snapshot.revision}`,
    );
    const binding = boundRunId ? getBinding?.(boundRunId) : null;
    if (!boundRunId)
      add("Bound", "No recorded run is open.", "choose one under Recorded bindings");
    else if (!binding)
      add("Bound", "Reading the binding of this run…");
    else if (binding.legacyWithoutControlSnapshot)
      add("Bound", "This run was created before bindings were recorded.");
    else {
      const bound = (binding.binding?.resources || []).find((item) => item.id === resource.id);
      add(
        "Bound",
        bound
          ? bound.exposed
            ? "Exposed in this run"
            : "Not exposed in this run"
          : "Not present in this run's binding.",
        `run ${boundRunId.slice(0, 8)} · revision ${binding.binding?.revision ?? "not recorded"}`,
      );
    }
    return el(
      "section",
      { className: "runtime-detail-block", attrs: { "data-layers": resource.id } },
      el("h5", { text: "Source · Requested · Effective · Bound" }),
      dl,
      el("p", {
        className: "form-help",
        text: "A later edit never changes a bound run. The hash identifies bytes only; it is not a second effective value.",
      }),
    );
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
    const last = (permission.trace || []).at(-1);
    const overridden =
      last && last.effect && last.effect !== permission.effect && typeof last.source === "object";
    return el(
      "section",
      { className: "runtime-detail-block" },
      el("h5", { text: "Permission" }),
      dl,
      overridden
        ? el("p", {
            className: "runtime-provenance",
            attrs: { "data-not-widened": "true" },
            text: `The ${last.source.type} layer asked for ${last.effect} and the effective answer is still ${permission.effect}. A narrower layer can only tighten; it cannot loosen what a wider one set.`,
          })
        : null,
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
    /* The Source layer above already states the type, version and hash. This
       block is the rest of the descriptor, so it does not repeat them. */
    const rows = [
      ["Kind", KIND_LABELS[resource.kind] || resource.kind],
      ["URI", resource.source?.uri],
      ["Owning scope", `${resource.scope?.type} · ${resource.scope?.id}`],
      ["Activation", resource.activation],
      ["Health", resource.health],
      ["Default exposure", resource.defaultExposed ? "exposed" : "not exposed"],
      ["Model tool name", resource.executionName],
      ["Policy action", resource.action],
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
      el("h5", { text: "Descriptor" }),
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
    if (resource.action) {
      const button = el("button", {
        className: "text-button",
        text: "Explain permission",
        attrs: { type: "button", "data-focus-key": `explain:${resource.id}` },
      });
      button.addEventListener("click", () => void explainPermission(resource.id));
      bar.append(button);
    }
    return bar.childNodes.length ? bar : null;
  }

  function contextItemFor(id) {
    return (context?.context || []).find((item) => item.id === id) || null;
  }

  /** One resource, one row: the object, its four separate facts, the sentence
   * that explains the value in force, and — on disclosure — the four layers,
   * the permission trace, the descriptor and the recorded source. */
  function resourceRow(resource, { child = false, readOnly = false } = {}) {
    const scope = activeScope();
    const detailId = `rc-detail-${resource.id.replace(/[^a-z0-9]+/gi, "-")}`;
    const expanded = open.has(resource.id);
    const chevron = icon(expanded ? "chevron-down" : "chevron-right");
    const item = contextItemFor(resource.id);
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
      item
        ? el("span", {
            className: "runtime-row-tag",
            text: ADMISSION_WORDS[item.admission] || item.admission,
            attrs: { "data-admission": item.admission },
          })
        : null,
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
      readOnly
        ? dimension("Exposed", resource.exposed ? "Exposed" : "Not exposed")
        : exposureCell(resource, scope),
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
      ...(readOnly ? [] : exposureLines(resource, scope)),
    );
    if (item)
      row.append(
        el("p", {
          className: "runtime-provenance",
          text: ADMISSION_SENTENCES[item.admission] || "",
        }),
      );
    if (resource.kind === "mcp_server" && !readOnly) row.append(mcpStateLine(resource));
    const detail = el("div", {
      className: "runtime-detail",
      attrs: { id: detailId, hidden: expanded ? null : "" },
    });
    if (expanded) {
      if (resource.description)
        detail.append(el("p", { className: "runtime-description", text: resource.description }));
      detail.append(...[layerBlock(resource, scope), permissionDetail(resource), sourceDetail(resource)].filter(Boolean));
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
      detail.append(...[rowActions(resource), sourceInspector(resource)].filter(Boolean));
      if (explanation?.resourceId === resource.id)
        detail.append(explanationBlock());
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

  function explanationBlock() {
    const block = el(
      "section",
      { className: "runtime-detail-block", attrs: { "data-explanation": "true" } },
      el("h5", { text: "Permission explanation" }),
    );
    if (explanation.loading) {
      block.append(el("p", { className: "form-help", text: "Reading the explanation…" }));
      return block;
    }
    if (explanation.error) {
      block.append(el("p", { className: "inline-error", text: explanation.error }));
      return block;
    }
    /* WK-98 (3) / FN-28 · an evaluation that carried no effect is missing data,
       not an effect called `null`. The block says which reading is absent and
       stops, rather than printing the value the response did not have. */
    if (!explanation.effect) {
      block.append(
        el("p", {
          className: "form-help",
          text: "The runtime answered without an effect for this capability, so there is no reading to show. Nothing was granted and nothing changed.",
        }),
      );
      return block;
    }
    const dl = el("dl", { className: "data-list" });
    dl.append(
      el("dt", { text: "Effect" }),
      el("dd", {}, el("span", { text: EFFECT_LABELS[explanation.effect] || explanation.effect })),
    );
    for (const [index, step] of (explanation.trace || []).entries()) {
      const from =
        typeof step.source === "string"
          ? step.source
          : `${step.source?.type || "scope"} · ${step.source?.id || ""}`.trim();
      const detail = [step.action, step.resource].filter(Boolean).join(" on ");
      dl.append(
        el("dt", { text: `Step ${index + 1} · ${from}` }),
        el("dd", {}, el("span", { text: detail ? `${step.effect} — ${detail}` : step.effect })),
      );
    }
    /* FN-15 / FE-T03 · a narrower layer may state a rule and still not get it.
       When the last step asked for something the effective answer did not
       grant, the block says so instead of leaving the reader to compare a
       trace step against a heading. */
    const last = (explanation.trace || []).at(-1);
    const overridden =
      last && last.effect && last.effect !== explanation.effect && typeof last.source === "object";
    block.append(dl);
    if (overridden)
      block.append(
        el("p", {
          className: "runtime-provenance",
          attrs: { "data-not-widened": "true" },
          text: `The ${last.source.type} layer asked for ${last.effect} and the effective answer is still ${explanation.effect}. A narrower layer can only tighten; it cannot loosen what a wider one set.`,
        }),
      );
    block.append(
      el("p", {
        className: "form-help",
        text: `Advisory only, read for ${explanation.resource || "the whole resource"}${
          explanation.revision ? ` at revision ${explanation.revision}` : ", at a revision the answer did not state"
        }. It changes nothing; the executor re-checks the bound policy on every call.`,
      }),
    );
    return block;
  }

  /* `kind` stays a filter and an identifier, not a navigation level (§3.1). */
  function kindChips(section, kinds) {
    const present = kinds.filter((kind) =>
      (snapshot.resources || []).some((resource) => resource.kind === kind),
    );
    if (present.length < 2) return null;
    const current = filters.get(section) || "all";
    const bar = el("div", {
      className: "runtime-chips",
      attrs: { role: "group", "aria-label": "Filter by kind" },
    });
    for (const [value, label] of [["all", "All"], ...present.map((kind) => [kind, KIND_PLURALS[kind] || KIND_LABELS[kind]])]) {
      const chip = el("button", {
        className: "runtime-chip",
        text: label,
        attrs: {
          type: "button",
          "aria-pressed": String(current === value),
          "data-chip": value,
          "data-focus-key": `chip:${section}:${value}`,
        },
      });
      chip.addEventListener("click", () => {
        filters.set(section, value);
        render();
      });
      bar.append(chip);
    }
    return bar;
  }
  function passesFilter(section, resource) {
    const current = filters.get(section) || "all";
    return current === "all" || resource.kind === current;
  }

  /* ── banners ───────────────────────────────────────────────────────── */

  function banners() {
    const list = [];
    if (frozen())
      list.push(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "status", "data-banner": "active-run" },
          text: ACTIVE_RUN_SENTENCE,
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
    for (const entry of drafts.values()) {
      const banner = el("div", {
        className: "runtime-banner",
        attrs: { role: "status", "data-banner": entry.reason === "active-run" ? "active-run-draft" : "conflict-draft" },
      });
      banner.append(
        el("p", {
          text:
            entry.reason === "active-run"
              ? "A run started before this change reached the server. It was not applied and is kept here as a draft."
              : "The runtime changed while you were editing. Your change was not applied and is kept here as a draft.",
        }),
        el("p", { className: "runtime-draft-summary", text: entry.label || describeDraft(entry) }),
      );
      const bar = el("div", { className: "runtime-row-actions" });
      const again = el("button", {
        className: "text-button",
        text: "Submit this change",
        attrs: { type: "button", "data-focus-key": `draft:submit:${entry.key}` },
      });
      again.disabled = busy || frozen();
      again.addEventListener("click", () => {
        drafts.delete(entry.key);
        void submit(entry.body, {
          path: entry.path,
          method: entry.method,
          key: entry.key,
          label: entry.label,
        });
      });
      const discard = el("button", {
        className: "text-button",
        text: "Discard the draft",
        attrs: { type: "button", "data-focus-key": `draft:discard:${entry.key}` },
      });
      discard.addEventListener("click", () => {
        drafts.delete(entry.key);
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

  function blockTitle(text) {
    return el("h4", { className: "settings-block-title", text });
  }
  function note(text) {
    return el("p", { className: "settings-row-help", text });
  }
  function readOnlyRow(title, help, value) {
    return el(
      "div",
      { className: "settings-row" },
      el(
        "div",
        { className: "settings-row-text" },
        el("span", { className: "settings-row-title", text: title }),
        help ? el("span", { className: "settings-row-help", text: help }) : null,
      ),
      el(
        "div",
        { className: "settings-row-control" },
        el("span", { className: "settings-readout", text: value }),
      ),
    );
  }
  function plannedRows(kinds) {
    const missing = (snapshot?.kinds || []).filter((entry) => entry.support !== "available");
    const rows = PLANNED_ROWS.filter(
      ([kind]) => kinds.includes(kind) && missing.some((entry) => entry.kind === kind),
    );
    if (!rows.length) return null;
    return el(
      "div",
      { className: "planned-list", attrs: { "data-kind": "unsupported" } },
      ...rows.map(([, title, help, request]) =>
        el(
          "div",
          { className: "planned-row" },
          el(
            "div",
            { className: "planned-row-text" },
            el("span", { className: "settings-row-title", text: title }),
            el("span", { className: "settings-row-help", text: `${help} Backend request ${request}.` }),
          ),
          el("span", { className: "planned-state", text: "Backend pending" }),
        ),
      ),
    );
  }

  /* ── Overview ──────────────────────────────────────────────────────── */

  function renderOverview() {
    const mount = mounts.overview;
    mount.replaceChildren();
    mount.append(blockTitle("Overview"));
    if (!snapshot) {
      mount.append(
        error
          ? el("p", { className: "inline-error", text: error.message })
          : note(sessionId ? "Loading the runtime…" : "A runtime is composed for a chat. Open a chat to read what its next run would carry."),
      );
      if (error)
        mount.append(
          action("refresh-cw", "Retry loading the runtime", () => void read(), { visible: true }),
        );
      return;
    }
    const scope = activeScope();
    mount.append(
      el(
        "div",
        { className: "section-heading" },
        el("span", { className: "settings-row-help", text: "The runtime the next run in this chat would be composed from." }),
        action("refresh-cw", "Refresh the runtime snapshot", () => void read()),
      ),
      ...scopeStrip({ primary: true }),
      ...banners(),
    );
    /* FN-24 · a failed read leaves the last confirmed snapshot on screen and
       says so, with the revision it was confirmed at. Stale is legible; it is
       never passed off as live. */
    if (error)
      mount.append(
        el("p", {
          className: "inline-error",
          attrs: { "data-stale": String(snapshot.revision) },
          text: `${error.message} The readings below are the last snapshot the host confirmed, at revision ${snapshot.revision}. Any draft you have is kept.`,
        }),
      );
    const composition = snapshot.composition;
    const resources = snapshot.resources || [];
    const exposed = resources.filter((resource) => resource.exposed).length;
    const dl = el("dl", { className: "data-list" });
    /* The revision is stated once, in the scope line above, and every layer
       readout cites it again where it is load-bearing. A second copy here
       answered no question the first one did not. */
    for (const [term, value] of [
      ["Profile", composition ? `${composition.id} · ${composition.status}` : "Not reported"],
      ["Adapter", snapshot.adapterId],
      ["Exposed", `${exposed} of ${resources.length} resources`],
      ["Active runs", String(snapshot.activeRuns || 0)],
    ])
      dl.append(el("dt", { text: term }), el("dd", {}, el("span", { text: value })));
    if (composition)
      dl.setAttribute("data-composition", composition.status);
    mount.append(dl);
    /* Attention · the facts that are not "healthy and quiet". An empty list is
       said out loud, because silence would read as "nothing was checked". */
    const items = attentionItems(snapshot);
    const attention = el("section", {
      className: "runtime-attention",
      attrs: { "data-attention": String(items.length) },
    });
    attention.append(el("h5", { text: `Attention · ${items.length}` }));
    if (!items.length)
      attention.append(
        note("Every resource reports healthy, nothing is waiting for a permission answer, and every plugin is host-trusted."),
      );
    for (const item of items) {
      const line = el("p", { className: "runtime-attention-row" }, el("span", { text: item.text }));
      if (item.target && resourceById(item.target)) {
        const link = el("button", {
          className: "text-button",
          text: "Open",
          attrs: { type: "button", "data-focus-key": `attention:${item.id}` },
        });
        link.addEventListener("click", () => openResource(item.target));
        line.append(link);
      }
      attention.append(line);
    }
    mount.append(attention);
    const summary = el("div", {
      className: "runtime-context-summary",
      attrs: { id: "runtime-context-summary" },
    });
    if (contextError)
      summary.append(el("p", { className: "inline-error", text: contextError.message }));
    else renderContextBar(summary, context);
    mount.append(summary);
    mount.append(recordedBindings());
  }

  /* FN-14 "Bound" · a finished run's own binding, read from the run, never
     reconstructed from the current catalog. The host already caches one
     payload per run id; this list opens that cache rather than keeping a
     second one. */
  function recordedBindings() {
    const runs = (getRuns?.() || []).slice(-6).reverse();
    const section = el(
      "section",
      { className: "runtime-bindings", attrs: { "data-bindings": String(runs.length) } },
      el("h5", { text: "Recorded bindings" }),
      note("What a run actually froze. Later edits never change these records."),
    );
    if (!runs.length) {
      section.append(note("No run has been recorded in this chat yet."));
      return section;
    }
    const bar = el("div", { className: "runtime-chips", attrs: { role: "group", "aria-label": "Recorded runs" } });
    for (const run of runs) {
      const chip = el("button", {
        className: "runtime-chip",
        text: `${run.id.slice(0, 8)} · ${run.status || "recorded"}`,
        attrs: {
          type: "button",
          "aria-pressed": String(boundRunId === run.id),
          "data-focus-key": `binding:${run.id}`,
        },
      });
      chip.addEventListener("click", () => {
        boundRunId = boundRunId === run.id ? null : run.id;
        const own = generation;
        if (boundRunId)
          void Promise.resolve(loadBinding?.(boundRunId)).then(() => {
            if (own === generation) render();
          });
        render();
      });
      bar.append(chip);
    }
    section.append(bar);
    if (!boundRunId) {
      section.append(note("Open one to fill the Bound layer of every item below."));
      return section;
    }
    const payload = getBinding?.(boundRunId);
    if (!payload) {
      section.append(note("Reading this run's binding…"));
      return section;
    }
    if (payload.legacyWithoutControlSnapshot) {
      section.append(
        note("This run was created before the control plane recorded bindings. No runtime binding exists for it."),
      );
      return section;
    }
    const binding = payload.binding;
    const dl = el("dl", { className: "data-list" });
    for (const [term, value] of [
      ["Bound revision", binding ? String(binding.revision) : "Not recorded"],
      ["Resources", binding ? String(binding.resources?.length ?? 0) : "Not recorded"],
      ["Profile", binding?.composition?.id || "Not recorded"],
      ["Explicit loads", String((payload.loaded || []).length)],
    ])
      dl.append(el("dt", { text: term }), el("dd", {}, el("span", { text: value })));
    if (binding?.hash)
      dl.append(
        el("dt", { text: "Binding hash" }),
        el("dd", {}, el("code", { text: shortHash(binding.hash) }),
          copyAction(binding.hash, "Copy binding hash", `binding:${boundRunId}`)),
      );
    section.append(dl);
    if (!binding)
      section.append(note("No runtime binding was recorded for this run."));
    return section;
  }

  /* ── Composition ───────────────────────────────────────────────────── */

  function renderComposition() {
    const mount = mounts.composition;
    mount.replaceChildren(blockTitle("Composition"));
    if (!snapshot) {
      mount.append(note("The runtime has not been read yet."));
      return;
    }
    mount.append(
      note(
        "The agent profile a run is composed from, what it depends on and where it applies. Saving a runtime configuration is not publishing a verified Work Expert: that needs a work semantics, a scope it applies to and an acceptance, none of which a profile carries.",
      ),
    );
    /* Composition shares Developer › Runtime with Overview, and Overview already
       carries the scope strip; a second one in the same group would be a second
       tab stop for one choice. */
    const scope = activeScope();
    const profiles = (snapshot.resources || []).filter(
      (resource) => resource.kind === "agent_profile",
    );
    const selection = (snapshot.profileSelections || []).find((entry) =>
      sameScope(entry.scope, scope),
    );
    const select = el("select", {
      attrs: { "aria-label": "Selected profile", "data-focus-key": "profile:select", id: "runtime-profile-select" },
    });
    select.append(el("option", { attrs: { value: "" }, text: "Inherit the wider layer" }));
    for (const profile of profiles)
      select.append(el("option", { attrs: { value: profile.id }, text: `${profile.title} · ${profile.id}` }));
    select.value = selection?.id || "";
    select.disabled = busy || frozen() || !scope;
    select.addEventListener("change", () => {
      void selectProfile(select.value || null);
    });
    mount.append(
      el(
        "div",
        { className: "settings-row" },
        el(
          "div",
          { className: "settings-row-text" },
          el("label", {
            className: "settings-row-title",
            text: "Profile",
            attrs: { for: "runtime-profile-select" },
          }),
          el("span", {
            className: "settings-row-help",
            text: scope
              ? `Chosen in the ${SCOPE_LABELS[scope.type]} layer. Inherit removes this layer's choice; it does not select the built-in profile.`
              : "No writable scope, so the selection is read only here.",
          }),
        ),
        el("div", { className: "settings-row-control" }, select),
      ),
    );
    const composition = snapshot.composition;
    const draft = draftFor(`profile:${scopeKey(scope)}`);
    const layers = el("dl", { className: "data-list runtime-layers" });
    const addLayer = (term, value, note) =>
      layers.append(
        el("dt", { text: term }),
        el(
          "dd",
          {},
          el("span", { text: value }),
          note ? el("span", { className: "runtime-layer-note", text: note }) : null,
        ),
      );
    const selected = composition ? resourceById(composition.id) : null;
    addLayer(
      "Source",
      selected
        ? `${sourceWord(selected.source)}${selected.source?.version ? ` · ${selected.source.version}` : ""}`
        : "Not reported",
      selected?.source?.hash ? `hash ${shortHash(selected.source.hash)}` : null,
    );
    addLayer(
      "Requested",
      draft ? `${draft.label} — not in effect` : `Nothing requested in the ${scope ? SCOPE_LABELS[scope.type] : "current"} layer.`,
      draft ? (draft.reason === "active-run" ? "a run was active, so the server did not take it" : "the revision moved, so the server did not take it") : null,
    );
    addLayer(
      "Effective",
      composition ? `${composition.id} · ${composition.status}` : "Not reported",
      `server revision ${snapshot.revision}`,
    );
    const payload = boundRunId ? getBinding?.(boundRunId) : null;
    addLayer(
      "Bound",
      boundRunId
        ? payload?.binding?.composition?.id
          ? `${payload.binding.composition.id} · ${payload.binding.composition.status}`
          : payload
            ? "Not recorded for this run."
            : "Reading the binding of this run…"
        : "No recorded run is open.",
      boundRunId ? `run ${boundRunId.slice(0, 8)}` : "choose one under Overview › Recorded bindings",
    );
    mount.append(
      el(
        "section",
        { className: "runtime-detail-block", attrs: { "data-layers": "composition" } },
        el("h5", { text: "Source · Requested · Effective · Bound" }),
        layers,
      ),
    );
    /* Dependencies and applicability, both read from the composition the
       server returned. `resourceIds: null` is not an empty list — it is a
       profile that states no restriction at all. */
    const deps = el("section", { className: "runtime-detail-block" }, el("h5", { text: "Dependencies" }));
    if (!composition) deps.append(note("No composition is reported."));
    else if (composition.resourceIds === null)
      deps.append(note("This profile restricts no resource list. Every resource the host exposes stays available, subject to policy."));
    else if (!composition.resourceIds.length)
      deps.append(note("This profile lists no resource, so it admits none."));
    else {
      const dl = el("dl", { className: "data-list" });
      for (const id of composition.resourceIds) {
        const resource = resourceById(id);
        dl.append(
          el("dt", { text: id }),
          el("dd", {}, el("span", {
            text: resource
              ? `${resource.title} · ${resource.exposed ? "exposed" : "not exposed"}`
              : "not reported by this host",
          })),
        );
      }
      deps.append(dl);
    }
    if (composition?.missing?.length)
      deps.append(
        el("p", {
          className: "inline-error",
          text: `Missing: ${composition.missing.join(", ")}. The profile stays selectable; the missing ids simply do not resolve here.`,
        }),
      );
    mount.append(deps);
    const applicability = el(
      "section",
      { className: "runtime-detail-block" },
      el("h5", { text: "Applicability" }),
      el(
        "dl",
        { className: "data-list" },
        el("dt", { text: "Status" }),
        el("dd", {}, el("span", { text: composition?.status || "not reported" })),
        el("dt", { text: "Version" }),
        el("dd", {}, el("span", { text: composition?.version || "not reported" })),
        el("dt", { text: "UI slots" }),
        el("dd", {}, el("span", {
          text: composition?.uiSlots?.length
            ? `${composition.uiSlots.join(", ")} — declared, not executed`
            : "none declared",
        })),
      ),
      note("A declared slot is saved configuration, not a registered renderer. Nothing mounts because a profile named it."),
    );
    mount.append(applicability);
    const list = el("div", { className: "runtime-catalog" });
    for (const profile of profiles)
      if (passesFilter("composition", profile)) list.append(resourceRow(profile));
    mount.append(
      el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": "agent_profile" } },
        el("h5", { text: `Agent profiles · ${profiles.length}` }),
        note(KIND_NOTES.agent_profile),
        list,
      ),
    );
  }

  /* ── Instructions & context ────────────────────────────────────────── */

  const CONTEXT_KINDS = ["instruction", "skill", "reference", "prompt_template"];

  function renderInstructions() {
    const mount = mounts.instructions;
    mount.replaceChildren(blockTitle("Instructions, skills and references"));
    if (!snapshot) {
      mount.append(note("The runtime has not been read yet."));
      return;
    }
    mount.append(
      note(
        "Instructions, skills, references and prompt templates. Four different admissions: an instruction is injected into every run, a skill or reference is listed in the catalog and its body loads only on demand, and a template contributes nothing until you invoke it and it returns a draft.",
      ),
      ...scopeStrip({ where: "instructions" }),
      kindChips("instructions", CONTEXT_KINDS),
    );
    const resources = (snapshot.resources || []).filter((resource) =>
      CONTEXT_KINDS.includes(resource.kind),
    );
    const list = el("div", { className: "runtime-catalog" });
    let shown = 0;
    /* Ordered by how each kind reaches a run — injected, listed, listed, only
       on your own invocation — because that is the distinction this group
       exists to make. */
    for (const kind of CONTEXT_KINDS) {
      const label = KIND_PLURALS[kind];
      const group = resources.filter(
        (resource) => resource.kind === kind && passesFilter("instructions", resource),
      );
      if (!group.length) continue;
      shown += group.length;
      const section = el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": kind } },
        el("h5", { text: `${label} · ${group.length}` }),
        KIND_NOTES[kind] ? note(KIND_NOTES[kind]) : null,
      );
      for (const resource of group) section.append(resourceRow(resource));
      list.append(section);
    }
    if (!shown) list.append(note("No resource of this kind is configured."));
    mount.append(list, contextInspector());
    const planned = plannedRows(["memory_provider"]);
    if (planned)
      mount.append(
        el("section", { className: "runtime-kind", attrs: { "data-kind": "unsupported" } },
          el("h5", { text: "Not available in this host" }),
          note("Named by the runtime contract, with no adapter behind it. Listed so the absence is legible; there is nothing to operate."),
          planned),
      );
  }

  /* The Effective Context Inspector (discussion §6): one block per ContextItem,
     with where it came from, why it is active, when it was admitted and what it
     contributed. Sizes are characters — the host reports no token usage, so no
     token figure is shown or estimated. */
  function contextInspector() {
    const section = el(
      "section",
      { className: "runtime-detail-block", attrs: { "data-inspector": "context" } },
      el("h5", { text: "Effective context inspector" }),
    );
    if (contextError) {
      section.append(el("p", { className: "inline-error", text: contextError.message }));
      return section;
    }
    if (!context) {
      section.append(note(sessionId ? "The next-run context is not loaded." : "Open a session to read its next-run context."));
      return section;
    }
    const items = context.context || [];
    if (!items.length) {
      section.append(note("Nothing is admitted into the next run beyond the chat's own history."));
      return section;
    }
    const historical = items.some((item) => !Number.isFinite(item.admittedCharacters));
    const table = el("table", { className: "settings-table runtime-context-table" });
    table.append(
      el("thead", {}, el("tr", {},
        el("th", { text: "Item" }),
        el("th", { text: "Admission" }),
        el("th", { text: "Scope" }),
        el("th", { text: "Admitted" }),
        el("th", { text: "Deferred" }),
      )),
    );
    const body = el("tbody", {});
    for (const item of items) {
      const resource = resourceById(item.id);
      body.append(
        el("tr", { className: "runtime-context-row", attrs: { "data-context": item.id } },
          el("th", { attrs: { scope: "row" } },
            el("span", { className: "runtime-row-name", text: resource?.title || item.id }),
            el("span", { className: "runtime-row-tag", text: KIND_LABELS[item.kind] || item.kind }),
            el("code", { className: "runtime-row-hash", text: shortHash(item.source?.hash) || sourceWord(item.source) })),
          el("td", { text: ADMISSION_WORDS[item.admission] || item.admission }),
          el("td", { text: `${item.scope?.type || "—"}` }),
          el("td", {
            text: Number.isFinite(item.admittedCharacters)
              ? item.admittedCharacters.toLocaleString()
              : item.admission === "instructions"
                ? `${(item.characters || 0).toLocaleString()} (partial)`
                : "—",
          }),
          el("td", {
            text: Number.isFinite(item.deferredCharacters)
              ? item.deferredCharacters.toLocaleString()
              : "not recorded",
          }),
        ),
      );
    }
    table.append(body);
    section.append(
      el("div", { className: "runtime-table-scroll" }, table),
      note(
        historical
          ? `This record contains partial ${CHARACTER_NOTE}. Catalog formatting was not measured, and it is never recomputed from today's sources.`
          : `Sizes are ${CHARACTER_NOTE}. Admitted is what the compiler wrote; deferred is the body that loads only on request. Session history and other host context are excluded.`,
      ),
    );
    return section;
  }

  /* ── Capabilities & connections ────────────────────────────────────── */

  function renderCapabilities() {
    const mount = mounts.capabilities;
    mount.replaceChildren(blockTitle("Tools, MCP servers and plugins"));
    if (!snapshot) {
      mount.append(note("The runtime has not been read yet."));
      return;
    }
    mount.append(
      note(
        "Configured, connected, exposed and permitted are four different facts. A connected server grants the model nothing; an exposed tool still answers to the policy on every call.",
      ),
      ...scopeStrip({ where: "capabilities" }),
    );
    const tabs = el("div", {
      className: "runtime-subtabs",
      attrs: { role: "tablist", "aria-label": "Capability view" },
    });
    for (const [id, label, help] of [
      ["configurable", "Configurable", "What can be changed from here."],
      ["inventory", "Inventory", "What is installed and what it declares."],
    ]) {
      const selected = capabilitiesTab === id;
      const tab = el("button", {
        className: "runtime-subtab",
        text: label,
        attrs: {
          type: "button",
          role: "tab",
          "aria-selected": String(selected),
          tabindex: selected ? 0 : -1,
          "data-subtab": id,
          "data-focus-key": `captab:${id}`,
          title: help,
        },
      });
      tab.addEventListener("click", () => {
        capabilitiesTab = id;
        render();
        mounts.capabilities.querySelector(`[data-subtab="${id}"]`)?.focus();
      });
      tabs.append(tab);
    }
    tabs.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const list = [...tabs.querySelectorAll("button")];
      const index = list.indexOf(document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      list[(index + (event.key === "ArrowRight" ? 1 : list.length - 1)) % list.length].click();
    });
    mount.append(tabs);
    mount.append(capabilitiesTab === "configurable" ? configurableView() : inventoryView());
    const planned = plannedRows(["workflow", "hook", "registry"]);
    if (planned)
      mount.append(
        el("section", { className: "runtime-kind", attrs: { "data-kind": "unsupported" } },
          el("h5", { text: "Not available in this host" }),
          note("Named by the runtime contract, with no adapter behind it. Listed so the absence is legible; there is nothing to operate."),
          planned),
      );
  }

  function configurableView() {
    const wrap = el("div", { className: "runtime-tabpanel", attrs: { "data-panel": "configurable" } });
    wrap.append(kindChips("capabilities", ["tool", "mcp_server"]));
    const resources = snapshot.resources || [];
    const children = new Map();
    for (const resource of resources) {
      const parent = resource.mcp?.serverId || resource.parent;
      if (!parent) continue;
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(resource);
    }
    const claimed = new Set([...children.values()].flat().map((r) => r.id));
    const list = el("div", { className: "runtime-catalog" });
    for (const [kind, label] of [["mcp_server", "MCP servers"], ["tool", "Tools"]]) {
      const group = resources.filter(
        (resource) =>
          resource.kind === kind && !claimed.has(resource.id) && passesFilter("capabilities", resource),
      );
      if (!group.length) continue;
      const section = el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": kind } },
        el("h5", { text: `${label} · ${group.length}` }),
        KIND_NOTES[kind] ? note(KIND_NOTES[kind]) : null,
      );
      for (const resource of group) {
        section.append(resourceRow(resource));
        for (const remote of children.get(resource.id) || [])
          section.append(resourceRow(remote, { child: true }));
      }
      list.append(section);
    }
    /* A plugin's tools are configurable here even though the plugin package is
       not; they are listed under the package that provides them so the row can
       never be read as a host builtin. */
    const pluginTools = [...children.entries()].filter(([id]) => resourceById(id)?.kind === "plugin");
    if (pluginTools.length && (filters.get("capabilities") || "all") !== "mcp_server") {
      const section = el(
        "section",
        { className: "runtime-kind", attrs: { "data-kind": "plugin-tools" } },
        el("h5", { text: `Tools from extensions · ${pluginTools.reduce((n, [, tools]) => n + tools.length, 0)}` }),
        note("Provided by an installed extension. Its lifecycle is in Developer › Extensions; only exposure is set here."),
      );
      for (const [id, tools] of pluginTools) {
        section.append(el("p", { className: "runtime-group-label", text: resourceById(id).title }));
        for (const tool of tools) section.append(resourceRow(tool, { child: true }));
      }
      list.append(section);
    }
    if (!list.childNodes.length) wrap.append(note("No capability matches this filter."));
    else wrap.append(list);
    return wrap;
  }

  /* WK-68 · the Inventory half of the DSH form: what is installed, who
     provided it and what it declares. It is read only on purpose — an imported
     declaration is not an executable package, and this host runs no outside
     code (architecture.md). */
  function inventoryView() {
    const wrap = el("div", { className: "runtime-tabpanel", attrs: { "data-panel": "inventory" } });
    const resources = snapshot.resources || [];
    const packages = resources.filter((resource) =>
      ["plugin", "mcp_server"].includes(resource.kind),
    );
    wrap.append(
      note(
        "Installed packages and the capabilities they declare. A declaration is not an executable package: the host loads its own extensions only, and an imported MCP configuration is a connection, not code. For an extension, trust is who signed it and how it is isolated; for a remote server it is the authentication it accepts and the transport it speaks — this host connects only to unauthenticated Streamable HTTP.",
      ),
    );
    if (!packages.length) {
      wrap.append(note("No package is installed."));
      return wrap;
    }
    const table = el("table", { className: "settings-table runtime-inventory-table" });
    table.append(
      el("thead", {}, el("tr", {},
        el("th", { text: "Package" }),
        el("th", { text: "Kind" }),
        el("th", { text: "Source" }),
        el("th", { text: "Trust" }),
        el("th", { text: "Declares" }),
        el("th", { text: "State" }),
      )),
    );
    const body = el("tbody", {});
    for (const resource of packages) {
      const declared =
        resource.kind === "plugin"
          ? (Array.isArray(resource.capabilities) ? resource.capabilities : []).length
          : resource.capabilities?.tools ?? 0;
      body.append(
        el("tr", { className: "runtime-inventory-row", attrs: { "data-package": resource.id } },
          el("th", { attrs: { scope: "row" } },
            el("span", { className: "runtime-row-name", text: resource.title }),
            el("code", { className: "runtime-row-hash", text: resource.id })),
          el("td", { text: KIND_LABELS[resource.kind] }),
          el("td", { text: `${sourceWord(resource.source)}${resource.source?.version ? ` · ${resource.source.version}` : ""}${resource.source?.uri ? ` · ${resource.source.uri}` : ""}` }),
          el("td", {
            text:
              resource.kind === "plugin"
                ? `${resource.trust || "trust not reported"} · ${resource.isolation || "isolation not reported"}`
                : `${resource.authentication || "authentication not reported"} · ${resource.transport || "transport not reported"}${resource.protocol ? ` ${resource.protocol}` : ""}`,
          }),
          el("td", {
            text:
              resource.kind === "plugin"
                ? plural(declared, "tool")
                : `${plural(declared, "tool")} · ${plural(resource.capabilities?.resources ?? 0, "resource")} · ${plural(resource.capabilities?.prompts ?? 0, "prompt")}`,
          }),
          el("td", { text: resource.kind === "mcp_server" ? mcpStateWords(resource).join(" · ") : resource.running ? "running" : "not running" }),
        ),
      );
    }
    table.append(body);
    wrap.append(el("div", { className: "runtime-table-scroll" }, table));
    wrap.append(
      note("Extension lifecycle — start, stop, restart — is in Developer › Extensions, where the host owns it. Nothing on this tab starts or stops anything."),
    );
    return wrap;
  }

  /* ── Permissions & environment ─────────────────────────────────────── */

  function policyRulesFor(scope) {
    const entry = (snapshot.policies || []).find((item) => sameScope(item.scope, scope));
    return entry ? entry.rules : [];
  }
  function ensurePolicyDraft(scope) {
    if (policyDraft && policyDraft.scope === scopeKey(scope)) return policyDraft;
    policyDraft = {
      scope: scopeKey(scope),
      rules: policyRulesFor(scope).map((rule) => ({ ...rule })),
    };
    return policyDraft;
  }
  function policyEditor() {
    const scope = activeScope();
    const section = el("section", { className: "runtime-policy", attrs: { "data-policy": scopeKey(scope) } });
    section.append(el("h5", { text: "Policy rules" }));
    if (!scope) {
      section.append(note("No writable scope, so no rule list can be edited here."));
      return section;
    }
    const draft = ensurePolicyDraft(scope);
    const server = policyRulesFor(scope);
    const dirty = !sameRules(server, draft.rules);
    section.append(
      note(
        `The whole rule list of the ${SCOPE_LABELS[scope.type]} layer is replaced when you save. A narrower layer can only tighten: a deny or ask set wider cannot be loosened here, and the server refuses an attempt rather than the page hiding it.`,
      ),
    );
    const table = el("table", { className: "settings-table runtime-policy-table" });
    table.append(
      el("thead", {}, el("tr", {},
        el("th", { text: "Action" }),
        el("th", { text: "Resource" }),
        el("th", { text: "Effect" }),
        el("th", { text: "Remove" }),
      )),
    );
    const body = el("tbody", {});
    const save = el("button", {
      className: "secondary-button",
      attrs: { type: "button", "data-focus-key": "policy:save" },
      text: "Save rules",
    });
    const syncSave = () => {
      save.disabled = busy || frozen() || sameRules(server, draft.rules);
    };
    draft.rules.forEach((rule, index) => {
      const actionInput = el("input", {
        attrs: { type: "text", "aria-label": `Rule ${index + 1} action`, spellcheck: "false", autocomplete: "off", "data-focus-key": `policy:action:${index}` },
      });
      actionInput.value = rule.action;
      actionInput.addEventListener("input", () => {
        rule.action = actionInput.value;
        syncSave();
      });
      const resourceInput = el("input", {
        attrs: { type: "text", "aria-label": `Rule ${index + 1} resource`, spellcheck: "false", autocomplete: "off", "data-focus-key": `policy:resource:${index}` },
      });
      resourceInput.value = rule.resource;
      resourceInput.addEventListener("input", () => {
        rule.resource = resourceInput.value;
        syncSave();
      });
      const effect = el("select", {
        attrs: { "aria-label": `Rule ${index + 1} effect`, "data-focus-key": `policy:effect:${index}` },
      });
      for (const value of ["allow", "ask", "deny"])
        effect.append(el("option", { attrs: { value }, text: EFFECT_LABELS[value] }));
      effect.value = rule.effect;
      effect.addEventListener("change", () => {
        rule.effect = effect.value;
        syncSave();
      });
      const remove = el("button", {
        className: "text-button",
        text: "Remove",
        attrs: { type: "button", "aria-label": `Remove rule ${index + 1}`, "data-focus-key": `policy:remove:${index}` },
      });
      remove.addEventListener("click", () => {
        draft.rules.splice(index, 1);
        render();
      });
      body.append(
        el("tr", { className: "runtime-policy-row" },
          el("td", {}, actionInput),
          el("td", {}, resourceInput),
          el("td", {}, effect),
          el("td", {}, remove)),
      );
    });
    table.append(body);
    if (draft.rules.length) section.append(el("div", { className: "runtime-table-scroll" }, table));
    else section.append(note(`The ${SCOPE_LABELS[scope.type]} layer states no rule of its own. The wider layers and the host ceiling still apply.`));
    const add = el("button", {
      className: "text-button",
      text: "Add a rule",
      attrs: { type: "button", "data-focus-key": "policy:add" },
    });
    add.addEventListener("click", () => {
      draft.rules.push({ action: "", resource: "*", effect: "ask" });
      render();
    });
    const revert = el("button", {
      className: "text-button",
      text: "Discard the draft",
      attrs: { type: "button", "data-focus-key": "policy:revert" },
    });
    revert.disabled = !dirty;
    revert.addEventListener("click", () => {
      policyDraft = null;
      render();
    });
    save.addEventListener("click", () => void savePolicy());
    syncSave();
    section.append(el("div", { className: "runtime-row-actions" }, add, revert, save));
    /* FN-14 "Requested" for a rule list, and FN-16 for the frozen case: the
       edit stays visible and stays a draft. No queue is claimed. */
    if (dirty)
      section.append(
        el("p", {
          className: "runtime-draft-summary",
          attrs: { "data-policy-draft": "true" },
          text: frozen()
            ? `Requested: ${draft.rules.length} rule${draft.rules.length === 1 ? "" : "s"} in the ${SCOPE_LABELS[scope.type]} layer. A run is active, so this is a draft only — it is not applied and it will not apply itself when the run ends.`
            : `Requested: ${draft.rules.length} rule${draft.rules.length === 1 ? "" : "s"} in the ${SCOPE_LABELS[scope.type]} layer, not yet in effect. Effective is still the ${server.length} rule${server.length === 1 ? "" : "s"} the server holds at revision ${snapshot.revision}.`,
        }),
      );
    const others = (snapshot.policies || []).filter((entry) => !sameScope(entry.scope, scope));
    if (others.length) {
      const dl = el("dl", { className: "data-list" });
      for (const entry of others)
        for (const rule of entry.rules)
          dl.append(
            el("dt", { text: `${entry.scope.type} · ${rule.action}` }),
            el("dd", {}, el("span", { text: `${rule.effect} on ${rule.resource}` })),
          );
      section.append(
        el("section", { className: "runtime-detail-block" },
          el("h5", { text: "Rules from the other layers" }),
          dl,
          note("Read only here. Each layer is edited in its own tab, and a narrower layer can only tighten what these set.")),
      );
    }
    return section;
  }

  function permissionExplainer() {
    const candidates = (snapshot.resources || []).filter((resource) => resource.action);
    const section = el("section", { className: "runtime-explainer" }, el("h5", { text: "Explain a permission" }));
    if (!candidates.length) {
      section.append(note("No resource carries a policy action in this snapshot."));
      return section;
    }
    const select = el("select", {
      attrs: { "aria-label": "Capability", id: "runtime-explain-resource", "data-focus-key": "explain:select" },
    });
    for (const resource of candidates) {
      const parent = resource.parent ? resourceById(resource.parent) : null;
      select.append(
        el("option", {
          attrs: { value: resource.id },
          text: `${resource.title} · ${resource.action}${parent ? ` · ${parent.title}` : ""}`,
        }),
      );
    }
    if (explanation?.resourceId) select.value = explanation.resourceId;
    const path = el("input", {
      attrs: {
        type: "text",
        placeholder: "materials/notes.md",
        "aria-label": "Resource path",
        spellcheck: "false",
        autocomplete: "off",
        "data-focus-key": "explain:path",
      },
    });
    path.value = explanation?.resource || "";
    const run = el("button", {
      className: "secondary-button",
      text: "Explain",
      attrs: { type: "button", "data-focus-key": "explain:run" },
    });
    run.addEventListener("click", () => void explainPermission(select.value, path.value.trim()));
    section.append(
      note("A read-only reading of the bound policy. It grants nothing and changes nothing; the executor re-checks every call."),
      el("div", { className: "runtime-explain-form" }, select, path, run),
    );
    if (explanation) section.append(explanationBlock());
    return section;
  }

  function environmentFacts() {
    const config = environment.config?.config;
    const provider = resourceById("provider:current");
    const model = resourceById("model:current");
    const secret = resourceById("secret:provider");
    const sandbox = (snapshot.resources || []).find((resource) => resource.kind === "sandbox");
    const sessionContext = (snapshot.resources || []).find((resource) => resource.kind === "session_context");
    const hostPolicy = (snapshot.resources || []).find((resource) => resource.kind === "permission_policy");
    const section = el("section", { className: "runtime-environment" });
    section.append(
      note(
        "The same record the Connection above edits, read back from the host. It describes the next run, not one already going; a chat already running keeps the values its run froze. Budgets and the sandbox are facts the host reports, not settings.",
      ),
      readOnlyRow("Provider", "Where model requests are sent.", provider?.title || config?.provider || "Not loaded"),
      readOnlyRow("Model", "Used for every new run in this workspace.", model?.title || config?.model || "Not loaded"),
      readOnlyRow("API format", "Wire format the provider expects.", config?.api || "Not loaded"),
      readOnlyRow("Base URL", "Empty means the provider default.", config?.baseUrl || "Provider default"),
      readOnlyRow(
        "API key",
        "Stored on this device only; it is never shown.",
        secret?.credentialStatus === "configured" || environment.config?.credentialStatus === "configured"
          ? "Saved"
          : "Not saved",
      ),
      readOnlyRow(
        "Reasoning effort",
        "The provider does not report an effort value or the values it would accept, so this page cannot state one. Backend request BE-12.",
        "Not reported",
      ),
      readOnlyRow(
        "Filesystem boundary",
        "The directory a run may read and write inside.",
        sandbox?.filesystem || "Not reported",
      ),
      readOnlyRow(
        "Shell",
        "Whether a run may start a process.",
        sandbox ? (sandbox.shell ? "Available" : "Not available") : "Not reported",
      ),
      readOnlyRow(
        "Process isolation",
        "Whether tool execution is isolated from this host process.",
        sandbox ? (sandbox.processIsolation ? "Isolated" : "In the host process") : "Not reported",
      ),
      readOnlyRow(
        "Session history",
        "Who owns the running conversation the model sees.",
        sessionContext ? `${sessionContext.title} · ${sessionContext.owner || "owner not reported"}` : "Not reported",
      ),
      readOnlyRow(
        "Host permission mode",
        "The ceiling every layer below is measured against.",
        hostPolicy?.title || "Not reported",
      ),
      readOnlyRow(
        "Context budget",
        "No maximum context size is reported over the API, so no share, quota or remaining figure is drawn.",
        "Not reported",
      ),
    );
    const edit = action("settings-2", "Edit in General", () => onEditConnection?.(), {
      visible: true,
      className: "quiet-button settings-jump",
    });
    section.append(edit);
    return section;
  }

  /* WK-90 · `Permissions & environment` 是一个意图，落在两个组里：策略、作用域与
     解释属于 Permissions；provider / model / sandbox 的只读摘要属于 Models，编辑仍
     只在 Models 的 Connection 里（FN-05：一个能力一个编辑入口）。两块读同一份快照，
     所以这不是第二个真源，只是同一读数的两处落位。 */
  function renderPermissions() {
    const mount = mounts.permissions;
    mount.replaceChildren(blockTitle("Policy"));
    if (!snapshot) {
      mount.append(note("The runtime has not been read yet."));
      return;
    }
    mount.append(
      note(
        "A requested value, the effective value the server computed, the host ceiling and the value a running run froze are four different readings. Only the first is edited here.",
      ),
      ...scopeStrip({ where: "permissions" }),
      policyEditor(),
      permissionExplainer(),
    );
  }
  function renderEnvironment() {
    const mount = mounts.environment;
    if (!mount) return;
    mount.replaceChildren(blockTitle("In force"));
    if (!snapshot) {
      mount.append(note("The runtime has not been read yet."));
      return;
    }
    mount.append(environmentFacts());
  }

  /* ── render ────────────────────────────────────────────────────────── */

  function scroller() {
    return mounts.overview?.closest(".settings-sections") || null;
  }
  function holdsTextEntry(mount) {
    const active = document.activeElement;
    return Boolean(
      active &&
        mount?.contains(active) &&
        (active.matches("input, textarea, select") || active.isContentEditable),
    );
  }
  /** A background read must not pull the caret out of a control someone is
   * using, so a mount that holds a text entry keeps its DOM until the next
   * user-driven render (FN-27). */
  function render({ polling = false } = {}) {
    const focusKey = document.activeElement?.dataset?.focusKey;
    const scroll = scroller()?.scrollTop;
    for (const [name, renderSection] of [
      ["overview", renderOverview],
      ["composition", renderComposition],
      ["instructions", renderInstructions],
      ["capabilities", renderCapabilities],
      ["permissions", renderPermissions],
      ["environment", renderEnvironment],
    ]) {
      const mount = mounts[name];
      if (!mount) continue;
      if (polling && holdsTextEntry(mount)) continue;
      renderSection();
      if (frozen()) mount.setAttribute("data-frozen", "true");
      else mount.removeAttribute("data-frozen");
    }
    if (scroll !== undefined && scroller()) scroller().scrollTop = scroll;
    if (pendingFocus) {
      const row = mounts.overview?.ownerDocument.querySelector(
        `.runtime-row[data-resource="${CSS.escape(pendingFocus)}"]`,
      );
      const title = row?.querySelector(".runtime-row-title");
      if (title) {
        pendingFocus = null;
        row.scrollIntoView({ block: "center", behavior: "auto" });
        title.focus();
      }
    }
    if (focusKey && document.activeElement === document.body)
      for (const mount of Object.values(mounts)) {
        const next = mount?.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
        if (next) {
          next.focus();
          break;
        }
      }
    onRendered?.();
  }

  /** The `/` finder's open action. It expands one resource and reads its
   * recorded source; it installs nothing and applies nothing. */
  function openResource(id) {
    if (!resourceById(id)) return false;
    open.add(id);
    if (capabilitiesTab === "inventory" && ["tool", "mcp_server"].includes(resourceById(id).kind))
      capabilitiesTab = "configurable";
    for (const section of filters.keys()) filters.set(section, "all");
    /* The focus moves with the render that actually paints the opened row, not
       on a timer: an async source read re-renders once more, and a focus set
       before that would be thrown away. */
    pendingFocus = id;
    void inspectSource(resourceById(id), { force: true });
    render();
    return true;
  }

  return {
    /* WK-41 / WK10b-1 · the rail card and the host's slot resolution read this
     * one projection of the snapshot this module already fetched. There is no
     * second request, no second state machine, and nothing either can write
     * back — which is why the host needs no wrapper of its own around the
     * runtime client. */
    summary() {
      if (!snapshot) return { loaded: false, sessionId };
      const count = (kinds) =>
        (snapshot.resources || []).filter((resource) => kinds.includes(resource.kind)).length;
      const composition = snapshot.composition || null;
      return {
        loaded: true,
        sessionId,
        revision: snapshot.revision ?? null,
        total: (snapshot.resources || []).length,
        frozen: frozen(),
        attention: attentionItems(snapshot).length,
        composition,
        profileId: composition?.id || null,
        status: composition?.status || null,
        uiSlots: Array.isArray(composition?.uiSlots) ? [...composition.uiSlots] : [],
        missing: Array.isArray(composition?.missing) ? [...composition.missing] : [],
        rows: [
          ["Capabilities", count(["tool", "mcp_server", "skill"])],
          ["Context", count(["instruction", "prompt_template", "reference"])],
        ],
      };
    },
    setEnvironment(next) {
      environment = { ...environment, ...next };
      if (snapshot) render({ polling: true });
    },
    openResource,
    load() {
      if (getSessionId() !== sessionId) {
        snapshot = null;
        context = null;
        drafts.clear();
        policyDraft = null;
        explanation = null;
        unknownEffect = null;
        inspected = null;
        boundRunId = null;
        open.clear();
        filters.clear();
        scopeType = null;
      }
      return read();
    },
    refresh() {
      if (snapshot) return read({ quiet: true, polling: true });
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
  // New snapshots count the exact compiled instruction/catalog contribution.
  // Older bindings retain their historical partial count; never backfill them.
  const buckets = new Map();
  for (const item of items) {
    const key = item.kind;
    if (!buckets.has(key))
      buckets.set(key, { kind: key, characters: 0, deferred: 0, admission: null });
    const bucket = buckets.get(key);
    bucket.characters += admittedCharacters(item);
    if (item.admission !== "instructions") {
      bucket.deferred += 1;
      bucket.admission = item.admission;
    }
  }
  const admitted = [...buckets.values()].filter((bucket) => bucket.characters > 0);
  const deferred = [...buckets.values()].filter((bucket) => !bucket.characters);
  const total = admitted.reduce((sum, bucket) => sum + bucket.characters, 0);
  container.append(
    el("h5", { className: "runtime-context-title", text: "Next run · context" }),
  );
  if (!items.length) {
    container.append(
      el("p", {
        className: "form-help",
        text: "Nothing is admitted into the next run beyond the chat's own history.",
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
  if (admitted.length >= 2) container.append(bar);
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
      text: items.every((item) => Number.isFinite(item.admittedCharacters))
        ? `Sizes use ${CHARACTER_NOTE}. Counts include injected instructions, catalog text and formatting. Deferred bodies load only on request; templates remain draft-only. Session history and other host context are excluded.`
        : `This older record contains partial ${CHARACTER_NOTE}. Catalog formatting was not measured; no total model-context size is inferred.`,
    }),
  );
  if (payload.tokenUsage !== null && payload.tokenUsage !== undefined)
    container.append(
      el("p", { className: "form-help", text: "Token usage is reported by the host." }),
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
  // Preserve historical measurements; do not infer missing catalog counts.
  const admitted = (binding?.context || []).reduce(
    (sum, item) => sum + admittedCharacters(item),
    0,
  );
  if (binding)
    section.append(
      el("p", {
        className: "form-help",
        text: (binding.context || []).every((item) => Number.isFinite(item.admittedCharacters))
          ? `Bound runtime instructions and catalog: ${admitted.toLocaleString()} ${CHARACTER_NOTE}. Session history and other host context are excluded. Later edits do not change this record.`
          : `Historical partial count: ${admitted.toLocaleString()} ${CHARACTER_NOTE}. Catalog formatting was not measured. Later edits do not change this record.`,
      }),
    );
  return section;
}

/** Historical bindings lack the additive compiled contribution. */
export function admittedCharacters(item) {
  return Number.isFinite(item.admittedCharacters) ? item.admittedCharacters
    : item.admission === "instructions" ? item.characters || 0 : 0;
}

export function hasParentGate(resource) {
  return (resource.provenance || []).some(entry => entry.parentId && entry.value === false);
}
