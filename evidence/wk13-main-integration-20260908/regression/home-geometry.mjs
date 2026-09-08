import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep } from '../browser.mjs';
import { writeFile } from 'node:fs/promises';
const stage=process.env.HOME_STAGE||'empty',results=[];
try{
 for(const width of [1440,390])for(const theme of ['light','dark']){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme},{name:'prefers-reduced-motion',value:'reduce'}]});
  await cdp('Page.navigate',{url:ORIGIN});await waitFor('window.__V5_UI__?.state.home.data');await sleep(400);
  const geometry=await ev(`(()=>{const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,left:r.left,width:r.width,height:r.height,bottom:r.bottom}};return {statusOutside:!document.querySelector('#composer-form').contains(document.querySelector('#home-start-status')),empty:document.querySelector('#app-shell').classList.contains('home-empty'),input:box('composer-input'),form:box('composer-form'),status:box('home-start-status'),context:box('composer-below'),overflow:document.documentElement.scrollWidth-innerWidth,rows:document.querySelectorAll('.home-row').length}})()`);
  const pass=geometry.statusOutside&&(stage!=='empty'||(Math.abs(geometry.status.left-geometry.form.left)<1&&Math.abs(geometry.status.width-geometry.form.width)<1&&geometry.status.top>=geometry.form.bottom))&&geometry.overflow<=1&&geometry.input.height>=64&&geometry.input.height<=160&&((stage==='empty')===geometry.empty);
  results.push({stage,width,theme,pass,geometry});
  await writeFile(new URL(`./home-${stage}-${width}-${theme}.png`,import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
}finally{await writeFile(new URL(`./home-${stage}-geometry.json`,import.meta.url),JSON.stringify(results,null,2));await close();}
console.log(results);if(results.some(r=>!r.pass))process.exitCode=1;
