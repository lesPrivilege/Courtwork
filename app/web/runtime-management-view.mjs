/* Settings → Agents → Runtimes · the view.
 *
 * It renders one controller state and sends back intents. Its own state is
 * only what belongs to a screen: which control the keyboard is on, the caret
 * inside the field being typed in, and which disclosures are open.
 *
 * Anatomy is the Settings page's own and the Agent profiles view's
 * (agent-profiles-view.mjs): `settingsRow` for a property, a `.settings-block`
 * per decision, `.runtime-banner` for a condition that holds the whole runtime,
 * `.data-list` for a reading, `.settings-advanced` for detail on demand. No new
 * shape, spacing, type, colour or icon family. The page is ordered the way the
 * decision is made: what it is and who owns it, how it is connected, whether it
 * takes new work, how to end the connection, what came before, and — only when
 * asked — the diagnostic facts.
 *
 * Re-render is whole-panel with focus restored by `data-focus-key`, the same
 * mechanism as agent-profiles-view.mjs; the caret is carried across it so a
 * field can be typed into while the page re-renders under it.
 */

import { el, action, icon } from "./ui-controls.mjs";
import { settingsRow } from "./settings-view.mjs";

/* Said once, where the decision is made. The two halves are separate facts and
 * the page must not let one imply the other. */
export const DISABLE_SENTENCE =
  "Disabling applies from the next admission: an agent that chooses this runtime cannot start a new run on it. Runs already bound keep their recorded binding. Nothing is stopped, moved or queued.";
export const LEAVING_IS_NOT_CANCELLING =
  "Leaving this page does not cancel it.";

const RECEIPT_WORDS = {
  connect: "Connected",
  reconnect: "Reconnected",
  disable: "Disabled for new work",
  enable: "Enabled for new work",
  disconnect: "Disconnected",
};
const PENDING_WORDS = {
  connect: "Connecting",
  reconnect: "Reconnecting",
  disable: "Disabling for new work",
  enable: "Enabling for new work",
  disconnect: "Disconnecting",
};
const ACTION_LABELS = {
  connect: "Connect",
  reconnect: "Reconnect",
  disable: "Disable for new work",
  enable: "Enable for new work",
  disconnect: "Disconnect…",
};

/* An owner-supplied instant, with its date; an unparsable one stays unknown. */
function whenText(iso) {
  const at = new Date(iso);
  return Number.isNaN(at.valueOf()) ? "time not recorded" : at.toLocaleString();
}

function sentenceList(items) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);

/* The platform's `append(null)` inserts the text "null"; a missing optional
 * node here is simply absent. */
const put = (parent, ...children) => parent.append(...children.flat().filter(Boolean));

const helpText = (text, attrs) => el("span", { className: "settings-row-help", text, attrs });

function connectionWords(state, availability) {
  if (availability.status === "unavailable") return `Unavailable. ${availability.reason}`;
  return { connected: "Connected", disconnected: "Disconnected", "not-connected": "Not connected" }[state];
}

function ownerWords(owner, name) {
  return owner === "courtwork" ? "Configured by CourtWork" : `Configured in ${name}`;
}

export function createRuntimeManagementView(mount, controller) {
  let state = controller.getState();
  /* Open disclosures, by key. A whole-panel render must not close the detail
     somebody just opened. */
  const openDisclosures = new Set();

  /* Where the keyboard goes when the control it was on cannot take it back: a
     command disables its own button, and a successful connect replaces it. Each
     chain ends at the command status, which says what happened and holds Check
     status or Reload when there is one. */
  const FOCUS_CHAIN = {
    connect: ["connect", "command-status"],
    reconnect: ["reconnect", "command-status"],
    disable: ["disable", "command-status"],
    enable: ["enable", "command-status"],
    "disconnect-confirm": ["disconnect", "command-status"],
    "disconnect-cancel": ["disconnect"],
    "check-status": ["check-status", "command-status"],
    /* Reload settles a conflict: the conflict's region goes, and the notice
       that says what was reloaded is where the keyboard continues. */
    reload: ["command-status", "reload-notice", "back"],
    "command-status": ["command-status", "reload-notice", "back"],
    discard: ["label"],
  };
  let pendingFocusKey = null;

  function node(key) {
    return mount.querySelector(`[data-focus-key="${CSS.escape(key)}"]`);
  }

  function restore(key, caret) {
    if (!key) return;
    const chain = FOCUS_CHAIN[key] || [key];
    for (const candidate of chain) {
      const target = node(candidate);
      if (target && !target.disabled) {
        /* Back on the same control after a re-render, the view must not jump.
           Moving to another control is a move, and it is scrolled into view —
           the section's scroll-padding keeps it clear of the sticky title. */
        target.focus({ preventScroll: candidate === key });
        if (caret && candidate === key) target.setSelectionRange?.(caret.start, caret.end);
        pendingFocusKey = null;
        return;
      }
    }
    /* A request in flight is a wait, not a loss: the control exists but cannot
       hold focus yet. */
    pendingFocusKey = chain.some((candidate) => node(candidate)) ? key : null;
  }

  function disclosure(key, summary, ...children) {
    const details = el(
      "details",
      { className: "settings-advanced", attrs: { "data-testid": `disclosure:${key}` } },
      el("summary", { text: summary, attrs: { "data-focus-key": `disclosure:${key}` } }),
      ...children,
    );
    details.open = openDisclosures.has(key);
    details.addEventListener("toggle", () => {
      if (details.open) openDisclosures.add(key);
      else openDisclosures.delete(key);
    });
    return details;
  }

  /* ── List ───────────────────────────────────────────────────────────── */

  function rowOperationLine(row) {
    const operation = state.operations[row.id];
    if (!operation) return null;
    const text =
      operation.status === "pending"
        ? `${PENDING_WORDS[operation.kind]}… still waiting for an answer.`
        : operation.status === "unknown" || operation.status === "checking"
          ? "The last command's outcome is not known. Open it to check its status."
          : operation.status === "conflict"
            ? "Changed elsewhere since your last command. Open it to reload."
            : operation.status === "confirmed"
              ? `Preview receipt: ${RECEIPT_WORDS[operation.kind].toLowerCase()} at revision ${operation.receipt.revision}.`
              : null;
    return text ? helpText(text, { "data-testid": `row-operation:${row.id}` }) : null;
  }

  function listRow(row) {
    const reading = [
      connectionWords(row.connection, row.availability),
      row.availability.status === "available"
        ? row.admission.effective
          ? "takes new work"
          : row.admission.saved === "disabled"
            ? "disabled for new work"
            : "not taking new work"
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const use = [
      row.usedBy.length ? `Used by ${sentenceList(row.usedBy)}` : "No agent profile chooses it",
      row.boundRunCount ? `${row.boundRunCount} run bound now` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const control = action("chevron-right", `${row.nextAction.label}: ${row.name}`, () => controller.openRuntime(row.nextAction.targetId), {
      visible: row.nextAction.label,
      trailing: true,
      className: "quiet-button",
      attrs: { "data-focus-key": `row:${row.id}`, "data-testid": `row-action:${row.id}` },
    });
    return el(
      "div",
      { className: "settings-row", attrs: { "data-testid": `runtime-row:${row.id}` } },
      el(
        "div",
        { className: "settings-row-text" },
        el(
          "span",
          { className: "settings-row-title" },
          icon("cpu", { size: 16 }),
          " ",
          row.name,
          row.example ? " · example" : "",
        ),
        helpText(`${row.location} · ${ownerWords(row.configurationOwner, row.name)}`),
        helpText(reading, { "data-testid": `row-state:${row.id}` }),
        helpText(use),
        rowOperationLine(row),
      ),
      el("div", { className: "settings-row-control" }, control),
    );
  }

  function renderList() {
    const { list } = state;
    const pending = list.status === "loading";
    const nodes = [
      el("h4", { className: "settings-block-title", text: "Runtimes" }),
      el("p", {
        className: "form-help",
        text: "A runtime is the engine an agent runs on. Models keeps provider and model connections; Tools keeps extensions and hooks.",
      }),
    ];
    const group = el("section", {
      attrs: { "aria-label": "Runtimes", "data-testid": "runtime-list", "aria-busy": String(pending) },
    });
    if (pending && list.rows.length)
      put(group,
        el("p", {
          className: "form-help",
          attrs: { role: "status", "data-testid": "list-pending" },
          text: "Reading the current runtimes… the rows below are the previous reading.",
        }),
      );
    else if (pending)
      put(group, el("p", { className: "form-help", attrs: { role: "status", "data-testid": "list-loading" }, text: "Loading runtimes…" }));
    if (list.status === "error")
      put(group,
        el("p", { className: "inline-error", attrs: { role: "alert", "data-testid": "list-error" }, text: list.error }),
        list.rows.length
          ? el("p", { className: "form-help", text: "The rows below are the last reading that succeeded." })
          : null,
        el("div", { className: "runtime-row-actions" },
          el("button", {
            className: "quiet-button",
            text: "Read again",
            attrs: { type: "button", "data-focus-key": "list-retry", "data-testid": "list-retry" },
          })),
      );
    if (list.status === "ready" && !list.rows.length)
      put(group,
        el("p", {
          className: "form-help",
          attrs: { "data-testid": "list-empty" },
          text: "No runtime is reported on this host. A runtime appears here once its owner reports it; nothing is searched for.",
        }),
      );
    put(group, ...list.rows.map(listRow));
    group.querySelector('[data-focus-key="list-retry"]')?.addEventListener("click", () => void controller.openList());
    nodes.push(group);
    return nodes;
  }

  /* ── Runtime ────────────────────────────────────────────────────────── */

  function commandStatus(page) {
    const operation = state.operations[page.id];
    const region = (className, role, focusable, ...children) =>
      el(
        "div",
        {
          className,
          attrs: {
            role,
            "data-testid": "command-status",
            "data-status": operation?.status ?? "none",
            ...(focusable ? { tabindex: "-1", "data-focus-key": "command-status" } : {}),
          },
        },
        ...children,
      );
    if (!operation) return region("form-help", "status", false);
    const kind = operation.kind;
    if (operation.status === "pending")
      return region(
        "form-help",
        "status",
        false,
        el("p", { text: `Preview command · ${PENDING_WORDS[kind]} ${operation.runtimeName}… ${LEAVING_IS_NOT_CANCELLING}` }),
      );
    if (operation.status === "unknown" || operation.status === "checking") {
      const check = el("button", {
        className: "quiet-button",
        text: operation.status === "checking" ? "Checking…" : "Check status",
        attrs: { type: "button", "data-focus-key": "check-status", "data-testid": "check-status" },
      });
      check.disabled = operation.status === "checking";
      check.addEventListener("click", () => void controller.checkStatus());
      return region(
        "runtime-banner",
        "alert",
        true,
        el("p", { text: `${operation.message} The command to ${ACTION_LABELS[kind].replace("…", "").toLowerCase()} may or may not have taken effect.` }),
        el("p", { text: "Nothing else can change this runtime until Check status settles it. Checking asks about this exact command; it does not send it again. Your draft is kept." }),
        el("div", { className: "runtime-row-actions" }, check),
      );
    }
    if (operation.status === "conflict") {
      const reload = el("button", {
        className: "quiet-button",
        text: "Reload runtime",
        attrs: { type: "button", "data-focus-key": "reload", "data-testid": "reload" },
      });
      reload.addEventListener("click", () => void controller.reload());
      return region(
        "runtime-banner",
        "alert",
        true,
        el("p", { text: operation.message }),
        el("div", { className: "runtime-row-actions" }, reload),
      );
    }
    if (operation.status === "refused")
      return region("inline-error", "alert", true, el("p", { text: operation.message }));
    if (operation.status === "not-applied")
      return region(
        "runtime-banner",
        "status",
        true,
        el("p", {
          text: "Checked: the host has no record of that command, so nothing changed. Your draft is kept, and you can send it again.",
        }),
      );
    /* confirmed */
    const receipt = operation.receipt;
    const detail = page.detail;
    const lines = [
      el("p", {
        text: `Preview receipt · ${RECEIPT_WORDS[kind]}. The preview confirmed ${operation.runtimeName} at revision ${receipt.revision}${
          receipt.connectionId ? ` · connection ${receipt.connectionId}` : ""
        }.`,
      }),
    ];
    if (operation.readBack === "reading") lines.push(el("p", { text: "Reading it back…" }));
    else if (operation.readBack === "failed")
      lines.push(el("p", { text: "It could not be read back yet. The receipt above stands; reopen this runtime to read it again." }));
    else if (operation.readBack === "done" && detail) {
      const facts = [`Read back: revision ${detail.revision}`];
      if (detail.connection.connectionId) facts.push(`connection ${detail.connection.connectionId}`);
      if (detail.facts.protocol && (kind === "connect" || kind === "reconnect")) facts.push(detail.facts.protocol);
      lines.push(el("p", { text: `${facts.join(" · ")}. ${detail.admission.effectiveReason}` }));
      if ((kind === "disable" || kind === "enable") && detail.boundRuns.length)
        lines.push(
          el("p", {
            text: `${sentenceList(detail.boundRuns.map((run) => `${run.runId} keeps revision ${run.bindingRevision}`))}; ${detail.boundRuns.length === 1 ? "it was" : "they were"} not stopped, moved or queued.`,
          }),
        );
    }
    return region("form-help", "status", true, ...lines);
  }

  function commandButton(kind, { primary = false } = {}) {
    const availability = controller.availability(kind);
    const button = el("button", {
      className: primary ? "primary-button" : "quiet-button",
      text: kind === "reconnect" && state.page.dirty ? "Reconnect with changes" : ACTION_LABELS[kind],
      attrs: { type: "button", "data-focus-key": kind, "data-testid": `action:${kind}` },
    });
    button.disabled = !availability.allowed;
    button.addEventListener("click", () => {
      if (kind === "disconnect") {
        controller.askToDisconnect();
        node("disconnect-cancel")?.focus();
      } else void controller.run(kind);
    });
    /* The reason sits beside the action it explains, never in a tooltip. */
    const reason = availability.reason
      ? el("p", { className: "form-help", attrs: { "data-testid": `reason:${kind}` }, text: availability.reason })
      : null;
    return { button, reason };
  }

  function identityBlock(page) {
    const { detail } = page;
    const used = detail.usedBy.length
      ? `Used by ${sentenceList(detail.usedBy.map((profile) => profile.name))}.`
      : "No agent profile chooses it.";
    return el(
      "div",
      { className: "settings-block" },
      el(
        "h4",
        { className: "settings-block-title" },
        icon("cpu", { size: 18 }),
        " ",
        detail.name,
        detail.example ? " · example" : "",
      ),
      el("p", {
        className: "form-help",
        attrs: { "data-testid": "runtime-state" },
        text: `${detail.location} · ${connectionWords(detail.connection.state, detail.availability)} · ${
          detail.admission.effective ? "takes new work" : "not taking new work"
        }`,
      }),
      el("p", { className: "form-help", attrs: { "data-testid": "used-by" }, text: used }),
      el("p", {
        className: "form-help",
        attrs: { "data-testid": "saved-revision" },
        text: `Saved revision ${detail.revision} · ${whenText(detail.savedAt)}`,
      }),
      /* The last command's outcome belongs to the runtime as a whole, so it
         sits with its identity; the live region is always present so its
         changes are announced. */
      commandStatus(page),
    );
  }

  function ownershipBlock(detail) {
    const facts = el("dl", { className: "data-list", attrs: { "data-testid": "ownership" } });
    const line = (term, value) => facts.append(el("dt", { text: term }), el("dd", { text: value }));
    line("Configuration", detail.ownership.configuration);
    line("Sign-in", detail.ownership.authentication);
    line("Model", detail.ownership.model);
    return el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "Who configures it" }),
      facts,
    );
  }

  function authenticationLine(detail, draft) {
    const auth = detail.authentication;
    if (auth.owner === "native") {
      const status = {
        "reported-signed-in": `${detail.name} reports a signed-in session.`,
        "not-reported": `${detail.name} has not reported a signed-in session yet.`,
        unknown: "Not known while it is unavailable.",
      }[auth.status];
      return [
        el("p", { className: "form-help", attrs: { "data-testid": "auth-status" }, text: `Sign-in: ${status}` }),
        auth.nativeNextStep
          ? el("p", { className: "form-help", attrs: { "data-testid": "native-next-step" }, text: `Next step, in ${detail.name}: ${auth.nativeNextStep}` })
          : null,
      ];
    }
    const select = el("select", {
      attrs: { "aria-label": "Credential reference", "data-focus-key": "credential-ref", "data-testid": "credential-ref" },
    });
    select.append(el("option", { attrs: { value: "" }, text: "Choose a reference" }));
    for (const ref of auth.references)
      select.append(
        el("option", {
          attrs: { value: ref.id },
          text: ref.status === "configured" ? ref.label : `${ref.label} — no key in Models`,
        }),
      );
    select.value = draft.credentialRefId ?? "";
    select.addEventListener("change", () => controller.setDraft("credentialRefId", select.value));
    return [
      settingsRow(
        "Credential reference",
        "Keys are added and replaced in Models. This only chooses which reference the runtime uses; no key is shown or typed here.",
        select,
      ),
    ];
  }

  /* The same facts, read only: shown when the owner does not offer the
     command, so nothing on screen looks editable that is not. */
  function savedAuthentication(detail) {
    if (detail.authentication.owner === "native") return authenticationLine(detail, null);
    const saved = detail.connection.configuration?.credentialRefId;
    const ref = detail.authentication.references.find((entry) => entry.id === saved);
    return [
      el("p", {
        className: "form-help",
        attrs: { "data-testid": "auth-status" },
        text: `Credential reference: ${ref ? ref.label : "none chosen"}.`,
      }),
    ];
  }

  function connectionBlock(page) {
    const { detail, draft } = page;
    const connection = detail.connection;
    const block = el(
      "div",
      { className: "settings-block", attrs: { "data-testid": "connection-block" } },
      el("h4", { className: "settings-block-title", text: "Connection" }),
    );
    put(block,
      el("p", {
        className: "form-help",
        attrs: { "data-testid": "connection-reading" },
        text:
          connection.state === "connected"
            ? `Connected as “${connection.configuration.label}” · connection ${connection.connectionId} · since ${whenText(connection.since)}.`
            : connection.state === "disconnected"
              ? "Not connected now. Earlier connections and their runs are kept under History."
              : "Never connected on this host.",
      }),
    );
    const kind = detail.actions.connect ? "connect" : detail.actions.reconnect ? "reconnect" : null;
    if (!kind) return block;
    const supported = detail.actions[kind].supported;
    if (supported) {
      const label = el("input", {
        attrs: {
          type: "text",
          "aria-label": "Connection name",
          "data-focus-key": "label",
          "data-testid": "connection-label",
          autocomplete: "off",
          maxlength: "80",
        },
      });
      label.value = draft.label;
      label.addEventListener("input", () => controller.setDraft("label", label.value));
      put(block, settingsRow("Connection name", "Your name for this connection. It is how it appears in lists.", label));
      put(block, ...authenticationLine(detail, draft));
      if (kind === "connect")
        put(block,
          disclosure(
            "proposal",
            "What connecting writes, and what it leaves alone",
            el("p", { className: "form-help", text: "Writes:" }),
            el("ul", { attrs: { "data-testid": "proposal-writes" } }, ...detail.proposal.writes.map((text) => el("li", { text }))),
            el("p", { className: "form-help", text: "Leaves alone:" }),
            el("ul", { attrs: { "data-testid": "proposal-leaves" } }, ...detail.proposal.leaves.map((text) => el("li", { text }))),
          ),
        );
      else
        put(block,
          el("p", {
            className: "form-help",
            text: `Reconnecting keeps connection ${connection.connectionId} and its history, and applies the name and sign-in above.`,
          }),
        );
    } else put(block, ...savedAuthentication(detail));
    if (page.dirty) {
      const parts = [`name “${draft.label}”`];
      const ref = detail.authentication.references.find((entry) => entry.id === draft.credentialRefId);
      if (detail.authentication.owner === "courtwork") parts.push(ref ? `reference ${ref.label}` : "no reference chosen");
      put(block,
        el("p", {
          className: "runtime-draft-summary",
          attrs: { "data-testid": "draft-summary" },
          text: `Requested: ${parts.join("; ")}. Not applied; saved is revision ${detail.revision}.`,
        }),
      );
    }
    const { button, reason } = commandButton(kind, { primary: true });
    const actions = el("div", { className: "runtime-row-actions" }, button);
    if (page.dirty) {
      const discard = el("button", {
        className: "text-button",
        text: "Discard changes",
        attrs: { type: "button", "data-focus-key": "discard", "data-testid": "discard" },
      });
      discard.disabled = state.operations[page.id]?.status === "pending";
      discard.addEventListener("click", () => controller.discardDraft());
      put(actions, discard);
    }
    put(block, actions, reason);
    return block;
  }

  function admissionBlock(page) {
    const { detail } = page;
    const block = el(
      "div",
      { className: "settings-block", attrs: { "data-testid": "admission-block" } },
      el("h4", { className: "settings-block-title", text: "New work" }),
    );
    const facts = el("dl", { className: "data-list", attrs: { "data-testid": "admission" } });
    const line = (term, value, testid) => facts.append(el("dt", { text: term }), el("dd", { text: value, attrs: { "data-testid": testid } }));
    line("Saved setting", detail.admission.saved === "enabled" ? "Enabled for new work" : "Disabled for new work", "admission-saved");
    line("Next admission", detail.admission.effectiveReason, "admission-effective");
    for (const run of detail.boundRuns)
      line(
        `Bound · ${run.runId}`,
        `${run.agentName} is running on revision ${run.bindingRevision}. It keeps that binding whatever changes here.`,
        `bound:${run.runId}`,
      );
    put(block, facts);
    const kind = detail.actions.disable ? "disable" : detail.actions.enable ? "enable" : null;
    if (kind) {
      put(block,
        el("p", {
          className: "form-help",
          text: kind === "disable" ? DISABLE_SENTENCE : "Enabling applies from the next admission. It starts nothing now.",
        }),
      );
      const { button, reason } = commandButton(kind);
      put(block, el("div", { className: "runtime-row-actions" }, button), reason);
    }
    return block;
  }

  function disconnectBlock(page) {
    const { detail } = page;
    if (!detail.actions.disconnect) return null;
    const block = el(
      "div",
      { className: "settings-block", attrs: { "data-testid": "disconnect-block" } },
      el("h4", { className: "settings-block-title", text: "End this connection" }),
      el("p", {
        className: "form-help",
        text: `Disconnecting removes connection ${detail.connection.connectionId} only. ${possessive(detail.name)} installation, its own settings and every run recorded under this connection stay.`,
      }),
    );
    const { button, reason } = commandButton("disconnect");
    if (page.confirming === "disconnect") {
      button.disabled = true;
      const confirm = el("button", {
        className: "primary-button",
        text: `Disconnect ${detail.name}`,
        attrs: { type: "button", "data-focus-key": "disconnect-confirm", "data-testid": "disconnect-confirm" },
      });
      confirm.addEventListener("click", () => void controller.run("disconnect"));
      const cancel = el("button", {
        className: "text-button",
        text: "Cancel",
        attrs: { type: "button", "data-focus-key": "disconnect-cancel", "data-testid": "disconnect-cancel" },
      });
      cancel.addEventListener("click", () => controller.cancelConfirmation());
      const affected = detail.usedBy.length
        ? `${sentenceList(detail.usedBy.map((profile) => profile.name))} will not be able to start a run on ${detail.name} until it is connected again.`
        : "No agent profile chooses it.";
      const region = el(
        "div",
        {
          className: "runtime-banner",
          attrs: { role: "group", "aria-label": `Confirm disconnecting ${detail.name}`, "data-testid": "disconnect-confirmation" },
        },
        el("p", { text: `Disconnect ${detail.connection.connectionId}? ${affected} Nothing already recorded is removed.` }),
        el("div", { className: "runtime-row-actions" }, confirm, cancel),
      );
      region.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        controller.cancelConfirmation();
      });
      put(block, el("div", { className: "runtime-row-actions" }, button), region);
    } else put(block, el("div", { className: "runtime-row-actions" }, button), reason);
    return block;
  }

  function historyBlock(detail) {
    if (!detail.history.length) return null;
    const list = el("dl", { className: "data-list", attrs: { "data-testid": "history" } });
    for (const entry of detail.history)
      list.append(
        el("dt", { text: `${entry.label} · ${entry.connectionId}` }),
        el("dd", {
          attrs: { "data-testid": `history:${entry.connectionId}` },
          text: `${whenText(entry.connectedAt)} to ${whenText(entry.disconnectedAt)} · ${entry.runsRecorded} runs recorded; their history is kept.`,
        }),
      );
    return el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", text: "History" }),
      list,
    );
  }

  function technicalBlock(detail) {
    const facts = el("dl", { className: "data-list", attrs: { "data-testid": "technical" } });
    const line = (term, value) => facts.append(el("dt", { text: term }), el("dd", { text: value }));
    line("Runtime id", detail.id);
    line("Observed version", detail.facts.observedVersion ?? "Not observed");
    line("Protocol", detail.facts.protocol ?? "Not observed");
    line("Can do", detail.facts.capabilities.length ? detail.facts.capabilities.join(", ") : "Not reported");
    for (const metric of detail.facts.process ?? []) line(metric.label, metric.value);
    if (!detail.facts.process) line("Process", "Not running under a connection");
    return el("div", { className: "settings-block" }, disclosure("technical", "Technical detail", facts));
  }

  function renderRuntime() {
    const { page } = state;
    const back = action("arrow-left", "Back to runtimes", () => controller.openList({ anchor: page.id }), {
      visible: "Runtimes",
      className: "text-button",
      attrs: { "data-focus-key": "back", "data-testid": "back" },
    });
    const nodes = [el("div", { className: "runtime-row-actions" }, back)];
    if (page.status === "error" && !page.detail) {
      nodes.push(el("p", { className: "inline-error", attrs: { role: "alert", "data-testid": "runtime-error" }, text: page.error }));
      return nodes;
    }
    if (!page.detail) {
      nodes.push(el("p", { className: "form-help", attrs: { role: "status", "data-testid": "runtime-loading" }, text: "Reading this runtime…" }));
      return nodes;
    }
    const detail = page.detail;
    if (page.status === "loading")
      nodes.push(el("p", { className: "form-help", attrs: { role: "status", "data-testid": "runtime-refreshing" }, text: "Reading this runtime again… the values below are the previous reading." }));
    if (page.status === "error")
      nodes.push(el("p", { className: "inline-error", attrs: { role: "alert", "data-testid": "runtime-error" }, text: `${page.error} The values below are the last reading that succeeded.` }));
    nodes.push(identityBlock(page));
    if (page.notice)
      nodes.push(el("p", { className: "runtime-banner", attrs: { role: "status", tabindex: "-1", "data-focus-key": "reload-notice", "data-testid": "reload-notice" }, text: page.notice }));
    if (!state.capabilities.canManage && state.capabilities.reason)
      nodes.push(el("p", { className: "form-help", attrs: { "data-testid": "capability-reason" }, text: state.capabilities.reason }));
    nodes.push(
      ownershipBlock(detail),
      connectionBlock(page),
      admissionBlock(page),
      disconnectBlock(page),
      historyBlock(detail),
      technicalBlock(detail),
    );
    return nodes;
  }

  function render() {
    const active = document.activeElement;
    const owned = active && mount.contains(active) ? active.getAttribute("data-focus-key") : null;
    /* The caret belongs to the person typing; rebuilding the field under them
       must not move it. */
    const caret =
      owned && typeof active.selectionStart === "number"
        ? { start: active.selectionStart, end: active.selectionEnd }
        : null;
    const unclaimed = !active || active === document.body;
    const key = owned || (unclaimed ? pendingFocusKey : null);
    if (owned || !unclaimed) pendingFocusKey = null;
    mount.replaceChildren(...(state.view === "list" ? renderList() : renderRuntime()).filter(Boolean));
    restore(key, caret);
  }

  const unsubscribe = controller.subscribe((next) => {
    const previous = state;
    state = next;
    render();
    /* Arriving somewhere is a move: entering a runtime puts the keyboard on its
       way back, and coming back puts it on the row you left from. */
    const arrived = previous.view !== next.view || (next.view === "runtime" && previous.page?.id !== next.page?.id);
    if (arrived) {
      if (next.view === "list" && next.anchorId) node(`row:${next.anchorId}`)?.focus();
      else if (next.view === "runtime") node("back")?.focus();
    }
  });

  return {
    render,
    dispose() {
      unsubscribe();
    },
  };
}
