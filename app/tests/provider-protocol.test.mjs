import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { boot, reopen } from './helpers.mjs';

async function fixture() {
  const requests=[];
  const server=http.createServer(async(req,res)=>{
    const chunks=[];for await(const b of req)chunks.push(b);
    const body=JSON.parse(Buffer.concat(chunks));
    requests.push({path:req.url,body,headers:req.headers});
    const n=requests.length;const id=`response_${n}`;
    const tool=n===1;
    const args=JSON.stringify({path:'out/protocol.md',text:'Written through the selected protocol.'});
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});
    const send=value=>res.write(`data: ${JSON.stringify(value)}\n\n`);
    if(req.url==='/v1/responses') {
      const item=tool?{type:'function_call',id:`fc_${n}`,call_id:`call_${n}`,name:'ws_write',arguments:args,status:'completed'}
        :{type:'message',id:`msg_${n}`,role:'assistant',status:'completed',content:[{type:'output_text',text:'Done.',annotations:[]}]};
      send({type:'response.created',response:{id,status:'in_progress',output:[]}});
      send({type:'response.output_item.added',output_index:0,item:{...item,...(tool?{arguments:''}:{content:[]})}});
      send(tool?{type:'response.function_call_arguments.delta',output_index:0,item_id:item.id,delta:args}
        :{type:'response.output_text.delta',output_index:0,item_id:item.id,content_index:0,delta:'Done.'});
      send({type:'response.output_item.done',output_index:0,item});
      send({type:'response.completed',response:{id,status:'completed',output:[item],usage:{input_tokens:1024,output_tokens:5,total_tokens:1029,input_tokens_details:{cached_tokens:256}}}});
      res.end();
    } else if(req.url==='/v1/chat/completions') {
      const chunk=(delta,finish_reason=null,usage)=>({id,object:'chat.completion.chunk',created:1,model:body.model,choices:[{index:0,delta,finish_reason}],...(usage?{usage}:{})});
      send(chunk(tool?{role:'assistant',tool_calls:[{index:0,id:`call_${n}`,type:'function',function:{name:'ws_write',arguments:args}}]}:{role:'assistant',content:'Done.'}));
      send(chunk({},tool?'tool_calls':'stop',{prompt_tokens:1024,completion_tokens:5,total_tokens:1029,prompt_tokens_details:{cached_tokens:256}}));
      res.end('data: [DONE]\n\n');
    } else res.end();
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  return {requests,baseUrl:`http://127.0.0.1:${server.address().port}/v1`,close:()=>new Promise(r=>server.close(r))};
}
async function run(api,sessionId,commandId) {
  const made=await api('POST',`/sessions/${sessionId}/runs`,{input:`Continue the work: ${commandId}`,commandId});
  assert.equal(made.status,200);
  const until=Date.now()+10000;
  for(;;){const current=(await api('GET',`/runs/${made.json.run.id}`)).json.run;
    if(!['running','waiting_user','stopping'].includes(current.status)){assert.equal(current.status,'completed',JSON.stringify(current.error));return current;}
    if(Date.now()>until)throw new Error('protocol Run timed out');await delay(15);
  }
}
for(const format of ['openai-completions','openai-responses']) test(`${format}: real SDK tool loop, stable consecutive prefix, cache usage and restart`,async()=>{
  const wire=await fixture();const ctx=await boot();let restarted;
  try {
    assert.equal((await ctx.api('PUT','/provider-credential',{connectionId:'catalog-openai',apiKey:'local-protocol-fixture'})).status,200);
    const config={provider:'openai',model:'gpt-4.1-mini',api:format,baseUrl:wire.baseUrl};
    assert.equal((await ctx.api('PUT','/provider-config',config)).status,200);
    const session=await ctx.createSession();
    const first=await run(ctx.api,session.id,'first');
    assert.equal(first.artifacts.length,1);assert.equal(first.usage.cacheRead,512);
    const second=await run(ctx.api,session.id,'second');
    assert.equal(second.usage.cacheRead,256);assert.equal(second.usage.missing,false);
    await ctx.runtime.close();
    restarted=await reopen(ctx.dataDir);
    const third=await run(restarted.api,session.id,'third');
    assert.equal(first.hostSession.id,third.hostSession.id);
    assert.equal(wire.requests.length,4);
    assert(wire.requests.every(r=>r.path===(format==='openai-responses'?'/v1/responses':'/v1/chat/completions')));
    for(let i=1;i<wire.requests.length;i++){
      const previous=wire.requests[i-1].body;const current=wire.requests[i].body;
      const oldInput=previous.input??previous.messages;const newInput=current.input??current.messages;
      assert.deepEqual(newInput.slice(0,oldInput.length),oldInput,'old encoded history is an exact prefix, even after runtime reopen');
      assert.deepEqual(current.tools,previous.tools,'tool definitions/order are stable');
      assert.equal(current.prompt_cache_key,previous.prompt_cache_key);
    }
    if(format==='openai-responses')assert.equal(wire.requests[0].body.prompt_cache_key,first.hostSession.id);
    const historical=await restarted.api('GET',`/sessions/${session.id}/artifacts/file?${new URLSearchParams({runId:first.id,path:first.artifacts[0].path,sha256:first.artifacts[0].sha256})}`);
    assert.equal(historical.json.text,'Written through the selected protocol.');
  } finally {if(restarted)await restarted.runtime.close();else await ctx.runtime.close();await wire.close();}
});
