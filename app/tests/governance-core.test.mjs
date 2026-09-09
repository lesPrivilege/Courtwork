import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { CoreClient } from '../core/client.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const human = (project = 'p') => ({ actor: 'local-user', project_id: project, purpose: 'human-governance', execution: null });
const runtime = (project = 'p', adapter = 'adapter') => ({ actor: 'runtime', project_id: project, purpose: 'attention-runtime', execution: { adapter_id: adapter, session_id: 'session', run_id: 'run' } });
const ref = (id = 'm', kind = 'matter', project = 'p') => ({ project_id: project, kind, id });
const grant = (fields = ['registry','details','sources','artifacts']) => ({ adapter_id: 'adapter', purpose: 'attention-runtime', fields, expires_at: '2099-01-01T00:00:00Z', content_scope: 'current' });
const query = (core, q, ctx = human()) => core.call('governance_query', { context: ctx, query: { schema_version: 1, ...q } });
const inspect = (core, id = 'm', ctx = human(), kind = 'matter') => query(core, { kind: 'inspect', object_ref: ref(id, kind, ctx.project_id) }, ctx);
const act = (core, request, ctx = human()) => core.call('governance_action', { context: ctx, request });
async function requestFor(core, value = grant(), id = 'm', requestId = 'grant', ctx = human()) {
  const view = value === null ? await query(core, {kind:'policy',object_ref:ref(id,'matter',ctx.project_id)},ctx) : await inspect(core, id, ctx);
  return { schema_version: 1, request_id: requestId, matter_id: id, expected_policy_revision: view.policy.revision, expected_object_version: value === null ? null : view.object_version, grant: value };
}
async function seed(core, id = 'm', project = 'p', text = 'Original 😀 evidence\nNext page') {
  const source = { id: 's-' + id, version: 1, text, digest: hash(text) };
  await core.createMatter({ matterId: id, title: id + ' title', source, contractVersion: 'se-contract-v5.0' });
  await core.call('claim_work', { matter_id: id, project_id: project, extension_id: 'evidence-memo' });
  return source;
}
async function fixture(fn) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-governance-core-'));
  const core = new CoreClient({ dataDir });
  try { await core.start(); await fn(core, dataDir); }
  finally { await core.close(); await rm(dataDir, { recursive: true, force: true }); }
}
function sql(db, source) {
  const r = spawnSync('python3', ['-c', `import sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\n${source}\nc.commit()\nc.close()`, db], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
}

test('governance: policy is separate from Matter, exact replay cannot resurrect revoked disclosure', () => fixture(async core => {
  await seed(core);
  const before = await core.snapshot('m');
  assert.equal((await query(core, { kind: 'registry' }, runtime())).count, 0);
  const request = await requestFor(core);
  const receipt = await act(core, request);
  assert.equal(receipt.policy_revision, 1);
  assert.deepEqual(await act(core, request), receipt);
  await assert.rejects(act(core, { ...request, grant: grant(['registry']) }), { code: 'IDEMPOTENCY_CONFLICT' });
  await assert.rejects(act(core, { ...request, request_id: 'stale' }), { code: 'VERSION_CONFLICT' });
  await assert.rejects(act(core, request, runtime()), { code: 'DISCLOSURE_DENIED' });
  const view = await inspect(core, 'm', runtime());
  assert.equal(view.sources.length, 1);
  assert.equal(view.policy, undefined);
  const revoke = await requestFor(core, null, 'm', 'revoke');
  await act(core, revoke);
  await assert.rejects(inspect(core, 'm', runtime()), { code: 'NOT_FOUND' });
  assert.deepEqual(await act(core, request), receipt);
  assert.equal((await inspect(core)).policy.grant, null);
  assert.equal((await query(core, { kind: 'registry' }, runtime())).count, 0);
  assert.deepEqual(await core.snapshot('m'), before);
  assert.deepEqual((await query(core, { kind: 'policy_request', object_ref: ref(), request_id: 'grant' })).result, receipt);
  assert.equal((await query(core, { kind: 'policy_request', object_ref: ref(), request_id: 'absent' })).result, null);
}));

test('governance: scope and registry-only grant hide bodies, hashes, counts and unknown schemas', () => fixture(async (core, dir) => {
  await seed(core); await seed(core, 'hidden'); await seed(core, 'other', 'q');
  await act(core, await requestFor(core, grant(['registry'])));
  const first = await query(core, { kind: 'registry' }, runtime());
  assert.equal(first.count, 1);
  const view = await inspect(core, 'm', runtime());
  for (const field of ['details','sources','artifact','policy']) assert.equal(field in view, false);
  await core.call('replace_sources', { matter_id: 'm', sources: [{ id: 's-m', version: 2, text: 'Private changed', digest: hash('Private changed') }], revision: 2 });
  assert.equal((await inspect(core, 'm', runtime())).object_version, view.object_version, 'hidden source changes must not affect a registry-only view hash');
  assert.deepEqual(await query(core, { kind: 'registry' }, runtime()), first);
  await assert.rejects(query(core, { kind: 'source', object_ref: ref(), expected_object_version: view.object_version, source_ref: '0'.repeat(64) }, runtime()), { code: 'NOT_FOUND' });
  for (const ctx of [human('q'), runtime('q'), runtime('p','other-adapter')]) {
    await assert.rejects(query(core, { kind: 'inspect', object_ref: ref() }, ctx), { code: 'NOT_FOUND' });
  }
  await assert.rejects(query(core, { kind: 'policy_request', object_ref: ref(), request_id: 'grant' }, runtime()), { code: 'NOT_FOUND' });
  await assert.rejects(act(core, { ...(await requestFor(core, null)), request_id: 'other-scope' }, human('q')), { code: 'NOT_FOUND' });
  await core.close();
  sql(path.join(dir,'state.db'), "c.execute(\"UPDATE matter SET contract_version='future-secret-schema' WHERE id='hidden'\")");
  const reopened = new CoreClient({ dataDir: dir });
  try { assert.deepEqual(await query(reopened, { kind: 'registry' }, runtime()), first); }
  finally { await reopened.close(); }
}));

test('governance: pagination binds visible collection; source updates require rediscovery while policy remains valid', () => fixture(async core => {
  await seed(core); await seed(core, 'n');
  await act(core, await requestFor(core));
  await act(core, await requestFor(core, grant(), 'n', 'grant-n'));
  const page = await query(core, { kind: 'registry', limit: 1 }, runtime());
  assert.equal(page.count, 2); assert.equal(page.next_offset, 1);
  const next = await query(core, { kind: 'registry', offset: 1, limit: 1, expected_collection_version: page.collection_version }, runtime());
  assert.equal(next.items[0].object_ref.id, 'n');
  await assert.rejects(query(core, { kind: 'registry', offset: 1 }, runtime()), { code: 'INVALID' });
  const view = await inspect(core, 'm', runtime());
  const sourceQuery = { kind: 'source', object_ref: ref(), expected_object_version: view.object_version, source_ref: view.sources[0].source_ref, limit: 10 };
  const body = await query(core, sourceQuery, runtime());
  assert.equal(body.unit, 'codepoint'); assert.equal(body.text, 'Original 😀'); assert.equal(body.next_offset, 10);
  await core.call('replace_sources', { matter_id: 'm', sources: [{ id: 's-m', version: 2, text: 'New bytes', digest: hash('New bytes') }], revision: 2 });
  await assert.rejects(query(core, { ...sourceQuery, offset: body.next_offset }, runtime()), { code: 'VERSION_CONFLICT' });
  await assert.rejects(query(core, { kind: 'registry', offset: 1, expected_collection_version: page.collection_version }, runtime()), { code: 'VERSION_CONFLICT' });
  const current = await inspect(core, 'm', runtime());
  assert.equal(current.disclosure_handle.revision, 1);
  assert.notEqual(current.object_version, view.object_version);
  assert.equal((await query(core, { ...sourceQuery, expected_object_version: current.object_version, source_ref: current.sources[0].source_ref }, runtime())).text, 'New bytes');
  await assert.rejects(query(core, { ...sourceQuery, expected_object_version: current.object_version }, runtime()), { code: 'NOT_FOUND' });
  const staleEdit = await requestFor(core, grant(), 'm', 'stale-edit');
  await core.call('replace_sources', { matter_id: 'm', sources: [{ id: 's-m', version: 3, text: 'Third', digest: hash('Third') }], revision: 3 });
  await assert.rejects(act(core, staleEdit), { code: 'VERSION_CONFLICT' });
}));

test('governance: registry and Attention source links do not grant target Matter access', () => fixture(async core => {
  const source = await seed(core);
  const ac = { ...human(), purpose: 'human-attention' };
  const sourceRef = { kind:'core',matter_id:'m',source_id:source.id,version:1,digest:source.digest,locator:'source',role:'supports' };
  await core.call('attention_action', { context: ac, provenance: [], request: { schema_version:1,request_id:'create-att',attention_id:'m',expected_revision:0,action:'create',
    payload:{descriptor:{title:'Attention title',summary:'Summary'},reason:'Reason',next_action:{kind:'inspect',label:'Inspect',trigger:'manual',due_at:null},source_refs:[sourceRef],relation_refs:[{kind:'matter',id:'m',relation:'about'}]} } });
  await core.call('attention_action', { context: ac, provenance: [], request: { schema_version:1,request_id:'grant-att',attention_id:'m',expected_revision:1,action:'request_disclosure',
    payload:{grant:{adapter_id:'adapter',purpose:'attention-runtime',fields:['registry','details','sources','relations'],expires_at:'2099-01-01T00:00:00Z'}} } });
  const denied = await inspect(core, 'm', runtime(), 'attention');
  assert.deepEqual(denied.sources, []); assert.equal(denied.relation_refs, undefined);
  await act(core, await requestFor(core));
  const list = await query(core, { kind: 'registry' }, runtime());
  assert.deepEqual(list.items.map(x=>x.object_ref.kind), ['attention','matter']);
  const shown = await inspect(core, 'm', runtime(), 'attention');
  assert.equal(shown.sources.length, 1);
  const read = {kind:'source',object_ref:ref('m','attention'),expected_object_version:shown.object_version,source_ref:shown.sources[0].source_ref};
  assert.equal((await query(core,read,runtime())).text, source.text);
  await act(core, await requestFor(core, null, 'm', 'revoke'));
  await assert.rejects(query(core,read,runtime()), {code:'VERSION_CONFLICT'});
  const after = await inspect(core,'m',runtime(),'attention');
  assert.deepEqual(after.sources, []);
  await assert.rejects(query(core,{...read,expected_object_version:after.object_version},runtime()), {code:'NOT_FOUND'});
}));

test('governance: accepted Artifact is exact, bounded and distinct from pending candidates', () => fixture(async core => {
  const s = await seed(core);
  await core.createRun({runId:'core-run',matterId:'m',baseVersion:0,sourceVersion:1,contractVersion:'se-contract-v5.0',instruction:'review'});
  await core.saveCandidate({matterId:'m',runId:'core-run',payload:{id:'c',matter_id:'m',run_id:'core-run',base_version:0,source_version:1,contract_version:'se-contract-v5.0',artifact_text:'Accepted 😀 text',
    evidence:[{source_id:s.id,source_version:1,start:0,end:Array.from(s.text).length,quote:s.text,digest:s.digest}],obligations:[]}});
  await act(core, await requestFor(core));
  assert.equal((await inspect(core,'m',runtime())).artifact,null);
  await core.updateRun({runId:'core-run',status:'completed',admissionOpen:false});
  await core.decide({request_id:'accept',matter_id:'m',candidate_id:'c',base_version:0,action:'accept',reason:'Synthetic review'});
  const view = await inspect(core,'m',runtime());
  const page = await query(core,{kind:'artifact',object_ref:ref(),expected_object_version:view.object_version,offset:9,limit:4},runtime());
  assert.equal(page.text,'😀 te'); assert.equal(page.artifact.digest,hash('Accepted 😀 text'));
  assert.equal(view.candidates,undefined); assert.equal(view.runs,undefined); assert.equal(view.human_actions,undefined);
}));

test('governance: unsupported schema, malformed envelopes and hidden queries fail closed', () => fixture(async core => {
  await seed(core);
  for (const q of [{kind:'all'},{kind:'registry',actor:'local-user'},{kind:'registry',schema_version:2},{kind:'registry',limit:0},{kind:'registry',object_kind:'session'},
    {kind:'inspect',object_ref:{...ref(),actor:'local-user'}},{kind:'source',object_ref:ref(),source_ref:'x'}]) {
    await assert.rejects(query(core,q,runtime()));
  }
  const request = await requestFor(core);
  for (const value of [{...grant(),content_scope:'all-history'}, {...grant(),fields:['registry',{}]}, {...grant(),expires_at:'2020-01-01T00:00:00Z'}, {...grant(),fields:['sources']}]) {
    await assert.rejects(act(core,{...request,grant:value}));
  }
  await assert.rejects(query(core,{kind:'registry'},{...runtime(),purpose:'anything'}),{code:'DISCLOSURE_DENIED'});
  await assert.rejects(query(core,{kind:'registry'},{...human(),actor:'model'}),{code:'DISCLOSURE_DENIED'});
  assert.equal((await inspect(core)).policy.revision,0);
}));

test('governance: corrupt bytes and missing policy provenance are refused without repair', () => fixture(async (core,dir) => {
  await seed(core); await act(core,await requestFor(core));
  const view = await inspect(core,'m',runtime());
  await core.close(); const db = path.join(dir,'state.db'); const original = await readFile(db);
  for (const [mutation,expected] of [["c.execute(\"UPDATE source SET text='Corrupt'\")",'INTEGRITY_REFUSAL'],
    ["c.execute('DELETE FROM matter_disclosure_event')",'NOT_FOUND'],["c.execute('DELETE FROM matter_disclosure_request')",'NOT_FOUND']]) {
    await writeFile(db,original); sql(db,mutation);
    const reopened = new CoreClient({dataDir:dir});
    try { await assert.rejects(query(reopened,{kind:'source',object_ref:ref(),expected_object_version:view.object_version,source_ref:view.sources[0].source_ref},runtime()),{code:expected}); }
    finally { await reopened.close(); }
  }
}));

test('governance: file Artifact delegates to exact immutable manifest/content reader', () => fixture(async core => {
  const text='Approved 😀 source', source={id:'s',version:1,text,digest:hash(text)};
  const contract='se-file-memo-v1', context={matter_id:'m',run_id:'r'};
  await core.createMatter({matterId:'m',title:'Files',source,contractVersion:contract});
  await core.call('claim_work',{matter_id:'m',project_id:'p',extension_id:'evidence-memo'});
  await core.createRun({runId:'r',matterId:'m',sessionRef:'session',baseVersion:0,sourceVersion:1,contractVersion:contract,instruction:'Fixed input'});
  await core.call('initialize_file_run',{context,input:{systemPrompt:'Host',currentContext:'Fixed',runtimeProfile:{revision:1,hash:hash('runtime')},cleanSession:true,reasons:[]}});
  await core.call('save_file_candidate',{context,payload:{id:'c',matter_id:'m',run_id:'r',base_version:0,source_version:1,contract_version:contract,artifact_text:'Memo',evidence:[{source_id:'s',source_version:1,start:0,end:Array.from(text).length,quote:text,digest:source.digest}],obligations:[]},
    files:[{path:'out/a.md',sha256:hash('A😀\n'),bytes:Buffer.byteLength('A😀\n'),content:'A😀\n',sessionId:'session',runId:'r',recordIndex:0,kind:'content-version',writtenAt:'2026-09-09T00:00:00.000Z'}]});
  await core.updateRun({runId:'r',status:'completed',admissionOpen:false});
  await core.decide({request_id:'d',matter_id:'m',candidate_id:'c',base_version:0,action:'accept',reason:'Synthetic review'});
  await act(core,await requestFor(core));
  const view=await inspect(core,'m',runtime());
  const q={kind:'artifact',object_ref:ref(),expected_object_version:view.object_version};
  const manifest=await query(core,q,runtime());assert.equal(manifest.file.files[0].path,'out/a.md');
  const body=await query(core,{...q,path:'out/a.md',offset:1,limit:1},runtime());assert.equal(body.file.text,'😀');
  await assert.rejects(query(core,{...q,path:'../other'},runtime()),{code:'NOT_FOUND'});
  assert.equal(view.artifact.format,'file-bundle');assert.equal(view.artifact.integrity,'unchecked');
}));

test('governance: unknown Matter contract is discoverable metadata but cannot be decoded',()=>fixture(async core=>{
  await core.createMatter({matterId:'m',title:'Future schema',source:{id:'s',version:1,text:'secret',digest:hash('secret')},contractVersion:'future-v99'});
  await core.call('claim_work',{matter_id:'m',project_id:'p',extension_id:'future'});
  await act(core,await requestFor(core));
  const view=await inspect(core,'m',runtime());assert.equal(view.schema_version,null);assert.equal(view.availability,'unsupported');
  assert.equal(view.details,undefined);assert.equal(view.sources,undefined);
  await assert.rejects(query(core,{kind:'source',object_ref:ref(),expected_object_version:view.object_version,source_ref:'0'.repeat(64)},runtime()),{code:'CONTRACT_UNSUPPORTED'});
}));

test('governance: non-object or corrupted policy provenance has uniform runtime absence and structured human refusal',()=>fixture(async(core,dir)=>{
  await seed(core);const request=await requestFor(core);await act(core,request);await core.close();
  const db=path.join(dir,'state.db'), original=await readFile(db);
  for(const [table,jsonColumn,digestColumn,value] of [['matter_disclosure','state_json','state_digest','[]'],['matter_disclosure_event','event_json','event_digest','[]'],['matter_disclosure_request','result_json','result_digest','[]']]) {
    await writeFile(db,original);
    sql(db,`c.execute("UPDATE ${table} SET ${jsonColumn}=?,${digestColumn}=?",(${JSON.stringify(value)},${JSON.stringify(hash(value))}))`);
    const c=new CoreClient({dataDir:dir});
    try {
      assert.equal((await query(c,{kind:'registry'},runtime())).count,0);
      await assert.rejects(inspect(c,'m',runtime()),{code:'NOT_FOUND'});
      await assert.rejects(inspect(c),{code:'INTEGRITY_REFUSAL'});
      if(table!=='matter_disclosure') await assert.rejects(act(c,request),{code:'INTEGRITY_REFUSAL'});
    }finally{await c.close();}
  }
}));

test('governance: oversized content cannot prevent human policy-only revocation',()=>fixture(async core=>{
  await seed(core);await act(core,await requestFor(core));
  const large=Array.from({length:129},(_,i)=>({id:'many-'+i,version:1,text:'x',digest:hash('x')}));
  await core.call('replace_sources',{matter_id:'m',sources:large,revision:2});
  await assert.rejects(inspect(core),{code:'GOVERNANCE_LIMIT'});
  await assert.rejects(query(core,{kind:'policy',object_ref:ref()},runtime()),{code:'NOT_FOUND'});
  const policyOnly=await query(core,{kind:'policy',object_ref:ref()});
  assert.equal(policyOnly.policy.revision,1);assert.equal(policyOnly.sources,undefined);
  const revoke={schema_version:1,request_id:'revoke-large',matter_id:'m',expected_policy_revision:1,expected_object_version:null,grant:null};
  assert.equal((await act(core,revoke)).policy_revision,2);
  assert.equal((await query(core,{kind:'registry'},runtime())).count,0);
  assert.equal((await query(core,{kind:'policy',object_ref:ref()})).policy.grant,null);
}));
