import http from 'node:http';
import {appendFile} from 'node:fs/promises';
const target='http://127.0.0.1:8977',log='/tmp/cw-pv-r1-final-gate.jsonl';
let armed='active',waiting=false,release;
const record=x=>appendFile(log,JSON.stringify({at:new Date().toISOString(),...x})+'\n');
http.createServer(async(req,res)=>{
 if(req.url==='/__gate'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({armed,waiting}));return;}
 if(req.method==='POST'&&req.url.startsWith('/__arm/')){armed=req.url.slice(7);res.end('{}');return;}
 if(req.url==='/__release'&&req.method==='POST'){release?.();res.end('{}');return;}
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
 const headers={...req.headers,host:'127.0.0.1:8977'};if(headers.origin)headers.origin=target;delete headers['content-length'];
 const r=await fetch(target+req.url,{method:req.method,headers,body:body.length?body:undefined});const bytes=Buffer.from(await r.arrayBuffer());
 if(armed&&req.method==='GET'&&/\/sessions\/[^/]+\/surface$/.test(req.url)){
  const stage=armed;armed=null;waiting=true;await record({stage,held:true,path:req.url,status:r.status});
  res.on('close',()=>void record({stage,clientClosed:true,beforeRelease:waiting,ended:res.writableEnded}));
  await new Promise(ok=>release=ok);waiting=false;await record({stage,released:true,clientDestroyed:res.destroyed});
 }
 if(res.destroyed)return;
 const out={};r.headers.forEach((v,k)=>{if(!['content-length','content-encoding','transfer-encoding'].includes(k))out[k]=v});res.writeHead(r.status,out);res.end(bytes);
}).listen(8978,'127.0.0.1',()=>console.log('PV final gate 8978 -> 8977'));
