import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN} from './browser.mjs';
const checks=[];
try{
 await cdp('Page.navigate',{url:ORIGIN});await waitFor('!!window.__V5_UI__?.state.projects');
 for(const scheme of ['light','dark'])for(const skin of ['slate','gray-steel','dystopia'])for(const media of ['normal','reduced','forced']){
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:media==='reduced'?'reduce':'no-preference'},{name:'forced-colors',value:media==='forced'?'active':'none'}]});
  const values=await ev(`(()=>{__cwPrefs.apply({scheme:${JSON.stringify(scheme)},skin:${JSON.stringify(skin)}});return [...document.querySelectorAll('.jump-latest-button,.context-popover')].map(e=>{const c=getComputedStyle(e);return {id:e.id,blur:c.backdropFilter,background:c.backgroundColor,float:c.getPropertyValue('--float').trim()}})})()`);
  assert.ok(values.length>=2);
  for(const v of values){if(media!=='normal')assert.equal(v.blur,'none');else assert.match(v.blur,/blur\(/);if(media==='reduced'){const hex=v.float.slice(1);assert.equal(v.background,`rgb(${[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`);}}
  checks.push({scheme,skin,media,values});
 }
 await writeFile(new URL('./material-browser.json',import.meta.url),JSON.stringify({pass:true,note:'Computed styles of existing DOM consumers; no fake visibility or domain state. Unsupported-blur fallback is source/lint evidence, not a simulated browser capability.',checks},null,2));console.log('material fallback matrix passed');
}finally{await close()}
