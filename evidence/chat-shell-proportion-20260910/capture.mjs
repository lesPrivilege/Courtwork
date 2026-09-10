// WO-CS-01 · reproducible capture: 1440/1280/390 × light/dark × four summary
// states, plus live geometry read with getBoundingClientRect.
//   CS_CONFIG   fixture-config.json written by serve.mjs (required)
//   CS_OUT      output directory (default ./before)
//   CS_URL      app origin (default: config.url)
//   CS_CDP_PORT debugging port (default 19883, see cdp.mjs)
// Nothing here edits product state beyond the UI's own clicks.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { openBrowser, sleep } from './cdp.mjs';

const config = JSON.parse(await readFile(process.env.CS_CONFIG, 'utf8'));
const origin = process.env.CS_URL || config.url;
const out = path.resolve(process.env.CS_OUT || 'before');
await mkdir(out, { recursive: true });

const GEOMETRY = `(() => {
  const R = (n) => { if (!n || !n.getClientRects().length) return null; const r = n.getBoundingClientRect();
    return { left: +r.left.toFixed(2), top: +r.top.toFixed(2), right: +r.right.toFixed(2), bottom: +r.bottom.toFixed(2), width: +r.width.toFixed(2), height: +r.height.toFixed(2) }; };
  const q = (s) => document.querySelector(s);
  const visible = (n) => n && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden';
  const navs = [...document.querySelectorAll('.sidebar > .nav-home')].map((n) => ({ text: n.textContent.trim(), rect: R(n), icon: R(n.querySelector('.ui-icon')), fontSize: getComputedStyle(n).fontSize, selected: n.getAttribute('aria-current') === 'page', background: getComputedStyle(n).backgroundColor }));
  const steps = navs.slice(1).map((n, i) => n.rect && navs[i].rect ? +(n.rect.top - navs[i].rect.bottom).toFixed(2) : null);
  const filter = R(q('.nav-filter')), projects = R(q('.project-section'));
  const lastNav = navs.at(-1)?.rect;
  const h1 = q('#session-title');
  const h1Style = getComputedStyle(h1);
  const lineHeight = parseFloat(h1Style.lineHeight) || parseFloat(h1Style.fontSize) * 1.2;
  const para = [...document.querySelectorAll('.message-list .message.assistant .message-body p, .message-list .message-body p')].find((p) => p.getClientRects().length);
  const list = R(q('.message-list'));
  const composer = R(q('#composer-form'));
  const panel = q('#surface-panel');
  const rail = visible(panel) ? R(panel) : null;
  const card = R(q('.surface-panel.is-open .sd-run-summary'));
  const surfaceHeader = visible(q('.surface-header')) ? R(q('.surface-header')) : null;
  const chatHeader = visible(q('.chat-header')) ? R(q('.chat-header')) : null;
  const textEdgeRight = Math.max(list?.right ?? 0, composer?.right ?? 0);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    shell: document.getElementById('app-shell').className,
    panel: panel.className,
    overflowX: document.scrollingElement.scrollWidth > innerWidth,
    sidebar: R(q('.sidebar')),
    nav: { rows: navs, itemGaps: steps, groupGapAfterNav: lastNav && filter ? +(filter.top - lastNav.bottom).toFixed(2) : null, groupGapFilterToProjects: filter && projects ? +(projects.top - filter.bottom).toFixed(2) : null },
    band: { sidebarHeader: R(q('.sidebar-header')), chatHeader, surfaceHeader, surfaceTabs: R(q('.surface-tabs')) },
    title: { rect: R(h1), wrap: R(q('.chat-title-wrap')), lines: Math.round(R(h1)?.height / lineHeight) || null, meta: q('#session-meta').textContent.trim(), metaRect: R(q('#session-meta')) },
    column: {
      list, paragraph: R(para), composer,
      leftDelta: list && composer ? +(composer.left - list.left).toFixed(2) : null,
      rightDelta: list && composer ? +(composer.right - list.right).toFixed(2) : null,
      paragraphToComposerLeft: para && composer ? +(composer.left - R(para).left).toFixed(2) : null,
      insetLeft: list ? +(list.left - (R(q('.message-stream'))?.left ?? 0)).toFixed(2) : null,
    },
    composer: { form: composer, textarea: R(q('#composer-input')), area: R(q('#composer-area')) },
    summary: { panel: rail, card, gapToColumn: rail && list && !panel.classList.contains('is-expanded') && innerWidth >= 768 ? +(rail.left - textEdgeRight).toFixed(2) : null },
    active: document.activeElement ? (document.activeElement.id || document.activeElement.className || document.activeElement.tagName) : null,
  };
})()`;

const WIDTHS = [
  { width: 1440, height: 900, mobile: false },
  { width: 1280, height: 800, mobile: false },
  { width: 390, height: 844, mobile: true },
];
const THEMES = ['light', 'dark'];
const b = await openBrowser();
const results = [];
const hash = (buf) => createHash('sha256').update(buf).digest('hex');

async function setViewport({ width, height, mobile }, theme) {
  await b.cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
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
  await b.waitFor(`document.querySelector('#session-title-text').textContent.includes(${JSON.stringify(title)})`);
  await b.waitFor(`!!document.querySelector('.message-list .message.assistant')`);
}
async function ensureSummary() {
  if (!(await b.evaluate(`!!document.querySelector('.surface-panel.is-open .sd-run-summary')`))) {
    await b.evaluate(`document.getElementById('show-surface-button').click()`);
  }
  await b.waitFor(`!!document.querySelector('.surface-panel.is-open .sd-run-summary .sd-run-summary-files-disclosure')`);
  await sleep(400);
}
async function shoot(name) {
  await sleep(250);
  const png = await b.screenshot();
  await writeFile(path.join(out, name + '.png'), png);
  return { file: name + '.png', sha256: hash(png), bytes: png.length };
}

for (const vp of WIDTHS) {
  for (const theme of THEMES) {
    await setViewport(vp, theme);
    await openSession(config.main.title);
    await ensureSummary();
    const tag = `${vp.width}-${theme}`;
    const record = async (state) => {
      const shot = await shoot(`${state}-${tag}`);
      results.push({ state, width: vp.width, theme, ...shot, geometry: await b.evaluate(GEOMETRY) });
    };
    await record('summary');
    await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-files-disclosure > summary').click()`);
    await record('files');
    await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-information-disclosure > summary').click()`);
    await record('full');
    await b.evaluate(`document.querySelector('.surface-panel.is-open .sd-run-summary-file-preview').click()`);
    await b.waitFor(`document.querySelector('#surface-panel').classList.contains('is-expanded')`);
    await sleep(500);
    await record('preview');
  }
}
await writeFile(path.join(out, 'measurements.json'), JSON.stringify({ schemaVersion: 1, origin, browser: b.version.Browser, dataKind: config.dataKind, provider: config.provider, captures: results, exceptions: b.exceptions }, null, 2));
console.log(`${results.length} captures → ${out}; exceptions: ${b.exceptions.length}`);
await b.close();
