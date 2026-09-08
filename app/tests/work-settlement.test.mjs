import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {boot} from './helpers.mjs';

async function bind(h) {
  await h.api('POST','/extensions/evidence-memo/lifecycle',{action:'load'});
  const session=await h.createSession();
  assert.equal((await h.api('POST',`/sessions/${session.id}/extension`,{extensionId:'evidence-memo',input:{title:'Settlement fixture',sourceText:'Alpha beta gamma.'}})).status,200);
  return session;
}
for (const mode of ['before-write','after-write-ack-loss','cancel-and-finish-failure']) {
  test(`Pro R-01: ${mode} never reports completed or discards settlement error`,async()=>{
    const h=await boot();
    try {
      const session=await bind(h);
      const original=h.runtime.registry.begin.bind(h.runtime.registry);
      let finishCalls=0;
      h.runtime.registry.begin=async input=>{
        const result=await original(input);const finish=result.run.finish;
        result.run.finish=async value=>{finishCalls++;if(mode==='after-write-ack-loss')await finish(value);throw new Error('synthetic settlement failure');};
        return result;
      };
      const input=mode==='cancel-and-finish-failure'?'/fixture question':'Inspect the current work.';
      const created=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'settlement',input});
      if(mode==='cancel-and-finish-failure') {
        await h.pollRun(created.json.run.id,{until:s=>s==='waiting_user'});
        assert.equal((await h.api('POST',`/runs/${created.json.run.id}/cancel`,{})).status,200);
      }
      const run=await h.pollRun(created.json.run.id);
      assert.equal(run.status,'unknown');assert.equal(run.error.code,'extension_finish_failed');assert.equal(run.admissionOpen,false);
      const replay=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'settlement',input});
      assert.equal(replay.json.run.id,run.id);assert.equal(finishCalls,1);
      const p=(await h.api('GET',`/sessions/${session.id}/surface`)).json.projection;
      assert.equal(p.artifact,null);
      assert.equal(p.runs[0].status,mode==='after-write-ack-loss'?'completed':'unknown');
      h.runtime.registry.begin=original;
      const next=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'after-reconciliation',input:'Continue the current work.'});
      assert.equal(next.status,200);
      assert.equal((await h.pollRun(next.json.run.id)).status,'completed');
    } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
  });
}

test('Pro R-02: ordinary first instruction discovers scoped source refs only from host context',async()=>{
  let discovered;
  const h=await boot({fakeResponder:({body,requestNumber})=>{
    if(body.messages.some(m=>m.role==='tool'))return {kind:'text',text:'SIMULATED inspected source'};
    const texts=body.messages.flatMap(m=>typeof m.content==='string'?[m.content]:(m.content??[]).map(c=>c.text??''));
    const context=texts.find(t=>t.includes('sourceRefs'));
    const match=context?.match(/"text":("(?:[^"\\]|\\.)*")/);
    assert(match,'compiled work is present on model wire');
    const work=JSON.parse(JSON.parse(match[1]));
    discovered=work.sourceRefs[0];
    return {kind:'tool',toolCallId:`context-${requestNumber}`,name:'se_read_source',arguments:{sourceId:discovered.id}};
  }});
  try {
    const session=await bind(h);
    const input='Inspect the current work.';
    const made=await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'discover',input});
    assert.equal((await h.pollRun(made.json.run.id)).status,'completed');
    assert(discovered?.id);assert(!input.includes(discovered.id));
    const events=(await h.api('GET',`/sessions/${session.id}/events`)).json.events;
    const result=events.find(e=>e.type==='tool.result'&&e.data.name==='se_read_source');
    assert.equal(result.data.isError,false);assert.match(result.data.text,/Alpha beta gamma/);
  } finally {await h.runtime.close();await rm(h.dataDir,{recursive:true,force:true});}
});

// R-04 exercises the legal upstream event sequence against the existing UI projection.
test('Pro R-04: intermediate tool updates stay nonterminal until end',async()=>{
  const {mapSessionEvent}=await import('../runtime/pi-session-runtime.mjs');
  const {projectThread}=await import('../web/thread-projection.mjs');
  const events=[];
  const run={id:'r',sessionId:'s',status:'running'};
  for(const [index,type] of ['tool_execution_start','tool_execution_update','tool_execution_update','tool_execution_end'].entries()) {
    const mapped=mapSessionEvent({type,toolCallId:'call',toolName:'progress-tool',partialResult:{content:[{type:'text',text:'partial'}]},result:{content:[{type:'text',text:'done'}]},isError:false});
    events.push({...mapped,seq:index+1,runId:'r',sessionId:'s'});
    const row=projectThread(events,[run],'s').rows.find(r=>r.kind==='tool');
    assert.equal(row.phase,index===3?'result':'started');
  }
  assert.deepEqual(events.map(e=>e.type),['tool.start','tool.update','tool.update','tool.result']);
});
