/* Evidence harness only. Drives one Home → work location → prepare → Chat
 * journey in headless Chrome and writes PNGs plus DOM measurements.
 *   node capture.mjs --url http://127.0.0.1:8951 --variant before|after --out <dir> --folder <abs path>
 * `before` chooses the project from the composer's Project button (main);
 * `after` chooses it inside the Work location panel (this candidate). */
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { launch } from "./cdp.mjs";

const { values } = parseArgs({ options: { url: { type: "string" }, variant: { type: "string" }, out: { type: "string" }, folder: { type: "string" }, profile: { type: "string" } } });
const out = (name) => path.join(values.out, name);
const LONG_PROJECT = "Quarterly reconciliation of the northern district ledgers";
const page = await launch({ profileRoot: values.profile });
const log = {};

const measureBand = () => page.eval(`
  const px = (n) => n ? Math.round(n * 10) / 10 : null;
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: px(r.x), y: px(r.y), w: px(r.width), h: px(r.height) }; };
  const style = (n, ...k) => { if (!n) return null; const s = getComputedStyle(n); return Object.fromEntries(k.map(p => [p, s[p]])); };
  const strip = document.querySelector('#composer-context-strip'), tab = strip?.querySelector('.context-tab');
  const chips = [...(strip?.querySelectorAll('.context-chip') || [])];
  return {
    stripHidden: strip?.hidden ?? null,
    tab: box(tab), tabStyle: style(tab, 'paddingTop', 'paddingBottom', 'paddingLeft', 'gap', 'backgroundColor', 'borderTopLeftRadius'),
    chips: chips.map(c => ({ text: c.textContent.trim(), aria: c.getAttribute('aria-label'), box: box(c),
      style: style(c, 'fontSize', 'lineHeight', 'fontWeight', 'paddingTop', 'paddingLeft', 'gap', 'color'),
      glyph: box(c.querySelector('svg')), label: box(c.querySelector('.button-label') || c) })),
    composer: box(document.querySelector('#composer-form')),
    /* The entry's clickable height, measured by hit-testing, not by its box:
     * the first and last y at the chip's centre column that still hit it. */
    entryHit: (() => { const c = document.querySelector('#workspace-chip'); if (!c) return null; const r = c.getBoundingClientRect(); const x = r.x + Math.min(24, r.width / 2);
      const hits = (y) => { const n = document.elementFromPoint(x, y); return !!n && (n === c || c.contains(n)); };
      let top = r.y, bottom = r.bottom; while (hits(top - 0.5) && top > r.y - 30) top -= 0.5; while (hits(bottom + 0.5) && bottom < r.bottom + 30) bottom += 0.5;
      return { visual: px(r.height), clickable: px(bottom - top) }; })(),
    projectButton: (() => { const b = document.querySelector('#home-project-button'); return b && !b.hidden ? { text: b.textContent.trim(), box: box(b), style: style(b, 'fontSize', 'fontWeight') } : null; })(),
    composerControls: [...document.querySelectorAll('.composer-context > :not([hidden])')].map(n => n.id || n.className),
    docOverflowX: document.documentElement.scrollWidth - innerWidth,
  };`);
const measurePanel = () => page.eval(`
  const p = document.querySelector('#workspace-popover'); if (!p || !p.matches(':popover-open')) return null;
  const px = (n) => Math.round(n * 10) / 10;
  const r = p.getBoundingClientRect();
  const heads = [...p.querySelectorAll('h3,h4')].map(h => ({ tag: h.tagName, text: h.textContent.trim(), fontSize: getComputedStyle(h).fontSize, weight: getComputedStyle(h).fontWeight, transform: getComputedStyle(h).textTransform }));
  const cards = [...p.querySelectorAll('.context-card')].map(c => { const s = getComputedStyle(c); return { border: s.borderTopWidth + ' ' + s.borderTopStyle, background: s.backgroundColor, padding: s.paddingTop, radius: s.borderTopLeftRadius }; });
  const glyphs = [...p.querySelectorAll('svg')].map(g => px(g.getBoundingClientRect().width));
  const targets = [...p.querySelectorAll('button,summary,input')].filter(n => n.offsetParent !== null).map(n => ({ text: (n.getAttribute('aria-label') || n.textContent || n.placeholder || '').trim().slice(0, 40), h: px(n.getBoundingClientRect().height), w: px(n.getBoundingClientRect().width), disabled: !!n.disabled }));
  return { aria: p.getAttribute('aria-label'), box: { w: px(r.width), h: px(r.height), x: px(r.x), y: px(r.y) }, overflowY: p.scrollHeight > p.clientHeight, heads, cards, glyphs, targets,
    text: p.innerText.split('\\n').map(s => s.trim()).filter(Boolean) };`);
const click = (selector) => page.eval(`const n = document.querySelector(${JSON.stringify(selector)}); if (!n) throw new Error('missing ${selector}'); n.click(); return true;`);
const clickText = (scope, text) => page.eval(`const n = [...document.querySelectorAll(${JSON.stringify(scope)})].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (!n) throw new Error('missing ' + ${JSON.stringify(text)}); n.click(); return n.textContent.trim();`);
const focused = () => page.eval(`const a = document.activeElement; return a ? { tag: a.tagName, id: a.id || null, field: a.getAttribute('data-repository-field'), label: a.getAttribute('aria-label') || a.textContent.trim().slice(0, 60) } : null;`);
// A real key through the browser's input pipeline: a synthetic KeyboardEvent
// does not trigger a popover's native Escape dismissal.
// Enter carries its text so the browser activates the focused button, as a
// person's key press does; Escape has none.
const key = async (keyName, code = keyName, keyCode = 27) => {
  const text = keyName === 'Enter' ? '\r' : undefined;
  await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: keyName, code, windowsVirtualKeyCode: keyCode, ...(text ? { text, unmodifiedText: text } : {}) });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode });
};
const escape = () => key('Escape');

async function journey(prefix, { width, height, dpr = 1, dark = false }) {
  await page.viewport({ width, height, dpr, dark });
  await page.goto(values.url);
  await page.eval(`localStorage.clear(); sessionStorage.clear(); return true;`);
  await page.goto(values.url);
  await page.shot(out(`${prefix}-01-home.png`));
  await page.shot(out(`${prefix}-01-band.png`), { selector: '.composer-area' });
  log[`${prefix}-01-band`] = await measureBand();

  // Project.
  if (values.variant === 'before') {
    await click('#home-project-button'); await page.wait(300);
    await page.shot(out(`${prefix}-02-project.png`));
    log[`${prefix}-02-project-focus`] = await focused();
    await clickText('#home-project-choices button', LONG_PROJECT); await page.wait(300);
  } else {
    await click('#workspace-chip'); await page.wait(400);
    await page.shot(out(`${prefix}-02-project.png`));
    log[`${prefix}-02-panel`] = await measurePanel();
    log[`${prefix}-02-project-focus`] = await focused();
    await clickText('#workspace-popover button', LONG_PROJECT); await page.wait(300);
    log[`${prefix}-02b-after-choose-focus`] = await focused();
  }
  log[`${prefix}-02-band-after-project`] = await measureBand();

  // Folder.
  if (!(await page.eval(`return document.querySelector('#workspace-popover').matches(':popover-open')`))) { await click('#workspace-chip'); await page.wait(400); }
  await page.shot(out(`${prefix}-03-panel-empty.png`));
  log[`${prefix}-03-panel-empty`] = await measurePanel();
  await page.eval(`const s = document.querySelector('[data-repository-field="path-summary"]'); s.click(); return true;`); await page.wait(200);
  await page.eval(`const i = document.querySelector('[data-repository-field="path"]'); i.value = ${JSON.stringify(values.folder)}; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-repository-field="connect"]').click(); return true;`);
  await page.wait(1200);
  await page.shot(out(`${prefix}-04-panel-staged.png`));
  log[`${prefix}-04-panel-staged`] = await measurePanel();
  log[`${prefix}-04-band-staged`] = await measureBand();

  // Prepare without inference.
  await page.eval(`document.querySelector('[data-repository-field="start-edits"]').click(); return true;`);
  await page.wait(3000);
  await page.shot(out(`${prefix}-05-panel-prepared.png`));
  log[`${prefix}-05-panel-prepared`] = await measurePanel();
  log[`${prefix}-05-focus`] = await focused();
  await escape(); await page.wait(300);
  log[`${prefix}-05b-escape-focus`] = await focused();
  log[`${prefix}-05b-panel-open-after-escape`] = await page.eval(`return document.querySelector('#workspace-popover').matches(':popover-open')`);
  await page.shot(out(`${prefix}-06-home-prepared.png`));
  await page.shot(out(`${prefix}-06-band-prepared.png`), { selector: '.composer-area' });
  log[`${prefix}-06-band-prepared`] = await measureBand();
}

try {
  await journey('wide', { width: 1440, height: 900 });
  // The prepared Chat opened from Recent: a Session with no Run keeps the band.
  await page.eval(`const row = [...document.querySelectorAll('button')].find(b => b.closest('nav, aside') && b.textContent.trim().startsWith('synthetic-parcel')); if (row) row.click(); return row ? row.textContent.trim() : null;`).then(v => { log['wide-07-recent-row'] = v; });
  await page.wait(1500);
  await page.shot(out('wide-07-chat.png'));
  await page.shot(out('wide-07-chat-band.png'), { selector: '.composer-area' });
  log['wide-07-chat-band'] = await measureBand();
  await click('#workspace-chip'); await page.wait(500);
  await page.shot(out('wide-08-chat-panel.png'));
  log['wide-08-chat-panel'] = await measurePanel();

  // Keyboard: the entry opens from Enter and Escape returns to it (real keys).
  await escape(); await page.wait(300);
  await page.eval(`document.querySelector('#home-button, [aria-label="Home"]')?.click(); return true;`); await page.wait(1200);
  await page.eval(`document.querySelector('#workspace-chip').focus(); return true;`);
  await key('Enter', 'Enter', 13); await page.wait(500);
  log['wide-09-enter-opens'] = await page.eval(`return document.querySelector('#workspace-popover').matches(':popover-open')`);
  log['wide-09-enter-focus'] = await focused();
  await escape(); await page.wait(300);
  log['wide-09-escape-focus'] = await focused();

  // Send from Home into the prepared chat: log every request the page makes.
  await page.eval(`window.__calls = []; const f = window.fetch; window.fetch = (u, o = {}) => { window.__calls.push((o.method || 'GET') + ' ' + String(u).replace(location.origin, '')); return f(u, o); }; return true;`);
  await page.eval(`const t = document.querySelector('#composer-input'); t.focus(); t.value = 'Summarise the README.'; t.dispatchEvent(new Event('input', { bubbles: true })); return true;`);
  await page.wait(200);
  await click('#send-button'); await page.wait(4000);
  log['wide-10-send-calls'] = await page.eval(`return window.__calls.filter(c => !c.startsWith('GET')).map(c => c.replace(/[0-9a-f-]{36}/g, ':id'))`);
  log['wide-10-after-send'] = await page.eval(`return { view: document.body.className.match(/home-active/) ? 'home' : 'chat', stripHidden: document.querySelector('#composer-context-strip').hidden, homeStatus: document.querySelector('#home-start-status').hidden ? null : document.querySelector('#home-start-status').textContent };`);
  await page.shot(out('wide-10-after-send.png'));

  await journey('narrow', { width: 390, height: 844 });
  // 200% zoom of a 1440 × 900 window: half the CSS viewport at twice the density.
  await journey('zoom200', { width: 720, height: 450, dpr: 2 });
  await journey('dark', { width: 1440, height: 900, dark: true });
} finally {
  await writeFile(out('measurements.json'), JSON.stringify(log, null, 2));
  await page.close();
}
