import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatSources, recordedChatFiles, quoteRecordedFile, frozenChatSources} from '../web/chat-sources.mjs';
import {withTinyDom, deferred, flush} from './tiny-dom.mjs';
const hash='a'.repeat(64);
test('recorded references deduplicate exact identity but retain different Run versions',()=>{
 const a={kind:'artifact',runId:'r1',file:{kind:'content-version',path:'memo.md',sha256:hash}};
 assert.equal(recordedChatFiles([a,a,{...a,runId:'r2'},{...a,file:{...a.file,kind:'current'}}],'s').length,2);
});
test('unbound discussion reads no made-up source endpoint; file opens exact captured version',()=>withTinyDom(async container=>{
 let calls=0,opened;const view=createChatSources({session:{id:'s'},request:()=>{calls++;},isCurrent:()=>true,onOpenFile:ref=>{opened=ref;}});
 view.update([{kind:'artifact',runId:'r',file:{kind:'content-version',path:'memo.md',sha256:hash}}]);container.append(view.root);
 view.root.open=true;view.root.dispatchEvent({type:'toggle'});await flush();
 view.root.querySelectorAll('button').find(b=>b.textContent==='memo.md').click();assert.equal(calls,0);assert.deepEqual(opened,{kind:'content-version',sessionId:'s',runId:'r',path:'memo.md',sha256:hash});
}));
test('scope change rejects late work projection, with no source bytes in the replacement view',()=>withTinyDom(async container=>{
 const wait=deferred();let current=true;
 const view=createChatSources({session:{id:'s',extensionBinding:{}},request:()=>wait.promise,isCurrent:()=>current});container.append(view.root);
 view.root.open=true;view.root.dispatchEvent({type:'toggle'});current=false;
 wait.resolve({projection:{matter:{id:'secret-matter'},candidates:[]}});await flush();assert.doesNotMatch(view.root.textContent,/secret-matter/);
}));
test('read failure remains explicit and refresh is available',()=>withTinyDom(async container=>{
 const view=createChatSources({session:{id:'s',extensionBinding:{}},request:async()=>{throw new Error('Unavailable');},isCurrent:()=>true});container.append(view.root);
 view.root.open=true;view.root.dispatchEvent({type:'toggle'});await flush();assert.match(view.root.textContent,/Work sources unavailable: Unavailable/);assert.equal(view.root.querySelector('button').disabled,false);
}));

test('fixed candidate evidence never substitutes the current source revision',()=>{
 const projection={sources:[{id:'source',version:2}],candidates:[{id:'candidate',evidence:[{source_id:'source',source_version:1,digest:hash}]}]};
 assert.deepEqual(frozenChatSources(projection),[{candidateId:'candidate',sourceId:'source',version:1,digest:hash}]);
});
test('quoting a full recorded file keeps exact text lines and provenance; current files are rejected',()=>{
 const ref={kind:'content-version',sessionId:'s',runId:'r',path:'memo.md',sha256:hash};
 const text='A😀\n`code`\n';const quote=quoteRecordedFile({ref,text});assert.match(quote,/Session: s\nRun: r/);assert.ok(quote.endsWith('> A😀\n> `code`\n> '));
 assert.throws(()=>quoteRecordedFile({ref:{...ref,kind:'current'},text}));
});
test('missing or mismatched historical bytes stay explicit rather than falling back to latest',()=>withTinyDom(async container=>{
 const projection={matter:{id:'m',version:0,source_version:2},sources:[{id:'source',version:2,digest:hash}],candidates:[{id:'candidate',status:'pending',evidence:[{source_id:'source',source_version:1,digest:hash}]}]};
 const paths=[];const view=createChatSources({session:{id:'s',extensionBinding:{}},request:async path=>{paths.push(path);return path.endsWith('/surface')?{projection}:{source:{id:'source',version:2,digest:hash,text:'wrong revision'}};},isCurrent:()=>true});container.append(view.root);
 view.root.open=true;view.root.dispatchEvent({type:'toggle'});await flush();
 const source=view.root.querySelectorAll('details').find(d=>d !== view.root && d.textContent.startsWith('Read source source'));
 source.open=true;source.dispatchEvent({type:'toggle'});await flush();
 assert.ok(paths.at(-1).includes('version=1'));assert.match(source.textContent,/Source unavailable: The source does not match/);assert.doesNotMatch(source.textContent,/wrong revision/);
}));
