import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { boot } from './helpers.mjs';
import { RuntimeStore } from '../server/store.mjs';
import { createAttentionTools } from '../runtime/attention-tools.mjs';
import { createAttentionConversation } from '../web/attention-conversation.mjs';
const ok = response => { assert.equal(response.status, 200, JSON.stringify(response.json)); return response.json; };

test('global Attention has replayable identity, shared configuration and a real governed Run', async () => {
  const h = await boot();
  try {
    const id = randomUUID();
    const [a,b] = await Promise.all([h.api('POST','/attention/conversations',{conversationId:id}),h.api('POST','/attention/conversations',{conversationId:id})]);
    assert.equal(ok(a).session.id, id); assert.equal(ok(b).session.id, id);
    assert.equal(a.json.session.projectId, null); assert.equal(a.json.session.scope, 'global'); assert.equal(a.json.session.permissionMode, 'ask');
    ok(await h.api('PUT',`/sessions/${id}/draft`,{text:'keep this draft'}));
    assert.equal(ok(await h.api('POST','/attention/conversations',{conversationId:id})).session.draft,'keep this draft');
    const projectSession = await h.createSession();
    assert.equal((await h.api('POST','/attention/conversations',{conversationId:projectSession.id})).status,409);
    assert.equal((await h.api('POST',`/sessions/${id}/extension`,{extensionId:'inbound-nda',input:{}})).status,409);
    const control = ok(await h.api('GET',`/runtime-control?sessionId=${id}`));
    assert.deepEqual(control.scopes.map(s=>s.type),['user','agent','session']);
    assert(control.resources.some(r=>r.id==='tool:memory_read' && r.exposed));
    const projectControl = ok(await h.api('GET',`/runtime-control?sessionId=${projectSession.id}`));
    assert(!projectControl.resources.some(r=>r.id==='tool:memory_read'));
    assert.equal((await h.api('PUT',`/runtime-control?sessionId=${projectSession.id}`,{revision:control.revision,operation:'policy',scope:{type:'agent',id:'attention'},rules:[]})).status,400);
    ok(await h.api('PUT',`/runtime-control?sessionId=${id}`,{revision:control.revision,operation:'exposure',id:'tool:memory_read',scope:{type:'agent',id:'attention'},exposed:false}));
    const second = ok(await h.api('POST','/attention/conversations',{conversationId:randomUUID()})).session;
    assert.equal(ok(await h.api('GET',`/runtime-control?sessionId=${second.id}`)).resources.find(r=>r.id==='tool:memory_read').exposed,false);
    const created = ok(await h.api('POST',`/sessions/${id}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name:'attention_projects',arguments:{}}])}));
    const run = await h.pollRun(created.run.id); assert.equal(run.status,'completed',JSON.stringify(run.error));
    const snapshot = ok(await h.api('GET',`/sessions/${id}`));
    assert(snapshot.events.some(e=>e.type==='tool.result' && JSON.stringify(e.data).includes(h.projectId)));
    assert.equal(snapshot.events.find(e=>e.type==='runtime.bound').data.sessionScope.kind,'global');
    const list = ok(await h.api('GET','/attention/conversations'));
    assert.equal(list.sessions.length,2); assert(list.sessions.every(s=>s.scope==='global'));
    const metricsAll = ok(await h.api('GET','/work-activity?days=1'));
    const metricsProject = ok(await h.api('GET',`/work-activity?days=1&projectId=${h.projectId}`));
    assert.equal(metricsAll.recordedRunCount,1); assert.equal(metricsProject.recordedRunCount,0);
  } finally { await h.runtime.close(); await rm(h.dataDir,{recursive:true,force:true}); }
});

test('progressive memory lists metadata, excludes drafts/tools and binds exact message text', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const created=ok(await h.api('POST',`/sessions/${session.id}/runs`,{input:'remember the synthetic meeting',commandId:randomUUID()}));
    await h.pollRun(created.run.id);
    ok(await h.api('PUT',`/sessions/${session.id}/draft`,{text:'unsent secret draft'}));
    const tools = createAttentionTools({store:h.runtime.store});
    const list=tools.find(t=>t.name==='memory_list'), read=tools.find(t=>t.name==='memory_read');
    const sources=(await list.execute('l',{})).details;
    assert(!JSON.stringify(sources).includes('unsent secret draft')); assert(!JSON.stringify(sources).includes('remember the synthetic meeting'));
    const messages=(await list.execute('l',{session_id:session.id})).details;
    assert(messages.items.length>=2); assert(messages.items.every(m=>!Object.hasOwn(m,'text')));
    const identity=messages.items.find(m=>m.role==='user');
    const args={session_id:session.id,event_seq:identity.eventSeq,sha256:identity.sha256,offset:0,limit:8};
    const page=(await read.execute('r',args)).details; assert.equal(page.text,'remember'); assert.equal(page.nextOffset,8);
    await assert.rejects(read.execute('r',{...args,sha256:'0'.repeat(64)}),/unavailable or changed/);
    const bound=h.runtime.store.listEvents({sessionId:session.id}).find(e=>e.type==='runtime.bound');
    await assert.rejects(read.execute('r',{...args,event_seq:bound.seq}),/unavailable/);
    await h.runtime.store.deleteSession(session.id);
    await assert.rejects(read.execute('r',args),/unavailable/);
  } finally { await h.runtime.close(); await rm(h.dataDir,{recursive:true,force:true}); }
});

test('schema5 with retained records migrates exactly and global/project invariants reject corruption', async () => {
  const dataDir=await mkdtemp(path.join(tmpdir(),'cw-attention-migrate-'));
  let store;
  try {
    store=await new RuntimeStore({dataDir}).open(); const project=await store.createProject('fixture');
    const session=await store.createSession({projectId:project.id,title:'fixture',workspaceDir:path.join(dataDir,'ws')});
    await store.setDraft(session.id,'old draft'); await store.close();
    const file=path.join(dataDir,'runtime-state.json'); const old=JSON.parse(await readFile(file,'utf8'));
    old.schemaVersion=5; delete old.coordination; old.sessions.forEach(s=>delete s.scope); const bytes=Buffer.from(JSON.stringify(old,null,1)+'\n'); await writeFile(file,bytes);
    store=await new RuntimeStore({dataDir}).open(); assert.equal(store.state.schemaVersion,9); assert.equal(store.getSession(session.id).scope,'project');
    const digest=createHash('sha256').update(bytes).digest('hex'); assert.deepEqual(await readFile(path.join(dataDir,`runtime-state.schema5.${digest}.json`)),bytes);
    assert.equal(store.getSession(session.id).draft,'old draft');
    const global=await store.createSession({scope:'global',projectId:null,title:'Attention',workspaceDir:path.join(dataDir,'global')});
    await assert.rejects(store.bindExtension(global.id,{extensionId:'x',binding:{}}),/global/);
    await store.close();
    const bad=JSON.parse(await readFile(file,'utf8'));bad.sessions.find(s=>s.id===global.id).projectId=project.id;await writeFile(file,JSON.stringify(bad));
    await assert.rejects(new RuntimeStore({dataDir}).open(),/global session/);
  } finally { await store?.close(); await rm(dataDir,{recursive:true,force:true}); }
});

test('conversation retry preserves creation identity and exact Run command after a lost receipt', async () => {
  const calls=[];let saved,run,lose=true;
  const request=async(path,options={})=>{
    calls.push({path,body:structuredClone(options.body)});
    if(path==='/attention/conversations' && options.method==='POST') { saved={id:options.body.conversationId,scope:'global',projectId:null};return {session:saved}; }
    if(path.endsWith('/draft'))return {saved:true};
    if(path.endsWith('/runs')) { if(lose){lose=false;throw new Error('lost receipt');} run={id:'r',sessionId:saved.id,commandId:options.body.commandId,status:'completed'};return {run}; }
    if(path==='/attention/conversations')return {schemaVersion:1,scope:'global',sessions:saved?[saved]:[]};
    return {session:saved,events:[],runs:run?[run]:[],lastSeq:0};
  };
  const c=createAttentionConversation({request});c.setDraft('hello');await c.send();const pending=structuredClone(c.state.command);assert(pending);
  await c.send();assert.equal(c.state.command,null);assert.equal(c.state.draft,'');
  assert.equal(calls.filter(c=>c.path==='/attention/conversations' && c.body).length,1);
  assert.deepEqual(calls.filter(c=>c.path.endsWith('/runs')).map(c=>c.body),[pending,pending]);
});

test('closing during send keeps its receipt and restores the finished conversation on reopen', async () => {
  let release, saved, run;
  const gate = new Promise(resolve => { release = resolve; });
  const request = async (path, options = {}) => {
    if (options.method === 'POST' && path === '/attention/conversations') {
      await gate; saved = {id:options.body.conversationId, scope:'global', projectId:null}; return {session:saved};
    }
    if (path.endsWith('/draft')) return {};
    if (path.endsWith('/runs')) { run = {id:'r',sessionId:saved.id,commandId:options.body.commandId,status:'completed'}; return {run}; }
    if (path === '/attention/conversations') return {schemaVersion:1,scope:'global',sessions:saved?[saved]:[]};
    return {session:saved,events:[],runs:run?[run]:[],lastSeq:0};
  };
  const c = createAttentionConversation({request}); c.setDraft('retained operation');
  const sending = c.send(); c.deactivate(); release(); await sending; await c.refresh();
  assert.equal(c.state.command,null); assert.equal(c.state.draft,''); assert.equal(c.state.runs[0].status,'completed');
});

test('a delayed history choice cannot replace the newer conversation or draft', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const sessions = ['a','b'].map(id => ({id,scope:'global',projectId:null,draft:`saved ${id}`}));
  const request = async path => {
    if (path === '/attention/conversations') return {schemaVersion:1,scope:'global',sessions};
    const id = path.split('/').at(-1); if (id === 'a') await gate;
    return {session:sessions.find(s=>s.id===id),events:[],runs:[],lastSeq:0};
  };
  const c = createAttentionConversation({request}); const first = c.choose('a');
  await Promise.resolve(); await Promise.resolve(); await c.choose('b'); c.setDraft('current b'); release(); await first;
  assert.equal(c.state.conversationId,'b'); assert.equal(c.state.session.id,'b'); assert.equal(c.state.draft,'current b');
});

test('conversation rename persists metadata without changing history, scope or draft', async () => {
  const h = await boot();
  try {
    const id = randomUUID();
    ok(await h.api('POST', '/attention/conversations', {conversationId:id}));
    ok(await h.api('PUT', `/sessions/${id}/draft`, {text:'retained draft'}));
    const before = ok(await h.api('GET', `/sessions/${id}`));
    const renamed = ok(await h.api('PATCH', `/sessions/${id}`, {title:'Research notes'})).session;
    assert.equal(renamed.title, 'Research notes'); assert.equal(renamed.scope,'global'); assert.equal(renamed.projectId,null);
    const after = ok(await h.api('GET', `/sessions/${id}`));
    assert.equal(after.session.draft,'retained draft'); assert.deepEqual(after.events,before.events); assert.deepEqual(after.runs,before.runs);
    assert.equal(ok(await h.api('GET','/attention/conversations')).sessions[0].title,'Research notes');
    for (const body of [{title:''},{title:' '.repeat(2)},{title:'x'.repeat(201)},{title:'x',scope:'project'}]) assert.equal((await h.api('PATCH',`/sessions/${id}`,body)).status,400);
    assert.equal((await h.api('PATCH',`/sessions/${randomUUID()}`,{title:'x'})).status,404);
    assert.equal(h.runtime.store.getSession(id).title,'Research notes');
  } finally { await h.runtime.close(); await rm(h.dataDir,{recursive:true,force:true}); }
});
