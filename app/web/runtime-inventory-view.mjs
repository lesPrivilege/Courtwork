/* Settings → Runtimes · the view of the Host's runtime inventory.
 *
 * It renders one controller state (runtime-inventory.mjs) and sends back three
 * intents: open a runtime, go back to the list, read again. Its own state is
 * only which control the keyboard is on and which disclosure is open.
 *
 * Anatomy is the accepted synthetic journey's (runtime-management-view.mjs)
 * and the Settings page's own: a `.settings-row` per runtime with one next
 * action, `.data-list` for a reading, `.settings-advanced` for the technical
 * detail, and the Host Extensions block's heading-with-refresh. No new shape,
 * spacing, type, colour or icon.
 *
 * Three facts are kept apart on every surface, because the page must not let
 * one imply another: whether the Host has it configured, whether the Host can
 * describe it now (availability, with the Host's own reason), and whether
 * anybody has checked it live — which, for this read, is always no.
 */

import { el, action } from "./ui-controls.mjs";

export const NOT_CHECKED = "Live status not checked";
export const READ_ONLY_SENTENCE = "Configured runtimes. Live status is not checked.";

/* Presentation names for the ids this build knows; any other id is shown as
   the Host reports it. */
export function runtimeName(adapterId) {
  if (/^pi-coding-agent@/.test(adapterId)) return "Pi";
  if (adapterId === "agents-api") return "Agents API";
  return adapterId;
}

/* The closed R1 operation set, in the order a run meets them. An operation
   this build does not name is still listed, by its key. */
const OPERATIONS = [
  ["start", "Start a run"],
  ["continue", "Continue a chat"],
  ["steer", "Steer a run in progress"],
  ["cancel", "Cancel a run"],
  ["compact", "Compact the context"],
  ["recover", "Recover a run after a restart"],
  ["submitToolResult", "Answer a tool call"],
];

function operationRows(capabilities) {
  const known = new Map(OPERATIONS);
  const keys = [...OPERATIONS.map(([key]) => key).filter((key) => key in capabilities),
    ...Object.keys(capabilities).filter((key) => !known.has(key))];
  return keys.map((key) => {
    const support = capabilities[key];
    return [
      known.get(key) ?? key,
      support?.supported ? "Supported" : `Not supported.${support?.reason ? ` ${support.reason}` : ""}`,
      key,
    ];
  });
}

function stateWords(item) {
  return item.availability.status === "configured" ? "Configured" : "Unavailable";
}

const helpText = (text, attrs) => el("span", { className: "settings-row-help", text, attrs });

export function createRuntimeInventoryView(mount, controller, { onRendered } = {}) {
  let state = controller.getState();
  const openDisclosures = new Set();

  /* Runtime ids carry dots and slashes; compare the attribute rather than
     escaping it into a selector. */
  const node = (key) => [...mount.querySelectorAll("[data-focus-key]")].find((entry) => entry.getAttribute("data-focus-key") === key) ?? null;

  function refreshButton() {
    return action("refresh-cw", "Refresh runtimes", () => void controller.refresh(), {
      className: "quiet-button",
      attrs: { "data-focus-key": "refresh", "data-testid": "refresh" },
    });
  }

  /* One status line under the heading; the live region is always present so
     its changes are announced. */
  function readingStatus({ items }) {
    const { reading } = state;
    const region = el("div", { attrs: { role: "status", "data-testid": "reading-status", "data-status": reading.status } });
    if (reading.status === "loading" || reading.status === "idle")
      region.append(el("p", {
        className: "form-help",
        text: reading.inventory ? `Reading again… the ${items} below are the previous reading.` : "Reading this Host's runtimes…",
      }));
    return region;
  }
  function readingError({ items }) {
    const { reading } = state;
    if (reading.status !== "error") return null;
    return el(
      "div",
      { className: "inline-error", attrs: { role: "alert", "data-testid": "reading-error" } },
      el("p", { text: reading.inventory ? `${reading.error} The ${items} below are the last reading that succeeded.` : reading.error }),
    );
  }

  /* ── List ───────────────────────────────────────────────────────────── */

  function listRow(item, defaultId) {
    const name = runtimeName(item.adapterId);
    const control = action("chevron-right", `Details: ${name}`, () => controller.openRuntime(item.adapterId), {
      visible: "Details",
      trailing: true,
      className: "quiet-button",
      attrs: { "data-focus-key": `row:${item.adapterId}`, "data-testid": `row-action:${item.adapterId}` },
    });
    return el(
      "div",
      { className: "settings-row", attrs: { "data-testid": `runtime-row:${item.adapterId}` } },
      el(
        "div",
        { className: "settings-row-text" },
        el("span", { className: "settings-row-title", text: item.adapterId === defaultId ? `${name} · Host default` : name }),
        helpText(`${stateWords(item)} · ${NOT_CHECKED.toLowerCase()}`, { "data-testid": `row-state:${item.adapterId}` }),
        item.availability.reason ? helpText(item.availability.reason, { "data-testid": `row-reason:${item.adapterId}` }) : null,
      ),
      el("div", { className: "settings-row-control" }, control),
    );
  }

  function renderList() {
    const { reading } = state;
    const inventory = reading.inventory;
    const group = el("section", {
      attrs: { "aria-label": "Runtimes", "data-testid": "runtime-list", "aria-busy": String(reading.status === "loading") },
    });
    const children = [readingStatus({ items: "rows" }), readingError({ items: "rows" })];
    if (reading.status === "ready" && !inventory.items.length)
      children.push(el("p", { className: "form-help", attrs: { "data-testid": "list-empty" }, text: "This Host reports no execution runtimes." }));
    if (inventory) children.push(...inventory.items.map((item) => listRow(item, inventory.defaultAdapterId)));
    group.append(...children.filter(Boolean));
    return [
      el("div", { className: "section-heading" }, el("h4", { className: "settings-block-title", text: "Runtimes" }), refreshButton()),
      el("p", { className: "settings-row-help", text: READ_ONLY_SENTENCE }),
      group,
    ];
  }

  /* ── One runtime ────────────────────────────────────────────────────── */

  /* RFS-R2 · the status and operation values are the reading this page exists
     for, so they take the reading role; their labels and the technical ids
     keep the metadata role of `.data-list`. */
  function facts(testid, rows, { reading = false } = {}) {
    const list = el("dl", { className: reading ? "data-list runtime-inventory-reading" : "data-list", attrs: { "data-testid": testid } });
    for (const [term, value, key] of rows)
      list.append(el("dt", { text: term }), el("dd", { text: value, attrs: key ? { "data-testid": `${testid}:${key}` } : undefined }));
    return list;
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

  function detailBlocks(item, defaultId) {
    const name = runtimeName(item.adapterId);
    const unavailable = item.availability.status !== "configured";
    const identity = el(
      "div",
      { className: "settings-block" },
      el("h4", { className: "settings-block-title", attrs: { "data-testid": "runtime-name" }, text: name }),
      facts("status", [
        ["Configuration", item.configured ? "Configured on this Host" : "Not configured on this Host", "configured"],
        /* `configured` availability is the Host's reading that this runtime's
           own port describes it under the current provider — not that it is
           reachable. */
        ["Availability", unavailable ? `Unavailable. ${item.availability.reason ?? ""}`.trim() : "Described by this Host for the current provider", "availability"],
        ["Live status", "Not checked", "live"],
        ["Host default", item.adapterId === defaultId ? "Yes" : "No", "default"],
      ], { reading: true }),
    );
    const operations = el(
      "div",
      { className: "settings-block", attrs: { "data-testid": "operations-block" } },
      el("h4", { className: "settings-block-title", text: "Declared operations" }),
    );
    /* The heading and the visible "Live status: Not checked" already say
       these are declared, not checked (UX simplification 2026-09-28). */
    if (item.capabilities) operations.append(facts("operations", operationRows(item.capabilities), { reading: true }));
    else
      operations.append(el("p", {
        className: "runtime-inventory-reading-text",
        attrs: { "data-testid": "operations-absent" },
        text: "Not reported: the Host has no current description of this runtime.",
      }));
    const technical = el(
      "div",
      { className: "settings-block" },
      disclosure(
        "technical",
        "Technical detail",
        facts("technical", [
          ["Owner", "This Host's configuration. Settings reads it and cannot change it.", "owner"],
          ["Runtime id", item.adapterId, "id"],
          ["Configured revision", item.revision ?? "None", "revision"],
          ["Configuration fingerprint", item.configurationRef ?? "None", "ref"],
          ["Reason code", item.availability.reasonCode ?? "None", "reason-code"],
        ]),
      ),
    );
    return [identity, operations, technical];
  }

  function renderRuntime() {
    const { reading, selectedId } = state;
    const back = action("arrow-left", "Back to runtimes", () => controller.openList(), {
      visible: "Runtimes",
      className: "text-button",
      attrs: { "data-focus-key": "back", "data-testid": "back" },
    });
    const nodes = [
      el("div", { className: "section-heading" }, back, refreshButton()),
      readingStatus({ items: "values" }),
      readingError({ items: "values" }),
    ];
    const inventory = reading.inventory;
    if (!inventory) return nodes;
    const item = inventory.items.find((entry) => entry.adapterId === selectedId);
    if (!item) {
      nodes.push(el("p", {
        className: "form-help",
        attrs: { "data-testid": "runtime-missing" },
        text: `The latest reading does not include ${runtimeName(selectedId)}.`,
      }));
      return nodes;
    }
    /* M1 · the runtime detail's compact block rhythm, as in the synthetic
       journey: the plain container only scopes the inherited spacing. */
    nodes.push(el(
      "div",
      { attrs: { style: "--settings-group-gap: var(--space-4)", "data-testid": "runtime-detail" } },
      ...detailBlocks(item, inventory.defaultAdapterId),
    ));
    return nodes;
  }

  function render() {
    const active = document.activeElement;
    const owned = active && mount.contains(active) ? active.getAttribute("data-focus-key") : null;
    mount.replaceChildren(...(state.view === "list" ? renderList() : renderRuntime()).filter(Boolean));
    /* Back on the same control after a re-render, the view must not jump. */
    if (owned) node(owned)?.focus({ preventScroll: true });
    onRendered?.();
  }

  const unsubscribe = controller.subscribe((next) => {
    const previous = state;
    state = next;
    render();
    /* Arriving somewhere is a move: entering a runtime puts the keyboard on its
       way back, and coming back puts it on the row left from. */
    if (previous.view === next.view && previous.selectedId === next.selectedId) return;
    if (next.view === "runtime") node("back")?.focus();
    /* A runtime the latest reading no longer includes has no row: the list's
       own control takes the keyboard instead of <body>. */
    else (node(`row:${next.anchorId}`) ?? node("refresh"))?.focus();
  });

  return {
    render,
    dispose() {
      unsubscribe();
    },
  };
}
