import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../../', import.meta.url));
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><link rel="stylesheet" href="/app/web/styles.css"><button id="opener">Open Spark</button>'); return; }
    let pathname = new URL(req.url, 'http://local').pathname;
    if (pathname.startsWith('/web/')) pathname = '/app' + pathname;
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    res.setHeader('Content-Type', ({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)] || 'text/plain');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
process.env.APP_URL = `http://127.0.0.1:${server.address().port}`;
process.env.WK6_CDP_PORT ||= '20230';
const { cdp, evaluate, waitFor, close, ORIGIN } = await import('../fe05a/browser.mjs');
const results=[];
try {
  await cdp('Page.navigate', {url:ORIGIN});
  await waitFor('document.querySelector("#opener")');
  await evaluate(`(async()=>{
    window.fixture = await (await fetch('/app/tests/fixtures/spark-derivations/stale.json')).json();
    window.calls=[]; window.pending=[]; window.opens=[];
    const {createSparkView}=await import('/app/web/spark-view.mjs');
    window.view=createSparkView({getProjects:()=>[{id:'p-1',name:'One'},{id:'p-2',name:'Two'}],request:(url)=>{calls.push(url);return new Promise((resolve,reject)=>pending.push({resolve,reject}));},onOpenMatter:(...args)=>opens.push({args,open:document.querySelector('dialog').open})});
    document.querySelector('#opener').focus(); view.open('p-1');
  })()`);
  const check=async(name, fn)=>{try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}};
  await evaluate('pending.shift().resolve(structuredClone(fixture))');
  await waitFor('document.querySelector(".spark-matter-open")');
  await check('project loading removes prior scope rows and preserves selector focus',async()=>{
    await evaluate(`(()=>{const s=document.querySelector('[aria-label="Spark project"]');s.focus();s.value='p-2';s.dispatchEvent(new Event('change'));})()`);
    assert.deepEqual(await evaluate(`({rows:document.querySelectorAll('.spark-matter-open').length,focus:document.activeElement.getAttribute('aria-label')})`),{rows:0,focus:'Spark project'});
  });
  await check('wrong scope response is rejected',async()=>{
    await evaluate('pending.shift().resolve(structuredClone(fixture))');
    await waitFor('document.querySelector("[role=alert]")');
    assert.equal(await evaluate(`document.querySelectorAll('.spark-matter-open').length`),0);
  });
  // Return to the first scope, with a paged fixture.
  await evaluate(`(()=>{const s=document.querySelector('[aria-label="Spark project"]');s.value='p-1';s.dispatchEvent(new Event('change'));const f=structuredClone(fixture);f.page.total=27;pending.shift().resolve(f);})()`);
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent==='More Matters')`);
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='More Matters').click();pending.shift().reject(new Error('Synthetic page failure'))`);
  await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Retry')`);
  await check('Retry repeats failed page query',async()=>{
    const old=await evaluate('calls.at(-1)');
    await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry').click()`);
    assert.equal(await evaluate('calls.at(-1)'),old); assert.match(old,/offset=25/);
  });
  await check('Retry keeps snapshot consistency guard',async()=>{
    await evaluate(`(()=>{const f=structuredClone(fixture);f.page.offset=25;f.page.total=27;for(const m of f.matters)m.snapshotRef='core-state:changed';pending.shift().resolve(f);})()`);
    await waitFor('document.querySelector("[role=alert]")');
    assert.match(await evaluate('document.querySelector("[role=alert]").textContent'),/moved on/);
    assert.equal(await evaluate(`document.querySelectorAll('.spark-matter-open').length`),0);
  });
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Refresh'&&!b.disabled).click();pending.shift().resolve(structuredClone(fixture))`);
  await waitFor('document.querySelector(".spark-matter-open")');
  await check('Tab activation and filters retain keyboard focus',async()=>{
    await evaluate(`(()=>{const t=document.querySelector('#spark-tab-activity');t.focus();t.click();})()`);
    assert.equal(await evaluate('document.activeElement.id'),'spark-tab-activity');
    await evaluate(`(()=>{const s=document.querySelector('[aria-label="Filter by status"]');s.focus();s.value='pending';s.dispatchEvent(new Event('change'));})()`);
    assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'),'Filter by status');
  });
  await check('Open Work closes Spark before host navigation',async()=>{
    await evaluate(`document.querySelector('.spark-matter-open').click()`);
    assert.deepEqual(await evaluate('opens.at(-1)'),{args:['m-1','p-1'],open:false});
  });
  console.log(JSON.stringify({checks:results,pass:results.every(r=>r.pass)},null,2));
  if(results.some(r=>!r.pass))process.exitCode=1;
} finally { await close(); await new Promise(r=>server.close(r)); }
