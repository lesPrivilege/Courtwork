/* 06d · Preview's object tabs.
 *
 * The right pane is one surface, Preview, that reads objects the Host already
 * owns: a Session's Workspace, a Run, a file version, a presentation instance.
 * Each tab is one of those objects, keyed by the owner's own identity fields,
 * so opening the same object again reselects its tab and two recorded versions
 * of one path stay two tabs. A tab is a view: closing it never cancels,
 * revokes, deletes, discards or decides anything, and nothing here fetches.
 *
 * The set is scoped to the Session it was opened in. Leaving Work A for Work B
 * shows B's set and never A's objects; coming back to A finds A's set again.
 * It lives in memory for the page's lifetime and is written nowhere
 * (evidence/tabbed-preview-20260921, change record in 06d).
 *
 * Nearest precedent: the single document tab this replaces (app.mjs
 * renderDocumentTab / closeDocumentTab, WK-113 ④⑥) — its anatomy, a select
 * target and a separate close target, is kept for every tab. */
import { el, setAction } from "./ui-controls.mjs";

/* The owner's identity, joined; nothing is added that the object does not
 * already carry. The Session is part of every key, so a key never matches
 * across Sessions even if an id were reused. */
export function previewTabKey(kind, ref) {
  const parts = [kind, ref.sessionId];
  if (kind === "run") parts.push(ref.runId);
  else if (kind === "presentation") parts.push(ref.instanceId, ref.revision);
  else if (kind === "file")
    parts.push(
      ref.kind, ref.path, ref.sha256 || "", ref.runId || "",
      ...(ref.kind === "core-file" ? [ref.matterId, ref.candidateId, ref.artifactId || "", ref.candidateDigest, ref.bundleDigest] : []),
      ...(ref.kind === "retained-source" ? [ref.sourceId, ref.revision] : []),
    );
  return parts.map((part) => String(part ?? "")).join("\u0000");
}

export function createPreviewTabs() {
  const scopes = new Map();
  let scope = null;
  let serial = 0;
  const current = () => (scope === null ? null : scopes.get(scope) ?? null);
  const ensure = () => {
    if (scope === null) return null;
    if (!scopes.has(scope)) scopes.set(scope, { tabs: [], activeKey: null });
    return scopes.get(scope);
  };

  return {
    /** Enter a Session's set; `null` is Home, which holds no tabs. */
    setScope(next) { scope = next ?? null; },
    scope: () => scope,
    tabs: () => [...(current()?.tabs ?? [])],
    active() {
      const set = current();
      return set?.tabs.find((tab) => tab.key === set.activeKey) ?? null;
    },
    get(key) { return current()?.tabs.find((tab) => tab.key === key) ?? null; },
    /** Select the object's tab, creating it at the end of the strip if it is
     *  not open. The ref of an existing tab is kept: the object is the same. */
    open(kind, ref) {
      const set = ensure();
      if (!set || ref.sessionId !== scope) return null;
      const key = previewTabKey(kind, ref);
      let tab = set.tabs.find((item) => item.key === key);
      const created = !tab;
      if (!tab) {
        tab = { key, kind, ref, id: `preview-tab-${++serial}`, scrollTop: 0 };
        set.tabs.push(tab);
      }
      set.activeKey = key;
      return { tab, created };
    },
    select(key) {
      const set = current();
      if (!set?.tabs.some((tab) => tab.key === key)) return null;
      set.activeKey = key;
      return this.active();
    },
    /** Remove one tab. The right neighbour takes over when the active tab
     *  closes, else the left; closing another tab leaves the selection. */
    close(key) {
      const set = current();
      const index = set?.tabs.findIndex((tab) => tab.key === key) ?? -1;
      if (index < 0) return { closed: null, active: this.active() };
      const [closed] = set.tabs.splice(index, 1);
      if (set.activeKey === key)
        set.activeKey = (set.tabs[index] ?? set.tabs[index - 1])?.key ?? null;
      return { closed, active: this.active() };
    },
    /** The selected tab's reading position, kept on the tab itself. */
    remember(key, scrollTop) {
      const tab = this.get(key);
      if (tab && Number.isFinite(scrollTop)) tab.scrollTop = scrollTop;
    },
  };
}

/* The strip. `describe(tab)` returns the owner's words for the tab — `name`
 * (what fits), `full` (the whole identity, for the accessible name), an
 * optional short `meta` that tells two versions apart, and an optional run
 * `activity` word — and `controls(tab)` names the panel the tab selects. */
const drawnStrips = new WeakMap();
export function renderPreviewTabs(container, { tabs, activeKey, describe, controls, onSelect, onClose }) {
  /* Repaints come with every render of the chat, including a running Work's
   * polls. A strip that would draw the same thing is left alone, so a click
   * that has started on a tab is not lost to a node swapped under it. */
  const described = tabs.map((tab) => [tab, describe(tab)]);
  const signature = JSON.stringify([activeKey, described.map(([tab, words]) => [tab.key, tab.id, controls(tab), words])]);
  if (drawnStrips.get(container) === signature && container.childElementCount === tabs.length) return;
  drawnStrips.set(container, signature);
  const focusedKey = container.contains(document.activeElement)
    ? document.activeElement.closest("[data-preview-tab]")?.getAttribute("data-preview-tab") ?? null
    : null;
  const focusedClose = focusedKey !== null && document.activeElement?.classList.contains("surface-tab-close");
  const nodes = described.map(([tab, words]) => {
    const selected = tab.key === activeKey;
    const select = el("button", {
      className: "surface-tab-select",
      attrs: {
        type: "button", role: "tab", id: tab.id,
        "aria-selected": String(selected), "aria-controls": controls(tab),
        "aria-label": words.meta ? `${words.full} · ${words.meta}` : words.full,
        title: words.meta ? `${words.full}\n${words.meta}` : words.full,
      },
    }, el("span", { className: "surface-tab-name", text: words.name }),
    words.meta ? el("span", { className: "surface-tab-meta", text: words.meta, attrs: { "aria-hidden": "true" } }) : null);
    select.tabIndex = selected ? 0 : -1;
    if (words.activity)
      select.append(el("span", { className: `tab-activity ${words.activity.status}` },
        el("span", { className: "sr-only", text: words.activity.word })));
    select.addEventListener("click", () => onSelect(tab.key));
    const close = el("button", { className: "surface-tab-close", attrs: { type: "button" } });
    setAction(close, "x", `Close ${words.full}`);
    close.tabIndex = selected ? 0 : -1;
    close.addEventListener("click", () => onClose(tab.key, { viaKeyboard: false }));
    return el("span", {
      className: "surface-tab surface-document-tab",
      attrs: { role: "presentation", "data-preview-tab": tab.key },
    }, select, close);
  });
  container.replaceChildren(...nodes);
  // A repaint keeps the keyboard where it was when that tab is still here.
  if (focusedKey !== null) {
    const wrap = [...container.querySelectorAll("[data-preview-tab]")].find((node) => node.getAttribute("data-preview-tab") === focusedKey);
    wrap?.querySelector(focusedClose ? ".surface-tab-close" : ".surface-tab-select")?.focus();
  }
}

/* Arrow / Home / End move between tabs and select them (automatic activation,
 * as the strip always did); Delete or Backspace on a tab closes it. The close
 * buttons are not stops on this path. Installed once on the tablist. */
export function installPreviewTabKeys(container, { onSelect, onClose }) {
  container.addEventListener("keydown", (event) => {
    const select = event.target?.closest?.(".surface-tab-select");
    if (!select || !container.contains(select)) return;
    const key = select.closest("[data-preview-tab]").getAttribute("data-preview-tab");
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      onClose(key, { viaKeyboard: true });
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...container.querySelectorAll(".surface-tab-select")];
    const index = tabs.indexOf(select);
    event.preventDefault();
    const next = event.key === "Home" ? tabs[0]
      : event.key === "End" ? tabs.at(-1)
        : tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    const nextKey = next.closest("[data-preview-tab]").getAttribute("data-preview-tab");
    onSelect(nextKey);
  });
}
