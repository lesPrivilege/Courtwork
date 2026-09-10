import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { CoreClient } from '../core/client.mjs';
import { boot } from './helpers.mjs';
const source = (id, version = 1) => ({id,version,text:`${id}-${version}`,digest:createHash('sha256').update(`${id}-${version}`).digest('hex')});
async function matter(core,id,project='p') {
 await core.createMatter({matterId:id,title:id,source:source(`${id}-s`)});
 await core.call('claim_work',{matter_id:id,project_id:project,extension_id:'evidence-memo'});
}
const query = (core, opts={}) => core.call('work_derivations',{project_id:'p',limit:25,offset:0,snapshot_ref:null,...opts});
async function fixture(fn) {
 const dataDir=await mkdtemp(path.join(tmpdir(),'cw-be41-'));const core=new CoreClient({dataDir});
 try {await fn(core,dataDir);} finally {await core.close();await rm(dataDir,{recursive:true,force:true});}
}
test('BE41 empty/zero, project scope, stable pages and stale snapshot rejection without writes',()=>fixture(async(core,dir)=>{
 const empty=await query(core);assert.equal(empty.page.total,0);assert.match(empty.snapshotRef,/^core-state:[a-f0-9]{64}$/);
 await matter(core,'a');await matter(core,'b');await matter(core,'secret','other');
 const first=await query(core,{limit:1});assert.equal(first.page.total,2);assert.equal(first.matters[0].version,0);
 assert.deepEqual(first.matters[0].derivations,{total:0,current:0,stale:0,byStatus:[]});
 assert.equal(first.matters[0].sourceSetChange,null);
 const second=await query(core,{limit:1,offset:1,snapshot_ref:first.snapshotRef});assert.equal(second.matters[0].matterId,'b');
 assert.equal(first.snapshotRef,second.snapshotRef);
 await core.call('replace_sources',{matter_id:'b',sources:[source('b-s',2)],revision:9});
 await assert.rejects(query(core,{limit:1,offset:1,snapshot_ref:first.snapshotRef}),{code:'DERIVATIONS_SNAPSHOT_CHANGED'});
 const fresh=await query(core);assert.deepEqual(fresh.matters[1].sourceSetChange,{fromRevision:1,toRevision:9,added:[],removed:[],replaced:[{sourceId:'b-s',fromVersion:1,toVersion:2}]});
 await core.close(); const before=await readFile(path.join(dir,'state.db'));
 await query(core);await query(core,{offset:999});await core.close();assert.deepEqual(await readFile(path.join(dir,'state.db')),before);
}));
test('BE41 exact status counts, immutable lineage, 20-ref truncation and source membership diff',()=>fixture(async(core)=>{
 await matter(core,'m'); await core.createRun({runId:'r',matterId:'m',baseVersion:0,sourceVersion:1,contractVersion:'contract-1',instruction:'synthetic'});
 for(let i=0;i<24;i++) await core.saveCandidate({matterId:'m',runId:'r',payload:{id:`c-${String(i).padStart(2,'0')}`,matter_id:'m',run_id:'r',base_version:0,source_version:1,contract_version:'contract-1',artifact_text:'draft',evidence:[],obligations:[]}});
 await core.updateRun({runId:'r',status:'completed',admissionOpen:false});
 await core.decide({request_id:'reject',matter_id:'m',candidate_id:'c-00',base_version:0,action:'reject',reason:'test'});
 await core.call('replace_sources',{matter_id:'m',sources:[source('new')],revision:4});
 const dto=await query(core);const m=dto.matters[0];assert.equal(m.derivations.total,24);assert.equal(m.derivations.stale,24);assert.equal(m.derivations.current,0);
 assert.deepEqual(m.derivations.byStatus,[{status:'pending',current:0,stale:23},{status:'rejected',current:0,stale:1}]);
 assert.equal(m.staleRefs.length,20);assert.equal(m.staleRefsTruncated,true);assert.equal(m.staleRefs[0].status,'rejected');
 assert.deepEqual(m.sourceSetChange,{fromRevision:1,toRevision:4,added:[{sourceId:'new',version:1}],replaced:[],removed:[{sourceId:'m-s',version:1}]});
 await core.call('revise_candidate',{matter_id:'m',candidate_id:'c-01',new_candidate_id:'revision',base_version:m.version,proposal:{artifact_text:'new',evidence:[],obligations:[]}});
 const revised=await query(core);assert.equal(revised.matters[0].derivations.current,1);assert.notEqual(revised.snapshotRef,dto.snapshotRef);
}));
test('BE41 migrated missing source history gives null counts and project-wide partial coverage',()=>fixture(async(core,dir)=>{
 await matter(core,'a');await matter(core,'z');await core.call('replace_sources',{matter_id:'z',sources:[source('z-s',2)],revision:3});await core.close();
 const inject=spawnSync('python3',['-c',"import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]);c.execute(\"DELETE FROM source_history WHERE matter_id='z' AND revision=1\");c.commit()",path.join(dir,'state.db')],{encoding:'utf8'});assert.equal(inject.status,0,inject.stderr);
 const first=await query(core,{limit:1});assert.equal(first.coverage.matters,'partial');
 const second=await query(core,{offset:1});assert.equal(second.matters[0].availability,'partial');assert.equal(second.matters[0].reason,'source_history_unavailable');
 assert.deepEqual(second.matters[0].derivations,{total:null,current:null,stale:null,byStatus:[]});assert.deepEqual(second.matters[0].staleRefs,[]);
}));
test('BE41 authenticated HTTP validates queries; no Session or producer required',async()=>{
 const {runtime,api,projectId}=await boot({configureFakeCredential:false});
 try {
  const endpoint=`/work-derivations?projectId=${projectId}`;
  const empty=await api('GET',endpoint);assert.equal(empty.status,200);assert.equal(empty.json.page.limit,25);
  assert.equal((await fetch(runtime.url+'/api/v5'+endpoint)).status,401);
  for(const suffix of ['&limit=0','&limit=101','&limit=1.2','&offset=-1','&offset=9007199254740992','&offset=','&limit=1&limit=2','&unexpected=x','&snapshotRef=bad']) assert.equal((await api('GET',endpoint+suffix)).status,400,suffix);
  assert.equal((await api('GET','/work-derivations')).status,400);
  assert.equal((await api('GET','/work-derivations?projectId=absent')).status,404);
  assert.equal((await api('GET',endpoint+'&snapshotRef=core-state:'+'0'.repeat(64))).status,409);
 } finally {await runtime.close();}
});
test('BE41 source rollback is real, large diffs are partial, and policy/off-page membership invalidates tokens',()=>fixture(async(core,dir)=>{
 await matter(core,'a');await matter(core,'b');
 await core.call('replace_sources',{matter_id:'a',sources:[source('a-s',2)],revision:2});
 await core.call('replace_sources',{matter_id:'a',sources:[source('a-s',1)],revision:3});
 let dto=await query(core);assert.deepEqual(dto.matters[0].sourceSetChange.replaced,[{sourceId:'a-s',fromVersion:2,toVersion:1}]);
 const many=Array.from({length:300},(_,i)=>source(`source-${i}`));
 await core.call('replace_sources',{matter_id:'b',sources:many,revision:2});
 dto=await query(core,{limit:1});assert.equal(dto.coverage.matters,'partial');
 const b=(await query(core,{offset:1})).matters[0];assert.equal(b.reason,'projection_budget_exceeded');assert.equal(b.derivations.total,null);assert.equal(b.sourceSetChange,null);
 await matter(core,'c');await assert.rejects(query(core,{snapshot_ref:dto.snapshotRef}),{code:'DERIVATIONS_SNAPSHOT_CHANGED'});
 const before=await query(core);await core.close();
 const injected=spawnSync('python3',['-c',`import sqlite3,sys
c=sqlite3.connect(sys.argv[1])
c.execute("INSERT INTO matter_disclosure VALUES('p','a',1,1,'{}','synthetic')")
c.commit()`,path.join(dir,'state.db')],{encoding:'utf8'});assert.equal(injected.status,0,injected.stderr);
 await assert.rejects(query(core,{snapshot_ref:before.snapshotRef}),{code:'DERIVATIONS_SNAPSHOT_CHANGED'});
}));
test('BE41 oversized identity metadata refuses explicitly rather than breaking the worker frame',()=>fixture(async(core)=>{
 for(const id of ['a','b']) {
  await core.createMatter({matterId:id,title:id,source:source(id)});
  await core.call('claim_work',{matter_id:id,project_id:'p',extension_id:'x'.repeat(510000)});
 }
 await assert.rejects(query(core),{code:'PROJECTION_BUDGET'});
 assert.equal((await query(core,{project_id:'other'})).page.total,0);
}));
