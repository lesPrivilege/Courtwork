import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startServer } from '../../app/server/index.mjs';
import { FAKE_CREDENTIAL_KEY } from '../../app/runtime/pi-session-runtime.mjs';
const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CW_PREVIEW_CDP_PORT || 19996);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const dir = await mkdtemp(path.join(tmpdir(), 'cw-preview-stats-'));
const runtime = await startServer({ dataDir: dir, port: 0, fakeResponder: () => ({kind:'text',id:'stats-audit',created:Math.floor(Date.now()/1000),text:'synthetic local reply'}), logger:()=>{} });
const headers = {'content-type':'application/json','x-work-token':runtime.token};
async function api(method, route, body) { const r=await fetch(runtime.url+'/api/v5'+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}); const t=await r.text(); return {status:r.status,json:t?JSON.parse(t):null}; }
await api('PUT','/provider-credential',{connectionId:'catalog-fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY});
await api('PUT','/provider-config',{provider:'fake-openai-loopback',model:'fake-model',api:'openai-completions'});
const project=(await api('POST','/projects',{name:'Real stats project'})).json.project;
const session=(await api('POST','/sessions',{projectId:project.id,title:'Stats audit chat'})).json.session;
const made=await api('POST',`/sessions/${session.id}/runs`,{input:'one real local run',commandId:'stats-audit-run'});
let run=made.json.run;
for (let i=0;i<200 && !['completed','failed','cancelled','unknown'].includes(run.status);i++) { await sleep(25); run=(await api('GET',`/runs/${run.id}`)).json.run; }
const directSummary=(await api('GET','/work-summary?limit=30')).json;
const directActivity=(await api('GET','/work-activity?days=84')).json;
const chrome=spawn(CHROME,[`--remote-debugging-port=${PORT}`,`--user-data-dir=${await mkdtemp(path.join(tmpdir(),'cw-preview-stats-chrome-'))}`,'--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--window-size=1440,900','about:blank'],{stdio:['ignore','ignore','ignore']});
let version=null; for(let i=0;i<120&&!version;i++){try{version=await(await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();}catch{await sleep(100);}}
if(!version) throw new Error('CDP unavailable');
const socket=new WebSocket(version.webSocketDebuggerUrl); await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let mid=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(!m.id||!pending.has(m.id))return;const x=pending.get(m.id);pending.delete(m.id);m.error?x.reject(new Error(JSON.stringify(m.error))):x.resolve(m.result);};
const csend=(method,params={},sid)=>new Promise((resolve,reject)=>{const id=++mid;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId:sid}));});
let targetId,cdp;async function tab(){({targetId}=await csend('Target.createTarget',{url:'about:blank'}));const {sessionId}=await csend('Target.attachToTarget',{targetId,flatten:true});cdp=(m,p)=>csend(m,p,sessionId);await cdp('Page.enable');await cdp('Runtime.enable');}
async function ev(expr){const {result,exceptionDetails}=await cdp('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});if(exceptionDetails)throw new Error(exceptionDetails.text+' '+(exceptionDetails.exception?.description||''));return result.value;}
async function load(){await cdp('Page.navigate',{url:runtime.url});for(let i=0;i<200;i++){if(await ev("document.readyState==='complete'&&!!document.getElementById('preview-chip')"))break;await sleep(100);}await sleep(1800);}
async function click(sel,wait=1000){const ok=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;e.click();return true;})()`);await sleep(wait);return ok;}
const state=()=>ev(`(()=>{const s=window.__V5_UI__?.state;return {previewActive:document.getElementById('app-shell')?.classList.contains('preview-active'),chip:!document.getElementById('preview-chip')?.hidden,memory:(()=>{try{return localStorage.getItem('schema-engineering.preview.v1')}catch{return 'n/a'}})(),projects:s?.projects?.map(p=>({id:p.id,name:p.name,preview:Boolean(p.preview)})),summary:s?.home?.data?{sessionCandidateTotal:s.home.data.sessionCandidates?.total,pendingTotal:s.home.data.pendingItems?.total,inspectionTotal:s.home.data.inspectionCandidates?.total,sessionIds:s.home.data.sessionCandidates?.items?.map(i=>i.sessionId)}:null,activity:s?.homeActivity?.data?{recordedRunCount:s.homeActivity.data.recordedRunCount,bucketTotal:s.homeActivity.data.buckets?.reduce((n,b)=>n+b.recordedRunCount,0)}:null,homeError:s?.home?.error,activityError:s?.homeActivity?.error,title:document.getElementById('session-title-text')?.textContent};})()`);
await tab(); await load(); await ev('localStorage.clear();sessionStorage.clear();true'); await load();
const initial=await state();
await ev(`(()=>{const original=window.fetch.bind(window);window.__statsFetchLog=[];window.fetch=async(...args)=>{const r=await original(...args);const url=String(args[0]);if(/\\/work-(summary|activity)/.test(url))window.__statsFetchLog.push({url,status:r.status});return r;};return true;})()`);
const chatButton=await click('#chat-button',700);
const offer=await ev("!!document.querySelector('[data-chat-action=\\\"example\\\"]')");
const example=await click('[data-chat-action="example"]',1500);
const home=await click('#home-button',1200);
await sleep(1800);
const reopened=await state();
const logs=await ev('window.__statsFetchLog||[]');
const realSummary={sessionCandidateTotal:directSummary.sessionCandidates.total,pendingTotal:directSummary.pendingItems.total,inspectionTotal:directSummary.inspectionCandidates.total,sessionIds:directSummary.sessionCandidates.items.map(x=>x.sessionId)};
const realActivity={recordedRunCount:directActivity.recordedRunCount,bucketTotal:directActivity.buckets.reduce((n,b)=>n+b.recordedRunCount,0)};
console.log(JSON.stringify({run:{id:run.id,status:run.status},initial,actions:{chatButton,offer,example,home},reopened,direct:{realSummary,realActivity},fetchLog:logs},null,2));
await runtime.close();socket.close();chrome.kill();await rm(dir,{recursive:true,force:true});
