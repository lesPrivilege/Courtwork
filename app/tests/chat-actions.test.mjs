import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatActions,createProductionActionAdapter} from '../web/chat-actions.mjs';
import {createDemoActionAdapter} from './fixtures/chat-actions/adapter.mjs';
import {withTinyDom,flush,deferred} from './tiny-dom.mjs';
const target={key:'s:r:a',role:'assistant',text:'Exact response\nbytes',pending:false};
function mount(container,options={}) { const root=createChatActions({target,adapter:createDemoActionAdapter({delay:0}),...options});Object.defineProperty(root,'isConnected',{get:()=>container.contains(root)});container.append(root);return root; }
const button=(root,intent)=>root.querySelectorAll('button').find(b=>b.getAttribute('data-chat-action')===intent);
test('production only admits explicit handlers and preserves exact captured bytes',async()=>{
 let copied;const adapter=createProductionActionAdapter({copy:({text})=>{copied=text;}});
 assert.equal(adapter.availability('share').available,false);await assert.rejects(adapter.invoke('share',target),/not available/);
 await adapter.invoke('copy',target);assert.equal(copied,target.text);
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
test('streaming allows only exact current-text copy, while unavailable actions report reasons',()=>withTinyDom(async container=>{
 let count=0;const root=mount(container,{target:{...target,pending:true},adapter:{availability:()=>({available:true}),invoke:async()=>{count++;return {state:'success'};}}});
 button(root,'regenerate').click();assert.equal(count,0);assert.match(root.textContent,/after this response finishes/);
 assert.equal(button(root,'copy').getAttribute('aria-label'),'Copy current text');button(root,'copy').click();await flush();assert.equal(count,1);
}));
test('regeneration requires explicit confirmation and retains original scope',()=>withTinyDom(async container=>{
 let received;const root=mount(container,{adapter:{availability:()=>({available:true}),invoke:async(intent,t)=>{received=t;return {state:'success'};}}});
 button(root,'regenerate').click();assert.equal(received,undefined);root.querySelectorAll('button').find(b=>b.getAttribute('aria-label')==='Confirm regeneration').click();await flush();assert.deepEqual(received,target);
}));
test('synthetic playback can be paused, resumed and stopped without a speech service',async()=>{
 const a=createDemoActionAdapter({delay:0});assert.equal((await a.invoke('read-aloud',target,{operation:'play'})).state,'playing');assert.equal((await a.invoke('read-aloud',target,{operation:'pause'})).state,'paused');assert.equal((await a.invoke('read-aloud',target,{operation:'resume'})).state,'playing');assert.equal((await a.invoke('stop-reading',target)).state,'idle');
});
