import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RuntimeStore } from '../server/store.mjs';
import { Coordination } from '../harness/coordination.mjs';
import { executeChild, narrowGrant, reduceFindings } from '../harness/child-execution.mjs';
import { boot, spawnWorker, reopen } from './helpers.mjs';

async function fixture() {
  const dir=await mkdtemp(path.join(tmpdir(),'cw-coordination-'));
  const store=await new RuntimeStore({dataDir:dir}).open(), c=new Coordination(store);
  const project=await store.createProject('synthetic');
  const makeSession=()=>store.createSession({projectId:project.id,title:'synthetic',workspaceDir:path.join(dir,randomUUID()),permissionMode:'ask'});
  const a=await makeSession(),b=await makeSession();
  const ta=await c.create({threadId:'thread-a',sessionId:a.id,title:'A'}),tb=await c.create({threadId:'thread-b',sessionId:b.id,title:'B'});
  const input=(overrides={})=>({messageId:randomUUID(),sourceThreadId:ta.id,targetThreadId:tb.id,sourceSessionId:a.id,expectedTargetRevision:1,kind:'request',text:'Synthetic question',replyTo:null,...overrides});
  return {dir,store,c,a,b,ta,tb,input,makeSession,async close(){await store.close();await rm(dir,{recursive:true,force:true});}};
}
test('Thread identity and membership are durable, explicit and not Session identity',async()=>{
  const f=await fixture();try {
    assert.notEqual(f.ta.id,f.a.id);
    assert.deepEqual(await f.c.create({threadId:f.ta.id,sessionId:f.a.id,title:'A'}),f.ta);
    await assert.rejects(f.c.create({threadId:f.ta.id,sessionId:f.a.id,title:'changed'}),{code:'coordination_conflict'});
    const s=await f.makeSession(); const attached=await f.c.attach(f.ta.id,{sessionId:s.id,expectedRevision:1});
    assert.equal(attached.revision,2); assert.equal(f.c.list(s.id).currentThreadId,f.ta.id);
    assert.deepEqual(await f.c.attach(f.ta.id,{sessionId:s.id,expectedRevision:1}),attached);
    await f.store.deleteSession(f.a.id);assert.equal(f.c.list().threads.find(t=>t.id===f.ta.id).available,true);
    await f.store.close(); const reopened=await new RuntimeStore({dataDir:f.dir}).open();
    try{assert.equal(new Coordination(reopened).list(s.id).currentThreadId,f.ta.id);}finally{await reopened.close();}
  }finally{await f.close();}
});
test('outbox replay is idempotent; conflicting payload and invented source are refused',async()=>{
  const f=await fixture();try{
    const input=f.input();const receipts=await Promise.all([f.c.send(input),f.c.send(input)]);
    assert.deepEqual(receipts[0],receipts[1]);assert.equal(receipts[0].status,'delivered');
    assert.equal(f.c.mailbox(f.tb.id).messages.length,1);
    await assert.rejects(f.c.send({...input,text:'changed'}),{code:'coordination_conflict'});
    await assert.rejects(f.c.send(f.input({sourceSessionId:f.b.id})),{code:'coordination_binding'});
    assert.equal(f.store.listRuns().length,0);assert.equal(f.store.snapshot().events.length,0);
  }finally{await f.close();}
});
test('late delivery retains origin and distinguishes stale target from missing target',async()=>{
  const f=await fixture();try{
    const a=await f.c.enqueue(f.input()),b=await f.c.enqueue(f.input());
    await f.c.attach(f.tb.id,{sessionId:(await f.makeSession()).id,expectedRevision:1});
    assert.equal((await f.c.deliver(a.id)).status,'stale_target');
    await f.c.close(f.tb.id,{expectedRevision:2});assert.equal((await f.c.deliver(b.id)).status,'target_unavailable');
    assert.equal(f.c.mailbox(f.tb.id).messages.length,0);assert.equal(f.c.mailbox(f.ta.id).messages.length,2);
    assert.equal((await f.c.deliver(a.id)).sourceThreadId,f.ta.id);
  }finally{await f.close();}
});
test('reply lineage requires a delivered reverse envelope, not an unrelated latest message',async()=>{
  const f=await fixture();try{
    const first=await f.c.send(f.input());
    const reply=f.input({sourceThreadId:f.tb.id,targetThreadId:f.ta.id,sourceSessionId:f.b.id,kind:'reply',replyTo:first.id});
    assert.equal((await f.c.send(reply)).status,'delivered');
    await assert.rejects(f.c.send(f.input({kind:'reply',replyTo:first.id})),{code:'coordination_binding'});
  }finally{await f.close();}
});
test('delete and scope change do not recreate a recipient or reroute queued messages',async()=>{
  const f=await fixture();try{
    const queued=await f.c.enqueue(f.input());await f.store.deleteSession(f.b.id);
    await f.makeSession();await f.c.recover();
    assert.equal(f.c.mailbox(f.ta.id).messages[0].status,'target_unavailable');
    assert.equal((await f.c.deliver(queued.id)).targetThreadId,f.tb.id);
    assert.equal(f.store.getSession(f.b.id),null);
  }finally{await f.close();}
});
test('RuntimeStore6 migration preserves global scope and exact backup; corrupt ledger fails closed',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'cw-coordination-upgrade-'));let store;
  try{
    store=await new RuntimeStore({dataDir:dir}).open();
    const global=await store.createSession({id:randomUUID(),scope:'global',projectId:null,title:'Attention',workspaceDir:path.join(dir,'global'),permissionMode:'ask'});
    await store.close();const file=path.join(dir,'runtime-state.json');const old=JSON.parse(await readFile(file,'utf8'));old.schemaVersion=6;delete old.coordination;
    const raw=Buffer.from(JSON.stringify(old,null,1)+'\n');await writeFile(file,raw);
    store=await new RuntimeStore({dataDir:dir}).open();assert.equal(store.getSession(global.id).scope,'global');assert.equal(store.state.schemaVersion,9);await store.close();
    const hash=createHash('sha256').update(raw).digest('hex');assert.deepEqual(await readFile(path.join(dir,`runtime-state.schema6.${hash}.json`)),raw);
    const bad=JSON.parse(await readFile(file,'utf8'));bad.coordination.messages.push({id:'forged'});await writeFile(file,JSON.stringify(bad));
    await assert.rejects(new RuntimeStore({dataDir:dir}).open());
    assert.equal((await readdir(dir)).filter(n=>n.includes('schema6')).length,1);
  }finally{await store?.close();await rm(dir,{recursive:true,force:true});}
});

const finding=id=>({executionId:id,claims:['claim'],evidenceRefs:['source@1'],artifactRefs:[],conflicts:['unresolved'],gaps:[]});
const spec=()=>({schemaVersion:1,executionId:'child-1',origin:{threadId:'thread-a',sessionId:'session-a',runId:'run-a'},mode:'invoke',input:'Investigate fixture',grant:{actions:['read'],resources:['a'],depth:1},budgetMs:1000,adapter:{id:'fixture',version:'1'}});
const parentGrant={actions:['read'],resources:['a'],depth:1};
test('child grant monotonically narrows and reducer retains source attribution and conflicts under permutation',()=>{
  assert.deepEqual(narrowGrant(parentGrant,{actions:['read','write'],resources:['a','b'],depth:10}),{actions:['read'],resources:['a'],depth:0});
  assert.throws(()=>narrowGrant({...parentGrant,depth:0},spec().grant));
  const a=finding('a'),b={...finding('b'),claims:['different']};assert.deepEqual(reduceFindings([a,b,a]),reduceFindings([b,a]));
  assert.deepEqual(reduceFindings([a,b]).conflicts,['unresolved']);assert.equal(reduceFindings([a,b]).sources.length,2);
  assert.throws(()=>reduceFindings([a,{...a,conflicts:[]}]),{code:'child_conflict'});
});
test('child tool boundary denies widening and completion remains undelivered/unaccepted',async()=>{
  let reads=0,writes=0;
  const result=await executeChild(spec(),{parentGrant,tools:{read:async()=>++reads,write:async()=>++writes},adapter:{id:'fixture',version:'1',async execute({spec,tool}){
    await assert.rejects(tool('write','a',{}),{code:'delegation_denied'});await assert.rejects(tool('read','b',{}),{code:'delegation_denied'});
    await tool('read','a',{});return finding(spec.executionId);
  }}});
  assert.equal(result.status,'succeeded');assert.equal(result.delivery,'not_delivered');assert.equal(result.acceptance,'not_requested');assert.equal(reads,1);assert.equal(writes,0);
});
test('cancel, timeout, late completion and mutated caller input cannot change child settlement or origin',async()=>{
  const controller=new AbortController();let complete,invoke=0;const original=spec();
  const promise=executeChild(original,{parentGrant,signal:controller.signal,adapter:{id:'fixture',version:'1',execute(){invoke++;return new Promise(resolve=>complete=resolve);}}});
  await Promise.resolve();controller.abort();original.executionId='latest';original.origin.threadId='latest';
  const result=await promise;assert.equal(result.status,'cancelled');assert.equal(result.executionId,'child-1');assert.equal(result.origin.threadId,'thread-a');
  complete(finding('child-1'));await Promise.resolve();assert.equal(result.status,'cancelled');assert.equal(invoke,1);
  const timed=await executeChild({...spec(),budgetMs:5},{parentGrant,adapter:{id:'fixture',version:'1',execute:()=>new Promise(()=>{})}});assert.equal(timed.status,'unknown');
  const before=new AbortController();before.abort();await executeChild(spec(),{parentGrant,signal:before.signal,adapter:{id:'fixture',version:'1',execute(){throw new Error('must not run');}}});
});

test('authenticated HTTP Thread/message entry reaches a real inbox without starting a model',async()=>{
  const h=await boot();const ok=r=>{assert.equal(r.status,200,JSON.stringify(r.json));return r.json;};
  try{
    const a=await h.createSession(),b=await h.createSession();
    for(const [id,s] of [['a',a],['b',b]])ok(await h.api('POST','/coordination/threads',{threadId:id,sessionId:s.id,title:id}));
    const input={messageId:randomUUID(),sourceThreadId:'a',targetThreadId:'b',sourceSessionId:a.id,expectedTargetRevision:1,kind:'request',text:'Synthetic UI communication',replyTo:null};
    assert.equal(ok(await h.api('POST','/coordination/messages',input)).message.status,'delivered');
    assert.equal(ok(await h.api('GET','/coordination/threads/b')).messages.length,1);
    assert.equal(h.runtime.store.listRuns().length,0);
    const control=ok(await h.api('GET',`/runtime-control?sessionId=${a.id}`));assert(control.resources.some(r=>r.id==='tool:message_other_agent'));
    const unauthorized=await fetch(h.runtime.url+'/api/v5/coordination');assert.equal(unauthorized.status,401);
    assert.equal((await h.api('GET','/coordination?sessionId=guess')).status,400);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('SIGKILL after outbox persistence recovers exactly one local delivery without a Run',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'cw-coordination-kill-'));let worker,host;
  try{
    worker=spawnWorker({dataDir:dir,body:`
      const a=(await runtime.service.createAttentionConversation({conversationId:crypto.randomUUID()})).session;
      const b=(await runtime.service.createAttentionConversation({conversationId:crypto.randomUUID()})).session;
      await runtime.service.coordination.create({threadId:'a',sessionId:a.id,title:'A'});
      await runtime.service.coordination.create({threadId:'b',sessionId:b.id,title:'B'});
      const input={messageId:'durable-message',sourceThreadId:'a',targetThreadId:'b',sourceSessionId:a.id,expectedTargetRevision:1,kind:'request',text:'Crash fixture',replyTo:null};
      const receipt=await runtime.service.coordination.enqueue(input);
      emit({ready:true,input,status:receipt.status});
    `});
    const ready=await worker.waitForLine(v=>v.ready);assert.equal(ready.status,'queued');await worker.kill();
    host=await reopen(dir);let mailbox=(await host.api('GET','/coordination/threads/b')).json;
    assert.equal(mailbox.messages.length,1);assert.equal(mailbox.messages[0].status,'delivered');
    const repeat=(await host.api('POST','/coordination/messages',ready.input)).json.message;
    assert.deepEqual(repeat,mailbox.messages[0]);assert.equal(host.runtime.store.listRuns().length,0);
    await host.runtime.close();host=await reopen(dir);
    mailbox=(await host.api('GET','/coordination/threads/b')).json;assert.equal(mailbox.messages.length,1);
  }finally{await worker?.kill();await host?.runtime.close();await rm(dir,{recursive:true,force:true});}
});

test('model messages require a real permission decision and cannot auto-run the recipient',async()=>{
  const h=await boot();try{
    const a=await h.createSession({permissionMode:'ask'}),b=await h.createSession();
    for(const [id,s] of [['a',a],['b',b]])await h.api('POST','/coordination/threads',{threadId:id,sessionId:s.id,title:id});
    const command=await h.api('POST',`/sessions/${a.id}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name:'message_other_agent',arguments:{target_thread_id:'b',expected_target_revision:1,kind:'request',text:'Synthetic model request'}}])});
    assert.equal(command.status,200,JSON.stringify(command.json));
    const pending=await h.pollRun(command.json.run.id,{until:s=>s==='waiting_user'});
    assert.equal(h.runtime.store.snapshot().coordination.messages.length,0);
    const question=h.runtime.store.snapshot().questions.find(q=>q.runId===pending.id&&q.status==='pending');
    assert.equal(question.payload.tool,'message_other_agent');
    const approved=await h.api('POST',`/runs/${pending.id}/questions/${question.id}`,{decision:'allow'});assert.equal(approved.status,200);
    await h.pollRun(pending.id);const message=h.runtime.store.snapshot().coordination.messages[0];
    assert.equal(message.status,'delivered');assert.equal(message.actor,'runtime');assert.equal(message.sourceRunId,pending.id);
    assert.equal(h.runtime.store.listRuns().length,1);assert.equal(h.runtime.store.listRuns().some(r=>r.sessionId===b.id),false);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('read-only tool metadata agrees with dispatch denial; project model directory excludes other scopes',async()=>{
  const h=await boot();try{
    const a=await h.createSession({permissionMode:'read_only'}),b=await h.createSession();
    const project=(await h.api('POST','/projects',{name:'Other scope'})).json.project;
    const other=(await h.api('POST','/sessions',{projectId:project.id,title:'Other'})).json.session;
    for(const [id,s] of [['a',a],['b',b],['other',other]])await h.api('POST','/coordination/threads',{threadId:id,sessionId:s.id,title:id});
    const control=(await h.api('GET',`/runtime-control?sessionId=${a.id}`)).json;
    assert.equal(control.resources.find(r=>r.id==='tool:message_other_agent').permission.effect,'deny');
    assert.deepEqual(h.runtime.service.coordination.runtimeDirectory(a.id).threads.map(t=>t.id),['a','b']);
    await assert.rejects(async()=>h.runtime.service.coordination.mailbox('b',{sessionId:a.id}),{code:'coordination_binding'});
    const response=await h.api('POST',`/sessions/${a.id}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name:'message_other_agent',arguments:{target_thread_id:'b',expected_target_revision:1,kind:'request',text:'must not send'}}])});
    assert.equal(response.status,200);await h.pollRun(response.json.run.id);
    assert.equal(h.runtime.store.snapshot().coordination.messages.length,0);
    assert.equal(h.runtime.store.snapshot().questions.length,0);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('schema7 effort survives upgrade; fixed old host refuses schema9 and restores only the separate original backup',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'cw-coordination-schema7-'));let store,oldStore;
  try{
    const code=path.join(dir,'old-code'),data=path.join(dir,'data'),restore=path.join(dir,'restore');
    const repo=fileURLToPath(new URL('../../',import.meta.url));
    const files=['server/store.mjs','server/runtime-lock.mjs','server/runtime-lock.py','server/work-metrics.mjs','server/work-summary.mjs','server/async-task-state.mjs','runtime/test-hooks.mjs'];
    for(const file of files) {
      const {stdout}=await promisify(execFile)('git',['show','6921dbd18de153020c87e4438eebe5260762fee0:app/'+file],{cwd:repo,encoding:'buffer'});
      const dest=path.join(code,file);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,stdout);
    }
    const {RuntimeStore:Old}=await import(pathToFileURL(path.join(code,'server/store.mjs')).href);
    oldStore=await new Old({dataDir:data}).open();
    await oldStore.createSession({id:randomUUID(),scope:'global',projectId:null,title:'Synthetic global',workspaceDir:path.join(dir,'ws'),permissionMode:'ask'});
    await oldStore.setProviderConfig({provider:'fake-openai-loopback',model:'fake-local-model',api:'openai-completions',reasoningEffort:'off'});
    await oldStore.close();const raw=await readFile(path.join(data,'runtime-state.json'));
    store=await new RuntimeStore({dataDir:data}).open();assert.equal(store.state.schemaVersion,9);assert.equal(store.getProviderConfig().reasoningEffort,'off');assert.equal(store.listSessions()[0].scope,'global');await store.close();
    const upgraded=await readFile(path.join(data,'runtime-state.json'));
    await assert.rejects(new Old({dataDir:data}).open(),/schemaVersion 9 is not supported/);assert.deepEqual(await readFile(path.join(data,'runtime-state.json')),upgraded);
    const digest=createHash('sha256').update(raw).digest('hex'),backup=await readFile(path.join(data,`runtime-state.schema7.${digest}.json`));assert.deepEqual(backup,raw);
    await mkdir(restore);await writeFile(path.join(restore,'runtime-state.json'),backup);
    oldStore=await new Old({dataDir:restore}).open();assert.equal(oldStore.state.schemaVersion,7);await oldStore.close();
  }finally{await store?.close();await oldStore?.close();await rm(dir,{recursive:true,force:true});}
});

test('mailbox pagination preserves ordered identities and refuses duplicate or oversized queries',async()=>{
  const f=await fixture();try{
    for(let n=0;n<21;n++)await f.c.send(f.input({messageId:`page-${n}`}));
    const first=f.c.readMailbox(f.tb.id,new URLSearchParams('offset=0&limit=20'));
    assert.equal(first.messages.length,20);assert.equal(first.nextOffset,20);assert.equal(first.total,21);
    const second=f.c.readMailbox(f.tb.id,new URLSearchParams('offset=20&limit=20'));assert.equal(second.messages[0].id,'page-20');assert.equal(second.nextOffset,null);
    assert.throws(()=>f.c.readMailbox(f.tb.id,new URLSearchParams('limit=21')));
    assert.throws(()=>f.c.readMailbox(f.tb.id,new URLSearchParams('offset=0&offset=1')));
  }finally{await f.close();}
});
