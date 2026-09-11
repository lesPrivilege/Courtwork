// Agent presence · fixture sequences (pure; return-v1 specimen).
// A sequence is a list of fact steps on the specimen timeline. Replaying it to
// any time `t` gives the same model as having lived through it, which is what
// makes a paused or `?t=` frame reproducible.

import { createPresenceModel } from "./model.mjs";

export function resolveSteps(sequence, states) {
  const byId = new Map(states.map((s) => [s.id, s]));
  return sequence.steps.map((step) => ({
    at: step.at,
    stateId: step.state || null,
    facts: step.facts || byId.get(step.state).facts,
    expect: step.expect || null,
  }));
}

/** A single state held from time 0. */
export function stateSteps(state) {
  return [{ at: 0, stateId: state.id, facts: state.facts, expect: null }];
}

export function stepIndexAt(steps, t) {
  let index = -1;
  for (let i = 0; i < steps.length; i++) if (steps[i].at <= t) index = i;
  return index;
}

export function nextStepAt(steps, t) {
  const next = steps.find((s) => s.at > t);
  return next ? next.at : null;
}

/** Build a model that has lived through `steps` up to time `t`. */
export function replayModel(steps, t, options) {
  const model = createPresenceModel(options);
  const index = stepIndexAt(steps, t);
  let announce = null;
  for (let i = 0; i <= index; i++) announce = model.setFacts(steps[i].facts, steps[i].at) ?? announce;
  return { model, index, announce };
}
