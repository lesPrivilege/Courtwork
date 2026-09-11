// Agent presence · tool surface driver (return-v1, synthetic).
// All engineering controls (candidate, material, seed, time, facts) live here;
// the embedded Chat scene receives them through window.presenceScene.

import { CANDIDATES, REST, svgMarkup } from "./geometry.mjs";
import { createClock } from "./clock.mjs";
import { PresenceView, prefersReducedMotion } from "./presence.mjs";
import { resolveSteps, stateSteps } from "./sequence.mjs";

const load = (url) => fetch(url).then((r) => r.json());
const [statesDoc, sequencesDoc, wordsDoc] = await Promise.all([
  load("fixtures/states.json"),
  load("fixtures/sequences.json"),
  load("fixtures/words.json"),
]);

const form = document.getElementById("controls");
const $ = (id) => document.getElementById(id);
const value = (name) => form.elements[name].value;
const checked = (name) => form.elements[name].checked;

/* ---- 1 · comparison boards (static) ---------------------------------- */
const SIZES = [16, 20, 24, 32, 64];
const THINK = { ...REST, morph: 1 };
const mark = (candidate, opts) => `<span class="presence-mark">${svgMarkup(candidate, opts)}</span>`;

function boards() {
  const head = `<tr><th scope="col"></th>${SIZES.map((s) => `<th scope="col">${s}</th>`).join("")}</tr>`;
  const row = (c, note) =>
    `<tr><th scope="row"><b>${CANDIDATES[c].name}</b>${note}</th>${SIZES.map((s) => `<td>${mark(c, { size: s })}</td>`).join("")}</tr>`;
  const compare = `<table aria-label="Flat comparison at rest">${head}${row("A", "idle baseline")}${row("B", "thinking candidate")}${row("C", "soft control")}</table>`;

  const routeHead = `<tr><th scope="col"></th>${SIZES.map((s) => `<th scope="col">${s} flat</th>`).join("")}<th scope="col" class="sp-sep">32 soft</th><th scope="col">64 soft</th><th scope="col" class="sp-sep">64 hard · contrast</th></tr>`;
  const routeRow = (c, params, label, rec) =>
    `<tr${rec ? ' class="sp-rec"' : ""}><th scope="row"><b>${CANDIDATES[c].name}</b>${label}</th>` +
    SIZES.map((s) => `<td>${mark(c, { size: s, params })}</td>`).join("") +
    `<td class="sp-sep">${mark(c, { size: 32, material: "soft", params })}</td><td>${mark(c, { size: 64, material: "soft", params })}</td>` +
    `<td class="sp-sep">${rec && label === "rest" ? mark(c, { size: 64, material: "hard", params }) : '<span class="sp-na">—</span>'}</td></tr>`;
  const route =
    `<table aria-label="Recommended route, flat and soft depth">${routeHead}` +
    routeRow("JP", REST, "rest", true) +
    routeRow("JP", THINK, "thinking shape", true) +
    routeRow("AB:", REST, "rest", false) +
    routeRow("AB:", THINK, "thinking shape", false) +
    `</table>`;
  $("compare-board").innerHTML = route + `<h3 class="sp-inline" style="margin:20px 0 6px">Historical A/B/C comparison</h3>` + compare;
}
boards();

/* ---- 2 · motion stage (live) -------------------------------------------- */
const clock = createClock({ start: 0, playing: true });
const STAGE = [
  { c: "A", size: 64, title: "A · =]" },
  { c: "B", size: 64, title: "B · =Ʒ" },
  { c: "C", size: 64, title: "C · =ε" },
  { c: "JP", size: 64, title: "Selected · 64", rec: true },
  { c: "JP", size: 20, title: "Selected · corner 20", rec: true },
  { c: "JP", size: 16, title: "Selected · message 16", rec: true },
];
const views = STAGE.map((s) => {
  const cell = document.createElement("div");
  cell.className = "sp-cell";
  if (s.rec) cell.dataset.rec = "";
  cell.innerHTML = `<h3>${s.title}</h3><div class="sp-row"><span class="presence-mark"></span></div><span class="presence-text"></span>`;
  $("motion-stage").append(cell);
  return Object.assign(
    new PresenceView({
      mark: cell.querySelector(".presence-mark"),
      text: cell.querySelector(".presence-text"),
      root: cell,
      clock,
      candidate: s.c,
      size: s.size,
      material: "flat",
      words: wordsDoc.ambient,
      intervalMs: wordsDoc.intervalMs.value,
      seed: wordsDoc.seed,
      reducedMotion: prefersReducedMotion(),
    }),
    { spec: s },
  );
});

/* ---- 3 · scene --------------------------------------------------------- */
const frame = $("scene");
let scene = null;
const sceneReady = new Promise((resolve) => {
  // The frame may finish before this module runs, so poll rather than wait for load.
  const poll = () => (frame.contentWindow?.presenceScene ? resolve((scene = frame.contentWindow.presenceScene)) : setTimeout(poll, 30));
  poll();
});

function layoutFrame() {
  const width = Number(value("width"));
  const height = width < 768 ? 820 : 760;
  const wrap = $("frame-wrap");
  const scale = Math.min(1, wrap.clientWidth / width);
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.style.transform = `scale(${scale})`;
  wrap.style.height = `${height * scale}px`;
}
addEventListener("resize", layoutFrame);

/* ---- controls ---------------------------------------------------------- */
for (const s of statesDoc.states) form.elements.state.add(new Option(s.title, s.id, false, s.id === "thinking"));
for (const s of sequencesDoc.sequences) form.elements.sequence.add(new Option(s.title, s.id));

function currentSteps() {
  const seq = value("sequence");
  if (seq) return resolveSteps(sequencesDoc.sequences.find((s) => s.id === seq), statesDoc.states);
  return stateSteps(statesDoc.states.find((s) => s.id === value("state")));
}

function options() {
  return {
    candidate: value("candidate"),
    material: value("material"),
    theme: value("theme"),
    placement: value("placement"),
    reducedMotion: checked("rm") || prefersReducedMotion(),
    depth: !checked("depthOff"),
    seed: Number(value("seed")) || 1,
    intervalMs: Math.min(4000, Math.max(2500, Number(value("interval")) || 3500)),
  };
}

function applyOptions() {
  const o = options();
  if (o.theme) document.documentElement.dataset.theme = o.theme;
  else delete document.documentElement.dataset.theme;
  document.body.dataset.depth = o.depth ? "on" : "off";
  for (const v of views) {
    const size = v.spec.size;
    v.setOptions({
      candidate: v.spec.rec ? o.candidate : v.spec.c,
      material: size >= 32 ? o.material : "flat",
      seed: o.seed,
      intervalMs: o.intervalMs,
      reducedMotion: o.reducedMotion,
    });
  }
  scene?.setOptions(o);
  layoutFrame();
}

function applyFacts() {
  const steps = currentSteps();
  for (const v of views) v.setSteps(steps);
  if (scene) {
    if (value("sequence")) scene.loadSequence(value("sequence"));
    else scene.loadState(value("state"));
  }
  $("t-out").textContent = `${Math.round(clock.now())} ms`;
}

function paintTime(t) {
  // Keep the scrubber's reachable range aligned with a long-running preview.
  form.elements.t.max = Math.max(16000, Math.ceil(t / 16000) * 16000);
  form.elements.t.value = t;
  $("t-out").textContent = `${Math.round(t)} ms`;
}

function setTime(t) {
  clock.set(t);
  scene?.clock.set(t);
  paintTime(t);
}

function setPlaying(playing) {
  if (playing) {
    clock.play();
    scene?.clock.play();
  } else {
    clock.pause();
    scene?.clock.pause();
    setTime(clock.now());
  }
  $("play").textContent = playing ? "Pause" : "Play";
}

form.addEventListener("change", (event) => {
  const name = event.target.name;
  if (name === "state") form.elements.sequence.value = "";
  if (name === "state" || name === "sequence") {
    applyFacts();
    setTime(0);
  } else if (name !== "t") applyOptions();
});
// Placement and width sit beside the scene but belong to this form (form=).
for (const input of document.querySelectorAll('input[form="controls"]')) input.addEventListener("change", applyOptions);
form.elements.t.addEventListener("input", () => {
  // Pausing repaints the old clock value. Capture the user's target first.
  const requestedTime = Number(value("t"));
  setPlaying(false);
  setTime(requestedTime);
});
form.addEventListener("submit", (e) => e.preventDefault());
$("play").addEventListener("click", () => setPlaying(clock.paused));
$("restart").addEventListener("click", () => setTime(0));
setInterval(() => {
  if (!clock.playing) return;
  const t = clock.now();
  paintTime(t);
}, 100);

/* ---- 4 · sequence check -------------------------------------------------- */
async function runCheck() {
  await sceneReady;
  setPlaying(false);
  const rows = [];
  const words = new Set(wordsDoc.ambient);
  const trigger = frame.contentDocument.getElementById("presence-text");
  for (const seq of sequencesDoc.sequences) {
    scene.loadSequence(seq.id);
    const steps = resolveSteps(seq, statesDoc.states);
    steps.forEach((step, i) => {
      const probes = [step.at + 50];
      // Past the previous state's next word boundary: nothing old may return.
      const nextAt = steps[i + 1]?.at ?? step.at + 4000;
      if (nextAt - step.at > 3600) probes.push(step.at + 3600);
      for (const t of probes) {
        scene.clock.set(t);
        const fr = scene.frame();
        const dom = trigger.textContent;
        const problems = [];
        if (step.expect?.pose && fr.pose !== step.expect.pose) problems.push(`pose ${fr.pose}`);
        if (step.expect?.text && fr.text !== step.expect.text) problems.push(`text “${fr.text}”`);
        if (step.expect?.ambient && !words.has(fr.text)) problems.push(`ambient “${fr.text}”`);
        if (!step.expect?.ambient && words.has(fr.text) && fr.text !== "Thinking") problems.push(`stale word “${fr.text}”`);
        if (dom !== (fr.text ?? "")) problems.push(`DOM “${dom}”`);
        rows.push(`<tr><td>${seq.id}</td><td>${step.stateId || "inline facts"}</td><td>${t}</td><td>${fr.pose}</td><td>${fr.text ?? "—"}</td><td class="${problems.length ? "bad" : "ok"}">${problems.length ? problems.join("; ") : "pass"}</td></tr>`);
      }
    });
  }
  const failed = rows.filter((r) => r.includes('class="bad"')).length;
  $("check-out").innerHTML =
    `<p>${rows.length - failed}/${rows.length} probes pass${failed ? ` — ${failed} fail` : ""}.</p>` +
    `<table><tr><th>sequence</th><th>step</th><th>t (ms)</th><th>pose</th><th>text</th><th>result</th></tr>${rows.join("")}</table>`;
  applyFacts();
  setTime(0);
  return { total: rows.length, failed };
}
$("run-check").addEventListener("click", runCheck);

await sceneReady;
applyOptions();
applyFacts();
setTime(0);
window.specimen = { runCheck, setTime, setPlaying, applyOptions, applyFacts, clock, views, get scene() { return scene; } };
document.documentElement.dataset.ready = "true";
