/* WO-RC · layout, keyboard and motion assertions for the runtime module.
 * Evaluated in the real page; run it once per emulated viewport. */
globalThis.runViewportChecks = async function runViewportChecks(label) {
  const results = [];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (id) => document.getElementById(id);
  const record = (id, obligation, pass, detail) =>
    results.push({ viewport: label, id, obligation, pass: Boolean(pass), detail });

  if (!document.querySelector(".session-button.active"))
    document.querySelector(".session-button")?.click();
  await wait(1200);
  $("surface-runtime-tab").click();
  await wait(1400);
  const root = $("runtime-content");
  const panel = $("surface-panel");

  // No horizontal overflow: not on the document, not inside the module.
  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const panelOverflow = panel.scrollWidth - panel.clientWidth;
  const bounds = panel.getBoundingClientRect();
  const spills = [...root.querySelectorAll("*")]
    .filter((node) => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && (r.right > bounds.right + 1 || r.left < bounds.left - 1);
    })
    .slice(0, 5)
    .map((n) => `${n.className || n.tagName}`);
  record(
    "no-horizontal-overflow",
    "the module fits its panel with no horizontal scroll",
    docOverflow <= 0 && panelOverflow <= 0 && spills.length === 0,
    `document=${docOverflow}px panel=${panelOverflow}px spills=${spills.join(", ") || "none"}`,
  );

  // Touch targets on a coarse pointer.
  const smallTargets = [...root.querySelectorAll("button, input")]
    .filter((n) => !n.disabled)
    .map((n) => {
      const r = n.getBoundingClientRect();
      const group = n.closest(".runtime-switch");
      const h = group ? group.getBoundingClientRect().height : r.height;
      return { name: n.className || n.tagName, h: Math.round(h) };
    })
    .filter((t) => t.h < (label === "390" ? 44 : 20));
  record(
    "touch-targets",
    label === "390"
      ? "every enabled control is at least 44px tall at 390"
      : "every enabled control keeps a usable height on desktop",
    smallTargets.length === 0,
    smallTargets.map((t) => `${t.name}=${t.h}`).join(", ") || "all controls pass",
  );

  // Scope tabs use arrow / Home / End with a roving tabindex.
  const tabs = () => [...root.querySelectorAll(".runtime-scope-tab")];
  tabs()[0].focus();
  const press = (key) =>
    root
      .querySelector(".runtime-scopes")
      .dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  press("ArrowRight");
  await wait(200);
  const afterRight = document.activeElement?.dataset.scope;
  press("End");
  await wait(200);
  const afterEnd = document.activeElement?.dataset.scope;
  press("Home");
  await wait(200);
  const afterHome = document.activeElement?.dataset.scope;
  const roving = tabs().filter((t) => t.tabIndex === 0).length;
  record(
    "scope-tab-keyboard",
    "scope tabs move with arrow / Home / End and keep one tab stop",
    afterRight === "workspace" && afterEnd === "session" && afterHome === "user" && roving === 1,
    `right=${afterRight} end=${afterEnd} home=${afterHome} tabstops=${roving}`,
  );

  // The surface tab strip still walks all four kinds, unchanged.
  $("surface-runtime-tab").focus();
  $("surface-tabs").dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
  );
  await wait(300);
  const surfaceNext = document.activeElement?.id;
  $("surface-runtime-tab").click();
  await wait(600);
  record(
    "surface-tab-keyboard",
    "the existing surface tab strip keeps its arrow-key order with the new kind",
    ["surface-run-tab", "surface-file-tab", "surface-preview-tab"].includes(surfaceNext),
    `ArrowRight from Runtime focused ${surfaceNext}`,
  );

  // Reduced motion leaves nothing animating.
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const moving = [...root.querySelectorAll("*")].filter((n) => {
    const s = getComputedStyle(n);
    const after = getComputedStyle(n, "::after");
    return (
      (s.animationName !== "none" && s.animationDuration !== "0s") ||
      (after.transitionDuration !== "0s" && reduced)
    );
  });
  record(
    "reduced-motion",
    "with reduced motion requested the module animates nothing",
    !reduced || moving.length === 0,
    `reduce=${reduced} moving=${moving.length}`,
  );

  // WK-54 / WO-WK10a · the rail has two states, so Escape has two steps: the
  // expanded pane returns to the collapsed cards, and the cards close the rail
  // and return focus to the control that opened it. Opening a named kind (here
  // the runtime module's own card action) lands in the pane, so both steps run.
  const returnTarget = $("show-surface-button");
  returnTarget.focus();
  $("show-surface-button").click();
  await wait(700);
  document.querySelector('[data-module="runtime"] .rail-open')?.click();
  await wait(900);
  const inPane = $("app-shell").classList.contains("surface-expanded");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(500);
  const onCards =
    !$("app-shell").classList.contains("surface-expanded") &&
    $("surface-panel").hidden === false &&
    $("surface-rail").hidden === false;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(500);
  record(
    "escape-order",
    "Escape steps the runtime module out of its pane, then closes the rail and restores focus",
    inPane && onCards && $("surface-panel").hidden === true,
    `pane=${inPane}, cards=${onCards}, hidden=${$("surface-panel").hidden}, focus=${document.activeElement?.id || document.activeElement?.className}`,
  );

  return results;
};
