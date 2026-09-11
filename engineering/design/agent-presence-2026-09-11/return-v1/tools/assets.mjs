// Asset list for return-v1. Shared by build-assets.mjs and the parity test.

import { CANDIDATES, OPTICAL, REST, VIEWBOX, svgMarkup } from "../src/geometry.mjs";

const THINK = { ...REST, morph: 1 };

export const ASSETS = [
  ...[16, 20, 24, 32, 64].flatMap((size) => [
    { file: `presence-quiet-corner-${size}.svg`, candidate: "JP", pose: "rest", size, material: "flat", title: "Agent presence, quiet corner" },
    { file: `presence-sloping-pout-${size}.svg`, candidate: "JP", pose: "think", size, material: "flat", title: "Agent presence, sloping pout" },
  ]),
  { file: "presence-a-bracket.svg", candidate: "A", pose: "rest", size: 24, material: "flat", title: "Agent presence A, calm bracket" },
  { file: "presence-b-ezh.svg", candidate: "B", pose: "rest", size: 24, material: "flat", title: "Agent presence B, geometric droop" },
  { file: "presence-c-epsilon.svg", candidate: "C", pose: "rest", size: 24, material: "flat", title: "Agent presence C, soft droop" },
  { file: "presence-ab-dots-rest.svg", candidate: "AB:", pose: "rest", size: 24, material: "flat", title: "Agent presence, colon eyes, rest" },
  { file: "presence-ab-dots-think.svg", candidate: "AB:", pose: "think", size: 24, material: "flat", title: "Agent presence, colon eyes, thinking shape" },
  { file: "presence-ab-rest-soft-64.svg", candidate: "AB", pose: "rest", size: 64, material: "soft", title: "Agent presence, rest, soft depth" },
  { file: "presence-ab-think-soft-64.svg", candidate: "AB", pose: "think", size: 64, material: "soft", title: "Agent presence, thinking shape, soft depth" },
  { file: "presence-ab-hard-contrast-64.svg", candidate: "AB", pose: "rest", size: 64, material: "hard", title: "Agent presence, hard extrusion (contrast only)" },
];

export function assetMarkup(asset) {
  return svgMarkup(asset.candidate, { size: asset.size, material: asset.material, params: asset.pose === "think" ? THINK : REST, title: asset.title });
}

export function manifest() {
  return {
    manifest: "agent-presence/assets",
    version: 2,
    source: "src/geometry.mjs (paths are exported, not hand-edited; see tools/build-assets.mjs)",
    viewBox: `0 0 ${VIEWBOX} ${VIEWBOX}`,
    colour: "stroke = currentColor; depth/sheen layers read --presence-depth / --presence-sheen with a flat-safe fallback",
    opticalStrokeUnits: OPTICAL,
    opticalNote: "Stroke is in viewBox units and changes with the rendered size (experimental). Flat assets are exported at the 24 px optical stroke; other sizes are rendered from the geometry source.",
    candidates: Object.fromEntries(Object.entries(CANDIDATES).map(([key, c]) => [key, { id: c.id, name: c.name, eyes: c.eyes, restMouth: c.rest, thinkMouth: c.think }])),
    route: "JP = quiet corner at rest, original sloping pout during explicit thinking. AB and A/B/C remain historical comparisons; message placement is default.",
    assets: ASSETS.map(({ file, candidate, pose, size, material }) => ({ file, candidateId: CANDIDATES[candidate].id, pose, opticalSize: size, material })),
  };
}
