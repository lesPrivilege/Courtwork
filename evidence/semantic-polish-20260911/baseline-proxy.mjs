// Fixed source, current synthetic read-only facts. No second host or shared mutable data.
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile('/tmp/courtwork-vs01-preview.json','utf8'));
if(manifest.dataClass!=='synthetic · real HTTP/Pi loopback/Core')throw new Error('Synthetic fixture required');
const revision='590739fa3d1bc401905261172260143e36e82c5e';
const cache=new Map();
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(req.method!=='GET'){res.writeHead(405);res.end('Read-only baseline');return;}
    const source=url.pathname==='/'?'app/web/index.html':url.pathname.startsWith('/web/')?`app${url.pathname}`:url.pathname.startsWith('/brand/src/')?url.pathname.slice(1):null;
    if(source){
      if(!/^[\w./-]+$/.test(source)||source.includes('..'))throw new Error('Invalid static path');
      if(!cache.has(source))cache.set(source,execFileSync('git',['show',`${revision}:${source}`],{maxBuffer:20*1024*1024}));
      const ext=source.split('.').at(-1),type={mjs:'text/javascript',js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json'}[ext]||'application/octet-stream';
      res.writeHead(200,{'content-type':type,'cache-control':'no-store'});res.end(cache.get(source));return;
    }
    const headers={};if(req.headers['x-work-token'])headers['x-work-token']=req.headers['x-work-token'];
    const response=await fetch(manifest.url+req.url,{headers});
    res.writeHead(response.status,{'content-type':response.headers.get('content-type')||'application/json','cache-control':'no-store'});res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(error.message);}
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}`));
