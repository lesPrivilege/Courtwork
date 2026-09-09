import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RuntimeStore } from '../server/store.mjs';
import { Coordination } from '../harness/coordination.mjs';
import { executeChild, narrowGrant, reduceFindings } from '../harness/child-execution.mjs';
import { boot, spawnWorker } from './helpers.mjs';

async function fixture() {
  const dir=await mkdtemp(path.join(tmpdir(),'cw-coordination-'));
  const store=await new RuntimeStore({dataDir:dir}).open(), c=new Coordination(store);
  const project=await store.createProject({name:'synthetic'});
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
    assert.equal(f.store.listRuns().length,0);assert.equal(f.store.listEvents().length,0);
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
    store=await new RuntimeStore({dataDir:dir}).open();assert.equal(store.getSession(global.id).scope,'global');assert.equal(store.state.schemaVersion,7);await store.close();
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
