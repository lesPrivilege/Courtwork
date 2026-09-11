// Agent presence · DOM view (return-v1 specimen).
//
// Paints one model onto one SVG and, optionally, a text line. It owns no fact:
// the caller hands it facts; it hands back nothing (no events, no commands).
// Frames run only while something is actually moving; otherwise the view wakes
// once at the next word or second boundary. Any new fact, option or clock
// change cancels whatever wake-up was pending (generation token) and repaints
// from the current projection.

import { VIEWBOX, CANDIDATES, DEPTH, optical, resolveMaterial, paths } from "./geometry.mjs";
import { createPresenceModel } from "./model.mjs";
import { replayModel, stepIndexAt, nextStepAt } from "./sequence.mjs";

const SVG_NS = "http://www.w3.org/2000/svg";

export class PresenceView {
  /**
   * @param {object} o
   * @param {Element} o.mark      element that receives the SVG
   * @param {object} o.clock      createClock() instance
   * @param {Element} [o.text]    visible fact / ambient word
   * @param {Element} [o.elapsed] elapsed time
   * @param {Element} [o.live]    polite live region (fact changes only)
   * @param {Element} [o.root]    element that receives data-tone / data-pose
   */
  constructor({ mark, clock, text = null, elapsed = null, live = null, root = null, candidate = "AB", size = 20, material = "flat", words, intervalMs, seed, reducedMotion = false, onFrame = null }) {
    Object.assign(this, { mark, clock, textEl: text, elapsedEl: elapsed, live, root: root || mark, onFrame });
    this.view = { candidate, size, material };
    this.model = createPresenceModel({ words, intervalMs, seed, reducedMotion });
    this.generation = 0;
    this.lastText = null;
    this.unsubscribe = clock.subscribe(() => this.wake());
    this.build();
    this.wake();
  }

  /** Live facts (no timeline): the change starts now. */
  setFacts(facts) {
    this.steps = null;
    this.announce(this.model.setFacts(facts, this.clock.now()));
    this.wake();
  }

  /** A fixture timeline: facts change at each step's `at`, replayed exactly. */
  setSteps(steps) {
    this.steps = steps;
    this.stepIndex = null;
    this.wake();
  }

  announce(text) {
    if (!text || !this.live) return;
    // Re-set so an identical sentence after a different one is still read.
    this.live.textContent = "";
    queueMicrotask(() => (this.live.textContent = text));
  }

  syncSteps(now) {
    if (!this.steps) return;
    const index = stepIndexAt(this.steps, now);
    if (index === this.stepIndex && !this.dirty) return;
    const replay = replayModel(this.steps, now, this.model.options);
    this.model = replay.model;
    if (this.stepIndex != null && index !== this.stepIndex) this.announce(this.model.projection.announce);
    this.stepIndex = index;
    this.dirty = false;
  }

  setOptions({ candidate, size, material, ...modelOptions } = {}) {
    const rebuild =
      (candidate && candidate !== this.view.candidate) ||
      (size && size !== this.view.size) ||
      (material && material !== this.view.material);
    Object.assign(this.view, Object.fromEntries(Object.entries({ candidate, size, material }).filter(([, v]) => v != null)));
    this.model.setOptions(Object.fromEntries(Object.entries(modelOptions).filter(([, v]) => v != null)));
    this.dirty = true; // replay so seed / reduced-motion apply from the start
    if (rebuild) this.build();
    this.wake();
  }

  get projection() {
    return this.model.projection;
  }

  build() {
    const { candidate, size, material } = this.view;
    const resolved = resolveMaterial(material, size);
    const { stroke, dot } = optical(size);
    const eyeKind = paths(candidate).eyeKind;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VIEWBOX} ${VIEWBOX}`);
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("presence-svg");
    svg.dataset.candidate = CANDIDATES[candidate].id;
    svg.dataset.material = resolved;
    this.pathEls = [];
    const layer = (cls, extra = 0, transform = null, sheen = null) => {
      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", cls);
      if (transform) g.setAttribute("transform", transform);
      for (const part of ["eyes", "mouth"]) {
        const p = document.createElementNS(SVG_NS, "path");
        p.setAttribute("class", `pr-${part}`);
        const w = sheen != null ? (part === "eyes" && eyeKind === "dots" ? dot * 0.3 : sheen) : (part === "eyes" && eyeKind === "dots" ? dot : stroke) + extra;
        p.setAttribute("stroke-width", w);
        g.append(p);
        this.pathEls.push([part, p]);
      }
      svg.append(g);
    };
    if (resolved === "soft") {
      const s = DEPTH.soft;
      layer("pr-depth", s.grow, `translate(${s.dx} ${s.dy})`);
      layer("pr-ink");
      layer("pr-sheen", 0, `translate(${s.sheen.dx} ${s.sheen.dy})`, s.sheen.width);
    } else if (resolved === "hard") {
      const h = DEPTH.hard;
      for (let i = h.steps; i >= 1; i--) layer("pr-depth", 0, `translate(${h.dx * i} ${h.dy * i})`);
      layer("pr-ink");
    } else {
      layer("pr-ink");
    }
    this.mark.replaceChildren(svg);
    this.root.dataset.material = resolved;
  }

  paint(now) {
    const fr = this.model.frame(now);
    const d = paths(this.view.candidate, fr.params);
    for (const [part, el] of this.pathEls) el.setAttribute("d", d[part]);
    this.root.dataset.tone = fr.tone;
    this.root.dataset.pose = fr.pose;
    if (this.textEl) {
      const text = fr.text ?? "";
      if (text !== this.lastText) {
        this.textEl.textContent = text;
        // A word change inside one thinking fact fades in; a fact change cuts.
        this.textEl.classList.remove("word-enter");
        if (fr.ambient && this.lastKey === fr.key && this.lastText != null) {
          void this.textEl.offsetWidth; // restart the fade
          this.textEl.classList.add("word-enter");
        }
        this.lastText = text;
      }
      this.textEl.hidden = !text;
    }
    if (this.elapsedEl) {
      this.elapsedEl.textContent = fr.elapsedText ?? "";
      this.elapsedEl.hidden = !fr.elapsedText;
    }
    this.lastKey = fr.key;
    this.onFrame?.(fr);
    return fr;
  }

  wake() {
    const gen = ++this.generation;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    const now = this.clock.now();
    this.syncSteps(now);
    const fr = this.paint(now);
    if (!this.clock.playing) return;
    const stepAt = this.steps ? nextStepAt(this.steps, now) : null;
    const wakeAt = [fr.nextChangeAt, stepAt].filter((v) => v != null);
    if (fr.animating) {
      this.raf = requestAnimationFrame(() => gen === this.generation && this.wake());
    } else if (wakeAt.length) {
      this.timer = setTimeout(() => gen === this.generation && this.wake(), Math.max(16, Math.min(...wakeAt) - now));
    }
  }

  destroy() {
    this.generation++;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.timer);
    this.unsubscribe();
  }
}

export function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
