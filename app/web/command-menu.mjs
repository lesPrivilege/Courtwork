import { el } from "./ui-controls.mjs";

/* CMD-01 · the command menu. The Host owns the catalog (GET
 * /sessions/:id/commands, see app/runtime/commands.mjs); this module keeps no
 * command list of its own. It only decides, from the composer's own value and
 * focus, whether the catalog should be shown, filters it by the typed prefix,
 * and on a pick writes the composer's draft — dispatch of the picked command
 * happens where the composer already sends messages, not here. */

const NOTE_NO_SESSION = "Commands work inside a chat.";
const NOTE_NO_MATCH = "No command matches.";
const TRIGGER = /^\/([a-z0-9_-]*)$/;
const STALE_MS = 5000;

function isTriggered(value) {
  return typeof value === "string" && !value.includes("\n") && TRIGGER.test(value);
}

function currentPrefix(value) {
  const match = TRIGGER.exec(value);
  return match ? match[1] : "";
}

/** " <a|b|c>" for an enum arg, " <key>" for a text arg, "" for no args. */
function argsHint(args) {
  if (!args) return "";
  const [key, spec] = Object.entries(args)[0];
  return spec.type === "enum" ? ` <${spec.values.join("|")}>` : ` <${key}>`;
}

export function createCommandMenu({ textarea, container, request, getSessionId, onPick }) {
  container.setAttribute("role", "listbox");
  container.id = "command-menu";
  container.setAttribute("aria-label", "Commands");
  container.classList.add("command-menu");
  container.hidden = true;
  textarea.setAttribute("aria-controls", "command-menu");

  const cache = new Map(); // sessionId -> { revision, commands, fetchedAt }
  let open = false;
  let navigable = []; // available commands in the currently filtered/rendered order
  let activeName = null;
  let destroyed = false;
  let suppressTrigger = false;
  let pointerOnMenu = false;

  function rowId(command) { return `command-option-${command.name}`; }

  function updateActiveDescendant() {
    if (activeName) textarea.setAttribute("aria-activedescendant", rowId({ name: activeName }));
    else textarea.removeAttribute("aria-activedescendant");
  }

  function renderRow(command) {
    const active = command.name === activeName;
    const row = el("button", {
      className: "command-option",
      attrs: { type: "button", role: "option", id: rowId(command), "aria-selected": String(active) },
    },
      el("span", { className: "command-name", text: `/${command.name}${argsHint(command.args)}` }),
      el("span", { className: "command-desc", text: command.description }),
    );
    if (!command.availability.available) {
      row.setAttribute("aria-disabled", "true");
      row.append(el("span", { className: "command-reason", text: command.availability.reason }));
    }
    row.addEventListener("click", () => {
      if (!command.availability.available) return;
      pick(command);
    });
    return row;
  }

  function render() {
    if (!open) { container.hidden = true; return; }
    container.hidden = false;
    const sessionId = getSessionId();
    if (!sessionId) {
      navigable = []; activeName = null;
      container.replaceChildren(el("p", { className: "command-desc", text: NOTE_NO_SESSION }));
      updateActiveDescendant();
      return;
    }
    const entry = cache.get(sessionId);
    if (!entry) {
      navigable = []; activeName = null;
      container.replaceChildren();
      updateActiveDescendant();
      return;
    }
    const prefix = currentPrefix(textarea.value);
    const filtered = entry.commands.filter((command) => command.name.startsWith(prefix));
    navigable = filtered.filter((command) => command.availability.available);
    if (activeName && !navigable.some((command) => command.name === activeName)) activeName = null;
    if (!activeName && navigable.length) activeName = navigable[0].name;
    if (!filtered.length) {
      container.replaceChildren(el("p", { className: "command-desc", text: NOTE_NO_MATCH }));
      updateActiveDescendant();
      return;
    }
    container.replaceChildren(...filtered.map(renderRow));
    updateActiveDescendant();
  }

  async function refresh(sessionId) {
    if (!sessionId) return;
    try {
      const data = await request(`/sessions/${encodeURIComponent(sessionId)}/commands`);
      cache.set(sessionId, { revision: data.revision, commands: data.commands, fetchedAt: Date.now() });
    } catch {
      // Leave the cache as it was; the menu just shows what it already had
      // (or nothing) until the next successful refresh.
    }
    if (!destroyed && open && getSessionId() === sessionId) render();
  }

  function ensureFresh(sessionId) {
    const entry = cache.get(sessionId);
    if (!entry || Date.now() - entry.fetchedAt > STALE_MS) return refresh(sessionId);
    return Promise.resolve();
  }

  function openMenu() {
    if (open) { render(); return; }
    open = true;
    textarea.setAttribute("aria-expanded", "true");
    const sessionId = getSessionId();
    if (sessionId) void ensureFresh(sessionId);
    render();
  }

  function close() {
    if (!open) return;
    open = false;
    navigable = []; activeName = null;
    container.hidden = true;
    container.replaceChildren();
    textarea.removeAttribute("aria-expanded");
    textarea.removeAttribute("aria-activedescendant");
  }

  function moveActive(direction) {
    if (!navigable.length) return;
    const index = navigable.findIndex((command) => command.name === activeName);
    const nextIndex = index === -1
      ? (direction > 0 ? 0 : navigable.length - 1)
      : Math.min(Math.max(index + direction, 0), navigable.length - 1);
    activeName = navigable[nextIndex].name;
  }

  function pick(command) {
    onPick(command);
    suppressTrigger = true;
    textarea.value = `/${command.name}${command.args ? " " : ""}`;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.focus();
    suppressTrigger = false;
    close();
  }

  function handleTriggerChange() {
    if (destroyed || suppressTrigger) return;
    if (document.activeElement === textarea && isTriggered(textarea.value)) openMenu();
    else close();
  }

  textarea.addEventListener("input", handleTriggerChange);
  textarea.addEventListener("focus", handleTriggerChange);
  textarea.addEventListener("blur", () => {
    if (destroyed) return;
    if (pointerOnMenu) { pointerOnMenu = false; return; }
    close();
  });
  textarea.addEventListener("keydown", (event) => {
    if (destroyed || !open) return;
    if (event.key === "ArrowDown") { event.preventDefault(); moveActive(1); render(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); moveActive(-1); render(); }
    else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const command = navigable.find((c) => c.name === activeName);
      if (command) pick(command);
    } else if (event.key === "Escape") { event.preventDefault(); close(); }
  });
  container.addEventListener("pointerdown", () => { pointerOnMenu = true; });

  return {
    catalog(sessionId) {
      const entry = cache.get(sessionId);
      return entry ? { revision: entry.revision, commands: entry.commands } : null;
    },
    refresh,
    close,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      close();
      cache.clear();
    },
  };
}
