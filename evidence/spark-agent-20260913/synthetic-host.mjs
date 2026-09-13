import {startServer} from '../../app/server/index.mjs';
import {FAKE_CREDENTIAL_KEY} from '../../app/runtime/pi-session-runtime.mjs';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dataDir=await mkdtemp(path.join(tmpdir(),'cw-spark-browser-'));
const runtime=await startServer({dataDir,port:Number(process.env.CW_SPARK_PORT??54327),fakeResponder:({body,requestNumber})=>{
 if(!body.tools?.some(t=>t.function?.name==='spark_source'))return null;
 const n=body.messages.filter(m=>m.role==='tool').length;
 if(n<2)return {kind:'tool',id:`spark-${requestNumber}`,created:1,toolCallId:`spark-call-${requestNumber}`,name:'spark_source',arguments:{index:n}};
 if(n===2)return {kind:'tool',id:`spark-${requestNumber}`,created:1,toolCallId:`spark-call-${requestNumber}`,name:'spark_note',arguments:{title:'Comparison index',text:'Source 0: delivery in 30 days. Source 1: delivery in 45 days. This note is derived from the two assigned versions.'}};
 return {kind:'text',id:`spark-${requestNumber}`,created:1,slow:true,text:'The two retained drafts differ on delivery timing. Source 0 specifies 30 days; source 1 specifies 45 days. Both assigned versions were read. No external materials or other contract terms were checked. This is a finding for the main agent to inspect, with no formal acceptance.'};
}});
const headers={'content-type':'application/json','x-work-token':runtime.token};
await fetch(runtime.url+'/api/v5/provider-credential',{method:'PUT',headers,body:JSON.stringify({connectionId:'catalog-fake-openai-loopback',apiKey:FAKE_CREDENTIAL_KEY})});
console.log(JSON.stringify({url:runtime.url,dataDir,synthetic:true}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await runtime.close();process.exit(0);});
