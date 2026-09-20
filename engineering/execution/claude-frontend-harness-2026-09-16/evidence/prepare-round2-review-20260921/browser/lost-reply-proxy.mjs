import http from 'node:http';
import fs from 'node:fs/promises';
let dropped=false;
http.createServer(async(req,res)=>{
 const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
 const headers={...req.headers,host:'127.0.0.1:8922'};if(headers.origin)headers.origin='http://127.0.0.1:8922';delete headers['content-length'];
 const r=await fetch('http://127.0.0.1:8922'+req.url,{method:req.method,headers,body:body.length?body:undefined});const bytes=Buffer.from(await r.arrayBuffer());
 const candidate=req.method==='POST' && req.url==='/api/v5/sessions';
 if(candidate){await fs.appendFile('/tmp/cw-prepare-round2-astra-evidence/lost-reply-commands.jsonl',JSON.stringify({path:req.url,body:JSON.parse(body),hostStatus:r.status})+'\n');}
 if(candidate&&!dropped&&r.ok){dropped=true;res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:'synthetic reply loss after Host commit'}));return;}
 const out={};r.headers.forEach((v,k)=>{if(!['content-length','content-encoding','transfer-encoding'].includes(k))out[k]=v;});res.writeHead(r.status,out);res.end(bytes);
}).listen(8923,'127.0.0.1',()=>console.log('synthetic reply-loss proxy 8923 → own Host8922'));
