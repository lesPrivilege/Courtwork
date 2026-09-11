// Directed checks for the return-v1 specimen (pure modules + fixtures + assets).
//   node --test engineering/design/agent-presence-2026-09-11/return-v1/tests/presence.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { MOUTHS, CANDIDATES, REST, sample, poseAnimating, paths, resolveMaterial, MOTION } from "../src/geometry.mjs";
import { projectPresence, ambientWord } from "../src/projection.mjs";
import { createPresenceModel } from "../src/model.mjs";
import { resolveSteps, replayModel, stateSteps } from "../src/sequence.mjs";
import { ASSETS, assetMarkup } from "../tools/assets.mjs";

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const json = async (p) => JSON.parse(await readFile(here(p), "utf8"));
const states = (await json("../fixtures/states.json")).states;
const sequences = (await json("../fixtures/sequences.json")).sequences;
const words = await json("../fixtures/words.json");
const state = (id) => states.find((s) => s.id === id).facts;
const opts = { words: words.ambient, intervalMs: words.intervalMs.value, seed: words.seed };

test("every fixture state projects to a distinct fact label and a known pose", () => {
  const expected = {
    idle: ["rest", null],
    thinking: ["think", "Thinking"],
    "running-no-activity": ["rest", "Working"],
    "tool-reading": ["look", "ws_read · app/web/composer-field.mjs"],
    "tool-searching": ["look", 'ws_grep · "presence" in app/web'],
    "tools-concurrent": ["look", "2 tools running"],
    "waiting-user": ["hold", "Waiting for you"],
    "waiting-permission": ["hold", "Waiting for your approval"],
    blocked: ["hold", "Blocked · File write denied for this chat"],
    error: ["hold", "Failed"],
    "cancel-requested": ["hold", "Stop requested · still working"],
    cancelled: ["rest", "Cancelled"],
    completed: ["settle", "Completed"],
    "disconnected-unknown": ["dim", "Connection unknown"],
  };
  for (const s of states) {
    if (!(s.id in expected)) continue;
    const p = projectPresence(s.facts);
    assert.deepEqual([p.pose, p.label], expected[s.id], s.id);
  }
  const keys = states.map((s) => projectPresence(s.facts).key);
  assert.equal(new Set(keys).size, keys.length, "fact keys stay distinct even where visuals repeat");
});

test("no thinking without a thinking fact; ambient only for explicit thinking", () => {
  assert.equal(projectPresence(state("running-no-activity")).ambient, false);
  for (const s of states) {
    const p = projectPresence(s.facts);
    assert.equal(p.ambient, s.id === "thinking", s.id);
  }
});

test("tools, waits, stops and terminal facts override thinking", () => {
  assert.equal(projectPresence(state("tools-concurrent")).ambient, false); // thinking + tools
  assert.equal(projectPresence(state("cancel-requested")).ambient, false); // thinking + stop request
});

test("unknown connection never reads as Ready and says the run state is unknown", () => {
  const p = projectPresence(state("disconnected-unknown"));
  assert.equal(p.tone, "unknown");
  const text = JSON.stringify(p);
  assert.doesNotMatch(text, /Ready/);
  assert.match(text, /unknown until the host reconnects/i);
});

test("concurrent tools keep their own scope and are not presented as progress", () => {
  const p = projectPresence(state("tools-concurrent"));
  const tools = p.detail.filter((d) => d.term.startsWith("Tool"));
  assert.equal(tools.length, 2);
  assert.ok(tools.every((d) => d.term.includes("run-syn-01")));
  assert.match(p.note, /not progress/);
});

test("a stop request stays active until the host reports a terminal state", () => {
  const requested = projectPresence(state("cancel-requested"));
  assert.notEqual(requested.elapsedFrom, null, "still an active run");
  assert.match(requested.label, /Stop requested/);
  assert.match(requested.note, /not a stop/);
  assert.equal(projectPresence(state("cancelled")).label, "Cancelled");
});

test("completion does not claim acceptance", () => {
  assert.match(projectPresence(state("completed")).note, /does not mean the result was reviewed or accepted/);
});

test("sample() is deterministic and seed-dependent", () => {
  const a = sample("think", 1234, { seed: 7 });
  assert.deepEqual(a, sample("think", 1234, { seed: 7 }));
  assert.notDeepEqual(a, sample("think", 1234, { seed: 8 }));
  assert.deepEqual(paths("AB", a), paths("AB", sample("think", 1234, { seed: 7 })));
});

test("reduced motion: every pose is static and readable", () => {
  for (const pose of ["rest", "think", "look", "hold", "settle", "dim"]) {
    const frames = [0, 400, 1300, 2600, 9000].map((t) => sample(pose, t, { seed: 7, reducedMotion: true }));
    for (const f of frames) assert.deepEqual(f, frames[0], pose);
    assert.equal(poseAnimating(pose, 100, true), false);
  }
  const m = createPresenceModel({ ...opts, reducedMotion: true });
  m.setFacts(state("thinking"), 0);
  for (const t of [100, 3600, 7200]) assert.equal(m.frame(t).text, "Thinking");
});

test("only thinking loops; settle ends inside the brand ceiling", () => {
  assert.equal(poseAnimating("think", 60000, false), true);
  for (const pose of ["rest", "look", "hold", "dim"]) assert.equal(poseAnimating(pose, 10, false), false, pose);
  assert.equal(poseAnimating("settle", MOTION.settleMs - 1, false), true);
  assert.equal(poseAnimating("settle", MOTION.settleMs, false), false);
  assert.ok(MOTION.settleMs <= 220);
  assert.deepEqual(sample("settle", MOTION.settleMs, {}), REST);
});

test("ambient words: plain first word, interval rotation, never implied progress", () => {
  assert.equal(ambientWord(words.ambient, 0, 3500, 7).word, "Thinking");
  assert.notEqual(ambientWord(words.ambient, 3500, 3500, 7).word, "Thinking");
  for (const w of words.ambient) assert.doesNotMatch(w, /almost|nearly|finish|done/i);
  const { intervalMs } = words;
  assert.ok(intervalMs.value >= intervalMs.experimentalRange[0] && intervalMs.value <= intervalMs.experimentalRange[1]);
});

test("a fact change is never overwritten by the previous state's word timer", () => {
  const m = createPresenceModel(opts);
  m.setFacts(state("thinking"), 0);
  assert.equal(m.frame(3400).text, "Thinking");
  m.setFacts(state("tool-reading"), 3400);
  for (const t of [3450, 3500, 3600, 7000, 10500]) assert.equal(m.frame(t).text, "ws_read · app/web/composer-field.mjs", `t=${t}`);
});

test("a state change continues from the shape on screen", () => {
  const m = createPresenceModel(opts);
  m.setFacts(state("thinking"), 0);
  const before = m.frame(1000).params;
  m.setFacts(state("tool-reading"), 1000);
  assert.deepEqual(m.frame(1000).params, before, "no jump at the hand-over");
  assert.deepEqual(m.frame(1000 + MOTION.transitionMs).params, sample("look", MOTION.transitionMs));
});

test("fixed sequences replay to their expectations", () => {
  for (const seq of sequences) {
    const steps = resolveSteps(seq, states);
    for (const step of steps) {
      const { model } = replayModel(steps, step.at + 50, opts);
      const fr = model.frame(step.at + 50);
      if (step.expect.pose) assert.equal(fr.pose, step.expect.pose, `${seq.id} @${step.at}`);
      if (step.expect.text) assert.equal(fr.text, step.expect.text, `${seq.id} @${step.at}`);
      if (step.expect.ambient) assert.ok(words.ambient.includes(fr.text), `${seq.id} @${step.at}`);
    }
  }
});

test("replay equals living through the sequence", () => {
  const seq = sequences[0];
  const steps = resolveSteps(seq, states);
  const live = createPresenceModel(opts);
  for (const s of steps) live.setFacts(s.facts, s.at);
  const t = steps.at(-1).at + 90;
  assert.deepEqual(replayModel(steps, t, opts).model.frame(t), live.frame(t));
  assert.equal(stateSteps(states[0]).length, 1);
});

test("geometry: one mouth anatomy; soft depth never below 32 px", () => {
  for (const [name, pts] of Object.entries(MOUTHS)) assert.equal(pts.length, 13, name);
  for (const c of Object.values(CANDIDATES)) assert.ok(MOUTHS[c.rest] && MOUTHS[c.think]);
  for (const size of [16, 20, 24]) assert.equal(resolveMaterial("soft", size), "flat");
  assert.equal(resolveMaterial("soft", 32), "soft");
});

test("assets equal their export from the geometry source", async () => {
  for (const asset of ASSETS) {
    const file = await readFile(here(`../assets/${asset.file}`), "utf8");
    assert.equal(file.trim(), assetMarkup(asset), asset.file);
    assert.doesNotMatch(file, /https?:\/\/(?!www\.w3\.org\/2000\/svg)/, "no remote reference");
  }
});
