import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { cdp, evaluate as ev, waitFor, close, ORIGIN, observations, sleep } from './browser.mjs';
const css=await readFile(new URL('../../app/web/styles.css',import.meta.url),'utf8');
const blocks={light:css.match(/:root\s*\{([^}]+)\}/)[1],dark:css.match(/:root\[data-theme="dark"\]\s*\{([^}]+)\}/)[1]};
const raw=Object.fromEntries(Object.entries(blocks).map(([theme,block])=>[theme,[...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([,k,v])=>`${k}: ${v};`).join('\n')]));
const checks=[];
async function reload(){await ev('window.__oldDocument=true');await cdp('Page.reload',{});await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');}
async function shot(name){await writeFile(new URL(`./${name}.png`,import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));}
try{
 await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
 for(const width of [1440,1280,390])for(const theme of ['light','dark']){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  await ev(`localStorage.setItem(__cwPrefs.key,JSON.stringify({scheme:${JSON.stringify(theme)},skin:'custom',customSkin:${JSON.stringify(raw[theme])}}))`);await reload();
  await waitFor('!!document.querySelector(".skin-input")');
  await shot(`appearance-${theme}-${width}`);
  await ev(`document.querySelector('.skin-editor').scrollIntoView({block:'start'})`);await sleep(100);
  const layout=await ev(`(()=>{const e=document.querySelector('.skin-editor');const r=e.getBoundingClientRect();return {width:innerWidth,editor:{left:r.left,right:r.right,width:r.width},overflow:document.documentElement.scrollWidth>innerWidth,unlabelled:[...e.querySelectorAll('button')].filter(x=>!x.textContent.trim()&&!x.getAttribute('aria-label')).length,text:e.textContent,warnings:e.querySelector('[data-contrast-warning]')?.getAttribute('data-contrast-warning')||0}})()`);
  assert.equal(layout.overflow,false);assert.ok(layout.editor.left>=0&&layout.editor.right<=width);assert.equal(layout.unlabelled,0);assert.equal(Number(layout.warnings),0);
  await shot(`editor-${theme}-${width}`);checks.push({width,theme,layout});
 }
 // 200% browser zoom equivalent: layout viewport halves while physical output doubles.
 await cdp('Emulation.setDeviceMetricsOverride',{width:640,height:450,deviceScaleFactor:2,mobile:false});
 await ev(`document.querySelector('.skin-input').focus()`);
 const zoom=await ev(`({overflow:document.documentElement.scrollWidth>innerWidth,focus:document.activeElement.className})`);assert.equal(zoom.overflow,false);assert.equal(zoom.focus,'skin-input');checks.push({zoom:'200%',...zoom});await shot('editor-zoom-200');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'},{name:'prefers-reduced-transparency',value:'reduce'}]});
 const fallback=await ev(`({forced:matchMedia('(forced-colors: active)').matches,reduced:matchMedia('(prefers-reduced-transparency: reduce)').matches,focusVisible:document.activeElement.matches(':focus')})`);assert.equal(fallback.forced,true);assert.equal(fallback.reduced,true);assert.equal(fallback.focusVisible,true);checks.push(fallback);await shot('editor-forced-colors');
 assert.deepEqual(observations.exceptions,[]);
 await writeFile(new URL('./layout-browser.json',import.meta.url),JSON.stringify({pass:true,checks},null,2)+'\n');console.log('layout browser: passed');
}finally{await close();}
