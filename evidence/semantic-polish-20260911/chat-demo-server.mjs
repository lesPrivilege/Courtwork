// Separate static synthetic specimen; no API proxy and no production route.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
http.createServer(async(req,res)=>{
  try {
    if(req.method!=='GET') {res.writeHead(405);res.end();return;}
    const url=new URL(req.url,'http://localhost');
    const rel=url.pathname==='/'?'app/tests/fixtures/chat-actions/index.html':url.pathname.startsWith('/demo/')?'app/tests/fixtures/chat-actions/'+url.pathname.slice(6):url.pathname.startsWith('/web/')?'app'+url.pathname:null;
    if(!rel||!/^[-\w./]+$/.test(rel)||rel.includes('..')){res.writeHead(404);res.end();return;}
    const bytes=await readFile(path.join(root,rel));
    const type={html:'text/html',mjs:'text/javascript',css:'text/css',svg:'image/svg+xml'}[rel.split('.').at(-1)];
    res.writeHead(200,{'content-type':type||'text/plain','cache-control':'no-store'});res.end(bytes);
  }catch {res.writeHead(404);res.end();}
}).listen(0,'127.0.0.1',function(){console.log(`http://127.0.0.1:${this.address().port}`);});
