import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CoreClient} from '../core/client.mjs';
const hash = text => createHash('sha256').update(text).digest('hex');
const contract='se-file-memo-v1';
const source={id:'s',version:1,text:'Approved 😀 source',digest:hash('Approved 😀 source')};
const context={matter_id:'m',run_id:'r'};
const payload={id:'c',matter_id:'m',run_id:'r',base_version:0,source_version:1,contract_version:contract,artifact_text:'Memo',evidence:[{source_id:'s',source_version:1,start:0,end:17,quote:source.text,digest:source.digest}],obligations:[]};
payload.evidence[0].end=Array.from(source.text).length;
const file=(content='A😀\n',p='out/a.md')=>({path:p,sha256:hash(content),bytes:Buffer.byteLength(content),content,sessionId:'session',runId:'r',recordIndex:0,kind:'content-version',writtenAt:'2026-09-09T00:00:00.000Z'});
const query=(candidate_id='c',extra={})=>({matter_id:'m',context:null,kind:'file-content',candidate_id,artifact_id:null,path:'out/a.md',offset:0,limit:4000,...extra});
const decision=(candidate_id='c',extra={})=>({request_id:'d',matter_id:'m',candidate_id,base_version:0,action:'accept',reason:'reviewed',...extra});
async function fixture(fn){
 const dir=await mkdtemp(path.join(tmpdir(),'cw-es-core-'));const core=new CoreClient({dataDir:dir});
 try{
  await core.createMatter({matterId:'m',title:'Files',source,contractVersion:contract});
  await core.createRun({runId:'r',matterId:'m',sessionRef:'session',baseVersion:0,sourceVersion:1,contractVersion:contract,instruction:'Use fixed sources'});
  await core.call('initialize_file_run',{context,input:{systemPrompt:'Host',currentContext:'Fixed',runtimeProfile:{revision:1,hash:hash('runtime')},cleanSession:true,reasons:[]}});
  await fn(core,dir);
 }finally{await core.close();await rm(dir,{recursive:true,force:true});}
}
const save=(core,extra={},files=[file()])=>core.call('save_file_candidate',{context,payload:{...payload,...extra},files});
const close=core=>core.updateRun({runId:'r',status:'completed',admissionOpen:false});

test('file candidate identity, exact replay, immutable pages, closed admission and atomic acceptance',()=>fixture(async core=>{
 await save(core); const first=await core.snapshot('m');assert.equal(first.candidates[0].files.acceptable,true);
 await save(core);await assert.rejects(save(core,{},[file('B')]),{code:'IDEMPOTENCY_CONFLICT'});
 await save(core,{id:'c2'},[file('A😀\n','out/b.md')]);
 const v=await core.snapshot('m');assert.notEqual(v.candidates[0].files.candidateDigest,v.candidates[1].files.candidateDigest);
 assert.equal((await core.call('file_query',query('c',{offset:1,limit:1}))).text,'😀');
 assert.equal((await core.call('file_query',query('c',{offset:2,limit:1}))).text,'\n');
 await assert.rejects(core.call('file_query',query('c',{offset:4})),{code:'INVALID'});
 await assert.rejects(core.call('file_query',query('c',{matter_id:'other'})),{code:'BINDING_MISMATCH'});
 await close(core);await save(core);await assert.rejects(save(core,{id:'late'}),{code:'CANDIDATE_CLOSED'});
 const receipts=await Promise.allSettled([core.decide(decision()),core.decide(decision('c2',{request_id:'d2'}))]);
 assert.equal(receipts.filter(r=>r.status==='fulfilled').length,1);
 const result=await core.decide(decision());assert.equal(result.version,1);
 assert.equal((await core.call('file_query',query(null,{artifact_id:result.active_artifact}))).text,'A😀\n');
 assert.equal((await core.snapshot('m')).decisions.length,1);
 await assert.rejects(core.call('revise_candidate',{matter_id:'m',candidate_id:'c',new_candidate_id:'rev',base_version:1,proposal:{artifact_text:'lost files',evidence:[],obligations:[]}}),{code:'CONTRACT_UNSUPPORTED'});
}));

test('coverage is monotone; frozen candidate precedes later unknown input; semantic failures stay diagnostic',()=>fixture(async core=>{
 await save(core,{id:'before'});
 await core.call('mark_file_input',{context,reason:'tool:ws_read'});
 await save(core,{id:'after'});
 await save(core,{id:'invalid-evidence',evidence:[{...payload.evidence[0],quote:'forged'}]});
 const view=await core.snapshot('m');assert.equal(view.candidates.find(c=>c.id==='before').files.coverage,'complete');
 assert.equal(view.candidates.find(c=>c.id==='after').files.coverage,'unknown');
 await close(core);
 await assert.rejects(core.decide(decision('after')),{code:'DEPENDENCY_INCOMPLETE'});
 await core.decide(decision('before'));
}));

test('failed deterministic checks cannot accept, and source membership changes invalidate file basis',()=>fixture(async core=>{
 await save(core,{id:'bad',evidence:[{...payload.evidence[0],quote:'forged'}]});
 await save(core);
 assert.equal((await core.snapshot('m')).candidates.find(c=>c.id==='bad').files.verification,'failed');
 await close(core);await assert.rejects(core.decide(decision('bad')),{code:'VERIFICATION_REQUIRED'});
 await core.call('replace_sources',{matter_id:'m',revision:2,sources:[source,{id:'extra',version:1,text:'extra',digest:hash('extra')}]});
 await assert.rejects(core.decide(decision()),{code:'STALE_INPUT'});
 assert.equal((await core.call('file_query',query())).text,'A😀\n');
}));

test('illegal provenance, encoding, count, path and byte limits reject without candidate side effects',()=>fixture(async core=>{
 const probes=[[],Array.from({length:17},(_,i)=>file('',`out/${i}`)),[file('x'.repeat(65537))], [file('a','../escape')], [{...file(),writtenAt:'not-a-timestamp'}], [{...file(),writtenAt:'2026-09-09'}], [file('a','out/A'),file('b','out/a')], [file('\u0000')],[file('\ud800')],[{...file(),runId:'other'}],[{...file(),sessionId:'other'}],[{...file(),sha256:'0'.repeat(64)}],[file('a'.repeat(65536),'out/1'),file('b'.repeat(65536),'out/2'),file('c','out/3')]];
 for(const files of probes) await assert.rejects(save(core,{},files));
 await assert.rejects(save(core,{coverage:'complete'}),{code:'INVALID'});
 await assert.rejects(save(core,{verification:{result:'passed'}}),{code:'INVALID'});
 assert.equal((await core.snapshot('m')).candidates.length,0);
 await save(core,{},[file('a'.repeat(65536),'out/1'),{...file('b'.repeat(65536),'out/2'),recordIndex:1}]);
 assert.equal((await core.snapshot('m')).candidates[0].files.byteLength,131072);
}));

import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const crashHelper=new URL('./fixtures/work-core/file-candidate-crash.py',import.meta.url).pathname;
const packet=JSON.parse(await readFile(new URL('./fixtures/work-core/file-candidate-packets.json',import.meta.url),'utf8'));
test('SIGKILL file save and accept commit boundaries leave zero or one complete durable effect',async()=>{
 for(const operation of ['save','decide'])for(const stage of operation==='save'?['file_save_before_commit','file_save_after_commit_before_ack']:['after_audit','after_artifact','before_commit','after_commit_before_ack']){
  const dataDir=await mkdtemp(path.join(tmpdir(),'cw-es-kill-'));const db=path.join(dataDir,'state.db');
  const core=new CoreClient({dataDir});
  try{
   if(operation==='decide'){const seeded=spawnSync('python3',[crashHelper,db,'seed'],{encoding:'utf8'});assert.equal(seeded.status,0,seeded.stderr);}
   const killed=spawnSync('python3',[crashHelper,db,operation,stage],{encoding:'utf8'});assert.equal(killed.signal,'SIGKILL',killed.stderr);
   const after=await core.snapshot('m');
   const saved=operation==='decide'||stage==='file_save_after_commit_before_ack';
   assert.equal(after.candidates.length,saved?1:0);
   const counts=spawnSync('python3',['-c',"import sqlite3,sys,json;c=sqlite3.connect(sys.argv[1]);print(json.dumps([c.execute('SELECT count(*) FROM '+t).fetchone()[0] for t in ['candidate_file_bundle','candidate_file','candidate_verification']]))",db],{encoding:'utf8'});
   assert.deepEqual(JSON.parse(counts.stdout),saved?[1,1,1]:[0,0,0]);
   if(operation==='save'){
    if(saved) assert.deepEqual(await core.call('save_file_candidate',{context:packet.context,payload:packet.payload,files:packet.files}),{candidate_id:'c',status:'pending'});
    else await assert.rejects(core.call('save_file_candidate',{context:packet.context,payload:packet.payload,files:packet.files}),{code:'CANDIDATE_CLOSED'});
   }else{
    assert.equal(after.matter.version,stage==='after_commit_before_ack'?1:0);
    const d=await core.decide(packet.decision);assert.equal(d.version,1);
    const final=await core.snapshot('m');assert.equal(final.decisions.length,1);assert.equal(final.audits.length,1);
    assert.equal((await core.call('file_query',query(null,{artifact_id:d.active_artifact}))).text,'A😀\n');
   }
  }finally{await core.close();await rm(dataDir,{recursive:true,force:true});}
 }
});

const sql=(db,statement,args=[])=>{
 const result=spawnSync('python3',['-c',"import sqlite3,sys,json;c=sqlite3.connect(sys.argv[1]);r=c.execute(sys.argv[2],json.loads(sys.argv[3]));print(json.dumps(r.fetchall(),ensure_ascii=False));c.commit()",db,statement,JSON.stringify(args)],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
};

test('metadata byte boundary, escaped wire envelope, file/path/count boundaries and empty files are exact',()=>fixture(async(core,dir)=>{
 await save(core,{id:'basis0'});
 const identity=JSON.parse(sql(path.join(dir,'state.db'),'SELECT payload_json FROM candidate WHERE id=?',['basis0'])[0][0]);
 const textLength=32768-Buffer.byteLength(JSON.stringify({...identity,id:'limit0',artifact_text:''}));
 await save(core,{id:'limit0',artifact_text:'x'.repeat(textLength)});
 await save(core,{id:'limit2',artifact_text:'x'.repeat(textLength-1)});
 await assert.rejects(save(core,{id:'limit1',artifact_text:'x'.repeat(textLength+1)}),{code:'FILE_LIMIT'});
 await save(core,{id:'controls'},[file('\u0001'.repeat(65536),'out/one'),{...file('\u0002'.repeat(65536),'out/two'),recordIndex:1}]);
 await assert.rejects(core.call('file_query',{...query(),junk:'\u0001'.repeat(170000)}),{code:'FILE_LIMIT'});
 await save(core,{id:'path240'},[file('','out/'+'a'.repeat(236))]);
 await assert.rejects(save(core,{id:'path241'},[file('','out/'+'a'.repeat(237))]),{code:'INVALID'});
 await save(core,{id:'sixteen'},Array.from({length:16},(_,i)=>({...file('',`out/${i}`),recordIndex:i})));
 await save(core,{id:'below'},[file('x'.repeat(65535))]);
 await assert.rejects(save(core,{id:'same-index'},[file('a','out/one'),file('b','out/two')]),{code:'BINDING_MISMATCH'});
}));

test('file diff binds only frozen base, uses linear replacement, preserves newlines and refuses oversized output',()=>fixture(async core=>{
 await save(core,{},[file('prefix\nold\n')]);await close(core);const accepted=await core.decide(decision());
 await core.createRun({runId:'r2',matterId:'m',sessionRef:'session2',baseVersion:1,sourceVersion:1,contractVersion:contract,instruction:'Revise fixed base'});
 const context2={matter_id:'m',run_id:'r2'};
 await core.call('initialize_file_run',{context:context2,input:packet.input});
 const save2=(id,content,p='out/a.md')=>core.call('save_file_candidate',{context:context2,payload:{...payload,id,run_id:'r2',base_version:1},files:[{...file(content,p),sessionId:'session2',runId:'r2'}]});
 await save2('new','prefix\nnew');
 const diff=await core.call('file_query',query('new',{kind:'file-diff'}));
 assert.equal(diff.base.artifactId,accepted.active_artifact);assert.equal(diff.status,'modified');assert.deepEqual(diff.change,{offset:7,removed:'old\n',inserted:'new'});assert.equal(diff.baseFinalNewline,true);assert.equal(diff.candidateFinalNewline,false);
 await save2('same','prefix\nold\n');assert.equal((await core.call('file_query',query('same',{kind:'file-diff'}))).status,'unchanged');
 await save2('large','x'.repeat(65536));assert.equal((await core.call('file_query',query('large',{kind:'file-diff'}))).reason,'too_large');
 await save2('selection','new','out/new');const absent=await core.call('file_query',query('selection',{kind:'file-diff',path:'out/new'}));assert.equal(absent.reason,'no_corresponding_record');assert.equal(absent.selection,'only_in_selected_candidate');
 await assert.rejects(core.call('file_query',query(null,{artifact_id:accepted.active_artifact,kind:'file-diff'})),{code:'INVALID'});
}));

test('corrupt bytes, manifest, column bindings and a verification record copied from another identity refuse reads and acceptance',async()=>{
 for(const attack of ['bytes','manifest','columns','verification'])await fixture(async(core,dir)=>{
  await save(core);await save(core,{id:'other-candidate'});await close(core);await core.close();const db=path.join(dir,'state.db');
  if(attack==='bytes')sql(db,"UPDATE candidate_file SET bytes=X'42' WHERE candidate_id='c'");
  if(attack==='manifest')sql(db,"UPDATE candidate_file_bundle SET manifest_json='[]' WHERE candidate_id='c'");
  if(attack==='columns')sql(db,"UPDATE candidate SET artifact_text='different' WHERE id='c'");
  if(attack==='verification')sql(db,"UPDATE candidate_verification SET record_json=(SELECT record_json FROM candidate_verification WHERE candidate_id='other-candidate') WHERE candidate_id='c'");
  await assert.rejects(core.call('file_query',query()),{code:'INTEGRITY_REFUSAL'});
  await assert.rejects(core.decide(decision()),{code:'INTEGRITY_REFUSAL'});
  assert.deepEqual(sql(db,'SELECT version FROM matter WHERE id=?',['m']),[[0]]);
  assert.deepEqual(sql(db,'SELECT count(*) FROM decision'),[[0]]);
 });
});

test('a changed trusted policy cannot accept an old PASS; empty evidence is diagnostic failed',()=>fixture(async(core,dir)=>{
 await save(core);await save(core,{id:'empty-evidence',evidence:[]});
 assert.equal((await core.snapshot('m')).candidates.find(c=>c.id==='empty-evidence').files.verification,'failed');
 await close(core);await assert.rejects(core.decide(decision('empty-evidence')),{code:'VERIFICATION_REQUIRED'});await core.close();
 const code=`import sys,json;sys.path.insert(0,sys.argv[1]);from bridge import open_or_initialize,close_store;from core import TrustedReviewer,CoreError;from file_candidates import POLICY\ns=open_or_initialize(sys.argv[2]);POLICY['version']=2\ntry: TrustedReviewer(s).decide(json.loads(sys.argv[3]))\nexcept CoreError as e: print(e.code)\nfinally: close_store(s)`;
 const changed=spawnSync('python3',['-c',code,new URL('../core',import.meta.url).pathname,path.join(dir,'state.db'),JSON.stringify(decision())],{encoding:'utf8'});
 assert.equal(changed.status,0,changed.stderr);assert.equal(changed.stdout.trim(),'POLICY_STALE');assert.equal((await core.snapshot('m')).decisions.length,0);
}));

test('unknown file schema exposes scoped bounded metadata but cannot decode or accept',()=>fixture(async(core,dir)=>{
 await save(core);await close(core);await core.close();
 const db=path.join(dir,'state.db');const identity=JSON.parse(sql(db,'SELECT payload_json FROM candidate WHERE id=?',['c'])[0][0]);identity.fileBundle.schema='future-schema';
 sql(db,'UPDATE candidate SET payload_json=? WHERE id=?',[JSON.stringify(identity),'c']);
 const v=await core.snapshot('m');assert.equal(v.candidates[0].files.acceptable,false);assert.deepEqual(v.candidates[0].files.reasons,['CONTRACT_UNSUPPORTED']);
 const metadata=await core.call('file_query',query('c',{kind:'file-manifest',limit:16}));assert.equal(metadata.status,'unsupported');assert.equal(Object.hasOwn(metadata,'text'),false);
 await assert.rejects(core.call('file_query',query()),{code:'CONTRACT_UNSUPPORTED'});await assert.rejects(core.decide(decision()),{code:'CONTRACT_UNSUPPORTED'});
}));


test('verification outcome corruption is refused and acceptance rechecks required evidence',()=>fixture(async(core,dir)=>{
 await save(core,{evidence:[]});await close(core);
 const db=path.join(dir,'state.db');
 const record=JSON.parse(sql(db,'SELECT record_json FROM candidate_verification WHERE candidate_id=?',['c'])[0][0]);
 record.result='passed';record.reasons=[];
 sql(db,'UPDATE candidate_verification SET record_json=? WHERE candidate_id=?',[JSON.stringify(record),'c']);
 await assert.rejects(core.decide(decision()),{code:'INTEGRITY_REFUSAL'});
 assert.equal(await core.queryRequest('d'),null);
 // Even a coordinated record/checksum rewrite cannot skip the file policy.
 const r=spawnSync('python3',['-c','import json,hashlib,sqlite3,sys; db=sqlite3.connect(sys.argv[1]); r=db.execute("SELECT record_json FROM candidate_verification").fetchone()[0]; d=hashlib.sha256(json.dumps(json.loads(r),ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest(); db.execute("UPDATE candidate_verification SET record_digest=?",(d,)); db.commit()',db],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
 await assert.rejects(core.decide(decision()),{code:'VERIFICATION_REQUIRED'});
 assert.equal(await core.queryRequest('d'),null);
}));


test('file runs require a concrete Session identity at the private bridge boundary',()=>fixture(async core=>{
 await close(core);
 for(const sessionRef of [null,'']){
  const runId=sessionRef===null?'null-session':'empty-session';
  await core.createRun({runId,matterId:'m',sessionRef,baseVersion:0,sourceVersion:1,contractVersion:contract,instruction:'fixed'});
  await assert.rejects(core.call('initialize_file_run',{context:{matter_id:'m',run_id:runId},input:{systemPrompt:'Host',currentContext:'Fixed',runtimeProfile:{revision:1,hash:hash('runtime')},cleanSession:true,reasons:[]}}),{code:'BINDING_MISMATCH'});
  await core.updateRun({runId,status:'completed',admissionOpen:false});
 }
}));
