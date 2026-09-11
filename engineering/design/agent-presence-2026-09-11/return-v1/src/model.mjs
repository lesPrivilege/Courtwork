// Agent presence · frame model (return-v1 specimen).
//
// Holds the current projection and the hand-over from the previous pose. Every
// output is a function of (facts history, time passed in) — the model never
// reads a clock, so a frozen or scrubbed time reproduces the same frame, and a
// timer scheduled for an old state cannot write old words over a new fact: the
// frame is recomputed from the current projection whenever anything wakes.

import { REST, MOTION, sample, blend, easeOut, poseAnimating } from "./geometry.mjs";
import { projectPresence, ambientWord, formatElapsed } from "./projection.mjs";

export function createPresenceModel(options = {}) {
  const opts = { words: ["Thinking"], intervalMs: 3500, seed: 1, reducedMotion: false, ...options };
  let projection = projectPresence({ connection: "connected" });
  let enteredAt = 0;
  let from = { ...REST };
  let fromAt = -Infinity;

  function paramsAt(now) {
    const target = sample(projection.pose, now - enteredAt, opts);
    if (opts.reducedMotion) return target;
    const k = easeOut((now - fromAt) / MOTION.transitionMs);
    return k < 1 ? blend(from, target, k) : target;
  }

  return {
    get projection() {
      return projection;
    },
    get options() {
      return { ...opts };
    },
    setOptions(next) {
      Object.assign(opts, next);
    },
    /** Returns the text to announce when the fact changed, else null. */
    setFacts(facts, now) {
      const next = projectPresence(facts);
      if (next.key === projection.key) {
        projection = next; // same fact; detail rows may have been refined
        return null;
      }
      from = paramsAt(now); // continue from the shape on screen
      fromAt = now;
      enteredAt = now;
      projection = next;
      return next.announce;
    },
    /** Forget history (fixed-time captures start from a settled pose). */
    settle(now) {
      enteredAt = Math.min(enteredAt, now);
      fromAt = -Infinity;
    },
    frame(now) {
      const inState = now - enteredAt;
      const params = paramsAt(now);
      let text = projection.label;
      let wordNextAt = null;
      if (projection.ambient && !opts.reducedMotion) {
        const w = ambientWord(opts.words, inState, opts.intervalMs, opts.seed);
        text = w.word;
        wordNextAt = enteredAt + w.nextAtMs;
      }
      const elapsedText = projection.elapsedFrom == null ? null : formatElapsed(now - projection.elapsedFrom);
      const secondNextAt =
        projection.elapsedFrom == null ? null : projection.elapsedFrom + (Math.floor((now - projection.elapsedFrom) / 1000) + 1) * 1000;
      const transitioning = !opts.reducedMotion && now - fromAt < MOTION.transitionMs;
      const candidates = [wordNextAt, secondNextAt].filter((v) => v != null);
      return {
        key: projection.key,
        pose: projection.pose,
        tone: projection.tone,
        params,
        text,
        ambient: projection.ambient && !opts.reducedMotion,
        elapsedText,
        animating: transitioning || poseAnimating(projection.pose, inState, opts.reducedMotion),
        nextChangeAt: candidates.length ? Math.min(...candidates) : null,
      };
    },
  };
}
