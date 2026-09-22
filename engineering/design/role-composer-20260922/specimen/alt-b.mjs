/* Alternative B · the Agent line, readings in place.
 *
 * The Agent gets its own line inside the composer, under the field and above
 * the controls: the Agent control, a one-line reading of the next run
 * (runtime · model owner · approvals, or the blocker / the run in flight when
 * there is one), a Details disclosure with the full reading, and the Settings
 * entry. The control opens a lean menu of agents (menuitemradio: name, purpose,
 * availability) and commits on pick; the consequences are then read on the
 * line, not before. Keyboard follows the repository's object-menu primitive:
 * roving arrows, Home/End, type-ahead, Enter/Space commit, Escape back to the
 * opener, Tab closes.
 */

import { el, icon, anchorPopover } from "../../../../app/web/ui-controls.mjs";
import { semanticIcon } from "../../../../app/web/semantic-controls.mjs";
import { modelWords, permissionSummary, renderReading } from "./reading.mjs";

export function mountAlternativeB({ controller, openSettings, modelSnapshot, send }) {
  const popover = document.getElementById("agent-popover");
  popover.setAttribute("role", "menu");
  popover.setAttribute("aria-label", "Agents");
  popover.classList.add("agent-menu");

  const label = el("span", { className: "button-label" });
  const chip = el("button", {
    className: "context-chip agent-chip",
    attrs: { type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "aria-controls": "agent-popover", "data-testid": "agent-chip" },
  }, semanticIcon("agent.profile", { size: 16 }), label, icon("chevron-down", { size: 16 }));
  const summary = el("span", { className: "agent-line-summary", attrs: { id: "agent-line-summary", "data-testid": "agent-line-summary" } });
  const toggle = el("button", {
    className: "text-button agent-line-toggle",
    text: "Details",
    attrs: { type: "button", "aria-expanded": "false", "aria-controls": "agent-line-details", "data-testid": "agent-details-toggle" },
  });
  const edit = el("button", { className: "text-button", text: "Settings", attrs: { type: "button", "data-testid": "edit-in-settings" } });
  const retry = el("button", { className: "text-button", text: "Retry", attrs: { type: "button", hidden: "", "data-testid": "notice-retry" } });
  const details = el("div", { className: "agent-line-details", attrs: { id: "agent-line-details", hidden: "", "data-testid": "agent-line-details" } });
  const line = el("div", { className: "agent-line", attrs: { role: "group", "aria-label": "Agent for the next run" } }, chip, summary, retry, toggle, edit);
  document.getElementById("agent-line-slot").replaceWith(el("div", { className: "agent-line-wrap" }, line, details));

  let state = controller.getState();
  let open = false;
  let stopFollowing = null;
  let typed = "", typedAt = 0;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    details.hidden = !expanded;
  });
  retry.addEventListener("click", async () => {
    await controller.retry();
    /* The Retry control hides once the read answers; the keyboard goes to the
       Agent control rather than falling to the page. */
    if (retry.hidden && (document.activeElement === document.body || document.activeElement === retry)) chip.focus();
  });
  edit.addEventListener("click", () => {
    if (state.selectedId) openSettings(state.selectedId, { focusBack: () => edit });
  });

  const items = () => [...popover.querySelectorAll('[role="menuitemradio"]')];
  function renderMenu() {
    if (!open) return;
    const focusedId = document.activeElement?.dataset?.agent ?? null;
    if (state.list.status === "error" && !state.list.rows.length) {
      const again = el("button", { className: "context-row", text: `Could not read the agents · Retry`, attrs: { type: "button", role: "menuitem", "data-testid": "list-retry" } });
      again.addEventListener("click", () => void controller.retry());
      popover.replaceChildren(again);
      again.focus();
      return;
    }
    if (!state.list.rows.length) {
      popover.replaceChildren(el("p", { className: "context-meta", text: "Reading agents…", attrs: { role: "none" } }));
      return;
    }
    popover.replaceChildren(...state.list.rows.map((row) => {
      const bits = [];
      if (row.runtimeAvailability === "unavailable") bits.push(`${row.runtimeName} · unavailable`);
      if (state.activeRun?.profileId === row.id) bits.push(`running here · revision ${state.activeRun.profileRevision}`);
      const item = el("button", {
        className: "context-row agent-option",
        attrs: { type: "button", role: "menuitemradio", "aria-checked": String(row.id === state.selectedId), "data-agent": row.id, "data-testid": `agent-option:${row.id}`, tabindex: "-1" },
      },
      el("span", { className: "agent-option-name", text: row.name }),
      el("span", { className: "agent-option-purpose", text: row.responsibility }),
      bits.length ? el("span", { className: "agent-option-state", text: bits.join(" · ") }) : null);
      item.addEventListener("click", () => { controller.select(row.id); close(); });
      return item;
    }));
    const target = items().find((item) => item.dataset.agent === (focusedId ?? state.selectedId)) || items()[0];
    target?.focus();
  }
  function close({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    try { popover.hidePopover(); } catch {}
    if (restoreFocus) chip.focus();
  }
  popover.addEventListener("toggle", (event) => {
    const isOpen = event.newState === "open";
    stopFollowing?.(); stopFollowing = null;
    chip.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) { stopFollowing = anchorPopover(chip, popover, { placement: "top-start", fit: true }); return; }
    const wasOpen = open;
    open = false;
    if (wasOpen && (popover.contains(document.activeElement) || document.activeElement === document.body)) chip.focus();
  });
  popover.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab") { close({ restoreFocus: false }); return; }
    const list = items();
    if (!list.length) return;
    const index = list.indexOf(document.activeElement);
    let next = null;
    if (event.key === "ArrowDown") next = (index + 1) % list.length;
    else if (event.key === "ArrowUp") next = (index + list.length - 1) % list.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = list.length - 1;
    else if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      typed = now - typedAt > 700 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
      typedAt = now;
      const found = list.findIndex((item) => item.querySelector(".agent-option-name").textContent.toLowerCase().startsWith(typed));
      next = found >= 0 ? found : null;
    }
    if (next === null) return;
    event.preventDefault();
    list[next].focus();
  });
  function openMenu() {
    if (open) { close(); return; }
    open = true;
    popover.showPopover();
    renderMenu();
  }
  chip.addEventListener("click", openMenu);
  chip.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openMenu(); }
  });

  controller.subscribe((next) => {
    state = next;
    const row = state.list.rows.find((entry) => entry.id === state.selectedId);
    label.textContent = row?.name ?? (state.list.status === "error" ? "Agent unknown" : "Agent");
    chip.setAttribute("aria-label", `Agent: ${label.textContent}`);
    const n = state.next;
    /* One line, in priority order: what stops a send, what a run in flight
       keeps, a change made elsewhere, then the ordinary reading. */
    let text = "", tone = "";
    if (state.list.status === "error" && !state.list.rows.length) { text = `Could not read the agents: ${state.list.error}`; tone = "blocked"; }
    else if (!n) text = "Reading agents…";
    else if (n.readingStatus === "error") { text = n.send.reason; tone = "blocked"; }
    else if (n.readingStatus !== "ready" && !n.runtime) text = `Reading ${n.name}…`;
    else if (n.blockers.length && !state.activeRun) { text = `Cannot start: ${n.blockers.join(" ")}`; tone = "blocked"; }
    else if (state.activeRun) { text = n.when; tone = "run"; }
    else {
      text = [n.runtime?.name, modelWords(n, modelSnapshot())?.line, permissionSummary(n)].filter(Boolean).join(" · ");
      if (state.changedNotice) text = `${state.changedNotice} ${text}`;
    }
    summary.textContent = text;
    summary.dataset.tone = tone;
    retry.hidden = !(state.list.status === "error" || n?.readingStatus === "error");
    edit.hidden = !state.selectedId;
    edit.setAttribute("aria-label", row ? `Edit ${row.name} in Settings` : "Edit agent in Settings");
    details.replaceChildren(renderReading(n, { modelSnapshot: modelSnapshot(), idPrefix: "agent-b" }));
    send.setAttribute("aria-describedby", "agent-line-summary");
    renderMenu();
  });
}
