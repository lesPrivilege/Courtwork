/* WO-WK11 · adapted from evidence/final-integration-20260908/rc/runtime-ui-viewport.mjs.
 *
 * Layout, keyboard and motion, measured where the catalogue now lives: the
 * Runtime group of the Settings page. Overflow and hit regions are measured
 * against the page's own scrolling column instead of the surface panel. Two
 * checks changed subject because their subject is gone: the surface tab strip
 * no longer carries a Runtime tab, so the tab-order check now walks the
 * Configurable / Inventory pair this order introduced, and the Escape check now
 * follows the rail card's Open into the page and back out. Named in
 * delivery-wk11 §7.
 */
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
  location.hash = "#settings/runtime";
  await wait(1800);
  const root = $("settings-runtime");
  const panel = $("settings-sections");

  // No horizontal overflow: not on the document, not inside the module.
  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const panelOverflow = panel.scrollWidth - panel.clientWidth;
  const bounds = panel.getBoundingClientRect();
  /* WO-WK11 · wide content is allowed to be wider than the column as long as it
     scrolls inside its own box, which is the standing convention; what is not
     allowed is the column or the document scrolling sideways. A node inside an
     overflow-x container is therefore not a spill — its own box is clipped, and
     `panelOverflow` above is what proves the column itself does not move. */
  const insideScroller = (node) => {
    for (let n = node.parentElement; n && n !== root; n = n.parentElement)
      if (["auto", "scroll"].includes(getComputedStyle(n).overflowX)) return true;
    return false;
  };
  const spills = [...root.querySelectorAll("*")]
    .filter((node) => {
      const r = node.getBoundingClientRect();
      return (
        r.width > 0 &&
        (r.right > bounds.right + 1 || r.left < bounds.left - 1) &&
        !insideScroller(node)
      );
    })
    .slice(0, 5)
    .map((n) => `${n.className || n.tagName}`);
  record(
    "no-horizontal-overflow",
    "the group fits its column with no horizontal scroll",
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

  /* WO-WK11 · the Configurable / Inventory pair is a tablist inside the
     Capabilities block; arrow keys move it and it keeps one tab stop. */
  const subtabs = () => [...root.querySelectorAll(".runtime-subtab")];
  subtabs()[0].focus();
  root
    .querySelector(".runtime-subtabs")
    .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  await wait(400);
  const subNext = document.activeElement?.dataset.subtab;
  const subRoving = subtabs().filter((t) => t.tabIndex === 0).length;
  root
    .querySelector(".runtime-subtabs")
    .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
  await wait(400);
  record(
    "capability-tab-keyboard",
    "Configurable / Inventory move with arrow keys and keep one tab stop",
    subNext === "inventory" &&
      subRoving === 1 &&
      document.activeElement?.dataset.subtab === "configurable",
    `ArrowRight focused ${subNext}, tabstops=${subRoving}, back to ${document.activeElement?.dataset.subtab}`,
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

  /* WK-66 / FN-05 · the coarse rail card and the page tab are two entries to
     one reading. The card's Open leaves the rail and lands on the group; the
     rail is put away rather than layered under the page, and Escape leaves the
     page the way the page's own Back does. */
  $("settings-back-button").click();
  await wait(500);
  $("show-surface-button").focus();
  $("show-surface-button").click();
  await wait(800);
  document.querySelector('[data-module="runtime"] .rail-open')?.click();
  await wait(1400);
  const onGroup =
    $("settings-page").hidden === false &&
    $("settings-tab-runtime").getAttribute("aria-selected") === "true" &&
    $("surface-panel").hidden === true;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(600);
  record(
    "rail-card-opens-the-group",
    "the rail card opens Settings › Runtime, puts the rail away, and Escape leaves the page",
    onGroup && $("settings-page").hidden === true,
    `onGroup=${onGroup}, page hidden after Escape=${$("settings-page").hidden}, focus=${document.activeElement?.id || document.activeElement?.className}`,
  );

  return results;
};
