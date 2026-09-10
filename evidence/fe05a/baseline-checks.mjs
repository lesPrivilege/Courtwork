/* FE-05a Commit A · 三处既有缺陷的断言（BASELINE-*）。
 *
 * 这三条与 V1 无关：它们在字阶与控件密度改动之前就必须成立，之后也必须仍然成立。
 * harness 逐字复制自 evidence/cc-d0a/browser.mjs，只改端口（8905→8909、CDP 20000→20070）。
 *
 *   BASELINE-1  M-15 · B 态（1024–1679 视图切换）顶带的内容原点与文档面内容原点同一条 x；
 *               C 态（≥1680 三栏）顶带仍居中到阅读列，不被这条修改带走
 *   BASELINE-2  M-16 · 动作按钮的解剖只有一种：带可见标签的按钮不携带 icon-only 几何，
 *               看得见的字不折行；Send / Cancel run 的字形、可访问名与槽位在重绘后不变
 *   BASELINE-3  M-17 · 390 下每一个可见 .segment 的实际命中区 ≥44
 */
import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const results = [];
const record = (id, pass, detail) => results.push({ id, pass, ...detail });

async function open(url, { width = 1440, height = 900, scheme = "light" } = {}) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
  });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: scheme },
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
  await cdp("Page.navigate", { url });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(500);
}
const openWork = async () => {
  await ev(`document.querySelector('.project-list button')?.click(), true`);
  await sleep(400);
  await ev(`(() => { const list = document.querySelectorAll('.project-list [data-session-id]');
     (list[0] || document.querySelector('.home-row'))?.click(); return true; })()`);
  await waitFor("window.__V5_UI__?.state.activeSessionId");
  await sleep(700);
};
const expandSurface = async () => {
  await ev(`(() => { if (!window.__V5_UI__.state.surface.open) document.getElementById('show-surface-button').click(); return true; })()`);
  await sleep(700);
  await ev(`(() => { if (!window.__V5_UI__.state.surface.expanded) document.getElementById('surface-expand-button').click(); return true; })()`);
  await sleep(1100);
};

/* 顶带内容原点 = 顶带里第一件看得见的东西的左缘；文档面内容原点 = 内容盒左缘 + 其左内边距。 */
const HEADER_ORIGIN = `(() => {
  const px = (n) => Math.round(n);
  const header = document.querySelector('.chat-header');
  const first = [...header.children].find((n) => !n.hidden && n.getClientRects().length);
  const inner = document.querySelector('.chat-header-inner');
  const content = document.querySelector('#surface-panel .surface-content:not([hidden])');
  const cs = content && getComputedStyle(content);
  return {
    shell: document.getElementById('app-shell').className,
    headerOrigin: first ? px(first.getBoundingClientRect().left) : null,
    headerRight: inner ? px(inner.getBoundingClientRect().right) : null,
    innerMaxWidth: inner ? getComputedStyle(inner).maxWidth : null,
    contentOrigin: content ? px(content.getBoundingClientRect().left + parseFloat(cs.paddingLeft)) : null,
    contentRight: content ? px(content.getBoundingClientRect().right - parseFloat(cs.paddingRight)) : null,
    column: px(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--column'))),
  };
})()`;

/* 解剖：只量动作按钮 —— 带 `.button-label`（看得见的短词）或 `.icon-only`（见方几何）
   的那些。列表行按钮的文字是内容不是标签，本来就允许换行与省略，不在这条契约里。 */
const ANATOMY = `(() => {
  const buttons = [...document.querySelectorAll('button')]
    .filter((b) => b.getClientRects().length)
    .filter((b) => b.classList.contains('icon-only') || b.querySelector(':scope > .button-label'));
  const read = (b) => {
    const r = b.getBoundingClientRect();
    const shown = b.querySelector(':scope > .button-label');
    return {
      id: b.id || b.className,
      label: shown ? shown.textContent.trim() : "",
      labelled: Boolean(shown),
      iconOnly: b.classList.contains('icon-only'),
      width: Math.round(r.width), height: Math.round(r.height),
      scrollWidth: b.scrollWidth, clientWidth: b.clientWidth,
      wrapped: b.scrollWidth > b.clientWidth + 1,
      glyph: Boolean(b.querySelector(':scope > svg.ui-icon')),
      aria: b.getAttribute('aria-label'),
      whiteSpace: shown ? getComputedStyle(shown).whiteSpace : null,
    };
  };
  const all = buttons.map(read);
  const one = (id) => {
    const b = document.getElementById(id);
    return b && b.getClientRects().length ? read(b) : null;
  };
  return {
    total: all.length,
    lockedAndLabelled: all.filter((b) => b.iconOnly && b.labelled),
    wrapped: all.filter((b) => b.wrapped),
    labelledWrapping: all.filter((b) => b.labelled && b.whiteSpace !== 'nowrap'),
    send: one('send-button'),
    cancel: one('cancel-run-button'),
  };
})()`;

const SEGMENTS = `(() => [...document.querySelectorAll('.segment')]
  .filter((n) => n.getClientRects().length)
  .map((n) => ({ text: n.textContent.trim().slice(0, 24),
    height: Math.round(n.getBoundingClientRect().height),
    width: Math.round(n.getBoundingClientRect().width) })))()`;

try {
  /* ── BASELINE-1 · B 态对齐；C 态不动 ─────────────────────────────────── */
  await open(ORIGIN, { width: 1440, height: 900 });
  await openWork();
  await expandSurface();
  const b = await ev(HEADER_ORIGIN);
  record("BASELINE-1-B-1440", b.headerOrigin !== null && b.contentOrigin !== null &&
    Math.abs(b.headerOrigin - b.contentOrigin) <= 1 && Math.abs(b.headerRight - b.contentRight) <= 1, {
    state: "view-switch", headerOrigin: b.headerOrigin, contentOrigin: b.contentOrigin,
    headerRight: b.headerRight, contentRight: b.contentRight, shell: b.shell,
  });
  await open(ORIGIN, { width: 1680, height: 900 });
  await openWork();
  await expandSurface();
  const c = await ev(HEADER_ORIGIN);
  record("BASELINE-1-C-1680", c.shell.includes("surface-three-pane") &&
    c.innerMaxWidth === `${c.column}px`, {
    state: "three-pane", innerMaxWidth: c.innerMaxWidth, column: c.column, shell: c.shell,
  });

  /* ── BASELINE-2 · 动作解剖（Home 的 idle Send；Work 的在跑 Cancel run）── */
  await open(ORIGIN, { width: 1440, height: 900 });
  const home = await ev(ANATOMY);
  record("BASELINE-2-idle-send", home.lockedAndLabelled.length === 0 &&
    home.wrapped.length === 0 && home.labelledWrapping.length === 0 &&
    Boolean(home.send?.glyph) && home.send?.aria === "Send", {
    view: "home", buttons: home.total, send: home.send,
    lockedAndLabelled: home.lockedAndLabelled, wrapped: home.wrapped,
    labelledWrapping: home.labelledWrapping,
  });
  await openWork();
  /* 在跑态用产品自己的路径造出来：composer 里打字、点 Send，等 Cancel run 露面。 */
  await ev(`(() => { const t = document.getElementById('composer-input');
    t.focus(); t.value = 'Summarise the retainer letter'; 
    t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await sleep(300);
  await ev(`(() => { document.getElementById('send-button').click(); return true; })()`);
  await waitFor(`(() => { const c = document.getElementById('cancel-run-button');
    return Boolean(c && !c.hidden && c.getClientRects().length); })()`);
  await sleep(400);
  const work = await ev(ANATOMY);
  record("BASELINE-2-work-cancel", work.lockedAndLabelled.length === 0 &&
    work.wrapped.length === 0 && work.labelledWrapping.length === 0 &&
    Boolean(work.cancel?.glyph) && work.cancel?.aria === "Cancel run", {
    view: "work", buttons: work.total, cancel: work.cancel, send: work.send,
    lockedAndLabelled: work.lockedAndLabelled, wrapped: work.wrapped,
    labelledWrapping: work.labelledWrapping,
  });
  /* 重绘之后解剖不变：renderComposer 再跑一次，两个按钮的字形与可访问名逐位相同。 */
  await ev(`(() => { window.__V5_UI__.render(); return true; })()`).catch(() => null);
  await sleep(300);
  const again = await ev(ANATOMY);
  record("BASELINE-2-redraw", again.lockedAndLabelled.length === 0 &&
    Boolean(again.cancel?.glyph) === Boolean(work.cancel?.glyph) &&
    again.cancel?.aria === work.cancel?.aria &&
    again.cancel?.width === work.cancel?.width, {
    before: work.cancel, after: again.cancel,
  });

  /* ── BASELINE-3 · 390 的 .segment 命中区 ─────────────────────────────── */
  await open(ORIGIN, { width: 390, height: 844 });
  await ev(`(() => { document.getElementById('runtime-setup-button')?.click(); return true; })()`);
  await sleep(1200);
  const settings = await ev(SEGMENTS);
  record("BASELINE-3-settings-390", settings.length > 0 && settings.every((s) => s.height >= 44), {
    segments: settings,
  });
  await ev(`(() => { location.hash = '#settings/connections'; return true; })()`);
  await sleep(1200);
  const connections = await ev(SEGMENTS);
  record("BASELINE-3-connections-390", connections.every((s) => s.height >= 44), {
    segments: connections,
  });
} finally {
  await writeFile(new URL("./baseline-checks.json", import.meta.url),
    JSON.stringify({ results, passed: results.filter((r) => r.pass).length, total: results.length }, null, 1));
  console.log(results.map((r) => `${r.pass ? "ok" : "FAIL"} ${r.id}`).join("\n"));
  console.log(`${results.filter((r) => r.pass).length}/${results.length}`);
  await close();
}
