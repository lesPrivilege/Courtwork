import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {cdp,evaluate as ev,waitFor,close,ORIGIN,key,sleep} from './browser.mjs';
const checks=[];
const shot=async(name)=>writeFile(new URL(`./${name}.png`,import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
try{
 await cdp('Page.navigate',{url:ORIGIN+'/#settings/appearance'});await waitFor('!!window.__V5_UI__?.state.projects');
 for(const width of [1440,1280,390])for(const theme of ['light','dark']){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  await ev(`localStorage.setItem(__cwPrefs.key,JSON.stringify({scheme:${JSON.stringify(theme)},skin:'dystopia'}));window.__oldDocument=true`);await cdp('Page.reload');await waitFor('!window.__oldDocument && !!window.__V5_UI__?.state.projects');
  for(const section of ['general','appearance','models','keyboard']){
   await ev(`location.hash='settings/${section}'`);await waitFor(`!document.getElementById('settings-${section}').hidden`);await sleep(80);
   const layout=await ev(`({overflow:document.documentElement.scrollWidth>innerWidth,panel:document.getElementById('settings-${section}').getBoundingClientRect().toJSON(),sidebarInert:document.getElementById('navigation-panel')?.inert})`);
   assert.equal(layout.overflow,false);assert.ok(layout.panel.left>=0&&layout.panel.right<=width);checks.push({width,theme,section,layout});
   await shot(`settings-${section}-${theme}-${width}`);
  }
 }
 await ev(`location.hash='settings/appearance'`);await waitFor(`!document.getElementById('settings-appearance').hidden`);
 await cdp('Emulation.setDeviceMetricsOverride',{width:640,height:450,deviceScaleFactor:2,mobile:false});
 assert.equal(await ev('document.documentElement.scrollWidth>innerWidth'),false);await shot('settings-zoom-200');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'},{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-reduced-motion',value:'reduce'}]});
 await ev(`document.getElementById('settings-back-button').focus()`);await key({code:'Tab',keyCode:9});
 const focus=await ev(`({tag:document.activeElement.tagName,visible:document.activeElement.getBoundingClientRect().height>0,forced:matchMedia('(forced-colors: active)').matches})`);assert.equal(focus.visible,true);checks.push({fallback:focus});await shot('settings-forced-colors');
 await ev(`document.getElementById('settings-back-button').focus()`);await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await waitFor(`document.getElementById('settings-page').hidden`);
 const back=await ev(`({hash:location.hash,focus:document.activeElement.id})`);assert.equal(back.focus,'composer-input');checks.push({backToApp:back});
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await ev(`document.getElementById('runtime-setup-button').focus();document.getElementById('runtime-setup-button').click()`);await waitFor(`!document.getElementById('settings-page').hidden`);await key({code:'Escape',keyCode:27});await waitFor(`document.getElementById('settings-page').hidden`);const returned=await ev('document.activeElement.id');assert.equal(returned,'runtime-setup-button');checks.push({escapeReturnFocus:returned});
 await writeFile(new URL('./settings-browser.json',import.meta.url),JSON.stringify({pass:true,checks},null,2));console.log('settings matrix passed');
}finally{await close()}
