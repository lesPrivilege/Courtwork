// The specimen's orchestration shell.
//
// app.mjs is the product's orchestration layer: it holds the session token, the
// fetch base, the polling loop and the browser storage. None of that can exist
// on a static page, so it is the one module the specimen does not copy. This
// file replaces it with the smallest thing that works: take a snapshot out of
// the recorded JSON and hand it to the product's own rendering functions.
//
// Everything that would reach the network in the product is a stub here:
//   dispatch  refuses, and says on screen that the request was not sent;
//   query     answers out of the recorded projection;
//   request   answers out of the recorded workspace files.
// No fetch, no storage, no timer that outlives a step.
import { el, copyAction } from "./vendor-product/web/ui-controls.mjs";
import { formatBytes, createFileView, runLabels } from "./vendor-product/web/inspector.mjs";
import { projectThread, permissionPresentation } from "./vendor-product/web/thread-projection.mjs";
import { renderUserMessage } from "./vendor-product/web/user-message.mjs";
import { renderRecordedContext } from "./vendor-product/web/runtime-view.mjs";
import { mount } from "./vendor-product/extensions/inbound-nda/renderer.mjs";
import { STEPS, REPLAY_NOTE, LAYERS } from "./copy.mjs";
import { readRecordedSource } from "./recorded-source.mjs";

const root = document.getElementById("specimen");
const recordingUrl = root.dataset.recording;
const sha7 = root.dataset.sha7;

const recording = await (await fetch(recordingUrl)).json();
const runIds = recording.runOrder;
const sessionId = recording.session.id;

/** Every event of the session, in the order the runtime recorded them. */
const allEvents = runIds.flatMap((id) => recording.events[id].events);
const allRuns = runIds.map((id) => recording.runs[id]);

/** The events a step is allowed to have seen, by `upTo` event type. */
function sliceFor(step) {
  const runId = runIds[step.run];
  const events = allEvents.filter((event) => event.runId === runId);
  if (!step.upTo) return events;
  const end = events.findIndex((event) => event.type === step.upTo);
  return end === -1 ? events : events.slice(0, end + 1);
}

// ---- the stubs -------------------------------------------------------------

class ReplayRefusal extends Error {
  constructor(action, payload) {
    super("replay · not sent");
    this.status = 405;
    this.action = action;
    this.payload = payload;
  }
}

let onRefusal = () => {};

/** The product calls this to send a human decision. Here it never sends. */
async function dispatch(action, payload) {
  onRefusal(action, payload);
  throw new ReplayRefusal(action, payload);
}

/** The product calls this to read the bytes a finding cites. */
async function query(kind, request) {
  if (kind !== "source") return null;
  return readRecordedSource(currentProjection(), request);
}

/** The product calls this to read a file. Answers out of the recording. */
async function request(endpoint) {
  const url = new URL(endpoint, "http://recording.invalid");
  const path = url.searchParams.get("path");
  const file = recording.workspaceFiles[path];
  if (!file) throw new Error("The file response does not match this target.");
  return file;
}

// ---- state -----------------------------------------------------------------

let index = 0;
let surfaceState = null;
let mounted = null;

const step = () => STEPS[index];
function currentProjection() {
  const name = surfaceState ?? step().surface;
  return name ? recording.surface[name]?.projection ?? null : null;
}

// ---- chrome ----------------------------------------------------------------

const label = el("p", {
  className: "specimen-label is-mono",
  text: `Interactive NDA walkthrough`,
});

const counter = el("p", { className: "specimen-counter" });
const stepList = el("div", {
  className: "specimen-steps",
  attrs: { role: "tablist", "aria-label": "Recorded steps" },
});
const stepButtons = STEPS.map((entry, position) => {
  const button = el("button", {
    className: "specimen-step",
    text: `${position + 1}. ${entry.seen}`,
    attrs: { type: "button", role: "tab", id: `step-${entry.id}` },
  });
  button.addEventListener("click", () => go(position));
  return button;
});
stepList.append(...stepButtons);
// Left and right walk the step list, which is what a tablist promises. The
// walk starts from whichever step has focus, not from whichever is selected:
// the two can differ once a reader has tabbed into the strip.
stepList.addEventListener("keydown", (event) => {
  const from = stepButtons.indexOf(document.activeElement);
  const at = from === -1 ? index : from;
  if (event.key === "ArrowRight") go(at + 1 === STEPS.length ? 0 : at + 1);
  else if (event.key === "ArrowLeft") go(at === 0 ? STEPS.length - 1 : at - 1);
  else return;
  event.preventDefault();
  stepButtons[index].focus();
});

const sentence = el("p", { className: "specimen-sentence" });
const status = el("p", { className: "specimen-status is-mono" });
const sourceLink = el("a", {
  className: "specimen-source",
  text: "Open in source",
  attrs: { href: recordingUrl },
});
const sourceKey = el("code", { className: "specimen-key" });

const stage = el("div", { className: "specimen-stage" });
const refusal = el("div", { className: "specimen-refusal", attrs: { hidden: "" } });

const layerTabs = el("div", {
  className: "specimen-layer-tabs",
  attrs: { role: "tablist", "aria-label": "Layers of the same fact" },
});
const layerPanel = el("div", { className: "specimen-layer-panel" });
let layer = LAYERS[0].id;
const layerButtons = LAYERS.map((entry) => {
  const button = el("button", {
    className: "specimen-layer",
    text: entry.label,
    attrs: { type: "button", role: "tab" },
  });
  button.addEventListener("click", () => {
    layer = entry.id;
    renderLayer();
  });
  return button;
});
layerTabs.append(...layerButtons);

const previous = el("button", { className: "specimen-nav", text: "Previous", attrs: { type: "button" } });
const next = el("button", { className: "specimen-nav", text: "Next", attrs: { type: "button" } });
previous.addEventListener("click", () => go(index - 1));
next.addEventListener("click", () => go(index + 1));

root.replaceChildren(
  el("header", { className: "specimen-head" }, label, counter),
  stepList,
  el("div", { className: "specimen-copy" }, sentence, el("p", { className: "specimen-links" }, sourceLink, sourceKey)),
  el("div", { className: "specimen-body" },
    el("div", { className: "specimen-main" }, stage, refusal),
    el("aside", { className: "specimen-layers" }, layerTabs, layerPanel),
  ),
  el("div", { className: "specimen-nav-row" }, previous, next),
  el("footer", { className: "specimen-foot" },
    el("p", { text: REPLAY_NOTE[0] }),
    el("p", { text: REPLAY_NOTE[1] }),
  ),
);

// ---- rendering --------------------------------------------------------------

function go(position) {
  if (position < 0 || position >= STEPS.length) return;
  index = position;
  surfaceState = null;
  render();
}

function render() {
  const entry = step();
  counter.textContent = `Step ${index + 1} of ${STEPS.length}`;
  sentence.textContent = entry.text;
  status.textContent = entry.status;
  sourceKey.textContent = entry.key;
  previous.disabled = index === 0;
  next.disabled = index === STEPS.length - 1;
  for (const [position, button] of stepButtons.entries()) {
    const selected = position === index;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.classList.toggle("is-current", selected);
  }
  refusal.hidden = true;
  refusal.replaceChildren();
  mounted?.dispose?.();
  mounted = null;
  renderStage(entry);
  renderLayer();
}

function renderStage(entry) {
  stage.replaceChildren();
  if (entry.view === "session") {
    const session = recording.session;
    stage.append(
      el("div", { className: "specimen-card" },
        el("h3", { text: session.title }),
        field("Project", recording.session.projectId ? "Inbound NDA" : "—"),
        field("File access", permissionWords(session.permissionMode)),
        field("Chat", session.id),
      ),
    );
    return;
  }
  if (entry.view === "run") {
    renderThread(entry);
    return;
  }
  if (entry.view === "file") {
    const view = createFileView(stage, { request });
    const [path, file] = Object.entries(recording.workspaceFiles)[0];
    view.load({ sessionId, path, kind: file.kind });
    return;
  }
  if (entry.view === "absent") {
    stage.append(el("p", { className: "specimen-absent", text: entry.absent }));
    return;
  }
  if (entry.view === "surface") {
    if (entry.surfaces) stage.append(surfaceSwitch(entry));
    const host = el("div", { className: "specimen-surface" });
    stage.append(host);
    onRefusal = showRefusal;
    mounted = mount({ container: host, projection: currentProjection(), dispatch, query });
  }
}

/** The Chat thread as it stood at this step.
 *
 * The rows come from the product's own projection (projectThread) and the
 * permission card's words from the product's own permissionPresentation; what
 * this file adds is the small amount of DOM that app.mjs would otherwise own.
 */
function renderThread(entry) {
  const runId = runIds[entry.run];
  const events = sliceFor(entry);
  // The run object recorded at this moment, when there is one: at the approval
  // and the question the run really was waiting, and it says so here.
  const run = recording.runSnapshots?.[entry.id] ?? allRuns[entry.run];
  const { rows } = projectThread(events, [run], sessionId);
  const binding = recording.context[runId]?.binding;
  const thread = el("div", { className: "specimen-thread" });

  for (const row of rows) {
    if (row.kind === "user") {
      thread.append(renderUserMessage(row, {}));
    } else if (row.kind === "assistant") {
      if (row.text) thread.append(el("p", { className: "specimen-assistant", text: row.text }));
    } else if (row.kind === "tool") {
      thread.append(toolRow(row));
    } else if (row.kind === "permission") {
      thread.append(permissionCard(row, binding));
    } else if (row.kind === "question") {
      thread.append(questionCard(row));
    } else if (row.kind === "artifact") {
      thread.append(artifactRow(row.file));
    } else if (row.kind === "run-status") {
      thread.append(
        el("p", { className: "specimen-run-status is-mono", text: runLabels[row.status] || row.status }),
      );
    }
  }
  stage.append(thread);
}

function toolRow(row) {
  const block = el("details", { className: "specimen-tool" });
  block.open = true;
  block.append(el("summary", {}, el("code", { className: "is-mono", text: row.name })));
  if (row.request !== undefined)
    block.append(el("pre", { className: "specimen-json", text: format(row.request) }));
  if (row.result !== undefined)
    block.append(el("pre", { className: "specimen-json", text: format(row.result) }));
  return block;
}

/** Approve this write: the exact path, size and content hash, one write only. */
function permissionCard(row, binding) {
  const payload = row.payload || {};
  const words = permissionPresentation(payload, binding);
  const card = el("section", { className: "specimen-card specimen-permission" });
  card.append(el("h3", { text: words.title }));
  card.append(field(words.label, words.target));
  card.append(field("Size", formatBytes(payload.bytes)));
  card.append(
    el("p", { className: "specimen-field" },
      el("span", { className: "specimen-field-name", text: "Content hash" }),
      el("code", { className: "is-mono", text: payload.contentSha256 || "" }),
      copyAction(payload.contentSha256 || "", words.hashLabel),
    ),
  );
  if (payload.preview)
    card.append(el("pre", { className: "specimen-json", text: payload.preview }));
  if (row.questionStatus === "pending") {
    const controls = el("div", { className: "specimen-nav-row" });
    for (const [word, decision] of [["Approve this write", "allow"], ["Deny this write", "deny"]]) {
      const button = el("button", { className: "specimen-nav", text: word, attrs: { type: "button" } });
      button.addEventListener("click", () => showRefusal(decision, { id: payload.id, decision }));
      controls.append(button);
    }
    card.append(controls);
  } else {
    card.append(el("p", { className: "specimen-status is-mono", text: `Decision · ${row.decision ?? row.questionStatus}` }));
  }
  return card;
}

/** A question the run asked, and the answer that was recorded with it. */
function questionCard(row) {
  const card = el("section", { className: "specimen-card" });
  card.append(el("h3", { text: "Question" }));
  card.append(el("p", { className: "specimen-prompt", text: row.prompt }));
  if (row.answer)
    card.append(field("Answer", row.answer));
  else
    card.append(el("p", { className: "specimen-status is-mono", text: "Waiting for you" }));
  return card;
}

function artifactRow(file = {}) {
  return el("section", { className: "specimen-card" },
    el("h3", { text: file.path || "" }),
    field("Size", formatBytes(file.bytes ?? 0)),
    field("Content hash", String(file.sha256 ?? "").slice(0, 12)),
  );
}

function format(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function surfaceSwitch(entry) {
  const row = el("div", { className: "specimen-surface-switch", attrs: { role: "group", "aria-label": "Recorded states" } });
  for (const name of entry.surfaces) {
    const button = el("button", {
      className: "specimen-state",
      text: name,
      attrs: { type: "button" },
    });
    const active = (surfaceState ?? entry.surface) === name;
    button.setAttribute("aria-pressed", String(active));
    button.classList.toggle("is-current", active);
    button.addEventListener("click", () => {
      surfaceState = name;
      renderStage(step());
      renderLayer();
    });
    row.append(button);
  }
  return row;
}

/** What a click on decide or revise actually did: nothing left this page. */
function showRefusal(action, payload) {
  refusal.hidden = false;
  refusal.replaceChildren(
    el("p", { className: "specimen-refusal-head is-mono", text: "replay · not sent" }),
    el("p", { text: `这是当时记录下的 ${action} 请求。它没有被发出。` }),
    el("pre", { className: "specimen-json", text: JSON.stringify(payload, null, 2) }),
  );
}

function renderLayer() {
  const entry = step();
  for (const [position, button] of layerButtons.entries()) {
    const selected = LAYERS[position].id === layer;
    button.setAttribute("aria-selected", String(selected));
    button.classList.toggle("is-current", selected);
  }
  layerPanel.replaceChildren();
  if (layer === "events") {
    const events = sliceFor(entry);
    const list = el("ol", { className: "specimen-events" });
    for (const event of events) {
      list.append(
        el("li", {},
          el("code", { className: "is-mono", text: String(event.seq).padStart(3, "0") }),
          el("code", { className: "is-mono", text: event.type }),
        ),
      );
    }
    layerPanel.append(list);
    return;
  }
  if (layer === "surface") {
    const projection = currentProjection();
    if (!projection) {
      layerPanel.append(el("p", { className: "specimen-absent", text: "这一步之前还没有绑定 Matter，Work 里没有正式成立的东西。" }));
      return;
    }
    layerPanel.append(
      el("dl", { className: "specimen-facts" },
        ...pair("Matter", projection.title),
        ...pair("Sources", String(projection.sources?.length ?? 0)),
        ...pair("Candidates", String(projection.candidates?.length ?? 0)),
        ...pair("Decisions", String(projection.decisions?.length ?? 0)),
        ...pair("State version", projection.stateVersion ?? "—"),
      ),
    );
    return;
  }
  const context = recording.context[runIds[entry.run]];
  const recorded = renderRecordedContext(context);
  if (recorded) {
    recorded.open = true;
    layerPanel.append(recorded);
  }
  if (!context?.loaded?.length) {
    layerPanel.append(
      el("p", { className: "specimen-absent", text: "this run loaded no skill or reference" }),
    );
  }
}

function field(name, value) {
  return el("p", { className: "specimen-field" },
    el("span", { className: "specimen-field-name", text: name }),
    el("span", { className: "is-mono", text: value }),
  );
}

function pair(name, value) {
  return [el("dt", { text: name }), el("dd", { className: "is-mono", text: String(value) })];
}

/** The product's own words for the three file-access modes (copy-convention §3). */
function permissionWords(mode) {
  if (mode === "ask") return "Ask before editing";
  if (mode === "read_only") return "Read only";
  return "Allow edits";
}

render();

function followHash() {
  const id = location.hash.slice(1);
  const at = STEPS.findIndex((entry) => `step-${entry.id}` === id);
  if (at >= 0) { go(at); stepButtons[at].focus(); }
  if (id === "source") {
    go(STEPS.findIndex((entry) => entry.id === "candidate"));
    const sources = currentProjection()?.sources ?? [];
    const detail = el("section", { className: "specimen-card", attrs: { id: "source" } });
    detail.append(el("h3", { text: "Recorded sources" }));
    for (const source of sources) {
      detail.append(field("Source", source.id), field("Version", String(source.version)),
        el("pre", { className: "specimen-json", text: source.text }));
    }
    stage.prepend(detail);
    detail.scrollIntoView();
  }
}
window.addEventListener("hashchange", followHash);
followHash();
