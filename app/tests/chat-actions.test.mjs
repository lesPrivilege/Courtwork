import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatActions,createProductionActionAdapter} from '../web/chat-actions.mjs';
import {copyAction} from '../web/ui-controls.mjs';
import {createDemoActionAdapter} from './fixtures/chat-actions/adapter.mjs';
import {withTinyDom,flush,deferred} from './tiny-dom.mjs';
import {readFileSync} from 'node:fs';
const target={key:'s:r:a',role:'assistant',text:'Exact response\nbytes',pending:false};
function mount(container,options={}) { const root=createChatActions({target,adapter:createDemoActionAdapter({delay:0}),...options});Object.defineProperty(root,'isConnected',{get:()=>container.contains(root)});container.append(root);return root; }
const button=(root,intent)=>root.querySelectorAll('button').find(b=>b.getAttribute('data-chat-action')===intent);
async function drain() { for(let i=0;i<12;i++) await Promise.resolve(); }
async function withFakeClock(run) {
  const oldSetTimeout=globalThis.setTimeout, oldClearTimeout=globalThis.clearTimeout;
  let now=0, nextId=0; const timers=new Map(), delays=[];
  globalThis.setTimeout=(callback,delay=0)=>{const id=++nextId;timers.set(id,{at:now+Number(delay),callback,cancelled:false});delays.push(Number(delay));return id;};
  globalThis.clearTimeout=id=>{const timer=timers.get(id);if(timer)timer.cancelled=true;};
  const clock={delays,tick(ms){now+=ms;for(;;){const due=[...timers.entries()].filter(([,timer])=>!timer.cancelled&&timer.at<=now).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;timers.delete(due[0]);due[1].callback();}}};
  try{return await run(clock);}finally{globalThis.setTimeout=oldSetTimeout;globalThis.clearTimeout=oldClearTimeout;}
}
async function withClipboard(writeText,run) {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText}}});
  try{return await run();}finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
}
test('production only admits explicit handlers and preserves exact captured bytes',async()=>{
 let copied;const adapter=createProductionActionAdapter({copy:({text})=>{copied=text;}});
 assert.equal(adapter.availability('share').available,false);await assert.rejects(adapter.invoke('share',target),/not available/);
 assert.deepEqual(await adapter.invoke('copy',target),{state:'success',message:''});assert.equal(copied,target.text);
 await assert.rejects(createProductionActionAdapter({copy:()=>false}).invoke('copy',target),/could not/);
});
test('synthetic feedback is mutually exclusive and reversible; failure preserves selection',()=>withTinyDom(async container=>{
 let mode='success';const root=mount(container,{adapter:createDemoActionAdapter({mode:()=>mode,delay:0})});
 button(root,'like').click();await new Promise(r=>setTimeout(r,5));assert.equal(button(root,'like').getAttribute('aria-pressed'),'true');
 button(root,'dislike').click();await new Promise(r=>setTimeout(r,5));assert.equal(button(root,'like').getAttribute('aria-pressed'),'false');assert.equal(button(root,'dislike').getAttribute('aria-pressed'),'true');
 mode='error';button(root,'like').click();await new Promise(r=>setTimeout(r,5));assert.equal(button(root,'dislike').getAttribute('aria-pressed'),'true');assert.match(root.textContent,/Demo failure/);
 mode='success';button(root,'dislike').click();await new Promise(r=>setTimeout(r,5));assert.equal(button(root,'dislike').getAttribute('aria-pressed'),'false');
}));
test('feedback lock suppresses duplicate/inverse requests and detached results cannot update a new target',()=>withTinyDom(async container=>{
 const wait=deferred();let count=0;const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:()=>{count++;return wait.promise;}}});
 button(root,'like').click();button(root,'dislike').click();assert.equal(count,1);assert.equal(button(root,'dislike').getAttribute('aria-busy'),'true');
 container.replaceChildren();wait.resolve({state:'selected',selection:'like',message:'stale response'});await flush();assert.doesNotMatch(root.textContent,/stale response/);
}));
test('pending assistant messages expose no Chat action chrome',()=>withTinyDom(async container=>{
 const root=createChatActions({target:{...target,pending:true},adapter:{availability:()=>({available:true}),invoke:async()=>({state:'success'})}});
 assert.equal(root,null);assert.equal(container.childElementCount,0);
}));
test('regeneration requires explicit confirmation and retains original scope',()=>withTinyDom(async container=>{
 let received;const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:async(intent,t)=>{received=t;return {state:'success'};}}});
 button(root,'regenerate').click();assert.equal(received,undefined);root.querySelectorAll('button').find(b=>b.getAttribute('aria-label')==='Confirm regeneration').click();await flush();assert.deepEqual(received,target);
}));
test('synthetic playback can be paused, resumed and stopped without a speech service',async()=>{
 const a=createDemoActionAdapter({delay:0});assert.equal((await a.invoke('read-aloud',target,{operation:'play'})).state,'playing');assert.equal((await a.invoke('read-aloud',target,{operation:'pause'})).state,'paused');assert.equal((await a.invoke('read-aloud',target,{operation:'resume'})).state,'playing');assert.equal((await a.invoke('stop-reading',target)).state,'idle');
});

test('production rejects undeclared lifecycle handlers even when supplied', async () => {
  for (const intent of ['like','dislike','pin','read-aloud','share','regenerate']) {
    let called=false;
    const adapter=createProductionActionAdapter({[intent]:()=>{called=true;return {state:'success'};}});
    assert.equal(adapter.availability(intent).available,false);
    await assert.rejects(adapter.invoke(intent,target));
    assert.equal(called,false);
  }
});
test('same bytes and key from a replacement record cannot accept an async result', () => withTinyDom(async container => {
  for (const field of ['sessionId','runId','projectionId']) {
    const captured={...target,sessionId:'s1',runId:'r1',projectionId:'p1'};
    let current=captured; const wait=deferred();
    const root=mount(container,{target:captured,getTarget:()=>current,adapter:{availability:()=>({available:true}),invoke:()=>wait.promise}});
    button(root,'like').click(); current={...captured,[field]:'replacement'};
    wait.resolve({state:'selected',selection:'like',message:'stale response'});await flush();
    assert.doesNotMatch(root.textContent,/stale response/);
    assert.equal(button(root,'like').getAttribute('aria-pressed'),'false');
    container.replaceChildren();
  }
}));

test('copyAction shares the 1.6s feedback lifecycle and the latest async copy owns its label',()=>withTinyDom(container=>withFakeClock(async clock=>{
  const waits=[deferred(),deferred(),deferred()]; let call=0;
  await withClipboard(()=>waits[call++].promise,async()=>{
  const copy=copyAction('exact bytes','Copy text');Object.defineProperty(copy,'isConnected',{get:()=>container.contains(copy)});container.append(copy);
  copy.click();copy.click();
  waits[0].resolve();await drain();assert.equal(copy.getAttribute('aria-label'),'Copy text','older completion cannot replace the latest action');
  waits[1].resolve();await drain();assert.equal(copy.getAttribute('aria-label'),'Copied');assert.deepEqual(clock.delays,[1600]);
  clock.tick(1599);assert.equal(copy.getAttribute('aria-label'),'Copied');clock.tick(1);assert.equal(copy.getAttribute('aria-label'),'Copy text');
  copy.click();waits[2].resolve();await drain();assert.equal(copy.getAttribute('aria-label'),'Copied');
  container.replaceChildren();const before={label:copy.getAttribute('aria-label'),text:copy.textContent,children:[...copy.children]};
  clock.tick(1600);assert.equal(copy.getAttribute('aria-label'),before.label);assert.equal(copy.textContent,before.text);assert.deepEqual(copy.children,before.children);
  });
})));

test('Chat copy shows Copied only on its button for 1.6s, then restores its action label',()=>withTinyDom(container=>withFakeClock(async clock=>{
  const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:async()=>({state:'success',message:'Copied.'})}});
  const copy=button(root,'copy'),status=root.querySelector('.chat-action-status');copy.click();await drain();
  assert.equal(copy.getAttribute('aria-label'),'Copied');assert.equal(status.hidden,true);assert.equal(status.textContent,'');assert.deepEqual(clock.delays,[1600]);
  clock.tick(1599);assert.equal(copy.getAttribute('aria-label'),'Copied');clock.tick(1);assert.equal(copy.getAttribute('aria-label'),'Copy response');
})));

test('a later Chat error survives an old pending copy result and a later action cancels the copy timer',()=>withTinyDom(container=>withFakeClock(async clock=>{
  const oldCopy=deferred();
  const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:intent=>intent==='copy'?oldCopy.promise:Promise.reject(new Error('newer error'))}});
  const copy=button(root,'copy'),like=button(root,'like'),status=root.querySelector('.chat-action-status');
  copy.click();like.click();await drain();assert.equal(status.textContent,'newer error');
  oldCopy.resolve({state:'success',message:'Copied.'});await drain();assert.equal(status.textContent,'newer error');assert.equal(copy.getAttribute('aria-label'),'Copy response');
  clock.tick(1600);assert.equal(status.textContent,'newer error');
})));

test('a later busy Chat action cancels Copied feedback without its timer clearing the busy notice',()=>withTinyDom(container=>withFakeClock(async clock=>{
  const read=deferred();
  const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:intent=>intent==='copy'?Promise.resolve({state:'success'}):read.promise}});
  const copy=button(root,'copy'),readAloud=button(root,'read-aloud'),status=root.querySelector('.chat-action-status');
  copy.click();await drain();assert.equal(copy.getAttribute('aria-label'),'Copied');
  readAloud.click();assert.equal(status.textContent,'Read aloud…');assert.equal(readAloud.getAttribute('aria-busy'),'true');
  clock.tick(1600);assert.equal(status.textContent,'Read aloud…');assert.equal(readAloud.getAttribute('aria-busy'),'true');
  read.resolve({state:'playing'});await drain();assert.equal(status.hidden,true);
})));

test('Chat and Attention draw the assistant footer only through the shared final-answer gate',()=>{
  const root=new URL('../../',import.meta.url).pathname;
  const app=readFileSync(`${root}app/web/app.mjs`,'utf8'),attention=readFileSync(`${root}app/web/attention-agent-view.mjs`,'utf8');
  assert.match(app,/const footer = renderAnswerFooter\(row, \(\) => messageActionRow\(row, session\)\);\s*if \(footer\) wrapper\.append\(footer\);/);
  assert.match(attention,/const footer = renderAnswerFooter\(row, \(\) => messageActionRow\(row, state\)\);\s*if \(footer\) block\.append\(footer\);/);
  // Neither surface keeps a second, local footer rule of its own.
  for (const source of [app, attention]) {
    assert.doesNotMatch(source,/assistant-message-actions/);
    assert.doesNotMatch(source,/renderMessageTime/);
  }
});

test('Copy on the one footer of a multi-segment Run copies exactly the final answer',()=>withTinyDom(container=>withFakeClock(async clock=>{
  const {projectThread}=await import('../web/thread-projection.mjs');
  const {renderAnswerFooter}=await import('../web/user-message.mjs');
  const answer='Final answer\n\n```js\nexact();\n```\n';
  const ev=(seq,type,data)=>({seq,runId:'r',sessionId:'s',type,data});
  const {rows}=projectThread([
    ev(1,'assistant.message',{text:'Narration before a tool.',stopReason:'toolUse'}),
    ev(2,'tool.start',{callId:'c',name:'ws_list'}),ev(3,'tool.result',{callId:'c',name:'ws_list',text:'[]'}),
    ev(4,'assistant.delta',{text:'Final'}),ev(5,'assistant.message',{text:answer,stopReason:'stop'}),
  ],[{id:'r',sessionId:'s',status:'completed',startedAt:'2026-09-21T04:35:41.788Z'}],'s');
  let copied=null;
  // The same target shape both surfaces' messageActionRow builds.
  const footers=rows.filter(row=>row.kind==='assistant').map(row=>renderAnswerFooter(row,()=>{
    const captured={key:JSON.stringify(['s',0,row.kind,row.id]),role:row.kind,sessionId:'s',runId:row.runId,projectionId:row.id,text:row.text,pending:Boolean(row.pending)};
    const actions=createChatActions({target:captured,getTarget:()=>captured,adapter:createProductionActionAdapter({copy:({text})=>{copied=text;}})});
    Object.defineProperty(actions,'isConnected',{get:()=>container.contains(actions)});
    return actions;
  })).filter(Boolean);
  assert.equal(footers.length,1);
  container.append(...footers);
  const copy=container.querySelectorAll('button').filter(b=>b.getAttribute('data-chat-action')==='copy');
  assert.equal(copy.length,1,'one Copy control in the whole Run');
  copy[0].click();await drain();
  assert.equal(copied,answer);
  assert.equal(copy[0].getAttribute('aria-label'),'Copied');
  clock.tick(1600);
  assert.equal(copy[0].getAttribute('aria-label'),'Copy response');
})));

test('new error after copy success survives expiry and detached Chat is not repainted',()=>withTinyDom(container=>withFakeClock(async clock=>{
 const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:async intent=>{if(intent!=='copy')throw new Error('keep error');return {state:'success'};}}});
 const copy=button(root,'copy'),status=root.querySelector('.chat-action-status');
 copy.click();await drain();assert.equal(copy.getAttribute('aria-label'),'Copied');
 button(root,'like').click();await drain();clock.tick(1600);assert.equal(status.textContent,'keep error');
 copy.click();await drain();const before=copy.children.slice();container.replaceChildren();clock.tick(1600);assert.deepEqual(copy.children,before);
 })));
