/* WO-WK13, revised by FE-01 item 4 (WK-94 / 96 / 97) · Home's modules below the
 * composer.
 *
 * Home reads from the centre downwards: orientation, then the composer as the
 * one L1 anchor, then the modules. The three recorded totals are no longer a
 * band above the composer — they are the head of the Today module underneath
 * it, one strip of three numbers with no card frame (WK-94, visual review §5).
 * This module owns the Today strip and the module list; the composer is the
 * application's own mounted composer and is untouched here.
 *
 * Every number and every word below comes through `presentation-adapters.mjs`.
 * Nothing in this file reads the response shape, decides what a count means, or
 * computes a time — those belong to the adapter, so that a display change
 * cannot silently change a metric (boundaries §5, WK-34 / WK-80).
 */
import { el, icon, action } from "./ui-controls.mjs";
import { runLabels } from "./inspector.mjs";
import {
  toStatTiles,
  toWorkCards,
  toPendingRows,
  toInspectionRows,
} from "./presentation-adapters.mjs";

/* The three sets of DC-2, in the order the top band states them. A tile and the
 * section it filters to carry the same name: two names for one set would be a
 * second vocabulary for one fact (copy-convention §3). */
export const homeSets = [
  "pendingItems",
  "sessionCandidates",
  "inspectionCandidates",
];
const setLabels = {
  pendingItems: "Waiting for you",
  sessionCandidates: "In progress",
  inspectionCandidates: "Needs a look",
};
/* One condition sentence per empty set: what would put something here. */
const emptyLabels = {
  pendingItems: "Questions and approval requests will appear here.",
  sessionCandidates: "Your chats will appear here.",
  inspectionCandidates: "Runs recorded failed or unknown will appear here.",
};
const setGlyphs = {
  pendingItems: "message-square",
  sessionCandidates: "message-square",
  inspectionCandidates: "activity",
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
function recordedTime(card) {
  const started = stamp(card.runStartedAt);
  if (started) {
    const ended = stamp(card.runEndedAt);
    return ended ? `Run ${started} – ${ended}` : `Run started ${started}`;
  }
  const created = stamp(card.sessionCreatedAt);
  return created ? `Created ${created}` : null;
}
const projectLine = (name) => name ?? "Project not resolved";

/* ── Today · the module head ──────────────────────────────────────────────
 * Three numbers on one strip. SH-1: a plain statistic stays flat — the tile is
 * a control because it does something (it filters the module list to its own
 * set, DC-2 overlap allowed), not because a frame was drawn round a number.
 * WK-94 · the Heatmap `Backend pending` row is gone: an implementation state is
 * not production Home copy, and the day-by-day count has no data source to
 * appear for (WK-96 "Activity / Calendar 位只在有数据源时出现"). */
export function renderHomeBand(
  container,
  { summary, load, activeSet, onFilter },
) {
  const tiles = toStatTiles(summary, {
    scope: { projectId: null },
    observedAt: summary?.observedAt ?? null,
    load,
  });
  const row = el("div", { className: "stat-row" });
  tiles.forEach((tile, index) => {
    const key = homeSets[index];
    const missing = tile.value === null;
    const reading = missing ? tile.missingLabel : String(tile.value);
    const button = el(
      "button",
      {
        className: "home-stat",
        attrs: {
          type: "button",
          "aria-pressed": String(activeSet === key),
          /* The accessible name is the set and its count (WO-WK13 item 2); the
           * caption is the definition and is read as the description. */
          "aria-label": `${tile.label}, ${reading}`,
          "aria-describedby": `stat-caption-${key}`,
          "data-set": key,
          "data-focus-key": `stat:${key}`,
        },
      },
      el(
        "span",
        { className: "stat-inline" },
        el("span", { className: "stat-label", text: tile.label }),
        el("span", {
          className: missing ? "stat-value is-missing" : "stat-value",
          text: reading,
        }),
      ),
      el("span", {
        className: "stat-caption",
        text: tile.caption,
        attrs: { id: `stat-caption-${key}` },
      }),
    );
    button.addEventListener("click", () =>
      onFilter(activeSet === key ? null : key),
    );
    row.append(button);
  });
  const inner = el(
    "div",
    { className: "home-band-inner" },
    el("h3", { className: "home-module-title", text: "Today" }),
    row,
  );
  /* ux-conventions §4 · while a read is failing the tiles keep the last values
   * they confirmed, so the band must say when that was. With no failure the
   * numbers are current and the line would be noise. */
  const observedAt = stamp(tiles[0].observedAt);
  if (load.error && observedAt)
    inner.append(
      el("p", {
        className: "home-observed",
        text: `Last confirmed ${observedAt}.`,
      }),
    );
  container.replaceChildren(inner);
}

/* ── lower band ───────────────────────────────────────────────────────────
 * WK-56 · the row and the card are two states of one WorkCard fed by one
 * adapter output. The row is the standing state of the three-set list; the card
 * is the state the set takes when the band is filtered to it alone, where the
 * recorded run time and an explicit Open have room to be stated. */
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

/* The card anatomy is the rail's (WK-47 (2)): glyph 16, the object's own name,
 * one state word, one trailing action — then rows. No nested card, no progress
 * bar, no percentage. The frame is a hairline rather than the rail card's
 * floating material, because this card sits on the L1 panel (WK-69). */
function workCard(card, onOpen) {
  const status = card.runStatus;
  const open = action("chevron-right", `Open ${card.title}`, onOpen, {
    className: "quiet-button rail-open",
    attrs: {
      /* The one control the list keyboard activates for this card, so that
       * Enter / o and a pointer reach the same target (FN-05). */
      "data-nav-open": "",
      "data-focus-key": `home:open:${card.sessionId}`,
    },
  });
  open.classList.remove("icon-only");
  open.replaceChildren(
    el("span", { className: "button-label", text: "Open" }),
    icon("chevron-right", { size: 16 }),
  );
  const time = recordedTime(card);
  return el(
    "article",
    {
      className: "home-card",
      attrs: {
        tabindex: "-1",
        "data-nav-item": "",
        "data-focus-key": `home:sessionCandidates:${card.sessionId}`,
      },
    },
    el(
      "div",
      { className: "rail-card-head" },
      icon(setGlyphs.sessionCandidates, { size: 16 }),
      el("h4", { className: "rail-card-title", text: card.title }),
      el("span", {
        className: stateWordClass("rail-card-state", status),
        text: status ? runLabels[status] || status : card.missingRunLabel,
      }),
      open,
    ),
    el("p", {
      className: "home-card-meta",
      text: projectLine(card.projectName),
    }),
    time ? el("p", { className: "home-card-meta", text: time }) : null,
  );
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
    icon(setGlyphs.pendingItems, { size: 16 }),
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
    icon(setGlyphs.inspectionCandidates, { size: 16 }),
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
  if (page.truncated)
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

export function renderHome(
  container,
  {
    summary,
    error,
    loading,
    projects,
    activeSet,
    onSession,
    onRetry,
    onMore,
    onFilter,
  },
) {
  const previousFocus = container.contains(document.activeElement)
    ? document.activeElement?.dataset?.focusKey
    : null;
  const home = el("div", { className: "home-view" });
  if (error) {
    /* WK-94 / visual review §7 · an unreachable runtime is a connection state,
     * not a horizontal panel of its own. One line says which connection is
     * unavailable and offers the one action; the message the host actually
     * returned is the disclosure underneath, so the diagnosis is still one
     * click away and never the loudest thing on Home (FN-28). */
    const retry = el("button", {
      className: "text-button",
      attrs: { type: "button", "aria-label": "Retry loading your workspace" },
      text: "Retry",
    });
    retry.addEventListener("click", onRetry);
    home.append(
      el(
        "div",
        { className: "connection-line" },
        el("span", { className: "connection-dot", attrs: { "aria-hidden": "true" } }),
        el("span", {
          className: "connection-line-text",
          text: "Local runtime unavailable",
        }),
        retry,
        el(
          "details",
          { className: "connection-diagnosis" },
          el("summary", { text: "Details" }),
          el("p", { className: "form-help", text: error }),
        ),
      ),
    );
  } else if (loading && !summary)
    home.append(
      el("p", { className: "form-help", text: "Loading your workspace…" }),
    );
  if (summary) {
    if (activeSet) {
      /* Without this line the only way back to the three sets is to press the
       * same tile a second time in another band, which nothing on screen says. */
      const all = el("button", {
        className: "text-button",
        attrs: { type: "button", "aria-label": "Show all work" },
        text: "Show all",
      });
      all.addEventListener("click", () => onFilter(null));
      home.append(el("div", { className: "home-filter-line" }, all));
    }
    const sets = {
      pendingItems: toPendingRows(summary, projects),
      sessionCandidates: toWorkCards(summary, projects),
      inspectionCandidates: toInspectionRows(summary, projects),
    };
    for (const key of homeSets) {
      if (activeSet && key !== activeSet) continue;
      const { items, page } = sets[key];
      /* WK-47 · a section holding nothing and expecting nothing is a divider
       * without a fact. The session set is the exception: Home exists for that
       * list, so its condition sentence is the answer to an empty screen. */
      if (!activeSet && key !== "sessionCandidates" && page && !page.total)
        continue;
      const section = el(
        "section",
        { className: "home-section" },
        el(
          "div",
          { className: "section-heading" },
          el("h3", { text: setLabels[key] }),
          el("span", {
            className: "count-badge",
            text: page ? page.total : "—",
          }),
        ),
      );
      const open = (item, options) => () => onSession(item, options);
      /* WK-115 ② · Home 下带的行是一条列表，会话里的未决卡是另一条；两者不合并。
       * 行本身是 button / article，所以列表项是包着它的那一层：把 role 直接写在
       * 按钮上会把按钮语义换掉，而这些行正是靠「可按」在说自己能做什么。 */
      const listNode = el("div", {
        className: "home-list",
        attrs: { role: "list" },
      });
      const listItem = (node) =>
        el("div", { className: "home-list-item", attrs: { role: "listitem" } }, node);
      if (key === "pendingItems")
        for (const item of items)
          listNode.append(
            listItem(
              pendingRow(item, open(item, { question: true, inspect: false })),
            ),
          );
      else if (key === "inspectionCandidates")
        for (const item of items)
          listNode.append(
            listItem(
              inspectionRow(item, open(item, { question: false, inspect: true })),
            ),
          );
      else
        for (const item of items)
          listNode.append(
            listItem(
              (activeSet === key ? workCard : workRow)(
                item,
                open(item, { question: false, inspect: false }),
              ),
            ),
          );
      if (listNode.childElementCount) section.append(listNode);
      section.append(...pageNotes(key, page, items, onMore));
      home.append(section);
    }
  }
  container.replaceChildren(home);
  if (previousFocus)
    container
      .querySelector(`[data-focus-key="${CSS.escape(previousFocus)}"]`)
      ?.focus();
}
