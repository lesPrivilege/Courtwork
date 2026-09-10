// WO-CS-01 · interaction and edge checks on the live product (author checks).
//   CS_CONFIG fixture-config.json from serve.mjs; CS_OUT output dir (default ./after)
//   CS_URL overrides the origin. Real key events go through CDP Input.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { openBrowser, sleep } from './cdp.mjs';

const config = JSON.parse(await readFile(process.env.CS_CONFIG, 'utf8'));
const origin = process.env.CS_URL || config.url;
const out = path.resolve(process.env.CS_OUT || 'after');
await mkdir(out, { recursive: true });
const b = await openBrowser();
const results = [];
const record = (id, pass, detail) => { results.push({ id, pass, ...detail }); console.log(pass ? 'PASS' : 'FAIL', id, JSON.stringify(detail)); };

async function viewport(width, height, { mobile = false, scale = 1, theme = 'light' } = {}) {
  await b.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile });
  await b.cdp('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await b.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
}
async function openSession(title) {
  await b.cdp('Page.navigate', { url: origin + '/' });
  await b.waitFor(`!!document.querySelector('.session-button, .project-toggle')`);
  // A collapsed project hides its chats; expand it through its own toggle.
  if (!(await b.evaluate(`!!document.querySelector('.session-button')`))) await b.evaluate(`document.querySelector('.project-toggle').click()`);
  await b.waitFor(`!!document.querySelector('.session-button')`);
  await b.evaluate(`[...document.querySelectorAll('.session-button')].find(n => n.textContent.includes(${JSON.stringify(title)})).click()`);
  await b.waitFor(`document.querySelector('#session-title-text').textContent.includes(${JSON.stringify(title)}) && !!document.querySelector('.message-list .message.assistant')`);
  await sleep(500);
}
const rect = (sel) => `(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n || !n.getClientRects().length) return null; const r = n.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; })()`;
const shoot = async (name) => { await sleep(250); await writeFile(path.join(out, name + '.png'), await b.screenshot()); return name + '.png'; };
const escape = () => b.key('Escape', 'Escape', 27);
const tab = (shift = false) => b.key('Tab', 'Tab', 9, shift ? 8 : 0);

// 1 · composer growth, bound and undo (1440 light)
await viewport(1440, 900);
await openSession(config.main.title);
// Start from an empty draft (a previous run of this script may have left one).
await b.evaluate(`(() => { const t = document.getElementById('composer-input'); t.focus(); t.select(); document.execCommand('delete'); })()`);
const field = `(() => { const t = document.getElementById('composer-input'); const f = document.getElementById('composer-form'); const cs = getComputedStyle(t); return { value: t.value.length, lines: t.value ? t.value.split('\\n').length : 0, height: t.getBoundingClientRect().height, scrollHeight: t.scrollHeight, overflowY: cs.overflowY, fieldSizing: cs.fieldSizing ?? null, form: f.getBoundingClientRect().height, scrollTop: t.scrollTop, clientHeight: t.clientHeight }; })()`;
const growth = [{ step: 'empty', ...(await b.evaluate(field)) }];
for (const n of [1, 2, 3, 5, 8, 20]) {
  await b.evaluate(`(() => { const t = document.getElementById('composer-input'); t.select(); })()`);
  const text = Array.from({ length: n }, (_, i) => `Line ${i + 1} of a synthetic multi-line message`).join('\n');
  await b.cdp('Input.insertText', { text });
  growth.push({ step: `${n} lines`, ...(await b.evaluate(field)) });
}
const g = Object.fromEntries(growth.map((s) => [s.step, s]));
record('composer.empty-height', g.empty.height < 70 && g.empty.form < 130, { textarea: g.empty.height, form: g.empty.form, fieldSizing: g.empty.fieldSizing });
record('composer.grows-with-content', g['3 lines'].height > g['1 lines'].height && g['5 lines'].height > g['3 lines'].height, { heights: growth.map((s) => [s.step, +s.height.toFixed(1)]) });
record('composer.bounded', Math.round(g['20 lines'].height) === 180 && g['20 lines'].scrollHeight > 180 && ['auto', 'scroll'].includes(g['20 lines'].overflowY), { at20: g['20 lines'] });
// The engine scrolls the caret line into view; at least the upper half of the last line (23px) must show.
record('composer.caret-line-visible', g['20 lines'].scrollTop + g['20 lines'].clientHeight >= g['20 lines'].scrollHeight - 4 - 12, { scrollTop: g['20 lines'].scrollTop, clientHeight: g['20 lines'].clientHeight, scrollHeight: g['20 lines'].scrollHeight });
const beforeUndo = await b.evaluate(`document.getElementById('composer-input').value.split('\\n').length`);
await b.evaluate(`document.execCommand('undo')`);
const afterUndo = await b.evaluate(field);
record('composer.undo-stack-survives-growth', afterUndo.lines === 8 && beforeUndo === 20, { beforeUndo, afterUndoLines: afterUndo.lines, height: afterUndo.height });
await shoot('composer-growth-8-lines-1440-light');
await b.evaluate(`document.getElementById('composer-input').select()`);
await b.evaluate(`document.execCommand('delete')`);
record('composer.returns-to-empty', Math.abs((await b.evaluate(field)).height - g.empty.height) < 1, { height: (await b.evaluate(field)).height });
// programmatic draft restore (renderComposer writes value on session switch)
await b.cdp('Input.insertText', { text: 'Draft line 1\nDraft line 2\nDraft line 3\nDraft line 4' });
await sleep(300);
await b.evaluate(`[...document.querySelectorAll('.session-button')].find(n => n.textContent.includes(${JSON.stringify(config.long.title)})).click()`);
await b.waitFor(`document.querySelector('#session-title-text').textContent.includes(${JSON.stringify(config.long.title)})`);
await sleep(300);
await b.evaluate(`[...document.querySelectorAll('.session-button')].find(n => n.textContent.includes(${JSON.stringify(config.main.title)})).click()`);
await b.waitFor(`document.querySelector('#session-title-text').textContent.includes(${JSON.stringify(config.main.title)})`);
await sleep(400);
const restored = await b.evaluate(field);
record('composer.restored-draft-sized', restored.lines === 4 && restored.height >= restored.scrollHeight - 1, restored);
await b.evaluate(`(() => { const t = document.getElementById('composer-input'); t.focus(); t.select(); document.execCommand('delete'); })()`);
await sleep(300);

// 2 · error line keeps the composer usable (draft-status is the composer's own error slot)
await b.evaluate(`(() => { const s = document.getElementById('draft-status'); s.className = 'draft-status error'; s.textContent = 'Draft not saved — synthetic error line for layout only.'; })()`);
const err = { status: await b.evaluate(rect('#draft-status')), form: await b.evaluate(rect('#composer-form')), list: await b.evaluate(rect('.message-list')) };
record('composer.error-line-aligned', Math.abs(err.status.left - err.form.left) <= 1 && err.status.bottom <= err.form.top + 1, err);
await shoot('composer-error-line-1440-light');
await b.evaluate(`(() => { const s = document.getElementById('draft-status'); s.className = 'draft-status'; s.textContent = ''; })()`);

// 3 · keyboard: Tab from the composer reaches its controls with a visible ring
await b.evaluate(`document.getElementById('composer-input').focus()`);
const order = [];
for (let i = 0; i < 3; i++) { await tab(); order.push(await b.evaluate(`(() => { const a = document.activeElement; return { id: a.id || a.className, ring: getComputedStyle(a).outlineStyle !== 'none' || getComputedStyle(a).boxShadow !== 'none', inForm: !!a.closest('#composer-form, #composer-below') }; })()`)); }
record('keyboard.composer-controls', order.every((o) => o.inForm && o.ring), { order });
await shoot('keyboard-composer-focus-1440-light');

// 4 · Escape returns: files → preview → Escape → cards, focus back on the opener
await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-files-disclosure > summary').click()`);
await sleep(200);
await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-file-preview').focus()`);
await b.key('Enter', 'Enter', 13, 0, '\r');
await b.waitFor(`document.getElementById('surface-panel').classList.contains('is-expanded')`);
await sleep(400);
const bandPreview = await b.evaluate(rect('.surface-header'));
await escape();
await sleep(500);
const afterEsc = await b.evaluate(`({ expanded: document.getElementById('surface-panel').classList.contains('is-expanded'), open: document.getElementById('surface-panel').classList.contains('is-open'), active: document.activeElement.className, band: (() => { const r = document.querySelector('.chat-header').getBoundingClientRect(); return { top: r.top, height: r.height }; })() })`);
record('escape.returns-to-cards', !afterEsc.expanded && afterEsc.open && /sd-run-summary-file-preview/.test(afterEsc.active), { afterEsc, bandPreview });
record('band.stable-preview-vs-chat', bandPreview.top === afterEsc.band.top && bandPreview.height === afterEsc.band.height, { preview: bandPreview, chat: afterEsc.band });

// 5 · long file name: card keeps 288, prose and composer keep their edges
await viewport(1280, 800);
await openSession(config.long.title);
await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-files-disclosure > summary').click()`);
await sleep(300);
const long = await b.evaluate(`({ panel: ${rect('#surface-panel')}, card: ${rect('.sd-run-summary')}, name: ${rect('.sd-run-summary-file-name')}, list: ${rect('.message-list')}, composer: ${rect('#composer-form')}, overflowX: document.scrollingElement.scrollWidth > innerWidth, cardScrollX: document.querySelector('.surface-rail').scrollWidth > document.querySelector('.surface-rail').clientWidth })`);
record('long-name.contained', long.panel.width === 288 && long.name.right <= long.card.right + 0.5 && !long.overflowX && !long.cardScrollX && Math.abs(long.list.right - long.composer.right) <= 1 && long.panel.left - long.list.right >= 32, long);
await shoot('long-name-files-1280-light');
await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-file-preview').click()`);
await b.waitFor(`document.getElementById('surface-panel').classList.contains('is-expanded')`);
await sleep(400);
const longTab = await b.evaluate(`({ header: ${rect('.surface-header')}, tabs: ${rect('.surface-tabs')}, toolbar: ${rect('.surface-header .toolbar')}, overflowX: document.scrollingElement.scrollWidth > innerWidth })`);
record('long-name.tab-does-not-push-chrome', longTab.toolbar.right <= 1280 && !longTab.overflowX && longTab.header.height === 48, longTab);
await shoot('long-name-preview-1280-dark-free');

// 6 · collapse thresholds from the live column (strip vs cards)
const thresholds = [];
for (const [w, h] of [[1195, 772], [1271, 800], [1272, 800], [1280, 800], [1024, 768], [800, 900]]) {
  await viewport(w, h);
  await openSession(config.main.title);
  if (!(await b.evaluate(`document.getElementById('surface-panel').classList.contains('is-open')`))) await b.evaluate(`document.getElementById('show-surface-button').click()`);
  await sleep(400);
  const m = await b.evaluate(`({ shell: document.getElementById('app-shell').className, chat: ${rect('.chat-panel')}, list: ${rect('.message-list')}, composer: ${rect('#composer-form')}, panel: ${rect('#surface-panel')}, overflowX: document.scrollingElement.scrollWidth > innerWidth })`);
  const cards = /surface-cards/.test(m.shell) && !/surface-strip/.test(m.shell);
  thresholds.push({ width: w, mode: cards ? 'cards' : /surface-strip/.test(m.shell) ? 'strip' : 'other', chatWidth: m.chat.width, column: m.list.width, gap: m.panel ? +(m.panel.left - m.list.right).toFixed(2) : null, leftDelta: +(m.composer.left - m.list.left).toFixed(2), rightDelta: +(m.composer.right - m.list.right).toFixed(2), overflowX: m.overflowX });
  if (w === 1195) await shoot('threshold-strip-1195-light');
}
record('summary.column-floor-and-gap', thresholds.every((t) => (t.mode !== 'cards' || t.column >= 640) && (t.gap === null || t.gap >= 32) && Math.abs(t.leftDelta) <= 1 && Math.abs(t.rightDelta) <= 1 && !t.overflowX), { thresholds });

// 7 · 390: touch targets, the summary sheet is reachable and Escape returns
await viewport(390, 844, { mobile: true });
await openSession(config.main.title);
const chat390 = await b.evaluate(`({ list: ${rect('.message-list')}, composer: ${rect('#composer-form')}, header: ${rect('.chat-header')}, buttons: [...document.querySelectorAll('.chat-header button, #composer-form button')].filter(n => n.getClientRects().length).map(n => ({ id: n.id, h: n.getBoundingClientRect().height, w: n.getBoundingClientRect().width })) })`);
await shoot('chat-390-light');
await b.evaluate(`document.getElementById('toggle-nav-button').click()`);
await sleep(400);
const nav390 = await b.evaluate(`[...document.querySelectorAll('.sidebar > .nav-home, .session-button')].filter(n => n.getClientRects().length).map(n => ({ t: n.textContent.trim().slice(0, 24), h: n.getBoundingClientRect().height }))`);
await shoot('nav-overlay-390-light');
record('touch.44', [...chat390.buttons.map((x) => x.h), ...nav390.map((x) => x.h)].every((h) => h >= 44), { chat390, nav390 });
await escape();
await sleep(300);
await b.evaluate(`document.getElementById('show-surface-button').focus()`);
await b.key('Enter', 'Enter', 13, 0, '\r');
await b.waitFor(`document.getElementById('surface-panel').classList.contains('is-open')`);
await sleep(400);
const sheet = await b.evaluate(`({ panel: ${rect('#surface-panel')}, card: ${rect('.sd-run-summary')}, active: document.activeElement.className })`);
await escape();
await sleep(400);
const sheetClosed = await b.evaluate(`({ open: document.getElementById('surface-panel').classList.contains('is-open'), active: document.activeElement.id })`);
record('390.summary-reachable-and-escape', !!sheet.card && !sheetClosed.open && sheetClosed.active === 'show-surface-button', { sheet, sheetClosed, note: 'Reached as the existing on-demand sheet, not in document flow; see README 待裁定.' });

// 8 · 200% zoom reflow equivalents (CSS viewport halves, device scale 2)
for (const [w, h, theme] of [[640, 400, 'light'], [720, 450, 'dark']]) {
  await viewport(w, h, { scale: 2, theme });
  await openSession(config.main.title);
  const m = await b.evaluate(`({ overflowX: document.scrollingElement.scrollWidth > innerWidth, header: ${rect('.chat-header')}, list: ${rect('.message-list')}, composer: ${rect('#composer-form')}, title: ${rect('#session-title')} })`);
  record(`zoom200.${w}x${h}`, !m.overflowX && m.header.height === 48 && Math.abs(m.list.left - m.composer.left) <= 1 && Math.abs(m.list.right - m.composer.right) <= 1 && m.composer.height <= h * 0.4, m);
  await shoot(`zoom200-${w}x${h}-${theme}`);
}

// 9 · adjacent surfaces keep their own geometry: Home 820, Settings band
await viewport(1440, 900);
await b.cdp('Page.navigate', { url: origin + '/' });
await b.waitFor(`!!document.querySelector('.session-button')`);
await b.evaluate(`document.getElementById('home-button').click()`);
await sleep(700);
const home = await b.evaluate(`({ composer: ${rect('#composer-form')}, header: ${rect('.chat-header')}, textarea: ${rect('#composer-input')} })`);
record('home.keeps-820', Math.round(home.composer.width) === 820 && home.header.height === 48, home);
await shoot('adjacent-home-1440-light');
await b.evaluate(`document.getElementById('runtime-setup-button').click()`);
await sleep(700);
const settings = await b.evaluate(`({ header: ${rect('.chat-header')}, overflowX: document.scrollingElement.scrollWidth > innerWidth })`);
record('settings.band-48', settings.header.height === 48 && !settings.overflowX, settings);
await shoot('adjacent-settings-1440-light');

// 10 · desktop shell preview: the band never shrinks below a measured toolbar
await b.cdp('Page.navigate', { url: origin + '/?shell=desktop' });
await b.waitFor(`!!document.querySelector('.session-button')`);
const shellBand = [];
for (const toolbarHeight of [null, 40, 52, 60]) {
  if (toolbarHeight) await b.evaluate(`window.dispatchEvent(new CustomEvent('courtwork:native-chrome', { detail: { schemaVersion: 1, platform: 'macos', overlay: true, controlsInsetLeft: 88, toolbarHeight: ${toolbarHeight} } }))`);
  await sleep(150);
  shellBand.push({ toolbarHeight, band: (await b.evaluate(rect('.sidebar-header'))).height, chat: (await b.evaluate(rect('.chat-header'))).height, brandLeft: (await b.evaluate(rect('.workspace-brand'))).left });
}
record('native.band-is-max-of-target-and-toolbar', shellBand.every((s) => s.band === Math.max(48, s.toolbarHeight ?? 0) && s.chat === s.band), { shellBand, note: 'Web-side packet simulation only; no native host exists in this repository.' });

await writeFile(path.join(out, 'checks.json'), JSON.stringify({ schemaVersion: 1, origin, browser: b.version.Browser, scrollbars: process.env.CS_SCROLLBARS === '1' ? 'classic visible' : 'hidden (--hide-scrollbars)', results, exceptions: b.exceptions }, null, 2));
console.log(`${results.filter((r) => r.pass).length}/${results.length} pass; exceptions ${b.exceptions.length}`);
await b.close();
