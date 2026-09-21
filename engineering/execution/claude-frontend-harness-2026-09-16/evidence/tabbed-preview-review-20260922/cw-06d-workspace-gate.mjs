import http from 'node:http';
import {appendFile} from 'node:fs/promises';
const target='http://127.0.0.1:8977';
const log='/tmp/cw-06d-workspace-gate.jsonl';
let armed=true, waiting=false, release;
const record=x=>appendFile(log,JSON.stringify({at:new Date().toISOString(),...x})+'\n');
http.createServer(async(req,res)=>{
 if(req.url==='/__gate'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({armed,waiting}));return;}
 if(req.url==='/__release' && req.method==='POST'){release?.();res.end('{}');return;}
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
 const headers={...req.headers,host:'127.0.0.1:8977'};if(headers.origin)headers.origin=target;delete headers['content-length'];
 const r=await fetch(target+req.url,{method:req.method,headers,body:body.length?body:undefined});const bytes=Buffer.from(await r.arrayBuffer());
 if(armed && req.method==='GET' && /\/sessions\/[^/]+\/surface$/.test(req.url)){
  armed=false;waiting=true;await record({held:true,path:req.url,status:r.status});
  res.on('close',()=>void record({clientClosed:true,beforeRelease:waiting,ended:res.writableEnded}));
  await new Promise(ok=>release=ok);waiting=false;await record({released:true,clientDestroyed:res.destroyed});
 }
 const out={};r.headers.forEach((v,k)=>{if(!['content-length','content-encoding','transfer-encoding'].includes(k))out[k]=v});
 res.writeHead(r.status,out);res.end(bytes);
}).listen(8978,'127.0.0.1',()=>console.log('review-only Workspace gate 8978 -> 8977'));
