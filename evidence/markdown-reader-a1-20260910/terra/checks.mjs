import { writeFile } from 'node:fs/promises';
import { cdp, evaluate, key, ORIGIN, sleep, observations, close } from './browser.mjs';

const url = `${ORIGIN}/evidence/markdown-reader-a1-20260910/terra/fixture.html`;
const checks = [];
const check = async (name, expression) => {
  const value = await evaluate(expression);
  checks.push({name, pass: Boolean(value), value});
  if (!value) throw new Error(`Failed: ${name} (${JSON.stringify(value)})`);
};
const navigate = async (width, height, theme = 'light', zoom = 1) => {
  await cdp('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: false});
  await cdp('Emulation.setEmulatedMedia', {features: [{name:'prefers-color-scheme', value:theme}]});
  await cdp('Emulation.setPageScaleFactor', {pageScaleFactor: zoom});
  await cdp('Page.navigate', {url});
  for (let n = 0; n < 100; n++) { if (await evaluate('Boolean(window.__reader && window.__projection)')) return; await sleep(50); }
  throw new Error('Fixture did not initialize');
};
const screenshot = async (path) => {
  const {data} = await cdp('Page.captureScreenshot', {format:'png', captureBeyondViewport:false});
  await writeFile(path, Buffer.from(data, 'base64'));
};
try {
  await navigate(1440, 900, 'light');
  await check('actual projector preserves BOM source and code-point contract', `window.__projection.source === window.__source && window.__projection.source.startsWith('\\uFEFF') && window.__projection.codePointLength === [...window.__source].length && window.__projection.blocks.every(b => Number.isInteger(b.start) && Number.isInteger(b.end) && b.start < b.end)`);
  await check('safe semantic DOM has no image or inline attributes', `!document.querySelector('#reader img, #reader [onerror], #reader script') && !window.__unsafe && [...document.querySelectorAll('#reader a')].every(a => !a.hasAttribute('href') || (a.href.startsWith('https://') && a.target === '_blank' && a.rel.includes('noopener') && a.rel.includes('noreferrer'))) && ![...document.querySelectorAll('#reader a')].some(a => a.getAttribute('href')?.startsWith('javascript:'))`);
  await check('copy icon references the shared sprite and has visible geometry', `(()=>{const svg=document.querySelector('[aria-label="Copy code"] svg'), use=svg?.querySelector('use'), box=svg?.getBoundingClientRect();return use?.getAttribute('href') === '/web/vendor/icons.svg#copy' && box.width > 0 && box.height > 0 && use.getBBox().width > 0 && use.getBBox().height > 0})()`);
  const sprite = observations.responses.find(({url}) => url.endsWith('/web/vendor/icons.svg'));
  checks.push({name:'shared copy sprite is served by the fixture host', pass:sprite?.status === 200, value:sprite ?? null});
  if (sprite?.status !== 200) throw new Error('Shared copy sprite did not load from the fixture host');
  await evaluate(`document.querySelector('main').style.maxWidth='1200px'`);
  await check('hidden inspector does not reserve a wide-reader column', `(()=>{const layout=document.querySelector('.markdown-reader__layout'), inspector=document.querySelector('.markdown-reader__inspector'), documentView=document.querySelector('.markdown-reader__document');return inspector.hidden && getComputedStyle(layout).gridTemplateColumns.trim().split(/\\s+/).length===2 && documentView.getBoundingClientRect().width>900})()`);
  await evaluate(`document.querySelector('main').style.maxWidth='1100px'`);
  await evaluate(`(()=>{const link=document.querySelector('#reader a[href]');window.__linkKeyPrevented=null;link.addEventListener('keydown', event=>window.__linkKeyPrevented=event.defaultPrevented);link.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))})()`);
  await check('nested link keyboard behavior is not intercepted by its block', `window.__linkKeyPrevented === false`);
  await check('repeated blocks retain unique source identities', `(()=>{const b=window.__projection.blocks.filter(x=>x.raw.includes('Repeat'));return b.length===2&&b[0].id!==b[1].id&&b[0].start!==b[1].start})()`);
  await evaluate(`(()=>{const b=[...document.querySelectorAll('[data-markdown-block]')].filter(x=>x.textContent.includes('Repeat'));b[1].click()})()`);
  await check('selected block exposes its own original raw source', `document.querySelectorAll('[data-markdown-block].is-selected').length===1 && document.querySelector('[data-markdown-inspector] pre').textContent === window.__projection.blocks.filter(x=>x.raw.includes('Repeat'))[1].raw`);
  await evaluate(`(()=>{const copy=document.querySelector('[aria-label="Copy block source"]');copy.click();return Promise.resolve()})()`);
  await check('stub clipboard receives the exact selected raw block source', `window.__copied.at(-1) === window.__projection.blocks.filter(x=>x.raw.includes('Repeat'))[1].raw`);
  await evaluate(`(()=>{const copy=document.querySelector('[data-markdown-block] .code-block [aria-label="Copy code"]');copy.click();return Promise.resolve()})()`);
  await check('stub clipboard receives the exact code text', `(()=>{const pre=document.querySelector('[data-markdown-block] .code-block pre');return window.__copied.at(-1) === pre.textContent && document.querySelector('[data-markdown-block] .code-toolbar span').textContent === 'Code'})()`);
  await evaluate(`document.querySelector('[data-markdown-block] .code-block .code-toolbar button').focus()`);
  await key({code:'Enter', keyCode:13});
  await check('copy button keyboard focus does not trigger its containing block shortcut', `document.activeElement.matches('[data-markdown-block] .code-block .code-toolbar button') && document.querySelector('[data-markdown-block].is-selected').textContent.includes('Repeat')`);
  await evaluate(`(()=>{const b=[...document.querySelectorAll('[data-markdown-block]')].filter(x=>x.textContent.includes('Repeat'));b[0].click();document.querySelector('main').style.maxWidth='740px'})()`);
  await check('740px reader keeps the document wide and shows selected source beside its block', `(()=>{const layout=document.querySelector('.markdown-reader__layout'), documentView=document.querySelector('.markdown-reader__document'), selected=document.querySelector('[data-markdown-block].is-selected'), inspector=document.querySelector('.markdown-reader__inspector'), raw=window.__projection.blocks.find(b=>b.id===selected.dataset.markdownBlock).raw; const columns=getComputedStyle(layout).gridTemplateColumns.trim().split(/\\s+/); return columns.length===2 && documentView.getBoundingClientRect().width > 500 && selected.nextElementSibling===inspector && inspector.getBoundingClientRect().top < innerHeight && inspector.textContent.includes(raw)})()`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-740-light.png');
  await evaluate(`document.querySelector('main').style.maxWidth='1100px'`);
  await evaluate(`document.querySelector('.markdown-reader__outline-link').click()`);
  await check('outline returns focus to heading block', `document.activeElement.matches('[data-markdown-block]') && document.activeElement.querySelector('h1')`);
  await evaluate(`(()=>{const input=document.querySelector('.markdown-reader__find');input.value='Copy code';input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await check('find excludes copy-control chrome', `document.querySelector('[data-markdown-find-status]').textContent === '0 matching blocks' && !document.querySelector('.is-match')`);
  await key({code:'ArrowDown', keyCode:40});
  await check('arrow navigation returns focus to the next block', `document.activeElement.matches('[data-markdown-block]') && document.activeElement.textContent.includes('Repeat')`);
  await key({text:'f', code:'KeyF', keyCode:70, modifiers:2});
  await check('control-f returns focus to reader find', `document.activeElement.matches('.markdown-reader__find')`);
  await evaluate(`(()=>{const input=document.querySelector('.markdown-reader__find');input.value='Repeat';input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
  await key({code:'Enter', keyCode:13});
  await check('find reports and selects matches', `document.querySelector('[data-markdown-find-status]').textContent === '2 matching blocks' && document.querySelectorAll('.is-match').length === 2 && document.activeElement.matches('[data-markdown-block]')`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-1440-light.png');
  await evaluate(`window.__oldMode=document.querySelector('.markdown-reader__mode');window.__oldMode.click()`);
  await check('raw source mode is complete, disables Find, and restores mode focus', `document.querySelector('.markdown-reader__document-source').textContent === window.__source && !document.querySelector('[data-markdown-block]') && document.querySelector('.markdown-reader__find').disabled && document.querySelector('[data-markdown-find-status]').textContent === 'Find is available in rendered view.' && document.activeElement.matches('.markdown-reader__mode')`);
  await evaluate(`window.__oldMode.click()`);
  await check('detached build controls are aborted', `document.querySelector('.markdown-reader__mode').textContent === 'Rendered view' && document.querySelector('.markdown-reader__document-source')`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-1440-light-source.png');
  await evaluate(`document.querySelector('.markdown-reader__mode').click()`);
  await check('returning to rendered mode restores mode focus', `document.querySelector('[data-markdown-block]') && document.activeElement.matches('.markdown-reader__mode')`);
  await evaluate(`(()=>{let threw=false;try{window.__reader.render({...window.__projection,profile:'unknown-reader'})}catch{threw=true} return threw})()`);
  await check('unknown profile is rejected with visible error', `document.querySelector('.markdown-reader__error')?.getAttribute('role') === 'alert'`);
  await evaluate(`window.__reader.render(window.__projection); window.__reader.destroy(); window.__reader.render(window.__projection)`);
  await check('destroy clears and blocks late rendering', `document.querySelector('#reader').childElementCount === 0`);

  await navigate(1440, 900, 'dark');
  await check('dark reader uses dark color scheme', `getComputedStyle(document.documentElement).colorScheme.includes('dark') && document.querySelector('.markdown-reader')`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-1440-dark.png');
  await navigate(390, 844, 'light');
  await check('390px layout has no page-level horizontal overflow', `document.documentElement.scrollWidth <= document.documentElement.clientWidth`);
  await evaluate(`(()=>{[...document.querySelectorAll('[data-markdown-block]')].find(x=>x.textContent.includes('Repeat')).click()})()`);
  await check('390px selected source remains inside the reader viewport', `(()=>{const inspector=document.querySelector('.markdown-reader__inspector').getBoundingClientRect();return inspector.left >= 0 && inspector.right <= innerWidth && inspector.top < innerHeight})()`);
  await check('long table has an internal scrolling region', `(()=>{const t=document.querySelector('.markdown-reader table');return t && t.scrollWidth > t.clientWidth})()`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-390-light.png');
  await navigate(390, 844, 'dark', 2);
  await check('200 percent scale retains no page-level horizontal overflow', `document.documentElement.scrollWidth <= document.documentElement.clientWidth && document.querySelector('.markdown-reader')`);
  await screenshot('evidence/markdown-reader-a1-20260910/terra/reader-390-dark-200.png');
  checks.push({name:'no runtime exceptions', pass: observations.exceptions.length === 0, value: observations.exceptions.length});
  if (observations.exceptions.length) throw new Error('Runtime exceptions occurred');
  await writeFile('evidence/markdown-reader-a1-20260910/terra/checks.json', JSON.stringify({origin: ORIGIN, checks, requests: observations.responses}, null, 2) + '\n');
} finally { await close(); }
