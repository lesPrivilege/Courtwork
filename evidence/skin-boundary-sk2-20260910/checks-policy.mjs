import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { cdp, evaluate as ev, waitFor, close, ORIGIN, observations } from './browser.mjs';
const css = await readFile(new URL('../../app/web/styles.css', import.meta.url), 'utf8');
const first = css.match(/:root\s*\{([^}]+)\}/)[1];
const declarations = [...first.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([,name,value])=>`${name}: ${value};`).join("\n");
const raw = `/* original stored palette */\n:root {\n${declarations.replace('--danger-11: #9b3c35', '--danger-11: #008800').replace('--glass-alpha: 0.86', '--glass-alpha: 0.99')}\n}`;
const checks=[];
const record = (name, actual) => checks.push({name,actual});
async function reload(){await ev('window.__oldDocument=true');await cdp('Page.reload',{});await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');}
try {
  await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`const observer=new MutationObserver(()=>{if(document.body&&!window.__atBody){const root=document.documentElement;window.__atBody={skin:root.dataset.skin||'slate',review:getComputedStyle(root).getPropertyValue('--attention-review').trim(),css:document.getElementById('user-appearance')?.textContent,raw:window.__cwPrefs?.value.customSkin};observer.disconnect();}});observer.observe(document,{childList:true,subtree:true});`});
  await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
  await ev(`localStorage.setItem(__cwPrefs.key,JSON.stringify({skin:'custom',scheme:'light',customSkin:${JSON.stringify(raw)}}))`);
  await reload();
  const firstPaint=await ev('window.__atBody');
  assert.equal(firstPaint.skin,'custom');assert.equal(firstPaint.review,'#ae3630');assert.equal(firstPaint.raw,raw);
  assert.ok(!firstPaint.css.includes('--danger-11'));assert.ok(!firstPaint.css.includes('--glass-alpha'));
  assert.equal(await ev('JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin'),raw);
  record('legacy projection before body and raw preservation',firstPaint);
  const roles=['attention-review','danger','danger-soft','success','success-soft','focus','alpha-ink','alpha-paper','shadow-alpha','glass-alpha','rim-alpha'];
  const matrix=[];
  for(const system of ['light','dark']){
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:system}]});
    for(const scheme of ['light','dark','system']){
      let baseline;
      for(const skin of ['slate','gray-steel','custom']){
        const colors=await ev(`(()=>{__cwPrefs.apply({skin:${JSON.stringify(skin)},scheme:${JSON.stringify(scheme)},customSkin:${JSON.stringify(raw)}});const c=getComputedStyle(document.documentElement);return Object.fromEntries(${JSON.stringify(roles)}.map(r=>[r,c.getPropertyValue('--'+r).trim()]));})()`);
        if(!baseline)baseline=colors;else assert.deepEqual(colors,baseline,`${system}/${scheme}/${skin}`);
        matrix.push({system,scheme,skin,colors});
      }
    }
  }
  record('fixed roles in 18 scheme/system/skin combinations',matrix);
  const malicious=raw.replace('--gray-1:', '--attention-review: #00ff00; --gray-1:');
  await ev(`localStorage.setItem(__cwPrefs.key,JSON.stringify({skin:'custom',scheme:'light',customSkin:${JSON.stringify(malicious)}}))`);
  await reload();
  const rejected=await ev('window.__atBody');assert.equal(rejected.skin,'slate');assert.equal(rejected.css,'');assert.equal(rejected.raw,malicious);record('unknown semantic key rejected before body',rejected);
  assert.deepEqual(observations.exceptions,[]);
  await writeFile(new URL('./policy-browser.json',import.meta.url),JSON.stringify({pass:true,checks},null,2)+'\n');
  console.log('policy browser: passed');
} finally {await close();}
