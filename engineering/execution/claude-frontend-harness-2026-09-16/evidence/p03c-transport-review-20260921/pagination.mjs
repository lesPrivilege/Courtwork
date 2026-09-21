import { pathToFileURL } from 'node:url';
import path from 'node:path';
if (!process.argv[2]) throw new Error('Pass the candidate checkout path');
const root = path.resolve(process.argv[2]);
const { createOpenAiAgentsTransport } = await import(pathToFileURL(path.join(root, 'app/runtime/openai-agents-transport.mjs')));
const { createWireFixture } = await import(pathToFileURL(path.join(root, 'app/tests/fixtures/agents-api-wire.mjs')));
const w=await createWireFixture(); let n=0; w.respond(a=>{n++; if(a.path.includes('/items')) return w.json(200,{data:[],has_more:true}); return w.json(200,{id:'s',status:'idle'});});
const t=createOpenAiAgentsTransport({apiKey:'sk-synthetic',baseURL:w.baseURL,timeoutMs:1000});
let result,error; try{result=await t.listItems('s');}catch(e){error={code:e.code,message:e.message};}
console.log(JSON.stringify({result,error,attempts:w.attempts.map(w.wire)},null,2)); await w.close();
