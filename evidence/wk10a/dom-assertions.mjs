/* WO-WK10a · DOM assertions over the real product in a real headless Chromium.
 * Every number is read with getBoundingClientRect() inside the page; nothing is
 * inferred from CSS. The browser is driven over CDP with Node's built-in
 * WebSocket, so no package is installed (same harness as evidence/wk6).
 *
 *   WK10A_BASE=http://127.0.0.1:8855 node evidence/wk10a/dom-assertions.mjs
 */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.WK10A_BASE ?? "http://127.0.0.1:8855";
const CHROME =
  process.env.CHROME_BIN ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK10A_CDP_PORT ?? 9341);
const OUT = new URL("./", import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk10a-"));
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

await viewport(1440, 900);
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2600);
await openSession();
await evaluate(
  `(async () => { document.getElementById('show-surface-button').click(); await new Promise(r => setTimeout(r, 1400)); })()`,
);

/* 1 · the alignment band: the three column headers share one top and one height. */
const band = await evaluate(`(() => {
  const box = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { top: Math.round(r.top), height: Math.round(r.height) }; };
  return { sidebar: box('.sidebar-header'), chat: box('.chat-header'), rail: box('.surface-header'),
           token: getComputedStyle(document.documentElement).getPropertyValue('--band-top').trim() };
})()`);
check(
  "band · three column headers share one top",
  band.sidebar.top === band.chat.top && band.chat.top === band.rail.top,
  band,
);
check(
  "band · three column headers share one height = --band-top",
  band.sidebar.height === 56 &&
    band.chat.height === 56 &&
    band.rail.height === 56,
  [band.sidebar.height, band.chat.height, band.rail.height, band.token],
);

/* 2 · the gutter: a module card keeps exactly one --col-gap from the rail's own
 *     content edge, and the card carries no outer margin of its own. */
const gutter = await evaluate(`(() => {
  const card = document.querySelector('.rail-card');
  const rail = document.getElementById('surface-rail');
  const railBox = rail.getBoundingClientRect();
  const pad = parseFloat(getComputedStyle(rail).paddingLeft);
  const style = getComputedStyle(card);
  return {
    cardLeft: Math.round(card.getBoundingClientRect().left),
    railContentLeft: Math.round(railBox.left + pad),
    railPanelLeft: Math.round(railBox.left),
    cardMargin: [style.marginLeft, style.marginRight, style.marginTop].join(' '),
    colGap: getComputedStyle(document.documentElement).getPropertyValue('--col-gap').trim(),
  };
})()`);
check(
  "gutter · card left edge = rail panel edge + one --col-gap",
  gutter.cardLeft === gutter.railContentLeft &&
    gutter.cardLeft - gutter.railPanelLeft === 24,
  gutter,
);
check(
  "gutter · a module card adds no outer margin",
  gutter.cardMargin === "0px 0px 0px",
  gutter.cardMargin,
);

/* 3 · the chat title and the prose share one left edge (the 740 column). */
const column = await evaluate(`(() => {
  const left = (s) => { const n = document.querySelector(s); return n ? Math.round(n.getBoundingClientRect().left) : null; };
  return { header: left('.chat-header-inner'), body: left('.message-stream .empty-state') ?? left('.message-stream > *'), composer: left('#composer-form') };
})()`);
check(
  "column · chat header inner and the composer share the 740 column left edge",
  column.header === column.composer,
  column,
);

/* 4 · the two rail states, and what each one shows. */
const collapsed = await evaluate(`(() => ({
  railHidden: document.getElementById('surface-rail').hidden,
  tabsHidden: document.getElementById('surface-tabs').hidden,
  modules: [...document.querySelectorAll('.rail-card')].map(c => c.dataset.module),
  panesHidden: ['surface-content','runtime-content','run-content','file-content'].map(id => document.getElementById(id).hidden),
  nested: document.querySelectorAll('.rail-card .rail-card').length,
  progress: document.querySelectorAll('#surface-rail progress, #surface-rail meter').length,
  percent: (document.getElementById('surface-rail').textContent.match(/%/g) || []).length,
}))()`);
check(
  "collapsed · the rail shows cards, the tab strip and every pane are hidden",
  collapsed.railHidden === false &&
    collapsed.tabsHidden === true &&
    collapsed.panesHidden.every(Boolean),
  collapsed,
);
check(
  "collapsed · no nested card, no progress bar, no percentage",
  collapsed.nested === 0 &&
    collapsed.progress === 0 &&
    collapsed.percent === 0,
  collapsed,
);

/* 5 · the expanded pane is a column of the shell; the tab strip is in the band. */
await evaluate(
  `(async () => { document.getElementById('surface-expand-button').click(); await new Promise(r => setTimeout(r, 900)); })()`,
);
const expanded = await evaluate(`(() => {
  const strip = document.getElementById('surface-tabs').getBoundingClientRect();
  const wordmark = document.querySelector('.sidebar-header').getBoundingClientRect();
  return {
    shell: document.getElementById('app-shell').className,
    stripTop: Math.round(strip.top),
    wordmarkTop: Math.round(wordmark.top),
    railHidden: document.getElementById('surface-rail').hidden,
    chatInert: document.querySelector('.chat-panel').inert,
    navInert: document.getElementById('navigation-panel').inert,
    ariaModal: document.getElementById('surface-panel').getAttribute('aria-modal'),
    selectedTab: [...document.querySelectorAll('#surface-tabs [role=tab]')].filter(t => t.getAttribute('aria-selected') === 'true').map(t => t.id),
  };
})()`);
check(
  "expanded · the tab strip sits in the same band as the sidebar wordmark row",
  expanded.stripTop === expanded.wordmarkTop,
  expanded,
);
check(
  "expanded · in-shell, not a modal: the sidebar stays operable, the chat column leaves the tree",
  expanded.chatInert === true &&
    expanded.navInert === false &&
    expanded.ariaModal === null,
  expanded,
);

/* 6 · Escape is two steps: pane, cards, closed. */
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
  "escape · pane, then cards, then closed",
  escape[0].expanded === true &&
    escape[1].expanded === false &&
    escape[1].rail === true &&
    escape[2].open === false,
  escape,
);

/* 7 · tab keyboard traversal (arrow / Home / End) still cycles the visible tabs. */
const keyboard = await evaluate(`(async () => {
  document.getElementById('show-surface-button').click();
  await new Promise(r => setTimeout(r, 500));
  document.getElementById('surface-expand-button').click();
  await new Promise(r => setTimeout(r, 700));
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

/* 8 · the renderer lifecycle is untouched by collapsing and expanding. The plain
 *     workspace tree has no renderer instance, so the counter watched here is the
 *     host's own read of it: one read per rail open, none per state change. */
const lifecycle = await evaluate(`(async () => {
  const calls = [];
  const original = window.fetch;
  window.fetch = (...args) => { calls.push(String(args[0])); return original(...args); };
  const before = calls.length;
  for (let i = 0; i < 3; i++) {
    document.getElementById('surface-expand-button').click();
    await new Promise(r => setTimeout(r, 350));
  }
  const workspaceReads = calls.filter(u => u.includes('/workspace')).length;
  const runtimeReads = calls.filter(u => u.includes('/runtime-control')).length;
  window.fetch = original;
  return { toggles: 3, workspaceReads, runtimeReads, total: calls.length - before };
})()`);
check(
  "lifecycle · three collapse/expand toggles re-read nothing",
  lifecycle.workspaceReads === 0 && lifecycle.runtimeReads === 0,
  lifecycle,
);

/* 9 · 390 with a coarse pointer: no control below 44, no horizontal overflow. */
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

/* 10 · 1440 again: no horizontal overflow in either rail state. */
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
  document.getElementById('surface-expand-button').click();
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
