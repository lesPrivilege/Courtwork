// Synthetic Core facts and authenticated product HTTP; no UI/DTO injection.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { boot } from '../../../app/tests/helpers.mjs';
const h=await boot({configureFakeCredential:false});const core=h.runtime.service.workCore;
const source=(id,version)=>({id,version,text:`${id}:${version}`,digest:createHash('sha256').update(`${id}:${version}`).digest('hex')});
for(let i=0;i<27;i++) {
 const id=`synthetic-${String(i).padStart(2,'0')}`;
 await core.createMatter({matterId:id,title:`Synthetic maintenance ${i}`,source:source(id,1)});
 await core.call('claim_work',{matter_id:id,project_id:h.projectId,extension_id:'evidence-memo'});
}
await core.call('replace_sources',{matter_id:'synthetic-00',sources:[source('synthetic-00',4)],revision:2});
await core.call('replace_sources',{matter_id:'synthetic-00',sources:[source('synthetic-00',0)],revision:3});
let changed=false;
const server=http.createServer(async(req,res)=>{
 try {
 const origin=`http://127.0.0.1:${server.address().port}`;const url=new URL(req.url,origin);
 if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);res.end();return;}
 if(url.pathname==='/api/v5/work-derivations' && url.searchParams.get('offset')==='25' && !changed) {
  changed=true;await core.call('replace_sources',{matter_id:'synthetic-26',sources:[source('synthetic-26',1)],revision:2});
 }
 const headers={...req.headers,host:new URL(h.runtime.url).host};if(headers.origin)headers.origin=h.runtime.url;
 const upstream=http.request(h.runtime.url+req.url,{method:req.method,headers},response=>{if(url.pathname==='/api/v5/work-derivations')console.log(JSON.stringify({path:req.url,status:response.statusCode}));res.writeHead(response.statusCode,response.headers);response.pipe(res);});
 upstream.on('error',e=>{res.writeHead(502);res.end(e.message);});req.pipe(upstream);
 }catch(e){res.writeHead(500);res.end(e.message);}
});
server.listen(18981,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:18981',projectId:h.projectId,provider:'none',fixture:'27 version-zero Matters; one rollback; change off-page on first next-page read'})));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{server.close();await h.runtime.close();process.exit();});
