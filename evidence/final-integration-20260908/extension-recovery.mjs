import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from './browser.mjs';
import { writeFile } from 'node:fs/promises';
const results=[];const state='window.__V5_UI__.state';
const check=(name,pass,actual)=>{results.push({name,pass,actual});console.log(name,pass);if(!pass)throw new Error(name);};
const api=(path,method='GET',body)=>ev(`window.__V5_UI__.request(${JSON.stringify(path)},${JSON.stringify({method,...(body?{body}:{})})})`);
async function send(input){const old=await ev(`${state}.runs.map(r=>r.id)`);await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(input)};i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`);return waitFor(`${state}.runs.find(r=>!${JSON.stringify(old)}.includes(r.id))`);}
async function reopen(){await ev('window.__integrationReloadMarker=true');await cdp('Page.reload');await waitFor('!window.__integrationReloadMarker && document.readyState==="complete" && window.__V5_UI__?.state.home.data && document.querySelector(".home-row")');await ev(`document.querySelector('.home-row').click()`);await waitFor(`${state}.activeSessionId`);await ev(`document.querySelector('#show-surface-button').click()`);await sleep(300);await ev(`document.querySelector('#surface-expand-button').click()`);}
try{
 await cdp('Network.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await cdp('Page.navigate',{url:ORIGIN});await waitFor('window.__V5_UI__?.state.projects.length');
 const run=await send('Synthetic extension recovery');await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(run.id)}&&r.status==='completed')`);
 const sid=run.sessionId;
 if((await api('/extensions')).extensions.find(e=>e.id==='evidence-memo')?.status!=='loaded') await api('/extensions/evidence-memo/lifecycle','POST',{action:'load'});
 await api('/sessions/'+sid+'/extension','POST',{extensionId:'evidence-memo',input:{title:'Synthetic source',sourceText:'Recorded extension source for browser recovery.'}});
 await reopen();
 await waitFor(`document.querySelector('#surface-content').innerText.includes('Recorded extension source for browser recovery.')`);
 check('real extension renderer loads its source projection',true,sid);
 await ev(`(()=>{const i=document.querySelector('#surface-content textarea[name=draft]');i.value='Saved through the real domain action';[...document.querySelectorAll('#surface-content button')].find(b=>b.textContent==='Save draft').click();})()`);
 await waitFor(`document.querySelector('#surface-content textarea[name=draft]')?.value==='Saved through the real domain action'`);
 await sleep(400);
 const saved=await api('/sessions/'+sid+'/surface');
 check('renderer action persists in domain projection',saved.projection.draft==='Saved through the real domain action',saved.projection.draft);
 await cdp('Network.setBlockedURLs',{urls:['*/extensions/evidence-memo/renderer.mjs']});
 await reopen();
 await waitFor(`document.querySelector('#surface-content').innerText.includes('Renderer unavailable')`);
 check('module load failure leaves a visible fallback and unchanged domain state',(await api('/sessions/'+sid+'/surface')).projection.draft===saved.projection.draft,await ev(`document.querySelector('#surface-content').innerText`));
 await cdp('Network.setBlockedURLs',{urls:[]});await reopen();
 await waitFor(`document.querySelector('#surface-content textarea[name=draft]')?.value==='Saved through the real domain action'`);
 check('renderer reload restores the same domain draft',true,sid);
 await ev(`document.querySelector('#close-surface-button').click()`);
 const fail=await send('/fixture error');await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(fail.id)}&&r.status==='failed')`,45000);
 check('provider error is visibly failed with a backend error receipt',(await api('/runs/'+fail.id)).run.error.code==='provider_error',fail.id);
 const recover=await send('Recovered after synthetic provider error');await waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(recover.id)}&&r.status==='completed')`);
 check('new explicit run recovers after confirmed provider failure',true,recover.id);
 await writeFile(new URL('./extension-recovery.png',import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
}catch(error){results.push({name:'exception',pass:false,error:error.stack,dom:await ev('document.body.innerText').catch(()=>null)});process.exitCode=1;}
finally{await writeFile(new URL('./extension-recovery.json',import.meta.url),JSON.stringify({results,observations},null,2));await close();}
