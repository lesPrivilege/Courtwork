import { pathToFileURL } from 'node:url';
import { rm } from 'node:fs/promises';
const { boot } = await import(pathToFileURL(process.argv[2] + '/app/tests/helpers.mjs'));
const ctx = await boot({fakeResponder: () => ({kind:'text', id:'independent-persistence-probe', created:1, chunkMs:30, text:'Synthetic persistence failure probe. '.repeat(100)})});
let attempts=0, injected=false;
try {
 const append=ctx.runtime.store.appendEvent.bind(ctx.runtime.store);
 ctx.runtime.store.appendEvent=async e=>{if(e.type==='assistant.delta' && ++attempts===2){injected=true;throw new Error('independent transient snapshot persistence failure');}return append(e);};
 const session=await ctx.createSession();
 const made=await ctx.api('POST',`/sessions/${session.id}/runs`,{commandId:'independent-persist-fail',input:'please answer'});
 const run=await ctx.pollRun(made.json.run.id,{timeoutMs:30000});
 console.log(JSON.stringify({source:process.argv[2],injected,attempts,status:run.status,error:run.error,usageMissing:run.usage?.missing,logs:ctx.logs.filter(x=>x.includes('snapshot write failed'))}));
} finally {await ctx.runtime.close();await rm(ctx.dataDir,{recursive:true,force:true});}
