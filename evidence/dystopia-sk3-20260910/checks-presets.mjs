import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { cdp, evaluate as ev, waitFor, close, ORIGIN, observations } from './browser.mjs';
const checks=[];
async function reload(){await ev('window.__oldDocument=true');await cdp('Page.reload',{});await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');}
try{
 await cdp('Page.addScriptToEvaluateOnNewDocument',{source:`const observer=new MutationObserver(()=>{if(document.body&&!window.__atBody){const c=getComputedStyle(document.documentElement);window.__atBody={skin:document.documentElement.dataset.skin||'slate',panel:c.getPropertyValue('--panel').trim(),review:c.getPropertyValue('--attention-review').trim()};observer.disconnect();}});observer.observe(document,{childList:true,subtree:true});`});
 await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
 const choices=await ev(`(()=>{document.querySelector('#settings-appearance .settings-advanced').open=true;return [...document.querySelector('[aria-label="Palette"]').options].map(o=>({value:o.value,label:o.textContent}));})()`);
 assert.deepEqual(choices.map(x=>x.value),['slate','gray-steel','dystopia','custom']);checks.push({name:'single registry reaches UI',choices});
 await ev(`(()=>{const s=document.querySelector('[aria-label="Palette"]');s.value='dystopia';s.dispatchEvent(new Event('change'));document.getElementById('settings-scheme-dark').click();})()`);
 assert.equal(await ev(`JSON.parse(localStorage.getItem(__cwPrefs.key)).skin`),'dystopia');await reload();
 const first=await ev('window.__atBody');assert.deepEqual(first,{skin:'dystopia',panel:'#202b32',review:'#efaaa4'});checks.push({name:'selected preset persists before first body',first});
 const roles=['attention-review','danger','success','focus','alpha-ink','alpha-paper','shadow-alpha','glass-alpha','rim-alpha','blur-chrome','blur-transient'];
 const geometry=['font-size','font-family','line-height','border-radius','padding','min-height'];
 const matrix=[];
 for(const system of ['light','dark']){
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:system}]});
  for(const scheme of ['light','dark','system']){
   let baseline;
   for(const skin of ['slate','gray-steel','dystopia']){
    const measured=await ev(`(()=>{__cwPrefs.apply({scheme:${JSON.stringify(scheme)},skin:${JSON.stringify(skin)}});const c=getComputedStyle(document.documentElement),g=getComputedStyle(document.querySelector('[aria-label="Palette"]'));return {fixed:Object.fromEntries(${JSON.stringify(roles)}.map(r=>[r,c.getPropertyValue('--'+r).trim()])),geometry:Object.fromEntries(${JSON.stringify(geometry)}.map(r=>[r,g.getPropertyValue(r)])),panel:c.getPropertyValue('--panel').trim(),accent:c.getPropertyValue('--accent-ink').trim()};})()`);
    if(!baseline)baseline=measured;else{assert.deepEqual(measured.fixed,baseline.fixed);assert.deepEqual(measured.geometry,baseline.geometry);}
    const dark=scheme==='dark'||scheme==='system'&&system==='dark';
    if(skin==='slate')assert.equal(measured.panel,dark?'#222627':'#f4f5f6');
    if(skin==='dystopia'){assert.equal(measured.panel,dark?'#202b32':'#edf1f3');assert.equal(measured.accent,dark?'#e4ebef':'#242d33');}
    matrix.push({system,scheme,skin,measured});
   }
  }
 }
 checks.push({name:'18 preset mode combinations; fixed roles and control geometry stable',matrix});
 assert.deepEqual(observations.exceptions,[]);
 await writeFile(new URL('./presets-browser.json',import.meta.url),JSON.stringify({pass:true,checks},null,2)+'\n');console.log('preset browser: passed');
}finally{await close();}
