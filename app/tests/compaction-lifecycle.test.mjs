import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { boot } from './helpers.mjs';
const policy = { enabled: true, reserveTokens: 512, keepRecentTokens: 256, maxCompactions: 2 };
async function seed(ctx) {
  const s = await ctx.createSession();
  const raw = ctx.runtime.store.getSession(s.id);
  const sm = SessionManager.create(raw.workspaceDir, path.join(ctx.dataDir, 'pi-sessions', s.id));
  for (let i=0; i<6; i++) {
    sm.appendMessage({role:'user', content:`earlier ${i} ` + 'history '.repeat(100), timestamp:Date.now()});
    sm.appendMessage({role:'assistant', api:'openai-completions', provider:'fake-openai-loopback', model:'fake-model', content:[{type:'text',text:'prior response '.repeat(100)}], stopReason:'stop', timestamp:Date.now(), usage:{input:3900,output:20,cacheRead:0,cacheWrite:0,totalTokens:3920,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}});
  }
  await ctx.runtime.store.setHostSession(s.id,{id:sm.getSessionId(),path:sm.getSessionFile()});
  return {s, journal:sm.getSessionFile()};
}
for (const mode of ['cancel', 'deadline']) test(`native compaction ${mode} settles with no persisted partial summary`, async () => {
  let summaryRequests=0; let normalRequests=0;
  const ctx = await boot({compaction:policy, budget:{deadlineMs:mode==='deadline'?200:5000,maxTurns:40}, fakeResponder:({body,requestNumber})=> {
    const summary = JSON.stringify(body.messages).includes('<conversation>');
    if(summary) summaryRequests++; else normalRequests++;
    return {kind:'text',id:`response-${requestNumber}`,created:1,text:summary?'summary body':'normal body',slow:summary};
  }});
  try {
    const {s,journal} = await seed(ctx);
    const created=await ctx.api('POST',`/sessions/${s.id}/runs`,{input:'continue now',commandId:'continue'});
    const runId=created.json.run.id;
    const until=Date.now()+4000;
    while(!summaryRequests && Date.now()<until) await delay(10);
    assert(summaryRequests>0,'must reach native summarization request');
    if(mode==='cancel') await ctx.api('POST',`/runs/${runId}/cancel`,{});
    const done=await ctx.pollRun(runId);
    assert.equal(done.status, mode==='cancel'?'cancelled':'unknown');
    assert.equal(done.usage.missing,true);
    assert.equal(SessionManager.open(journal).getEntries().filter(e=>e.type==='compaction').length,0);
    assert.equal(normalRequests,0,'cancelled pre-prompt compaction must not issue an ordinary request');
  } finally { await ctx.runtime.close(); }
});

test('native overflow recovery persists a summary and a restarted host uses it', async () => {
  let overflowSent=false; let summaries=0; const requests=[];
  const ctx=await boot({compaction:{...policy,reserveTokens:64,maxCompactions:1}, fakeResponder:({body,requestNumber})=>{
    requests.push(body);
    if(JSON.stringify(body.messages).includes('<conversation>')) {
      summaries++; return {kind:'text',id:`summary-${requestNumber}`,created:1,text:'PERSISTED_COMPACTION_MARKER'};
    }
    if(!overflowSent) { overflowSent=true; return {kind:'http-error',status:400,message:'maximum context length exceeded'}; }
    return {kind:'text',id:`normal-${requestNumber}`,created:1,text:'normal resumed'};
  }});
  let restarted;
  try {
    const {s,journal}=await seed(ctx);
    // Lower recorded usage so the first request overflows rather than compacting by threshold.
    const sm=SessionManager.open(journal);
    sm.appendMessage({role:'user',content:'latest low usage',timestamp:Date.now()});
    sm.appendMessage({role:'assistant',api:'openai-completions',provider:'fake-openai-loopback',model:'fake-model',content:[{type:'text',text:'small'}],stopReason:'stop',timestamp:Date.now(),usage:{input:50,output:10,cacheRead:0,cacheWrite:0,totalTokens:60,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}}});
    const start=await ctx.api('POST',`/sessions/${s.id}/runs`,{input:'continue',commandId:'overflow'});
    const done=await ctx.pollRun(start.json.run.id,{timeoutMs:10000});
    assert.equal(done.status,'completed'); assert(summaries>=1);
    assert.equal(SessionManager.open(journal).getEntries().filter(e=>e.type==='compaction').length,1);
    const events=(await ctx.api('GET',`/sessions/${s.id}/events`)).json.events;
    assert(events.some(e=>e.type==='run.notice' && e.data.kind==='compaction_start' && e.data.reason==='overflow'));
    assert(requests.some(b=>!JSON.stringify(b.messages).includes('<conversation>') && JSON.stringify(b.messages).includes('PERSISTED_COMPACTION_MARKER')));
    await ctx.runtime.close();
    const {reopen}=await import('./helpers.mjs');
    const next=[];
    restarted=await reopen(ctx.dataDir,{compaction:policy,fakeResponder:({body,requestNumber})=>{
      next.push(body);return {kind:'text',id:`restart-${requestNumber}`,created:1,text:'restarted'};
    }});
    const second=await restarted.api('POST',`/sessions/${s.id}/runs`,{input:'after restart',commandId:'after-restart'});
    let run; const until=Date.now()+5000;
    do {run=(await restarted.api('GET',`/runs/${second.json.run.id}`)).json.run; if(run.status==='completed') break; await delay(20);} while(Date.now()<until);
    assert.equal(run.status,'completed');
    assert(JSON.stringify(next).includes('PERSISTED_COMPACTION_MARKER'));
    assert.equal(run.hostSession.path,journal);
  } finally {if(restarted) await restarted.runtime.close(); else await ctx.runtime.close();}
});
