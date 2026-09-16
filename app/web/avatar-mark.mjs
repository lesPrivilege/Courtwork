import { el } from "./ui-controls.mjs";

/* Home identity · the avatar. Three sources: the person's photo, the initial
 * of their address, or a Courtwork portrait — a seal-like mark drawn from the
 * name and role on a fixed 5×5 grid, so the same person always gets the same
 * mark and no two names share one by accident. The mark is the only place on
 * the Profile with any personality; everything around it stays quiet. */

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function initialOf(profile) {
  for (const key of ["workAddress", "preferredName", "fullName"]) {
    const value = profile?.[key];
    if (typeof value === "string" && value.trim()) return [...value.trim()][0];
  }
  return "·";
}

/** Symmetric 5×5 cells from the identity seed; cell (x,y) mirrors (4−x,y). */
export function portraitCells(seed) {
  let h = hash(seed || "courtwork");
  const cells = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    if ((h & 7) < 3) { cells.push([x, y]); if (x !== 2) cells.push([4 - x, y]); }
  }
  return cells;
}

export function renderAvatar(profile, { size = 28 } = {}) {
  const kind = profile?.avatar?.kind ?? "initial";
  const initial = initialOf(profile);
  const wrap = el("span", { className: `avatar avatar-${kind}`, attrs: { "aria-hidden": "true", style: `--avatar-size: ${size}px` } });
  if (kind === "photo" && typeof profile?.avatar?.dataUrl === "string") {
    const img = el("img", { attrs: { src: profile.avatar.dataUrl, alt: "" } });
    wrap.append(img);
    return wrap;
  }
  if (kind === "portrait") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 5 5");
    svg.setAttribute("aria-hidden", "true");
    for (const [x, y] of portraitCells(`${profile?.fullName ?? ""}|${profile?.role ?? ""}|${initial}`)) {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(x)); rect.setAttribute("y", String(y)); rect.setAttribute("width", "1"); rect.setAttribute("height", "1");
      svg.append(rect);
    }
    wrap.append(svg, el("span", { className: "avatar-initial", text: initial }));
    return wrap;
  }
  wrap.append(el("span", { className: "avatar-initial", text: initial }));
  return wrap;
}
