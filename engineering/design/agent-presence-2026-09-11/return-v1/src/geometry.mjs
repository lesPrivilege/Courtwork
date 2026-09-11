// Agent presence · geometry source (return-v1, synthetic specimen).
//
// One 24-unit square. The face is horizontal and stays horizontal: the eye pair
// sits left, the mouth right, the way `=]` reads on a line of text. Nothing here
// is a font glyph; every mark is a hand-set path. Colour is never decided here —
// the host paints `currentColor` and the two material roles in styles/.
//
// Every mouth is one open cubic chain with the same anatomy (p0 + 4 × [c1, c2,
// end] = 13 points), so any pose, and any hand-over from one mouth to another,
// is a point-wise blend. That is what lets a state change continue from the
// shape currently on screen instead of cutting to a new drawing.
//
// All functions are pure: no clock, no DOM, no randomness beyond the seed.

export const VIEWBOX = 24;
const MID_Y = 12;
const MOUTH_X = 14.6; // the mouth's inner edge; bulge scales away from it

/* Eyes. `bars` is the `=` pair; `dots` is the `:` variant, offered only for
 * the recommended geometry (HANDOFF §2). */
export const EYES = {
  bars: { kind: "bars", x0: 4.6, x1: 9.4, top: 9, bottom: 15 },
  dots: { kind: "dots", x: 7.4, top: 9, bottom: 15 },
};

/* Mouths. The source symbol names topology only; the drawing is original. */
export const MOUTHS = {
  // Final quiet mouth: open at the top, a straight stem and lower return.
  // The `」` reference supplies topology only; no upper bracket arm.
  corner: [
    [18.4, 7.0],
    [18.4, 8.3], [18.4, 9.7], [18.4, 11.0],
    [18.4, 12.6], [18.4, 14.2], [18.4, 15.8],
    [18.4, 16.9], [17.9, 17.4], [16.8, 17.4],
    [15.9, 17.4], [15.0, 17.4], [14.1, 17.4],
  ],
  // Original sloping pout: a smaller upper lip and heavier hanging lower lip.
  // Asymmetric curved entry replaces the old flat `Ʒ` cap/diagonal.
  pout: [
    [15.0, 7.7],
    [17.6, 7.8], [19.0, 8.6], [18.5, 10.4],
    [18.2, 11.4], [16.9, 11.7], [16.5, 12.4],
    [19.1, 12.1], [20.0, 13.9], [19.0, 15.8],
    [18.1, 17.5], [16.2, 18.1], [14.7, 17.8],
  ],
  // A · calm bracket-arc, between `]` and `)`: two short returns, one straight
  // vertical, corners opened to a 1.6-unit radius.
  bracket: [
    [14.6, 6.6],
    [15.3, 6.6], [16.0, 6.6], [16.6, 6.6],
    [17.6, 6.6], [18.4, 7.5], [18.4, 12],
    [18.4, 16.5], [17.6, 17.4], [16.6, 17.4],
    [16.0, 17.4], [15.3, 17.4], [14.6, 17.4],
  ],
  // B · geometric droop after `Ʒ`: a flat lid, one straight diagonal to the
  // waist, then a single bowl that hangs out and returns under itself.
  ezh: [
    [14.6, 6.3],
    [16.0, 6.3], [17.4, 6.3], [18.7, 6.3],
    [17.7, 7.9], [16.7, 9.5], [15.7, 11.1],
    [18.3, 10.9], [19.9, 12.5], [19.9, 14.6],
    [19.9, 16.9], [17.6, 18.0], [14.9, 17.8],
  ],
  // C · soft droop after `ε`: two lobes leaning back toward the eyes, open to
  // the right, meeting at a short waist.
  epsilon: [
    [18.8, 7.3],
    [17.6, 5.9], [14.6, 6.4], [14.9, 8.9],
    [15.1, 10.7], [16.4, 11.8], [17.5, 12.0],
    [16.4, 12.2], [15.1, 13.3], [14.9, 15.1],
    [14.6, 17.6], [17.6, 18.1], [18.8, 16.7],
  ],
};

/* Candidates. `rest` is the mouth at idle; `think` is the mouth an explicit
 * thinking fact morphs toward. A/B/C keep one mouth each (the comparison);
 * `AB` is the recommended route: A at rest, B while thinking. */
export const CANDIDATES = {
  JP: { id: "presence-corner-pout", name: "Quiet corner → sloping pout", eyes: "bars", rest: "corner", think: "pout" },
  A: { id: "presence-a-bracket", name: "A · calm bracket", eyes: "bars", rest: "bracket", think: "bracket" },
  B: { id: "presence-b-ezh", name: "B · geometric droop", eyes: "bars", rest: "ezh", think: "ezh" },
  C: { id: "presence-c-epsilon", name: "C · soft droop", eyes: "bars", rest: "epsilon", think: "epsilon" },
  AB: { id: "presence-ab-route", name: "A→B route", eyes: "bars", rest: "bracket", think: "ezh" },
  "AB:": { id: "presence-ab-route-dots", name: "A→B route · colon eyes", eyes: "dots", rest: "bracket", think: "ezh" },
};

/* Optical stroke per rendered size, in viewBox units (experimental values).
 * Small sizes carry a heavier unit stroke so the mark survives at 1–1.6 px;
 * large sizes lighten because soft depth supplies the weight. */
export const OPTICAL = {
  16: { stroke: 2.4, dot: 3.2 },
  20: { stroke: 2.2, dot: 3.0 },
  24: { stroke: 2.0, dot: 2.8 },
  32: { stroke: 1.9, dot: 2.7 },
  64: { stroke: 1.7, dot: 2.5 },
};
export const SIZES = Object.keys(OPTICAL).map(Number);
export function optical(size) {
  const exact = OPTICAL[size];
  if (exact) return exact;
  const nearest = SIZES.reduce((a, b) => (Math.abs(b - size) < Math.abs(a - size) ? b : a));
  return OPTICAL[nearest];
}
/** Soft depth exists only from 32 px; below it every request resolves flat. */
export function resolveMaterial(material, size) {
  if (material === "soft" && size < 32) return "flat";
  return material;
}

/* ---- pose parameters -------------------------------------------------- */

export const REST = Object.freeze({ gaze: 0, stagger: 0, press: 0, bulge: 0, morph: 0 });
const KEYS = Object.keys(REST);

/* Motion values (experimental; see decision.md). */
export const MOTION = {
  thinkPeriodMs: 2600, // one press-and-open of the mouth
  thinkPress: 0.55, // ±5.5 % mouth height
  thinkBulgeRatio: -0.6, // squash widens, stretch narrows — volume is kept
  settleMs: 220, // brand contract ceiling for one motion
  settlePress: -0.45,
  transitionMs: 180, // --duration in app/web/styles.css
};

/* Deterministic seed helpers (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedPhase(seed) {
  const next = rng(seed);
  return { phase: next() * Math.PI * 2, periodScale: 1 + (next() - 0.5) * 0.08 };
}

/**
 * Pose parameters at `elapsedMs` since the pose began.
 * pose: rest | think | look | hold | settle | dim
 */
export function sample(pose, elapsedMs, { seed = 1, reducedMotion = false } = {}) {
  const t = Math.max(0, elapsedMs);
  switch (pose) {
    case "think": {
      if (reducedMotion) return { ...REST, morph: 1 };
      const { phase, periodScale } = seedPhase(seed);
      const period = MOTION.thinkPeriodMs * periodScale;
      // Ease in from the drawn shape: the first quarter-cycle ramps amplitude
      // so a fresh thinking fact never starts mid-stroke.
      const ramp = Math.min(1, t / (period / 4));
      const press = MOTION.thinkPress * ramp * Math.sin((2 * Math.PI * t) / period + phase * ramp);
      return { ...REST, morph: 1, press, bulge: press * MOTION.thinkBulgeRatio };
    }
    case "look":
      return { ...REST, gaze: 0.8, stagger: 0.45 };
    case "hold":
      return { ...REST, press: 0.18 };
    case "settle": {
      if (reducedMotion || t >= MOTION.settleMs) return { ...REST };
      const k = t / MOTION.settleMs;
      return { ...REST, press: MOTION.settlePress * Math.sin(Math.PI * k) };
    }
    case "dim":
    case "rest":
    default:
      return { ...REST };
  }
}

/** Is the pose still changing at this time? (drives the frame scheduler) */
export function poseAnimating(pose, elapsedMs, reducedMotion) {
  if (reducedMotion) return false;
  if (pose === "think") return true;
  if (pose === "settle") return elapsedMs < MOTION.settleMs;
  return false;
}

/* cubic-bezier(0.2, 0, 0, 1) — the app's --ease-out, solved numerically. */
export function easeOut(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 0.2, cy = 0, dx = 0, dy = 1;
  const bx = (t) => 3 * (1 - t) * (1 - t) * t * cx + 3 * (1 - t) * t * t * dx + t * t * t;
  const by = (t) => 3 * (1 - t) * (1 - t) * t * cy + 3 * (1 - t) * t * t * dy + t * t * t;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x) lo = mid; else hi = mid;
  }
  return by((lo + hi) / 2);
}

export function blend(from, to, k) {
  const out = {};
  for (const key of KEYS) out[key] = from[key] + (to[key] - from[key]) * k;
  return out;
}

/* ---- paths ------------------------------------------------------------- */

const f = (n) => (Math.round(n * 100) / 100).toString();

export function eyePath(eyes, params) {
  const e = EYES[eyes];
  const shiftTop = params.gaze * 1.0 + params.stagger * 0.6;
  const shiftBottom = params.gaze * 1.0 - params.stagger * 0.6;
  if (e.kind === "dots") {
    return `M${f(e.x + shiftTop)} ${e.top}h0M${f(e.x + shiftBottom)} ${e.bottom}h0`;
  }
  return (
    `M${f(e.x0 + shiftTop)} ${e.top}H${f(e.x1 + shiftTop)}` +
    `M${f(e.x0 + shiftBottom)} ${e.bottom}H${f(e.x1 + shiftBottom)}`
  );
}

export function mouthPoints(candidate, params) {
  const c = CANDIDATES[candidate];
  const a = MOUTHS[c.rest];
  const b = MOUTHS[c.think];
  const sx = 1 + 0.2 * params.bulge;
  const sy = 1 - 0.1 * params.press;
  return a.map(([ax, ay], i) => {
    const x = ax + (b[i][0] - ax) * params.morph;
    const y = ay + (b[i][1] - ay) * params.morph;
    return [MOUTH_X + (x - MOUTH_X) * sx, MID_Y + (y - MID_Y) * sy];
  });
}

export function mouthPath(candidate, params) {
  const p = mouthPoints(candidate, params);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length; i += 3) {
    d += `C${f(p[i][0])} ${f(p[i][1])} ${f(p[i + 1][0])} ${f(p[i + 1][1])} ${f(p[i + 2][0])} ${f(p[i + 2][1])}`;
  }
  return d;
}

export function paths(candidate, params = REST) {
  const c = CANDIDATES[candidate];
  return { eyes: eyePath(c.eyes, params), mouth: mouthPath(candidate, params), eyeKind: EYES[c.eyes].kind };
}

/* ---- material layers --------------------------------------------------- */

/* Offsets in viewBox units (experimental). Soft = one depth layer plus a thin
 * sheen inside the ink stroke. Hard = a stacked extrusion, static contrast only. */
export const DEPTH = {
  soft: { dx: 0.5, dy: 0.75, grow: 0.3, sheen: { dx: -0.2, dy: -0.24, width: 0.3 } },
  hard: { steps: 5, dx: 0.32, dy: 0.42 },
};

/* Layer colours come from the host (styles/presence.css maps them to theme
 * roles). Without a host the depth falls back to a faint currentColor and the
 * sheen disappears, so a bare <img> still reads as the flat mark. */
const LAYER_STYLE = {
  "pr-depth": "stroke:var(--presence-depth,currentColor);stroke-opacity:var(--presence-depth-opacity,.25)",
  "pr-sheen": "stroke:var(--presence-sheen,transparent);stroke-opacity:var(--presence-sheen-opacity,.28)",
};

/** Static SVG markup for a pose (used for assets/ and the comparison board). */
export function svgMarkup(candidate, { size = 24, material = "flat", params = REST, title = null } = {}) {
  const resolved = resolveMaterial(material, size);
  const { stroke, dot } = optical(size);
  const p = paths(candidate, params);
  const eyeStroke = p.eyeKind === "dots" ? dot : stroke;
  const layer = (cls, extra = 0, transform = "") =>
    `<g class="${cls}"${transform ? ` transform="${transform}"` : ""}${LAYER_STYLE[cls] ? ` style="${LAYER_STYLE[cls]}"` : ""}>` +
    `<path class="pr-eyes" d="${p.eyes}" stroke-width="${f(eyeStroke + extra)}"/>` +
    `<path class="pr-mouth" d="${p.mouth}" stroke-width="${f(stroke + extra)}"/></g>`;
  let body = "";
  if (resolved === "soft") {
    const s = DEPTH.soft;
    body += layer("pr-depth", s.grow, `translate(${s.dx} ${s.dy})`);
    body += layer("pr-ink");
    body +=
      `<g class="pr-sheen" transform="translate(${s.sheen.dx} ${s.sheen.dy})" style="${LAYER_STYLE["pr-sheen"]}">` +
      `<path class="pr-eyes" d="${p.eyes}" stroke-width="${p.eyeKind === "dots" ? f(dot * 0.3) : s.sheen.width}"/>` +
      `<path class="pr-mouth" d="${p.mouth}" stroke-width="${s.sheen.width}"/></g>`;
  } else if (resolved === "hard") {
    const h = DEPTH.hard;
    for (let i = h.steps; i >= 1; i--) body += layer("pr-depth", 0, `translate(${f(h.dx * i)} ${f(h.dy * i)})`);
    body += layer("pr-ink");
  } else {
    body += layer("pr-ink");
  }
  const label = title ? `<title>${title}</title>` : "";
  const aria = title ? `role="img" aria-label="${title}"` : `aria-hidden="true"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${size}" height="${size}" ` +
    `class="presence-svg" data-candidate="${candidate}" data-material="${resolved}" ${aria} ` +
    `fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${label}${body}</svg>`
  );
}
