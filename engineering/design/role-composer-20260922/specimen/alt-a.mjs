/* Alternative A · anchored Agent chooser, readings on demand.
 *
 * The composer carries one Agent chip (first in the controls row, before the
 * secondary model control). It opens an anchored dialog popover with a
 * single-select listbox and, beside it, the full reading of the *active*
 * option — so a person compares consequences before committing. Enter or a
 * click commits and closes; Escape closes without change; focus returns to the
 * chip either way (APG select-only combobox cycle). Outside the popover the
 * composer says only what blocks sending or what a run in flight keeps, in the
 * product's existing composer-notice slot.
 */

import { el, icon, anchorPopover } from "../../../../app/web/ui-controls.mjs";
import { semanticIcon } from "../../../../app/web/semantic-controls.mjs";
import { projectNextRun } from "./composer-agent.mjs";
import { renderReading } from "./reading.mjs";

export function mountAlternativeA({ controller, openSettings, modelSnapshot, send }) {
  const popover = document.getElementById("agent-popover");
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Choose agent");
  const notice = document.getElementById("composer-notice");
  const noticeAction = el("button", { className: "text-button", text: "Retry", attrs: { type: "button", "data-testid": "notice-retry", hidden: "" } });
  noticeAction.addEventListener("click", async () => {
    await controller.retry();
    /* The Retry control hides once the read answers; the keyboard goes to the
       Agent control rather than falling to the page. */
    if (noticeAction.hidden && (document.activeElement === document.body || document.activeElement === noticeAction)) chip.focus();
  });
  notice.after(noticeAction);

  const label = el("span", { className: "button-label" });
  const chip = el("button", {
    className: "context-chip agent-chip",
    attrs: { type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "agent-popover", "data-testid": "agent-chip" },
  }, semanticIcon("agent.profile", { size: 16 }), label, icon("chevron-down", { size: 16 }));
  document.getElementById("controls-left").prepend(chip);

  let state = controller.getState();
  let activeId = null;
  let typed = "", typedAt = 0;
  let stopFollowing = null;

  const listbox = el("div", { className: "agent-listbox", attrs: { role: "listbox", tabindex: "0", "aria-label": "Agents", "data-testid": "agent-listbox" } });
  const detail = el("div", { className: "agent-detail", attrs: { "aria-live": "polite", "data-testid": "agent-detail" } });
  const close = el("button", { className: "quiet-button", text: "Close", attrs: { type: "button" } });
  close.addEventListener("click", () => popover.hidePopover());
  const status = el("p", { className: "context-meta", attrs: { role: "status" } });

  const rows = () => state.list.rows;
  const optionId = (id) => `agent-option-${id}`;

  function rowWords(row) {
    const bits = [];
    if (row.runtimeAvailability === "unavailable") bits.push(`${row.runtimeName} · unavailable`);
    if (state.activeRun?.profileId === row.id) bits.push(`running here · revision ${state.activeRun.profileRevision}`);
    return bits.join(" · ");
  }

  function renderPopover() {
    if (!popover.matches(":popover-open")) return;
    /* Remembered by key: the rows and buttons are redrawn, so the node that had
       the keyboard is usually not the node that is there afterwards. */
    const keepKey = popover.contains(document.activeElement) ? document.activeElement.dataset.testid || "close" : null;
    const restore = () => {
      if (!keepKey) return;
      const again = keepKey === "close" ? close : popover.querySelector(`[data-testid="${keepKey}"]`);
      if (document.activeElement !== again) (again || (listbox.isConnected ? listbox : close)).focus();
    };
    const header = el("div", { className: "section-heading" }, el("h3", { text: "Agent" }), close);
    if (state.list.status === "error" && !rows().length) {
      const retry = el("button", { className: "quiet-button", text: "Retry", attrs: { type: "button", "data-testid": "list-retry" } });
      retry.addEventListener("click", () => void controller.retry());
      status.textContent = `Could not read the agents: ${state.list.error}`;
      popover.replaceChildren(header, status, retry);
      restore();
      return;
    }
    if (!rows().length) {
      status.textContent = "Reading agents…";
      popover.replaceChildren(header, status);
      restore();
      return;
    }
    listbox.replaceChildren(...rows().map((row) => {
      const words = rowWords(row);
      const option = el("div", {
        className: "agent-option",
        attrs: { role: "option", id: optionId(row.id), "aria-selected": String(row.id === state.selectedId), "data-testid": `agent-option:${row.id}` },
      },
      el("span", { className: "agent-option-name", text: row.name }),
      el("span", { className: "agent-option-purpose", text: row.responsibility }),
      words ? el("span", { className: "agent-option-state", text: words }) : null);
      if (row.id === activeId) option.classList.add("is-active");
      option.addEventListener("mousemove", () => { if (activeId !== row.id) setActive(row.id); });
      option.addEventListener("click", () => commit(row.id));
      return option;
    }).filter(Boolean));
    if (activeId) listbox.setAttribute("aria-activedescendant", optionId(activeId));
    const row = rows().find((entry) => entry.id === activeId);
    const next = projectNextRun({ row, reading: state.readings[activeId], activeRun: state.activeRun });
    const edit = el("button", { className: "text-button", text: `Edit ${row?.name ?? "agent"} in Settings`, attrs: { type: "button", "data-testid": "edit-in-settings" } });
    edit.addEventListener("click", () => openSettings(activeId, { focusBack: () => chip }));
    detail.replaceChildren(renderReading(next, { modelSnapshot: modelSnapshot(), idPrefix: "agent-a" }), edit);
    status.textContent = state.list.status === "loading" ? "Refreshing agents…" : "";
    popover.replaceChildren(header, el("div", { className: "agent-popover-body" }, listbox, detail), status);
    restore();
  }

  function setActive(id) {
    activeId = id;
    controller.preview(id);
    renderPopover();
  }
  function commit(id) {
    controller.select(id);
    popover.hidePopover();
  }

  listbox.addEventListener("keydown", (event) => {
    const ids = rows().map((row) => row.id);
    if (!ids.length) return;
    const index = Math.max(0, ids.indexOf(activeId));
    let next = null;
    if (event.key === "ArrowDown") next = ids[Math.min(ids.length - 1, index + 1)];
    else if (event.key === "ArrowUp") next = ids[Math.max(0, index - 1)];
    else if (event.key === "Home") next = ids[0];
    else if (event.key === "End") next = ids.at(-1);
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); commit(activeId); return; }
    else if (event.key.length === 1 && /\S/.test(event.key)) {
      /* Type-ahead over the visible names. */
      const now = Date.now();
      typed = now - typedAt > 700 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
      typedAt = now;
      next = rows().find((row) => row.name.toLowerCase().startsWith(typed))?.id ?? null;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  });
  popover.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    popover.hidePopover();
  });
  popover.addEventListener("toggle", (event) => {
    const open = event.newState === "open";
    stopFollowing?.(); stopFollowing = null;
    chip.setAttribute("aria-expanded", String(open));
    if (open) {
      stopFollowing = anchorPopover(chip, popover, { placement: "top-start", fit: true });
      return;
    }
    /* Leaving by Escape, Close, commit or light dismiss: the keyboard goes back
       to the chip unless the person has already put it somewhere else. */
    if (popover.contains(document.activeElement) || document.activeElement === document.body) chip.focus();
  });

  function openChooser() {
    if (popover.matches(":popover-open")) { popover.hidePopover(); return; }
    activeId = state.selectedId ?? rows()[0]?.id ?? null;
    popover.showPopover();
    renderPopover();
    (rows().length ? listbox : close).focus();
  }
  chip.addEventListener("click", openChooser);
  chip.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openChooser(); }
  });

  controller.subscribe((next) => {
    state = next;
    const row = state.list.rows.find((entry) => entry.id === state.selectedId);
    label.textContent = row?.name ?? (state.list.status === "error" ? "Agent unknown" : "Agent");
    chip.setAttribute("aria-label", `Agent: ${label.textContent}`);
    /* Only what changes whether or how the next send happens is said outside
       the chooser; the composer-notice slot is the product's own. */
    const lines = [];
    if (state.changedNotice) lines.push(state.changedNotice);
    if (state.list.status === "error" && !state.list.rows.length) lines.push(`Could not read the agents: ${state.list.error}`);
    else if (state.activeRun) lines.push(state.next?.when);
    else if (state.next && !state.next.send.enabled && state.next.readingStatus !== "loading" && state.next.readingStatus !== "idle") lines.push(state.next.send.reason);
    notice.textContent = lines.filter(Boolean).join(" ");
    notice.hidden = !notice.textContent;
    noticeAction.hidden = !(state.list.status === "error" || state.next?.readingStatus === "error");
    send.setAttribute("aria-describedby", notice.hidden ? "" : "composer-notice");
    renderPopover();
  });
}
