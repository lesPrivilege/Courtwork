/* E1 · the selected anchored Agent chooser (06e design A) over
 * `agent-choice.mjs`. One Agent control in the composer's controls row opens an
 * anchored dialog popover: a single-select listbox beside the full reading of
 * the *highlighted* profile, so consequences are compared before committing.
 * Enter/click commits (one CAS write, owned by the controller); Escape closes
 * without change; focus returns to the control either way (APG select-only
 * combobox cycle). Outside the popover only what changes the next send is said,
 * in one status line beside Send, with its real recovery action.
 *
 * Everything drawn is an owner fact or says that it is not known. The model
 * reading is the global Models value (All chats · future runs) supplied by the
 * host page; Kit compatibility is never shown as supported, because a profile
 * source cannot carry owner evidence (the Host records it as unchecked). */

import { el, icon, anchorPopover } from "./ui-controls.mjs";
import { semanticIcon } from "./semantic-controls.mjs";

/* The public name is Pi (naming ruling); the exact adapter identity stays
 * beside it. Display only: nothing is derived from this text. */
const runtimeName = (adapterId) => (!adapterId ? "the Host runtime" : /^pi(-|$)/.test(adapterId) ? "Pi" : adapterId);
const runtimeLine = (adapterId) => (adapterId && runtimeName(adapterId) !== adapterId ? `${runtimeName(adapterId)} (${adapterId})` : runtimeName(adapterId));

export function createAgentChooser({ controller, mount, noticeAfter, modelReading, openSettings }) {
  const popover = el("div", {
    className: "context-popover agent-popover",
    attrs: { id: "agent-popover", popover: "auto", role: "dialog", "aria-label": "Choose agent", "data-testid": "agent-popover" },
  });
  document.body.append(popover);

  const label = el("span", { className: "button-label" });
  const chip = el("button", {
    className: "context-chip agent-chip",
    attrs: { type: "button", id: "agent-chip", "aria-haspopup": "dialog", "aria-expanded": "false", "aria-controls": "agent-popover", "data-testid": "agent-chip" },
  }, semanticIcon("agent.profile", { size: 16 }), label, icon("chevron-down", { size: 16 }));
  mount.prepend(chip);

  /* The status line and its actions sit after the composer's own notice; they
     never share the paste notice's node. */
  const notice = el("p", { className: "composer-notice agent-notice", attrs: { id: "agent-notice", role: "status", "data-testid": "agent-notice", hidden: "" } });
  const actions = el("span", { className: "agent-notice-actions" });
  const noticeRow = el("div", { className: "agent-notice-row", attrs: { hidden: "" } }, notice, actions);
  noticeAfter.after(noticeRow);

  let state = controller.getState();
  let activeId = null;
  let typed = "", typedAt = 0;
  let stopFollowing = null;
  let visible = false;

  const listbox = el("div", { className: "agent-listbox", attrs: { role: "listbox", tabindex: "0", "aria-label": "Agents", "data-testid": "agent-listbox" } });
  const detail = el("div", { className: "agent-detail", attrs: { "aria-live": "polite", "data-testid": "agent-detail" } });
  const close = el("button", { className: "quiet-button", text: "Close", attrs: { type: "button", "data-testid": "agent-close" } });
  close.addEventListener("click", () => dismiss());
  const status = el("p", { className: "context-meta", attrs: { role: "status" } });

  const profiles = () => state.snapshot?.profiles || [];
  const optionId = (id) => `agent-option-${CSS.escape(id)}`;

  function standing(id) {
    const snap = state.snapshot;
    if (!snap) return "";
    if (state.draft?.profileId === id && state.apply.status !== "idle") return state.apply.status === "applying" ? "selecting…" : "your choice · not applied";
    if (snap.effective?.id === id) return snap.sessionSelection === id ? "selected for this chat" : "in effect · inherited";
    return "";
  }

  function readingFor(id) {
    const snap = state.snapshot;
    const profile = profiles().find((entry) => entry.id === id);
    const box = el("div", { className: "agent-reading" });
    if (!profile) return box;
    box.append(el("p", { className: "agent-reading-purpose", text: profile.description || (profile.builtin ? "The Host's built-in agent: this chat's own context, no profile source." : "No description in this profile.") }));
    const facts = el("dl", { className: "agent-reading-facts" });
    const add = (term, value, key) => { if (value) facts.append(el("dt", { text: term }), el("dd", { text: value, attrs: { "data-reading": key } })); };
    add("Runs on", `${runtimeLine(snap.adapterId)}, the Host's runtime for this chat`, "runtime");
    const model = modelReading();
    add("Model", model ? `${model}, from Models · All chats · future runs. This agent has no model of its own.` : "Not read yet.", "model");
    const source = state.sources[id];
    if (profile.builtin) add("Kits", "None", "kits");
    else if (!source || source.status === "loading") add("Kits", "Reading the profile source…", "kits");
    else if (source.status === "error") add("Kits", `The profile source could not be read: ${source.error}`, "kits");
    else if (source.reading.status === "unreadable") add("Kits", "The profile source is not readable JSON.", "kits");
    else add("Kits", source.reading.kits.length
      ? source.reading.kits.map((kit) => `${kit.id} ${kit.version} (compatibility with ${runtimeName(snap.adapterId)} not checked)`).join("; ")
      : "None", "kits");
    if (source?.reading?.resourceIds?.length)
      add("Includes", source.reading.resourceIds.map((rid) => snap.titles[rid] ? snap.titles[rid] : `${rid} (not in this configuration)`).join(", "), "resources");
    if (profile.diagnostics?.length) add("Diagnostics", profile.diagnostics.join(" "), "diagnostics");
    add("Works in", "This chat and its Work location. It does not change either, or open another inbox.", "scope");
    add("When", snap.activeRuns
      ? "A run is active. The selection cannot change until it ends, and a running run keeps the agent it started with."
      : "Selecting applies to runs started after it in this chat. A running run keeps the agent it started with.", "when");
    box.append(facts);
    return box;
  }

  function renderPopover() {
    if (!popover.matches(":popover-open")) return;
    const keepKey = popover.contains(document.activeElement) ? document.activeElement.dataset.testid || "agent-close" : null;
    const restore = () => {
      if (!keepKey) return;
      const again = popover.querySelector(`[data-testid="${CSS.escape(keepKey)}"]`);
      if (document.activeElement !== again) (again || (listbox.isConnected ? listbox : close)).focus();
    };
    const header = el("div", { className: "section-heading" }, el("h3", { text: "Agent" }), close);
    if (state.read.status === "error" && !profiles().length) {
      const retry = el("button", { className: "quiet-button", text: "Retry", attrs: { type: "button", "data-testid": "agent-list-retry" } });
      retry.addEventListener("click", () => void controller.load());
      status.textContent = `Could not read the agents: ${state.read.error}`;
      popover.replaceChildren(header, status, retry);
      restore();
      return;
    }
    if (!profiles().length) {
      status.textContent = state.read.status === "ready" ? "The Host reports no agent profiles." : "Reading agents…";
      popover.replaceChildren(header, status);
      restore();
      return;
    }
    listbox.replaceChildren(...profiles().map((profile) => {
      const words = standing(profile.id);
      const option = el("div", {
        className: "agent-option",
        attrs: { role: "option", id: optionId(profile.id), "aria-selected": String(profile.id === state.snapshot.effective?.id), "data-testid": `agent-option:${profile.id}` },
      },
      el("span", { className: "agent-option-name", text: profile.title }),
      profile.description ? el("span", { className: "agent-option-purpose", text: profile.description }) : null,
      words ? el("span", { className: "agent-option-state", text: words }) : null,
      profile.health && profile.health !== "healthy" ? el("span", { className: "agent-option-state", text: profile.health }) : null);
      if (profile.id === activeId) option.classList.add("is-active");
      option.addEventListener("mousemove", () => { if (activeId !== profile.id) setActive(profile.id); });
      option.addEventListener("click", () => commit(profile.id));
      return option;
    }));
    if (activeId) listbox.setAttribute("aria-activedescendant", optionId(activeId));
    const activeProfile = profiles().find((entry) => entry.id === activeId);
    const children = [readingFor(activeId)];
    if (activeProfile && !activeProfile.builtin) {
      /* E1-F1 → K5 · Settings › Developer is the destination either way. Only
         the profile this chat selects for itself opens its source editor
         (Preview, then an explicit Save); any other profile is inspected
         read-only there, so its action says View. */
      const editable = state.snapshot.sessionSelection === activeProfile.id;
      const edit = el("button", { className: "text-button", text: `${editable ? "Edit" : "View"} ${activeProfile.title} source in Settings`, attrs: { type: "button", "data-testid": "agent-view-in-settings" } });
      edit.addEventListener("click", () => { popover.hidePopover(); openSettings(activeProfile.id, chip, { edit: editable }); });
      children.push(edit);
    }
    detail.replaceChildren(...children);
    status.textContent = state.read.status === "loading" ? "Refreshing agents…" : "";
    popover.replaceChildren(header, el("div", { className: "agent-popover-body" }, listbox, detail), status);
    restore();
  }

  /* Leave the chooser and put the keyboard back on the control now, not in the
     popover's asynchronous toggle event: by then the page's own fallback may
     already have moved focus elsewhere. */
  function dismiss() {
    if (popover.matches(":popover-open")) popover.hidePopover();
    chip.focus();
  }

  function setActive(id) {
    activeId = id;
    controller.preview(id);
    renderPopover();
  }
  function commit(id) {
    dismiss();
    void controller.choose(id);
  }

  listbox.addEventListener("keydown", (event) => {
    const ids = profiles().map((profile) => profile.id);
    if (!ids.length) return;
    const index = Math.max(0, ids.indexOf(activeId));
    let next = null;
    if (event.key === "ArrowDown") next = ids[Math.min(ids.length - 1, index + 1)];
    else if (event.key === "ArrowUp") next = ids[Math.max(0, index - 1)];
    else if (event.key === "Home") next = ids[0];
    else if (event.key === "End") next = ids.at(-1);
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (activeId) commit(activeId); return; }
    else if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      typed = now - typedAt > 700 ? event.key.toLowerCase() : typed + event.key.toLowerCase();
      typedAt = now;
      next = profiles().find((profile) => profile.title.toLowerCase().startsWith(typed))?.id ?? null;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  });
  popover.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    dismiss();
  });
  popover.addEventListener("toggle", (event) => {
    const open = event.newState === "open";
    stopFollowing?.(); stopFollowing = null;
    chip.setAttribute("aria-expanded", String(open));
    if (open) { stopFollowing = anchorPopover(chip, popover, { placement: "top-start", fit: true }); return; }
    if (popover.contains(document.activeElement) || document.activeElement === document.body) chip.focus();
  });

  function openChooser() {
    if (popover.matches(":popover-open")) { popover.hidePopover(); return; }
    activeId = state.draft?.profileId ?? state.snapshot?.effective?.id ?? profiles()[0]?.id ?? null;
    if (activeId) controller.preview(activeId);
    popover.showPopover();
    renderPopover();
    (profiles().length ? listbox : close).focus();
  }
  chip.addEventListener("click", openChooser);
  chip.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openChooser(); }
  });

  function action(text, testid, run) {
    const button = el("button", { className: "text-button", text, attrs: { type: "button", "data-testid": testid } });
    button.addEventListener("click", async () => {
      await run();
      if (!button.isConnected && (document.activeElement === document.body || !document.activeElement)) chip.focus();
    });
    return button;
  }

  function renderNotice() {
    const next = state.next;
    const lines = [];
    const buttons = [];
    if (state.read.status === "error") { lines.push(`Could not read this chat's agent: ${state.read.error}`); buttons.push(action("Retry", "agent-retry", () => controller.load())); }
    else if (next && !next.send.enabled && state.read.status === "ready") {
      lines.push(next.send.reason);
      if (state.apply.status === "conflict") buttons.push(action("Select again", "agent-apply-again", () => controller.apply()));
      if (state.apply.status === "unknown") buttons.push(action("Check again", "agent-check", () => controller.check()));
      if (["conflict", "frozen", "unknown", "failed"].includes(state.apply.status)) buttons.push(action("Keep current agent", "agent-keep-current", () => controller.keepCurrent()));
      /* The chat's own agent cannot run as composed: the way out is another
         agent now, or the profile's source in Settings (from the chooser). */
      if (state.apply.status === "idle" && next.effective && next.effective.status !== "compatible")
        buttons.push(action("Choose another agent", "agent-choose-other", () => openChooser()));
    }
    notice.textContent = lines.join(" ");
    actions.replaceChildren(...buttons);
    noticeRow.hidden = !visible || !notice.textContent;
    notice.hidden = noticeRow.hidden;
  }

  controller.subscribe((next) => {
    state = next;
    const effective = state.snapshot?.effective;
    /* The control names the agent in effect, never an unapplied draft; the
       draft is described beside Send until the Host accepts it. */
    const title = effective ? state.snapshot.titles[effective.id] ?? effective.id : null;
    label.textContent = title ?? (state.read.status === "error" ? "Agent unknown" : "Agent");
    chip.setAttribute("aria-label", `Agent: ${label.textContent}`);
    renderNotice();
    renderPopover();
  });

  return {
    /** Shown only for an ordinary Chat with a Session; hidden elsewhere. */
    setVisible(show) {
      visible = show;
      chip.hidden = !show;
      if (!show && popover.matches(":popover-open")) popover.hidePopover();
      renderNotice();
    },
    /** The id of the status line, for Send's aria-describedby. */
    describedBy: () => (noticeRow.hidden ? null : "agent-notice"),
    get control() { return chip; },
  };
}
