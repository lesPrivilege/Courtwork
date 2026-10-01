import { anchorPopover } from "./ui-controls.mjs";
import { activeRunFreezeNotice, isActiveRunRefusal, projectProviderConfig, supportedEffortsOf } from "./provider-config.mjs";
import { MODEL_SCOPE, modelRows, renderModelChooser, SEARCH_THRESHOLD, visibleRows } from "./model-effort.mjs";

/* UX-11 (S2) · one anchored popover for the model and the reasoning effort,
 * following the Agent chooser (agent-chooser-view.mjs): a single-select listbox
 * with the in-force model selected, arrows / Home / End / type-ahead to move,
 * Enter or click to commit, Escape to close, focus back on the opener. It stays
 * open after a model commit so the effort of the new model is one step away.
 *
 * Every save is `PUT /provider-config` with the snapshot's version through the
 * one projection, so a stale view cannot overwrite a newer choice and the
 * requested effort is kept when the new model's ladder offers it. The Host is
 * the authority on the run lock; the client says which chat holds it only when
 * it knows. One instance per surface: a popover inside a modal dialog must live
 * in that dialog, or the dialog makes it inert. */
export function createModelChooser({ popover, name, request, getSnapshot, onSnapshot, onCatalog = () => {}, ownRunBusy = () => false, onConnections }) {
  let anchor = null, catalog = null, connections = [], loaded = false, readError = null;
  let activeKey = null, query = "", busy = false, feedback = null, typed = "", typedAt = 0;
  // Reads and writes are counted apart: reopening during a save must not orphan it.
  let readEpoch = 0, writeEpoch = 0;
  let lastFocusId = null, stopFollowing = null, parts = null;

  const rows = () => modelRows(catalog, connections, getSnapshot()?.config);
  const shown = () => visibleRows(rows(), query);
  const frozen = () => (ownRunBusy() ? activeRunFreezeNotice(true) : null);
  const optionNode = (key) => [...(parts?.listbox.children ?? [])].find((node) => node.dataset?.modelKey === key);

  function render() {
    if (!popover.matches(":popover-open")) return null;
    parts = renderModelChooser(popover, {
      name, snapshot: getSnapshot(), rows: rows(), activeKey, query, loaded, readError, frozen: frozen(), busy, feedback,
      onClose: close,
      onQuery: (value) => { query = value; activeKey = shown()[0]?.key ?? null; render(); },
      onHighlight: (key) => { activeKey = key; render(); },
      onCommit: (key) => void commit(key),
      onEffort: (value) => void saveEffort(value),
      onConnections: (id) => { close({ refocus: false }); onConnections(id, anchor); },
      onRetry: () => void load(),
    });
    // A control that was redrawn (an effort segment after its save) gets focus back.
    const active = document.activeElement;
    if (lastFocusId && (!active || active === document.body || !popover.contains(active))) {
      const again = popover.querySelector(`#${CSS.escape(lastFocusId)}`);
      if (again && !again.disabled && !again.closest?.("fieldset")?.disabled) again.focus();
    }
    return parts;
  }

  function move(next) {
    if (!next) return;
    activeKey = next;
    render();
    optionNode(next)?.scrollIntoView?.({ block: "nearest" });
  }

  popover.addEventListener("focusin", (event) => { if (event.target?.id) lastFocusId = event.target.id; });
  popover.addEventListener("keydown", (event) => {
    const target = event.target;
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    const inList = target?.getAttribute?.("role") === "listbox";
    const inSearch = target?.getAttribute?.("role") === "combobox";
    if (!inList && !inSearch) return;
    const keys = shown().map((row) => row.key);
    const index = Math.max(0, keys.indexOf(activeKey));
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (inSearch) { parts?.listbox.focus(); if (!activeKey) move(keys[0]); return; }
      move(keys[Math.min(keys.length - 1, index + 1)]);
    } else if (event.key === "ArrowUp" && inList) {
      event.preventDefault();
      if (index === 0 && parts?.search) { parts.search.focus(); return; }
      move(keys[Math.max(0, index - 1)]);
    } else if ((event.key === "Home" || event.key === "End") && inList) {
      event.preventDefault();
      move(event.key === "Home" ? keys[0] : keys.at(-1));
    } else if (event.key === "Enter" || (event.key === " " && inList)) {
      if (event.isComposing) return;
      event.preventDefault();
      if (activeKey) void commit(activeKey);
    } else if (inList && !parts?.search && event.key.length === 1 && /\S/.test(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      typed = now - typedAt > 700 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
      typedAt = now;
      move(shown().find((row) => row.name.toLowerCase().startsWith(typed))?.key);
    }
  });

  /* Config and catalogue are one version: a mismatch means one changed between
     the two reads, so they are read again once. The registry decides which rows
     can run, so failing to read it is a read error, not an empty registry. */
  async function load() {
    const own = ++readEpoch;
    readError = null;
    try {
      let config, models, registry;
      for (let attempt = 0; attempt < 2; attempt++) {
        [config, models, registry] = await Promise.all([
          request("/provider-config"),
          request("/provider-models"),
          request("/provider-connections").then((r) => r.connections || []),
        ]);
        if (config.version === models.version) break;
      }
      if (own !== readEpoch) return;
      if (config.version !== models.version) throw new Error("Model settings changed while they were read.");
      catalog = models;
      onCatalog(models);
      connections = registry;
      loaded = true;
      if (config.version !== getSnapshot()?.version) onSnapshot(config);
      if (!shown().some((row) => row.key === activeKey)) activeKey = shown().find((row) => row.inForce)?.key ?? shown()[0]?.key ?? null;
    } catch (error) {
      if (own === readEpoch) readError = error.message;
    }
    if (own === readEpoch) render();
  }

  function refuse(error) {
    if (isActiveRunRefusal(error)) return activeRunFreezeNotice(ownRunBusy());
    // Only a version conflict re-reads; every other refusal shows the Host's message.
    if (error.body?.error?.code === "config_conflict") {
      void load();
      return "Saved settings changed elsewhere. Showing the current value.";
    }
    return error.message;
  }

  async function write(body, saved) {
    const own = ++writeEpoch;
    busy = true; feedback = "Saving…"; render();
    try {
      const result = await request("/provider-config", { method: "PUT", body });
      onSnapshot(result);
      if (own === writeEpoch) feedback = saved(result);
    } catch (error) {
      if (own === writeEpoch) feedback = refuse(error);
    } finally {
      busy = false;
      render();
    }
  }

  async function commit(key) {
    const row = shown().find((entry) => entry.key === key);
    const snapshot = getSnapshot();
    if (!row || !snapshot?.config || busy) return;
    activeKey = key;
    if (row.keyMissing) { feedback = null; render(); return; }
    if (frozen()) { render(); return; }
    if (row.inForce) { close(); return; }
    const config = snapshot.config;
    const sameProvider = row.provider === config.provider;
    const api = sameProvider ? config.api : row.api;
    /* A custom endpoint on the same provider has no verified ladder: the Host
       refuses an effort there, so the kept effort is checked against it too. */
    const offered = supportedEffortsOf(catalog, row.provider, row.id, api, sameProvider ? config.baseUrl : undefined);
    const wanted = config.reasoningEffort ?? null;
    const dropped = Boolean(wanted) && !offered.includes(wanted);
    const body = {
      ...projectProviderConfig(config, { provider: row.provider, model: row.id, api, ...(dropped ? { reasoningEffort: undefined } : {}) }, catalog),
      expectedVersion: snapshot.version,
    };
    await write(body, () => `Saved · ${row.name}${dropped ? `. It does not offer ${wanted}; Provider default is used` : ""} · ${MODEL_SCOPE.toLowerCase()}`);
  }

  async function saveEffort(effort) {
    const snapshot = getSnapshot();
    const config = snapshot?.config;
    if (!config || busy) return;
    /* The Host's own capability for the in-force selection is the whole catalog
     * this projection needs: it cannot keep a value the Host did not list. */
    const only = { models: [{ provider: config.provider, id: config.model, api: config.api, baseUrl: config.baseUrl, reasoningCapability: snapshot.reasoningCapability }] };
    const body = { ...projectProviderConfig(config, { reasoningEffort: effort }, only), expectedVersion: snapshot.version };
    await write(body, (result) => `Saved · ${result.config?.reasoningEffort || "Provider default"} · ${MODEL_SCOPE.toLowerCase()}`);
  }

  function close({ refocus = true } = {}) {
    if (popover.matches(":popover-open")) popover.hidePopover();
    if (refocus) anchor?.focus?.();
  }

  popover.addEventListener("toggle", (event) => {
    const open = event.newState === "open";
    stopFollowing?.(); stopFollowing = null;
    anchor?.setAttribute("aria-expanded", String(open));
    if (open && anchor?.isConnected) { stopFollowing = anchorPopover(anchor, popover, { placement: "top-end", fit: true }); return; }
    if (!open && (popover.contains(document.activeElement) || document.activeElement === document.body)) anchor?.focus?.();
  });

  const focusEntry = () => (rows().length > SEARCH_THRESHOLD ? parts?.search : shown().length ? parts?.listbox : parts?.close);
  return {
    open(opener) {
      if (popover.matches(":popover-open")) { close(); return; }
      anchor = opener;
      anchor?.setAttribute("aria-controls", popover.id);
      query = ""; feedback = null; lastFocusId = null;
      activeKey = shown().find((row) => row.inForce)?.key ?? null;
      popover.showPopover();
      render();
      focusEntry()?.focus();
      void load().then(() => {
        if (popover.matches(":popover-open") && (!popover.contains(document.activeElement) || document.activeElement === parts?.close)) focusEntry()?.focus();
      });
    },
    close,
    render,
    isOpen: () => popover.matches(":popover-open"),
  };
}
