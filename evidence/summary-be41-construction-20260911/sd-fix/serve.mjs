// Synthetic data only. The browser receives the exact production UI bytes.
// No app exports, DOM adapter, or CSS is injected into the product.
import http from 'node:http';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { boot } from '../../../app/tests/helpers.mjs';
const fixturePath = 'out/' + Array.from({length:12}, (_,i) => `来源修订-${i}-café-é-🧭`).join('/') + '/完整证据文件-审阅版本.txt';
const note = 'Synthetic source note\n\nThe summary, disclosure and right panel refer to the same recorded run.\nReading this note does not accept a result.\n';
const h = await boot({fakeResponder:({body,requestNumber})=>{
 const messages=body.messages||[];
 const lastUser=messages.findLastIndex(m=>m.role==='user');
 const done=messages.slice(lastUser+1).some(m=>m.role==='tool');
 const common={id:`summary-fixture-${requestNumber}`,created:Math.floor(Date.now()/1000)};
 return done?{...common,kind:'text',text:'Synthetic demonstration: the source note is recorded. Open the Run summary to inspect its recorded file. Reading it does not accept a result.'}:{...common,kind:'tool',toolCallId:`summary-tool-${requestNumber}`,name:'ws_write',arguments:{path:fixturePath,text:note}};
}});
const session = await h.createSession({title:'Source review · synthetic',permissionMode:'draft'});
await mkdir(path.join(h.dataDir, 'workspaces', session.id, path.dirname(fixturePath)), {recursive:true});
const made = await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'summary-fixture-v1',input:'Record a synthetic source note so I can inspect the run and its file.'});
if (made.status !== 200) throw Error(JSON.stringify(made));
const run = await h.pollRun(made.json.run.id,{timeoutMs:30000});
const other = await h.createSession({title:'Other synthetic chat'});
const config = {schemaVersion:1,fixturePath,otherSessionId:other.id,sessionId:session.id,runId:run.id,dataKind:'synthetic local HTTP/Pi loopback',provider:'local-fake; no paid provider'};
const server = http.createServer(async (req,res)=>{
 try {
  const allowedOrigin = `http://127.0.0.1:${server.address().port}`;
  if(req.headers.host !== new URL(allowedOrigin).host || (req.headers.origin && req.headers.origin !== allowedOrigin)){res.statusCode=403;res.end('Fixture origin denied');return;}
  const url = new URL(req.url,allowedOrigin);
  if(url.pathname === '/fixture-config.json') {res.setHeader('content-type','application/json');res.end(JSON.stringify({...config,userAgent:req.headers['user-agent']}));return;}
  // Optional transport fault, synthetic draft layout verification only.
  if (process.env.SD_FIXTURE_DRAFT_ERROR === '1' && req.method === 'PUT' && /^\/api\/v5\/sessions\/[^/]+\/draft$/.test(url.pathname)) {
    req.resume(); res.writeHead(503, {'content-type':'application/json'}); res.end(JSON.stringify({error:{code:'unavailable',message:'Synthetic draft transport failure'}})); return;
  }
  const headers = {...req.headers,host:new URL(h.runtime.url).host};
  // Loopback proxy preserves the product's origin check against its own port.
  if(headers.origin) headers.origin = h.runtime.url;
  const upstream = http.request(h.runtime.url+req.url,{method:req.method,headers},response=>{
   res.writeHead(response.statusCode,response.headers);response.pipe(res);
  });
  upstream.on('error',error=>{res.statusCode=502;res.end(error.message);});req.pipe(upstream);
 } catch(error){res.statusCode=500;res.end(error.message);}
});
const port = Number(process.env.SD_FIXTURE_PORT || 18977);
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}`,config,runtimeSchema:12,coreSchema:4,appSchema:5})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{server.close();await h.runtime.close();process.exit();});
