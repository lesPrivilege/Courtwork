/* GUI grammar convergence G1 (2026-09-19) · Home below the composer.
 *
 * The composer is the anchor; identity sits above it, in the composer's own
 * intro. Everything here hangs below it as blocks in order of relative
 * importance: Waiting for you → Attention → Needs a look → Continue →
 * Activity. A block with nothing to show is absent. Each block's default layer
 * is a label, a count and at most HOME_ROWS unframed rows; the rest opens in
 * place ("Show all") or at the block's own destination. No block is a card.
 *
 * Every number and every word below comes through `presentation-adapters.mjs`.
 * Nothing in this file reads the response shape, decides what a count means, or
 * computes a time — those belong to the adapter, so that a display change
 * cannot silently change a metric (boundaries §5, WK-34 / WK-80).
 */
import { el, icon } from "./ui-controls.mjs";
import { runLabels } from "./inspector.mjs";
import {
  toHomeActivity,
  toHomeAttention,
  toWorkCards,
  toPendingRows,
  toInspectionRows,
} from "./presentation-adapters.mjs";

/* The three sets of DC-2. A set and the block that shows it carry one name:
 * two names for one set would be a second vocabulary for one fact
 * (copy-convention §3). */
export const homeSets = [
  "pendingItems",
  "sessionCandidates",
  "inspectionCandidates",
];
/* Reading order of the blocks (UX-09: actionable → recent → ambient). */
const blockOrder = [
  "pendingItems",
  "attention",
  "inspectionCandidates",
  "sessionCandidates",
  "activity",
];
export const HOME_ROWS = 3;
const setLabels = {
  pendingItems: "Waiting for you",
  sessionCandidates: "Continue",
  inspectionCandidates: "Needs a look",
};
/* One condition sentence per empty set: what would put something here. */
const emptyLabels = {
  pendingItems: "Questions and approval requests will appear here.",
  sessionCandidates: "Your chats will appear here.",
  inspectionCandidates: "Runs recorded failed or unknown will appear here.",
};
const setGlyphs = {
  pendingItems: null,
  sessionCandidates: "message-square",
  inspectionCandidates: null,
};

/* ux-conventions §1 · a state word is grey. Only the two words that ask for a
 * person — a run waiting on you, and a run that failed — take ink. `unknown` is
 * not `failed` and stays grey (FN-28). */
function stateWordClass(base, status) {
  if (status === "waiting_user") return `${base} is-waiting`;
  if (status === "failed") return `${base} is-failed`;
  return base;
}

/* The instant is the server's own UTC stamp; the browser renders it in its own
 * zone. There is no "2 hours ago" here: the response carries no such field and
 * the frontend does not infer one (ux-conventions §3). */
function stamp(value) {
  const date = new Date(value || "");
  return Number.isFinite(date.valueOf())
    ? date.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
}
const projectLine = (name) => name ?? "Project not resolved";

/* Home modules registry (WO-CC-D0-a · contracts/home-modules.md). Only modules
 * with an established read seam are installed; both render as Home blocks on
 * the Modules layout. Models has no read of its own and renders nothing here. */
export const homeModules = [
  { id: "activity", title: "Activity", source: "work-activity", installed: true },
  { id: "attention", title: "Attention", source: "attention/query", installed: true },
  { id: "models", title: "Models", source: null, installed: true },
];

function homeButton(text, handler, key, className = "text-button") {
  const button = el("button", { text, className, attrs: { type: "button", "data-focus-key": key } });
  button.addEventListener("click", handler);
  return button;
}
/* A block's label line: the name, its count, and the one way to more. */
function blockHeading(title, count, more) {
  return el("div", { className: "section-heading" },
    el("h3", { text: title }),
    count === null ? null : el("span", { className: "count-badge", text: String(count) }),
    more);
}
function moduleError(noun, error, hasData, retry) {
  return el("div", { className: "home-module-error", attrs: { role: "status" } },
    el("span", { text: `${noun} unavailable.${hasData ? " Showing the last loaded records." : ""}` }),
    homeButton("Retry", retry, `retry-${noun.toLowerCase()}`),
    el("details", {}, el("summary", { text: "Details" }), el("p", { text: error })));
}

/* ── rows ──────────────────────────────────────────────────────────────────
 * One row anatomy for every Home block (GUI grammar G1): glyph where the set has
 * one, the object's name, one meta line, one state word, the chevron. Home rows
 * point to objects; the object itself opens at its own surface. */
function workRow(card, onOpen) {
  const status = card.runStatus;
  const button = el(
    "button",
    {
      className: "home-row",
      attrs: {
        type: "button",
        "data-nav-item": "",
        "data-focus-key": `home:sessionCandidates:${card.sessionId}`,
      },
    },
    icon(setGlyphs.sessionCandidates, { size: 16 }),
    el(
      "span",
      { className: "home-row-content" },
      el("span", { className: "home-row-title", text: card.title }),
      el("span", {
        className: "home-row-meta",
        text: projectLine(card.projectName),
      }),
    ),
    el("span", {
      className: stateWordClass("home-row-status", status),
      text: status ? runLabels[status] || status : card.missingRunLabel,
    }),
    icon("chevron-right", { size: 16 }),
  );
  button.addEventListener("click", onOpen);
  return button;
}

function pendingRow(item, onOpen) {
  const button = el(
    "button",
    {
      className: "home-row",
      attrs: {
        type: "button",
        "data-nav-item": "",
        "data-focus-key": `home:pendingItems:${item.questionId}`,
      },
    },
    setGlyphs.pendingItems ? icon(setGlyphs.pendingItems, { size: 16 }) : null,
    el(
      "span",
      { className: "home-row-content" },
      el("span", { className: "home-row-title", text: item.title }),
      el("span", {
        className: "home-row-meta",
        text: projectLine(item.projectName),
      }),
    ),
    /* A pending request is the one thing on this screen waiting on a person, so
     * its word takes the scarce ink (WK-36: three accents to a screen). */
    el("span", { className: "home-row-status is-waiting", text: item.label }),
    icon("chevron-right", { size: 16 }),
  );
  button.addEventListener("click", onOpen);
  return button;
}

function inspectionRow(item, onOpen) {
  const button = el(
    "button",
    {
      className: "home-row",
      attrs: {
        type: "button",
        "data-nav-item": "",
        "data-focus-key": `home:inspectionCandidates:${item.runId}`,
      },
    },
    setGlyphs.inspectionCandidates ? icon(setGlyphs.inspectionCandidates, { size: 16 }) : null,
    el(
      "span",
      { className: "home-row-content" },
      el("span", { className: "home-row-title", text: item.title }),
      el("span", {
        className: "home-row-meta",
        text: projectLine(item.projectName),
      }),
    ),
    el("span", {
      className: stateWordClass("home-row-status", item.status),
      text: runLabels[item.status] || item.status,
    }),
    icon("chevron-right", { size: 16 }),
  );
  button.addEventListener("click", onOpen);
  return button;
}

/* DC-1 · a failed read, an empty set and a truncated page are three different
 * things, and each gets its own sentence. None of them is a silent empty list. */
function pageNotes(key, page, items, onMore) {
  if (!page)
    return [
      el("p", {
        className: "form-help",
        text: "This list was not part of the last answer.",
      }),
    ];
  const notes = [];
  if (!items.length)
    notes.push(
      el("p", {
        className: "form-help",
        text: page.total
          ? "No items on this page. Refresh to reconcile this list."
          : emptyLabels[key],
      }),
    );
  /* Luna F-03 · the server marks every offset page truncated; after merging
   * pages the displayed set can already hold everything. The sentence states
   * what is missing from the screen, not which page carried it. */
  if (page.truncated && items.length < page.total)
    notes.push(
      el("p", {
        className: "form-help",
        text: `Showing ${items.length} of ${page.total}. Some items are outside this page.`,
      }),
    );
  if (page.hasMore) {
    const more = el("button", {
      className: "text-button",
      attrs: { type: "button" },
      text: "Load more",
    });
    more.addEventListener("click", () => onMore(key, page.nextOffset));
    notes.push(more);
  }
  return notes;
}

/* ── blocks ────────────────────────────────────────────────────────────────
 * Each block renders into its own slot with its own fingerprint. An unrelated
 * read (Attention, Activity, the summary's observation time) must not detach a
 * button between native pointerdown and click, and callbacks always dispatch
 * to the latest caller. */
function setBlock(key, { sets, activeSet }, call) {
  if (!sets) return null;
  if (activeSet && key !== activeSet) return null;
  const { items, page } = sets[key];
  /* WK-47 · a set holding nothing and expecting nothing is a divider without a
   * fact. Continue is the exception: Home exists for that list, so its
   * condition sentence is the answer to an empty screen. */
  if (!activeSet && key !== "sessionCandidates" && page && !page.total) return null;
  const shown = activeSet ? items : items.slice(0, HOME_ROWS);
  const more = !activeSet && page && page.total > shown.length
    ? homeButton("Show all", () => call("onFilter", key), `home-more:${key}`)
    : null;
  if (more) more.setAttribute("aria-label", `Show all ${setLabels[key]}`);
  /* The block itself is a focus target of last resort (Luna F-04): when the
   * control that opened a set is gone and the set is empty, focus lands on the
   * block whose heading names where it is. It is not in the tab sequence. */
  const section = el("section", { className: "home-section", attrs: { "data-home-block": key, tabindex: "-1" } },
    blockHeading(setLabels[key], page ? page.total : null, more));
  const open = (item, options) => () => call("onSession", item, options);
  /* WK-115 ② · the row is a button, so the list item is the layer around it:
   * a role on the button would replace the semantics the row relies on. */
  const listNode = el("div", { className: "home-list", attrs: { role: "list" } });
  const listItem = (node) => el("div", { className: "home-list-item", attrs: { role: "listitem" } }, node);
  for (const item of shown) {
    const row = key === "pendingItems" ? pendingRow(item, open(item, { question: true, inspect: false }))
      : key === "inspectionCandidates" ? inspectionRow(item, open(item, { question: false, inspect: true }))
      : workRow(item, open(item, { question: false, inspect: false }));
    listNode.append(listItem(row));
  }
  if (listNode.childElementCount ?? listNode.children.length) section.append(listNode);
  if (activeSet || !items.length || !page) section.append(...pageNotes(key, page, shown, (...args) => call("onMore", ...args)));
  return { node: section, print: { key, shown, total: page?.total ?? null, page: Boolean(page), activeSet: activeSet || null, more: Boolean(more) } };
}

function attentionRow(item, projectName, onOpen) {
  const button = el("button", { className: "home-row", attrs: { type: "button", "data-nav-item": "", "data-focus-key": `home:attention:${item.id}` } },
    el("span", { className: "home-row-content" },
      el("span", { className: "home-row-title", text: item.title }),
      el("span", { className: "home-row-meta", text: projectLine(projectName) })),
    /* Attention state is not Today's "Waiting for you": review keeps its own
     * role colour and never borrows the run accent (home-composition §State). */
    el("span", { className: item.status === "needs_you" ? "home-row-status is-review" : "home-row-status", text: item.label }),
    icon("chevron-right", { size: 16 }));
  button.addEventListener("click", (event) => onOpen(item.id, event.currentTarget ?? button));
  return button;
}
function attentionBlock(modules, projects, call) {
  if (!modules?.attention) return null;
  const { attention } = modules;
  const data = toHomeAttention(attention.data);
  const projectName = projects?.find((project) => project.id === attention.projectId)?.name ?? null;
  if (!attention.error && (!data || !data.count)) return null;
  const more = data && data.count > data.items.length
    ? homeButton("Show all", (event) => call("onOpenAttentionWorkspace", event?.currentTarget ?? null), "home-more:attention")
    : null;
  if (more) more.setAttribute("aria-label", "Show all Attention items");
  const section = el("section", { className: "home-section", attrs: { "data-home-block": "attention" } },
    blockHeading("Attention", data ? data.count : null, more));
  if (attention.error) section.append(moduleError("Attention", attention.error, Boolean(data), () => call("onAttentionRetry")));
  if (data?.items.length) {
    const list = el("div", { className: "home-list", attrs: { role: "list" } });
    for (const item of data.items.slice(0, HOME_ROWS))
      list.append(el("div", { className: "home-list-item", attrs: { role: "listitem" } },
        attentionRow(item, projectName, (id, trigger) => call("onAttentionOpen", id, trigger))));
    section.append(list);
  }
  return { node: section, print: { data: data && { count: data.count, items: data.items.slice(0, HOME_ROWS) }, error: attention.error || null, projectName } };
}

function heatmap(data) {
  const selected = el("p", { className: "home-activity-day", text: `${data.buckets[0].date} — ${data.buckets.at(-1).date}`, attrs: { "aria-live": "polite" } });
  const grid = el("div", { className: "home-heatmap", attrs: { role: "group", "aria-label": "Daily retained runs, UTC. Arrow keys move between days." } });
  const offset = (new Date(`${data.buckets[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  grid.style?.setProperty?.("--heatmap-weeks", String(Math.ceil((offset + data.buckets.length) / 7)));
  for (let i = 0; i < offset; i++) grid.append(el("span", { attrs: { "aria-hidden": "true" } }));
  const cells = data.buckets.map((bucket, index) => {
    const button = homeButton("", () => { selected.textContent = bucket.label; }, `activity-day-${bucket.date}`, "home-heatmap-cell");
    button.setAttribute("data-level", String(bucket.level));
    button.setAttribute("data-tooltip", bucket.label);
    button.setAttribute("aria-label", bucket.label);
    button.tabIndex = index === data.buckets.length - 1 ? 0 : -1;
    button.addEventListener("focus", () => {
      cells.forEach(cell => { cell.tabIndex = cell === button ? 0 : -1; });
      selected.textContent = bucket.label;
    });
    button.addEventListener("keydown", event => {
      const row = (offset + index) % 7;
      const delta = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: row === 0 ? 0 : -1, ArrowDown: row === 6 ? 0 : 1 }[event.key];
      if (delta === undefined && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? cells.length - 1 : Math.max(0, Math.min(cells.length - 1, index + delta));
      cells[next].focus();
    });
    return button;
  });
  grid.append(...cells);
  return [grid, selected];
}
/* Activity is ambient history: one flat object, last, collapsible in place
 * (UX-03). The heatmap stays; the collapse is the reader's own preference. */
function activityBlock(modules, call) {
  if (!modules?.activity) return null;
  const { activity } = modules;
  const data = toHomeActivity(activity.data, activity.days);
  /* The widest period holding nothing means there is no history to show. A
   * narrower empty period keeps the block so its period control stays put, but
   * says so in one line: an all-zero grid is a dense instrument stating
   * nothing (Luna F-02, UX-09 "a zero category does not occupy a block"). */
  if (!activity.error && (!data || (!data.total && activity.days === 84))) return null;
  const empty = Boolean(data) && !data.total;
  const summaryLine = data ? `${data.total} recorded ${data.total === 1 ? "run" : "runs"} · ${data.days} days` : null;
  const summary = el("summary", { className: "home-activity-summary", attrs: { "data-focus-key": "home-activity-toggle" } },
    el("h3", { text: "Activity" }),
    summaryLine ? el("span", { className: "home-activity-total", text: summaryLine }) : null,
    /* The disclosure's own affordance: it turns with the open state. */
    icon("chevron-right", { size: 14 }));
  const body = el("div", { className: "home-activity-body" });
  const ranges = el("div", { className: "home-range", attrs: { role: "group", "aria-label": "Activity period" } });
  for (const days of [28, 84]) {
    const button = homeButton(`${days}d`, () => call("onActivityDays", days), `activity-days-${days}`);
    button.setAttribute("aria-pressed", String(activity.days === days));
    ranges.append(button);
  }
  const usage = modules.onOpenUsage ? homeButton("Open Usage", () => call("onOpenUsage"), "open-usage") : null;
  body.append(el("div", { className: "home-activity-controls" }, ranges, usage));
  if (activity.error) body.append(moduleError("Activity", activity.error, Boolean(data), () => call("onActivityRetry")));
  if (empty)
    body.append(el("p", { className: "home-insight-note", text: `No runs recorded in the last ${data.days} days.` }));
  else if (data) {
    body.append(...heatmap(data), el("p", { className: "home-insight-note", text: data.coverage }));
    if (activity.error) body.append(el("p", { className: "home-insight-note", text: `Last confirmed ${stamp(data.observedAt)}.` }));
  }
  const details = el("details", { className: "home-activity" }, summary, body);
  if (!modules.activityCollapsed) details.setAttribute("open", "");
  details.addEventListener("toggle", () => {
    const open = details.open === true || details.hasAttribute("open");
    call("onActivityCollapse", !open);
  });
  const section = el("section", { className: "home-section", attrs: { "data-home-block": "activity" } }, details);
  return { node: section, print: { data: data && { total: data.total, days: data.days, buckets: empty ? null : data.buckets, coverage: data.coverage }, empty, days: activity.days, error: activity.error || null, usage: Boolean(usage) } };
}

const homeRenders = new WeakMap();

function skeleton(container, retained) {
  const home = el("div", { className: "home-view" });
  retained.slots = {};
  for (const key of ["status", "filter", ...blockOrder]) {
    const slot = el("div", { className: "home-slot", attrs: { "data-home-slot": key } });
    retained.slots[key] = slot;
    home.append(slot);
  }
  retained.prints = {};
  container.replaceChildren(home);
  retained.home = home;
}
function fill(retained, key, result) {
  const slot = retained.slots[key];
  const print = JSON.stringify(result?.print ?? null);
  if (retained.prints[key] === print && (result ? slot.children.length : !slot.children.length)) return;
  const focused = slot.contains(document.activeElement) ? document.activeElement?.dataset?.focusKey : null;
  if (result) slot.replaceChildren(result.node); else slot.replaceChildren();
  slot.hidden = !result;
  retained.prints[key] = print;
  if (focused) slot.querySelector(`[data-focus-key="${CSS.escape(focused)}"]`)?.focus();
}

export function renderHome(container, options) {
  const { summary, error, loading, projects, activeSet } = options;
  let retained = homeRenders.get(container);
  if (!retained) {
    retained = {};
    homeRenders.set(container, retained);
  }
  retained.options = options;
  // Retained nodes always dispatch to the latest caller. No synthetic click.
  const call = (name, ...args) => retained.options[name]?.(...args);
  const modules = options.modules ?? null;
  if (retained.home?.parentNode !== container) skeleton(container, retained);
  const sets = summary ? {
    pendingItems: toPendingRows(summary, projects),
    sessionCandidates: toWorkCards(summary, projects),
    inspectionCandidates: toInspectionRows(summary, projects),
  } : null;

  let status = null;
  if (error) {
    /* WK-94 / visual review §7 · an unreachable runtime is a connection state,
     * not a panel of its own. One line names the connection and offers the one
     * action; the host's own message is the disclosure underneath (FN-28). */
    const retry = el("button", { className: "text-button", attrs: { type: "button", "aria-label": "Retry loading your workspace", "data-focus-key": "home-retry" }, text: "Retry" });
    retry.addEventListener("click", () => call("onRetry"));
    status = { node: el("div", { className: "connection-line" },
      el("span", { className: "connection-dot", attrs: { "aria-hidden": "true" } }),
      el("span", { className: "connection-line-text", text: "Local runtime unavailable" }),
      retry,
      el("details", { className: "connection-diagnosis" }, el("summary", { text: "Details" }), el("p", { className: "form-help", text: error }))),
      print: { error } };
  } else if (loading && !summary)
    status = { node: el("p", { className: "form-help", text: "Loading your workspace…" }), print: { loading: true } };
  fill(retained, "status", status);

  let filter = null;
  if (summary && activeSet) {
    /* The way back from one expanded set to the whole of Home. */
    const all = el("button", { className: "text-button", attrs: { type: "button", "aria-label": "Show all work", "data-focus-key": "home-all-work" }, text: "All work" });
    all.addEventListener("click", () => call("onFilter", null));
    filter = { node: el("div", { className: "home-filter-line" }, all), print: { activeSet } };
  }
  fill(retained, "filter", filter);

  const context = { sets, activeSet };
  /* One expanded set takes the whole of Home; the modules step aside. */
  const blockModules = activeSet ? null : modules;
  for (const key of blockOrder) {
    const result = key === "attention" ? attentionBlock(blockModules, projects, call)
      : key === "activity" ? activityBlock(blockModules, call)
      : setBlock(key, context, call);
    fill(retained, key, result);
  }
}
