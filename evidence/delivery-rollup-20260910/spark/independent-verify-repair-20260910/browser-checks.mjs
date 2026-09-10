import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const candidate = '/private/tmp/cw-spark-delivery-repair-20260910';
const outDir = '/private/tmp/cw-delivery-rollup-20260910/evidence/delivery-rollup-20260910/spark/independent-verify-repair-20260910';
await mkdir(outDir, { recursive: true });
const seed = JSON.parse(await readFile('/private/tmp/cw-spark-seed-verify-20260910.json', 'utf8'));
const fixtureDir = path.join(candidate, 'app/tests/fixtures/spark-derivations');
const fixtures = {};
for (const name of ['stale', 'quiet', 'empty', 'partial', 'truncated'])
  fixtures[name] = JSON.parse(await readFile(path.join(fixtureDir, `${name}.json`), 'utf8'));

process.env.APP_URL = seed.base;
process.env.WK6_CDP_PORT ||= '20317';
const { cdp, evaluate, key, waitFor, sleep, close, ORIGIN, observations } = await import(`${candidate}/evidence/fe05a/browser.mjs`);
const rawEval = async (expression) => {
  const { result, exceptionDetails } = await cdp('Runtime.evaluate', { expression, awaitPromise: false, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text || 'Runtime evaluation failed');
  return result?.value;
};
const results = [];
const screenshots = [];
const check = async (name, fn) => {
  try { await fn(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, error: error?.stack || error?.message || String(error) }); }
};
const dialogText = () => evaluate(`document.querySelector('dialog.spark-dialog')?.textContent || ''`);
const dialogOpen = () => evaluate(`Boolean(document.querySelector('dialog.spark-dialog')?.open)`);
const closeSpark = async () => {
  await rawEval(`document.querySelector('dialog.spark-dialog')?.close()`);
  await waitFor(`!document.querySelector('dialog.spark-dialog')?.open`);
  await sleep(80);
};
const screenshot = async (name) => {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(outDir, name), Buffer.from(data, 'base64'));
  screenshots.push(name);
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const asProject = (body, projectId = seed.project.id) => {
  const value = structuredClone(body);
  value.scopeRef = `project:${projectId}`;
  for (const matter of value.matters || []) matter.snapshotRef ||= 'core-state:verify';
  return value;
};
const openSpark = async ({ mode = 'payload', payload = null, pages = {} } = {}) => {
  await closeSpark();
  await evaluate(`window.__sparkMode=${JSON.stringify(mode)};window.__sparkPayload=${JSON.stringify(payload)};window.__sparkPages=${JSON.stringify(pages)};`);
  await rawEval(`document.querySelector('#spark-button').click()`);
  await waitFor(`document.querySelector('dialog.spark-dialog')?.open`);
};
const waitMessage = async (needle) => {
  await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent || '').includes(${JSON.stringify(needle)})`);
};

try {
  await cdp('Page.navigate', { url: ORIGIN });
  await waitFor(`document.querySelector('#spark-button') && document.querySelector('#app-shell')`);
  await sleep(1500);
  const staticChecks = await evaluate(`Promise.all(['/web/spark-view.mjs','/web/spark-projection.mjs'].map(async p=>({path:p,status:(await fetch(p)).status})))`);
  const indexOrder = await evaluate(`(()=>{const ids=[...document.querySelectorAll('#navigation-panel button')].map(b=>b.id);return {ids,attention:ids.indexOf('attention-button'),spark:ids.indexOf('spark-button'),filter:ids.indexOf('nav-filter-input')}})()`);
  const initialState = await evaluate(`(()=>({url:location.href,buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean).slice(0,30),sessionTitle:document.querySelector('#session-title')?.textContent||'',surfaceHidden:document.querySelector('#surface-panel')?.hidden??null}))()`);

  await check('real host serves Spark static modules', async () => {
    assert.deepEqual(staticChecks, [
      { path: '/web/spark-view.mjs', status: 200 },
      { path: '/web/spark-projection.mjs', status: 200 },
    ]);
  });
  await check('Spark sidebar follows Attention and precedes Find', async () => {
    assert.ok(indexOrder.attention >= 0 && indexOrder.spark === indexOrder.attention + 1);
    assert.ok(indexOrder.filter < 0 || indexOrder.spark < indexOrder.filter);
  });

  // Exercise the real app Spark instance against the real host's unimplemented route.
  await rawEval(`document.querySelector('#spark-button').focus();document.querySelector('#spark-button').click()`);
  await waitMessage('No source yet.');
  await check('real host BE-41 404 renders unimplemented without maintenance numbers', async () => {
    const text = await dialogText();
    assert.match(text, /No source yet/);
    assert.doesNotMatch(text, /\d/);
  });
  await check('unimplemented dialog closes and returns focus to Spark opener', async () => {
    await rawEval(`document.querySelector('dialog.spark-dialog [aria-label="Close Spark"]')?.click()`);
    await waitFor(`!document.querySelector('dialog.spark-dialog')?.open`);
    await sleep(80);
    assert.equal(await evaluate('document.activeElement?.id'), 'spark-button');
  });

  // Install a fetch shim only for the unimplemented BE-41 path. All other app traffic
  // continues to the real host, so this still exercises the integrated Spark instance.
  await evaluate(`(()=>{window.__sparkRequests=[];window.__sparkOrigFetch=window.fetch.bind(window);window.fetch=async(input,init)=>{const url=String(input instanceof Request?input.url:input);if(url.includes('/api/v5/work-derivations')){window.__sparkRequests.push(url);const mode=window.__sparkMode;if(mode==='loading')return new Promise(()=>{});if(mode==='404')return new Response(JSON.stringify({error:{code:'not_found',message:'request not found'}}),{status:404,headers:{'Content-Type':'application/json'}});if(mode==='error')return new Response(JSON.stringify({error:{code:'synthetic_failure',message:'Synthetic maintenance read failed'}}),{status:503,headers:{'Content-Type':'application/json'}});const parsed=new URL(url,location.href);const body=window.__sparkPages[parsed.searchParams.get('offset')||'0']??window.__sparkPayload;return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});}return window.__sparkOrigFetch(input,init);};})()`);

  await check('loading state has no stale data while request is pending', async () => {
    await openSpark({ mode: 'loading' });
    await waitMessage('Loading maintenance state');
    const text = await dialogText();
    assert.match(text, /Loading maintenance state/);
    assert.doesNotMatch(text, /Acme|[0-9]+\s+(stale|current|candidate|revision)/i);
  });

  await check('404 state remains unimplemented under integrated Spark instance', async () => {
    await openSpark({ mode: '404' });
    await waitMessage('No source yet.');
    const text = await dialogText();
    assert.match(text, /No source yet/);
    assert.doesNotMatch(text, /\d/);
  });

  await check('error state exposes retry and preserves the same query', async () => {
    await openSpark({ mode: 'error' });
    await waitMessage('Synthetic maintenance read failed');
    const before = await evaluate('window.__sparkRequests.at(-1)');
    assert.match(before, /projectId=/);
    await rawEval(`[...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent==='Retry')?.click()`);
    await waitFor(`window.__sparkRequests.length>=2`);
    const after = await evaluate('window.__sparkRequests.at(-1)');
    assert.equal(after, before);
  });

  await check('empty state renders no section or numeric maintenance summary', async () => {
    await openSpark({ mode: 'payload', payload: asProject(fixtures.empty) });
    await waitMessage('No Matters');
    const text = await dialogText();
    assert.match(text, /No Matters/);
    assert.doesNotMatch(text, /Behind the current source set|Up to date|Unavailable/);
  });

  await check('quiet state separates current Matters and emits no stale prompt', async () => {
    await openSpark({ mode: 'payload', payload: asProject(fixtures.quiet) });
    await waitMessage('Up to date');
    const text = await dialogText();
    assert.match(text, /Up to date/);
    assert.match(text, /Every Matter in scope is current/);
    assert.doesNotMatch(text, /Behind the current source set|stale of/);
  });

  await check('stale Overview partitions active and quiet Matters with source revision change', async () => {
    await openSpark({ mode: 'payload', payload: asProject(fixtures.stale) });
    await waitMessage('Behind the current source set');
    const text = await dialogText();
    assert.match(text, /Behind the current source set/);
    assert.match(text, /Up to date/);
    assert.match(text, /Revision 2 → 3/);
    assert.match(text, /1 added, 1 replaced/);
    assert.match(text, /2 stale of 5/);
    assert.doesNotMatch(text, /Unavailable/);
  });
  await screenshot('stale-overview-light-1440.png');

  await check('Activity lists stale refs and keeps matter/status filters', async () => {
    await rawEval(`document.querySelector('#spark-tab-activity').click()`);
    await waitMessage('Candidate');
    const text = await dialogText();
    assert.match(text, /Candidate/);
    assert.match(text, /c-9/);
    assert.match(text, /Pending/);
    assert.match(text, /1 of 3/);
    const controls = await evaluate(`([...document.querySelectorAll('dialog.spark-dialog select')].map(s=>s.getAttribute('aria-label')))`);
    assert.deepEqual(controls, ['Spark project', 'Filter by Matter', 'Filter by status']);
  });

  await check('partial state says Unavailable and never paints null counts as zero', async () => {
    await openSpark({ mode: 'payload', payload: asProject(fixtures.partial) });
    await waitMessage('Unavailable');
    const text = await dialogText();
    assert.match(text, /Unavailable · contract_unsupported/);
    assert.doesNotMatch(text, /0 stale|0 current|0 total|stale of/);
  });

  await check('truncated Activity states loaded refs versus the total stale count', async () => {
    await openSpark({ mode: 'payload', payload: asProject(fixtures.truncated) });
    await waitMessage('Behind the current source set');
    await rawEval(`document.querySelector('#spark-tab-activity').click()`);
    await waitMessage('Showing 20 of 37');
    const text = await dialogText();
    assert.match(text, /Showing 20 of 37/);
    assert.match(text, /remaining stale candidates/);
  });

  // Paged response: 25 rows followed by 2 rows, same snapshot.
  const firstPage = asProject(fixtures.quiet);
  firstPage.page = { limit: 25, offset: 0, total: 27 };
  firstPage.matters = Array.from({ length: 25 }, (_, i) => ({
    ...structuredClone(fixtures.quiet.matters[0]),
    matterId: `page-${i + 1}`,
    title: `Paged Matter ${i + 1}`,
  }));
  const secondPage = asProject(fixtures.quiet);
  secondPage.page = { limit: 25, offset: 25, total: 27 };
  secondPage.matters = Array.from({ length: 2 }, (_, i) => ({
    ...structuredClone(fixtures.quiet.matters[0]),
    matterId: `page-${i + 26}`,
    title: `Paged Matter ${i + 26}`,
  }));
  await check('paged state carries the same snapshotRef and never mixes page rows', async () => {
    await openSpark({ mode: 'payload', payload: firstPage, pages: { '25': secondPage } });
    await waitMessage('More Matters');
    const before = await evaluate(`document.querySelectorAll('dialog.spark-dialog .spark-matter-open').length`);
    assert.equal(before, 25);
    await rawEval(`[...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent==='More Matters')?.click()`);
    await waitFor(`(document.querySelector('dialog.spark-dialog')?.textContent||'').includes('Previous Matters')`);
    const after = await evaluate(`({rows:document.querySelectorAll('dialog.spark-dialog .spark-matter-open').length,text:document.querySelector('dialog.spark-dialog')?.textContent||'',request:window.__sparkRequests.at(-1)})`);
    assert.equal(after.rows, 2);
    assert.match(after.text, /26[–-]27 of 27 Matters/);
    assert.match(after.request, /offset=25/);
  });

  const changedSecond = structuredClone(secondPage);
  for (const matter of changedSecond.matters) matter.snapshotRef = 'core-state:changed';
  await check('paged state rejects changed snapshot without showing both pages', async () => {
    await openSpark({ mode: 'payload', payload: firstPage, pages: { '25': changedSecond } });
    await waitMessage('More Matters');
    await rawEval(`[...document.querySelectorAll('dialog.spark-dialog button')].find(b=>b.textContent==='More Matters')?.click()`);
    await waitMessage('moved on since the last page');
    const state = await evaluate(`({rows:document.querySelectorAll('dialog.spark-dialog .spark-matter-open').length,text:document.querySelector('dialog.spark-dialog')?.textContent||''})`);
    assert.equal(state.rows, 0);
    assert.match(state.text, /two pages are not shown together/);
    assert.doesNotMatch(state.text, /Paged Matter 1/);
  });

  await check('wrong project scope is rejected before any Matter row is shown', async () => {
    const wrongScope = asProject(fixtures.stale, 'other-project');
    await openSpark({ mode: 'payload', payload: wrongScope });
    await waitMessage('different project');
    const text = await dialogText();
    assert.match(text, /different project/);
    assert.equal(await evaluate(`document.querySelectorAll('dialog.spark-dialog .spark-matter-open').length`), 0);
  });

  // Responsive and keyboard checks on a loaded stale page.
  await openSpark({ mode: 'payload', payload: asProject(fixtures.stale) });
  await waitMessage('Behind the current source set');
  await check('light 1440 stale page has no document-level horizontal overflow', async () => {
    const dims = await evaluate(`({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})`);
    assert.equal(dims.w, 1440);
    assert.equal(dims.scroll, 1440);
  });
  await check('tab keyboard navigation moves focus and panel labelling', async () => {
    await rawEval(`document.querySelector('#spark-tab-overview').focus()`);
    await key({ code: 'ArrowRight', keyCode: 39 });
    const state = await evaluate(`({focus:document.activeElement?.id,selected:document.querySelector('#spark-tab-activity')?.getAttribute('aria-selected'),label:document.querySelector('#spark-panel')?.getAttribute('aria-labelledby')})`);
    assert.deepEqual(state, { focus: 'spark-tab-activity', selected: 'true', label: 'spark-tab-activity' });
  });
  await check('matter row is keyboard reachable and closes with Escape restoring opener', async () => {
    await rawEval(`document.querySelector('#spark-tab-overview').click();document.querySelector('#spark-tab-overview').focus()`);
    let reached = false;
    for (let i = 0; i < 12; i++) {
      await key({ code: 'Tab', keyCode: 9 });
      reached = await evaluate(`document.activeElement?.matches('dialog.spark-dialog .spark-matter-open')`);
      if (reached) break;
    }
    assert.equal(reached, true);
    const focus = await evaluate(`document.activeElement?.getAttribute('aria-label')`);
    assert.match(focus, /Open /);
    await key({ code: 'Escape', keyCode: 27 });
    await waitFor(`!document.querySelector('dialog.spark-dialog')?.open`);
    await sleep(80);
    assert.equal(await evaluate('document.activeElement?.id'), 'spark-button');
  });

  await closeSpark();
  await evaluate(`window.__sparkMode='payload';window.__sparkPayload=${JSON.stringify(asProject(fixtures.stale))};window.__sparkPages={};`);
  await rawEval(`document.querySelector('#spark-button').click()`);
  await waitMessage('Behind the current source set');
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await sleep(200);
  await check('dark 390 Activity page has visible filter controls and no document overflow', async () => {
    await rawEval(`document.querySelector('#spark-tab-activity').click()`);
    await waitMessage('Candidate');
    const dims = await evaluate(`({w:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,dialog:document.querySelector('dialog.spark-dialog')?.getBoundingClientRect().width,filters:[...document.querySelectorAll('dialog.spark-dialog select')].map(s=>s.getBoundingClientRect().width)})`);
    assert.equal(dims.w, 390);
    assert.equal(dims.scroll, 390);
    assert.ok(dims.dialog <= 378);
    assert.ok(dims.filters.every((width) => width > 0));
  });
  await screenshot('stale-activity-dark-390.png');
  await closeSpark();
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });

  // Actual host route seam: use seeded bound Matter/session and invoke the real
  // Spark callback via the app's integrated instance. Start from the plain chat.
  await check('host row click closes Spark and selects the bound Work session', async () => {
    // Ensure the app is on the plain chat, then load a payload whose Matter id is the
    // Matter the server bound to the Work session above.
    const plainButtons = await evaluate(`([...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Plain chat session').map(b=>({text:b.textContent.trim(),id:b.id,cls:b.className})))`);
    assert.ok(plainButtons.length > 0, JSON.stringify(initialState));
    await rawEval(`([...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Plain chat session')).click()`);
    await sleep(500);
    const navPayload = asProject(fixtures.stale, seed.project.id);
    navPayload.matters[0].matterId = seed.matterId;
    navPayload.matters[0].title = 'Spark bound Matter';
    navPayload.matters[1].matterId = 'quiet-other';
    navPayload.matters[1].title = 'Quiet other Matter';
    await closeSpark();
    await evaluate(`window.__sparkPayload=${JSON.stringify(navPayload)};window.__sparkMode='payload'`);
    await rawEval(`document.querySelector('#spark-button').click()`);
    await waitMessage('Behind the current source set');
    await rawEval(`([...document.querySelectorAll('dialog.spark-dialog .spark-matter-open')].find(b=>b.textContent.trim()==='Spark bound Matter')).click()`);
    await sleep(1000);
    const nav = await evaluate(`({sparkOpen:Boolean(document.querySelector('dialog.spark-dialog')?.open),sessionTitle:document.querySelector('#session-title')?.textContent||'',activeSessionText:document.querySelector('#session-title')?.textContent||'',surfaceHidden:document.querySelector('#surface-panel')?.hidden??null,surfaceOpen:document.querySelector('#surface-panel')?.classList.contains('is-open')??false,surfaceExpanded:document.querySelector('#surface-panel')?.classList.contains('is-expanded')??false,toast:document.querySelector('[role="status"]')?.textContent||''})`);
    assert.equal(nav.sparkOpen, false);
    assert.match(nav.sessionTitle, /Bound Work session/);
    assert.equal(nav.surfaceOpen, true, JSON.stringify(nav));
  });

  await check('bound Work route at narrow width leaves a visible focused preview tab', async () => {
    await rawEval(`([...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Plain chat session'))?.click()`);
    await sleep(500);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    const narrowPayload = asProject(fixtures.stale, seed.project.id);
    narrowPayload.matters[0].matterId = seed.matterId;
    narrowPayload.matters[0].title = 'Spark bound Matter';
    narrowPayload.matters[1].matterId = 'quiet-other';
    narrowPayload.matters[1].title = 'Quiet other Matter';
    await closeSpark();
    await evaluate(`window.__sparkPayload=${JSON.stringify(narrowPayload)};window.__sparkMode='payload'`);
    await rawEval(`document.querySelector('#spark-button').click()`);
    await waitMessage('Behind the current source set');
    await rawEval(`([...document.querySelectorAll('dialog.spark-dialog .spark-matter-open')].find(b=>b.textContent.trim()==='Spark bound Matter')).click()`);
    await sleep(1000);
    const narrow = await evaluate(`(()=>{const panel=document.querySelector('#surface-panel');const focus=document.activeElement;const r=panel?.getBoundingClientRect();const fr=focus?.getBoundingClientRect();return {innerWidth,scrollWidth:document.documentElement.scrollWidth,sparkOpen:Boolean(document.querySelector('dialog.spark-dialog')?.open),surfaceHidden:panel?.hidden??null,surfaceOpen:panel?.classList.contains('is-open')??false,surfaceExpanded:panel?.classList.contains('is-expanded')??false,focusId:focus?.id||'',focusVisible:Boolean(focus?.matches(':focus-visible')),focusRect:{width:fr?.width||0,height:fr?.height||0},panelRect:{left:r?.left||0,right:r?.right||0,bottom:r?.bottom||0}}})()`);
    assert.equal(narrow.innerWidth, 390);
    assert.equal(narrow.scrollWidth, 390);
    assert.equal(narrow.sparkOpen, false);
    assert.equal(narrow.surfaceHidden, false, JSON.stringify(narrow));
    assert.equal(narrow.surfaceOpen, true, JSON.stringify(narrow));
    assert.equal(narrow.surfaceExpanded, true, JSON.stringify(narrow));
    assert.equal(narrow.focusId, 'surface-preview-tab', JSON.stringify(narrow));
    assert.equal(narrow.focusVisible, true, JSON.stringify(narrow));
    assert.ok(narrow.focusRect.width > 0 && narrow.focusRect.height > 0, JSON.stringify(narrow));
    assert.ok(narrow.panelRect.left >= 0 && narrow.panelRect.right <= 390 && narrow.panelRect.bottom <= 844, JSON.stringify(narrow));
    await screenshot('bound-route-dark-390.png');
  });

  const final = {
    candidate: '936239dca9d7eac0cab859960f8b19950c760193',
    base: ORIGIN,
    seed: { projectId: seed.project.id, boundSessionId: seed.boundSession.id, plainSessionId: seed.plainSession.id, matterId: seed.matterId },
    staticChecks,
    initialState,
    screenshots,
    checks: results,
    pass: results.every((result) => result.pass),
    network: observations.responses.filter((item) => item.url.includes('/web/spark-') || item.url.includes('/api/v5/work-derivations')),
  };
  await writeFile(path.join(outDir, 'browser-results.json'), JSON.stringify(final, null, 2));
  console.log(JSON.stringify(final, null, 2));
  if (!final.pass) process.exitCode = 1;
} finally {
  await close();
}
