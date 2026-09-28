import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {rm,writeFile} from 'node:fs/promises';
const W='/Users/lesprivilege/Projects/.worktrees/courtwork-request-details-b2-20260928';
// author copy: runs against the fix tree
const {boot}=await import(`${W}/app/tests/helpers.mjs`);
const {createAttentionConversation}=await import(`${W}/app/web/attention-conversation.mjs`);
const baseSource=execFileSync('git',['show','1296b8d:app/web/attention-conversation.mjs'],{cwd:W,encoding:'utf8'});
const {createAttentionConversation:createBase}=await import('data:text/javascript;base64,'+Buffer.from(baseSource).toString('base64'));
const h=await boot();
const calls=[];
const request=async(route,options={})=>{
 calls.push({route,method:options.method??'GET'});
 const r=await h.api(options.method??'GET',route,options.body);
 if(r.status!==200)throw Object.assign(new Error(r.json?.error?.message??'HTTP failure'),{status:r.status,body:r.json});
 return r.json;
};
try{
 const id=randomUUID();
 const made=await request('/attention/conversations',{method:'POST',body:{conversationId:id}});
 const created=await request(`/sessions/${id}/runs`,{method:'POST',body:{commandId:randomUUID(),input:'Synthetic recorded Attention history'}});
 assert.equal((await h.pollRun(created.run.id)).status,'completed');
 const head=createAttentionConversation({request});await head.choose(id);assert.ok(head.state.lastSeq>0);
 const oldTitle=head.state.session.title;
 calls.length=0;const success=await head.rename(id,'Head renamed title');const renameCalls=[...calls];
 const persisted=(await h.api('GET',`/sessions/${id}`)).json;
 const first={success,persistedTitle:persisted.session.title,controllerTitle:head.state.session.title,listTitle:head.state.conversations.find(s=>s.id===id).title,lastSeq:head.state.lastSeq,calls:renameCalls};
 calls.length=0;await head.refresh();first.afterExplicitRefreshTitle=head.state.session.title;first.explicitRefreshCalls=[...calls];
 assert.equal(first.persistedTitle,'Head renamed title');assert.equal(first.controllerTitle,'Head renamed title');assert.equal(first.listTitle,'Head renamed title');
 const base=createBase({request});await base.choose(id);calls.length=0;const baseSuccess=await base.rename(id,'Base renamed title');
 const baseline={success:baseSuccess,controllerTitle:base.state.session.title,listTitle:base.state.conversations.find(s=>s.id===id).title,calls:[...calls]};
 assert.equal(baseline.controllerTitle,'Base renamed title');assert.equal(baseline.listTitle,'Base renamed title');
 const result={head:'fix-tree',base:'1296b8d',introducedRegression:false,first,baseline};
 await writeFile('<scratch>/attention-rename-after.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
