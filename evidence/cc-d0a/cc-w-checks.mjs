/* CC-W · 本单新增的行为断言（几何在 composition-checks.mjs，FN-22/23/24 在 fe-t07.mjs）。
 * 全部状态都经产品自己的控件到达：文档由一次真的 ws_write 记录出来，再由 Chat Flow
 * 上那一行打开；在途窗口用 wk10b-1 起就在用的「扣住一个请求」手法观察，扣住的是传输
 * 不是答案。没有向 store 直写，没有 stub 任何 renderer。
 *
 *   CCW-1  文档 tab：至多一个、带名字、截断保留可访问全名；类型 tab 无关闭区，
 *          文档 tab 的选中区与关闭区是两个不重叠的命中区；file 档不画两遍
 *   CCW-2  键盘：方向键 / Home / End 只在 role="tab" 之间走，关闭钮不是一站；
 *          焦点在文档 tab 上时 Delete 关闭它
 *   CCW-3  关闭活跃文档 tab 回紧凑目录，焦点回到打开它的那个控件
 *   CCW-4  面板宽 ≠ 正文行宽：文档面 1136 里正文 ≤ --doc-measure，代码块在自己的
 *          盒子里横向滚动
 *   CCW-5  M-9：在途换词不换宽度，邻居不位移，焦点不丢
 *   CCW-6  M-10：首个 tooltip 等 400ms，窗口内相邻即时，出窗口回到延迟
 *   CCW-7  WK-118 ⑤：agent activity 是类型 tab 上的一个微型记号，不是 banner，
 *          且不只靠颜色
 *
 *   APP_URL=http://127.0.0.1:8905 WK6_CDP_PORT=20003 node evidence/cc-w/cc-w-checks.mjs
 */
import { cdp, evaluate as ev, key, waitFor, close, ORIGIN, sleep, observations } from "./browser.mjs";
import { writeFile } from "node:fs/promises";

const state = "window.__V5_UI__.state";
const results = [];
const check = (name, pass, actual) => {
  results.push({ name, pass, actual });
  console.log(`${pass ? "PASS" : "FAIL"} · ${name} · ${JSON.stringify(actual)?.slice(0, 600)}`);
};
const openSession = (title) =>
  ev(`(async () => {
    document.querySelectorAll('#project-list .project-toggle').forEach(t => { if (t.getAttribute('aria-expanded') === 'false') t.click(); });
    await new Promise(r => setTimeout(r, 500));
    const button = [...document.querySelectorAll('#project-list .session-button')].find(b => b.textContent.includes(${JSON.stringify(title)}));
    if (!button) throw new Error('no session named ' + ${JSON.stringify(title)});
    button.click();
    await new Promise(r => setTimeout(r, 1500));
  })()`);
const startRun = (input) =>
  ev(`(async () => {
    const composer = document.getElementById('composer-input');
    composer.value = ${JSON.stringify(input)};
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('send-button').click();
    await new Promise(r => setTimeout(r, 1200));
    return ${state}.activeSessionId;
  })()`);
const STRIP = `(() => {
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) }; };
  const wrap = document.getElementById('surface-document-tab');
  const select = document.getElementById('surface-document-select');
  const closeButton = document.getElementById('surface-document-close');
  const typeTabs = [...document.querySelectorAll('#surface-tabs > button[role=tab]')];
  return {
    documentTabVisible: wrap.hidden === false,
    documentTabs: document.querySelectorAll('#surface-document-tab').length,
    label: select.textContent,
    title: select.getAttribute('title'),
    accessibleName: select.getAttribute('aria-label'),
    selected: select.getAttribute('aria-selected'),
    fileTypeTabVisible: document.getElementById('surface-file-tab').hidden === false,
    visibleTabIds: [...document.querySelectorAll('#surface-tabs [role=tab]')].filter(t => !t.hidden && !t.closest('[hidden]')).map(t => t.id),
    typeTabsWithClose: typeTabs.filter(t => t.querySelector('.surface-tab-close')).map(t => t.id),
    selectBox: box(select),
    closeBox: box(closeButton),
    closeLabel: closeButton.getAttribute('aria-label'),
    backOutsideTablist: document.getElementById('surface-back-button').closest('#surface-tabs') === null,
    backRole: document.getElementById('surface-back-button').getAttribute('role'),
    scope: document.getElementById('surface-scope').hidden ? null : document.getElementById('surface-scope').textContent,
    expanded: ${state}.surface.expanded,
    open: ${state}.surface.open,
    kind: ${state}.surface.kind,
    fileRef: ${state}.surface.fileRef,
    paneLabelledBy: document.getElementById('file-content').getAttribute('aria-labelledby'),
  };
})()`;

const openDocument = () =>
  ev(`(async () => {
    const row = [...document.querySelectorAll('#message-stream button')]
      .find(b => /out\\/note/.test(b.textContent));
    if (!row) return null;
    row.focus();
    row.click();
    await new Promise(r => setTimeout(r, 1500));
    return { label: row.textContent.trim(), focusKey: row.dataset.focusKey };
  })()`);

try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await ev(`location.href = ${JSON.stringify(ORIGIN)}`);
  await waitFor(`Boolean(window.__V5_UI__ && ${state}.projects.length)`, 20000);

  /* ── 1 · 一次真的写入，产出一行可打开的记录文件 ─────────────────── */
  await openSession("Document tab");
  await startRun('/fixture script [{"name":"ws_write","arguments":{"path":"out/note-for-the-document-tab.txt","text":"CC-W document tab fixture\\nline two\\n"}}]');
  await waitFor(`[...document.querySelectorAll('#message-stream button')].some(b => /out\\/note/.test(b.textContent))`, 25000);
  const openedLabel = await openDocument();
  let strip = await ev(STRIP);
  check(
    "CCW-1 · 文档 tab 至多一个、带名字、截断保留可访问全名；类型 tab 无关闭区；file 档不画两遍",
    strip.documentTabVisible === true &&
      strip.documentTabs === 1 &&
      strip.label === "note-for-the-document-tab.txt" &&
      strip.title === strip.fileRef.path &&
      strip.accessibleName === strip.fileRef.path &&
      strip.fileTypeTabVisible === false &&
      strip.typeTabsWithClose.length === 0 &&
      strip.selectBox.right <= strip.closeBox.left &&
      strip.closeBox.width >= 24 && strip.closeBox.height >= 24 &&
      strip.backOutsideTablist === true &&
      strip.backRole === null &&
      strip.paneLabelledBy === "surface-document-select" &&
      // 这是一个未绑定 Matter 的会话（Chat），所以标题带上没有 scope 位可说：
      // Work 会话上的那一份由 shell-checks 的 CW-2 / CW-4 断言。
      strip.scope === null,
    { openedLabel: openedLabel.label, ...strip },
  );

  /* ── 2 · 键盘：只在 role="tab" 之间走；Delete 关闭 ────────────────── */
  const walk = await ev(`(async () => {
    document.getElementById('surface-document-select').focus();
    return { start: document.activeElement.id };
  })()`);
  await key({ code: "Home", keyCode: 36 });
  await sleep(300);
  const atHome = await ev(`document.activeElement.id`);
  await key({ code: "End", keyCode: 35 });
  await sleep(300);
  const atEnd = await ev(`document.activeElement.id`);
  await key({ code: "ArrowLeft", keyCode: 37 });
  await sleep(300);
  const afterLeft = await ev(`document.activeElement.id`);
  check(
    "CCW-2 · 方向键 / Home / End 只在 role=tab 之间走，关闭钮不是这条 tablist 的一站",
    atHome === "surface-preview-tab" &&
      atEnd === "surface-document-select" &&
      afterLeft !== "surface-document-close" &&
      afterLeft !== "" &&
      walk.start === "surface-document-select",
    { start: walk.start, home: atHome, end: atEnd, left: afterLeft },
  );

  /* ── 3 · 关闭活跃文档 tab：回紧凑目录，焦点回到打开它的控件 ───────── */
  await ev(`document.getElementById('surface-document-select').focus(), true`);
  await key({ code: "Delete", keyCode: 46 });
  await sleep(800);
  const afterDelete = await ev(`(() => ({
    documentTabVisible: document.getElementById('surface-document-tab').hidden === false,
    open: ${state}.surface.open,
    expanded: ${state}.surface.expanded,
    kind: ${state}.surface.kind,
    fileRef: ${state}.surface.fileRef,
    focusKey: document.activeElement?.dataset?.focusKey ?? null,
    focusClass: document.activeElement?.className ?? null,
    railVisible: document.querySelectorAll('#surface-rail .rail-card').length > 0,
  }))()`);
  check(
    "CCW-3 · Delete 关闭活跃文档 tab：回紧凑目录，焦点还给打开它的那个控件",
    afterDelete.documentTabVisible === false &&
      afterDelete.fileRef === null &&
      afterDelete.open === true &&
      afterDelete.expanded === false &&
      afterDelete.railVisible === true &&
      // 重画之后同一行由 data-focus-key 认出来，焦点落回打开这份文档的那一行。
      afterDelete.focusKey === openedLabel.focusKey &&
      /artifact-thread-row/.test(afterDelete.focusClass ?? ""),
    { ...afterDelete, opener: openedLabel },
  );

  /* ── 4 · 面板宽 ≠ 正文行宽 ─────────────────────────────────────── */
  await openDocument();
  const measure = await ev(`(() => {
    const pane = document.getElementById('file-content');
    const panel = document.getElementById('surface-panel');
    const limit = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--doc-measure'));
    const widest = [...pane.querySelectorAll('p, h3, .file-heading, .reading-note')]
      .filter(n => n.getClientRects().length)
      .map(n => Math.round(n.getBoundingClientRect().width));
    const pre = pane.querySelector('pre');
    return {
      panel: Math.round(panel.getBoundingClientRect().width),
      limit,
      widestProse: widest.length ? Math.max(...widest) : null,
      preOverflowX: pre ? getComputedStyle(pre).overflowX : null,
      preScrolls: pre ? pre.scrollWidth >= pre.clientWidth : null,
      paneScroll: getComputedStyle(pane).overflowY,
    };
  })()`);
  check(
    "CCW-4 · 面板 1136 里正文仍是一行的长度（≤ --doc-measure），代码块在自己的盒子里横向滚动",
    measure.panel === 1136 &&
      measure.widestProse !== null &&
      measure.widestProse <= measure.limit + 1 &&
      measure.preOverflowX === "auto",
    measure,
  );

  /* ── 5 · M-9 在途换词不换宽度 ─────────────────────────────────── */
  await openSession("Width under way");
  await startRun('/fixture script [{"name":"ws_write","arguments":{"path":"out/approve-me.txt","text":"CC-W approval fixture"}}]');
  await waitFor(`document.querySelector('#message-stream .permission-card') !== null`, 25000);
  const widths = await ev(`(async () => {
    const read = () => [...document.querySelectorAll('#message-stream .permission-card .question-actions button')]
      .map(b => ({ key: b.dataset.focusKey, text: b.textContent.trim(),
        width: Math.round(b.getBoundingClientRect().width), left: Math.round(b.getBoundingClientRect().left) }));
    const before = read();
    const approve = [...document.querySelectorAll('#message-stream .permission-card .question-actions button')]
      .find(b => b.textContent.trim() === 'Approve this write');
    approve.focus();
    const focusBefore = document.activeElement.dataset.focusKey;
    const original = window.fetch;
    let release;
    const gate = new Promise(r => { release = r; });
    window.fetch = (...args) => {
      const url = String(args[0]);
      if (url.includes('/questions/')) return gate.then(() => original(...args));
      return original(...args);
    };
    approve.click();
    await new Promise(r => setTimeout(r, 700));
    const during = read();
    const focusDuring = document.activeElement?.dataset?.focusKey ?? null;
    release();
    window.fetch = original;
    await new Promise(r => setTimeout(r, 1200));
    return { before, during, focusBefore, focusDuring };
  })()`);
  const pair = (rows, word) => rows.find(r => r.text === word);
  check(
    "CCW-5 · M-9：Sending… 不改按钮宽度，邻居不位移，焦点留在按下的那个决定上",
    widths.during.some(r => r.text === "Sending…") &&
      widths.before.length === widths.during.length &&
      widths.before.every((row, i) => Math.abs(row.width - widths.during[i].width) <= 1) &&
      widths.before.every((row, i) => Math.abs(row.left - widths.during[i].left) <= 1) &&
      widths.focusDuring === widths.focusBefore,
    widths,
  );

  /* ── 6 · M-10 tooltip 共享延迟 ───────────────────────────────── */
  const anchors = await ev(`(() => {
    const nodes = [...document.querySelectorAll('.chat-header [data-tooltip], .message-footer [data-tooltip]')]
      .filter(n => n.getClientRects().length);
    return nodes.slice(0, 2).map(n => { const r = n.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), tip: n.dataset.tooltip }; });
  })()`);
  const hover = async (point) => {
    await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", clickCount: 0 });
  };
  const openTip = async (tip, budget = 1500) => {
    const start = Date.now();
    while (Date.now() - start < budget) {
      const shown = await ev(
        `(() => { const t = document.getElementById('control-tooltip');
          return Boolean(t && t.matches(':popover-open')) && t.textContent === ${JSON.stringify(tip)}; })()`,
      );
      if (shown) return Date.now() - start;
      await sleep(25);
    }
    return null;
  };
  let tooltip = { anchors: anchors.length };
  if (anchors.length === 2) {
    await hover({ x: 5, y: 400 });
    await sleep(900);
    await hover(anchors[0]);
    tooltip.first = await openTip(anchors[0].tip);
    await hover(anchors[1]);
    tooltip.adjacent = await openTip(anchors[1].tip);
    await hover({ x: 5, y: 400 });
    await sleep(900);
    await hover(anchors[0]);
    tooltip.afterWindow = await openTip(anchors[0].tip);
  }
  check(
    "CCW-6 · M-10：首个 tooltip 等 400ms，窗口内相邻即时切换，出窗口回到延迟",
    anchors.length === 2 &&
      tooltip.first !== null && tooltip.first >= 350 &&
      tooltip.adjacent !== null && tooltip.adjacent <= 200 &&
      tooltip.afterWindow !== null && tooltip.afterWindow >= 300,
    tooltip,
  );

  /* ── 7 · WK-118 ⑤ agent activity 是 tab 上的一个记号 ─────────────── */
  /* 三栏态量这一条：B 态展开时 composer 不在屏幕上，起不了新的 run。 */
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1000, deviceScaleFactor: 1, mobile: false });
  await sleep(600);
  await openSession("Document tab");
  await ev(`(async () => {
    const row = [...document.querySelectorAll('#message-stream button')].find(b => b.getAttribute('aria-label') === 'Inspect this run');
    if (row) { row.click(); await new Promise(r => setTimeout(r, 1200)); }
    return Boolean(row);
  })()`);
  await ev(`(() => {
    const composer = document.getElementById('composer-input');
    composer.value = '/fixture script [{"name":"ws_write","arguments":{"path":"out/second.txt","text":"CC-W activity fixture"}}]';
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('send-button').click();
    return true;
  })()`);
  let activity = null, activityProbe = null;
  for (let i = 0; i < 200 && !activity; i++) {
    activityProbe = await ev(`(() => ({
      runTabHidden: document.getElementById('surface-run-tab').hidden,
      runs: ${state}.runs.map(r => r.status),
      kind: ${state}.surface.kind,
      expanded: ${state}.surface.expanded,
    }))()`);
    activity = await ev(`(() => {
      const tab = document.getElementById('surface-run-tab');
      const mark = tab?.querySelector('.tab-activity');
      if (!mark) return null;
      const style = getComputedStyle(mark);
      return {
        tab: tab.id, status: [...mark.classList].filter(c => c !== 'tab-activity'),
        word: mark.textContent.trim(),
        radius: style.borderTopLeftRadius, background: style.backgroundColor,
        banners: document.querySelectorAll('#surface-panel .banner, #surface-panel [role=status]').length,
      };
    })()`);
    if (!activity) await sleep(60);
  }
  check(
    "CCW-7 · agent activity 以微型记号入类型 tab，不造 banner，且不只靠颜色",
    Boolean(activity) && activity.word.length > 0 && activity.banners === 0,
    activity ?? { seen: null, probe: activityProbe },
  );

  check(
    "本单没有任何请求离开本 origin",
    observations.responses.every(r => r.url.startsWith(ORIGIN) || r.url.startsWith("data:")),
    observations.responses.filter(r => !r.url.startsWith(ORIGIN)).map(r => r.url),
  );
  check("页面没有抛出异常", observations.exceptions.length === 0, observations.exceptions.map(e => e.text));
} finally {
  await writeFile(new URL("./cc-w-checks.json", import.meta.url), JSON.stringify(results, null, 1));
  console.log(`${results.filter(r => r.pass).length} / ${results.length}`);
  await close();
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
