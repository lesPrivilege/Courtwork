/* The one menu primitive for object commands: a native popover that opens at
 * a pointer position (secondary click) or beside an anchor (a row's More
 * button, the Menu key), with groups separated only where both sides have
 * rows, disabled rows that stay reachable and say why, roving arrow keys,
 * Escape back to the opener, and nothing left behind when it closes. It draws
 * what the dispatcher lists and reports what was picked; it decides nothing. */
import { el, icon, anchorPopover } from "./ui-controls.mjs";
import { groupCommands } from "./object-commands.mjs";

export function createObjectMenu({ popover, position = anchorPopover, viewport = () => ({ width: window.innerWidth, height: window.innerHeight }) }) {
  let cleanup = null;
  let opener = null;
  let onPick = null;
  let open = false;
  let list = null;
  popover.setAttribute("role", "menu");

  function items() { return [...popover.querySelectorAll('[role="menuitem"]')]; }

  function close({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    cleanup?.(); cleanup = null;
    if (popover.hidePopover) { try { popover.hidePopover(); } catch {} }
    popover.replaceChildren();
    const target = opener;
    opener = null; onPick = null; list = null;
    if (restoreFocus && target && target.isConnected !== false) target.focus();
  }

  function setEnablement(button, command) {
    button.classList.toggle("is-disabled", !command.enabled);
    if (command.enabled) { button.removeAttribute("aria-disabled"); button.removeAttribute("data-tooltip"); }
    else { button.setAttribute("aria-disabled", "true"); button.setAttribute("data-tooltip", command.reason); }
  }
  /** The menu is a projection of the dispatcher's list: while it stays open
   * the app re-lists on every render, so a Run that ends re-enables Delete
   * in place; a row whose command vanished closes the menu (NAV-R3). */
  function refresh() {
    if (!open || !list) return;
    const current = list();
    for (const button of items()) {
      const command = current.find((item) => item.id === button.dataset.command);
      if (!command) { close(); return; }
      setEnablement(button, command);
    }
  }
  function row(command) {
    const button = el("button", { className: `context-row object-command${command.destructive ? " is-destructive" : ""}`,
      attrs: { type: "button", role: "menuitem", "data-command": command.id, "data-semantic-key": command.semanticKey, "aria-label": command.label } });
    setEnablement(button, command);
    button.append(command.glyph ? icon(command.glyph, { size: 16 }) : el("span", { className: "ui-icon object-command-blank", attrs: { "aria-hidden": "true" } }),
      el("span", { className: "object-command-label", text: command.word ?? command.label }));
    button.addEventListener("click", (event) => {
      event.preventDefault();
      /* Enablement is the moment's, not the opening's: a disabled row asks
       * the dispatcher again and only runs when it is enabled now. */
      const now = list ? list().find((item) => item.id === command.id) : command;
      if (!now) { close(); return; }
      if (!now.enabled) { setEnablement(button, now); return; }
      /* Focus goes home to the row first, so a dialog the command opens
       * returns there when it closes, not to a menu row that no longer exists. */
      const pick = onPick;
      close();
      pick?.(command.id);
    });
    return button;
  }

  popover.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation?.(); close(); return; }
    if (event.key === "Tab") { close({ restoreFocus: false }); return; }
    const list = items();
    if (!list.length) return;
    const index = list.indexOf(document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? list.length - 1
      : event.key === "ArrowDown" ? (index + 1) % list.length
      : event.key === "ArrowUp" ? (index + list.length - 1) % list.length : null;
    if (next === null) return;
    event.preventDefault();
    list[next].focus();
  });
  popover.addEventListener("toggle", (event) => { if (event.newState === "closed" && open) close({ restoreFocus: false }); });

  function placeAtPoint(point) {
    if (!popover.style) return;
    const { width, height } = viewport();
    const w = popover.offsetWidth || 0, h = popover.offsetHeight || 0;
    popover.style.left = `${Math.max(8, Math.min(point.x, width - w - 8))}px`;
    popover.style.top = `${Math.max(8, Math.min(point.y, height - h - 8))}px`;
  }

  return {
    isOpen: () => open,
    close,
    refresh,
    /** `commands` is the dispatcher's list; `anchor` or `point` says where;
     * `opener` is where focus returns; `label` names the menu for the target. */
    show({ commands, list: relist = null, anchor = null, point = null, opener: from = null, label, onPick: pick }) {
      close({ restoreFocus: false });
      if (!commands.length) return false;
      opener = from; onPick = pick; list = relist; open = true;
      popover.setAttribute("aria-label", label);
      const groups = groupCommands(commands);
      groups.forEach((group, i) => {
        if (i) popover.append(el("hr", { className: "menu-separator", attrs: { role: "separator" } }));
        for (const command of group) popover.append(row(command));
      });
      if (popover.showPopover) { try { popover.showPopover(); } catch {} }
      if (anchor) cleanup = position(anchor, popover, { placement: "bottom-start" });
      else if (point) placeAtPoint(point);
      items()[0]?.focus();
      return true;
    },
  };
}
