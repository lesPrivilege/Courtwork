import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rm, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { boot } from './helpers.mjs';
import { ATTENTION_TOOL_NAMES } from '../runtime/attention-tools.mjs';
import { createGovernanceAdapter } from '../extensions/governance-adapter.mjs';

const ok = r => { assert.equal(r.status,200,JSON.stringify(r.json)); return r.json; };
const query = (h, q, projectId=h.projectId) => h.api('POST','/governance/query',{projectId,query:{schema_version:1,...q}});
const reference = (h, id) => ({project_id:h.projectId,kind:'matter',id});
async function prepare(h) {
  ok(await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'}));
  const session=await h.createSession();
  ok(await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'Governed fixture',sourceText:'Synthetic governed source 😀\nSecond page'}}));
  const surface=ok(await h.api('GET',`/sessions/${session.id}/surface`));
  return {session,id:surface.projection.matter.id};
}
async function disclosure(h,id,grant,requestId=randomUUID()) {
  const view=ok(await query(h,{kind:grant === null ? 'policy' : 'inspect',object_ref:reference(h,id)}));
  const request={schema_version:1,request_id:requestId,matter_id:id,expected_policy_revision:view.policy.revision,expected_object_version:grant === null ? null : view.object_version,grant};
  return {request,response:await h.api('POST',`/governance/matters/${id}/disclosure`,{projectId:h.projectId,request})};
}
const grant = h => ({adapter_id:h.runtime.service.adapterId,purpose:'attention-runtime',fields:['registry','details','sources','artifacts'],expires_at:'2099-01-01T00:00:00Z',content_scope:'current'});
async function execute(h,sessionId,name,args) {
  const created=ok(await h.api('POST',`/sessions/${sessionId}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name,arguments:args}])}));
  const run=await h.pollRun(created.run.id,{timeoutMs:15000});
  assert.equal(run.status,'completed',JSON.stringify(run.error));
  const snapshot=ok(await h.api('GET',`/sessions/${sessionId}`));
  const result=snapshot.events.find(e=>e.runId===run.id && e.type==='tool.result' && e.data.name===name);
  assert(result,JSON.stringify(snapshot.events.map(e=>[e.type,e.data])));
  return result.data;
}

test('governance authenticated HTTP rejects identity injection and cross-project refs, grants are human-only',async()=>{
  const h=await boot();
  try {
    const {id}=await prepare(h);
    const unauth=await fetch(h.runtime.url+'/api/v5/governance/query',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId:h.projectId,query:{schema_version:1,kind:'registry'}})});
    assert.equal(unauth.status,401);
    assert.equal((await h.api('POST','/governance/query',{projectId:h.projectId,query:{schema_version:1,kind:'registry'},actor:'local-user'})).status,400);
    assert.equal((await query(h,{kind:'registry',context:{actor:'local-user'}})).json.error.code,'INVALID');
    const other=ok(await h.api('POST','/projects',{name:'other'})).project.id;
    const hidden=await query(h,{kind:'inspect',object_ref:{...reference(h,id),project_id:other}},other);
    assert.equal(hidden.json.error.code,'NOT_FOUND');
    const issued=await disclosure(h,id,grant(h),'grant-http');ok(issued.response);
    const duplicate=await h.api('POST',`/governance/matters/${id}/disclosure`,{projectId:h.projectId,request:issued.request});
    assert.deepEqual(ok(duplicate),issued.response.json);
    assert.equal((await h.api('POST',`/governance/matters/wrong/disclosure`,{projectId:h.projectId,request:issued.request})).status,400);
    assert.equal((await h.api('POST',`/governance/matters/${id}/disclosure`,{projectId:h.projectId,request:issued.request,context:{actor:'runtime'}})).status,400);
    assert.equal((await h.api('POST',`/governance/matters/${id}/disclosure`,{projectId:other,request:issued.request})).json.error.code,'NOT_FOUND');
    assert.equal((await query(h,{kind:'registry'})).json.count,1);
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('global Pi tools discover, inspect and read exact governed evidence; project catalogs cannot install them',async()=>{
  const h=await boot();const packets={schemaVersion:1,source:'synthetic authenticated HTTP and actual local-fake Pi tool events',packets:{}};
  try {
    const {session,id}=await prepare(h);
    const global=ok(await h.api('POST','/attention/conversations',{conversationId:randomUUID()})).session;
    const controls=ok(await h.api('GET',`/runtime-control?sessionId=${global.id}`));
    const projectControl=ok(await h.api('GET',`/runtime-control?sessionId=${session.id}`));
    for(const name of ATTENTION_TOOL_NAMES) {
      assert(controls.resources.some(r=>r.id==='tool:'+name && r.exposed),name);
      assert(!projectControl.resources.some(r=>r.id==='tool:'+name),name);
    }
    const expose=await h.api('PUT',`/runtime-control?sessionId=${session.id}`,{revision:projectControl.revision,operation:'exposure',id:'tool:governance_list',scope:{type:'session',id:session.id},exposed:true});
    assert.notEqual(expose.status,200,'unknown tool cannot be exposed into a project catalog');
    const profileSession=await h.createSession();
    const profileScope={type:'session',id:profileSession.id};
    const profileChange=async value=>h.api('PUT',`/runtime-control?sessionId=${profileSession.id}`,{revision:ok(await h.api('GET',`/runtime-control?sessionId=${profileSession.id}`)).revision,...value});
    ok(await profileChange({operation:'put',resource:{id:'local:governance-attempt',kind:'agent_profile',title:'Cannot install tools',scope:profileScope,content:JSON.stringify({schemaVersion:1,version:'1.0',resourceIds:['tool:governance_list'],rules:[{action:'*',resource:'*',effect:'allow'}],uiSlots:[]})}}));
    ok(await profileChange({operation:'profile',scope:profileScope,id:'local:governance-attempt'}));
    const uncallable=await h.api('POST',`/sessions/${profileSession.id}/runs`,{commandId:randomUUID(),input:'try governance'});
    assert.equal(uncallable.status,409,'profile cannot supply an absent host tool');
    const before=await execute(h,global.id,'governance_list',{project_id:h.projectId});assert.equal(before.isError,false);
    assert.equal(JSON.parse(before.text).count,0);packets.packets.undisclosed=JSON.parse(before.text);
    const issued=await disclosure(h,id,grant(h),'grant-runtime');ok(issued.response);packets.packets.grantReceipt=issued.response.json;
    const listed=await execute(h,global.id,'governance_list',{project_id:h.projectId});assert.equal(listed.isError,false,listed.text);
    const list=JSON.parse(listed.text);assert.equal(list.count,1);packets.packets.registry=list;
    const inspected=await execute(h,global.id,'governance_inspect',{project_id:h.projectId,object_kind:'matter',object_id:id,expected_object_version:list.items[0].object_version});
    assert.equal(inspected.isError,false,inspected.text);const view=JSON.parse(inspected.text);packets.packets.inspect=view;
    const args={project_id:h.projectId,object_kind:'matter',object_id:id,expected_object_version:view.object_version,kind:'source',source_ref:view.sources[0].source_ref,limit:12};
    const read=await execute(h,global.id,'governance_read',args);assert.equal(read.isError,false,read.text);
    const body=JSON.parse(read.text);assert.equal(body.text,'Synthetic go');packets.packets.sourcePage=body;
    ok((await disclosure(h,id,null,'revoke-runtime')).response);
    const revoked=await execute(h,global.id,'governance_read',{...args,offset:body.next_offset});
    assert.equal(revoked.isError,true);assert.match(revoked.text,/NOT_FOUND|unavailable/);packets.packets.revoked=revoked;
    ok((await disclosure(h,id,grant(h),'regrant-runtime')).response);
    ok(await h.api('DELETE',`/sessions/${session.id}`));
    ok(await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'unload'}));
    const retained=await execute(h,global.id,'governance_list',{project_id:h.projectId});assert.equal(JSON.parse(retained.text).count,1);
    packets.packets.producerAndOriginalSessionAbsent=JSON.parse(retained.text);
    assert.equal(ok(await query(h,{kind:'policy_request',object_ref:reference(h,id),request_id:'grant-runtime'})).result.policy_revision,1);
    if(process.env.CW_GOVERNANCE_PACKETS) {
      await mkdir(path.dirname(process.env.CW_GOVERNANCE_PACKETS),{recursive:true});
      await writeFile(process.env.CW_GOVERNANCE_PACKETS,JSON.stringify(packets,null,2)+'\n');
    }
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

test('runtime adapter rejects mismatched/closed host Runs and a change while Core read is pending',async()=>{
  const h=await boot();
  try {
    const global=ok(await h.api('POST','/attention/conversations',{conversationId:randomUUID()})).session;
    const created=ok(await h.api('POST',`/sessions/${global.id}/runs`,{commandId:randomUUID(),input:h.scriptInput([{name:'ask_user',arguments:{prompt:'Keep synthetic run open'}}])}));
    const run=await h.pollRun(created.run.id,{until:status=>status==='waiting_user',timeoutMs:10000});
    const service=h.runtime.service;
    const adapter=service.governanceRuntimeAdapter(global.id,run.id,h.projectId);
    assert.equal((await adapter.query({schema_version:1,kind:'registry'})).count,0);
    const project=await h.createSession();
    await assert.rejects(service.governanceRuntimeAdapter(project.id,run.id,h.projectId).query({schema_version:1,kind:'registry'}),{code:'CANDIDATE_CLOSED'});
    await assert.rejects(adapter.query({schema_version:1,kind:'registry',actor:'local-user'}),{code:'INVALID'});
    ok(await h.api('POST',`/runs/${run.id}/cancel`,{}));await h.pollRun(run.id);
    await assert.rejects(adapter.query({schema_version:1,kind:'registry'}),{code:'CANDIDATE_CLOSED'});
  }finally{await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
  let state={projectId:'p',sessionId:'s',runId:'r',adapterId:'a',admissionOpen:true};
  let finish,started;
  const began=new Promise(resolve=>started=resolve);
  const adapter=createGovernanceAdapter({getExecution:()=>state,core:{call:async()=>{started();return new Promise(resolve=>finish=resolve);}}});
  const pending=adapter.query({schema_version:1,kind:'registry'});await began;state={...state,projectId:'changed'};finish({private:'must not return'});
  await assert.rejects(pending,{code:'CANDIDATE_CLOSED'});
});
