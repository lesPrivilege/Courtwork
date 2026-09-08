import { cdp, evaluate as ev, waitFor, close, ORIGIN, sleep, observations } from './harness.mjs';
import { writeFile } from 'node:fs/promises';
const results = [], responses = [], errors=[];
const check = (name, pass, actual) => { results.push({name,pass,actual}); console.log(name, pass); if(!pass) throw new Error(name); };
const state = 'window.__V5_UI__.state';
async function send(input) {
 const old = await ev(`${state}.runs.map(r=>r.id)`);
 await ev(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(input)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#composer-form').requestSubmit();})()`);
 return waitFor(`${state}.runs.find(r=>!${JSON.stringify(old)}.includes(r.id))`);
}
async function done(id,status='completed') { return waitFor(`${state}.runs.find(r=>r.id===${JSON.stringify(id)} && r.status===${JSON.stringify(status)})`,30000); }
async function click(sel) { await waitFor(`document.querySelector(${JSON.stringify(sel)}) !== null`); await ev(`document.querySelector(${JSON.stringify(sel)}).click()`); }
try {
 await cdp('Network.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await cdp('Page.navigate',{url:ORIGIN});
 await waitFor('window.__V5_UI__?.state.projects.length > 0');
 const homeRun=await send('/fixture question');
 await done(homeRun.id,'waiting_user');
 check('Home Send admits one waiting Run',true,{id:homeRun.id,sessionId:homeRun.sessionId});
 await waitFor('document.querySelector("input[aria-label=Answer]") !== null');
 await ev(`(()=>{const i=document.querySelector('input[aria-label=Answer]');i.value='browser answer';i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`);
 await done(homeRun.id);
 check('question answer completes same Run',await ev('document.body.innerText.includes("browser answer")'),homeRun.id);
 const write=await send('/fixture script '+JSON.stringify([{name:'ws_write',arguments:{path:'out/browser.txt',text:'synthetic browser artifact\n'}}]));
 await done(write.id,'waiting_user');
 await click('button[data-focus-key$=":allow"]');
 const written=await done(write.id);
 check('exact write permission publishes recorded artifact',written.artifacts?.length===1,written.artifacts);
 await click('.artifact-thread-row');
 await waitFor(`document.querySelector('#file-content').innerText.includes('synthetic browser artifact')`);
 check('recorded File surface shows same run, hash and bytes', await ev(`${state}.surface.fileRef.runId===${JSON.stringify(written.id)} && ${state}.surface.fileRef.sha256===${JSON.stringify(written.artifacts[0].sha256)}`), await ev(`${state}.surface.fileRef`));
 await click('#surface-preview-tab');
 await waitFor(`!document.querySelector('#surface-content').hidden`);
 check('Preview fallback is visible without a domain producer',await ev(`${state}.surface.open && !document.querySelector('#surface-content').hidden`),await ev(`document.querySelector('#surface-content').innerText`));
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 const denied=await send('/fixture script '+JSON.stringify([{name:'ws_write',arguments:{path:'out/denied.txt',text:'must not exist'}}]));
 await done(denied.id,'waiting_user'); await click('button[data-focus-key$=":deny"]');
 const deniedDone=await done(denied.id);
 check('deny never publishes artifact',deniedDone.artifacts.length===0,deniedDone.id);
 const failedWrite=await send('/fixture script '+JSON.stringify([{name:'ws_write',arguments:{path:'out',text:'must fail after allow'}}]));
 await done(failedWrite.id,'waiting_user'); await click('button[data-focus-key$=":allow"]');
 const failureDone=await done(failedWrite.id);
 const failureEvents=await ev(`window.__V5_UI__.request('/sessions/'+${state}.activeSessionId+'/events')`);
 const ownEvents=failureEvents.events.filter(e=>e.runId===failedWrite.id);
 const failureDom=await ev(`document.querySelector('#message-stream').innerText`);
 check('FE-T06: allowed write can fail; permission is not a tool success or accepted work', failureDone.artifacts.length===0 && ownEvents.some(e=>e.type==='permission.resolved' && e.data.decision==='allow') && ownEvents.some(e=>e.type==='tool.result' && e.data.isError) && failureDom.includes('Write allowed') && failureDom.includes('failed'), {runId:failedWrite.id,artifacts:failureDone.artifacts,events:ownEvents.filter(e=>["permission.resolved","tool.result"].includes(e.type)),dom:failureDom});
 const stopped=await send('/fixture question'); await done(stopped.id,'waiting_user');
 await click('#cancel-run-button'); await done(stopped.id,'cancelled');
 const stopEvents=await ev(`window.__V5_UI__.request('/sessions/'+${state}.activeSessionId+'/events')`);
 const stopStates=stopEvents.events.filter(e=>e.runId===stopped.id && e.type==='run.status').map(e=>e.data.status);
 check('FE-T06: cancel records stopping before cancelled',stopStates.includes('stopping') && stopStates.indexOf('stopping')<stopStates.lastIndexOf('cancelled'),stopStates);
 check('Stop closes waiting question',await ev(`!document.querySelector('input[aria-label=Answer]')`),stopped.id);
 const reconnectRun=await send('/fixture question'); await done(reconnectRun.id,'waiting_user');
 const sessionId=await ev(`${state}.activeSessionId`);
 await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await waitFor(`${state}.connectionLost`,15000);
 check('offline polling reports lost connection',true,sessionId);
 await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await waitFor(`!${state}.connectionLost`,20000);
 check('reconnect retains session and receipts',await ev(`${state}.activeSessionId===${JSON.stringify(sessionId)} && ${state}.runs.some(r=>r.id===${JSON.stringify(written.id)})`),sessionId);
 await click('#cancel-run-button'); await done(reconnectRun.id,'cancelled');
 await writeFile(new URL('./run-chain.png',import.meta.url),Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));
} catch(error) { results.push({name:'exception',pass:false,error:error.stack,dom:await ev('document.body.innerText').catch(()=>null)}); process.exitCode=1; }
finally { await writeFile(new URL('./browser-loading.json',import.meta.url),JSON.stringify(observations,null,2)); await writeFile(new URL('./run-chain.json',import.meta.url),JSON.stringify(results,null,2)); await close(); }
