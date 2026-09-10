import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cdp, evaluate as ev, waitFor, close, ORIGIN, observations, sleep } from './browser.mjs';
const downloads=await mkdtemp(path.join(tmpdir(),'cw-sk2-download-'));
const checks=[];
const check=(name,actual)=>checks.push({name,actual});
async function click(text){await ev(`(()=>{const b=[...document.querySelectorAll('#settings-appearance button')].find(b=>b.textContent===${JSON.stringify(text)});if(!b)throw Error('missing button');b.click();})()`);}
async function reload(){await ev('window.__oldDocument=true');await cdp('Page.reload',{});await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');}
try {
  await cdp('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});
  await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
  const raw=await ev(String.raw`(()=>{const p=__cwSkinPolicy;return '/* original legacy set */\n:root {\n'+p.LEGACY_SKIN_COLOR_TOKENS.map(k=>k+': '+(k==='--paper'||k==='--float-s'?'#fdfdfe':'#303030')+';').join('\n')+'\n--glass-alpha: 0.99;\n}';})()`);
  await ev(`localStorage.setItem(__cwPrefs.key,JSON.stringify({skin:'custom',scheme:'light',customSkin:${JSON.stringify(raw)}}))`);await reload();
  await waitFor('!!document.querySelector(".skin-editor textarea")');
  const original=await ev(`({input:document.querySelector('.skin-input').value,text:document.querySelector('.skin-editor').textContent})`);
  assert.equal(original.input,raw);assert.match(original.text,/Stored but not applied:.*--danger/);check('stored original and ignored keys visible',original);
  await click('Export stored tokens');
  let exported;
  for(let i=0;i<30;i++){try{exported=await readFile(path.join(downloads,'courtwork-stored-palette.txt'),'utf8');break;}catch{await sleep(100);}}
  assert.equal(exported,raw);check('export exact stored original',{bytes:Buffer.byteLength(exported)});
  await click('Edit appearance colours');
  const draft=await ev(`({value:document.querySelector('.skin-input').value,focus:document.activeElement.className,stored:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin,state:document.querySelector('.skin-editor').textContent})`);
  assert.equal(draft.stored,raw);assert.equal(draft.focus,'skin-input');assert.ok(!draft.value.includes('--danger'));assert.match(draft.state,/loaded as a draft/);
  await click('Apply tokens');
  const applied=await ev(`({stored:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin,theme:document.documentElement.dataset.skin,text:document.querySelector('.skin-editor').textContent})`);
  assert.equal(applied.stored,draft.value);assert.equal(applied.theme,'custom');assert.ok(!applied.text.includes('Stored but not applied:'));check('draft becomes stored only on Apply',applied);
  await ev(`document.querySelector('[aria-label="Reset Palette to default"]').click()`);
  const reset=await ev(`({skin:document.documentElement.dataset.skin||'slate',stored:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin,focus:document.activeElement.getAttribute('aria-label'),advanced:document.querySelector('#settings-appearance .settings-advanced').open})`);
  assert.equal(reset.skin,'slate');assert.equal(reset.stored,draft.value);assert.equal(reset.focus,'Palette');assert.equal(reset.advanced,true);check('Reset retains stored set and visible focus target',reset);
  await ev(`(()=>{const s=document.querySelector('[aria-label="Palette"]');s.value='custom';s.dispatchEvent(new Event('change'));})()`);
  await click('Remove');
  const removed=await ev(`({skin:document.documentElement.dataset.skin||'slate',raw:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin,focus:document.activeElement.getAttribute('aria-label')})`);
  assert.equal(removed.raw,'');assert.equal(removed.skin,'slate');assert.equal(removed.focus,'Palette');check('explicit Remove clears original and returns focus',removed);
  await ev(`(()=>{const s=document.querySelector('[aria-label="Palette"]');s.value='custom';s.dispatchEvent(new Event('change'));const t=document.querySelector('.skin-input');t.value='--attention-review: #008800;';t.dispatchEvent(new Event('input'));})()`);
  await click('Apply tokens');
  const invalid=await ev(`({skin:document.documentElement.dataset.skin||'slate',error:document.querySelector('.skin-errors').textContent,stored:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin})`);
  assert.equal(invalid.skin,'slate');assert.equal(invalid.stored,'');assert.match(invalid.error,/not applied/);check('invalid draft leaves current appearance and stored data unchanged',invalid);
  await ev(`(()=>{window.__saveSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('quota','QuotaExceededError');};const t=document.querySelector('.skin-input');t.value=${JSON.stringify(draft.value)};t.dispatchEvent(new Event('input'));})()`);
  await click('Apply tokens');
  const sessionOnly=await ev(`({active:document.documentElement.dataset.skin,saved:JSON.parse(localStorage.getItem(__cwPrefs.key)).customSkin,text:document.querySelector('#settings-appearance').textContent})`);
  assert.equal(sessionOnly.active,'custom');assert.equal(sessionOnly.saved,'');assert.match(sessionOnly.text,/Browser storage could not be updated/);assert.match(sessionOnly.text,/Export current tokens/);check('storage failure is session-only and saved original survives',sessionOnly);
  await ev('Storage.prototype.setItem=window.__saveSetItem');
  await reload();
  assert.equal(await ev(`document.documentElement.dataset.skin||'slate'`),'slate');
  assert.deepEqual(observations.exceptions,[]);
  await writeFile(new URL('./editor-browser.json',import.meta.url),JSON.stringify({pass:true,checks},null,2)+'\n');
  console.log('editor browser: passed');
} finally {await close();await rm(downloads,{recursive:true,force:true});}
