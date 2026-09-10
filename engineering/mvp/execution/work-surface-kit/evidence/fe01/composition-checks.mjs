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
 *   WORK-3  composer starts with two visible lines and bounded controls
 *   WORK-4  with the right-hand surface open the reading measure stays ≥ 640
 *   SHELL-1 under a desktop shell nothing focusable enters the top-left
 *           window-control safe area
 *   ALL     no horizontal overflow
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
    inputMetrics: (() => {
      const node = document.getElementById("composer-input");
      const css = getComputedStyle(node);
      return { lineHeight: parseFloat(css.lineHeight), contentHeight: node.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom), maxHeight: parseFloat(css.maxHeight) };
    })(),
    controls: [...form.querySelectorAll("button")].filter(node => !node.hidden).map(rect),
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

async function open(url, { width = 1440, height = 900 } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
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
  record("WORK-3", g.inputMetrics.contentHeight >= 2 * g.inputMetrics.lineHeight - 1 &&
    g.input.height <= g.inputMetrics.maxHeight + 1 &&
    g.controls.every(r => r && r.height > 0 && r.top >= g.composer.top && r.bottom <= g.composer.bottom + 1), {
    input: g.input, metrics: g.inputMetrics, controls: g.controls,
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
