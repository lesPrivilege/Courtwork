/* FE-05 · Material specimen — specimen-local script.
   Three jobs, none of them product behaviour:
     1. drive the SPECIMEN CONTROLS (theme / backdrop / accessibility);
     2. park every stage's scroll so real content sits under the material;
     3. expose window.__specimenMeasure() and window.__specimenCheck() so the
        capture driver reads facts out of the live page instead of restating
        the CSS by hand.
   No product module imports this file. Nothing here animates a material. */

const root = document.documentElement;

/* ── controls ──────────────────────────────────────────────────────────── */
const ATTR = { theme: "data-theme", backdrop: "data-backdrop", a11y: "data-a11y" };

for (const group of document.querySelectorAll("[data-control]")) {
  const control = group.dataset.control;
  group.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-value]");
    if (!button) return;
    setControl(control, button.dataset.value);
  });
}

function setControl(control, value) {
  root.setAttribute(ATTR[control], value);
  for (const button of document.querySelectorAll(
    `[data-control="${control}"] button[data-value]`,
  ))
    button.setAttribute("aria-pressed", String(button.dataset.value === value));
}
window.__specimenSetControl = setControl;

/* ── scroll parking ────────────────────────────────────────────────────── */
/* Every stage is scrolled to a fixed offset so the same words sit under the
   header edge, the popover and the jump pill in every capture. It is a static
   offset applied once, not a scroll handler: no material property is a
   function of scroll position anywhere in this specimen. */
function parkScroll() {
  for (const stream of document.querySelectorAll("[data-spec-scroll]"))
    stream.scrollTop = 96;
}
parkScroll();
new ResizeObserver(parkScroll).observe(document.body);
window.__specimenParkScroll = parkScroll;

/* ── measurement ───────────────────────────────────────────────────────── */
const BLUR = /blur\(([^)]+)\)/;
const SATURATE = /saturate\(([^)]+)\)/;

function materialOf(element, pseudo = null) {
  const style = getComputedStyle(element, pseudo);
  const filter =
    style.backdropFilter && style.backdropFilter !== "none"
      ? style.backdropFilter
      : style.webkitBackdropFilter || "none";
  const mask =
    style.maskImage && style.maskImage !== "none"
      ? style.maskImage
      : style.webkitMaskImage || "none";
  return {
    layer: pseudo ?? "element",
    background: style.backgroundColor,
    backdrop_filter: filter,
    blur_px: filter !== "none" && BLUR.test(filter) ? BLUR.exec(filter)[1] : null,
    saturation:
      filter !== "none" && SATURATE.test(filter)
        ? Number(SATURATE.exec(filter)[1])
        : filter !== "none"
          ? 1
          : null,
    mask: mask === "none" ? "none" : mask,
    border: style.borderBottomWidth + " " + style.borderBottomColor,
    box_shadow: style.boxShadow,
    border_radius: style.borderRadius,
  };
}

function extensionOf(element) {
  if (!element.matches('.chat-header[data-h="h3"]')) return 0;
  const before = getComputedStyle(element, "::before");
  const value = parseFloat(before.bottom);
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

function backdropRootOf(element) {
  /* MDN: filter, opacity < 1, mask, backdrop-filter and mix-blend-mode on an
     ancestor bound what a descendant's backdrop-filter can sample. */
  let node = element.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const reasons = [];
    if (style.filter !== "none") reasons.push("filter");
    if (parseFloat(style.opacity) < 1) reasons.push("opacity<1");
    if (style.maskImage !== "none" && style.maskImage) reasons.push("mask-image");
    if (style.backdropFilter && style.backdropFilter !== "none")
      reasons.push("backdrop-filter");
    if (style.mixBlendMode !== "normal") reasons.push("mix-blend-mode");
    if (reasons.length)
      return {
        selector: describe(node),
        reasons,
      };
    node = node.parentElement;
  }
  return { selector: "document", reasons: [] };
}

function clippingAncestorOf(element) {
  let node = element.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (style.overflow !== "visible")
      return { selector: describe(node), overflow: style.overflow };
    node = node.parentElement;
  }
  return null;
}

function describe(node) {
  const classes = [...node.classList].map((c) => "." + c).join("");
  return (node.tagName.toLowerCase() + classes).slice(0, 80);
}

function measure() {
  const rows = [];
  const seen = new Set();
  for (const element of document.querySelectorAll("[data-surface][data-variant], [data-surface][data-h]")) {
    const surface = element.dataset.surface;
    const variant = element.dataset.variant ?? element.dataset.h;
    const key = surface + "/" + variant + "/" + (element.dataset.edge ?? "");
    if (seen.has(key)) continue;
    seen.add(key);
    const before = getComputedStyle(element, "::before");
    const hasBefore = before.content && before.content !== "none";
    const layers = [materialOf(element)];
    if (hasBefore) layers.push(materialOf(element, "::before"));
    const activeLayers = layers.filter((l) => l.backdrop_filter !== "none");
    const box = element.getBoundingClientRect();
    rows.push({
      surface,
      variant,
      edge: element.dataset.edge ?? null,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      theme: root.getAttribute("data-theme"),
      backdrop_state: root.getAttribute("data-backdrop"),
      accessibility_state: root.getAttribute("data-a11y"),
      layers,
      backdrop_sampling_layers: activeLayers.length,
      blur_px: activeLayers.map((l) => l.blur_px).filter(Boolean),
      saturation: activeLayers.map((l) => l.saturation),
      mask: layers.map((l) => l.mask).filter((m) => m !== "none"),
      sampling_extension_px: extensionOf(element),
      nearest_backdrop_root: backdropRootOf(element),
      clipping_ancestor: clippingAncestorOf(element),
      clipped: false,
      size: { width: Math.round(box.width), height: Math.round(box.height) },
      backdrop_filter_supported: window.CSS?.supports?.(
        "backdrop-filter: blur(1px)",
      ) ?? false,
      frame_cost: "not_measured",
    });
  }
  return rows;
}
window.__specimenMeasure = measure;

/* ── static checks (specimen validation, not production lint-materials) ─── */
const ALLOWED_BLUR = new Set(["12px", "16px"]);
const CONTENT_PLANES = [
  ".message-stream",
  ".message-list",
  ".conversation-body",
  ".chat-panel",
  ".spec-doc",
  ".spec-stage",
];

function check() {
  const problems = [];

  /* 1 · every active sampling layer belongs to a declared specimen variant. */
  const declared = new Set([
    "jump-latest/j0",
    "context-popover/p0",
    "context-popover/p1",
    "context-popover/p2",
    "work-header/h1",
    "work-header/h2",
    "work-header/h3",
    "composer/c1",
    "inspector/transient",
  ]);
  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, "::before");
    const active =
      (style.backdropFilter && style.backdropFilter !== "none") ||
      (before.backdropFilter && before.backdropFilter !== "none");
    if (!active) continue;
    const owner = element.closest("[data-surface]");
    const nested = element.closest(".spec-nested-parent, .spec-nested-child");
    if (nested) continue; /* the declared glass-on-glass negative control */
    if (!owner) {
      problems.push(`undeclared sampling layer on ${describe(element)}`);
      continue;
    }
    const key =
      owner.dataset.surface + "/" + (owner.dataset.variant ?? owner.dataset.h);
    if (!declared.has(key)) problems.push(`sampling layer on undeclared variant ${key}`);
  }

  /* 2 · no blur radius except the two tokens. */
  for (const element of document.querySelectorAll("*"))
    for (const pseudo of [null, "::before", "::after"]) {
      const filter = getComputedStyle(element, pseudo).backdropFilter;
      if (!filter || filter === "none" || !BLUR.test(filter)) continue;
      const value = BLUR.exec(filter)[1];
      if (!ALLOWED_BLUR.has(value))
        problems.push(`blur ${value} on ${describe(element)}${pseudo ?? ""} is outside {12px, 16px}`);
    }

  /* 3 · no nested active sampling layers outside the negative control. */
  for (const element of document.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (!style.backdropFilter || style.backdropFilter === "none") continue;
    if (element.closest(".spec-nested-parent")) continue;
    let node = element.parentElement;
    while (node && node !== document.documentElement) {
      const parent = getComputedStyle(node);
      if (parent.backdropFilter && parent.backdropFilter !== "none")
        problems.push(`nested sampling layer: ${describe(element)} inside ${describe(node)}`);
      node = node.parentElement;
    }
  }

  /* 4 · reduced-transparency and no-support states clear both the filter and
        the mask. A solid surface that still fades out is not a fallback. */
  const restore = root.getAttribute("data-a11y");
  for (const state of ["reduce", "nosupport"]) {
    root.setAttribute("data-a11y", state);
    for (const element of document.querySelectorAll("[data-surface]"))
      for (const pseudo of [null, "::before"]) {
        const style = getComputedStyle(element, pseudo);
        if (pseudo && (!style.content || style.content === "none")) continue;
        if (style.backdropFilter && style.backdropFilter !== "none")
          problems.push(`${state}: ${describe(element)}${pseudo ?? ""} still samples a backdrop`);
        const mask = style.maskImage || style.webkitMaskImage;
        if (mask && mask !== "none")
          problems.push(`${state}: ${describe(element)}${pseudo ?? ""} still carries a mask-image`);
      }
  }
  root.setAttribute("data-a11y", restore);

  /* 5 · every glass variant has a solid fallback that keeps its anatomy. */
  const anatomy = (element) => ({
    text: element.textContent.replace(/\s+/g, " ").trim(),
    controls: element.querySelectorAll("button, a, input, textarea, select").length,
    width: Math.round(element.getBoundingClientRect().width),
    height: Math.round(element.getBoundingClientRect().height),
  });
  const before = new Map();
  for (const element of document.querySelectorAll("[data-surface]"))
    before.set(element, anatomy(element));
  root.setAttribute("data-a11y", "reduce");
  for (const [element, was] of before) {
    const now = anatomy(element);
    for (const field of ["text", "controls", "width", "height"])
      if (was[field] !== now[field])
        problems.push(
          `fallback changes ${field} on ${describe(element)}: ${was[field]} → ${now[field]}`,
        );
  }
  root.setAttribute("data-a11y", restore);

  /* 6 · no content plane carries a material. */
  for (const selector of CONTENT_PLANES)
    for (const element of document.querySelectorAll(selector))
      for (const pseudo of [null, "::before", "::after"]) {
        const filter = getComputedStyle(element, pseudo).backdropFilter;
        if (filter && filter !== "none")
          problems.push(`content plane ${selector}${pseudo ?? ""} carries a backdrop-filter`);
      }

  return {
    ok: problems.length === 0,
    checks: [
      "sampling layers only on declared specimen variants",
      "blur radius in {12px, 16px}",
      "no nested sampling layers outside the negative control",
      "reduce / nosupport clear both backdrop-filter and mask-image",
      "fallback preserves label, control count and geometry",
      "no content plane carries a material",
    ],
    problems: [...new Set(problems)],
  };
}
window.__specimenCheck = check;

document.getElementById("spec-run-checks")?.addEventListener("click", () => {
  const result = check();
  document.getElementById("spec-check-output").textContent = result.ok
    ? `specimen checks: ok (${result.checks.length} checks)`
    : `specimen checks: ${result.problems.length} problem(s)\n` +
      result.problems.join("\n");
});
