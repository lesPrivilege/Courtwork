import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { boot, reopen } from './helpers.mjs';

async function until(predicate, milliseconds=5000) {
  const deadline=Date.now()+milliseconds;
  while(!predicate()) { if(Date.now()>deadline) throw new Error('condition timed out'); await delay(10); }
}

test('current host context reaches the model without changing user input; capabilities use the installed catalog', async()=>{
  const ctx=await boot();
  try {
    const info=await ctx.api('GET','/runtime-info');
    assert.equal(info.status,200); assert.equal(info.json.capabilities.shell,false);
    assert.equal(info.json.authority.generatedResultIsAccepted,false);
    const models=await ctx.api('GET','/provider-models');
    assert(models.json.models.some(m=>m.provider==='deepseek' && m.id==='deepseek-v4-flash'));
    assert(models.json.models.every(m=>!('apiKey' in m) && (!m.baseUrl || (!new URL(m.baseUrl).username && !new URL(m.baseUrl).password))), 'catalog endpoint identity is public, credentials never are');
    const session=await ctx.createSession();
    await ctx.api('POST','/extensions/probe/lifecycle',{action:'load'});
    await ctx.api('POST',`/sessions/${session.id}/extension`,{extensionId:'probe',input:{}});
    const begin=ctx.runtime.registry.begin.bind(ctx.runtime.registry);
    let current='CURRENT_CONTEXT_ONE';
    let previousMessages;
    ctx.runtime.registry.begin=async(...args)=>{const result=await begin(...args);result.run.context=current;return result;};
    for(const [commandId,input] of [['one','First request'],['two','Continue the work']]) {
      current=commandId==='one'?'CURRENT_CONTEXT_ONE':'CURRENT_CONTEXT_TWO';
      const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId,input});
      assert.equal((await ctx.pollRun(made.json.run.id)).status,'completed');
      const messages=ctx.runtime.fakeProvider.requests.at(-1).body.messages;
      if(previousMessages) assert.deepEqual(messages.slice(0,previousMessages.length),previousMessages,'changing task context appends at the tail without rewriting the old prefix');
      previousMessages=messages;
      const system=messages.filter(m=>['system','developer'].includes(m.role)).map(m=>m.content).join('\n');
      assert(!system.includes(current)); assert(system.includes('formal review'));
      const contexts=messages.filter(m=>m.role==='user').map(m=>typeof m.content==='string'?m.content:m.content.map(p=>p.text??'').join('')).filter(t=>t.startsWith('Current host task context'));
      assert(contexts.at(-1).includes(current));
      const content=messages.filter(m=>m.role==='user').at(-1).content;
      assert.equal(typeof content==='string'?content:content.map(part=>part.text??'').join(''),input);
    }
  } finally {await ctx.runtime.close();}
});

test('a Run waits for its final event to persist before publishing completion',async()=>{
  const ctx=await boot(); let release; let held=false;
  const gate=new Promise(r=>{release=r;});
  try {
    const append=ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
    ctx.runtime.store.appendEvent=async(event)=>{if(event.type==='assistant.message'){held=true;await gate;}return append(event);};
    const session=await ctx.createSession();
    const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId:'delayed',input:'hello'});
    await until(()=>held);
    assert.equal((await ctx.api('GET',`/runs/${made.json.run.id}`)).json.run.status,'running');
    release();
    assert.equal((await ctx.pollRun(made.json.run.id)).status,'completed');
    const events=(await ctx.api('GET',`/sessions/${session.id}/events`)).json.events;
    const final=events.find(e=>e.type==='assistant.message');
    const completed=events.find(e=>e.type==='run.status' && e.data.status==='completed');
    assert(final.seq<completed.seq);
  } finally {release();await ctx.runtime.close();}
});

test('event persistence failure is reported as runtime failure instead of completion',async()=>{
  const ctx=await boot();
  try {
    const append=ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
    ctx.runtime.store.appendEvent=async(event)=>{if(event.type==='assistant.message') throw new Error('injected persistence failure');return append(event);};
    const session=await ctx.createSession();
    const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId:'failed-event',input:'hello'});
    const run=await ctx.pollRun(made.json.run.id);
    assert.equal(run.status,'failed'); assert.equal(run.error.code,'runtime_projection_failed');
    assert.equal(run.usage.missing,true);
  } finally {await ctx.runtime.close();}
});

test('CLI SIGTERM settles a waiting Run and the same data directory reopens',async()=>{
  const dataDir=await mkdtemp(path.join(tmpdir(),'fresh-cli-'));
  const entry=fileURLToPath(new URL('../server/index.mjs',import.meta.url));
  const child=spawn(process.execPath,[entry,'--data-dir',dataDir,'--port','0'],{stdio:['ignore','pipe','pipe']});
  let stdout='';let stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});
  let next;
  try {
    await until(()=>/http:\/\/127\.0\.0\.1:\d+/.test(stdout));
    const url=stdout.match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    const {sessionToken}=await (await fetch(url+'/api/v5/bootstrap')).json();
    const api=async(method,p,body)=>{const res=await fetch(url+'/api/v5'+p,{method,headers:{'content-type':'application/json','x-work-token':sessionToken},body:body?JSON.stringify(body):undefined});assert.equal(res.status,200);return res.json();};
    const {project}=await api('POST','/projects',{name:'CLI lifecycle'});
    const {session}=await api('POST','/sessions',{projectId:project.id,title:'Waiting'});
    const {run}=await api('POST',`/sessions/${session.id}/runs`,{commandId:'question',input:'/fixture question'});
    let status='running';
    const deadline=Date.now()+5000;
    while(status!=='waiting_user') {assert(Date.now()<deadline);status=(await api('GET',`/runs/${run.id}`)).run.status;await delay(10);}
    child.kill('SIGTERM');await until(()=>child.exitCode!==null || child.signalCode!==null);
    assert.equal(child.exitCode,0,stderr);assert.equal(child.signalCode,null);
    const state=JSON.parse(await readFile(path.join(dataDir,'runtime-state.json'),'utf8'));
    assert.equal(state.runs.find(r=>r.id===run.id).status,'cancelled');
    assert(state.questions.every(q=>q.status!=='pending'));
    next=await reopen(dataDir);
    assert.equal((await next.api('GET',`/runs/${run.id}`)).json.run.status,'cancelled');
  } finally {
    if(child.exitCode===null && child.signalCode===null){child.kill('SIGKILL');await new Promise(r=>child.once('exit',r));}
    if(next) await next.runtime.close();
    await rm(dataDir,{recursive:true,force:true});
  }
});
