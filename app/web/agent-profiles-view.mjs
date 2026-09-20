/* Settings → Agents → Agent profiles · the view.
 *
 * It renders one controller state and sends back intents. It holds no state of
 * its own except the two things that belong to a screen rather than to an
 * object: which control the keyboard is on, and which row you came from.
 *
 * The anatomy is the Settings page's own — `settingsRow` for a property, a
 * `.settings-block` per decision, `.runtime-banner` for a condition that applies
 * to the whole group, `.data-list` for a reading, the `runtime-dialog` shape for
 * a detail. Nothing new is introduced at the level of shape, spacing, type or
 * icon family; the one thing this surface adds is the *arrangement* of four
 * decisions (responsibility, Kits, execution, permission scope) in the order a
 * person makes them.
 *
 * Re-render is whole-panel, with focus restored by `data-focus-key`, following
 * `local-extension-view.mjs`. Rebuilding a `select` under someone's hand would
 * otherwise drop their focus to `body` (the same FN-27 the Preferences rows
 * already answer).
 */

import { el, action } from "./ui-controls.mjs";
import { semanticIcon } from "./semantic-controls.mjs";
import { settingsRow } from "./settings-view.mjs";
import { ACTIVE_RUN_SENTENCE } from "./runtime-view.mjs";

/* One sentence, said once, where the decision is made. Saving a composition is
 * not the same act as a Work Expert being formally accepted, and the page must
 * not let the Save button imply the second. */
export const NOT_AN_ACCEPTANCE_SENTENCE =
  "Saving records this composition. It does not publish an accepted Work Expert.";
/* The Kit column asks; it never grants. Read beside the permission scope so the
 * two words stay apart in the same glance. */
export const REQUEST_NOT_GRANT_SENTENCE =
  "A Kit states what it needs. It grants nothing: each line below is the effect the permission owner reports for this runtime.";

const EFFECT_WORDS = { allow: "Allowed", ask: "Asks each time", deny: "Denied" };

/* A confirmation that may be days old needs its date, not only its clock time:
 * `localTime` in settings-view answers "just now" receipts and would read as
 * today here. Same instant source, same `toLocaleString` shape the Attention
 * conversation list already uses; an unparsable value stays unknown. */
function savedAtText(iso) {
  const at = new Date(iso);
  return Number.isNaN(at.valueOf()) ? "time not recorded" : at.toLocaleString();
}

/* "a, b and c" — an enumeration in a sentence reads as a sentence, not as a
 * comma-separated field. */
function sentenceList(items) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function helpText(text) {
  return el("span", { className: "settings-row-help", text });
}

export function createAgentProfilesView(mount, controller) {
  let state = controller.getState();
  const dialog = el("dialog", {
    className: "runtime-dialog",
    attrs: { "aria-labelledby": "agent-runtime-detail-title", "data-testid": "runtime-detail" },
  });
  document.body.append(dialog);
  /* The way back is remembered as a key, not as a node: the panel re-renders
     while the detail is open, so the button that was clicked is no longer the
     button that is there. Escape and the close control leave by the same door
     (disclosure/overlay §return). */
  let openerKey = null;
  dialog.addEventListener("close", () => {
    const key = openerKey;
    openerKey = null;
    if (controller.getState().runtimeDetail.status !== "closed") controller.closeRuntimeDetail();
    restore(key);
  });

  function focusKeyNow() {
    const active = document.activeElement;
    if (!active || !mount.contains(active)) return null;
    return active.getAttribute("data-focus-key");
  }

  /* Where the keyboard goes when the control it was on cannot take it back.
     Pressing Save disables Save — so between the press and the reply there is
     no control to return to, and focus would otherwise fall to `body` and send
     the next Tab to the top of the form. The chain names the destination that
     still answers the action: the button again if the save can be retried, and
     otherwise the receipt that says what happened. */
  const FOCUS_CHAIN = { save: ["save", "save-receipt"] };
  let pendingFocusKey = null;

  function node(key) {
    return mount.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
  }

  function restore(key) {
    if (!key) return;
    for (const candidate of FOCUS_CHAIN[key] || [key]) {
      const target = node(candidate);
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        pendingFocusKey = null;
        return;
      }
    }
    /* The control exists but cannot hold focus yet. Remember it and try again
       on the next render — a request in flight is a wait, not a loss. */
    pendingFocusKey = node(key) ? key : null;
  }

  /* ── List ───────────────────────────────────────────────────────────── */

  function listRow(row) {
    const meta = [
      row.roleName,
      row.kitNames.length ? `Kits: ${row.kitNames.join(", ")}` : "No Kit",
      /* Availability belongs to this reading, not to a colour: an executor that
         cannot take work is said so in words next to its name. */
      row.runtimeAvailability === "unavailable"
        ? `${row.runtimeName} · unavailable`
        : row.runtimeName,
    ].join(" · ");
    /* One action, and it opens the profile — including when this profile's
       runtime is down. Routing that row to a read-only runtime card instead
       would strand the person on the page that cannot change the choice; the
       reason travels with them, in the row's own text and in the profile. */
    const control = action(
      "chevron-right",
      row.nextAction.label,
      () => controller.openProfile(row.nextAction.targetId),
      {
        visible: true,
        trailing: true,
        className: "quiet-button",
        attrs: { "data-focus-key": `row:${row.id}`, "data-testid": `row-action:${row.id}` },
      },
    );
    return el(
      "div",
      { className: "settings-row", attrs: { "data-testid": `profile-row:${row.id}` } },
      el(
        "div",
        { className: "settings-row-text" },
        el(
          "span",
          { className: "settings-row-title" },
          semanticIcon("agent.profile", { size: 16 }),
          " ",
          row.name,
        ),
        helpText(row.responsibility),
        helpText(meta),
        row.activeRun ? helpText(`A run is using revision ${row.activeRun.revision} now.`) : null,
      ),
      el("div", { className: "settings-row-control" }, control),
    );
  }

  function renderList() {
    const { list } = state;
    const nodes = [
      el("h4", { className: "settings-block-title", text: "Agent profiles" }),
      el("p", {
        className: "form-help",
        text: "An agent is a role with the Kits it works from and the runtime that executes it. Choosing one here changes future runs, not a run already in flight.",
      }),
    ];
    if (list.status === "loading" && !list.rows.length)
      nodes.push(el("p", { className: "form-help", attrs: { role: "status" }, text: "Loading agent profiles…" }));
    else if (list.status === "error")
      nodes.push(
        el("p", {
          className: "inline-error",
          attrs: { role: "alert", "data-testid": "list-error" },
          text: list.error,
        }),
      );
    else if (!list.rows.length)
      nodes.push(
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "list-empty" },
          text: "No agent profile is configured on this host yet. An agent appears here once one is installed or created.",
        }),
      );
    else nodes.push(...list.rows.map(listRow));
    return nodes;
  }

  /* ── Profile ────────────────────────────────────────────────────────── */

  function roleBlock(detail, draft, frozen) {
    const select = el("select", {
      attrs: {
        "aria-label": "Role",
        "data-focus-key": "role",
        "data-testid": "role-select",
      },
    });
    for (const role of detail.roles)
      select.append(el("option", { attrs: { value: role.id }, text: role.name }));
    select.value = draft.roleId;
    select.disabled = frozen;
    select.addEventListener("change", () => controller.setRole(select.value));
    const chosen = detail.roles.find((role) => role.id === draft.roleId);
    return el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "Responsibility" }),
      settingsRow(
        "Role",
        chosen ? chosen.purpose : "This profile's role is not one this host offers.",
        select,
      ),
    );
  }

  function kitBlock(detail, draft, projection, frozen) {
    const rows = detail.kits.map((kit) => {
      const checkbox = el("input", {
        attrs: {
          type: "checkbox",
          "aria-label": `${kit.name} ${kit.version}`,
          "data-focus-key": `kit:${kit.id}`,
          "data-testid": `kit:${kit.id}`,
        },
      });
      checkbox.checked = draft.kitIds.includes(kit.id);
      checkbox.disabled = frozen;
      checkbox.addEventListener("change", () => controller.toggleKit(kit.id));
      const row = settingsRow(`${kit.name} · ${kit.version}`, kit.purpose, checkbox);
      row.setAttribute("data-testid", `kit-row:${kit.id}`);
      /* The incompatibility is a property of this pair, so it is stated on the
         row that makes the pair — not by removing the Kit from the list and not
         by a disabled control whose reason you have to guess. */
      if (projection.incompatibleKitIds.includes(kit.id) && projection.runtime)
        row.append(
          el("span", {
            className: "settings-row-help",
            attrs: { "data-testid": `kit-incompatible:${kit.id}` },
            text: `Not supported on ${projection.runtime.name}. It needs to ${sentenceList(
              kit.requests
                .filter((request) => !projection.runtime.supportedActions.includes(request.action))
                .map((request) => request.label.toLowerCase()),
            )}.`,
          }),
        );
      return row;
    });
    return el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "Kits" }),
      el("p", {
        className: "form-help",
        text: "A Kit supplies working methods for this role. Kits are optional; general work needs none.",
      }),
      ...rows,
    );
  }

  function executionBlock(detail, draft, projection, frozen) {
    const select = el("select", {
      attrs: {
        "aria-label": "Runtime",
        "data-focus-key": "runtime",
        "data-testid": "runtime-select",
      },
    });
    for (const runtime of detail.runtimes)
      select.append(
        el("option", {
          attrs: { value: runtime.id },
          /* An unavailable executor stays in the list and says so in its own
             label: hiding it would make "why can I not pick Codex?" unanswerable
             on this page. */
          text:
            runtime.availability === "unavailable"
              ? `${runtime.name} — unavailable`
              : runtime.name,
        }),
      );
    select.value = draft.runtimeId;
    select.disabled = frozen;
    select.addEventListener("change", () => controller.setRuntime(select.value));
    const runtime = projection.runtime;
    const block = el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "Execution" }),
      settingsRow(
        "Runtime",
        runtime
          ? `${runtime.location}. ${
              runtime.availability === "unavailable"
                ? runtime.unavailableReason
                : "Available for new runs."
            }`
          : "This profile's runtime is not one this host offers.",
        select,
      ),
    );
    if (runtime) {
      const detailLink = action(
        null,
        `Runtime detail: ${runtime.name}`,
        () => openDetail(runtime.id, "runtime-detail"),
        {
          visible: "Runtime detail",
          className: "text-button",
          attrs: { "data-focus-key": "runtime-detail", "data-testid": "open-runtime-detail" },
        },
      );
      const facts = el("dl", { className: "data-list", attrs: { "data-testid": "model-facts" } });
      const line = (term, value) =>
        facts.append(el("dt", { text: term }), el("dd", { text: value }));
      line(
        "Model owner",
        runtime.modelOwner === "courtwork" ? "CourtWork · Models" : `${runtime.name} · its own settings`,
      );
      line("Effective model", runtime.model.effective);
      line("Where that comes from", runtime.model.source);
      /* Requested and effective never collapse into one line. Nothing requested
         is said as nothing requested, not as a repeat of the effective value. */
      line("Requested by this agent", runtime.model.requested ?? "Nothing — this agent makes no model request.");
      block.append(
        facts,
        runtime.model.note ? el("p", { className: "form-help", text: runtime.model.note }) : null,
        el("div", { className: "runtime-row-actions" }, detailLink),
      );
    }
    return block;
  }

  function permissionBlock(projection) {
    const block = el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "Permission scope" }),
      el("p", { className: "form-help", text: REQUEST_NOT_GRANT_SENTENCE }),
    );
    if (!projection.requests.length) {
      block.append(
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "permission-none" },
          text: "No Kit is selected, so this agent requests nothing beyond what its role already needs.",
        }),
      );
      return block;
    }
    const list = el("dl", { className: "data-list", attrs: { "data-testid": "permission-scope" } });
    for (const request of projection.requests) {
      /* Three different silences, and they must not be worded alike: no
         runtime chosen yet, a runtime that cannot do this at all, and a
         runtime that can but whose permission owner has reported nothing.
         Telling the third "choose a runtime" asks for a choice already made. */
      const reading =
        request.supported === null
          ? "Unknown until a runtime is chosen"
          : request.supported === false
            ? `Not supported by ${projection.runtime.name}`
            : request.effect
              ? EFFECT_WORDS[request.effect]
              : "Permission effect not reported";
      list.append(
        el("dt", { text: request.label }),
        el("dd", {
          attrs: { "data-testid": `permission:${request.action}` },
          text: `${reading} · asked for by ${request.kitNames.join(", ")}`,
        }),
      );
    }
    block.append(list);
    return block;
  }

  function saveBlock(profile, projection) {
    const { save } = profile;
    const block = el("div", { className: "settings-block" });
    if (projection.frozen)
      block.append(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "status", "data-banner": "active-run", "data-testid": "active-run-banner" },
          text: ACTIVE_RUN_SENTENCE,
        }),
      );
    if (save.status === "conflict")
      block.append(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "alert", "data-testid": "conflict-banner" },
          text: save.message,
        }),
      );
    else if (save.status === "failed")
      block.append(
        el("p", {
          className: "inline-error",
          attrs: { role: "alert", "data-testid": "save-error" },
          text: save.message,
        }),
      );
    if (profile.notice)
      block.append(
        el("p", {
          className: "runtime-banner",
          attrs: { role: "status", "data-testid": "reload-notice" },
          text: profile.notice,
        }),
      );
    /* The draft summary is the honest version of "unsaved changes": it names
       what is requested, says it is not in effect, and — while a run holds the
       profile — refuses to promise that it will apply itself later. */
    if (profile.dirty) {
      const parts = [];
      const saved = profile.detail.profile;
      if (profile.draft.roleId !== saved.roleId)
        parts.push(`role ${projection.role?.name ?? profile.draft.roleId}`);
      if (
        profile.draft.kitIds.length !== saved.kitIds.length ||
        !profile.draft.kitIds.every((id) => saved.kitIds.includes(id))
      )
        parts.push(
          projection.selectedKits.length
            ? `Kits ${projection.selectedKits.map((kit) => kit.name).join(", ")}`
            : "no Kit",
        );
      if (profile.draft.runtimeId !== saved.runtimeId)
        parts.push(`runtime ${projection.runtime?.name ?? profile.draft.runtimeId}`);
      block.append(
        el("p", {
          className: "runtime-draft-summary",
          attrs: { "data-testid": "draft-summary" },
          text: projection.frozen
            ? `Requested: ${parts.join("; ")}. A run is active, so this is a draft only — it is not applied and it will not apply itself when the run ends.`
            : `Requested: ${parts.join("; ")}. Effective is still what revision ${saved.revision} holds.`,
        }),
      );
    }
    for (const blocker of projection.blockers)
      block.append(
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "save-blocker" },
          text: blocker,
        }),
      );
    const canSave = controller.canSave();
    const saving = save.status === "saving";
    /* An owner that cannot accept this write at all says so here. Without it
       the page shows a dead button and no reason — the exact failure the
       fixture-vs-production boundary exists to prevent. */
    if (!state.capabilities.canSave && state.capabilities.reason)
      block.append(
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "capability-reason" },
          text: state.capabilities.reason,
        }),
      );
    const saveButton = el("button", {
      className: "primary-button",
      text: saving ? "Saving…" : "Save",
      attrs: { type: "button", "data-focus-key": "save", "data-testid": "save" },
    });
    saveButton.disabled = !canSave || saving;
    saveButton.addEventListener("click", () => void controller.save());
    const actions = el("div", { className: "runtime-row-actions" }, saveButton);
    if (profile.dirty) {
      const discard = el("button", {
        className: "text-button",
        text: "Discard changes",
        attrs: { type: "button", "data-focus-key": "discard", "data-testid": "discard" },
      });
      discard.disabled = saving;
      discard.addEventListener("click", () => controller.discardDraft());
      actions.append(discard);
    }
    if (save.status === "conflict") {
      const reload = el("button", {
        className: "quiet-button",
        text: "Reload saved profile",
        attrs: { type: "button", "data-focus-key": "reload", "data-testid": "reload" },
      });
      reload.addEventListener("click", () => void controller.reloadSaved());
      actions.append(reload);
    }
    block.append(actions, el("p", { className: "form-help", text: NOT_AN_ACCEPTANCE_SENTENCE }));
    /* One live region for the receipt. It names the exact revision the owner
       confirmed, because "Saved" alone cannot be checked against anything. */
    const confirmed = save.status === "saved";
    block.append(
      el("p", {
        className: "form-help",
        attrs: {
          role: "status",
          "data-testid": "save-receipt",
          /* Focusable only once it is a finished receipt. While the request is
             out there is nothing to land on yet, and the keyboard waits for
             Save to come back instead. */
          ...(confirmed ? { tabindex: "-1", "data-focus-key": "save-receipt" } : {}),
        },
        text: confirmed
          ? `Saved. This host confirmed revision ${save.revision}; it applies to the next run.`
          : saving
            ? "Saving…"
            : "",
      }),
    );
    return block;
  }

  function renderProfile() {
    const { profile } = state;
    const back = action(
      "arrow-left",
      "Back to agent profiles",
      () => controller.openList({ anchor: profile.id }),
      {
        visible: "Agent profiles",
        className: "text-button",
        attrs: { "data-focus-key": "back", "data-testid": "back" },
      },
    );
    const nodes = [el("div", { className: "runtime-row-actions" }, back)];
    if (profile.status === "error") {
      nodes.push(
        el("p", {
          className: "inline-error",
          attrs: { role: "alert", "data-testid": "profile-error" },
          text: profile.error,
        }),
      );
      return nodes;
    }
    if (!profile.detail) {
      nodes.push(el("p", { className: "form-help", attrs: { role: "status" }, text: "Loading this agent…" }));
      return nodes;
    }
    const detail = profile.detail;
    const projection = profile.projection;
    const frozen = projection.frozen;
    nodes.push(
      el(
        "div",
        { className: "settings-block" },
        el(
          "h4",
          { className: "settings-block-title" },
          semanticIcon("agent.profile", { size: 18 }),
          " ",
          detail.profile.name,
        ),
        el("p", { className: "form-help", text: detail.profile.responsibility }),
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "saved-revision" },
          text: `Saved revision ${detail.profile.revision} · ${savedAtText(detail.profile.savedAt)}${
            detail.profile.activeRun
              ? ` · a run is bound to revision ${detail.profile.activeRun.revision}`
              : ""
          }`,
        }),
      ),
      roleBlock(detail, profile.draft, frozen),
      kitBlock(detail, profile.draft, projection, frozen),
      executionBlock(detail, profile.draft, projection, frozen),
      permissionBlock(projection),
      saveBlock(profile, projection),
    );
    return nodes;
  }

  /* ── Runtime detail ─────────────────────────────────────────────────── */

  function openDetail(runtimeId, focusKey) {
    openerKey = focusKey;
    void controller.openRuntimeDetail(runtimeId);
  }

  function renderDialog() {
    const detail = state.runtimeDetail;
    if (detail.status === "closed") {
      if (dialog.open) dialog.close();
      return;
    }
    const close = action("x", "Close runtime detail", () => dialog.close(), {
      className: "quiet-button",
      attrs: { "data-testid": "close-runtime-detail" },
    });
    const body = el("div", { className: "runtime-dialog-body" });
    if (detail.status === "loading")
      body.append(el("p", { className: "form-help", attrs: { role: "status" }, text: "Reading this runtime…" }));
    else if (detail.status === "error")
      body.append(el("p", { className: "inline-error", attrs: { role: "alert" }, text: detail.error }));
    else {
      const record = detail.record;
      const list = el("dl", { className: "data-list" });
      const line = (term, value) => list.append(el("dt", { text: term }), el("dd", { text: value }));
      line("Where it runs", record.location);
      line(
        "Available for new work",
        record.availability === "available" ? "Yes" : `No. ${record.unavailableReason}`,
      );
      /* Not observed is written as not observed. A version line that quietly
         becomes "unknown → none" would read as a fact about the install. */
      line("Observed version", record.observedVersion ?? "Not observed");
      line("Protocol", record.protocol ?? "Not observed");
      line("Authentication owned by", record.authenticationOwner);
      line(
        "Model chosen by",
        record.modelOwner === "courtwork" ? "CourtWork · Models" : `${record.name} · its own settings`,
      );
      body.append(list, el("p", { className: "form-help", text: record.managementNote }));
    }
    dialog.replaceChildren(
      el(
        "div",
        { className: "runtime-dialog-inner" },
        el(
          "header",
          { className: "runtime-dialog-header" },
          el(
            "div",
            {},
            el("h2", {
              attrs: { id: "agent-runtime-detail-title" },
              text: detail.record ? detail.record.name : "Runtime",
            }),
            el("p", {
              className: "form-help",
              text: detail.record ? `${detail.record.location} · ${detail.record.name}` : "",
            }),
          ),
          close,
        ),
        body,
      ),
    );
    if (!dialog.open) dialog.showModal();
    /* Replacing the dialog's contents destroys whatever held the keyboard, and
       a modal that has dropped focus to `body` cannot be left with Escape by a
       keyboard user. Put it back on the close control whenever that happens —
       the reply arriving is not a reason to lose the dialog. */
    if (!dialog.contains(document.activeElement)) close.focus();
  }

  function render() {
    const owned = focusKeyNow();
    /* Only resume a pending restore while nobody else has taken the keyboard.
       If focus has moved on — to another control here or to anything outside
       this panel — the wait is over and this surface does not take it back. */
    const unclaimed = !document.activeElement || document.activeElement === document.body;
    const key = owned || (unclaimed ? pendingFocusKey : null);
    if (owned || !unclaimed) pendingFocusKey = null;
    mount.replaceChildren(...(state.view === "list" ? renderList() : renderProfile()));
    renderDialog();
    /* Focus belongs to the modal while one is open; reaching back into the
       panel underneath it would be refused by the browser and land on `body`. */
    if (!dialog.open) restore(key);
  }

  const unsubscribe = controller.subscribe((next) => {
    const previous = state;
    state = next;
    render();
    /* Arriving somewhere is a move, not a repaint: entering a profile puts the
       keyboard on its first control, and coming back puts it on the row you
       left from. Neither happens on an ordinary state change. */
    if (previous.view !== next.view) {
      if (next.view === "list" && next.anchorId)
        mount.querySelector(`[data-focus-key="${CSS.escape(`row:${next.anchorId}`)}"]`)?.focus();
      else if (next.view === "profile") mount.querySelector('[data-focus-key="back"]')?.focus();
    }
  });

  return {
    render,
    dispose() {
      unsubscribe();
      dialog.remove();
    },
  };
}
