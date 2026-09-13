import { boot } from '../../../../app/tests/helpers.mjs';
import { createServer } from 'node:http';
const gateway = createServer(async (req, res) => {
  if (req.method === 'GET') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({object:'list',data:[{id:'context-fixture',object:'model'}]})); return; }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw || '{}');
  const prompt = JSON.stringify(body.messages || []);
  const count = prompt.includes('75 percent') ? 750000 : prompt.includes('zero input') ? 0 : prompt.includes('unknown input') ? null : 250000;
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  const packet = (delta, finish_reason = null, usage) => ({ id: 'context-fixture', object: 'chat.completion.chunk', created: 1, model: 'context-fixture', choices: [{index: 0, delta, finish_reason}], ...(usage ? {usage} : {}) });
  res.write(`data: ${JSON.stringify(packet({role:'assistant',content:'Synthetic context occupancy fixture. Provider input count is controlled for visual verification.'}))}\n\n`);
  res.end(`data: ${JSON.stringify(packet({},'stop',count === null ? null : {prompt_tokens:count,completion_tokens:12,total_tokens:count+12,prompt_tokens_details:{cached_tokens: Math.floor(count/2)}}))}\n\ndata: [DONE]\n\n`);
});
await new Promise(resolve => gateway.listen(0,'127.0.0.1',resolve));
const h = await boot();
const created = await h.api('POST','/provider-connections',{api:'openai-completions',baseUrl:`http://127.0.0.1:${gateway.address().port}/v1`,apiKey:'synthetic-local-key',models:[{id:'context-fixture'}]});
if(created.status !== 200) throw new Error(JSON.stringify(created.json));
const connection=created.json.connection;
const saved=await h.api('PUT','/provider-config',{provider:connection.providerIdentity,model:'context-fixture',api:connection.api});
if(saved.status!==200)throw new Error(JSON.stringify(saved.json));
const result=[];
for (const [title,input] of [['Context 25% · default 1M','25 percent'],['Context 75% · default 1M','75 percent'],['Context unknown','unknown input'],['Context zero','zero input']]) {
 const session=await h.createSession({title});
 const receipt=await h.api('POST',`/sessions/${session.id}/runs`,{input,commandId:crypto.randomUUID()});
 await h.pollRun(receipt.json.run.id);
 const snapshot=(await h.api('GET',`/sessions/${session.id}`)).json;
 const row=snapshot.events.filter(e=>e.type==='runtime.request.telemetry').at(-1)?.data;
 result.push({title,sessionId:session.id,phase:row?.phase,capacity:row?.contextCapacity});
}
console.log(JSON.stringify({url:h.runtime.url, sessions:result}));
