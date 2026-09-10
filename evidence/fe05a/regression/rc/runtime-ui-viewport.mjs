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
  /* FE-01 · WK-90 spread the runtime blocks over five Settings groups, so the
     layout and hit-region obligations are measured once per group that holds
     one, and only over what that group actually shows: a hidden panel has no
     geometry, and measuring it would report every control as zero high. */
  const GROUPS = ["developer", "skills", "tools", "permissions", "models"];
  const openGroup = async (id) => {
    location.hash = `#settings/${id}`;
    await wait(1200);
    return $(`settings-${id}`);
  };
  await openGroup("developer");
  const panel = $("settings-sections");
  let root = $("settings-developer");

  // No horizontal overflow: not on the document, not inside any group.
  const overflowDetail = [];
  let overflowOk = true;
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
  const smallTargets = [];
  for (const group of GROUPS) {
    root = await openGroup(group);
    const box = panel.getBoundingClientRect();
    const docOverflow =
      document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const panelOverflow = panel.scrollWidth - panel.clientWidth;
    const spills = [...root.querySelectorAll("*")]
      .filter((node) => {
        const r = node.getBoundingClientRect();
        return (
          r.width > 0 &&
          (r.right > box.right + 1 || r.left < box.left - 1) &&
          !insideScroller(node)
        );
      })
      .slice(0, 5)
      .map((n) => `${n.className || n.tagName}`);
    if (docOverflow > 0 || panelOverflow > 0 || spills.length) overflowOk = false;
    overflowDetail.push(
      `${group}: document=${docOverflow}px panel=${panelOverflow}px spills=${spills.join(", ") || "none"}`,
    );
    smallTargets.push(
      ...[...root.querySelectorAll("button, input")]
        .filter((n) => !n.disabled && n.getClientRects().length)
        .map((n) => {
          const r = n.getBoundingClientRect();
          /* FE-02 · 与既有的 .runtime-switch 同一条理由：一个视觉隐藏的 radio
             （1px）本身不是命中区，命中区是包着它的那个 label。Models 组里
             Add provider 的三条路径是第一处被这支脚本量到的 segmented control，
             所以这里补上同样的归属，改的是量法而不是断言。 */
          const switchGroup = n.closest(".runtime-switch") || n.closest(".segment");
          const h = switchGroup ? switchGroup.getBoundingClientRect().height : r.height;
          return { name: `${group}/${n.className || n.tagName}`, h: Math.round(h) };
        })
        .filter((t) => t.h < (label === "390" ? 44 : 20)),
    );
  }
  record(
    "no-horizontal-overflow",
    "every group holding a runtime block fits its column with no horizontal scroll",
    overflowOk,
    overflowDetail.join(" | "),
  );
  record(
    "touch-targets",
    label === "390"
      ? "every enabled control is at least 44px tall at 390"
      : "every enabled control keeps a usable height on desktop",
    smallTargets.length === 0,
    smallTargets.map((t) => `${t.name}=${t.h}`).join(", ") || "all controls pass",
  );

  /* The scope strip is the same control in every group that can be edited
     (WK-90); the keyboard obligation is read on the primary strip in
     Developer › Runtime. */
  root = await openGroup("developer");
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
  root = await openGroup("tools");
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
  const moving = [...panel.querySelectorAll("*")].filter((n) => {
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
  /* FE-01 · WK-90 moved the runtime catalogue into Developer › Runtime, so the
     rail card's Open lands on the Developer group. The obligation is unchanged:
     one reading, reached from the coarse card, with the rail put away. */
  const onGroup =
    $("settings-page").hidden === false &&
    $("settings-tab-developer").getAttribute("aria-selected") === "true" &&
    $("surface-panel").hidden === true;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await wait(600);
  record(
    "rail-card-opens-the-group",
    "the rail card opens Settings › Developer › Runtime, puts the rail away, and Escape leaves the page",
    onGroup && $("settings-page").hidden === true,
    `onGroup=${onGroup}, page hidden after Escape=${$("settings-page").hidden}, focus=${document.activeElement?.id || document.activeElement?.className}`,
  );

  return results;
};
