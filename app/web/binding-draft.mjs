/* The "Continue in Matter" form's draft (review N5, 2026-10-01).
 *
 * What a person types into the form is theirs until the Host confirms the
 * binding. The panel is rebuilt by many things that are not the person — the
 * project-work read settling, a Session refresh, a provider push, an extension
 * reload — and a rebuild used to make empty fields. This owner keeps every
 * field's value per Session and extension, hands it back to every rebuild, and
 * puts the keyboard back where it was.
 *
 * A draft is not an operation: nothing here is sent, and nothing here decides
 * that a bind landed. `clear` is called by the screen when the Host's Session
 * says the binding exists, and `forgetSession` when the Session is deleted.
 * Closing the form, leaving the chat, a failed read and a failed bind all keep
 * the draft (ux-conventions «关闭面板不取消 Run、不清草稿»).
 *
 * Storage follows Home's draft (`storeHomeDraft` in app.mjs): the tab's
 * sessionStorage, best effort, never a reason to stop someone typing. One entry
 * per draft, so a keystroke rewrites only its own. The stored bound is the
 * form's own: each field is stored up to the `maxLength` its manifest declares
 * (a field that declares none, up to `BINDING_DRAFT_FIELD_LIMIT`), with no cap
 * on the sum, so a draft the form allows survives a reload. A store that
 * refuses the write (quota, blocked) costs persistence only: the draft stays
 * in memory and the entry is removed, so an older copy never comes back.
 * Reading back knows no manifest, so it applies only a sanity cap per value,
 * `BINDING_DRAFT_VALUE_CEILING` — the largest `maxLength` the extension
 * registry admits; what was stored was already cut to its field's limit.
 *
 * Nearest precedent: local-extension-view.mjs and workspace-card.mjs (a
 * view-owned value updated on `input`; focus and selection restored after the
 * rebuild by a `data-…-field` key). */
import { el } from "./ui-controls.mjs";

export const BINDING_DRAFT_FIELD_LIMIT = 100000;
export const BINDING_DRAFT_VALUE_CEILING = 1000000;
const FIELD = "data-binding-field";

export function createBindingDraft({ storage = () => null, prefix }) {
  const drafts = new Map();
  // Per draft, the stored limit of each field the form has declared so far.
  const limits = new Map();
  const keyOf = (sessionId, extensionId) => `${prefix}:${sessionId}:${extensionId}`;
  // A blocked or full browser store must not block typing: memory is the owner.
  const stored = (act) => {
    try { const store = storage(); return store ? act(store) : null; }
    catch { return null; }
  };

  function load(key) {
    if (drafts.has(key)) return drafts.get(key);
    const values = {};
    const saved = stored((store) => JSON.parse(store.getItem(key) || "null"));
    if (saved && typeof saved === "object" && !Array.isArray(saved))
      for (const [name, value] of Object.entries(saved))
        if (typeof value === "string" && value) values[name] = value.slice(0, BINDING_DRAFT_VALUE_CEILING);
    drafts.set(key, values);
    return values;
  }
  function persist(key, values) {
    const names = Object.keys(values);
    const bound = limits.get(key) ?? {};
    const entry = Object.fromEntries(names.map((name) => [name, values[name].slice(0, bound[name] ?? BINDING_DRAFT_FIELD_LIMIT)]));
    const kept = names.length > 0 && stored((store) => (store.setItem(key, JSON.stringify(entry)), true));
    // An entry that could not be written is removed rather than left behind:
    // an older copy must not come back after a reload as if it were current.
    if (!kept) stored((store) => store.removeItem(key));
  }

  function values(sessionId, extensionId) {
    return { ...load(keyOf(sessionId, extensionId)) };
  }
  function set(sessionId, extensionId, name, value, maxLength = null) {
    const key = keyOf(sessionId, extensionId), draft = load(key);
    if (Number.isFinite(maxLength) && maxLength > 0) limits.set(key, { ...limits.get(key), [name]: maxLength });
    if (value) draft[name] = String(value);
    else delete draft[name];
    persist(key, draft);
  }
  function clear(sessionId, extensionId) {
    const key = keyOf(sessionId, extensionId);
    drafts.delete(key);
    limits.delete(key);
    stored((store) => store.removeItem(key));
  }
  function forgetSession(sessionId) {
    const own = `${prefix}:${sessionId}:`;
    for (const key of [...drafts.keys()]) if (key.startsWith(own)) drafts.delete(key);
    for (const key of [...limits.keys()]) if (key.startsWith(own)) limits.delete(key);
    stored((store) => {
      const keys = [];
      for (let index = 0; index < store.length; index++) keys.push(store.key(index));
      for (const key of keys) if (key?.startsWith(own)) store.removeItem(key);
    });
  }

  /* The fields an extension's manifest declares, with what was typed into them
   * for this Session. `controls` is what the form reads at submit. */
  function fields(sessionId, extension) {
    const declared = Array.isArray(extension.bindingFields) ? extension.bindingFields : [];
    const draft = load(keyOf(sessionId, extension.id));
    const node = el("div", { className: "binding-fields" });
    const controls = [];
    for (const field of declared) {
      if (!field?.name) continue;
      const label = el("label", { className: "binding-field", text: field.label || field.name });
      const control = field.multiline
        ? el("textarea", { attrs: { name: field.name, rows: 5, [FIELD]: `field:${field.name}` } })
        : el("input", { attrs: { name: field.name, type: "text", [FIELD]: `field:${field.name}` } });
      if (field.required) control.required = true;
      if (Number.isFinite(field.maxLength) && field.maxLength > 0) control.maxLength = field.maxLength;
      control.value = draft[field.name] ?? "";
      control.addEventListener("input", () => set(sessionId, extension.id, field.name, control.value, field.maxLength));
      label.append(control);
      if (field.maxLength) label.append(el("small", { text: `Maximum ${field.maxLength} characters.` }));
      node.append(label);
      controls.push({ field, control });
    }
    if (!controls.length)
      node.append(el("p", { className: "section-note", text: "This extension declares no input fields." }));
    return { node, controls };
  }

  /* Rebuild the panel without taking the keyboard: the control that had focus
   * is found again by its key, with its selection and its own scroll position.
   * A control that is gone or disabled is not replaced by another. */
  function keepFocus(panel, rebuild) {
    const active = document.activeElement;
    const held = active && panel.contains(active) ? active.getAttribute(FIELD) : null;
    const selection = held && typeof active.selectionStart === "number"
      ? [active.selectionStart, active.selectionEnd, active.selectionDirection || "none"] : null;
    const scroll = held ? [active.scrollTop || 0, active.scrollLeft || 0] : null;
    rebuild();
    if (!held) return;
    const target = [...panel.querySelectorAll(`[${FIELD}]`)].find((node) => node.getAttribute(FIELD) === held);
    if (!target || target.disabled) return;
    target.focus({ preventScroll: true });
    if (selection) target.setSelectionRange?.(...selection);
    target.scrollTop = scroll[0];
    target.scrollLeft = scroll[1];
  }

  return { values, set, clear, forgetSession, fields, keepFocus };
}
