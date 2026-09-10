// Explicit local fixture only. Serves the unchanged production UI with a narrow
// read/navigation export appended to app.mjs; never a second surface/tab host.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { boot } from '../../app/tests/helpers.mjs';
const note = 'Synthetic source note\n\nThe summary, disclosure and right panel refer to the same recorded run.\nReading this note does not accept a result.\n';
const h = await boot({fakeResponder:({body,requestNumber})=>{
 const messages=body.messages||[];
 const lastUser=messages.findLastIndex(m=>m.role==='user');
 const done=messages.slice(lastUser+1).some(m=>m.role==='tool');
 const common={id:`summary-fixture-${requestNumber}`,created:Math.floor(Date.now()/1000)};
 return done?{...common,kind:'text',text:'Synthetic demonstration: the source note is recorded. Open the Run summary to inspect its recorded file. Reading it does not accept a result.'}:{...common,kind:'tool',toolCallId:`summary-tool-${requestNumber}`,name:'ws_write',arguments:{path:'out/source-note.txt',text:note}};
}});
const session = await h.createSession({title:'Source review · synthetic',permissionMode:'draft'});
const made = await h.api('POST',`/sessions/${session.id}/runs`,{commandId:'summary-fixture-v1',input:'Record a synthetic source note so I can inspect the run and its file.'});
if (made.status !== 200) throw Error(JSON.stringify(made));
const run = await h.pollRun(made.json.run.id,{timeoutMs:30000});
const other = await h.createSession({title:'Other synthetic chat'});
const config = {schemaVersion:1,otherSessionId:other.id,sessionId:session.id,runId:run.id,dataKind:'synthetic local HTTP/Pi loopback',provider:'local-fake; no paid provider'};
const files = new Map([
  ['/fixture.mjs',new URL('./fixture.mjs',import.meta.url)],
  ['/fixture.css',new URL('./fixture.css',import.meta.url)],
  ['/web/summary-disclosure.mjs',new URL('../../app/web/summary-disclosure.mjs',import.meta.url)],
  ['/web/summary-disclosure-projection.mjs',new URL('../../app/web/summary-disclosure-projection.mjs',import.meta.url)],
  ['/web/summary-disclosure.css',new URL('../../app/web/summary-disclosure.css',import.meta.url)],
]);
const server = http.createServer(async (req,res)=>{
 try {
  const allowedOrigin = `http://127.0.0.1:${server.address().port}`;
  if(req.headers.host !== new URL(allowedOrigin).host || (req.headers.origin && req.headers.origin !== allowedOrigin)){res.statusCode=403;res.end('Fixture origin denied');return;}
  const url = new URL(req.url,allowedOrigin);
  if(url.pathname === '/fixture-config.json') {res.setHeader('content-type','application/json');res.end(JSON.stringify(config));return;}
  if(files.has(url.pathname)) {res.setHeader('content-type',url.pathname.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(files.get(url.pathname)));return;}
  const headers = {...req.headers,host:new URL(h.runtime.url).host};
  // Loopback proxy preserves the product's origin check against its own port.
  if(headers.origin) headers.origin = h.runtime.url;
  const upstream = http.request(h.runtime.url+req.url,{method:req.method,headers},response=>{
   if(url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/web/app.mjs') {
    const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{
     let body = Buffer.concat(chunks).toString();
     if(process.env.SD_FIXTURE_ADAPTER === '1' && url.pathname.endsWith('.mjs')) body += '\nexport { railHost, surfaceFacts, selectSession, closeSurface };\n';
     else if(process.env.SD_FIXTURE_ADAPTER === '1' && !url.pathname.endsWith('.mjs') && !url.searchParams.has('baseline')) body = body.replace('</head>','<link rel="stylesheet" href="/web/summary-disclosure.css"><link rel="stylesheet" href="/fixture.css"></head>').replace('</body>','<script type="module" src="/fixture.mjs"></script></body>');
     res.writeHead(response.statusCode,{'content-type':response.headers['content-type'],'cache-control':'no-store'});res.end(body);
    });
   } else {res.writeHead(response.statusCode,response.headers);response.pipe(res);}
  });
  upstream.on('error',error=>{res.statusCode=502;res.end(error.message);});req.pipe(upstream);
 } catch(error){res.statusCode=500;res.end(error.message);}
});
const port = Number(process.env.SD_FIXTURE_PORT || 8976);
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}`,config,runtimeSchema:11,coreSchema:4,appSchema:5})));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{server.close();await h.runtime.close();process.exit();});
