import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
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
  // A global Attention conversation and a store-level Run: the two inputs the
  // runtime guards in enqueue() need. The Run is the host-supplied origin a
  // model call would carry; making it here is what lets a test reach guards
  // that the model tool composition never offers a bound Session.
  const makeGlobalSession=()=>store.createSession({id:randomUUID(),scope:'global',projectId:null,title:'Attention',workspaceDir:path.join(dir,randomUUID()),permissionMode:'ask'});
  const makeRun=async sessionId=>(await store.createRun({sessionId,input:'synthetic',adapterId:'test-adapter',provider:{provider:'fake-openai-loopback',model:'fake-model',api:'openai-completions',realProvider:false},commandId:randomUUID(),credentialGeneration:0})).run;
  return {dir,store,c,a,b,ta,tb,input,makeSession,makeGlobalSession,makeRun,project,async close(){await store.close();await rm(dir,{recursive:true,force:true});}};
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
    // (1) 同一条 replyTo 被重复消费。
    await assert.rejects(f.c.send(f.input({kind:'reply',replyTo:first.id})),{code:'coordination_binding'});
    // (2) 同向：指向目标线最新的一条本方向已投递消息，从未被任何回复消费过。
    const sameDirection=await f.c.send(f.input({text:'Latest same-direction message'}));
    assert.equal(sameDirection.status,'delivered');
    assert.equal(sameDirection.sourceThreadId,f.ta.id);assert.equal(sameDirection.targetThreadId,f.tb.id);
    await assert.rejects(f.c.send(f.input({kind:'reply',replyTo:sameDirection.id})),{code:'coordination_binding',message:/Reply origin unavailable/});
    // (3) 反向但未投递：血缘要求的是 delivered，不是"存在过"。
    const queued=await f.c.enqueue(f.input({sourceThreadId:f.tb.id,targetThreadId:f.ta.id,sourceSessionId:f.b.id,text:'Never delivered'}));
    assert.equal(queued.status,'queued');
    await assert.rejects(f.c.send(f.input({kind:'reply',replyTo:queued.id})),{code:'coordination_binding',message:/Reply origin unavailable/});
    // (4) 根本不存在的 ID。
    await assert.rejects(f.c.send(f.input({kind:'reply',replyTo:'message-does-not-exist'})),{code:'coordination_binding',message:/Reply origin unavailable/});
    // 四个反例都没有落地成消息：只有开头两条真消息与 (3) 的 queued。
    assert.equal(f.store.snapshot().coordination.messages.filter(m=>m.kind==='reply').length,1);
  }finally{await f.close();}
});

test('global Attention directory spans scopes; it never yields another mailbox body or membership',async()=>{
  const f=await fixture();try{
    await f.c.send(f.input({text:'Body that must not leak into a directory'}));
    const g=await f.makeGlobalSession();
    const tg=await f.c.create({threadId:'thread-global',sessionId:g.id,title:'Attention'});
    assert.deepEqual(tg.scope,{kind:'global',projectId:null,matterId:null});
    const directory=f.c.runtimeDirectory(g.id);
    assert.deepEqual(directory.threads.map(t=>t.id).sort(),['thread-a','thread-b','thread-global']);
    assert.equal(directory.total,3);
    // 目录条目就是那五个字段加 available：既无 sessionIds，也无 creation 回执。
    for(const entry of directory.threads) assert.deepEqual(Object.keys(entry).sort(),['available','id','revision','scope','status','title']);
    const serialized=JSON.stringify(directory);
    assert.equal(serialized.includes('Body that must not leak into a directory'),false);
    assert.equal(serialized.includes(f.a.id),false);
    // 目录可见 ≠ 收件箱可读：全局会话读他线邮箱仍被成员关系挡回。
    assert.throws(()=>f.c.mailbox(f.ta.id,{sessionId:g.id}),{code:'coordination_binding'});
    // 项目会话的目录不因为多了一条全局线而变宽。
    assert.deepEqual(f.c.runtimeDirectory(f.a.id).threads.map(t=>t.id),['thread-a','thread-b']);
  }finally{await f.close();}
});

test('runtime cross-scope sending is Attention-only; a project Run is refused at that guard alone',async()=>{
  const f=await fixture();try{
    const g=await f.makeGlobalSession();
    const tg=await f.c.create({threadId:'thread-global',sessionId:g.id,title:'Attention'});
    const globalRun=await f.makeRun(g.id),projectRun=await f.makeRun(f.a.id);
    // 全局会话跨 scope 发送成功，且落成 runtime 回执（人类权限决定见 HTTP 用例）。
    const sent=await f.c.send(f.input({sourceThreadId:tg.id,targetThreadId:f.tb.id,sourceSessionId:g.id,text:'Attention to project'}),{runId:globalRun.id,callId:'call-global'});
    assert.equal(sent.status,'delivered');assert.equal(sent.actor,'runtime');assert.equal(sent.sourceRunId,globalRun.id);
    // 项目会话跨 scope 发送被拒；错误信息钉住的是跨 scope 那一条守卫，不是别的 binding 检查。
    await assert.rejects(f.c.send(f.input({sourceThreadId:f.ta.id,targetThreadId:tg.id,sourceSessionId:f.a.id,expectedTargetRevision:1}),{runId:projectRun.id,callId:'call-project'}),
      {code:'coordination_binding',message:/Cross-scope runtime messaging requires Attention/});
    // 同 scope 的同一个 Run 仍可发：被拒的是跨 scope，不是这个 Run。
    assert.equal((await f.c.send(f.input(),{runId:projectRun.id,callId:'call-project-same-scope'})).status,'delivered');
    // 人类跨 scope 是合同允许的显式本地操作，不经这条守卫。
    assert.equal((await f.c.send(f.input({sourceThreadId:f.ta.id,targetThreadId:tg.id,sourceSessionId:f.a.id}))).status,'delivered');
    assert.equal(f.store.snapshot().coordination.messages.filter(m=>m.targetThreadId===tg.id).length,1);
  }finally{await f.close();}
});

test('a domain-bound Session cannot message from a Run even with a host-shaped origin',async()=>{
  const f=await fixture();try{
    const bound=await f.makeSession();
    await f.store.bindExtension(bound.id,{extensionId:'evidence-memo',binding:{matterId:'matter-synthetic'}});
    // 绑定先于建线，Thread 才会捕获带 matterId 的 scope；否则挡回的会是成员关系。
    const tbound=await f.c.create({threadId:'thread-bound',sessionId:bound.id,title:'Bound'});
    assert.equal(tbound.scope.matterId,'matter-synthetic');
    const run=await f.makeRun(bound.id);
    await assert.rejects(f.c.enqueue(f.input({sourceThreadId:tbound.id,targetThreadId:f.tb.id,sourceSessionId:bound.id}),{runId:run.id,callId:'call-bound'}),
      {code:'coordination_binding',message:/Bound domain messaging awaits coverage contract/});
    // 同一条消息不带 runtimeOrigin 就是人类操作，合同不在这里限权。
    assert.equal((await f.c.send(f.input({sourceThreadId:tbound.id,targetThreadId:f.tb.id,sourceSessionId:bound.id}))).status,'delivered');
    assert.equal(f.store.snapshot().coordination.messages.filter(m=>m.actor==='runtime').length,0);
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
    await store.close();const file=path.join(dir,'runtime-state.json');const old=JSON.parse(await readFile(file,'utf8'));old.schemaVersion=6;delete old.coordination; delete old.providerConnections;delete old.providerConfigurationPending;delete old.providerConfigVersion;delete old.providerVerifications;
    const raw=Buffer.from(JSON.stringify(old,null,1)+'\n');await writeFile(file,raw);
    store=await new RuntimeStore({dataDir:dir}).open();assert.equal(store.getSession(global.id).scope,'global');assert.equal(store.state.schemaVersion,13);await store.close();
    const hash=createHash('sha256').update(raw).digest('hex');assert.deepEqual(await readFile(path.join(dir,`runtime-state.schema6.${hash}.json`)),raw);
    const bad=JSON.parse(await readFile(file,'utf8'));bad.coordination.messages.push({id:'forged'});await writeFile(file,JSON.stringify(bad));
    await assert.rejects(new RuntimeStore({dataDir:dir}).open());
    assert.equal((await readdir(dir)).filter(n=>n.includes('schema6')).length,1);
  }finally{await store?.close();await rm(dir,{recursive:true,force:true});}
});

const finding=id=>({executionId:id,claims:['claim'],evidenceRefs:['source@1'],artifactRefs:[],conflicts:['unresolved'],gaps:[]});
const spec=()=>({schemaVersion:1,executionId:'child-1',origin:{threadId:'thread-a',sessionId:'session-a',runId:'run-a'},mode:'invoke',input:'Investigate fixture',grant:{actions:['read'],resources:['a'],depth:1},budgetMs:1000,adapter:{id:'fixture',version:'1'}});
const parentGrant={actions:['read'],resources:['a'],depth:1};
/* T6：`conflicts` 是调用方字符串的并集透传，不是本模块检测出来的冲突；本模块
 * 唯一真检测是"同一 executionId 收到互相矛盾的结果"，它抛 `child_conflict`。
 * 下面的断言一直是这两件事，只是名字此前读起来像"检测出冲突"。断言未改。 */
test('child grant monotonically narrows; the reducer passes caller-supplied conflict strings through and refuses contradictory results for one execution ID',()=>{
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

/* WO-MA2-01 · T4 的公用装置：让一次 coordination 写入停在 store 的通用崩溃点上。
 *
 * `Coordination.mutate` 走 `store._mutate` → `store._persist`，而 `_persist`
 * 在"tmp 文件写完"与"rename 就位"之间调 `maybeCrash('store_write', ...)`。
 * 子进程只开 store 与 Coordination，不起 startServer——服务器启动本身就会
 * 持久化（`expireQuestionsForRestart` 无条件 `_mutate`），那会先把崩溃点用掉。
 *
 * 限度：崩溃点的限定词只有 `with-run`/`empty` 两种，它属于 store 的通用写入
 * 路径，不是 coordination 专属崩溃点。这里测到的是"coordination 的写入落在
 * 通用撕裂安全之内"，不能读作"coordination 有自己的崩溃点覆盖"。 */
async function crashDuringCoordinationWrite(dir,body) {
  const appRoot=fileURLToPath(new URL('../',import.meta.url));
  const source=`
    import { RuntimeStore } from ${JSON.stringify(path.join(appRoot,'server/store.mjs'))};
    import { Coordination } from ${JSON.stringify(path.join(appRoot,'harness/coordination.mjs'))};
    const store=await new RuntimeStore({dataDir:${JSON.stringify(dir)}}).open();
    const c=new Coordination(store);
    ${body}
    console.log('SURVIVED');
    await store.close();
  `;
  const child=spawn(process.execPath,['--input-type=module','-e',source],
    {stdio:['ignore','pipe','pipe'],env:{...process.env,SE_TEST_MODE:'1',SE_TEST_CRASH_POINT:'store_write:empty'}});
  let stdout='',stderr='';
  child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
  const [code,signal]=await once(child,'exit');
  assert.equal(signal,'SIGKILL',`writer did not die at the crash point: code=${code} stdout=${stdout} stderr=${stderr}`);
  assert.equal(stdout.includes('SURVIVED'),false);
  return {stdout,stderr};
}
/** 两个 T4 用例共用的起始状态：两条线、无 Run，store 已关闭交给子进程。 */
async function tornWriteFixture(prefix) {
  const dir=await mkdtemp(path.join(tmpdir(),prefix));
  const store=await new RuntimeStore({dataDir:dir}).open();
  const project=await store.createProject('synthetic');
  const c=new Coordination(store);
  const sessions=[];
  for(const title of ['A','B']) sessions.push(await store.createSession({projectId:project.id,title,workspaceDir:path.join(dir,randomUUID()),permissionMode:'ask'}));
  await c.create({threadId:'a',sessionId:sessions[0].id,title:'A'});
  await c.create({threadId:'b',sessionId:sessions[1].id,title:'B'});
  const input={messageId:'torn-message',sourceThreadId:'a',targetThreadId:'b',sourceSessionId:sessions[0].id,
    expectedTargetRevision:1,kind:'request',text:'Torn write fixture',replyTo:null};
  return {dir,store,c,input};
}
/** 崩溃后重开：状态字节要能通过完整校验，半截 tmp 要被明确丢弃并记账。 */
async function reopenAfterCrash(dir) {
  assert.equal((await readdir(dir)).some(name=>name.startsWith('runtime-state.json.')&&name.endsWith('.tmp')),true,
    'no half-written tmp file: the crash did not land between write and rename');
  const logs=[];
  const store=await new RuntimeStore({dataDir:dir,logger:line=>logs.push(line)}).open();
  assert.equal(store.state.schemaVersion,13);
  assert(logs.some(line=>/discarded 1 incomplete state write/.test(line)),`crash was not disclosed: ${JSON.stringify(logs)}`);
  return {store,c:new Coordination(store),logs};
}

test('a crash inside the enqueue write leaves no half message; the same key then sends exactly once',async()=>{
  const f=await tornWriteFixture('cw-coordination-torn-enqueue-');
  let store;
  try{
    await f.store.close();
    await crashDuringCoordinationWrite(f.dir,`await c.enqueue(${JSON.stringify(f.input)});`);
    const reopened=await reopenAfterCrash(f.dir);store=reopened.store;
    // rename 从未发生，所以这次入队整条都不在：既没有半条，也没有幽灵回执。
    assert.deepEqual(store.snapshot().coordination.messages,[]);
    const first=await reopened.c.send(f.input);
    assert.equal(first.status,'delivered');
    assert.deepEqual(await reopened.c.send(f.input),first);
    assert.equal(reopened.c.mailbox('b').messages.length,1);
    assert.equal(reopened.c.mailbox('b').messages[0].id,'torn-message');
    await store.close();
    const again=await new RuntimeStore({dataDir:f.dir}).open();store=again;
    assert.equal(new Coordination(again).mailbox('b').messages.length,1);
  }finally{await store?.close().catch(()=>{});await f.store.close().catch(()=>{});await rm(f.dir,{recursive:true,force:true});}
});

test('a crash inside the delivery write keeps the message queued; recovery then delivers it exactly once',async()=>{
  const f=await tornWriteFixture('cw-coordination-torn-deliver-');
  let store;
  try{
    const queued=await f.c.enqueue(f.input);
    assert.equal(queued.status,'queued');
    await f.store.close();
    await crashDuringCoordinationWrite(f.dir,`await c.deliver(${JSON.stringify(f.input.messageId)});`);
    const reopened=await reopenAfterCrash(f.dir);store=reopened.store;
    const messages=store.snapshot().coordination.messages;
    assert.equal(messages.length,1);
    assert.equal(messages[0].status,'queued');assert.equal(messages[0].revision,1);assert.equal(messages[0].deliveredAt,null);
    // 收件箱在 delivered 之前不显示来件：撕裂没有让半条投递可见。
    assert.equal(reopened.c.mailbox('b').messages.length,0);
    await reopened.c.recover();
    assert.equal(reopened.c.mailbox('b').messages.length,1);
    assert.equal(reopened.c.mailbox('b').messages[0].status,'delivered');
    assert.equal(store.snapshot().coordination.messages.length,1);
    // 原键重发拿回的是同一条留存回执，不是第二条消息。
    assert.deepEqual(await reopened.c.send(f.input),store.snapshot().coordination.messages[0]);
    assert.equal(store.snapshot().coordination.messages.length,1);
  }finally{await store?.close().catch(()=>{});await f.store.close().catch(()=>{});await rm(f.dir,{recursive:true,force:true});}
});

/* T6：本用例的 kill 发生在 `enqueue()` 的 promise 决议之后，持久化已经完成，
 * 因此它测的是"干净重启后的重投递"，不是写入中途撕裂——撕裂由上面两个 T4
 * 用例覆盖。名称写明这一点，免得被外推成"崩溃安全"。 */
test('clean restart after the outbox write completed recovers exactly one local delivery without a Run',async()=>{
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

test('global Attention crosses scope through the model tool, still spending exactly one exact-argument decision',async()=>{
  const h=await boot();try{
    const g=(await h.api('POST','/attention/conversations',{conversationId:randomUUID()})).json.session;
    const b=await h.createSession();
    assert.equal(g.scope,'global');assert.equal(g.projectId,null);assert.equal(b.projectId,h.projectId);
    for(const [id,s] of [['attention',g],['project',b]])
      assert.equal((await h.api('POST','/coordination/threads',{threadId:id,sessionId:s.id,title:id})).status,200);
    // 全局会话的模型目录跨 scope 可见；项目会话看不到全局线。
    assert.deepEqual(h.runtime.service.coordination.runtimeDirectory(g.id).threads.map(t=>t.id),['attention','project']);
    assert.deepEqual(h.runtime.service.coordination.runtimeDirectory(b.id).threads.map(t=>t.id),['project']);
    const text='Synthetic cross-scope request';
    const command=await h.api('POST',`/sessions/${g.id}/runs`,{commandId:randomUUID(),
      input:h.scriptInput([{name:'message_other_agent',arguments:{target_thread_id:'project',expected_target_revision:1,kind:'request',text}}])});
    assert.equal(command.status,200,JSON.stringify(command.json));
    const pending=await h.pollRun(command.json.run.id,{until:s=>s==='waiting_user'});
    // 跨 scope 不是自动通过：决定之前收件箱里什么都没有。
    assert.equal(h.runtime.store.snapshot().coordination.messages.length,0);
    const question=h.runtime.store.snapshot().questions.find(q=>q.runId===pending.id&&q.status==='pending');
    assert.equal(question.payload.tool,'message_other_agent');
    assert.equal(question.payload.preview.includes(text)&&question.payload.preview.includes('project'),true);
    assert.equal((await h.api('POST',`/runs/${pending.id}/questions/${question.id}`,{decision:'allow'})).status,200);
    await h.pollRun(pending.id);
    const messages=h.runtime.store.snapshot().coordination.messages;
    assert.equal(messages.length,1);assert.equal(messages[0].status,'delivered');assert.equal(messages[0].actor,'runtime');
    assert.equal(messages[0].sourceThreadId,'attention');assert.equal(messages[0].targetThreadId,'project');
    // 一次发送就是一次决定，收件人也没有被叫醒。
    assert.equal(h.runtime.store.snapshot().questions.length,1);
    assert.equal(h.runtime.store.listRuns().some(r=>r.sessionId===b.id),false);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('domain-bound Sessions receive no coordination tool at either composition site',async()=>{
  const captured=[];
  const h=await boot({fakeResponder:({body})=>{captured.push((body.tools??[]).map(t=>t.function?.name??t.name));}});
  try{
    assert.equal((await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'})).status,200);
    const bound=await h.createSession(),free=await h.createSession();
    assert.equal((await h.api('POST',`/sessions/${bound.id}/extension`,{extensionId:'evidence-memo',
      input:{title:'MA2 binding fixture',sourceText:'Alpha beta gamma delta.'}})).status,200);
    for(const [id,s] of [['bound',bound],['free',free]])
      assert.equal((await h.api('POST','/coordination/threads',{threadId:id,sessionId:s.id,title:id})).status,200);
    // 两个会话都确有当前 Thread：差别只在 domain 绑定这一项。
    assert.equal(h.runtime.service.coordination.list(bound.id).currentThreadId,'bound');
    assert.equal(h.runtime.service.coordination.list(free.id).currentThreadId,'free');
    assert.equal(h.runtime.store.getSession(bound.id).extensionBinding.extensionId,'evidence-memo');
    const names=['thread_directory','thread_mailbox','message_other_agent'];
    // 组合面之一：inspector 报告的资源表。
    const boundControl=(await h.api('GET',`/runtime-control?sessionId=${bound.id}`)).json;
    const freeControl=(await h.api('GET',`/runtime-control?sessionId=${free.id}`)).json;
    for(const name of names){
      assert.equal(boundControl.resources.some(r=>r.id==='tool:'+name),false,`bound session was offered ${name}`);
      assert.equal(freeControl.resources.some(r=>r.id==='tool:'+name),true,`unbound session lost ${name}`);
    }
    // 组合面之二：逐 Run 真正交给模型的工具表，取自 fake provider 收到的请求体。
    async function toolsOfRun(sessionId){
      captured.length=0;
      const created=await h.api('POST',`/sessions/${sessionId}/runs`,{commandId:randomUUID(),input:h.scriptInput([])});
      assert.equal(created.status,200,JSON.stringify(created.json));
      const run=await h.pollRun(created.json.run.id,{timeoutMs:20_000});
      assert.equal(run.status,'completed',JSON.stringify(run.error));
      const offered=captured.flat();assert(offered.length>0,'the provider saw no tool list at all');
      return offered;
    }
    const boundTools=await toolsOfRun(bound.id),freeTools=await toolsOfRun(free.id);
    for(const name of names){
      assert.equal(boundTools.includes(name),false,`bound Run was composed with ${name}`);
      assert.equal(freeTools.includes(name),true,`unbound Run lost ${name}`);
    }
    assert(boundTools.includes('se_read_source'),'the bound Run should still receive its own domain tools');
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
    store=await new RuntimeStore({dataDir:data}).open();assert.equal(store.state.schemaVersion,13);assert.equal(store.getProviderConfig().reasoningEffort,'off');assert.equal(store.listSessions()[0].scope,'global');await store.close();
    const upgraded=await readFile(path.join(data,'runtime-state.json'));
    await assert.rejects(new Old({dataDir:data}).open(),/schemaVersion 13 is not supported/);assert.deepEqual(await readFile(path.join(data,'runtime-state.json')),upgraded);
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
