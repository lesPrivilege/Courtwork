// Agent presence · Chat scene driver (return-v1 specimen).
//
// Puts one presence into a synthetic Chat, in one of three placements:
//   message — below the current assistant work block (user revision 2026-09-12)
//   line   — the composer's long-running status line (today: composer-run-hint)
//   corner — the composer's bottom-left corner, ahead of Files and the model
// The scene shows no engineering control. index.html drives it through
// window.presenceScene; URL parameters give a reproducible first frame:
//   ?candidate=AB&placement=line&state=thinking&t=1400&theme=dark&rm=1&seed=7
//   ?sequence=think-cancel-requested-cancelled&play=1

import { createClock } from "./clock.mjs";
import { PresenceView, prefersReducedMotion } from "./presence.mjs";
import { resolveSteps, stateSteps } from "./sequence.mjs";

const load = (url) => fetch(url).then((r) => r.json());
const [statesDoc, sequencesDoc, wordsDoc] = await Promise.all([
  load("fixtures/states.json"),
  load("fixtures/sequences.json"),
  load("fixtures/words.json"),
]);

const q = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const els = {
  form: $("composer-form"),
  line: $("presence-line"),
  context: $("composer-context"),
  message: $("presence-message"),
  trigger: $("presence-trigger"),
  mark: $("presence-mark"),
  text: $("presence-text"),
  elapsed: $("presence-elapsed"),
  detail: $("presence-detail"),
  rows: $("presence-detail-rows"),
  note: $("presence-detail-note"),
  live: $("presence-live"),
  stop: $("stop-button"),
  send: $("send-button"),
  hint: $("presence-hint"),
};

const DEFAULT_SIZE = { message: 16, line: 16, corner: 20 };
const config = {
  candidate: q.get("candidate") || "JP",
  placement: ["line", "corner"].includes(q.get("placement")) ? q.get("placement") : "message",
  material: q.get("material") || "flat",
  size: Number(q.get("size")) || null,
  seed: Number(q.get("seed") ?? wordsDoc.seed),
  intervalMs: Number(q.get("interval")) || wordsDoc.intervalMs.value,
  reducedMotion: q.get("rm") === "1" || prefersReducedMotion(),
};
if (q.get("theme")) document.documentElement.dataset.theme = q.get("theme");
if (q.get("depth") === "off") document.body.dataset.depth = "off";

const fixed = q.has("t");
const clock = createClock({ start: Number(q.get("t") ?? 0), playing: !fixed || q.get("play") === "1" });

let steps = [];
let lastKey = null;
let lastProjection = null;

let view = null; // onFrame runs once inside the constructor, before assignment
view = new PresenceView({
  mark: els.mark,
  clock,
  text: els.text,
  elapsed: els.elapsed,
  live: els.live,
  root: els.trigger,
  candidate: config.candidate,
  size: config.size || DEFAULT_SIZE[config.placement],
  material: config.material,
  words: wordsDoc.ambient,
  intervalMs: config.intervalMs,
  seed: config.seed,
  reducedMotion: config.reducedMotion,
  onFrame,
});

function currentFacts() {
  return view.steps && view.stepIndex >= 0 ? view.steps[view.stepIndex].facts : { connection: "connected", run: null };
}

function place() {
  const { placement } = config;
  document.body.dataset.placement = placement;
  if (placement === "message") {
    els.message.prepend(els.trigger);
    els.message.append(els.detail);
  } else {
    if (placement === "corner") els.context.prepend(els.trigger);
    else els.line.prepend(els.trigger);
    els.form.append(els.detail);
  }
  lastKey = null; // repaint visibility for the new slot
  view.wake();
}

function onFrame(frame) {
  if (!view) return;
  const projection = view.projection;
  if (projection === lastProjection && frame.key === lastKey) return;
  lastProjection = projection;
  lastKey = frame.key;
  const facts = currentFacts();
  const run = facts.run;
  const connected = facts.connection === "connected";
  const active = connected && run && ["running", "waiting_user", "stopping"].includes(run.status);

  // Line placement exists only while there is something to say (as today's
  // run hint); the corner keeps the face at rest as the chat's identity.
  els.message.hidden = config.placement !== "message" || projection.key === "idle";
  els.line.hidden = config.placement === "line" ? projection.key === "idle" : config.placement === "message" ? !active : true;
  if (projection.key === "idle") setOpen(false);
  els.trigger.setAttribute("aria-label", `${projection.announce}. Work details`);

  els.stop.hidden = !active;
  const stopInFlight = facts.cancel === "requested" || run?.status === "stopping";
  els.stop.disabled = stopInFlight;
  els.stop.textContent = stopInFlight ? "Sending…" : "Stop working";
  // As renderComposer does: Stop takes Send's place while a run is active.
  els.send.hidden = Boolean(active);
  els.hint.hidden = !active;

  els.rows.replaceChildren(
    ...projection.detail.flatMap(({ term, value }) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = term;
      dd.textContent = value;
      return [dt, dd];
    }),
  );
  const note = [projection.note, config.placement === "corner" && active ? "Your input will not be sent automatically." : null].filter(Boolean).join(" ");
  els.note.textContent = note;
  els.note.hidden = !note;
}

/* ---- disclosure: tap / Enter / Space open; Escape closes; focus returns --- */
function setOpen(open, { returnFocus = false } = {}) {
  els.detail.hidden = !open;
  els.trigger.setAttribute("aria-expanded", String(open));
  if (!open && returnFocus) els.trigger.focus();
}
els.trigger.addEventListener("click", () => setOpen(els.detail.hidden));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.detail.hidden) {
    event.preventDefault();
    setOpen(false, { returnFocus: els.detail.contains(document.activeElement) || document.activeElement === els.trigger });
  }
});
document.addEventListener("pointerdown", (event) => {
  if (!els.detail.hidden && !els.detail.contains(event.target) && !els.trigger.contains(event.target)) setOpen(false);
});
els.form.addEventListener("submit", (event) => event.preventDefault());

/* ---- scene API (used by index.html and tools/capture.mjs) --------------- */
function loadState(id) {
  const state = statesDoc.states.find((s) => s.id === id);
  if (!state) throw new Error(`unknown state ${id}`);
  steps = stateSteps(state);
  view.setSteps(steps);
}
function loadSequence(id) {
  const sequence = sequencesDoc.sequences.find((s) => s.id === id);
  if (!sequence) throw new Error(`unknown sequence ${id}`);
  steps = resolveSteps(sequence, statesDoc.states);
  view.setSteps(steps);
}

window.presenceScene = {
  states: statesDoc.states,
  sequences: sequencesDoc.sequences,
  clock,
  view,
  config,
  loadState,
  loadSequence,
  setOptions(next) {
    Object.assign(config, next);
    if (next.theme !== undefined) {
      if (next.theme) document.documentElement.dataset.theme = next.theme;
      else delete document.documentElement.dataset.theme;
    }
    if (next.depth !== undefined) document.body.dataset.depth = next.depth ? "on" : "off";
    view.setOptions({
      candidate: config.candidate,
      material: config.material,
      size: config.size || DEFAULT_SIZE[config.placement],
      seed: config.seed,
      intervalMs: config.intervalMs,
      reducedMotion: config.reducedMotion,
    });
    if (next.placement) place();
  },
  frame: () => view.model.frame(clock.now()),
  projection: () => view.projection,
  setOpen,
};

if (q.get("sequence")) loadSequence(q.get("sequence"));
else loadState(q.get("state") || "thinking");
place();
document.documentElement.dataset.ready = "true";
