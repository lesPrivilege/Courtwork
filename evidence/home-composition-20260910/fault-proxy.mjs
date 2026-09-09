// Synthetic local preview only. Never use this fault injector against user data.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const upstream = process.env.HOME_UPSTREAM || 'http://127.0.0.1:8937';
const controls = process.env.HOME_FAULTS || path.join(tmpdir(), 'cw-home-faults.json');
http.createServer(async (req,res) => {
 try {
  let rules={}; try {rules=JSON.parse(await readFile(controls,'utf8'))}catch{}
  let body='';for await(const b of req)body+=b;
  const query=body ? (()=>{try{return JSON.parse(body)}catch{return {}}})() : {};
  const rule=(rules.rules||[]).find(r=>req.url.includes(r.path)&&(!r.projectId||query.projectId===r.projectId)&&(!r.days||req.url.includes('days='+r.days)));
  if(rule?.delay)await new Promise(r=>setTimeout(r,rule.delay));
  if(rule?.fail){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'fixture_unavailable',message:'Synthetic unavailable response'}}));return;}
  const headers={...req.headers,host:new URL(upstream).host};delete headers['content-length'];
  if(headers.origin)headers.origin=upstream;
  const result=await fetch(upstream+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:body});
  res.writeHead(result.status,{'content-type':result.headers.get('content-type')||'application/octet-stream','cache-control':'no-store'});res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.writeHead(502);res.end('Fixture upstream unavailable');}
}).listen(8940,'127.0.0.1',()=>console.log('Synthetic fault proxy: http://127.0.0.1:8940/?shell=desktop'));
