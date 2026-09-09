// Actual HTTP/Pi/Core synthetic packets. No external provider, files or account.
import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {boot} from '../tests/helpers.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const h=await boot();
const checked=async(method,route,body)=>{
 const r=await h.api(method,route,body);assert.equal(r.status,200,JSON.stringify(r.json));return r.json;
};
const packets={schemaVersion:1,dataClass:'synthetic; actual HTTP/Pi loopback/Core',cases:{}};
try{
 await checked('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
 const cases={};
 for(const name of ['ready','unknown','failed','stale','accepted','rejected','unsupported','missing-bytes']){
  const session=await h.createSession();
  const bindingRequest={extensionId:'evidence-memo',input:{title:'File fixture '+name,sourceText:'Approved source.',profile:'file-memo-v1'}};
  await checked('POST',`/sessions/${session.id}/extension`,bindingRequest);
  const initial=await checked('GET',`/sessions/${session.id}/surface`);
  const source=initial.projection.sources[0];const content='Exact file 😀\n';
  const candidate={artifact_text:'Source-backed file memo.',evidence:name==='failed'?[]:[{source_id:source.id,source_version:1,start:0,end:source.text.length,quote:source.text,digest:source.digest}],obligations:[],recordedFiles:[{path:'out/memo.txt',sha256:hash(content)}]};
  const runRequest={commandId:'file-fixture-'+name,input:h.scriptInput([{name:'ws_write',arguments:{path:'out/memo.txt',text:content}},...(name==='unknown'?[{name:'ws_list',arguments:{}}]:[]),{name:'se_submit_candidate',arguments:candidate}])};
  const made=await checked('POST',`/sessions/${session.id}/runs`,runRequest);await h.pollRun(made.run.id);
  let surface=await checked('GET',`/sessions/${session.id}/surface`);assert.equal(surface.projection.candidates.length,1);
  const id=surface.projection.candidates[0].id;
  const query=new URLSearchParams({kind:'file-content',candidateId:id,path:'out/memo.txt',offset:'0',limit:'4'});
  const page=await checked('GET',`/sessions/${session.id}/work-query?${query}`);
  query.set('kind','file-manifest');query.set('limit','16');const manifest=await checked('GET',`/sessions/${session.id}/work-query?${query}`);
  query.set('kind','file-diff');const diff=await checked('GET',`/sessions/${session.id}/work-query?${query}`);
  let actionRequest=null,receipt=null;
  if(name==='stale'){
   const text='Changed source.';actionRequest={extensionId:'evidence-memo',generation:surface.extension.generation,fileCapabilityVersion:1,action:'replace_sources',payload:{sources:[{...source,version:2,text,digest:hash(text)}],revision:2}};
  }else if(name==='accepted'||name==='rejected')actionRequest={extensionId:'evidence-memo',generation:surface.extension.generation,fileCapabilityVersion:1,action:'decide',payload:{request_id:'fixture-'+name,candidate_id:id,base_version:0,action:name==='accepted'?'accept':'reject',reason:'Synthetic reviewed fixture'}};
  if(actionRequest){receipt=await checked('POST',`/sessions/${session.id}/actions`,actionRequest);surface=await checked('GET',`/sessions/${session.id}/surface`);}
  packets.cases[name]={bindingRequest,runRequest,actionRequest,receipt,packet:surface,manifest,page,diff};
  cases[name]={session,candidateId:id,matterId:surface.projection.matter.id};
 }
 const accepted=cases.accepted;
 const artifactId=packets.cases.accepted.packet.projection.artifact.id;
 const continued=await h.createSession();await checked('POST',`/sessions/${continued.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:accepted.matterId}});
 await checked('DELETE',`/sessions/${accepted.session.id}`);
 packets.continuation={producerSessionDeleted:true,page:await checked('GET',`/sessions/${continued.id}/work-query?${new URLSearchParams({kind:'file-content',artifactId,path:'out/memo.txt'})}`)};
 await checked('POST','/extensions/evidence-memo/lifecycle',{action:'unload'});
 packets.cases['producer-absent']={packet:await checked('GET',`/sessions/${continued.id}/surface`),page:packets.continuation.page};
 const db=h.runtime.service.workCore.dbPath;
 // Explicit fault injection in this disposable database, after all Runs end.
 const injection=spawnSync('python3',['-c',`import sqlite3,json,sys\nc=sqlite3.connect(sys.argv[1]);cid=sys.argv[2];p=json.loads(c.execute('SELECT payload_json FROM candidate WHERE id=?',(cid,)).fetchone()[0]);p['fileBundle']['schema']='future-schema';c.execute('UPDATE candidate SET payload_json=? WHERE id=?',(json.dumps(p),cid));c.execute('DELETE FROM candidate_file WHERE candidate_id=?',(sys.argv[3],));c.commit()`,db,cases.unsupported.candidateId,cases['missing-bytes'].candidateId],{encoding:'utf8'});
 assert.equal(injection.status,0,injection.stderr);
 packets.cases.unsupported={faultInjection:'unknown file schema in a synthetic candidate',packet:await checked('GET',`/sessions/${cases.unsupported.session.id}/surface`),metadata:await checked('GET',`/sessions/${cases.unsupported.session.id}/work-query?${new URLSearchParams({kind:'file-manifest',candidateId:cases.unsupported.candidateId})}`)};
 const missing=await h.api('GET',`/sessions/${cases['missing-bytes'].session.id}/work-query?${new URLSearchParams({kind:'file-content',candidateId:cases['missing-bytes'].candidateId,path:'out/memo.txt'})}`);
 assert.equal(missing.status,409);assert.equal(missing.json.error.code,'INTEGRITY_REFUSAL');
 packets.cases['missing-bytes']={faultInjection:'deleted synthetic file row',response:missing};
 packets.unrepresentable={pendingUnchecked:'Not emitted: candidate, files and immutable verification commit together.'};
 const target=process.argv[2]??new URL('../tests/fixtures/work-core/file-candidate-packets.json',import.meta.url);
 const existing=JSON.parse(await readFile(new URL('../tests/fixtures/work-core/file-candidate-packets.json',import.meta.url),'utf8'));
 const bytes=JSON.stringify({...existing,consumerFixtures:packets},null,2)+'\n';await writeFile(target,bytes);
 console.log(JSON.stringify({cases:Object.keys(packets.cases),bytes:Buffer.byteLength(bytes),sha256:hash(bytes),realProvider:'not_run'}));
}finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
