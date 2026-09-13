import test from 'node:test';
import assert from 'node:assert/strict';
import {withTinyDom} from './tiny-dom.mjs';
import {createDraftAttachments} from '../web/draft-attachments.mjs';
const entry={name:'test.txt',text:'exact synthetic text',commandId:'synthetic-upload',expectedRevision:0};

test('staging has no backend effect, preserves focus nodes on unchanged render, and exposes a visible count',()=>withTinyDom(container=>{
 document.body=container;
 const view=createDraftAttachments({restored:[structuredClone(entry)]});
 document.body.append(view.trigger,view.popover);
 const remove=view.popover.querySelector('.draft-attachment-list').querySelector('button');remove.focus();view.render();
 assert.equal(view.popover.querySelector('.draft-attachment-list').querySelector('button'),remove);
 assert.equal(document.activeElement,remove);
 assert.equal(view.trigger.getAttribute('aria-label'),'Attachments (1)');
 assert.equal(view.trigger.querySelector('.button-label').textContent,'1');
 assert.deepEqual(view.snapshot(),[entry]);
}));

test('an unknown upload is immutable until exact replay reconciles its retained revision',()=>withTinyDom(async container=>{
 document.body=container;
 const view=createDraftAttachments({restored:[structuredClone(entry)]});document.body.append(view.trigger,view.popover);
 const calls=[];const request=async(p,{body})=>{calls.push({p,body:structuredClone(body)});if(calls.length===1)throw Error('lost response');return{workspaceState:'written'};};
 await assert.rejects(view.flush(request,'s1'),/lost response/);view.render();
 assert(view.popover.querySelector('.draft-attachment-list').querySelector('button').disabled);
 const resumed=createDraftAttachments({restored:view.snapshot()});
 await resumed.flush(request,'s1');assert.deepEqual(calls[0],calls[1]);assert.deepEqual(calls[0].body,entry);
 assert.equal(resumed.snapshot().length,0);
}));

test('a confirmed upload refusal permits removing the unsaved draft attachment',()=>withTinyDom(async container=>{
 document.body=container;
 const view=createDraftAttachments({restored:[structuredClone(entry)]});document.body.append(view.trigger,view.popover);
 await assert.rejects(view.flush(async()=>{throw Object.assign(Error('refused'),{status:400});},'s1'),/refused/);view.render();
 const remove=view.popover.querySelector('.draft-attachment-list').querySelector('button');assert.equal(remove.disabled,false);
 remove.dispatchEvent({type:'click'});assert.equal(view.snapshot().length,0);
}));
