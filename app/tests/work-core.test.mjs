import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CoreClient} from '../core/client.mjs';
import {workProjection,compileWorkContext} from '../core/owner.mjs';
const source = (id,text,version=1) => ({id,text,version,digest:createHash('sha256').update(text).digest('hex')});
const anchor = s => ({source_id:s.id,source_version:s.version,start:0,end:Array.from(s.text).length,quote:s.text,digest:s.digest});
async function fixture(fn) {
 const dataDir=await mkdtemp(path.join(tmpdir(),'cw-core-'));
 const core=new CoreClient({dataDir});
 try { await fn(core,dataDir); } finally { await core.close();await rm(dataDir,{recursive:true,force:true}); }
}
async function seed(core) {
 const s=source('s','Original 😀 evidence');
 await core.createMatter({matterId:'m',title:'Work',source:s,contractVersion:'se-contract-v5.0'});
 await core.createMatter({matterId:'other',title:'Other',source:source('other-s','Other source')});
 await core.createRun({runId:'r',matterId:'m',baseVersion:0,sourceVersion:1,contractVersion:'se-contract-v5.0',instruction:'review'});
 const payload={id:'c',matter_id:'m',run_id:'r',base_version:0,source_version:1,contract_version:'se-contract-v5.0',artifact_text:'Draft',evidence:[anchor(s)],obligations:[{id:'follow-up',text:'Synthetic human follow-up',status:'open',blocking:false,evidence_refs:[]}]};
 await core.saveCandidate({matterId:'m',runId:'r',payload});
 await core.updateRun({runId:'r',status:'completed',admissionOpen:false});
 return {s,payload};
}
test('Core independent lifecycle: receipt/CAS/authority, revisions and immutable historical membership',async()=>fixture(async(core,dataDir)=>{
 const {s,payload}=await seed(core);
 const decision={request_id:'accept-1',matter_id:'m',candidate_id:'c',base_version:0,action:'accept',reason:'Reviewed'};
 await assert.rejects(core.decide({...decision,actor:'local-user'}),{code:'INVALID'});
 const receipt=await core.decide(decision);
 assert.deepEqual(await core.decide(decision),receipt);
 await assert.rejects(core.decide({...decision,reason:'changed'}),{code:'IDEMPOTENCY_CONFLICT'});
 assert.deepEqual(await core.queryRequest('accept-1'),receipt);
 const proposal={artifact_text:'Revised',evidence:[anchor(s)],obligations:[]};
 const revision={matter_id:'m',candidate_id:'c',new_candidate_id:'c2',base_version:1,proposal};
 await core.call('revise_candidate',revision);
 assert.equal((await core.snapshot('m')).candidates.find(c=>c.id==='c').artifact_text,'Draft');
 await assert.rejects(core.decide({...decision,request_id:'old',candidate_id:'c2',base_version:0}),{code:'VERSION_CONFLICT'});
 await core.call('replace_sources',{matter_id:'m',sources:[source('s','New source',2)],revision:2});
 assert.equal((await core.call('historical_source',{matter_id:'m',candidate_id:'c',source_id:'s',version:1})).text,s.text);
 await assert.rejects(core.call('historical_source',{matter_id:'other',candidate_id:'c',source_id:'s',version:1}),{code:'BINDING_MISMATCH'});
 await assert.rejects(core.decide({...decision,request_id:'stale',candidate_id:'c2',base_version:1}),{code:'STALE_INPUT'});
 await assert.rejects(core.call('replace_sources',{matter_id:'m',sources:[source('s','Forged',1)],revision:3}),{code:'IDEMPOTENCY_CONFLICT'});
 await core.call('revise_candidate',revision); // lost revision receipt after source changed
 await assert.rejects(core.call('revise_candidate',{...revision,proposal:{...proposal,artifact_text:'Changed'}}),{code:'IDEMPOTENCY_CONFLICT'});
 const before=await core.snapshot('m');
 assert.equal(before.matter.obligations[0].status,'open');
 assert.equal(workProjection(before,{writable:true}).humanActions.length,0);
 assert.equal(compileWorkContext(before).provenance.sourceVersion,2);
 await assert.rejects(async()=>compileWorkContext(before,5),{code:'CONTEXT_BUDGET'});
 await core.close();
 const reopened=new CoreClient({dataDir});
 try { const after=await reopened.snapshot('m');assert.equal(after.core_state_digest,before.core_state_digest);assert.deepEqual(after.artifact,before.artifact);assert.deepEqual(after.matter.obligations,before.matter.obligations); } finally {await reopened.close();}
}));
test('Core worker is single writer; terminal and unknown runs cannot admit fresh model proposals',async()=>fixture(async(core,dataDir)=>{
 const {payload}=await seed(core);
 const competing=new CoreClient({dataDir});
 try {await assert.rejects(competing.start(),{code:'DB_IN_USE'});} finally {await competing.close();}
 await assert.rejects(core.saveCandidate({matterId:'m',runId:'r',payload:{...payload,id:'late'}}),{code:'CANDIDATE_CLOSED'});
 assert.equal((await core.snapshot('m')).artifact,null);
}));

import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const python = (code,args=[]) => spawnSync('python3',['-c',code,...args],{encoding:'utf8'});
test('real transaction SIGKILL before commit and after commit before acknowledgement yields unique recoverable effect',async()=>{
 for (const stage of ['after_audit','after_artifact','before_commit','after_commit_before_ack']) await fixture(async(core,dataDir)=>{
  await seed(core);await core.close();
  const child=spawnSync('python3',[new URL('./fixtures/work-core/crash.py',import.meta.url).pathname,path.join(dataDir,'state.db'),stage],{encoding:'utf8'});
  assert.equal(child.signal,'SIGKILL',child.stderr);
  const restored=new CoreClient({dataDir});
  try {
   const before=await restored.snapshot('m');assert.equal(before.matter.version,stage==='after_commit_before_ack'?1:0);
   const d={request_id:'crash-request',matter_id:'m',candidate_id:'c',base_version:0,action:'accept',reason:'Synthetic review'};
   const recovered=await restored.decide(d);assert.equal(recovered.version,1);
   const after=await restored.snapshot('m');assert.equal(after.decisions.length,1);assert.equal(after.audits.length,1);assert.equal(after.artifact.content,'Draft');
  } finally {await restored.close();}
 });
});
test('v1 migration backs up original, retains current source membership; failed schema migration rolls back',async()=>{
 for (const corrupt of [false,true]) await fixture(async(core,dataDir)=>{
  await seed(core);await core.close();const db=path.join(dataDir,'state.db');
  const altered=python(`import sqlite3,sys\nc=sqlite3.connect(sys.argv[1])\nc.executescript("DROP TABLE artifact_file_bundle; DROP TABLE candidate_verification; DROP TABLE candidate_file; DROP TABLE candidate_file_bundle; DROP TABLE file_run_basis; DROP TRIGGER retain_source_membership; DROP TABLE source_history; DROP TABLE app_work_scope; UPDATE app_meta SET value='1' WHERE key='schema_version'; UPDATE meta SET value='1' WHERE key='schema_version'; PRAGMA user_version=1;")\nif sys.argv[2]=='true': c.execute('ALTER TABLE app_matter ADD COLUMN unsupported TEXT')\nc.commit()\nc.close()`,[db,String(corrupt)]);
  assert.equal(altered.status,0,altered.stderr);
  const dump = file => python('import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]);print("\\n".join(c.iterdump()))',[file]).stdout;
  const priorDump=dump(db);const bytes=await readFile(db);const reopened=new CoreClient({dataDir});
  try {
   if(corrupt) {await assert.rejects(reopened.start(),{code:'SCHEMA_INVALID'});assert.deepEqual(await readFile(db),bytes);}
   else {await reopened.start();const v=await reopened.snapshot('m');assert.equal(v.candidates.length,1);assert.equal((await reopened.call('historical_source',{matter_id:'m',candidate_id:'c',source_id:'s',version:1})).text,'Original 😀 evidence');}
   if (!corrupt) assert.equal(dump(db+'.pre-file-core-v2-app-v3.bak'),priorDump);
  } finally {await reopened.close();}
 });
});

test('missing application metadata fails closed; terminal Run cannot change or claim another candidate',async()=>fixture(async(core,dataDir)=>{
 await seed(core);
 await assert.rejects(core.updateRun({runId:'r',status:'completed',admissionOpen:false,error:{code:'rewrite'}}),{code:'CONFLICT'});
 await core.createRun({runId:'other-r',matterId:'other',baseVersion:0,sourceVersion:1,contractVersion:'contract-1',instruction:'other work'});
 await assert.rejects(core.updateRun({runId:'other-r',status:'completed',admissionOpen:false,candidateId:'c'}),{code:'BINDING_MISMATCH'});
 await core.updateRun({runId:'other-r',status:'unknown',admissionOpen:false});
 const settled=await core.getRun('other-r');await core.updateRun({runId:'other-r',status:'unknown',admissionOpen:false});assert.deepEqual(await core.getRun('other-r'),settled);
 await core.close();const db=path.join(dataDir,'state.db');
 for(const sql of ["DELETE FROM app_meta WHERE key='schema_version'",'DROP TABLE app_meta']) {
  assert.equal(python('import sqlite3,sys\nc=sqlite3.connect(sys.argv[1]);c.execute(sys.argv[2]);c.commit()',[db,sql]).status,0);
  const bytes=await readFile(db);const broken=new CoreClient({dataDir});
  try {await assert.rejects(broken.start(),{code:'SCHEMA_INVALID'});assert.deepEqual(await readFile(db),bytes);} finally {await broken.close();}
 }
}));
