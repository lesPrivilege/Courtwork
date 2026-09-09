/* FE-01 item 6 · the three counterexamples this order was assigned.
 *
 *   FE-T02  FN-05 / 17 / 18 — one action reached through a button, through the
 *           keyboard and through another entry must have one target and one
 *           admission, and one capability must not grow a second entry.
 *   FE-T09  FN-09 / 10 / 27 / 29 — after the IA change, a palette, a text size,
 *           a narrow viewport and reduced motion must leave the state words and
 *           the legal actions exactly as they were.
 *   FE-T10  FN-26 / 27 — keyboard into a tab list, a disclosure, a dialog and a
 *           chat switch; focus is never covered, and an IME composition never
 *           fires a shortcut.
 *
 * Everything is driven through the product's own controls and read off its own
 * DOM. Nothing writes UI state directly.
 */
import { cdp, evaluate as ev, key, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, obligation, pass, detail) =>
  results.push({ id, obligation, pass: Boolean(pass), detail });

async function load(url = ORIGIN, { width = 1440, height = 900, media = [] } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: "light" }, ...media],
  });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(600);
}

/* The words a screen states and the actions it offers. FE-T09 compares this
   reading across appearance changes: if a palette or a text size can change it,
   the appearance layer is deciding something it must not decide. */
const SURFACE = `(() => {
  const visible = (node) => node.getClientRects().length > 0;
  const text = (node) => (node.textContent || "").replace(/\\s+/g, " ").trim();
  /* The reading is taken over the work surface itself — the main column and any
     layer open above it — and never over the navigation, because a sidebar that
     becomes an overlay below 1024 is a navigation affordance the layering spec
     allows to change (FN-27), while a state word or a legal action is not. */
  const scope = [
    document.querySelector(".chat-panel"),
    ...document.querySelectorAll("dialog[open], [popover]"),
  ].filter(Boolean);
  const within = (selector) => scope.flatMap((root) => [...root.querySelectorAll(selector)]);
  return {
    states: within(".home-row-status, .rail-card-state, .run-badge, .flow-meta")
      .filter(visible).map(text).sort(),
    actions: within("button")
      .filter(visible)
      .filter((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true")
      .map((b) => text(b) || b.getAttribute("aria-label") || b.id)
      .sort(),
  };
})()`;

try {
  /* ── FE-T02 ─────────────────────────────────────────────────────────── */
  await load();
  const byPointer = await ev(`(async () => {
    document.querySelector(".home-row")?.click();
    await new Promise((r) => setTimeout(r, 1200));
    return window.__V5_UI__.state.activeSessionId;
  })()`);
  await load();
  /* The same row, reached with the list keyboard the product already answers
     to: j moves the focus onto the first item, o opens it. The events are real
     key events, so the product's own handler is the one that decides. */
  await ev(`(document.activeElement?.blur?.(), true)`);
  await key({ text: "j", code: "KeyJ", keyCode: 74 });
  await sleep(300);
  const focused = await ev(
    `document.activeElement?.dataset?.focusKey ?? document.activeElement?.className ?? null`,
  );
  await key({ text: "o", code: "KeyO", keyCode: 79 });
  await sleep(1600);
  const byKeyboard = await ev(`window.__V5_UI__.state.activeSessionId`);
  record(
    "FE-T02-a",
    "the first work row opens the same chat by pointer and by keyboard (FN-05)",
    byPointer && byKeyboard && byPointer === byKeyboard,
    `pointer=${byPointer} keyboard=${byKeyboard} focusAfterJ=${focused}`,
  );

  await load();
  const settingsEntries = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    document.getElementById("runtime-setup-button").click();
    await wait(900);
    const fromButton = {
      open: !document.getElementById("settings-page").hidden,
      section: window.__V5_UI__.state.settings.section,
      hash: location.hash,
    };
    location.hash = "#settings/models";
    await wait(900);
    const fromHash = {
      open: !document.getElementById("settings-page").hidden,
      section: window.__V5_UI__.state.settings.section,
      tab: document.getElementById("settings-tab-models").getAttribute("aria-selected"),
      panelVisible: !document.getElementById("settings-models").hidden,
    };
    location.hash = "#settings/runtime";
    await wait(900);
    const retired = window.__V5_UI__.state.settings.section;
    return { fromButton, fromHash, retired };
  })()`);
  record(
    "FE-T02-b",
    "the Settings button and the deep link reach one page with one section state; the retired `runtime` section falls back rather than redirecting (FN-05 / WK-90)",
    settingsEntries.fromButton.open &&
      settingsEntries.fromButton.hash === "#settings/general" &&
      settingsEntries.fromHash.open &&
      settingsEntries.fromHash.section === "models" &&
      settingsEntries.fromHash.tab === "true" &&
      settingsEntries.fromHash.panelVisible &&
      settingsEntries.retired === "general",
    JSON.stringify(settingsEntries),
  );

  await load();
  const connectionEntries = await ev(`(() => {
    const controls = [...document.querySelectorAll('[aria-controls="connection-popover"]')]
      .filter((node) => node.getClientRects().length);
    return {
      visible: controls.map((node) => node.id),
      badgeRemoved: document.getElementById("capability-badge") === null,
      connectionNamedTimes: [...document.querySelectorAll("body *")]
        .filter((node) => node.children.length === 0 && node.getClientRects().length)
        .map((node) => (node.textContent || "").trim())
        .filter((t) => t === "Local test").length,
    };
  })()`);
  record(
    "FE-T02-c",
    "one capability, one visible entry: the connection card is opened from the composer's context row alone and the connection is named once (FN-05 / WK-94)",
    connectionEntries.visible.length === 1 &&
      connectionEntries.visible[0] === "model-settings-button" &&
      connectionEntries.badgeRemoved &&
      connectionEntries.connectionNamedTimes === 1,
    JSON.stringify(connectionEntries),
  );

  /* ── FE-T09 ─────────────────────────────────────────────────────────── */
  await load();
  const baseHome = await ev(SURFACE);
  const variants = [];
  for (const [label, prefs, size, media] of [
    ["palette · gray steel", { skin: "gray-steel" }, { width: 1440, height: 900 }, []],
    ["text size · large", { textSize: "large" }, { width: 1440, height: 900 }, []],
    ["reduced motion", { motion: "reduce" }, { width: 1440, height: 900 }, [{ name: "prefers-reduced-motion", value: "reduce" }]],
    ["390 wide", {}, { width: 390, height: 844 }, []],
    ["dark", {}, { width: 1440, height: 900 }, [{ name: "prefers-color-scheme", value: "dark" }]],
  ]) {
    await ev(
      `(() => { const p = window.__cwPrefs; localStorage.setItem(p.key, JSON.stringify({ ...p.value, ...${JSON.stringify(prefs)} })); return true; })()`,
    );
    await load(ORIGIN, { ...size, media });
    variants.push({ label, surface: await ev(SURFACE) });
    await ev(`(() => { localStorage.removeItem(window.__cwPrefs.key); return true; })()`);
  }
  for (const variant of variants) {
    const sameStates =
      JSON.stringify(variant.surface.states) === JSON.stringify(baseHome.states);
    const missing = baseHome.actions.filter((a) => !variant.surface.actions.includes(a));
    const added = variant.surface.actions.filter((a) => !baseHome.actions.includes(a));
    const chromeOnly = missing.length === 0 && added.length === 0;
    record(
      `FE-T09 · ${variant.label}`,
      "state words and legal actions are unchanged by appearance, size and motion (FN-09 / 10 / 27 / 29)",
      sameStates && chromeOnly,
      JSON.stringify({ missing, added, states: variant.surface.states.length }),
    );
  }

  /* ── FE-T10 ─────────────────────────────────────────────────────────── */
  await load(`${ORIGIN}/#settings/general`);
  await sleep(600);
  await ev(`document.getElementById("settings-tab-general").focus(), true`);
  await key({ code: "ArrowDown", keyCode: 40, text: "" });
  await sleep(150);
  const afterArrow = await ev(`document.activeElement.id`);
  await key({ code: "Enter", keyCode: 13, text: "" });
  await sleep(500);
  const afterEnter = await ev(
    `({ active: document.activeElement.id, section: window.__V5_UI__.state.settings.section })`,
  );
  record(
    "FE-T10-a",
    "arrow keys move focus in the settings tab list and Enter activates, handing focus to the panel (FN-26)",
    afterArrow === "settings-tab-appearance" &&
      afterEnter.section === "appearance" &&
      afterEnter.active === "settings-appearance",
    `arrow=${afterArrow} enter=${JSON.stringify(afterEnter)}`,
  );

  /* An IME composition must never be read as a shortcut: `/` is a character
     while composing, and the finder must not steal it. */
  const ime = await ev(`(() => {
    const before = document.activeElement?.id;
    const event = new KeyboardEvent("keydown", { key: "/", keyCode: 229, bubbles: true, cancelable: true });
    Object.defineProperty(event, "isComposing", { value: true });
    document.body.dispatchEvent(event);
    return { before, after: document.activeElement?.id, prevented: event.defaultPrevented };
  })()`);
  record(
    "FE-T10-b",
    "a `/` inside an IME composition stays a character; the finder does not take it (FN-27)",
    ime.prevented === false && ime.before === ime.after,
    JSON.stringify(ime),
  );

  /* A dialog takes the focus, and closing it gives the focus back. */
  await load();
  await ev(`(async () => {
    document.querySelector(".home-row")?.click();
    await new Promise((r) => setTimeout(r, 1400));
    return true;
  })()`);
  const dialog = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const trigger = document.getElementById("materials-button");
    trigger.focus();
    trigger.click();
    await wait(700);
    const open = document.querySelector("dialog[open]");
    const inside = Boolean(open && open.contains(document.activeElement));
    document.getElementById("close-materials-button").click();
    await wait(500);
    return { inside, closed: !document.querySelector("dialog[open]"), returned: document.activeElement?.id };
  })()`);
  record(
    "FE-T10-c",
    "a dialog holds the focus and returns it to the control that opened it (FN-26 / 27)",
    dialog.inside && dialog.closed && dialog.returned === "materials-button",
    JSON.stringify(dialog),
  );

  /* The floating work surface must not cover the focus ring of the control the
     keyboard is on (FN-27, local target "fully visible"). */
  const covered = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    document.getElementById("show-surface-button").click();
    await wait(800);
    const input = document.getElementById("composer-input");
    input.focus();
    const r = input.getBoundingClientRect();
    const corners = [
      [r.left + 2, r.top + 2], [r.right - 2, r.top + 2],
      [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2],
    ];
    const hidden = corners.filter(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return !(top === input || input.contains(top) || top?.contains(input));
    });
    return { surfaceOpen: window.__V5_UI__.state.surface.open, hidden: hidden.length };
  })()`);
  record(
    "FE-T10-d",
    "with the work surface open the focused composer is not covered by it (FN-27)",
    covered.surfaceOpen === true && covered.hidden === 0,
    JSON.stringify(covered),
  );
} finally {
  await writeFile(
    new URL("./counterexamples.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  await close();
}
for (const row of results)
  console.log(`${row.pass ? "PASS" : "FAIL"} ${row.id} — ${row.obligation}\n      ${row.detail}`);
console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
if (results.some((r) => !r.pass)) process.exitCode = 1;
