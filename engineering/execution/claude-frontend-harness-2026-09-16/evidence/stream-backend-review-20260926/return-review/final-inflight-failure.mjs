import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
const { boot } = await import(pathToFileURL(process.argv[2] + '/app/tests/helpers.mjs'));
const ctx=await boot({fakeResponder:()=>({kind:'text',id:'held-write-final',created:1,chunkMs:30,text:'Synthetic held persistence failure. '.repeat(18)})});
let rejectHeld, attempts=0, finalObserved=false;
try {
 const append=ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
 ctx.runtime.store.appendEvent=async event=>{
  if(event.type==='assistant.delta' && ++attempts===2) await new Promise((_,reject)=>{rejectHeld=reject;});
  return append(event);
 };
 const real=ctx.runtime.service.runtimePort;
 ctx.runtime.service.runtimePort={...real,openSession(input){const native=real.openSession(input);return {...native,start(options){return native.start({...options,onObservation(observation){
   const result=options.onObservation(observation);
   if(observation.type==='assistant.message' && rejectHeld){finalObserved=true;queueMicrotask(()=>rejectHeld(new Error('held snapshot rejects after final begins')));}
   return result;
 }});}};}};
 const session=await ctx.createSession();
 const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId:'held-final',input:'answer'});
 const run=await ctx.pollRun(made.json.run.id,{timeoutMs:15000});
 const events=(await ctx.api('GET',`/sessions/${session.id}/events`)).json.events;
 const assistant=events.filter(e=>e.type.startsWith('assistant.'));
 console.log(JSON.stringify({injected:!!rejectHeld,finalObserved,status:run.status,error:run.error,deltaCount:assistant.filter(e=>e.type==='assistant.delta').length,finals:assistant.filter(e=>e.type==='assistant.message').map(e=>e.data),lastDelta:assistant.filter(e=>e.type==='assistant.delta').at(-1)?.data}));
} finally {rejectHeld?.(new Error('probe cleanup'));await ctx.runtime.close();await rm(ctx.dataDir,{recursive:true,force:true});}
