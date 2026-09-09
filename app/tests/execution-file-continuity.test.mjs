import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {boot} from './helpers.mjs';
import {candidateActions} from '../web/surface-modules.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
async function bind(h,permissionMode='draft'){
 await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
 const session=await h.createSession({permissionMode});
 const b=await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'File memo',sourceText:'Approved source.',profile:'file-memo-v1'}});
 assert.equal(b.status,200,JSON.stringify(b.json));
 const view=(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
 return {session,source:view.sources[0],matterId:view.matter.id};
}
const proposal=(s,content='A😀\n')=>({artifact_text:'Source-backed memo.',evidence:[{source_id:s.id,source_version:s.version,start:0,end:Array.from(s.text).length,quote:s.text,digest:s.digest}],obligations:[],recordedFiles:[{path:'out/memo.txt',sha256:hash(content)}]});
async function run(h,session,calls,id='files'){
 const r=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:id,input:h.scriptInput(calls)});
 assert.equal(r.status,200,JSON.stringify(r.json));return r.json.run.id;
}
const surface=async(h,s)=>(await h.api('GET',`/sessions/${s.id}/surface`)).json;
const fileQuery=(s,c,extra='')=>`/sessions/${s.id}/work-query?kind=file-content&candidateId=${c}&path=out%2Fmemo.txt${extra}`;

test('real service/Pi recorded write, permission CAS, save, human accept, deletion and producer-absent exact reads',async()=>{
 let sourceId, seenSource, observedReceipt;
 const h=await boot({fakeResponder:({body,requestNumber,mode})=>{
   if (!mode.includes('file-consumer fixed sources')) return null;
   const results=body.messages.filter(m=>m.role==='tool');
   const base={id:`es-${requestNumber}`,created:1,toolCallId:`es-call-${requestNumber}`};
   if(results.length===0)return {...base,kind:'tool',name:'se_read_source',arguments:{sourceId}};
   if(results.length===1){
     seenSource=JSON.parse(results[0].content);
     return {...base,kind:'tool',name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}};
   }
   if(results.length===2){
     const receiptText=results[1].content.split('\n').find(line=>line.startsWith('{"recordedFile"'));
     observedReceipt=JSON.parse(receiptText).recordedFile;
     return {...base,kind:'tool',name:'se_submit_candidate',arguments:{...proposal(seenSource),recordedFiles:[{path:observedReceipt.path,sha256:observedReceipt.sha256}]}};
   }
   return {...base,kind:'text',text:'Submitted for human review.'};
 }});try{
  const {session,source,matterId}=await bind(h,'ask'); sourceId=source.id;
  const created=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'file-consumer',input:'file-consumer fixed sources'});
  assert.equal(created.status,200);const id=created.json.run.id;
  const waiting=await h.pollRun(id,{until:s=>s==='waiting_user'||['failed','unknown','completed'].includes(s)});
  assert.equal(waiting.status,'waiting_user',JSON.stringify(h.runtime.store.listEvents({sessionId:session.id})));
  const q=h.runtime.store.snapshot().questions.find(q=>q.runId===id&&q.status==='pending');
  assert.equal((await h.api('POST',`/runs/${id}/questions/${q.id}`,{decision:'allow',expectedContentSha256:q.payload.contentSha256,expectedToolCallId:q.payload.toolCallId})).status,200);
  const done=await h.pollRun(id);assert.equal(done.status,'completed');assert.equal(done.artifacts.length,1);assert.equal(observedReceipt.sha256,done.artifacts[0].sha256);
  const s=await surface(h,session);assert.equal(s.projection.candidates.length,1,JSON.stringify(h.runtime.store.listEvents({sessionId:session.id})));
  const candidate=s.projection.candidates[0];assert.equal(candidate.files.coverage,'complete');assert.equal(candidate.files.acceptable,true);
  await writeFile(path.join(session.workspaceDir,'out/memo.txt'),'MUTATED CURRENT FILE');
  const page=await h.api('GET',fileQuery(session,candidate.id,'&offset=1&limit=1'));assert.equal(page.status,200);assert.equal(page.json.text,'😀');
  const body={extensionId:'evidence-memo',generation:s.extension.generation,action:'decide',payload:{request_id:'file-accept',candidate_id:candidate.id,base_version:0,action:'accept',reason:'reviewed exact file'}};
  assert.equal(s.extension.surface.module,null,'old text-only renderer cannot mount');
  assert.equal(candidateActions({humanActions:s.projection.humanActions},candidate.id).decide,null,'old action parser cannot execute schema 2');
  const oldClient=await h.api('POST',`/sessions/${session.id}/actions`,body);
  assert.equal(oldClient.status,409);assert.equal(oldClient.json.error.code,'CONTRACT_UNSUPPORTED');
  assert.equal((await surface(h,session)).projection.matter.version,0);
  const decision=await h.api('POST',`/sessions/${session.id}/actions`,{...body,fileCapabilityVersion:1});
  assert.equal(decision.status,200,JSON.stringify(decision.json));
  const artifactId=decision.json.result.active_artifact;
  const next=await h.createSession();
  assert.equal((await h.api('POST',`/sessions/${next.id}/extension`,{extensionId:'evidence-memo',input:{existingMatterId:matterId}})).status,200);
  assert.equal((await h.api('DELETE',`/sessions/${session.id}`)).status,200);
  const nextId=await run(h,next,[{name:'se_read_artifact_file',arguments:{artifactId,path:'out/memo.txt',offset:0,limit:4000}}],'read-formal');
  assert.equal((await h.pollRun(nextId)).status,'completed');
  const results=h.runtime.store.listEvents({sessionId:next.id}).filter(e=>e.type==='tool.result');
  assert.equal(results[0].data.isError,false,JSON.stringify(results));assert.match(results[0].data.text,/A😀/u);
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'unload'});
  const historical=await h.api('GET',`/sessions/${next.id}/work-query?kind=file-content&artifactId=${artifactId}&path=out%2Fmemo.txt`);
  assert.equal(historical.status,200);assert.equal(historical.json.text,'A😀\n');
  assert.equal((await surface(h,next)).projection.readOnly,true);
 }finally{await h.runtime.close();}
});

test('extra workspace reads and continued history yield unknown; an unrecorded selector never imports',async()=>{
 const h=await boot();try{
  const {session,source}=await bind(h);
  const id=await run(h,session,[{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}},{name:'ws_read',arguments:{path:'out/memo.txt'}},{name:'se_submit_candidate',arguments:proposal(source)}]);
  assert.equal((await h.pollRun(id)).status,'completed');
  const v=await surface(h,session);assert.equal(v.projection.candidates.length,1,JSON.stringify(h.runtime.store.listEvents({sessionId:session.id})));
  assert.equal(v.projection.candidates[0].files.coverage,'unknown');assert.equal(v.projection.candidates[0].files.acceptable,false);
  const next=await run(h,session,[{name:'se_submit_candidate',arguments:proposal(source)}],'unrecorded-in-this-run');
  await h.pollRun(next);assert.equal((await surface(h,session)).projection.candidates.length,1);
 }finally{await h.runtime.close();}
});

async function putReference(h,session){
 const route='/runtime-control?sessionId='+session.id;
 const state=(await h.api('GET',route)).json;
 const changed=await h.api('PUT',route,{revision:state.revision,operation:'put',resource:{id:'local:fixed-reference',kind:'reference',title:'Reference',scope:{type:'session',id:session.id},content:'Additional reference body'}});
 assert.equal(changed.status,200,JSON.stringify(changed.json));
}

test('actual list/grep/ask/load inputs, continued history and compaction-enabled admission remain unknown',async()=>{
 for(const mode of ['ws_list','ws_grep','ask_user','runtime_load','history','compaction']){
  const h=await boot(mode==='compaction'?{compaction:{enabled:true}}:{});try{
   const {session,source}=await bind(h);
   if(mode==='runtime_load')await putReference(h,session);
   if(mode==='history'){const first=await run(h,session,[],'earlier');await h.pollRun(first);}
   const extra=mode==='ws_list'?{name:mode,arguments:{}}:mode==='ws_grep'?{name:mode,arguments:{path:'out',pattern:'A'}}:mode==='ask_user'?{name:mode,arguments:{prompt:'Additional detail?'}}:mode==='runtime_load'?{name:mode,arguments:{id:'local:fixed-reference'}}:null;
   const id=await run(h,session,[{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}},...(extra?[extra]:[]),{name:'se_submit_candidate',arguments:proposal(source)}]);
   if(mode==='ask_user'){
    assert.equal((await h.pollRun(id,{until:s=>s==='waiting_user'||['failed','completed','unknown'].includes(s)})).status,'waiting_user');
    const q=h.runtime.store.snapshot().questions.find(q=>q.runId===id&&q.status==='pending');
    await h.api('POST',`/runs/${id}/questions/${q.id}`,{answer:'Extra user material'});
   }
   await h.pollRun(id);
   const projection=(await surface(h,session)).projection;
   assert.equal(projection.candidates.length,1,mode+JSON.stringify(h.runtime.store.listEvents({sessionId:session.id}).filter(e=>e.type==='error'||e.type==='tool.result')));
   assert.equal(projection.candidates[0].files.coverage,'unknown',mode);assert.equal(projection.candidates[0].files.acceptable,false,mode);
   assert(projection.candidates[0].files.reasons.some(r=>r===(mode==='history'?'session_history':mode==='compaction'?'compaction_enabled':`tool:${mode}`)),mode);
  }finally{await h.runtime.close();}
 }
});

test('steering, failed coverage persistence, and Stop racing immutable capture cannot publish a complete candidate',async()=>{
 for(const mode of ['steer','marker-failure','stop']){
  const h=await boot();let releaseRead, rejectMarker;try{
   const {session,source}=await bind(h);
   let captured;
   const begin=h.runtime.registry.begin.bind(h.runtime.registry);
   h.runtime.registry.begin=async args=>{const out=await begin(args);captured=out.run;return out;};
   let signalRead;const reading=new Promise(resolve=>{signalRead=resolve;});
   const gate=new Promise(resolve=>{releaseRead=resolve;});
   const original=h.runtime.service.artifactHistory.read.bind(h.runtime.service.artifactHistory);
   h.runtime.service.artifactHistory.read=async(...args)=>{const bytes=await original(...args);signalRead();await gate;return bytes;};
   const id=await run(h,session,[{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}},{name:'se_submit_candidate',arguments:proposal(source)}]);
   await reading;
   if(mode==='steer'){
    await h.runtime.service.active.get(id).session.steer('Additional user direction during capture');releaseRead();
   }else if(mode==='marker-failure'){
    const core=h.runtime.service.workCore;const originalCall=core.call.bind(core);
    const markerGate=new Promise((_resolve,reject)=>{rejectMarker=reject;});
    core.call=(op,body)=>op==='mark_file_input'?markerGate:originalCall(op,body);
    const marking=captured.fileMemo.markUnknown('host:synthetic-failed-marker').catch(error=>error);
    releaseRead();
    await new Promise(resolve=>setTimeout(resolve,100));
    rejectMarker(Object.assign(new Error('synthetic marker persistence failed'),{code:'CORE_UNAVAILABLE'}));await marking;
    core.call=originalCall;
   }else{
    const stopping=h.api('POST',`/runs/${id}/cancel`,{});
    await h.pollRun(id,{until:s=>s==='stopping'||s==='cancelled'});releaseRead();await stopping;
   }
   await h.pollRun(id);const projection=(await surface(h,session)).projection;
   assert.equal(projection.candidates.length,mode==='steer'?1:0,mode);
   if(mode==='steer')assert.equal(projection.candidates[0].files.coverage,'unknown');
   assert.equal(projection.decisions.length,0);
  }finally{releaseRead?.();rejectMarker?.(new Error('cleanup'));await h.runtime.close();}
 }
});

import {rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
test('missing or corrupt history rejects recorded import even though current workspace bytes still exist',async()=>{
 for(const mode of ['missing','corrupt']){
  const h=await boot();try{
   const {session,source}=await bind(h);
   const history=h.runtime.service.artifactHistory;const original=history.read.bind(history);
   history.read=async(...args)=>{
    const repo=history.repository(session.id);
    if(mode==='missing')await rm(repo,{recursive:true,force:true});
    else{
     const oid=spawnSync('git',['--git-dir',repo,'rev-parse',`refs/content-sha256/${args[1]}`],{encoding:'utf8',env:{...process.env,GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_NOSYSTEM:'1'}});
     assert.equal(oid.status,0,oid.stderr);const object=oid.stdout.trim();
     await writeFile(path.join(repo,'objects',object.slice(0,2),object.slice(2)),'corrupt object');
    }
    return original(...args);
   };
   const id=await run(h,session,[{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}},{name:'se_submit_candidate',arguments:proposal(source)}]);
   const finished=await h.pollRun(id);assert.equal(finished.artifacts.length,1);
   assert.equal((await surface(h,session)).projection.candidates.length,0);
   const results=h.runtime.store.listEvents({sessionId:session.id}).filter(e=>e.type==='tool.result'&&e.data.name==='se_submit_candidate');assert.equal(results[0].data.isError,true);
  }finally{await h.runtime.close();}
 }
});

import http from 'node:http';
test('a real loopback MCP tool executes only after its extra-input marker is durable',async()=>{
 let h;const observed=[];
 const server=http.createServer(async(req,res)=>{
  if(req.method!=='POST'){res.writeHead(405);res.end();return;}
  let raw='';for await(const chunk of req)raw+=chunk;const request=JSON.parse(raw);
  if(request.id===undefined){res.writeHead(202);res.end();return;}
  let result;
  if(request.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
  else if(request.method==='tools/list')result={tools:[{name:'material',description:'Synthetic material',inputSchema:{type:'object',properties:{}}}],ttlMs:0,cacheScope:'private'};
  else if(request.method==='tools/call'){
   const checked=spawnSync('python3',['-c',"import sqlite3,sys,json;c=sqlite3.connect(sys.argv[1]);print(json.loads(c.execute('SELECT basis_json FROM file_run_basis').fetchone()[0])['coverage'])",h.runtime.service.workCore.dbPath],{encoding:'utf8'});
   observed.push(checked.stdout.trim());result={content:[{type:'text',text:'Additional MCP material'}]};
  }
  res.setHeader('content-type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:request.id,...(result?{result:{resultType:'complete',...result}}:{error:{code:-32601,message:'unsupported'}})}));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 h=await boot();try{
  const {session,source}=await bind(h);const route='/runtime-control?sessionId='+session.id;
  const get=async()=>(await h.api('GET',route)).json;
  const change=async body=>{const r=await h.api('PUT',route,{revision:(await get()).revision,...body});assert.equal(r.status,200,JSON.stringify(r.json));};
  const scope={type:'session',id:session.id};
  await change({operation:'put',resource:{id:'local:es-mcp',kind:'mcp_server',title:'ES fixture',scope,content:JSON.stringify({transport:'streamable-http',protocol:'2026-07-28',url:'http://127.0.0.1:'+server.address().port})}});
  const connect=await h.api('POST','/mcp/local%3Aes-mcp/lifecycle?sessionId='+session.id,{revision:(await get()).revision,action:'connect'});assert.equal(connect.status,200,JSON.stringify(connect.json));
  await change({operation:'exposure',id:'local:es-mcp',scope,exposed:true});const tool=(await get()).resources.find(r=>r.mcp);
  const id=await run(h,session,[{name:tool.executionName,arguments:{}},{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\n'}},{name:'se_submit_candidate',arguments:proposal(source)}]);
  assert.equal((await h.pollRun(id,{until:s=>s==='waiting_user'||['failed','completed','unknown'].includes(s)})).status,'waiting_user');assert.deepEqual(observed,[]);
  const q=h.runtime.store.snapshot().questions.find(q=>q.runId===id&&q.status==='pending');await h.api('POST',`/runs/${id}/questions/${q.id}`,{decision:'allow'});
  await h.pollRun(id);assert.deepEqual(observed,['unknown']);const v=(await surface(h,session)).projection;assert.equal(v.candidates.length,1);assert.equal(v.candidates[0].files.acceptable,false);
 }finally{await h.runtime.close();await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});

import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {spawnWorker,reopen} from './helpers.mjs';
test('SIGKILL after history or rename leaves an orphan version that no later Run may import',async()=>{
 for(const point of ['after_history','after_write']){
  const dataDir=await mkdtemp(path.join(tmpdir(),'cw-es-orphan-'));let next;
  const worker=spawnWorker({dataDir,env:{SE_TEST_MODE:'1',SE_TEST_CRASH_POINT:point},body:`
   await api('PUT','/provider-credential',{connectionId:'catalog-fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY});
   await api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
   const project=(await api('POST','/projects',{name:'orphan fixture'})).json.project;
   const session=(await api('POST','/sessions',{projectId:project.id,title:'orphan fixture'})).json.session;
   await api('POST','/sessions/'+session.id+'/extension',{extensionId:'evidence-memo',input:{title:'File memo',sourceText:'Approved source.',profile:'file-memo-v1'}});
   emit({stage:'ready',sessionId:session.id});
   const made=await api('POST','/sessions/'+session.id+'/runs',{commandId:'orphan-write',input:'/fixture script '+JSON.stringify([{name:'ws_write',arguments:{path:'out/memo.txt',text:'A😀\\n'}}])});
   emit({stage:'submitted',runId:made.json.run.id});
   await new Promise(()=>{});
  `});
  try{
   const ready=await worker.waitForLine(v=>v.stage==='ready');assert.ok(ready,worker.stderr);
   const submitted=await worker.waitForLine(v=>v.stage==='submitted');assert.ok(submitted,worker.stderr);
   assert.equal((await worker.waitForExit()).signal,'SIGKILL');
   await new Promise(resolve=>setTimeout(resolve,300));
   next=await reopen(dataDir);
   assert.equal(next.runtime.store.getRun(submitted.runId).artifacts.length,0);
   const blob=await next.runtime.service.artifactHistory.read(ready.sessionId,hash('A😀\n'),Buffer.byteLength('A😀\n'));assert.equal(blob.toString(),'A😀\n');
   const packet=(await next.api('GET',`/sessions/${ready.sessionId}/surface`)).json.projection;
   const made=await next.api('POST',`/sessions/${ready.sessionId}/runs`,{commandId:'orphan-import',input:'/fixture script '+JSON.stringify([{name:'se_submit_candidate',arguments:proposal(packet.sources[0])}])});
   assert.equal(made.status,200,JSON.stringify(made.json));
   for(let attempt=0;attempt<200&&!['completed','failed','unknown','cancelled'].includes(next.runtime.store.getRun(made.json.run.id).status);attempt++)await new Promise(resolve=>setTimeout(resolve,25));
   assert.equal((await next.api('GET',`/sessions/${ready.sessionId}/surface`)).json.projection.candidates.length,0);
   const result=next.runtime.store.listEvents({sessionId:ready.sessionId}).find(e=>e.runId===made.json.run.id&&e.type==='tool.result'&&e.data.name==='se_submit_candidate');assert.equal(result?.data.isError,true);
  }finally{await worker.kill();await next?.runtime.close();await rm(dataDir,{recursive:true,force:true});}
 }
});
