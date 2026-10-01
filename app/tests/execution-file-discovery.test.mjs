import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash,randomUUID} from 'node:crypto';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const surface=async(h,s)=>(await h.api('GET',`/sessions/${s.id}/surface`)).json;
const contentOf=message=>typeof message.content==='string'?message.content:(message.content??[]).map(part=>part.text??'').join('');
// The Work context reaches the model as one JSON object {text,provenance}
// followed by prose; take exactly that object out of what the provider received.
function receivedContext(messages){
 for(const message of messages){
  const content=contentOf(message),start=content.indexOf('{"text":"{\\"schemaVersion\\":3');
  if(start<0)continue;
  let depth=0,quoted=false;
  for(let i=start;i<content.length;i++){
   const ch=content[i];
   if(quoted){if(ch==='\\')i++;else if(ch==='"')quoted=false;continue;}
   if(ch==='"')quoted=true;else if(ch==='{')depth++;else if(ch==='}'&&--depth===0)return JSON.parse(JSON.parse(content.slice(start,i+1)).text);
  }
 }
 return null;
}

test('a new Session lists an accepted file bundle from its context, reads a listed file and keeps complete coverage',async()=>{
 // Neither the file name nor its bytes are known to the second Run: both are
 // random here and absent from the artifact text, the instruction and the script.
 const name=`out/${randomUUID()}.txt`,bytes=`Accepted ${randomUUID()} 😀\n`;
 const seen={context:null,pointer:null,listing:null,page:null,tools:null};
 const h=await boot({fakeResponder:({body,requestNumber,mode})=>{
  if(!mode.includes('continue the accepted work'))return null;
  const results=body.messages.filter(m=>m.role==='tool');
  const base={id:`fd-${requestNumber}`,created:1,toolCallId:`fd-call-${requestNumber}`};
  const done={...base,kind:'text',text:'Done.'};
  if(results.length===0){
   seen.tools=(body.tools??[]).map(t=>t.function?.name??t.name);
   seen.context=receivedContext(body.messages);
   seen.pointer=seen.context?.artifact?.files?.list??null;
   if(!seen.pointer)return done;
   const {tool,...args}=seen.pointer;
   return {...base,kind:'tool',name:tool,arguments:args};
  }
  if(results.length===1){
   seen.listing=JSON.parse(results[0].content);
   return {...base,kind:'tool',name:'se_read_artifact_file',arguments:{artifactId:seen.context.artifact.id,path:seen.listing.files[0].path}};
  }
  if(results.length===2){
   seen.page=JSON.parse(results[1].content);
   return {...base,kind:'tool',name:'se_read_source',arguments:{sourceId:seen.context.sourceRefs[0].id}};
  }
  if(results.length===3)return {...base,kind:'tool',name:'ws_write',arguments:{path:'out/next.txt',text:`Continued from ${seen.page.text}`}};
  if(results.length===4){
   const s=JSON.parse(results[2].content);
   const receipt=JSON.parse(results[3].content.split('\n').find(line=>line.startsWith('{"recordedFile"'))).recordedFile;
   return {...base,kind:'tool',name:'se_submit_candidate',arguments:{artifact_text:'Continued memo.',evidence:[{source_id:s.id,source_version:s.version,start:0,end:Array.from(s.text).length,quote:s.text,digest:s.digest}],obligations:[],recordedFiles:[{path:receipt.path,sha256:receipt.sha256}]}};
  }
  return done;
 }});
 try{
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const first=await h.createSession({permissionMode:'draft'});
  assert.equal((await h.api('POST',`/sessions/${first.id}/extension`,{extensionId:'evidence-memo',input:{title:'File memo',sourceText:'Approved source.',profile:'file-memo-v1'}})).status,200);
  let s=await surface(h,first);const source=s.projection.sources[0],matterId=s.projection.matter.id;
  const made=await h.api('POST',`/sessions/${first.id}/runs`,{commandId:'produce',input:h.scriptInput([{name:'ws_write',arguments:{path:name,text:bytes}},{name:'se_submit_candidate',arguments:{artifact_text:'Source-backed memo.',evidence:[{source_id:source.id,source_version:source.version,start:0,end:Array.from(source.text).length,quote:source.text,digest:source.digest}],obligations:[],recordedFiles:[{path:name,sha256:hash(bytes)}]}}])});
  assert.equal(made.status,200,JSON.stringify(made.json));assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
  s=await surface(h,first);assert.equal(s.projection.candidates.length,1,JSON.stringify(h.runtime.store.listEvents({sessionId:first.id}).filter(e=>e.type==='tool.result')));
  const candidate=s.projection.candidates[0];assert.equal(candidate.files.acceptable,true);
  const decision=await h.api('POST',`/sessions/${first.id}/actions`,{extensionId:'evidence-memo',generation:s.extension.generation,fileCapabilityVersion:1,action:'decide',payload:{request_id:'accept-bundle',candidate_id:candidate.id,base_version:0,action:'accept',reason:'reviewed exact file'}});
  assert.equal(decision.status,200,JSON.stringify(decision.json));
  const artifactId=decision.json.result.active_artifact;
  assert.equal(decision.json.projection.artifact.content.includes(name.slice(4)),false,'the artifact text does not name the file');

  // The new Session is bound with the Matter identity alone.
  const next=await h.createSession({permissionMode:'draft'});
  assert.equal((await h.api('POST',`/sessions/${next.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:matterId}})).status,200);
  const run=await h.api('POST',`/sessions/${next.id}/runs`,{commandId:'continue',input:'continue the accepted work'});
  assert.equal(run.status,200,JSON.stringify(run.json));assert.equal((await h.pollRun(run.json.run.id)).status,'completed');

  assert.equal(seen.context?.artifact?.id,artifactId,'the new Run received the active Artifact identity');
  assert.ok(seen.tools.includes('se_list_files'),`a listing tool is admitted beside the readers: ${seen.tools.filter(t=>t.startsWith('se_'))}`);
  assert.deepEqual(seen.context.artifact.files,{kind:'file-bundle',fileCount:1,byteLength:Buffer.byteLength(bytes),bundleDigest:candidate.files.bundleDigest,list:{tool:'se_list_files',artifactId}},'the context states the bundle and names its listing tool');
  const results=h.runtime.store.listEvents({sessionId:next.id}).filter(e=>e.type==='tool.result');
  assert.deepEqual(results.map(e=>[e.data.name,e.data.isError]),[['se_list_files',false],['se_read_artifact_file',false],['se_read_source',false],['ws_write',false],['se_submit_candidate',false]],JSON.stringify(results));
  assert.deepEqual(seen.listing,{artifactId,bundleDigest:candidate.files.bundleDigest,fileCount:1,files:[{path:name,bytes:Buffer.byteLength(bytes),sha256:hash(bytes)}]},'the listing carries path, bytes and sha256 only');
  assert.equal(seen.page.text,bytes,'the bytes read through the listed path are the accepted bytes');
  assert.equal(seen.page.fileDigest,hash(bytes));
  const after=(await surface(h,next)).projection;
  const produced=after.candidates.find(c=>c.status==='pending');
  assert.ok(produced,'the continuing Run submitted a candidate');
  assert.equal(produced.files.coverage,'complete',JSON.stringify(produced.files.reasons));
  assert.equal(produced.files.acceptable,true);
  assert.equal(produced.files.basis.base.artifactId,artifactId);

  // A pending bundle is stated the same way, by candidate identity.
  const third=await h.createSession({permissionMode:'draft'});
  assert.equal((await h.api('POST',`/sessions/${third.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:matterId}})).status,200);
  // Listing anything but the frozen base is an extra input, as reading it is.
  const other=await h.api('POST',`/sessions/${third.id}/runs`,{commandId:'list-pending',input:h.scriptInput([{name:'se_list_files',arguments:{candidateId:produced.id}},{name:'ws_write',arguments:{path:'out/third.txt',text:'third\n'}},{name:'se_submit_candidate',arguments:{artifact_text:'Third memo.',evidence:produced.evidence,obligations:[],recordedFiles:[{path:'out/third.txt',sha256:hash('third\n')}]}}])});
  assert.equal(other.status,200,JSON.stringify(other.json));assert.equal((await h.pollRun(other.json.run.id)).status,'completed');
  const stored=JSON.parse((await surface(h,third)).projection.runs.find(r=>r.id===other.json.run.id).workContext.text);
  assert.deepEqual(stored.pending.find(p=>p.id===produced.id).files,{kind:'file-bundle',fileCount:1,byteLength:produced.files.byteLength,bundleDigest:produced.files.bundleDigest,list:{tool:'se_list_files',candidateId:produced.id}});
  const listed=h.runtime.store.listEvents({sessionId:third.id}).filter(e=>e.type==='tool.result');
  assert.equal(listed[0].data.isError,false,JSON.stringify(listed[0]));
  assert.deepEqual(JSON.parse(listed[0].data.text).files.map(f=>Object.keys(f)),[['path','bytes','sha256']]);
  const extra=(await surface(h,third)).projection.candidates.find(c=>c.artifact_text==='Third memo.');
  assert.equal(extra.files.coverage,'unknown');assert.ok(extra.files.reasons.includes('tool:se_list_files'),JSON.stringify(extra.files.reasons));

  // Naming the frozen base together with a candidate, or naming an Artifact
  // that is not the base, is not a base listing: each marks before it runs.
  for(const [label,args,refused] of [['base with a candidate',{artifactId,candidateId:produced.id},true],['not the base',{artifactId:'artifact-not-the-base'},true]]){
   const session=await h.createSession({permissionMode:'draft'});
   assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:matterId}})).status,200);
   const text=`${label}\n`;
   const made=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'list-other',input:h.scriptInput([{name:'se_list_files',arguments:args},{name:'ws_write',arguments:{path:'out/case.txt',text}},{name:'se_submit_candidate',arguments:{artifact_text:`Memo: ${label}.`,evidence:produced.evidence,obligations:[],recordedFiles:[{path:'out/case.txt',sha256:hash(text)}]}}])});
   assert.equal(made.status,200,JSON.stringify(made.json));assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
   const result=h.runtime.store.listEvents({sessionId:session.id}).find(e=>e.type==='tool.result'&&e.data.name==='se_list_files');
   assert.equal(result.data.isError,refused,label+result.data.text);
   const saved=(await surface(h,session)).projection.candidates.find(c=>c.artifact_text===`Memo: ${label}.`);
   assert.ok(saved,label);
   assert.equal(saved.files.coverage,'unknown',label);assert.deepEqual(saved.files.reasons.filter(r=>r.startsWith('tool:')),['tool:se_list_files'],label);
  }
 }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('the listing refuses both or neither identity, unknown fields and another Matter, and returns no producer fields',async()=>{
 const h=await boot();
 try{
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const bind=async()=>{
   const session=await h.createSession({permissionMode:'draft'});
   assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'File memo',sourceText:'Approved source.',profile:'file-memo-v1'}})).status,200);
   const p=(await surface(h,session)).projection;return {session,source:p.sources[0]};
  };
  const produce=async({session,source})=>{
   const made=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'produce',input:h.scriptInput([{name:'ws_write',arguments:{path:'out/memo.txt',text:'A\n'}},{name:'se_submit_candidate',arguments:{artifact_text:'Source-backed memo.',evidence:[{source_id:source.id,source_version:source.version,start:0,end:Array.from(source.text).length,quote:source.text,digest:source.digest}],obligations:[],recordedFiles:[{path:'out/memo.txt',sha256:hash('A\n')}]}}])});
   assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
   return (await surface(h,session)).projection.candidates[0];
  };
  const mine=await bind(),theirs=await bind();
  const own=await produce(mine),foreign=await produce(theirs);
  const made=await h.api('POST',`/sessions/${mine.session.id}/runs`,{commandId:'refusals',input:h.scriptInput([
   {name:'se_list_files',arguments:{}},
   {name:'se_list_files',arguments:{candidateId:own.id,artifactId:'artifact-x'}},
   {name:'se_list_files',arguments:{candidateId:foreign.id}},
   {name:'se_list_files',arguments:{candidateId:own.id,path:'out/memo.txt'}},
   {name:'se_list_files',arguments:{candidateId:own.id}},
  ])});
  assert.equal(made.status,200,JSON.stringify(made.json));assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
  const results=h.runtime.store.listEvents({sessionId:mine.session.id}).filter(e=>e.type==='tool.result'&&e.data.name==='se_list_files');
  assert.deepEqual(results.map(e=>e.data.isError),[true,true,true,true,false],JSON.stringify(results.map(e=>e.data.text)));
  assert.match(results[2].data.text,/BINDING_MISMATCH|ownership/u);
  assert.equal(results[2].data.text.includes('out/memo.txt'),false,'a foreign bundle is not listed');
  const listing=JSON.parse(results[4].data.text);
  assert.deepEqual(Object.keys(listing),['candidateId','bundleDigest','fileCount','files']);
  for(const key of ['sessionId','runId','recordIndex','writtenAt'])assert.equal(results[4].data.text.includes(key),false,key);
 }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});
