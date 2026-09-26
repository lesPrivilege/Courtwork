import { pathToFileURL } from 'node:url';
import { rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.argv[2];
const {boot,reopen}=await import(pathToFileURL(root+'/app/tests/helpers.mjs'));
const {persistedPartial}=await import(pathToFileURL(root+'/app/server/assistant-stream.mjs'));
const first='Before the tool I am explaining this. '.repeat(20);
const ctx=await boot({fakeResponder:()=>({kind:'text',id:'retry',created:1,chunkMs:30,failAfterChunks:16,text:'Retry stream source. '.repeat(80)})});
let release, secondSeen, restarted;const reached=new Promise(r=>secondSeen=r);let count=0;
try{
 const append=ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
 ctx.runtime.store.appendEvent=async e=>{
  if(e.type==='assistant.delta'&&e.data.segment===0&&++count===2)await new Promise(r=>release=r);
  const result=await append(e);
  if(e.type==='assistant.delta'&&e.data.segment===1)secondSeen();
  return result;
 };
 const session=await ctx.createSession();const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId:'two-open',input:'list then reply'});
 await Promise.race([reached,new Promise((_,j)=>setTimeout(()=>j(new Error('second segment not observed')),10000))]);
 const events=ctx.runtime.store.listEvents({sessionId:session.id,runId:made.json.run.id});
 const before={durableSegments:[...new Set(events.filter(e=>e.type==='assistant.delta').map(e=>e.data.segment))],durableFinals:events.filter(e=>e.type==='assistant.message').map(e=>e.data.segment),recoveryPartials:persistedPartial(events,'unknown'),status:ctx.runtime.store.getRun(made.json.run.id).status};
 const stateFile=path.join(ctx.dataDir,'runtime-state.json'); const crashImage=await readFile(stateFile);
 release?.();await ctx.runtime.close();
 await writeFile(stateFile,crashImage);
 restarted=await reopen(ctx.dataDir);
 const restored=(await restarted.api('GET',`/sessions/${session.id}/events`)).json.events.filter(e=>e.runId===made.json.run.id);
 console.log(JSON.stringify({before,after:{status:(await restarted.api('GET',`/runs/${made.json.run.id}`)).json.run.status,finals:restored.filter(e=>e.type==='assistant.message').map(e=>e.data),unsettledSegments:before.durableSegments.filter(s=>!restored.some(e=>e.type==='assistant.message'&&e.data.segment===s))}}));
}finally{release?.();await (restarted?.runtime??ctx.runtime).close();await rm(ctx.dataDir,{recursive:true,force:true});}
