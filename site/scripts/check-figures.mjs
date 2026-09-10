#!/usr/bin/env node
// Check the figures of the built page against their manifest (intake VG-10, VG-15).
//
//   node site/scripts/check-figures.mjs            # check site/dist
//   node site/scripts/check-figures.mjs --hashes   # print the source hashes the manifest should record
//
// Everything that can be decided from the bytes is decided here: registration,
// title and desc, status captions, the single-red rule, external references,
// literal colours, and a static geometry audit (text inside its box and the
// viewBox, no overlapping nodes, no connector through an unrelated node).
// Geometry is estimated from a character-width table, deliberately generous;
// site/scripts/verify.mjs measures the same three things with real glyphs.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { SITE, ROOT } from "./release.mjs";

const DIST = path.join(SITE, "dist");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = JSON.parse(await readFile(path.join(SITE, "src", "assets", "figures", "figures.json"), "utf8"));
const html = await readFile(path.join(DIST, "index.html"), "utf8");
const css = await readFile(path.join(DIST, "site.css"), "utf8");

const STATUS_WORDS = { research: /尚未交付/, concept: /concept/i, recorded: /录制|recorded/i };
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

// ---- markup helpers ----------------------------------------------------------
/** The complete element that starts at `start` (which must point at "<tag"). */
function elementAt(markup, start) {
  const tag = /<\/?([a-zA-Z][\w:-]*)\b[^>]*?(\/?)>/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let match; (match = tag.exec(markup)); ) {
    const [whole, name, selfClosing] = match;
    const closing = whole.startsWith("</");
    if (closing) depth--;
    else if (!selfClosing && !VOID.has(name.toLowerCase())) depth++;
    if (depth === 0) return markup.slice(start, match.index + whole.length);
  }
  throw new Error(`unterminated element at ${start}`);
}

const attributes = (openTag) =>
  Object.fromEntries([...openTag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));

/** A minimal XML tree for the SVG vocabulary the figures use. */
function parseSvg(markup) {
  const root = { name: "#root", attrs: {}, children: [], text: "" };
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<\/([\w:-]+)\s*>|<([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g;
  for (const [, close, open, attrs, selfClosing, text] of markup.matchAll(token)) {
    const top = stack.at(-1);
    if (close) { stack.pop(); continue; }
    if (open) {
      const node = { name: open, attrs: attributes(attrs ?? ""), children: [], text: "", parent: top };
      top.children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    if (text !== undefined) top.text += text;
  }
  return root.children[0];
}
const walk = (node, visit) => { visit(node); for (const child of node.children) walk(child, visit); };
const inherited = (node, name, fallback) => {
  for (let n = node; n; n = n.parent) if (n.attrs?.[name] !== undefined) return n.attrs[name];
  return fallback;
};
const within = (node, name) => { for (let n = node.parent; n; n = n.parent) if (n.name === name) return true; return false; };
const classes = (node) => (node.attrs.class ?? "").split(/\s+/).filter(Boolean);

// ---- static geometry ----------------------------------------------------------
function textWidth(text, size, { mono, bold }) {
  let em = 0;
  for (const ch of text) {
    if (/[⺀-鿿＀-￯]/.test(ch)) em += 1;
    else if (mono) em += 0.62 + 0.06; // monospace advance + the label letter-spacing
    else if (/[→≠↑]/.test(ch)) em += 1;
    else if (ch === " ") em += 0.3;
    else if (/[·,.;:'’]/.test(ch)) em += 0.34;
    else if (/[A-Z0-9]/.test(ch)) em += 0.7;
    else em += 0.58;
  }
  return em * size * (bold ? 1.06 : 1);
}

function textBox(node) {
  const size = Number(inherited(node, "font-size", 14));
  const anchor = inherited(node, "text-anchor", "start");
  const x = Number(node.attrs.x), y = Number(node.attrs.y);
  const content = node.text.trim();
  const w = textWidth(content, size, { mono: classes(node).includes("fig-label"), bold: classes(node).includes("fig-th") });
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
  return { x: left, y: y - 0.8 * size, right: left + w, bottom: y + 0.25 * size, label: content };
}

const rectBox = (node) => {
  const [x, y, w, h] = ["x", "y", "width", "height"].map((key) => Number(node.attrs[key]));
  return { x, y, right: x + w, bottom: y + h, label: node.attrs.id ?? node.parent?.attrs?.["data-node"] ?? `rect@${x},${y}` };
};
const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
const contains = (outer, inner, tolerance = 1) =>
  outer.x - tolerance <= inner.x && outer.y - tolerance <= inner.y && outer.right + tolerance >= inner.right && outer.bottom + tolerance >= inner.bottom;
const inside = (box, p, inset) => p.x > box.x + inset && p.x < box.right - inset && p.y > box.y + inset && p.y < box.bottom - inset;

function points(node) {
  if (node.name === "line") return [[+node.attrs.x1, +node.attrs.y1], [+node.attrs.x2, +node.attrs.y2]];
  if (node.name === "polyline") return node.attrs.points.trim().split(/\s+/).map((pair) => pair.split(",").map(Number));
  const d = node.attrs.d ?? "";
  if (!/^[\sMLHV\d.,-]+$/.test(d)) return null; // curves are left to the browser check
  const out = [];
  let x = 0, y = 0;
  for (const [, command, args] of d.matchAll(/([MLHV])([^MLHV]*)/g)) {
    const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    if (command === "H") x = n[0];
    else if (command === "V") y = n[0];
    else [x, y] = n;
    out.push([x, y]);
  }
  return out;
}

function sampler(poly) {
  const segments = poly.slice(1).map((p, i) => ({ a: poly[i], b: p, length: Math.hypot(p[0] - poly[i][0], p[1] - poly[i][1]) }));
  const total = segments.reduce((sum, s) => sum + s.length, 0);
  return (t) => {
    let remaining = total * t;
    for (const s of segments) {
      if (remaining <= s.length) {
        const f = s.length ? remaining / s.length : 0;
        return { x: s.a[0] + (s.b[0] - s.a[0]) * f, y: s.a[1] + (s.b[1] - s.a[1]) * f };
      }
      remaining -= s.length;
    }
    const last = poly.at(-1);
    return { x: last[0], y: last[1] };
  };
}

function geometry(svg, problems, id) {
  const [vx, vy, vw, vh] = svg.attrs.viewBox.split(/[\s,]+/).map(Number);
  const view = { x: vx, y: vy, right: vx + vw, bottom: vy + vh };
  const rects = [], texts = [], strokes = [];
  walk(svg, (node) => {
    if (within(node, "defs") || node.name === "defs") return;
    if (node.name === "rect") rects.push({ node, box: rectBox(node) });
    if (node.name === "text") texts.push({ node, box: textBox(node) });
    if (["line", "path", "polyline"].includes(node.name)) strokes.push(node);
  });
  const fail = (why, detail) => problems.push({ figure: id, why, detail });

  for (const { box } of [...rects, ...texts])
    if (!contains(view, box, 0.5)) fail("outside the viewBox", box.label);

  for (const text of texts) {
    const anchor = { x: Number(text.node.attrs.x), y: Number(text.node.attrs.y) - 0.3 * Number(inherited(text.node, "font-size", 14)) };
    const owners = rects.filter((r) => inside(r.box, anchor, 0)).sort((a, b) => overlap(a.box, a.box) - overlap(b.box, b.box));
    const owner = owners[0];
    if (owner && !contains(owner.box, text.box, 1)) fail("text overflows its box", `${text.box.label} in ${owner.box.label}`);
    for (const r of rects) {
      if (owners.includes(r) || contains(text.box, r.box)) continue;
      if (overlap(r.box, text.box) > 4) fail("text overlaps an unrelated node", `${text.box.label} / ${r.box.label}`);
    }
  }
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++)
      if (overlap(texts[i].box, texts[j].box) > 4) fail("texts overlap", `${texts[i].box.label} / ${texts[j].box.label}`);
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const [a, b] = [rects[i].box, rects[j].box];
      if (!contains(a, b) && !contains(b, a) && overlap(a, b) > 4) fail("nodes overlap", `${a.label} / ${b.label}`);
    }

  const edgeIds = new Set();
  for (const stroke of strokes) {
    const edge = stroke.attrs["data-edge"], deco = stroke.attrs["data-deco"];
    if (!edge && !deco) { fail("connector is neither data-edge nor data-deco", stroke.name); continue; }
    if (!edge) continue;
    if (edgeIds.has(edge)) fail("one semantic edge drawn twice", edge);
    edgeIds.add(edge);
    const poly = points(stroke);
    if (!poly) { fail("connector geometry not statically checkable", edge); continue; }
    const at = sampler(poly);
    const ends = [at(0), at(1)];
    for (const obstacle of [...rects, ...texts]) {
      if (ends.some((p) => inside(obstacle.box, p, -6))) continue;
      for (let t = 0.12; t <= 0.881; t += 0.04)
        if (inside(obstacle.box, at(t), 2)) { fail("connector crosses an unrelated node", `${edge} through ${obstacle.box.label}`); break; }
    }
  }
  return { rects: rects.length, texts: texts.length, edges: edgeIds.size };
}

// ---- locate every figure -----------------------------------------------------
function mountOf(entry) {
  if (entry.mount === "data-figure") {
    const at = html.search(new RegExp(`<[a-z]+\\b[^>]*\\bdata-figure="${entry.id}"`));
    return at === -1 ? null : { start: at, markup: elementAt(html, at) };
  }
  const [, holder, tag] = entry.mount.match(/^#([\w-]+)\s+(\w+)$/) ?? [];
  const host = html.search(new RegExp(`<[a-z]+\\b[^>]*\\bid="${holder}"`));
  if (host === -1) return null;
  const at = html.indexOf(`<${tag}`, host);
  return at === -1 ? null : { start: at, markup: elementAt(html, at) };
}

/** The page block a figure belongs to: the nearest enclosing top-level section. */
function blockOf(index) {
  const enclosing = [];
  for (const match of html.matchAll(/<section\b[^>]*>/g)) {
    if (match.index > index) break;
    const markup = elementAt(html, match.index);
    if (match.index + markup.length > index) enclosing.push({ start: match.index, markup, open: match[0] });
  }
  return enclosing.reverse().find((s) => /class="[^"]*\b(?:section|hero)\b/.test(s.open)) ?? enclosing[0] ?? null;
}
const plain = (markup) => markup.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");

// ---- run ---------------------------------------------------------------------
const problems = [];
const report = [];
const hashes = {};

const mounted = [...html.matchAll(/\bdata-figure="([^"]+)"/g)].map((m) => m[1]);
for (const id of mounted)
  if (!manifest.figures.some((entry) => entry.id === id)) problems.push({ figure: id, why: "data-figure has no manifest entry" });
if (new Set(manifest.figures.map((entry) => entry.id)).size !== manifest.figures.length) problems.push({ why: "duplicate manifest ids" });

for (const entry of manifest.figures) {
  const fail = (why, detail) => problems.push({ figure: entry.id, why, ...(detail === undefined ? {} : { detail }) });
  for (const field of ["id", "concepts", "status", "grammar", "renderer", "source", "red", "reducedMotion", "alt"])
    if (!(field in entry)) fail(`manifest field missing: ${field}`);
  if (!["shipped", "recorded", "research", "concept"].includes(entry.status)) fail("unknown status", entry.status);
  if (!["plate", "object", "ambient"].includes(entry.grammar)) fail("unknown grammar", entry.grammar);

  const mount = mountOf(entry);
  if (!mount) { fail("figure is not mounted in index.html", entry.mount); continue; }

  // Source: a file-backed figure is its file, byte for byte. An inline figure is
  // campaign markup: the manifest records where it lives, not a hash (VG-16).
  if (entry.source.basis === "file") {
    const bytes = await readFile(path.join(ROOT, entry.source.file));
    const actual = sha256(bytes);
    hashes[entry.id] = actual;
    if (!mount.markup.includes(bytes.toString("utf8").trim())) fail("mounted markup differs from its source file", entry.source.file);
    if (actual !== entry.source.sha256) fail("source sha256 differs from the manifest", { expected: entry.source.sha256, actual });
  } else if ("sha256" in entry.source) fail("inline figures carry no sha256 (VG-16)");

  // Status: anything not shipped says so inside its own block.
  const section = blockOf(mount.start);
  const block = plain(`${mount.markup} ${section?.markup ?? ""}`);
  const describedBy = mount.markup.match(/^<[^>]*aria-describedby="([^"]+)"/)?.[1];
  if (describedBy) {
    const target = html.search(new RegExp(`id="${describedBy}"`));
    if (target === -1) fail("aria-describedby target missing", describedBy);
    else if (!section || target < section.start || target > section.start + section.markup.length) fail("status caption is outside the figure's block", describedBy);
  }
  // Product presentation follows the fictional commercial-product brief.
  // Maturity remains in the versioned registry, not in customer-facing captions.
  if (!["research", "concept", "recorded", "shipped"].includes(entry.status)) fail("figure has no valid internal maturity classification");

  // Red: only the registered element, at most one per figure.
  const reds = [...mount.markup.matchAll(/<[a-z]+\b[^>]*\bclass="[^"]*\bfig-attention\b[^"]*"[^>]*>/g)].map((m) => attributes(m[0]).id ?? m[0]);
  if (reds.length > 1) fail("more than one red element", reds);
  if (entry.red === null && reds.length) fail("red element without a manifest registration", reds);
  if (entry.red) {
    if (!["attention", "decision"].includes(entry.red.concept)) fail("red registered on a concept VG-15 does not allow", entry.red.concept);
    if (reds.length !== 1 || `#${reds[0]}` !== entry.red.element) fail("registered red element not found as the figure's only red", { registered: entry.red.element, found: reds });
  }
  if (/campaign-attention-review|#b3262d|#ed9396/i.test(mount.markup)) fail("red written into the figure markup instead of the registered class");

  // External resources and active content.
  if (/<(?:script|foreignObject|image|iframe|use|style)\b/i.test(mount.markup)) fail("active or external-capable element inside the figure");
  if (/<a\b/i.test(mount.markup)) fail("link inside the figure");
  for (const [, name, value] of mount.markup.matchAll(/\s((?:xlink:)?href|src|srcset)="([^"]*)"/g))
    if (!value.startsWith("#")) fail("figure references a resource", `${name}=${value}`);
  for (const [, value] of mount.markup.matchAll(/url\(([^)]*)\)/g))
    if (!/^['"]?#/.test(value)) fail("figure references an external url()", value);
  if (/\son[a-z]+="/i.test(mount.markup)) fail("event handler attribute inside the figure");

  // SVG contract.
  const svgs = [...mount.markup.matchAll(/<svg\b/g)].map((m) => elementAt(mount.markup, m.index));
  const summary = { id: entry.id, status: entry.status, red: entry.red?.element ?? null, svgs: svgs.length };
  for (const markup of svgs) {
    const svg = parseSvg(markup);
    if (svg.attrs["aria-hidden"] === "true") continue; // decorative glyphs (brand icon) carry no meaning
    const [first, second] = svg.children;
    if (svg.attrs.role !== "img") fail("svg lacks role=img");
    if (first?.name !== "title" || !first.text.trim()) fail("svg lacks <title> as its first child");
    if (second?.name !== "desc" || !second.text.trim()) fail("svg lacks <desc> as its second child");
    const labelled = (svg.attrs["aria-labelledby"] ?? "").split(/\s+/);
    if (first?.attrs.id && !labelled.includes(first.attrs.id)) fail("aria-labelledby does not name the <title>");
    if (second?.name === "desc" && second.attrs.id && !labelled.includes(second.attrs.id)) fail("aria-labelledby does not name the <desc>");
    walk(svg, (node) => {
      for (const name of ["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"]) {
        const value = node.attrs[name];
        if (value !== undefined && !/^(?:currentColor|none|inherit|transparent|url\(#[\w-]+\))$/.test(value)) fail("literal colour in figure", `${name}="${value}"`);
      }
      if (node.attrs.style !== undefined) fail("inline style in figure", node.attrs.style);
    });
    // Figures styled by another sheet (pricing.css) cannot be measured statically;
    // verify.mjs measures them in the browser.
    summary.geometry = entry.geometry === "browser" ? "measured by verify.mjs" : geometry(svg, problems, entry.id);
  }
  report.push(summary);
}

// Red anywhere outside a registered figure, and the stylesheet's use of the token.
const allReds = [...html.matchAll(/\bclass="[^"]*\bfig-attention\b/g)].length;
const registeredReds = manifest.figures.filter((entry) => entry.red).length;
if (allReds !== registeredReds) problems.push({ why: "page carries figure red elements the manifest does not register", detail: { onPage: allReds, registered: registeredReds } });
const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
for (const [, selector, body] of code.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  if (!/var\(--campaign-attention-review\)/.test(body)) continue;
  // The interactive product idea uses the same review meaning: the changed
  // state is accompanied by the human-judgment label, not a brand accent.
  const storyReviewSelectors = new Set(['.attention-path', '.attention-target-mark', '[data-product-story="changed"] .attention-target', '[data-product-story="changed"] [data-attention-state]']);
  const ok = selector.split(",").every((part) => /\.review-attention\b|\.fig-attention\b/.test(part) || storyReviewSelectors.has(part.trim()));
  if (!ok) problems.push({ why: "red token used outside the Review slot and the registered figure class", detail: selector.trim() });
}

if (process.argv.includes("--hashes")) {
  console.log(JSON.stringify(hashes, null, 2));
} else {
  console.log(JSON.stringify({ figures: report, problems, pass: problems.length === 0 }, null, 2));
  if (problems.length) process.exitCode = 1;
}
