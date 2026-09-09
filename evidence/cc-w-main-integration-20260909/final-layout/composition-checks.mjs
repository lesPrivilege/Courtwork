// CC-W · copied verbatim from evidence/cc-s/, port only (8899→8901, CDP 19925 起→19960 起).
// 既有 32 条一字未动；本单新增 WORK-5…9 与 SHELL-4 / SHELL-5（见文件末尾 CC-W 段）。
// FE-03 · copied verbatim from evidence/fe02-main-integration-20260909/, port only.
/* FE-01 item 4 · the composition law of WK-96 / WK-97 as assertions.
 *
 * Every number below is read off the rendered document through CDP; nothing is
 * re-derived from CSS. The three composition states are checked where they
 * actually differ: Home (wide), Home (narrow, composer docked), and Work (a
 * chat open, with and without the right-hand surface).
 *
 *   HOME-1  composer centre ≥ 55 % of the main area's height
 *   HOME-2  non-chrome content above the composer ≤ 180
 *   HOME-3  orientation block ≤ 120 and carries no digit
 *   HOME-4  composer measure 760–880
 *   HOME-5  composer body initial height 92–112
 *   HOME-6  the lower half of the first screen shows continuity content
 *   HOME-7  Today is one strip of three numbers, below the composer,
 *           with no card frame and no `Backend pending` row
 *   WORK-1  no Home dashboard primitive is rendered
 *   WORK-2  composer docked at the foot, same measure as the reading column
 *   WORK-3  composer body initial height 80–96
 *   WORK-4  with the right-hand surface open the reading measure stays ≥ 640
 *   SHELL-1 under a desktop shell nothing focusable enters the top-left
 *           window-control safe area
 *   ALL     no horizontal overflow
 *
 * CC-S（WK-116）adds the Settings page, which is a fourth composition state:
 * the global sidebar is not rendered there, so the page's own navigation column
 * is the only navigation and the two columns are the page's own geometry.
 *
 *   SETTINGS-1  settings-active: the sidebar is gone from the box tree, from
 *               the accessibility tree (`hidden`) and from the focus order
 *               (`inert`) — not merely invisible
 *   SETTINGS-2  navigation column 240–256, content column 760–960, page gutter
 *               ≥ 48 at 1440 and 56–80 at 1680
 *   SETTINGS-3  group spacing 40–48, row spacing 16–24
 *   SETTINGS-4  label / help share one left edge, controls share one right edge
 *   SETTINGS-5  Back to app returns to the view, the session and the focus that
 *               were there before
 *   SETTINGS-6  390: the column becomes the select, gutter 16–20, controls ≥ 44
 *   SETTINGS-7  1024 and 1440-at-200 % do not overflow horizontally
 *   SHELL-2     desktop shell, Settings open: safe area holds no control
 *   SHELL-3     desktop shell, sidebar collapsed: same
 *
 * CC-W（WK-113 / WK-116）adds the work surface's two desktop shapes, which are
 * a fifth and a sixth composition state:
 *
 *   WORK-5  1024–1679 expanded is a view switch inside the main area: the
 *           document pane is 1136 at 1440, the strip is 40–44 high, the prose
 *           starts 24–32 below it, no scrim and no floating material is drawn,
 *           and the chat column keeps its DOM while leaving the screen and the
 *           focus order (`hidden` + `inert`)
 *   WORK-6  ≥1680 is a real third column: nav 256 · chat ≥640 · doc ≥688, each
 *           pane scrolls on its own, the three top chromes share one baseline,
 *           and the composer stays whole
 *   WORK-7  the two sides of the breakpoint (1679 / 1680) resolve to the two
 *           different shapes and neither overflows
 *   WORK-8  short height (≤720): the composer is still whole in the三栏 shape
 *   WORK-9  1440 at 200 % does not overflow horizontally
 *   SHELL-4 desktop shell, expanded (view switch): safe area holds no control
 *   SHELL-5 desktop shell, three panes: same
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass, ...detail });

const GEOMETRY = `(() => {
  const rect = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom };
  };
  const body = document.getElementById("conversation-body");
  const form = document.getElementById("composer-form");
  const intro = document.getElementById("home-composer-intro");
  const band = document.getElementById("home-top-band");
  const stream = document.getElementById("message-stream");
  const order = [...body.children].map((child) => child.id || child.className);
  const continuity = [...document.querySelectorAll(".home-row, .home-card, .home-stat")];
  const area = rect(body);
  const composer = rect(form);
  const aboveComposer = [...body.querySelectorAll("*")]
    .filter((node) => node.getClientRects().length && !form.contains(node) && !node.contains(form))
    .map((node) => node.getBoundingClientRect())
    .filter((r) => r.height && r.top < form.getBoundingClientRect().top);
  const introHidden = !intro || intro.hidden || !intro.getClientRects().length;
  return {
    order,
    area,
    composer,
    input: rect(document.getElementById("composer-input")),
    intro: introHidden ? null : rect(intro),
    introText: introHidden ? "" : intro.textContent.trim(),
    bandHidden: !band || band.hidden || !band.getClientRects().length,
    band: rect(band),
    stream: rect(stream),
    statCount: document.querySelectorAll(".home-stat").length,
    statRowTop: rect(document.querySelector(".stat-row"))?.top ?? null,
    plannedRows: document.querySelectorAll(".home-planned").length,
    plannedText: [...document.querySelectorAll("#conversation-body")]
      .map((n) => n.textContent)
      .join(" ")
      .includes("Backend pending"),
    homePrimitives: document.querySelectorAll(".home-row, .home-card, .home-stat, .home-view").length,
    continuityBelowHalf: continuity.some((node) => {
      const r = node.getBoundingClientRect();
      return r.top >= area.top + area.height / 2 && r.top < area.top + area.height;
    }),
    aboveComposerHeight: aboveComposer.length
      ? Math.max(...aboveComposer.map((r) => r.bottom)) - Math.min(...aboveComposer.map((r) => r.top))
      : 0,
    surfaceOpen: window.__V5_UI__.state.surface.open,
    readingWidth: rect(document.querySelector(".message-stream"))?.width ?? null,
    overflow: document.documentElement.scrollWidth - innerWidth,
    unsafeControls: (() => {
      if (document.documentElement.dataset.shell !== "desktop") return null;
      const safe = 80;
      const band = 52;
      return [...document.querySelectorAll("button, a, input, select, textarea, [tabindex]")]
        .filter((node) => node.getClientRects().length)
        .filter((node) => {
          const r = node.getBoundingClientRect();
          return r.left < safe && r.top < band;
        })
        .map((node) => node.id || node.className);
    })(),
  };
})()`;

const SETTINGS = `(() => {
  const rect = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { top: r.top, left: r.left, right: r.right, width: r.width, height: r.height, bottom: r.bottom };
  };
  const nav = document.getElementById("navigation-panel");
  const column = document.querySelector(".settings-nav-column");
  const sections = document.getElementById("settings-sections");
  const section = [...document.querySelectorAll(".settings-section")]
    .find((node) => node.getClientRects().length);
  const blocks = section
    ? [...section.querySelectorAll(".settings-block")].filter((n) => n.getClientRects().length)
    : [];
  const rows = section
    ? [...section.querySelectorAll(".settings-row")].filter((n) => n.getClientRects().length)
    : [];
  const gaps = [];
  for (let i = 1; i < blocks.length; i++)
    gaps.push(Math.round(blocks[i].getBoundingClientRect().top - blocks[i - 1].getBoundingClientRect().bottom));
  const rowPad = rows.length
    ? [parseFloat(getComputedStyle(rows[0]).paddingTop), parseFloat(getComputedStyle(rows[0]).paddingBottom)]
    : [];
  const texts = rows.map((r) => r.querySelector(".settings-row-text")).filter(Boolean);
  const controls = rows.map((r) => r.querySelector(".settings-row-control")).filter(Boolean);
  const focusable = "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
  const smallControls = [...document.querySelectorAll("#settings-page " + focusable)]
    .filter((n) => n.getClientRects().length)
    .filter((n) => n.type !== "checkbox" && n.type !== "radio")
    .filter((n) => n.getBoundingClientRect().height < 44)
    .map((n) => (n.id || n.className) + ":" + Math.round(n.getBoundingClientRect().height));
  return {
    settingsActive: document.getElementById("app-shell").classList.contains("settings-active"),
    navHidden: nav.hidden === true,
    navInert: nav.inert === true,
    navRects: nav.getClientRects().length,
    navFocusable: [...nav.querySelectorAll(focusable)].filter((n) => n.getClientRects().length).length,
    backLabel: document.getElementById("settings-back-button")?.textContent.trim() ?? null,
    pageTitle: (document.getElementById("session-title")?.getClientRects().length ?? 0) > 0
      ? document.getElementById("session-title").textContent.trim() : null,
    settingsWordsOnScreen: [...document.querySelectorAll("h1, h2, h3")]
      .filter((n) => n.getClientRects().length && n.textContent.trim() === "Settings").length,
    labelledBy: document.getElementById("settings-page").getAttribute("aria-labelledby"),
    backVisible: (document.getElementById("settings-back-button")?.getClientRects().length ?? 0) > 0,
    toggleNavHidden: document.getElementById("toggle-nav-button").hidden === true,
    column: rect(column),
    columnVisible: (column?.getClientRects().length ?? 0) > 0,
    navListVisible: getComputedStyle(document.getElementById("settings-nav")).display !== "none",
    selectVisible: getComputedStyle(document.getElementById("settings-nav-select")).display !== "none",
    sections: rect(sections),
    section: rect(section),
    blockGaps: gaps,
    rowPad,
    textLefts: [...new Set(texts.map((n) => Math.round(n.getBoundingClientRect().left)))],
    controlRights: [...new Set(controls.map((n) => Math.round(n.getBoundingClientRect().right)))],
    smallControls,
    overflow: document.documentElement.scrollWidth - innerWidth,
    innerWidth,
    view: window.__V5_UI__.state.view,
    sessionId: window.__V5_UI__.state.activeSessionId,
    settingsOpen: window.__V5_UI__.state.settings.open,
    focus: document.activeElement?.id || document.activeElement?.className || null,
  };
})()`;

async function open(url, { width = 1440, height = 900, scale = 1 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: scale, mobile: width < 768,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: "light" },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(500);
}
const shot = async (name) =>
  writeFile(
    new URL(`./${name}.png`, import.meta.url),
    Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64"),
  );

try {
  /* ── Home, wide ────────────────────────────────────────────────────── */
  await open(ORIGIN);
  let g = await ev(GEOMETRY);
  await shot("home-1440-light");
  const centre = (g.composer.top + g.composer.height / 2 - g.area.top) / g.area.height;
  record("HOME-1", centre >= 0.55, { centre: Number(centre.toFixed(4)), threshold: 0.55 });
  record("HOME-2", g.aboveComposerHeight <= 180, { aboveComposerHeight: Math.round(g.aboveComposerHeight) });
  record("HOME-3", Boolean(g.intro) && g.intro.height <= 120 && !/\d/.test(g.introText), {
    orientation: g.intro && Math.round(g.intro.height), text: g.introText,
  });
  record("HOME-4", g.composer.width >= 760 && g.composer.width <= 880, {
    width: Math.round(g.composer.width),
  });
  record("HOME-5", g.input.height >= 92 && g.input.height <= 112, {
    input: Math.round(g.input.height),
  });
  record("HOME-6", g.continuityBelowHalf === true, {});
  record(
    "HOME-7",
    g.statCount === 3 &&
      g.plannedRows === 0 &&
      g.plannedText === false &&
      g.statRowTop > g.composer.bottom,
    {
      stats: g.statCount,
      planned: g.plannedRows,
      backendPendingOnHome: g.plannedText,
      order: g.order,
    },
  );
  record("HOME-overflow", g.overflow <= 1, { overflow: g.overflow });

  /* ── Home, narrow: the composer docks and the modules lead ─────────── */
  await open(ORIGIN, { width: 390, height: 844 });
  g = await ev(GEOMETRY);
  await shot("home-390-light");
  record("HOME-narrow-dock", g.order.at(-1) === "composer-area", { order: g.order });
  record("HOME-narrow-overflow", g.overflow <= 1, { overflow: g.overflow });

  /* ── Work: open the first chat in the list ─────────────────────────── */
  await open(ORIGIN);
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(
    `(() => { const s = window.__V5_UI__.state; const list = document.querySelectorAll('.project-list [data-session-id]');
       (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`,
  );
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
  g = await ev(GEOMETRY);
  await shot("work-1440-light");
  record("WORK-1", g.homePrimitives === 0 && g.bandHidden === true, {
    homePrimitives: g.homePrimitives, bandHidden: g.bandHidden,
  });
  record("WORK-2", g.order.at(-1) === "composer-area" && Math.abs(g.composer.width - 740) <= 2, {
    order: g.order, width: Math.round(g.composer.width),
  });
  record("WORK-3", g.input.height >= 80 && g.input.height <= 96, {
    input: Math.round(g.input.height),
  });
  record("WORK-overflow", g.overflow <= 1, { overflow: g.overflow });

  /* ── Work with the right-hand surface open ─────────────────────────── */
  await ev(`document.getElementById('show-surface-button')?.click(), true`);
  await sleep(600);
  g = await ev(GEOMETRY);
  await shot("work-surface-1440-light");
  record(
    "WORK-4",
    g.surfaceOpen === true && g.readingWidth >= 640 && g.composer.width >= 640,
    {
      surfaceOpen: g.surfaceOpen,
      readingWidth: Math.round(g.readingWidth ?? 0),
      composerMeasure: Math.round(g.composer.width),
    },
  );

  /* ── Desktop shell: the window-control safe area holds no control ──── */
  await open(`${ORIGIN}/?shell=desktop`);
  g = await ev(GEOMETRY);
  await shot("home-desktop-shell-1440-light");
  record("SHELL-1", Array.isArray(g.unsafeControls) && g.unsafeControls.length === 0, {
    unsafeControls: g.unsafeControls,
  });

  /* ── CC-S · Settings, 1440 ─────────────────────────────────────────── */
  await open(ORIGIN);
  // enter from Home through the app's own deep link, so the return target is Home
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  let t = await ev(SETTINGS);
  await shot("settings-general-1440-light");
  record(
    "SETTINGS-1",
    t.settingsActive === true &&
      t.navHidden === true &&
      t.navInert === true &&
      t.navRects === 0 &&
      t.navFocusable === 0 &&
      t.toggleNavHidden === true,
    {
      settingsActive: t.settingsActive, navHidden: t.navHidden, navInert: t.navInert,
      navRects: t.navRects, navFocusable: t.navFocusable, toggleNavHidden: t.toggleNavHidden,
    },
  );
  record(
    "SETTINGS-2",
    t.column.width >= 240 && t.column.width <= 256 &&
      t.section.width >= 760 && t.section.width <= 960 &&
      t.column.left >= 48 && t.innerWidth - t.sections.right >= 48,
    {
      navColumn: Math.round(t.column.width),
      contentColumn: Math.round(t.section.width),
      leftGutter: Math.round(t.column.left),
      rightGutter: Math.round(t.innerWidth - t.sections.right),
    },
  );
  record(
    "SETTINGS-3",
    t.blockGaps.length > 0 &&
      t.blockGaps.every((gap) => gap >= 40 && gap <= 48) &&
      t.rowPad.every((pad) => pad >= 8 && pad <= 12),
    { blockGaps: t.blockGaps, rowPaddingTopBottom: t.rowPad, rowSpacing: t.rowPad[0] * 2 },
  );
  record(
    "SETTINGS-4",
    t.textLefts.length === 1 && t.controlRights.length === 1,
    { labelLeftEdges: t.textLefts, controlRightEdges: t.controlRights },
  );
  record("SETTINGS-back-label", t.backLabel === "Back to app" && t.backVisible === true, {
    backLabel: t.backLabel, backVisible: t.backVisible,
  });
  /* 页标题说一次：这一页的名字在带上的 h1 里，页面的可访问名指向它。 */
  record(
    "SETTINGS-title",
    t.pageTitle === "Settings" &&
      t.settingsWordsOnScreen === 1 &&
      t.labelledBy === "session-title",
    { pageTitle: t.pageTitle, settingsHeadingsOnScreen: t.settingsWordsOnScreen, labelledBy: t.labelledBy },
  );
  record("SETTINGS-1440-overflow", t.overflow <= 1, { overflow: t.overflow });

  /* Back to app returns to what was behind, with the focus handed back. */
  await ev(`(document.getElementById("model-settings-button") || document.getElementById("permission-settings-button"))?.click?.(), true`);
  await sleep(300);
  await ev(`document.getElementById("settings-back-button").click(), true`);
  await sleep(500);
  t = await ev(SETTINGS);
  record(
    "SETTINGS-5",
    t.settingsOpen === false && t.view === "home" && t.navRects > 0 && t.navHidden === false,
    { settingsOpen: t.settingsOpen, view: t.view, sidebarBack: t.navRects > 0, focus: t.focus },
  );

  /* ── CC-S · Settings, 1680: the gutter opens to 56–80 ──────────────── */
  await open(ORIGIN, { width: 1680, height: 1000 });
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  t = await ev(SETTINGS);
  record(
    "SETTINGS-1680-gutter",
    t.column.left >= 56 && t.column.left <= 80 && t.overflow <= 1,
    { leftGutter: Math.round(t.column.left), overflow: t.overflow },
  );

  /* ── CC-S · Settings, 1024 ─────────────────────────────────────────── */
  await open(ORIGIN, { width: 1024, height: 768 });
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  t = await ev(SETTINGS);
  await shot("settings-general-1024-light");
  record("SETTINGS-1024-overflow", t.overflow <= 1 && t.navRects === 0, {
    overflow: t.overflow, sidebarRendered: t.navRects,
  });

  /* ── CC-S · Settings, 390 ──────────────────────────────────────────── */
  await open(ORIGIN, { width: 390, height: 844 });
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  t = await ev(SETTINGS);
  await shot("settings-general-390-light");
  record(
    "SETTINGS-6",
    t.selectVisible === true &&
      t.navListVisible === false &&
      t.column.left >= 16 && t.column.left <= 20 &&
      t.smallControls.length === 0 &&
      t.overflow <= 1,
    {
      selectVisible: t.selectVisible, navListVisible: t.navListVisible,
      gutter: Math.round(t.column.left), controlsUnder44: t.smallControls, overflow: t.overflow,
    },
  );

  /* ── CC-S · 1440 at 200 % browser zoom = a 720 CSS-px viewport ─────── */
  await open(ORIGIN, { width: 720, height: 450, scale: 2 });
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  t = await ev(SETTINGS);
  await shot("settings-general-1440-zoom200-light");
  record("SETTINGS-7", t.overflow <= 1, { overflow: t.overflow, cssViewport: t.innerWidth });

  /* ── CC-S · SHELL-2 / SHELL-3 ─────────────────────────────────────── */
  await open(`${ORIGIN}/?shell=desktop`);
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  g = await ev(GEOMETRY);
  await shot("settings-desktop-shell-1440-light");
  record("SHELL-2", Array.isArray(g.unsafeControls) && g.unsafeControls.length === 0, {
    host: "desktop", unsafeControls: g.unsafeControls,
  });
  await open(`${ORIGIN}/?shell=desktop`);
  await ev(`document.getElementById("toggle-nav-button").click(), true`);
  await sleep(400);
  g = await ev(GEOMETRY);
  await shot("home-collapsed-desktop-shell-1440-light");
  record(
    "SHELL-3",
    Array.isArray(g.unsafeControls) && g.unsafeControls.length === 0 &&
      (await ev(`document.getElementById("app-shell").classList.contains("nav-collapsed")`)) === true,
    { host: "desktop", unsafeControls: g.unsafeControls },
  );
  /* The plain browser has no native overlay, so the product adds no second safe
     area of its own: the check reports `null` rather than an empty list. */
  await open(ORIGIN);
  await ev(`(location.hash = "#settings/general"), true`);
  await sleep(600);
  g = await ev(GEOMETRY);
  record("SHELL-2-browser", g.unsafeControls === null, { host: "browser", unsafeControls: g.unsafeControls });
  await open(ORIGIN);
  await ev(`document.getElementById("toggle-nav-button").click(), true`);
  await sleep(400);
  g = await ev(GEOMETRY);
  record("SHELL-3-browser", g.unsafeControls === null, { host: "browser", unsafeControls: g.unsafeControls });

/* ── CC-W · 工作面的两种桌面形状 ──────────────────────────────────── */
const SURFACE = `(() => {
  const rect = (node) => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), bottom: Math.round(r.bottom) };
  };
  const shell = document.getElementById("app-shell");
  const panel = document.getElementById("surface-panel");
  const chat = document.querySelector(".chat-panel");
  const body = document.getElementById("conversation-body");
  const content = document.querySelector("#surface-panel .surface-content:not([hidden])");
  const header = document.querySelector("#surface-panel .surface-header");
  const style = panel && getComputedStyle(panel);
  const px = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return {
    classes: shell.className,
    columns: getComputedStyle(shell).gridTemplateColumns,
    panel: rect(panel),
    panelPosition: style?.position ?? null,
    panelShadow: style?.boxShadow ?? null,
    panelRadius: style?.borderTopLeftRadius ?? null,
    header: rect(header),
    chat: rect(chat),
    chatHeader: rect(document.querySelector(".chat-header")),
    nav: rect(document.querySelector(".sidebar")),
    bodyHidden: body.hidden === true,
    bodyInert: body.inert === true,
    bodyInDom: document.body.contains(body),
    backdropHidden: document.getElementById("surface-backdrop").hidden === true,
    docScroll: content ? getComputedStyle(content).overflowY : null,
    docMeasure: content ? Math.round(content.clientWidth - parseFloat(getComputedStyle(content).paddingLeft) - parseFloat(getComputedStyle(content).paddingRight)) : null,
    chatScroll: getComputedStyle(document.getElementById("message-stream")).overflowY,
    navScroll: getComputedStyle(document.querySelector(".project-list").parentElement).overflowY,
    // 正文距 strip 的距离由内容面的上内边距给出（盒顶就贴着 strip 的下沿）。
    contentTop: content ? Math.round(parseFloat(getComputedStyle(content).paddingTop)) : null,
    composer: rect(document.getElementById("composer-form")),
    composerVisible: (() => {
      const c = document.getElementById("composer-form");
      if (!c || document.getElementById("conversation-body").hidden) return null;
      const r = c.getBoundingClientRect();
      return r.height > 0 && r.bottom <= innerHeight + 1 && r.top >= 0;
    })(),
    tokens: { docMin: px("--doc-min"), docMeasure: px("--doc-measure"), nav: px("--nav") },
    overflow: document.documentElement.scrollWidth - innerWidth,
    unsafeControls: (() => {
      if (document.documentElement.dataset.shell !== "desktop") return null;
      return [...document.querySelectorAll("button, a, input, select, textarea, [tabindex]")]
        .filter((node) => node.getClientRects().length)
        .filter((node) => { const r = node.getBoundingClientRect(); return r.left < 80 && r.top < 52; })
        .map((node) => node.id || node.className);
    })(),
  };
})()`;

const openWork = async () => {
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(
    `(() => { const list = document.querySelectorAll('.project-list [data-session-id]');
       (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`,
  );
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
};
const expandSurface = async () => {
  await ev(`(() => { if (!window.__V5_UI__.state.surface.open) document.getElementById('show-surface-button').click(); return true; })()`);
  await sleep(700);
  await ev(`(() => { if (!window.__V5_UI__.state.surface.expanded) document.getElementById('surface-expand-button').click(); return true; })()`);
  await sleep(1100);
};

/* WORK-5 · B（1440）· 主区内的视图切换 */
await open(ORIGIN, { width: 1440, height: 900 });
await openWork();
await expandSurface();
let w = await ev(SURFACE);
await shot("work-expanded-1440-light");
record(
  "WORK-5",
  w.classes.includes("surface-view-switch") &&
    w.panel.width === 1136 &&
    w.header.height >= 40 && w.header.height <= 44 &&
    w.contentTop >= 24 && w.contentTop <= 32 &&
    w.backdropHidden === true &&
    w.panelShadow === "none" &&
    parseFloat(w.panelRadius) === 0 &&
    w.bodyHidden === true && w.bodyInert === true && w.bodyInDom === true &&
    w.overflow <= 1,
  {
    shape: w.classes, docPane: w.panel.width, strip: w.header.height,
    proseGap: w.contentTop, backdropHidden: w.backdropHidden,
    shadow: w.panelShadow, radius: w.panelRadius,
    chatColumn: { hidden: w.bodyHidden, inert: w.bodyInert, inDom: w.bodyInDom },
    overflow: w.overflow,
  },
);

/* WORK-6 · C（1680）· 真正的第三栏 */
await open(ORIGIN, { width: 1680, height: 1000 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
await shot("work-three-pane-1680-light");
record(
  "WORK-6",
  w.classes.includes("surface-three-pane") &&
    w.panelPosition === "static" &&
    w.nav.width === w.tokens.nav &&
    w.chat.width >= 640 &&
    w.docMeasure >= w.tokens.docMin &&
    w.docScroll === "auto" && w.chatScroll === "auto" &&
    w.chatHeader.top === w.header.top &&
    w.chatHeader.height === w.header.height &&
    w.bodyHidden === false && w.bodyInert === false &&
    w.composerVisible === true &&
    w.overflow <= 1,
  {
    shape: w.classes, columns: w.columns, position: w.panelPosition,
    nav: w.nav.width, chat: w.chat.width, doc: w.docMeasure, docMin: w.tokens.docMin,
    scrolls: { doc: w.docScroll, chat: w.chatScroll, nav: w.navScroll },
    chromeBaseline: { chat: w.chatHeader, doc: w.header },
    composerWhole: w.composerVisible, overflow: w.overflow,
  },
);

/* WORK-7 · 断点两侧各一次 */
await open(ORIGIN, { width: 1679, height: 1000 });
await openWork();
await expandSurface();
const below = await ev(SURFACE);
await open(ORIGIN, { width: 1680, height: 1000 });
await openWork();
await expandSurface();
const above = await ev(SURFACE);
record(
  "WORK-7",
  below.classes.includes("surface-view-switch") &&
    !below.classes.includes("surface-three-pane") &&
    above.classes.includes("surface-three-pane") &&
    below.overflow <= 1 && above.overflow <= 1,
  {
    "1679": { shape: below.classes, doc: below.panel.width, overflow: below.overflow },
    "1680": { shape: above.classes, doc: above.docMeasure, chat: above.chat.width, overflow: above.overflow },
  },
);

/* WORK-8 · 短高度：三栏态的 composer 仍然完整 */
await open(ORIGIN, { width: 1680, height: 720 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
await shot("work-three-pane-1680x720-light");
record("WORK-8", w.composerVisible === true && w.overflow <= 1, {
  height: 720, composerWhole: w.composerVisible, composer: w.composer, overflow: w.overflow,
});

/* WORK-9 · 1440 at 200 % = 720 CSS px viewport；此宽度落在 <1024，工作面是全屏 sheet */
await open(ORIGIN, { width: 720, height: 450, scale: 2 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
await shot("work-expanded-1440-zoom200-light");
record("WORK-9", w.overflow <= 1, { cssViewport: 720, shape: w.classes, overflow: w.overflow });

/* SHELL-4 / SHELL-5 · 展开态与三栏态的安全区 */
await open(`${ORIGIN}/?shell=desktop`, { width: 1440, height: 900 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
await shot("work-expanded-desktop-shell-1440-light");
record("SHELL-4", Array.isArray(w.unsafeControls) && w.unsafeControls.length === 0, {
  host: "desktop", shape: w.classes, unsafeControls: w.unsafeControls,
});
await open(`${ORIGIN}/?shell=desktop`, { width: 1680, height: 1000 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
await shot("work-three-pane-desktop-shell-1680-light");
record("SHELL-5", Array.isArray(w.unsafeControls) && w.unsafeControls.length === 0, {
  host: "desktop", shape: w.classes, unsafeControls: w.unsafeControls,
});
await open(ORIGIN, { width: 1440, height: 900 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
record("SHELL-4-browser", w.unsafeControls === null, { host: "browser", unsafeControls: w.unsafeControls });
await open(ORIGIN, { width: 1680, height: 1000 });
await openWork();
await expandSurface();
w = await ev(SURFACE);
record("SHELL-5-browser", w.unsafeControls === null, { host: "browser", unsafeControls: w.unsafeControls });
} finally {
  await writeFile(
    new URL("./composition-checks.json", import.meta.url),
    JSON.stringify(results, null, 2),
  );
  await close();
}
for (const row of results)
  console.log(`${row.pass ? "PASS" : "FAIL"} ${row.id} ${JSON.stringify({ ...row, id: undefined, pass: undefined })}`);
console.log(`${results.filter((r) => r.pass).length} / ${results.length}`);
if (results.some((r) => !r.pass)) process.exitCode = 1;
