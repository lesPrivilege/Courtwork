/* WO-WK10a-r2 · DOM assertions over the real product in a real headless Chromium.
 * Every number is read with getBoundingClientRect() inside the page; nothing is
 * inferred from CSS. The browser is driven over CDP with Node's built-in
 * WebSocket, so no package is installed (same harness as evidence/wk6).
 *
 *   WK10A_BASE=http://127.0.0.1:8859 node evidence/wk10a-r2/dom-assertions.mjs
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.WK10A_BASE ?? "http://127.0.0.1:8859";
const CHROME =
  process.env.CHROME_BIN ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK10A_CDP_PORT ?? 9343);
const OUT = new URL("./", import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk10a-r2-"));
const child = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--force-color-profile=srgb",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] },
);
let version = null;
for (let i = 0; i < 80 && !version; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  } catch {
    await sleep(150);
  }
}
if (!version) {
  child.kill();
  throw new Error("headless browser did not open a debugging port");
}
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  socket.onopen = res;
  socket.onerror = rej;
});
let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? reject(new Error(JSON.stringify(message.error)))
      : resolve(message.result);
  }
};
const send = (method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", {
  targetId,
  flatten: true,
});
const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable");
await cdp("Runtime.enable");
async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails)
    throw new Error(
      exceptionDetails.text +
        " " +
        (exceptionDetails.exception?.description ?? ""),
    );
  return result.value;
}
const results = [];
const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name} · ${JSON.stringify(actual)}`);
};

async function viewport(width, height, mobile = false) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}
async function openSession() {
  await evaluate(`(async () => {
    if (!document.querySelector('#project-list .session-button')) {
      document.querySelector('#project-list .project-toggle')?.click();
      await new Promise(r => setTimeout(r, 500));
    }
    document.querySelector('#project-list .session-button')?.click();
    await new Promise(r => setTimeout(r, 1600));
  })()`);
}


/* ---------------------------------------------------------------------------
 * 1440 × 900 · the collapsed layer.
 * ------------------------------------------------------------------------- */
await viewport(1440, 900);
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
await evaluate(
  `(async () => { document.getElementById('show-surface-button').click(); await new Promise(r => setTimeout(r, 1400)); })()`,
);

/* 1 · WK-72 · the alignment band is two parties now: the sidebar wordmark row
 *     and the main header. The work surface is not one of them. */
const band = await evaluate(`(() => {
  const box = (s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height) }; };
  return { sidebar: box('.sidebar-header'), chat: box('.chat-header'),
           railHeader: getComputedStyle(document.querySelector('.surface-header')).display,
           token: getComputedStyle(document.documentElement).getPropertyValue('--band-top').trim() };
})()`);
check(
  "band · the sidebar wordmark row and the main header share one top and one height",
  band.sidebar.top === band.chat.top &&
    band.sidebar.height === 56 &&
    band.chat.height === 56,
  band,
);
check(
  "band · the collapsed work surface has no header and no title of its own",
  band.railHeader === "none",
  band.railHeader,
);

/* 2 · WK-72 · the floating layer's geometry: band bottom + one gap from the top,
 *     one gap from the main column's right edge, 360 wide, stopping at the
 *     composer's top edge, and no outer margin inside a module. */
const layer = await evaluate(`(() => {
  const chat = document.querySelector('.chat-panel').getBoundingClientRect();
  const panel = document.getElementById('surface-panel').getBoundingClientRect();
  const card = document.querySelector('.rail-card');
  const composer = document.getElementById('composer-area').getBoundingClientRect();
  const style = getComputedStyle(card);
  const root = getComputedStyle(document.documentElement);
  return {
    top: Math.round(panel.top), left: Math.round(panel.left), width: Math.round(panel.width),
    bottom: Math.round(panel.bottom),
    rightGap: Math.round(chat.right - panel.right),
    bandPlusGap: parseFloat(root.getPropertyValue('--band-top')) + parseFloat(root.getPropertyValue('--col-gap')),
    composerTop: Math.round(composer.top),
    colGap: parseFloat(root.getPropertyValue('--col-gap')),
    cardLeft: Math.round(card.getBoundingClientRect().left),
    cardMargin: [style.marginLeft, style.marginRight, style.marginTop].join(' '),
    position: getComputedStyle(document.getElementById('surface-panel')).position,
  };
})()`);
check(
  "layer · top = band + one gap, right = one gap from the main column, 360 wide",
  layer.top === layer.bandPlusGap &&
    layer.rightGap === layer.colGap &&
    layer.width === 360 &&
    layer.position === "absolute",
  layer,
);
check(
  "layer · the cards stop one gap above the composer's top edge",
  layer.bottom === layer.composerTop - layer.colGap,
  layer,
);
check(
  "layer · a module card adds no outer margin",
  layer.cardMargin === "0px 0px 0px",
  layer.cardMargin,
);

/* 3 · WK-72 · the 740 reading column and the 360 layer coexist without
 *     overlapping: header, prose and composer keep one left edge, and the
 *     column's right edge stops short of the cards. */
const column = await evaluate(`(() => {
  const left = (s) => { const n = document.querySelector(s); return n ? Math.round(n.getBoundingClientRect().left) : null; };
  const form = document.getElementById('composer-form').getBoundingClientRect();
  const card = document.querySelector('.rail-card').getBoundingClientRect();
  return { header: left('.chat-header-inner'), composer: Math.round(form.left),
           columnRight: Math.round(form.right), cardLeft: Math.round(card.left) };
})()`);
check(
  "column · the header and the composer share one left edge",
  column.header === column.composer,
  column,
);
check(
  "column · the reading column and the floating cards do not overlap",
  column.columnRight < column.cardLeft,
  column,
);

/* 4 · the two collapsed forms, and what each one shows. */
const collapsed = await evaluate(`(() => ({
  railHidden: document.getElementById('surface-rail').hidden,
  tabsHidden: document.getElementById('surface-tabs').hidden,
  modules: [...document.querySelectorAll('.rail-card')].map(c => c.dataset.module),
  panesHidden: ['surface-content','runtime-content','run-content','file-content'].map(id => document.getElementById(id).hidden),
  nested: document.querySelectorAll('.rail-card .rail-card').length,
  progress: document.querySelectorAll('#surface-rail progress, #surface-rail meter').length,
  percent: (document.getElementById('surface-rail').textContent.match(/%/g) || []).length,
  backdropHidden: document.getElementById('surface-backdrop').hidden,
  ariaModal: document.getElementById('surface-panel').getAttribute('aria-modal'),
}))()`);
check(
  "collapsed · cards showing, tab strip and every pane hidden",
  collapsed.railHidden === false &&
    collapsed.tabsHidden === true &&
    collapsed.panesHidden.every(Boolean),
  collapsed,
);
check(
  "collapsed · no nested card, no progress bar, no percentage",
  collapsed.nested === 0 && collapsed.progress === 0 && collapsed.percent === 0,
  collapsed,
);
check(
  "collapsed · an L2 layer disables nothing: no scrim, no aria-modal",
  collapsed.backdropHidden === true && collapsed.ariaModal === null,
  collapsed,
);

/* 5 · WK-69 L3 · expanded is a sheet on the scrim over the main column; the
 *     sidebar keeps working, so no aria-modal is claimed (WK-74 (1)). */
await evaluate(
  `(async () => { document.querySelector('.rail-card .rail-open').click(); await new Promise(r => setTimeout(r, 1000)); })()`,
);
const expanded = await evaluate(`(() => {
  const panel = document.getElementById('surface-panel').getBoundingClientRect();
  const backdrop = document.getElementById('surface-backdrop');
  const chat = document.querySelector('.chat-panel').getBoundingClientRect();
  const root = getComputedStyle(document.documentElement);
  const style = getComputedStyle(document.getElementById('surface-panel'));
  return {
    top: Math.round(panel.top),
    bandPlusGap: parseFloat(root.getPropertyValue('--band-top')) + parseFloat(root.getPropertyValue('--col-gap')),
    rightGap: Math.round(chat.right - panel.right),
    colGap: parseFloat(root.getPropertyValue('--col-gap')),
    backdropHidden: backdrop.hidden,
    backdropLeft: Math.round(backdrop.getBoundingClientRect().left),
    chatLeft: Math.round(chat.left),
    shadow: style.boxShadow !== 'none',
    tabsHidden: document.getElementById('surface-tabs').hidden,
    railHidden: document.getElementById('surface-rail').hidden,
    chatInert: document.querySelector('.chat-panel').inert,
    navInert: document.getElementById('navigation-panel').inert,
    ariaModal: document.getElementById('surface-panel').getAttribute('aria-modal'),
  };
})()`);
check(
  "expanded · the sheet grows out of the cards: same top edge, same right gutter",
  expanded.top === expanded.bandPlusGap && expanded.rightGap === expanded.colGap,
  expanded,
);
check(
  "expanded · L3 material: the scrim covers the main column only, the sheet carries the float shadow",
  expanded.backdropHidden === false &&
    expanded.backdropLeft === expanded.chatLeft &&
    expanded.shadow === true,
  expanded,
);
check(
  "expanded · the tab strip replaces the cards inside the sheet",
  expanded.tabsHidden === false && expanded.railHidden === true,
  expanded,
);
check(
  "expanded · the sidebar stays operable and no aria-modal is claimed",
  expanded.chatInert === true &&
    expanded.navInert === false &&
    expanded.ariaModal === null,
  expanded,
);

/* 6 · Escape is two steps: sheet, cards, closed. */
const escape = await evaluate(`(async () => {
  const snap = () => ({ expanded: document.getElementById('app-shell').classList.contains('surface-expanded'),
                        rail: !document.getElementById('surface-rail').hidden,
                        open: !document.getElementById('surface-panel').hidden });
  const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const steps = [snap()];
  esc(); await new Promise(r => setTimeout(r, 250)); steps.push(snap());
  esc(); await new Promise(r => setTimeout(r, 250)); steps.push(snap());
  return steps;
})()`);
check(
  "escape · sheet, then cards, then closed",
  escape[0].expanded === true &&
    escape[1].expanded === false &&
    escape[1].rail === true &&
    escape[2].open === false,
  escape,
);

/* 7 · tab keyboard traversal inside the sheet is unchanged. */
const keyboard = await evaluate(`(async () => {
  document.getElementById('show-surface-button').click();
  await new Promise(r => setTimeout(r, 500));
  document.querySelector('.rail-card .rail-open').click();
  await new Promise(r => setTimeout(r, 800));
  const strip = document.getElementById('surface-tabs');
  const press = async (key) => { strip.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 250)); return document.activeElement.id; };
  document.getElementById('surface-preview-tab').focus();
  const order = [document.activeElement.id];
  order.push(await press('ArrowRight'));
  order.push(await press('End'));
  order.push(await press('Home'));
  return order;
})()`);
check(
  "keyboard · ArrowRight / End / Home move the selected tab",
  keyboard[0] === "surface-preview-tab" &&
    keyboard[1] !== keyboard[0] &&
    keyboard[3] === "surface-preview-tab",
  keyboard,
);

/* 8 · the renderer lifecycle is untouched by collapsing and expanding. */
const lifecycle = await evaluate(`(async () => {
  const calls = [];
  const original = window.fetch;
  window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
  for (let i = 0; i < 3; i++) {
    document.getElementById('surface-expand-button').click();
    await new Promise(r => setTimeout(r, 350));
  }
  const workspaceReads = calls.filter(u => u.includes('/workspace')).length;
  const runtimeReads = calls.filter(u => u.includes('/runtime-control')).length;
  window.fetch = original;
  return { toggles: 3, workspaceReads, runtimeReads, total: calls.length };
})()`);
check(
  "lifecycle · three collapse/expand toggles re-read nothing",
  lifecycle.workspaceReads === 0 && lifecycle.runtimeReads === 0,
  lifecycle,
);

/* 9 · WK-73 · the composer's anatomy: inside the box one row, outside it the
 *     quiet line with nothing on the right. */
const composer = await evaluate(`(() => {
  const inside = [...document.querySelectorAll('.composer-controls button')].filter(b => !b.hidden).map(b => b.id);
  const below = document.getElementById('composer-below');
  const visible = [...below.children].filter(c => !c.hidden);
  const permission = document.getElementById('permission-settings-button');
  const form = document.getElementById('composer-form');
  const style = getComputedStyle(form);
  const sendStyle = getComputedStyle(document.getElementById('send-button'));
  return {
    inside,
    belowIds: visible.map(c => c.id),
    belowText: visible.map(c => c.textContent.trim()),
    permissionWord: permission.textContent.trim(),
    permissionName: permission.getAttribute('aria-label'),
    project: document.getElementById('composer-project').textContent.trim(),
    modelChip: document.getElementById('model-settings-button').textContent.trim(),
    microphone: document.querySelectorAll('#composer-form [aria-label*="ic"][aria-label*="phone"]').length,
    shadow: style.boxShadow !== 'none',
    sendRadius: sendStyle.borderRadius,
  };
})()`);
check(
  "composer · inside the box: attach, the model chip, then the round send slot",
  composer.inside.join(",") === "materials-button,model-settings-button,send-button" &&
    composer.sendRadius === "50%",
  composer,
);
check(
  "composer · the box is a floating layer (float ground, one strong line, the float shadow)",
  composer.shadow === true,
  composer.shadow,
);
check(
  "composer · below the box: the project read-only and the mode as one word, nothing else",
  composer.belowIds.join(",") === "composer-project,permission-settings-button" &&
    ["Ask", "Write", "Read"].includes(composer.permissionWord) &&
    /Ask before writing|Workspace writes allowed|Read only/.test(composer.permissionName) &&
    composer.microphone === 0,
  composer,
);

/* 10 · WK-69 · the elevation ladder is a measurement, not a claim: in the dark
 *      scheme frame < panel < float; in the light one the surface is the paper
 *      and the float is the same paper carrying a shadow. */
async function elevation(scheme) {
  await cdp("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: scheme }],
  });
  await sleep(300);
  return evaluate(`(() => {
    const root = getComputedStyle(document.documentElement);
    const hex = (v) => v.trim();
    const rgb = (v) => { const m = v.match(/\\d+/g); return m ? m.slice(0,3).map(Number) : null; };
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x/12.92 : ((x+0.055)/1.055) ** 2.4; }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
    const role = (name) => hex(root.getPropertyValue(name));
    const measured = (s) => rgb(getComputedStyle(document.querySelector(s)).backgroundColor);
    const frame = measured('body'), panel = measured('.chat-panel'), float = measured('#composer-form');
    return { frame: role('--frame'), panel: role('--panel'), float: role('--float'),
             lum: { frame: +lum(frame).toFixed(4), panel: +lum(panel).toFixed(4), float: +lum(float).toFixed(4) },
             rgb: { frame, panel, float } };
  })()`);
}
const dark = await elevation("dark");
check(
  "elevation · dark: frame < panel < float in measured luminance",
  dark.lum.frame < dark.lum.panel && dark.lum.panel < dark.lum.float,
  dark,
);
const light = await elevation("light");
check(
  "elevation · light: the frame is the lowest and the float is the surface's paper",
  light.lum.frame < light.lum.panel &&
    light.lum.panel === light.lum.float,
  light,
);
await cdp("Emulation.setEmulatedMedia", { features: [] });

/* 11 · WK-72 · 1200 × 800: the main column can no longer hold 740 and 360, so
 *      the cards collapse to one glyph per module at the same edge. */
await viewport(1200, 800);
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
const strip = await evaluate(`(async () => {
  document.getElementById('show-surface-button').click();
  await new Promise(r => setTimeout(r, 1200));
  const chat = document.querySelector('.chat-panel').getBoundingClientRect();
  const stripBox = document.querySelector('.rail-strip');
  const buttons = [...document.querySelectorAll('.rail-strip button')];
  const form = document.getElementById('composer-form').getBoundingClientRect();
  const box = stripBox ? stripBox.getBoundingClientRect() : null;
  return {
    chatWidth: Math.round(chat.width),
    cards: document.querySelectorAll('.rail-card').length,
    names: buttons.map(b => b.getAttribute('aria-label')),
    icons: buttons.map(b => b.querySelector('use')?.getAttribute('href')?.split('#').pop()),
    visibleLabels: buttons.filter(b => b.querySelector('.button-label')).length,
    left: box ? Math.round(box.left) : null,
    top: box ? Math.round(box.top) : null,
    width: box ? Math.round(box.width) : null,
    rightGap: box ? Math.round(chat.right - box.right) : null,
    columnRight: Math.round(form.right),
  };
})()`);
check(
  "strip · under 740 + 2·gap + 360 the cards become one glyph per module",
  strip.chatWidth < 740 + 48 + 360 &&
    strip.cards === 0 &&
    strip.names.length >= 2 &&
    strip.visibleLabels === 0 &&
    strip.rightGap === 24,
  strip,
);
check(
  "strip · every glyph carries its module's title as the accessible name",
  strip.names.every((n) => ["Run", "File", "Workspace", "Runtime"].includes(n)),
  strip.names,
);
const stripOpen = await evaluate(`(async () => {
  document.querySelector('.rail-strip button').click();
  await new Promise(r => setTimeout(r, 900));
  return { expanded: document.getElementById('app-shell').classList.contains('surface-expanded'),
           selected: [...document.querySelectorAll('#surface-tabs [role=tab]')].filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.id) };
})()`);
check(
  "strip · a glyph opens the overlay on that module",
  stripOpen.expanded === true && stripOpen.selected.length === 1,
  stripOpen,
);

/* 12 · 390 with a coarse pointer: no control below 44, no horizontal overflow,
 *      and the full-width sheet below 768 is unchanged. */
await viewport(390, 844, true);
await cdp("Emulation.setEmulatedMedia", {
  features: [{ name: "pointer", value: "coarse" }],
});
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
const narrow = await evaluate(`(() => {
  const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=tab]')]
    .filter(n => n.getClientRects().length && !n.closest('[inert]') && !n.closest('[hidden]'));
  const small = controls
    .map(n => ({ id: n.id || n.className || n.tagName, h: Math.round(n.getBoundingClientRect().height) }))
    .filter(n => n.h < 44);
  return { controls: controls.length, small,
           overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
           composerPosition: getComputedStyle(document.getElementById('composer-area')).position,
           composerShadow: getComputedStyle(document.getElementById('composer-form')).boxShadow !== 'none' };
})()`);
check("narrow 390 · no control under 44 with a coarse pointer", narrow.small.length === 0, narrow);
check("narrow 390 · no horizontal overflow", narrow.overflow <= 0, narrow.overflow);
check(
  "narrow 390 · the composer is a docked floating layer",
  narrow.composerPosition === "sticky" && narrow.composerShadow === true,
  narrow,
);
const sheet = await evaluate(`(async () => {
  document.getElementById('show-surface-button').click();
  await new Promise(r => setTimeout(r, 1200));
  const panel = document.getElementById('surface-panel');
  const box = panel.getBoundingClientRect();
  return { width: Math.round(box.width), left: Math.round(box.left),
           cards: document.querySelectorAll('.rail-card').length,
           strip: document.querySelectorAll('.rail-strip').length,
           header: getComputedStyle(document.querySelector('.surface-header')).display,
           ariaModal: panel.getAttribute('aria-modal') };
})()`);
check(
  "narrow 390 · below 768 the full-width sheet stands, cards inside it, and it is the one real modal",
  sheet.width === 390 &&
    sheet.left === 0 &&
    sheet.cards >= 1 &&
    sheet.strip === 0 &&
    sheet.header !== "none" &&
    sheet.ariaModal === "true",
  sheet,
);

/* 13 · 1440 again: no horizontal overflow in either state. */
await cdp("Emulation.setEmulatedMedia", { features: [] });
await viewport(1440, 900);
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
const overflow = await evaluate(`(async () => {
  const width = () => document.documentElement.scrollWidth - document.documentElement.clientWidth;
  document.getElementById('show-surface-button').click();
  await new Promise(r => setTimeout(r, 900));
  const collapsed = width();
  document.querySelector('.rail-card .rail-open').click();
  await new Promise(r => setTimeout(r, 900));
  return { collapsed, expanded: width() };
})()`);
check(
  "1440 · no horizontal overflow collapsed or expanded",
  overflow.collapsed <= 0 && overflow.expanded <= 0,
  overflow,
);

const failed = results.filter((r) => !r.pass).length;
await writeFile(
  path.join(OUT, "dom-assertions.json"),
  JSON.stringify(
    { origin: ORIGIN, at: new Date().toISOString(), results, failed },
    null,
    2,
  ),
);
console.log(`\n${results.length - failed}/${results.length} checks passed`);
socket.close();
child.kill();
process.exit(failed ? 1 : 0);
