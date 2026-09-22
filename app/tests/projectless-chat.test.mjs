import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID, createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {boot, reopen} from './helpers.mjs';
import {RuntimeStore} from '../server/store.mjs';
import {Coordination} from '../harness/coordination.mjs';
import {projectSessionOptions,sameScope,projectDirectory} from '../web/coordination-projection.mjs';
import {toWorkCards} from '../web/presentation-adapters.mjs';
const ok = r => {assert.equal(r.status,200,JSON.stringify(r.json));return r.json;};

test('unassigned chats run with ordinary tools, isolated files/configuration, and restore by Session ID',async()=>{
 const h=await boot();let reopened;
 try{
  const id=randomUUID();
  const [receipt,replayed]=await Promise.all([h.api('POST','/sessions',{sessionId:id,title:'First message'}),h.api('POST','/sessions',{sessionId:id,title:'First message'})]);
  const a=ok(receipt).session;assert.equal(ok(replayed).session.id,a.id);
  assert.equal(ok(await h.api('POST','/sessions',{sessionId:id,title:'Must not rename'})).session.title,'First message');
  assert.equal((await h.api('POST','/sessions',{sessionId:id,projectId:h.projectId})).status,409);
  assert.equal((await h.api('POST','/sessions',{scope:'global'})).status,400);
  const b=ok(await h.api('POST','/sessions',{projectId:null,title:'Another message'})).session;
  assert.equal(a.scope,'unassigned');assert.equal(a.projectId,null);assert.notEqual(a.id,b.id);assert.notEqual(a.workspaceDir,b.workspaceDir);
  const p=await h.createSession();assert.equal(p.scope,'project');
  assert.equal((await h.api('POST','/sessions',{projectId:'missing'})).status,404);
  const attention=ok(await h.api('POST','/attention/conversations',{conversationId:randomUUID()})).session;
  const config=ok(await h.api('GET',`/runtime-control?sessionId=${a.id}`));
  assert.deepEqual(config.scopes,[{type:'user',id:'local'},{type:'session',id:a.id}]);
  assert(!config.resources.some(r=>r.id==='tool:attention_projects'||r.id==='tool:memory_read'));
  const ordinary=ok(await h.api('GET',`/runtime-control?sessionId=${p.id}`));
  ok(await h.api('PUT',`/runtime-control?sessionId=${p.id}`,{revision:ordinary.revision,operation:'policy',scope:{type:'workspace',id:p.projectId},rules:[{action:'ws.read',resource:'*',effect:'deny'}]}));
  assert.equal((await h.api('POST',`/sessions/${a.id}/extension`,{extensionId:'inbound-nda',input:{}})).status,409);
  const body={name:'context.txt',text:'only in A',commandId:randomUUID(),expectedRevision:0};
  assert.equal(ok(await h.api('POST',`/sessions/${a.id}/materials`,body)).workspaceState,'written');
  assert.equal(ok(await h.api('GET',`/sessions/${b.id}/materials`)).sources.length,0);
  const created=ok(await h.api('POST',`/sessions/${a.id}/runs`,{input:h.scriptInput([{name:'ws_read',arguments:{path:'materials/context.txt'}}]),commandId:randomUUID()}));
  const run=await h.pollRun(created.run.id);assert.equal(run.status,'completed',JSON.stringify(run.error));
  const snapshot=ok(await h.api('GET',`/sessions/${a.id}`));
  assert(snapshot.events.some(e=>e.type==='tool.result'&&JSON.stringify(e.data).includes('only in A')));
  assert.equal(snapshot.events.find(e=>e.type==='runtime.bound').data.sessionScope.kind,'unassigned');
  const sessions=ok(await h.api('GET','/sessions')).sessions;assert.equal(sessions[0].id,a.id);
  assert(sessions.find(s=>s.id===a.id).recordedActivityAt>=run.endedAt);
  assert.equal(ok(await h.api('GET','/attention/conversations')).sessions.some(s=>s.id===a.id),false);
  assert.equal(ok(await h.api('GET',`/sessions?projectId=${p.projectId}`)).sessions.some(s=>s.id===a.id),false);
  ok(await h.api('PUT',`/sessions/${a.id}/draft`,{text:'unsent draft'}));
  await h.runtime.close();reopened=await reopen(h.dataDir);
  const recovered=ok(await reopened.api('GET',`/sessions/${a.id}`));
  assert.equal(recovered.session.id,a.id);assert.equal(recovered.session.projectId,null);assert.equal(recovered.session.workspaceDir,a.workspaceDir);
  assert.equal(recovered.session.draft,'unsent draft');assert.equal(recovered.runs[0].id,run.id);
  assert.equal(ok(await reopened.api('GET',`/sessions/${attention.id}`)).session.scope,'global');
 }finally{await (reopened?.runtime||h.runtime).close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('unassigned coordination scope does not merge all null-project conversations',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'cw-unassigned-thread-'));const store=await new RuntimeStore({dataDir}).open();
 try{
  const a=await store.createSession({scope:'unassigned',projectId:null,title:'A',workspaceDir:path.join(dataDir,'a')});
  const b=await store.createSession({scope:'unassigned',projectId:null,title:'B',workspaceDir:path.join(dataDir,'b')});
  const c=new Coordination(store);
  const t=await c.create({threadId:randomUUID(),sessionId:a.id,title:'A thread'});
  assert.equal(t.scope.sessionId,a.id);
  const options=projectSessionOptions({sessions:[a,b]});assert(options);assert(!sameScope(options[0].scope,options[1].scope));
  assert(projectDirectory(c.list(a.id)));
  await assert.rejects(c.attach(t.id,{sessionId:b.id,expectedRevision:1}),{code:'coordination_binding'});
  assert.equal(c.runtimeDirectory(b.id).threads.length,0);
 }finally{await store.close();await rm(dataDir,{recursive:true,force:true});}
});

test('schema13 upgrades byte-backed identities and configuration without resetting declared capabilities or CAS',async()=>{
 const dataDir=await mkdtemp(path.join(tmpdir(),'cw-projectless-schema-'));let store=await new RuntimeStore({dataDir}).open();
 try{
  const p=await store.createProject('existing');const s=await store.createSession({projectId:p.id,title:'kept',workspaceDir:path.join(dataDir,'ws')});
  await store.setDraft(s.id,'kept');await store.close();
  const file=path.join(dataDir,'runtime-state.json');const prior=JSON.parse(await readFile(file,'utf8'));prior.schemaVersion=13; delete prior.operations; prior.sessions.forEach(session => { delete session.remoteBinding; delete session.remoteActions; }); prior.runs.forEach(run => { delete run.remoteBinding; }); delete prior.subagents;prior.sessions.forEach(session=>{delete session.repositoryBinding;delete session.repositoryBindingRevision;delete session.repositoryBindingCommands;delete session.repositoryCandidate;delete session.repositoryCandidateRevision;delete session.repositoryCandidateCommands;delete session.repositoryWriteEffects;});prior.runs.forEach(run=>{delete run.repositoryBindingSnapshot;delete run.repositoryCandidateSnapshot;});prior.providerConfigVersion=17;
  const bytes=Buffer.from(JSON.stringify(prior)+'\n');await writeFile(file,bytes);
  store=await new RuntimeStore({dataDir}).open();assert.equal(store.state.schemaVersion,19);assert.equal(store.state.providerConfigVersion,17);
  assert.deepEqual(store.getSession(s.id),{...s,draft:'kept',repositoryCandidate:null,repositoryCandidateRevision:0,repositoryCandidateCommands:[],repositoryWriteEffects:[]});
  const backup=path.join(dataDir,`runtime-state.schema13.${createHash('sha256').update(bytes).digest('hex').slice(0,16)}.json`);
  // Locate the exact backup by its documented digest name, allowing the owner's full digest.
  const {readdir}=await import('node:fs/promises');const name=(await readdir(dataDir)).find(n=>n.startsWith('runtime-state.schema13.'));
  assert(name);assert.deepEqual(await readFile(path.join(dataDir,name)),bytes);
  await store.close();
  const corrupt=JSON.parse(await readFile(file,'utf8'));corrupt.sessions[0].scope='unassigned';await writeFile(file,JSON.stringify(corrupt));
  await assert.rejects(new RuntimeStore({dataDir}).open(),/cannot own a project/);
 }finally{await store.close();await rm(dataDir,{recursive:true,force:true});}
});


test('summary labels use explicit Session scope, never null project as Attention authority',()=>{
 const summary={sessionCandidates:{items:[{sessionId:'a',title:'a',projectId:null,scope:'unassigned'},{sessionId:'b',title:'b',projectId:null,scope:'global'},{sessionId:'c',title:'c',projectId:null}]}};
 assert.deepEqual(toWorkCards(summary,[]).items.map(i=>i.projectName),['No project','Global Attention',null]);
});
