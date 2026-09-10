import { railHost, surfaceFacts, selectSession, closeSurface } from '/web/app.mjs';
import { projectRunSummary } from '/web/summary-disclosure-projection.mjs';
import { createRunSummaryCard } from '/web/summary-disclosure.mjs';
import { el } from '/web/ui-controls.mjs';
const config = await (await fetch('/fixture-config.json')).json();
// Wait for the original host bootstrap. No mirrored application state.
while (!window.__V5_UI__?.state?.token || !window.__V5_UI__.state.projects.length) await new Promise(r=>setTimeout(r,50));
await selectSession(config.sessionId,{focus:false});
let phase = 'ready', generation = 0, lastRead = null;
let readError = 'Synthetic read failure. Retry reloads this run.';
const scopeKey = () => { const s=window.__V5_UI__.state; return JSON.stringify([s.activeSessionId,s.view,s.sessionEpoch]); };
let observedScope = scopeKey();
let summaryOpened = false;
function observeScope(){
 const next=scopeKey();
 if(next===observedScope)return;
 observedScope=next;generation++;lastRead=null;summaryOpened=false;
 if(phase==='loading'){phase='error';readError='Read interrupted by navigation. Retry to reload this run.';picker.value='error';}
}
function currentRead(ticket,scope){observeScope();return ticket===generation&&scope===scopeKey()&&surfaceFacts().sessionId===config.sessionId;}
const dock = el('aside',{className:'sd-fixture-dock',attrs:{'aria-label':'Run summary fixture'}});
const label = el('p',{className:'rail-note',text:'Fixture · synthetic data · local-fake'});
const controls = el('details',{className:'sd-fixture-controls'},el('summary',{text:'Fixture controls · synthetic'}));
const picker = el('select',{attrs:{'aria-label':'Fixture read state'}});
for(const name of ['ready','loading','empty','unknown','error','unavailable','incompatible','long'])picker.append(el('option',{attrs:{value:name},text:name}));
const scheme = el('select',{attrs:{'aria-label':'Fixture theme'}});
for(const name of ['light','dark'])scheme.append(el('option',{attrs:{value:name},text:name}));
controls.append(el('label',{text:'Read state'},picker),el('label',{text:'Theme'},scheme));
const body = document.getElementById('conversation-body');
const chat=document.querySelector('.chat-panel');chat.insertBefore(dock,body);
function snapshot(){
 observeScope();
 const facts = surfaceFacts();
 if(facts.sessionId !== config.sessionId || window.__V5_UI__.state.view !== 'session')return null;
 const scoped = {...facts,runId:config.runId,runs:lastRead?facts.runs.map(r=>r.id===config.runId?lastRead:r):facts.runs};
 if(phase==='empty')scoped.runs=facts.runs.map(r=>r.id===config.runId?{...r,artifacts:[]}:r);
 if(phase==='unknown')scoped.runs=facts.runs.map(r=>r.id===config.runId?{...r,status:'unknown',artifacts:undefined}:r);
 if(phase==='long')scoped.runs=facts.runs.map(r=>r.id===config.runId?{...r,artifacts:(r.artifacts||[]).map(a=>({...a,path:'out/'+('long-synthetic-source-name-'.repeat(10))+'note.txt'}))}:r);
 return projectRunSummary(scoped,{phase:phase==='long'||phase==='empty'||phase==='unavailable'?'ready':phase,error:phase==='error'?readError:null,readerAvailable:phase!=='unavailable',generation});
}
const card=createRunSummaryCard({getSnapshot:snapshot,onOpen:s=>{summaryOpened=true;railHost.openRun(s.identity.runId);},onOpenFile:file=>{summaryOpened=true;railHost.openFile(file);},onRetry:async()=>{
 const ticket=++generation,scope=scopeKey();phase='loading';picker.value='loading';render();
 try {
  // Deterministic adapter delay makes duplicate/late responses exercisable.
  await new Promise(r=>setTimeout(r,500));
  if(!currentRead(ticket,scope))return;
  const response=await window.__V5_UI__.request(`/runs/${config.runId}`);
  if(!currentRead(ticket,scope))return;
  if(response.run?.id!==config.runId||response.run?.sessionId!==config.sessionId)throw Error('Mismatched Run response');
  lastRead=response.run;phase='ready';picker.value='ready';render();
 } catch {
  if(!currentRead(ticket,scope))return;
  phase='error';readError='Could not reload this run. Retry to read again.';picker.value='error';render();
 }
}});
// The existing host first collapses its pane to its legacy rail. In this
// fixture placement, ask that same host to finish closing the legacy rail.
// No Escape/tab handler or renderer lifecycle is reimplemented here.
const surfaceObserver=new MutationObserver(()=>{
 const state=window.__V5_UI__.state;
 if(summaryOpened&&!state.surface.expanded){summaryOpened=false;if(state.surface.open)closeSurface();}
});
surfaceObserver.observe(document.getElementById('surface-panel'),{attributes:true,attributeFilter:['class','aria-hidden']});
controls.append(label);
dock.append(card.element,controls);
let previous;
function render(){
 const next=snapshot(),signature=JSON.stringify(next);
 dock.hidden=!next;
 chat.classList.toggle('sd-fixture-has-card',Boolean(next));
 document.querySelector('.app-shell').classList.toggle('sd-fixture-active',Boolean(next));
 if(signature!==previous){previous=signature;card.update(next);}
}
picker.addEventListener('change',()=>{generation++;lastRead=null;phase=picker.value;readError='Synthetic read failure. Retry reloads this run.';render();});
scheme.addEventListener('change',()=>{document.documentElement.dataset.theme=scheme.value;});
const timer=setInterval(render,150);render();
window.addEventListener('pagehide',()=>{clearInterval(timer);surfaceObserver.disconnect();card.dispose();},{once:true});
